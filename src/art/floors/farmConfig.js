// src/art/floors/farmConfig.js
// Palette, quality presets, and layout obstacle classification for Floor 1: "The Sun-Bleached Farm"

import { distanceToPolyline } from './farmMaterials.js';

export const DEFAULT_PALETTE = {
  wallLit: 0xc4cbcf,
  wallShade: 0x8e9da3,
  groundBase: 0xa9b6ba,
  groundDark: 0x68767c,
  moss: 0x5f8a4a,
  mossDark: 0x436836,
  ivy: 0x436836,
  plaster: 0xdfe3df,
  timber: 0x2b2623,
  slate: 0x4a5560,
  warmWindow: 0xffc27a,
  teal: 0x6fe0f0,
  portalBlue: 0x5ab4ff,
  forgeOrange: 0xff8a3a,
  sphereCyan: 0xa8f4ff,
  crimsonGlow: 0xff3a4a,
  gold: 0xd8b45a,
  dirt: 0xa89f8a,
  wood: 0x6a4a2e,
  stoneLit: 0xc4cbcf,
  stoneMid: 0xaab4ba,
  stoneShade: 0x8e9da3,
  stoneCrevice: 0x5c6b73,
  groundLight: 0xc2cdd0,
  groundWarm: 0xb8b9b4,
  groundCrack: 0x68767c,
  mossMid: 0x5f8a4a,
  mossLight: 0x7aa860,
  mud: 0x7c857d,
  strataLight: 0x939a9e,
  strataBrown: 0x767068,
  strataDarkBrown: 0x54504a,
  strataTeal: 0x455e66,
  strataDeep: 0x23353d,
  iron: 0x2c3236,
  plaqueBronze: 0x5a6b64,
  plaqueFrame: 0x98a2a8,
  tealGlow: 0x6fe0f0,
  tealBright: 0xb8f8ff,
  warmGlow: 0xffc27a
};

export const FARM_COLORS = {
  ochreLight: 0xd2be96,
  ochreBase: 0xb89f74,
  ochreRut: 0x8d7652,
  ochreDark: 0x6e5b3e,
  dryGrassLight: 0xc5b36e,
  dryGrassMid: 0x9e9252,
  dryGrassOlive: 0x767542,
  dryGrassDark: 0x575832,
  wheatGold: 0xd9b85b,
  hayBright: 0xd8b458,
  hayShade: 0x9e7d34,
  oliveLeafLight: 0x6d7d48,
  oliveLeafMid: 0x5b6b3a,
  oliveLeafDark: 0x3f4f2c,
  oliveSilver: 0x8b9674,
  cypressDark: 0x2f3e26,
  trunkBark: 0x584636,
  trunkDark: 0x3b2e23,
  marbleLit: 0xeae6dc,
  marbleMid: 0xd2ccc0,
  marbleShade: 0x9f998e,
  plasterWarm: 0xe6e1d6,
  plasterWeathered: 0xc4bca9,
  terracottaLit: 0xb45f42,
  terracottaMid: 0xa4553a,
  terracottaDark: 0x7c3b2a,
  woodWeathered: 0x78583c,
  woodDark: 0x4b3624,
  ironRust: 0x4a352d,
  goblinRed: 0x9e342b,
  goblinCream: 0xd4c5a9,
  goblinHide: 0x634b37,
  bone: 0xdcd5c4,
  outline: 0x14101c,
  shadowDecal: 0x241d15,
  amberFire: 0xff9d3b,
  lanternWarm: 0xffb066,
  waterDark: 0x1d2c30
};

export const QUALITY_CONFIG = {
  high: {
    terrainSegX: 96,
    terrainSegZ: 140,
    grassCount: 2200,
    wheatCount: 900,
    stoneCount: 280,
    dustCount: 90,
    canopyLobes: 9,
    columnRadial: 12,
    baleRadial: 12,
    useOutlines: true
  },
  medium: {
    terrainSegX: 68,
    terrainSegZ: 96,
    grassCount: 1300,
    wheatCount: 540,
    stoneCount: 170,
    dustCount: 55,
    canopyLobes: 7,
    columnRadial: 10,
    baleRadial: 10,
    useOutlines: true
  },
  low: {
    terrainSegX: 44,
    terrainSegZ: 64,
    grassCount: 650,
    wheatCount: 260,
    stoneCount: 85,
    dustCount: 28,
    canopyLobes: 5,
    columnRadial: 8,
    baleRadial: 8,
    useOutlines: false
  }
};

export function classifyObstacles(layout = {}) {
  const obstacles = layout.obstacles || [];
  const chokes = layout.chokePoints || [];
  const camps = layout.campSpots || [];
  const templeSpot = camps.find((c) => c.type === 'temple') || { x: 16, z: -75, radius: 9 };
  const farmSpot = camps.find((c) => c.type === 'farm') || { x: -14, z: -112, radius: 5.5 };
  const wellSpot = camps.find((c) => c.type === 'well') || { x: -8, z: -105, radius: 3 };

  const result = {
    chokePosts: [],
    templeColumns: [],
    oliveTrees: [],
    hayBales: [],
    farmhouse: null,
    well: null
  };

  for (let i = 0; i < obstacles.length; i++) {
    const ob = obstacles[i];
    const r = ob.radius || 0.8;

    if (r >= 2.5 || (Math.hypot(ob.x - farmSpot.x, ob.z - farmSpot.z) < 2.0 && r >= 2.0)) {
      result.farmhouse = ob;
      continue;
    }
    if ((r > 1.0 && r < 2.5) || Math.hypot(ob.x - wellSpot.x, ob.z - wellSpot.z) < 1.5) {
      result.well = ob;
      continue;
    }

    let isChokePost = false;
    for (let c = 0; c < chokes.length; c++) {
      const ch = chokes[c].position;
      if (Math.abs(ob.z - ch.z) < 1.5 && Math.abs(Math.abs(ob.x - ch.x) - 2.0) < 1.2) {
        isChokePost = true;
        break;
      }
    }
    if (isChokePost) {
      result.chokePosts.push(ob);
      continue;
    }

    if (
      Math.abs(ob.x - templeSpot.x) <= 8.5 &&
      Math.abs(ob.z - templeSpot.z) <= 8.5 &&
      r >= 0.7
    ) {
      result.templeColumns.push(ob);
      continue;
    }

    if (r <= 0.68) {
      result.oliveTrees.push(ob);
    } else {
      result.hayBales.push(ob);
    }
  }

  if (!result.farmhouse) result.farmhouse = { x: farmSpot.x, z: farmSpot.z, radius: 4.0 };
  if (!result.well) result.well = { x: wellSpot.x, z: wellSpot.z, radius: 1.2 };

  return { ...result, templeSpot, farmSpot, wellSpot };
}

export function isWalkableOrClear(layout, x, z, margin = 0.8) {
  const poly = layout.pathPolyline || [
    { x: 0, z: 6 },
    { x: 0, z: -125 }
  ];
  const pw = (layout.pathWidth || 4.7) * 0.5 + margin;
  const dRoad = distanceToPolyline(x, z, poly).dist;
  if (dRoad < pw) return true;

  const clearings = layout.clearings || [];
  for (let i = 0; i < clearings.length; i++) {
    const c = clearings[i];
    const d = Math.hypot(x - c.center.x, z - c.center.z);
    if (d < c.radius - margin) return true;
  }
  return false;
}