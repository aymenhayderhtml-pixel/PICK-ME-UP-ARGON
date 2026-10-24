// src/art/floors/forestAtmosphere.js
// Sky dome, lighting/fog/shadow setup, mountain rings, god rays, swirling leaves, pollen motes, and per-frame update.

import * as THREE from 'three';
import { BRIGHT_FOREST_LIGHTING, HILL_LAYER_SPECS } from './forestUtils.js';
import {
  buildSkyDomeGeometry,
  buildMountainRingLayerGeometry,
  buildTaperedGodRayGeometry,
  buildSwirlingLeafGeometry
} from './forestGeometries.js';

let _activeDebrisState = null;

const _tempMat4 = new THREE.Matrix4();
const _tempPos = new THREE.Vector3();
const _tempQuat = new THREE.Quaternion();
const _tempScale = new THREE.Vector3();
const _tempEuler = new THREE.Euler();
const _tempColor = new THREE.Color();

export function setActiveDebrisState(state) {
  _activeDebrisState = state;
}

export function clearActiveDebrisStateIfMatch(state) {
  if (_activeDebrisState === state) {
    _activeDebrisState = null;
  }
}

export function updateFloor3Debris(delta) {
  const state = _activeDebrisState;
  if (!state) return;

  const dt = delta > 0 && delta < 0.25 ? delta : 0.016;
  state.time += dt;
  const t = state.time;

  for (let i = 0; i < state.windUniforms.length; i++) {
    state.windUniforms[i].value = t;
  }

  if (state.godRayMesh && state.godRayBaseScales) {
    const count = state.godRayBaseScales.length;
    for (let i = 0; i < count; i++) {
      const d = state.godRayData[i];
      const pulse = 0.86 + 0.22 * Math.sin(t * d.speed + d.phase);
      _tempPos.set(d.x, d.y, d.z);
      _tempEuler.set(d.rx, d.ry, d.rz);
      _tempQuat.setFromEuler(_tempEuler);
      _tempScale.set(d.sx * pulse, d.sy, d.sz * pulse);
      _tempMat4.compose(_tempPos, _tempQuat, _tempScale);
      state.godRayMesh.setMatrixAt(i, _tempMat4);
    }
    state.godRayMesh.instanceMatrix.needsUpdate = true;
    state.godRayMaterial.opacity = 0.072 + 0.022 * Math.sin(t * 0.85);
  }

  if (state.leafMesh) {
    const n = state.leafCount;
    const lx = state.leafX;
    const ly = state.leafY;
    const lz = state.leafZ;
    const lvx = state.leafVX;
    const lvy = state.leafVY;
    const lvz = state.leafVZ;
    const lPhase = state.leafPhase;
    const lScale = state.leafScale;

    const gustX = Math.sin(t * 0.65) * 1.15 + 0.55;
    const gustZ = Math.cos(t * 0.48) * 0.85 + 0.35;

    for (let i = 0; i < n; i++) {
      const ph = lPhase[i];
      const relX = lx[i] - state.centerX;
      const relZ = lz[i] - state.centerZ;

      const swirlX = -relZ * 0.085 + Math.sin(t * 1.9 + ph) * 1.35 + gustX;
      const swirlZ =  relX * 0.085 + Math.cos(t * 1.6 + ph) * 1.35 + gustZ;

      lx[i] += (lvx[i] + swirlX) * dt;
      ly[i] += (lvy[i] + Math.sin(t * 2.8 + ph) * 0.28) * dt;
      lz[i] += (lvz[i] + swirlZ) * dt;

      if (ly[i] < state.centerY + 0.15 || Math.hypot(lx[i] - state.centerX, lz[i] - state.centerZ) > 28.0) {
        const respawnAngle = (ph * 3.7 + t * 0.4) % (Math.PI * 2);
        const respawnRadius = 3.0 + ((i * 0.6180339) % 1) * 18.5;
        lx[i] = state.centerX + Math.cos(respawnAngle) * respawnRadius;
        lz[i] = state.centerZ + Math.sin(respawnAngle) * respawnRadius;
        ly[i] = state.centerY + 6.5 + (i % 7) * 0.85;
      }

      _tempPos.set(lx[i], ly[i], lz[i]);
      _tempEuler.set(
        t * 2.4 + ph,
        t * 1.8 + ph * 1.3,
        Math.sin(t * 3.1 + ph) * 0.95
      );
      _tempQuat.setFromEuler(_tempEuler);
      const sc = lScale[i];
      _tempScale.set(sc, sc, sc);
      _tempMat4.compose(_tempPos, _tempQuat, _tempScale);
      state.leafMesh.setMatrixAt(i, _tempMat4);
    }
    state.leafMesh.instanceMatrix.needsUpdate = true;
  }

  if (state.pollenMesh) {
    const pCount = state.pollenCount;
    const px = state.pollenBaseX;
    const py = state.pollenBaseY;
    const pz = state.pollenBaseZ;
    const pPhase = state.pollenPhase;
    const pScale = state.pollenScale;

    for (let i = 0; i < pCount; i++) {
      const ph = pPhase[i];
      const x = px[i] + Math.sin(t * 0.55 + ph) * 0.85;
      const y = py[i] + Math.sin(t * 0.92 + ph * 1.7) * 0.42;
      const z = pz[i] + Math.cos(t * 0.61 + ph * 1.3) * 0.85;

      _tempPos.set(x, y, z);
      _tempQuat.identity();
      const s = pScale[i] * (0.75 + 0.35 * Math.sin(t * 2.2 + ph));
      _tempScale.set(s, s, s);
      _tempMat4.compose(_tempPos, _tempQuat, _tempScale);
      state.pollenMesh.setMatrixAt(i, _tempMat4);
    }
    state.pollenMesh.instanceMatrix.needsUpdate = true;
  }

  if (state.gatePortalMesh && state.gatePortalMesh.visible) {
    state.gatePortalMesh.rotation.z = t * 1.4;
  }
}

export function buildSkyAndLighting({
  ctx,
  group,
  centerX,
  centerY,
  centerZ,
  trackGeometry,
  trackMaterial,
  registerMesh
}) {
  const skyGeo = trackGeometry(buildSkyDomeGeometry());
  const skyMat = trackMaterial(
    new THREE.MeshBasicMaterial({
      vertexColors: true,
      side: THREE.BackSide,
      fog: false,
      depthWrite: false,
    })
  );
  const skyMesh = new THREE.Mesh(skyGeo, skyMat);
  skyMesh.position.set(centerX, centerY - 6.0, centerZ);
  skyMesh.renderOrder = -10;

  const fallbackSun = new THREE.DirectionalLight(0xfff3d1, 1.85);
  fallbackSun.position.set(centerX + 24, centerY + 44, centerZ + 16);
  fallbackSun.target.position.set(centerX, centerY, centerZ);
  fallbackSun.visible = false;
  group.add(fallbackSun);
  group.add(fallbackSun.target);

  const fallbackHemi = new THREE.HemisphereLight(0xdcf7e8, 0x314927, 0.75);
  fallbackHemi.visible = false;
  group.add(fallbackHemi);

  const fallbackAmb = new THREE.AmbientLight(0x6b8f8c, 0.48);
  fallbackAmb.visible = false;
  group.add(fallbackAmb);

  let sceneConfigured = false;
  let configuredSceneRef = null;
  let previousFogRef = null;

  const configureSceneAndShadows = (renderer, scene) => {
    if (sceneConfigured || !scene) return;
    sceneConfigured = true;
    configuredSceneRef = scene;
    previousFogRef = scene.fog;

    scene.fog = new THREE.FogExp2(0xd8efe2, 0.0105);
    if (!scene.background) {
      scene.background = new THREE.Color(BRIGHT_FOREST_LIGHTING.background);
    }

    if (renderer && renderer.shadowMap) {
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    }

    let foundDir = null;
    let foundHemi = null;
    let foundAmb = null;

    for (let i = 0; i < scene.children.length; i++) {
      const child = scene.children[i];
      if (child.isDirectionalLight && !foundDir) foundDir = child;
      else if (child.isHemisphereLight && !foundHemi) foundHemi = child;
      else if (child.isAmbientLight && !foundAmb) foundAmb = child;
    }

    const activeSun = foundDir || fallbackSun;
    if (!foundDir) fallbackSun.visible = true;
    if (!foundHemi) fallbackHemi.visible = true;
    if (!foundAmb) fallbackAmb.visible = true;

    if (foundHemi) {
      foundHemi.color.setHex(BRIGHT_FOREST_LIGHTING.hemi.sky);
      foundHemi.groundColor.setHex(BRIGHT_FOREST_LIGHTING.hemi.ground);
      foundHemi.intensity = BRIGHT_FOREST_LIGHTING.hemi.intensity;
    }
    if (foundAmb) {
      foundAmb.color.setHex(BRIGHT_FOREST_LIGHTING.ambient.color);
      foundAmb.intensity = BRIGHT_FOREST_LIGHTING.ambient.intensity;
    }

    activeSun.color.setHex(BRIGHT_FOREST_LIGHTING.sun.color);
    activeSun.intensity = BRIGHT_FOREST_LIGHTING.sun.intensity;
    activeSun.position.set(centerX + 24, centerY + 44, centerZ + 16);
    if (!activeSun.target.parent) scene.add(activeSun.target);
    activeSun.target.position.set(centerX, centerY, centerZ);

    activeSun.castShadow = true;
    activeSun.shadow.mapSize.set(2048, 2048);
    activeSun.shadow.camera.near = 1;
    activeSun.shadow.camera.far = 60;
    activeSun.shadow.camera.left = -14;
    activeSun.shadow.camera.right = 14;
    activeSun.shadow.camera.top = 14;
    activeSun.shadow.camera.bottom = -14;
    activeSun.shadow.bias = -0.0004;
    activeSun.shadow.normalBias = 0.02;
    activeSun.shadow.camera.updateProjectionMatrix();
  };

  if (ctx.scene) {
    configureSceneAndShadows(ctx.renderer, ctx.scene);
  }
  skyMesh.onBeforeRender = (renderer, scene) => {
    configureSceneAndShadows(renderer, scene);
  };
  registerMesh(skyMesh);

  return {
    fallbackSun,
    restoreSceneFog() {
      if (configuredSceneRef && previousFogRef !== undefined) {
        configuredSceneRef.fog = previousFogRef;
      }
    }
  };
}

export function buildMountainsAndDebris({
  centerX,
  centerY,
  centerZ,
  rand,
  windUniforms,
  gatePortalMesh,
  trackGeometry,
  trackMaterial,
  registerMesh
}) {
  const mountainMat = trackMaterial(
    new THREE.MeshLambertMaterial({
      vertexColors: true,
      fog: true,
    })
  );

  for (let i = 0; i < HILL_LAYER_SPECS.length; i++) {
    const spec = HILL_LAYER_SPECS[i];
    const hillGeo = trackGeometry(
      buildMountainRingLayerGeometry(
        spec.innerR,
        spec.outerR,
        spec.minH,
        spec.maxH,
        spec.segs,
        spec.colorBot,
        spec.colorTop,
        spec.seed
      )
    );
    const hillMesh = new THREE.Mesh(hillGeo, mountainMat);
    hillMesh.position.set(centerX, centerY + spec.yOffset, centerZ);
    registerMesh(hillMesh);
  }

  const godRayCount = 5;
  const godRayGeo = trackGeometry(buildTaperedGodRayGeometry());
  const godRayMat = trackMaterial(
    new THREE.MeshBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.075,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      fog: false,
    })
  );
  const godRayInst = new THREE.InstancedMesh(godRayGeo, godRayMat, godRayCount);

  const godRayData = [
    { x: centerX - 5.5, y: centerY + 12.0, z: centerZ - 4.5, rx: -0.22, ry: 0.2, rz:  0.34, sx: 1.15, sy: 1.05, sz: 1.15, speed: 0.95, phase: 0.0 },
    { x: centerX + 4.8, y: centerY + 12.5, z: centerZ - 6.0, rx: -0.22, ry: 0.8, rz:  0.34, sx: 1.30, sy: 1.10, sz: 1.30, speed: 0.80, phase: 1.3 },
    { x: centerX - 1.2, y: centerY + 13.0, z: centerZ - 1.2, rx: -0.22, ry: 1.5, rz:  0.34, sx: 1.45, sy: 1.15, sz: 1.45, speed: 1.10, phase: 2.6 },
    { x: centerX + 7.2, y: centerY + 11.8, z: centerZ + 3.5, rx: -0.22, ry: 2.1, rz:  0.34, sx: 1.05, sy: 1.00, sz: 1.05, speed: 0.88, phase: 3.9 },
    { x: centerX - 6.8, y: centerY + 11.8, z: centerZ + 4.2, rx: -0.22, ry: 2.7, rz:  0.34, sx: 1.10, sy: 1.00, sz: 1.10, speed: 1.02, phase: 5.1 },
  ];
  const godRayBaseScales = new Float32Array(godRayCount);

  for (let i = 0; i < godRayCount; i++) {
    const d = godRayData[i];
    godRayBaseScales[i] = d.sx;
    _tempPos.set(d.x, d.y, d.z);
    _tempEuler.set(d.rx, d.ry, d.rz);
    _tempQuat.setFromEuler(_tempEuler);
    _tempScale.set(d.sx, d.sy, d.sz);
    _tempMat4.compose(_tempPos, _tempQuat, _tempScale);
    godRayInst.setMatrixAt(i, _tempMat4);
  }
  godRayInst.instanceMatrix.needsUpdate = true;
  registerMesh(godRayInst, godRayCount);

  const leafCount = 110;
  const leafGeo = trackGeometry(buildSwirlingLeafGeometry());
  const leafMat = trackMaterial(
    new THREE.MeshBasicMaterial({
      vertexColors: true,
      side: THREE.DoubleSide,
    })
  );
  const leafInst = new THREE.InstancedMesh(leafGeo, leafMat, leafCount);
  leafInst.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

  const leafX = new Float32Array(leafCount);
  const leafY = new Float32Array(leafCount);
  const leafZ = new Float32Array(leafCount);
  const leafVX = new Float32Array(leafCount);
  const leafVY = new Float32Array(leafCount);
  const leafVZ = new Float32Array(leafCount);
  const leafPhase = new Float32Array(leafCount);
  const leafScale = new Float32Array(leafCount);

  for (let i = 0; i < leafCount; i++) {
    const ang = rand() * Math.PI * 2;
    const rad = Math.sqrt(rand()) * 21.0;
    leafX[i] = centerX + Math.cos(ang) * rad;
    leafY[i] = centerY + 0.5 + rand() * 8.5;
    leafZ[i] = centerZ + Math.sin(ang) * rad;
    leafVX[i] = (rand() - 0.35) * 0.85;
    leafVY[i] = -(0.42 + rand() * 0.55);
    leafVZ[i] = (rand() - 0.35) * 0.85;
    leafPhase[i] = rand() * Math.PI * 2;
    leafScale[i] = 0.75 + rand() * 0.85;

    _tempPos.set(leafX[i], leafY[i], leafZ[i]);
    _tempEuler.set(rand() * Math.PI, rand() * Math.PI, rand() * Math.PI);
    _tempQuat.setFromEuler(_tempEuler);
    _tempScale.setScalar(leafScale[i]);
    _tempMat4.compose(_tempPos, _tempQuat, _tempScale);
    leafInst.setMatrixAt(i, _tempMat4);

    _tempColor.setHSL(0.21 + rand() * 0.08, 0.82, 0.58 + rand() * 0.16);
    leafInst.setColorAt(i, _tempColor);
  }
  leafInst.instanceMatrix.needsUpdate = true;
  if (leafInst.instanceColor) leafInst.instanceColor.needsUpdate = true;
  registerMesh(leafInst, leafCount);

  const pollenCount = 600;
  const pollenGeo = trackGeometry(new THREE.OctahedronGeometry(0.028, 0));
  const pollenMat = trackMaterial(
    new THREE.MeshBasicMaterial({
      color: 0xfffbe0,
      transparent: true,
      opacity: 0.68,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
  );
  const pollenInst = new THREE.InstancedMesh(pollenGeo, pollenMat, pollenCount);
  pollenInst.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

  const pollenBaseX = new Float32Array(pollenCount);
  const pollenBaseY = new Float32Array(pollenCount);
  const pollenBaseZ = new Float32Array(pollenCount);
  const pollenPhase = new Float32Array(pollenCount);
  const pollenScale = new Float32Array(pollenCount);

  for (let i = 0; i < pollenCount; i++) {
    const ang = rand() * Math.PI * 2;
    const rad = Math.sqrt(rand()) * 22.0;
    pollenBaseX[i] = centerX + Math.cos(ang) * rad;
    pollenBaseY[i] = centerY + 0.4 + rand() * 5.6;
    pollenBaseZ[i] = centerZ + Math.sin(ang) * rad;
    pollenPhase[i] = rand() * Math.PI * 2;
    pollenScale[i] = 0.65 + rand() * 0.95;

    _tempPos.set(pollenBaseX[i], pollenBaseY[i], pollenBaseZ[i]);
    _tempQuat.identity();
    _tempScale.setScalar(pollenScale[i]);
    _tempMat4.compose(_tempPos, _tempQuat, _tempScale);
    pollenInst.setMatrixAt(i, _tempMat4);
  }
  pollenInst.instanceMatrix.needsUpdate = true;
  registerMesh(pollenInst, pollenCount);

  const debrisState = {
    time: 0,
    centerX,
    centerY,
    centerZ,
    windUniforms,
    godRayMesh: godRayInst,
    godRayMaterial: godRayMat,
    godRayData,
    godRayBaseScales,
    mesh: leafInst,
    leafMesh: leafInst,
    leafCount,
    leafX,
    leafY,
    leafZ,
    leafVX,
    leafVY,
    leafVZ,
    leafPhase,
    leafScale,
    pollenMesh: pollenInst,
    pollenCount,
    pollenBaseX,
    pollenBaseY,
    pollenBaseZ,
    pollenPhase,
    pollenScale,
    gatePortalMesh,
  };
  setActiveDebrisState(debrisState);

  return {
    debrisState,
    leafInst,
    leafCount,
    pollenInst,
    pollenCount
  };
}