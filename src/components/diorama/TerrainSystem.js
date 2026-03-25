import * as THREE from 'three';

// ── TerrainSystem ─────────────────────────────────────────────────────────────
// Replaces the flat CircleGeometry ground with a procedurally displaced terrain.
// The area directly under the castle (within castleR * 1.25) is kept flat at y=0
// so existing components don't float.  Surrounding land rises/falls with FBM noise.
// An optional moat dip is placed just outside the castle footprint for realism.
//
// Returns:
//   mesh        — THREE.Mesh, add to scene
//   heights     — Float32Array(N×N) in row-major order for Rapier heightfield
//   segs        — number of grid segments (heights is (segs+1)² values)
//   size        — terrain edge length in metres
//   getHeightAt(wx, wz) — bilinear height lookup at any world position

// ── constants ─────────────────────────────────────────────────────────────────
export const TERRAIN_SIZE = 200;   // metres, must be > largest castle
const TERRAIN_SEGS        = 120;   // 120×120 → 14641 vertices, smoother silhouette

// ── noise helpers ─────────────────────────────────────────────────────────────

function buildLattice(seed, n) {
  const t = new Float32Array(n * n);
  let s = ((seed + 1) * 2654435761) >>> 0;
  for (let i = 0; i < n * n; i++) {
    s = (s ^ (s >>> 16)) >>> 0;
    s = Math.imul(s, 0x45d9f3b) >>> 0;
    s = (s ^ (s >>> 16)) >>> 0;
    t[i] = (s & 0xffff) / 32767.5 - 1.0;
  }
  return t;
}

function valueNoise(x, z, t, n) {
  const xi = ((x | 0) % n + n) % n;
  const zi = ((z | 0) % n + n) % n;
  const xf = x - Math.floor(x), zf = z - Math.floor(z);
  const x1 = (xi + 1) % n, z1 = (zi + 1) % n;
  const ux = xf * xf * (3 - 2 * xf), uz = zf * zf * (3 - 2 * zf);
  return (
    t[zi * n + xi] * (1 - ux) * (1 - uz) +
    t[zi * n + x1] *      ux  * (1 - uz) +
    t[z1 * n + xi] * (1 - ux) *      uz  +
    t[z1 * n + x1] *      ux  *      uz
  );
}

function fbm(x, z, t, n, oct = 5, lac = 2.0, gain = 0.5) {
  let v = 0, a = 0.5, f = 1;
  for (let o = 0; o < oct; o++) {
    v += valueNoise(x * f, z * f, t, n) * a;
    f *= lac; a *= gain;
  }
  return v;
}

function smoothstep(t) { return t * t * (3 - 2 * t); }
function clamp01(t) { return t < 0 ? 0 : t > 1 ? 1 : t; }

// ── per-style parameters ──────────────────────────────────────────────────────
const STYLE_PARAMS = {
  crusader: { amp: 5.5, scale: 0.022, oct: 5, gain: 0.48, hasMoat: true  },
  ancient:  { amp: 6.0, scale: 0.020, oct: 5, gain: 0.50, hasMoat: false },
  oriental: { amp: 3.5, scale: 0.016, oct: 4, gain: 0.42, hasMoat: false },
  japanese: { amp: 4.5, scale: 0.025, oct: 5, gain: 0.48, hasMoat: true  },
};

// ── main export ───────────────────────────────────────────────────────────────

/**
 * Build the terrain mesh and return data needed for Rapier heightfield.
 *
 * @param {number}                  castleR   — outer ring radius in metres
 * @param {string}                  style     — 'crusader'|'japanese'|'oriental'|'ancient'
 * @param {number}                  seed      — PRNG seed (changes terrain shape)
 * @param {THREE.Material}          mat       — ground material (rock/dirt)
 */
export function buildTerrain(castleR = 20, style = 'crusader', seed = 42, mat) {
  const p     = STYLE_PARAMS[style] || STYLE_PARAMS.crusader;
  const size  = TERRAIN_SIZE;
  const segs  = TERRAIN_SEGS;
  const N     = segs + 1;

  const lattice  = buildLattice(seed,       64);
  const detail   = buildLattice(seed + 997, 64);

  // Castle footprint zones.
  // flatR must cover the outermost TERRAIN_STACK layer including its scale
  // multiplier (up to ×1.18 on a ~29 m footprint → 34.5 m for Krak).
  // Using ×2.0 gives 40 m for a 20 m outer ring — enough for any current castle.
  const flatR  = Math.max(castleR * 2.0, 36); // flat below this radius
  const blendR = Math.max(castleR * 3.5, 60); // full terrain by this radius

  // Moat: always place OUTSIDE the flat zone so it never cuts into TERRAIN_STACK
  // polygon geometry.  Starting at flatR×1.10 puts it just beyond the castle area.
  const moatInner = flatR * 1.10;
  const moatOuter = flatR * 2.00;

  // Build heights array (Rapier layout: row=Z, col=X)
  const heights = new Float32Array(N * N);

  for (let j = 0; j <= segs; j++) {
    for (let i = 0; i <= segs; i++) {
      const wx  = (i / segs - 0.5) * size;
      const wz  = (j / segs - 0.5) * size;
      const dist = Math.sqrt(wx * wx + wz * wz);

      // FBM terrain
      const sx = wx * p.scale, sz = wz * p.scale;
      const raw = fbm(sx, sz, lattice, 64, p.oct, 2.0, p.gain) * p.amp
                + fbm(sx * 2.8, sz * 2.8, detail,  64, 3,    2.0, 0.38) * p.amp * 0.22;

      // Blend: 0 inside flat zone → 1 outside blend zone
      const blend = clamp01(smoothstep(clamp01((dist - flatR) / (blendR - flatR))));

      // Moat dip just outside castle ring
      let moat = 0;
      if (p.hasMoat && dist > moatInner && dist < moatOuter) {
        const mt = (dist - moatInner) / (moatOuter - moatInner);
        moat = -Math.sin(mt * Math.PI) * 1.6;
      }

      // Edge taper: fade terrain back to 0 near boundary to avoid cliffs at edge
      const edgeR    = size * 0.46;
      const edgeFade = clamp01(smoothstep(clamp01((size * 0.5 - dist) / (size * 0.08))));

      heights[j * N + i] = (raw * blend + moat * Math.min(1.0, blend * 3.5)) * edgeFade;
    }
  }

  // ── Three.js mesh (PlaneGeometry rotated to XZ, vertices displaced by heights) ──
  const geo = new THREE.PlaneGeometry(size, size, segs, segs);
  geo.rotateX(-Math.PI / 2);

  const pos = geo.attributes.position;
  // PlaneGeometry vertex order after rotation: row = Z, column = X (same as our heights)
  for (let j = 0; j <= segs; j++) {
    for (let i = 0; i <= segs; i++) {
      pos.setY(j * N + i, heights[j * N + i]);
    }
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();

  const mesh = new THREE.Mesh(geo, mat);
  mesh.receiveShadow = true;

  // ── Height lookup (bilinear interpolation) ───────────────────────────────────
  function getHeightAt(wx, wz) {
    const u  = (wx / size + 0.5) * segs;
    const v  = (wz / size + 0.5) * segs;
    const i0 = Math.max(0, Math.min(segs - 1, Math.floor(u)));
    const j0 = Math.max(0, Math.min(segs - 1, Math.floor(v)));
    const fu = u - i0, fv = v - j0;
    const h00 = heights[ j0      * N + i0    ];
    const h10 = heights[ j0      * N + (i0+1)];
    const h01 = heights[(j0 + 1) * N + i0    ];
    const h11 = heights[(j0 + 1) * N + (i0+1)];
    return h00 + (h10 - h00) * fu + (h01 - h00) * fv + (h11 - h10 - h01 + h00) * fu * fv;
  }

  return { mesh, heights, segs, size, getHeightAt };
}
