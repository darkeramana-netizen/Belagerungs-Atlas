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

## Terrain amplitude in blocks above/below BASE_Y.
var noise_scale: int = 12

var _noise:  FastNoiseLite
var _noise2: FastNoiseLite   # detail layer


func _ready() -> void:
	_init_noise()


func reinit() -> void:
	_init_noise()


func _init_noise() -> void:
	_noise = FastNoiseLite.new()
	_noise.noise_type         = FastNoiseLite.TYPE_SIMPLEX_SMOOTH
	_noise.seed               = world_seed
	_noise.fractal_type       = FastNoiseLite.FRACTAL_FBM
	_noise.fractal_octaves    = 6
	_noise.fractal_lacunarity = 2.0
	_noise.fractal_gain       = 0.50
	_noise.frequency          = 0.004   # large-scale hills

	# Detail layer disabled: high-frequency noise creates isolated 1-3 block
	# pillars that appear as floating rectangles from horizontal angles.
	# Re-enable and tune once base terrain shape is satisfactory.
	_noise2 = FastNoiseLite.new()
	_noise2.noise_type         = FastNoiseLite.TYPE_SIMPLEX_SMOOTH
	_noise2.seed               = world_seed ^ 0xC0FFEE
	_noise2.fractal_type       = FastNoiseLite.FRACTAL_FBM
	_noise2.fractal_octaves    = 3
	_noise2.fractal_lacunarity = 2.2
	_noise2.fractal_gain       = 0.45
	_noise2.frequency          = 0.018  # medium bumps (currently unused)


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

	for lz in cs:
		for lx in cs:
			var wx: int = wx0 + lx
			var wz: int = wz0 + lz
			var surf: int = _surface_y(wx, wz, world.castle_flat_r)

			for ly in cs:
				var wy: int = wy0 + ly
				var bid: int = _block_for_y(wy, surf)
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

	for lz in cs:
		for lx in cs:
			var wx: int = wx0 + lx
			var wz: int = wz0 + lz
			var surf: int = _surface_y(wx, wz, castle_flat_r)

			for ly in cs:
				var wy: int = wy0 + ly
				data[ly * cs * cs + lz * cs + lx] = _block_for_y(wy, surf)

	return data


## Returns the surface Y integer for a column at (wx, wz).
## Used by CastleVoxelBuilder to know where to start placing castle blocks.
func surface_y(wx: int, wz: int, flat_r: int) -> int:
	return _surface_y(wx, wz, flat_r)


# ---------------------------------------------------------------------------
# Internal
# ---------------------------------------------------------------------------

func _surface_y(wx: int, wz: int, flat_r: int) -> int:
	var base_y: int = 20   # matches VoxelWorld.BASE_Y

	var dist: float = sqrt(float(wx * wx + wz * wz))

	# Large-scale + detail FBM (both centred at 0)
	var h1: float = _noise.get_noise_2d(float(wx), float(wz)) * float(noise_scale)
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


func _block_for_y(wy: int, surface: int) -> int:
	if wy > surface:
		return BT.AIR
	if wy == 0:
		return BT.BEDROCK
	if wy == surface:
		# Surface block type depends on height (sand near sea, stone on peaks)
		if surface <= 12:
			return BT.SAND
		elif surface >= 35:
			return BT.STONE
		else:
			return BT.GRASS
	if wy >= surface - 4:
		# Sub-surface: dirt layer
		if surface <= 12:
			return BT.GRAVEL
		return BT.DIRT
	if wy < 5:
		return BT.BASALT   # deep bedrock zone
	return BT.STONE
