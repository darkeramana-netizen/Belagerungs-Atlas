extends Node
## VoxelTerrainGen -- maps FastNoiseLite FBM output to an integer block grid.
##
## Three-layer column generation:
##   Layer A  Surface height from FBM noise (snapped to integer Y).
##   Layer B  Castle flat zone: within flat_r blocks of origin, surface = BASE_Y.
##            Smoothstep blend between flat_r and flat_r * 1.7.
##   Layer C  Block type assignment per Y:
##              y == surface           -> GRASS  (or SAND near 0, STONE high up)
##              surface-4 < y < surface -> DIRT
##              y <= surface-4         -> STONE  (deeper = BASALT at y < 5)
##              y == 0                 -> BEDROCK
##
## Persistent: noise is seeded from world_seed, coordinates are world-absolute.
## Same seed + same chunk position => identical terrain every time.

const BT = preload("res://scripts/voxel/BlockTypes.gd")

## Master seed (set from VoxelWorld.world_seed before first fill).
var world_seed: int = 12345

const BASE_Y := 20
const SEA_LEVEL := 22
const ENABLE_SEA_WATER := true
const ENABLE_CAVES := true

const BIOME_PLAINS := 0
const BIOME_MOUNTAINS := 1

## Terrain amplitude in blocks above/below BASE_Y.
var noise_scale: int = 12

var _height_noise: FastNoiseLite
var _biome_noise: FastNoiseLite
var _cave_noise: FastNoiseLite


func _ready() -> void:
	_init_noise()


func reinit() -> void:
	_init_noise()


func _init_noise() -> void:
	_height_noise = FastNoiseLite.new()
	_height_noise.noise_type         = FastNoiseLite.TYPE_SIMPLEX_SMOOTH
	_height_noise.seed               = world_seed
	_height_noise.fractal_type       = FastNoiseLite.FRACTAL_FBM
	_height_noise.fractal_octaves    = 6
	_height_noise.fractal_lacunarity = 2.0
	_height_noise.fractal_gain       = 0.50
	_height_noise.frequency          = 0.004   # large-scale hills

	_biome_noise = FastNoiseLite.new()
	_biome_noise.noise_type         = FastNoiseLite.TYPE_SIMPLEX_SMOOTH
	_biome_noise.seed               = world_seed ^ 0xB10E1E
	_biome_noise.fractal_type       = FastNoiseLite.FRACTAL_FBM
	_biome_noise.fractal_octaves    = 3
	_biome_noise.fractal_lacunarity = 2.0
	_biome_noise.fractal_gain       = 0.55
	_biome_noise.frequency          = 0.0025

	# 3D cave carving noise (world-absolute coords for seamless chunk borders).
	_cave_noise = FastNoiseLite.new()
	_cave_noise.noise_type         = FastNoiseLite.TYPE_SIMPLEX_SMOOTH
	_cave_noise.seed               = world_seed ^ 0xC0FFEE
	_cave_noise.fractal_type       = FastNoiseLite.FRACTAL_FBM
	_cave_noise.fractal_octaves    = 3
	_cave_noise.fractal_lacunarity = 2.0
	_cave_noise.fractal_gain       = 0.50
	_cave_noise.frequency          = 0.08


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

## Fill one chunk (identified by its Vector3i chunk_pos) into the VoxelWorld.
## This is the main entry point called by VoxelWorld.update() for new chunks.
func fill_chunk(chunk_key: Vector3i, world: Object) -> void:
	var cs: int  = 16   # chunk size
	var wx0: int = chunk_key.x * cs
	var wy0: int = chunk_key.y * cs
	var wz0: int = chunk_key.z * cs

	# Precompute a height + biome provider per XZ column.
	# This mirrors Minecraft-style deterministic chunk generation.
	var surf: PackedInt32Array = PackedInt32Array()
	surf.resize(cs * cs)
	var biome: PackedInt32Array = PackedInt32Array()
	biome.resize(cs * cs)

	for lz in cs:
		for lx in cs:
			var wx: int = wx0 + lx
			var wz: int = wz0 + lz
			var idx: int = lz * cs + lx
			surf[idx] = _surface_y(wx, wz, world.castle_flat_r)
			biome[idx] = _biome_id(wx, wz)

	for lz in cs:
		for lx in cs:
			var wx: int = wx0 + lx
			var wz: int = wz0 + lz
			var idx: int = lz * cs + lx
			var s: int = surf[idx]
			var b: int = biome[idx]

			for ly in cs:
				var wy: int = wy0 + ly
				var bid: int = _block_for_voxel(wx, wy, wz, s, b)
				if bid != BT.AIR and world.get_block(wx, wy, wz) == BT.AIR:
					world.set_block(wx, wy, wz, bid)


## Generate raw block data for a chunk without touching the VoxelWorld.
## Thread-safe: reads only noise + castle_flat_r, writes nothing to the scene.
## Returns PackedByteArray of SIZE^3 bytes (ly*256 + lz*16 + lx).
func generate_chunk_data(chunk_key: Vector3i, castle_flat_r: int) -> PackedByteArray:
	var cs: int  = 16
	var wx0: int = chunk_key.x * cs
	var wy0: int = chunk_key.y * cs
	var wz0: int = chunk_key.z * cs

	var data := PackedByteArray()
	data.resize(cs * cs * cs)

	# Precompute providers for this chunk.
	var surf: PackedInt32Array = PackedInt32Array()
	surf.resize(cs * cs)
	var biome: PackedInt32Array = PackedInt32Array()
	biome.resize(cs * cs)

	for lz in cs:
		for lx in cs:
			var wx: int = wx0 + lx
			var wz: int = wz0 + lz
			var idx: int = lz * cs + lx
			surf[idx] = _surface_y(wx, wz, castle_flat_r)
			biome[idx] = _biome_id(wx, wz)

	for lz in cs:
		for lx in cs:
			var wx: int = wx0 + lx
			var wz: int = wz0 + lz
			var idx: int = lz * cs + lx
			var s: int = surf[idx]
			var b: int = biome[idx]

			for ly in cs:
				var wy: int = wy0 + ly
				data[ly * cs * cs + lz * cs + lx] = _block_for_voxel(wx, wy, wz, s, b)

	return data


## Returns the surface Y integer for a column at (wx, wz).
## Used by CastleVoxelBuilder to know where to start placing castle blocks.
func surface_y(wx: int, wz: int, flat_r: int) -> int:
	return _surface_y(wx, wz, flat_r)


# ---------------------------------------------------------------------------
# Internal
# ---------------------------------------------------------------------------

func _surface_y(wx: int, wz: int, flat_r: int) -> int:
	var base_y: int = BASE_Y   # matches VoxelWorld.BASE_Y

	var dist: float = sqrt(float(wx * wx + wz * wz))

	# Large-scale + detail FBM (both centred at 0)
	var h1: float = _height_noise.get_noise_2d(float(wx), float(wz)) * float(noise_scale)
	# h2 disabled (creates isolated 1-3 block pillars; re-enable when terrain looks good)
	# var h2: float = _noise2.get_noise_2d(float(wx), float(wz)) * float(noise_scale) * 0.25
	# IMPORTANT: int() truncates toward 0, which biases negative noise values
	# and can create isolated 1–3 block pillars/plates. Use floor() for symmetry.
	var raw: int  = base_y + int(floor(h1))

	# Castle flat zone + smoothstep blend
	var blend_r: float = float(flat_r) * 1.7
	if dist < float(flat_r):
		return base_y
	elif dist < blend_r:
		var t: float = (dist - float(flat_r)) / (blend_r - float(flat_r))
		t = t * t * (3.0 - 2.0 * t)   # smoothstep
		return base_y + int(float(raw - base_y) * t)
	return raw


func _biome_id(wx: int, wz: int) -> int:
	# Basic biomes (plains vs mountains) from low-frequency 2D noise.
	var v: float = _biome_noise.get_noise_2d(float(wx), float(wz))
	return BIOME_MOUNTAINS if v > 0.35 else BIOME_PLAINS


func _block_for_voxel(wx: int, wy: int, wz: int, surface: int, biome: int) -> int:
	# 1) Water columns fill up to SEA_LEVEL when terrain is below sea.
	if wy > surface:
		if ENABLE_SEA_WATER and wy <= SEA_LEVEL:
			return BT.WATER
		return BT.AIR

	# 2) Solid terrain.
	if wy == 0:
		return BT.BEDROCK

	# 3) Optional cave carving (Minecraft-like 3D noise cutout).
	# Carve only sufficiently far below the surface to keep a stable top.
	if ENABLE_CAVES and wy >= 3 and wy <= surface - 4:
		var cave_v: float = _cave_noise.get_noise_3d(float(wx), float(wy), float(wz))
		# FastNoiseLite returns roughly -1..1. Higher => more carving.
		if cave_v > 0.45:
			if ENABLE_SEA_WATER and wy <= SEA_LEVEL:
				return BT.WATER
			return BT.AIR

	return _layer_block_for(wy, surface, biome)


func _layer_block_for(wy: int, surface: int, biome: int) -> int:
	# Surface/top block.
	if wy == surface:
		if ENABLE_SEA_WATER and surface <= SEA_LEVEL:
			return BT.SAND

		# Mountains: exposed rock earlier (lower peak_limit).
		var peak_limit: int = 35 if biome == BIOME_PLAINS else 30
		return BT.STONE if surface >= peak_limit else BT.GRASS

	# Near-surface layers.
	if wy >= surface - 4:
		if ENABLE_SEA_WATER and surface <= SEA_LEVEL:
			return BT.GRAVEL
		return BT.DIRT if biome == BIOME_PLAINS else BT.STONE

	# Deep layers.
	if wy < 5:
		return BT.BASALT
	return BT.STONE
