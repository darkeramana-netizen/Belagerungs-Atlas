extends StaticBody3D
## VoxelChunk -- greedy-meshed 16x16x16 voxel chunk with per-vertex AO.
##
## Performance strategy:
##   Build a 18x18x18 padded-neighbor cache once per rebuild(), then use fast
##   array indexing for all face-cull and AO checks instead of Dictionary lookups.
##   Target: < 0.5 ms per rebuild for a typical terrain chunk.
##
## Visual strategy:
##   SHADING_MODE_UNSHADED -- vertex colors appear exactly as written.
##   Directional AO baked into colors (top=1.0, sides=0.80/0.85, bottom=0.60).
##   Per-vertex corner AO: Minecraft-style shadow at concave edges.

const BT   = preload("res://scripts/voxel/BlockTypes.gd")
const SIZE := 16
const PAD  := 18      # SIZE + 2 (one block border on each side)
const PAD2 := 324     # PAD * PAD

var chunk_pos: Vector3i = Vector3i.ZERO
var world = null       # VoxelWorld (untyped to avoid circular preload)

var _data:      PackedByteArray   # 4096 bytes, index: ly*256 + lz*16 + lx
var _mesh_inst: MeshInstance3D
var _col_shape: CollisionShape3D
var _dirty:     bool = true
var _mat:       StandardMaterial3D


# ---------------------------------------------------------------------------
# Face tables  (all plain Arrays -- typed Array[X] causes issues in const)
# ---------------------------------------------------------------------------

# Outward face normal per direction index fi
const _NORMALS := [
	Vector3( 1,  0,  0),   # fi=0  +X
	Vector3(-1,  0,  0),   # fi=1  -X
	Vector3( 0,  1,  0),   # fi=2  +Y
	Vector3( 0, -1,  0),   # fi=3  -Y
	Vector3( 0,  0,  1),   # fi=4  +Z
	Vector3( 0,  0, -1),   # fi=5  -Z
]

# Directional AO multiplier per face (top brightest, bottom darkest)
const _DIR_AO := [0.80, 0.80, 1.00, 0.60, 0.85, 0.85]

# Integer neighbour offset in normal direction (used for face cull check)
# These are applied in LOCAL chunk coords; values: -1, 0, +1
const _NX := [ 1, -1,  0,  0,  0,  0]
const _NY := [ 0,  0,  1, -1,  0,  0]
const _NZ := [ 0,  0,  0,  0,  1, -1]

# Quad vertex emission order (index into [A,B,C,D]) per fi.
# A=(v0,w0)  B=(v1,w0)  C=(v1,w1)  D=(v0,w1)
# Winding verified CCW from outside for each face.
const _QUAD_ORDER := [
	[0, 1, 2, 3],   # fi=0  +X
	[3, 2, 1, 0],   # fi=1  -X
	[3, 2, 1, 0],   # fi=2  +Y
	[3, 0, 1, 2],   # fi=3  -Y
	[0, 1, 2, 3],   # fi=4  +Z
	[1, 0, 3, 2],   # fi=5  -Z
]


func _ready() -> void:
	_data = PackedByteArray()
	_data.resize(SIZE * SIZE * SIZE)
	_data.fill(0)
	position = Vector3(chunk_pos * SIZE)

	_mat = StandardMaterial3D.new()
	_mat.shading_mode              = BaseMaterial3D.SHADING_MODE_UNSHADED
	_mat.vertex_color_use_as_albedo = true
	_mat.roughness                 = 1.0
	_mat.metallic                  = 0.0
	_mat.cull_mode                 = BaseMaterial3D.CULL_BACK

	_mesh_inst = MeshInstance3D.new()
	_mesh_inst.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	add_child(_mesh_inst)

	_col_shape = CollisionShape3D.new()
	add_child(_col_shape)


# ---------------------------------------------------------------------------
# Public block access  (local chunk coords 0..SIZE-1)
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
# Rebuild: greedy-meshed ArrayMesh + trimesh collision
# ---------------------------------------------------------------------------

func rebuild() -> void:
	_dirty = false

	# Build the 18x18x18 padded neighbour cache (fast array for all lookups)
	var ncache: PackedByteArray = _build_ncache()

	var verts:  PackedVector3Array = PackedVector3Array()
	var norms:  PackedVector3Array = PackedVector3Array()
	var colors: PackedColorArray   = PackedColorArray()
	var idxs:   PackedInt32Array   = PackedInt32Array()

	for fi in 6:
		_greedy_pass(fi, ncache, verts, norms, colors, idxs)

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
# 18x18x18 padded neighbour cache
# ---------------------------------------------------------------------------
# Maps local coords [-1..16] to cache index (x+1) + (z+1)*18 + (y+1)*324.
# Built once per rebuild; all face-cull and AO checks use this array.

func _build_ncache() -> PackedByteArray:
	var wx0 := chunk_pos.x * SIZE
	var wy0 := chunk_pos.y * SIZE
	var wz0 := chunk_pos.z * SIZE

	var cache := PackedByteArray()
	cache.resize(PAD * PAD * PAD)

	for y in PAD:
		var wy: int = wy0 + y - 1
		var y_ok: bool = (wy >= 0 and wy < 64)
		for z in PAD:
			var wz: int = wz0 + z - 1
			for x in PAD:
				if not y_ok:
					cache[y * PAD2 + z * PAD + x] = BT.AIR
					continue
				var wx: int = wx0 + x - 1
				# In-chunk fast path: read directly from _data
				var lx: int = x - 1
				var ly: int = y - 1
				var lz: int = z - 1
				if lx >= 0 and lx < SIZE and ly >= 0 and ly < SIZE and lz >= 0 and lz < SIZE:
					cache[y * PAD2 + z * PAD + x] = _data[ly * SIZE * SIZE + lz * SIZE + lx]
				else:
					# Border: query neighbouring chunk via world
					cache[y * PAD2 + z * PAD + x] = _get_world_block(wx, wy, wz)
	return cache


# Cache lookup: local coords (lx,ly,lz) may be -1 or 16 (border)
func _cache_get(cache: PackedByteArray, lx: int, ly: int, lz: int) -> int:
	return cache[(ly + 1) * PAD2 + (lz + 1) * PAD + (lx + 1)]


# ---------------------------------------------------------------------------
# Greedy meshing: one pass per face direction
# ---------------------------------------------------------------------------

func _greedy_pass(fi: int, ncache: PackedByteArray,
		verts: PackedVector3Array, norms: PackedVector3Array,
		colors: PackedColorArray, idxs: PackedInt32Array) -> void:

	var normal:  Vector3 = _NORMALS[fi]
	var dir_ao:  float   = _DIR_AO[fi]
	var is_top:  bool    = (fi == 2)
	var nx:      int     = _NX[fi]
	var ny:      int     = _NY[fi]
	var nz:      int     = _NZ[fi]

	# mask[v*SIZE+w] = block_id if face visible, else 0
	var mask: PackedInt32Array = PackedInt32Array()
	mask.resize(SIZE * SIZE)

	for u in SIZE:
		mask.fill(0)

		for v in SIZE:
			for w in SIZE:
				var lx: int
				var ly: int
				var lz: int
				# Map (u,v,w) to local (lx,ly,lz) per face axis
				match fi:
					0, 1:
						lx = u; ly = v; lz = w
					2, 3:
						lx = v; ly = u; lz = w
					_:  # 4, 5
						lx = v; ly = w; lz = u

				var bid: int = _data[ly * SIZE * SIZE + lz * SIZE + lx]
				if bid == BT.AIR:
					continue

				# Face cull: only emit if neighbour in normal direction is not solid
				var neighbour_bid: int = _cache_get(ncache, lx + nx, ly + ny, lz + nz)
				if not BT.is_solid(neighbour_bid):
					mask[v * SIZE + w] = bid

		# Greedy rectangle scan
		var used: PackedByteArray = PackedByteArray()
		used.resize(SIZE * SIZE)
		used.fill(0)

		for v0 in SIZE:
			for w0 in SIZE:
				if used[v0 * SIZE + w0] or mask[v0 * SIZE + w0] == 0:
					continue

				var bid: int = mask[v0 * SIZE + w0]

				# Extend in +w
				var dw: int = 1
				while w0 + dw < SIZE:
					var ni: int = v0 * SIZE + w0 + dw
					if mask[ni] != bid or used[ni]:
						break
					dw += 1

				# Extend in +v
				var dv: int = 1
				var row_ok := true
				while row_ok and v0 + dv < SIZE:
					for k in dw:
						var ni2: int = (v0 + dv) * SIZE + w0 + k
						if mask[ni2] != bid or used[ni2]:
							row_ok = false
							break
					if row_ok:
						dv += 1

				# Mark used
				for pv in dv:
					for pw in dw:
						used[(v0 + pv) * SIZE + w0 + pw] = 1

				# Base colour with directional AO
				var base_col: Color = BT.get_color(bid)
				var d_ao: float = dir_ao
				if is_top:
					d_ao *= BT.get_ao_top(bid)

				_emit_quad(fi, u, v0, w0, dv, dw, d_ao, base_col, normal,
						ncache, verts, norms, colors, idxs)


# ---------------------------------------------------------------------------
# Quad emission with per-vertex AO
# ---------------------------------------------------------------------------

func _emit_quad(fi: int, u: int, v0: int, w0: int, dv: int, dw: int,
		d_ao: float, base_col: Color, normal: Vector3,
		ncache: PackedByteArray,
		verts: PackedVector3Array, norms: PackedVector3Array,
		colors: PackedColorArray, idxs: PackedInt32Array) -> void:

	var v1: int = v0 + dv
	var w1: int = w0 + dw

	# Corner descriptors [vc, wc, sv, sw]: face-plane pos + outward AO signs
	var corners: Array = [
		[v0, w0, -1, -1],   # A
		[v1, w0,  1, -1],   # B
		[v1, w1,  1,  1],   # C
		[v0, w1, -1,  1],   # D
	]
	var order: Array = (_QUAD_ORDER[fi] as Array)

	var vi: int = verts.size()

	for oi in 4:
		var ci: int   = order[oi] as int
		var vc: int   = corners[ci][0]
		var wc: int   = corners[ci][1]
		var sv: int   = corners[ci][2]
		var sw: int   = corners[ci][3]

		# Per-vertex AO: sample 3 blocks adjacent to this vertex in the face plane
		var s1: bool = BT.is_solid(_ao_sample_cache(fi, u, vc + sv, wc,      ncache))
		var s2: bool = BT.is_solid(_ao_sample_cache(fi, u, vc,      wc + sw, ncache))
		var sc: bool = BT.is_solid(_ao_sample_cache(fi, u, vc + sv, wc + sw, ncache))

		var v_ao: float = _vertex_ao(s1, s2, sc)
		var ao_total: float = d_ao * v_ao
		var col: Color = Color(
				base_col.r * ao_total,
				base_col.g * ao_total,
				base_col.b * ao_total, 1.0)

		verts.append(_vert_pos(fi, u, vc, wc))
		norms.append(normal)
		colors.append(col)

	idxs.append(vi);     idxs.append(vi + 1); idxs.append(vi + 2)
	idxs.append(vi);     idxs.append(vi + 2); idxs.append(vi + 3)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

# Per-vertex AO: Mikola Lysenko formula. Returns 0.25..1.0.
func _vertex_ao(side1: bool, side2: bool, corner: bool) -> float:
	if side1 and side2:
		return 0.25
	return 1.0 - (int(side1) + int(side2) + int(corner)) * 0.18


# Sample block at face-plane position (vc, wc) for AO -- uses padded cache.
# The face plane is one block OUTSIDE the current solid block (the visible side).
func _ao_sample_cache(fi: int, u: int, v: int, w: int,
		ncache: PackedByteArray) -> int:
	# Map (u, v, w) to LOCAL coords of the AO sample block.
	# The sample is at the face plane: one step in normal direction.
	var lx: int
	var ly: int
	var lz: int
	match fi:
		0:  # +X face at x=u+1; v=Y, w=Z
			lx = u + 1; ly = v; lz = w
		1:  # -X face at x=u;   v=Y, w=Z
			lx = u;     ly = v; lz = w
		2:  # +Y face at y=u+1; v=X, w=Z
			lx = v; ly = u + 1; lz = w
		3:  # -Y face at y=u;   v=X, w=Z
			lx = v; ly = u;     lz = w
		4:  # +Z face at z=u+1; v=X, w=Y
			lx = v; ly = w; lz = u + 1
		_:  # fi=5 -Z face at z=u; v=X, w=Y
			lx = v; ly = w; lz = u
	# Cache supports indices -1..16 (padded border)
	return _cache_get(ncache, lx, ly, lz)


# Local-space vertex position for a face corner (vc, wc).
func _vert_pos(fi: int, u: int, vc: int, wc: int) -> Vector3:
	match fi:
		0: return Vector3(u + 1, vc,     wc    )   # +X face at x=u+1
		1: return Vector3(u,     vc,     wc    )   # -X face at x=u
		2: return Vector3(vc,    u + 1,  wc    )   # +Y face at y=u+1
		3: return Vector3(vc,    u,      wc    )   # -Y face at y=u
		4: return Vector3(vc,    wc,     u + 1 )   # +Z face at z=u+1
		_: return Vector3(vc,    wc,     u     )   # -Z face at z=u


# Query a block at world coordinates via the VoxelWorld.
func _get_world_block(wx: int, wy: int, wz: int) -> int:
	if world == null:
		return BT.AIR
	return world.get_block(wx, wy, wz)
