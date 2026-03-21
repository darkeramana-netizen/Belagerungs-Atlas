const TWO_PI = Math.PI * 2;

function centerOfRing(ring) {
  const pts = ring.points || [];
  if (!pts.length) return { x: 0, z: 0, avgR: 10 };
  const sum = pts.reduce((acc, p) => {
    acc.x += p.x || 0;
    acc.z += p.z || 0;
    acc.r += Math.hypot(p.x || 0, p.z || 0);
    return acc;
  }, { x: 0, z: 0, r: 0 });
  return {
    x: sum.x / pts.length,
    z: sum.z / pts.length,
    avgR: Math.max(4, sum.r / pts.length),
  };
}

function findRings(components) {
  return components.filter(c => c.type === 'RING');
}

function findMainGateDir(outerRing, fallbackHash) {
  if (!outerRing?.gate || !Array.isArray(outerRing.points) || !outerRing.points.length) {
    const a = ((fallbackHash % 360) * Math.PI) / 180;
    return { x: Math.sin(a), z: -Math.cos(a), angle: a };
  }
  const idx = Math.max(0, Math.min(outerRing.points.length - 1, outerRing.gate.atIndex || 0));
  const p = outerRing.points[idx];
  const a = Math.atan2(p.x || 0, -(p.z || 0));
  return { x: Math.sin(a), z: -Math.cos(a), angle: a };
}

function hv(id) {
  return (id || 'x').split('').reduce((a, c) => a + c.charCodeAt(0), 0);
}

function hasType(components, type) {
  return components.some(c => c.type === type);
}

function addIfMissing(components, predicate, createComp) {
  if (!components.some(predicate)) components.push(createComp());
}

function mkLabel(base, castle) {
  return `${base} – ${castle.name}`;
}

function isHabitationComp(comp) {
  if (comp.type === 'GABLED_HALL' || comp.type === 'CIVILIAN_HOUSING') return true;
  if (comp.type === 'SQUARE_TOWER' && (comp.noRoof || (comp.h || 0) <= 3.2)) return true;
  return false;
}

function compRadius(comp) {
  if (comp.type === 'GABLED_HALL' || comp.type === 'SQUARE_TOWER' || comp.type === 'PLATEAU') {
    return Math.max(comp.w || 2, comp.d || 2) * 0.5;
  }
  if (comp.type === 'CIVILIAN_HOUSING') {
    const count = comp.count || 5;
    const hw = comp.w || 1.8;
    return Math.max(1.5, (count * hw) * 0.35);
  }
  return Math.max(comp.r || 1, 1);
}

function applySpatialSafetyRules(components) {
  const rings = components.filter(c => c.type === 'RING' && Array.isArray(c.points) && c.points.length >= 3);
  const glacis = components.filter(c => c.type === 'GLACIS');
  const plateaus = components.filter(c => c.type === 'PLATEAU');
  const habitations = components.filter(isHabitationComp);

  habitations.forEach(comp => {
    comp.y = Math.max(0.04, comp.y || 0);

    const r = compRadius(comp);

    // Grounding rule: if a plateau sits under the building center, snap above it.
    const support = plateaus.find(p => {
      const dx = (comp.x || 0) - (p.x || 0);
      const dz = (comp.z || 0) - (p.z || 0);
      return Math.hypot(dx, dz) <= Math.max(1.4, compRadius(p) * 0.92);
    });
    if (support) {
      const topY = (support.y || 0) + (support.h || 0);
      comp.y = Math.max(comp.y, topY + 0.04);
    }

    // Glacis-clearance rule: keep buildings outside the sloped plinth zone.
    glacis.forEach(gl => {
      const gx = gl.x || 0;
      const gz = gl.z || 0;
      const dx = (comp.x || 0) - gx;
      const dz = (comp.z || 0) - gz;
      const dist = Math.hypot(dx, dz);
      const keepOut = (gl.rBot || gl.rTop || 0) + r + 0.35;
      if (keepOut > 0 && dist < keepOut) {
        const ux = dist > 0.001 ? dx / dist : 1;
        const uz = dist > 0.001 ? dz / dist : 0;
        const push = keepOut - dist;
        comp.x = +(comp.x + ux * push).toFixed(2);
        comp.z = +(comp.z + uz * push).toFixed(2);
      }
      const glTop = (gl.y || 0) + (gl.h || 0);
      if (dist < (gl.rTop || 0) + r + 0.2) {
        comp.y = Math.max(comp.y, glTop + 0.05);
      }
    });

    // Anti-wall clipping: push habitation buildings off main ring wall bands.
    rings.forEach(ring => {
      const center = centerOfRing(ring);
      const dx = (comp.x || 0) - center.x;
      const dz = (comp.z || 0) - center.z;
      const dist = Math.hypot(dx, dz);
      const wallBand = Math.max(0.7, (ring.wall?.thick || 0.8) * 1.15) + r;
      const nearWall = Math.abs(dist - center.avgR) < wallBand;
      if (nearWall) {
        const ux = dist > 0.001 ? dx / dist : 1;
        const uz = dist > 0.001 ? dz / dist : 0;
        const targetR = center.avgR + wallBand + 0.28;
        comp.x = +(center.x + ux * targetR).toFixed(2);
        comp.z = +(center.z + uz * targetR).toFixed(2);
      }
    });
  });

  return components;
}

export function enhanceComponentsForRealism(castle, inputComponents, style, historicalMode) {
  const components = inputComponents.map(c => ({ ...c }));
  const rings = findRings(components);
  const outerRing = rings[0] || null;
  const innerRing = rings[1] || null;
  const hash = hv(castle.id);
  const gateDir = findMainGateDir(outerRing, hash);
  const outerCenter = centerOfRing(outerRing || { points: [{ x: 0, z: -16 }] });
  const innerCenter = centerOfRing(innerRing || { points: [{ x: 0, z: -9 }] });

  const walls = castle.ratings?.walls ?? 50;
  const supply = castle.ratings?.supply ?? 50;
  const garrison = castle.ratings?.garrison ?? 50;
  const position = castle.ratings?.position ?? 50;

  // 1) Ensure logistic realism: most castles need visible water/storage cues.
  if (!hasType(components, 'WATER_PLANE') && !hasType(components, 'DITCH') && supply >= 58) {
    addIfMissing(
      components,
      c => c.label?.toLowerCase().includes('zisterne'),
      () => ({
        type: 'SQUARE_TOWER',
        x: +(innerCenter.x * 0.4).toFixed(2),
        z: +(innerCenter.z * 0.4).toFixed(2),
        y: 0.05,
        w: 1.25,
        d: 1.0,
        h: 0.42,
        noRoof: true,
        label: mkLabel('Hofzisterne', castle),
        info: `Sichtbare Wasserreserve fuer Belagerungen (Supply ${supply}/100).`,
      }),
    );
  }

  // 2) Add route clarity for high-position sites.
  if (position >= 65 && !hasType(components, 'SLOPE_PATH') && outerRing) {
    const startR = outerCenter.avgR + 10;
    const endR = Math.max(outerCenter.avgR + 1.5, outerCenter.avgR * 1.05);
    components.push({
      type: 'SLOPE_PATH',
      x1: +(gateDir.x * startR).toFixed(2),
      z1: +(gateDir.z * startR).toFixed(2),
      y1: 0,
      x2: +(gateDir.x * endR).toFixed(2),
      z2: +(gateDir.z * endR).toFixed(2),
      y2: 0.35,
      w: 2.1 + walls * 0.005,
      thick: 0.16,
      sideWalls: true,
      useStone: true,
      label: mkLabel('Zugangsrampe', castle),
      info: 'Gestaffelter Zugang zur Torzone statt direkter Frontalroute.',
    });
  }

  // 3) Add operational detail in courtyards (for both handcrafted + procedural).
  addIfMissing(
    components,
    c => c.type === 'GABLED_HALL' && (c.label || '').toLowerCase().includes('magazin'),
    () => ({
      type: 'GABLED_HALL',
      x: +(innerCenter.x - gateDir.x * (innerCenter.avgR * 0.35)).toFixed(2),
      z: +(innerCenter.z - gateDir.z * (innerCenter.avgR * 0.35)).toFixed(2),
      y: 0.05,
      w: 3.8 + garrison * 0.01,
      d: 2.1,
      h: 2.3,
      roofH: 1.05,
      slitCount: 1,
      doorSide: 'front',
      chimneyCount: 1,
      label: mkLabel('Magazinbau', castle),
      info: `Versorgungs- und Lagerbau zur Unterstuetzung der Garnison (${garrison}/100).`,
    }),
  );

  // 4) Style-specific realism upgrades.
  if (style === 'japanese') {
    addIfMissing(
      components,
      c => c.type === 'STAIRWAY' && (c.label || '').toLowerCase().includes('masugata'),
      () => ({
        type: 'STAIRWAY',
        x: +(gateDir.x * (outerCenter.avgR * 0.72)).toFixed(2),
        z: +(gateDir.z * (outerCenter.avgR * 0.72)).toFixed(2),
        y: 0.05,
        w: 2.4,
        d: 4.6,
        h: 1.8,
        steps: 7,
        landingD: 0.8,
        rotation: Math.atan2(gateDir.x, gateDir.z),
        label: mkLabel('Masugata-Aufstieg', castle),
        info: 'Gestufter Aufstieg in den Masugata-Bereich fuer kontrollierte Bewegungen.',
      }),
    );
  }

  if (style === 'oriental') {
    addIfMissing(
      components,
      c => c.type === 'GABLED_HALL' && (c.label || '').toLowerCase().includes('iwan'),
      () => ({
        type: 'GABLED_HALL',
        x: +(innerCenter.x + gateDir.x * (innerCenter.avgR * 0.25)).toFixed(2),
        z: +(innerCenter.z + gateDir.z * (innerCenter.avgR * 0.25)).toFixed(2),
        y: 0.05,
        w: 4.4,
        d: 2.2,
        h: 2.6,
        porch: true,
        slitCount: 2,
        buttressPairs: 1,
        rotation: Math.atan2(gateDir.x, gateDir.z) + Math.PI,
        label: mkLabel('Iwan-Torhof', castle),
        info: 'Torhof als Zwischenraum zwischen urbanem Vorfeld und innerer Zitadelle.',
      }),
    );
  }

  if (style === 'city' || style === 'british' || style === 'crusader') {
    addIfMissing(
      components,
      c => c.type === 'STAIRWAY' && (c.label || '').toLowerCase().includes('wehrgang'),
      () => ({
        type: 'STAIRWAY',
        x: +(innerCenter.x + Math.sin(gateDir.angle + Math.PI / 2) * (innerCenter.avgR * 0.75)).toFixed(2),
        z: +(innerCenter.z - Math.cos(gateDir.angle + Math.PI / 2) * (innerCenter.avgR * 0.75)).toFixed(2),
        y: 0.05,
        w: 1.6,
        d: 3.4,
        h: 1.2,
        steps: 4,
        landingD: 0.45,
        rotation: gateDir.angle + Math.PI / 2,
        label: mkLabel('Wehrgangstreppe', castle),
        info: 'Interner Schnellzugang auf den Wehrgang fuer Wachwechsel und Reserve.',
      }),
    );
  }

  // 5) If no terrain but high position, synthesize a subtle base.
  if (position >= 75 && !hasType(components, 'TERRAIN_STACK') && !hasType(components, 'ROCK_FOUNDATION')) {
    const rr = Math.max(outerCenter.avgR * 1.2, 18);
    const footprint = Array.from({ length: 9 }, (_, i) => {
      const a = (i / 9) * TWO_PI;
      const jitter = 0.88 + (((hash + i * 13) % 17) / 100);
      return {
        x: +(Math.sin(a) * rr * jitter).toFixed(2),
        z: +(-Math.cos(a) * rr * jitter).toFixed(2),
      };
    });
    components.unshift({
      type: 'TERRAIN_STACK',
      x: 0,
      z: 0,
      y: -1.8,
      footprint,
      layers: [{ h: 1.0, scale: 1.22 }, { h: 0.78, scale: 1.1 }, { h: 0.56, scale: 1.02 }],
      label: mkLabel('Topografische Basis', castle),
      info: `Automatisch ergaenzte Hoehenbasis fuer Position ${position}/100.`,
    });
  }

  // 6) Spatial safety pass for terrain and wall clearance.
  applySpatialSafetyRules(components);

  // 7) Meta flags for UI/later audits.
  components.realismMeta = {
    pass: 'v2',
    historicalMode,
    detailLevel: walls >= 75 || garrison >= 70 ? 'high' : 'medium',
  };

  return components;
}

export function deriveFidelityLabels(castle, historicalMode, components, fallbackLabel, fallbackConfidence) {
  const real = castle.type === 'real';
  const hasTerrain = components.some(c => c.type === 'TERRAIN_STACK' || c.type === 'ROCK_FOUNDATION');
  const hasOps = components.some(c => c.type === 'GABLED_HALL' || c.type === 'STAIRWAY');
  const hasDefenseDepth = components.filter(c => c.type === 'RING').length >= 2;

  let fidelityLabel = fallbackLabel || (real ? 'quellenbasiert' : 'stilisiert');
  let sourceConfidence = fallbackConfidence || (real ? 'mittel' : 'niedrig');

  if (historicalMode === 'surveyed' && hasTerrain && hasDefenseDepth && hasOps) {
    fidelityLabel = 'rekonstruiert+';
    sourceConfidence = 'hoch';
  } else if (historicalMode === 'procedural' && hasTerrain && hasDefenseDepth) {
    fidelityLabel = 'prozedural+';
    sourceConfidence = real ? 'mittel' : 'niedrig';
  }

  return { fidelityLabel, sourceConfidence };
}

function hasAnyLabel(components, needles) {
  return components.some(c => {
    const l = (c.label || '').toLowerCase();
    return needles.some(n => l.includes(n));
  });
}

function countType(components, type) {
  return components.filter(c => c.type === type).length;
}

export function runHistoricalAccuracyAudit(castle, components, style, historicalMode) {
  const findings = [];
  let score = 100;

  const walls = castle.ratings?.walls ?? 50;
  const supply = castle.ratings?.supply ?? 50;
  const position = castle.ratings?.position ?? 50;
  const garrison = castle.ratings?.garrison ?? 50;

  const ringCount = countType(components, 'RING');
  const hasTerrain = components.some(c => c.type === 'TERRAIN_STACK' || c.type === 'ROCK_FOUNDATION');
  const hasApproach = components.some(c => c.type === 'SLOPE_PATH' || c.type === 'STAIRWAY');
  const hasWater = components.some(c => c.type === 'WATER_PLANE' || c.type === 'DITCH')
    || hasAnyLabel(components, ['zisterne', 'cistern', 'well']);
  const hasOps = components.some(c => c.type === 'GABLED_HALL' || c.type === 'CIVILIAN_HOUSING')
    || hasAnyLabel(components, ['magazin', 'werkhof', 'stall', 'barrack', 'kaserne']);
  const hasGate = components.some(c => c.type === 'GATE')
    || components.some(c => c.type === 'RING' && c.gate);

  if (!hasGate) {
    score -= 20;
    findings.push({
      severity: 'high',
      code: 'missing_gate_system',
      message: 'Keine erkennbare Torlogik. Jede funktionale Burg braucht mindestens ein Haupttor mit kontrolliertem Zugang.',
    });
  }

  if (ringCount === 0) {
    score -= 25;
    findings.push({
      severity: 'high',
      code: 'missing_perimeter',
      message: 'Kein Ring-/Perimeterwerk erkannt. Defensivstruktur ist damit historisch kaum plausibel.',
    });
  } else if (ringCount === 1 && walls >= 70) {
    score -= 8;
    findings.push({
      severity: 'medium',
      code: 'limited_defense_depth',
      message: 'Starke Mauern ohne zweite Verteidigungstiefe. Bei hohen Mauerwerten sind Vorwerk/Zwinger meist plausibel.',
    });
  }

  if (position >= 70 && !hasTerrain) {
    score -= 12;
    findings.push({
      severity: 'medium',
      code: 'missing_topography',
      message: 'Hoehenlage ohne topografische Modellierung. Burg wirkt dadurch zu flach fuer eine Sporn-/Hoehenburg.',
    });
  }

  if (position >= 68 && !hasApproach) {
    score -= 10;
    findings.push({
      severity: 'medium',
      code: 'missing_access_path',
      message: 'Keine lesbare Zugangsroute (Rampe/Treppen). Historische Burgen hatten gefuehrte, kontrollierte Anmarschwege.',
    });
  }

  if (supply >= 60 && !hasWater) {
    score -= 8;
    findings.push({
      severity: 'low',
      code: 'missing_water_logistics',
      message: 'Versorgung ist hoch bewertet, aber Wasserinfrastruktur ist nicht sichtbar (Graben/Zisterne/Becken).',
    });
  }

  if (garrison >= 60 && !hasOps) {
    score -= 8;
    findings.push({
      severity: 'low',
      code: 'missing_operational_buildings',
      message: 'Groesse der Besatzung ohne erkennbare Betriebsbauten (Magazin, Kaserne, Werkhof) wirkt unvollstaendig.',
    });
  }

  if (style === 'japanese' && countType(components, 'RING') < 2) {
    score -= 6;
    findings.push({
      severity: 'low',
      code: 'japanese_missing_bailey',
      message: 'Feudaljapan-Stil ohne mehrstufige Hofstruktur (Honmaru/Ninomaru) wirkt vereinfacht.',
    });
  }

  if (style === 'oriental' && !hasAnyLabel(components, ['iwan', 'bab', 'torhof'])) {
    score -= 5;
    findings.push({
      severity: 'low',
      code: 'oriental_missing_courtyard',
      message: 'Orientalischer Stil ohne Torhof/Iwan-Element verliert architektonische Eigenart.',
    });
  }

  if (style === 'city' && !components.some(c => c.type === 'CIVILIAN_HOUSING')) {
    score -= 4;
    findings.push({
      severity: 'low',
      code: 'city_missing_urban_layer',
      message: 'Stadtburg ohne sichtbare urbane Schicht (Wohn-/Nutzbauten) wirkt zu militaerisch abstrahiert.',
    });
  }

  const normalizedScore = Math.max(0, Math.min(100, Math.round(score)));
  const grade = normalizedScore >= 90 ? 'A'
    : normalizedScore >= 80 ? 'B'
      : normalizedScore >= 70 ? 'C'
        : normalizedScore >= 55 ? 'D' : 'E';

  const prioritized = findings.sort((a, b) => {
    const prio = { high: 0, medium: 1, low: 2 };
    return prio[a.severity] - prio[b.severity];
  });

  return {
    version: 'audit-v1',
    historicalMode,
    style,
    score: normalizedScore,
    grade,
    findings: prioritized,
    recommendation: prioritized.length
      ? `Naechster sinnvoller Hand-Feinschliff: ${prioritized[0].message}`
      : 'Modell wirkt in der aktuellen Aufloesung historisch konsistent.',
  };
}
