extends RefCounted
## RingBuilder — builds a closed ring of towers + curtain walls.
## Mirrors buildRing() from builders.js.
##
## Component schema:
##   { type:"RING", y, points:[{x,z,r,h},...], wall:{h,thick}, gate:{atIndex,w,d,h}, squareTowers }

var style:   String = "crusader"
var scale_f: float  = 1.0

var _mat_stone: StandardMaterial3D
var _mat_dark:  StandardMaterial3D

func _init() -> void:
	_mat_stone = _make_stone_mat(Color(0.60, 0.56, 0.50))
	_mat_dark  = _make_stone_mat(Color(0.28, 0.25, 0.22))


func build(comp: Dictionary) -> Node3D:
	var root := Node3D.new()
	root.name = comp.get("id", "ring").replace("/", "_")
	root.position.y = float(comp.get("y", 0.0)) * scale_f

	var pts: Array      = comp.get("points", [])
	var wall_h: float   = float(comp.get("wall", {}).get("h",     3.0)) * scale_f
	var wall_t: float   = float(comp.get("wall", {}).get("thick", 0.75)) * scale_f
	var gate_data       = comp.get("gate", null)
	var gate_idx: int   = gate_data.get("atIndex", -1) if gate_data else -1
	var use_square: bool = bool(comp.get("squareTowers", false))

	if pts.size() < 2:
		return root

	# ── Towers at each vertex ────────────────────────────────────────────────
	for i in pts.size():
		var pt     = pts[i]
		var px     := float(pt.get("x", 0.0)) * scale_f
		var pz     := float(pt.get("z", 0.0)) * scale_f
		var t_rad  := float(pt.get("r", 1.2)) * scale_f
		var t_h    := float(pt.get("h", 4.0)) * scale_f

		var tower := _build_tower(px, pz, t_rad, t_h, use_square)
		tower.name = "tower_%d" % i
		root.add_child(tower)

	# ── Curtain walls between consecutive towers ──────────────────────────────
	for i in pts.size():
		var ni   := (i + 1) % pts.size()
		var pt   = pts[i]
		var nx   = pts[ni]

		# Gate gap — skip wall segment at gate index
		if i == gate_idx:
			_build_gate_passage(gate_data)
			continue

		var ax    := float(pt.get("x", 0.0)) * scale_f
		var az    := float(pt.get("z", 0.0)) * scale_f
		var bx    := float(nx.get("x", 0.0)) * scale_f
		var bz    := float(nx.get("z", 0.0)) * scale_f
		var t_rad := float(pt.get("r", 1.2)) * scale_f
		var n_rad := float(nx.get("r", 1.2)) * scale_f

		_build_wall_segment(root, ax, az, bx, bz, t_rad, n_rad, wall_h, wall_t)

	return root


# ── Tower primitive ───────────────────────────────────────────────────────────

func _build_tower(px: float, pz: float, r: float, h: float, square: bool) -> Node3D:
	var node := MeshInstance3D.new()
	var mesh: Mesh

	if square:
		var bm := BoxMesh.new()
		bm.size = Vector3(r * 2.0, h, r * 2.0)
		mesh = bm
	else:
		var cm := CylinderMesh.new()
		cm.top_radius      = r
		cm.bottom_radius   = r
		cm.height          = h
		cm.radial_segments = 16
		cm.rings           = 1
		mesh = cm

	node.mesh              = mesh
	node.material_override = _mat_stone
	node.position          = Vector3(px, h * 0.5, pz)

	# Physics collider — use if/else to avoid ternary type-mismatch
	var body   := StaticBody3D.new()
	var cshape := CollisionShape3D.new()
	if square:
		var bs    := BoxShape3D.new()
		bs.size    = Vector3(r * 2.0, h, r * 2.0)
		cshape.shape = bs
	else:
		var cs    := CylinderShape3D.new()
		cs.radius  = r
		cs.height  = h
		cshape.shape = cs
	body.add_child(cshape)
	body.position = node.position
	node.add_child(body)

	return node


# ── Wall segment ──────────────────────────────────────────────────────────────
## Builds a flat curtain wall panel between two tower positions.
## The trim factor (0.92) matches builders.js — wall ends just inside the tower.

const TRIM := 0.92

func _build_wall_segment(
		root: Node3D,
		ax: float, az: float,
		bx: float, bz: float,
		t_rad: float, n_rad: float,
		wall_h: float, wall_t: float) -> void:

	var dx      := bx - ax
	var dz      := bz - az
	var raw_len := sqrt(dx * dx + dz * dz)
	if raw_len < 0.1:
		return

	var ux := dx / raw_len
	var uz := dz / raw_len

	var t1     := t_rad * TRIM
	var t2     := n_rad * TRIM
	var w_len  := raw_len - t1 - t2
	if w_len < 0.2:
		return

	var cx    := ax + ux * (t1 + w_len * 0.5)
	var cz    := az + uz * (t1 + w_len * 0.5)
	var angle := atan2(ux, uz)

	var mi := MeshInstance3D.new()
	var bm := BoxMesh.new()
	bm.size            = Vector3(wall_t, wall_h, w_len)
	mi.mesh            = bm
	mi.material_override = _mat_stone
	mi.position        = Vector3(cx, wall_h * 0.5, cz)
	mi.rotation.y      = angle

	var body := StaticBody3D.new()
	var csh  := CollisionShape3D.new()
	var bs   := BoxShape3D.new()
	bs.size    = bm.size
	csh.shape  = bs
	body.position = mi.position
	body.rotation = mi.rotation
	body.add_child(csh)

	root.add_child(mi)
	root.add_child(body)


# ── Gate passage ──────────────────────────────────────────────────────────────
## Stub — leaves the gap open. Full GateBuilder will add portcullis + arch.

func _build_gate_passage(_gate: Dictionary) -> void:
	pass


# ── Material helpers ──────────────────────────────────────────────────────────

func _make_stone_mat(albedo: Color) -> StandardMaterial3D:
	var m := StandardMaterial3D.new()
	m.albedo_color = albedo
	m.roughness    = 0.85
	m.metallic     = 0.0
	return m
