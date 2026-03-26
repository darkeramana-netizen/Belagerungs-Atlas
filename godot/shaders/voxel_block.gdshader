// Voxel block surface shader — triplanar world-space UV mapping.
//
// Eliminates UV seam artifacts from greedy quads by deriving UVs entirely
// from world-space vertex position rather than mesh-local texture coordinates.
//
// World coordinates are in metres (1 block = 1 m), so fract(world_pos.**)
// maps exactly one block face to one texture tile with no manual scaling.
//
// Atlas layout: atlas_grid = (num_cols=20, num_rows=3)
//   Row 0 = top face, Row 1 = side face, Row 2 = bottom face
//   Col   = block ID  (0 .. BLOCK_COUNT-1)
//
// UV2.x = float(block_id) / BLOCK_COUNT  — atlas column selector.
// Vertex COLOR.rgb = per-vertex AO greyscale (1 = bright, 0 = occluded).
//
// Triplanar UV selection (dominant world normal axis):
//   ±Y (top/bottom)  →  fract(world_pos.xz)
//   ±X (side)        →  fract(world_pos.zy)   (z=horiz, y=height)
//   ±Z (side)        →  fract(world_pos.xy)   (x=horiz, y=height)
//
// A 0.001 inset on each edge of the atlas tile prevents sampling the
// adjacent tile at floating-point block boundaries.

shader_type spatial;
render_mode unshaded, cull_disabled, depth_draw_opaque, shadows_disabled;

uniform sampler2D atlas      : source_color, filter_nearest, repeat_disable;
uniform vec2      atlas_grid = vec2(20.0, 3.0);    // (num_cols, num_rows)
uniform vec2      atlas_size = vec2(320.0, 48.0);  // (width_px, height_px)

varying vec3 world_pos;
varying vec3 world_normal;

void vertex() {
	world_pos    = (MODEL_MATRIX * vec4(VERTEX, 1.0)).xyz;
	world_normal = normalize((MODEL_MATRIX * vec4(NORMAL, 0.0)).xyz);
}

void fragment() {
	// ── Triplanar UV selection ─────────────────────────────────────────────
	float any = abs(world_normal.y);
	float anx = abs(world_normal.x);
	float anz = abs(world_normal.z);

	vec2  tile_uv;
	float atlas_row_f;

	if (any > 0.5) {
		// Top (+Y, row 0) or Bottom (-Y, row 2)
		tile_uv     = fract(world_pos.xz);
		atlas_row_f = (world_normal.y > 0.0) ? 0.0 : 2.0;
	} else if (anx >= anz) {
		// ±X side face: horizontal = Z, vertical = Y
		tile_uv     = fract(world_pos.zy);
		atlas_row_f = 1.0;
	} else {
		// ±Z side face: horizontal = X, vertical = Y
		tile_uv     = fract(world_pos.xy);
		atlas_row_f = 1.0;
	}

	// ── Atlas sampling ────────────────────────────────────────────────────
	vec2 tile_size  = 1.0 / atlas_grid;

	// Atlas tile origin: column from block-ID (UV2.x), row from face normal.
	vec2 atlas_base = vec2(UV2.x, atlas_row_f / atlas_grid.y);

	// Inset tile_uv by ±0.001 so samples never reach tile boundaries,
	// preventing bleed from adjacent tiles at block edges.
	vec2 within_tile = tile_uv * (tile_size - vec2(0.002)) + vec2(0.001);

	vec4 tex = texture(atlas, atlas_base + within_tile);
	ALBEDO = tex.rgb * COLOR.rgb;
	ALPHA  = tex.a;
}
