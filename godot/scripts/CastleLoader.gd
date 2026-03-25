extends Node
## CastleLoader — reads hero_castles.json (or individual <id>.json) and
## dispatches each component to the appropriate builder script.
##
## JSON schema (mirrors the JS component model):
##   { id, name, style, scale, cameraRadius, components: [ {type, x, y, z, ...}, ... ] }

const CastleBuilder = preload("res://scripts/CastleBuilder.gd")

# ── Static helpers ────────────────────────────────────────────────────────────

## Load a castle model dict from data_dir.
## Tries <data_dir>/<id>.json first, falls back to hero_castles.json array.
static func load_castle(data_dir: String, castle_id: String) -> Dictionary:
	# 1. Try individual file
	var single_path := data_dir.path_join(castle_id + ".json")
	if FileAccess.file_exists(single_path):
		return _parse_json_file(single_path)

	# 2. Fall back to bundled hero array
	var hero_path := data_dir.path_join("hero_castles.json")
	if not FileAccess.file_exists(hero_path):
		push_error("CastleLoader: hero_castles.json not found at " + hero_path)
		return {}

	var all: Array = _parse_json_file(hero_path)
	if typeof(all) != TYPE_ARRAY:
		push_error("CastleLoader: hero_castles.json must be a JSON array")
		return {}

	for entry in all:
		if entry is Dictionary and entry.get("id") == castle_id:
			return entry

	push_warning("CastleLoader: castle id '%s' not found" % castle_id)
	return {}


static func _parse_json_file(path: String):
	var file := FileAccess.open(path, FileAccess.READ)
	if file == null:
		push_error("CastleLoader: cannot open " + path)
		return {}
	var json := JSON.new()
	var err  := json.parse(file.get_as_text())
	file.close()
	if err != OK:
		push_error("CastleLoader: JSON parse error in %s: %s" % [path, json.get_error_message()])
		return {}
	return json.get_data()

# ── Instance API ──────────────────────────────────────────────────────────────

## Build all components from a model dict into parent_node.
func build_into(parent: Node3D, model: Dictionary) -> void:
	var components: Array = model.get("components", [])
	var style:      String = model.get("style", "crusader")
	var scale_f:    float  = float(model.get("scale", 1.0))

	var builder := CastleBuilder.new()
	builder.style   = style
	builder.scale_f = scale_f

	var built := 0
	for comp in components:
		if not comp is Dictionary:
			continue
		var node := builder.build(comp)
		if node != null:
			parent.add_child(node)
			built += 1

	print("[CastleLoader] Built %d / %d components" % [built, components.size()])
