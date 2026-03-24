import { generateComponents } from './generator.js';
import { HERO_DIORAMAS } from './heroData.js';
import { resolveStyle } from './renderer.js';
import {
  enhanceComponentsForRealism,
  deriveFidelityLabels,
  runHistoricalAccuracyAudit,
} from './fidelity.js';

function getComponentCenter(comp) {
  if (Array.isArray(comp.points) && comp.points.length) {
    const sum = comp.points.reduce((acc, pt) => {
      acc.x += pt.x || 0;
      acc.z += pt.z || 0;
      return acc;
    }, { x: 0, z: 0 });
    return {
      x: sum.x / comp.points.length,
      z: sum.z / comp.points.length,
    };
  }
  return { x: comp.x || 0, z: comp.z || 0 };
}

function getComponentRadius(comp) {
  if (Array.isArray(comp.points) && comp.points.length) {
    return Math.max(...comp.points.map(pt => Math.hypot(pt.x || 0, pt.z || 0)));
  }
  if (Array.isArray(comp.footprint) && comp.footprint.length) {
    return Math.max(...comp.footprint.map(pt => Math.hypot(pt.x || 0, pt.z || 0)));
  }
  return Math.hypot(comp.x || 0, comp.z || 0) + Math.max(
    comp.rBot || 0,
    comp.rTop || 0,
    comp.r || 0,
    comp.w || 0,
    comp.d || 0,
    0,
  );
}

function inferHistoricalMode(castle, diorama) {
  if (diorama.historicalMode) return diorama.historicalMode;
  if (diorama.components) return 'surveyed';
  if (castle.components) return 'handcrafted';
  return 'procedural';
}

export function getDioramaModel(castle) {
  const diorama = { ...(castle.diorama || {}), ...(HERO_DIORAMAS[castle.id] || {}) };
  const baseComponents = diorama.components || castle.components || generateComponents(castle);
  const style = diorama.style || castle.dioramaStyle || resolveStyle(castle);
  const historicalMode = inferHistoricalMode(castle, diorama);
  const components = enhanceComponentsForRealism(castle, baseComponents, style, historicalMode);
  const radius = components.length ? Math.max(...components.map(getComponentRadius)) : 18;
  const centroid = components.length
    ? components.reduce((acc, comp) => {
      const center = getComponentCenter(comp);
      acc.x += center.x;
      acc.z += center.z;
      return acc;
    }, { x: 0, z: 0 })
    : { x: 0, z: 0 };

  const fidelity = deriveFidelityLabels(
    castle,
    historicalMode,
    components,
    diorama.fidelityLabel,
    diorama.sourceConfidence,
  );
  const historicalAudit = runHistoricalAccuracyAudit(castle, components, style, historicalMode);

  return {
    id: castle.id,
    name: castle.name,
    style,
    components,
    focus: {
      x: diorama.focus?.x ?? centroid.x / Math.max(components.length, 1),
      y: diorama.focus?.y ?? 4,
      z: diorama.focus?.z ?? centroid.z / Math.max(components.length, 1),
    },
    scale: diorama.scale || 1.0,
    cameraRadius: diorama.cameraRadius || Math.max(28, radius * 2.45),
    historicalMode,
    fidelityLabel: fidelity.fidelityLabel,
    sourceConfidence: fidelity.sourceConfidence,
    historicalAudit,
    notes: diorama.notes || castle.desc || '',
    sources: diorama.sources || [],
    terrainModel: diorama.terrainModel || (components.some(comp => comp.type === 'TERRAIN_STACK') ? 'custom' : 'basic'),
  };
}
