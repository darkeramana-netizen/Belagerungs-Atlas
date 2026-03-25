extends CharacterBody3D
## PlayerController — FPS + TPS character controller.
##
## Modes:
##   ORBIT — default orbit camera (CameraRig), player invisible
##   FPS   — first-person, WASD + mouse look, mouse captured
##   TPS   — third-person follow camera, WASD + mouse, mouse captured
##
## Toggle FPS : F key (or call activate_fps())
## Toggle TPS : T key (or call activate_tps())
## Exit to orbit: Escape

enum Mode { ORBIT, FPS, TPS }

const WALK_SPEED  := 5.5
const RUN_SPEED   := 11.0
const JUMP_VEL    := 6.0
const GRAVITY     := 20.0
const MOUSE_SENS  := 0.0025
const TPS_DIST    := 5.0       # metres behind/above player in TPS
const TPS_HEIGHT  := 2.2

var mode: Mode = Mode.ORBIT

@onready var _fps_cam:  Camera3D = $FPSHead/FPSCamera
@onready var _tps_cam:  Camera3D = $TPSCamera
@onready var _head:     Node3D   = $FPSHead

var _yaw:   float = 0.0
var _pitch: float = 0.0

signal mode_changed(new_mode: Mode)


func _ready() -> void:
	set_physics_process(false)
	_fps_cam.current = false
	_tps_cam.current = false


# ── Public API ────────────────────────────────────────────────────────────────

func activate_fps() -> void:
	mode = Mode.FPS
	set_physics_process(true)
	_fps_cam.current = true
	_tps_cam.current = false
	Input.set_mouse_mode(Input.MOUSE_MODE_CAPTURED)
	mode_changed.emit(Mode.FPS)


func activate_tps() -> void:
	mode = Mode.TPS
	set_physics_process(true)
	_fps_cam.current = false
	_tps_cam.current = true
	Input.set_mouse_mode(Input.MOUSE_MODE_CAPTURED)
	mode_changed.emit(Mode.TPS)


func deactivate() -> void:
	mode = Mode.ORBIT
	set_physics_process(false)
	_fps_cam.current = false
	_tps_cam.current = false
	Input.set_mouse_mode(Input.MOUSE_MODE_VISIBLE)
	mode_changed.emit(Mode.ORBIT)


# ── Input ─────────────────────────────────────────────────────────────────────

func _unhandled_input(event: InputEvent) -> void:
	# Mode toggles (only when not in a captured mode, or always for Escape)
	if event.is_action_pressed("ui_cancel"):
		deactivate()
		return

	if event.is_action_pressed("toggle_fps"):
		if mode == Mode.FPS: deactivate()
		else: activate_fps()
		return

	if event.is_action_pressed("toggle_tps"):
		if mode == Mode.TPS: deactivate()
		else: activate_tps()
		return

	# Mouse look (FPS + TPS)
	if event is InputEventMouseMotion and mode != Mode.ORBIT:
		_yaw   -= event.relative.x * MOUSE_SENS
		_pitch  = clampf(_pitch - event.relative.y * MOUSE_SENS, -PI * 0.44, PI * 0.44)
		rotation.y      = _yaw
		_head.rotation.x = _pitch


# ── Physics ───────────────────────────────────────────────────────────────────

func _physics_process(delta: float) -> void:
	# Gravity
	if not is_on_floor():
		velocity.y -= GRAVITY * delta
	else:
		velocity.y = maxf(velocity.y, -2.0)

	# Jump
	if Input.is_action_just_pressed("jump") and is_on_floor():
		velocity.y = JUMP_VEL

	# Horizontal movement
	var spd := RUN_SPEED if Input.is_key_pressed(KEY_SHIFT) else WALK_SPEED
	var inp := Vector2(
		Input.get_action_strength("move_right") - Input.get_action_strength("move_left"),
		Input.get_action_strength("move_back")  - Input.get_action_strength("move_forward"),
	)
	var dir := (transform.basis * Vector3(inp.x, 0.0, inp.y)).normalized()
	velocity.x = dir.x * spd
	velocity.z = dir.z * spd

	move_and_slide()

	# TPS camera follows behind + above player
	if mode == Mode.TPS:
		var behind := -transform.basis.z * TPS_DIST
		_tps_cam.global_position = global_position + Vector3(behind.x, TPS_HEIGHT, behind.z)
		_tps_cam.look_at(global_position + Vector3(0, 1.4, 0), Vector3.UP)
