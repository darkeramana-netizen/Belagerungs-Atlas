// Voxel block surface shader — triplanar world-space UV mapping.
//
// Atlas layout: atlas_grid = (num_cols=20, num_rows=3)
//   Row 0 = top face (+Y)   Row 1 = side face   Row 2 = bottom face (-Y)
//   Col   = block ID  (0 .. BLOCK_COUNT-1)
//
// UV2.x = float(block_id) / BLOCK_COUNT  — atlas column selector.
// Vertex COLOR.rgb = per-vertex AO greyscale (1=bright, 0=occluded).
//
// Triplanar UV selection (dominant world normal axis):
//   ±Y  →  world_pos.xz   ±X  →  world_pos.zy   ±Z  →  world_pos.xy
//
// Precision:
//   world_pos via MODEL_MATRIX includes full chunk-node world offset.
//   world_normal via MODEL_NORMAL_MATRIX (inverse-transpose) + re-normalised
//     in fragment stage stays axis-aligned despite varying interpolation.
//   fract(world_pos + 0.001) snaps away from integer block boundaries.
//   within_tile uses half-texel inset derived from atlas_size so samples
//     never land on atlas tile borders regardless of block or atlas dimensions.

shader_type spatial;
render_mode unshaded, cull_disabled, depth_draw_opaque, shadows_disabled;

uniform sampler2D atlas      : source_color, filter_nearest, repeat_disable;
uniform vec2      atlas_grid = vec2(20.0, 3.0);    // (num_cols, num_rows)
uniform vec2      atlas_size = vec2(320.0, 48.0);  // (width_px, height_px) for half-texel

varying vec3 world_pos;
varying vec3 world_normal;

void vertex() {
	// Full world-space position including chunk node offset.
	world_pos    = (MODEL_MATRIX * vec4(VERTEX, 1.0)).xyz;
	// MODEL_NORMAL_MATRIX = transpose(inverse(mat3(MODEL_MATRIX))).
	// Correct for any scale; keeps normals axis-aligned for our chunks.
	world_normal = normalize(MODEL_NORMAL_MATRIX * NORMAL);
}

void fragment() {
	// ── Re-normalise (varying interpolation can drift off unit length) ────
	vec3 wn = normalize(world_normal);

	// ── Selective backface cull ───────────────────────────────────────────
	// cull_disabled is needed so top faces are visible from below (underground
	// / editor camera below terrain).  But the back-faces of vertical SIDE
	// quads (normal ±X or ±Z) must be discarded — they are the source of the
	// "floating brown rectangle" artefacts that appear on the green surface
	// when looking down at terrain from above at an oblique angle.
	// Top/bottom back-faces (abs(wn.y) ≥ 0.5) are left visible intentionally.
	if (!FRONT_FACING && abs(wn.y) < 0.5) {
		discard;
	}

	// ── Triplanar UV selection ────────────────────────────────────────────
	// +0.001 snap keeps us safely above the previous integer block boundary
	// when the GPU produces e.g. 15.9998 instead of 16.0000.
	vec3  snapped = world_pos + vec3(0.001);

	float any_y = abs(wn.y);
	float any_x = abs(wn.x);
	float any_z = abs(wn.z);

	vec2  tile_uv;
	float atlas_row_f;

	if (any_y >= any_x && any_y >= any_z) {
		// ±Y  →  top (row 0) or bottom (row 2)
		tile_uv     = fract(snapped.xz);
		atlas_row_f = (wn.y > 0.0) ? 0.0 : 2.0;
	} else if (any_x >= any_z) {
		// ±X side: horizontal = Z, vertical = Y
		tile_uv     = fract(snapped.zy);
		atlas_row_f = 1.0;
	} else {
		// ±Z side: horizontal = X, vertical = Y
		tile_uv     = fract(snapped.xy);
		atlas_row_f = 1.0;
	}

	// ── Atlas tile lookup ─────────────────────────────────────────────────
	vec2 tile_size   = 1.0 / atlas_grid;

	// Half-texel inset computed from actual atlas pixel dimensions so the
	// inset is always 0.5 px regardless of tile or atlas size.
	// This prevents nearest-neighbour sampling from landing on tile borders.
	vec2 half_texel  = 0.5 / atlas_size;

	// Atlas tile origin: column from UV2.x (block_id/BLOCK_COUNT), row from normal.
	vec2 atlas_base  = vec2(UV2.x, atlas_row_f / atlas_grid.y);

	// Map tile_uv [0,1] to [half_texel, tile_size-half_texel] within the tile.
	vec2 within_tile = tile_uv * (tile_size - 2.0 * half_texel) + half_texel;

	vec4 tex = texture(atlas, atlas_base + within_tile);
	ALBEDO = tex.rgb * COLOR.rgb;
	ALPHA  = 1.0;   // all terrain faces are fully opaque
}
