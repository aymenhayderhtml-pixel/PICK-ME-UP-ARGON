import * as THREE from 'three';
import {
  WEAPON_KINDS,
  SHIELD_KINDS,
  GRADE_UI_COLORS,
  GRADE_STYLES,
  _geomCache,
  _matCache,
  _texCache,
  getToonGradient,
  getGradeTexture,
  getOutlineMaterial,
  getBaseToonMaterial,
  getBaseRuneMaterial,
  prepPart
} from './weapons/weaponMaterialsAndParts.js';
import {
  getWeaponGeometryData,
  getShieldGeometryData,
  buildArrowGeometry
} from './weapons/weaponGeometries.js';

export { WEAPON_KINDS, SHIELD_KINDS, GRADE_UI_COLORS };
export { buildArrowGeometry, getWeaponGeometryData, getShieldGeometryData } from './weapons/weaponGeometries.js';

function createEquipmentInstance(kind, isShield, opts = {}) {
  const grade = GRADE_STYLES[opts.grade] ? opts.grade : 'E';
  const st = GRADE_STYLES[grade];
  const seed = Number.isFinite(opts.seed) ? opts.seed : 1337;

  const data = isShield
    ? getShieldGeometryData(kind, grade)
    : getWeaponGeometryData(kind, grade);

  const group = new THREE.Group();
  group.name = `${isShield ? 'shield' : 'weapon'}_${kind}_${grade}`;

  const anchors = {};
  for (const [k, pos] of Object.entries(data.anchors)) {
    const obj = new THREE.Object3D();
    obj.name = `anchor_${k}`;
    obj.position.set(pos[0], pos[1], pos[2]);
    group.add(obj);
    anchors[k] = obj;
  }

  let bodyMat = getBaseToonMaterial(grade);
  let bodyMatCloned = false;
  let outlineMat = getOutlineMaterial();
  let outlineMatCloned = false;
  const runeMat = getBaseRuneMaterial(grade).clone();

  let limbTopGroup = null;
  let limbBotGroup = null;
  let limbTopMesh = null;
  let limbBotMesh = null;
  let limbTopOutline = null;
  let limbBotOutline = null;
  let specialMesh = null;
  let stringTop = null;
  let stringBot = null;
  let arrowMesh = null;

  const ensureUniqueBodyMat = () => {
    if (!bodyMatCloned) {
      bodyMat = bodyMat.clone();
      bodyMesh.material = bodyMat;
      if (specialMesh) specialMesh.material = bodyMat;
      if (arrowMesh) arrowMesh.material = bodyMat;
      if (limbTopMesh) limbTopMesh.material = bodyMat;
      if (limbBotMesh) limbBotMesh.material = bodyMat;
      bodyMatCloned = true;
    }
  };

  let bodyGeom = data.bodyGeom;
  let bodyGeomCloned = false;
  let basePosArray = null;
  let baseColArray = null;

  let bodyMesh = null;
  let outlineMesh = null;

  if (kind === 'bow' && data.specialGeom?.riserGeom) {
    bodyMesh = new THREE.Mesh(data.specialGeom.riserGeom, bodyMat);
    group.add(bodyMesh);

    outlineMesh = new THREE.Mesh(data.specialGeom.riserGeom, outlineMat);
    outlineMesh.scale.set(1.04, 1.015, 1.04);
    group.add(outlineMesh);

    limbTopGroup = new THREE.Group();
    limbTopGroup.position.set(0, 0.10, 0.016);
    limbTopMesh = new THREE.Mesh(data.specialGeom.limbTopGeom, bodyMat);
    limbTopOutline = new THREE.Mesh(data.specialGeom.limbTopGeom, outlineMat);
    limbTopOutline.scale.set(1.04, 1.015, 1.04);
    limbTopGroup.add(limbTopMesh, limbTopOutline);

    limbBotGroup = new THREE.Group();
    limbBotGroup.position.set(0, -0.10, 0.016);
    limbBotMesh = new THREE.Mesh(data.specialGeom.limbBotGeom, bodyMat);
    limbBotOutline = new THREE.Mesh(data.specialGeom.limbBotGeom, outlineMat);
    limbBotOutline.scale.set(1.04, 1.015, 1.04);
    limbBotGroup.add(limbBotMesh, limbBotOutline);

    group.add(limbTopGroup, limbBotGroup);
  } else {
    bodyMesh = new THREE.Mesh(bodyGeom, bodyMat);
    group.add(bodyMesh);

    outlineMesh = new THREE.Mesh(bodyGeom, outlineMat);
    outlineMesh.scale.set(1.04, 1.015, 1.04);
    group.add(outlineMesh);
  }

  const runeMesh = new THREE.Mesh(data.runeGeom, runeMat);
  runeMesh.visible = false;
  group.add(runeMesh);

  let orbMat = null;
  if (kind === 'staff' && data.specialGeom) {
    orbMat = new THREE.MeshToonMaterial({
      color: 0xff5511,
      emissive: 0xff3b11,
      emissiveIntensity: 1.5,
    });
    specialMesh = new THREE.Mesh(data.specialGeom, orbMat);
    specialMesh.name = 'staff_orb';
    specialMesh.position.set(0, -0.91, 0.03);
    group.add(specialMesh);
  } else if (kind === 'mace' && data.specialGeom) {
    specialMesh = new THREE.Mesh(data.specialGeom, bodyMat);
    specialMesh.position.set(0, -0.64, 0);
    group.add(specialMesh);
  } else if (kind === 'bow') {
    const strGeomKey = 'bow_str_unit';
    if (!_geomCache.has(strGeomKey)) {
      const sg = new THREE.CylinderGeometry(0.003, 0.003, 1.0, 4, 1);
      sg.translate(0, 0.5, 0);
      sg.rotateX(Math.PI * 0.5);
      _geomCache.set(strGeomKey, prepPart(sg, 0xeae6df, false, 0));
    }
    const strGeom = _geomCache.get(strGeomKey);
    let stringMat = bodyMat;
    if (grade === 'S' || grade === 'S+') {
      stringMat = new THREE.MeshToonMaterial({
        color: grade === 'S+' ? 0xfff0aa : 0x7dd3fc,
        emissive: grade === 'S+' ? 0xeab308 : 0x0284c7,
        emissiveIntensity: 1.2
      });
    }
    stringTop = new THREE.Mesh(strGeom, stringMat);
    stringBot = new THREE.Mesh(strGeom, stringMat);
    group.add(stringTop, stringBot);

    arrowMesh = new THREE.Mesh(buildArrowGeometry(grade), bodyMat);
    arrowMesh.visible = false;
    group.add(arrowMesh);
  }

  let currentEnhance = opts.enhance || 0;
  let currentWear = opts.wear || 0;
  let currentGlow = 0;
  let currentDraw = 0;
  let currentEmpowered = false;
  let currentTintHex = null;
  let currentTintAmt = 0;
  let time = (seed % 100) * 0.1;

  const updateEmissive = () => {
    const enhFactor = (currentEnhance / 5) * 0.55;
    const empFactor = currentEmpowered ? 0.65 : 0;
    const totalGlow = st.glow * 0.25 + currentGlow * 0.35 + enhFactor * 0.35 + empFactor;

    if (totalGlow > 0.02 || currentTintAmt > 0 || currentWear > 0.01) {
      ensureUniqueBodyMat();
    }

    if (bodyMatCloned) {
      const wearBright = 1.0 - currentWear * 0.42;
      const baseC = new THREE.Color().setScalar(wearBright);
      if (currentTintHex !== null && currentTintAmt > 0) {
        baseC.lerp(new THREE.Color(currentTintHex), currentTintAmt);
      }
      bodyMat.color.copy(baseC);

      const emCol = new THREE.Color(st.rune);
      if (grade === 'S+') {
        emCol.setHSL((time * 0.18) % 1.0, 0.85, 0.65);
      }
      if (currentTintHex !== null && currentTintAmt > 0) {
        emCol.lerp(new THREE.Color(currentTintHex), currentTintAmt);
      }
      bodyMat.emissive.copy(emCol);
      bodyMat.emissiveIntensity = totalGlow * (0.85 + 0.15 * Math.sin(time * 4.0));
    }

    if (currentEnhance > 0 || st.glow >= 0.8 || currentWear > 0.8) {
      runeMesh.visible = true;
      if (currentWear > 0.8 && currentEnhance === 0 && st.glow < 0.8) {
        runeMat.color.setHex(0x1a110d);
        runeMat.opacity = Math.min(1, (currentWear - 0.75) * 3.5);
      } else {
        if (grade === 'S+') {
          runeMat.color.setHSL(((time * 0.22) + 0.15) % 1.0, 0.9, 0.65);
        } else {
          runeMat.color.setHex(st.rune);
        }
        const pulse = 0.72 + 0.28 * Math.sin(time * 5.0);
        const lvl = Math.max(currentEnhance / 5, st.glow * 0.7);
        runeMat.opacity = Math.min(1, (0.25 + lvl * 0.75) * pulse);
      }
    } else {
      runeMesh.visible = false;
    }
  };

  const updateBowString = (d = 0, arrowVisible = undefined, vibTime = -1) => {
    if (kind !== 'bow') return;
    currentDraw = Math.max(0, Math.min(1, d));

    // 1. Flex limbs
    if (limbTopGroup && limbBotGroup) {
      limbTopGroup.rotation.x = -0.16 * currentDraw;
      limbBotGroup.rotation.x = 0.16 * currentDraw;
    }

    // 2. Dynamic tip endpoints
    const tipTop = new THREE.Vector3(0, 0.595 - 0.045 * currentDraw, -0.128 - 0.110 * currentDraw);
    const tipBot = new THREE.Vector3(0, -0.595 + 0.045 * currentDraw, -0.128 - 0.110 * currentDraw);

    // 3. Nock position Z
    let nockZ;
    if (vibTime >= 0 && vibTime <= 0.30) {
      nockZ = -0.13 + 0.065 * Math.exp(-12 * vibTime) * Math.cos(45 * vibTime);
    } else {
      nockZ = -0.13 - currentDraw * 0.38;
    }
    const nockPos = new THREE.Vector3(0, 0, nockZ);

    // 4. Update string orientations in local group space
    const _vStrDir = new THREE.Vector3();
    const _vUnitZ = new THREE.Vector3(0, 0, 1);

    _vStrDir.subVectors(nockPos, tipTop);
    const lenTop = _vStrDir.length();
    _vStrDir.normalize();
    stringTop.position.copy(tipTop);
    stringTop.quaternion.setFromUnitVectors(_vUnitZ, _vStrDir);
    stringTop.scale.set(1, 1, Math.max(0.001, lenTop));

    _vStrDir.subVectors(nockPos, tipBot);
    const lenBot = _vStrDir.length();
    _vStrDir.normalize();
    stringBot.position.copy(tipBot);
    stringBot.quaternion.setFromUnitVectors(_vUnitZ, _vStrDir);
    stringBot.scale.set(1, 1, Math.max(0.001, lenBot));

    // 5. Arrow visibility and position
    const isArrowVis = arrowVisible !== undefined ? Boolean(arrowVisible) : (currentDraw > 0.01);
    arrowMesh.visible = isArrowVis;
    if (isArrowVis) {
      arrowMesh.position.set(0.015, 0.02, nockZ);
      arrowMesh.rotation.set(0, 0, 0);
    }
  };

  if (kind === 'bow') updateBowString(0);

  const api = {
    group,
    anchors,
    setOpacity(a) {
      const alpha = Math.max(0, Math.min(1, a));
      ensureUniqueBodyMat();
      if (!outlineMatCloned) {
        outlineMat = outlineMat.clone();
        outlineMesh.material = outlineMat;
        outlineMatCloned = true;
      }
      const isTrans = alpha < 0.999;
      bodyMat.transparent = isTrans;
      bodyMat.opacity = alpha;
      outlineMat.transparent = isTrans;
      outlineMat.opacity = alpha;
      outlineMesh.visible = alpha > 0.02;
      runeMat.opacity = Math.min(runeMat.opacity, alpha);
    },
    setTint(hex, amount = 0) {
      currentTintHex = hex;
      currentTintAmt = hex === null ? 0 : Math.max(0, Math.min(1, amount));
      updateEmissive();
    },
    setWear(w) {
      const effW = Math.max(0, Math.min(1, w));
      currentWear = effW;
      if (effW > 0.01 && !bodyGeomCloned) {
        bodyGeom = data.bodyGeom.clone();
        basePosArray = new Float32Array(bodyGeom.attributes.position.array);
        baseColArray = new Float32Array(bodyGeom.attributes.color.array);
        bodyMesh.geometry = bodyGeom;
        outlineMesh.geometry = bodyGeom;
        bodyGeomCloned = true;
      }
      if (bodyGeomCloned) {
        const pos = bodyGeom.attributes.position;
        const col = bodyGeom.attributes.color;
        const tags = bodyGeom.attributes.aWearTag;
        const rustR = 0.58, rustG = 0.28, rustB = 0.14;

        for (let i = 0; i < pos.count; i++) {
          const bx = basePosArray[i * 3];
          const by = basePosArray[i * 3 + 1];
          const bz = basePosArray[i * 3 + 2];
          const tag = tags.getX(i);

          const h = Math.sin(bx * 91.7 + by * 47.3 + bz * 61.1 + seed);
          if (tag > 0.5 && h > 0.35) {
            const chip = effW * 0.015 * (h - 0.35);
            pos.setXYZ(
              i,
              bx + (h * 0.3) * chip,
              by + Math.cos(by * 33.1) * chip * 0.4,
              bz - Math.sign(bz || 1) * chip
            );
          } else {
            pos.setXYZ(i, bx, by, bz);
          }

          const patch = Math.max(0, Math.sin(by * 19.3 + bz * 23.7 + seed)) * effW * 0.72;
          const cr = baseColArray[i * 3];
          const cg = baseColArray[i * 3 + 1];
          const cb = baseColArray[i * 3 + 2];
          col.setXYZ(
            i,
            cr * (1 - patch) + rustR * patch,
            cg * (1 - patch) + rustG * patch,
            cb * (1 - patch) + rustB * patch
          );
        }
        pos.needsUpdate = true;
        col.needsUpdate = true;
      }
      updateEmissive();
    },
    setEnhance(n) {
      currentEnhance = Math.max(0, Math.min(5, n || 0));
      updateEmissive();
    },
    setDraw(drawAmount = 0, arrowVisible = undefined, vibTime = -1) {
      updateBowString(drawAmount, arrowVisible, vibTime);
    },
    getArrowWorldTransform(targetPos = new THREE.Vector3(), targetQuat = new THREE.Quaternion()) {
      if (arrowMesh) {
        arrowMesh.getWorldPosition(targetPos);
        arrowMesh.getWorldQuaternion(targetQuat);
      } else {
        group.getWorldPosition(targetPos);
        group.getWorldQuaternion(targetQuat);
      }
      return { position: targetPos, quaternion: targetQuat };
    },
    setEmpowered(flag) {
      currentEmpowered = Boolean(flag);
      if (specialMesh) {
        const s = currentEmpowered ? 1.18 : 1.0;
        specialMesh.scale.setScalar(s);
      }
      updateEmissive();
    },
    setOrbGlow(colorHex = 0xff5511, intensity = 1.0) {
      if (orbMat) {
        orbMat.color.setHex(colorHex);
        orbMat.emissive.setHex(colorHex);
        orbMat.emissiveIntensity = Math.max(0.1, intensity * 1.5);
      }
    },
    update(dt = 0.016) {
      time += dt;
      if (kind === 'staff' && specialMesh) {
        const bob = Math.sin(time * (currentEmpowered ? 6.0 : 2.5)) * 0.015;
        specialMesh.position.y = -0.91 + bob;
        specialMesh.position.z = 0.03;
        specialMesh.rotation.y = time * (currentEmpowered ? 3.2 : 1.0);
      } else if (kind === 'mace' && specialMesh && currentEmpowered) {
        const s = 1.12 + 0.08 * Math.sin(time * 8.0);
        specialMesh.scale.setScalar(s);
      }
      if (grade === 'S+' || grade === 'S' || currentEnhance > 0 || currentGlow > 0 || currentEmpowered) {
        updateEmissive();
      }
    },
    getBounds() {
      return new THREE.Box3().setFromObject(group);
    },
    dispose() {
      if (bodyGeomCloned) bodyGeom.dispose();
      if (bodyMatCloned) bodyMat.dispose();
      if (outlineMatCloned) outlineMat.dispose();
      if (orbMat) orbMat.dispose();
      runeMat.dispose();
    }
  };

  if (currentEnhance > 0) api.setEnhance(currentEnhance);
  if (grade === 'E' && currentWear < 0.25) {
    api.setWear(Math.max(currentWear, 0.28));
  } else if (currentWear > 0) {
    api.setWear(currentWear);
  }
  updateEmissive();

  return api;
}

export function createWeaponModel(kind = 'sword', opts = {}) {
  const validKind = WEAPON_KINDS.includes(kind) ? kind : 'sword';
  return createEquipmentInstance(validKind, false, opts);
}

export function createShieldModel(kind = 'woodenRound', opts = {}) {
  const validKind = SHIELD_KINDS.includes(kind) ? kind : 'woodenRound';
  return createEquipmentInstance(validKind, true, opts);
}

export function createPickupModel(kind = 'sword', opts = {}) {
  const grade = GRADE_STYLES[opts.grade] ? opts.grade : 'E';
  const uiColor = GRADE_UI_COLORS[grade] || 0x9a9a9a;
  const isShield = SHIELD_KINDS.includes(kind);
  const itemModel = isShield
    ? createShieldModel(kind, opts)
    : createWeaponModel(kind, opts);

  const group = new THREE.Group();
  group.name = `pickup_${kind}_${grade}`;

  const holder = new THREE.Group();
  if (isShield) {
    itemModel.group.rotation.z = Math.PI * 0.5;
    itemModel.group.position.set(0, 0.02, 0);
  } else {
    itemModel.group.rotation.z = Math.PI * 0.5;
    itemModel.group.rotation.y = 0.25;
    itemModel.group.position.set(-0.18, 0.055, 0);
  }
  holder.add(itemModel.group);
  group.add(holder);

  const ringKey = 'pickup_ring_geom';
  if (!_geomCache.has(ringKey)) {
    const rg = new THREE.RingGeometry(0.26, 0.34, 24);
    rg.rotateX(-Math.PI * 0.5);
    _geomCache.set(ringKey, rg);
  }
  const ringMat = new THREE.MeshBasicMaterial({
    color: uiColor,
    transparent: true,
    opacity: 0.75,
    side: THREE.DoubleSide
  });
  const ring = new THREE.Mesh(_geomCache.get(ringKey), ringMat);
  ring.position.y = 0.008;
  group.add(ring);

  let highlighted = false;
  let t = 0;

  return {
    group,
    ring,
    setHighlight(flag) {
      highlighted = Boolean(flag);
      ring.scale.setScalar(highlighted ? 1.22 : 1.0);
      ringMat.opacity = highlighted ? 1.0 : 0.75;
      itemModel.setGlow(highlighted ? 1.0 : 0.0);
    },
    update(dt = 0.016) {
      t += dt;
      ring.rotation.y = t * 1.1;
      holder.position.y = Math.sin(t * 2.6) * 0.025;
      ringMat.opacity = (highlighted ? 0.88 : 0.60) + 0.12 * Math.sin(t * 4.0);
      itemModel.update(dt);
    },
    dispose() {
      itemModel.dispose();
      ringMat.dispose();
    }
  };
}
