import * as THREE from 'three';

// ── Strebepfeiler / Buttresses ────────────────────────────────────────────
// Box supports placed at intervals along a wall face.
// Added to a wall Group whose local X axis runs along the wall length.
export function buildButtresses(wallLen, wallH, wallThick, mat, spacing = 4.5) {
  const g = new THREE.Group();
  const count = Math.max(1, Math.floor(wallLen / spacing) - 1);
  if (count < 1) return g;
  const step = wallLen / (count + 1);
  const bH = wallH * 0.72;
  const bD = wallThick * 1.5;

  for (let i = 1; i <= count; i++) {
    const x = -wallLen / 2 + i * step;

    // Front buttress
    const butt = new THREE.Mesh(new THREE.BoxGeometry(0.38, bH, bD), mat);
    butt.position.set(x, bH / 2, wallThick / 2 + bD / 2 - 0.08);
    butt.castShadow = true;
    g.add(butt);

    // Back buttress (mirrored)
    const buttB = butt.clone();
    buttB.position.z = -(wallThick / 2 + bD / 2 - 0.08);
    g.add(buttB);
  }
  return g;
}

// ── Holz-Wehrgang / Hoardings ─────────────────────────────────────────────
// Wooden gallery overhanging the top of a round tower.
// Positioned in the tower's local space (tower center = origin, y=0 at ground).
export function buildHoarding(r, baseY, woodMat) {
  const g = new THREE.Group();
  const segments = Math.max(10, Math.round(r * 5.5));

  for (let i = 0; i < segments; i++) {
    const a    = (i / segments) * Math.PI * 2;
    const aMid = a + Math.PI / segments;
    const cos  = Math.cos(aMid);
    const sin  = Math.sin(aMid);
    const rOut = r + 0.42;

    // Floor plank
    const plank = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.08, r * 0.52), woodMat);
    plank.position.set(sin * rOut, baseY - 0.04, cos * rOut);
    plank.rotation.y = -aMid;
    plank.castShadow = true;
    g.add(plank);

    // Outer parapet plank (vertical)
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.44, 0.06), woodMat);
    rail.position.set(sin * (rOut + r * 0.26), baseY + 0.22, cos * (rOut + r * 0.26));
    rail.rotation.y = -aMid;
    g.add(rail);

    // Support bracket
    const brkt = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.38, 0.08), woodMat);
    brkt.position.set(sin * (r + 0.22), baseY - 0.22, cos * (r + 0.22));
    g.add(brkt);
  }
  return g;
}

// ── Erker / Oriel ─────────────────────────────────────────────────────────
// Small projecting bay window / latrine box on a tower side.
// ry = rotation so it faces outward.
export function buildOriel(x, y, z, ry, mat) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  g.rotation.y = ry;

  // Box body
  const box = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.76, 0.46), mat);
  box.position.set(0, 0.38, 0.23);
  box.castShadow = true;
  g.add(box);

  // Mini pitched roof
  const roof = new THREE.Mesh(new THREE.ConeGeometry(0.42, 0.36, 4), mat);
  roof.position.set(0, 0.82, 0.23);
  roof.rotation.y = Math.PI / 4;
  roof.castShadow = true;
  g.add(roof);

  return g;
}
