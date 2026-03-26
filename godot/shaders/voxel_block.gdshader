// Voxel block surface shader with texture atlas support.
//
// UV encoding (new, correct for greedy quads):
//   UV  = raw local quad coords (0..dw, 0..dv) used for tiling.
//   UV2 = normalised atlas tile base:
//           UV2.x = atlas_col / BLOCK_COUNT
//           UV2.y = atlas_row / FACE_ROWS
//
// The shader tiles within the correct block tile using fract(UV),
// then offsets into the atlas via UV2.  This prevents large greedy quads
// from bleeding into adjacent atlas columns/rows.
//
// Vertex COLOR (rgb) encodes AO: white = no occlusion, dark = occluded.
// Final albedo = texture_sample * vertex_ao.

shader_type spatial;
render_mode unshaded, cull_disabled, depth_draw_opaque, shadows_disabled;

uniform sampler2D atlas : source_color, filter_nearest, repeat_disable;
uniform vec2 atlas_grid = vec2(20.0, 3.0);   // (num_cols, num_rows)

void fragment() {
    // tile_size = (1/20, 1/3) in atlas UV space
    vec2 tile_size = 1.0 / atlas_grid;
    // UV2 is the top-left of this block's tile in the atlas (normalised).
    // fract(UV) gives within-tile position tiling every 1.0 block.
    vec2 sample_uv = UV2 + fract(UV) * tile_size;

    vec4 tex = texture(atlas, sample_uv);
    ALBEDO = tex.rgb * COLOR.rgb;
    ALPHA  = tex.a;
}
