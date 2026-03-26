// Voxel block surface shader with texture atlas support.
//
// UV encoding:
//   UV  = raw local quad coords (0..dw, 0..dv) for tiling.
//   UV2 = normalised atlas tile base (col/BLOCK_COUNT, row/FACE_ROWS).
//
// Half-texel inset prevents atlas bleeding from floating-point imprecision:
//   At UV2.x = 1/20 = 0.05, GPU may compute 0.049999... × 320 = 15.999 → pixel 15
//   (last pixel of previous tile) instead of pixel 16 (first pixel of this tile).
//   Inset by ±0.5 texels so all samples land at texel centres, never at boundaries.
//
// Vertex COLOR (rgb) = per-vertex AO greyscale.

shader_type spatial;
render_mode unshaded, cull_disabled, depth_draw_opaque, shadows_disabled;

uniform sampler2D atlas      : source_color, filter_nearest, repeat_disable;
uniform vec2      atlas_grid = vec2(20.0, 3.0);   // (num_cols, num_rows)
uniform vec2      atlas_size = vec2(320.0, 48.0); // (width_px, height_px)

void fragment() {
    vec2 tile_size   = 1.0 / atlas_grid;
    vec2 half_texel  = 0.5 / atlas_size;
    // Inset by ±0.5 texels: sampling range shrinks from [0,tile_size]
    // to [half_texel, tile_size - half_texel], always hitting texel centres.
    vec2 within_tile = fract(UV) * (tile_size - 2.0 * half_texel) + half_texel;
    vec2 sample_uv   = UV2 + within_tile;

    vec4 tex = texture(atlas, sample_uv);
    ALBEDO = tex.rgb * COLOR.rgb;
    ALPHA  = tex.a;
}
