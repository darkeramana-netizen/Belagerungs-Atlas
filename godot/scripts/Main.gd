extends Node3D
## Main -- entry point.
##
## Castle selection (in order of priority):
##   1. CLI argument  --castle=<id>   load named hero castle
##   2. CLI argument  --seed=<int>    procedural castle from seed
##   3. Export var    castle_id       named hero castle (default "krak")
##   4. castle_id=""  or  "random"    procedural castle from world_seed
##
## World:
##   world_seed drives terrain noise AND procedural castle generation.
##   Same world_seed = identical world, identical castles, every launch.

@export var castle_id:  String = "krak"   # set "" or "random" for procedural
@export var world_seed: int    = 12345    # master seed for world + castles
@export var data_dir:   String = "res://data/castles/"

@onready var castle_root: Node3D          = $CastleRoot
@onready var cam_rig:     Node3D          = $CameraRig
@onready var terrain                      = $TerrainManager
@onready var player:      CharacterBody3D = $PlayerController
@onready var hud_label:   Label           = $UI/HUD

const CastleLoader      = preload("res://scripts/CastleLoader.gd")
const ProceduralCastleGen = preload("res://scripts/ProceduralCastleGen.gd")

var _cam_pos: Vector3 = Vector3.ZERO


func _ready() -> void:
	# CLI overrides
	for arg in OS.get_cmdline_args():
		if arg.begins_with("--castle="):
			castle_id  = arg.substr(9)
		elif arg.begins_with("--seed="):
			world_seed = int(arg.substr(7))
			castle_id  = "random"

	# Pass world seed to terrain before first update
	terrain.world_seed = world_seed
	terrain.reinit()

	_load_castle(castle_id)

	player.mode_changed.connect(_on_mode_changed)
	_on_mode_changed(player.Mode.ORBIT)


func _process(_delta: float) -> void:
	var cam: Camera3D = get_viewport().get_camera_3d()
	if cam:
		_cam_pos = cam.global_position
	terrain.update_chunks(_cam_pos)

	if Input.is_action_just_pressed("toggle_fps"):
		if player.mode == player.Mode.ORBIT:
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
			hud_label.text = "[FPS]  WASD bewegen · Shift rennen · Leertaste springen · Esc zurueck"
			cam_rig.get_node("Camera3D").current = false
		player.Mode.TPS:
			hud_label.text = "[TPS]  WASD bewegen · Shift rennen · Leertaste springen · Esc zurueck"
			cam_rig.get_node("Camera3D").current = false
		_:
			hud_label.text = "Orbit: Maus ziehen + Scroll  -  F = FPS  -  T = TPS"
			cam_rig.get_node("Camera3D").current = true


# ----------------------------------------------------------------------------
# Castle loading
# ----------------------------------------------------------------------------

func _load_castle(id: String) -> void:
	for child in castle_root.get_children():
		child.queue_free()

	var model: Dictionary
	var is_procedural := (id == "" or id == "random")

	if is_procedural:
		# Procedural castle -- derived entirely from world_seed
		model = ProceduralCastleGen.generate(world_seed, 0.0, 0.0)
		print("[Main] Procedural castle seed=%d -> '%s'" % [world_seed, model.get("name", "?")])
	else:
		model = CastleLoader.load_castle(data_dir, id)
		if model.is_empty():
			push_error("[Main] Castle '%s' not found -- falling back to procedural." % id)
			model = ProceduralCastleGen.generate(world_seed, 0.0, 0.0)
			is_procedural = true

	var loader := CastleLoader.new()
	loader.build_into(castle_root, model)

	# Orbit camera scale
	var cam_r: float = model.get("cameraRadius", 50.0)
	cam_rig.scale = Vector3.ONE * clampf(cam_r / 28.0, 0.5, 4.5)

	# Flat zone radius -- proportional to castle footprint
	var flat_r: float = (cam_r / 2.45) * 1.35
	terrain.castle_flat_r = maxf(22.0, flat_r)

	# Terrain seed from world_seed (terrain was already seeded in _ready,
	# but re-apply in case _load_castle is called later with a new castle)
	terrain.world_seed = world_seed
	terrain.reinit()

	var name_str: String = model.get("name", id) if not is_procedural else model.get("name", "Procedural")
	print("[Main] '%s' loaded -- %d components, flat_r=%.1fm, world_seed=%d" % [
		name_str,
		model.get("components", []).size(),
		terrain.castle_flat_r,
		world_seed,
	])


# ----------------------------------------------------------------------------
# Player spawn
# ----------------------------------------------------------------------------

func _gate_spawn_pos() -> Vector3:
	# Spawn in front of the castle gate at terrain height + 3m buffer
	var flat_r: float = terrain.castle_flat_r
	var gx := 0.0
	var gz := flat_r * 0.55
	# Terrain height at spawn point (castle flat zone returns BASE_HEIGHT)
	var ground_h: float = terrain.get_height_at(gx, gz)
	return Vector3(gx, ground_h + 3.0, gz)
