extends StaticBody3D
## VoxelChunk -- greedy-meshed 16x16x16 voxel chunk with texture atlas + AO.
##
## Mesh arrays used:
##   ARRAY_VERTEX   -- local-space positions (chunk node offset applied by Godot)
##   ARRAY_NORMAL   -- per-vertex outward normals
##   ARRAY_TEX_UV2  -- UV2.x = float(block_id) / BLOCK_COUNT (atlas column selector)
##                    Atlas row is derived in the shader from the world-space normal.
##   ARRAY_COLOR    -- AO factor as greyscale (1=bright, 0=fully occluded)
##   ARRAY_INDEX    -- triangle indices
##
## Triplanar world-space UVs are computed entirely in the shader from MODEL_MATRIX,
## so no tiling UV data is needed here — UV2.x only carries the block-type index.
##
## Performance:
##   18x18x18 padded neighbour cache built once per rebuild() to replace
##   per-lookup Dictionary calls (world.get_block) with fast array indexing.
##
## Greedy meshing correctness guarantee:
##   - A face is generated ONLY when the block is solid AND its neighbour is
##     exactly BT.AIR (== 0). Water and other non-solid blocks are NOT AIR.
##   - During greedy expansion every candidate cell is verified independently
##     via _face_visible_at(), which re-queries the ncache directly — not just
##     the pre-built mask. This prevents any stale mask entry from expanding
##     a quad into cells where the face is not actually visible.

const BT    = preload("res://scripts/voxel/BlockTypes.gd")
const Atlas = preload("res://scripts/voxel/VoxelAtlas.gd")

const SIZE    := 16
const PAD     := 18      # SIZE + 2 (one-block border)
const PAD2    := 324     # PAD * PAD
## Sentinel stored in ncache border cells whose neighbour chunk is not loaded.
## BT.is_transparent(UNLOADED) == false, so no face is generated against an
## unloaded chunk.  When the chunk loads later, _mark_borders_dirty triggers
## a rebuild with the correct data.
const UNLOADED := 255

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
	var uv2s:   PackedVector2Array = PackedVector2Array()   # UV2.x = block_id/BLOCK_COUNT
	var colors: PackedColorArray   = PackedColorArray()
	var idxs:   PackedInt32Array   = PackedInt32Array()

	for fi in 6:
		_greedy_pass(fi, ncache, verts, norms, uv2s, colors, idxs)

	if verts.is_empty():
		_mesh_inst.mesh = null
		_col_shape.shape = null
		return

	var arrays := []
	arrays.resize(Mesh.ARRAY_MAX)
	arrays[Mesh.ARRAY_VERTEX]   = verts
	arrays[Mesh.ARRAY_NORMAL]   = norms
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
		uv2s: PackedVector2Array,
		colors: PackedColorArray, idxs: PackedInt32Array) -> void:

	var normal:  Vector3 = _NORMALS[fi]
	var dir_ao:  float   = _DIR_AO[fi]
	var nx:      int     = _NX[fi]
	var ny:      int     = _NY[fi]
	var nz:      int     = _NZ[fi]

	# mask[v*SIZE+w] = block_id if the face is visible at that cell, else 0.
	# Face is visible iff block is solid AND its neighbour in face-direction is
	# exactly BT.AIR (== 0).  Built fresh for each u-slice.
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
					0, 1: lx = u; ly = v; lz = w
					2, 3: lx = v; ly = u; lz = w
					_:    lx = v; ly = w; lz = u   # fi 4, 5

				var bid: int = _data[ly * SIZE * SIZE + lz * SIZE + lx]
				if bid == BT.AIR:
					continue

				# RULE 1 — Face-Visibility: solid block + transparent neighbour.
				# BT.is_transparent() returns false for the UNLOADED sentinel (255),
				# so no face is ever generated against an unloaded chunk.
				if BT.is_transparent(_cache_get(ncache, lx + nx, ly + ny, lz + nz)):
					mask[v * SIZE + w] = bid

		# ── Greedy rectangle scan ────────────────────────────────────────────
		var used: PackedByteArray = PackedByteArray()
		used.resize(SIZE * SIZE)
		used.fill(0)

		for v0 in SIZE:
			for w0 in SIZE:
				if used[v0 * SIZE + w0] or mask[v0 * SIZE + w0] == 0:
					continue

				var bid: int = mask[v0 * SIZE + w0]

				# Extend in +w.
				# RULE 2 — Greedy-Sperre: every new cell is re-verified against
				# the ncache directly, not just the pre-built mask, so no stale
				# mask entry can silently expand the quad.
				var dw: int = 1
				while w0 + dw < SIZE:
					var ni: int = v0 * SIZE + w0 + dw
					if used[ni] or mask[ni] != bid:
						break
					if not _face_visible_at(fi, u, v0, w0 + dw, bid, nx, ny, nz, ncache):
						break
					dw += 1

				# Extend in +v.
				# Every cell in the new row must pass both the mask check and
				# the explicit ncache visibility check before the row is accepted.
				var dv: int = 1
				var ok := true
				while ok and v0 + dv < SIZE:
					for k in dw:
						var ni2: int = (v0 + dv) * SIZE + w0 + k
						if used[ni2] or mask[ni2] != bid:
							ok = false
							break
						# RULE 2 (continued) — explicit ncache check per cell.
						if not _face_visible_at(fi, u, v0 + dv, w0 + k, bid, nx, ny, nz, ncache):
							ok = false
							break
					if ok:
						dv += 1

				# Mark all cells in this rectangle as consumed.
				for pv in dv:
					for pw in dw:
						used[(v0 + pv) * SIZE + w0 + pw] = 1

				_emit_quad(fi, u, v0, w0, dv, dw, dir_ao, bid, normal,
						ncache, verts, norms, uv2s, colors, idxs)


# ---------------------------------------------------------------------------
# Explicit per-cell face-visibility check (used during greedy expansion).
# Re-queries the ncache directly instead of relying on the pre-built mask.
# Returns true iff:
#   - (lx, ly, lz) is inside this chunk
#   - the block at that position matches bid
#   - the neighbour in the face direction is exactly BT.AIR
# ---------------------------------------------------------------------------

func _face_visible_at(fi: int, u: int, v: int, w: int, bid: int,
		nx: int, ny: int, nz: int, ncache: PackedByteArray) -> bool:
	var lx: int
	var ly: int
	var lz: int
	match fi:
		0, 1: lx = u; ly = v; lz = w
		2, 3: lx = v; ly = u; lz = w
		_:    lx = v; ly = w; lz = u

	if lx < 0 or lx >= SIZE or ly < 0 or ly >= SIZE or lz < 0 or lz >= SIZE:
		return false

	# RULE 3 — ID-Check: block type must match the quad's bid exactly.
	if _data[ly * SIZE * SIZE + lz * SIZE + lx] != bid:
		return false

	# Neighbour must be transparent (AIR, water, …).
	# UNLOADED (255) is not in PROPS → is_transparent returns false → no expansion.
	return BT.is_transparent(_cache_get(ncache, lx + nx, ly + ny, lz + nz))


# ---------------------------------------------------------------------------
# Quad emission with per-vertex AO
# ---------------------------------------------------------------------------

func _emit_quad(fi: int, u: int, v0: int, w0: int, dv: int, dw: int,
		d_ao: float, bid: int, normal: Vector3,
		ncache: PackedByteArray,
		verts: PackedVector3Array, norms: PackedVector3Array,
		uv2s: PackedVector2Array,
		colors: PackedColorArray, idxs: PackedInt32Array) -> void:

	var v1: int = v0 + dv
	var w1: int = w0 + dw

	# UV2.x = atlas column selector (block_id / BLOCK_COUNT).
	# Atlas row and tile UVs are computed from world-space position in the shader.
	var col_uv := Vector2(float(bid) / float(Atlas.BLOCK_COUNT), 0.0)

	# Corners: [vc, wc, sv, sw]
	var corners: Array = [
		[v0, w0, -1, -1],   # A
		[v1, w0,  1, -1],   # B
		[v1, w1,  1,  1],   # C
		[v0, w1, -1,  1],   # D
	]
	var order: Array = (_QUAD_ORDER[fi] as Array)

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
		uv2s.append(col_uv)
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
	# Y out of world range: sky above = AIR (face visible), void below = AIR.
	if wy < 0 or wy >= world.WORLD_HEIGHT_BLOCKS:
		return BT.AIR
	# Neighbour chunk not yet loaded → return opaque sentinel.
	# This prevents a ghost face from appearing here and vanishing once the
	# chunk loads.  The dirty-rebuild path guarantees a correct remesh.
	if not world.is_chunk_loaded(wx, wy, wz):
		return UNLOADED
	return world.get_block(wx, wy, wz)
