import * as THREE from 'three';

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

export function mkMat(hex, rough = 0.9, metal = 0.03) {
  return new THREE.MeshStandardMaterial({
    color: new THREE.Color(hex),
    roughness: rough,
    metalness: metal,
  });
}

// ── Style-aware material palettes ────────────────────────────────────────
const PALETTES = {
  crusader: {
    stone:  () => mkMat(0x4a3d32, 0.92, 0.03),
    dark:   () => mkMat(0x2e2318, 0.95, 0.01),
    roof:   () => mkMat(0x1e1610, 0.88, 0.02),
    wood:   () => mkMat(0x3a2510, 0.88, 0.02),
    ground: () => mkMat(0x1c1a10, 1.00, 0.00),
    gate:   () => mkMat(0x3a2f22, 0.94, 0.04),
  },
  japanese: {
    stone:  () => mkMat(0xddd5c2, 0.82, 0.01), // Shikkui white plaster (off-white)
    dark:   () => mkMat(0x1e1a14, 0.90, 0.05), // dark lacquered wood
    roof:   () => mkMat(0x24303a, 0.76, 0.02), // dark blue-grey roof tiles
    wood:   () => mkMat(0x3a2410, 0.88, 0.02), // timber
    ground: () => mkMat(0x1c1a10, 1.00, 0.00),
    gate:   () => mkMat(0x1a1410, 0.92, 0.04), // dark gate wood
  },
  oriental: {
    stone:  () => mkMat(0x5a4a30, 0.86, 0.04),
    dark:   () => mkMat(0x2e2018, 0.94, 0.01),
    roof:   () => mkMat(0x7a3018, 0.80, 0.08), // terracotta
    wood:   () => mkMat(0x5c3010, 0.88, 0.02),
    ground: () => mkMat(0x1c1a10, 1.00, 0.00),
    gate:   () => mkMat(0x4a3520, 0.92, 0.03),
  },
  ancient: {
    stone:  () => mkMat(0x6a5a3c, 0.84, 0.02),
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
