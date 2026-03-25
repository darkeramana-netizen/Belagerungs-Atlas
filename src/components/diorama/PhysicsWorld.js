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
 * @param {Array}   components  — same array used by buildCollisionWorld()
 * @param {object|null} terrainData — optional { heights, segs, size } from TerrainSystem
 * @returns {Promise<{world: RAPIER.World, RAPIER: object, step: Function, dispose: Function}>}
 */
export async function initPhysicsWorld(components, terrainData = null) {
  await RAPIER.init();

  const gravity = { x: 0.0, y: -22.0, z: 0.0 };
  const world   = new RAPIER.World(gravity);

  // ── Ground (heightfield terrain or flat fallback) ─────────────────────────
  if (terrainData) {
    const { heights, segs, size } = terrainData;
    // Rapier heightfield: heights are in row-major order (rows = Z, cols = X)
    // scale.x / scale.z = total terrain width/depth; scale.y = height multiplier
    const body = world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(0, 0, 0));
    world.createCollider(
      RAPIER.ColliderDesc.heightfield(segs, segs, heights, { x: size, y: 1.0, z: size }),
      body,
    );
  } else {
    addBox(world, 0, -0.2, 0, 150, 0.2, 150);
  }

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
        if (raw < 0.1) return;
        const ux  = dx / raw, uz = dz / raw;
        const t1  = tr * 0.88, t2 = nxR * 0.88;

        const gt = comp.gate;
        if (gt && gt.atIndex === i) {
          // ── Gate segment — open passage, add gatehouse colliders ─────────
          const gW = gt.w || 4.5, gD = gt.d || 3.5, gH = gt.h || 6.0;
          const pW     = gW * 0.40;
          const pH     = gH * 0.64;
          const archR  = pW / 2;
          const pierW  = (gW - pW) / 2;
          const lintelH = gH - pH - archR;
          const tR     = gD * 0.52;        // flanking tower radius (matches buildGate)
          const tH     = gH * 1.22;        // flanking tower height
          const gHW    = gW * 0.62;        // half-width to flanking connection point
          const mx = (pt.x + nx.x) / 2, mz = (pt.z + nx.z) / 2;
          const gRot   = Math.atan2(mx, mz);
          const cg = Math.cos(gRot), sg = Math.sin(gRot);
          const offDist   = pW / 2 + pierW / 2;
          const towerOff  = gW / 2 + tR * 0.45;

          // Flanking towers of the gatehouse
          addCylinder(world, mx + towerOff * cg, y + tH / 2, mz - towerOff * sg, tR, tH / 2);
          addCylinder(world, mx - towerOff * cg, y + tH / 2, mz + towerOff * sg, tR, tH / 2);

          // Passage: left pier (local -X) and right pier (local +X)
          addBox(world, mx - offDist * cg, y + gH / 2, mz + offDist * sg, pierW / 2, gH / 2, gD / 2, gRot);
          addBox(world, mx + offDist * cg, y + gH / 2, mz - offDist * sg, pierW / 2, gH / 2, gD / 2, gRot);

          // Lintel above arch crown
          if (lintelH > 0.1) {
            addBox(world, mx, y + pH + archR + lintelH / 2, mz, gW / 2, lintelH / 2, gD / 2, gRot);
          }

          // Connecting walls from ring towers to gate flanking-tower attachment points
          const lx = mx - ux * gHW, lz = mz - uz * gHW;
          const rx = mx + ux * gHW, rz = mz + uz * gHW;
          const leftLen  = Math.sqrt((lx - pt.x) ** 2 + (lz - pt.z) ** 2);
          const rightLen = Math.sqrt((nx.x - rx)  ** 2 + (nx.z - rz)  ** 2);
          if (leftLen  > t1 + 0.3) addWallBox(world, pt.x + ux * t1, pt.z + uz * t1, lx, lz, wH, wT, y);
          if (rightLen > t2 + 0.3) addWallBox(world, rx, rz, nx.x - ux * t2, nx.z - uz * t2, wH, wT, y);

        } else if (raw > t1 + t2 + 0.4) {
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

    // ── Box-shaped structures (non-gate) ──────────────────────────────────
    if (['SQUARE_TOWER', 'GABLED_HALL', 'ABBEY_MODULE'].includes(comp.type)) {
      const w  = comp.w || 3, d = comp.d || 3, h = comp.h || 5;
      const ry = comp.rotation || 0;
      const cy = y + (h + 0.4) / 2;
      addBox(world, comp.x || 0, cy, comp.z || 0, (w + 0.1) / 2, (h + 0.4) / 2, (d + 0.1) / 2, ry);
    }

    // ── GATE — split into piers + lintel so passage is passable ───────────
    if (comp.type === 'GATE') {
      const w   = comp.w || 4.5, d = comp.d || 3.5, h = comp.h || 6.0;
      const ry  = comp.rotation || 0;
      const pW  = w * 0.40;           // passage clear width (matches buildGate)
      const pH  = h * 0.64;           // passage clear height
      const archR  = pW / 2;
      const pierW  = (w - pW) / 2;
      const lintelH = h - pH - archR;
      const cx = comp.x || 0, cz = comp.z || 0;

      // Left pier (local –X) and right pier (local +X) — passage centre is clear
      const offX = (pW / 2 + pierW / 2) * Math.cos(ry);
      const offZ = (pW / 2 + pierW / 2) * Math.sin(ry);
      addBox(world, cx - offX, y + h / 2, cz + offZ, pierW / 2, h / 2, d / 2, ry);
      addBox(world, cx + offX, y + h / 2, cz - offZ, pierW / 2, h / 2, d / 2, ry);

      // Lintel above arch crown
      if (lintelH > 0.1) {
        addBox(world, cx, y + pH + archR + lintelH / 2, cz, w / 2, lintelH / 2, d / 2, ry);
      }
    }

    // ── STAIR_FLIGHT — one slope ramp collider per flight (smooth for capsule) ──
    if (comp.type === 'STAIR_FLIGHT') {
      const steps  = comp.steps  || 8;
      const stepH  = comp.stepH  || 0.22;
      const stepD  = comp.stepD  || 0.35;
      const w      = comp.w      || 2.4;
      const totalH = steps * stepH;
      const totalD = steps * stepD;
      const slopeLen = Math.sqrt(totalH * totalH + totalD * totalD);
      const pitch    = Math.atan2(totalH, totalD);  // positive = tilts up
      const yaw      = comp.rotation || 0;

      // Center of the slope in world space
      const lx   = (comp.x || 0), lz = (comp.z || 0);
      const midDx = Math.cos(-yaw) * totalD / 2;
      const midDz = Math.sin(-yaw) * totalD / 2;

      // Quaternion: yaw around Y then pitch around X (in that order)
      const cy2 = Math.cos(yaw   / 2), sy2 = Math.sin(yaw   / 2);
      const cp2 = Math.cos(-pitch / 2), sp2 = Math.sin(-pitch / 2);
      const qw  = cy2 * cp2,  qx = cy2 * sp2;
      const qy  = sy2 * cp2,  qz = -sy2 * sp2;

      const desc = RAPIER.RigidBodyDesc.fixed()
        .setTranslation(lx + midDx, y + totalH / 2, lz + midDz)
        .setRotation({ x: qx, y: qy, z: qz, w: qw });
      const body = world.createRigidBody(desc);
      world.createCollider(RAPIER.ColliderDesc.cuboid(w / 2, 0.12, slopeLen / 2), body);
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
