import * as THREE from 'three';
import { Sky } from 'three/examples/jsm/objects/Sky.js';

// ── SkySystem ─────────────────────────────────────────────────────────────────
// Wraps THREE.Sky (Preetham analytical sky model) and uses PMREMGenerator to
// bake an environment map from the sky for IBL reflections on castle surfaces.
//
// Usage:
//   const sky = buildSky(renderer, scene, 'crusader');
//   scene.environment = sky.envMap;   // IBL reflections
//   sky.setSunElevation(15);          // degrees above horizon (0-90)

const SKY_PRESETS = {
  crusader: {
    turbidity: 5.5, rayleigh: 2.2, mieCoef: 0.006, mieG: 0.82,
    elevation: 22, azimuth: 175,
    fogColor: new THREE.Color(0x9cb8cc), fogDensity: 0.010,
  },
  japanese: {
    turbidity: 8.0, rayleigh: 1.4, mieCoef: 0.020, mieG: 0.75,
    elevation: 12, azimuth: 165,
    fogColor: new THREE.Color(0x8ba8ae), fogDensity: 0.012,
  },
  oriental: {
    turbidity: 10.0, rayleigh: 3.0, mieCoef: 0.015, mieG: 0.78,
    elevation: 30, azimuth: 190,
    fogColor: new THREE.Color(0xd4a868), fogDensity: 0.013,
  },
  ancient: {
    turbidity: 7.0, rayleigh: 2.8, mieCoef: 0.010, mieG: 0.80,
    elevation: 38, azimuth: 185,
    fogColor: new THREE.Color(0xc0a87c), fogDensity: 0.012,
  },
};

export function buildSky(renderer, scene, style = 'crusader') {
  const preset = SKY_PRESETS[style] || SKY_PRESETS.crusader;

  // ── Sky mesh ───────────────────────────────────────────────────────────────
  const sky = new Sky();
  sky.scale.setScalar(5000);
  scene.add(sky);

  const su = sky.material.uniforms;
  su['turbidity'].value       = preset.turbidity;
  su['rayleigh'].value        = preset.rayleigh;
  su['mieCoefficient'].value  = preset.mieCoef;
  su['mieDirectionalG'].value = preset.mieG;

  const sunVec = new THREE.Vector3();

  function updateSunPosition(elevDeg, azimDeg) {
    const phi   = THREE.MathUtils.degToRad(90 - elevDeg);
    const theta = THREE.MathUtils.degToRad(azimDeg);
    sunVec.setFromSphericalCoords(1, phi, theta);
    su['sunPosition'].value.copy(sunVec);
  }

  updateSunPosition(preset.elevation, preset.azimuth);

  // ── Environment map via CubeCamera + PMREMGenerator ────────────────────────
  const pmremGen = new THREE.PMREMGenerator(renderer);
  let envMap     = null;

  function bakeEnvMap() {
    const cubeRT = new THREE.WebGLCubeRenderTarget(256, {
      type: THREE.HalfFloatType,
    });
    const cubeCamera = new THREE.CubeCamera(0.1, 5500, cubeRT);

    // Snapshot with only the sky visible
    const origBg = scene.background;
    scene.background = null;

    const hidden = [];
    scene.traverse(obj => {
      if (obj !== sky && obj !== scene && obj.visible && obj.isMesh) {
        obj.visible = false;
        hidden.push(obj);
      }
    });

    scene.add(cubeCamera);
    cubeCamera.update(renderer, scene);
    scene.remove(cubeCamera);

    hidden.forEach(obj => { obj.visible = true; });
    scene.background = origBg;

    const prev = envMap;
    envMap = pmremGen.fromCubemap(cubeRT.texture).texture;
    cubeRT.dispose();
    if (prev) prev.dispose();
    return envMap;
  }

  bakeEnvMap();

  return {
    sky,
    sun: sunVec,
    get envMap() { return envMap; },
    fogColor:   preset.fogColor,
    fogDensity: preset.fogDensity,

    setSunElevation(deg) {
      updateSunPosition(deg, preset.azimuth);
    },

    rebakeEnvMap() {
      return bakeEnvMap();
    },

    dispose() {
      sky.geometry.dispose();
      sky.material.dispose();
      scene.remove(sky);
      pmremGen.dispose();
      if (envMap) envMap.dispose();
    },
  };
}
