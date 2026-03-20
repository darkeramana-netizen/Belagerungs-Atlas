import * as THREE from 'three';
import {
  chooseMerlonBuilder,
  wallMerlonPositions,
  roundTowerMerlonPositions,
  squareTowerMerlonPositions,
} from './battlements.js';
import { buildRoofForStyle } from './roofs.js';
import { buildHoarding, buildOriel } from './details.js';

// ── WALL ─────────────────────────────────────────────────────────────────
// Connects (x,z) → (x2,z2) with auto-rotated box + InstancedMesh battlements.
export function buildWall(p, sm, dm, style = 'crusader') {
  const dx = p.x2 - p.x, dz = p.z2 - p.z;
  const len = Math.sqrt(dx * dx + dz * dz);
  const ang = Math.atan2(-dz, dx);
  const h = p.h || 3, thick = p.thick || 0.75, y = Math.max(0, p.y || 0);

  if (len < 0.2) return null; // degenerate segment — skip

  const g = new THREE.Group();
  g.position.set((p.x + p.x2) / 2, y, (p.z + p.z2) / 2);
  g.rotation.y = ang;
  g.userData = { label: p.label || '', info: p.info || '' };

  const wall = new THREE.Mesh(new THREE.BoxGeometry(len, h, thick), sm);
  wall.position.y = h / 2 + 0.002;
  wall.castShadow = true;
  wall.receiveShadow = true;
  g.add(wall);

  // Battlements (InstancedMesh — 1 draw call per wall segment)
  const mkM = chooseMerlonBuilder(style);
  const merlons = mkM(wallMerlonPositions(len, h), sm);
  if (merlons) g.add(merlons);

  return g;
}

// ── ROUND TOWER ──────────────────────────────────────────────────────────
export function buildRoundTower(p, sm, dm, rm, style = 'crusader') {
  const r = p.r || 1.2, h = p.h || 5, y = Math.max(0, p.y || 0);

  const g = new THREE.Group();
  g.position.set(p.x, y, p.z);
  g.userData = { label: p.label || '', info: p.info || '' };

  // Body with slight batter (wider base)
  const body = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 1.12, h, 18), sm);
  body.position.y = h / 2 + 0.002;
  body.castShadow = true;
  body.receiveShadow = true;
  g.add(body);

  // Battlements — only for 'ancient' style (open flat parapet).
  // Roofed styles (cone, dome, pagoda) conflict visually with crenels.
  if (style === 'ancient') {
    const mkM = chooseMerlonBuilder(style);
    const merlons = mkM(roundTowerMerlonPositions(r, h), sm);
    if (merlons) g.add(merlons);
  }

  // Oriel — projecting bay on tall towers (optional)
  if (p.oriel && h > 6) {
    g.add(buildOriel(r * 0.95, h * 0.55, 0, 0, dm));
  }

  // Style-aware roof
  const roof = buildRoofForStyle(style, r, h, rm);
  if (roof) g.add(roof);

  return g;
}

// ── SQUARE TOWER ─────────────────────────────────────────────────────────
export function buildSquareTower(p, sm, dm, rm, style = 'crusader') {
  const w = p.w || 2.5, d = p.d || 2.5, h = p.h || 5.5, y = Math.max(0, p.y || 0);

  const g = new THREE.Group();
  g.position.set(p.x, y, p.z);
  if (p.rotation) g.rotation.y = p.rotation;
  g.userData = { label: p.label || '', info: p.info || '' };

  const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), sm);
  body.position.y = h / 2 + 0.002;
  body.castShadow = true;
  body.receiveShadow = true;
  g.add(body);

  // Battlements — raise y-offset by flat-roof slab thickness (0.22) for styles
  // that add a flat parapet roof, so merlons sit on top rather than clipping through it.
  const hasFlatRoof = style === 'ancient' || style === 'oriental';
  const merYOff = hasFlatRoof ? 0.53 : 0.30;
  const mkM = chooseMerlonBuilder(style);
  const merlons = mkM(squareTowerMerlonPositions(w, d, h, merYOff), sm);
  if (merlons) g.add(merlons);

  // Style-aware roof — skipped if p.noRoof is set (e.g. halls, palas buildings)
  if (!p.noRoof) {
    const roof = buildRoofForStyle(style, Math.max(w, d) / 2, h, rm, { w, d });
    if (roof) g.add(roof);
  }

  return g;
}

// ── GATE ─────────────────────────────────────────────────────────────────
// Gatehouse with two round flanking towers, visible passage opening, portcullis bars.
export function buildGate(p, sm, dm, rm, style = 'crusader') {
  const w = p.w || 4.5, d = p.d || 3.5, h = p.h || 6.0, y = Math.max(0, p.y || 0);
  const tR = d * 0.52;   // flanking tower radius
  const tH = h * 1.22;  // flanking towers taller than gatehouse

  const g = new THREE.Group();
  g.position.set(p.x, y, p.z);
  if (p.rotation !== undefined) g.rotation.y = p.rotation;
  g.userData = { label: p.label || '', info: p.info || '' };

  // Flanking towers
  [-1, 1].forEach(s => {
    const cx = s * (w / 2 + tR * 0.45);

    const tw = new THREE.Mesh(new THREE.CylinderGeometry(tR, tR * 1.06, tH, 14), sm);
    tw.position.set(cx, tH / 2 + 0.002, 0);
    tw.castShadow = true;
    tw.receiveShadow = true;
    g.add(tw);

    // Roof — same style as regular round towers (cone, dome, pagoda, etc.)
    const roof = buildRoofForStyle(style, tR, tH, rm);
    if (roof) { roof.position.x = cx; g.add(roof); }

    // Merlons — only for 'ancient' (open flat parapet), same as buildRoundTower
    if (style === 'ancient') {
      const mkM = chooseMerlonBuilder(style);
      const merPos = roundTowerMerlonPositions(tR, tH).map(m => ({
        ...m, x: m.x + cx,
      }));
      const merlons = mkM(merPos, sm);
      if (merlons) g.add(merlons);
    }
  });

  // Gatehouse body
  const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), sm);
  body.position.y = h / 2 + 0.002;
  body.castShadow = true;
  body.receiveShadow = true;
  g.add(body);

  // Passage opening — dark material creates visual depth
  const pW = w * 0.38, pH = h * 0.62;
  const pass = new THREE.Mesh(new THREE.BoxGeometry(pW, pH, d * 1.1), dm || sm);
  pass.position.y = pH / 2;
  g.add(pass);

  // Portcullis bar hints (not for ancient style)
  if (style !== 'ancient') {
    for (let bi = -1; bi <= 1; bi++) {
      const bar = new THREE.Mesh(new THREE.BoxGeometry(0.055, pH * 0.82, 0.055), dm || sm);
      bar.position.set(bi * (pW / 3), pH * 0.41, -d * 0.52);
      g.add(bar);
    }
  }

  // Merlons on gatehouse roof
  const mkM = chooseMerlonBuilder(style);
  const merlons = mkM(squareTowerMerlonPositions(w, d, h), sm);
  if (merlons) g.add(merlons);

  return g;
}

// ── ABBEY MODULE ─────────────────────────────────────────────────────────
// Complete Gothic abbey building: long nave body + gabled saddle roof +
// integrated flying buttresses + optional spire at the crossing.
//
// Parameters:
//   p.w        — nave length E-W (default 14)
//   p.d        — nave depth N-S (default 5)
//   p.h        — wall height (default 8)
//   p.spireH   — spire needle height, 0 = no spire (default 14)
//   p.spireX/Z — spire offset from nave center (default 0)
//   p.buttresses — number of flying buttress pairs; -1 = auto (default -1)
//
// Roof geometry: two slope panels meeting at a ridge, computed exactly so
//   bottom edge of each panel sits at (z=±d/2, y=h) and top edge at (z=0, y=h+roofH).
//   Verified: local +z panel-end maps to world z=d/2, y=h ✓ (see math in comments).
export function buildAbbeyModule(p, sm, rm) {
  const w  = p.w  || 14;
  const d  = p.d  || 5;
  const h  = p.h  || 8;
  const spireH   = p.spireH !== undefined ? p.spireH : 14;
  const spireX   = p.spireX || 0;
  const spireZ   = p.spireZ || 0;
  const nButt    = p.buttresses !== undefined ? p.buttresses : Math.max(2, Math.floor(w / 3.5));
  const y        = Math.max(0, p.y || 0);

  const g = new THREE.Group();
  g.position.set(p.x || 0, y, p.z || 0);
  if (p.rotation) g.rotation.y = p.rotation;
  g.userData = { label: p.label || '', info: p.info || '' };

  // ── 1. Nave body ─────────────────────────────────────────────────────────
  const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), sm);
  body.position.y = h / 2 + 0.002;
  body.castShadow = true;
  body.receiveShadow = true;
  g.add(body);

  // ── 2. Gabled saddle roof ─────────────────────────────────────────────────
  // roofH = height of ridge above wall top. Gothic pitch ≈ 0.90 × half-span.
  // slopeLen = true hypotenuse of the slope triangle (d/2 base, roofH height).
  // Rotation math: for panel center at (0, h+roofH/2, side*d/4),
  //   rotation.x = side*pitchAng places bottom edge at z=side*d/2, y=h ✓
  const roofH    = d * 0.90;
  const slopeLen = Math.sqrt((d / 2) ** 2 + roofH ** 2);
  const pitchAng = Math.atan2(roofH, d / 2);
  const roofMat  = rm || sm;

  [-1, 1].forEach(side => {
    const slope = new THREE.Mesh(new THREE.BoxGeometry(w + 0.22, 0.22, slopeLen), roofMat);
    slope.position.set(0, h + roofH / 2, side * d / 4);
    slope.rotation.x = side * pitchAng;
    slope.castShadow = true;
    g.add(slope);
  });

  // Ridge beam
  const ridge = new THREE.Mesh(new THREE.BoxGeometry(w + 0.35, 0.30, 0.30), roofMat);
  ridge.position.y = h + roofH + 0.15;
  ridge.castShadow = true;
  g.add(ridge);

  // Gable-end triangular infills — close the open triangles at each end of the roof
  [-1, 1].forEach(endSide => {
    // Approximate the gable triangle with a narrow vertical box at each end
    const gable = new THREE.Mesh(new THREE.BoxGeometry(0.22, roofH, d), sm);
    gable.position.set(endSide * (w / 2 + 0.09), h + roofH / 2, 0);
    gable.castShadow = true;
    g.add(gable);
  });

  // ── 3. Flying buttresses ──────────────────────────────────────────────────
  // Each pair: outer pier + pier pinnacle + diagonal flying arm.
  // Arm connects wall face (z=±d/2, y=h*0.88) to pier top (z=±pZ, y=pierH).
  // rotation.x = side*armAng ensures +z arm-end goes DOWN for +z side ✓
  if (nButt > 0) {
    const reach  = d * 0.68;
    const pierH  = h * 0.72;
    const pZ     = d / 2 + reach;
    const armDy  = h * 0.88 - pierH;
    const armLen = Math.sqrt(armDy ** 2 + reach ** 2);
    const armAng = Math.atan2(armDy, reach);
    const step   = w / (nButt + 1);

    for (let bi = 0; bi < nButt; bi++) {
      const bx = -w / 2 + (bi + 1) * step;

      [-1, 1].forEach(side => {
        const sz = side * pZ;

        // Outer pier (vertical stone pillar)
        const pier = new THREE.Mesh(new THREE.BoxGeometry(0.32, pierH, 0.32), sm);
        pier.position.set(bx, pierH / 2, sz);
        pier.castShadow = true;
        g.add(pier);

        // Pier pinnacle (small pyramid on top — Gothic decorative finish)
        const pinnacle = new THREE.Mesh(
          new THREE.CylinderGeometry(0.001, 0.24, 0.62, 4), roofMat,
        );
        pinnacle.rotation.y = Math.PI / 4;
        pinnacle.position.set(bx, pierH + 0.31, sz);
        pinnacle.castShadow = true;
        g.add(pinnacle);

        // Flying arm (diagonal box from wall face to pier top)
        const arm = new THREE.Mesh(new THREE.BoxGeometry(0.20, 0.20, armLen), sm);
        arm.position.set(bx, (h * 0.88 + pierH) / 2, (side * d / 2 + sz) / 2);
        arm.rotation.x = side * armAng;
        arm.castShadow = true;
        g.add(arm);
      });
    }
  }

  // ── 4. Spire at crossing ──────────────────────────────────────────────────
  // Octagonal crossing tower base + thin needle. y-base = ridge top + slight offset.
  if (spireH > 0) {
    const spireBase = h + roofH + 0.15;

    // Octagonal crossing tower drum
    const drum = new THREE.Mesh(
      new THREE.CylinderGeometry(0.64, 0.72, 1.1, 8), sm,
    );
    drum.position.set(spireX, spireBase + 0.55, spireZ);
    drum.castShadow = true;
    g.add(drum);

    // Needle
    const needle = new THREE.Mesh(
      new THREE.CylinderGeometry(0.001, 0.46, spireH, 8), roofMat,
    );
    needle.position.set(spireX, spireBase + 1.10 + spireH / 2, spireZ);
    needle.castShadow = true;
    g.add(needle);
  }

  return g;
}

// ── CIVILIAN HOUSING ──────────────────────────────────────────────────────
// A strip of small medieval houses with steep gabled roofs arranged in a row.
// Designed for stacking in tiers up a hillside (e.g. Mont Saint-Michel's town).
//
// Parameters:
//   p.count   — number of houses in the strip (default 5)
//   p.w       — width of each house (default 1.8)
//   p.d       — depth of each house (default 2.8)
//   p.h       — wall height (default 2.4)
//   p.seed    — deterministic height variation seed (default 17)
//   p.rotation — rotation of the whole strip (so you can orient it around a hill)
//
// The row runs along the local X axis. Use p.rotation to orient the strip
// around the mountain (e.g. rotation: Math.PI*0.25 for a 45° arc segment).
export function buildCivilianHousing(p, sm, rm) {
  const count  = p.count || 5;
  const hw     = p.w    || 1.8;   // house width (along row)
  const hd     = p.d    || 2.8;   // house depth (perpendicular)
  const hh     = p.h    || 2.4;   // wall height
  const seed   = p.seed || 17;
  const y      = Math.max(0, p.y || 0);
  const roofMat = rm || sm;

  const g = new THREE.Group();
  g.position.set(p.x || 0, y, p.z || 0);
  if (p.rotation) g.rotation.y = p.rotation;
  g.userData = { label: p.label || '', info: p.info || '' };

  // Roof geometry constants (same for all houses in strip)
  const roofH    = hd * 0.88;                             // steep Norman pitch
  const slopeLen = Math.sqrt((hd / 2) ** 2 + roofH ** 2);
  const pitchAng = Math.atan2(roofH, hd / 2);

  const gap      = 0.16;
  const totalW   = count * hw + (count - 1) * gap;
  const startX   = -totalW / 2 + hw / 2;

  for (let i = 0; i < count; i++) {
    const xPos  = startX + i * (hw + gap);
    // Deterministic height variation per house — makes the row feel organic
    const hVar  = 1 + Math.sin(i * 4.7 + seed) * 0.11;
    const wallH = hh * hVar;

    // House body
    const body = new THREE.Mesh(new THREE.BoxGeometry(hw * 0.90, wallH, hd), sm);
    body.position.set(xPos, wallH / 2 + 0.002, 0);
    body.castShadow = true;
    body.receiveShadow = true;
    g.add(body);

    // Gabled roof: two slope panels (same math as AbbeyModule)
    [-1, 1].forEach(side => {
      const slope = new THREE.Mesh(
        new THREE.BoxGeometry(hw * 0.92, 0.17, slopeLen), roofMat,
      );
      slope.position.set(xPos, wallH + roofH / 2, side * hd / 4);
      slope.rotation.x = side * pitchAng;
      slope.castShadow = true;
      g.add(slope);
    });

    // Ridge cap
    const ridgeCap = new THREE.Mesh(
      new THREE.BoxGeometry(hw * 0.90, 0.18, 0.20), roofMat,
    );
    ridgeCap.position.set(xPos, wallH + roofH + 0.09, 0);
    g.add(ridgeCap);

    // Chimney (every other house — alternating for visual variety)
    if (i % 2 === 0) {
      const chimney = new THREE.Mesh(
        new THREE.CylinderGeometry(0.09, 0.11, wallH * 0.40, 5), sm,
      );
      chimney.position.set(xPos + hw * 0.18, wallH + roofH * 0.52, -hd * 0.20);
      chimney.castShadow = true;
      g.add(chimney);
    }
  }

  return g;
}

// ── BUTTRESS SYSTEM ───────────────────────────────────────────────────────
// Standalone flying buttress array along BOTH long sides (+z and -z) of a building.
// Used to add Gothic structural detail to a separate SQUARE_TOWER or PLATEAU.
// (AbbeyModule includes its own integrated buttresses — this type is for walls
//  and large rectangular blocks like La Merveille.)
//
// Parameters:
//   p.w      — length of the building (buttresses spread along x, default 12)
//   p.d      — depth of the building (buttresses reach beyond z=±d/2, default 4)
//   p.h      — wall height to support (default 6)
//   p.count  — buttress pairs along the length (default 4)
//   p.reach  — how far the pier stands beyond the wall face (default d*0.65)
export function buildButtressSystem(p, sm, rm) {
  const w      = p.w     || 12;
  const d      = p.d     || 4;
  const h      = p.h     || 6;
  const count  = p.count || 4;
  const reach  = p.reach !== undefined ? p.reach : d * 0.65;
  const y      = Math.max(0, p.y || 0);
  const roofMat = rm || sm;

  const g = new THREE.Group();
  g.position.set(p.x || 0, y, p.z || 0);
  if (p.rotation) g.rotation.y = p.rotation;
  g.userData = { label: p.label || '', info: p.info || '' };

  const pierH  = h * 0.72;
  const pZ     = d / 2 + reach;
  const armDy  = h * 0.88 - pierH;
  const armLen = Math.sqrt(armDy ** 2 + reach ** 2);
  const armAng = Math.atan2(armDy, reach);
  const step   = w / (count + 1);

  for (let i = 0; i < count; i++) {
    const xPos = -w / 2 + (i + 1) * step;

    [-1, 1].forEach(side => {
      const sz = side * pZ;

      // Outer pier
      const pier = new THREE.Mesh(new THREE.BoxGeometry(0.34, pierH, 0.34), sm);
      pier.position.set(xPos, pierH / 2, sz);
      pier.castShadow = true;
      g.add(pier);

      // Pier pinnacle
      const pinnacle = new THREE.Mesh(
        new THREE.CylinderGeometry(0.001, 0.26, 0.68, 4), roofMat,
      );
      pinnacle.rotation.y = Math.PI / 4;
      pinnacle.position.set(xPos, pierH + 0.34, sz);
      pinnacle.castShadow = true;
      g.add(pinnacle);

      // Flying arm
      const arm = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.22, armLen), sm);
      arm.position.set(xPos, (h * 0.88 + pierH) / 2, (side * d / 2 + sz) / 2);
      arm.rotation.x = side * armAng;
      arm.castShadow = true;
      g.add(arm);
    });
  }

  return g;
}

// ── ROCK FOUNDATION ───────────────────────────────────────────────────────
// Irregular rocky hill base with naturalistic granite-rock silhouette.
//
// Parameters:
//   p.r    — footprint radius at base (default 10)
//   p.h    — total height of the rock mass (default 4)
//   p.seed — deterministic random seed for vertex noise (default 42)
//
// Geometry: CylinderGeometry(rTop=r*0.72, r, h, 20, 4) with RADIAL-ONLY
// vertex perturbation — scaling each vertex's (x,z) while leaving y unchanged.
// Radial-only perturbation CANNOT flip face normals → zero holes guaranteed.
// The base ring has near-zero noise (yNorm≈0); the top crown has full noise.
export function buildRockFoundation(p, gm) {
  const r    = p.r    || 10;
  const h    = p.h    || 4;
  const seed = p.seed || 42;
  const y    = Math.max(0, p.y || 0);

  const g = new THREE.Group();
  g.position.set(p.x || 0, y, p.z || 0);
  g.userData = { label: p.label || '', info: p.info || '' };

  // Conical hill: wider base, narrower top (natural rock taper).
  // 20 radial × 4 height segments provides enough detail for visible faceting.
  const rTop = r * 0.72;
  const geo  = new THREE.CylinderGeometry(rTop, r, h, 20, 4);

  const pos  = geo.attributes.position;
  // Cap center vertices sit exactly at the cylinder axis (dist ≈ 0).
  // Perturbing them would break the flat cap — skip them.
  const skipDist = rTop * 0.35;

  for (let i = 0; i < pos.count; i++) {
    const vx   = pos.getX(i);
    const vy   = pos.getY(i);
    const vz   = pos.getZ(i);
    const dist = Math.sqrt(vx * vx + vz * vz);

    if (dist < skipDist) continue; // skip cap-center vertices

    // yNorm: 0 at base (minimal noise → stable seam), 1 at top (maximum rocky texture)
    const yNorm = (vy + h / 2) / h;
    const noise  = Math.sin(i * 7.31 + seed) * Math.cos(i * 3.73 + seed * 0.47);
    // Amplitude capped at 0.09 — prevents over-extrusion while keeping visible facets
    const scale  = 1 + noise * 0.09 * (0.20 + yNorm * 0.80);

    // Radial scale: x and z scale by the same factor → direction preserved, y fixed
    pos.setXYZ(i, vx * scale, vy, vz * scale);
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();

  const mesh = new THREE.Mesh(geo, gm);
  mesh.position.y = h / 2;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  g.add(mesh);

  return g;
}

// ── PLATEAU ──────────────────────────────────────────────────────────────
// Flat stone terrace / abbey platform — solid rectangular block, no battlements,
// no roof. Used as the foundation platform that buildings sit on top of.
// Designed for tiered structures like Mont Saint-Michel where the abbey complex
// rests on a man-made terrace (supported by crypts) rather than the bare rock tip.
//   p.w, p.d  — footprint dimensions (default 10×10)
//   p.h       — platform height (default 2)
//   p.y       — base elevation (same convention as SQUARE_TOWER)
//   p.x, p.z  — center position (can be offset to shift platform north/south)
export function buildPlateau(p, sm) {
  const w = p.w || 10, d = p.d || 10, h = p.h || 2, y = Math.max(0, p.y || 0);

  const g = new THREE.Group();
  g.position.set(p.x || 0, y, p.z || 0);
  if (p.rotation) g.rotation.y = p.rotation;
  g.userData = { label: p.label || '', info: p.info || '' };

  const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), sm);
  body.position.y = h / 2 + 0.002;
  body.castShadow = true;
  body.receiveShadow = true;
  g.add(body);

  return g;
}

// ── GLACIS ───────────────────────────────────────────────────────────────
// Sloped stone plinth — CylinderGeometry with different top/bottom radii.
export function buildGlacis(p, sm) {
  const rTop = p.rTop || 6, rBot = p.rBot || 9, h = p.h || 3, y = Math.max(0, p.y || 0);

  const g = new THREE.Group();
  g.position.set(p.x || 0, y, p.z || 0);
  g.userData = { label: p.label || '', info: p.info || '' };

  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBot, h, 32), sm);
  mesh.position.y = h / 2;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  g.add(mesh);

  return g;
}

// ── RING ─────────────────────────────────────────────────────────────────
// Connects tower points in a closed ring via walls.
// gate:{atIndex,…} replaces one wall segment with a gatehouse.
// squareTowers / style='japanese' forces square towers throughout.
export function buildRing(p, sm, dm, rm, style = 'crusader') {
  const pts = p.points || [], n = pts.length, y = Math.max(0, p.y || 0);
  if (n < 2) return null;

  const wH = p.wall?.h || 3;
  const wT = p.wall?.thick || 0.8;
  const gt = p.gate;
  // Japanese castles always use square towers (Yagura are rectangular)
  const useSquare = p.squareTowers || style === 'japanese';

  const g = new THREE.Group();
  g.userData = { label: p.label || '', info: p.info || '' };

  pts.forEach((pt, i) => {
    const ptY = Math.max(0, y + (pt.y || 0));
    const tR  = pt.r || 1.2; // tower radius / half-width

    // ── Tower at this vertex ─────────────────────────────────────────────
    if (useSquare) {
      const side = tR * 2;
      g.add(buildSquareTower(
        { ...pt, w: side, d: side, y: ptY },
        sm, dm, rm, style,
      ));
    } else {
      g.add(buildRoundTower({ ...pt, y: ptY }, sm, dm, rm, style));
    }

    // ── Wall or gate to next tower ───────────────────────────────────────
    const nx  = pts[(i + 1) % n];
    const nxR = nx.r || 1.2;
    const mx  = (pt.x + nx.x) / 2;
    const mz  = (pt.z + nx.z) / 2;
    const dx  = nx.x - pt.x, dz = nx.z - pt.z;
    const rawLen = Math.sqrt(dx * dx + dz * dz);
    const ux  = rawLen > 0 ? dx / rawLen : 0;
    const uz  = rawLen > 0 ? dz / rawLen : 0;
    const trim1 = tR  * (useSquare ? 0.82 : 0.88);
    const trim2 = nxR * (useSquare ? 0.82 : 0.88);

    if (gt && gt.atIndex === i) {
      g.add(buildGate(
        { ...gt, x: mx, z: mz, y, rotation: Math.atan2(mx, mz) },
        sm, dm, rm, style,
      ));

      // ── Connecting walls from each adjacent tower to the gatehouse ───────
      // Connect point = just inside the gatehouse flanking tower (0.62 × gate half-width)
      const gHW = (gt.w || 4.5) * 0.62;
      const lx = mx - ux * gHW, lz = mz - uz * gHW; // left flank connection
      const rx = mx + ux * gHW, rz = mz + uz * gHW; // right flank connection

      const leftLen  = Math.sqrt((lx - pt.x) ** 2 + (lz - pt.z) ** 2);
      const rightLen = Math.sqrt((nx.x - rx)  ** 2 + (nx.z - rz)  ** 2);

      if (leftLen > trim1 + 0.3) {
        g.add(buildWall({
          x: pt.x + ux * trim1, z: pt.z + uz * trim1,
          x2: lx, z2: lz,
          h: pt.wallH || wH, y, thick: wT, label: '', info: '',
        }, sm, dm, style));
      }
      if (rightLen > trim2 + 0.3) {
        g.add(buildWall({
          x: rx, z: rz,
          x2: nx.x - ux * trim2, z2: nx.z - uz * trim2,
          h: pt.wallH || wH, y, thick: wT, label: '', info: '',
        }, sm, dm, style));
      }
    } else {
      // Trim wall endpoints to tower surfaces to eliminate Z-fighting overlap
      if (rawLen > trim1 + trim2 + 0.4) {
        g.add(buildWall({
          x:  pt.x + ux * trim1,
          z:  pt.z + uz * trim1,
          x2: nx.x  - ux * trim2,
          z2: nx.z  - uz * trim2,
          h: pt.wallH || wH,
          y,
          thick: wT,
          label: '', info: '',
        }, sm, dm, style));
      }
    }
  });

  return g;
}

// ── Component dispatcher ──────────────────────────────────────────────────
// gm (rock/ground material) is used for GLACIS; falls back to sm if not provided.
export function buildComponent(comp, sm, dm, rm, style = 'crusader', gm = null) {
  switch (comp.type) {
    case 'WALL':             return buildWall(comp, sm, dm, style);
    case 'ROUND_TOWER':      return buildRoundTower(comp, sm, dm, rm, style);
    case 'SQUARE_TOWER':     return buildSquareTower(comp, sm, dm, rm, style);
    case 'GATE':             return buildGate(comp, sm, dm, rm, style);
    case 'ABBEY_MODULE':     return buildAbbeyModule(comp, sm, rm);
    case 'CIVILIAN_HOUSING': return buildCivilianHousing(comp, sm, rm);
    case 'BUTTRESS_SYSTEM':  return buildButtressSystem(comp, sm, rm);
    case 'ROCK_FOUNDATION':  return buildRockFoundation(comp, gm || sm);
    case 'PLATEAU':          return buildPlateau(comp, gm || sm);
    case 'GLACIS':           return buildGlacis(comp, gm || sm);
    case 'RING':             return buildRing(comp, sm, dm, rm, style);
    default: return null;
  }
}
