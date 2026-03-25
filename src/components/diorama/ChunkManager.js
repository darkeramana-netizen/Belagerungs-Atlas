import * as THREE from 'three';

// ── ChunkManager ───────────────────────────────────────────────────────────────
// Minecraft-style chunk-based infinite world terrain.
// Replaces the single-mesh TerrainSystem with dynamically loaded 64 m × 64 m tiles.
//
// Features:
//   • Infinite domain FBM noise (no finite lattice, seamless across chunks)
//   • Castle flat zone: terrain is flat at castleBaseY inside flatR
//     → no visible "platform box", landscape rises naturally to castle level
//   • Per-style biome parameters (same as TerrainSystem)
//   • LOD: near chunks use 48 segs, medium 28 segs, far 14 segs
//   • Chunk throttling: max 4 new chunks per frame (no stutter)
//   • Rapier heightfield for the player-accessible central area
//
// Returns ChunkManager instance with:
//   init(scene)              — pre-warm central 3×3 chunks
//   update(camX, camZ, scene)— load/unload around camera (call each frame)
//   getHeightAt(wx, wz)      — world-space height query (NatureSystem / spawn)
//   getPhysicsData()         — { heights, segs, size } for Rapier
//   dispose()                — free all GPU resources

const CHUNK_SIZE    = 64;    // world units per chunk side
const NEAR_SEGS     = 48;   // segment density ≤ 1 chunk from camera
const MID_SEGS      = 28;   // segment density 2-3 chunks away
const FAR_SEGS      = 14;   // segment density 4+ chunks away
const VIEW_RADIUS   = 5;    // load chunks within this many chunk-radii (~320 m)
const UNLOAD_R      = VIEW_RADIUS + 1.5;
const MAX_PER_FRAME = 4;    // max new chunks built per frame (stagger CPU load)

// Physics heightfield covers the castle-accessible area (player rarely walks > 120m)
const PHYS_SIZE  = 256;
const PHYS_SEGS  = 128;     // → 129×129 = 16 641 vertices

// ── Per-style terrain parameters (matches TerrainSystem) ─────────────────────
const STYLE_PARAMS = {
  crusader: { amp: 5.5, scale: 0.022, oct: 5, gain: 0.48, hasMoat: true  },
  ancient:  { amp: 6.0, scale: 0.020, oct: 5, gain: 0.50, hasMoat: false },
  oriental: { amp: 3.5, scale: 0.016, oct: 4, gain: 0.42, hasMoat: false },
  japanese: { amp: 4.5, scale: 0.025, oct: 5, gain: 0.48, hasMoat: true  },
};

// ── Infinite-domain hash-based FBM ────────────────────────────────────────────
// Works at any (x, z) without a finite pre-built lattice — seamless chunk seams.

function hash2d(ix, iz, seed) {
  let h = (((ix * 374761393) ^ (iz * 668265263) ^ seed) | 0) >>> 0;
  h = (Math.imul(h ^ (h >>> 13), 1274126177)) >>> 0;
  return (h ^ (h >>> 16)) / 0xffffffff;   // [0, 1)
}

function valueNoise(x, z, seed) {
  const ix = Math.floor(x), iz = Math.floor(z);
  const fx = x - ix, fz = z - iz;
  const ux = fx * fx * (3 - 2 * fx), uz = fz * fz * (3 - 2 * fz);
  return (
    hash2d(ix,     iz,     seed) * (1 - ux) * (1 - uz) +
    hash2d(ix + 1, iz,     seed) *      ux  * (1 - uz) +
    hash2d(ix,     iz + 1, seed) * (1 - ux) *      uz  +
    hash2d(ix + 1, iz + 1, seed) *      ux  *      uz
  ) * 2.0 - 1.0;  // [-1, 1]
}

function fbm(x, z, seed, oct = 5, lac = 2.0, gain = 0.5) {
  let v = 0, a = 0.5, f = 1;
  for (let o = 0; o < oct; o++) {
    v += valueNoise(x * f, z * f, (seed ^ (o * 7919)) >>> 0) * a;
    f *= lac;
    a *= gain;
  }
  return v;
}

function smoothstep(t) { return t * t * (3 - 2 * t); }
function clamp01(t)    { return t < 0 ? 0 : t > 1 ? 1 : t; }

// ── ChunkManager ─────────────────────────────────────────────────────────────
export class ChunkManager {
  /**
   * @param {object}         opts
   * @param {string}         opts.style          — 'crusader'|'japanese'|'oriental'|'ancient'
   * @param {number}         opts.seed           — world seed (integer)
   * @param {number}         [opts.castleX=0]    — castle origin X in world space
   * @param {number}         [opts.castleZ=0]    — castle origin Z in world space
   * @param {number}         [opts.castleBaseY=0]— terrain height inside castle flat zone
   * @param {number}         [opts.castleR=20]   — outer ring radius in metres
   * @param {THREE.Material} opts.mat            — terrain material (shared across chunks)
   */
  constructor({ style, seed, castleX = 0, castleZ = 0, castleBaseY = 0, castleR = 20, mat }) {
    this._p      = STYLE_PARAMS[style] || STYLE_PARAMS.crusader;
    // Scramble seed for more interesting patterns (same hashing as TerrainSystem)
    this._seed   = ((seed + 1) * 2654435761) >>> 0;
    this._cx     = castleX;
    this._cz     = castleZ;
    this._baseY  = castleBaseY;
    this._flatR  = Math.max(castleR * 2.0, 36);
    this._blendR = Math.max(castleR * 3.5, 60);
    this._moatI  = this._flatR * 1.10;
    this._moatO  = this._flatR * 2.00;
    this._mat    = mat;
    this._chunks = new Map();  // "cx,cz" → { mesh, dispose }
    this._prevCX = Infinity;
    this._prevCZ = Infinity;

    // NatureSystem interface: .size controls scatter outer radius
    this.size = 200;

    // Bind so callers can destructure without losing 'this' context
    // (NatureSystem does: const { size, getHeightAt } = terrain)
    this.getHeightAt = this.getHeightAt.bind(this);
  }

  // ── Height at any world coordinate ─────────────────────────────────────────
  sampleHeight(wx, wz) {
    const p    = this._p;
    const dx   = wx - this._cx;
    const dz   = wz - this._cz;
    const dist = Math.sqrt(dx * dx + dz * dz);

    const sx  = wx * p.scale;
    const sz  = wz * p.scale;
    const raw = fbm(sx,       sz,       this._seed,       p.oct, 2.0, p.gain) * p.amp
              + fbm(sx * 2.8, sz * 2.8, this._seed + 997, 3,    2.0, 0.38  ) * p.amp * 0.22;

    // blend: 0 inside flat zone → 1 beyond blend zone
    const blend = clamp01(smoothstep(clamp01((dist - this._flatR) / (this._blendR - this._flatR))));

    // Optional moat dip just outside the castle ring
    let moat = 0;
    if (p.hasMoat && dist > this._moatI && dist < this._moatO) {
      const mt = (dist - this._moatI) / (this._moatO - this._moatI);
      moat = -Math.sin(mt * Math.PI) * 1.6;
    }

    // castleBaseY fills the flat zone and blends smoothly into FBM terrain
    const flatContrib = this._baseY * (1.0 - blend);
    return flatContrib + (raw * blend + moat * Math.min(1.0, blend * 3.5));
  }

  /** TerrainSystem-compatible height query (used by NatureSystem and spawn). */
  getHeightAt(wx, wz) {
    return this.sampleHeight(wx, wz);
  }

  // ── Chunk geometry helpers ──────────────────────────────────────────────────
  _segs(camCX, camCZ, cx, cz) {
    const d = Math.max(Math.abs(cx - camCX), Math.abs(cz - camCZ));
    if (d <= 1) return NEAR_SEGS;
    if (d <= 3) return MID_SEGS;
    return FAR_SEGS;
  }

  _buildChunk(cx, cz, segs) {
    const wx0 = cx * CHUNK_SIZE;
    const wz0 = cz * CHUNK_SIZE;
    const N   = segs + 1;

    const geo = new THREE.PlaneGeometry(CHUNK_SIZE, CHUNK_SIZE, segs, segs);
    geo.rotateX(-Math.PI / 2);

    const pos = geo.attributes.position;
    for (let j = 0; j <= segs; j++) {
      for (let i = 0; i <= segs; i++) {
        // local coords after rotation: x ∈ [-32,32], z ∈ [-32,32]
        const lx = (i / segs - 0.5) * CHUNK_SIZE;
        const lz = (j / segs - 0.5) * CHUNK_SIZE;
        pos.setY(j * N + i, this.sampleHeight(wx0 + lx, wz0 + lz));
      }
    }
    pos.needsUpdate = true;
    geo.computeVertexNormals();

    const mesh = new THREE.Mesh(geo, this._mat);
    // Mesh sits at chunk centre; local vertices are [-32,32] offsets
    mesh.position.set(wx0, 0, wz0);
    mesh.receiveShadow = true;

    return {
      mesh,
      dispose() { geo.dispose(); },
    };
  }

  // ── Pre-warm: build the 3×3 central grid synchronously ────────────────────
  init(scene) {
    const camCX = Math.round(this._cx / CHUNK_SIZE);
    const camCZ = Math.round(this._cz / CHUNK_SIZE);
    for (let dz = -1; dz <= 1; dz++) {
      for (let dx = -1; dx <= 1; dx++) {
        const key = `${camCX + dx},${camCZ + dz}`;
        if (!this._chunks.has(key)) {
          const segs  = this._segs(camCX, camCZ, camCX + dx, camCZ + dz);
          const chunk = this._buildChunk(camCX + dx, camCZ + dz, segs);
          scene.add(chunk.mesh);
          this._chunks.set(key, chunk);
        }
      }
    }
    this._prevCX = camCX;
    this._prevCZ = camCZ;
  }

  /**
   * Call every frame with current camera position.
   * Loads missing chunks (up to MAX_PER_FRAME per call) and unloads distant ones.
   */
  update(camX, camZ, scene) {
    const camCX = Math.round(camX / CHUNK_SIZE);
    const camCZ = Math.round(camZ / CHUNK_SIZE);

    // Skip the heavy work if camera hasn't moved to a new chunk
    if (camCX === this._prevCX && camCZ === this._prevCZ) return;
    this._prevCX = camCX;
    this._prevCZ = camCZ;

    const R = VIEW_RADIUS;
    let built = 0;

    // Load new chunks (spiralling from centre out via simple double loop)
    outer: for (let dz = -R; dz <= R; dz++) {
      for (let dx = -R; dx <= R; dx++) {
        if (dx * dx + dz * dz > R * R) continue;
        const key = `${camCX + dx},${camCZ + dz}`;
        if (!this._chunks.has(key)) {
          const segs  = this._segs(camCX, camCZ, camCX + dx, camCZ + dz);
          const chunk = this._buildChunk(camCX + dx, camCZ + dz, segs);
          scene.add(chunk.mesh);
          this._chunks.set(key, chunk);
          if (++built >= MAX_PER_FRAME) break outer;
        }
      }
    }

    // Unload out-of-range chunks
    const unloadR2 = UNLOAD_R * UNLOAD_R;
    for (const [key, chunk] of this._chunks) {
      const [kx, kz] = key.split(',').map(Number);
      if ((kx - camCX) ** 2 + (kz - camCZ) ** 2 > unloadR2) {
        scene.remove(chunk.mesh);
        chunk.dispose();
        this._chunks.delete(key);
      }
    }
  }

  // ── Rapier heightfield for the player-walkable central area ───────────────
  getPhysicsData() {
    const size = PHYS_SIZE;
    const segs = PHYS_SEGS;
    const N    = segs + 1;
    const heights = new Float32Array(N * N);
    for (let j = 0; j <= segs; j++) {
      for (let i = 0; i <= segs; i++) {
        const wx = this._cx + (i / segs - 0.5) * size;
        const wz = this._cz + (j / segs - 0.5) * size;
        heights[j * N + i] = this.sampleHeight(wx, wz);
      }
    }
    return { heights, segs, size };
  }

  dispose() {
    for (const chunk of this._chunks.values()) chunk.dispose();
    this._chunks.clear();
  }
}
