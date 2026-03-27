## BlockTypes -- single source of truth for all block IDs, colors, and properties.
## Every other script preloads this. Adding a new block = add it here only.
##
## Block size: 1 m x 1 m x 1 m.
## Byte-sized IDs: values 0-255 (PackedByteArray storage).

class_name BlockTypes


# ---------------------------------------------------------------------------
# Block ID constants
# ---------------------------------------------------------------------------

const AIR          := 0
const GRASS        := 1
const DIRT         := 2
const STONE        := 3
const STONE_BRICK  := 4   # castle walls
const DARK_BRICK   := 5   # tower interiors / darker walls
const COBBLE       := 6   # courtyard paving, paths
const SAND         := 7
const GRAVEL       := 8
const BATTLEMENT   := 9   # merlons / crenellations
const WOOD_PLANK   := 10  # floors, scaffolding
const SLATE_ROOF   := 11  # gabled roof surface
const FOUNDATION   := 12  # auto-generated under castle blocks
const BEDROCK      := 13  # world bottom
const WATER        := 14  # moats (transparent, future)
const MOSSY_STONE  := 15  # ruins / old walls
const ARCH         := 16  # gateway arch block
const CLAY_TILE    := 17  # interior floor
const LIMESTONE    := 18  # lighter stone variant
const BASALT       := 19  # darker stone variant


# ---------------------------------------------------------------------------
# Properties table
# Each entry: { "name", "solid", "transparent", "color", "ao_top" }
# "ao_top": tint multiplier for the top face (grass slightly lighter).
# ---------------------------------------------------------------------------

const PROPS := {
	AIR:         { "name": "Air",          "solid": false, "transparent": true,
	               "color": Color(0,0,0,0),             "ao_top": 1.0 },
	GRASS:       { "name": "Grass",        "solid": true,  "transparent": false,
	               "color": Color(0.33, 0.50, 0.20, 1), "ao_top": 1.1 },
	DIRT:        { "name": "Dirt",         "solid": true,  "transparent": false,
	               "color": Color(0.44, 0.30, 0.18, 1), "ao_top": 1.0 },
	STONE:       { "name": "Stone",        "solid": true,  "transparent": false,
	               "color": Color(0.52, 0.50, 0.46, 1), "ao_top": 1.0 },
	STONE_BRICK: { "name": "Stone Brick",  "solid": true,  "transparent": false,
	               "color": Color(0.62, 0.58, 0.52, 1), "ao_top": 1.0 },
	DARK_BRICK:  { "name": "Dark Brick",   "solid": true,  "transparent": false,
	               "color": Color(0.34, 0.30, 0.26, 1), "ao_top": 1.0 },
	COBBLE:      { "name": "Cobblestone",  "solid": true,  "transparent": false,
	               "color": Color(0.48, 0.46, 0.42, 1), "ao_top": 1.0 },
	SAND:        { "name": "Sand",         "solid": true,  "transparent": false,
	               "color": Color(0.78, 0.72, 0.52, 1), "ao_top": 1.05 },
	GRAVEL:      { "name": "Gravel",       "solid": true,  "transparent": false,
	               "color": Color(0.56, 0.54, 0.50, 1), "ao_top": 1.0 },
	BATTLEMENT:  { "name": "Battlement",   "solid": true,  "transparent": false,
	               "color": Color(0.60, 0.56, 0.50, 1), "ao_top": 1.0 },
	WOOD_PLANK:  { "name": "Wood Plank",   "solid": true,  "transparent": false,
	               "color": Color(0.60, 0.44, 0.24, 1), "ao_top": 1.0 },
	SLATE_ROOF:  { "name": "Slate Roof",   "solid": true,  "transparent": false,
	               "color": Color(0.30, 0.28, 0.26, 1), "ao_top": 1.0 },
	FOUNDATION:  { "name": "Foundation",   "solid": true,  "transparent": false,
	               "color": Color(0.46, 0.42, 0.38, 1), "ao_top": 1.0 },
	BEDROCK:     { "name": "Bedrock",      "solid": true,  "transparent": false,
	               "color": Color(0.22, 0.20, 0.20, 1), "ao_top": 1.0 },
	WATER:       { "name": "Water",        "solid": false, "transparent": true,
	               "color": Color(0.20, 0.45, 0.70, 0.6), "ao_top": 1.0 },
	MOSSY_STONE: { "name": "Mossy Stone",  "solid": true,  "transparent": false,
	               "color": Color(0.44, 0.52, 0.38, 1), "ao_top": 1.0 },
	ARCH:        { "name": "Arch Block",   "solid": true,  "transparent": false,
	               "color": Color(0.58, 0.54, 0.48, 1), "ao_top": 1.0 },
	CLAY_TILE:   { "name": "Clay Tile",    "solid": true,  "transparent": false,
	               "color": Color(0.62, 0.46, 0.34, 1), "ao_top": 1.0 },
	LIMESTONE:   { "name": "Limestone",    "solid": true,  "transparent": false,
	               "color": Color(0.82, 0.78, 0.68, 1), "ao_top": 1.0 },
	BASALT:      { "name": "Basalt",       "solid": true,  "transparent": false,
	               "color": Color(0.26, 0.24, 0.22, 1), "ao_top": 1.0 },
}


# ---------------------------------------------------------------------------
# Static helpers
# ---------------------------------------------------------------------------

static func is_solid(id: int) -> bool:
	var p: Dictionary = PROPS.get(id, PROPS[AIR])
	return p.get("solid", false)

static func is_transparent(id: int) -> bool:
	# Unknown IDs (e.g. the UNLOADED sentinel 255) are treated as opaque so
	# the mesher never generates a face against an unloaded neighbour chunk.
	if not PROPS.has(id):
		return false
	return PROPS[id].get("transparent", false)

static func get_color(id: int) -> Color:
	var p: Dictionary = PROPS.get(id, PROPS[AIR])
	return p.get("color", Color.BLACK)

static func get_ao_top(id: int) -> float:
	var p: Dictionary = PROPS.get(id, PROPS[AIR])
	return p.get("ao_top", 1.0)

static func get_name(id: int) -> String:
	var p: Dictionary = PROPS.get(id, PROPS[AIR])
	return p.get("name", "Unknown")
