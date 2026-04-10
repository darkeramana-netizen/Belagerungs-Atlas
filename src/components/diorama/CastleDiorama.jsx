import { useEffect, useRef } from 'react';

// ── Isometric tile dimensions ──────────────────────────────────────────────
const TW = 36, TH = 18;

// ── Seeded LCG random (deterministic per castle.id) ──────────────────────
function mkRng(str) {
  let s = [...(str || 'castle')].reduce((a, c) => (a * 31 + c.charCodeAt(0)) | 0, 0x87654321);
  return () => { s = (Math.imul(s, 1664525) + 1013904223) | 0; return (s >>> 0) / 0x100000000; };
}

// ── Color palettes by region ───────────────────────────────────────────────
const PAL = {
  europa:      { gT:'#556644', gL:'#3a4530', gR:'#283020', wT:'#9a9085', wL:'#7a7065', wR:'#5a5045', tT:'#807868', tL:'#605850', tR:'#403830' },
  nahost:      { gT:'#806850', gL:'#604838', gR:'#403028', wT:'#c8a878', wL:'#a88858', wR:'#886840', tT:'#b08868', tL:'#907048', tR:'#705030' },
  ostasien:    { gT:'#485640', gL:'#303c2a', gR:'#20281a', wT:'#c8c8b8', wL:'#989888', wR:'#686858', tT:'#383028', tL:'#281e18', tR:'#181208' },
  suedostasien:{ gT:'#506840', gL:'#384830', gR:'#283020', wT:'#a09880', wL:'#807868', wR:'#605850', tT:'#6a5840', tL:'#4a3828', tR:'#302818' },
  suedamerika: { gT:'#687838', gL:'#485428', gR:'#303818', wT:'#c87848', wL:'#a05838', wR:'#783828', tT:'#a06030', tL:'#784020', tR:'#502810' },
  mittelerde:  { gT:'#252535', gL:'#181825', gR:'#101018', wT:'#454565', wL:'#2e2e4e', wR:'#1e1e32', tT:'#353558', tL:'#22223a', tR:'#161622' },
  westeros:    { gT:'#384848', gL:'#283434', gR:'#182020', wT:'#888898', wL:'#686878', wR:'#484858', tT:'#585868', tL:'#383848', tR:'#282830' },
};
PAL.default = PAL.europa;

// ── Main component ─────────────────────────────────────────────────────────
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
    <div style={{
      width: '100%', background: '#060504', borderRadius: '8px',
      overflow: 'hidden', position: 'relative', userSelect: 'none'
    }}>
      <canvas ref={ref} width={600} height={380} style={{ width: '100%', display: 'block' }} />
      <div style={{
        position: 'absolute', bottom: 8, left: 10, right: 10,
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end',
        fontSize: '11px', fontFamily: 'monospace', pointerEvents: 'none',
      }}>
        <span style={{ color: 'rgba(255,255,255,0.38)' }}>{castle?.name}</span>
        <span style={{ color: ac + '88', fontSize: '10px' }}>{castle?.era}</span>
      </div>
    </div>
  );
}

// ── Renderer ───────────────────────────────────────────────────────────────
function render(ctx, W, H, castle) {
  const rng  = mkRng(castle?.id || 'default');
  const ac   = castle?.theme?.accent || '#c9a84c';
  const pal  = PAL[castle?.region] || PAL.default;
  const rat  = castle?.ratings || { walls: 70, garrison: 60, morale: 70, supply: 70, position: 60 };

  // Castle dimensions derived from ratings
  const wallH  = 1 + Math.floor(rat.walls    / 40);  // 1–3  blocks tall
  const towerH = wallH + 1 + Math.floor(rat.garrison / 40); // 2–5
  const yardR  = 3 + Math.floor(rat.supply   / 25);  // 3–7  tiles from center
  const keepH  = 3 + Math.floor(rat.morale   / 20);  // 3–8  blocks tall

  // Isometric origin: canvas center, shifted up slightly
  const cx = W / 2, cy = H * 0.37;
  const pt = (gx, gy, gz = 0) => [cx + (gx - gy) * TW / 2, cy + (gx + gy) * TH / 2 - gz * TH];

  // ── Build block list ─────────────────────────────────────────────────────
  const blks = [];
  const add  = (bx, by, bz, bh, top, lft, rgt) => blks.push({ bx, by, bz, bh, top, lft, rgt });

  // Ground plane with random bumps outside the walls
  const gR = yardR + 2;
  for (let x = -gR; x <= gR; x++)
    for (let y = -gR; y <= gR; y++) {
      const outside = Math.max(Math.abs(x), Math.abs(y)) > yardR;
      const bump = (outside && rng() < 0.12) ? 1 : 0;
      add(x, y, -1, 1 + bump, pal.gT, pal.gL, pal.gR);
    }

  // Outer wall ring (perimeter of yardR square)
  for (let x = -yardR; x <= yardR; x++)
    for (let y = -yardR; y <= yardR; y++) {
      const atX = Math.abs(x) === yardR, atY = Math.abs(y) === yardR;
      if (!atX && !atY) continue;          // interior — skip
      if (x === 0 && y === yardR) continue; // gate opening
      const corner = atX && atY;
      const h  = corner ? towerH : wallH;
      const tc = corner ? pal.tT : pal.wT;
      const lc = corner ? pal.tL : pal.wL;
      const rc = corner ? pal.tR : pal.wR;
      add(x, y, 0, h, tc, lc, rc);
    }

  // Gatehouse: two flanking towers beside the gate gap
  add(-1, yardR, 0, wallH + 2, pal.tT, pal.tL, pal.tR);
  add( 1, yardR, 0, wallH + 2, pal.tT, pal.tL, pal.tR);

  // Mid-wall towers (appear when garrison ≥ 50)
  if (rat.garrison >= 50) {
    const mid = Math.round(yardR * 0.5);
    const sides = [[-yardR, mid], [-yardR, -mid], [yardR, mid], [yardR, -mid], [mid, -yardR], [-mid, -yardR]];
    for (const [x, y] of sides)
      if (Math.abs(x) === yardR || Math.abs(y) === yardR)
        add(x, y, 0, towerH - 1, pal.tT, pal.tL, pal.tR);
  }

  // Second ring of mid-wall towers (appear when garrison ≥ 85)
  if (rat.garrison >= 85) {
    const mid2 = Math.round(yardR * 0.75);
    const sides2 = [[-yardR, mid2], [-yardR, -mid2], [yardR, mid2], [yardR, -mid2], [mid2, -yardR], [-mid2, -yardR]];
    for (const [x, y] of sides2)
      if (Math.abs(x) === yardR || Math.abs(y) === yardR)
        add(x, y, 0, towerH, pal.tT, pal.tL, pal.tR);
  }

  // Central keep: 2×2 tile block, taller than everything
  for (let x = -1; x <= 0; x++)
    for (let y = -1; y <= 0; y++)
      add(x, y, 0, keepH, pal.tT, pal.tL, pal.tR);

  // ── Painter's algorithm: sort back-to-front (ascending bx+by) ────────────
  blks.sort((a, b) => (a.bx + a.by) - (b.bx + b.by) || a.bz - b.bz);

  // ── Draw all blocks ──────────────────────────────────────────────────────
  for (const { bx, by, bz, bh, top, lft, rgt } of blks)
    drawBlock(ctx, pt, bx, by, bz, bh, top, lft, rgt);

  // ── Flag on keep top ─────────────────────────────────────────────────────
  const [fpx, fpy] = pt(-0.5, -0.5, keepH);
  ctx.strokeStyle = '#b0988a';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(fpx, fpy);
  ctx.lineTo(fpx, fpy - 22);
  ctx.stroke();
  ctx.fillStyle = ac;
  ctx.beginPath();
  ctx.moveTo(fpx,      fpy - 22);
  ctx.lineTo(fpx + 13, fpy - 17);
  ctx.lineTo(fpx,      fpy - 12);
  ctx.closePath();
  ctx.fill();

  // ── Ambient fog vignette ──────────────────────────────────────────────────
  const grad = ctx.createRadialGradient(W / 2, H / 2, H * 0.2, W / 2, H / 2, H * 0.7);
  grad.addColorStop(0, 'rgba(0,0,0,0)');
  grad.addColorStop(1, 'rgba(0,0,0,0.55)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);
}

// ── Isometric block: draws top + left + right faces ────────────────────────
function drawBlock(ctx, pt, bx, by, bz, bh, topC, lftC, rgtC) {
  const z0 = bz, z1 = bz + bh;
  const ol = 'rgba(0,0,0,0.2)';

  // Top face
  const [ax, ay]   = pt(bx,   by,   z1);
  const [bpx, bpy] = pt(bx+1, by,   z1);
  const [cpx, cpy] = pt(bx+1, by+1, z1);
  const [dpx, dpy] = pt(bx,   by+1, z1);
  ctx.beginPath();
  ctx.moveTo(ax, ay); ctx.lineTo(bpx, bpy); ctx.lineTo(cpx, cpy); ctx.lineTo(dpx, dpy);
  ctx.closePath(); ctx.fillStyle = topC; ctx.fill();
  ctx.strokeStyle = ol; ctx.lineWidth = 0.5; ctx.stroke();

  // Left face (y+1 side — faces viewer bottom-left)
  const [lax, lay] = pt(bx,   by+1, z1);
  const [lbx, lby] = pt(bx+1, by+1, z1);
  const [lcx, lcy] = pt(bx+1, by+1, z0);
  const [ldx, ldy] = pt(bx,   by+1, z0);
  ctx.beginPath();
  ctx.moveTo(lax, lay); ctx.lineTo(lbx, lby); ctx.lineTo(lcx, lcy); ctx.lineTo(ldx, ldy);
  ctx.closePath(); ctx.fillStyle = lftC; ctx.fill();
  ctx.strokeStyle = ol; ctx.lineWidth = 0.5; ctx.stroke();

  // Right face (x+1 side — faces viewer bottom-right)
  const [rax, ray] = pt(bx+1, by,   z1);
  const [rbx, rby] = pt(bx+1, by+1, z1);
  const [rcx, rcy] = pt(bx+1, by+1, z0);
  const [rdx, rdy] = pt(bx+1, by,   z0);
  ctx.beginPath();
  ctx.moveTo(rax, ray); ctx.lineTo(rbx, rby); ctx.lineTo(rcx, rcy); ctx.lineTo(rdx, rdy);
  ctx.closePath(); ctx.fillStyle = rgtC; ctx.fill();
  ctx.strokeStyle = ol; ctx.lineWidth = 0.5; ctx.stroke();
}
