import * as THREE from 'three';

// ── European / Crusader: simple cone ─────────────────────────────────────
export function buildConeRoof(r, baseY, mat) {
  const cH = r * 1.55;
  const cone = new THREE.Mesh(new THREE.ConeGeometry(r + 0.14, cH, 18), mat);
  cone.position.y = baseY + cH / 2;
  cone.castShadow = true;
  return cone;
}

// ── Japanese: stacked pagoda tiers ───────────────────────────────────────
// Each tier = wide eave disc + narrow cylindrical story.
// Tiers scale down and upward; a thin spire caps the top.
export function buildPagodaRoof(r, baseY, mat, tiers = 3) {
  const g = new THREE.Group();
  for (let t = 0; t < tiers; t++) {
    const scale  = 1 - t * 0.27;
    const tierR  = (r + 0.18) * scale;
    const bodyH  = r * 0.48 * scale;
    const yOff   = baseY + t * (r * 0.72 * (1 - t * 0.08));

    // Overhanging eave — CylinderGeometry with large top, small bottom = flared look
    const eave = new THREE.Mesh(
      new THREE.CylinderGeometry(tierR * 1.38, tierR * 0.85, 0.14, 16),
      mat,
    );
    eave.position.y = yOff;
    eave.castShadow = true;
    g.add(eave);

    // Story body below next eave
    const body = new THREE.Mesh(
      new THREE.CylinderGeometry(tierR * 0.52, tierR * 0.65, bodyH, 12),
      mat,
    );
    body.position.y = yOff + 0.07 + bodyH / 2;
    body.castShadow = true;
    g.add(body);
  }

  // Final spire
  const spireH = r * 0.5;
  const spire = new THREE.Mesh(new THREE.ConeGeometry(r * 0.18, spireH, 10), mat);
  spire.position.y = baseY + tiers * r * 0.6 + spireH / 2;
  spire.castShadow = true;
  g.add(spire);

  return g;
}

// ── Oriental / Islamic: dome ─────────────────────────────────────────────
// Upper hemisphere + small neck cylinder beneath it.
export function buildDomeRoof(r, baseY, mat) {
  const g = new THREE.Group();
  const dR = r * 0.82;

  // Drum / neck
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(dR * 0.7, dR * 0.8, r * 0.22, 14), mat);
  neck.position.y = baseY + r * 0.11;
  neck.castShadow = true;
  g.add(neck);

  // Dome — upper hemisphere via phiLength < π
  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(dR, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.56),
    mat,
  );
  dome.position.y = baseY + r * 0.22;
  dome.castShadow = true;
  g.add(dome);

  return g;
}

// ── Ottoman / Mughal: flat parapet roof ──────────────────────────────────
export function buildFlatRoof(w, d, baseY, mat) {
  const slab = new THREE.Mesh(new THREE.BoxGeometry(w + 0.28, 0.28, d + 0.28), mat);
  slab.position.y = baseY + 0.14;
  slab.castShadow = true;
  return slab;
}

// ── Dispatcher ───────────────────────────────────────────────────────────
export function buildRoofForStyle(style, r, baseY, mat, extra = {}) {
  switch (style) {
    case 'japanese': return buildPagodaRoof(r, baseY, mat);
    case 'oriental': return buildDomeRoof(r, baseY, mat);
    default:         return buildConeRoof(r, baseY, mat);
  }
}
