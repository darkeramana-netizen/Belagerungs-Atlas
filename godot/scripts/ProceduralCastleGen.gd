extends Node
## ProceduralCastleGen -- DNA-based procedural castle generator.
##
## Principle: a castle is described as a Dictionary of Architektur-Regeln
## (architecture rules) that CastleBuilder already understands.  The same
## seed always produces the same castle -- identical geometry, same position.
##
## Usage:
##   var model := ProceduralCastleGen.generate(world_seed, wx, wz)
##   loader.build_into(castle_root, model)
##
## DNA layers:
##   1. Layout   RING | RECT | KEEP_ONLY
##   2. Towers   count, radius, height -- all seeded
##   3. Walls    connect towers, depth varies with terrain slope
##   4. Modules  keep, great hall, chapel, stables (seeded presence)


## Generate a castle Dictionary from a seed + world position.
## world_x / world_z allow placing many different castles in the world
## while still being deterministic: position changes the castle DNA.
static func generate(world_seed: int, world_x: float = 0.0, world_z: float = 0.0) -> Dictionary:
	var castle_seed := _hash3(world_seed, int(world_x * 0.1), int(world_z * 0.1))
	var rng := RandomNumberGenerator.new()
	rng.seed = castle_seed

	var components: Array = []

	# --- Castle scale ----------------------------------------------------
	var scale: float = rng.randf_range(0.75, 1.45)

	# --- Layout choice ---------------------------------------------------
	# 0 = ring (classic), 1 = rectangular, 2 = keep-only (ruin / small fort)
	var layout: int = rng.randi_range(0, 2)

	# --- Shared parameters -----------------------------------------------
	var tower_r: float  = rng.randf_range(3.5, 6.5)  * scale
	var tower_h: float  = rng.randf_range(14.0, 28.0) * scale
	var wall_h:  float  = rng.randf_range(7.0,  13.0) * scale
	var wall_t:  float  = rng.randf_range(1.2,  2.2)  * scale
	var use_sq:  bool   = rng.randi_range(0, 1) == 0

	var ring_r:  float  = rng.randf_range(20.0, 50.0) * scale
	var cam_r:   float  = ring_r * 2.3

	# =====================================================================
	# Layout A -- ring (concentric)
	# =====================================================================
	if layout == 0 or layout == 1:
		var num_t: int = rng.randi_range(4, 8)
		var points: Array = _ring_points(rng, num_t, ring_r, tower_r, tower_h)
		var gate_i: int   = rng.randi_range(0, num_t - 1)

		components.append({
			"type": "RING",
			"id":   "outer_ring",
			"y":    0.0,
			"points": points,
			"wall": {"h": wall_h, "thick": wall_t},
			"gate": {"atIndex": gate_i, "w": 4.5 * scale, "d": 7.0 * scale, "h": wall_h},
			"squareTowers": use_sq,
		})

		# Optional inner ward (50% chance if ring is large enough)
		if ring_r > 30.0 and rng.randf() < 0.55:
			var inner_r: float = ring_r * rng.randf_range(0.38, 0.52)
			var inner_n: int   = rng.randi_range(3, 6)
			components.append({
				"type": "RING",
				"id":   "inner_ring",
				"y":    0.0,
				"points": _ring_points(rng, inner_n, inner_r, tower_r * 0.78, tower_h * 0.88),
				"wall": {"h": wall_h * 0.8, "thick": wall_t * 0.85},
				"squareTowers": use_sq,
			})

	# =====================================================================
	# Layout B -- rectangular curtain wall (4 corner towers + 4 walls)
	# Built from individual SQUARE_TOWER + RING components.
	# =====================================================================
	if layout == 1:
		var rx: float = ring_r * rng.randf_range(0.65, 1.0)
		var rz: float = ring_r * rng.randf_range(0.65, 1.0)
		var rect_pts: Array = [
			{"x":  rx, "z":  rz, "r": tower_r, "h": tower_h},
			{"x": -rx, "z":  rz, "r": tower_r, "h": tower_h},
			{"x": -rx, "z": -rz, "r": tower_r, "h": tower_h},
			{"x":  rx, "z": -rz, "r": tower_r, "h": tower_h},
		]
		components.append({
			"type": "RING",
			"id":   "rect_curtain",
			"y":    0.0,
			"points": rect_pts,
			"wall": {"h": wall_h, "thick": wall_t},
			"gate": {"atIndex": 0, "w": 4.5 * scale, "d": 7.0 * scale, "h": wall_h},
			"squareTowers": true,
		})
		cam_r = maxf(rx, rz) * 2.8

	# =====================================================================
	# Keep (central donjon) -- always present
	# =====================================================================
	var keep_r: float = rng.randf_range(5.5, 9.5) * scale
	var keep_h: float = rng.randf_range(20.0, 38.0) * scale
	var keep_sq: bool = rng.randf() < 0.35
	components.append({
		"type": "SQUARE_TOWER" if keep_sq else "ROUND_TOWER",
		"id":   "keep",
		"x": 0.0, "z": 0.0,
		"r": keep_r, "h": keep_h,
	})

	# =====================================================================
	# Modules (seeded presence / position)
	# =====================================================================

	# Great hall (70%)
	if rng.randf() < 0.70:
		var hw: float = rng.randf_range(8.0, 14.0) * scale
		var hd: float = rng.randf_range(14.0, 22.0) * scale
		var hh: float = rng.randf_range(6.0, 9.5)  * scale
		var hz: float = keep_r + hd * 0.5 + rng.randf_range(1.5, 4.0) * scale
		components.append({
			"type": "GABLED_HALL",
			"id":   "great_hall",
			"x": 0.0, "z": hz,
			"w": hw, "d": hd, "h": hh,
			"roofH": hh * 0.55,
		})

	# Chapel (40%, placed at an angle)
	if rng.randf() < 0.40:
		var angle: float = rng.randf_range(0.8, 2.4)
		var dist:  float = (keep_r + rng.randf_range(6.0, 12.0)) * scale
		var cw: float    = rng.randf_range(5.0, 8.0)  * scale
		var cd: float    = rng.randf_range(9.0, 14.0) * scale
		var ch: float    = rng.randf_range(5.5, 8.0)  * scale
		components.append({
			"type": "GABLED_HALL",
			"id":   "chapel",
			"x": cos(angle) * dist, "z": sin(angle) * dist,
			"w": cw, "d": cd, "h": ch,
			"roofH": ch * 0.7,
		})

	# Glacis base ring (25% -- older castle style)
	if rng.randf() < 0.25:
		components.append({
			"type": "GLACIS",
			"id":   "glacis",
			"x": 0.0, "z": 0.0,
			"r": ring_r * 1.08,
			"h": wall_h * 0.55,
			"topR": ring_r * 0.96,
		})

	return {
		"name":         "Festung-%04d" % (castle_seed % 9999),
		"seed":         castle_seed,
		"cameraRadius": cam_r,
		"components":   components,
	}


# ----------------------------------------------------------------------------
# Helpers
# ----------------------------------------------------------------------------

## Generate evenly-spaced ring points with slight jitter for organic feel.
static func _ring_points(rng: RandomNumberGenerator,
		n: int, ring_r: float, t_r: float, t_h: float) -> Array:
	var pts: Array = []
	for i in n:
		var base_a: float = (float(i) / n) * TAU
		var a_jit:  float = rng.randf_range(-0.12, 0.12)
		var r_jit:  float = rng.randf_range(0.88, 1.12)
		var h_jit:  float = rng.randf_range(0.88, 1.15)
		pts.append({
			"x": cos(base_a + a_jit) * ring_r * r_jit,
			"z": sin(base_a + a_jit) * ring_r * r_jit,
			"r": t_r,
			"h": t_h * h_jit,
		})
	return pts


## Deterministic hash of three integers -> single int seed.
static func _hash3(a: int, b: int, c: int) -> int:
	var h: int = a
	h = h ^ (b * 2654435761)
	h = h ^ (c * 1234567891)
	return absi(h) % 2147483647
