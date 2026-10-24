import * as THREE from 'three';
import {
  ISELLE_POSES,
  ISELLE_EXPRESSIONS,
  POSE_INFO,
  drawIselleFace,
  drawIsellePortrait,
  getFacePlateTexture,
  disposeIselleCaches,
} from './isellePortrait.js';
import {
  mergeGeos,
  xform,
  makeToonGrad,
  createCurvedFacePlateGeo,
  createHeadGeometry,
  createHairCrownAndFringeGeo,
  createTwinTailGeo,
  createCohesiveWingGeos,
  makeArmSingleGeo,
  makeLegSingleGeo,
} from './iselleGeometry.js';

export {
  ISELLE_POSES,
  ISELLE_EXPRESSIONS,
  POSE_INFO,
  drawIselleFace,
  drawIsellePortrait,
  disposeIselleCaches,
};

const _scratchTintColor = new THREE.Color();

export function createIselleModel(options = {}) {
  const root = new THREE.Group();
  root.name = 'IselleRoot';
  if (options.scale) {
    root.scale.setScalar(options.scale);
  }

  const toonGrad = makeToonGrad();
  const disposables = [toonGrad];
  const matList = [];

  const regMat = (m) => {
    matList.push(m);
    disposables.push(m);
    return m;
  };
  const regGeo = (g) => {
    disposables.push(g);
    return g;
  };

  const skinMat = regMat(new THREE.MeshToonMaterial({
    color: 0xf6e3e6,
    emissive: 0x261520,
    emissiveIntensity: 0.18,
    gradientMap: toonGrad,
  }));

  const hairMat = regMat(new THREE.MeshToonMaterial({
    color: 0xdcd4eb,
    emissive: 0x221838,
    emissiveIntensity: 0.15,
    gradientMap: toonGrad,
  }));

  const dressMat = regMat(new THREE.MeshToonMaterial({
    color: 0x1c152b,
    emissive: 0x0e081a,
    emissiveIntensity: 0.15,
    gradientMap: toonGrad,
  }));

  const darkTrimMat = regMat(new THREE.MeshToonMaterial({
    color: 0x150d22,
    emissive: 0x120824,
    emissiveIntensity: 0.2,
    gradientMap: toonGrad,
  }));

  const whiteLaceMat = regMat(new THREE.MeshToonMaterial({
    color: 0xf7f4ff,
    emissive: 0x4a3d66,
    emissiveIntensity: 0.25,
    gradientMap: toonGrad,
  }));

  const wingMembraneMat = regMat(new THREE.MeshToonMaterial({
    color: 0x7a4fd0,
    emissive: 0x4c2896,
    emissiveIntensity: 0.45,
    gradientMap: toonGrad,
    side: THREE.DoubleSide,
  }));

  const wingEdgeMat = regMat(new THREE.MeshBasicMaterial({
    color: 0xd9c8ff,
  }));

  const outlineMat = regMat(new THREE.MeshBasicMaterial({
    color: 0x140b21,
    side: THREE.BackSide,
  }));

  const facePlateMat = regMat(new THREE.MeshBasicMaterial({
    map: getFacePlateTexture('neutral'),
    transparent: true,
    alphaTest: 0.03,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  }));

  const auraMat = regMat(new THREE.MeshBasicMaterial({
    color: 0xcdb8ff,
    transparent: true,
    opacity: 0.06,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.FrontSide,
  }));

  const bodyPivot = new THREE.Group();
  bodyPivot.position.set(0, 0.56, 0);
  root.add(bodyPivot);

  const torsoPivot = new THREE.Group();
  bodyPivot.add(torsoPivot);

  const bodiceGeo = xform(new THREE.CylinderGeometry(0.085, 0.115, 0.24, 8), 0, 0.13, 0);
  const skirtGeo = xform(new THREE.ConeGeometry(0.27, 0.34, 12, 1, false), 0, -0.08, 0);
  const chokerBand = xform(new THREE.CylinderGeometry(0.053, 0.055, 0.028, 8), 0, 0.275, 0);
  const dressMesh = new THREE.Mesh(regGeo(mergeGeos([bodiceGeo, skirtGeo, chokerBand])), dressMat);
  torsoPivot.add(dressMesh);

  const neckRing = xform(new THREE.TorusGeometry(0.092, 0.024, 5, 10), 0, 0.245, 0, Math.PI * 0.5, 0, 0);
  const leftShoulderRuffle = xform(new THREE.TorusGeometry(0.058, 0.022, 5, 7), -0.105, 0.225, 0, 0.3, 0, 0.55);
  const rightShoulderRuffle = xform(new THREE.TorusGeometry(0.058, 0.022, 5, 7), 0.105, 0.225, 0, 0.3, 0, -0.55);
  const hemRing = xform(new THREE.TorusGeometry(0.262, 0.028, 5, 12), 0, -0.24, 0, Math.PI * 0.5, 0, 0);
  const silverEmblem = xform(new THREE.OctahedronGeometry(0.024, 0), 0, 0.272, 0.068, 0, 0, Math.PI * 0.25, 0.9, 1.3, 0.5);
  const rufflesMesh = new THREE.Mesh(
    regGeo(mergeGeos([neckRing, leftShoulderRuffle, rightShoulderRuffle, hemRing, silverEmblem])),
    whiteLaceMat
  );
  torsoPivot.add(rufflesMesh);

  const neckGeo = xform(new THREE.CylinderGeometry(0.048, 0.056, 0.10, 7), 0, 0.28, 0);
  const neckMesh = new THREE.Mesh(regGeo(neckGeo), skinMat);
  torsoPivot.add(neckMesh);

  const headPivot = new THREE.Group();
  headPivot.position.set(0, 0.31, 0);
  torsoPivot.add(headPivot);

  const headGeo = regGeo(createHeadGeometry());
  const headMesh = new THREE.Mesh(headGeo, skinMat);
  headMesh.position.set(0, 0.15, 0);
  headPivot.add(headMesh);

  const headOutlineGeo = regGeo(xform(createHeadGeometry(), 0, 0.15, 0, 0, 0, 0, 1.065, 1.065, 1.065));
  const headOutlineMesh = new THREE.Mesh(headOutlineGeo, outlineMat);
  headPivot.add(headOutlineMesh);

  const headWidth = 0.36;
  const headHeight = 0.34;
  const plateW = headWidth * 0.90;
  const plateH = headHeight * 0.80;
  const plateRadius = 0.162 + 0.005;
  const facePlateGeo = regGeo(createCurvedFacePlateGeo(plateW, plateH, plateRadius, 6, 6));
  const facePlateMesh = new THREE.Mesh(facePlateGeo, facePlateMat);
  facePlateMesh.position.set(0, 0.145, 0.005);
  facePlateMesh.renderOrder = 2;
  headPivot.add(facePlateMesh);

  const hairCrownMesh = new THREE.Mesh(regGeo(createHairCrownAndFringeGeo()), hairMat);
  hairCrownMesh.position.set(0, 0.15, 0);
  headPivot.add(hairCrownMesh);

  const ribbonParts = [];
  for (const side of [-1, 1]) {
    ribbonParts.push(
      xform(new THREE.ConeGeometry(0.038, 0.085, 4), side * 0.13, 0.31, 0.01, 0.2, 0, side * 1.15),
      xform(new THREE.ConeGeometry(0.038, 0.085, 4), side * 0.18, 0.29, -0.01, -0.2, 0, -side * 1.25)
    );
  }
  const headRibbonsMesh = new THREE.Mesh(regGeo(mergeGeos(ribbonParts)), darkTrimMat);
  headPivot.add(headRibbonsMesh);

  const tailPivotL = new THREE.Group();
  tailPivotL.position.set(-0.16, 0.26, -0.03);
  headPivot.add(tailPivotL);
  tailPivotL.add(new THREE.Mesh(regGeo(createTwinTailGeo(-1)), hairMat));

  const tailPivotR = new THREE.Group();
  tailPivotR.position.set(0.16, 0.26, -0.03);
  headPivot.add(tailPivotR);
  tailPivotR.add(new THREE.Mesh(regGeo(createTwinTailGeo(1)), hairMat));

  const wingPivotL = new THREE.Group();
  wingPivotL.position.set(-0.06, 0.19, -0.08);
  torsoPivot.add(wingPivotL);

  const wingPivotR = new THREE.Group();
  wingPivotR.position.set(0.06, 0.19, -0.08);
  torsoPivot.add(wingPivotR);

  const wGeoL = createCohesiveWingGeos(-1);
  wingPivotL.add(
    new THREE.Mesh(regGeo(wGeoL.membraneGeo), wingMembraneMat),
    new THREE.Mesh(regGeo(wGeoL.edgeGeo), wingEdgeMat)
  );

  const wGeoR = createCohesiveWingGeos(1);
  wingPivotR.add(
    new THREE.Mesh(regGeo(wGeoR.membraneGeo), wingMembraneMat),
    new THREE.Mesh(regGeo(wGeoR.edgeGeo), wingEdgeMat)
  );

  const armPivotL = new THREE.Group();
  armPivotL.position.set(-0.115, 0.22, 0);
  torsoPivot.add(armPivotL);
  armPivotL.add(new THREE.Mesh(regGeo(makeArmSingleGeo()), skinMat));

  const armPivotR = new THREE.Group();
  armPivotR.position.set(0.115, 0.22, 0);
  torsoPivot.add(armPivotR);
  armPivotR.add(new THREE.Mesh(regGeo(makeArmSingleGeo()), skinMat));

  const legPivotL = new THREE.Group();
  legPivotL.position.set(-0.068, -0.06, 0);
  bodyPivot.add(legPivotL);
  legPivotL.add(new THREE.Mesh(regGeo(makeLegSingleGeo()), darkTrimMat));

  const legPivotR = new THREE.Group();
  legPivotR.position.set(0.068, -0.06, 0);
  bodyPivot.add(legPivotR);
  legPivotR.add(new THREE.Mesh(regGeo(makeLegSingleGeo()), darkTrimMat));

  const auraGeo = regGeo(xform(new THREE.SphereGeometry(0.46, 10, 8), 0, 0.12, 0, 0, 0, 0, 0.85, 1.32, 0.75));
  const auraMesh = new THREE.Mesh(auraGeo, auraMat);
  auraMesh.renderOrder = 3;
  bodyPivot.add(auraMesh);

  const anchorHead = new THREE.Object3D();
  anchorHead.position.set(0, 0.36, 0);
  headPivot.add(anchorHead);

  const anchorChest = new THREE.Object3D();
  anchorChest.position.set(0, 0.15, 0.10);
  torsoPivot.add(anchorChest);

  const anchorHandL = new THREE.Object3D();
  anchorHandL.position.set(0, -0.27, 0);
  armPivotL.add(anchorHandL);

  const anchorHandR = new THREE.Object3D();
  anchorHandR.position.set(0, -0.27, 0);
  armPivotR.add(anchorHandR);

  const anchorFeet = new THREE.Object3D();
  anchorFeet.position.set(0, 0, 0);
  root.add(anchorFeet);

  const anchors = {
    root,
    head: anchorHead,
    mouth: anchorHead,
    chest: anchorChest,
    leftHand: anchorHandL,
    rightHand: anchorHandR,
    handL: anchorHandL,
    handR: anchorHandR,
    wingTipL: wingPivotL,
    wingTipR: wingPivotR,
    wings: wingPivotL,
    aura: auraMesh,
    feet: anchorFeet,
  };

  let currentPose = options.pose || 'idle';
  let currentExpr = options.expression || 'neutral';
  let glowLevel = options.glow ?? 1;
  let currentOpacity = 1.0;
  let animTime = 0;
  let autoBlinkTimer = 0;

  function applyAuraState(pulseFactor = 1.0) {
    if (glowLevel <= 0) {
      auraMesh.visible = false;
      auraMat.opacity = 0;
      return;
    }
    auraMesh.visible = currentOpacity > 0.001;
    const maxCap = glowLevel >= 2 ? 0.12 : 0.06;
    const baseOp = maxCap * (0.75 + 0.25 * pulseFactor);
    auraMat.opacity = Math.min(maxCap, baseOp) * currentOpacity;
  }

  function setPose(pose, t) {
    if (ISELLE_POSES.includes(pose) && currentPose !== pose) {
      currentPose = pose;
      animTime = 0;
    }
    if (typeof t === 'number') {
      animTime = t;
    }
  }

  function setExpression(expr) {
    if (ISELLE_EXPRESSIONS.includes(expr)) {
      currentExpr = expr;
      facePlateMat.map = getFacePlateTexture(expr);
      facePlateMat.needsUpdate = true;
    }
  }

  function setGlow(level) {
    glowLevel = Math.max(0, Math.min(2, Number(level) || 0));
    wingMembraneMat.emissiveIntensity = glowLevel === 0 ? 0.25 : glowLevel === 1 ? 0.48 : 0.78;
    wingEdgeMat.color.setHex(glowLevel >= 2 ? 0xefe6ff : 0xd9c8ff);
    applyAuraState(1.0);
  }

  function setOpacity(opacity) {
    currentOpacity = Math.max(0, Math.min(1, Number(opacity) ?? 1));
    const isTranslucent = currentOpacity < 0.999;

    for (const m of matList) {
      if (m === auraMat) continue;
      if (m === facePlateMat) {
        m.transparent = true;
        m.depthWrite = false;
        m.opacity = currentOpacity;
        m.needsUpdate = true;
        continue;
      }
      m.transparent = isTranslucent;
      m.opacity = currentOpacity;
      m.depthWrite = !isTranslucent;
      m.needsUpdate = true;
    }
    facePlateMesh.visible = currentOpacity > 0.001;
    applyAuraState(1.0);
  }

  function setTint(color, amount = 1.0) {
    if (!color || amount <= 0) {
      skinMat.color.setHex(0xf6e3e6);
      hairMat.color.setHex(0xdcd4eb);
      dressMat.color.setHex(0x1c152b);
      whiteLaceMat.color.setHex(0xf7f4ff);
      wingMembraneMat.color.setHex(0x7a4fd0);
      facePlateMat.color.setHex(0xffffff);
      return;
    }
    _scratchTintColor.set(color);
    skinMat.color.setHex(0xf6e3e6).lerp(_scratchTintColor, amount);
    hairMat.color.setHex(0xdcd4eb).lerp(_scratchTintColor, amount);
    dressMat.color.setHex(0x1c152b).lerp(_scratchTintColor, amount);
    whiteLaceMat.color.setHex(0xf7f4ff).lerp(_scratchTintColor, amount);
    wingMembraneMat.color.setHex(0x7a4fd0).lerp(_scratchTintColor, amount);
    facePlateMat.color.setHex(0xffffff).lerp(_scratchTintColor, amount);
  }

  function resetRig() {
    bodyPivot.position.set(0, 0.56, 0);
    bodyPivot.rotation.set(0, 0, 0);
    torsoPivot.rotation.set(0, 0, 0);
    headPivot.rotation.set(0, 0, 0);
    armPivotL.rotation.set(0, 0, 0.28);
    armPivotR.rotation.set(0, 0, -0.28);
    legPivotL.rotation.set(0, 0, 0);
    legPivotR.rotation.set(0, 0, 0);
    tailPivotL.rotation.set(0, 0, 0.12);
    tailPivotR.rotation.set(0, 0, -0.12);
    wingPivotL.rotation.set(0, 0.18, 0.06);
    wingPivotR.rotation.set(0, -0.18, -0.06);
  }

  function update(dt = 0.016) {
    animTime += dt;
    autoBlinkTimer += dt;

    const pulse = 0.5 + 0.5 * Math.sin(animTime * 3.2);
    const auraScale = 1.0 + 0.03 * Math.sin(animTime * 2.6);
    auraMesh.scale.set(auraScale, auraScale, auraScale);
    applyAuraState(pulse);

    if (currentExpr === 'neutral') {
      const blinkCycle = autoBlinkTimer % 4.2;
      const shouldBlink = blinkCycle > 4.02;
      const targetTex = getFacePlateTexture(shouldBlink ? 'blink' : 'neutral');
      if (facePlateMat.map !== targetTex) {
        facePlateMat.map = targetTex;
        facePlateMat.needsUpdate = true;
      }
    }

    resetRig();
    const t = animTime;

    switch (currentPose) {
      case 'idle': {
        const w = t * (Math.PI * 2 / 2.4);
        bodyPivot.position.y = 0.56 + Math.sin(w) * 0.018;
        torsoPivot.rotation.x = Math.sin(w) * 0.03;
        headPivot.rotation.z = Math.sin(w * 0.5) * 0.04;
        armPivotL.rotation.z = 0.28 + Math.sin(w) * 0.05;
        armPivotR.rotation.z = -0.28 - Math.sin(w) * 0.05;
        tailPivotL.rotation.z = 0.12 + Math.sin(w - 0.5) * 0.06;
        tailPivotR.rotation.z = -0.12 - Math.sin(w - 0.5) * 0.06;
        const wf = Math.sin(w * 2) * 0.14;
        wingPivotL.rotation.y = 0.20 + wf;
        wingPivotR.rotation.y = -0.20 - wf;
        break;
      }
      case 'float': {
        const w = t * (Math.PI * 2 / 2.0);
        bodyPivot.position.y = 0.68 + Math.sin(w) * 0.055;
        torsoPivot.rotation.x = 0.06 + Math.sin(w) * 0.04;
        headPivot.rotation.x = -0.05;
        armPivotL.rotation.z = 0.46 + Math.sin(w) * 0.08;
        armPivotR.rotation.z = -0.46 - Math.sin(w) * 0.08;
        legPivotL.rotation.x = 0.18 + Math.sin(w) * 0.06;
        legPivotR.rotation.x = 0.28 - Math.sin(w) * 0.06;
        tailPivotL.rotation.z = 0.20 + Math.sin(w - 0.4) * 0.10;
        tailPivotR.rotation.z = -0.20 - Math.sin(w - 0.4) * 0.10;
        const flutter = Math.sin(t * 18.0) * 0.34;
        wingPivotL.rotation.y = 0.22 + flutter;
        wingPivotR.rotation.y = -0.22 - flutter;
        wingPivotL.rotation.z = 0.10 + flutter * 0.30;
        wingPivotR.rotation.z = -0.10 - flutter * 0.30;
        break;
      }
      case 'walk': {
        const w = t * (Math.PI * 2 / 1.0);
        bodyPivot.position.y = 0.56 + Math.abs(Math.sin(w)) * 0.032;
        torsoPivot.rotation.x = 0.07;
        torsoPivot.rotation.y = Math.sin(w) * 0.08;
        legPivotL.rotation.x = Math.sin(w) * 0.48;
        legPivotR.rotation.x = -Math.sin(w) * 0.48;
        armPivotL.rotation.x = -Math.sin(w) * 0.36;
        armPivotR.rotation.x = Math.sin(w) * 0.36;
        tailPivotL.rotation.x = 0.12 + Math.abs(Math.cos(w)) * 0.12;
        tailPivotR.rotation.x = 0.12 + Math.abs(Math.cos(w)) * 0.12;
        const wf = Math.sin(w * 2) * 0.18;
        wingPivotL.rotation.y = 0.22 + wf;
        wingPivotR.rotation.y = -0.22 - wf;
        break;
      }
      case 'fly': {
        const w = t * (Math.PI * 2 / 0.8);
        bodyPivot.position.y = 0.74 + Math.sin(w) * 0.065;
        torsoPivot.rotation.x = 0.28;
        headPivot.rotation.x = -0.22;
        armPivotL.rotation.x = 0.25;
        armPivotR.rotation.x = 0.25;
        armPivotL.rotation.z = 0.52;
        armPivotR.rotation.z = -0.52;
        legPivotL.rotation.x = 0.35 + Math.sin(w) * 0.08;
        legPivotR.rotation.x = 0.42 - Math.sin(w) * 0.08;
        tailPivotL.rotation.x = 0.35 + Math.sin(w) * 0.12;
        tailPivotR.rotation.x = 0.35 + Math.sin(w) * 0.12;
        const flap = Math.sin(w) * 0.68;
        wingPivotL.rotation.y = 0.18 + flap;
        wingPivotR.rotation.y = -0.18 - flap;
        wingPivotL.rotation.z = 0.16 + flap * 0.40;
        wingPivotR.rotation.z = -0.16 - flap * 0.40;
        break;
      }
      case 'cast': {
        const p = Math.min(1, t / POSE_INFO.cast.duration);
        const lift = Math.sin(p * Math.PI);
        bodyPivot.position.y = 0.56 + lift * 0.16;
        torsoPivot.rotation.x = -lift * 0.14;
        headPivot.rotation.x = -lift * 0.12;
        armPivotL.rotation.x = -lift * 1.35;
        armPivotR.rotation.x = -lift * 1.35;
        armPivotL.rotation.z = 0.35 + lift * 0.35;
        armPivotR.rotation.z = -0.35 - lift * 0.35;
        const flare = Math.sin(t * 20) * 0.25 + lift * 0.45;
        wingPivotL.rotation.y = 0.1 + flare;
        wingPivotR.rotation.y = -0.1 - flare;
        wingPivotL.rotation.z = 0.22 * lift;
        wingPivotR.rotation.z = -0.22 * lift;
        break;
      }
      case 'hit': {
        const p = Math.min(1, t / POSE_INFO.hit.duration);
        const recoil = Math.sin(p * Math.PI);
        bodyPivot.position.z = -recoil * 0.08;
        torsoPivot.rotation.x = -recoil * 0.28;
        headPivot.rotation.x = -recoil * 0.25;
        armPivotL.rotation.z = 0.65 * recoil + 0.28;
        armPivotR.rotation.z = -0.65 * recoil - 0.28;
        wingPivotL.rotation.y = 0.55 * recoil;
        wingPivotR.rotation.y = -0.55 * recoil;
        break;
      }
      case 'ko': {
        const p = Math.min(1, t / POSE_INFO.ko.duration);
        const e = 1 - Math.pow(1 - p, 3);
        bodyPivot.position.y = 0.56 - e * 0.42;
        bodyPivot.rotation.x = -e * 1.42;
        armPivotL.rotation.z = 0.28 + e * 0.55;
        armPivotR.rotation.z = -0.28 - e * 0.55;
        wingPivotL.rotation.y = 0.65 * e;
        wingPivotR.rotation.y = -0.65 * e;
        break;
      }
      case 'victory': {
        const w = t * (Math.PI * 2 / 1.6);
        bodyPivot.position.y = 0.62 + Math.abs(Math.sin(w)) * 0.06;
        headPivot.rotation.z = Math.sin(w) * 0.08;
        armPivotR.rotation.x = -2.45;
        armPivotR.rotation.z = -0.22 + Math.sin(w) * 0.12;
        armPivotL.rotation.z = 0.45;
        legPivotL.rotation.x = 0.15;
        legPivotR.rotation.x = -0.10;
        const wf = Math.sin(w * 2) * 0.32;
        wingPivotL.rotation.y = 0.15 + wf;
        wingPivotR.rotation.y = -0.15 - wf;
        break;
      }
    }
  }

  function getBounds() {
    const box = new THREE.Box3().setFromObject(root);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);
    return { box, size, center, min: box.min, max: box.max };
  }

  function dispose() {
    for (const item of disposables) {
      if (item && typeof item.dispose === 'function') {
        item.dispose();
      }
    }
  }

  setExpression(currentExpr);
  setGlow(glowLevel);
  update(0);

  return {
    root,
    group: root,
    parts: {
      root,
      body: bodyPivot,
      torso: torsoPivot,
      head: headPivot,
      tailL: tailPivotL,
      tailR: tailPivotR,
      armL: armPivotL,
      armR: armPivotR,
      legL: legPivotL,
      legR: legPivotR,
      wingL: wingPivotL,
      wingR: wingPivotR,
      dress: dressMesh,
      facePlate: facePlateMesh,
    },
    anchors,
    setPose,
    setExpression,
    setGlow,
    setOpacity,
    setTint,
    update,
    getBounds,
    dispose,
  };
}