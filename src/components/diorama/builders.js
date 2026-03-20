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

  // Hoarding — wooden gallery (European non-fantasy, high-garrison castles)
  if (p.hoarding && style === 'crusader') {
    g.add(buildHoarding(r, h, dm));
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
    case 'WALL':         return buildWall(comp, sm, dm, style);
    case 'ROUND_TOWER':  return buildRoundTower(comp, sm, dm, rm, style);
    case 'SQUARE_TOWER': return buildSquareTower(comp, sm, dm, rm, style);
    case 'GATE':         return buildGate(comp, sm, dm, rm, style);
    case 'GLACIS':       return buildGlacis(comp, gm || sm);
    case 'RING':         return buildRing(comp, sm, dm, rm, style);
    default: return null;
  }
}
