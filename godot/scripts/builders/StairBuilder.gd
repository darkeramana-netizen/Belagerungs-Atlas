extends RefCounted
## StairBuilder — builds STAIR_FLIGHT, STAIRWAY, and SLOPE_PATH components.
## Creates visible step geometry + invisible physics ramp.

var style:   String = "crusader"
var scale_f: float  = 1.0

var _mat_stone: StandardMaterial3D

func _init() -> void:
	_mat_stone = StandardMaterial3D.new()
	_mat_stone.albedo_color = Color(0.55, 0.52, 0.46)
	_mat_stone.roughness    = 0.88


func build(comp: Dictionary) -> Node3D:
	match comp.get("type", ""):
		"STAIR_FLIGHT": return _stair_flight(comp)
		"STAIRWAY":     return _stair_flight(comp)
		"SLOPE_PATH":   return _slope_path(comp)
	return null


func _stair_flight(comp: Dictionary) -> Node3D:
	var root := Node3D.new()
	root.name = comp.get("id", "stair").replace("/", "_")

	var px     := float(comp.get("x",    0.0)) * scale_f
	var pz     := float(comp.get("z",    0.0)) * scale_f
	var py     := float(comp.get("y",    0.0)) * scale_f
	var steps  := int(comp.get("steps", 8))
	var step_h := float(comp.get("stepH", 0.22)) * scale_f
	var step_d := float(comp.get("stepD", 0.35)) * scale_f
	var sw     := float(comp.get("w",    1.2))  * scale_f
	var rot    := float(comp.get("rotation", 0.0))

	root.position  = Vector3(px, py, pz)
	root.rotation.y = rot

	for i in steps:
		var mi := MeshInstance3D.new()
		var bm := BoxMesh.new()
		bm.size = Vector3(sw, step_h, step_d)
		mi.mesh = bm
		mi.material_override = _mat_stone
		mi.position = Vector3(0, (i + 0.5) * step_h, i * step_d)
		root.add_child(mi)

	# Invisible physics ramp covering the whole flight
	var ramp_body := StaticBody3D.new()
	var ramp_csh  := CollisionShape3D.new()
	var ramp_bs   := BoxShape3D.new()
	var total_h   := steps * step_h
	var total_d   := steps * step_d
	ramp_bs.size  = Vector3(sw, 0.08, sqrt(total_d * total_d + total_h * total_h))
	ramp_csh.shape = ramp_bs
	ramp_body.add_child(ramp_csh)
	ramp_body.position = Vector3(0, total_h * 0.5, total_d * 0.5)
	ramp_body.rotation.x = -atan2(total_h, total_d)
	root.add_child(ramp_body)

	return root


func _slope_path(comp: Dictionary) -> Node3D:
	var root := Node3D.new()
	root.name = comp.get("id", "slope").replace("/", "_")

	var x1 := float(comp.get("x1", 0.0)) * scale_f
	var z1 := float(comp.get("z1", 0.0)) * scale_f
	var y1 := float(comp.get("y1", 0.0)) * scale_f
	var x2 := float(comp.get("x2", 0.0)) * scale_f
	var z2 := float(comp.get("z2", 0.0)) * scale_f
	var y2 := float(comp.get("y2", 0.0)) * scale_f
	var sw  := float(comp.get("w",  2.2)) * scale_f

	var dx  := x2 - x1
	var dz  := z2 - z1
	var dy  := y2 - y1
	var seg_len := sqrt(dx*dx + dz*dz + dy*dy)
	if seg_len < 0.1:
		return root

	var mi := MeshInstance3D.new()
	var bm := BoxMesh.new()
	bm.size = Vector3(sw, 0.14, seg_len)
	mi.mesh = bm
	mi.material_override = _mat_stone
	mi.position = Vector3((x1+x2)*0.5, (y1+y2)*0.5, (z1+z2)*0.5)
	mi.rotation.y = atan2(dx, dz)
	mi.rotation.x = -atan2(dy, sqrt(dx*dx + dz*dz))
	root.add_child(mi)

	# Physics ramp
	var body := StaticBody3D.new()
	var csh  := CollisionShape3D.new()
	var bs   := BoxShape3D.new()
	bs.size  = bm.size
	csh.shape = bs
	body.position = mi.position
	body.rotation = mi.rotation
	body.add_child(csh)
	root.add_child(body)

	return root
