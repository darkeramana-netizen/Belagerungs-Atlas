extends Node
## CastleBuilder — dispatcher: routes component types to their builder scripts.
## Mirrors buildComponent() from builders.js.
##
## Supported types (expand as builders are ported):
##   RING            → RingBuilder
##   ROUND_TOWER     → TowerBuilder
##   SQUARE_TOWER    → TowerBuilder
##   GABLED_HALL     → HallBuilder
##   GATE            → GateBuilder
##   GLACIS          → GlacisBuilder
##   SLOPE_PATH      → SlopeBuilder
##   STAIR_FLIGHT    → StairBuilder
##   DITCH           → (stub, skipped for now)
##   WATER_PLANE     → (stub)
##   MACHICOLATION   → (stub)

var style:   String = "crusader"
var scale_f: float  = 1.0

const RingBuilder   = preload("res://scripts/builders/RingBuilder.gd")
const TowerBuilder  = preload("res://scripts/builders/TowerBuilder.gd")
const HallBuilder   = preload("res://scripts/builders/HallBuilder.gd")
const GlacisBuilder = preload("res://scripts/builders/GlacisBuilder.gd")
const StairBuilder  = preload("res://scripts/builders/StairBuilder.gd")

# Types we intentionally skip without a warning (non-visual metadata or NYI)
const SILENT_SKIP := ["WATER_PLANE", "MACHICOLATION", "HOARDING",
                      "DRAWBRIDGE", "CIVILIAN_HOUSING", "DITCH",
                      "TERRAIN_STACK", "PLATEAU"]

func build(comp: Dictionary) -> Node3D:
	var type: String = comp.get("type", "")

	match type:
		"RING":
			return _make(RingBuilder.new(), comp)
		"ROUND_TOWER", "SQUARE_TOWER":
			return _make(TowerBuilder.new(), comp)
		"GABLED_HALL":
			return _make(HallBuilder.new(), comp)
		"GATE":
			# Gate uses TowerBuilder for now (two flanking towers + passage)
			return _make(TowerBuilder.new(), comp)
		"GLACIS":
			return _make(GlacisBuilder.new(), comp)
		"STAIR_FLIGHT", "STAIRWAY", "SLOPE_PATH":
			return _make(StairBuilder.new(), comp)
		_:
			if not SILENT_SKIP.has(type):
				push_warning("[CastleBuilder] Unknown type: " + type)
			return null


func _make(builder: RefCounted, comp: Dictionary) -> Node3D:
	builder.style   = style
	builder.scale_f = scale_f
	return builder.build(comp)
