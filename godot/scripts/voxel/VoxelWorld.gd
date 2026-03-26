extends Node3D
## VoxelWorld -- manages all VoxelChunks, provides unified block read/write.
##
## Async generation pipeline:
##   1. update() discovers columns that need generating and queues them.
##   2. WorkerThreadPool runs _gen.generate_chunk_data() for each queued column
##      (pure data, no scene access -- thread-safe).
##   3. When a column's data is ready, _apply_column_data() is called on the
##      main thread via call_deferred(): chunks are created, block data is
##      applied, and meshes are rebuilt.
##
## Block coordinates: integers, Y=0 is bedrock.
## Chunk coordinates: block_coord / 16 (floor division).

const BT         = preload("res://scripts/voxel/BlockTypes.gd")
const ChunkScene = preload("res://scripts/voxel/VoxelChunk.gd")

@export var world_seed:    int = 12345
@export var view_dist:     int = 4        # chunk radius in X/Z (4 = 9×9 = 81 cols)
@export var castle_flat_r: int = 32       # flat zone radius in blocks (set by Main)

const WORLD_HEIGHT_BLOCKS := 64
const WORLD_HEIGHT_CHUNKS := 4            # 4 × 16 = 64

## Castle base Y (top surface of BASE_Y block = BASE_Y + 1 in world metres).
const BASE_Y := 20

var _chunks: Dictionary = {}   # Vector3i → VoxelChunk
var _gen:    Node       = null # VoxelTerrainGen (set by Main after _ready)

## XZ columns whose terrain is currently being generated on a worker thread.
var _generating: Dictionary = {}   # Vector3i(cx,0,cz) → true (sentinel)
## Max columns dispatched to worker threads simultaneously.
const MAX_ASYNC_COLS := 4


func _ready() -> void:
	pass


# ---------------------------------------------------------------------------
# Core block API
# ---------------------------------------------------------------------------

func get_block(wx: int, wy: int, wz: int) -> int:
	if wy < 0 or wy >= WORLD_HEIGHT_BLOCKS:
		return BT.AIR
	var key := _chunk_key(wx, wy, wz)
	if not _chunks.has(key):
		return BT.AIR
	return (_chunks[key] as Object).get_local(_local(wx), _local(wy), _local(wz))


func set_block(wx: int, wy: int, wz: int, block_id: int) -> void:
	if wy < 0 or wy >= WORLD_HEIGHT_BLOCKS:
		return
	var key := _chunk_key(wx, wy, wz)
	if not _chunks.has(key):
		_create_chunk(key)
	(_chunks[key] as Object).set_local(_local(wx), _local(wy), _local(wz), block_id)
	_mark_borders_dirty(wx, wy, wz)


func get_surface_y(wx: int, wz: int) -> int:
	for y in range(WORLD_HEIGHT_BLOCKS - 1, -1, -1):
		if BT.is_solid(get_block(wx, y, wz)):
			return y
	return -1


func get_castle_base_meters() -> float:
	return float(BASE_Y + 1)


# ---------------------------------------------------------------------------
# Chunk streaming -- call every frame from Main._process()
# ---------------------------------------------------------------------------

func update(player_pos: Vector3) -> void:
	var pcx := int(floor(player_pos.x / 16.0))
	var pcz := int(floor(player_pos.z / 16.0))

	# Dispatch new XZ columns to worker threads.
	for dx in range(-view_dist, view_dist + 1):
		for dz in range(-view_dist, view_dist + 1):
			var col_key := Vector3i(pcx + dx, 0, pcz + dz)

			# Skip if already loaded or already generating.
			var all_loaded := true
			for cy in WORLD_HEIGHT_CHUNKS:
				if not _chunks.has(Vector3i(pcx + dx, cy, pcz + dz)):
					all_loaded = false
					break
			if all_loaded or _generating.has(col_key):
				continue
			if _generating.size() >= MAX_ASYNC_COLS:
				break

			_generating[col_key] = true
			# Capture variables for the closure.
			var cap_key   := col_key
			var cap_gen   := _gen
			var cap_flat  := castle_flat_r
			var cap_world := self
			WorkerThreadPool.add_task(func() -> void:
				# Runs on worker thread -- only pure computation, NO scene ops.
				var col_data: Array[PackedByteArray] = []
				for cy in WORLD_HEIGHT_CHUNKS:
					var chunk_k := Vector3i(cap_key.x, cy, cap_key.z)
					var data: PackedByteArray
					if cap_gen != null:
						data = cap_gen.generate_chunk_data(chunk_k, cap_flat)
					else:
						data = PackedByteArray()
						data.resize(16 * 16 * 16)
					col_data.append(data)
				# Hand results back to the main thread.
				cap_world.call_deferred("_apply_column_data", cap_key, col_data)
			)

	# Unload distant chunks.
	for key in _chunks.keys():
		var k: Vector3i = key as Vector3i
		if abs(k.x - pcx) > view_dist + 1 or abs(k.z - pcz) > view_dist + 1:
			_unload_chunk(key)

	# Rebuild chunks dirtied by block edits (castle placement, player edits).
	for key in _chunks.keys():
		if (_chunks[key] as Object).is_dirty():
			(_chunks[key] as Object).rebuild()


## Called on the main thread once a worker thread finishes generating a column.
func _apply_column_data(col_key: Vector3i, col_data: Array) -> void:
	_generating.erase(col_key)

	for cy in WORLD_HEIGHT_CHUNKS:
		var chunk_k := Vector3i(col_key.x, cy, col_key.z)
		if not _chunks.has(chunk_k):
			_create_chunk(chunk_k)
		var chunk: Object = _chunks[chunk_k]
		var new_data: PackedByteArray = col_data[cy]
		# Merge: only write AIR→block (don't overwrite castle/edit blocks).
		var old_data: PackedByteArray = chunk._data
		for i in new_data.size():
			if old_data[i] == BT.AIR and new_data[i] != BT.AIR:
				old_data[i] = new_data[i]
		chunk._data  = old_data
		chunk._dirty = true

	# Rebuild all chunks in this column immediately (they were just filled).
	for cy in WORLD_HEIGHT_CHUNKS:
		var chunk_k := Vector3i(col_key.x, cy, col_key.z)
		if _chunks.has(chunk_k):
			(_chunks[chunk_k] as Object).rebuild()


# ---------------------------------------------------------------------------
# Castle helpers
# ---------------------------------------------------------------------------

func fill_foundation(wx: int, top_y: int, wz: int, block_id: int) -> void:
	var surface := get_surface_y(wx, wz)
	for y in range(surface + 1, top_y):
		if get_block(wx, y, wz) == BT.AIR:
			set_block(wx, y, wz, block_id)


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
	return m if m >= 0 else m + 16


func _create_chunk(key: Vector3i) -> void:
	var chunk := ChunkScene.new()
	chunk.chunk_pos = key
	chunk.world     = self
	add_child(chunk)
	_chunks[key] = chunk


func _unload_chunk(key: Vector3i) -> void:
	if _chunks.has(key):
		(_chunks[key] as Object).queue_free()
		_chunks.erase(key)


func _mark_borders_dirty(wx: int, wy: int, wz: int) -> void:
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
		(_chunks[key] as Object)._dirty = true
