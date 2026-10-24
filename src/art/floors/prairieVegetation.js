import * as THREE from 'three';
import {
  DEFAULT_LAYOUT,
  MOSS_COLOR,
  EMBER_ORANGE,
  EMBER_GOLD,
} from './prairieConfig.js';
import {
  lerp,
  normalizeGeometry,
  getSurfaceMetrics,
  computeTerrainHeight,
  createSculptedRockGeometry,
} from './prairieHelpers.js';
import {
  createGrassTuftGeometry,
  createWildflowerClusterGeometry,
  createCanopyPuffGeometry,
  createDistantConiferGeometry,
  createFencePostGeometry,
  createFlagPennantGeometry,
  createEmberMoteGeometry,
} from './prairieVegetationGeometries.js';

export {
  createGrassTuftGeometry,
  createWildflowerClusterGeometry,
  createCanopyPuffGeometry,
  createDistantConiferGeometry,
  createFencePostGeometry,
  createFlagPennantGeometry,
  createEmberMoteGeometry,
};

export function buildInstancedVegetationAndProps({
  group,
  layout,
  bounds,
  palette,
  cfg,
  seed,
  rng,
  materials,
  activeGeometries,
  canopyInstances,
  fencePostInstances,
  flagInstances,
  emberSources,
}) {
  const {
    stoneMat,
    propMat,
    foliageMat,
    grassDarkMat,
    grassLightMat,
    flowerMat,
    emissiveMat,
  } = materials;

  const dummy = new THREE.Object3D();
  const colorTmp = new THREE.Color();

  const tuftGeom = createGrassTuftGeometry(cfg.grassBladesPerTuft);
  activeGeometries.push(tuftGeom);

  const grassTotalPerShade = cfg.grassTuftsPerShade;
  const grassDarkInst = new THREE.InstancedMesh(tuftGeom, grassDarkMat, grassTotalPerShade);
  const grassLightInst = new THREE.InstancedMesh(tuftGeom, grassLightMat, grassTotalPerShade);
  grassDarkInst.name = 'PrairieGrassDark';
  grassLightInst.name = 'PrairieGrassLight';

  const grassDarkData = {
    x: new Float32Array(grassTotalPerShade),
    z: new Float32Array(grassTotalPerShade),
    sy: new Float32Array(grassTotalPerShade),
    phase: new Float32Array(grassTotalPerShade),
    count: 0,
  };
  const grassLightData = {
    x: new Float32Array(grassTotalPerShade),
    z: new Float32Array(grassTotalPerShade),
    sy: new Float32Array(grassTotalPerShade),
    phase: new Float32Array(grassTotalPerShade),
    count: 0,
  };

  function pushGrassInstance(isLight, gx, gy, gz, gScaleXZ, gScaleY, yaw) {
    const targetInst = isLight ? grassLightInst : grassDarkInst;
    const targetData = isLight ? grassLightData : grassDarkData;
    const idx = targetData.count;
    if (idx >= grassTotalPerShade) return false;

    dummy.position.set(gx, gy, gz);
    dummy.rotation.set(0, yaw, 0);
    dummy.scale.set(gScaleXZ, gScaleY, gScaleXZ);
    dummy.updateMatrix();
    targetInst.setMatrixAt(idx, dummy.matrix);

    targetData.x[idx] = gx;
    targetData.z[idx] = gz;
    targetData.sy[idx] = gScaleY;
    targetData.phase[idx] = gx * 0.19 + gz * 0.14 + (isLight ? 1.1 : 0.0);
    targetData.count = idx + 1;
    return true;
  }

  const ambushSpots = layout.ambushSpots || DEFAULT_LAYOUT.ambushSpots;
  for (let i = 0; i < ambushSpots.length; i++) {
    const as = ambushSpots[i];
    const clumpCount = 24;
    for (let k = 0; k < clumpCount; k++) {
      const a = rng() * Math.PI * 2;
      const d = Math.pow(rng(), 0.65) * 2.65;
      const gx = as.x + Math.cos(a) * d;
      const gz = as.z + Math.sin(a) * d;
      const gy = computeTerrainHeight(gx, gz, bounds);
      const sXZ = 1.15 + rng() * 0.45;
      const sY = 1.25 + rng() * 0.55;
      pushGrassInstance(k % 2 === 0, gx, gy, gz, sXZ, sY, rng() * Math.PI * 2);
    }
  }

  let attempts = 0;
  const maxAttempts = grassTotalPerShade * 6;
  while (
    (grassDarkData.count < grassTotalPerShade || grassLightData.count < grassTotalPerShade) &&
    attempts < maxAttempts
  ) {
    attempts++;
    const spreadHill = rng() < 0.22;
    const gx = spreadHill
      ? lerp(bounds.minX - 24, bounds.maxX + 24, rng())
      : lerp(bounds.minX + 1, bounds.maxX - 1, rng());
    const gz = spreadHill
      ? lerp(bounds.minZ - 20, bounds.maxZ + 18, rng())
      : lerp(bounds.minZ + 1, bounds.maxZ - 1, rng());

    const m = getSurfaceMetrics(gx, gz, layout);
    if (m.obstacleClearance < 0.25) continue;
    if (m.goblinCampDist < 4.6) continue;

    let scaleMult = 1.0;
    if (m.pathDist < m.pathHalfWidth + 0.4) {
      if (m.pathDist > m.pathHalfWidth - 0.55 && rng() < 0.32) {
        scaleMult = 0.58;
      } else {
        continue;
      }
    } else if (m.clearingNorm < 0.88) {
      if (rng() > 0.16) continue;
      scaleMult = 0.62;
    } else if (m.clearingNorm < 1.22) {
      scaleMult = 1.15;
    }

    const gy = computeTerrainHeight(gx, gz, bounds);
    const isLight =
      grassDarkData.count >= grassTotalPerShade
        ? true
        : grassLightData.count >= grassTotalPerShade
          ? false
          : rng() > 0.48;

    const sXZ = (0.85 + rng() * 0.55) * scaleMult;
    const sY = (0.82 + rng() * 0.68) * scaleMult;
    pushGrassInstance(isLight, gx, gy, gz, sXZ, sY, rng() * Math.PI * 2);
  }

  grassDarkInst.count = grassDarkData.count;
  grassLightInst.count = grassLightData.count;
  grassDarkInst.instanceMatrix.needsUpdate = true;
  grassLightInst.instanceMatrix.needsUpdate = true;
  grassDarkInst.frustumCulled = false;
  grassLightInst.frustumCulled = false;
  group.add(grassDarkInst);
  group.add(grassLightInst);

  const flowerGeom = createWildflowerClusterGeometry();
  activeGeometries.push(flowerGeom);
  const flowerMax = cfg.flowerCount;
  const flowerInst = new THREE.InstancedMesh(flowerGeom, flowerMat, flowerMax);
  flowerInst.name = 'PrairieWildflowers';
  const flowerData = {
    x: new Float32Array(flowerMax),
    z: new Float32Array(flowerMax),
    sy: new Float32Array(flowerMax),
    phase: new Float32Array(flowerMax),
    count: 0,
  };

  const flowerPalette = [palette.flowerWhite, palette.flowerYellow, palette.flowerLilac];
  let fAttempts = 0;
  while (flowerData.count < flowerMax && fAttempts < flowerMax * 5) {
    fAttempts++;
    const fx = lerp(bounds.minX - 10, bounds.maxX + 10, rng());
    const fz = lerp(bounds.minZ - 10, bounds.maxZ + 8, rng());
    const m = getSurfaceMetrics(fx, fz, layout);
    if (m.pathDist < m.pathHalfWidth + 0.35) continue;
    if (m.obstacleClearance < 0.35) continue;
    if (m.goblinCampDist < 5.2) continue;
    if (m.clearingNorm < 0.82 && rng() > 0.14) continue;

    const fy = computeTerrainHeight(fx, fz, bounds);
    const idx = flowerData.count;
    const sc = 0.82 + rng() * 0.55;
    dummy.position.set(fx, fy, fz);
    dummy.rotation.set(0, rng() * Math.PI * 2, 0);
    dummy.scale.set(sc, sc, sc);
    dummy.updateMatrix();
    flowerInst.setMatrixAt(idx, dummy.matrix);

    const patchHash = Math.floor((fx + 60) * 0.18) + Math.floor((fz + 150) * 0.18);
    const colHex = flowerPalette[Math.abs(patchHash + Math.floor(rng() * 2)) % 3];
    colorTmp.setHex(colHex);
    flowerInst.setColorAt(idx, colorTmp);

    flowerData.x[idx] = fx;
    flowerData.z[idx] = fz;
    flowerData.sy[idx] = sc;
    flowerData.phase[idx] = fx * 0.22 + fz * 0.17;
    flowerData.count = idx + 1;
  }

  flowerInst.count = flowerData.count;
  flowerInst.instanceMatrix.needsUpdate = true;
  if (flowerInst.instanceColor) flowerInst.instanceColor.needsUpdate = true;
  flowerInst.frustumCulled = false;
  group.add(flowerInst);

  const canopyGeom = createCanopyPuffGeometry();
  activeGeometries.push(canopyGeom);
  const canopyInst = new THREE.InstancedMesh(canopyGeom, foliageMat, Math.max(1, canopyInstances.length));
  canopyInst.name = 'PrairieCanopyAndBushes';
  const canopyData = {
    baseY: new Float32Array(canopyInstances.length),
    sy: new Float32Array(canopyInstances.length),
    phase: new Float32Array(canopyInstances.length),
    count: canopyInstances.length,
  };

  for (let i = 0; i < canopyInstances.length; i++) {
    const ci = canopyInstances[i];
    dummy.position.set(ci.x, ci.y, ci.z);
    dummy.rotation.set(0, ci.rotY, 0);
    dummy.scale.set(ci.sx, ci.sy, ci.sz);
    dummy.updateMatrix();
    canopyInst.setMatrixAt(i, dummy.matrix);
    colorTmp.setHex(ci.colorHex);
    canopyInst.setColorAt(i, colorTmp);

    canopyData.baseY[i] = ci.y;
    canopyData.sy[i] = ci.sy;
    canopyData.phase[i] = ci.x * 0.15 + ci.z * 0.12 + i * 0.3;
  }
  canopyInst.instanceMatrix.needsUpdate = true;
  if (canopyInst.instanceColor) canopyInst.instanceColor.needsUpdate = true;
  canopyInst.frustumCulled = false;
  group.add(canopyInst);

  const coniferGeom = createDistantConiferGeometry(palette);
  activeGeometries.push(coniferGeom);
  const distTreeCount = cfg.distantTrees;
  const distantTreeInst = new THREE.InstancedMesh(coniferGeom, foliageMat, distTreeCount);
  distantTreeInst.name = 'PrairieHorizonForest';
  let dtPlaced = 0;
  let dtAttempts = 0;

  while (dtPlaced < distTreeCount && dtAttempts < distTreeCount * 6) {
    dtAttempts++;
    const angle = rng() * Math.PI * 2;
    const radX = 52 + rng() * 58;
    const radZ = 75 + rng() * 62;
    const tx = Math.cos(angle) * radX;
    const tz = -62 + Math.sin(angle) * radZ;

    if (tx > bounds.minX - 5 && tx < bounds.maxX + 5 && tz > bounds.minZ - 5 && tz < bounds.maxZ + 5) {
      continue;
    }
    if (Math.abs(tx) < 11 && (tz > bounds.maxZ - 2 || tz < bounds.minZ + 2)) {
      continue;
    }

    const ty = computeTerrainHeight(tx, tz, bounds);
    if (ty > 17.5) continue;

    const sc = 0.95 + rng() * 1.15;
    dummy.position.set(tx, ty - 0.25, tz);
    dummy.rotation.set(0, rng() * Math.PI * 2, 0);
    dummy.scale.set(sc, sc * (0.9 + rng() * 0.3), sc);
    dummy.updateMatrix();
    distantTreeInst.setMatrixAt(dtPlaced, dummy.matrix);

    colorTmp.setHex(dtPlaced % 2 === 0 ? 0x3b5842 : 0x4b6b4f);
    distantTreeInst.setColorAt(dtPlaced, colorTmp);
    dtPlaced++;
  }
  distantTreeInst.count = dtPlaced;
  distantTreeInst.instanceMatrix.needsUpdate = true;
  if (distantTreeInst.instanceColor) distantTreeInst.instanceColor.needsUpdate = true;
  distantTreeInst.frustumCulled = false;
  group.add(distantTreeInst);

  const rawFieldRock = createSculptedRockGeometry(0.42, 0.32, 1, seed ^ 0x19a4);
  const fieldRockGeom = normalizeGeometry(
    rawFieldRock,
    palette.rockBase,
    { mossColor: MOSS_COLOR, mossStrength: 0.55, bottomAO: 0.35 }
  );
  rawFieldRock.dispose();
  activeGeometries.push(fieldRockGeom);
  const rockCount = cfg.fieldRocks;
  const fieldRockInst = new THREE.InstancedMesh(fieldRockGeom, stoneMat, rockCount);
  fieldRockInst.name = 'PrairieFieldRocks';
  let rPlaced = 0;
  let rAttempts = 0;

  while (rPlaced < rockCount && rAttempts < rockCount * 5) {
    rAttempts++;
    const rx = lerp(bounds.minX - 18, bounds.maxX + 18, rng());
    const rz = lerp(bounds.minZ - 14, bounds.maxZ + 10, rng());
    const m = getSurfaceMetrics(rx, rz, layout);
    if (m.pathDist < m.pathHalfWidth - 0.2) continue;
    if (m.clearingNorm < 0.92) continue;

    const ry = computeTerrainHeight(rx, rz, bounds);
    const sx = 0.55 + rng() * 1.25;
    const sy = 0.45 + rng() * 0.95;
    const sz = 0.55 + rng() * 1.25;
    dummy.position.set(rx, ry, rz);
    dummy.rotation.set(0, rng() * Math.PI * 2, 0);
    dummy.scale.set(sx, sy, sz);
    dummy.updateMatrix();
    fieldRockInst.setMatrixAt(rPlaced, dummy.matrix);
    rPlaced++;
  }
  fieldRockInst.count = rPlaced;
  fieldRockInst.instanceMatrix.needsUpdate = true;
  fieldRockInst.frustumCulled = false;
  group.add(fieldRockInst);

  const postGeom = createFencePostGeometry(palette);
  activeGeometries.push(postGeom);
  const fencePostInst = new THREE.InstancedMesh(postGeom, propMat, Math.max(1, fencePostInstances.length));
  fencePostInst.name = 'PrairieFencePosts';
  for (let i = 0; i < fencePostInstances.length; i++) {
    const fp = fencePostInstances[i];
    dummy.position.set(fp.x, fp.y, fp.z);
    dummy.rotation.set(fp.tiltX, fp.rotY, fp.tiltZ);
    dummy.scale.set(fp.sx, fp.sy, fp.sz);
    dummy.updateMatrix();
    fencePostInst.setMatrixAt(i, dummy.matrix);
  }
  fencePostInst.instanceMatrix.needsUpdate = true;
  fencePostInst.frustumCulled = false;
  group.add(fencePostInst);

  const flagGeom = createFlagPennantGeometry(palette);
  activeGeometries.push(flagGeom);
  const flagInst = new THREE.InstancedMesh(flagGeom, propMat, Math.max(1, flagInstances.length));
  flagInst.name = 'PrairieFlags';
  const flagData = {
    x: new Float32Array(flagInstances.length),
    y: new Float32Array(flagInstances.length),
    z: new Float32Array(flagInstances.length),
    sx: new Float32Array(flagInstances.length),
    sy: new Float32Array(flagInstances.length),
    sz: new Float32Array(flagInstances.length),
    rotY: new Float32Array(flagInstances.length),
    count: flagInstances.length,
  };

  for (let i = 0; i < flagInstances.length; i++) {
    const fl = flagInstances[i];
    dummy.position.set(fl.x, fl.y, fl.z);
    dummy.rotation.set(0, fl.rotY, 0);
    dummy.scale.set(fl.sx, fl.sy, fl.sz);
    dummy.updateMatrix();
    flagInst.setMatrixAt(i, dummy.matrix);

    flagData.x[i] = fl.x;
    flagData.y[i] = fl.y;
    flagData.z[i] = fl.z;
    flagData.sx[i] = fl.sx;
    flagData.sy[i] = fl.sy;
    flagData.sz[i] = fl.sz;
    flagData.rotY[i] = fl.rotY;
  }
  flagInst.instanceMatrix.needsUpdate = true;
  flagInst.frustumCulled = false;
  group.add(flagInst);

  let totalEmbers = 0;
  for (let i = 0; i < emberSources.length; i++) {
    totalEmbers += emberSources[i].count;
  }
  const totalParticles = totalEmbers + cfg.dustCount;
  const moteGeom = createEmberMoteGeometry();
  activeGeometries.push(moteGeom);

  const emberDustInst = new THREE.InstancedMesh(moteGeom, emissiveMat, totalParticles);
  emberDustInst.name = 'PrairieEmbersAndDust';
  const emberDustData = {
    baseX: new Float32Array(totalParticles),
    baseY: new Float32Array(totalParticles),
    baseZ: new Float32Array(totalParticles),
    rad: new Float32Array(totalParticles),
    speed: new Float32Array(totalParticles),
    phase: new Float32Array(totalParticles),
    isEmber: new Uint8Array(totalParticles),
    count: totalParticles,
  };

  let pIdx = 0;
  for (let s = 0; s < emberSources.length; s++) {
    const src = emberSources[s];
    for (let k = 0; k < src.count; k++) {
      emberDustData.baseX[pIdx] = src.x;
      emberDustData.baseY[pIdx] = src.y;
      emberDustData.baseZ[pIdx] = src.z;
      emberDustData.rad[pIdx] = src.radius * (0.25 + rng() * 0.75);
      emberDustData.speed[pIdx] = 0.8 + rng() * 1.4;
      emberDustData.phase[pIdx] = rng() * Math.PI * 2;
      emberDustData.isEmber[pIdx] = 1;

      colorTmp.setHex(k % 3 === 0 ? EMBER_GOLD : EMBER_ORANGE);
      emberDustInst.setColorAt(pIdx, colorTmp);
      pIdx++;
    }
  }

  for (let d = 0; d < cfg.dustCount; d++) {
    const dx = lerp(bounds.minX + 4, bounds.maxX - 4, rng());
    const dz = lerp(bounds.minZ + 4, bounds.maxZ - 2, rng());
    const dy = 0.45 + rng() * 2.4;
    emberDustData.baseX[pIdx] = dx;
    emberDustData.baseY[pIdx] = dy;
    emberDustData.baseZ[pIdx] = dz;
    emberDustData.rad[pIdx] = 0.6 + rng() * 1.6;
    emberDustData.speed[pIdx] = 0.35 + rng() * 0.55;
    emberDustData.phase[pIdx] = rng() * Math.PI * 2;
    emberDustData.isEmber[pIdx] = 0;

    colorTmp.setHex(d % 2 === 0 ? palette.flowerWhite : palette.flowerYellow);
    emberDustInst.setColorAt(pIdx, colorTmp);
    pIdx++;
  }

  for (let i = 0; i < totalParticles; i++) {
    dummy.position.set(emberDustData.baseX[i], emberDustData.baseY[i], emberDustData.baseZ[i]);
    dummy.scale.setScalar(0.5);
    dummy.updateMatrix();
    emberDustInst.setMatrixAt(i, dummy.matrix);
  }
  emberDustInst.instanceMatrix.needsUpdate = true;
  if (emberDustInst.instanceColor) emberDustInst.instanceColor.needsUpdate = true;
  emberDustInst.frustumCulled = false;
  group.add(emberDustInst);

  return {
    grassDarkInst,
    grassLightInst,
    flowerInst,
    canopyInst,
    flagInst,
    emberDustInst,
    grassDarkData,
    grassLightData,
    flowerData,
    canopyData,
    flagData,
    emberDustData,
  };
}

export function updatePrairieInstances(instState, time) {
  if (!instState) return;
  const {
    grassDarkInst,
    grassLightInst,
    flowerInst,
    canopyInst,
    flagInst,
    emberDustInst,
    grassDarkData,
    grassLightData,
    flowerData,
    canopyData,
    flagData,
    emberDustData,
  } = instState;

  const t1 = time * 2.15;
  const t2 = time * 3.45;

  if (grassDarkInst && grassDarkData) {
    const arr = grassDarkInst.instanceMatrix.array;
    const count = grassDarkData.count;
    const phArr = grassDarkData.phase;
    const syArr = grassDarkData.sy;
    for (let i = 0; i < count; i++) {
      const ph = phArr[i];
      const sy = syArr[i];
      const gust = Math.sin(t1 + ph) * 0.16 + Math.sin(t2 + ph * 1.7) * 0.06 + 0.08;
      const base = i * 16;
      arr[base + 4] = gust * sy;
      arr[base + 6] = gust * 0.42 * sy;
    }
    grassDarkInst.instanceMatrix.needsUpdate = true;
  }

  if (grassLightInst && grassLightData) {
    const arr = grassLightInst.instanceMatrix.array;
    const count = grassLightData.count;
    const phArr = grassLightData.phase;
    const syArr = grassLightData.sy;
    for (let i = 0; i < count; i++) {
      const ph = phArr[i];
      const sy = syArr[i];
      const gust = Math.sin(t1 + ph) * 0.18 + Math.cos(t2 + ph * 1.5) * 0.07 + 0.09;
      const base = i * 16;
      arr[base + 4] = gust * sy;
      arr[base + 6] = gust * 0.45 * sy;
    }
    grassLightInst.instanceMatrix.needsUpdate = true;
  }

  if (flowerInst && flowerData) {
    const arr = flowerInst.instanceMatrix.array;
    const count = flowerData.count;
    const phArr = flowerData.phase;
    const syArr = flowerData.sy;
    for (let i = 0; i < count; i++) {
      const ph = phArr[i];
      const sy = syArr[i];
      const sway = Math.sin(t1 + ph) * 0.12 + 0.05;
      const base = i * 16;
      arr[base + 4] = sway * sy;
      arr[base + 6] = sway * 0.35 * sy;
    }
    flowerInst.instanceMatrix.needsUpdate = true;
  }

  if (canopyInst && canopyData) {
    const arr = canopyInst.instanceMatrix.array;
    const count = canopyData.count;
    const phArr = canopyData.phase;
    const syArr = canopyData.sy;
    for (let i = 0; i < count; i++) {
      const ph = phArr[i];
      const sy = syArr[i];
      const sway = Math.sin(time * 1.65 + ph) * 0.075;
      const base = i * 16;
      arr[base + 4] = sway * sy;
      arr[base + 6] = sway * 0.5 * sy;
    }
    canopyInst.instanceMatrix.needsUpdate = true;
  }

  if (flagInst && flagData) {
    const arr = flagInst.instanceMatrix.array;
    const count = flagData.count;
    for (let i = 0; i < count; i++) {
      const rot = flagData.rotY[i] + Math.sin(time * 4.2 + i * 1.3) * 0.22;
      const sx = flagData.sx[i];
      const sy = flagData.sy[i];
      const sz = flagData.sz[i];
      const c = Math.cos(rot);
      const s = Math.sin(rot);
      const base = i * 16;
      arr[base + 0] = c * sx;
      arr[base + 2] = -s * sx;
      arr[base + 4] = Math.sin(time * 6.5 + i) * 0.14;
      arr[base + 5] = sy;
      arr[base + 8] = s * sz;
      arr[base + 10] = c * sz;
    }
    flagInst.instanceMatrix.needsUpdate = true;
  }

  if (emberDustInst && emberDustData) {
    const arr = emberDustInst.instanceMatrix.array;
    const count = emberDustData.count;
    for (let i = 0; i < count; i++) {
      const base = i * 16;
      const ph = emberDustData.phase[i];
      const spd = emberDustData.speed[i];
      const rad = emberDustData.rad[i];

      if (emberDustData.isEmber[i]) {
        const cycle = (time * spd + ph) % 1.0;
        const sc = (1.0 - cycle) * 0.95 + 0.15;
        arr[base + 0] = sc;
        arr[base + 5] = sc * 1.45;
        arr[base + 10] = sc;
        arr[base + 12] = emberDustData.baseX[i] + Math.sin(time * 3.8 + ph * 4.0) * rad;
        arr[base + 13] = emberDustData.baseY[i] + cycle * 1.35;
        arr[base + 14] = emberDustData.baseZ[i] + Math.cos(time * 3.4 + ph * 3.0) * rad;
      } else {
        const sc = 0.28 + Math.sin(time * 2.0 + ph) * 0.1;
        arr[base + 0] = sc;
        arr[base + 5] = sc;
        arr[base + 10] = sc;
        arr[base + 12] = emberDustData.baseX[i] + Math.sin(time * spd + ph) * rad * 1.8;
        arr[base + 13] = emberDustData.baseY[i] + Math.cos(time * spd * 1.3 + ph) * 0.35;
        arr[base + 14] = emberDustData.baseZ[i] + Math.cos(time * spd * 0.8 + ph) * rad;
      }
    }
    emberDustInst.instanceMatrix.needsUpdate = true;
  }
}