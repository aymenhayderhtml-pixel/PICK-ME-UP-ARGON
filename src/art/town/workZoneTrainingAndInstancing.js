import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { getSignLayout } from './layout.js';
import { addBox, addCyl, buildSignPost } from './workZonePrimitives.js';

export function buildTrainingGrounds(bCtx) {
  const {
    q, rng, layout, getGroundY, P, rootGroup, dummy,
    stoneGeos, plasterWoodGeos, metalGoldGeos, mossDirtGeos, signGlyphGeos,
    stakeMatrices, activeDisposables, colliders, doors, anchors, animRefs, registerAnchor,
    matPlasterWood, matTrainWood, matTrainStraw, matTrainStone, matTrainFlame, matTrainRope
  } = bCtx;

  const tgCfg = layout.training_grounds || {
    center: { x: -24.0, z: 20.0 },
    footprint: { type: 'box', width: 16.0, depth: 16.0, height: 2.5 },
    door: { id: 'door_training_grounds', position: { x: -18.0, y: 0.0, z: 18.0 }, outward: { x: 1.0, y: 0.0, z: 0.0 } }
  };
  const tgX = tgCfg.center.x;
  const tgZ = tgCfg.center.z;
  const tgY = getGroundY(tgX, tgZ);
  const tgW = (tgCfg.footprint && tgCfg.footprint.width) || 16.0;
  const tgD = (tgCfg.footprint && tgCfg.footprint.depth) || 16.0;

  addBox(mossDirtGeos, tgW - 0.6, 0.1, tgD - 0.6, tgX, tgY + 0.05, tgZ, P.dirt || 0xa89f8a, 0, 0, 0, 0.78, 1.02, rng);
  for (let p = 0; p < 14; p++) {
    const px = tgX + (rng() - 0.5) * (tgW - 3.2);
    const pz = tgZ + (rng() - 0.5) * (tgD - 3.2);
    const pw = 1.6 + rng() * 2.4;
    const pd = 1.2 + rng() * 2.2;
    addBox(mossDirtGeos, pw, 0.11, pd, px, tgY + 0.055, pz, p % 2 === 0 ? 0x918772 : (P.dirt || 0xa89f8a), rng() * Math.PI, 0, 0, 0.72, 1.0, rng);
  }

  const westX = tgX - tgW * 0.5 + 0.35;
  const northZ = tgZ - tgD * 0.5 + 0.35;
  addBox(stoneGeos, 0.52, 0.95, tgD - 0.4, westX, tgY + 0.475, tgZ, P.wallShade || 0x8e9da3, 0, 0, 0, 0.72, 1.04, rng);
  addBox(stoneGeos, 0.64, 0.18, tgD - 0.2, westX, tgY + 1.02, tgZ, P.wallLit || 0xc4cbcf, 0, 0, 0, 0.82, 1.08, rng);
  addBox(mossDirtGeos, 0.75, 0.85, tgD - 1.2, westX + 0.55, tgY + 0.45, tgZ, P.mossDark || 0x436836, 0, 0, 0, 0.72, 1.04, rng);
  addBox(stoneGeos, tgW - 0.4, 0.95, 0.52, tgX, tgY + 0.475, northZ, P.wallShade || 0x8e9da3, 0, 0, 0, 0.72, 1.04, rng);
  addBox(stoneGeos, tgW - 0.2, 0.18, 0.64, tgX, tgY + 1.02, northZ, P.wallLit || 0xc4cbcf, 0, 0, 0, 0.82, 1.08, rng);
  addBox(mossDirtGeos, tgW - 1.2, 0.85, 0.75, tgX, tgY + 0.45, northZ + 0.55, P.moss || 0x5f8a4a, 0, 0, 0, 0.74, 1.05, rng);

  for (let i = 0; i <= 4; i++) {
    const offset = -tgW * 0.5 + 0.35 + i * (tgW - 0.7) * 0.25;
    addBox(stoneGeos, 0.78, 1.35, 0.78, westX, tgY + 0.675, tgZ + offset, P.wallLit || 0xc4cbcf, 0, 0, 0, 0.76, 1.06, rng);
    addBox(stoneGeos, 0.78, 1.35, 0.78, tgX + offset, tgY + 0.675, northZ, P.wallLit || 0xc4cbcf, 0, 0, 0, 0.76, 1.06, rng);
  }
  colliders.push({ type: 'box', x: westX, z: tgZ, w: 0.9, d: tgD, rotY: 0 });
  colliders.push({ type: 'box', x: tgX, z: northZ, w: tgW, d: 0.9, rotY: 0 });

  const barBaseX = tgX + 2.5;
  const barBaseZ = tgZ + tgD * 0.5 - 1.2;
  addBox(plasterWoodGeos, 6.2, 0.24, 0.28, barBaseX, tgY + 0.55, barBaseZ, P.wood || 0x6a4a2e, 0, 0, 0, 0.72, 1.0, rng);
  for (let s = 0; s < 14; s++) {
    const sx = barBaseX - 2.85 + s * 0.44;
    const tiltX = (s % 2 === 0 ? 1 : -1) * 0.52;
    dummy.position.set(sx, tgY + 0.68, barBaseZ);
    dummy.rotation.set(tiltX, (rng() - 0.5) * 0.12, 0);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    stakeMatrices.push(dummy.matrix.clone());
  }
  colliders.push({ type: 'box', x: barBaseX, z: barBaseZ, w: 6.4, d: 1.2, rotY: 0 });

  const bCoords = [
    { x: tgX - 5.8, z: tgZ + 5.8 },
    { x: tgX - 4.9, z: tgZ + 6.1 },
    { x: tgX - 5.5, z: tgZ + 4.9 }
  ];
  for (const bc of bCoords) {
    addCyl(plasterWoodGeos, 0.38, 0.35, 0.88, 10, bc.x, tgY + 0.44, bc.z, P.wood || 0x6a4a2e, 0, 0, 0, 0.72, 1.02, rng);
    addCyl(metalGoldGeos, 0.39, 0.39, 0.08, 10, bc.x, tgY + 0.65, bc.z, P.timber || 0x2b2623, 0, 0, 0, 0.75, 1.0, rng);
    colliders.push({ type: 'circle', x: bc.x, z: bc.z, r: 0.45 });
  }
  addBox(plasterWoodGeos, 2.2, 1.3, 0.35, tgX + 5.6, tgY + 0.65, tgZ - 5.2, P.wood || 0x6a4a2e, -0.35, 0, 0, 0.72, 1.02, rng);
  const swordCoords = [
    { x: tgX - 1.2, z: tgZ + 1.1, rx: 0.22, rz: -0.15 },
    { x: tgX + 1.8, z: tgZ - 0.6, rx: -0.18, rz: 0.24 },
    { x: tgX - 3.4, z: tgZ + 2.8, rx: 0.14, rz: 0.19 }
  ];
  for (const sw of swordCoords) {
    addBox(metalGoldGeos, 0.08, 0.95, 0.03, sw.x, tgY + 0.42, sw.z, P.wallLit || 0xc4cbcf, 0.4, sw.rx, sw.rz, 0.82, 1.1, rng);
    addBox(plasterWoodGeos, 0.28, 0.06, 0.06, sw.x, tgY + 0.78, sw.z, P.wood || 0x6a4a2e, 0.4, sw.rx, sw.rz, 0.78, 1.04, rng);
  }

  const dummyGeoParts = [];
  const dSegs = q === 'low' ? 6 : 10;
  addCyl(dummyGeoParts, 0.45, 0.52, 0.16, dSegs, 0, 0.08, 0, P.wood || 0x6a4a2e, 0, 0, 0, 0.7, 1.0, rng);
  addCyl(dummyGeoParts, 0.11, 0.13, 1.85, dSegs, 0, 0.95, 0, P.wood || 0x6a4a2e, 0, 0, 0, 0.72, 1.02, rng);
  addBox(dummyGeoParts, 1.25, 0.13, 0.13, 0, 1.32, 0, P.wood || 0x6a4a2e, 0, 0, 0, 0.76, 1.04, rng);
  addBox(dummyGeoParts, 0.13, 0.13, 0.85, 0, 1.18, 0, P.wood || 0x6a4a2e, 0, 0, 0, 0.76, 1.04, rng);
  addCyl(dummyGeoParts, 0.31, 0.28, 0.78, dSegs, 0, 1.18, 0, P.gold || 0xd8b45a, 0, 0, 0, 0.78, 1.06, rng);
  addCyl(dummyGeoParts, 0.33, 0.33, 0.08, dSegs, 0, 1.38, 0, P.dirt || 0xa89f8a, 0, 0, 0, 0.7, 0.95, rng);
  addCyl(dummyGeoParts, 0.33, 0.33, 0.08, dSegs, 0, 0.98, 0, P.dirt || 0xa89f8a, 0, 0, 0, 0.7, 0.95, rng);
  addCyl(dummyGeoParts, 0.2, 0.18, 0.34, dSegs, 0, 1.72, 0, P.dirt || 0xa89f8a, 0, 0, 0, 0.82, 1.08, rng);

  const sharedDummyGeo = mergeGeometries(dummyGeoParts, false);
  for (const p of dummyGeoParts) p.dispose();
  activeDisposables.push(sharedDummyGeo);

  const layoutDummies = (tgCfg.dummyPositions && tgCfg.dummyPositions.length >= 3)
    ? tgCfg.dummyPositions.map(d => ({ x: d.dummy.x, z: d.dummy.z }))
    : [
        { x: -26.4, z: 18.0 },
        { x: -24.0, z: 18.0 },
        { x: -21.6, z: 18.0 }
      ];

  const allDummyCoords = [
    ...layoutDummies,
    { x: -26.4, z: 21.0 },
    { x: -24.0, z: 21.0 },
    { x: -21.6, z: 21.0 },
    { x: -26.4, z: 24.0 },
    { x: -24.0, z: 24.0 },
    { x: -21.6, z: 24.0 },
    { x: -28.8, z: 19.5 },
    { x: -28.8, z: 22.5 },
    { x: -28.8, z: 25.2 }
  ];

  for (let i = 0; i < 12; i++) {
    const dc = allDummyCoords[i];
    const dy = getGroundY(dc.x, dc.z);
    const dMesh = new THREE.Mesh(sharedDummyGeo, matPlasterWood);
    dMesh.name = `dummy_${i}`;
    dMesh.position.set(dc.x, dy, dc.z);
    dMesh.rotation.y = (i >= 9) ? Math.PI * 0.5 : 0;
    rootGroup.add(dMesh);
    animRefs.dummies.push(dMesh);

    const hitPos = new THREE.Vector3(dc.x, dy + 1.25, dc.z);
    anchors[`dummy_${i}`] = hitPos;
    anchors[`dummy_${i}_obj`] = dMesh;
    if (i < 3) {
      anchors[`dummy_${i + 1}_layout`] = hitPos.clone();
    }
    colliders.push({ type: 'circle', x: dc.x, z: dc.z, r: 0.48 });
  }

  const tgZones = tgCfg.trainingZones || {};
  const archCfg = tgZones.archery_targets;
  const fireCfg = tgZones.fire_targets;
  const ringCfg = tgZones.sparring_ring;

  if (archCfg && archCfg.slots) {
    const postGeo = new THREE.CylinderGeometry(0.09, 0.12, 1.55, 8);
    postGeo.translate(0, 0.775, 0);
    const bullOuter = new THREE.CylinderGeometry(0.62, 0.62, 0.08, 20);
    bullOuter.rotateX(Math.PI / 2);
    const bullMid = new THREE.CylinderGeometry(0.40, 0.40, 0.10, 20);
    bullMid.rotateX(Math.PI / 2);
    const bullInner = new THREE.CylinderGeometry(0.18, 0.18, 0.12, 16);
    bullInner.rotateX(Math.PI / 2);
    activeDisposables.push(postGeo, bullOuter, bullMid, bullInner);

    archCfg.slots.forEach((slot, i) => {
      const sx = slot.target.x;
      const sz = slot.target.z;
      const sy = getGroundY(sx, sz);

      const post = new THREE.Mesh(postGeo, matTrainWood);
      post.name = `archery_post_${i}`;
      post.position.set(sx, sy, sz);
      rootGroup.add(post);

      const outer = new THREE.Mesh(bullOuter, matTrainStraw);
      outer.name = `archery_target_outer_${i}`;
      outer.position.set(sx, sy + slot.target.y, sz + 0.10);
      rootGroup.add(outer);

      const mid = new THREE.Mesh(bullMid, matTrainWood);
      mid.name = `archery_target_mid_${i}`;
      mid.position.set(sx, sy + slot.target.y, sz + 0.14);
      rootGroup.add(mid);

      const inner = new THREE.Mesh(bullInner, matTrainFlame);
      inner.name = `archery_target_inner_${i}`;
      inner.position.set(sx, sy + slot.target.y, sz + 0.18);
      rootGroup.add(inner);

      anchors[slot.anchorId] = new THREE.Vector3(sx, sy + slot.target.y, sz);
      anchors[`${slot.anchorId}_obj`] = inner;
      colliders.push({ type: 'circle', x: sx, z: sz, r: 0.42 });
    });
  }

  if (fireCfg && fireCfg.slots) {
    const bowlGeo = new THREE.CylinderGeometry(0.44, 0.28, 0.48, 12);
    bowlGeo.translate(0, 0.24, 0);
    const flameGeo = new THREE.ConeGeometry(0.3, 0.9, 10);
    flameGeo.translate(0, 0.45, 0);
    activeDisposables.push(bowlGeo, flameGeo);

    fireCfg.slots.forEach((slot, i) => {
      const sx = slot.target.x;
      const sz = slot.target.z;
      const sy = getGroundY(sx, sz);

      const bowl = new THREE.Mesh(bowlGeo, matTrainStone);
      bowl.name = `fire_bowl_${i}`;
      bowl.position.set(sx, sy, sz);
      rootGroup.add(bowl);

      const flame = new THREE.Mesh(flameGeo, matTrainFlame);
      flame.name = `fire_flame_${i}`;
      flame.position.set(sx, sy + 0.44, sz);
      rootGroup.add(flame);
      animRefs.flames.push(flame);

      anchors[slot.anchorId] = new THREE.Vector3(sx, sy + slot.target.y, sz);
      anchors[`${slot.anchorId}_obj`] = flame;
      colliders.push({ type: 'circle', x: sx, z: sz, r: 0.5 });
    });
  }

  if (ringCfg) {
    const cx = ringCfg.center.x;
    const cz = ringCfg.center.z;
    const cy = getGroundY(cx, cz);
    const r = ringCfg.radius || 1.9;

    const ropeGeo = new THREE.TorusGeometry(r, 0.045, 6, 40);
    ropeGeo.rotateX(Math.PI / 2);
    const ringPostGeo = new THREE.CylinderGeometry(0.08, 0.1, 0.72, 8);
    ringPostGeo.translate(0, 0.36, 0);
    activeDisposables.push(ropeGeo, ringPostGeo);

    const rope = new THREE.Mesh(ropeGeo, matTrainRope);
    rope.name = 'sparring_ring_rope';
    rope.position.set(cx, cy + 0.1, cz);
    rootGroup.add(rope);

    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
      const px = cx + Math.cos(a) * r;
      const pz = cz + Math.sin(a) * r;
      const post = new THREE.Mesh(ringPostGeo, matTrainWood);
      post.name = `sparring_post_${i}`;
      post.position.set(px, getGroundY(px, pz), pz);
      rootGroup.add(post);
    }

    anchors['sparring_ring_center'] = new THREE.Vector3(cx, cy, cz);
    anchors['sparring_spot_a'] = new THREE.Vector3(
      ringCfg.spotA.x, getGroundY(ringCfg.spotA.x, ringCfg.spotA.z), ringCfg.spotA.z
    );
    anchors['sparring_spot_b'] = new THREE.Vector3(
      ringCfg.spotB.x, getGroundY(ringCfg.spotB.x, ringCfg.spotB.z), ringCfg.spotB.z
    );
  }

  const tgDoorPos = new THREE.Vector3(
    (tgCfg.door && tgCfg.door.position.x) || -18.0,
    tgY,
    (tgCfg.door && tgCfg.door.position.z) || 18.0
  );
  const tgDoorOut = new THREE.Vector3(
    (tgCfg.door && tgCfg.door.outward.x) || 1.0,
    0,
    (tgCfg.door && tgCfg.door.outward.z) || 0.0
  ).normalize();
  doors.push({ id: (tgCfg.door && tgCfg.door.id) || 'door_training_grounds', position: tgDoorPos, outward: tgDoorOut });
  registerAnchor('door_training_grounds', tgDoorPos);

  const tgSign = getSignLayout(layout, 'training_grounds');
  if (tgSign) {
    registerAnchor('sign_training_grounds', new THREE.Vector3(tgSign.x, tgSign.boardY, tgSign.z));
    buildSignPost(stoneGeos, signGlyphGeos, tgSign, rng, P);
  }

  return sharedDummyGeo;
}

export function buildWorkInstancedMeshes(bCtx) {
  const {
    q, rng, P, rootGroup, activeDisposables,
    columnMatrices, stakeMatrices, crateMatrices,
    matStone, matPlasterWood
  } = bCtx;

  let addedMeshes = 0;
  let addedTris = 0;

  if (columnMatrices.length > 0) {
    const colParts = [];
    const colSegs = q === 'low' ? 8 : q === 'medium' ? 12 : 16;
    addBox(colParts, 1.35, 0.4, 1.35, 0, 0.2, 0, P.wallShade || 0x8e9da3, 0, 0, 0, 0.72, 1.0, rng);
    addCyl(colParts, 0.58, 0.64, 0.3, colSegs, 0, 0.55, 0, P.wallLit || 0xc4cbcf, 0, 0, 0, 0.78, 1.04, rng);
    addCyl(colParts, 0.46, 0.54, 7.2, colSegs, 0, 4.3, 0, P.wallLit || 0xc4cbcf, 0, 0, 0, 0.76, 1.08, rng);
    addCyl(colParts, 0.64, 0.46, 0.4, colSegs, 0, 8.1, 0, P.wallLit || 0xc4cbcf, 0, 0, 0, 0.84, 1.08, rng);
    addBox(colParts, 1.32, 0.34, 1.32, 0, 8.47, 0, P.wallShade || 0x8e9da3, 0, 0, 0, 0.84, 1.08, rng);

    const colProto = mergeGeometries(colParts, false);
    for (const p of colParts) p.dispose();
    activeDisposables.push(colProto);

    const colInst = new THREE.InstancedMesh(colProto, matStone, columnMatrices.length);
    colInst.name = 'landmarksWork_columns';
    for (let i = 0; i < columnMatrices.length; i++) {
      colInst.setMatrixAt(i, columnMatrices[i]);
    }
    colInst.instanceMatrix.needsUpdate = true;
    rootGroup.add(colInst);
    addedMeshes++;
    addedTris += (colProto.attributes.position.count / 3) * columnMatrices.length;
  }

  if (stakeMatrices.length > 0) {
    const stakeParts = [];
    addCyl(stakeParts, 0.02, 0.11, 1.55, 6, 0, 0.1, 0, P.wood || 0x6a4a2e, 0, 0, 0, 0.72, 1.06, rng);
    const stakeProto = mergeGeometries(stakeParts, false);
    for (const p of stakeParts) p.dispose();
    activeDisposables.push(stakeProto);

    const stakeInst = new THREE.InstancedMesh(stakeProto, matPlasterWood, stakeMatrices.length);
    stakeInst.name = 'landmarksWork_stakes';
    for (let i = 0; i < stakeMatrices.length; i++) {
      stakeInst.setMatrixAt(i, stakeMatrices[i]);
    }
    stakeInst.instanceMatrix.needsUpdate = true;
    rootGroup.add(stakeInst);
    addedMeshes++;
    addedTris += (stakeProto.attributes.position.count / 3) * stakeMatrices.length;
  }

  if (crateMatrices.length > 0) {
    const crateParts = [];
    addBox(crateParts, 1.0, 1.0, 1.0, 0, 0, 0, P.wood || 0x6a4a2e, 0, 0, 0, 0.74, 1.04, rng);
    addBox(crateParts, 1.04, 0.12, 1.04, 0, 0.42, 0, P.timber || 0x2b2623, 0, 0, 0, 0.7, 0.98, rng);
    addBox(crateParts, 1.04, 0.12, 1.04, 0, -0.42, 0, P.timber || 0x2b2623, 0, 0, 0, 0.7, 0.98, rng);
    const crateProto = mergeGeometries(crateParts, false);
    for (const p of crateParts) p.dispose();
    activeDisposables.push(crateProto);

    const crateInst = new THREE.InstancedMesh(crateProto, matPlasterWood, crateMatrices.length);
    crateInst.name = 'landmarksWork_crates';
    for (let i = 0; i < crateMatrices.length; i++) {
      crateInst.setMatrixAt(i, crateMatrices[i]);
    }
    crateInst.instanceMatrix.needsUpdate = true;
    rootGroup.add(crateInst);
    addedMeshes++;
    addedTris += (crateProto.attributes.position.count / 3) * crateMatrices.length;
  }

  return { addedMeshes, addedTris };
}