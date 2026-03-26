extends RefCounted
## VoxelAtlas -- procedurally generated texture atlas for all block types.
##
## Atlas layout:
##   Columns = block IDs 0..BLOCK_COUNT-1 (matches BlockTypes constants).
##   Rows    = face type: 0 = top, 1 = side, 2 = bottom.
##   Tile size: TILE_PX x TILE_PX pixels.
##
## Usage (from VoxelChunk):
##   var mat := VoxelAtlas.get_material()
##   var uv_base := VoxelAtlas.tile_uv(block_id, face_row)
##   # For a greedy quad dv x dw: UV spans uv_base..(uv_base + Vector2(dw, dv))
##
## Shader decomposes UV into tile + offset, samples the atlas with fract()
## so large greedy quads tile correctly without atlas bleeding.

const BLOCK_COUNT := 20
const FACE_ROWS   := 3      # 0=top  1=side  2=bottom
const TILE_PX     := 16
const ATLAS_W     := BLOCK_COUNT * TILE_PX   # 320 px
const ATLAS_H     := FACE_ROWS   * TILE_PX   # 48  px

const SHADER_PATH := "res://shaders/voxel_block.gdshader"

## Singleton-style cached instances (static to share across all chunks)
static var _material: ShaderMaterial = null


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

## Returns the shared ShaderMaterial (builds atlas on first call).
static func get_material() -> ShaderMaterial:
	if _material == null:
		_material = _build_material()
	return _material


## Returns the atlas UV base (col, row) for block_id + face_row.
## face_row: 0=top (fi==2), 1=side (fi==0,1,4,5), 2=bottom (fi==3)
static func tile_uv(block_id: int, face_row: int) -> Vector2:
	return Vector2(float(block_id), float(face_row))


## Convert face-direction index fi to face_row (0/1/2).
static func face_row_from_fi(fi: int) -> int:
	if fi == 2:
		return 0   # top
	elif fi == 3:
		return 2   # bottom
	else:
		return 1   # side


# ---------------------------------------------------------------------------
# Internal: build atlas image + material
# ---------------------------------------------------------------------------

static func _build_material() -> ShaderMaterial:
	var img := Image.create(ATLAS_W, ATLAS_H, false, Image.FORMAT_RGBA8)

	# Generate a tile for every (block_id, face_row) combination
	for bid in BLOCK_COUNT:
		for fr in FACE_ROWS:
			_paint_tile(img, bid, fr)

	var atlas_tex := ImageTexture.create_from_image(img)

	var shader := load(SHADER_PATH) as Shader
	if shader == null:
		push_error("[VoxelAtlas] Cannot load shader: " + SHADER_PATH)
		return ShaderMaterial.new()

	var mat := ShaderMaterial.new()
	mat.shader = shader
	mat.set_shader_parameter("atlas", atlas_tex)
	mat.set_shader_parameter("atlas_grid", Vector2(BLOCK_COUNT, FACE_ROWS))
	return mat


# ---------------------------------------------------------------------------
# Tile painter -- one 16x16 tile per (bid, face_row)
# ---------------------------------------------------------------------------

static func _paint_tile(img: Image, bid: int, fr: int) -> void:
	var tx0 := bid * TILE_PX
	var ty0 := fr  * TILE_PX

	for py in TILE_PX:
		for px in TILE_PX:
			var c: Color = _pixel_color(bid, fr, px, py)
			img.set_pixel(tx0 + px, ty0 + py, c)


# Returns the Color for pixel (px,py) in tile (bid, face_row).
static func _pixel_color(bid: int, fr: int, px: int, py: int) -> Color:
	var h: float = _hash(px + bid * 97, py + fr * 53)   # 0..1 noise

	match bid:
		0:  # AIR -- transparent (should never be sampled)
			return Color(0, 0, 0, 0)

		1:  # GRASS
			if fr == 0:   # top: green with noise
				return Color(0.25 + h * 0.12, 0.55 + h * 0.10, 0.16 + h * 0.06, 1)
			elif fr == 1: # side: dirt body + green cap
				# UV maps: face-BOTTOM -> py=0, face-TOP -> py=15.
				# Green cap must be at py >= TILE_PX-3 so it appears at the
				# top of the block face in world space.
				if py >= TILE_PX - 3:   # py=13,14,15 → rendered at top of face
					return Color(0.28, 0.52, 0.18, 1)
				elif py >= TILE_PX - 5: # py=11,12   → transition
					var t: float = float(py - (TILE_PX - 5)) / 2.0
					return Color(lerp(0.44, 0.28, t), lerp(0.31, 0.52, t), lerp(0.19, 0.18, t), 1)
				else:                   # py=0..10   → dirt body
					return Color(0.44 + h * 0.07, 0.31 + h * 0.06, 0.19 + h * 0.05, 1)
			else:          # bottom = dirt
				return Color(0.44 + h * 0.07, 0.31 + h * 0.06, 0.19 + h * 0.05, 1)

		2:  # DIRT
			return Color(0.44 + h * 0.08, 0.31 + h * 0.07, 0.19 + h * 0.05, 1)

		3:  # STONE
			return Color(0.50 + h * 0.08, 0.48 + h * 0.07, 0.44 + h * 0.06, 1)

		4:  # STONE_BRICK -- brick grid pattern
			var bx: int = px % 8
			var by: int = (py + (px >> 3) * 4) % 8
			if bx == 0 or by == 0:   # mortar line
				return Color(0.74, 0.72, 0.68, 1)
			return Color(0.52 + h * 0.08, 0.50 + h * 0.07, 0.46 + h * 0.06, 1)

		5:  # DARK_BRICK -- darker brick
			var bx2: int = px % 8
			var by2: int = (py + (px >> 3) * 4) % 8
			if bx2 == 0 or by2 == 0:
				return Color(0.44, 0.42, 0.40, 1)
			return Color(0.30 + h * 0.06, 0.27 + h * 0.06, 0.24 + h * 0.05, 1)

		6:  # COBBLESTONE -- rounded irregular stones
			var cx: int = (px >> 2) + int(float(py) / 5.0)
			var ch: float = _hash(cx * 7, bid * 3)
			var edge: bool = (px % 4 == 0) or (py % 5 == 0)
			if edge:
				return Color(0.30, 0.29, 0.27, 1)
			return Color(0.42 + ch * 0.10 + h * 0.04, 0.40 + ch * 0.09, 0.37 + ch * 0.08, 1)

		7:  # SAND
			return Color(0.78 + h * 0.06, 0.72 + h * 0.05, 0.50 + h * 0.05, 1)

		8:  # GRAVEL
			var gv: float = _hash(px * 3 + py, bid)
			return Color(0.52 + gv * 0.10, 0.50 + gv * 0.09, 0.47 + gv * 0.08, 1)

		9:  # BATTLEMENT -- same as stone brick but more worn
			var bx3: int = px % 8
			var by3: int = (py + (px >> 3) * 4) % 8
			if bx3 == 0 or by3 == 0:
				return Color(0.66, 0.64, 0.60, 1)
			return Color(0.54 + h * 0.07, 0.52 + h * 0.06, 0.48 + h * 0.06, 1)

		10: # WOOD_PLANK -- horizontal planks
			var stripe: int = py % 4
			if stripe == 0:
				return Color(0.35, 0.24, 0.13, 1)
			return Color(0.58 + h * 0.06, 0.42 + h * 0.05, 0.22 + h * 0.04, 1)

		11: # SLATE_ROOF -- horizontal slates
			var sl: int = py % 5
			if sl == 0:
				return Color(0.20, 0.19, 0.18, 1)
			return Color(0.26 + h * 0.06, 0.24 + h * 0.05, 0.23 + h * 0.04, 1)

		12: # FOUNDATION -- rough stone
			return Color(0.42 + h * 0.08, 0.40 + h * 0.07, 0.37 + h * 0.06, 1)

		13: # BEDROCK -- very dark irregular
			var bh: float = _hash(px * 5 + py * 3, 99)
			return Color(0.18 + bh * 0.06, 0.17 + bh * 0.06, 0.16 + bh * 0.05, 1)

		14: # WATER -- semi-transparent blue
			return Color(0.18, 0.42, 0.70, 0.75)

		15: # MOSSY_STONE -- stone with green patches
			if h > 0.72:
				return Color(0.28 + h * 0.08, 0.48 + h * 0.08, 0.22 + h * 0.04, 1)
			return Color(0.42 + h * 0.07, 0.46 + h * 0.06, 0.38 + h * 0.05, 1)

		16: # ARCH -- lighter stone
			var bx4: int = px % 8
			var by4: int = (py + (px >> 3) * 4) % 8
			if bx4 == 0 or by4 == 0:
				return Color(0.80, 0.78, 0.74, 1)
			return Color(0.60 + h * 0.07, 0.57 + h * 0.06, 0.52 + h * 0.05, 1)

		17: # CLAY_TILE -- terracotta tile
			var tx: int  = px % 6
			var ty2: int = py % 6
			if tx == 0 or ty2 == 0:
				return Color(0.42, 0.28, 0.18, 1)
			return Color(0.62 + h * 0.06, 0.44 + h * 0.05, 0.30 + h * 0.04, 1)

		18: # LIMESTONE -- pale stone with subtle grain
			return Color(0.80 + h * 0.06, 0.76 + h * 0.05, 0.65 + h * 0.05, 1)

		19: # BASALT -- very dark with slight blue tint
			return Color(0.22 + h * 0.05, 0.21 + h * 0.05, 0.22 + h * 0.05, 1)

	# Fallback: bright magenta (easy to spot missing tiles)
	return Color(1, 0, 1, 1)


# ---------------------------------------------------------------------------
# Fast integer hash 0..1
# ---------------------------------------------------------------------------

static func _hash(x: int, y: int) -> float:
	var n: int = x + y * 374761393
	n = (n ^ (n >> 13)) * 1274126177
	n = n ^ (n >> 16)
	return float(n & 0x7FFFFFFF) / float(0x7FFFFFFF)
