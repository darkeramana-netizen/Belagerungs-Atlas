import * as THREE from 'three';

// ── CollisionSystem ───────────────────────────────────────────────────────
// Builds an invisible collision world from diorama component definitions.
// The resulting THREE.Group is added to the scene (not rendered) and its
// children are used exclusively for Raycaster queries in the FPS controller.
//
// Keeps geometry simple (boxes + cylinders) so raycasts stay fast:
// no battlement detail, no machicoulis corbels — just structural solids.

const _invMat = new THREE.MeshBasicMaterial({ visible: false, side: THREE.DoubleSide });

function wallBox(x1, z1, x2, z2, h, thick, baseY) {
  const dx = x2 - x1, dz = z2 - z1;
  const len = Math.sqrt(dx * dx + dz * dz);
  if (len < 0.1) return null;
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(len, h + 0.5, thick + 0.1),
    _invMat,
  );
  mesh.position.set((x1 + x2) / 2, baseY + (h + 0.5) / 2, (z1 + z2) / 2);
  mesh.rotation.y = Math.atan2(-dz, dx);
  return mesh;
}

function cylinder(cx, cz, r, h, baseY) {
  const mesh = new THREE.Mesh(
    new THREE.CylinderGeometry(r + 0.06, r + 0.06, h + 0.5, 10),
    _invMat,
  );
  mesh.position.set(cx, baseY + (h + 0.5) / 2, cz);
  return mesh;
}

function box(cx, cy, cz, w, h, d, ry = 0) {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(w + 0.1, h + 0.4, d + 0.1),
    _invMat,
  );
  mesh.position.set(cx, cy + (h + 0.4) / 2, cz);
  if (ry) mesh.rotation.y = ry;
  return mesh;
}

export function buildCollisionWorld(components) {
  const g = new THREE.Group();
  g.name = 'collisionWorld';

  components.forEach(comp => {
    const y = comp.y || 0;

    // ── RING ───────────────────────────────────────────────────────────────
    if (comp.type === 'RING') {
      const pts = comp.points || [], n = pts.length;
      const wH = comp.wall?.h    || 3;
      const wT = comp.wall?.thick || 0.8;

      pts.forEach((pt, i) => {
        const nx = pts[(i + 1) % n];
        const tr = pt.r || 1.2, th = pt.h || 5;

        g.add(cylinder(pt.x, pt.z, tr * 1.08, th, y));

        const nxR = nx.r || 1.2;
        const dx = nx.x - pt.x, dz = nx.z - pt.z;
        const raw = Math.sqrt(dx * dx + dz * dz);
        const ux = raw > 0 ? dx / raw : 0, uz = raw > 0 ? dz / raw : 0;
        const t1 = tr * 0.88, t2 = nxR * 0.88;

        if (raw > t1 + t2 + 0.4) {
          const w = wallBox(
            pt.x + ux * t1, pt.z + uz * t1,
            nx.x - ux * t2, nx.z - uz * t2,
            wH, wT, y,
          );
          if (w) g.add(w);
        }
      });
    }

    // ── Standalone structural types ────────────────────────────────────────
    if (comp.type === 'WALL') {
      const w = wallBox(comp.x, comp.z, comp.x2, comp.z2,
        comp.h || 3, comp.thick || 0.75, y);
      if (w) g.add(w);
    }

    if (comp.type === 'ROUND_TOWER') {
      g.add(cylinder(comp.x || 0, comp.z || 0, comp.r || 1.2, comp.h || 5, y));
    }

    if (['SQUARE_TOWER', 'GATE', 'GABLED_HALL', 'ABBEY_MODULE'].includes(comp.type)) {
      const w = comp.w || 3, d = comp.d || 3, h = comp.h || 5;
      g.add(box(comp.x || 0, y, comp.z || 0, w, h, d, comp.rotation || 0));
    }

    // ── Terrain / ground surfaces ──────────────────────────────────────────
    if (comp.type === 'PLATEAU') {
      const w = comp.w || 20, d = comp.d || 20, h = comp.h || 0.5;
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), _invMat);
      m.position.set(comp.x || 0, y + h / 2, comp.z || 0);
      g.add(m);
    }

    if (comp.type === 'TERRAIN_STACK' && Array.isArray(comp.layers)) {
      const totalH = comp.layers.reduce((s, l) => s + (l.h || 1), 0);
      const fp     = comp.footprint || [];
      const maxR   = fp.length
        ? Math.max(...fp.map(p => Math.hypot(p.x || 0, p.z || 0))) * 0.9
        : 22;
      const m = new THREE.Mesh(
        new THREE.CylinderGeometry(maxR * 0.75, maxR, totalH + 0.2, 14),
        _invMat,
      );
      m.position.set(comp.x || 0, y + totalH / 2, comp.z || 0);
      g.add(m);
    }

    if (comp.type === 'SLOPE_PATH') {
      // Approximate sloped path as a thin box at average height
      const dx = (comp.x2 || 0) - (comp.x1 || 0);
      const dz = (comp.z2 || 0) - (comp.z1 || 0);
      const len = Math.sqrt(dx * dx + dz * dz);
      if (len > 0.1) {
        const avgY = ((comp.y1 || 0) + (comp.y2 || 0)) / 2;
        const thick = 0.22;
        const m = new THREE.Mesh(new THREE.BoxGeometry(comp.w || 2.5, thick, len), _invMat);
        m.position.set(
          ((comp.x1 || 0) + (comp.x2 || 0)) / 2,
          avgY + thick / 2,
          ((comp.z1 || 0) + (comp.z2 || 0)) / 2,
        );
        m.rotation.y = Math.atan2(-dz, dx);
        // Slight pitch for the slope
        const rise = (comp.y2 || 0) - (comp.y1 || 0);
        m.rotation.x = -Math.atan2(rise, len);
        g.add(m);
      }
    }
  });

  // Base ground plane — fallback so the player never falls through y=0
  const gnd = new THREE.Mesh(new THREE.BoxGeometry(300, 0.4, 300), _invMat);
  gnd.position.set(0, -0.2, 0);
  g.add(gnd);

  return g;
}
