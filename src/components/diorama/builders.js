import * as THREE from 'three';
import {
  chooseMerlonBuilder,
  wallMerlonPositions,
  roundTowerMerlonPositions,
  squareTowerMerlonPositions,
} from './battlements.js';
import { buildRoofForStyle } from './roofs.js';
import { buildButtresses, buildHoarding, buildOriel } from './details.js';

// ── WALL ─────────────────────────────────────────────────────────────────
// Connects (x,z) → (x2,z2) with auto-rotated box + InstancedMesh battlements.
// Optional: buttresses on long walls, hoardings (via p.hoarding flag).
export function buildWall(p, sm, dm, style = 'crusader') {
  const dx = p.x2 - p.x, dz = p.z2 - p.z;
  const len = Math.sqrt(dx * dx + dz * dz);
  const ang = Math.atan2(-dz, dx);
  const h = p.h || 3, thick = p.thick || 0.75, y = p.y || 0;

  const g = new THREE.Group();
  g.position.set((p.x + p.x2) / 2, y, (p.z + p.z2) / 2);
  g.rotation.y = ang;
  g.userData = { label: p.label || '', info: p.info || '' };

  // Main body — polygon walls fold naturally because each segment is independent
  const wall = new THREE.Mesh(new THREE.BoxGeometry(len, h, thick), sm);
  wall.position.y = h / 2;
  wall.castShadow = true;
  wall.receiveShadow = true;
  // Slight y-offset to avoid Z-fighting with adjacent tower bases
  wall.position.y += 0.001;
  g.add(wall);

  // Battlements (InstancedMesh — 1 draw call per wall segment)
  const mkM = chooseMerlonBuilder(style);
  const merlons = mkM(wallMerlonPositions(len, h), sm);
  if (merlons) g.add(merlons);

  // Buttresses on longer walls (guards against Z-fighting with towers by spacing > 3)
  if (len > 7 && p.buttresses !== false) {
    g.add(buildButtresses(len, h, thick, sm));
  }

  return g;
}

// ── ROUND TOWER ──────────────────────────────────────────────────────────
export function buildRoundTower(p, sm, dm, rm, style = 'crusader') {
  const r = p.r || 1.2, h = p.h || 5, y = p.y || 0;

  const g = new THREE.Group();
  g.position.set(p.x, y, p.z);
  g.userData = { label: p.label || '', info: p.info || '' };

  // Body with slight batter (wider base)
  const body = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 1.12, h, 18), sm);
  // Raise by epsilon to avoid Z-fighting with ground plane
  body.position.y = h / 2 + 0.002;
  body.castShadow = true;
  body.receiveShadow = true;
  g.add(body);

  // Battlements (InstancedMesh)
  const mkM = chooseMerlonBuilder(style);
  const merlons = mkM(roundTowerMerlonPositions(r, h), sm);
  if (merlons) g.add(merlons);

  // Hoarding — wooden gallery (European non-fantasy, garrison > 65)
  if (p.hoarding && style === 'crusader') {
    g.add(buildHoarding(r, h, dm));
  }

  // Oriel — one small projecting bay on tall towers
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
  const w = p.w || 2.5, d = p.d || 2.5, h = p.h || 5.5, y = p.y || 0;

  const g = new THREE.Group();
  g.position.set(p.x, y, p.z);
  if (p.rotation) g.rotation.y = p.rotation;
  g.userData = { label: p.label || '', info: p.info || '' };

  const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), sm);
  body.position.y = h / 2 + 0.002;
  body.castShadow = true;
  body.receiveShadow = true;
  g.add(body);

  // Battlements (InstancedMesh)
  const mkM = chooseMerlonBuilder(style);
  const merlons = mkM(squareTowerMerlonPositions(w, d, h), sm);
  if (merlons) g.add(merlons);

  return g;
}

// ── GATE ─────────────────────────────────────────────────────────────────
// Gatehouse with two round flanking towers, passage cutout, portcullis bars.
export function buildGate(p, sm, dm, style = 'crusader') {
  const w = p.w || 4.5, d = p.d || 3.5, h = p.h || 6.0, y = p.y || 0;
  const tR = d * 0.52;   // flanking tower radius
  const tH = h * 1.22;  // towers taller than gatehouse

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

    // Merlons on flanking towers — positions are in gate-group local space
    const mkM = chooseMerlonBuilder(style);
    const merPos = roundTowerMerlonPositions(tR, tH).map(m => ({
      ...m, x: m.x + cx,
    }));
    const merlons = mkM(merPos, sm);
    if (merlons) g.add(merlons);
  });

  // Gatehouse body
  const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), sm);
  body.position.y = h / 2 + 0.002;
  body.castShadow = true;
  body.receiveShadow = true;
  g.add(body);

  // Passage cutout (darker material simulates depth)
  const pW = w * 0.35, pH = h * 0.58;
  const pass = new THREE.Mesh(new THREE.BoxGeometry(pW, pH, d * 1.1), dm || sm);
  pass.position.y = pH / 2;
  g.add(pass);

  // Portcullis bar hints (not for ancient style — too early)
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

// ── GLACIS ───────────────────────────────────────────────────────────────
// Sloped stone plinth — CylinderGeometry with different top/bottom radii.
export function buildGlacis(p, sm) {
  const rTop = p.rTop || 6, rBot = p.rBot || 9, h = p.h || 3, y = p.y || 0;

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
// Connects an array of tower points in a closed ring via walls.
// gate:{atIndex,…} replaces one wall segment with a gatehouse.
// squareTowers flag switches all towers to SquareTower (ancient style).
export function buildRing(p, sm, dm, rm, style = 'crusader') {
  const pts = p.points || [], n = pts.length, y = p.y || 0;
  if (n < 2) return null;

  const wH = p.wall?.h || 3;
  const wT = p.wall?.thick || 0.8;
  const gt = p.gate;
  const useSq = p.squareTowers;

  const g = new THREE.Group();
  g.userData = { label: p.label || '', info: p.info || '' };

  pts.forEach((pt, i) => {
    const ptY = y + (pt.y || 0);

    // Tower at this vertex
    if (useSq) {
      g.add(buildSquareTower(
        { ...pt, w: (pt.r || 1.2) * 2, d: (pt.r || 1.2) * 2, y: ptY },
        sm, dm, rm, style,
      ));
    } else {
      g.add(buildRoundTower({ ...pt, y: ptY }, sm, dm, rm, style));
    }

    // Wall or gate to next tower (ring closes on last segment)
    const nx = pts[(i + 1) % n];
    const mx = (pt.x + nx.x) / 2;
    const mz = (pt.z + nx.z) / 2;

    if (gt && gt.atIndex === i) {
      g.add(buildGate(
        { ...gt, x: mx, z: mz, y, rotation: Math.atan2(mx, mz) },
        sm, dm, style,
      ));
    } else {
      g.add(buildWall(
        { x: pt.x, z: pt.z, x2: nx.x, z2: nx.z, h: pt.wallH || wH, y, thick: wT, label: '', info: '' },
        sm, dm, style,
      ));
    }
  });

  return g;
}

// ── Component dispatcher ──────────────────────────────────────────────────
export function buildComponent(comp, sm, dm, rm, style = 'crusader') {
  switch (comp.type) {
    case 'WALL':         return buildWall(comp, sm, dm, style);
    case 'ROUND_TOWER':  return buildRoundTower(comp, sm, dm, rm, style);
    case 'SQUARE_TOWER': return buildSquareTower(comp, sm, dm, rm, style);
    case 'GATE':         return buildGate(comp, sm, dm, style);
    case 'GLACIS':       return buildGlacis(comp, sm);
    case 'RING':         return buildRing(comp, sm, dm, rm, style);
    default: return null;
  }
}
