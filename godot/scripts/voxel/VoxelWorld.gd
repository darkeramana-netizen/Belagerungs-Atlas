extends Node3D
## VoxelWorld -- manages all VoxelChunks, provides unified block read/write.
##
## Architecture:
##   - 3D chunk grid: each chunk is 16x16x16 blocks.
##   - Y range: 0 to WORLD_HEIGHT_BLOCKS (chunks 0..WORLD_HEIGHT_CHUNKS-1).
##   - X/Z chunks loaded around player within view_dist.
##   - Dirty chunks are rebuilt one per frame to spread CPU cost.
##   - set_block() marks the chunk (and up to 3 neighbours) dirty.
##
## Block coordinates: integers, Y=0 is bedrock.
## Chunk coordinates: block_coord / 16 (floor division).

const BT         = preload("res://scripts/voxel/BlockTypes.gd")
const ChunkScene = preload("res://scripts/voxel/VoxelChunk.gd")

@export var world_seed:    int = 12345
@export var view_dist:     int = 4        # chunks radius in X/Z  (4 = 9x9=81 cols)
@export var castle_flat_r: int = 32       # flat zone radius in blocks (set by Main)

## World height in blocks and chunks.
const WORLD_HEIGHT_BLOCKS := 64
const WORLD_HEIGHT_CHUNKS := 4            # 4 * 16 = 64

## Castle base Y (the block Y where flat terrain and castle floor meet).
const BASE_Y := 20

var _chunks: Dictionary = {}             # Vector3i -> VoxelChunk
var _gen: Node = null                    # VoxelTerrainGen (set by Main after _ready)

## New XZ columns created + filled + rebuilt per update() call.
## One column = WORLD_HEIGHT_CHUNKS actual chunks.
const NEW_COLS_PER_FRAME := 2


func _ready() -> void:
	pass   # _gen is assigned externally; terrain fills via set_block() before first update


# ---------------------------------------------------------------------------
# Core block API
# ---------------------------------------------------------------------------

## Read a block at integer world coordinates. Returns AIR for out-of-range Y.
func get_block(wx: int, wy: int, wz: int) -> int:
	if wy < 0 or wy >= WORLD_HEIGHT_BLOCKS:
		return BT.AIR
	var key := _chunk_key(wx, wy, wz)
	if not _chunks.has(key):
		return BT.AIR
	var chunk: Object = _chunks[key]
	return chunk.get_local(
		_local(wx), _local(wy), _local(wz))


## Write a block. Marks the chunk (and bordering chunks) dirty.
func set_block(wx: int, wy: int, wz: int, block_id: int) -> void:
	if wy < 0 or wy >= WORLD_HEIGHT_BLOCKS:
		return
	var key := _chunk_key(wx, wy, wz)
	if not _chunks.has(key):
		_create_chunk(key)
	var chunk: Object = _chunks[key]
	chunk.set_local(_local(wx), _local(wy), _local(wz), block_id)
	_mark_borders_dirty(wx, wy, wz)


## Returns the highest solid block Y at (wx, wz), or -1 if none.
func get_surface_y(wx: int, wz: int) -> int:
	for y in range(WORLD_HEIGHT_BLOCKS - 1, -1, -1):
		if BT.is_solid(get_block(wx, y, wz)):
			return y
	return -1


## Returns the castle platform height in world-space metres (Y of top of BASE_Y block).
func get_castle_base_meters() -> float:
	return float(BASE_Y + 1)   # top surface of the base block


# ---------------------------------------------------------------------------
# Chunk streaming -- call every frame from Main._process()
# ---------------------------------------------------------------------------

func update(player_pos: Vector3) -> void:
	var pcx := int(floor(player_pos.x / 16.0))
	var pcz := int(floor(player_pos.z / 16.0))

	# Load new XZ columns (all Y levels at once), fill + rebuild immediately.
	# NEW_COLS_PER_FRAME caps per-frame CPU cost.
	var new_cols := 0
	for dx in range(-view_dist, view_dist + 1):
		for dz in range(-view_dist, view_dist + 1):
			var any_missing := false
			for cy in WORLD_HEIGHT_CHUNKS:
				if not _chunks.has(Vector3i(pcx + dx, cy, pcz + dz)):
					any_missing = true
					break
			if not any_missing:
				continue
			if new_cols >= NEW_COLS_PER_FRAME:
				continue
			new_cols += 1
			for cy in WORLD_HEIGHT_CHUNKS:
				var key := Vector3i(pcx + dx, cy, pcz + dz)
				if not _chunks.has(key):
					_create_chunk(key)
					if _gen != null:
						_gen.fill_chunk(key, self)
			for cy in WORLD_HEIGHT_CHUNKS:
				var key2 := Vector3i(pcx + dx, cy, pcz + dz)
				if _chunks.has(key2):
					_chunks[key2].rebuild()

	# Unload distant chunks
	for key in _chunks.keys():
		var k: Vector3i = key
		if abs(k.x - pcx) > view_dist + 1 or abs(k.z - pcz) > view_dist + 1:
			_unload_chunk(key)

	# Rebuild any chunks dirtied by block edits (not terrain gen)
	for key in _chunks.keys():
		if _chunks[key].is_dirty():
			_chunks[key].rebuild()


# ---------------------------------------------------------------------------
# Castle helpers
# ---------------------------------------------------------------------------

## Fill solid blocks downward from (wx, top_y, wz) until solid terrain found.
## Ensures castle walls have no gap under them ("Deep Foundations").
func fill_foundation(wx: int, top_y: int, wz: int, block_id: int) -> void:
	var surface := get_surface_y(wx, wz)
	for y in range(surface + 1, top_y):
		if get_block(wx, y, wz) == BT.AIR:
			set_block(wx, y, wz, block_id)


## Set a block only if the position is currently AIR (non-destructive placement).
func set_block_if_air(wx: int, wy: int, wz: int, block_id: int) -> void:
	if get_block(wx, wy, wz) == BT.AIR:
		set_block(wx, wy, wz, block_id)


# ---------------------------------------------------------------------------
# Internal
# ---------------------------------------------------------------------------

func _chunk_key(wx: int, wy: int, wz: int) -> Vector3i:
	return Vector3i(
		int(floor(float(wx) / 16.0)),
		int(floor(float(wy) / 16.0)),
		int(floor(float(wz) / 16.0)))


func _local(w: int) -> int:
	var m := w % 16
	return m if m >= 0 else m + 16   # correct negative modulo


func _create_chunk(key: Vector3i) -> void:
	var chunk := ChunkScene.new()
	chunk.chunk_pos = key
	chunk.world     = self
	add_child(chunk)
	_chunks[key] = chunk


func _unload_chunk(key: Vector3i) -> void:
	if _chunks.has(key):
		_chunks[key].queue_free()
		_chunks.erase(key)


func _mark_borders_dirty(wx: int, wy: int, wz: int) -> void:
	# If the edited block is at a chunk face, the adjacent chunk must also rebuild
	# so it can see whether this block is now solid (face culling update).
	var lx := _local(wx)
	var ly := _local(wy)
	var lz := _local(wz)
	if lx == 0:  _dirty_neighbour(wx - 1, wy, wz)
	if lx == 15: _dirty_neighbour(wx + 1, wy, wz)
	if ly == 0:  _dirty_neighbour(wx, wy - 1, wz)
	if ly == 15: _dirty_neighbour(wx, wy + 1, wz)
	if lz == 0:  _dirty_neighbour(wx, wy, wz - 1)
	if lz == 15: _dirty_neighbour(wx, wy, wz + 1)


func _dirty_neighbour(wx: int, wy: int, wz: int) -> void:
	var key := _chunk_key(wx, wy, wz)
	if _chunks.has(key):
		_chunks[key]._dirty = true
