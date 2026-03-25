import * as THREE from 'three';
import {
  chooseMerlonBuilder,
  wallMerlonPositions,
  roundTowerMerlonPositions,
  squareTowerMerlonPositions,
} from './battlements.js';
import { buildRoofForStyle } from './roofs.js';
import { buildHoarding as buildTowerHoarding, buildOriel } from './details.js';

// ── Physics-ramp geometry helper ───────────────────────────────────────────────
// Produces a helical strip BufferGeometry that Rapier can use as a trimesh collider
// for the spiral staircase inside a round tower.
// The resulting mesh is invisible in the scene but has userData.isPhysicsRamp = true.
function makeHelixRampGeometry(rInner, h, stepsN, turns, entAngle) {
  const rI = Math.max(0.1, rInner * 0.12); // inner edge (near centre column)
  const rO = rInner * 0.94;                // outer edge (near shell wall)
  const verts = [];
  const idx   = [];

  for (let i = 0; i <= stepsN; i++) {
    const t   = i / stepsN;
    const ang = entAngle + Math.PI + t * turns * Math.PI * 2;
    const y   = t * (h - 1.0) + 0.14;
    verts.push(
      Math.sin(ang) * rI, y, Math.cos(ang) * rI,
      Math.sin(ang) * rO, y, Math.cos(ang) * rO,
    );
    if (i > 0) {
      const b = (i - 1) * 2;
      idx.push(b, b + 2, b + 1);
      idx.push(b + 1, b + 2, b + 3);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
  geo.setIndex(idx);
  return geo;
}

// ── scaleComp ─────────────────────────────────────────────────────────────
// Returns a shallow-copied component definition with every spatial value
// multiplied by `s`. Used by the dispatcher's `scale` parameter so a single
// castle can be rendered at a different metric scale without touching heroData.
// Convention: 1 unit = 1 metre going forward.
export function scaleComp(comp, s) {
  if (!s || s === 1) return comp;
  const c = { ...comp };

  // Position / simple scalars
  const scalarKeys = ['x','y','z','w','d','h','r','rTop','rBot',
                       'x1','z1','y1','x2','z2','y2',
                       'pitD','pitH','overhang','gallH','corbH'];
  scalarKeys.forEach(k => { if (c[k] !== undefined) c[k] *= s; });

  // Tower points (RING)
  if (Array.isArray(c.points)) {
    c.points = c.points.map(pt => {
      const np = { ...pt };
      ['x','y','z','r','h'].forEach(k => { if (np[k] !== undefined) np[k] *= s; });
      return np;
    });
  }
  // Polygon footprint (TERRAIN_STACK)
  if (Array.isArray(c.footprint)) {
    c.footprint = c.footprint.map(pt => ({
      ...pt,
      x: (pt.x || 0) * s,
      z: (pt.z || 0) * s,
    }));
  }
  // Layer heights (TERRAIN_STACK)
  if (Array.isArray(c.layers)) {
    c.layers = c.layers.map(l => ({ ...l, h: (l.h || l.height || 0.5) * s }));
  }
  // Gate sub-object
  if (c.gate) {
    c.gate = { ...c.gate };
    ['w','d','h'].forEach(k => { if (c.gate[k] !== undefined) c.gate[k] *= s; });
  }
  // Wall config inside RING
  if (c.wall) {
    c.wall = { ...c.wall };
    ['h','thick'].forEach(k => { if (c.wall[k] !== undefined) c.wall[k] *= s; });
  }
  return c;
}

function createFootprintShape(points, scale = 1) {
  const shape = new THREE.Shape();
  points.forEach((pt, idx) => {
    const x = (pt.x || 0) * scale;
    const z = -(pt.z || 0) * scale;
    if (idx === 0) shape.moveTo(x, z);
    else shape.lineTo(x, z);
  });
  shape.closePath();
  return shape;
}

function makePolygonExtrude(points, height, scale = 1) {
  const geo = new THREE.ExtrudeGeometry(createFootprintShape(points, scale), {
    depth: height,
    bevelEnabled: false,
  });
  geo.rotateX(-Math.PI / 2);
  geo.computeVertexNormals();
  return geo;
}

function addGabledRoof(g, w, d, h, sm, rm, opts = {}) {
  const roofH = opts.roofH || d * 0.82;
  const roofT = opts.roofT || 0.18;
  const overhangW = opts.overhangW || 0.16;
  const overhangD = opts.overhangD || 0.06;
  const gableStyle = opts.gableStyle || 'block';
  const slopeLen = Math.sqrt((d / 2) ** 2 + roofH ** 2);
  const pitchAng = Math.atan2(roofH, d / 2);
  const roofMat = rm || sm;

  [-1, 1].forEach(side => {
    const slope = new THREE.Mesh(new THREE.BoxGeometry(w + overhangW, roofT, slopeLen + overhangD), roofMat);
    slope.position.set(0, h + roofH / 2, side * d / 4);
    slope.rotation.x = side * pitchAng;
    slope.castShadow = true;
    slope.receiveShadow = true;
    g.add(slope);
  });

  const ridge = new THREE.Mesh(new THREE.BoxGeometry(w + overhangW + 0.04, roofT * 1.15, 0.18), roofMat);
  ridge.position.y = h + roofH + roofT * 0.62;
  ridge.castShadow = true;
  ridge.receiveShadow = true;
  g.add(ridge);

  if (gableStyle === 'triangular') {
    const gableSpan = d + overhangD;
    const gableT = Math.max(0.16, roofT * 1.2);
    const triShape = new THREE.Shape();
    triShape.moveTo(-gableSpan / 2, 0);
    triShape.lineTo(0, roofH);
    triShape.lineTo(gableSpan / 2, 0);
    triShape.closePath();

    [-1, 1].forEach(endSide => {
      const triGeo = new THREE.ExtrudeGeometry(triShape, { depth: gableT, bevelEnabled: false });
      triGeo.rotateY(Math.PI / 2);
      const gable = new THREE.Mesh(triGeo, sm);
      gable.position.set(
        endSide * (w / 2 + overhangW * 0.40 - gableT * 0.5 * endSide),
        h,
        0,
      );
      gable.castShadow = true;
      gable.receiveShadow = true;
      g.add(gable);
    });
  } else {
    [-1, 1].forEach(endSide => {
      const gable = new THREE.Mesh(new THREE.BoxGeometry(Math.max(0.18, roofT * 1.2), roofH, d + overhangD), sm);
      gable.position.set(endSide * (w / 2 + overhangW * 0.4), h + roofH / 2, 0);
      gable.castShadow = true;
      gable.receiveShadow = true;
      g.add(gable);
    });
  }

  return roofH;
}

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

  // Hollow wall shell (Principle 2 – Interior Logic):
  // thick walls (≥ 0.5 m) get outer face + inner face + top cap instead of solid box.
  if (thick >= 0.5) {
    const faceT = Math.max(0.15, thick * 0.22); // each face panel thickness
    const capT  = Math.max(0.20, thick * 0.26); // top-cap thickness (closes the hollow)

    const outerFace = new THREE.Mesh(new THREE.BoxGeometry(len, h, faceT), sm);
    outerFace.position.set(0, h / 2 + 0.002,  (thick - faceT) / 2);
    outerFace.castShadow    = true;
    outerFace.receiveShadow = true;
    g.add(outerFace);

    const innerFace = new THREE.Mesh(new THREE.BoxGeometry(len, h, faceT), sm);
    innerFace.position.set(0, h / 2 + 0.002, -(thick - faceT) / 2);
    innerFace.castShadow    = true;
    innerFace.receiveShadow = true;
    g.add(innerFace);

    // Close the top so coping sits on solid stone
    const topCap = new THREE.Mesh(new THREE.BoxGeometry(len, capT, thick), sm);
    topCap.position.set(0, h - capT / 2 + 0.001, 0);
    topCap.castShadow    = true;
    topCap.receiveShadow = true;
    g.add(topCap);
  } else {
    // Thin decorative walls stay solid
    const wall = new THREE.Mesh(new THREE.BoxGeometry(len, h, thick), sm);
    wall.position.y = h / 2 + 0.002;
    wall.castShadow    = true;
    wall.receiveShadow = true;
    g.add(wall);
  }

  const footing = new THREE.Mesh(new THREE.BoxGeometry(len, Math.max(0.18, h * 0.08), thick * 1.18), sm);
  footing.position.y = Math.max(0.08, h * 0.04);
  footing.castShadow = true;
  footing.receiveShadow = true;
  g.add(footing);

  const coping = new THREE.Mesh(new THREE.BoxGeometry(len, 0.18, thick * 1.08), sm);
  coping.position.y = h + 0.09;
  coping.castShadow = true;
  coping.receiveShadow = true;
  g.add(coping);

  // Battlements (InstancedMesh — 1 draw call per wall segment)
  const mkM = chooseMerlonBuilder(style);
  const merlons = mkM(wallMerlonPositions(len, h), sm);
  if (merlons) g.add(merlons);

  // ── Pilaster buttresses (optional) ────────────────────────────────────
  // Triggered by p.buttresses = true.  Adds rectangular masonry pilasters
  // projecting from both wall faces at even intervals to reinforce long runs.
  if (p.buttresses) {
    const bCount = Math.max(1, Math.round(len / 3.5)) - 1; // interior spacing only
    if (bCount > 0) {
      const bStep = len / (bCount + 1);
      const bW    = thick * 0.54;    // pilaster width along wall
      const bD    = thick * 0.42;    // projection depth beyond wall face
      const bH    = h * 0.78;       // pilaster height (sits below coping)

      for (let i = 0; i < bCount; i++) {
        const bx = -len / 2 + (i + 1) * bStep;

        [-1, 1].forEach(side => {
          const bz = side * (thick / 2 + bD / 2);

          // Pilaster body
          const pilaster = new THREE.Mesh(new THREE.BoxGeometry(bW, bH, bD), sm);
          pilaster.position.set(bx, bH / 2 + 0.02, bz);
          pilaster.castShadow = true;
          pilaster.receiveShadow = true;
          g.add(pilaster);

          // Pilaster cap / impost
          const cap = new THREE.Mesh(new THREE.BoxGeometry(bW + 0.06, 0.14, bD + 0.06), sm);
          cap.position.set(bx, bH + 0.07, bz);
          cap.castShadow = true;
          g.add(cap);
        });
      }
    }
  }

  return g;
}

// ── ROUND TOWER ──────────────────────────────────────────────────────────
export function buildRoundTower(p, sm, dm, rm, style = 'crusader') {
  const r = p.r || 1.2, h = p.h || 5, y = Math.max(0, p.y || 0);
  const plinthH = p.plinthH || Math.max(0.22, h * 0.09);
  const plinthTop = p.plinthTopScale || 1.18;
  const plinthBot = p.plinthBottomScale || 1.22;
  const plinthDrop = p.plinthDrop || 0;
  const skirtH = p.skirtH || 0;
  const skirtTop = p.skirtTopScale || plinthBot;
  const skirtBot = p.skirtBottomScale || (skirtTop * 1.08);

  const g = new THREE.Group();
  g.position.set(p.x, y, p.z);
  g.userData = { label: p.label || '', info: p.info || '' };

  // ── Hollow cylinder shell (Principle 2 — Interior Logic) ────────────────
  const shellT     = Math.max(0.18, r * 0.22);     // wall thickness
  const rInner     = r - shellT;
  const entW       = Math.max(0.8, r * 0.70);      // entrance opening width
  const entH       = Math.max(1.5, Math.min(h - 0.6, r * 1.2)); // entrance height
  const entArcW    = Math.asin(Math.min(0.98, entW / (2 * r))) * 2; // gap in radians
  const entAngle   = p.entranceAngle ?? 0;          // 0 = south (+z face)

  // DoubleSide so interior face is visible from inside the tower
  const smDS = (sm && typeof sm.clone === 'function') ? sm.clone() : sm;
  if (smDS !== sm) smDS.side = THREE.DoubleSide;

  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(r, r * 1.12, h, 18, 1, true,
      entAngle + entArcW / 2, Math.PI * 2 - entArcW),
    smDS,
  );
  body.position.y = h / 2 + 0.002;
  body.castShadow    = true;
  body.receiveShadow = true;
  g.add(body);

  // Floor slab
  const floor = new THREE.Mesh(
    new THREE.CylinderGeometry(rInner, rInner * 1.06, 0.14, 18), sm,
  );
  floor.position.y = 0.07;
  floor.receiveShadow = true;
  g.add(floor);

  // Entrance arch — two jambs + lintel frame the opening
  {
    const jambW = shellT * 1.1;
    const jambH = entH + shellT * 0.4;
    [-1, 1].forEach(side => {
      const jAng = entAngle + side * (entArcW / 2 + Math.asin(Math.min(0.99, jambW / (2 * r))));
      const jamb = new THREE.Mesh(new THREE.BoxGeometry(jambW, jambH, shellT * 1.4), sm);
      jamb.position.set(Math.sin(jAng) * (r - shellT * 0.5), jambH / 2 + 0.002,
                        Math.cos(jAng) * (r - shellT * 0.5));
      jamb.rotation.y = -jAng;
      jamb.castShadow = true;
      g.add(jamb);
    });
    const lintel = new THREE.Mesh(
      new THREE.BoxGeometry(entW + shellT * 1.8, shellT * 0.65, shellT * 1.4), sm,
    );
    lintel.position.set(Math.sin(entAngle) * (r - shellT * 0.5),
                        entH + shellT * 0.35 + 0.002,
                        Math.cos(entAngle) * (r - shellT * 0.5));
    lintel.rotation.y = -entAngle;
    lintel.castShadow = true;
    g.add(lintel);
  }

  // Spiral staircase (InstancedMesh — 1 draw call for all treads)
  if (h >= 4.0) {
    const stepsN   = Math.ceil(h / 0.26);
    const treadGeo = new THREE.BoxGeometry(rInner * 0.88, 0.09, rInner * 0.52);
    const stairIM  = new THREE.InstancedMesh(treadGeo, sm, stepsN);
    stairIM.castShadow    = true;
    stairIM.receiveShadow = true;
    const dummy  = new THREE.Object3D();
    const turns  = h / 3.2; // full rotations over height
    for (let i = 0; i < stepsN; i++) {
      const t   = i / stepsN;
      const ang = entAngle + Math.PI + t * turns * Math.PI * 2; // start at rear
      dummy.position.set(
        Math.sin(ang) * (rInner * 0.46),
        t * (h - 1.0) + 0.23,
        Math.cos(ang) * (rInner * 0.46),
      );
      dummy.rotation.set(0, -ang, 0);
      dummy.updateMatrix();
      stairIM.setMatrixAt(i, dummy.matrix);
    }
    stairIM.instanceMatrix.needsUpdate = true;
    g.add(stairIM);
  }

  // ── Physics helix ramp (invisible — used by Rapier trimesh collider) ──────
  // Mirrors the spiral staircase so the physics capsule can walk up/down
  // smoothly without bouncing on individual step edges.
  const ramps = [];
  if (h >= 4.0) {
    const stepsN = Math.ceil(h / 0.26);
    const turns  = h / 3.2;
    const rampGeo = makeHelixRampGeometry(rInner, h, stepsN, turns, entAngle);
    const rampMesh = new THREE.Mesh(rampGeo); // no material — physics-only
    rampMesh.position.set(p.x, Math.max(0, p.y || 0), p.z);
    ramps.push(rampMesh);
  }

  const plinth = new THREE.Mesh(new THREE.CylinderGeometry(r * plinthTop, r * plinthBot, plinthH, 18), sm);
  plinth.position.y = Math.max(plinthH / 2 - plinthDrop, h * 0.045 - plinthDrop);
  plinth.castShadow = true;
  plinth.receiveShadow = true;
  g.add(plinth);

  if (skirtH > 0) {
    const skirt = new THREE.Mesh(new THREE.CylinderGeometry(r * skirtTop, r * skirtBot, skirtH, 18), sm);
    skirt.position.y = -(skirtH / 2) + 0.02;
    skirt.castShadow = true;
    skirt.receiveShadow = true;
    g.add(skirt);
  }

  const parapetBand = new THREE.Mesh(new THREE.CylinderGeometry(r * 1.04, r * 1.08, 0.28, 18), sm);
  parapetBand.position.y = h + 0.14;
  parapetBand.castShadow = true;
  parapetBand.receiveShadow = true;
  g.add(parapetBand);

  if (style !== 'japanese' && h >= 6) {
    for (let i = 0; i < 3; i++) {
      const slit = new THREE.Mesh(new THREE.BoxGeometry(r * 0.16, h * 0.14, 0.06), dm || sm);
      const a = (i / 3) * Math.PI * 2 + 0.25;
      slit.position.set(Math.sin(a) * (r * 0.98), h * (0.48 + i * 0.07), Math.cos(a) * (r * 0.98));
      slit.rotation.y = a;
      g.add(slit);
    }
  }

  if (p.hoarding && style !== 'japanese') {
    g.add(buildTowerHoarding(r * 1.02, h - 0.28, dm || sm));
  }

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

  // Style-aware roof — skipped when p.noRoof is set (e.g. towers with
  // MACHICOLATION galleries, where the machicoulis replaces the conical cap).
  if (!p.noRoof) {
    const roof = buildRoofForStyle(style, r, h, rm);
    if (roof) g.add(roof);
  } else {
    // Fighting platform: flat stone disc seals the open tower top.
    // Sits just inside the parapetBand collar (r * 1.04) so it reads as a
    // solid Kampfboden visible from above without clashing with the band.
    const disc = new THREE.Mesh(
      new THREE.CylinderGeometry(r * 0.97, r * 0.99, 0.16, 18), sm,
    );
    disc.position.y = h + 0.08;
    disc.castShadow = true;
    disc.receiveShadow = true;
    g.add(disc);
  }

  return { group: g, ramps };
}

// ── SQUARE TOWER ─────────────────────────────────────────────────────────
export function buildSquareTower(p, sm, dm, rm, style = 'crusader') {
  const w = p.w || 2.5, d = p.d || 2.5, h = p.h || 5.5, y = Math.max(0, p.y || 0);

  const g = new THREE.Group();
  g.position.set(p.x, y, p.z);
  if (p.rotation) g.rotation.y = p.rotation;
  g.userData = { label: p.label || '', info: p.info || '' };

  // ── Hollow box shell (Principle 2 — Interior Logic) ──────────────────────
  const shellT   = Math.max(0.15, Math.min(w, d) * 0.18);
  const entW     = Math.max(0.9, Math.min(w, d) * 0.44);
  const entH     = Math.max(1.5, h * 0.38);

  // DoubleSide so interior panels are visible from inside the tower.
  const smDS = (sm && typeof sm.clone === 'function') ? sm.clone() : sm;
  if (smDS !== sm) smDS.side = THREE.DoubleSide;

  // South face (+z) — split into left panel | door gap | right panel | above-door
  const sideSpan = (w - entW) / 2;
  [-(entW / 2 + sideSpan / 2), (entW / 2 + sideSpan / 2)].forEach(bx => {
    const panel = new THREE.Mesh(new THREE.BoxGeometry(sideSpan, h, shellT), smDS);
    panel.position.set(bx, h / 2 + 0.002, d / 2 - shellT / 2);
    panel.castShadow = true; panel.receiveShadow = true;
    g.add(panel);
  });
  const topSpan = h - entH;
  if (topSpan > 0.1) {
    const topP = new THREE.Mesh(new THREE.BoxGeometry(w, topSpan, shellT), smDS);
    topP.position.set(0, entH + topSpan / 2 + 0.002, d / 2 - shellT / 2);
    topP.castShadow = true;
    g.add(topP);
  }
  // North face (-z, solid)
  const nWall = new THREE.Mesh(new THREE.BoxGeometry(w, h, shellT), smDS);
  nWall.position.set(0, h / 2 + 0.002, -(d / 2 - shellT / 2));
  nWall.castShadow = true; nWall.receiveShadow = true;
  g.add(nWall);
  // East + West faces
  [-1, 1].forEach(side => {
    const sw = new THREE.Mesh(new THREE.BoxGeometry(shellT, h, d - shellT * 2), smDS);
    sw.position.set(side * (w / 2 - shellT / 2), h / 2 + 0.002, 0);
    sw.castShadow = true; sw.receiveShadow = true;
    g.add(sw);
  });
  // Floor slab
  const sqFloor = new THREE.Mesh(new THREE.BoxGeometry(w - shellT * 2, 0.14, d - shellT * 2), sm);
  sqFloor.position.y = 0.07;
  sqFloor.receiveShadow = true;
  g.add(sqFloor);

  const plinth = new THREE.Mesh(new THREE.BoxGeometry(w * 1.08, Math.max(0.2, h * 0.08), d * 1.08), sm);
  plinth.position.y = Math.max(0.1, h * 0.04);
  plinth.castShadow = true;
  plinth.receiveShadow = true;
  g.add(plinth);

  const parapetBand = new THREE.Mesh(new THREE.BoxGeometry(w * 1.03, 0.2, d * 1.03), sm);
  parapetBand.position.y = h + 0.1;
  parapetBand.castShadow = true;
  parapetBand.receiveShadow = true;
  g.add(parapetBand);

  if (style !== 'japanese' && h >= 5.5) {
    [
      { x: 0, z: d * 0.51, ry: 0 },
      { x: 0, z: -d * 0.51, ry: Math.PI },
    ].forEach(pos => {
      const slit = new THREE.Mesh(new THREE.BoxGeometry(Math.max(0.12, w * 0.08), h * 0.16, 0.06), dm || sm);
      slit.position.set(pos.x, h * 0.5, pos.z);
      slit.rotation.y = pos.ry;
      g.add(slit);
    });
  }

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
export function buildGabledHall(p, sm, dm, rm) {
  const w = p.w || 6.2;
  const d = p.d || 3.2;
  const h = p.h || 3.0;
  const y = Math.max(0, p.y || 0);
  const buttressPairs = p.buttressPairs || 0;
  const slitCount = p.slitCount || 0;
  const doorSide = p.doorSide || 'front';
  const doorW = p.doorW || Math.max(0.5, w * 0.1);
  const doorH = p.doorH || Math.max(1.0, h * 0.52);
  const chimneyCount = p.chimneyCount || 0;

  const g = new THREE.Group();
  g.position.set(p.x || 0, y, p.z || 0);
  if (p.rotation) g.rotation.y = p.rotation;
  g.userData = { label: p.label || '', info: p.info || '' };

  const plinth = new THREE.Mesh(new THREE.BoxGeometry(w * 1.04, Math.max(0.18, h * 0.08), d * 1.04), sm);
  plinth.position.y = Math.max(0.09, h * 0.04);
  plinth.castShadow = true;
  plinth.receiveShadow = true;
  g.add(plinth);

  // ── Hollow box shell (Principle 2 — Interior Logic) ──────────────────────
  {
    const shellT = Math.max(0.14, Math.min(w, d) * 0.16);
    const doorOffset = p.doorOffset || 0;

    // DoubleSide so panels are visible regardless of normal orientation.
    // A single clone per builder call keeps draw-call count low.
    const smDS = (sm && typeof sm.clone === 'function') ? sm.clone() : sm;
    if (smDS !== sm) smDS.side = THREE.DoubleSide;

    const addPanel = (pw, ph, cx, cz, rotY = 0) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(pw, ph, shellT), smDS);
      m.position.set(cx, ph / 2 + 0.002, cz);
      if (rotY) m.rotation.y = rotY;
      m.castShadow = true; m.receiveShadow = true;
      g.add(m);
    };
    const splitFace = (fz, fw, fh, eW, eH, eOff, rotY = 0) => {
      const half = (fw - eW) / 2;
      [-(eW / 2 + half / 2 + eOff), (eW / 2 + half / 2 + eOff)].forEach(cx => {
        addPanel(half, fh, cx, fz, rotY);
      });
      const above = fh - eH;
      if (above > 0.08) {
        const m = new THREE.Mesh(new THREE.BoxGeometry(fw, above, shellT), smDS);
        m.position.set(0, eH + above / 2 + 0.002, fz);
        if (rotY) m.rotation.y = rotY;
        m.castShadow = true;
        g.add(m);
      }
    };

    if (doorSide === 'front') {
      splitFace( d / 2 - shellT / 2, w, h, doorW, doorH, doorOffset);
      addPanel(w, h, 0, -(d / 2 - shellT / 2));
      [-1, 1].forEach(s => addPanel(d - shellT * 2, h, s * (w / 2 - shellT / 2), 0, Math.PI / 2));
    } else if (doorSide === 'back') {
      addPanel(w, h, 0,  d / 2 - shellT / 2);
      splitFace(-(d / 2 - shellT / 2), w, h, doorW, doorH, doorOffset);
      [-1, 1].forEach(s => addPanel(d - shellT * 2, h, s * (w / 2 - shellT / 2), 0, Math.PI / 2));
    } else if (doorSide === 'left') {
      addPanel(w, h, 0,  d / 2 - shellT / 2);
      addPanel(w, h, 0, -(d / 2 - shellT / 2));
      addPanel(d - shellT * 2, h,  w / 2 - shellT / 2, 0, Math.PI / 2);
      splitFace(0, d - shellT * 2, h, doorW, doorH, doorOffset, Math.PI / 2);
    } else {
      addPanel(w, h, 0,  d / 2 - shellT / 2);
      addPanel(w, h, 0, -(d / 2 - shellT / 2));
      splitFace(0, d - shellT * 2, h, doorW, doorH, doorOffset, Math.PI / 2);
      addPanel(d - shellT * 2, h, -(w / 2 - shellT / 2), 0, Math.PI / 2);
    }

    const hallFloor = new THREE.Mesh(
      new THREE.BoxGeometry(w - shellT * 2, 0.12, d - shellT * 2), sm,
    );
    hallFloor.position.y = 0.06;
    hallFloor.receiveShadow = true;
    g.add(hallFloor);
  }

  if (buttressPairs > 0) {
    const step = w / (buttressPairs + 1);
    const buttH = h * 0.7;
    const buttW = Math.max(0.22, w * 0.04);
    const buttD = Math.max(0.24, d * 0.12);
    for (let bi = 0; bi < buttressPairs; bi++) {
      const bx = -w / 2 + (bi + 1) * step;
      [-1, 1].forEach(side => {
        const butt = new THREE.Mesh(new THREE.BoxGeometry(buttW, buttH, buttD), sm);
        butt.position.set(bx, buttH / 2, side * (d / 2 + buttD / 2 - 0.02));
        butt.castShadow = true;
        butt.receiveShadow = true;
        g.add(butt);
      });
    }
  }

  if (slitCount > 0) {
    const step = w / (slitCount + 1);
    for (let wi = 0; wi < slitCount; wi++) {
      const wx = -w / 2 + (wi + 1) * step;
      [-1, 1].forEach(side => {
        const slit = new THREE.Mesh(new THREE.BoxGeometry(Math.max(0.12, w * 0.035), h * 0.22, 0.06), dm || sm);
        slit.position.set(wx, h * 0.56, side * (d / 2 + 0.01));
        g.add(slit);
      });
    }
  }

  // Dark backing panel recessed inside the doorway (depth cue, replaces old outer-face slab)
  {
    const dOff = p.doorOffset || 0;
    const inset = Math.max(0.14, Math.min(w, d) * 0.14); // ~1 shell thickness
    const door = new THREE.Mesh(new THREE.BoxGeometry(
      doorSide === 'left' || doorSide === 'right' ? 0.06 : doorW,
      doorH,
      doorSide === 'left' || doorSide === 'right' ? doorW : 0.06,
    ), dm || sm);
    if (doorSide === 'back')  door.position.set(dOff, doorH / 2, -(d / 2 - inset));
    else if (doorSide === 'left')  door.position.set(-(w / 2 - inset), doorH / 2, dOff);
    else if (doorSide === 'right') door.position.set( w / 2 - inset,  doorH / 2, dOff);
    else                           door.position.set(dOff, doorH / 2, d / 2 - inset);
    g.add(door);
  }

  const roofH = addGabledRoof(g, w, d, h, sm, rm, {
    roofH: p.roofH,
    roofT: p.roofT,
    overhangW: p.overhangW,
    overhangD: p.overhangD,
    gableStyle: p.gableStyle,
  });

  if (chimneyCount > 0) {
    for (let ci = 0; ci < chimneyCount; ci++) {
      const cx = chimneyCount === 1
        ? w * 0.22
        : -w * 0.22 + (ci * (w * 0.44 / Math.max(1, chimneyCount - 1)));
      const chimney = new THREE.Mesh(new THREE.BoxGeometry(0.18, Math.max(0.6, h * 0.28), 0.18), sm);
      chimney.position.set(cx, h + roofH * 0.6, -d * 0.12);
      chimney.castShadow = true;
      chimney.receiveShadow = true;
      g.add(chimney);
    }
  }

  if (p.porch) {
    const porchW = p.porchW || Math.max(0.9, doorW * 1.6);
    const porchD = p.porchD || 0.9;
    const porchH = p.porchH || 0.7;
    const porch = new THREE.Mesh(new THREE.BoxGeometry(porchW, porchH, porchD), sm);
    porch.castShadow = true;
    porch.receiveShadow = true;
    const hood = new THREE.Mesh(new THREE.BoxGeometry(porchW + 0.08, 0.14, porchD + 0.08), rm || sm);
    hood.castShadow = true;
    hood.receiveShadow = true;

    if (doorSide === 'back') {
      porch.position.set(doorOffset, porchH / 2, -(d / 2 + porchD / 2));
      hood.position.set(doorOffset, porchH + 0.07, -(d / 2 + porchD / 2));
    } else if (doorSide === 'left') {
      porch.rotation.y = Math.PI / 2;
      hood.rotation.y = Math.PI / 2;
      porch.position.set(-(w / 2 + porchD / 2), porchH / 2, doorOffset);
      hood.position.set(-(w / 2 + porchD / 2), porchH + 0.07, doorOffset);
    } else if (doorSide === 'right') {
      porch.rotation.y = Math.PI / 2;
      hood.rotation.y = Math.PI / 2;
      porch.position.set(w / 2 + porchD / 2, porchH / 2, doorOffset);
      hood.position.set(w / 2 + porchD / 2, porchH + 0.07, doorOffset);
    } else {
      porch.position.set(doorOffset, porchH / 2, d / 2 + porchD / 2);
      hood.position.set(doorOffset, porchH + 0.07, d / 2 + porchD / 2);
    }
    g.add(porch);
    g.add(hood);
  }

  return g;
}

export function buildStairway(p, sm) {
  const w = p.w || 3.4;
  const d = p.d || 5.0;
  const h = p.h || 2.0;
  const steps = Math.max(2, p.steps || 6);
  const landingD = p.landingD || 0;
  const cheekT = p.cheekT || 0.16;
  const cheekH = p.cheekH || Math.max(0.32, h * 0.36);
  const y = Math.max(0, p.y || 0);
  const stepH = h / steps;
  const stepD = d / steps;

  const g = new THREE.Group();
  g.position.set(p.x || 0, y, p.z || 0);
  if (p.rotation) g.rotation.y = p.rotation;
  g.userData = { label: p.label || '', info: p.info || '' };

  for (let si = 0; si < steps; si++) {
    const depth = Math.max(stepD, d - si * stepD);
    const step = new THREE.Mesh(new THREE.BoxGeometry(w, stepH, depth), sm);
    step.position.set(0, stepH * (si + 0.5), -si * stepD / 2);
    step.castShadow = true;
    step.receiveShadow = true;
    g.add(step);
  }

  if (landingD > 0) {
    const landing = new THREE.Mesh(new THREE.BoxGeometry(w, stepH, landingD), sm);
    landing.position.set(0, h - stepH / 2 + 0.01, -(d / 2 + landingD / 2));
    landing.castShadow = true;
    landing.receiveShadow = true;
    g.add(landing);
  }

  if (p.sideWalls !== false) {
    const fullDepth = d + landingD;
    [-1, 1].forEach(side => {
      const cheek = new THREE.Mesh(new THREE.BoxGeometry(cheekT, cheekH, fullDepth), sm);
      cheek.position.set(side * (w / 2 - cheekT / 2), cheekH / 2, -landingD / 2);
      cheek.castShadow = true;
      cheek.receiveShadow = true;
      g.add(cheek);
    });
  }

  return g;
}

// ── STAIR FLIGHT ──────────────────────────────────────────────────────────────
// Individual staircase with proper step geometry, handrail cheeks and landing.
// Physics: Rapier autostep (0.35 m) handles each step; a companion slope collider
// is added in PhysicsWorld.js so the capsule slides smoothly when descending.
//
// Parameters:
//   p.steps   — number of treads (default 8)
//   p.stepH   — riser height in metres (default 0.22)
//   p.stepD   — tread depth  in metres (default 0.35)
//   p.w       — stair width  in metres (default 2.4)
//   p.y       — y of lowest step bottom (default 0)
//   p.rotation — yaw in radians (direction the stair faces, default 0)
export function buildStairFlight(p, sm) {
  const steps  = Math.max(2, p.steps  || 8);
  const stepH  = p.stepH  || 0.22;
  const stepD  = p.stepD  || 0.35;
  const w      = p.w      || 2.4;
  const cheekH = stepH * 1.4;
  const cheekT = 0.12;
  const y0     = p.y || 0;

  const g = new THREE.Group();
  g.position.set(p.x || 0, y0, p.z || 0);
  if (p.rotation !== undefined) g.rotation.y = p.rotation;
  g.userData = { label: p.label || '', info: p.info || '' };

  for (let i = 0; i < steps; i++) {
    // Tread: full depth cumulative slab (pyramid-stack style — realistic masonry)
    const slabD = (steps - i) * stepD;
    const slab  = new THREE.Mesh(
      new THREE.BoxGeometry(w, stepH, slabD),
      sm,
    );
    slab.position.set(0, stepH * (i + 0.5), slabD / 2);
    slab.castShadow    = true;
    slab.receiveShadow = true;
    g.add(slab);
  }

  // Cheek walls (parapets on each side of the stair)
  const totalH = steps * stepH;
  const totalD = steps * stepD;
  const slopeLen = Math.sqrt(totalH * totalH + totalD * totalD);
  const pitch    = Math.atan2(totalH, totalD);

  [-1, 1].forEach(side => {
    const cheek = new THREE.Mesh(
      new THREE.BoxGeometry(cheekT, cheekH, slopeLen),
      sm,
    );
    cheek.position.set(side * (w / 2 + cheekT / 2), totalH / 2 + cheekH / 2 - stepH / 2, totalD / 2);
    cheek.rotation.x = pitch;
    cheek.castShadow = cheek.receiveShadow = true;
    g.add(cheek);
  });

  // ── Physics slope ramp (invisible trimesh for smooth capsule movement) ──────
  // A flat inclined slab slightly above the step surface so Rapier's capsule
  // slides continuously instead of bouncing on individual step edges.
  const slopeGeo = new THREE.BoxGeometry(w * 0.92, 0.06, slopeLen);
  const slopeMesh = new THREE.Mesh(slopeGeo);
  slopeMesh.position.set(
    (p.x || 0),
    (p.y || 0) + totalH / 2,
    (p.z || 0) + totalD / 2,
  );
  slopeMesh.rotation.set(pitch, p.rotation || 0, 0); // same pitch as cheeks

  return { group: g, ramps: [slopeMesh] };
}

export function buildGate(p, sm, dm, rm, style = 'crusader') {
  const w = p.w || 4.5, d = p.d || 3.5, h = p.h || 6.0, y = Math.max(0, p.y || 0);
  const tR = d * 0.52;   // flanking tower radius
  const tH = h * 1.22;  // flanking towers taller than gatehouse

  const g = new THREE.Group();
  g.position.set(p.x, y, p.z);
  if (p.rotation !== undefined) g.rotation.y = p.rotation;
  g.userData = { label: p.label || '', info: p.info || '' };

  // Flanking towers — hollow (Principle 2: Interior Logic)
  // Each tower uses the same open-ended arc-gap shell as buildRoundTower.
  // Entrance faces inward (+z toward passage) so the player can enter from the courtyard.
  const tShellT   = Math.max(0.15, tR * 0.22);
  const tEntW     = Math.max(0.7, tR * 0.70);
  const tEntArcW  = Math.asin(Math.min(0.98, tEntW / (2 * tR))) * 2;
  const tEntAngle = 0; // entrance on +z (facing the passage)

  const smDS = (sm && typeof sm.clone === 'function') ? sm.clone() : sm;
  if (smDS !== sm) smDS.side = THREE.DoubleSide;

  [-1, 1].forEach(s => {
    const cx = s * (w / 2 + tR * 0.45);

    // Hollow cylindrical shell with entrance gap facing passage
    const tw = new THREE.Mesh(
      new THREE.CylinderGeometry(tR, tR * 1.06, tH, 14, 1, true,
        tEntAngle + tEntArcW / 2, Math.PI * 2 - tEntArcW),
      smDS,
    );
    tw.position.set(cx, tH / 2 + 0.002, 0);
    tw.castShadow = true;
    tw.receiveShadow = true;
    g.add(tw);

    // Floor slab inside flanking tower
    const tFloor = new THREE.Mesh(
      new THREE.CylinderGeometry(tR - tShellT, (tR * 1.06) - tShellT, 0.12, 14), sm,
    );
    tFloor.position.set(cx, 0.06, 0);
    tFloor.receiveShadow = true;
    g.add(tFloor);

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

  // ── Gatehouse body: split into piers + lintel so passage is truly open ──────
  const pW = w * 0.40;                 // passage clear width
  const pH = h * 0.64;                 // passage clear height (to spring of arch)
  const archR   = pW / 2;             // arch radius
  const pierW   = (w - pW) / 2;       // width of each side pier
  const lintelH = h - pH - archR;     // height of solid wall above arch crown

  // Left pier
  const lp = new THREE.Mesh(new THREE.BoxGeometry(pierW, h, d), sm);
  lp.position.set(-(pW / 2 + pierW / 2), h / 2, 0);
  lp.castShadow = lp.receiveShadow = true;
  g.add(lp);

  // Right pier
  const rp = lp.clone();
  rp.position.x = pW / 2 + pierW / 2;
  g.add(rp);

  // Wall above arch (lintel band) — only if there's room above the arch crown
  if (lintelH > 0.1) {
    const lintel = new THREE.Mesh(new THREE.BoxGeometry(w, lintelH, d), sm);
    lintel.position.y = pH + archR + lintelH / 2;
    lintel.castShadow = lintel.receiveShadow = true;
    g.add(lintel);
  }

  // Ceiling slab inside passage
  const ceil = new THREE.Mesh(new THREE.BoxGeometry(pW, 0.18, d), sm);
  ceil.position.y = pH;
  ceil.receiveShadow = true;
  g.add(ceil);

  // ── Arch rings (front + back) using TorusGeometry half-circle ──────────────
  // THREE.TorusGeometry revolves around Z by default → rotate so arch is in XY plane
  const archTube = Math.min(0.22, d * 0.12);
  [-(d / 2 - archTube), d / 2 - archTube].forEach(zOff => {
    const archGeo = new THREE.TorusGeometry(archR, archTube, 8, 16, Math.PI);
    const arch = new THREE.Mesh(archGeo, sm);
    arch.position.set(0, pH, zOff);
    // TorusGeometry default: ring in XY plane ✓, arc from +X → +Y → -X = top half
    arch.castShadow = arch.receiveShadow = true;
    g.add(arch);
  });

  // ── Keystone accent at arch crown ─────────────────────────────────────────
  const ks = new THREE.Mesh(
    new THREE.BoxGeometry(pW * 0.13, archR * 0.18, d * 0.52),
    sm,
  );
  ks.position.set(0, pH + archR + archTube * 0.5, 0);
  ks.castShadow = ks.receiveShadow = true;
  g.add(ks);

  // ── Hood course (decorative overhang above full gate) ─────────────────────
  const hood = new THREE.Mesh(new THREE.BoxGeometry(w * 1.02, 0.18, d * 1.02), sm);
  hood.position.y = h + 0.09;
  hood.castShadow = hood.receiveShadow = true;
  g.add(hood);

  // ── Portcullis (vertical bars in groove, slightly recessed) ──────────────
  const portY = pH * 0.48;
  if (style !== 'ancient') {
    // Main cross-bar at top
    const crossbar = new THREE.Mesh(new THREE.BoxGeometry(pW * 0.94, 0.08, 0.08), dm || sm);
    crossbar.position.set(0, pH * 0.94, -(d * 0.45));
    g.add(crossbar);
    // Vertical bars
    const nBars = Math.max(3, Math.round(pW / 0.32));
    for (let bi = 0; bi < nBars; bi++) {
      const bx = -pW / 2 + (bi + 0.5) * (pW / nBars);
      const bar = new THREE.Mesh(new THREE.BoxGeometry(0.06, portY * 0.90, 0.06), dm || sm);
      bar.position.set(bx, portY * 0.45, -(d * 0.45));
      g.add(bar);
    }
  }

  // Merlons on gatehouse roof
  const mkM = chooseMerlonBuilder(style);
  const merlons = mkM(squareTowerMerlonPositions(w, d, h), sm);
  if (merlons) g.add(merlons);

  return { group: g, ramps: [] };
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

// —— TERRAIN STACK ————————————————————————————————————————————————————————————————
// Stacks several irregular polygon slabs to approximate mesas, ridges and cliff belts.
export function buildTerrainStack(p, gm) {
  const layers = p.layers || [];
  const footprint = p.footprint || p.points || [];
  const y = Math.max(0, p.y || 0);
  if (!footprint.length || !layers.length) return null;

  const g = new THREE.Group();
  g.position.set(p.x || 0, y, p.z || 0);
  if (p.rotation) g.rotation.y = p.rotation;
  g.userData = { label: p.label || '', info: p.info || '' };

  let currentY = 0;
  layers.forEach(layer => {
    const h = layer.h || layer.height || 1;
    const mesh = new THREE.Mesh(
      makePolygonExtrude(footprint, h, layer.scale || 1),
      gm,
    );
    mesh.position.y = currentY;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    g.add(mesh);
    currentY += h;
  });

  return g;
}

// —— SLOPE PATH ————————————————————————————————————————————————————————————————
// A simple sloped road or ramp between two elevations, useful for gate approaches.
export function buildSlopePath(p, gm) {
  const x1 = p.x1 ?? 0;
  const z1 = p.z1 ?? 0;
  const x2 = p.x2 ?? 0;
  const z2 = p.z2 ?? 0;
  const y1 = Math.max(0, p.y1 || 0);
  const y2 = Math.max(0, p.y2 || 0);
  const width = p.w || 2.2;
  const thick = p.thick || 0.18;
  const dx = x2 - x1;
  const dz = z2 - z1;
  const len = Math.sqrt(dx * dx + dz * dz);
  if (len < 0.2) return null;

  const g = new THREE.Group();
  g.position.set((x1 + x2) / 2, (y1 + y2) / 2, (z1 + z2) / 2);
  g.rotation.y = Math.atan2(-dz, dx);
  g.rotation.z = -Math.atan2(y2 - y1, len);
  g.userData = { label: p.label || '', info: p.info || '' };

  const mesh = new THREE.Mesh(new THREE.BoxGeometry(len, thick, width), gm);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  g.add(mesh);

  if (p.sideWalls) {
    const railH = p.railH || Math.max(0.22, thick * 1.8);
    const railT = p.railT || 0.12;
    [-1, 1].forEach(side => {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(len, railH, railT), gm);
      rail.position.set(0, railH / 2 + thick * 0.2, side * (width / 2 - railT / 2));
      rail.castShadow = true;
      rail.receiveShadow = true;
      g.add(rail);
    });
  }

  return g;
}

// —— DITCH ———————————————————————————————————————————————————————————————————————
// Visual moat / ditch / cut in front of walls; represented as a low dark trench.
export function buildDitch(p, gm) {
  const rTop = p.rTop || 8;
  const rBot = p.rBot || 6.8;
  const h = p.h || 0.9;
  const segs = p.segs || 32;
  const y = Math.max(0, p.y || 0);

  const g = new THREE.Group();
  g.position.set(p.x || 0, y, p.z || 0);
  if (p.rotation) g.rotation.y = p.rotation;
  g.userData = { label: p.label || '', info: p.info || '' };

  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBot, h, segs), gm);
  mesh.position.y = -h / 2 + 0.03;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  g.add(mesh);

  const rim = new THREE.Mesh(new THREE.CylinderGeometry(rTop * 1.01, rTop * 1.02, 0.08, segs), gm);
  rim.position.y = 0.01;
  rim.castShadow = true;
  rim.receiveShadow = true;
  g.add(rim);

  return g;
}

// —— WATER PLANE ————————————————————————————————————————————————————————————————
// Simple water surface for harbors, estuaries and moats.
export function buildWaterPlane(p, wm) {
  const w = p.w || 20;
  const d = p.d || 12;
  const y = p.y || 0;

  const g = new THREE.Group();
  g.position.set(p.x || 0, y, p.z || 0);
  if (p.rotation) g.rotation.y = p.rotation;
  g.userData = { label: p.label || '', info: p.info || '' };

  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, d, 1, 1), wm);
  mesh.rotation.x = -Math.PI / 2;
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

  const lip = new THREE.Mesh(new THREE.BoxGeometry(w * 1.02, Math.max(0.12, h * 0.12), d * 1.02), sm);
  lip.position.y = h - Math.max(0.06, h * 0.06);
  lip.castShadow = true;
  lip.receiveShadow = true;
  g.add(lip);

  return g;
}

// ── GLACIS ───────────────────────────────────────────────────────────────
// Sloped stone plinth — CylinderGeometry with different top/bottom radii.
export function buildGlacis(p, sm) {
  const rTop = p.rTop || 6, rBot = p.rBot || 9, h = p.h || 3, y = Math.max(0, p.y || 0);
  const segs = p.segs || 32;

  const g = new THREE.Group();
  g.position.set(p.x || 0, y, p.z || 0);
  g.userData = { label: p.label || '', info: p.info || '' };

  if (Array.isArray(p.tiers) && p.tiers.length) {
    let currentY = 0;
    let topRadius = rTop;
    p.tiers.forEach((tier, idx) => {
      const tierH = tier.h || tier.height || 0.5;
      const tierTop = tier.rTop || tier.top || topRadius;
      const tierBot = tier.rBot || tier.bot || Math.max(tierTop, topRadius + 0.8);
      const ring = new THREE.Mesh(new THREE.CylinderGeometry(tierTop, tierBot, tierH, segs), sm);
      ring.position.y = currentY + tierH / 2;
      ring.castShadow = true;
      ring.receiveShadow = true;
      g.add(ring);

      if (idx === p.tiers.length - 1) {
        const crown = new THREE.Mesh(new THREE.CylinderGeometry(tierTop * 1.01, tierTop * 1.03, Math.max(0.08, tierH * 0.14), segs), sm);
        crown.position.y = currentY + tierH - Math.max(0.04, tierH * 0.07);
        crown.castShadow = true;
        crown.receiveShadow = true;
        g.add(crown);
      }

      currentY += tierH;
      topRadius = tierTop;
    });

    return g;
  }

  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBot, h, segs), sm);
  mesh.position.y = h / 2;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  g.add(mesh);

  const crown = new THREE.Mesh(new THREE.CylinderGeometry(rTop * 1.02, rTop * 1.04, Math.max(0.12, h * 0.08), segs), sm);
  crown.position.y = h - Math.max(0.06, h * 0.04);
  crown.castShadow = true;
  crown.receiveShadow = true;
  g.add(crown);

  return g;
}

// ── RING ─────────────────────────────────────────────────────────────────
// Connects tower points in a closed ring via walls.
// gate:{atIndex,…} replaces one wall segment with a gatehouse.
// squareTowers / style='japanese' forces square towers throughout.
export function buildRing(p, sm, dm, rm, style = 'crusader') {
  const pts = p.points || [], n = pts.length, y = Math.max(0, p.y || 0);
  if (n < 2) return null;

  const wH   = p.wall?.h         || 3;
  const wT   = p.wall?.thick     || 0.8;
  const wBut = p.wall?.buttresses || false;
  const gt   = p.gate;
  // Japanese castles always use square towers (Yagura are rectangular)
  const useSquare = p.squareTowers || style === 'japanese';

  const g = new THREE.Group();
  g.userData = { label: p.label || '', info: p.info || '' };

  pts.forEach((pt, i) => {
    const ptY = Math.max(0, y + (pt.y || 0));
    const tR  = pt.r || 1.2; // tower radius / half-width

    // ── Tower at this vertex ─────────────────────────────────────────────
    // buildRoundTower / buildSquareTower return { group, ramps } — we must
    // extract the group for g.add() and propagate the ramps upward.
    if (useSquare) {
      const side   = tR * 2;
      const result = buildSquareTower({ ...pt, w: side, d: side, y: ptY }, sm, dm, rm, style);
      const tGroup = result.group ?? result;
      g.add(tGroup);
    } else {
      const result = buildRoundTower({ ...pt, y: ptY }, sm, dm, rm, style);
      const tGroup = result.group ?? result;
      g.add(tGroup);
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
    // Trim factor: wall endpoint starts just inside the tower radius so the
    // hollow shell "contains" the wall end — no visible gap at junction.
    const trim1 = tR  * (useSquare ? 0.82 : 0.92);
    const trim2 = nxR * (useSquare ? 0.82 : 0.92);

    if (gt && gt.atIndex === i) {
      // buildGate now returns { group, ramps } — extract group
      const gResult = buildGate(
        { ...gt, x: mx, z: mz, y, rotation: Math.atan2(mx, mz) },
        sm, dm, rm, style,
      );
      g.add(gResult.group ?? gResult);

      // ── Connecting walls from each adjacent tower to the gatehouse ───────
      const gHW = (gt.w || 4.5) * 0.62;
      const lx = mx - ux * gHW, lz = mz - uz * gHW;
      const rx = mx + ux * gHW, rz = mz + uz * gHW;

      const leftLen  = Math.sqrt((lx - pt.x) ** 2 + (lz - pt.z) ** 2);
      const rightLen = Math.sqrt((nx.x - rx)  ** 2 + (nx.z - rz)  ** 2);

      if (leftLen > trim1 + 0.3) {
        g.add(buildWall({
          x: pt.x + ux * trim1, z: pt.z + uz * trim1,
          x2: lx, z2: lz,
          h: pt.wallH || wH, y, thick: wT, buttresses: wBut, label: '', info: '',
        }, sm, dm, style));
      }
      if (rightLen > trim2 + 0.3) {
        g.add(buildWall({
          x: rx, z: rz,
          x2: nx.x - ux * trim2, z2: nx.z - uz * trim2,
          h: pt.wallH || wH, y, thick: wT, buttresses: wBut, label: '', info: '',
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
          buttresses: wBut,
          label: '', info: '',
        }, sm, dm, style));
      }
    }
  });

  return g;
}

// ── MACHICOLATION (Pechnasen) ─────────────────────────────────────────────
// Stone gallery projecting outward from the top of a tower or wall with floor
// openings (meurtrières) through which defenders could drop projectiles.
//
// mode:'round' (default) — ring of corbels around a cylindrical tower
// mode:'wall'            — linear gallery along a wall segment
//
// Parameters:
//   p.r        — tower radius (round mode, default 2.0)
//   p.w        — gallery length (wall mode, default 8.0)
//   p.overhang — how far floor slab projects outward (default 0.50)
//   p.gallH    — outer parapet height (default 0.48)
//   p.corbH    — corbel block height below floor (default 0.30)
//   p.floorT   — floor slab thickness (default 0.15)
//   p.count    — number of corbel/slot pairs; 0 = auto (default 0)
//   p.slotRatio — fraction of arc/span that is open slot (default 0.40)
//   p.y        — base elevation (hinge point at top of wall/tower)
export function buildMachicolation(p, sm) {
  const y       = Math.max(0, p.y || 0);
  const overhang = p.overhang  || 0.50;
  const gallH   = p.gallH     || 0.48;
  const corbH   = p.corbH     || 0.30;
  const floorT  = p.floorT    || 0.15;
  const slotR   = p.slotRatio !== undefined ? p.slotRatio : 0.40;

  const g = new THREE.Group();
  g.position.set(p.x || 0, y, p.z || 0);
  if (p.rotation) g.rotation.y = p.rotation;
  g.userData = { label: p.label || '', info: p.info || '' };

  if (p.mode === 'wall') {
    // ── Linear gallery ──────────────────────────────────────────────────
    const w     = p.w || 8.0;
    const count = p.count || Math.max(2, Math.round(w / 1.35));
    const step  = w / count;
    const cW    = step * (1 - slotR);          // corbel/slab width
    const rOut  = overhang;                    // z offset from wall face

    for (let i = 0; i < count; i++) {
      const cx = -w / 2 + (i + 0.5) * step;

      // Floor slab
      const slab = new THREE.Mesh(new THREE.BoxGeometry(cW, floorT, overhang), sm);
      slab.position.set(cx, corbH + floorT / 2, rOut / 2);
      slab.castShadow = true;
      g.add(slab);

      // Corbel (angled bracket) below slab — tapers toward wall face
      const corb = new THREE.Mesh(new THREE.BoxGeometry(cW * 0.82, corbH, overhang * 0.58), sm);
      corb.position.set(cx, corbH / 2, rOut * 0.71);
      corb.castShadow = true;
      g.add(corb);
    }

    // Continuous outer parapet on top of the gallery
    const parapet = new THREE.Mesh(new THREE.BoxGeometry(w, gallH, 0.20), sm);
    parapet.position.set(0, corbH + floorT + gallH / 2, rOut + 0.10);
    parapet.castShadow = true;
    g.add(parapet);

  } else {
    // ── Circular gallery (round tower) ───────────────────────────────────
    const r     = p.r || 2.0;
    const rMid  = r + overhang / 2;
    const circ  = 2 * Math.PI * rMid;
    const count = p.count || Math.max(6, Math.round(circ / 1.30));
    const cW    = (circ / count) * (1 - slotR);

    for (let i = 0; i < count; i++) {
      const ang = (i / count) * Math.PI * 2;
      const sx  = Math.sin(ang);
      const sz  = Math.cos(ang);

      // Floor slab segment
      const slab = new THREE.Mesh(new THREE.BoxGeometry(cW, floorT, overhang), sm);
      slab.position.set(sx * rMid, corbH + floorT / 2, sz * rMid);
      slab.rotation.y = -ang;
      slab.castShadow = true;
      g.add(slab);

      // Corbel below (angled toward tower face)
      const corb = new THREE.Mesh(new THREE.BoxGeometry(cW * 0.80, corbH, overhang * 0.55), sm);
      corb.position.set(sx * (r + overhang * 0.72), corbH / 2, sz * (r + overhang * 0.72));
      corb.rotation.y = -ang;
      corb.castShadow = true;
      g.add(corb);
    }

    // Outer parapet ring
    const segs = count * 2;
    const rOut = r + overhang + 0.10;
    const parapet = new THREE.Mesh(
      new THREE.CylinderGeometry(rOut, rOut, gallH, segs),
      sm,
    );
    parapet.position.y = corbH + floorT + gallH / 2;
    parapet.castShadow = true;
    g.add(parapet);
  }

  return g;
}

// ── DRAWBRIDGE (Zugbrücke) ────────────────────────────────────────────────
// Modular drawbridge: hinged wooden platform + chains + gate-wall recess.
// Hinge sits at the gate wall face (local z = 0); bridge extends toward z+.
//
// Parameters:
//   p.w       — bridge width (default 3.2)
//   p.d       — bridge span / length (default 3.6)
//   p.h       — deck plank thickness (default 0.20)
//   p.angle   — raise angle in radians: 0 = flat, Math.PI/2 = vertical (default 0)
//   p.pitD    — depth of the pit in front of gate (0 = none, default 1.0)
//   p.pitH    — pit box height below ground (default 0.50)
//   p.chains  — show chains (default true when angle > 0)
//   p.y       — base elevation of the hinge
export function buildDrawbridge(p, sm, dm) {
  const w     = p.w    || 3.2;
  const d     = p.d    || 3.6;
  const thick = p.h    || 0.20;
  const angle = p.angle !== undefined ? p.angle : 0;
  const pitD  = p.pitD !== undefined ? p.pitD : 1.0;
  const pitH  = p.pitH || 0.50;
  const showChains = p.chains !== false && angle > 0.04;
  const plankMat = dm || sm;
  const y     = Math.max(0, p.y || 0);

  const g = new THREE.Group();
  g.position.set(p.x || 0, y, p.z || 0);
  if (p.rotation) g.rotation.y = p.rotation;
  g.userData = { label: p.label || '', info: p.info || '' };

  // ── Bridge deck (hinged at z=0, extends to z=d when flat) ──────────────
  const deckPivot = new THREE.Group(); // rotation around x-axis at hinge
  deckPivot.rotation.x = -angle;
  g.add(deckPivot);

  // Main deck slab
  const deck = new THREE.Mesh(new THREE.BoxGeometry(w, thick, d), sm);
  deck.position.set(0, thick / 2, d / 2);
  deck.castShadow = true;
  deck.receiveShadow = true;
  deckPivot.add(deck);

  // Planks across the deck (visible grain lines)
  const plankCount = Math.max(3, Math.round(d / 0.42));
  for (let pi = 0; pi < plankCount; pi++) {
    const pz = (pi + 0.5) * (d / plankCount);
    const plank = new THREE.Mesh(
      new THREE.BoxGeometry(w + 0.06, thick * 0.22, 0.20), plankMat,
    );
    plank.position.set(0, thick + thick * 0.11, pz);
    deckPivot.add(plank);
  }

  // Side beams (structural rails along the length)
  [-1, 1].forEach(side => {
    const beam = new THREE.Mesh(new THREE.BoxGeometry(0.16, thick * 1.5, d), sm);
    beam.position.set(side * (w / 2 - 0.08), thick * 0.75, d / 2);
    beam.castShadow = true;
    deckPivot.add(beam);
  });

  // ── Chains (only visible when bridge is raised) ──────────────────────
  if (showChains) {
    const chainR    = 0.045;
    const attachH   = 1.70; // chain attaches this high on gate wall (above hinge)
    // Tip of bridge in world-local space after rotation
    const tipY = d * Math.sin(angle);
    const tipZ = d * Math.cos(angle);

    [-1, 1].forEach(side => {
      const ox = side * (w / 2 - 0.24);
      const ax = ox, ay = attachH, az = -0.08; // gate anchor
      const bx = ox, by = tipY + thick,  bz = tipZ;   // bridge tip

      const dx = bx - ax, dy = by - ay, dz = bz - az;
      const len = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (len < 0.2) return;

      const chain = new THREE.Mesh(
        new THREE.CylinderGeometry(chainR, chainR, len, 4), sm,
      );
      chain.position.set((ax + bx) / 2, (ay + by) / 2, (az + bz) / 2);
      chain.quaternion.setFromUnitVectors(
        new THREE.Vector3(0, 1, 0),
        new THREE.Vector3(dx / len, dy / len, dz / len),
      );
      chain.castShadow = true;
      g.add(chain);
    });
  }

  // ── Pit / recess in front of gate ─────────────────────────────────────
  // Visible when bridge is down — the dark box below represents the water/void.
  if (pitD > 0) {
    const pit = new THREE.Mesh(
      new THREE.BoxGeometry(w + 1.0, pitH, pitD), dm || sm,
    );
    pit.position.set(0, -pitH / 2 + 0.03, pitD / 2 + 0.08);
    pit.receiveShadow = true;
    g.add(pit);

    // Pit rim (narrow raised edge around the pit)
    const rim = new THREE.Mesh(
      new THREE.BoxGeometry(w + 1.2, 0.10, pitD + 0.2), sm,
    );
    rim.position.set(0, 0.05, pitD / 2 + 0.08);
    g.add(rim);
  }

  return g;
}

// ── HOARDING (Holzkampfgalerie / Hurden) ──────────────────────────────────
// Temporary wooden fighting gallery projecting outward from a wall-walk.
// Brackets fit into putlog holes in the wall face; floor planks span them.
// Provides covered positions with drop-slots directly below the wall base.
//
// Parameters:
//   p.w        — total gallery width along wall (default 6.0)
//   p.d        — projection depth from wall face (default 1.20)
//   p.h        — front/side panel height (default 1.40)
//   p.count    — bay divisions; 0 = auto (default 0)
//   p.y        — base elevation (wall-walk surface level)
//   dm         — wood material (dark); falls back to sm if not provided
export function buildHoarding(p, sm, dm) {
  const y    = Math.max(0, p.y || 0);
  const w    = p.w || 6.0;
  const d    = p.d || 1.20;
  const h    = p.h || 1.40;
  const wMat = dm || sm;

  const count  = p.count || Math.max(2, Math.round(w / 1.5));
  const bayW   = w / count;
  const floorT = 0.10;
  const panelT = 0.10;

  const g = new THREE.Group();
  g.position.set(p.x || 0, y, p.z || 0);
  if (p.rotation) g.rotation.y = p.rotation;
  g.userData = { label: p.label || '', info: p.info || '' };

  // ── Floor slab ─────────────────────────────────────────────────────────
  const floor = new THREE.Mesh(new THREE.BoxGeometry(w, floorT, d), wMat);
  floor.position.set(0, floorT / 2, d / 2);
  floor.castShadow = true;
  floor.receiveShadow = true;
  g.add(floor);

  // Cross-plank grain lines visible from above
  const plankCount = Math.max(2, Math.round(d / 0.28));
  for (let pi = 0; pi < plankCount; pi++) {
    const pz = (pi + 0.5) * (d / plankCount);
    const grain = new THREE.Mesh(
      new THREE.BoxGeometry(w, floorT * 0.20, 0.05), sm,
    );
    grain.position.set(0, floorT + floorT * 0.10, pz);
    g.add(grain);
  }

  // ── Bracket beams at each bay boundary ────────────────────────────────
  for (let i = 0; i <= count; i++) {
    const bx = -w / 2 + i * bayW;
    const beam = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.14, d + 0.18), wMat);
    beam.position.set(bx, -0.07, d / 2);
    beam.castShadow = true;
    g.add(beam);
  }

  // ── Front parapet panel ────────────────────────────────────────────────
  const panel = new THREE.Mesh(new THREE.BoxGeometry(w, h, panelT), wMat);
  panel.position.set(0, floorT + h / 2, d + panelT / 2);
  panel.castShadow = true;
  g.add(panel);

  // Arrow-slit crosses on front face (sm = lighter stone-like contrast)
  for (let i = 0; i < count; i++) {
    const cx = -w / 2 + (i + 0.5) * bayW;
    const slitY = floorT + h * 0.58;
    const slitZ = d + panelT + 0.01; // proud of panel outer face
    const vs = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.30, 0.04), sm);
    vs.position.set(cx, slitY, slitZ);
    g.add(vs);
    const hs = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.07, 0.04), sm);
    hs.position.set(cx, slitY, slitZ);
    g.add(hs);
  }

  // ── Sloped roof (outer edge slightly lower — runoff angle) ────────────
  const roofT  = 0.08;
  const dropH  = 0.18;
  const roofSpan = Math.sqrt(d * d + dropH * dropH);
  const roof = new THREE.Mesh(new THREE.BoxGeometry(w + 0.10, roofT, roofSpan + 0.10), wMat);
  roof.rotation.x = Math.atan2(dropH, d);
  roof.position.set(0, floorT + h + roofT / 2 - dropH / 2, d / 2);
  roof.castShadow = true;
  g.add(roof);

  // ── Side walls ────────────────────────────────────────────────────────
  [-1, 1].forEach(side => {
    const sw = new THREE.Mesh(new THREE.BoxGeometry(panelT, h, d), wMat);
    sw.position.set(side * (w / 2 + panelT / 2), floorT + h / 2, d / 2);
    sw.castShadow = true;
    g.add(sw);
  });

  return g;
}

// ── Material variant cache + helper ──────────────────────────────────────
// Clones a base material and applies a named surface variant so individual
// components (or whole RINGs) can look visually distinct without requiring
// fully separate texture assets.
//
// Supported variants:
//   'limestone'  — lighter, creamier (freshly quarried Crusader ashlar)
//   'worn'       — darker, rougher   (weathered exposed surfaces)
//   'volcanic'   — very dark basalt  (some Syrian/Near-East tower types)
//   'sandstone'  — warm reddish tint (sun-baked desert construction)
const _variantCache = new Map();
function applyVariant(mat, variant) {
  const key = mat.uuid + ':' + variant;
  if (_variantCache.has(key)) return _variantCache.get(key);
  const v   = mat.clone();
  const col = v.color.clone();
  switch (variant) {
    case 'limestone':
      col.multiplyScalar(1.14);
      col.r = Math.min(1, col.r * 1.03);
      v.roughness = Math.max(0.30, (v.roughness || 0.8) - 0.08);
      break;
    case 'worn':
      col.multiplyScalar(0.78);
      v.roughness = Math.min(1.0, (v.roughness || 0.8) + 0.10);
      break;
    case 'volcanic':
      col.multiplyScalar(0.52);
      v.roughness = Math.min(1.0, (v.roughness || 0.8) + 0.14);
      break;
    case 'sandstone':
      col.r = Math.min(1, col.r * 1.10);
      col.g = Math.min(1, col.g * 1.03);
      col.b = Math.max(0, col.b * 0.84);
      v.roughness = Math.min(1.0, (v.roughness || 0.8) + 0.06);
      break;
    default: break;
  }
  v.color.copy(col);
  v.needsUpdate = true;
  _variantCache.set(key, v);
  return v;
}

// ── Component dispatcher ──────────────────────────────────────────────────
// gm (rock/ground material) is used for GLACIS; falls back to sm if not provided.
// scale: optional global metre-scale multiplier (1.0 = no change, use scaleComp)
// comp.matVariant — optional string passed to applyVariant() to tint sm
// ── buildComponent ────────────────────────────────────────────────────────────
// Public dispatcher.  Always returns { group: THREE.Group, ramps: THREE.Mesh[] }
// or null for unknown/invalid components.
// `ramps` contains invisible physics-slope meshes (helix for spiral stairs,
// inclined slab for stair flights) that CastleEngine forwards to PhysicsWorld.
export function buildComponent(comp, sm, dm, rm, style = 'crusader', gm = null, wm = null, scale = 1.0) {
  const c  = scale !== 1.0 ? scaleComp(comp, scale) : comp;
  const s  = c.matVariant ? applyVariant(sm, c.matVariant) : sm;

  let raw;
  switch (c.type) {
    case 'WALL':             raw = buildWall(c, s, dm, style);              break;
    case 'ROUND_TOWER':      raw = buildRoundTower(c, s, dm, rm, style);    break;
    case 'SQUARE_TOWER':     raw = buildSquareTower(c, s, dm, rm, style);   break;
    case 'GABLED_HALL':      raw = buildGabledHall(c, s, dm, rm);           break;
    case 'STAIRWAY':         raw = buildStairway(c, s);                     break;
    case 'STAIR_FLIGHT':     raw = buildStairFlight(c, s);                  break;
    case 'GATE':             raw = buildGate(c, s, dm, rm, style);          break;
    case 'ABBEY_MODULE':     raw = buildAbbeyModule(c, s, rm);              break;
    case 'CIVILIAN_HOUSING': raw = buildCivilianHousing(c, s, rm);         break;
    case 'BUTTRESS_SYSTEM':  raw = buildButtressSystem(c, s, rm);           break;
    case 'MACHICOLATION':    raw = buildMachicolation(c, s);                break;
    case 'HOARDING':         raw = buildHoarding(c, s, dm);                 break;
    case 'DRAWBRIDGE':       raw = buildDrawbridge(c, s, dm);               break;
    case 'ROCK_FOUNDATION':  raw = buildRockFoundation(c, gm || s);         break;
    case 'TERRAIN_STACK':    raw = buildTerrainStack(c, gm || s);           break;
    case 'SLOPE_PATH':       raw = buildSlopePath(c, c.useStone ? s : (gm || s)); break;
    case 'DITCH':            raw = buildDitch(c, gm || s);                  break;
    case 'WATER_PLANE':      raw = buildWaterPlane(c, wm || dm || s);       break;
    case 'PLATEAU':          raw = buildPlateau(c, gm || s);                break;
    case 'GLACIS':           raw = buildGlacis(c, gm || s);                 break;
    case 'RING':             raw = buildRing(c, s, dm, rm, style);          break;
    default:                 return null;
  }

  if (!raw) return null;
  // Normalise: builders that already return { group, ramps } pass through;
  // builders that return a plain THREE.Group are wrapped.
  if (raw.isObject3D) return { group: raw, ramps: [] };
  return { group: raw.group ?? raw, ramps: raw.ramps ?? [] };
}
