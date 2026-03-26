extends StaticBody3D
## VoxelChunk -- stores one 16x16x16 block grid and renders it.
##
## Performance strategy:
##   - Face culling: only emit quads facing AIR/transparent neighbours.
##   - Direction AO: top faces brightest, bottom darkest (cheap Minecraft-style shading).
##   - One ArrayMesh per chunk = one draw call per chunk.
##   - Rebuild only when _dirty = true.
##   - Neighbour blocks at chunk boundaries are queried through world.get_block().
##
## Set chunk_pos and world BEFORE calling add_child() so _ready() can build.

const BT = preload("res://scripts/voxel/BlockTypes.gd")
const SIZE := 16   # blocks per edge (16^3 = 4096 blocks per chunk)

## Chunk coordinate (not block coordinate). Block origin = chunk_pos * SIZE.
var chunk_pos: Vector3i = Vector3i.ZERO

## Reference to VoxelWorld for cross-chunk neighbour queries.
var world = null   # VoxelWorld (untyped to avoid circular preload)

var _data: PackedByteArray          # SIZE^3 bytes, index = y*SIZE*SIZE + z*SIZE + x
var _mesh_inst: MeshInstance3D
var _col_shape: CollisionShape3D
var _dirty: bool = true
var _mat: StandardMaterial3D

# ---------------------------------------------------------------------------
# Winding-order-verified face definitions.
# Each face: [normal: Vector3, ao_factor: float, v0..v3 offsets: Vector3]
# Offset coordinates relative to block origin (0,0,0)-(1,1,1).
# Winding is CCW viewed from outside (Godot default = back-face culled).
# All normals verified via cross(e1,e2) == normal.
# ---------------------------------------------------------------------------
const _FACES := [
	# +X  normal=(1,0,0), cross((0,1,0),(0,1,1))=(1,0,0) OK
	[Vector3( 1, 0, 0), 0.80,
		Vector3(1,0,0), Vector3(1,1,0), Vector3(1,1,1), Vector3(1,0,1)],
	# -X  normal=(-1,0,0), cross((0,1,0),(0,1,-1))=(-1,0,0) OK
	[Vector3(-1, 0, 0), 0.80,
		Vector3(0,0,1), Vector3(0,1,1), Vector3(0,1,0), Vector3(0,0,0)],
	# +Y  normal=(0,1,0), cross((1,0,0),(1,0,-1))=(0,1,0) OK  -- uses ao_top from block
	[Vector3( 0, 1, 0), 1.00,
		Vector3(0,1,1), Vector3(1,1,1), Vector3(1,1,0), Vector3(0,1,0)],
	# -Y  normal=(0,-1,0), cross((0,0,-1),(1,0,-1))=(0,-1,0) OK
	[Vector3( 0,-1, 0), 0.60,
		Vector3(0,0,1), Vector3(0,0,0), Vector3(1,0,0), Vector3(1,0,1)],
	# +Z  normal=(0,0,1), cross((1,0,0),(1,1,0))=(0,0,1) OK
	[Vector3( 0, 0, 1), 0.85,
		Vector3(0,0,1), Vector3(1,0,1), Vector3(1,1,1), Vector3(0,1,1)],
	# -Z  normal=(0,0,-1), cross((-1,0,0),(-1,1,0))=(0,0,-1) OK
	[Vector3( 0, 0,-1), 0.85,
		Vector3(1,0,0), Vector3(0,0,0), Vector3(0,1,0), Vector3(1,1,0)],
]

# Neighbour offsets matching _FACES order
const _NEIGH := [
	Vector3i( 1, 0, 0), Vector3i(-1, 0, 0),
	Vector3i( 0, 1, 0), Vector3i( 0,-1, 0),
	Vector3i( 0, 0, 1), Vector3i( 0, 0,-1),
]


func _ready() -> void:
	_data = PackedByteArray()
	_data.resize(SIZE * SIZE * SIZE)
	_data.fill(0)

	position = Vector3(chunk_pos * SIZE)

	_mat = StandardMaterial3D.new()
	_mat.vertex_color_use_as_albedo = true
	_mat.roughness = 0.88
	_mat.metallic  = 0.0

	_mesh_inst = MeshInstance3D.new()
	_mesh_inst.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON
	add_child(_mesh_inst)

	_col_shape = CollisionShape3D.new()
	add_child(_col_shape)


# ---------------------------------------------------------------------------
# Public block access (local chunk coords 0..SIZE-1)
# ---------------------------------------------------------------------------

func get_local(lx: int, ly: int, lz: int) -> int:
	if lx < 0 or lx >= SIZE or ly < 0 or ly >= SIZE or lz < 0 or lz >= SIZE:
		return BT.AIR
	return _data[ly * SIZE * SIZE + lz * SIZE + lx]


func set_local(lx: int, ly: int, lz: int, block_id: int) -> void:
	if lx < 0 or lx >= SIZE or ly < 0 or ly >= SIZE or lz < 0 or lz >= SIZE:
		return
	_data[ly * SIZE * SIZE + lz * SIZE + lx] = block_id
	_dirty = true


func is_dirty() -> bool:
	return _dirty


# ---------------------------------------------------------------------------
# Mesh + collision rebuild
# ---------------------------------------------------------------------------

func rebuild() -> void:
	_dirty = false
	var wx0 := chunk_pos.x * SIZE
	var wy0 := chunk_pos.y * SIZE
	var wz0 := chunk_pos.z * SIZE

	var verts:  PackedVector3Array = PackedVector3Array()
	var norms:  PackedVector3Array = PackedVector3Array()
	var colors: PackedColorArray   = PackedColorArray()
	var idxs:   PackedInt32Array   = PackedInt32Array()

	for ly in SIZE:
		for lz in SIZE:
			for lx in SIZE:
				var bid: int = _data[ly * SIZE * SIZE + lz * SIZE + lx]
				if bid == BT.AIR:
					continue

				var base_col: Color = BT.get_color(bid)
				var ao_top: float   = BT.get_ao_top(bid)
				var wx := wx0 + lx
				var wy := wy0 + ly
				var wz := wz0 + lz

				for fi in 6:
					var face    = _FACES[fi]
					var neigh: Vector3i = Vector3i(wx, wy, wz) + (_NEIGH[fi] as Vector3i)
					var nid: int = _get_world_block(neigh.x, neigh.y, neigh.z)

					# Only emit face if neighbour is transparent
					if BT.is_solid(nid):
						continue

					var ao: float = face[1]
					if fi == 2:    # +Y face: use block-specific top AO multiplier
						ao *= ao_top

					var col: Color = Color(
						base_col.r * ao, base_col.g * ao, base_col.b * ao, 1.0)

					var vi: int = verts.size()
					var bx := float(wx)
					var by_ := float(wy)
					var bz := float(wz)

					# Add 4 vertices using face offsets (index 2..5)
					verts.append(Vector3(bx + face[2].x, by_ + face[2].y, bz + face[2].z))
					verts.append(Vector3(bx + face[3].x, by_ + face[3].y, bz + face[3].z))
					verts.append(Vector3(bx + face[4].x, by_ + face[4].y, bz + face[4].z))
					verts.append(Vector3(bx + face[5].x, by_ + face[5].y, bz + face[5].z))

					var n: Vector3 = face[0]
					norms.append(n); norms.append(n); norms.append(n); norms.append(n)
					colors.append(col); colors.append(col); colors.append(col); colors.append(col)

					# Two triangles per quad (CCW)
					idxs.append(vi);     idxs.append(vi + 1); idxs.append(vi + 2)
					idxs.append(vi);     idxs.append(vi + 2); idxs.append(vi + 3)

	if verts.is_empty():
		_mesh_inst.mesh = null
		_col_shape.shape = null
		return

	var arrays := []
	arrays.resize(Mesh.ARRAY_MAX)
	arrays[Mesh.ARRAY_VERTEX] = verts
	arrays[Mesh.ARRAY_NORMAL] = norms
	arrays[Mesh.ARRAY_COLOR]  = colors
	arrays[Mesh.ARRAY_INDEX]  = idxs

	var am := ArrayMesh.new()
	am.add_surface_from_arrays(Mesh.PRIMITIVE_TRIANGLES, arrays)
	am.surface_set_material(0, _mat)
	_mesh_inst.mesh = am

	# Trimesh collision from the final mesh
	_col_shape.shape = am.create_trimesh_shape()


# ---------------------------------------------------------------------------
# Internal: query a block at world coords, crossing chunk boundaries
# ---------------------------------------------------------------------------

func _get_world_block(wx: int, wy: int, wz: int) -> int:
	if world == null:
		return BT.AIR
	return world.get_block(wx, wy, wz)
