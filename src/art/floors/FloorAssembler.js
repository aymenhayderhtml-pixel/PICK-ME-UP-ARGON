import { generateFloorLayout } from '../../world/floorLayouts.js';
import { PALETTE } from '../town/palette.js';
import { buildFarmFloorArt } from './farm.js';
import { buildPrairieFloorArt } from './prairie.js';
import { buildForestFloorArt } from './forest.js';

export const FLOOR_ART_BUDGETS = {
  high: { triangles: 240000, drawCalls: 48 },
  medium: { triangles: 156000, drawCalls: 40 },
  low: { triangles: 96000, drawCalls: 34 },
};

export function floorArtModuleName(floorNumber) {
  if (floorNumber === 1) return 'farm';
  if (floorNumber === 2) return 'prairie';
  return 'forest';
}

export function assembleFloor(floorNumber, seed = floorNumber * 7919 + 13, quality = 'high') {
  const floor = Math.max(1, Math.floor(floorNumber));
  const q = FLOOR_ART_BUDGETS[quality] ? quality : 'high';
  const layout = generateFloorLayout(floor, seed);
  const ctx = { layout, quality: q, seed, palette: PALETTE };
  const moduleName = floorArtModuleName(floor);
  let art;
  if (moduleName === 'farm') {
    art = buildFarmFloorArt(ctx);
  } else if (moduleName === 'prairie') {
    art = buildPrairieFloorArt(ctx);
  } else {
    art = buildForestFloorArt(ctx);
  }
  const budget = FLOOR_ART_BUDGETS[q];

  function getStats() {
    const stats = art.getStats();
    return {
      ...stats,
      budget,
      overTriangles: stats.triangles > budget.triangles,
      overDrawCalls: stats.drawCallsEstimate > budget.drawCalls,
    };
  }

  return {
    floorNumber: floor,
    seed,
    quality: q,
    moduleName,
    layout,
    art,
    group: art.group,
    lights: art.lights || [],
    budget,
    getStats,
    update(dt, time, camera) {
      art.update(dt, time, camera);
    },
    setQuality(nextQuality) {
      if (!FLOOR_ART_BUDGETS[nextQuality]) return;
      art.setQuality(nextQuality);
    },
    setLighting(lighting) {
      if (art.setLighting) art.setLighting(lighting);
    },
    setGateState(state) {
      if (art.setGateState) art.setGateState(state);
    },
    destroyPillar(index) {
      return art.destroyPillar ? art.destroyPillar(index) : false;
    },
    dispose() {
      art.dispose();
    },
  };
}
