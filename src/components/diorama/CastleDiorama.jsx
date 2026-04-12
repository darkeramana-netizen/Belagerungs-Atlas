import { useEffect, useRef } from 'react';

const TW = 36, TH = 18;

function mkRng(str) {
  let s = [...(str||'x')].reduce((a,c)=>(a*31+c.charCodeAt(0))|0, 0x87654321);
  return ()=>{ s=(Math.imul(s,1664525)+1013904223)|0; return (s>>>0)/0x100000000; };
}

// ── Region-Paletten ───────────────────────────────────────────────────────
const PAL = {
  europa:      {gT:'#556644',gL:'#3a4530',gR:'#283020',wT:'#9a9085',wL:'#7a7065',wR:'#5a5045',tT:'#706860',tL:'#504840',tR:'#303020'},
  nahost:      {gT:'#806850',gL:'#604838',gR:'#403028',wT:'#c8a878',wL:'#a88858',wR:'#886840',tT:'#a07848',tL:'#805830',tR:'#603820'},
  ostasien:    {gT:'#485640',gL:'#303c2a',gR:'#20281a',wT:'#c8c8b8',wL:'#989888',wR:'#686858',tT:'#3a2e20',tL:'#281e14',tR:'#180e08'},
  suedostasien:{gT:'#506840',gL:'#384830',gR:'#283020',wT:'#a09880',wL:'#807868',wR:'#605850',tT:'#6a5840',tL:'#4a3828',tR:'#302818'},
  suedamerika: {gT:'#687838',gL:'#485428',gR:'#303818',wT:'#c87848',wL:'#a05838',wR:'#783828',tT:'#a06030',tL:'#784020',tR:'#502810'},
  mittelerde:  {gT:'#1e1e2a',gL:'#141420',gR:'#0c0c14',wT:'#404060',wL:'#2a2a44',wR:'#1a1a2c',tT:'#303050',tL:'#1e1e38',tR:'#121226'},
  westeros:    {gT:'#384848',gL:'#283434',gR:'#182020',wT:'#888898',wL:'#686878',wR:'#484858',tT:'#585868',tL:'#383848',tR:'#282830'},
};
PAL.default = PAL.europa;

// ── Burg-spezifische Palette-Überschreibungen ─────────────────────────────
const PAL_OVERRIDE = {
  // Persönliche Burgen — Sorrowland
  schwarzer_bergfried: {gT:'#1a1a1a',gL:'#101010',gR:'#080808',wT:'#282828',wL:'#181818',wR:'#101010',tT:'#0e0e0e',tL:'#080808',tR:'#040404'},
  gravecrest:          {gT:'#283028',gL:'#182018',gR:'#101010',wT:'#607060',wL:'#405040',wR:'#283028',tT:'#506050',tL:'#304030',tR:'#182018'},
  castle_sorrow:       {gT:'#1a0c10',gL:'#100808',gR:'#080404',wT:'#2a1018',wL:'#1a0810',wR:'#100408',tT:'#180810',tL:'#100408',tR:'#080204'},
  // Mittelerde
  barad_dur:           {gT:'#200a00',gL:'#140500',gR:'#080200',wT:'#301000',wL:'#200800',wR:'#100400',tT:'#280c00',tL:'#180600',tR:'#0c0200'},
  minas_tirith:        {gT:'#606870',gL:'#404850',gR:'#283038',wT:'#dcd8c8',wL:'#bcb8a8',wR:'#9c9888',tT:'#e8e0d0',tL:'#c8c0b0',tR:'#a8a090'},
  orthanc:             {gT:'#1a1a20',gL:'#101018',gR:'#080810',wT:'#303038',wL:'#202028',wR:'#141420',tT:'#202028',tL:'#141420',tR:'#0c0c14'},
  erebor:              {gT:'#302820',gL:'#201810',gR:'#100c08',wT:'#605040',wL:'#403020',wR:'#281e10',tT:'#504030',tL:'#302818',tR:'#1e1808'},
  // Tempel-Regionen
  angkor:              {gT:'#506040',gL:'#384528',gR:'#202c14',wT:'#c0a870',wL:'#a08848',wR:'#806828',tT:'#a08060',tL:'#806040',tR:'#604020'},
  angkor_thom:         {gT:'#506040',gL:'#384528',gR:'#202c14',wT:'#c0a870',wL:'#a08848',wR:'#806828',tT:'#a08060',tL:'#806040',tR:'#604020'},
  borobudur_fort:      {gT:'#506040',gL:'#384528',gR:'#202c14',wT:'#b89870',wL:'#987848',wR:'#785828',tT:'#907060',tL:'#705040',tR:'#503020'},
  // Wüsten / Felsburgen
  masada:              {gT:'#907848',gL:'#705828',gR:'#503810',wT:'#d4a860',wL:'#b48840',wR:'#8a6820',tT:'#c09840',tL:'#906818',tR:'#6a4c08'},
  alamut:              {gT:'#585040',gL:'#383020',gR:'#201c08',wT:'#908070',wL:'#685848',wR:'#483828',tT:'#786858',tL:'#503828',tR:'#302018'},
  bodiam:              {gT:'#2a4030',gL:'#182a1a',gR:'#0c1810',wT:'#7a7870',wL:'#585850',wR:'#383830',tT:'#585858',tL:'#383838',tR:'#202020'},
  cachtice:            {gT:'#201c18',gL:'#141010',gR:'#0c0808',wT:'#604838',wL:'#402818',wR:'#281408',tT:'#502030',tL:'#301018',tR:'#180808'},
  persepolis:          {gT:'#806040',gL:'#604020',gR:'#402810',wT:'#e0c080',wL:'#c0a060',wR:'#a08040',tT:'#d4a840',tL:'#b08820',tR:'#8a6610'},
};

// ── Per-Burg Layout-Überschreibungen ──────────────────────────────────────
const STYLE_OVERRIDE = {
  // Inselfestung
  mont_michel:    'tidal_island',
  // Terrassenmauern
  sacsayhuaman:   'terrace_walls',
  kuelap:         'terrace_walls',
  // Tempelkomplexe
  angkor:         'temple_complex',
  angkor_thom:    'temple_complex',
  borobudur_fort: 'temple_complex',
  preah_vihear:   'temple_complex',
  // Pyramid-Override (sonst region-basiert)
  minas_tirith:   'pyramid',
  chichen_itza:   'pyramid',
  tenochtitlan:   'pyramid',
  // Berg-Festung
  erebor:         'mountain',
  gravecrest:     'mountain',
  hochosterwitz:  'mountain',
  sigiriya:       'mountain',
  // Konzentrische Burgen (explizit)
  krak:           'concentric',
  carcassonne:    'concentric',
  malbork:        'concentric',
  caerphilly:     'concentric',
  beaumaris:      'concentric',
  conwy:          'concentric',
  conwy_castle:   'concentric',
  windsor:        'concentric',
  caernarvon:     'concentric',
  dover:          'concentric',
  bodiam:         'concentric',  // Wassergraben-Burg
  kenilworth:     'concentric',  // Seefestung
  bagdad:         'concentric',  // Kreisstadt
  // Bergfestungen
  masada:         'mountain',
  alamut:         'mountain',
  cachtice:       'mountain',
  // Terrassenanlagen
  persepolis:     'terrace_walls',
  caral:          'terrace_walls',
  chan_chan:       'terrace_walls',
};

function selectStyle(castle) {
  const id     = castle?.id || '';
  const plan   = castle?.plan;
  const region = castle?.region || 'europa';
  const rat    = castle?.ratings || {};
  if (STYLE_OVERRIDE[id])                               return STYLE_OVERRIDE[id];
  if (plan === 'tower')                                 return 'octagon_tower';  // barad_dur, schwarzer_bergfried, orthanc
  if (plan === 'mountain')                              return 'mountain';
  if (region === 'ostasien' || region === 'suedostasien') return 'japanese';
  if (region === 'suedamerika')                         return 'pyramid';
  if (region === 'mittelerde')                          return 'spire';
  if ((rat.walls || 70) >= 90)                          return 'concentric';
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
    <div style={{width:'100%',background:'#060504',borderRadius:'8px',overflow:'hidden',position:'relative',userSelect:'none'}}>
      <canvas ref={ref} width={600} height={380} style={{width:'100%',display:'block'}}/>
      <div style={{position:'absolute',bottom:8,left:10,right:10,display:'flex',
        justifyContent:'space-between',alignItems:'flex-end',
        fontSize:'11px',fontFamily:'monospace',pointerEvents:'none'}}>
        <span style={{color:'rgba(255,255,255,0.38)'}}>{castle?.name}</span>
        <span style={{color:ac+'88',fontSize:'10px'}}>{castle?.era}</span>
      </div>
    </div>
  );
}

// ── Renderer ──────────────────────────────────────────────────────────────
function render(ctx, W, H, castle) {
  const rng   = mkRng(castle?.id || 'x');
  const ac    = castle?.theme?.accent || '#c9a84c';
  const base  = PAL[castle?.region] || PAL.default;
  const pal   = { ...base, ...(PAL_OVERRIDE[castle?.id] || {}) };
  const rat   = castle?.ratings || {walls:70,garrison:60,morale:70,supply:70,position:60};
  const style = selectStyle(castle);

  const cx = W/2, cy = H*0.37;
  const pt = (gx,gy,gz=0) => [cx+(gx-gy)*TW/2, cy+(gx+gy)*TH/2-gz*TH];

  const blks = [];
  const add  = (bx,by,bz,bh,t,l,r) => blks.push({bx,by,bz,bh,t,l,r});

  const addGround = (R, hFn) => {
    for (let x=-R; x<=R; x++)
      for (let y=-R; y<=R; y++) {
        const outer = Math.max(Math.abs(x),Math.abs(y)) > R-2;
        const h = hFn ? hFn(x,y) : ((outer && rng()<0.12) ? 2 : 1);
        add(x, y, -1, h, pal.gT, pal.gL, pal.gR);
      }
  };

  // ── Layouts ───────────────────────────────────────────────────────────────

  if (style === 'octagon_tower') {
    // Massiver Oktagonturm — schwarzer_bergfried, barad_dur, orthanc
    const baseH = 2;
    const H2    = 7 + Math.floor(rat.walls / 15);   // 7–13 Blöcke
    addGround(5);
    // Breiter Ring als Basis (7×7 minus Ecken)
    for (let x=-3; x<=3; x++) for (let y=-3; y<=3; y++)
      if (!(Math.abs(x)===3 && Math.abs(y)===3))
        add(x, y, 0, baseH, pal.wT, pal.wL, pal.wR);
    // Oktagonaler Hauptturm: 5×5 minus Diagonalechken
    for (let x=-2; x<=2; x++) for (let y=-2; y<=2; y++)
      if (!(Math.abs(x)===2 && Math.abs(y)===2))
        add(x, y, baseH, H2, pal.tT, pal.tL, pal.tR);

  } else if (style === 'mountain') {
    // Burg auf Berggipfel — gravecrest, masada, alamut, hochosterwitz
    const peakH = 3 + Math.floor(rat.position / 25);  // 3–7, stärker positions-abhängig
    addGround(8, (x,y) => {
      const d = Math.sqrt(x*x+y*y);
      return Math.max(1, peakH - Math.floor(d * 1.0));  // steileres Terrain
    });
    // Felsplateau als Unterbau
    for (let x=-3; x<=3; x++) for (let y=-3; y<=3; y++)
      if (!(Math.abs(x)===3 && Math.abs(y)===3))
        add(x, y, peakH-1, 2, pal.gT, pal.gL, pal.gR);
    // Mauern auf dem Gipfel
    const wallH = 1 + Math.floor(rat.walls/40);
    const kh = 3 + Math.floor(rat.morale/22);
    for (let x=-2; x<=2; x++) for (let y=-2; y<=2; y++) {
      const atX=Math.abs(x)===2, atY=Math.abs(y)===2;
      if (!atX && !atY) continue;
      if (x===0 && y===2) continue;
      const corner=atX&&atY;
      add(x,y,peakH+1,corner?wallH+3:wallH,corner?pal.tT:pal.wT,corner?pal.tL:pal.wL,corner?pal.tR:pal.wR);
    }
    // Gipfelturm/Bergfried
    for (let x=-1; x<=0; x++) for (let y=-1; y<=0; y++)
      add(x, y, peakH+1, kh, pal.tT, pal.tL, pal.tR);
    // Zinnen auf Mauern
    for (let x=-2; x<=2; x++) {
      if ((x+100)%2===0) {
        add(x,-2,peakH+1+wallH,1,pal.wT,pal.wL,pal.wR);
        if (x!==0) add(x,2,peakH+1+wallH,1,pal.wT,pal.wL,pal.wR);
      }
    }

  } else if (style === 'tidal_island') {
    // Inselfestung auf Fels — mont_michel
    const gR = 7;
    for (let x=-gR; x<=gR; x++) for (let y=-gR; y<=gR; y++) {
      const d = Math.sqrt(x*x + y*y);
      if      (d > 4.5) add(x,y,-1,1,'#2a5888','#1a4068','#0e2848'); // Wasser
      else if (d > 3.5) add(x,y,-1,2, pal.gT, pal.gL, pal.gR);      // Küste
      else              add(x,y,-1,3, pal.gT, pal.gL, pal.gR);       // Fels (top z=2)
    }
    // Burg auf dem Fels (bz=2)
    const wallH=1+Math.floor(rat.walls/40), kh=3+Math.floor(rat.morale/25);
    for (let x=-3; x<=3; x++) for (let y=-3; y<=3; y++) {
      const atX=Math.abs(x)===3, atY=Math.abs(y)===3;
      if (!atX&&!atY) continue; if (x===0&&y===3) continue;
      const corner=atX&&atY;
      add(x,y,2,corner?wallH+2:wallH,corner?pal.tT:pal.wT,corner?pal.tL:pal.wL,corner?pal.tR:pal.wR);
    }
    add(-1,3,2,wallH+2,pal.tT,pal.tL,pal.tR); add(1,3,2,wallH+2,pal.tT,pal.tL,pal.tR);
    for (let x=-1; x<=0; x++) for (let y=-1; y<=0; y++)
      add(x, y, 2, kh, pal.tT, pal.tL, pal.tR);

  } else if (style === 'terrace_walls') {
    // Drei gestufte Terrassenmauern — sacsayhuamán, kuelap
    addGround(9);
    const configs = [
      {wy:5, wh:2, xL:6},
      {wy:1, wh:3, xL:4},
      {wy:-2,wh:4, xL:3},
    ];
    for (const {wy,wh,xL} of configs) {
      for (let x=-xL; x<=xL; x++) {
        // Zickzack alle 2 Tiles
        const zz = Math.floor((x+xL)/2) % 2;
        add(x, wy+zz,   0, wh,   pal.wT, pal.wL, pal.wR);
        add(x, wy+zz+1, 0, wh-1, pal.wT, pal.wL, pal.wR);
      }
    }
    // Plattform ganz oben
    const th = 2 + Math.floor(rat.morale/30);
    add(-1,-4,0,th,pal.tT,pal.tL,pal.tR); add(0,-4,0,th,pal.tT,pal.tL,pal.tR);

  } else if (style === 'temple_complex') {
    // Zentraltempel + 4 Ecktürme — angkor, borobudur
    const baseR = 5;
    addGround(baseR+2);
    // Äußerer Plattformring
    for (let x=-baseR; x<=baseR; x++) for (let y=-baseR; y<=baseR; y++)
      if (Math.max(Math.abs(x),Math.abs(y))===baseR)
        add(x,y,0,1+Math.floor(rat.walls/50),pal.wT,pal.wL,pal.wR);
    // Zentraler 3-stufiger Tempel
    for (let ring=0; ring<3; ring++) {
      const r=3-ring, h=ring+1;
      for (let x=-r; x<=r; x++) for (let y=-r; y<=r; y++)
        if (Math.max(Math.abs(x),Math.abs(y))===r)
          add(x,y,0,h,pal.wT,pal.wL,pal.wR);
    }
    const kh = 3+Math.floor(rat.morale/25);
    for (let x=-1; x<=0; x++) for (let y=-1; y<=0; y++)
      add(x,y,0,kh,pal.tT,pal.tL,pal.tR);
    // 4 Ecktürme
    const th = 2+Math.floor(rat.garrison/40);
    for (const [tx,ty] of [[-3,-3],[2,-3],[-3,2],[2,2]])
      add(tx,ty,0,th,pal.tT,pal.tL,pal.tR);

  } else if (style === 'japanese') {
    // Gestufter Tenshu: weiße Plattformen + dunkle Dächer
    const base=1+Math.floor(rat.walls/50), tierH=2+Math.floor(rat.garrison/40), tiers=1+Math.floor(rat.morale/35);
    addGround(6);
    for (let x=-3; x<=3; x++) for (let y=-3; y<=3; y++) add(x,y,0,base,pal.wT,pal.wL,pal.wR);
    let z=base;
    for (let i=0; i<Math.min(tiers,3); i++) {
      const s=[2,1,0][i];
      for (let x=-s; x<=s; x++) for (let y=-s; y<=s; y++) add(x,y,z,tierH,pal.wT,pal.wL,pal.wR);
      for (let x=-s; x<=s; x++) for (let y=-s; y<=s; y++) add(x,y,z+tierH,1,pal.tT,pal.tL,pal.tR);
      z += tierH+1;
    }

  } else if (style === 'pyramid') {
    // Stufenpyramide — echte gestapelte Terrassen
    const rings = 3+Math.floor(rat.walls/35);
    addGround(rings+2);
    for (let ring=0; ring<rings; ring++) {
      const r  = rings-ring;
      const bz = ring;         // jede Stufe eine Ebene höher
      // Vollflächige Plattform dieser Ebene (wird von höheren Ringen überlagert)
      for (let x=-r; x<=r; x++) for (let y=-r; y<=r; y++)
        add(x,y,bz,1,pal.wT,pal.wL,pal.wR);
    }
    // Tempel/Turm auf dem Gipfel
    const apexZ = rings;
    const sh = 2+Math.floor(rat.morale/35);
    for (let x=-1; x<=0; x++) for (let y=-1; y<=0; y++)
      add(x,y,apexZ,sh,pal.tT,pal.tL,pal.tR);

  } else if (style === 'spire') {
    // Dunkler asymmetrischer Fantasy-Turm — mittelerde (ohne plan:"tower")
    const baseH=1+Math.floor(rat.walls/40), spireH=5+Math.floor(rat.morale/18);
    addGround(5);
    for (let x=-2; x<=2; x++) for (let y=-2; y<=2; y++)
      if (!(Math.abs(x)===2 && Math.abs(y)===2 && rng()<0.55))
        add(x,y,0,baseH,pal.wT,pal.wL,pal.wR);
    add(-1,-1,baseH,spireH,  pal.tT,pal.tL,pal.tR);
    add( 0,-1,baseH,spireH,  pal.tT,pal.tL,pal.tR);
    add(-1, 0,baseH,spireH-1,pal.tT,pal.tL,pal.tR);
    for (const [jx,jy] of [[-2,-1],[1,0],[-1,1],[0,-2]])
      add(jx,jy, baseH+Math.floor(rng()*spireH*0.6), 1+Math.floor(rng()*2), pal.tT,pal.tL,pal.tR);

  } else if (style === 'concentric') {
    // Zwei konzentrische Mauerringe mit Mitteltürmen — Krak, Carcassonne, Edwardian
    const outerR=4+Math.floor(rat.supply/34), wallH=1+Math.floor(rat.walls/40), towerH=wallH+2;
    addGround(outerR+2);
    // Äußerer Ring — Ecktürme + Seitenmitteltürme
    for (let x=-outerR; x<=outerR; x++) for (let y=-outerR; y<=outerR; y++) {
      const atX=Math.abs(x)===outerR, atY=Math.abs(y)===outerR;
      if (!atX&&!atY) continue; if (x===0&&y===outerR) continue;
      const corner=atX&&atY;
      const midTower=!corner&&((x===0&&atY)||(y===0&&atX));
      const h=corner?towerH:midTower?towerH-1:wallH;
      const isT=corner||midTower;
      add(x,y,0,h,isT?pal.tT:pal.wT,isT?pal.tL:pal.wL,isT?pal.tR:pal.wR);
    }
    // Torhaustürme am Haupttor
    add(-1,outerR,0,wallH+3,pal.tT,pal.tL,pal.tR); add(1,outerR,0,wallH+3,pal.tT,pal.tL,pal.tR);
    // Zinnen auf äußerem Ring
    for (let x=-outerR+1; x<outerR; x++) {
      if ((x+100)%2===0) {
        add(x,-outerR,wallH,1,pal.wT,pal.wL,pal.wR);
        if (x!==0) add(x,outerR,wallH,1,pal.wT,pal.wL,pal.wR);
      }
    }
    for (let y=-outerR+1; y<outerR; y++) {
      if ((y+100)%2===0) {
        add(-outerR,y,wallH,1,pal.wT,pal.wL,pal.wR);
        add( outerR,y,wallH,1,pal.wT,pal.wL,pal.wR);
      }
    }
    // Innerer Ring — deutlich höher, markantere Türme
    const innerR=outerR-2;
    for (let x=-innerR; x<=innerR; x++) for (let y=-innerR; y<=innerR; y++) {
      const atX=Math.abs(x)===innerR, atY=Math.abs(y)===innerR;
      if (!atX&&!atY) continue; if (x===0&&y===innerR) continue;
      const c=atX&&atY;
      add(x,y,0,c?towerH+4:wallH+2,c?pal.tT:pal.wT,c?pal.tL:pal.wL,c?pal.tR:pal.wR);
    }
    const kh=3+Math.floor(rat.morale/25);
    for (let x=-1; x<=0; x++) for (let y=-1; y<=0; y++) add(x,y,0,kh,pal.tT,pal.tL,pal.tR);

  } else {
    // Standard: rechteckiger Hof mit Merlons, Bergfried seeded versetzt
    const xR=3+Math.floor(rat.supply/25);
    const yR=Math.max(3,xR+Math.round(rng()*4-2));
    const wallH=1+Math.floor(rat.walls/40), towerH=wallH+1+Math.floor(rat.garrison/40), kh=3+Math.floor(rat.morale/20);
    addGround(Math.max(xR,yR)+2);
    // Mauern
    for (let x=-xR; x<=xR; x++) for (let y=-yR; y<=yR; y++) {
      const atX=Math.abs(x)===xR, atY=Math.abs(y)===yR;
      if (!atX&&!atY) continue; if (x===0&&y===yR) continue;
      const c=atX&&atY;
      add(x,y,0,c?towerH:wallH,c?pal.tT:pal.wT,c?pal.tL:pal.wL,c?pal.tR:pal.wR);
    }
    // Torhaustürme
    add(-1,yR,0,wallH+2,pal.tT,pal.tL,pal.tR); add(1,yR,0,wallH+2,pal.tT,pal.tL,pal.tR);
    // Zwischentürme (ab garrison>=50)
    if (rat.garrison>=50) {
      const mid=Math.round(xR*0.5);
      [[-xR,mid],[-xR,-mid],[xR,mid],[xR,-mid],[mid,-yR],[-mid,-yR]].forEach(([x,y])=>{
        if (Math.abs(x)===xR||Math.abs(y)===yR) add(x,y,0,towerH-1,pal.tT,pal.tL,pal.tR);
      });
    }
    if (rat.garrison>=85) {
      const mid2=Math.round(xR*0.75);
      [[-xR,mid2],[-xR,-mid2],[xR,mid2],[xR,-mid2]].forEach(([x,y])=>{
        if (Math.abs(x)===xR||Math.abs(y)===yR) add(x,y,0,towerH,pal.tT,pal.tL,pal.tR);
      });
    }
    // Zinnen (Merlons) — jede zweite Zelle auf der Mauerkrone
    for (let x=-xR+1; x<xR; x++) {
      if ((x+100)%2===0) {
        add(x,-yR,wallH,1,pal.wT,pal.wL,pal.wR);
        if (x!==0) add(x,yR,wallH,1,pal.wT,pal.wL,pal.wR);
      }
    }
    for (let y=-yR+1; y<yR; y++) {
      if ((y+100)%2===0) {
        add(-xR,y,wallH,1,pal.wT,pal.wL,pal.wR);
        add( xR,y,wallH,1,pal.wT,pal.wL,pal.wR);
      }
    }
    // Bergfried (leicht versetzt per Zufall)
    const kx=rng()<0.38?Math.round(rng()*2-1):0;
    for (let x=-1; x<=0; x++) for (let y=-1; y<=0; y++) add(x+kx,y,0,kh,pal.tT,pal.tL,pal.tR);
  }

  // ── Painter's Algorithm: hinten → vorne ─────────────────────────────────
  blks.sort((a,b)=>(a.bx+a.by)-(b.bx+b.by) || a.bz-b.bz);
  for (const {bx,by,bz,bh,t,l,r} of blks) drawBlock(ctx,pt,bx,by,bz,bh,t,l,r);

  // ── Akzent-Glühen am höchsten Punkt ──────────────────────────────────────
  let maxZ=-Infinity, apx=W/2, apy=H/2;
  for (const b of blks) {
    if (b.bz+b.bh > maxZ) {
      maxZ = b.bz+b.bh;
      const [sx,sy] = pt(b.bx+0.5, b.by+0.5, maxZ);
      apx=sx; apy=sy;
    }
  }
  const glow=ctx.createRadialGradient(apx,apy-2,0,apx,apy-2,14);
  glow.addColorStop(0, ac+'cc'); glow.addColorStop(0.35,ac+'55'); glow.addColorStop(1,ac+'00');
  ctx.fillStyle=glow; ctx.beginPath(); ctx.arc(apx,apy-2,14,0,Math.PI*2); ctx.fill();
  ctx.fillStyle='#fff'; ctx.globalAlpha=0.85;
  ctx.beginPath(); ctx.arc(apx,apy-2,1.5,0,Math.PI*2); ctx.fill();
  ctx.globalAlpha=1;

  // ── Vignette ─────────────────────────────────────────────────────────────
  const vg=ctx.createRadialGradient(W/2,H/2,H*0.18,W/2,H/2,H*0.72);
  vg.addColorStop(0,'rgba(0,0,0,0)'); vg.addColorStop(1,'rgba(0,0,0,0.58)');
  ctx.fillStyle=vg; ctx.fillRect(0,0,W,H);
}

// ── Isometrischer Block ───────────────────────────────────────────────────
function drawBlock(ctx, pt, bx, by, bz, bh, topC, lftC, rgtC) {
  const z0=bz, z1=bz+bh, ol='rgba(0,0,0,0.22)';

  const [ax,ay]   = pt(bx,  by,  z1);
  const [bpx,bpy] = pt(bx+1,by,  z1);
  const [cpx,cpy] = pt(bx+1,by+1,z1);
  const [dpx,dpy] = pt(bx,  by+1,z1);
  ctx.beginPath(); ctx.moveTo(ax,ay); ctx.lineTo(bpx,bpy); ctx.lineTo(cpx,cpy); ctx.lineTo(dpx,dpy);
  ctx.closePath(); ctx.fillStyle=topC; ctx.fill(); ctx.strokeStyle=ol; ctx.lineWidth=0.5; ctx.stroke();

  const [lax,lay] = pt(bx,  by+1,z1);
  const [lbx,lby] = pt(bx+1,by+1,z1);
  const [lcx,lcy] = pt(bx+1,by+1,z0);
  const [ldx,ldy] = pt(bx,  by+1,z0);
  ctx.beginPath(); ctx.moveTo(lax,lay); ctx.lineTo(lbx,lby); ctx.lineTo(lcx,lcy); ctx.lineTo(ldx,ldy);
  ctx.closePath(); ctx.fillStyle=lftC; ctx.fill(); ctx.strokeStyle=ol; ctx.lineWidth=0.5; ctx.stroke();

  const [rax,ray] = pt(bx+1,by,  z1);
  const [rbx,rby] = pt(bx+1,by+1,z1);
  const [rcx,rcy] = pt(bx+1,by+1,z0);
  const [rdx,rdy] = pt(bx+1,by,  z0);
  ctx.beginPath(); ctx.moveTo(rax,ray); ctx.lineTo(rbx,rby); ctx.lineTo(rcx,rcy); ctx.lineTo(rdx,rdy);
  ctx.closePath(); ctx.fillStyle=rgtC; ctx.fill(); ctx.strokeStyle=ol; ctx.lineWidth=0.5; ctx.stroke();
}
