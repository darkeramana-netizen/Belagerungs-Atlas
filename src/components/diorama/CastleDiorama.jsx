import { useEffect, useRef } from 'react';

const TW = 36, TH = 18;

// ── Seeded LCG — deterministic per castle.id ──────────────────────────────
function mkRng(str) {
  let s = [...(str || 'x')].reduce((a, c) => (a * 31 + c.charCodeAt(0)) | 0, 0x87654321);
  return () => { s = (Math.imul(s, 1664525) + 1013904223) | 0; return (s >>> 0) / 0x100000000; };
}

// ── Color palettes by region ──────────────────────────────────────────────
const PAL = {
  europa:      { gT:'#556644',gL:'#3a4530',gR:'#283020', wT:'#9a9085',wL:'#7a7065',wR:'#5a5045', tT:'#706860',tL:'#504840',tR:'#303020' },
  nahost:      { gT:'#806850',gL:'#604838',gR:'#403028', wT:'#c8a878',wL:'#a88858',wR:'#886840', tT:'#a07848',tL:'#805830',tR:'#603820' },
  ostasien:    { gT:'#485640',gL:'#303c2a',gR:'#20281a', wT:'#c8c8b8',wL:'#989888',wR:'#686858', tT:'#3a2e20',tL:'#281e14',tR:'#180e08' },
  suedostasien:{ gT:'#506840',gL:'#384830',gR:'#283020', wT:'#a09880',wL:'#807868',wR:'#605850', tT:'#6a5840',tL:'#4a3828',tR:'#302818' },
  suedamerika: { gT:'#687838',gL:'#485428',gR:'#303818', wT:'#c87848',wL:'#a05838',wR:'#783828', tT:'#a06030',tL:'#784020',tR:'#502810' },
  mittelerde:  { gT:'#1e1e2a',gL:'#141420',gR:'#0c0c14', wT:'#404060',wL:'#2a2a44',wR:'#1a1a2c', tT:'#303050',tL:'#1e1e38',tR:'#121226' },
  westeros:    { gT:'#384848',gL:'#283434',gR:'#182020', wT:'#888898',wL:'#686878',wR:'#484858', tT:'#585868',tL:'#383848',tR:'#282830' },
};
PAL.default = PAL.europa;

// ── Layout-Stil je nach Region und Ratings wählen ─────────────────────────
function selectStyle(castle) {
  const region = castle?.region || 'europa';
  const rat    = castle?.ratings || {};
  if (region === 'ostasien' || region === 'suedostasien') return 'japanese';
  if (region === 'suedamerika')                            return 'pyramid';
  if (region === 'mittelerde')                             return 'spire';
  if ((rat.walls || 70) >= 90)                             return 'concentric';
  return 'standard';
}

// ── Hauptkomponente ───────────────────────────────────────────────────────
export default function CastleDiorama({ castle }) {
  const ref = useRef(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    render(ctx, canvas.width, canvas.height, castle);
  }, [castle?.id]);

  const ac = castle?.theme?.accent || '#c9a84c';
  return (
    <div style={{ width:'100%', background:'#060504', borderRadius:'8px', overflow:'hidden', position:'relative', userSelect:'none' }}>
      <canvas ref={ref} width={600} height={380} style={{ width:'100%', display:'block' }} />
      <div style={{
        position:'absolute', bottom:8, left:10, right:10,
        display:'flex', justifyContent:'space-between', alignItems:'flex-end',
        fontSize:'11px', fontFamily:'monospace', pointerEvents:'none',
      }}>
        <span style={{ color:'rgba(255,255,255,0.38)' }}>{castle?.name}</span>
        <span style={{ color: ac + '88', fontSize:'10px' }}>{castle?.era}</span>
      </div>
    </div>
  );
}

// ── Renderer ──────────────────────────────────────────────────────────────
function render(ctx, W, H, castle) {
  const rng   = mkRng(castle?.id || 'x');
  const ac    = castle?.theme?.accent || '#c9a84c';
  const pal   = PAL[castle?.region] || PAL.default;
  const rat   = castle?.ratings || { walls:70, garrison:60, morale:70, supply:70, position:60 };
  const style = selectStyle(castle);

  const cx = W / 2, cy = H * 0.37;
  const pt = (gx, gy, gz = 0) => [cx + (gx - gy) * TW / 2, cy + (gx + gy) * TH / 2 - gz * TH];

  const blks = [];
  const add  = (bx, by, bz, bh, t, l, r) => blks.push({ bx, by, bz, bh, t, l, r });

  // Bodenplatte mit zufälligen Unebenheiten am Rand
  const addGround = (R) => {
    for (let x = -R; x <= R; x++)
      for (let y = -R; y <= R; y++) {
        const outer = Math.max(Math.abs(x), Math.abs(y)) > R - 2;
        add(x, y, -1, (outer && rng() < 0.12) ? 2 : 1, pal.gT, pal.gL, pal.gR);
      }
  };

  // ── Layouts ───────────────────────────────────────────────────────────────

  if (style === 'japanese') {
    // Gestufter japanischer Burgturm (Tenshu): weiße Plattformen, dunkle Dächer
    const base   = 1 + Math.floor(rat.walls    / 50);  // 1-3 Basis
    const tierH  = 2 + Math.floor(rat.garrison / 40);  // 2-4 pro Etage
    const tiers  = 1 + Math.floor(rat.morale   / 35);  // 1-3 Stockwerke
    addGround(6);
    // Steinbasis: 7×7
    for (let x = -3; x <= 3; x++) for (let y = -3; y <= 3; y++)
      add(x, y, 0, base, pal.wT, pal.wL, pal.wR);
    // Turmetagen: jede Ebene schmaler
    const radii = [2, 1, 0];
    let z = base;
    for (let i = 0; i < Math.min(tiers, 3); i++) {
      const s = radii[i];
      for (let x = -s; x <= s; x++) for (let y = -s; y <= s; y++)
        add(x, y, z, tierH, pal.wT, pal.wL, pal.wR);
      // Dunkles Dach oben drauf (1 Block flach)
      for (let x = -s; x <= s; x++) for (let y = -s; y <= s; y++)
        add(x, y, z + tierH, 1, pal.tT, pal.tL, pal.tR);
      z += tierH + 1;
    }

  } else if (style === 'pyramid') {
    // Mesoamerikanische Stufenpyramide
    const rings  = 3 + Math.floor(rat.walls / 35);  // 3-5 Stufen
    addGround(rings + 2);
    for (let ring = 0; ring < rings; ring++) {
      const r = rings - ring;  // Radius wird kleiner
      const h = ring + 1;      // Höhe nimmt zu
      for (let x = -r; x <= r; x++) for (let y = -r; y <= r; y++)
        if (Math.max(Math.abs(x), Math.abs(y)) === r)
          add(x, y, 0, h, pal.wT, pal.wL, pal.wR);
    }
    // Tempel auf dem Gipfel (2×2, einen Block höher als oberste Stufe)
    const shrineH = rings + 1 + Math.floor(rat.morale / 40);
    add(-1, -1, 0, shrineH, pal.tT, pal.tL, pal.tR);
    add( 0, -1, 0, shrineH, pal.tT, pal.tL, pal.tR);
    add(-1,  0, 0, shrineH, pal.tT, pal.tL, pal.tR);
    add( 0,  0, 0, shrineH, pal.tT, pal.tL, pal.tR);

  } else if (style === 'spire') {
    // Dunkler asymmetrischer Fantasy-Turm (Mittelerde)
    const baseH = 1 + Math.floor(rat.walls / 40);
    const spireH = 5 + Math.floor(rat.morale / 18);
    addGround(5);
    // Unregelmäßige Basis: 5×5, Ecken zufällig gekappt
    for (let x = -2; x <= 2; x++) for (let y = -2; y <= 2; y++)
      if (!(Math.abs(x) === 2 && Math.abs(y) === 2 && rng() < 0.55))
        add(x, y, 0, baseH, pal.wT, pal.wL, pal.wR);
    // Hauptturm (2×1 — leicht asymmetrisch)
    add(-1, -1, baseH, spireH,     pal.tT, pal.tL, pal.tR);
    add( 0, -1, baseH, spireH,     pal.tT, pal.tL, pal.tR);
    add(-1,  0, baseH, spireH - 1, pal.tT, pal.tL, pal.tR);
    // Sekundäre Vorsprünge auf zufälligen Höhen (seeded)
    const juts = [[-2,-1], [1,0], [-1,1], [0,-2]];
    for (const [jx, jy] of juts) {
      const jz  = baseH + Math.floor(rng() * spireH * 0.6);
      const jh  = 1 + Math.floor(rng() * 2);
      add(jx, jy, jz, jh, pal.tT, pal.tL, pal.tR);
    }

  } else if (style === 'concentric') {
    // Konzentrische Mauerringe — Kreuzritter-/Edwardianischer Stil
    const outerR = 4 + Math.floor(rat.supply   / 34);  // 4-6
    const wallH  = 1 + Math.floor(rat.walls    / 40);  // 1-3
    const towerH = wallH + 2;
    addGround(outerR + 2);
    // Äußerer Ring
    for (let x = -outerR; x <= outerR; x++) for (let y = -outerR; y <= outerR; y++) {
      const atX = Math.abs(x) === outerR, atY = Math.abs(y) === outerR;
      if (!atX && !atY) continue;
      if (x === 0 && y === outerR) continue;
      const corner = atX && atY;
      add(x, y, 0, corner ? towerH : wallH, corner ? pal.tT : pal.wT, corner ? pal.tL : pal.wL, corner ? pal.tR : pal.wR);
    }
    // Innerer Ring (2 Tiles kleiner, um 1 Block höher)
    const innerR = outerR - 2;
    for (let x = -innerR; x <= innerR; x++) for (let y = -innerR; y <= innerR; y++) {
      const atX = Math.abs(x) === innerR, atY = Math.abs(y) === innerR;
      if (!atX && !atY) continue;
      if (x === 0 && y === innerR) continue;
      const corner = atX && atY;
      add(x, y, 0, corner ? towerH + 2 : wallH + 1, corner ? pal.tT : pal.wT, corner ? pal.tL : pal.wL, corner ? pal.tR : pal.wR);
    }
    // Torhaustürme
    add(-1, outerR, 0, wallH + 2, pal.tT, pal.tL, pal.tR);
    add( 1, outerR, 0, wallH + 2, pal.tT, pal.tL, pal.tR);
    // Zentraler Bergfried
    const kh = 3 + Math.floor(rat.morale / 25);
    for (let x = -1; x <= 0; x++) for (let y = -1; y <= 0; y++)
      add(x, y, 0, kh, pal.tT, pal.tL, pal.tR);

  } else {
    // Standard — rechteckiger Hof, Bergfried seeded versetzt
    const xR    = 3 + Math.floor(rat.supply   / 25);
    const yR    = Math.max(3, xR + Math.round(rng() * 4 - 2));  // ±2 Asymmetrie
    const wallH  = 1 + Math.floor(rat.walls    / 40);
    const towerH = wallH + 1 + Math.floor(rat.garrison / 40);
    const kh    = 3 + Math.floor(rat.morale   / 20);
    addGround(Math.max(xR, yR) + 2);
    // Außenmauer
    for (let x = -xR; x <= xR; x++) for (let y = -yR; y <= yR; y++) {
      const atX = Math.abs(x) === xR, atY = Math.abs(y) === yR;
      if (!atX && !atY) continue;
      if (x === 0 && y === yR) continue;
      const corner = atX && atY;
      add(x, y, 0, corner ? towerH : wallH, corner ? pal.tT : pal.wT, corner ? pal.tL : pal.wL, corner ? pal.tR : pal.wR);
    }
    // Torhaustürme
    add(-1, yR, 0, wallH + 2, pal.tT, pal.tL, pal.tR);
    add( 1, yR, 0, wallH + 2, pal.tT, pal.tL, pal.tR);
    // Wandtürme (bei hoher Garnison)
    if (rat.garrison >= 50) {
      const mid = Math.round(xR * 0.5);
      [[-xR, mid], [-xR, -mid], [xR, mid], [xR, -mid], [mid, -yR], [-mid, -yR]].forEach(([x, y]) => {
        if (Math.abs(x) === xR || Math.abs(y) === yR) add(x, y, 0, towerH - 1, pal.tT, pal.tL, pal.tR);
      });
    }
    if (rat.garrison >= 85) {
      const mid2 = Math.round(xR * 0.75);
      [[-xR, mid2], [-xR, -mid2], [xR, mid2], [xR, -mid2]].forEach(([x, y]) => {
        if (Math.abs(x) === xR || Math.abs(y) === yR) add(x, y, 0, towerH, pal.tT, pal.tL, pal.tR);
      });
    }
    // Bergfried: leicht versetzt (seeded)
    const kx = rng() < 0.38 ? Math.round(rng() * 2 - 1) : 0;
    for (let x = -1; x <= 0; x++) for (let y = -1; y <= 0; y++)
      add(x + kx, y, 0, kh, pal.tT, pal.tL, pal.tR);
  }

  // ── Painter's Algorithm: hinten → vorne ───────────────────────────────────
  blks.sort((a, b) => (a.bx + a.by) - (b.bx + b.by) || a.bz - b.bz);
  for (const { bx, by, bz, bh, t, l, r } of blks)
    drawBlock(ctx, pt, bx, by, bz, bh, t, l, r);

  // ── Akzentglühen am höchsten Punkt (kein Flaggenmast) ────────────────────
  let maxZ = -Infinity, apexGx = 0, apexGy = 0;
  for (const b of blks) {
    if (b.bz + b.bh > maxZ) { maxZ = b.bz + b.bh; apexGx = b.bx + 0.5; apexGy = b.by + 0.5; }
  }
  const [apx, apy] = pt(apexGx, apexGy, maxZ);
  const glow = ctx.createRadialGradient(apx, apy - 2, 0, apx, apy - 2, 14);
  glow.addColorStop(0,   ac + 'cc');
  glow.addColorStop(0.3, ac + '55');
  glow.addColorStop(1,   ac + '00');
  ctx.fillStyle = glow;
  ctx.beginPath(); ctx.arc(apx, apy - 2, 14, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.globalAlpha = 0.85;
  ctx.beginPath(); ctx.arc(apx, apy - 2, 1.5, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = 1;

  // ── Vignette ──────────────────────────────────────────────────────────────
  const vg = ctx.createRadialGradient(W / 2, H / 2, H * 0.18, W / 2, H / 2, H * 0.72);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(0,0,0,0.58)');
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, W, H);
}

// ── Isometrischer Block: Decke + linke + rechte Wand ─────────────────────
function drawBlock(ctx, pt, bx, by, bz, bh, topC, lftC, rgtC) {
  const z0 = bz, z1 = bz + bh;
  const ol = 'rgba(0,0,0,0.22)';

  // Deckfläche
  const [ax, ay]   = pt(bx,   by,   z1);
  const [bpx, bpy] = pt(bx+1, by,   z1);
  const [cpx, cpy] = pt(bx+1, by+1, z1);
  const [dpx, dpy] = pt(bx,   by+1, z1);
  ctx.beginPath();
  ctx.moveTo(ax, ay); ctx.lineTo(bpx, bpy); ctx.lineTo(cpx, cpy); ctx.lineTo(dpx, dpy);
  ctx.closePath(); ctx.fillStyle = topC; ctx.fill();
  ctx.strokeStyle = ol; ctx.lineWidth = 0.5; ctx.stroke();

  // Linke Wand (y+1-Seite)
  const [lax, lay] = pt(bx,   by+1, z1);
  const [lbx, lby] = pt(bx+1, by+1, z1);
  const [lcx, lcy] = pt(bx+1, by+1, z0);
  const [ldx, ldy] = pt(bx,   by+1, z0);
  ctx.beginPath();
  ctx.moveTo(lax, lay); ctx.lineTo(lbx, lby); ctx.lineTo(lcx, lcy); ctx.lineTo(ldx, ldy);
  ctx.closePath(); ctx.fillStyle = lftC; ctx.fill();
  ctx.strokeStyle = ol; ctx.lineWidth = 0.5; ctx.stroke();

  // Rechte Wand (x+1-Seite)
  const [rax, ray] = pt(bx+1, by,   z1);
  const [rbx, rby] = pt(bx+1, by+1, z1);
  const [rcx, rcy] = pt(bx+1, by+1, z0);
  const [rdx, rdy] = pt(bx+1, by,   z0);
  ctx.beginPath();
  ctx.moveTo(rax, ray); ctx.lineTo(rbx, rby); ctx.lineTo(rcx, rcy); ctx.lineTo(rdx, rdy);
  ctx.closePath(); ctx.fillStyle = rgtC; ctx.fill();
  ctx.strokeStyle = ol; ctx.lineWidth = 0.5; ctx.stroke();
}
