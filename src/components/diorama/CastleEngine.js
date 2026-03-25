// CastleEngine.js
// ─────────────────────────────────────────────────────────────────────────────
// Registry-based castle builder that supports:
//   • Incremental reconstruction (reconstructBurg) — only changed components
//     are removed and rebuilt, untouched components stay in the scene.
//   • Physics ramp collection — invisible slope/helix meshes emitted by builders
//     are collected here and forwarded to initPhysicsWorld.
//   • Stable component IDs — required for the registry key.
//
// Usage:
//   const engine = new CastleEngine({ scene, mats, style, globalScale });
//   engine.buildAll(components);
//   // later, when heroData changes:
//   engine.reconstructBurg(updatedComponents);
//   // for cleanup:
//   engine.dispose();

import * as THREE from 'three';
import { buildComponent } from './builders.js';

// ── snapToGround ──────────────────────────────────────────────────────────────
// Lifts an object so its lowest bounding-box face sits at y ≥ 0.
export function snapToGround(obj) {
  const box = new THREE.Box3().setFromObject(obj);
  if (box.min.y < 0) obj.position.y -= box.min.y;
}

// ── Shallow component equality ─────────────────────────────────────────────────
// Compares two component plain-objects field-by-field (one level deep).
// Returns true when they are semantically identical.
function compEqual(a, b) {
  if (a === b) return true;
  const ka = Object.keys(a);
  if (ka.length !== Object.keys(b).length) return false;
  return ka.every(k => {
    if (typeof a[k] === 'object' && a[k] !== null) {
      return JSON.stringify(a[k]) === JSON.stringify(b[k]);
    }
    return a[k] === b[k];
  });
}

// ─────────────────────────────────────────────────────────────────────────────

export class CastleEngine {
  /**
   * @param {object} opts
   * @param {THREE.Scene}  opts.scene
   * @param {object}       opts.mats        — { stone, dark, roof, rock, water }
   * @param {string}       opts.style
   * @param {number}       [opts.globalScale=1.0]
   */
  constructor({ scene, mats, style, globalScale = 1.0 }) {
    this.scene       = scene;
    this.mats        = mats;
    this.style       = style;
    this.globalScale = globalScale;

    /** Map<id, { group: THREE.Group, ramps: THREE.Mesh[], comp: object }> */
    this._registry = new Map();

    /** Flat list of all THREE.Groups for raycasting (populated by buildAll / reconstructBurg) */
    this.clickables = [];

    /** Flat list of invisible physics ramp meshes to forward to PhysicsWorld */
    this.physicsRamps = [];
  }

  // ── Build from scratch ──────────────────────────────────────────────────────
  /** Build all components.  Call once at initialisation. */
  buildAll(components) {
    for (const comp of components) {
      this._addComponent(comp);
    }
  }

  // ── Incremental reconstruction ──────────────────────────────────────────────
  /**
   * Delta-rebuild: compare nextComponents against the current registry and only
   * touch what changed.  Unchanged components stay in the scene as-is.
   *
   * @param {Array} nextComponents — updated component array from heroData / getDioramaModel
   */
  reconstructBurg(nextComponents) {
    const nextById = new Map(
      nextComponents.filter(c => c.id).map(c => [c.id, c]),
    );

    // 1. Remove components that disappeared
    for (const id of this._registry.keys()) {
      if (!nextById.has(id)) this._removeComponent(id);
    }

    // 2. Add new or rebuild changed components
    for (const comp of nextComponents) {
      if (!comp.id) {
        // No id → can't track → always rebuild (should not happen after normalize.js)
        this._addComponent(comp);
        continue;
      }
      const existing = this._registry.get(comp.id);
      if (!existing) {
        this._addComponent(comp);
      } else if (!compEqual(existing.comp, comp)) {
        // Changed — swap
        this._removeComponent(comp.id);
        this._addComponent(comp);
      }
      // else: unchanged — no-op
    }
  }

  // ── Internal helpers ────────────────────────────────────────────────────────

  _addComponent(comp) {
    const { mats, style, globalScale, scene } = this;

    const raw = buildComponent(
      comp,
      mats.stone, mats.dark, mats.roof,
      style,
      mats.rock, mats.water,
      globalScale,
    );
    if (!raw) return;

    // buildComponent now always returns { group, ramps } but tolerate legacy groups
    const group = raw.group ?? raw;
    const ramps = raw.ramps ?? [];

    snapToGround(group);
    scene.add(group);
    this.clickables.push(group);

    // Physics ramps: invisible, flagged for PhysicsWorld trimesh creation
    for (const r of ramps) {
      r.visible = false;
      r.userData.isPhysicsRamp = true;
      scene.add(r);
      this.physicsRamps.push(r);
    }

    if (comp.id) {
      this._registry.set(comp.id, { group, ramps, comp });
    }
  }

  _removeComponent(id) {
    const entry = this._registry.get(id);
    if (!entry) return;

    const { group, ramps } = entry;

    // Remove from scene + free GPU memory
    this.scene.remove(group);
    group.traverse(child => {
      child.geometry?.dispose();
    });

    // Remove ramps
    for (const r of ramps) {
      this.scene.remove(r);
      r.geometry?.dispose();
      const i = this.physicsRamps.indexOf(r);
      if (i !== -1) this.physicsRamps.splice(i, 1);
    }

    // Remove from clickables
    const ci = this.clickables.indexOf(group);
    if (ci !== -1) this.clickables.splice(ci, 1);

    this._registry.delete(id);
  }

  // ── Dispose everything ──────────────────────────────────────────────────────
  dispose() {
    for (const id of [...this._registry.keys()]) {
      this._removeComponent(id);
    }
  }
}
