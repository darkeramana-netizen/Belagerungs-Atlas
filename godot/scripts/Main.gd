extends Node3D
## Main — entry point.
## • Loads castle JSON and builds geometry via CastleLoader
## • Initialises TerrainManager with correct flat-zone radius
## • Manages camera mode: Orbit (default) ↔ FPS (F) ↔ TPS (T)
## • HUD shows current mode + controls hint

@export var castle_id:  String = "krak"
@export var data_dir:   String = "res://data/castles/"

@onready var castle_root: Node3D          = $CastleRoot
@onready var cam_rig:     Node3D          = $CameraRig
@onready var terrain                      = $TerrainManager
@onready var player:      CharacterBody3D = $PlayerController
@onready var hud_label:   Label           = $UI/HUD

const CastleLoader = preload("res://scripts/CastleLoader.gd")

var _cam_pos: Vector3 = Vector3.ZERO


func _ready() -> void:
	# Allow --castle=<id> CLI override
	for arg in OS.get_cmdline_args():
		if arg.begins_with("--castle="):
			castle_id = arg.substr(9)

	_load_castle(castle_id)

	# Connect player mode signal → update HUD
	player.mode_changed.connect(_on_mode_changed)
	_on_mode_changed(player.Mode.ORBIT)


func _process(_delta: float) -> void:
	# Update terrain chunks every frame (cheap: only rebuilds on chunk boundary cross)
	var cam: Camera3D = get_viewport().get_camera_3d()
	if cam:
		_cam_pos = cam.global_position
	terrain.update_chunks(_cam_pos)

	# Mode toggles handled in PlayerController._unhandled_input
	# but we mirror the key checks here for the orbit camera toggle
	if Input.is_action_just_pressed("toggle_fps"):
		if player.mode == player.Mode.ORBIT:
			# Teleport player to front of castle gate
			player.position = _gate_spawn_pos()
			player.activate_fps()
			cam_rig.get_node("Camera3D").current = false

	if Input.is_action_just_pressed("toggle_tps"):
		if player.mode == player.Mode.ORBIT:
			player.position = _gate_spawn_pos()
			player.activate_tps()
			cam_rig.get_node("Camera3D").current = false


func _on_mode_changed(new_mode) -> void:
	match new_mode:
		player.Mode.FPS:
			hud_label.text = "[FPS]  WASD bewegen · Shift rennen · Leertaste springen · Esc zurück"
			cam_rig.get_node("Camera3D").current = false
		player.Mode.TPS:
			hud_label.text = "[TPS]  WASD bewegen · Shift rennen · Leertaste springen · Esc zurück"
			cam_rig.get_node("Camera3D").current = false
		_:
			hud_label.text = "Orbit: Maus ziehen + Scroll  ·  F = FPS  ·  T = TPS"
			cam_rig.get_node("Camera3D").current = true


# ── Castle loading ────────────────────────────────────────────────────────────

func _load_castle(id: String) -> void:
	for child in castle_root.get_children():
		child.queue_free()

	var model: Dictionary = CastleLoader.load_castle(data_dir, id)
	if model.is_empty():
		push_error("Castle '%s' not found." % id)
		return

	var loader := CastleLoader.new()
	loader.build_into(castle_root, model)

	# Fit orbit camera
	var cam_r: float = model.get("cameraRadius", 50.0)
	cam_rig.scale = Vector3.ONE * clampf(cam_r / 28.0, 0.5, 4.5)

	# Set terrain flat-zone radius ≈ maxRingR (cameraRadius / 2.45 * 1.35)
	var flat_r: float = (cam_r / 2.45) * 1.35
	terrain.castle_flat_r = maxf(22.0, flat_r)

	# Terrain seed from castle id hash
	var h := 0
	for c in id: h += c.unicode_at(0)
	terrain.noise_seed = (h * 2654435761) % 99991
	terrain._ready()   # reinitialise noise with new seed

	print("[Main] '%s' loaded — %d components, flat_r=%.1fm" % [
		model.get("name", id),
		model.get("components", []).size(),
		terrain.castle_flat_r,
	])


func _gate_spawn_pos() -> Vector3:
	# Spawn player just outside the castle gate (in front along +z)
	var flat_r: float = terrain.castle_flat_r
	return Vector3(0, 2.0, flat_r * 0.55)
