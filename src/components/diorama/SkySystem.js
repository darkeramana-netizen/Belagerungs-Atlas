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
  // Lower rayleigh + higher turbidity = darker, dustier sky — no blown whites
  crusader: {
    turbidity: 4.0,  rayleigh: 1.2, mieCoef: 0.008, mieG: 0.80,
    elevation: 22, azimuth: 175,
    fogColor: new THREE.Color(0x8aacbe), fogDensity: 0.009,
  },
  japanese: {
    turbidity: 6.5,  rayleigh: 0.9, mieCoef: 0.022, mieG: 0.74,
    elevation: 12, azimuth: 165,
    fogColor: new THREE.Color(0x7a9aa6), fogDensity: 0.011,
  },
  oriental: {
    turbidity: 8.0,  rayleigh: 1.8, mieCoef: 0.018, mieG: 0.76,
    elevation: 30, azimuth: 190,
    fogColor: new THREE.Color(0xc09858), fogDensity: 0.012,
  },
  ancient: {
    turbidity: 6.0,  rayleigh: 1.6, mieCoef: 0.012, mieG: 0.78,
    elevation: 38, azimuth: 185,
    fogColor: new THREE.Color(0xb09868), fogDensity: 0.011,
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
