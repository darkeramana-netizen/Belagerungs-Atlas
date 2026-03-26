extends Node
## CastleVoxelBuilder -- places castle components into the VoxelWorld block grid.
##
## Detail features added on top of the structural skeleton:
##   - Arrow slits: pairs of AIR blocks cut into walls / tower shells.
##   - Decorative stone courses: LIMESTONE band every 4 rows on tall towers.
##   - Corbels: STONE_BRICK protrusions under battlement rows.
##   - Window slots: openings in hall walls.
##   - Stair-stepped glacis: tighter frustum stepping for a smoother slope.

const BT = preload("res://scripts/voxel/BlockTypes.gd")

var world = null   # VoxelWorld (set by Main before calling build())

const BASE_Y := 20


# ---------------------------------------------------------------------------
# Public entry point
# ---------------------------------------------------------------------------

func build(model: Dictionary) -> void:
	if world == null:
		push_error("[CastleVoxelBuilder] world is null")
		return

	var components: Array = model.get("components", [])
	for comp in components:
		if not comp is Dictionary:
			continue
		_dispatch(comp)

	# Cobblestone courtyard at ground level
	var cam_r: float = model.get("cameraRadius", 60.0)
	var yard_r: int  = int(cam_r * 0.38)
	_fill_courtyard(yard_r)


# ---------------------------------------------------------------------------
# Component dispatcher
# ---------------------------------------------------------------------------

func _dispatch(comp: Dictionary) -> void:
	var type: String = comp.get("type", "")
	match type:
		"RING":
			_build_ring(comp)
		"ROUND_TOWER":
			_build_round_tower(comp)
		"SQUARE_TOWER":
			_build_square_tower(comp)
		"GATE":
			_build_gate(comp)
		"GABLED_HALL":
			_build_hall(comp)
		"GLACIS":
			_build_glacis(comp)
		_:
			pass   # WATER_PLANE, TERRAIN_STACK, etc. -- silently skip


# ---------------------------------------------------------------------------
# RING
# ---------------------------------------------------------------------------

func _build_ring(comp: Dictionary) -> void:
	var pts: Array   = comp.get("points", [])
	var wall_h: int  = maxi(1, int(comp.get("wall", {}).get("h",     8.0)))
	var wall_t: int  = maxi(1, int(comp.get("wall", {}).get("thick", 1.5)))
	var gate_i: int  = comp.get("gate", {}).get("atIndex", -1) if comp.has("gate") else -1
	var sq: bool     = bool(comp.get("squareTowers", false))
	var ring_y: int  = BASE_Y + int(float(comp.get("y", 0.0)))

	for i in pts.size():
		var pt = pts[i]
		var px: int = int(round(float(pt.get("x", 0.0))))
		var pz: int = int(round(float(pt.get("z", 0.0))))
		var twr: int = maxi(1, int(round(float(pt.get("r", 3.0)))))
		var th: int  = maxi(3, int(round(float(pt.get("h", 14.0)))))

		if sq:
			_place_square_tower(px, ring_y, pz, twr, th, BT.STONE_BRICK)
		else:
			_place_round_tower(px, ring_y, pz, twr, th, BT.STONE_BRICK)

		# Curtain wall to next tower (skip gate segment)
		var ni: int = (i + 1) % pts.size()
		if i == gate_i:
			_build_gate_gap(pts[i], pts[ni], ring_y, wall_h)
			continue

		var np = pts[ni]
		var bx: int = int(round(float(np.get("x", 0.0))))
		var bz: int = int(round(float(np.get("z", 0.0))))
		_place_wall(px, ring_y, pz, bx, bz, wall_h, wall_t, BT.STONE_BRICK)


# ---------------------------------------------------------------------------
# ROUND_TOWER
# ---------------------------------------------------------------------------

func _build_round_tower(comp: Dictionary) -> void:
	var px: int = int(round(float(comp.get("x", 0.0))))
	var pz: int = int(round(float(comp.get("z", 0.0))))
	var r:  int = maxi(2, int(round(float(comp.get("r", 5.0)))))
	var h:  int = maxi(3, int(round(float(comp.get("h", 16.0)))))
	_place_round_tower(px, BASE_Y, pz, r, h, BT.STONE_BRICK)


# ---------------------------------------------------------------------------
# SQUARE_TOWER
# ---------------------------------------------------------------------------

func _build_square_tower(comp: Dictionary) -> void:
	var px: int = int(round(float(comp.get("x", 0.0))))
	var pz: int = int(round(float(comp.get("z", 0.0))))
	var r:  int = maxi(1, int(round(float(comp.get("r", 4.0)))))
	var h:  int = maxi(3, int(round(float(comp.get("h", 14.0)))))
	_place_square_tower(px, BASE_Y, pz, r, h, BT.STONE_BRICK)


# ---------------------------------------------------------------------------
# GATE (two flanking towers + portcullis arch)
# ---------------------------------------------------------------------------

func _build_gate(comp: Dictionary) -> void:
	var px: int = int(round(float(comp.get("x", 0.0))))
	var pz: int = int(round(float(comp.get("z", 0.0))))
	var w:  int = maxi(2, int(round(float(comp.get("w", 4.0)))))
	var h:  int = maxi(3, int(round(float(comp.get("h", 10.0)))))
	var twr: int = maxi(2, w)

	# Two flanking towers
	_place_round_tower(px - w - twr, BASE_Y, pz, twr, h, BT.DARK_BRICK)
	_place_round_tower(px + w + twr, BASE_Y, pz, twr, h, BT.DARK_BRICK)

	# Portcullis arch -- pointed arch shape
	var arch_h: int = mini(3, h - 1)
	for dy in arch_h:
		var span: int = w - dy * int(float(w) / float(maxi(1, arch_h)))
		for dx in range(-span, span + 1):
			world.set_block(px + dx, BASE_Y + h - arch_h + dy, pz, BT.ARCH)

	# Gate passage remains open (AIR) for width w, height h-arch_h


# ---------------------------------------------------------------------------
# GABLED_HALL
# ---------------------------------------------------------------------------

func _build_hall(comp: Dictionary) -> void:
	var cx: int = int(round(float(comp.get("x", 0.0))))
	var cz: int = int(round(float(comp.get("z", 0.0))))
	var w:  int = maxi(3, int(round(float(comp.get("w", 10.0)))))
	var d:  int = maxi(3, int(round(float(comp.get("d", 16.0)))))
	var h:  int = maxi(2, int(round(float(comp.get("h",  7.0)))))
	var rh: int = maxi(1, int(round(float(comp.get("roofH", 3.0)))))

	var hw: int = w >> 1
	var hd: int = d >> 1

	# Hollow walls (1 block thick)
	for z in range(cz - hd, cz + hd + 1):
		for x in range(cx - hw, cx + hw + 1):
			var on_wall: bool = x == cx - hw or x == cx + hw or z == cz - hd or z == cz + hd
			for y in range(BASE_Y, BASE_Y + h):
				if on_wall:
					world.set_block(x, y, z, BT.STONE_BRICK)
				elif y == BASE_Y:
					world.set_block(x, y, z, BT.CLAY_TILE)   # interior floor

	# Window slots: one per wall face, mid-height
	var win_y: int = BASE_Y + (h >> 1)
	_cut_window_slot(cx, win_y, cz - hd, BT.AIR)   # south face
	_cut_window_slot(cx, win_y, cz + hd, BT.AIR)   # north face
	# Doorway on south face (wider opening at ground level)
	world.set_block(cx, BASE_Y,     cz - hd, BT.AIR)
	world.set_block(cx, BASE_Y + 1, cz - hd, BT.AIR)

	# Gabled roof (SLATE_ROOF blocks)
	for dz in range(-hd, hd + 1):
		for dy in range(rh):
			var span: int = hw - dy
			for dx in range(-span, span + 1):
				world.set_block(cx + dx, BASE_Y + h + dy, cz + dz, BT.SLATE_ROOF)

	# Foundations
	_auto_foundations(cx - hw, cx + hw, cz - hd, cz + hd)


# ---------------------------------------------------------------------------
# GLACIS -- stair-stepped frustum ring
# ---------------------------------------------------------------------------

func _build_glacis(comp: Dictionary) -> void:
	var r: int = maxi(1, int(round(float(comp.get("r", 30.0)))))
	var h: int = maxi(1, int(round(float(comp.get("h",  4.0)))))
	for y in h:
		# Each step is 1 block narrower inward (frustum)
		var ry: int = r - y
		_ring_blocks(0, BASE_Y - h + y, 0, ry, 1, BT.STONE)
		# Add a slightly wider solid base on the lowest step for a cleaner base
		if y == 0:
			_ring_blocks(0, BASE_Y - h, 0, ry, 2, BT.STONE)


# ---------------------------------------------------------------------------
# Primitive block placers
# ---------------------------------------------------------------------------

## Hollow cylinder shell with arrow slits and decorative courses.
func _place_round_tower(cx: int, base_y: int, cz: int,
		r: int, height: int, block_id: int) -> void:
	var shell: int = maxi(1, r >> 2)
	for y in range(base_y, base_y + height):
		var dy: int = y - base_y
		# Decorative LIMESTONE band every 4 rows on tall towers
		var bid: int = block_id
		if r >= 4 and (dy % 4 == 0) and dy > 0 and dy < height - 1:
			bid = BT.LIMESTONE
		_ring_blocks(cx, y, cz, r, shell, bid)

	# Corbels (protrusions) just below the battlement row
	if height >= 4:
		_ring_blocks(cx, base_y + height - 2, cz, r + 1, 1, BT.STONE_BRICK)

	# Battlements (crenellations) on top
	var merlon_gap := 2
	for angle_step in range(0, 360, merlon_gap * 15):
		var a: float = deg_to_rad(float(angle_step))
		var bx: int = cx + int(round(cos(a) * float(r)))
		var bz_: int = cz + int(round(sin(a) * float(r)))
		world.set_block(bx, base_y + height, bz_, BT.BATTLEMENT)

	# Arrow slits: 4 cardinal directions
	if r >= 3 and height >= 6:
		var slit_y: int = base_y + (height >> 1)
		for a_deg in [0, 90, 180, 270]:
			var a: float = deg_to_rad(float(a_deg))
			var sx: int = cx + int(round(cos(a) * float(r - 1)))
			var sz: int = cz + int(round(sin(a) * float(r - 1)))
			world.set_block(sx, slit_y,     sz, BT.AIR)
			world.set_block(sx, slit_y + 1, sz, BT.AIR)

	# Foundation column
	_fill_column_to_ground(cx, base_y, cz, block_id)
	fill_ring_foundations(cx, cz, r, base_y)


## Hollow box tower with arrow slits and decorative courses.
func _place_square_tower(cx: int, base_y: int, cz: int,
		r: int, height: int, block_id: int) -> void:
	for y in range(base_y, base_y + height):
		var dy: int = y - base_y
		var bid: int = block_id
		if r >= 3 and (dy % 4 == 0) and dy > 0 and dy < height - 1:
			bid = BT.LIMESTONE
		for z in range(cz - r, cz + r + 1):
			for x in range(cx - r, cx + r + 1):
				var on_wall: bool = x == cx - r or x == cx + r or z == cz - r or z == cz + r
				if on_wall or y == base_y:
					world.set_block(x, y, z, bid)

	# Corbels under battlements
	if height >= 4:
		for x in range(cx - r - 1, cx + r + 2):
			world.set_block(x, base_y + height - 2, cz - r - 1, BT.STONE_BRICK)
			world.set_block(x, base_y + height - 2, cz + r + 1, BT.STONE_BRICK)
		for z in range(cz - r, cz + r + 1):
			world.set_block(cx - r - 1, base_y + height - 2, z, BT.STONE_BRICK)
			world.set_block(cx + r + 1, base_y + height - 2, z, BT.STONE_BRICK)

	# Battlements
	for x in range(cx - r, cx + r + 1, 2):
		world.set_block(x, base_y + height, cz - r, BT.BATTLEMENT)
		world.set_block(x, base_y + height, cz + r, BT.BATTLEMENT)
	for z in range(cz - r, cz + r + 1, 2):
		world.set_block(cx - r, base_y + height, z, BT.BATTLEMENT)
		world.set_block(cx + r, base_y + height, z, BT.BATTLEMENT)

	# Arrow slits on each wall face (mid-height)
	if height >= 6:
		var slit_y: int = base_y + (height >> 1)
		for dx in range(-r + 1, r, 2):
			world.set_block(cx + dx, slit_y,     cz - r, BT.AIR)
			world.set_block(cx + dx, slit_y + 1, cz - r, BT.AIR)
			world.set_block(cx + dx, slit_y,     cz + r, BT.AIR)
			world.set_block(cx + dx, slit_y + 1, cz + r, BT.AIR)
		for dz in range(-r + 1, r, 2):
			world.set_block(cx - r, slit_y,     cz + dz, BT.AIR)
			world.set_block(cx - r, slit_y + 1, cz + dz, BT.AIR)
			world.set_block(cx + r, slit_y,     cz + dz, BT.AIR)
			world.set_block(cx + r, slit_y + 1, cz + dz, BT.AIR)

	_auto_foundations(cx - r, cx + r, cz - r, cz + r)


## Curtain wall with arrow slits and corbels under battlements.
func _place_wall(ax: int, base_y: int, az: int,
		bx: int, bz: int, height: int, thickness: int,
		block_id: int) -> void:
	var dx: int = bx - ax
	var dz: int = bz - az
	var steps: int = maxi(abs(dx), abs(dz))
	if steps == 0:
		return

	for s in range(steps + 1):
		var t: float = float(s) / float(steps)
		var wx: int  = ax + int(round(t * float(dx)))
		var wz: int  = az + int(round(t * float(dz)))

		for y in range(base_y, base_y + height):
			world.set_block(wx, y, wz, block_id)
			if abs(dx) > abs(dz):
				for tz in range(-(thickness >> 1), (thickness >> 1) + 1):
					world.set_block(wx, y, wz + tz, block_id)
			else:
				for tx in range(-(thickness >> 1), (thickness >> 1) + 1):
					world.set_block(wx + tx, y, wz, block_id)

		# Corbels just below battlement row
		if height >= 3:
			if abs(dx) > abs(dz):
				world.set_block(wx, base_y + height - 2, wz - 1, BT.STONE_BRICK)
				world.set_block(wx, base_y + height - 2, wz + 1, BT.STONE_BRICK)
			else:
				world.set_block(wx - 1, base_y + height - 2, wz, BT.STONE_BRICK)
				world.set_block(wx + 1, base_y + height - 2, wz, BT.STONE_BRICK)

		# Battlements every 2 blocks
		if s % 2 == 0:
			world.set_block(wx, base_y + height, wz, BT.BATTLEMENT)

	# Arrow slits every 4 steps along the wall
	if height >= 5:
		var slit_y: int = base_y + (height >> 1)
		for s in range(2, steps - 1, 4):
			var t: float = float(s) / float(steps)
			var wx: int  = ax + int(round(t * float(dx)))
			var wz: int  = az + int(round(t * float(dz)))
			world.set_block(wx, slit_y,     wz, BT.AIR)
			world.set_block(wx, slit_y + 1, wz, BT.AIR)

	# Foundations under wall
	for s in range(steps + 1):
		var t: float = float(s) / float(steps)
		var wx: int  = ax + int(round(t * float(dx)))
		var wz: int  = az + int(round(t * float(dz)))
		world.fill_foundation(wx, base_y, wz, BT.FOUNDATION)


func _build_gate_gap(_pt_a, _pt_b, _base_y: int, _wall_h: int) -> void:
	pass   # open passage handled by _build_gate() flanking towers


## Window slot: a 1-wide 2-tall opening centred at (wx, wy, wz).
func _cut_window_slot(wx: int, wy: int, wz: int, _block_id: int) -> void:
	world.set_block(wx, wy,     wz, BT.AIR)
	world.set_block(wx, wy + 1, wz, BT.AIR)


## Courtyard: fill a circle of COBBLE at BASE_Y (only over AIR/grass/dirt).
func _fill_courtyard(radius: int) -> void:
	for z in range(-radius, radius + 1):
		for x in range(-radius, radius + 1):
			if x * x + z * z <= radius * radius:
				var cur: int = world.get_block(x, BASE_Y, z)
				if cur == BT.AIR or cur == BT.GRASS or cur == BT.DIRT:
					world.set_block(x, BASE_Y, z, BT.COBBLE)


# ---------------------------------------------------------------------------
# Geometry helpers
# ---------------------------------------------------------------------------

func _ring_blocks(cx: int, y: int, cz: int, r: int, shell: int, block_id: int) -> void:
	var r_inner: int = maxi(0, r - shell)
	for z in range(cz - r, cz + r + 1):
		for x in range(cx - r, cx + r + 1):
			var dist2: int = (x - cx) * (x - cx) + (z - cz) * (z - cz)
			if dist2 <= r * r and dist2 >= r_inner * r_inner:
				world.set_block(x, y, z, block_id)


func _fill_column_to_ground(wx: int, top_y: int, wz: int, block_id: int) -> void:
	world.fill_foundation(wx, top_y, wz, block_id)


func _auto_foundations(x0: int, x1: int, z0: int, z1: int) -> void:
	for z in range(z0, z1 + 1):
		for x in range(x0, x1 + 1):
			world.fill_foundation(x, BASE_Y, z, BT.FOUNDATION)


func fill_ring_foundations(cx: int, cz: int, r: int, base_y: int) -> void:
	for z in range(cz - r, cz + r + 1):
		for x in range(cx - r, cx + r + 1):
			var d2: int = (x - cx) * (x - cx) + (z - cz) * (z - cz)
			if d2 <= r * r:
				world.fill_foundation(x, base_y, z, BT.FOUNDATION)
