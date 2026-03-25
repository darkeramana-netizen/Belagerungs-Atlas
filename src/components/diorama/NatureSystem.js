import * as THREE from 'three';

// ── NatureSystem ──────────────────────────────────────────────────────────────
// Distributes instanced rocks, boulders and small stones over the FBM terrain
// area that lies OUTSIDE the castle flat zone.  Uses THREE.InstancedMesh for
// a single draw call per prop type (very low GPU overhead).
//
// Biome parameters are per diorama style so the landscape feels consistent:
//   crusader → sandy limestone desert, scattered pale rocks
//   japanese → forest undergrowth, mossy grey stones
//   oriental → arid clay terrain, reddish boulders
//   ancient  → Mediterranean scrub, warm sandstone rocks
//
// Returns: { add(scene), dispose() }

// ── deterministic RNG ─────────────────────────────────────────────────────────
function makeRng(seed) {
  let s = ((seed + 1) * 2654435761) >>> 0;
  return () => {
    s = (s ^ (s >>> 16)) >>> 0;
    s = Math.imul(s, 0x45d9f3b) >>> 0;
    s = (s ^ (s >>> 16)) >>> 0;
    return (s >>> 0) / 0xffffffff;
  };
}

// ── biome table ───────────────────────────────────────────────────────────────
const BIOMES = {
  crusader: {
    rock:    { count: 220, scaleMin: 0.28, scaleMax: 1.70, tilt: 0.32, color: 0x9a8c6a },
    boulder: { count:  48, scaleMin: 1.60, scaleMax: 4.00, tilt: 0.18, color: 0x7d7058 },
    stone:   { count: 360, scaleMin: 0.05, scaleMax: 0.26, tilt: 0.55, color: 0xb0a07a },
  },
  japanese: {
    rock:    { count: 200, scaleMin: 0.30, scaleMax: 1.80, tilt: 0.28, color: 0x6a6255 },
    boulder: { count:  42, scaleMin: 1.80, scaleMax: 4.50, tilt: 0.14, color: 0x504840 },
    stone:   { count: 280, scaleMin: 0.05, scaleMax: 0.22, tilt: 0.50, color: 0x7a7060 },
  },
  oriental: {
    rock:    { count: 190, scaleMin: 0.28, scaleMax: 1.60, tilt: 0.30, color: 0x806a48 },
    boulder: { count:  40, scaleMin: 1.40, scaleMax: 3.80, tilt: 0.20, color: 0x604830 },
    stone:   { count: 300, scaleMin: 0.05, scaleMax: 0.24, tilt: 0.58, color: 0x9a8060 },
  },
  ancient: {
    rock:    { count: 210, scaleMin: 0.30, scaleMax: 1.80, tilt: 0.28, color: 0x9e8e6a },
    boulder: { count:  52, scaleMin: 1.60, scaleMax: 4.20, tilt: 0.18, color: 0x806850 },
    stone:   { count: 330, scaleMin: 0.06, scaleMax: 0.25, tilt: 0.52, color: 0xb8a478 },
  },
};

// ── geometry builders ─────────────────────────────────────────────────────────

/** Irregular rock: IcosahedronGeometry with mild Y-flattening. */
function makeRockGeo() {
  const geo = new THREE.IcosahedronGeometry(0.5, 1);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    pos.setY(i, pos.getY(i) * 0.68);   // flatten into a chunky slab
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
  return geo;
}

/** Small rounded stone: low-poly sphere flattened. */
function makeStoneGeo() {
  const geo = new THREE.SphereGeometry(0.5, 5, 4);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    pos.setY(i, pos.getY(i) * 0.42);
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
  return geo;
}

// ── main export ───────────────────────────────────────────────────────────────

/**
 * Build instanced nature scatter for a terrain.
 *
 * @param {object} terrain  — object returned by buildTerrain (has getHeightAt, size)
 * @param {number} castleR  — outer ring radius in metres (used to derive flatR)
 * @param {string} style    — diorama style key
 * @param {number} seed     — PRNG seed (changes scatter layout)
 */
export function buildNature(terrain, castleR = 20, style = 'crusader', seed = 42) {
  const biome   = BIOMES[style] || BIOMES.crusader;
  const rng     = makeRng(seed ^ 0xdeadbeef);
  const { size, getHeightAt } = terrain;

  // Scatter only in the FBM terrain band (outside flat zone, inside terrain edge)
  const flatR  = Math.max(castleR * 2.0, 36) + 4;   // 4 m extra clearance
  const outerR = size * 0.43;                         // stay back from mesh edge

  // ── shared geometries ──────────────────────────────────────────────────────
  const rockGeo  = makeRockGeo();
  const stoneGeo = makeStoneGeo();

  // ── material per biome ────────────────────────────────────────────────────
  function makeMat(hexColor) {
    return new THREE.MeshStandardMaterial({
      color:           new THREE.Color(hexColor),
      roughness:       0.95,
      metalness:       0.0,
      envMapIntensity: 0.04,
    });
  }

  const rockMat    = makeMat(biome.rock.color);
  const boulderMat = makeMat(biome.boulder.color);
  const stoneMat   = makeMat(biome.stone.color);

  const dummy = new THREE.Object3D();

  /**
   * Scatter `params.count` instances of `geo` onto the terrain band.
   * Each instance is placed at a random angle and radius, lifted to terrain
   * surface, and given a random Y-rotation + slight tilt.
   */
  function scatter(geo, mat, params) {
    const mesh = new THREE.InstancedMesh(geo, mat, params.count);
    mesh.castShadow    = true;
    mesh.receiveShadow = true;

    let placed = 0;
    let attempts = 0;
    const maxAttempts = params.count * 8;

    while (placed < params.count && attempts < maxAttempts) {
      attempts++;
      const angle = rng() * Math.PI * 2;
      const dist  = flatR + rng() * (outerR - flatR);
      const wx    = Math.cos(angle) * dist;
      const wz    = Math.sin(angle) * dist;
      const wy    = getHeightAt(wx, wz);

      const scale = params.scaleMin + rng() * (params.scaleMax - params.scaleMin);
      const tilt  = params.tilt;

      dummy.position.set(wx, wy + scale * 0.30, wz);
      dummy.rotation.set(
        (rng() - 0.5) * tilt * 2,
        rng() * Math.PI * 2,
        (rng() - 0.5) * tilt * 2,
      );
      dummy.scale.setScalar(scale);
      dummy.updateMatrix();
      mesh.setMatrixAt(placed, dummy.matrix);
      placed++;
    }

    mesh.instanceMatrix.needsUpdate = true;
    mesh.count = placed;
    return mesh;
  }

  const rockMesh    = scatter(rockGeo,  rockMat,    biome.rock);
  const boulderMesh = scatter(rockGeo,  boulderMat, biome.boulder);
  const stoneMesh   = scatter(stoneGeo, stoneMat,   biome.stone);

  const meshes = [rockMesh, boulderMesh, stoneMesh];

  return {
    /** Add all nature meshes to a THREE.Scene. */
    add(scene) {
      meshes.forEach(m => scene.add(m));
    },
    /** Remove and free all GPU resources. */
    dispose() {
      meshes.forEach(m => {
        m.parent?.remove(m);
        m.geometry.dispose();
        m.material.dispose();
      });
      rockGeo.dispose();
      stoneGeo.dispose();
    },
  };
}
