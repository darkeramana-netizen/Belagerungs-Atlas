// DioramaValidator.js
// ──────────────────────────────────────────────────────────────────────────────
// Structural validator for castle diorama component data.
//
// Implements four quality guarantees:
//   1. Snap-Point Connectivity  — stairs/ramps must connect to real floor surfaces
//   2. Level Reachability       — every accessible floor must be reachable from spawn
//   3. Ring Integrity           — rings must have ≥3 points, a gate, no duplicates
//   4. Structural Coherence     — components must have required fields + valid types
//
// Usage:
//   import { validateDiorama, printValidationReport } from './DioramaValidator.js';
//   const report = validateDiorama(components, { castleBaseY: 1.98 });
//   printValidationReport(report, castleId);
//
// All validation is non-destructive (read-only, no component modification).

// ── Known component types ─────────────────────────────────────────────────────
const KNOWN_TYPES = new Set([
  'RING', 'PLATEAU', 'TERRAIN_STACK', 'DITCH', 'GLACIS', 'SLOPE_PATH',
  'ROUND_TOWER', 'SQUARE_TOWER', 'GABLED_HALL', 'GATE',
  'STAIRWAY', 'STAIR_FLIGHT',
  'MACHICOLATION', 'HOARDING', 'DRAWBRIDGE',
  'ABBEY_MODULE', 'CIVILIAN_HOUSING',
]);

// ── Snap-point definitions ────────────────────────────────────────────────────
//
// A snap point describes an accessible surface or connection mouth that another
// component can "snap" to.  Each is:
//   { type, x, y, z, tag? }
// where tag is an optional semantic hint ('floor', 'wall_walk', 'stair_top', etc.)

/**
 * Returns all snap points (accessible surfaces / connection portals) for a
 * single component.  World-space coordinates, computed from the component's
 * own position fields.
 *
 * @param  {object} comp  — normalised component object
 * @returns {Array<{type:string, x:number, y:number, z:number, tag:string}>}
 */
export function getSnapPoints(comp) {
  const snaps = [];
  const cx = comp.x || 0;
  const cz = comp.z || 0;
  const y  = comp.y ?? 0;

  switch (comp.type) {
    // ── PLATEAU ────────────────────────────────────────────────────────────
    case 'PLATEAU': {
      const topY = y + (comp.h || 0.5);
      snaps.push({ type: 'FLOOR', x: cx, y: topY, z: cz, tag: 'plateau_top', source: comp.id });
      break;
    }
    // ── RING ───────────────────────────────────────────────────────────────
    case 'RING': {
      const wh = comp.wall?.h || 3;
      // Ring base (courtyard floor at ring.y)
      snaps.push({ type: 'FLOOR', x: cx, y, z: cz, tag: 'ring_base', source: comp.id });
      // Wall-walk at ring top
      snaps.push({ type: 'WALL_WALK', x: cx, y: y + wh, z: cz, tag: 'wall_walk', source: comp.id });
      // Gate portals
      if (comp.gate && comp.points) {
        const gi = comp.gate.atIndex;
        if (gi != null && gi < comp.points.length) {
          const pt = comp.points[gi];
          const nx = comp.points[(gi + 1) % comp.points.length];
          const mx = ((pt.x || 0) + (nx.x || 0)) / 2;
          const mz = ((pt.z || 0) + (nx.z || 0)) / 2;
          snaps.push({ type: 'GATE_ENTRY', x: cx + mx, y, z: cz + mz, tag: 'gate', source: comp.id });
          snaps.push({ type: 'GATE_EXIT',  x: cx + mx, y, z: cz + mz, tag: 'gate', source: comp.id });
        }
      }
      break;
    }
    // ── TERRAIN_STACK ──────────────────────────────────────────────────────
    case 'TERRAIN_STACK': {
      let topY = y;
      for (const l of (comp.layers || [])) topY += (l.h || 0);
      snaps.push({ type: 'FLOOR', x: cx, y: topY, z: cz, tag: 'stack_top', source: comp.id });
      break;
    }
    // ── STAIRWAY ───────────────────────────────────────────────────────────
    case 'STAIRWAY': {
      const topY = y + (comp.h || 2);
      snaps.push({ type: 'STAIR_BOTTOM', x: cx, y,    z: cz, tag: 'stair_bottom', source: comp.id });
      snaps.push({ type: 'STAIR_TOP',    x: cx, y: topY, z: cz, tag: 'stair_top', source: comp.id });
      break;
    }
    // ── STAIR_FLIGHT ───────────────────────────────────────────────────────
    case 'STAIR_FLIGHT': {
      const steps = comp.steps || 8;
      const stepH = comp.stepH || 0.22;
      const stepD = comp.stepD || 0.35;
      const rot   = comp.rotation || 0;
      const topY  = y + steps * stepH;
      const topX  = cx + Math.sin(rot) * steps * stepD;
      const topZ  = cz + Math.cos(rot) * steps * stepD;
      snaps.push({ type: 'STAIR_BOTTOM', x: cx, y,    z: cz,  tag: 'stair_bottom', source: comp.id });
      snaps.push({ type: 'STAIR_TOP',    x: topX, y: topY, z: topZ, tag: 'stair_top', source: comp.id });
      break;
    }
    // ── SLOPE_PATH ─────────────────────────────────────────────────────────
    case 'SLOPE_PATH': {
      snaps.push({ type: 'SLOPE_ENTRY', x: comp.x1 || 0, y: comp.y1 || 0, z: comp.z1 || 0, tag: 'slope_entry', source: comp.id });
      snaps.push({ type: 'SLOPE_EXIT',  x: comp.x2 || 0, y: comp.y2 || 0, z: comp.z2 || 0, tag: 'slope_exit',  source: comp.id });
      break;
    }
    // ── GABLED_HALL / SQUARE_TOWER / ROUND_TOWER ──────────────────────────
    case 'GABLED_HALL':
    case 'SQUARE_TOWER':
    case 'ROUND_TOWER': {
      snaps.push({ type: 'BUILDING_BASE', x: cx, y, z: cz, tag: 'building_base', source: comp.id });
      break;
    }
    default:
      break;
  }

  return snaps;
}

// ── Floor-level registry ──────────────────────────────────────────────────────

/**
 * Collects all distinct, accessible floor heights from a component array.
 *
 * @param  {Array}  components
 * @param  {number} castleBaseY
 * @returns {number[]} sorted array of y values (rounded to 3 dp)
 */
function collectFloorLevels(components, castleBaseY) {
  const set = new Set();
  const add = y => set.add(parseFloat(y.toFixed(3)));

  add(castleBaseY);

  for (const c of components) {
    const y = c.y ?? 0;
    switch (c.type) {
      case 'PLATEAU':
        add(y + (c.h || 0.5));
        break;
      case 'RING':
        add(y);
        add(y + (c.wall?.h || 3));
        break;
      case 'TERRAIN_STACK': {
        let top = y;
        for (const l of (c.layers || [])) top += l.h || 0;
        add(top);
        break;
      }
      case 'STAIRWAY':
        add(y);
        add(y + (c.h || 2));
        break;
      case 'STAIR_FLIGHT':
        add(y);
        add(y + (c.steps || 8) * (c.stepH || 0.22));
        break;
      case 'SLOPE_PATH':
        add(c.y1 ?? 0);
        add(c.y2 ?? 0);
        break;
      default:
        break;
    }
  }

  return [...set].sort((a, b) => a - b);
}

// ── Reachability BFS ──────────────────────────────────────────────────────────

const EPS = 0.4; // metres height tolerance for snap matching

function levelsMatch(a, b) {
  return Math.abs(a - b) < EPS;
}

/**
 * BFS over the stair/ramp graph.  Returns sets of reachable and unreachable
 * floor levels.
 */
function computeReachability(components, castleBaseY) {
  const allLevels = collectFloorLevels(components, castleBaseY);

  // Build edge list: each stair/ramp is a bidirectional edge {from, to, label}
  const edges = [];
  for (const c of components) {
    const y = c.y ?? 0;
    if (c.type === 'STAIRWAY') {
      edges.push({ from: y, to: y + (c.h || 2), label: c.label || 'STAIRWAY' });
    } else if (c.type === 'STAIR_FLIGHT') {
      edges.push({ from: y, to: y + (c.steps || 8) * (c.stepH || 0.22), label: c.label || 'STAIR_FLIGHT' });
    } else if (c.type === 'SLOPE_PATH') {
      edges.push({ from: c.y1 ?? 0, to: c.y2 ?? 0, label: c.label || 'SLOPE_PATH' });
    }
  }

  // BFS from the level nearest to castleBaseY
  const reachable = new Set();
  const queue = [];
  const seedLevel = allLevels.reduce(
    (prev, l) => Math.abs(l - castleBaseY) < Math.abs(prev - castleBaseY) ? l : prev,
    allLevels[0] ?? castleBaseY,
  );
  reachable.add(seedLevel);
  queue.push(seedLevel);

  while (queue.length > 0) {
    const cur = queue.shift();
    for (const e of edges) {
      for (const [from, to] of [[e.from, e.to], [e.to, e.from]]) {
        if (levelsMatch(from, cur)) {
          // Find the canonical level that matches `to`
          const tgt = allLevels.find(l => levelsMatch(l, to));
          if (tgt !== undefined && !reachable.has(tgt)) {
            reachable.add(tgt);
            queue.push(tgt);
          }
        }
      }
    }
  }

  return {
    all:         allLevels,
    reachable:   [...reachable].sort((a, b) => a - b),
    unreachable: allLevels.filter(l => !reachable.has(l)).sort((a, b) => a - b),
  };
}

// ── Snap-point connectivity check ────────────────────────────────────────────

/**
 * For every stair/ramp, verifies that its BOTTOM and TOP snap points each fall
 * within EPS of a known floor level.  Mismatched snaps are reported as issues.
 */
function checkSnapConnectivity(components, castleBaseY) {
  const floors = collectFloorLevels(components, castleBaseY);
  const issues = [];

  for (const c of components) {
    if (c.type !== 'STAIRWAY' && c.type !== 'STAIR_FLIGHT' && c.type !== 'SLOPE_PATH') continue;
    const snaps = getSnapPoints(c);

    for (const snap of snaps) {
      if (snap.type !== 'STAIR_BOTTOM' && snap.type !== 'STAIR_TOP' &&
          snap.type !== 'SLOPE_ENTRY'  && snap.type !== 'SLOPE_EXIT') continue;

      const matched = floors.some(f => levelsMatch(f, snap.y));
      if (!matched) {
        issues.push({
          componentId:    c.id || '(no id)',
          label:          c.label || c.type,
          snapType:       snap.type,
          snapY:          snap.y,
          nearestFloor:   floors.reduce((p, f) => Math.abs(f - snap.y) < Math.abs(p - snap.y) ? f : p, floors[0] ?? 0),
          suggestion:     `Adjust y to ≈${floors.reduce((p, f) => Math.abs(f - snap.y) < Math.abs(p - snap.y) ? f : p, floors[0] ?? 0).toFixed(2)}m or add a floor level at y=${snap.y.toFixed(2)}m`,
        });
      }
    }
  }

  return issues;
}

// ── Ring integrity ────────────────────────────────────────────────────────────

function checkRings(components) {
  const issues = [];

  for (const c of components) {
    if (c.type !== 'RING') continue;
    const pts = c.points || [];
    const label = `RING(y=${c.y ?? 0})`;

    if (pts.length < 3) {
      issues.push({ severity: 'error', label, message: `Fewer than 3 points (${pts.length}) — cannot form a closed ring` });
    }
    if (!c.gate) {
      issues.push({ severity: 'warning', label, message: 'No gate defined — ring is sealed, player cannot enter' });
    }
    // Duplicate point check
    for (let i = 0; i < pts.length; i++) {
      for (let j = i + 1; j < pts.length; j++) {
        const dx = (pts[i].x || 0) - (pts[j].x || 0);
        const dz = (pts[i].z || 0) - (pts[j].z || 0);
        if (Math.sqrt(dx * dx + dz * dz) < 0.5) {
          issues.push({ severity: 'error', label, message: `Points ${i} and ${j} overlap (distance < 0.5 m) — will produce degenerate wall` });
        }
      }
    }
  }

  return issues;
}

// ── Structural coherence ──────────────────────────────────────────────────────

function checkStructure(components) {
  const issues = [];

  for (let idx = 0; idx < components.length; idx++) {
    const c = components[idx];
    if (!c.type) {
      issues.push({ severity: 'error', idx, message: 'Component is missing required "type" field' });
      continue;
    }
    if (!KNOWN_TYPES.has(c.type)) {
      issues.push({ severity: 'warning', idx, label: c.label, message: `Unknown component type "${c.type}" — will be skipped by builder` });
    }
    if (!c.id) {
      issues.push({ severity: 'info', idx, label: c.label, message: `No "id" field — component cannot be addressed by editor` });
    }
    // Stairs above ground: stair y should be ≥ 0
    if ((c.type === 'STAIRWAY' || c.type === 'STAIR_FLIGHT') && (c.y ?? 0) < -0.5) {
      issues.push({ severity: 'warning', idx, label: c.label, message: `Stair y=${c.y} is below ground — likely mis-placed` });
    }
    // RING wall height
    if (c.type === 'RING' && c.wall && (c.wall.h || 3) < 1.5) {
      issues.push({ severity: 'warning', idx, label: c.label, message: `RING wall height ${c.wall.h}m is unusually low — player may step over it` });
    }
  }

  return issues;
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Run all validation checks and return a structured report.
 *
 * @param  {Array}  components   — flat component array from getDioramaModel
 * @param  {object} [options]
 * @param  {number} [options.castleBaseY=0]  — terrain height at castle centre
 * @returns {ValidationReport}
 */
export function validateDiorama(components, options = {}) {
  const castleBaseY = options.castleBaseY ?? 0;

  const reach       = computeReachability(components, castleBaseY);
  const snapIssues  = checkSnapConnectivity(components, castleBaseY);
  const ringIssues  = checkRings(components);
  const structIssues = checkStructure(components);

  const errors   = [];
  const warnings = [];
  const infos    = [];

  // Unreachable levels are warnings
  for (const y of reach.unreachable) {
    warnings.push(`Level y=${y}m is isolated — no stair or ramp connects to it from spawn`);
  }

  // Snap issues
  for (const s of snapIssues) {
    warnings.push(`${s.label} ${s.snapType} at y=${s.snapY.toFixed(2)}m has no matching floor — nearest is y=${s.nearestFloor.toFixed(2)}m. ${s.suggestion}`);
  }

  // Ring issues
  for (const r of ringIssues) {
    (r.severity === 'error' ? errors : warnings).push(`${r.label}: ${r.message}`);
  }

  // Structural issues
  for (const s of structIssues) {
    if (s.severity === 'error')   errors.push(`[idx ${s.idx}] ${s.label || ''}: ${s.message}`);
    else if (s.severity === 'warning') warnings.push(`[idx ${s.idx}] ${s.label || ''}: ${s.message}`);
    else infos.push(`[idx ${s.idx}] ${s.label || ''}: ${s.message}`);
  }

  return {
    ok:               errors.length === 0,
    errors,
    warnings,
    infos,
    reachableLevels:  reach.reachable,
    unreachableLevels: reach.unreachable,
    allLevels:        reach.all,
    snapIssues,
    ringIssues,
    componentCount:   components.length,
    castleBaseY,
  };
}

/**
 * Log a compact validation report to the browser console.
 *
 * @param  {ValidationReport} report
 * @param  {string}           [castleId]
 */
export function printValidationReport(report, castleId = '?') {
  const prefix = `[DioramaValidator:${castleId}]`;
  const status = report.ok ? '✓ PASS' : '✗ FAIL';

  console.groupCollapsed(`${prefix} ${status} — ${report.componentCount} components`);

  if (report.errors.length)   console.error( `${report.errors.length} error(s):\n`, report.errors.join('\n'));
  if (report.warnings.length) console.warn(  `${report.warnings.length} warning(s):\n`, report.warnings.join('\n'));
  if (report.infos.length)    console.info(  `${report.infos.length} info(s):\n`, report.infos.join('\n'));

  console.log(
    `Reachable levels (${report.reachableLevels.length}): `,
    report.reachableLevels.map(y => `y=${y}m`).join(', '),
  );
  if (report.unreachableLevels.length) {
    console.warn(
      `Unreachable levels (${report.unreachableLevels.length}): `,
      report.unreachableLevels.map(y => `y=${y}m`).join(', '),
    );
  }

  if (report.snapIssues.length) {
    console.table(report.snapIssues.map(s => ({
      Component:   s.label,
      'Snap type': s.snapType,
      'Snap y':    s.snapY.toFixed(2),
      'Nearest':   s.nearestFloor.toFixed(2),
      Fix:         s.suggestion,
    })));
  }

  console.groupEnd();
}
