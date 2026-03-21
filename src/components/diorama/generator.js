// Procedural castle layout generator
// generateComponents — creates component arrays from castle.ratings + epoch
// generateRandomCastle — produces a full castle stub for the remaining 90+ burgen

const TWO_PI = Math.PI * 2;
const DIR16 = ['N','NNO','NO','ONO','O','OSO','SO','SSO','S','SSW','SW','WSW','W','WNW','NW','NNW'];

// ── Deterministic hash from castle id ────────────────────────────────────
function hv(id) {
  return (id || 'x').split('').reduce((a, c) => a + c.charCodeAt(0), 0);
}

// ── generateComponents ────────────────────────────────────────────────────
// Builds a component list for any castle that has no hand-crafted components.
// Variation derives entirely from castle metadata (no Math.random).
export function generateComponents(castle) {
  const walls    = castle.ratings?.walls    ?? 50;
  const supply   = castle.ratings?.supply   ?? 50;
  const pos      = castle.ratings?.position ?? 50;
  const garrison = castle.ratings?.garrison ?? 50;
  const epoch    = castle.epoch  ?? 'Mittelalter';
  const region   = castle.region ?? 'europa';
  const isF      = castle.type === 'fantasy';
  const h        = hv(castle.id);
  const h1 = h % 7, h2 = h % 5, h3 = h % 3;

  const isAncient  = epoch === 'Antike'   || epoch === 'Spätantike';
  const isHigh     = epoch === 'Hochmittelalter';
  const isModern   = epoch === 'Neuzeit';
  const isJapan    = epoch === 'Feudaljapan';
  const isOriental = region === 'nahost'  || (region === 'asien' && !isJapan);
  const hasCitadel = walls >= 85 || garrison >= 82;
  const hasMoat = !isModern && !isAncient && pos < 78 && (walls + supply) >= 105;
  const hasWaterMoat = hasMoat && supply >= 68;
  const hasForegate = walls >= 62 || garrison >= 58;
  const hasOuterWorks = pos >= 72 && walls >= 66;
  const hasSlopeAccess = pos >= 70;
  const hasJapaneseBailey = isJapan && (garrison >= 50 || walls >= 55);
  const hasOrientalCourtyard = isOriental && (garrison >= 52 || walls >= 60);
  const hasModernBastionStar = isModern && walls >= 58;

  // ── Tower counts ────────────────────────────────────────────────────────
  // Japanese castles have few corner towers (yagura) + one dominant keep
  const nOuter = isAncient ? 6 : isModern ? 5 : isJapan ? 4 : isHigh ? 10 : isF ? 8 + h1 % 3 : 8;
  const nInner = isAncient ? 4 : isHigh   ? 6 : isJapan ? 3 : isF    ? 5 + h2 % 2 : 5;

  // ── Radii ────────────────────────────────────────────────────────────────
  const outerR = isAncient ? 22 : isModern ? 18 : 20;
  const innerR = walls > 75 ? 11 : walls < 40 ? 9 : 10;
  const citadelR = Math.max(4.6, innerR * 0.54);

  // ── Heights ─────────────────────────────────────────────────────────────
  const oTowerH = (isAncient ? 3.5 : isModern ? 2.8 : isF ? 5.5 : 3.0) + walls * 0.020;
  const oWallH  = oTowerH * (isModern ? 0.70 : 0.55);
  const iTowerH = (isAncient ? 5.0 : isF ? 8.0 : isJapan ? 5.5 : 4.5) + walls * 0.032;
  const iWallH  = iTowerH * 0.60;
  const oTowerR = (isModern ? 1.6 : 1.2) + walls * 0.002;
  const iTowerR = 1.5 + walls * 0.003;

  // ── Glacis (only for high-position non-fantasy castles) ──────────────────
  const glacisH = !isF && pos >= 80 ? 2.0 + (pos - 80) * 0.12
                : !isF && pos >= 65 ? 1.5 : 0;
  const innerY  = glacisH;

  // ── Gate & ring rotation variation ──────────────────────────────────────
  const gateIdx = 1 + (h2 % (nOuter - 2));
  const ringOff = h3 * Math.PI / nOuter;
  const gateAz = ringOff + gateIdx * TWO_PI / nOuter;
  const gateDirX = Math.sin(gateAz);
  const gateDirZ = -Math.cos(gateAz);

  // ── Gate labels & info ──────────────────────────────────────────────────
  const gateLabel = isAncient  ? 'Stadttor'
    : isModern    ? 'Bastion-Torwerk'
    : isJapan     ? 'Masugata-Tor'
    : isOriental  ? 'Bab (Stadttor)'
    : 'Haupttor';

  const gateInfo = isModern
    ? 'Bastioniertes Torwerk — optimiert für Artilleriefeuer und seitliche Flankenverteidigung.'
    : isJapan
      ? 'Masugata: Doppeltes Torwerk mit Richtungswechsel — Angreifer stehen im Kreuzfeuer.'
      : isOriental
        ? 'Bab — monumentales Stadttor mit zwei Minarett-artigen Türmen und Spitzbogengewölbe.'
        : isAncient
          ? 'Monumentaltor — Symbol der Macht. Flankiert von massiven Quadrattürmen.'
          : 'Bewacht von Flankentürmen — Fallgatter, Pfeillöcher, enger Tordurchgang.';

  // ── Tower labels ────────────────────────────────────────────────────────
  const outerTowerLabel = isModern   ? 'Bastion'
    : isAncient  ? 'Wachturm'
    : isJapan    ? 'Yagura'
    : isOriental ? 'Burj'
    : 'Außenturm';

  const outerTowerInfo = isModern
    ? 'Artillerie-Bastion — abgeschrägte Flanken lenken Kanonenkugeln ab.'
    : isJapan
      ? 'Yagura — Wachturm mit charakteristischem Pagodendach. Schussöffnungen für Bögen und Musketen.'
      : isOriental
        ? 'Burj — runder Flankenturm. Arabische Bogenfenster, Zinnenkrone.'
        : isAncient
          ? 'Massiver antiker Wachturm — breitere Basis, weniger Höhe als mittelalterliche Typen.'
          : 'Flankierungsturm — ermöglichte Kreuzfeuer entlang der Mauerstrecke.';

  const bergfriedLabel = isAncient  ? 'Zentralturm'
    : isJapan    ? 'Tenshu (Hauptturm)'
    : isOriental ? 'Qubbat al-Qasr'
    : isF        ? `${castle.name.split(' ')[0]}-Turm`
    : 'Bergfried';

  const bergfriedInfo = isJapan
    ? `Tenshu — mehrstöckiger Hauptturm, Symbol der Macht des Daimyō. Höhe: ${walls}/100.`
    : isOriental
      ? `Qubbat al-Qasr — Kuppelturm der Zitadelle. Typisch für islamische Festungsarchitektur.`
      : isF
        ? 'Zentralturm des dunklen Herrn — kein Licht dringt durch seine Mauern.'
        : `Bergfried — letzter Rückzugspunkt. Hier fiel die Entscheidung. Mauerstärke: ${walls}/100.`;

  const palasLabel = isAncient  ? 'Palast'
    : isJapan    ? 'Ninomaru'
    : isOriental ? 'Iwan'
    : isF        ? 'Thronsaal'
    : 'Palas';

  const palasInfo = isJapan
    ? 'Ninomaru — Sekundärburg mit Palastbereich, Residenz des Herrn.'
    : isOriental
      ? 'Iwan — monumentale Empfangshalle. Charakteristisches Element islamischer Palastarchitektur.'
      : isAncient
        ? 'Repräsentationsbau — hier residierte der Herrscher und empfing Gesandte.'
        : `Wohn- und Verwaltungsbau im Kernwerk. Garrison: ${garrison}/100.`;

  const cs = [];

  // ── Terrain stack for elevated castles ───────────────────────────────────
  if (pos >= 72) {
    const terrainTop = Math.max(outerR * 1.08, 20);
    const terrainFootprint = [
      { x: 0, z: -terrainTop * 1.04 },
      { x: terrainTop * 0.78, z: -terrainTop * 0.72 },
      { x: terrainTop * 1.02, z: -terrainTop * 0.04 },
      { x: terrainTop * 0.90, z: terrainTop * 0.66 },
      { x: terrainTop * 0.30, z: terrainTop * 1.05 },
      { x: -terrainTop * 0.36, z: terrainTop * 0.96 },
      { x: -terrainTop * 0.92, z: terrainTop * 0.62 },
      { x: -terrainTop * 1.00, z: -terrainTop * 0.12 },
      { x: -terrainTop * 0.64, z: -terrainTop * 0.82 },
    ];
    const baseH = 1.1 + (pos - 70) * 0.045;
    cs.push({
      type: 'TERRAIN_STACK',
      x: 0,
      z: 0,
      y: -baseH - 0.2,
      footprint: terrainFootprint,
      layers: [
        { h: baseH * 0.95, scale: 1.36 },
        { h: baseH * 0.75, scale: 1.20 },
        { h: baseH * 0.55, scale: 1.06 },
      ],
      label: `Felsplateau – ${castle.name}`,
      info: `Terrassierter Felssockel für Höhenlage (${pos}/100). Erschwert Sturmangriffe und Leitern.`,
    });
  }

  // ── Glacis ───────────────────────────────────────────────────────────────
  if (glacisH > 0) cs.push({
    type: 'GLACIS', x: 0, z: 0, y: 0,
    rTop: innerR * 1.1, rBot: innerR * 1.6 + pos * 0.015, h: glacisH,
    label: `Glacis – ${castle.name}`,
    info: `Angeschrägter ${isAncient ? 'Stein' : 'Fels'}sockel — erschwert Belagerungsmaschinen. Geländevorteil: ${pos}/100.`,
  });

  // ── Outer ring ───────────────────────────────────────────────────────────
  cs.push({
    type: 'RING', y: 0,
    squareTowers: isAncient || isModern || isJapan,
    gate: {
      atIndex: gateIdx,
      w: 2.8 + walls * 0.012, d: 1.8 + walls * 0.010, h: oTowerH * 0.95,
      label: `${gateLabel} – ${castle.name}`,
      info: gateInfo,
    },
    points: Array.from({ length: nOuter }, (_, i) => {
      const α = ringOff + i * TWO_PI / nOuter;
      // Elliptical for ridge castles (pos > 80)
      const rx = pos > 80 ? outerR * 1.15 : outerR;
      const rz = pos > 80 ? outerR * 0.85 : outerR;
      const starScale = hasModernBastionStar ? (i % 2 === 0 ? 1.18 : 0.88) : 1;
      return {
        x: +(rx * starScale * Math.sin(α)).toFixed(2),
        z: +(-rz * starScale * Math.cos(α)).toFixed(2),
        r: +(oTowerR * (hasModernBastionStar ? 1.10 : 1)).toFixed(2),
        h: +(oTowerH * (hasModernBastionStar ? 0.90 : 1)).toFixed(2),
        label: `${outerTowerLabel} ${DIR16[Math.round(i * 16 / nOuter) % 16]} – ${castle.name}`,
        info: outerTowerInfo,
      };
    }),
    wall: { h: oWallH, thick: isModern ? 1.1 : 0.75 },
  });

  // ── Outer defensive works (third ring for strong hill castles) ──────────
  if (hasOuterWorks) {
    const outR = outerR + 7.5 + (pos - 70) * 0.06;
    const outN = Math.max(6, Math.floor(nOuter * 0.75));
    const outGateIdx = (gateIdx + Math.floor(outN / 2)) % outN;
    cs.push({
      type: 'RING',
      y: 0,
      squareTowers: isAncient || isModern || isJapan,
      gate: {
        atIndex: outGateIdx,
        w: 2.5 + walls * 0.010,
        d: 1.6 + walls * 0.008,
        h: oTowerH * 0.78,
        label: `Vorwerk-Tor – ${castle.name}`,
        info: 'Vorgelagerte Ringmauer als erstes Verteidigungsband. Verzögert den Angriff auf das Hauptwerk.',
      },
      points: Array.from({ length: outN }, (_, i) => {
        const a = ringOff * 0.5 + i * TWO_PI / outN;
        return {
          x: +(outR * Math.sin(a)).toFixed(2),
          z: +(-outR * Math.cos(a)).toFixed(2),
          r: +(oTowerR * 0.84).toFixed(2),
          h: +(oTowerH * 0.78).toFixed(2),
          label: `Vorwerkturm ${i + 1} – ${castle.name}`,
          info: 'Leichter Flankierungsturm des vorgelagerten Verteidigungsrings.',
        };
      }),
      wall: { h: oWallH * 0.82, thick: isModern ? 0.92 : 0.68 },
    });
  }

  // ── Inner ring ───────────────────────────────────────────────────────────
  cs.push({
    type: 'RING', y: innerY,
    squareTowers: isAncient || isModern || isJapan,
    points: Array.from({ length: nInner }, (_, i) => {
      const α = Math.PI + i * TWO_PI / nInner;
      const isBF = i === 0;
      return {
        x: +(innerR * Math.sin(α)).toFixed(2),
        z: +(-innerR * Math.cos(α)).toFixed(2),
        // Japanese tenshu: much wider and taller than surrounding yagura
        r: isBF ? iTowerR * (isJapan ? 2.0 : isF ? 1.5 : 1.3) : iTowerR,
        h: isBF ? iTowerH * (isF ? 1.7 : isJapan ? 2.2 : 1.4) : iTowerH,
        hoarding: !isF && !isJapan && !isModern && garrison > 65,
        label: isBF ? `${bergfriedLabel} – ${castle.name}` : `Innenturm ${i}`,
        info: isBF ? bergfriedInfo : `Innerer Wehrturm. Garrison: ${garrison}/100.`,
      };
    }),
    wall: { h: iWallH, thick: 1.0 },
  });

  // ── Japanese multi-bailey layout (Ninomaru + housing tiers) ─────────────
  if (hasJapaneseBailey) {
    const baileyR = innerR * 0.76;
    cs.push({
      type: 'RING',
      y: innerY + 0.15,
      squareTowers: true,
      points: Array.from({ length: 4 }, (_, i) => {
        const a = ringOff + Math.PI / 4 + i * TWO_PI / 4;
        return {
          x: +(baileyR * Math.sin(a)).toFixed(2),
          z: +(-baileyR * Math.cos(a)).toFixed(2),
          r: +(iTowerR * 0.68).toFixed(2),
          h: +(iTowerH * 0.62).toFixed(2),
          label: `Ninomaru-Yagura ${i + 1} – ${castle.name}`,
          info: 'Sekundäre Verteidigungsebene (Ninomaru) mit kontrollierten Schussfeldern.',
        };
      }),
      wall: { h: iWallH * 0.66, thick: 0.88 },
    });

    cs.push({
      type: 'CIVILIAN_HOUSING',
      x: 0,
      z: 0,
      y: Math.max(0.1, innerY * 0.3),
      count: 5 + (h1 % 3),
      w: 1.55,
      d: 2.35,
      h: 1.9,
      seed: h + h2 * 11,
      rotation: ringOff,
      label: `Burgstadt – ${castle.name}`,
      info: 'An den Hang geschichtete Wohn- und Versorgungsbauten unterhalb des Tenshu.',
    });
  }

  // ── Oriental gate courtyard & ceremonial iwan front ──────────────────────
  if (hasOrientalCourtyard) {
    const courtDist = innerR * 0.56;
    const courtW = 3.3 + garrison * 0.018;
    const courtD = 2.1 + walls * 0.006;
    const courtH = iTowerH * 0.48;
    const frontX = +(Math.sin(gateAz + Math.PI) * courtDist).toFixed(2);
    const frontZ = +(-Math.cos(gateAz + Math.PI) * courtDist).toFixed(2);
    const flankOff = courtW * 0.46;
    const orientRot = Math.atan2(Math.sin(gateAz + Math.PI), -Math.cos(gateAz + Math.PI));

    cs.push({
      type: 'GABLED_HALL',
      x: frontX,
      z: frontZ,
      y: innerY,
      w: courtW,
      d: courtD,
      h: courtH,
      rotation: orientRot,
      buttressPairs: 1,
      slitCount: 2,
      doorSide: 'front',
      porch: true,
      label: `Torhof-Iwan – ${castle.name}`,
      info: 'Repräsentativer iwanartiger Vorhof hinter dem Haupttor zur Truppenlenkung.',
    });

    cs.push({
      type: 'SQUARE_TOWER',
      x: +(frontX + Math.sin(orientRot + Math.PI / 2) * flankOff).toFixed(2),
      z: +(frontZ + -Math.cos(orientRot + Math.PI / 2) * flankOff).toFixed(2),
      y: innerY,
      w: 1.8,
      d: 1.8,
      h: iTowerH * 0.58,
      label: `Hofturm Ost – ${castle.name}`,
      info: 'Flankenturm des inneren Torhofs.',
    });
    cs.push({
      type: 'SQUARE_TOWER',
      x: +(frontX + Math.sin(orientRot - Math.PI / 2) * flankOff).toFixed(2),
      z: +(frontZ + -Math.cos(orientRot - Math.PI / 2) * flankOff).toFixed(2),
      y: innerY,
      w: 1.8,
      d: 1.8,
      h: iTowerH * 0.58,
      label: `Hofturm West – ${castle.name}`,
      info: 'Flankenturm des inneren Torhofs.',
    });
  }

  // ── Citadel core ring ─────────────────────────────────────────────────────
  if (hasCitadel) {
    const citadelN = isJapan ? 4 : 5;
    const citadelY = innerY + (isJapan ? 0.4 : 0.2);
    cs.push({
      type: 'RING',
      y: citadelY,
      squareTowers: true,
      points: Array.from({ length: citadelN }, (_, i) => {
        const a = ringOff + Math.PI / citadelN + i * TWO_PI / citadelN;
        const isCoreKeep = i === 0;
        return {
          x: +(citadelR * Math.sin(a)).toFixed(2),
          z: +(-citadelR * Math.cos(a)).toFixed(2),
          r: isCoreKeep ? iTowerR * 0.9 : iTowerR * 0.62,
          h: isCoreKeep ? iTowerH * 1.16 : iTowerH * 0.76,
          label: isCoreKeep ? `Zitadelle – ${castle.name}` : `Kernwerk ${i}`,
          info: isCoreKeep
            ? 'Innerstes Kernwerk mit letzter Verteidigungslinie und Vorratsspeichern.'
            : 'Turm des Kernwerks zur Nahverteidigung der Zitadelle.',
        };
      }),
      wall: { h: iWallH * 0.78, thick: 0.88 },
    });
  }

  // ── Palas / inner hall (strong garrisons) ────────────────────────────────
  if (garrison > 60 || walls > 75) {
    const palα = ringOff + h1 * TWO_PI / 8;
    const palR = innerR * 0.42;
    cs.push({
      type: 'SQUARE_TOWER',
      x: +(palR * Math.sin(palα)).toFixed(2),
      z: +(-palR * Math.cos(palα)).toFixed(2),
      w: 4.0 + garrison * 0.025, d: 2.0, h: iTowerH * 0.50,
      y: innerY,
      label: `${palasLabel} – ${castle.name}`,
      info: palasInfo,
    });
  }

  // ── Foregate / barbican in front of main gate ────────────────────────────
  if (hasForegate) {
    const foreDist = outerR + 5.3;
    cs.push({
      type: 'GATE',
      x: +(gateDirX * foreDist).toFixed(2),
      z: +(gateDirZ * foreDist).toFixed(2),
      y: 0,
      w: 2.5 + walls * 0.008,
      d: 2.1,
      h: oTowerH * 0.82,
      rotation: Math.atan2(gateDirX, gateDirZ),
      label: `Barbakane – ${castle.name}`,
      info: 'Vorgelagerte Torbefestigung mit Engstelle. Bindet Angreifer vor dem Haupttor.',
    });
  }

  // ── Ditch / moat and optional water plane ────────────────────────────────
  if (hasMoat) {
    const ditchTop = outerR + 10.5;
    const ditchBot = ditchTop - 1.8;
    cs.push({
      type: 'DITCH',
      x: 0,
      z: 0,
      y: 0,
      rTop: ditchTop,
      rBot: ditchBot,
      h: 0.9 + (walls - 60) * 0.008,
      label: `Graben – ${castle.name}`,
      info: hasWaterMoat
        ? 'Wassergraben als zusätzliches Hindernis gegen Türme und Unterminierung.'
        : 'Trockengraben zur Verzögerung von Sturmeinheiten und Belagerungsgerät.',
    });

    if (hasWaterMoat) {
      const waterSide = (ditchBot * 2) * 0.96;
      cs.push({
        type: 'WATER_PLANE',
        x: 0,
        z: 0,
        y: 0.07,
        w: +waterSide.toFixed(2),
        d: +waterSide.toFixed(2),
        label: `Wassergraben – ${castle.name}`,
        info: `Kontrollierter Zufluss aus Vorräten/Quellen (Supply ${supply}/100).`,
      });
    }
  }

  // ── Access slope for hill castles ────────────────────────────────────────
  if (hasSlopeAccess) {
    const gateStart = outerR + 12;
    cs.push({
      type: 'SLOPE_PATH',
      x1: +(gateDirX * gateStart).toFixed(2),
      z1: +(gateDirZ * gateStart).toFixed(2),
      y1: 0,
      x2: +(gateDirX * (outerR + 2.0)).toFixed(2),
      z2: +(gateDirZ * (outerR + 2.0)).toFixed(2),
      y2: innerY + 0.25,
      w: 2.2 + walls * 0.006,
      thick: 0.16,
      sideWalls: true,
      useStone: true,
      label: `Anmarschrampe – ${castle.name}`,
      info: 'Kontrollierte Zugangsrampe mit seitlicher Begrenzung für Nachschub und Verteidigerbewegung.',
    });
  }

  return cs;
}

// ── generateRandomCastle ──────────────────────────────────────────────────
// Produces a full castle-like object for all burgen that have no hand data.
// Fully deterministic from `seed` — calling twice gives the same castle.
// Pass `overrides` to specify name, loc, era, ratings, etc.

const EPOCHS   = ['Antike', 'Mittelalter', 'Hochmittelalter', 'Neuzeit', 'Feudaljapan'];
const REGIONS  = ['europa', 'nahost', 'asien', 'americas', 'fantasy'];
const ICONS    = ['🏰', '🏯', '🗼', '⛩️', '🏛️', '⛪', '🗺️'];
const THEMES   = [
  { bg: '#120f08', accent: '#c9a84c', glow: 'rgba(201,168,76,0.15)' },
  { bg: '#080e0c', accent: '#6aaa84', glow: 'rgba(80,160,100,0.12)' },
  { bg: '#100810', accent: '#aa6acc', glow: 'rgba(160,90,190,0.12)' },
  { bg: '#08080e', accent: '#6a88cc', glow: 'rgba(80,120,200,0.12)' },
  { bg: '#100808', accent: '#cc6a44', glow: 'rgba(200,100,60,0.12)' },
];

export function generateRandomCastle(seed, overrides = {}) {
  const h = hv(seed || 'x');
  const epoch  = EPOCHS[h % EPOCHS.length];
  const region = REGIONS[(h >> 2) % REGIONS.length];

  const base = {
    id:      seed,
    name:    seed,
    sub:     'Historische Festung',
    era:     '12. Jahrhundert',
    year:    800 + (h % 800),
    loc:     'Unbekannt',
    type:    (h % 9 === 0) ? 'fantasy' : 'real',
    epoch,
    region,
    icon:    ICONS[(h >> 1) % ICONS.length],
    theme:   THEMES[h % THEMES.length],
    ratings: {
      walls:    30 + (h       % 65),
      supply:   20 + ((h >> 1) % 75),
      position: 30 + ((h >> 2) % 65),
      garrison: 20 + ((h >> 3) % 75),
      morale:   30 + ((h >> 4) % 65),
    },
    strengths:  ['Strategische Lage', 'Solide Mauern', 'Gute Wasserversorgung'],
    weaknesses: ['Begrenzte Garnison', 'Versorgungsrisiko'],
    attackTips: ['Schwachstelle identifizieren', 'Versorgung kappen'],
    history:  'Erbaut im frühen Mittelalter. Strategisch bedeutsam für die Region.',
    verdict:  'Militärisch solide — Stärken und Schwächen halten sich die Waage.',
    zones: [],
    // No `components` → CastleDiorama falls back to generateComponents()
  };

  return { ...base, ...overrides };
}
