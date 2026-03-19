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
    stone:  () => mkMat(0x3a3028, 0.88, 0.02),
    dark:   () => mkMat(0x1a120a, 0.95, 0.03),
    roof:   () => mkMat(0x1c2a1a, 0.82, 0.01), // dark green-grey tiles
    wood:   () => mkMat(0x4a2e0c, 0.85, 0.02),
    ground: () => mkMat(0x1c1a10, 1.00, 0.00),
    gate:   () => mkMat(0x2a1e0e, 0.93, 0.02),
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
  const epoch  = castle.epoch  || '';
  const region = castle.region || '';
  if (epoch === 'Feudaljapan') return 'japanese';
  if (region === 'nahost' || (region === 'asien' && epoch !== 'Feudaljapan')) return 'oriental';
  if (epoch === 'Antike' || epoch === 'Spätantike') return 'ancient';
  return 'crusader';
}
