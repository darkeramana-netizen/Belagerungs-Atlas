import * as THREE from 'three';

// ── Procedural PBR Texture Generator ─────────────────────────────────────────
// Generates DataTextures for normal maps and roughness maps without any
// external assets.  All generation is CPU-side (fast enough at 256×256).

// ── Value noise helpers ───────────────────────────────────────────────────────

function hashSeed(seed) {
  let s = ((seed + 1) * 2654435761) >>> 0;
  s = (s ^ (s >>> 16)) >>> 0;
  s = Math.imul(s, 0x45d9f3b) >>> 0;
  return (s ^ (s >>> 16)) >>> 0;
}

/** Fast 2-D value noise, returns [-1, 1]. Wraps at `size`. */
function noise2(x, y, size, table) {
  const xi = ((x | 0) + size) % size, yi = ((y | 0) + size) % size;
  const xf = x - Math.floor(x), yf = y - Math.floor(y);
  const x1 = (xi + 1) % size,  y1 = (yi + 1) % size;

  // Bilinear interpolation over 4 lattice corners
  const n00 = table[yi * size + xi];
  const n10 = table[yi * size + x1];
  const n01 = table[y1 * size + xi];
  const n11 = table[y1 * size + x1];
  const ux = xf * xf * (3 - 2 * xf);
  const uy = yf * yf * (3 - 2 * yf);
  return (n00 + (n10 - n00) * ux + (n01 - n00) * uy + (n11 - n10 - n01 + n00) * ux * uy);
}

/** Build a random lattice table of size×size float values in [-1, 1]. */
function buildTable(size, seed) {
  const t = new Float32Array(size * size);
  let s = hashSeed(seed);
  for (let i = 0; i < size * size; i++) {
    s = (s ^ (s >>> 16)) >>> 0;
    s = Math.imul(s, 0x45d9f3b) >>> 0;
    s = (s ^ (s >>> 16)) >>> 0;
    t[i] = (s & 0xffff) / 32767.5 - 1.0;
  }
  return t;
}

/** Sum multiple octaves of noise → height field in [-1, 1]. */
function fbm(x, y, size, table, octaves = 4, lacunarity = 2.0, gain = 0.5) {
  let val = 0, amp = 0.5, freq = 1;
  for (let o = 0; o < octaves; o++) {
    val  += noise2(x * freq, y * freq, size, table) * amp;
    freq *= lacunarity;
    amp  *= gain;
  }
  return val; // roughly [-1, 1]
}

// ── Normal map from height field ──────────────────────────────────────────────

/**
 * Build a DataTexture normal map from an arbitrary height function.
 * @param {(x:number, y:number) => number} heightFn   returns value in [-1,1]
 * @param {number}  size     texture resolution (power of two)
 * @param {number}  strength normal exaggeration (higher = bumpier)
 * @param {number}  repeat   UV repeat count
 */
function normalMapFromFn(heightFn, size, strength, repeat) {
  const px = new Uint8Array(size * size * 4);
  const step = 1.0 / size;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = x * step, v = y * step;
      const hL = heightFn(u - step, v);
      const hR = heightFn(u + step, v);
      const hD = heightFn(u, v - step);
      const hU = heightFn(u, v + step);
      const dx = (hR - hL) * strength;
      const dy = (hU - hD) * strength;
      const len = Math.sqrt(dx * dx + dy * dy + 1.0);
      const i = (y * size + x) * 4;
      px[i]     = (((-dx / len) * 0.5 + 0.5) * 255 + 0.5) | 0;
      px[i + 1] = (((-dy / len) * 0.5 + 0.5) * 255 + 0.5) | 0;
      px[i + 2] = (((1  / len) * 0.5 + 0.5) * 255 + 0.5) | 0;
      px[i + 3] = 255;
    }
  }

  const tex = new THREE.DataTexture(px, size, size, THREE.RGBAFormat);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeat, repeat);
  tex.anisotropy = 8;
  tex.needsUpdate = true;
  return tex;
}

/**
 * Build a single-channel (R8) roughness map DataTexture.
 * @param {(x:number, y:number) => number} roughFn  returns value in [0,1]
 * @param {number} size
 * @param {number} repeat
 */
function roughnessMapFromFn(roughFn, size, repeat) {
  const px = new Uint8Array(size * size * 4);
  const step = 1.0 / size;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const v = Math.max(0, Math.min(1, roughFn(x * step, y * step)));
      const i = (y * size + x) * 4;
      const b = (v * 255 + 0.5) | 0;
      px[i] = px[i + 1] = px[i + 2] = b;
      px[i + 3] = 255;
    }
  }

  const tex = new THREE.DataTexture(px, size, size, THREE.RGBAFormat);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeat, repeat);
  tex.anisotropy = 8;
  tex.needsUpdate = true;
  return tex;
}

// ── Public texture factories ──────────────────────────────────────────────────

/**
 * Rough ashlar stone normal map — large irregular blocks with surface pitting.
 */
export function makeStoneNormalMap(seed = 1, strength = 2.8, size = 256, repeat = 3) {
  const t  = buildTable(size, seed);
  const t2 = buildTable(size, seed + 77);
  return normalMapFromFn(
    (u, v) => fbm(u * size, v * size, size, t, 4) * 0.65
            + fbm(u * size * 2.3, v * size * 2.3, size, t2, 3) * 0.35,
    size, strength, repeat,
  );
}

/**
 * Masonry (cut-block) normal map — flat stone faces with raised edges.
 */
export function makeMasonryNormalMap(seed = 2, strength = 3.5, size = 256, repeat = 2) {
  const t = buildTable(size, seed);
  const BRICK_W = size / 6, BRICK_H = size / 4;

  return normalMapFromFn((u, v) => {
    const px = u * size, py = v * size;
    const row    = Math.floor(py / BRICK_H);
    const offset = (row % 2) * (BRICK_W * 0.5);
    const bx     = (px + offset) % BRICK_W;
    const by     = py % BRICK_H;
    const mortarX = Math.min(bx, BRICK_W  - bx) / (BRICK_W  * 0.1);
    const mortarY = Math.min(by, BRICK_H - by) / (BRICK_H * 0.1);
    const mortar  = Math.max(0, 1 - Math.min(mortarX, mortarY)); // 1 at mortar joints
    const surface = fbm(px, py, size, t, 3) * 0.6;
    return -mortar * 0.8 + surface * (1 - mortar * 0.5);
  }, size, strength, repeat);
}

/**
 * Rocky strata normal map — layered sediment with cracked surface.
 */
export function makeRockNormalMap(seed = 3, strength = 3.0, size = 256, repeat = 2.5) {
  const t = buildTable(size, seed);
  return normalMapFromFn((u, v) => {
    const strata = Math.sin((v * size / 9.0 + fbm(u * size, v * size, size, t, 2) * 2.5) * Math.PI * 2) * 0.5;
    const crack  = fbm(u * size * 1.8, v * size * 1.8, size, t, 4) * 0.5;
    return strata * 0.6 + crack * 0.4;
  }, size, strength, repeat);
}

/**
 * Wood-grain normal map — long parallel fibres with occasional knots.
 */
export function makeWoodNormalMap(seed = 4, strength = 1.8, size = 256, repeat = 2) {
  const t = buildTable(size, seed);
  return normalMapFromFn((u, v) => {
    const grain = Math.sin((v * size * 0.5 + fbm(u * size, v * size, size, t, 2) * 4) * 0.8) * 0.7;
    const fine  = fbm(u * size * 3, v * size * 3, size, t, 2) * 0.3;
    return grain + fine;
  }, size, strength, repeat);
}

/**
 * Roughness map for stone — wet-joint lines are smoother, face centres rougher.
 */
export function makeStoneRoughnessMap(seed = 5, baseRough = 0.88, size = 256, repeat = 3) {
  const t = buildTable(size, seed);
  return roughnessMapFromFn(
    (u, v) => baseRough + fbm(u * size, v * size, size, t, 3) * 0.12,
    size, repeat,
  );
}

/**
 * Roughness map for masonry — mortar joints are slightly rougher than stone.
 */
export function makeMasonryRoughnessMap(seed = 6, baseRough = 0.86, size = 256, repeat = 2) {
  const t = buildTable(size, seed);
  const BRICK_W = size / 6, BRICK_H = size / 4;

  return roughnessMapFromFn((u, v) => {
    const px = u * size, py = v * size;
    const row    = Math.floor(py / BRICK_H);
    const offset = (row % 2) * (BRICK_W * 0.5);
    const bx     = (px + offset) % BRICK_W;
    const by     = py % BRICK_H;
    const mortarX = Math.min(bx, BRICK_W  - bx) / (BRICK_W  * 0.1);
    const mortarY = Math.min(by, BRICK_H - by) / (BRICK_H * 0.1);
    const mortar  = Math.max(0, 1 - Math.min(mortarX, mortarY));
    const noise   = fbm(px, py, size, t, 2) * 0.06;
    return baseRough + mortar * 0.08 + noise;
  }, size, repeat);
}
