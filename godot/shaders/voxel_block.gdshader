// Voxel block surface shader with texture atlas support.
//
// UV encoding used by VoxelChunk:
//   UV.x = atlas_col + within_tile_u   (0..dw tiles in w-direction)
//   UV.y = atlas_row + within_tile_v   (0..dv tiles in v-direction)
//
// The shader splits UV into:
//   tile = floor(UV)   -> which tile in the atlas (col, row)
//   uv   = fract(UV)   -> position within that tile (0..1)
//
// This gives correct per-tile tiling without bleeding into neighbours
// even for large greedy-merged quads.
//
// Vertex COLOR (rgb) encodes AO: white = no occlusion, dark = occluded.
// Final albedo = texture_sample * vertex_ao.

shader_type spatial;
render_mode unshaded, cull_disabled, depth_draw_opaque, shadows_disabled;

uniform sampler2D atlas : source_color, filter_nearest, repeat_disable;
uniform vec2 atlas_grid = vec2(20.0, 3.0);   // (num_cols, num_rows)

void fragment() {
    vec2 tile_idx  = floor(UV);
    vec2 tile_uv   = fract(UV);
    vec2 sample_uv = (tile_idx + tile_uv) / atlas_grid;

    vec4 tex = texture(atlas, sample_uv);
    // Multiply by vertex colour for per-vertex AO darkening
    ALBEDO = tex.rgb * COLOR.rgb;
    ALPHA  = tex.a;
}
