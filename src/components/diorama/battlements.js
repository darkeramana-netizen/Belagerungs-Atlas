import * as THREE from 'three';

// ── InstancedMesh battlement builders ────────────────────────────────────
// Each function takes an array of {x,y,z,ry} positions and returns a single
// InstancedMesh — 1 draw call for all merlons of a given type/style.

function _instanced(geom, mat, positions) {
  if (!positions.length) return null;
  const mesh = new THREE.InstancedMesh(geom, mat, positions.length);
  mesh.castShadow = true;
  const dummy = new THREE.Object3D();
  positions.forEach(({ x, y, z, ry = 0 }, i) => {
    dummy.position.set(x, y, z);
    dummy.rotation.set(0, ry, 0);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
  });
  mesh.instanceMatrix.needsUpdate = true;
  return mesh;
}

// Square merlons — standard European
export function buildSquareMerlons(positions, mat) {
  return _instanced(new THREE.BoxGeometry(0.44, 0.62, 0.34), mat, positions);
}

// Dovetail (Ghibelline / Italian) — narrower top simulates the V-notch
export function buildDovetailMerlons(positions, mat) {
  return _instanced(new THREE.BoxGeometry(0.30, 0.62, 0.30), mat, positions);
}

// Rounded (Romanesque / Ottoman) — cylinder merlon
export function buildRoundMerlons(positions, mat) {
  return _instanced(new THREE.CylinderGeometry(0.17, 0.17, 0.62, 8), mat, positions);
}

// ── Position generators ───────────────────────────────────────────────────
// All positions are in LOCAL space of the parent Group.

export function wallMerlonPositions(len, h) {
  const spacing = 1.1;
  const positions = [];
  for (let t = -(len / 2) + spacing / 2; t < len / 2 - 0.1; t += spacing) {
    positions.push({ x: t, y: h + 0.31, z: 0, ry: 0 });
  }
  return positions;
}

export function roundTowerMerlonPositions(r, h) {
  // Always use an even count so i+=2 produces perfectly uniform angular spacing.
  const raw = Math.max(8, Math.round(r * 6.2));
  const count = raw % 2 === 0 ? raw : raw + 1;
  const positions = [];
  for (let i = 0; i < count; i += 2) {
    const a = (i / count) * Math.PI * 2;
    positions.push({
      x: Math.sin(a) * (r + 0.14),
      y: h + 0.30,
      z: Math.cos(a) * (r + 0.14),
      ry: a,
    });
  }
  return positions;
}

// yOffset: height above tower-top where merlon centres are placed.
// Use 0.30 (default) when there is no roof slab, 0.53 when a flat-roof slab
// (thickness 0.22) has been added — keeps merlons clear of the slab geometry.
export function squareTowerMerlonPositions(w, d, h, yOffset = 0.30) {
  const positions = [];
  [[0, d / 2, false], [0, -d / 2, false], [w / 2, 0, true], [-w / 2, 0, true]]
    .forEach(([ox, oz, isZ]) => {
      const len = isZ ? d : w;
      for (let t = -(len / 2) + 0.5; t < len / 2 - 0.1; t += 1.1) {
        positions.push({
          x: isZ ? ox : ox + t,
          y: h + yOffset,
          z: isZ ? oz + t : oz,
          ry: isZ ? Math.PI / 2 : 0,
        });
      }
    });
  return positions;
}

// Pick merlon builder based on cultural style
export function chooseMerlonBuilder(style) {
  if (style === 'oriental') return buildRoundMerlons;
  if (style === 'japanese') return buildDovetailMerlons;
  return buildSquareMerlons;
}
