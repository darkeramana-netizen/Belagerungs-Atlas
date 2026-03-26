extends Node3D
## TerrainManager -- chunk-based FBM terrain.  Three-layer generation:
##
##   Layer A  FastNoiseLite FBM heightmap (large hills + medium bumps)
##   Layer B  Flatness mask -- zones where slope < threshold are "building slots"
##   Layer C  Decoration: castle is placed at origin on the flattest plateau
##
## KEY FIX (crater bug):
##   Old code returned 0 for flat zone, but FBM terrain averages BASE_HEIGHT (~10m).
##   Now flat zone returns BASE_HEIGHT so the castle sits at the AVERAGE elevation
##   and surrounding terrain rises and falls naturally around it.
##
## Global seed:
##   All noise is derived from world_seed.  Same seed = identical world every time.

@export var world_seed:    int   = 12345   # single source of truth for the world
@export var chunk_size:    float = 80.0    # metres per chunk edge
@export var segs:          int   = 40      # quad rows/columns per chunk
@export var view_dist:     int   = 3       # load radius in chunks
@export var castle_flat_r: float = 30.0   # flat zone radius (set by Main after loading)
@export var height_scale:  float = 20.0   # amplitude of hills (metres)

## Base elevation: castle platform height.
## FBM noise averages 0, so terrain averages BASE_HEIGHT.
## Half the terrain is above this, half below (valleys/water).
const BASE_HEIGHT := 10.0

var _noise:  FastNoiseLite
var _noise2: FastNoiseLite   # second octave with different seed for variety
var _chunks: Dictionary = {}
var _mat:    StandardMaterial3D

const _ChunkScript = preload("res://scripts/TerrainChunk.gd")


func _ready() -> void:
	_init_noise()
	_init_mat()


func _init_noise() -> void:
	_noise = FastNoiseLite.new()
	_noise.noise_type         = FastNoiseLite.TYPE_SIMPLEX_SMOOTH
	_noise.seed               = world_seed
	_noise.fractal_type       = FastNoiseLite.FRACTAL_FBM
	_noise.fractal_octaves    = 6
	_noise.fractal_lacunarity = 2.0
	_noise.fractal_gain       = 0.5
	_noise.frequency          = 0.005

	_noise2 = FastNoiseLite.new()
	_noise2.noise_type         = FastNoiseLite.TYPE_SIMPLEX_SMOOTH
	_noise2.seed               = world_seed ^ 0xDEADBEEF
	_noise2.fractal_type       = FastNoiseLite.FRACTAL_FBM
	_noise2.fractal_octaves    = 3
	_noise2.fractal_lacunarity = 2.2
	_noise2.fractal_gain       = 0.45
	_noise2.frequency          = 0.018


func _init_mat() -> void:
	_mat = StandardMaterial3D.new()
	_mat.albedo_color              = Color(0.38, 0.34, 0.27)
	_mat.roughness                 = 0.94
	_mat.metallic                  = 0.0
	_mat.vertex_color_use_as_albedo = true


# ----------------------------------------------------------------------------
# Public API
# ----------------------------------------------------------------------------

## Returns terrain height at world position (wx, wz).
##
## Layer A: large-scale FBM hills centred at BASE_HEIGHT.
## Layer B: smoothstep blend to BASE_HEIGHT inside castle_flat_r (flat platform).
##
## Persistent: same world_seed + position always returns the same height.
func get_height_at(wx: float, wz: float) -> float:
	var dist := sqrt(wx * wx + wz * wz)

	# Layer A -- raw FBM height centred at BASE_HEIGHT.
	# _noise returns [-1, 1], so h1 ranges [-height_scale, +height_scale].
	# Adding BASE_HEIGHT shifts average to BASE_HEIGHT.
	var h1: float = _noise.get_noise_2d(wx, wz) * height_scale
	var h2: float = _noise2.get_noise_2d(wx, wz) * height_scale * 0.25
	var raw: float = h1 + h2 + BASE_HEIGHT

	# Layer B -- castle flat zone.
	# Inner radius: locked to BASE_HEIGHT (same as average terrain).
	# Blend zone: smooth transition to raw terrain over 70% extra radius.
	var blend_r: float = castle_flat_r * 1.7
	if dist < castle_flat_r:
		return BASE_HEIGHT
	elif dist < blend_r:
		var t: float = (dist - castle_flat_r) / (blend_r - castle_flat_r)
		t = t * t * (3.0 - 2.0 * t)   # smoothstep
		return lerpf(BASE_HEIGHT, raw, t)
	return raw


## Return true if the point (wx, wz) is a valid "building slot" (Layer B).
## A slot is flat enough (slope < slope_thresh) and outside the castle zone.
func is_building_slot(wx: float, wz: float, slope_thresh: float = 0.15) -> bool:
	var dist := sqrt(wx * wx + wz * wz)
	if dist < castle_flat_r * 2.0:
		return false
	var sample := 2.0
	var h  := get_height_at(wx, wz)
	var hx := get_height_at(wx + sample, wz)
	var hz := get_height_at(wx, wz + sample)
	var slope := Vector3(sample, hx - h, 0).cross(Vector3(0, hz - h, sample)).normalized().y
	return slope > (1.0 - slope_thresh)


## Reinitialise noise after changing world_seed at runtime.
## Call this whenever world_seed is changed externally (e.g. from Main.gd).
func reinit() -> void:
	_init_noise()


## Load chunks around cam_pos, unload distant ones.  Call every frame.
func update_chunks(cam_pos: Vector3) -> void:
	var cx := int(floor(cam_pos.x / chunk_size))
	var cz := int(floor(cam_pos.z / chunk_size))

	var needed: Dictionary = {}
	for dx in range(-view_dist, view_dist + 1):
		for dz in range(-view_dist, view_dist + 1):
			var key := Vector2i(cx + dx, cz + dz)
			needed[key] = true
			if not _chunks.has(key):
				_load_chunk(key)

	for key in _chunks.keys():
		if not needed.has(key):
			_unload_chunk(key)


# ----------------------------------------------------------------------------
# Internal
# ----------------------------------------------------------------------------

func _load_chunk(key: Vector2i) -> void:
	var chunk     := _ChunkScript.new()
	chunk.ox      = key.x * chunk_size
	chunk.oz      = key.y * chunk_size
	chunk.size    = chunk_size
	chunk.segs    = segs
	chunk.terrain = self
	chunk.mat     = _mat
	add_child(chunk)
	_chunks[key] = chunk


func _unload_chunk(key: Vector2i) -> void:
	if _chunks.has(key):
		_chunks[key].queue_free()
		_chunks.erase(key)
