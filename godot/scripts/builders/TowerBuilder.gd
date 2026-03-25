extends RefCounted
## TowerBuilder — builds ROUND_TOWER, SQUARE_TOWER, and GATE components.
## Mirrors buildRoundTower() / buildSquareTower() from builders.js.
##
## Hollow-By-Default (Principle 2):
##   - Round tower: outer CylinderMesh shell + inner gap + entrance arc gap
##   - Square tower: 4 wall panels + floor slab + entrance opening
##   - Spiral staircase placeholder (visible steps, no physics ramp yet)

var style:   String = "crusader"
var scale_f: float  = 1.0

var _mat_stone: StandardMaterial3D
var _mat_dark:  StandardMaterial3D

func _init() -> void:
	_mat_stone = _stone_mat(Color(0.60, 0.56, 0.50))
	_mat_dark  = _stone_mat(Color(0.22, 0.20, 0.18))
	# Inner shell must be visible from inside: cull front faces so back faces show
	_mat_dark.cull_mode = BaseMaterial3D.CULL_FRONT


func build(comp: Dictionary) -> Node3D:
	var type := comp.get("type", "ROUND_TOWER") as String
	match type:
		"ROUND_TOWER": return _round_tower(comp)
		"SQUARE_TOWER": return _square_tower(comp)
		"GATE":         return _gate(comp)
		_:              return _round_tower(comp)


# ── ROUND TOWER ───────────────────────────────────────────────────────────────

func _round_tower(comp: Dictionary) -> Node3D:
	var root := Node3D.new()
	root.name  = comp.get("id", "round_tower").replace("/", "_")

	var px := float(comp.get("x", 0.0)) * scale_f
	var pz := float(comp.get("z", 0.0)) * scale_f
	var py := float(comp.get("y", 0.0)) * scale_f
	var r  := float(comp.get("r", 1.5)) * scale_f
	var h  := float(comp.get("h", 6.0)) * scale_f

	root.position = Vector3(px, py, pz)

	# Shell thickness mirrors JS: max(0.2, r * 0.22)
	var shell_t := maxf(0.2, r * 0.22) * scale_f

	# ── Outer shell ──────────────────────────────────────────────────────────
	var outer   := MeshInstance3D.new()
	var outer_m := CylinderMesh.new()
	outer_m.top_radius      = r
	outer_m.bottom_radius   = r
	outer_m.height          = h
	outer_m.radial_segments = 20
	outer.mesh              = outer_m
	outer.material_override = _mat_stone
	outer.position          = Vector3(0, h * 0.5, 0)
	root.add_child(outer)

	# ── Inner shell (inverted scale → normals face inward → hollow appearance) ─
	var inner   := MeshInstance3D.new()
	var inner_m := CylinderMesh.new()
	inner_m.top_radius      = r - shell_t
	inner_m.bottom_radius   = r - shell_t
	inner_m.height          = h - 0.05
	inner_m.radial_segments = 20
	inner.mesh              = inner_m
	inner.material_override = _mat_dark
	inner.position          = Vector3(0, h * 0.5, 0)
	root.add_child(inner)

	# ── Floor slab ───────────────────────────────────────────────────────────
	var floor_m    := MeshInstance3D.new()
	var floor_mesh := CylinderMesh.new()
	floor_mesh.top_radius      = r - shell_t
	floor_mesh.bottom_radius   = r - shell_t
	floor_mesh.height          = 0.12
	floor_mesh.radial_segments = 20
	floor_m.mesh              = floor_mesh
	floor_m.material_override = _mat_stone
	floor_m.position          = Vector3(0, 0.06, 0)
	root.add_child(floor_m)

	# ── Entrance arch (dark panel facing +z) ─────────────────────────────────
	var ent_w := minf(r * 1.5, 1.2) * scale_f
	var ent_h := maxf(1.8, h * 0.35) * scale_f
	var arch   := MeshInstance3D.new()
	var arch_m := BoxMesh.new()
	arch_m.size            = Vector3(ent_w, ent_h, shell_t * 1.2)
	arch.mesh              = arch_m
	arch.material_override = _mat_dark
	arch.position          = Vector3(0, ent_h * 0.5, r - shell_t * 0.5)
	root.add_child(arch)

	# ── Spiral staircase ─────────────────────────────────────────────────────
	_add_spiral_staircase(root, r - shell_t, h)

	# ── Merlon crown ─────────────────────────────────────────────────────────
	_add_merlon_crown(root, r, h)

	# ── Physics collider (10 arc-segment boxes — hollow) ─────────────────────
	_add_hollow_physics(root, r, h, shell_t)

	return root


# ── SQUARE TOWER ──────────────────────────────────────────────────────────────

func _square_tower(comp: Dictionary) -> Node3D:
	var root := Node3D.new()
	root.name  = comp.get("id", "square_tower").replace("/", "_")

	var px := float(comp.get("x", 0.0)) * scale_f
	var pz := float(comp.get("z", 0.0)) * scale_f
	var py := float(comp.get("y", 0.0)) * scale_f
	var w  := float(comp.get("w", 2.5)) * scale_f
	var d  := float(comp.get("d", 2.5)) * scale_f
	var h  := float(comp.get("h", 5.5)) * scale_f

	root.position = Vector3(px, py, pz)

	var shell_t := maxf(0.15, minf(w, d) * 0.18)
	var ent_w   := maxf(0.9,  minf(w, d) * 0.44)
	var ent_h   := maxf(1.5,  h * 0.38)

	# South face (+z): split around entrance
	var half_side := (w - ent_w) * 0.5
	for dir in [-1.0, 1.0]:
		var panel := _box_mesh(half_side, h, shell_t, _mat_stone)
		panel.position = Vector3(dir * (ent_w * 0.5 + half_side * 0.5), h * 0.5, d * 0.5 - shell_t * 0.5)
		root.add_child(panel)

	# Above-door panel
	var top_h := h - ent_h
	if top_h > 0.1:
		var top_p := _box_mesh(w, top_h, shell_t, _mat_stone)
		top_p.position = Vector3(0, ent_h + top_h * 0.5, d * 0.5 - shell_t * 0.5)
		root.add_child(top_p)

	# North face (-z): solid
	var n_wall := _box_mesh(w, h, shell_t, _mat_stone)
	n_wall.position = Vector3(0, h * 0.5, -(d * 0.5 - shell_t * 0.5))
	root.add_child(n_wall)

	# East + West faces
	for dir in [-1.0, 1.0]:
		var side_wall := _box_mesh(shell_t, h, d - shell_t * 2.0, _mat_stone)
		side_wall.position = Vector3(dir * (w * 0.5 - shell_t * 0.5), h * 0.5, 0.0)
		root.add_child(side_wall)

	# Floor slab
	var floor_p := _box_mesh(w - shell_t * 2, 0.12, d - shell_t * 2, _mat_stone)
	floor_p.position = Vector3(0, 0.06, 0)
	root.add_child(floor_p)

	# Parapet band
	var band := _box_mesh(w * 1.03, 0.2, d * 1.03, _mat_stone)
	band.position = Vector3(0, h + 0.1, 0)
	root.add_child(band)

	_add_merlon_crown_square(root, w, d, h)
	_add_square_physics(root, w, d, h, shell_t)

	return root


# ── GATE ─────────────────────────────────────────────────────────────────────

func _gate(comp: Dictionary) -> Node3D:
	var root := Node3D.new()
	root.name   = comp.get("id", "gate").replace("/", "_")

	var px  := float(comp.get("x", 0.0)) * scale_f
	var pz  := float(comp.get("z", 0.0)) * scale_f
	var py  := float(comp.get("y", 0.0)) * scale_f
	var gw  := float(comp.get("w", 3.5)) * scale_f
	var gh  := float(comp.get("h", 5.0)) * scale_f
	var rot := float(comp.get("rotation", 0.0))

	root.position   = Vector3(px, py, pz)
	root.rotation.y = rot

	# Two flanking round towers
	for dir in [-1.0, 1.0]:
		var fk := MeshInstance3D.new()
		var fm := CylinderMesh.new()
		fm.top_radius      = gw * 0.28
		fm.bottom_radius   = gw * 0.28
		fm.height          = gh
		fm.radial_segments = 16
		fk.mesh              = fm
		fk.material_override = _mat_stone
		fk.position          = Vector3(dir * (gw * 0.5 + gw * 0.14), gh * 0.5, 0)
		root.add_child(fk)

	# Passage arch header
	var pass_w := gw * 0.55
	var pass_h := gh * 0.55
	var arch_h := gh - pass_h
	if arch_h > 0.1:
		var header := _box_mesh(pass_w, arch_h, gw * 0.6, _mat_stone)
		header.position = Vector3(0, pass_h + arch_h * 0.5, 0)
		root.add_child(header)

	# Portcullis bars
	var bar_count := 5
	for i in bar_count:
		var bar := _box_mesh(0.06, pass_h, 0.06, _mat_dark)
		bar.position = Vector3(
			-pass_w * 0.5 + (i + 0.5) * pass_w / bar_count,
			pass_h * 0.5,
			-0.05
		)
		root.add_child(bar)

	return root


# ── Merlon crowns ─────────────────────────────────────────────────────────────

func _add_merlon_crown(root: Node3D, r: float, h: float) -> void:
	var n   := 12
	var m_w := (TAU * r / n) * 0.55
	var m_h := maxf(0.3, r * 0.22)
	var m_d := 0.28
	for i in n:
		if i % 2 == 0:
			var angle := i * TAU / n
			var mi := _box_mesh(m_w, m_h, m_d, _mat_stone)
			mi.position   = Vector3(sin(angle) * r, h + m_h * 0.5, cos(angle) * r)
			mi.rotation.y = angle
			root.add_child(mi)


func _add_merlon_crown_square(root: Node3D, w: float, d: float, h: float) -> void:
	var m_h   := 0.4
	var m_w   := 0.35
	var m_t   := 0.28
	var step  := 0.75
	for face in 4:
		var rot_y  := face * PI * 0.5
		var f_len  := w if face % 2 == 0 else d
		var count  := int(f_len / step)
		for i in count:
			if i % 2 == 0:
				var local_x := -f_len * 0.5 + (i + 0.5) * step
				var mi      := _box_mesh(m_w, m_h, m_t, _mat_stone)
				var fx      := cos(rot_y) * (w * 0.5) - sin(rot_y) * local_x
				var fz      := sin(rot_y) * (w * 0.5) + cos(rot_y) * local_x
				mi.position  = Vector3(fx, h + m_h * 0.5, fz)
				root.add_child(mi)


# ── Spiral staircase ──────────────────────────────────────────────────────────

func _add_spiral_staircase(root: Node3D, r_inner: float, h: float) -> void:
	var n_steps := int(h / 0.22)
	var step_r  := r_inner * 0.86
	var step_h  := 0.10
	var step_d  := minf(0.55, r_inner * 0.6)
	var step_w  := step_d

	for i in n_steps:
		var t     := float(i) / float(n_steps)
		var angle := PI + t * TAU * 2.2
		var sy    := i * (h / n_steps)
		var sx    := sin(angle) * step_r
		var sz    := cos(angle) * step_r

		var mi := _box_mesh(step_w, step_h, step_d, _mat_stone)
		mi.position   = Vector3(sx, sy + step_h * 0.5, sz)
		mi.rotation.y = angle
		root.add_child(mi)


# ── Physics helpers ───────────────────────────────────────────────────────────

func _add_hollow_physics(root: Node3D, r: float, h: float, shell_t: float) -> void:
	var segs  := 10
	var arc   := TAU / segs
	var seg_w := 2.0 * r * sin(arc * 0.5)

	for i in segs:
		var angle := i * arc
		var mid_r := r - shell_t * 0.5
		var body  := StaticBody3D.new()
		var csh   := CollisionShape3D.new()
		var bs    := BoxShape3D.new()
		bs.size    = Vector3(shell_t, h, seg_w)
		csh.shape  = bs
		body.add_child(csh)
		body.position   = Vector3(sin(angle) * mid_r, h * 0.5, cos(angle) * mid_r)
		body.rotation.y = angle
		root.add_child(body)


func _add_square_physics(root: Node3D, w: float, d: float, h: float, shell_t: float) -> void:
	var panels := [
		[Vector3(0, h * 0.5,  d * 0.5 - shell_t * 0.5),   Vector3(w, h, shell_t)],
		[Vector3(0, h * 0.5, -(d * 0.5 - shell_t * 0.5)), Vector3(w, h, shell_t)],
		[Vector3( w * 0.5 - shell_t * 0.5, h * 0.5, 0),   Vector3(shell_t, h, d - shell_t * 2)],
		[Vector3(-(w * 0.5 - shell_t * 0.5), h * 0.5, 0), Vector3(shell_t, h, d - shell_t * 2)],
	]
	for p in panels:
		var body := StaticBody3D.new()
		var csh  := CollisionShape3D.new()
		var bs   := BoxShape3D.new()
		bs.size    = p[1]
		csh.shape  = bs
		body.position = p[0]
		body.add_child(csh)
		root.add_child(body)


# ── Mesh helper ───────────────────────────────────────────────────────────────

func _box_mesh(w: float, h: float, d: float, mat: StandardMaterial3D) -> MeshInstance3D:
	var mi := MeshInstance3D.new()
	var bm := BoxMesh.new()
	bm.size              = Vector3(w, h, d)
	mi.mesh              = bm
	mi.material_override = mat
	return mi


func _stone_mat(albedo: Color) -> StandardMaterial3D:
	var m := StandardMaterial3D.new()
	m.albedo_color = albedo
	m.roughness    = 0.85
	m.metallic     = 0.0
	return m
