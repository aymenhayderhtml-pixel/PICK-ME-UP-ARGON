// src/art/floors/farmFoliageAndAtmosphere.js
// Instanced olive trees, hay bales, fences, stones, cypresses, grass/wheat, dust motes, vultures, and per-frame animation.

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { FARM_COLORS, isWalkableOrClear } from './farmConfig.js';
import {
  clamp,
  distanceToPolyline,
  paintGeometry,
  paintTexturedGeometry,
  createContactDecal
} from './farmMaterials.js';

const _tempMat4 = new THREE.Matrix4();
const _tempPos = new THREE.Vector3();
const _tempQuat = new THREE.Quaternion();
const _tempScale = new THREE.Vector3();
const _tempEuler = new THREE.Euler();

const EXTRA_GROVE_COORDS = [
  { x: -16.5, z: -26 },
  { x: 16.5, z: -26 },
  { x: -17.2, z: -38 },
  { x: 17.2, z: -38 },
  { x: -15.8, z: -44 },
  { x: 15.8, z: -44 },
  { x: -34, z: -12 },
  { x: 34, z: -14 },
  { x: -36, z: -35 },
  { x: 36, z: -36 },
  { x: -35, z: -68 },
  { x: 37, z: -72 },
  { x: -36, z: -98 },
  { x: 35, z: -102 },
  { x: -32, z: -122 },
  { x: 32, z: -120 }
];

export function buildInstancedOliveTrees({
  group,
  materials,
  trackGeo,
  oliveObstacles,
  shadowDecals,
  rng,
  qCfg
}) {
  const treePlacements = [];

  for (let i = 0; i < oliveObstacles.length; i++) {
    const ob = oliveObstacles[i];
    treePlacements.push({
      x: ob.x,
      z: ob.z,
      scale: 0.96 + rng() * 0.18,
      rotY: rng() * Math.PI * 2,
      isObstacle: true
    });
    shadowDecals.push(createContactDecal(ob.x, ob.z, 2.3, 2.3, 0.9));
  }

  for (let i = 0; i < EXTRA_GROVE_COORDS.length; i++) {
    const eg = EXTRA_GROVE_COORDS[i];
    treePlacements.push({
      x: eg.x,
      z: eg.z,
      scale: 0.9 + rng() * 0.35,
      rotY: rng() * Math.PI * 2,
      isObstacle: false
    });
    shadowDecals.push(createContactDecal(eg.x, eg.z, 2.1, 2.1, 0.75));
  }

  const trunkParts = [];
  const mainTrunk = new THREE.CylinderGeometry(0.36, 0.58, 2.35, 8, 4);
  const tPos = mainTrunk.attributes.position;
  for (let i = 0; i < tPos.count; i++) {
    const vy = tPos.getY(i);
    const t = (vy + 1.175) / 2.35;
    const twist = t * 0.65;
    const vx = tPos.getX(i);
    const vz = tPos.getZ(i);
    tPos.setX(i, vx * Math.cos(twist) - vz * Math.sin(twist) + Math.sin(t * 3.1) * 0.14);
    tPos.setZ(i, vx * Math.sin(twist) + vz * Math.cos(twist) + Math.cos(t * 2.7) * 0.1);
  }
  mainTrunk.translate(0, 1.175, 0);
  trunkParts.push(paintTexturedGeometry(mainTrunk, FARM_COLORS.trunkDark, FARM_COLORS.trunkBark, 0.18, rng));

  for (let r = 0; r < 3; r++) {
    const ang = (r / 3) * Math.PI * 2 + 0.3;
    const root = new THREE.ConeGeometry(0.24, 0.75, 5);
    root.rotateZ(0.48);
    root.rotateY(ang);
    root.translate(Math.cos(ang) * 0.42, 0.32, Math.sin(ang) * 0.42);
    trunkParts.push(paintTexturedGeometry(root, FARM_COLORS.trunkDark, FARM_COLORS.trunkBark, 0.16, rng));
  }

  const boughAngles = [0.2, 2.3, 4.4];
  for (let b = 0; b < boughAngles.length; b++) {
    const ang = boughAngles[b];
    const bough = new THREE.CylinderGeometry(0.14, 0.26, 1.65, 6);
    bough.rotateZ(0.58);
    bough.rotateY(ang);
    bough.translate(Math.cos(ang) * 0.55, 2.55, Math.sin(ang) * 0.55);
    trunkParts.push(paintTexturedGeometry(bough, FARM_COLORS.trunkDark, FARM_COLORS.trunkBark, 0.16, rng));
  }

  const trunkGeo = trackGeo(mergeGeometries(trunkParts, false));

  const canopyParts = [];
  const lobeCount = qCfg.canopyLobes;
  for (let l = 0; l < lobeCount; l++) {
    const ang = (l / lobeCount) * Math.PI * 2 + rng() * 0.35;
    const dist = l === 0 ? 0 : 0.95 + (l % 2) * 0.65;
    const rad = l === 0 ? 1.55 : 1.05 + (l % 3) * 0.22;
    const lobe = new THREE.IcosahedronGeometry(rad, 1);
    lobe.scale(1.25, 0.58, 1.15);
    lobe.translate(
      Math.cos(ang) * dist,
      3.35 + (l % 3) * 0.32,
      Math.sin(ang) * dist
    );
    const topC = l % 2 === 0 ? FARM_COLORS.oliveSilver : FARM_COLORS.oliveLeafLight;
    canopyParts.push(paintGeometry(lobe, FARM_COLORS.oliveLeafDark, topC, 0.22, rng));
  }
  const canopyGeo = trackGeo(mergeGeometries(canopyParts, false));

  const trunkInst = new THREE.InstancedMesh(trunkGeo, materials.solid, treePlacements.length);
  const canopyInst = new THREE.InstancedMesh(canopyGeo, materials.foliage, treePlacements.length);

  for (let i = 0; i < treePlacements.length; i++) {
    const tp = treePlacements[i];
    _tempPos.set(tp.x, 0, tp.z);
    _tempEuler.set(0, tp.rotY, 0);
    _tempQuat.setFromEuler(_tempEuler);
    _tempScale.set(tp.scale, tp.scale, tp.scale);
    _tempMat4.compose(_tempPos, _tempQuat, _tempScale);
    trunkInst.setMatrixAt(i, _tempMat4);
    canopyInst.setMatrixAt(i, _tempMat4);
  }

  trunkInst.instanceMatrix.needsUpdate = true;
  canopyInst.instanceMatrix.needsUpdate = true;
  group.add(trunkInst);
  group.add(canopyInst);
}

export function buildInstancedHayBales({
  group,
  materials,
  trackGeo,
  baleObstacles,
  shadowDecals,
  rng,
  qCfg
}) {
  if (baleObstacles.length === 0) return;

  const r = 0.8;
  const baleParts = [];
  const mainCyl = new THREE.CylinderGeometry(r * 0.96, r * 0.98, 1.08, qCfg.baleRadial, 2);
  const pos = mainCyl.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const vy = pos.getY(i);
    const bulge = 1.0 + (1.0 - (vy / 0.54) * (vy / 0.54)) * 0.05;
    pos.setX(i, pos.getX(i) * bulge);
    pos.setZ(i, pos.getZ(i) * bulge);
  }
  mainCyl.translate(0, 0.54, 0);
  baleParts.push(paintTexturedGeometry(mainCyl, FARM_COLORS.hayShade, FARM_COLORS.hayBright, 0.18, rng));

  for (const bandY of [0.32, 0.76]) {
    const band = new THREE.CylinderGeometry(r * 1.01, r * 1.01, 0.06, qCfg.baleRadial);
    band.translate(0, bandY, 0);
    baleParts.push(paintTexturedGeometry(band, FARM_COLORS.woodDark, FARM_COLORS.ochreRut, 0.12, rng));
  }

  const baleGeo = trackGeo(mergeGeometries(baleParts, false));
  const baleInst = new THREE.InstancedMesh(baleGeo, materials.solid, baleObstacles.length);

  for (let i = 0; i < baleObstacles.length; i++) {
    const ob = baleObstacles[i];
    const s = (ob.radius || 0.8) / 0.8;
    _tempPos.set(ob.x, 0, ob.z);
    _tempEuler.set((rng() - 0.5) * 0.06, rng() * Math.PI * 2, (rng() - 0.5) * 0.06);
    _tempQuat.setFromEuler(_tempEuler);
    _tempScale.set(s, s * (0.92 + rng() * 0.18), s);
    _tempMat4.compose(_tempPos, _tempQuat, _tempScale);
    baleInst.setMatrixAt(i, _tempMat4);
    shadowDecals.push(createContactDecal(ob.x, ob.z, (ob.radius || 0.8) * 1.35, (ob.radius || 0.8) * 1.35, 0.95));
  }
  baleInst.instanceMatrix.needsUpdate = true;
  group.add(baleInst);
}

export function buildInstancedFenceRails({ group, materials, trackGeo, fenceInstances, rng }) {
  if (fenceInstances.length === 0) return;

  const parts = [];
  const post = new THREE.CylinderGeometry(0.08, 0.1, 1.25, 6);
  post.translate(0, 0.625, 0);
  parts.push(paintTexturedGeometry(post, FARM_COLORS.woodDark, FARM_COLORS.woodWeathered, 0.15, rng));

  for (const ry of [0.48, 0.92]) {
    const rail = new THREE.BoxGeometry(2.6, 0.09, 0.07);
    rail.translate(1.3, ry, 0);
    parts.push(paintTexturedGeometry(rail, FARM_COLORS.woodDark, FARM_COLORS.woodWeathered, 0.15, rng));
  }

  const fenceGeo = trackGeo(mergeGeometries(parts, false));
  const inst = new THREE.InstancedMesh(fenceGeo, materials.solid, fenceInstances.length);

  for (let i = 0; i < fenceInstances.length; i++) {
    const f = fenceInstances[i];
    _tempPos.set(f.x, f.y, f.z);
    _tempEuler.set(0, f.rotY, f.rotZ);
    _tempQuat.setFromEuler(_tempEuler);
    const sx = f.hasRails ? (f.railLen >= 0 ? 1 : -1) : 0.15;
    _tempScale.set(sx, f.scaleY, 1);
    _tempMat4.compose(_tempPos, _tempQuat, _tempScale);
    inst.setMatrixAt(i, _tempMat4);
  }
  inst.instanceMatrix.needsUpdate = true;
  group.add(inst);
}

export function buildInstancedFieldStonesAndCypress({ layout, group, materials, trackGeo, rng, qCfg }) {
  const b = layout.bounds || { minX: -46, maxX: 46, minZ: -130, maxZ: 7 };

  const stoneRaw = new THREE.DodecahedronGeometry(0.32, 0);
  stoneRaw.scale(1.25, 0.68, 0.95);
  stoneRaw.translate(0, 0.16, 0);
  const stoneGeo = trackGeo(
    paintTexturedGeometry(stoneRaw, FARM_COLORS.marbleShade, FARM_COLORS.marbleLit, 0.18, rng)
  );

  const stoneMatrices = [];
  for (let i = 0; i < qCfg.stoneCount; i++) {
    const x = (rng() - 0.5) * 84;
    const z = 5 - rng() * 132;
    if (isWalkableOrClear(layout, x, z, -0.4)) continue;
    const s = 0.45 + rng() * 1.25;
    _tempPos.set(x, 0, z);
    _tempEuler.set(rng() * 0.3, rng() * Math.PI * 2, rng() * 0.3);
    _tempQuat.setFromEuler(_tempEuler);
    _tempScale.set(s, s * (0.6 + rng() * 0.6), s);
    _tempMat4.compose(_tempPos, _tempQuat, _tempScale);
    stoneMatrices.push(_tempMat4.clone());
  }

  if (stoneMatrices.length > 0) {
    const stoneInst = new THREE.InstancedMesh(stoneGeo, materials.solid, stoneMatrices.length);
    for (let i = 0; i < stoneMatrices.length; i++) {
      stoneInst.setMatrixAt(i, stoneMatrices[i]);
    }
    stoneInst.instanceMatrix.needsUpdate = true;
    group.add(stoneInst);
  }

  const cypParts = [];
  const cypTrunk = new THREE.CylinderGeometry(0.18, 0.28, 1.6, 6);
  cypTrunk.translate(0, 0.8, 0);
  cypParts.push(paintGeometry(cypTrunk, FARM_COLORS.trunkDark, FARM_COLORS.trunkBark, 0.14, rng));

  const cypCone1 = new THREE.ConeGeometry(0.95, 5.2, 7);
  cypCone1.translate(0, 3.8, 0);
  cypParts.push(paintGeometry(cypCone1, FARM_COLORS.cypressDark, FARM_COLORS.oliveLeafMid, 0.18, rng));

  const cypCone2 = new THREE.ConeGeometry(0.72, 4.2, 7);
  cypCone2.translate(0, 5.4, 0);
  cypParts.push(paintGeometry(cypCone2, FARM_COLORS.cypressDark, FARM_COLORS.oliveLeafLight, 0.18, rng));

  const cypGeo = trackGeo(mergeGeometries(cypParts, false));
  const cypCount = 32;
  const cypInst = new THREE.InstancedMesh(cypGeo, materials.foliage, cypCount);

  for (let i = 0; i < cypCount; i++) {
    const side = i % 2 === 0 ? -1 : 1;
    const x = side * (b.maxX + 2 + rng() * 18);
    const z = b.maxZ - (i / cypCount) * (b.maxZ - b.minZ + 12) + (rng() - 0.5) * 6;
    const hY = 1.5 + rng() * 3.5;
    const s = 0.85 + rng() * 0.55;
    _tempPos.set(x, hY, z);
    _tempEuler.set(0, rng() * Math.PI * 2, (rng() - 0.5) * 0.08);
    _tempQuat.setFromEuler(_tempEuler);
    _tempScale.set(s, s, s);
    _tempMat4.compose(_tempPos, _tempQuat, _tempScale);
    cypInst.setMatrixAt(i, _tempMat4);
  }
  cypInst.instanceMatrix.needsUpdate = true;
  group.add(cypInst);
}

export function buildAnimatedFoliageAndAtmosphere({
  layout,
  group,
  materials,
  animatedRefs,
  trackGeo,
  rng,
  qCfg
}) {
  const poly = layout.pathPolyline || [
    { x: 0, z: 6 },
    { x: 0, z: -125 }
  ];
  const halfPath = (layout.pathWidth || 4.7) * 0.5;

  const grassParts = [];
  for (let b = 0; b < 3; b++) {
    const blade = new THREE.ConeGeometry(0.14, 0.55, 3);
    blade.translate(0, 0.275, 0);
    blade.rotateZ((b - 1) * 0.26);
    blade.rotateY((b / 3) * Math.PI);
    grassParts.push(paintGeometry(blade, FARM_COLORS.dryGrassDark, FARM_COLORS.dryGrassLight, 0.15, rng));
  }
  const grassGeo = trackGeo(mergeGeometries(grassParts, false));

  const grassBase = [];
  const grassPhases = [];
  for (let i = 0; i < qCfg.grassCount; i++) {
    const x = (rng() - 0.5) * 86;
    const z = 6 - rng() * 134;
    const dRoad = distanceToPolyline(x, z, poly).dist;
    if (dRoad < halfPath - 0.25) continue;

    const s = 0.65 + rng() * 0.85;
    _tempPos.set(x, 0, z);
    _tempEuler.set(0, rng() * Math.PI * 2, 0);
    _tempQuat.setFromEuler(_tempEuler);
    _tempScale.set(s, s, s);
    _tempMat4.compose(_tempPos, _tempQuat, _tempScale);
    grassBase.push(_tempMat4.clone());
    grassPhases.push(x * 0.17 + z * 0.13 + rng() * 2.5);
  }

  const grassInst = new THREE.InstancedMesh(grassGeo, materials.grass, grassBase.length);
  for (let i = 0; i < grassBase.length; i++) {
    grassInst.setMatrixAt(i, grassBase[i]);
  }
  grassInst.instanceMatrix.needsUpdate = true;
  group.add(grassInst);
  animatedRefs.grassInst = grassInst;
  animatedRefs.grassBaseMatrices = grassBase;
  animatedRefs.grassPhases = new Float32Array(grassPhases);

  const wheatParts = [];
  for (let s = 0; s < 4; s++) {
    const ang = (s / 4) * Math.PI * 2;
    const stalk = new THREE.CylinderGeometry(0.02, 0.03, 0.78, 4);
    stalk.translate(Math.cos(ang) * 0.08, 0.39, Math.sin(ang) * 0.08);
    wheatParts.push(paintGeometry(stalk, FARM_COLORS.hayShade, FARM_COLORS.wheatGold, 0.14, rng));

    const ear = new THREE.ConeGeometry(0.065, 0.24, 5);
    ear.translate(Math.cos(ang) * 0.1, 0.82, Math.sin(ang) * 0.1);
    wheatParts.push(paintGeometry(ear, FARM_COLORS.hayBright, 0xffe48a, 0.16, rng));
  }
  const wheatGeo = trackGeo(mergeGeometries(wheatParts, false));

  const wheatBase = [];
  const wheatPhases = [];
  for (let i = 0; i < qCfg.wheatCount; i++) {
    const x = (rng() - 0.5) * 78;
    const z = 4 - rng() * 130;
    if (isWalkableOrClear(layout, x, z, -1.2)) continue;

    const s = 0.75 + rng() * 0.7;
    _tempPos.set(x, 0, z);
    _tempEuler.set(0, rng() * Math.PI * 2, 0);
    _tempQuat.setFromEuler(_tempEuler);
    _tempScale.set(s, s, s);
    _tempMat4.compose(_tempPos, _tempQuat, _tempScale);
    wheatBase.push(_tempMat4.clone());
    wheatPhases.push(x * 0.21 + z * 0.19 + rng() * 3.14);
  }

  const wheatInst = new THREE.InstancedMesh(wheatGeo, materials.grass, wheatBase.length);
  for (let i = 0; i < wheatBase.length; i++) {
    wheatInst.setMatrixAt(i, wheatBase[i]);
  }
  wheatInst.instanceMatrix.needsUpdate = true;
  group.add(wheatInst);
  animatedRefs.wheatInst = wheatInst;
  animatedRefs.wheatBaseMatrices = wheatBase;
  animatedRefs.wheatPhases = new Float32Array(wheatPhases);

  const moteGeo = trackGeo(paintGeometry(new THREE.OctahedronGeometry(0.045, 0), 0xffe4a0, 0xffffff, 0.0, rng));
  const dustInst = new THREE.InstancedMesh(moteGeo, materials.emissive, qCfg.dustCount);
  const dustData = [];
  for (let i = 0; i < qCfg.dustCount; i++) {
    const dx = (rng() - 0.5) * 44;
    const dy = 0.4 + rng() * 3.2;
    const dz = 4 - rng() * 128;
    const phase = rng() * Math.PI * 2;
    const speed = 0.35 + rng() * 0.55;
    dustData.push({ x: dx, y: dy, z: dz, phase, speed });
    _tempPos.set(dx, dy, dz);
    _tempQuat.identity();
    _tempScale.setScalar(0.6 + rng() * 0.8);
    _tempMat4.compose(_tempPos, _tempQuat, _tempScale);
    dustInst.setMatrixAt(i, _tempMat4);
  }
  dustInst.instanceMatrix.needsUpdate = true;
  group.add(dustInst);
  animatedRefs.dustInst = dustInst;
  animatedRefs.dustData = dustData;

  const birdParts = [];
  const body = new THREE.ConeGeometry(0.14, 0.65, 5);
  body.rotateX(Math.PI / 2);
  birdParts.push(paintGeometry(body, FARM_COLORS.outline, FARM_COLORS.trunkDark, 0.1, rng));
  for (const side of [-1, 1]) {
    const wing = new THREE.BoxGeometry(0.95, 0.04, 0.28);
    wing.rotateZ(side * 0.14);
    wing.translate(side * 0.48, 0.05, 0);
    birdParts.push(paintGeometry(wing, FARM_COLORS.outline, FARM_COLORS.woodDark, 0.1, rng));
  }
  const birdGeo = trackGeo(mergeGeometries(birdParts, false));
  const vultureInst = new THREE.InstancedMesh(birdGeo, materials.solid, 2);
  animatedRefs.vultureInst = vultureInst;
  animatedRefs.vultureData = [
    { cx: -32, cz: -55, y: 18, radius: 16, speed: 0.22, phase: 0 },
    { cx: 30, cz: -85, y: 20, radius: 18, speed: 0.19, phase: 2.4 }
  ];
  group.add(vultureInst);
}

export function updateFarmAnimations(dt, time, animatedRefs) {
  const grassInst = animatedRefs.grassInst;
  if (grassInst && animatedRefs.grassBaseMatrices) {
    const base = animatedRefs.grassBaseMatrices;
    const phases = animatedRefs.grassPhases;
    const count = base.length;
    for (let i = 0; i < count; i++) {
      _tempMat4.copy(base[i]);
      const sway = Math.sin(time * 1.85 + phases[i]) * 0.085;
      _tempMat4.elements[4] += sway;
      grassInst.setMatrixAt(i, _tempMat4);
    }
    grassInst.instanceMatrix.needsUpdate = true;
  }

  const wheatInst = animatedRefs.wheatInst;
  if (wheatInst && animatedRefs.wheatBaseMatrices) {
    const base = animatedRefs.wheatBaseMatrices;
    const phases = animatedRefs.wheatPhases;
    const count = base.length;
    for (let i = 0; i < count; i++) {
      _tempMat4.copy(base[i]);
      const sway = Math.sin(time * 2.1 + phases[i]) * 0.11;
      _tempMat4.elements[4] += sway;
      wheatInst.setMatrixAt(i, _tempMat4);
    }
    wheatInst.instanceMatrix.needsUpdate = true;
  }

  for (let i = 0; i < animatedRefs.clothMeshes.length; i++) {
    const c = animatedRefs.clothMeshes[i];
    const pos = c.geo.attributes.position;
    for (let v = 0; v < pos.count; v++) {
      const by = c.baseY[v];
      const pinFactor = clamp(-by / c.height, 0, 1);
      const wave = Math.sin(time * 3.2 + c.phase + by * 2.5) * 0.14 * pinFactor;
      pos.setZ(v, c.baseZ[v] + wave);
    }
    pos.needsUpdate = true;
  }

  for (let i = 0; i < animatedRefs.flameMeshes.length; i++) {
    const f = animatedRefs.flameMeshes[i];
    const s = 0.88 + Math.sin(time * 11.0 + f.phase) * 0.14 + Math.cos(time * 17.3 + f.phase) * 0.08;
    f.mesh.scale.set(s, s * 1.12, s);
  }

  const dustInst = animatedRefs.dustInst;
  if (dustInst && animatedRefs.dustData) {
    const dd = animatedRefs.dustData;
    for (let i = 0; i < dd.length; i++) {
      const d = dd[i];
      const x = d.x + Math.sin(time * d.speed + d.phase) * 0.65;
      const y = d.y + Math.cos(time * d.speed * 0.8 + d.phase) * 0.28;
      const z = d.z + Math.sin(time * d.speed * 0.6 + d.phase * 1.3) * 0.65;
      _tempPos.set(x, y, z);
      _tempQuat.identity();
      _tempScale.setScalar(0.75 + Math.sin(time * 2.2 + d.phase) * 0.25);
      _tempMat4.compose(_tempPos, _tempQuat, _tempScale);
      dustInst.setMatrixAt(i, _tempMat4);
    }
    dustInst.instanceMatrix.needsUpdate = true;
  }

  const vultureInst = animatedRefs.vultureInst;
  if (vultureInst && animatedRefs.vultureData) {
    const vd = animatedRefs.vultureData;
    for (let i = 0; i < vd.length; i++) {
      const v = vd[i];
      const ang = time * v.speed + v.phase;
      const vx = v.cx + Math.cos(ang) * v.radius;
      const vz = v.cz + Math.sin(ang) * v.radius;
      const vy = v.y + Math.sin(ang * 2.0) * 0.6;
      _tempPos.set(vx, vy, vz);
      _tempEuler.set(0.05, -ang, 0.22);
      _tempQuat.setFromEuler(_tempEuler);
      _tempScale.setScalar(1.2);
      _tempMat4.compose(_tempPos, _tempQuat, _tempScale);
      vultureInst.setMatrixAt(i, _tempMat4);
    }
    vultureInst.instanceMatrix.needsUpdate = true;
  }
}