// src/enemies/models/Wolf.js
// Quadruped procedural mesh builder and controller for wolf enemy types.
import * as THREE from 'three';
import { getPrairieWolfAssets } from './WolfAssets.js';
import { applyPrairieWolfPose } from '../poses/wolfPoses.js';

export function buildQuadrupedModel(type, arch = {}, opts = {}) {
  const assets = getPrairieWolfAssets();
  const showOutlineInit = opts.outline !== false;

  const shoulderH = arch.height || 0.95;
  const bodyL = arch.length || 1.7;
  const hipH = shoulderH * 0.92;

  const group = new THREE.Group();
  group.name = 'Enemy_' + type;
  const parts = {};

  function ensurePivot(name, parent, x, y, z) {
    const p = new THREE.Group();
    p.name = name;
    p.position.set(x, y, z);
    parent.add(p);
    parts[name] = p;
    return p;
  }

  const root = ensurePivot('root', group, 0, 0, 0);
  const hips = ensurePivot('hips', root, 0, hipH, -bodyL * 0.35);
  const torso = ensurePivot('torso', hips, 0, 0, bodyL * 0.35);
  const chest = ensurePivot('chest', torso, 0, shoulderH * 0.08, bodyL * 0.35);
  const neck = ensurePivot('neck', chest, 0, shoulderH * 0.15, 0.22);
  const head = ensurePivot('head', neck, 0, 0.12, 0.25);
  const jaw = ensurePivot('jaw', head, 0, -0.08, 0.15);
  const earL = ensurePivot('earL', head, 0.12, 0.15, -0.05);
  const earR = ensurePivot('earR', head, -0.12, 0.15, -0.05);
  const tail1 = ensurePivot('tail1', hips, 0, 0.05, -0.15);
  const tail2 = ensurePivot('tail2', tail1, 0, -0.15, -0.2);
  const tail3 = ensurePivot('tail3', tail2, 0, -0.15, -0.2);
  const shoulderFL = ensurePivot('shoulderFL', chest, 0.22, -0.1, 0.1);
  const shoulderFR = ensurePivot('shoulderFR', chest, -0.22, -0.1, 0.1);
  const elbowFL = ensurePivot('elbowFL', shoulderFL, 0, -shoulderH * 0.4, 0);
  const elbowFR = ensurePivot('elbowFR', shoulderFR, 0, -shoulderH * 0.4, 0);
  const pawFL = ensurePivot('pawFL', elbowFL, 0, -shoulderH * 0.42, 0);
  const pawFR = ensurePivot('pawFR', elbowFR, 0, -shoulderH * 0.42, 0);
  const hipBL = ensurePivot('hipBL', hips, 0.20, -0.05, 0);
  const hipBR = ensurePivot('hipBR', hips, -0.20, -0.05, 0);
  const kneeBL = ensurePivot('kneeBL', hipBL, 0, -hipH * 0.42, 0);
  const kneeBR = ensurePivot('kneeBR', hipBR, 0, -hipH * 0.42, 0);
  const pawBL = ensurePivot('pawBL', kneeBL, 0, -hipH * 0.45, 0);
  const pawBR = ensurePivot('pawBR', kneeBR, 0, -hipH * 0.45, 0);

  const bodyMeshes = [];
  const switchableOutlineEntries = [];
  const backSideOutlineMeshes = [];

  let currentFurMat = assets.furMat;
  let currentEyeMat = assets.eyeMat;
  let currentOutlineMat = assets.outlineMat;
  let furMatCloned = false;
  let eyeMatCloned = false;
  let outlineMatCloned = false;

  function addPartMesh(pivot, partKey) {
    const geom = showOutlineInit ? assets.geomsOutlined[partKey] : assets.geomsBody[partKey];
    const mesh = new THREE.Mesh(geom, currentFurMat);
    mesh.name = 'wolf_' + partKey;
    pivot.add(mesh);
    bodyMeshes.push(mesh);
    if (assets.geomsOutlined[partKey] !== assets.geomsBody[partKey]) {
      switchableOutlineEntries.push({ mesh, partKey });
    }
    return mesh;
  }

  addPartMesh(hips, 'hips');
  addPartMesh(torso, 'torso');
  addPartMesh(chest, 'chest');
  addPartMesh(neck, 'neck');
  addPartMesh(head, 'head');
  addPartMesh(jaw, 'jaw');
  addPartMesh(earL, 'earL');
  addPartMesh(earR, 'earR');
  addPartMesh(tail1, 'tail1');
  addPartMesh(tail2, 'tail2');
  addPartMesh(tail3, 'tail3');
  addPartMesh(shoulderFL, 'upperForeleg');
  addPartMesh(shoulderFR, 'upperForeleg');
  addPartMesh(elbowFL, 'lowerForeleg');
  addPartMesh(elbowFR, 'lowerForeleg');
  addPartMesh(pawFL, 'paw');
  addPartMesh(pawFR, 'paw');
  addPartMesh(hipBL, 'upperHindleg');
  addPartMesh(hipBR, 'upperHindleg');
  addPartMesh(kneeBL, 'lowerHindleg');
  addPartMesh(kneeBR, 'lowerHindleg');
  addPartMesh(pawBL, 'paw');
  addPartMesh(pawBR, 'paw');

  // Glowing yellow eyes and golden brow streaks on head
  const eyesMesh = new THREE.Mesh(assets.geomsBody.eyes, currentEyeMat);
  eyesMesh.name = 'wolf_eyes';
  head.add(eyesMesh);

  // Anchors & Sockets
  const mouthAnchor = new THREE.Object3D();
  mouthAnchor.name = 'mouth';
  mouthAnchor.position.set(0, -0.04, 0.34);
  head.add(mouthAnchor);

  const feetAnchor = new THREE.Object3D();
  feetAnchor.name = 'feet';
  feetAnchor.position.set(0, 0, 0);
  root.add(feetAnchor);

  const anchors = {
    head,
    chest,
    mouth: mouthAnchor,
    feet: feetAnchor,
    weapon: mouthAnchor,
  };

  const sockets = {
    handR: pawFR,
    handL: pawFL,
    back: torso,
    head,
  };

  const modelState = {
    shoulderH,
    bodyL,
    expression: 'neutral',
    eyeGlow: 1.0,
    enrage: 0,
    outlineVisible: showOutlineInit,
  };

  function ensureClonedFurMat() {
    if (!furMatCloned) {
      currentFurMat = assets.furMat.clone();
      furMatCloned = true;
      for (let i = 0; i < bodyMeshes.length; i++) {
        bodyMeshes[i].material = currentFurMat;
      }
    }
    return currentFurMat;
  }

  function ensureClonedEyeMat() {
    if (!eyeMatCloned) {
      currentEyeMat = assets.eyeMat.clone();
      eyeMatCloned = true;
      eyesMesh.material = currentEyeMat;
    }
    return currentEyeMat;
  }

  function ensureClonedOutlineMat() {
    if (!outlineMatCloned) {
      currentOutlineMat = assets.outlineMat.clone();
      outlineMatCloned = true;
      for (let i = 0; i < backSideOutlineMeshes.length; i++) {
        backSideOutlineMeshes[i].material = currentOutlineMat;
      }
    }
    return currentOutlineMat;
  }

  function setPose(name, t = 0, intensity = 1) {
    applyPrairieWolfPose(parts, name, t, intensity, modelState);
  }

  function setEyeGlow(intensity = 1) {
    modelState.eyeGlow = Math.max(0, Math.min(2, intensity));
    const mat = ensureClonedEyeMat();
    const g = modelState.eyeGlow;
    mat.color.setRGB(
      Math.min(1, 0.35 + g * 0.65),
      Math.min(1, 0.25 + g * 0.57),
      Math.min(1, 0.05 + g * 0.18)
    );
  }

  function setExpression(name = 'neutral') {
    modelState.expression = name;
  }

  function setTint(hex, amount = 0) {
    const mat = ensureClonedFurMat();
    if (!hex || amount <= 0) {
      mat.color.setHex(0xffffff);
      mat.emissive.setHex(0x000000);
      return;
    }
    const a = Math.max(0, Math.min(1, amount));
    const target = new THREE.Color(hex);
    mat.color.setHex(0xffffff).lerp(target, a * 0.65);
    mat.emissive.copy(target).multiplyScalar(a * 0.35);
  }

  function setOpacity(a = 1) {
    const op = Math.max(0, Math.min(1, a));
    const fMat = ensureClonedFurMat();
    const eMat = ensureClonedEyeMat();
    const oMat = ensureClonedOutlineMat();
    const isTrans = op < 0.999;

    fMat.transparent = isTrans;
    fMat.opacity = op;
    eMat.transparent = isTrans;
    eMat.opacity = op;
    oMat.transparent = isTrans;
    oMat.opacity = op;
  }

  function setEnrage(amount = 0) {
    const e = Math.max(0, Math.min(1, amount));
    modelState.enrage = e;
    chest.scale.setScalar(1 + e * 0.08);
    neck.scale.setScalar(1 + e * 0.10);
    setEyeGlow(1.0 + e * 1.0);
    if (e > 0.01) {
      setTint(0xff4422, e * 0.35);
    } else {
      setTint(null, 0);
    }
  }

  function setOutlineVisible(visible) {
    const v = Boolean(visible);
    modelState.outlineVisible = v;
    for (let i = 0; i < backSideOutlineMeshes.length; i++) {
      backSideOutlineMeshes[i].visible = v;
    }
    for (let i = 0; i < switchableOutlineEntries.length; i++) {
      const entry = switchableOutlineEntries[i];
      entry.mesh.geometry = v
        ? assets.geomsOutlined[entry.partKey]
        : assets.geomsBody[entry.partKey];
    }
  }

  function getBounds() {
    group.updateMatrixWorld(true);
    return new THREE.Box3().setFromObject(group);
  }

  function dispose() {
    if (furMatCloned) currentFurMat.dispose();
    if (eyeMatCloned) currentEyeMat.dispose();
    if (outlineMatCloned) currentOutlineMat.dispose();
  }

  setPose('idle', 0, 1);

  return {
    group,
    parts,
    sockets,
    anchors,
    setPose,
    setEyeGlow,
    setExpression,
    setTint,
    setOpacity,
    setEnrage,
    setOutlineVisible,
    getBounds,
    dispose,
  };
}