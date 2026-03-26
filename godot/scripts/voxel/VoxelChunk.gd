extends StaticBody3D
## VoxelChunk -- greedy-meshed 16x16x16 voxel chunk with texture atlas + AO.
##
## Mesh arrays used:
##   ARRAY_VERTEX   -- local-space positions (chunk node offset applied by Godot)
##   ARRAY_NORMAL   -- per-vertex outward normals
##   ARRAY_TEX_UV   -- atlas UV: (col + within_tile_u, row + within_tile_v)
##                    Atlas shader decodes with fract(); large greedy quads tile.
##   ARRAY_COLOR    -- AO factor as greyscale (1=bright, 0=fully occluded)
##   ARRAY_INDEX    -- triangle indices
##
## Performance:
##   18x18x18 padded neighbour cache built once per rebuild() to replace
##   per-lookup Dictionary calls (world.get_block) with fast array indexing.

const BT    = preload("res://scripts/voxel/BlockTypes.gd")
const Atlas = preload("res://scripts/voxel/VoxelAtlas.gd")

const SIZE := 16
const PAD  := 18      # SIZE + 2 (one-block border)
const PAD2 := 324     # PAD * PAD

var chunk_pos: Vector3i = Vector3i.ZERO
var world = null       # VoxelWorld (untyped to avoid circular preload)

var _data:      PackedByteArray   # 4096 bytes; index ly*256 + lz*16 + lx
var _mesh_inst: MeshInstance3D
var _col_shape: CollisionShape3D
var _dirty:     bool = true


# ---------------------------------------------------------------------------
# Face direction tables
# ---------------------------------------------------------------------------

const _NORMALS := [
	Vector3( 1,  0,  0),   # fi=0  +X
	Vector3(-1,  0,  0),   # fi=1  -X
	Vector3( 0,  1,  0),   # fi=2  +Y
	Vector3( 0, -1,  0),   # fi=3  -Y
	Vector3( 0,  0,  1),   # fi=4  +Z
	Vector3( 0,  0, -1),   # fi=5  -Z
]

# Directional AO multiplier (affects AO vertex-colour brightness)
const _DIR_AO := [0.82, 0.82, 1.00, 0.62, 0.86, 0.86]

# Neighbour offset in normal direction (integer, one step in each axis)
const _NX := [ 1, -1,  0,  0,  0,  0]
const _NY := [ 0,  0,  1, -1,  0,  0]
const _NZ := [ 0,  0,  0,  0,  1, -1]

# Quad vertex emission order (index into [A,B,C,D]) per face direction.
# A=(v0,w0)  B=(v1,w0)  C=(v1,w1)  D=(v0,w1)
# Winding: CCW viewed from outside, verified per direction.
const _QUAD_ORDER := [
	[0, 1, 2, 3],   # fi=0  +X
	[3, 2, 1, 0],   # fi=1  -X
	[3, 2, 1, 0],   # fi=2  +Y
	[3, 0, 1, 2],   # fi=3  -Y
	[0, 1, 2, 3],   # fi=4  +Z
	[1, 0, 3, 2],   # fi=5  -Z
]

# Precomputed per-corner UV offsets in (u, v) within the tile grid:
# A:(0,0)  B:(0,1)  C:(1,1)  D:(1,0)   -- u=w-dir, v=v-dir
const _CORNER_U := [0, 0, 1, 1]  # indexed by corner 0=A,1=B,2=C,3=D
const _CORNER_V := [0, 1, 1, 0]


func _ready() -> void:
	_data = PackedByteArray()
	_data.resize(SIZE * SIZE * SIZE)
	_data.fill(0)
	position = Vector3(chunk_pos * SIZE)

	_mesh_inst = MeshInstance3D.new()
	_mesh_inst.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	add_child(_mesh_inst)

	_col_shape = CollisionShape3D.new()
	add_child(_col_shape)


# ---------------------------------------------------------------------------
# Public block access
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
# Rebuild -- greedy mesh + trimesh collision
# ---------------------------------------------------------------------------

func rebuild() -> void:
	_dirty = false

	var ncache: PackedByteArray = _build_ncache()

	var verts:  PackedVector3Array = PackedVector3Array()
	var norms:  PackedVector3Array = PackedVector3Array()
	var uvs:    PackedVector2Array = PackedVector2Array()   # raw local (0..dw, 0..dv) for tiling
	var uv2s:   PackedVector2Array = PackedVector2Array()   # normalised atlas tile base
	var colors: PackedColorArray   = PackedColorArray()
	var idxs:   PackedInt32Array   = PackedInt32Array()

	for fi in 6:
		_greedy_pass(fi, ncache, verts, norms, uvs, uv2s, colors, idxs)

	if verts.is_empty():
		_mesh_inst.mesh = null
		_col_shape.shape = null
		return

	var arrays := []
	arrays.resize(Mesh.ARRAY_MAX)
	arrays[Mesh.ARRAY_VERTEX]   = verts
	arrays[Mesh.ARRAY_NORMAL]   = norms
	arrays[Mesh.ARRAY_TEX_UV]   = uvs
	arrays[Mesh.ARRAY_TEX_UV2]  = uv2s
	arrays[Mesh.ARRAY_COLOR]    = colors
	arrays[Mesh.ARRAY_INDEX]    = idxs

	var am := ArrayMesh.new()
	am.add_surface_from_arrays(Mesh.PRIMITIVE_TRIANGLES, arrays)
	am.surface_set_material(0, Atlas.get_material())
	_mesh_inst.mesh = am
	_col_shape.shape = am.create_trimesh_shape()


# ---------------------------------------------------------------------------
# 18x18x18 padded neighbour cache
# ---------------------------------------------------------------------------

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
				var lx: int = x - 1
				var ly: int = y - 1
				var lz: int = z - 1
				if lx >= 0 and lx < SIZE and ly >= 0 and ly < SIZE and lz >= 0 and lz < SIZE:
					cache[y * PAD2 + z * PAD + x] = _data[ly * SIZE * SIZE + lz * SIZE + lx]
				else:
					var wx: int = wx0 + x - 1
					cache[y * PAD2 + z * PAD + x] = _get_world_block(wx, wy, wz)
	return cache


# Cache lookup: local coords -1..SIZE are valid; returns AIR for anything beyond.
func _cache_get(cache: PackedByteArray, lx: int, ly: int, lz: int) -> int:
	if lx < -1 or lx > SIZE or ly < -1 or ly > SIZE or lz < -1 or lz > SIZE:
		return BT.AIR
	return cache[(ly + 1) * PAD2 + (lz + 1) * PAD + (lx + 1)]


# ---------------------------------------------------------------------------
# Greedy meshing: one pass per face direction
# ---------------------------------------------------------------------------

func _greedy_pass(fi: int, ncache: PackedByteArray,
		verts: PackedVector3Array, norms: PackedVector3Array,
		uvs: PackedVector2Array, uv2s: PackedVector2Array,
		colors: PackedColorArray, idxs: PackedInt32Array) -> void:

	var normal:   Vector3 = _NORMALS[fi]
	var dir_ao:   float   = _DIR_AO[fi]
	var atlas_row: int    = Atlas.face_row_from_fi(fi)
	var nx:        int    = _NX[fi]
	var ny:        int    = _NY[fi]
	var nz:        int    = _NZ[fi]

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

				var neighbour: int = _cache_get(ncache, lx + nx, ly + ny, lz + nz)
				if not BT.is_solid(neighbour):
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
				var ok := true
				while ok and v0 + dv < SIZE:
					for k in dw:
						var ni2: int = (v0 + dv) * SIZE + w0 + k
						if mask[ni2] != bid or used[ni2]:
							ok = false
							break
					if ok:
						dv += 1

				# Mark used
				for pv in dv:
					for pw in dw:
						used[(v0 + pv) * SIZE + w0 + pw] = 1

				_emit_quad(fi, u, v0, w0, dv, dw, dir_ao, bid, atlas_row, normal,
						ncache, verts, norms, uvs, uv2s, colors, idxs)


# ---------------------------------------------------------------------------
# Quad emission with per-vertex AO
# ---------------------------------------------------------------------------

func _emit_quad(fi: int, u: int, v0: int, w0: int, dv: int, dw: int,
		d_ao: float, bid: int, atlas_row: int, normal: Vector3,
		ncache: PackedByteArray,
		verts: PackedVector3Array, norms: PackedVector3Array,
		uvs: PackedVector2Array, uv2s: PackedVector2Array,
		colors: PackedColorArray, idxs: PackedInt32Array) -> void:

	var v1: int = v0 + dv
	var w1: int = w0 + dw

	# UV2: normalised atlas tile base (same for all 4 corners of this quad).
	# UV2.x = atlas_col / BLOCK_COUNT,  UV2.y = atlas_row / FACE_ROWS
	var tile_base := Vector2(
		float(bid)      / float(Atlas.BLOCK_COUNT),
		float(atlas_row) / float(Atlas.FACE_ROWS))

	# Corners: [vc, wc, sv, sw]
	var corners: Array = [
		[v0, w0, -1, -1],   # A
		[v1, w0,  1, -1],   # B
		[v1, w1,  1,  1],   # C
		[v0, w1, -1,  1],   # D
	]
	var order: Array = (_QUAD_ORDER[fi] as Array)

	# UV: raw local quad position (0..dw, 0..dv).
	# The shader uses fract(UV) to tile within the block texture.
	var uv_us: Array = [0.0, 0.0, float(dw), float(dw)]  # A,B,C,D  (w-dir)
	var uv_vs: Array = [0.0, float(dv), float(dv), 0.0]  # A,B,C,D  (v-dir)

	var vi: int = verts.size()

	for oi in 4:
		var ci: int = order[oi] as int
		var vc: int = corners[ci][0]
		var wc: int = corners[ci][1]
		var sv: int = corners[ci][2]
		var sw: int = corners[ci][3]

		# Per-vertex AO
		var s1: bool = BT.is_solid(_ao_sample(fi, u, vc + sv, wc,      ncache))
		var s2: bool = BT.is_solid(_ao_sample(fi, u, vc,      wc + sw, ncache))
		var sc: bool = BT.is_solid(_ao_sample(fi, u, vc + sv, wc + sw, ncache))
		var v_ao: float = _vertex_ao(s1, s2, sc)
		var ao: float   = d_ao * v_ao

		verts.append(_vert_pos(fi, u, vc, wc))
		norms.append(normal)
		uvs.append(Vector2(uv_us[ci], uv_vs[ci]))   # raw local for tiling
		uv2s.append(tile_base)                       # atlas tile origin (constant)
		colors.append(Color(ao, ao, ao, 1.0))

	idxs.append(vi);     idxs.append(vi + 1); idxs.append(vi + 2)
	idxs.append(vi);     idxs.append(vi + 2); idxs.append(vi + 3)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

func _vertex_ao(s1: bool, s2: bool, corner: bool) -> float:
	if s1 and s2:
		return 0.25
	return 1.0 - (int(s1) + int(s2) + int(corner)) * 0.18


func _ao_sample(fi: int, u: int, v: int, w: int, ncache: PackedByteArray) -> int:
	var lx: int
	var ly: int
	var lz: int
	match fi:
		0: lx = u + 1; ly = v; lz = w
		1: lx = u;     ly = v; lz = w
		2: lx = v; ly = u + 1; lz = w
		3: lx = v; ly = u;     lz = w
		4: lx = v; ly = w; lz = u + 1
		_: lx = v; ly = w; lz = u
	return _cache_get(ncache, lx, ly, lz)


func _vert_pos(fi: int, u: int, vc: int, wc: int) -> Vector3:
	match fi:
		0: return Vector3(u + 1, vc,     wc    )
		1: return Vector3(u,     vc,     wc    )
		2: return Vector3(vc,    u + 1,  wc    )
		3: return Vector3(vc,    u,      wc    )
		4: return Vector3(vc,    wc,     u + 1 )
		_: return Vector3(vc,    wc,     u     )


func _get_world_block(wx: int, wy: int, wz: int) -> int:
	if world == null:
		return BT.AIR
	return world.get_block(wx, wy, wz)
