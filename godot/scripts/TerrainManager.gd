extends Node3D
## TerrainManager — Minecraft-style chunk-based FBM terrain.
##
## • Castle flat zone: radius castle_flat_r stays at y=0 so the burg sits flush.
## • Surrounding terrain rises with 5-octave FBM noise (rolling hills).
## • Chunks are loaded/unloaded dynamically via update(cam_pos).
##
## Call update(cam_pos) from Main._process() every frame.

@export var chunk_size:    float = 80.0   # metres per chunk edge
@export var segs:          int   = 40     # quad rows/columns per chunk
@export var view_dist:     int   = 3      # load radius in chunks
@export var castle_flat_r: float = 30.0  # flat zone radius (set by Main)
@export var height_scale:  float = 18.0  # maximum hill height in metres
@export var noise_seed:    int   = 42

var _noise: FastNoiseLite
var _chunks: Dictionary = {}        # Vector2i → StaticBody3D
var _mat:    StandardMaterial3D     # shared across all chunks

const _ChunkScript = preload("res://scripts/TerrainChunk.gd")


func _ready() -> void:
	_noise = FastNoiseLite.new()
	_noise.noise_type          = FastNoiseLite.TYPE_SIMPLEX_SMOOTH
	_noise.seed                = noise_seed
	_noise.fractal_type        = FastNoiseLite.FRACTAL_FBM
	_noise.fractal_octaves     = 5
	_noise.fractal_lacunarity  = 2.0
	_noise.fractal_gain        = 0.5
	_noise.frequency           = 0.007

	_mat = StandardMaterial3D.new()
	_mat.albedo_color              = Color(0.38, 0.34, 0.27)
	_mat.roughness                 = 0.94
	_mat.metallic                  = 0.0
	# Vertex colours baked into TerrainChunk modulate the base albedo
	_mat.vertex_color_use_as_albedo = true


# ── Public API ────────────────────────────────────────────────────────────────

## Returns FBM terrain height at world position (wx, wz).
## The castle flat zone (radius castle_flat_r) is held at y = 0 and blended.
func get_height_at(wx: float, wz: float) -> float:
	var dist := sqrt(wx * wx + wz * wz)

	# Two-octave FBM: large hills + medium bumps
	var h1 := (_noise.get_noise_2d(wx * 0.006, wz * 0.006) * 0.5 + 0.5) * height_scale
	var h2 := (_noise.get_noise_2d(wx * 0.020, wz * 0.020) * 0.5 + 0.5) * height_scale * 0.25
	var raw := h1 + h2

	# Flat zone blend
	var blend_r := castle_flat_r * 1.7
	if dist < castle_flat_r:
		return 0.0
	elif dist < blend_r:
		var t := (dist - castle_flat_r) / (blend_r - castle_flat_r)
		t = t * t * (3.0 - 2.0 * t)   # smoothstep
		return raw * t
	return raw


## Load chunks around cam_pos, unload distant ones.
## Call once per frame from Main._process().
func update_chunks(cam_pos: Vector3) -> void:
	var cx := int(floor(cam_pos.x / chunk_size))
	var cz := int(floor(cam_pos.z / chunk_size))

	# Collect needed keys
	var needed: Dictionary = {}
	for dx in range(-view_dist, view_dist + 1):
		for dz in range(-view_dist, view_dist + 1):
			var key := Vector2i(cx + dx, cz + dz)
			needed[key] = true
			if not _chunks.has(key):
				_load_chunk(key)

	# Remove out-of-range chunks
	for key in _chunks.keys():
		if not needed.has(key):
			_unload_chunk(key)


# ── Internal ──────────────────────────────────────────────────────────────────

func _load_chunk(key: Vector2i) -> void:
	var chunk         := _ChunkScript.new()
	chunk.ox          = key.x * chunk_size
	chunk.oz          = key.y * chunk_size
	chunk.size        = chunk_size
	chunk.segs        = segs
	chunk.terrain     = self
	chunk.mat         = _mat
	add_child(chunk)
	_chunks[key] = chunk


func _unload_chunk(key: Vector2i) -> void:
	if _chunks.has(key):
		_chunks[key].queue_free()
		_chunks.erase(key)
