extends Node3D
## VoxelWorld -- manages all VoxelChunks, provides unified block read/write.
##
## Chunk streaming:
##   - update() loads at most NEW_COLS_PER_FRAME new XZ columns per frame.
##   - Each column = WORLD_HEIGHT_CHUNKS stacked chunks (16 blocks tall each).
##   - Terrain is generated synchronously on the main thread to avoid
##     thread-safety issues with FastNoiseLite + GDScript objects.
##   - Dirty chunks (from block edits) are rebuilt MAX_REBUILDS_PER_FRAME per frame.
##
## Block coordinates: integers, Y=0 is bedrock.
## Chunk coordinates: block_coord / 16 (floor division).

const BT         = preload("res://scripts/voxel/BlockTypes.gd")
const ChunkScene = preload("res://scripts/voxel/VoxelChunk.gd")

@export var world_seed:    int = 12345
@export var view_dist:     int = 6        # chunk radius in X/Z (6 = 13×13 = 169 cols)
@export var castle_flat_r: int = 32       # flat zone radius in blocks (set by Main)

const WORLD_HEIGHT_BLOCKS := 64
const WORLD_HEIGHT_CHUNKS := 4            # 4 × 16 = 64

## Castle base Y (top surface of BASE_Y block = BASE_Y + 1 in world metres).
const BASE_Y := 20

## How many new XZ columns to generate per update() call.
## Higher = faster loading but more frame stutter.
const NEW_COLS_PER_FRAME   := 1
## Max dirty-chunk rebuilds per update() call (for block-edit dirty marks).
const MAX_REBUILDS_PER_FRAME := 4

var _chunks: Dictionary = {}   # Vector3i → VoxelChunk
var _gen:    Node       = null # VoxelTerrainGen (set by Main after _ready)


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

	# Generate new XZ columns (all Y levels), limited per frame.
	var new_cols := 0
	for dx in range(-view_dist, view_dist + 1):
		if new_cols >= NEW_COLS_PER_FRAME:
			break
		for dz in range(-view_dist, view_dist + 1):
			if new_cols >= NEW_COLS_PER_FRAME:
				break
			var any_missing := false
			for cy in WORLD_HEIGHT_CHUNKS:
				if not _chunks.has(Vector3i(pcx + dx, cy, pcz + dz)):
					any_missing = true
					break
			if not any_missing:
				continue
			new_cols += 1
			# Create + fill + rebuild this entire XZ column.
			for cy in WORLD_HEIGHT_CHUNKS:
				var key := Vector3i(pcx + dx, cy, pcz + dz)
				if not _chunks.has(key):
					_create_chunk(key)
					if _gen != null:
						_gen.fill_chunk(key, self)
			for cy in WORLD_HEIGHT_CHUNKS:
				var key2 := Vector3i(pcx + dx, cy, pcz + dz)
				if _chunks.has(key2):
					(_chunks[key2] as Object).rebuild()

			# When this column loaded, fill_chunk called set_block on its border
			# blocks, which marked the 4 adjacent already-loaded columns dirty.
			# Those stale ncaches would show inner ghost-faces until the normal
			# dirty-rebuild loop catches them (up to MAX_REBUILDS_PER_FRAME/frame).
			# Rebuild them immediately in the same frame so they are never visible.
			for neighbour_offset in [Vector2i(-1, 0), Vector2i(1, 0),
									  Vector2i(0, -1), Vector2i(0, 1)]:
				for cy in WORLD_HEIGHT_CHUNKS:
					var nkey := Vector3i(pcx + dx + neighbour_offset.x, cy,
										  pcz + dz + neighbour_offset.y)
					if _chunks.has(nkey) and (_chunks[nkey] as Object).is_dirty():
						(_chunks[nkey] as Object).rebuild()

	# Unload distant chunks.
	for key in _chunks.keys():
		var k: Vector3i = key as Vector3i
		if abs(k.x - pcx) > view_dist + 1 or abs(k.z - pcz) > view_dist + 1:
			_unload_chunk(key)

	# Rebuild chunks dirtied by block edits, limited per frame.
	var rebuilts := 0
	for key in _chunks.keys():
		if rebuilts >= MAX_REBUILDS_PER_FRAME:
			break
		if (_chunks[key] as Object).is_dirty():
			(_chunks[key] as Object).rebuild()
			rebuilts += 1


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
