extends Node3D
## Main -- entry point for the voxel world.
##
## Boot sequence:
##   1. Create VoxelWorld + VoxelTerrainGen, link them.
##   2. Load castle DNA (hero JSON or procedural) and write blocks via
##      CastleVoxelBuilder into the VoxelWorld.
##   3. Spawn player at terrain surface above the castle gate.
##   4. Each frame: stream chunks around the active camera.
##
## Castle selection priority (highest first):
##   --castle=<id>   named hero castle from hero_castles.json
##   --seed=<int>    procedural castle, sets world_seed
##   @export castle_id  scene property (default "krak")
##   castle_id=""    procedural castle derived from world_seed

@export var castle_id:  String = "krak"   # "" or "random" = procedural
@export var world_seed: int    = 12345
@export var data_dir:   String = "res://data/castles/"

@onready var cam_rig:   Node3D          = $CameraRig
@onready var player:    CharacterBody3D = $PlayerController
@onready var hud_label: Label           = $UI/HUD

const CastleLoader        = preload("res://scripts/CastleLoader.gd")
const ProceduralCastleGen = preload("res://scripts/ProceduralCastleGen.gd")
const VoxelWorldScript    = preload("res://scripts/voxel/VoxelWorld.gd")
const VoxelTerrainScript  = preload("res://scripts/voxel/VoxelTerrainGen.gd")
const CastleVoxelBuilder  = preload("res://scripts/voxel/CastleVoxelBuilder.gd")

var _world:  Object = null   # VoxelWorld
var _gen:    Object = null   # VoxelTerrainGen
var _builder: Object = null  # CastleVoxelBuilder


func _ready() -> void:
	# CLI overrides
	for arg in OS.get_cmdline_args():
		if arg.begins_with("--castle="):
			castle_id  = arg.substr(9)
		elif arg.begins_with("--seed="):
			world_seed = int(arg.substr(7))
			castle_id  = "random"

	_boot_voxel_world()
	_load_castle(castle_id)

	player.mode_changed.connect(_on_mode_changed)
	_on_mode_changed(player.Mode.ORBIT)


func _process(_delta: float) -> void:
	# Stream terrain chunks around the active camera
	var cam: Camera3D = get_viewport().get_camera_3d()
	if cam and _world:
		_world.update(cam.global_position)

	# Mode toggle keys (handled here for orbit mode; PlayerController handles FPS/TPS)
	if Input.is_action_just_pressed("toggle_fps") and player.mode == player.Mode.ORBIT:
		player.position = _spawn_pos()
		player.activate_fps()
		cam_rig.get_node("Camera3D").current = false

	if Input.is_action_just_pressed("toggle_tps") and player.mode == player.Mode.ORBIT:
		player.position = _spawn_pos()
		player.activate_tps()
		cam_rig.get_node("Camera3D").current = false


func _on_mode_changed(new_mode) -> void:
	match new_mode:
		player.Mode.FPS:
			hud_label.text = "[FPS]  WASD bewegen - Shift rennen - Leertaste springen - Esc zurueck"
			cam_rig.get_node("Camera3D").current = false
		player.Mode.TPS:
			hud_label.text = "[TPS]  WASD bewegen - Shift rennen - Leertaste springen - Esc zurueck"
			cam_rig.get_node("Camera3D").current = false
		_:
			hud_label.text = "Orbit: Maus ziehen + Scroll  -  F = FPS  -  T = TPS"
			cam_rig.get_node("Camera3D").current = true


# ---------------------------------------------------------------------------
# Boot
# ---------------------------------------------------------------------------

func _boot_voxel_world() -> void:
	# VoxelTerrainGen
	_gen = VoxelTerrainScript.new()
	_gen.world_seed = world_seed
	add_child(_gen)   # triggers _ready() -> _init_noise()

	# VoxelWorld
	_world = VoxelWorldScript.new()
	_world.world_seed    = world_seed
	_world.castle_flat_r = 32   # default; overridden after castle load
	_world._gen          = _gen
	add_child(_world)

	# CastleVoxelBuilder
	_builder = CastleVoxelBuilder.new()
	_builder.world = _world
	add_child(_builder)

	print("[Main] Voxel world booted (seed=%d)" % world_seed)


# ---------------------------------------------------------------------------
# Castle loading
# ---------------------------------------------------------------------------

func _load_castle(id: String) -> void:
	var model: Dictionary
	var procedural := (id == "" or id == "random")

	if procedural:
		model = ProceduralCastleGen.generate(world_seed, 0.0, 0.0)
		print("[Main] Procedural castle: '%s'" % model.get("name", "?"))
	else:
		model = CastleLoader.load_castle(data_dir, id)
		if model.is_empty():
			push_warning("[Main] Castle '%s' not found, falling back to procedural." % id)
			model = ProceduralCastleGen.generate(world_seed, 0.0, 0.0)
			procedural = true

	# Adjust flat zone radius from camera radius
	var cam_r: float = float(model.get("cameraRadius", 60.0))
	var flat_r: int  = maxi(24, int((cam_r / 2.45) * 1.35))
	_world.castle_flat_r = flat_r

	# Scale orbit camera
	cam_rig.scale = Vector3.ONE * clampf(cam_r / 28.0, 0.5, 4.5)

	# Pre-generate terrain columns in the castle zone before placing blocks
	# (foundation logic needs surface_y to be known)
	_gen.world_seed = world_seed
	_gen.reinit()
	_preload_castle_terrain(flat_r)

	# Place castle blocks into the world
	_builder.build(model)

	var name_str: String = model.get("name", id)
	print("[Main] '%s' built into voxel world — flat_r=%d blocks" % [name_str, flat_r])


## Pre-fill terrain chunks covering the castle footprint so foundations work.
func _preload_castle_terrain(flat_r: int) -> void:
	var cs := 16
	var chunk_r: int = int(float(flat_r) / float(cs)) + 2
	for cx in range(-chunk_r, chunk_r + 1):
		for cz in range(-chunk_r, chunk_r + 1):
			for cy in _world.WORLD_HEIGHT_CHUNKS:
				var key := Vector3i(cx, cy, cz)
				if not _world._chunks.has(key):
					_world._create_chunk(key)
					_gen.fill_chunk(key, _world)
					_world._chunks[key].rebuild()


# ---------------------------------------------------------------------------
# Player spawn
# ---------------------------------------------------------------------------

func _spawn_pos() -> Vector3:
	# Spawn in front of the castle gate, on top of terrain.
	var gz: int = int(float(_world.castle_flat_r) * 0.55)

	# Ensure the column at the spawn XZ is loaded before querying surface Y.
	# (Needed if the player switches to FPS before the streaming catches up.)
	_ensure_column_loaded(0, gz)

	var sy: int = _world.get_surface_y(0, gz)
	if sy < 0:
		sy = _world.BASE_Y
	return Vector3(0.0, float(sy + 2), float(gz))


## Synchronously load + rebuild all Y-chunks for a given world-XZ position.
func _ensure_column_loaded(wx: int, wz: int) -> void:
	var cx := int(floor(float(wx) / 16.0))
	var cz := int(floor(float(wz) / 16.0))
	var filled := false
	for cy in _world.WORLD_HEIGHT_CHUNKS:
		var key := Vector3i(cx, cy, cz)
		if not _world._chunks.has(key):
			_world._create_chunk(key)
			_gen.fill_chunk(key, _world)
			filled = true
	if filled:
		for cy in _world.WORLD_HEIGHT_CHUNKS:
			var key := Vector3i(cx, cy, cz)
			if _world._chunks.has(key):
				_world._chunks[key].rebuild()
