import * as THREE from 'three';

// ── European / Crusader: simple cone ─────────────────────────────────────
// Cone base = r * 1.05 (max 1.2× rule satisfied)
export function buildConeRoof(r, baseY, mat) {
  const cR = r * 1.05;
  const cH = r * 1.55;
  const cone = new THREE.Mesh(new THREE.ConeGeometry(cR, cH, 18), mat);
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
// Dome radius capped at r * 0.58 (≤ 1.16× tower radius — within 1.2× rule).
export function buildDomeRoof(r, baseY, mat) {
  const g = new THREE.Group();
  const dR = r * 0.58;   // was 0.82 — smaller, proportionate

  // Drum / neck
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(dR * 0.7, dR * 0.8, r * 0.18, 14), mat);
  neck.position.y = baseY + r * 0.09;
  neck.castShadow = true;
  g.add(neck);

  // Dome — upper hemisphere
  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(dR, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.56),
    mat,
  );
  dome.position.y = baseY + r * 0.18;
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

// ── Japanese: irimoya (入母屋) hip-gable roof for SQUARE towers ───────────
// Two stacked tiers: each tier = eave plate + 4-sided pyramid body.
// Eave overhang capped so total width ≤ 1.18× tower width (within 1.2× rule).
export function buildIrimoyaRoof(w, d, baseY, mat, tiers = 2) {
  const g = new THREE.Group();
  for (let t = 0; t < tiers; t++) {
    const scale = 1 - t * 0.36;
    const tw = w * scale;           // no extra base padding — keep tight
    const td = d * scale;
    const yOff = baseY + t * Math.min(w, d) * 0.46 * (1 - t * 0.08);

    // Eave: only 0.12 overhang per side (≈ 1.12× at tier 0)
    const eave = new THREE.Mesh(new THREE.BoxGeometry(tw + 0.12, 0.10, td + 0.12), mat);
    eave.position.y = yOff + 0.05;
    eave.castShadow = true;
    g.add(eave);

    // 4-sided pyramid (hip roof body)
    const rH = Math.min(tw, td) * 0.58;
    const pyramid = new THREE.Mesh(
      new THREE.CylinderGeometry(0.01, Math.min(tw, td) * 0.52, rH, 4),
      mat,
    );
    pyramid.position.y = yOff + 0.10 + rH / 2;
    pyramid.rotation.y = Math.PI / 4;
    pyramid.castShadow = true;
    g.add(pyramid);
  }
  return g;
}

// ── Dispatcher ───────────────────────────────────────────────────────────
// extra.w / extra.d — dimensions for square-tower-aware roofs
export function buildRoofForStyle(style, r, baseY, mat, extra = {}) {
  switch (style) {
    case 'japanese':
      // Square towers get irimoya; circular fallback uses r * 1.1 (within 1.2× rule)
      return extra.w
        ? buildIrimoyaRoof(extra.w, extra.d || extra.w, baseY, mat)
        : buildIrimoyaRoof(r * 1.1, r * 1.1, baseY, mat);
    case 'oriental': return buildDomeRoof(r, baseY, mat);
    case 'ancient': {
      // Flat mud-brick parapet — very thin CylinderGeometry / box slab
      if (extra.w) return buildFlatRoof(extra.w, extra.d || extra.w, baseY, mat);
      const disc = new THREE.Mesh(
        new THREE.CylinderGeometry(r * 1.02, r * 1.05, 0.22, 16), mat,
      );
      disc.position.y = baseY + 0.11;
      disc.castShadow = true;
      return disc;
    }
    default:         return buildConeRoof(r, baseY, mat);
  }
}
