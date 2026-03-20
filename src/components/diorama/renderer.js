import * as THREE from 'three';

// ── Procedural stone noise texture ───────────────────────────────────────
// Deterministic from `seed`; creates colour variation that simulates stone.
function makeNoiseTexture(baseHex, seed = 42) {
  const size = 128;
  const px = new Uint8Array(size * size * 4);
  const r0 = (baseHex >> 16) & 0xff;
  const g0 = (baseHex >> 8)  & 0xff;
  const b0 =  baseHex        & 0xff;
  let s = ((seed + 1) * 2654435761) >>> 0;
  for (let i = 0; i < size * size; i++) {
    s = (s ^ (s >>> 16)) >>> 0;
    s = Math.imul(s, 0x45d9f3b) >>> 0;
    s = (s ^ (s >>> 16)) >>> 0;
    const n = ((s & 0xff) / 255 - 0.5) * 52; // noise ±26
    px[i * 4]     = Math.max(0, Math.min(255, (r0 + n) | 0));
    px[i * 4 + 1] = Math.max(0, Math.min(255, (g0 + n) | 0));
    px[i * 4 + 2] = Math.max(0, Math.min(255, (b0 + n) | 0));
    px[i * 4 + 3] = 255;
  }
  const tex = new THREE.DataTexture(px, size, size, THREE.RGBAFormat);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(4, 4);
  tex.anisotropy = 4; // reduces shimmer at glancing angles
  tex.needsUpdate = true;
  return tex;
}

// Stone material with procedural noise map
function mkStoneMat(hex, seed = 42) {
  return new THREE.MeshStandardMaterial({
    map:       makeNoiseTexture(hex, seed),
    roughness: 0.85,
    metalness: 0.02,
  });
}

// ── Singleton WebGL renderer ─────────────────────────────────────────────
let _renderer = null;
export function getRenderer() {
  if (!_renderer) {
    _renderer = new THREE.WebGLRenderer({ antialias: true, logarithmicDepthBuffer: false });
    _renderer.shadowMap.enabled = true;
    _renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    _renderer.toneMapping = THREE.ReinhardToneMapping;
    _renderer.toneMappingExposure = 1.8;
  }
  return _renderer;
}

export function mkMat(hex, rough = 0.80, metal = 0.05) {
  return new THREE.MeshStandardMaterial({
    color: new THREE.Color(hex),
    roughness: rough,
    metalness: metal,
  });
}

// ── Style-aware material palettes ────────────────────────────────────────
const PALETTES = {
  crusader: {
    stone:  () => mkStoneMat(0x4a3d32, 11),
    rock:   () => mkStoneMat(0x2e2a1c, 22), // darker terrain / glacis
    dark:   () => mkMat(0x2e2318, 0.95, 0.01),
    roof:   () => mkMat(0x1e1610, 0.88, 0.02),
    wood:   () => mkMat(0x3a2510, 0.88, 0.02),
    ground: () => mkMat(0x1c1a10, 1.00, 0.00),
    gate:   () => mkMat(0x3a2f22, 0.94, 0.04),
  },
  japanese: {
    stone:  () => mkStoneMat(0xddd5c2, 33), // Shikkui white plaster (off-white)
    rock:   () => mkStoneMat(0x8a8272, 44), // darker base / stone terrain
    dark:   () => mkMat(0x1e1a14, 0.90, 0.05), // dark lacquered wood
    roof:   () => mkMat(0x24303a, 0.76, 0.02), // dark blue-grey roof tiles
    wood:   () => mkMat(0x3a2410, 0.88, 0.02), // timber
    ground: () => mkMat(0x1c1a10, 1.00, 0.00),
    gate:   () => mkMat(0x1a1410, 0.92, 0.04), // dark gate wood
  },
  oriental: {
    stone:  () => mkStoneMat(0x5a4a30, 55),
    rock:   () => mkStoneMat(0x3a2e1a, 66), // darker desert rock
    dark:   () => mkMat(0x2e2018, 0.94, 0.01),
    roof:   () => mkMat(0x7a3018, 0.80, 0.08), // terracotta
    wood:   () => mkMat(0x5c3010, 0.88, 0.02),
    ground: () => mkMat(0x1c1a10, 1.00, 0.00),
    gate:   () => mkMat(0x4a3520, 0.92, 0.03),
  },
  ancient: {
    stone:  () => mkStoneMat(0x6a5a3c, 77),
    rock:   () => mkStoneMat(0x3c3022, 88), // Masada-style rock — noticeably darker
    dark:   () => mkMat(0x3a2c18, 0.94, 0.01),
    roof:   () => mkMat(0x5a4228, 0.88, 0.02),
    wood:   () => mkMat(0x5c3010, 0.88, 0.02),
    ground: () => mkMat(0x1c1a10, 1.00, 0.00),
    gate:   () => mkMat(0x5a4830, 0.92, 0.03),
  },
};

export function getMaterials(style = 'crusader') {
  const p = PALETTES[style] || PALETTES.crusader;
  return {
    stone:  p.stone(),
    rock:   p.rock(),
    dark:   p.dark(),
    roof:   p.roof(),
    wood:   p.wood(),
    ground: p.ground(),
    gate:   p.gate(),
  };
}

// ── Derive visual style from castle metadata ─────────────────────────────
export function resolveStyle(castle) {
  // Explicit per-castle override wins
  if (castle.dioramaStyle) return castle.dioramaStyle;
  const epoch  = castle.epoch  || '';
  const region = castle.region || '';
  // Ancient epoch takes precedence over region — Antike nahost castles are NOT Islamic
  if (epoch === 'Antike' || epoch === 'Spätantike') return 'ancient';
  if (epoch === 'Feudaljapan') return 'japanese';
  if (region === 'nahost' || (region === 'ostasien' && epoch !== 'Feudaljapan')) return 'oriental';
  return 'crusader';
}
