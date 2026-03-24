import * as THREE from 'three';
import {
  makeStoneNormalMap,
  makeMasonryNormalMap,
  makeRockNormalMap,
  makeWoodNormalMap,
  makeStoneRoughnessMap,
  makeMasonryRoughnessMap,
} from './ProceduralTextures.js';

function makeTextureFromNoise(baseHex, seed = 42, amplitude = 24, alpha = 255) {
  const size = 128;
  const px = new Uint8Array(size * size * 4);
  const r0 = (baseHex >> 16) & 0xff;
  const g0 = (baseHex >> 8) & 0xff;
  const b0 = baseHex & 0xff;
  let s = ((seed + 1) * 2654435761) >>> 0;

  for (let i = 0; i < size * size; i++) {
    s = (s ^ (s >>> 16)) >>> 0;
    s = Math.imul(s, 0x45d9f3b) >>> 0;
    s = (s ^ (s >>> 16)) >>> 0;
    const n = ((s & 0xff) / 255 - 0.5) * amplitude;
    px[i * 4] = Math.max(0, Math.min(255, (r0 + n) | 0));
    px[i * 4 + 1] = Math.max(0, Math.min(255, (g0 + n) | 0));
    px[i * 4 + 2] = Math.max(0, Math.min(255, (b0 + n) | 0));
    px[i * 4 + 3] = alpha;
  }

  const tex = new THREE.DataTexture(px, size, size, THREE.RGBAFormat);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(4, 4);
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  return tex;
}

function makeMasonryTexture(baseHex, mortarHex, seed = 21, amplitude = 18) {
  const size = 256;
  const px = new Uint8Array(size * size * 4);
  const r0 = (baseHex >> 16) & 0xff;
  const g0 = (baseHex >> 8) & 0xff;
  const b0 = baseHex & 0xff;
  const mr = (mortarHex >> 16) & 0xff;
  const mg = (mortarHex >> 8) & 0xff;
  const mb = mortarHex & 0xff;
  let s = ((seed + 11) * 1103515245) >>> 0;

  for (let y = 0; y < size; y++) {
    const courseH = 18 + ((y >> 5) % 3) * 3;
    const row = Math.floor(y / courseH);
    const brickW = 24 + (row % 3) * 6;
    const offset = row % 2 === 0 ? 0 : Math.floor(brickW / 2);
    for (let x = 0; x < size; x++) {
      s = (s ^ (s >>> 15)) >>> 0;
      s = Math.imul(s, 2246822519) >>> 0;
      const n = ((s & 0xff) / 255 - 0.5) * amplitude;
      const inMortar =
        (y % courseH) < 2 ||
        (((x + offset) % brickW) < 2);
      const i = (y * size + x) * 4;
      const rr = inMortar ? mr : r0 + n;
      const gg = inMortar ? mg : g0 + n;
      const bb = inMortar ? mb : b0 + n;
      px[i] = Math.max(0, Math.min(255, rr | 0));
      px[i + 1] = Math.max(0, Math.min(255, gg | 0));
      px[i + 2] = Math.max(0, Math.min(255, bb | 0));
      px[i + 3] = 255;
    }
  }

  const tex = new THREE.DataTexture(px, size, size, THREE.RGBAFormat);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2.4, 2.4);
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  return tex;
}

function makeStrataTexture(baseHex, accentHex, seed = 31, amplitude = 20) {
  const size = 256;
  const px = new Uint8Array(size * size * 4);
  const r0 = (baseHex >> 16) & 0xff;
  const g0 = (baseHex >> 8) & 0xff;
  const b0 = baseHex & 0xff;
  const ar = (accentHex >> 16) & 0xff;
  const ag = (accentHex >> 8) & 0xff;
  const ab = accentHex & 0xff;
  let s = ((seed + 7) * 747796405) >>> 0;

  for (let y = 0; y < size; y++) {
    const band = 0.5 + 0.5 * Math.sin((y / size) * Math.PI * 18 + seed * 0.3);
    for (let x = 0; x < size; x++) {
      s = (s ^ (s >>> 16)) >>> 0;
      s = Math.imul(s, 0x45d9f3b) >>> 0;
      const n = ((s & 0xff) / 255 - 0.5) * amplitude;
      const mix = Math.max(0, Math.min(1, band * 0.55 + ((x % 17) / 17) * 0.12));
      const i = (y * size + x) * 4;
      px[i] = Math.max(0, Math.min(255, (r0 * (1 - mix) + ar * mix + n) | 0));
      px[i + 1] = Math.max(0, Math.min(255, (g0 * (1 - mix) + ag * mix + n) | 0));
      px[i + 2] = Math.max(0, Math.min(255, (b0 * (1 - mix) + ab * mix + n) | 0));
      px[i + 3] = 255;
    }
  }

  const tex = new THREE.DataTexture(px, size, size, THREE.RGBAFormat);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3.2, 2.2);
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  return tex;
}

function makeRoofTileTexture(baseHex, seamHex, seed = 13) {
  const size = 256;
  const px = new Uint8Array(size * size * 4);
  const r0 = (baseHex >> 16) & 0xff;
  const g0 = (baseHex >> 8) & 0xff;
  const b0 = baseHex & 0xff;
  const sr = (seamHex >> 16) & 0xff;
  const sg = (seamHex >> 8) & 0xff;
  const sb = seamHex & 0xff;
  let s = ((seed + 3) * 2654435761) >>> 0;

  for (let y = 0; y < size; y++) {
    const rowH = 14;
    const row = Math.floor(y / rowH);
    const tileW = 18;
    const offset = row % 2 === 0 ? 0 : 9;
    for (let x = 0; x < size; x++) {
      s = (s ^ (s >>> 16)) >>> 0;
      s = Math.imul(s, 0x27d4eb2d) >>> 0;
      const n = ((s & 0xff) / 255 - 0.5) * 14;
      const seam = (y % rowH) < 2 || ((x + offset) % tileW) < 2;
      const i = (y * size + x) * 4;
      const rr = seam ? sr : r0 + n;
      const gg = seam ? sg : g0 + n;
      const bb = seam ? sb : b0 + n;
      px[i] = Math.max(0, Math.min(255, rr | 0));
      px[i + 1] = Math.max(0, Math.min(255, gg | 0));
      px[i + 2] = Math.max(0, Math.min(255, bb | 0));
      px[i + 3] = 255;
    }
  }

  const tex = new THREE.DataTexture(px, size, size, THREE.RGBAFormat);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2.4, 2.4);
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  return tex;
}

function mkStoneMat(hex, seed = 42) {
  return new THREE.MeshStandardMaterial({
    map:          makeTextureFromNoise(hex, seed, 8),     // was 24 — reduces speckle
    normalMap:    makeStoneNormalMap(seed, 1.2, 256, 2),  // strength 2.6→1.2, repeat 3→2
    normalScale:  new THREE.Vector2(0.35, 0.35),          // was (1.0,1.0)
    roughnessMap: makeStoneRoughnessMap(seed + 5, 0.87, 256, 2),
    roughness: 0.87,
    metalness: 0.02,
    envMapIntensity: 0.30,
  });
}

function mkMasonryMat(hex, mortarHex, seed = 42) {
  return new THREE.MeshStandardMaterial({
    color: new THREE.Color(hex),
    map:          makeMasonryTexture(hex, mortarHex, seed, 8),  // amplitude 16→8
    normalMap:    makeMasonryNormalMap(seed, 1.5, 256, 2),      // strength 3.2→1.5
    normalScale:  new THREE.Vector2(0.45, 0.45),                // was (1.0,1.0)
    roughnessMap: makeMasonryRoughnessMap(seed + 7, 0.88, 256, 2),
    roughness: 0.88,
    metalness: 0.01,
    envMapIntensity: 0.25,
  });
}

function mkRockMat(hex, accentHex, seed = 71) {
  return new THREE.MeshStandardMaterial({
    color: new THREE.Color(hex),
    map:         makeStrataTexture(hex, accentHex, seed, 14),  // amplitude 18→14
    normalMap:   makeRockNormalMap(seed, 1.4, 256, 2),         // strength 3.0→1.4
    normalScale: new THREE.Vector2(0.45, 0.45),                // was (1.0,1.0)
    roughness: 0.96,
    metalness: 0.0,
    envMapIntensity: 0.15,
  });
}

function mkRoofMat(hex, seamHex, seed = 11) {
  return new THREE.MeshStandardMaterial({
    color: new THREE.Color(hex),
    map:         makeRoofTileTexture(hex, seamHex, seed),
    normalMap:   makeStoneNormalMap(seed + 3, 0.8, 256, 2),  // strength 1.5→0.8
    normalScale: new THREE.Vector2(0.35, 0.35),               // was (0.7,0.7)
    roughness: 0.86,
    metalness: 0.02,
    envMapIntensity: 0.20,
  });
}

let _renderer = null;
export function getRenderer() {
  if (!_renderer) {
    _renderer = new THREE.WebGLRenderer({
      antialias: true,
      logarithmicDepthBuffer: false,
      powerPreference: 'high-performance',
    });
    _renderer.shadowMap.enabled = true;
    _renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    _renderer.physicallyCorrectLights = true;
    _renderer.outputColorSpace = THREE.SRGBColorSpace;
    _renderer.toneMapping = THREE.ACESFilmicToneMapping;
    _renderer.toneMappingExposure = 1.0;
  }
  return _renderer;
}

export function mkMat(hex, rough = 0.8, metal = 0.05, seed = 12, textureAmp = 14) {
  return new THREE.MeshStandardMaterial({
    color: new THREE.Color(hex),
    map:         makeTextureFromNoise(hex, seed, Math.min(textureAmp, 10)),
    normalMap:   makeWoodNormalMap(seed, 0.9, 256, 2),   // strength 1.6→0.9
    normalScale: new THREE.Vector2(0.30, 0.30),           // was (0.5,0.5)
    roughness:   rough,
    metalness:   metal,
    envMapIntensity: 0.15,
  });
}

export function mkWaterMat(hex) {
  return new THREE.MeshStandardMaterial({
    color: new THREE.Color(hex),
    roughness: 0.12,
    metalness: 0.12,
    transparent: true,
    opacity: 0.84,
  });
}

const PALETTES = {
  crusader: {
    stone: () => mkMasonryMat(0xc9bda6, 0x8f826d, 11),
    rock: () => mkRockMat(0x8a7a60, 0x5d4f3f, 22),
    dark: () => mkMat(0x2f251c, 0.97, 0.01, 12, 8),
    roof: () => mkRoofMat(0x3a332c, 0x211a15, 15),
    wood: () => mkMat(0x5a3d22, 0.9, 0.02, 19, 18),
    ground: () => mkRockMat(0x7d7158, 0x5f533e, 25),
    gate: () => mkMat(0x4a3a2a, 0.96, 0.02, 18, 12),
    water: () => mkWaterMat(0x2d4f63),
  },
  japanese: {
    stone: () => mkMasonryMat(0xd7d0bf, 0xa9a18e, 33),
    rock: () => mkRockMat(0x928974, 0x6b6557, 44),
    dark: () => mkMat(0x1e1a14, 0.9, 0.05, 31, 10),
    roof: () => mkRoofMat(0x24303a, 0x121a20, 34),
    wood: () => mkMat(0x3a2410, 0.88, 0.02, 37, 18),
    ground: () => mkRockMat(0x6a6554, 0x4d473a, 41),
    gate: () => mkMat(0x1a1410, 0.92, 0.04, 43, 12),
    water: () => mkWaterMat(0x3a6272),
  },
  oriental: {
    stone: () => mkMasonryMat(0x90714e, 0x5f4b34, 55),
    rock: () => mkRockMat(0x5a452e, 0x342719, 66),
    dark: () => mkMat(0x2e2018, 0.94, 0.01, 57, 10),
    roof: () => mkRoofMat(0x7a3018, 0x452014, 61),
    wood: () => mkMat(0x5c3010, 0.88, 0.02, 63, 17),
    ground: () => mkRockMat(0x6e5b40, 0x4d3c2a, 67),
    gate: () => mkMat(0x4a3520, 0.92, 0.03, 69, 13),
    water: () => mkWaterMat(0x295067),
  },
  ancient: {
    stone: () => mkMasonryMat(0xa8926f, 0x75644a, 77),
    rock: () => mkRockMat(0x5b4938, 0x3b2f25, 88),
    dark: () => mkMat(0x3a2c18, 0.94, 0.01, 79, 10),
    roof: () => mkRoofMat(0x5a4228, 0x34261a, 83),
    wood: () => mkMat(0x5c3010, 0.88, 0.02, 85, 16),
    ground: () => mkRockMat(0x685746, 0x4b3f34, 89),
    gate: () => mkMat(0x5a4830, 0.92, 0.03, 91, 12),
    water: () => mkWaterMat(0x30576a),
  },
};

export function getMaterials(style = 'crusader') {
  const p = PALETTES[style] || PALETTES.crusader;
  return {
    stone: p.stone(),
    rock: p.rock(),
    dark: p.dark(),
    roof: p.roof(),
    wood: p.wood(),
    ground: p.ground(),
    gate: p.gate(),
    water: p.water(),
  };
}

export function resolveStyle(castle) {
  if (castle.dioramaStyle) return castle.dioramaStyle;
  const epoch = castle.epoch || '';
  const region = castle.region || '';
  if (epoch === 'Antike' || epoch === 'Spätantike') return 'ancient';
  if (epoch === 'Feudaljapan') return 'japanese';
  if (region === 'nahost' || (region === 'ostasien' && epoch !== 'Feudaljapan')) return 'oriental';
  return 'crusader';
}

export function getScenePreset(style = 'crusader') {
  switch (style) {
    case 'japanese':
      return {
        // sky params (used by SkySystem.buildSky, kept here for reference)
        useSky: true,
        fog: { color: 0x8ba8ae, density: 0.010 },
        ambient: { color: 0xd7ddd7, intensity: 1.6 },
        sun: { color: 0xf9f2df, intensity: 3.8, position: [18, 28, 16] },
        fill: { color: 0x95aeb3, intensity: 1.1, position: [-15, 10, -20] },
        rim: { color: 0x5f7d88, intensity: 0.55, position: [0, 8, -24] },
      };
    case 'oriental':
      return {
        useSky: true,
        fog: { color: 0xd4a868, density: 0.011 },
        ambient: { color: 0xd7c9aa, intensity: 1.7 },
        sun: { color: 0xffefcf, intensity: 4.0, position: [26, 30, 12] },
        fill: { color: 0x8ca0b0, intensity: 1.0, position: [-14, 10, -18] },
        rim: { color: 0x7b5b36, intensity: 0.7, position: [10, 6, -25] },
      };
    case 'ancient':
      return {
        useSky: true,
        fog: { color: 0xc0a87c, density: 0.010 },
        ambient: { color: 0xcfbea3, intensity: 1.65 },
        sun: { color: 0xffe4ba, intensity: 3.8, position: [24, 29, 10] },
        fill: { color: 0x8798aa, intensity: 0.90, position: [-18, 11, -16] },
        rim: { color: 0x74563a, intensity: 0.55, position: [6, 7, -24] },
      };
    default: // crusader
      return {
        useSky: true,
        fog: { color: 0x9cb8cc, density: 0.009 },
        ambient: { color: 0xd8ccba, intensity: 1.5 },
        sun: { color: 0xffefda, intensity: 4.5, position: [22, 35, 14] },
        fill: { color: 0x8ea2b8, intensity: 0.95, position: [-18, 12, -22] },
        rim: { color: 0xa38966, intensity: 0.80, position: [4, 8, -26] },
      };
  }
}
