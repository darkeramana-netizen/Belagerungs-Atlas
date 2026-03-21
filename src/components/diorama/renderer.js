import * as THREE from 'three';

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

function mkStoneMat(hex, seed = 42) {
  return new THREE.MeshStandardMaterial({
    map: makeTextureFromNoise(hex, seed, 24),
    bumpMap: makeTextureFromNoise(0x7f7f7f, seed + 101, 42),
    bumpScale: 0.08,
    roughness: 0.84,
    metalness: 0.02,
  });
}

let _renderer = null;
export function getRenderer() {
  if (!_renderer) {
    _renderer = new THREE.WebGLRenderer({ antialias: true, logarithmicDepthBuffer: false });
    _renderer.shadowMap.enabled = true;
    _renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    _renderer.toneMapping = THREE.ACESFilmicToneMapping;
    _renderer.toneMappingExposure = 1.32;
  }
  return _renderer;
}

export function mkMat(hex, rough = 0.8, metal = 0.05, seed = 12, textureAmp = 14) {
  return new THREE.MeshStandardMaterial({
    color: new THREE.Color(hex),
    map: makeTextureFromNoise(hex, seed, textureAmp),
    bumpMap: makeTextureFromNoise(0x7f7f7f, seed + 27, textureAmp * 1.2),
    bumpScale: 0.03,
    roughness: rough,
    metalness: metal,
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
    stone: () => mkStoneMat(0x4a3d32, 11),
    rock: () => mkStoneMat(0x2e2a1c, 22),
    dark: () => mkMat(0x2e2318, 0.95, 0.01, 12, 10),
    roof: () => mkMat(0x1e1610, 0.88, 0.02, 15, 12),
    wood: () => mkMat(0x3a2510, 0.88, 0.02, 19, 18),
    ground: () => mkMat(0x1c1a10, 1.0, 0.0, 25, 8),
    gate: () => mkMat(0x3a2f22, 0.94, 0.04, 18, 14),
    water: () => mkWaterMat(0x2d4f63),
  },
  japanese: {
    stone: () => mkStoneMat(0xddd5c2, 33),
    rock: () => mkStoneMat(0x8a8272, 44),
    dark: () => mkMat(0x1e1a14, 0.9, 0.05, 31, 10),
    roof: () => mkMat(0x24303a, 0.76, 0.02, 34, 16),
    wood: () => mkMat(0x3a2410, 0.88, 0.02, 37, 18),
    ground: () => mkMat(0x1c1a10, 1.0, 0.0, 41, 8),
    gate: () => mkMat(0x1a1410, 0.92, 0.04, 43, 12),
    water: () => mkWaterMat(0x3a6272),
  },
  oriental: {
    stone: () => mkStoneMat(0x5a4a30, 55),
    rock: () => mkStoneMat(0x3a2e1a, 66),
    dark: () => mkMat(0x2e2018, 0.94, 0.01, 57, 10),
    roof: () => mkMat(0x7a3018, 0.8, 0.08, 61, 15),
    wood: () => mkMat(0x5c3010, 0.88, 0.02, 63, 17),
    ground: () => mkMat(0x1c1a10, 1.0, 0.0, 67, 8),
    gate: () => mkMat(0x4a3520, 0.92, 0.03, 69, 13),
    water: () => mkWaterMat(0x295067),
  },
  ancient: {
    stone: () => mkStoneMat(0x6a5a3c, 77),
    rock: () => mkStoneMat(0x3c3022, 88),
    dark: () => mkMat(0x3a2c18, 0.94, 0.01, 79, 10),
    roof: () => mkMat(0x5a4228, 0.88, 0.02, 83, 15),
    wood: () => mkMat(0x5c3010, 0.88, 0.02, 85, 16),
    ground: () => mkMat(0x1c1a10, 1.0, 0.0, 89, 8),
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
        background: 0x0b1010,
        fog: { color: 0x0b1010, density: 0.013 },
        ambient: { color: 0xd7ddd7, intensity: 2.3 },
        sun: { color: 0xf9f2df, intensity: 4.8, position: [18, 28, 16] },
        fill: { color: 0x95aeb3, intensity: 1.6, position: [-15, 10, -20] },
        rim: { color: 0x5f7d88, intensity: 0.75, position: [0, 8, -24] },
      };
    case 'oriental':
      return {
        background: 0x120d08,
        fog: { color: 0x120d08, density: 0.014 },
        ambient: { color: 0xd7c9aa, intensity: 2.5 },
        sun: { color: 0xffefcf, intensity: 5.3, position: [26, 30, 12] },
        fill: { color: 0x8ca0b0, intensity: 1.4, position: [-14, 10, -18] },
        rim: { color: 0x7b5b36, intensity: 0.9, position: [10, 6, -25] },
      };
    case 'ancient':
      return {
        background: 0x100b07,
        fog: { color: 0x100b07, density: 0.015 },
        ambient: { color: 0xcfbea3, intensity: 2.45 },
        sun: { color: 0xffe4ba, intensity: 5.0, position: [24, 29, 10] },
        fill: { color: 0x8798aa, intensity: 1.25, position: [-18, 11, -16] },
        rim: { color: 0x74563a, intensity: 0.75, position: [6, 7, -24] },
      };
    default:
      return {
        background: 0x0c0a07,
        fog: { color: 0x0c0a07, density: 0.0145 },
        ambient: { color: 0xd4c4ab, intensity: 2.55 },
        sun: { color: 0xfff3df, intensity: 5.4, position: [22, 32, 14] },
        fill: { color: 0x93a9c3, intensity: 1.55, position: [-18, 12, -22] },
        rim: { color: 0x7b6f61, intensity: 0.72, position: [4, 8, -26] },
      };
  }
}
