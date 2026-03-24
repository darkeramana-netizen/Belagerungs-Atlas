// ── PhysicsWorld ──────────────────────────────────────────────────────────────
// Initialises a Rapier3D physics world from diorama component definitions,
// mirroring the geometry logic of CollisionSystem.js but producing proper
// rigid-body colliders instead of invisible Three.js meshes.
//
// Usage:
//   import { initPhysicsWorld } from './PhysicsWorld.js';
//   const phys = await initPhysicsWorld(components);
//   // phys.world  — RAPIER.World
//   // phys.RAPIER — the RAPIER namespace (for creating shapes later)
//   // phys.step(dt) — advance the simulation
//   // phys.dispose() — free all bodies

import RAPIER from '@dimforge/rapier3d-compat';

// ── geometry helpers ──────────────────────────────────────────────────────────

function addBox(world, cx, cy, cz, hw, hh, hd, ry = 0) {
  const desc = RAPIER.RigidBodyDesc.fixed().setTranslation(cx, cy, cz);
  if (ry !== 0) {
    // Rapier quaternion from axis-angle (Y axis)
    const s = Math.sin(ry / 2), c = Math.cos(ry / 2);
    desc.setRotation({ x: 0, y: s, z: 0, w: c });
  }
  const body = world.createRigidBody(desc);
  const col  = RAPIER.ColliderDesc.cuboid(hw, hh, hd);
  world.createCollider(col, body);
}

function addCylinder(world, cx, cy, cz, r, hh) {
  const desc = RAPIER.RigidBodyDesc.fixed().setTranslation(cx, cy, cz);
  const body = world.createRigidBody(desc);
  // Rapier cylinder: half-height along Y, radius in XZ
  const col  = RAPIER.ColliderDesc.cylinder(hh, r);
  world.createCollider(col, body);
}

// Build a wall box between two 2-D points at given y-base.
function addWallBox(world, x1, z1, x2, z2, h, thick, baseY) {
  const dx = x2 - x1, dz = z2 - z1;
  const len = Math.sqrt(dx * dx + dz * dz);
  if (len < 0.1) return;
  const cx  = (x1 + x2) / 2;
  const cz  = (z1 + z2) / 2;
  const cy  = baseY + (h + 0.5) / 2;
  const ry  = Math.atan2(-dz, dx);
  addBox(world, cx, cy, cz, len / 2, (h + 0.5) / 2, (thick + 0.1) / 2, ry);
}

// ── main export ───────────────────────────────────────────────────────────────

/**
 * Asynchronously initialise Rapier and build a physics world from diorama
 * component definitions.
 *
 * @param {Array}  components  — same array used by buildCollisionWorld()
 * @returns {Promise<{world: RAPIER.World, RAPIER: object, step: Function, dispose: Function}>}
 */
export async function initPhysicsWorld(components) {
  await RAPIER.init();

  const gravity = { x: 0.0, y: -22.0, z: 0.0 };
  const world   = new RAPIER.World(gravity);

  // ── Ground plane ─────────────────────────────────────────────────────────
  addBox(world, 0, -0.2, 0, 150, 0.2, 150);

  // ── Castle components ─────────────────────────────────────────────────────
  components.forEach(comp => {
    const y = comp.y || 0;

    // ── RING ──────────────────────────────────────────────────────────────
    if (comp.type === 'RING') {
      const pts = comp.points || [], n = pts.length;
      const wH  = comp.wall?.h    || 3;
      const wT  = comp.wall?.thick || 0.8;

      pts.forEach((pt, i) => {
        const nx  = pts[(i + 1) % n];
        const tr  = pt.r || 1.2;
        const th  = pt.h || 5;
        const hh  = (th + 0.5) / 2;

        addCylinder(world, pt.x, y + hh, pt.z, tr * 1.08, hh);

        const nxR = nx.r || 1.2;
        const dx  = nx.x - pt.x, dz = nx.z - pt.z;
        const raw = Math.sqrt(dx * dx + dz * dz);
        const ux  = raw > 0 ? dx / raw : 0, uz = raw > 0 ? dz / raw : 0;
        const t1  = tr * 0.88, t2 = nxR * 0.88;

        if (raw > t1 + t2 + 0.4) {
          addWallBox(
            world,
            pt.x + ux * t1, pt.z + uz * t1,
            nx.x - ux * t2, nx.z - uz * t2,
            wH, wT, y,
          );
        }
      });
    }

    // ── WALL ──────────────────────────────────────────────────────────────
    if (comp.type === 'WALL') {
      addWallBox(world, comp.x, comp.z, comp.x2, comp.z2,
        comp.h || 3, comp.thick || 0.75, y);
    }

    // ── ROUND_TOWER ───────────────────────────────────────────────────────
    if (comp.type === 'ROUND_TOWER') {
      const r  = comp.r || 1.2;
      const h  = comp.h || 5;
      const hh = (h + 0.5) / 2;
      addCylinder(world, comp.x || 0, y + hh, comp.z || 0, r + 0.06, hh);
    }

    // ── Box-shaped structures ──────────────────────────────────────────────
    if (['SQUARE_TOWER', 'GATE', 'GABLED_HALL', 'ABBEY_MODULE'].includes(comp.type)) {
      const w  = comp.w || 3, d = comp.d || 3, h = comp.h || 5;
      const ry = comp.rotation || 0;
      const cy = y + (h + 0.4) / 2;
      addBox(world, comp.x || 0, cy, comp.z || 0, (w + 0.1) / 2, (h + 0.4) / 2, (d + 0.1) / 2, ry);
    }

    // ── PLATEAU ───────────────────────────────────────────────────────────
    if (comp.type === 'PLATEAU') {
      const w = comp.w || 20, d = comp.d || 20, h = comp.h || 0.5;
      addBox(world, comp.x || 0, y + h / 2, comp.z || 0, w / 2, h / 2, d / 2);
    }

    // ── TERRAIN_STACK ─────────────────────────────────────────────────────
    if (comp.type === 'TERRAIN_STACK' && Array.isArray(comp.layers)) {
      const totalH = comp.layers.reduce((s, l) => s + (l.h || 1), 0);
      const fp     = comp.footprint || [];
      const maxR   = fp.length
        ? Math.max(...fp.map(p => Math.hypot(p.x || 0, p.z || 0))) * 0.9
        : 22;
      const hh = (totalH + 0.2) / 2;
      addCylinder(world, comp.x || 0, y + hh, comp.z || 0, maxR * 0.75, hh);
    }

    // ── SLOPE_PATH ────────────────────────────────────────────────────────
    if (comp.type === 'SLOPE_PATH') {
      const dx  = (comp.x2 || 0) - (comp.x1 || 0);
      const dz  = (comp.z2 || 0) - (comp.z1 || 0);
      const len = Math.sqrt(dx * dx + dz * dz);
      if (len > 0.1) {
        const avgY  = ((comp.y1 || 0) + (comp.y2 || 0)) / 2;
        const thick = 0.22;
        const rise  = (comp.y2 || 0) - (comp.y1 || 0);
        const pitch = -Math.atan2(rise, len);
        const yaw   = Math.atan2(-dz, dx);

        // Combine pitch + yaw into a quaternion (Y then X rotation)
        const cy2 = Math.cos(yaw / 2),   sy2 = Math.sin(yaw / 2);
        const cx2 = Math.cos(pitch / 2), sx2 = Math.sin(pitch / 2);
        const qw  = cy2 * cx2, qx = cy2 * sx2, qy = sy2 * cx2, qz = -sy2 * sx2;

        const midX = ((comp.x1 || 0) + (comp.x2 || 0)) / 2;
        const midZ = ((comp.z1 || 0) + (comp.z2 || 0)) / 2;

        const desc = RAPIER.RigidBodyDesc.fixed()
          .setTranslation(midX, avgY + thick / 2, midZ)
          .setRotation({ x: qx, y: qy, z: qz, w: qw });
        const body = world.createRigidBody(desc);
        world.createCollider(
          RAPIER.ColliderDesc.cuboid((comp.w || 2.5) / 2, thick / 2, len / 2),
          body,
        );
      }
    }
  });

  return {
    world,
    RAPIER,
    step(dt) { world.timestep = dt; world.step(); },
    dispose() { world.free(); },
  };
}
