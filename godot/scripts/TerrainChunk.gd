extends StaticBody3D
## TerrainChunk — generates one NxN height-mapped mesh + trimesh collider.
## Variables must be set BEFORE add_child() since _ready() builds the mesh.

var ox:      float = 0.0   # world-space origin X
var oz:      float = 0.0   # world-space origin Z
var size:    float = 80.0  # chunk edge length in metres
var segs:    int   = 40    # quads per edge (segs+1 vertices per edge)
var terrain: Node  = null  # TerrainManager reference
var mat:     StandardMaterial3D = null


func _ready() -> void:
	_build()


func _build() -> void:
	var step := size / segs
	var n    := segs + 1

	# ── Sample heights ────────────────────────────────────────────────────────
	var heights := PackedFloat32Array()
	heights.resize(n * n)
	for j in n:
		for i in n:
			heights[j * n + i] = terrain.get_height_at(ox + i * step, oz + j * step)

	# ── Vertex arrays ─────────────────────────────────────────────────────────
	var verts  := PackedVector3Array(); verts.resize(n * n)
	var norms  := PackedVector3Array(); norms.resize(n * n)
	var uvs    := PackedVector2Array(); uvs.resize(n * n)
	var colors := PackedColorArray();   colors.resize(n * n)

	for j in n:
		for i in n:
			var vi  := j * n + i
			var h   := heights[vi]
			verts[vi] = Vector3(ox + i * step, h, oz + j * step)
			uvs[vi]   = Vector2(float(i) / segs * (size / 10.0),
			                    float(j) / segs * (size / 10.0))

	# ── Normals + vertex colours ──────────────────────────────────────────────
	# Normals via central difference; colours blend grass/dirt/rock by slope+height.
	var c_grass := Color(0.28, 0.34, 0.20)
	var c_dirt  := Color(0.36, 0.30, 0.22)
	var c_rock  := Color(0.50, 0.47, 0.42)

	for j in n:
		for i in n:
			var vi  := j * n + i
			var il  := max(0, i - 1);  var ir := min(segs, i + 1)
			var jd  := max(0, j - 1);  var ju := min(segs, j + 1)
			var dhx := heights[j * n + ir] - heights[j * n + il]
			var dhz := heights[ju * n + i] - heights[jd * n + i]
			norms[vi] = Vector3(-dhx, 2.0 * step, -dhz).normalized()

			var slope := 1.0 - norms[vi].y          # 0=flat, 1=vertical
			var h     := heights[vi]
			var c     := c_dirt.lerp(c_grass, clampf(1.0 - slope * 5.0, 0.0, 1.0))
			c = c.lerp(c_rock, clampf(slope * 3.0, 0.0, 1.0))
			c = c.darkened(clampf((2.0 - h) * 0.04, 0.0, 0.18))
			colors[vi] = c

	# ── Index buffer ──────────────────────────────────────────────────────────
	var idxs := PackedInt32Array(); idxs.resize(segs * segs * 6)
	var t    := 0
	for j in segs:
		for i in segs:
			var a := j * n + i
			idxs[t]=a;   idxs[t+1]=a+n;   idxs[t+2]=a+1
			idxs[t+3]=a+1; idxs[t+4]=a+n; idxs[t+5]=a+n+1
			t += 6

	# ── Build ArrayMesh ───────────────────────────────────────────────────────
	var arrays := []
	arrays.resize(Mesh.ARRAY_MAX)
	arrays[Mesh.ARRAY_VERTEX] = verts
	arrays[Mesh.ARRAY_NORMAL] = norms
	arrays[Mesh.ARRAY_TEX_UV] = uvs
	arrays[Mesh.ARRAY_COLOR]  = colors
	arrays[Mesh.ARRAY_INDEX]  = idxs

	var am := ArrayMesh.new()
	am.add_surface_from_arrays(Mesh.PRIMITIVE_TRIANGLES, arrays)
	am.surface_set_material(0, mat)

	var mi := MeshInstance3D.new()
	mi.mesh = am
	mi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON
	add_child(mi)

	# ── Physics trimesh ───────────────────────────────────────────────────────
	var csh := CollisionShape3D.new()
	csh.shape = am.create_trimesh_shape()
	add_child(csh)
