extends StaticBody3D
## VoxelChunk -- greedy-meshed 16x16x16 block grid with per-vertex ambient occlusion.
##
## Greedy meshing: adjacent same-type visible faces are merged into larger quads.
## Per-vertex AO: each quad corner samples 3 neighbour blocks for corner darkening.
## One ArrayMesh per chunk (one draw call). Rebuild only when _dirty=true.

const BT   = preload("res://scripts/voxel/BlockTypes.gd")
const SIZE := 16

var chunk_pos: Vector3i = Vector3i.ZERO
var world = null   # VoxelWorld (untyped to avoid circular preload)

var _data:      PackedByteArray
var _mesh_inst: MeshInstance3D
var _col_shape: CollisionShape3D
var _dirty:     bool = true
var _mat:       StandardMaterial3D

# Face normals (outward), one per direction index fi
const _NORMALS := [
	Vector3( 1,  0,  0),  # fi=0  +X
	Vector3(-1,  0,  0),  # fi=1  -X
	Vector3( 0,  1,  0),  # fi=2  +Y
	Vector3( 0, -1,  0),  # fi=3  -Y
	Vector3( 0,  0,  1),  # fi=4  +Z
	Vector3( 0,  0, -1),  # fi=5  -Z
]

# Base directional AO per face (top brightest, bottom darkest)
const _DIR_AO := [0.80, 0.80, 1.00, 0.60, 0.85, 0.85]

# World-space neighbour offset in normal direction, matching _NORMALS order
const _NEIGH := [
	Vector3i( 1,  0,  0),
	Vector3i(-1,  0,  0),
	Vector3i( 0,  1,  0),
	Vector3i( 0, -1,  0),
	Vector3i( 0,  0,  1),
	Vector3i( 0,  0, -1),
]

# Quad vertex emission order (indices into [A,B,C,D]) per face direction.
# A=(v0,w0)  B=(v1,w0)  C=(v1,w1)  D=(v0,w1)
# Winding verified CCW viewed from outside (Godot back-face-cull default).
#   fi=0 +X  A B C D   fi=1 -X  D C B A
#   fi=2 +Y  D C B A   fi=3 -Y  D A B C
#   fi=4 +Z  A B C D   fi=5 -Z  B A D C
const _QUAD_ORDER := [
	[0, 1, 2, 3],
	[3, 2, 1, 0],
	[3, 2, 1, 0],
	[3, 0, 1, 2],
	[0, 1, 2, 3],
	[1, 0, 3, 2],
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
# Mesh + collision rebuild (greedy meshing)
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

	for fi in 6:
		_greedy_pass(fi, wx0, wy0, wz0, verts, norms, colors, idxs)

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
	_col_shape.shape = am.create_trimesh_shape()


# ---------------------------------------------------------------------------
# Greedy meshing: one pass per face direction
# ---------------------------------------------------------------------------

func _greedy_pass(fi: int, wx0: int, wy0: int, wz0: int,
		verts: PackedVector3Array, norms: PackedVector3Array,
		colors: PackedColorArray, idxs: PackedInt32Array) -> void:

	var normal:  Vector3 = _NORMALS[fi]
	var dir_ao:  float   = _DIR_AO[fi]
	var is_top:  bool    = (fi == 2)
	var neigh_d: Vector3i = (_NEIGH[fi] as Vector3i)

	# mask[v*SIZE+w] = block_id if face is visible, else 0
	var mask: PackedInt32Array = PackedInt32Array()
	mask.resize(SIZE * SIZE)

	for u in SIZE:
		mask.fill(0)

		for v in SIZE:
			for w in SIZE:
				# Map (u,v,w) to local block coords depending on face axis
				var lx: int
				var ly: int
				var lz: int
				match fi:
					0, 1:
						lx = u; ly = v; lz = w
					2, 3:
						lx = v; ly = u; lz = w
					_:   # 4, 5
						lx = v; ly = w; lz = u

				var bid: int = _data[ly * SIZE * SIZE + lz * SIZE + lx]
				if bid == BT.AIR:
					continue

				# Check the neighbour block in the face-normal direction
				var nwx: int = wx0 + lx + neigh_d.x
				var nwy: int = wy0 + ly + neigh_d.y
				var nwz: int = wz0 + lz + neigh_d.z

				if not BT.is_solid(_get_world_block(nwx, nwy, nwz)):
					mask[v * SIZE + w] = bid

		# Greedy rectangle scan over the mask
		var used: PackedByteArray = PackedByteArray()
		used.resize(SIZE * SIZE)
		used.fill(0)

		for v0 in SIZE:
			for w0 in SIZE:
				var mi: int = v0 * SIZE + w0
				if used[mi] or mask[mi] == 0:
					continue

				var bid: int = mask[mi]

				# Extend in +w direction
				var dw: int = 1
				while w0 + dw < SIZE:
					var ni: int = v0 * SIZE + w0 + dw
					if mask[ni] != bid or used[ni]:
						break
					dw += 1

				# Extend in +v direction
				var dv: int = 1
				var row_ok: bool = true
				while row_ok and v0 + dv < SIZE:
					for k in dw:
						var ni2: int = (v0 + dv) * SIZE + w0 + k
						if mask[ni2] != bid or used[ni2]:
							row_ok = false
							break
					if row_ok:
						dv += 1

				# Mark rectangle as used
				for pv in dv:
					for pw in dw:
						used[(v0 + pv) * SIZE + w0 + pw] = 1

				# Directional + block-specific top AO
				var base_col: Color = BT.get_color(bid)
				var d_ao: float = dir_ao
				if is_top:
					d_ao *= BT.get_ao_top(bid)

				# Emit one quad for the merged rectangle
				_emit_quad(fi, u, v0, w0, dv, dw, d_ao, base_col, normal,
						wx0, wy0, wz0, verts, norms, colors, idxs)


# ---------------------------------------------------------------------------
# Quad emission with per-vertex AO
# ---------------------------------------------------------------------------

func _emit_quad(fi: int, u: int, v0: int, w0: int, dv: int, dw: int,
		d_ao: float, base_col: Color, normal: Vector3,
		wx0: int, wy0: int, wz0: int,
		verts: PackedVector3Array, norms: PackedVector3Array,
		colors: PackedColorArray, idxs: PackedInt32Array) -> void:

	var v1: int = v0 + dv
	var w1: int = w0 + dw

	# Corner descriptors: [vc, wc, sv, sw]
	# sv/sw are the outward signs for AO neighbour sampling at this corner.
	var corners: Array = [
		[v0, w0, -1, -1],  # A
		[v1, w0,  1, -1],  # B
		[v1, w1,  1,  1],  # C
		[v0, w1, -1,  1],  # D
	]

	var order: Array = (_QUAD_ORDER[fi] as Array)
	var vi: int = verts.size()

	for oi in 4:
		var c: Array = corners[order[oi] as int]
		var vc: int = c[0]
		var wc: int = c[1]
		var sv: int = c[2]
		var sw: int = c[3]

		# Sample 3 AO neighbour blocks in the face plane
		var s1: bool = BT.is_solid(
				_ao_sample(fi, u, vc + sv, wc,      wx0, wy0, wz0))
		var s2: bool = BT.is_solid(
				_ao_sample(fi, u, vc,      wc + sw, wx0, wy0, wz0))
		var sc: bool = BT.is_solid(
				_ao_sample(fi, u, vc + sv, wc + sw, wx0, wy0, wz0))

		var v_ao: float = _vertex_ao(s1, s2, sc)
		var ao_total: float = d_ao * v_ao
		var col := Color(
				base_col.r * ao_total,
				base_col.g * ao_total,
				base_col.b * ao_total, 1.0)

		verts.append(_vert_pos(fi, u, vc, wc))
		norms.append(normal)
		colors.append(col)

	idxs.append(vi);     idxs.append(vi + 1); idxs.append(vi + 2)
	idxs.append(vi);     idxs.append(vi + 2); idxs.append(vi + 3)


# ---------------------------------------------------------------------------
# Helper: per-vertex AO factor (classic Minecraft corner-shadow formula)
# ---------------------------------------------------------------------------

func _vertex_ao(side1: bool, side2: bool, corner: bool) -> float:
	if side1 and side2:
		return 0.25   # fully enclosed corner: maximum darkening
	return 1.0 - (int(side1) + int(side2) + int(corner)) * 0.18


# ---------------------------------------------------------------------------
# Helper: sample a world block for AO at face-plane position (vc, wc)
# ---------------------------------------------------------------------------

func _ao_sample(fi: int, u: int, v: int, w: int,
		wx0: int, wy0: int, wz0: int) -> int:
	match fi:
		0:  # +X face plane at x=u+1
			return _get_world_block(wx0 + u + 1, wy0 + v, wz0 + w)
		1:  # -X face plane at x=u
			return _get_world_block(wx0 + u,     wy0 + v, wz0 + w)
		2:  # +Y face plane at y=u+1
			return _get_world_block(wx0 + v, wy0 + u + 1, wz0 + w)
		3:  # -Y face plane at y=u
			return _get_world_block(wx0 + v, wy0 + u,     wz0 + w)
		4:  # +Z face plane at z=u+1
			return _get_world_block(wx0 + v, wy0 + w, wz0 + u + 1)
		_:  # fi=5 -Z face plane at z=u
			return _get_world_block(wx0 + v, wy0 + w, wz0 + u    )


# ---------------------------------------------------------------------------
# Helper: local-space vertex position for a face corner (vc, wc)
# ---------------------------------------------------------------------------

func _vert_pos(fi: int, u: int, vc: int, wc: int) -> Vector3:
	match fi:
		0: return Vector3(u + 1, vc,     wc    )  # +X face at x=u+1
		1: return Vector3(u,     vc,     wc    )  # -X face at x=u
		2: return Vector3(vc,    u + 1,  wc    )  # +Y face at y=u+1
		3: return Vector3(vc,    u,      wc    )  # -Y face at y=u
		4: return Vector3(vc,    wc,     u + 1 )  # +Z face at z=u+1
		_: return Vector3(vc,    wc,     u     )  # -Z face at z=u


# ---------------------------------------------------------------------------
# Internal: query a block at world coords (may cross chunk boundary)
# ---------------------------------------------------------------------------

func _get_world_block(wx: int, wy: int, wz: int) -> int:
	if world == null:
		return BT.AIR
	return world.get_block(wx, wy, wz)
