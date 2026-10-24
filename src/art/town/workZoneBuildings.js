import * as THREE from 'three';
import { getSignLayout } from './layout.js';
import { addBox, addCyl, buildSignPost } from './workZonePrimitives.js';

export function buildSynthesisChamber(bCtx) {
  const {
    q, rng, layout, getGroundY, P, dummy,
    stoneGeos, plasterWoodGeos, metalGoldGeos, mossDirtGeos, crimsonGeos, signGlyphGeos, aoGeos,
    columnMatrices, colliders, doors, anchors, registerAnchor
  } = bCtx;

  const scCfg = layout.synthesis_chamber || {
    center: { x: 0.0, z: -32.0 },
    footprint: { type: 'circle', radius: 8.2, height: 9.0 },
    door: { id: 'door_synthesis_chamber', position: { x: 0.0, y: 0.0, z: -23.8 }, outward: { x: 0.0, y: 0.0, z: 1.0 } }
  };
  const scX = scCfg.center.x;
  const scZ = scCfg.center.z;
  const scY = getGroundY(scX, scZ);
  const scRad = (scCfg.footprint && scCfg.footprint.radius) || 8.2;
  const scH = (scCfg.footprint && scCfg.footprint.height) || 9.0;
  const scPodH = 0.8;
  const scFloorY = scY + scPodH;

  const scSegs = q === 'low' ? 20 : q === 'medium' ? 28 : 36;
  addCyl(stoneGeos, scRad + 0.9, scRad + 1.15, 0.42, scSegs, scX, scY + 0.21, scZ, P.groundDark || 0x68767c, 0, 0, 0, 0.7, 1.0, rng);
  addCyl(stoneGeos, scRad + 0.4, scRad + 0.6, 0.42, scSegs, scX, scY + 0.6, scZ, P.wallLit || 0xc4cbcf, 0, 0, 0, 0.78, 1.05, rng);

  const wallH = scH * 0.62;
  addCyl(stoneGeos, scRad - 0.55, scRad - 0.45, wallH, scSegs, scX, scFloorY + wallH * 0.5, scZ, P.wallShade || 0x8e9da3, 0, 0, 0, 0.74, 1.04, rng);

  const scColCount = 10;
  for (let i = 0; i < scColCount; i++) {
    const a = (i / scColCount) * Math.PI * 2 + Math.PI / scColCount;
    const cx = scX + Math.cos(a) * (scRad + 0.08);
    const cz = scZ + Math.sin(a) * (scRad + 0.08);
    dummy.position.set(cx, scFloorY, cz);
    dummy.rotation.set(0, -a + Math.PI / 2, 0);
    dummy.scale.set(0.82, (wallH - 0.1) / 8.72, 0.82);
    dummy.updateMatrix();
    columnMatrices.push(dummy.matrix.clone());

    const aMid = a + Math.PI / scColCount;
    if (Math.sin(aMid) < 0.88) {
      const px = scX + Math.cos(aMid) * (scRad - 0.42);
      const pz = scZ + Math.sin(aMid) * (scRad - 0.42);
      addBox(plasterWoodGeos, 1.65, wallH * 0.65, 0.24, px, scFloorY + wallH * 0.48, pz, P.plaster || 0xdfe3df, -aMid + Math.PI / 2, 0, 0, 0.82, 1.06, rng);
      addBox(stoneGeos, 1.95, 0.32, 0.34, px, scFloorY + wallH * 0.82, pz, P.wallLit || 0xc4cbcf, -aMid + Math.PI / 2, 0, 0, 0.84, 1.08, rng);
    }
  }

  const corniceY = scFloorY + wallH;
  addCyl(stoneGeos, scRad + 0.55, scRad + 0.15, 0.52, scSegs, scX, corniceY + 0.26, scZ, P.wallLit || 0xc4cbcf, 0, 0, 0, 0.82, 1.08, rng);
  addCyl(stoneGeos, scRad + 0.35, scRad + 0.55, 0.38, scSegs, scX, corniceY + 0.71, scZ, P.wallShade || 0x8e9da3, 0, 0, 0, 0.8, 1.06, rng);

  const domeBaseY = corniceY + 0.9;
  const domeR = scRad - 0.15;
  const domeRings = q === 'low' ? 5 : q === 'medium' ? 7 : 9;
  for (let r = 0; r < domeRings; r++) {
    const t0 = r / domeRings;
    const t1 = (r + 1) / domeRings;
    const phi0 = t0 * (Math.PI * 0.46);
    const phi1 = t1 * (Math.PI * 0.46);
    const rBot = Math.cos(phi0) * domeR;
    const rTop = Math.cos(phi1) * domeR;
    const y0 = domeBaseY + Math.sin(phi0) * (domeR * 0.68);
    const y1 = domeBaseY + Math.sin(phi1) * (domeR * 0.68);
    const hSeg = Math.max(0.15, y1 - y0);
    const col = r % 2 === 0 ? (P.slate || 0x4a5560) : (P.groundDark || 0x68767c);
    addCyl(stoneGeos, rTop, rBot, hSeg + 0.04, scSegs, scX, (y0 + y1) * 0.5, scZ, col, 0, 0, 0, 0.76, 1.06, rng);
  }

  const ribSteps = q === 'low' ? 4 : 6;
  for (let i = 0; i < scColCount; i++) {
    const a = (i / scColCount) * Math.PI * 2 + Math.PI / scColCount;
    for (let s = 0; s < ribSteps; s++) {
      const tm = (s + 0.5) / ribSteps;
      const phi = tm * (Math.PI * 0.45);
      const rr = Math.cos(phi) * (domeR + 0.12);
      const ry = domeBaseY + Math.sin(phi) * (domeR * 0.68);
      const rx = scX + Math.cos(a) * rr;
      const rz = scZ + Math.sin(a) * rr;
      addBox(stoneGeos, 0.36, 0.34, (domeR * 0.85) / ribSteps, rx, ry, rz, P.wallLit || 0xc4cbcf, -a + Math.PI / 2, phi, 0, 0.84, 1.1, rng);
    }
  }

  const lanternY = domeBaseY + domeR * 0.68 - 0.15;
  addCyl(stoneGeos, 1.55, 1.75, 0.45, 10, scX, lanternY + 0.22, scZ, P.wallLit || 0xc4cbcf, 0, 0, 0, 0.82, 1.08, rng);
  addCyl(stoneGeos, 1.25, 1.35, 1.45, 10, scX, lanternY + 1.15, scZ, P.wallShade || 0x8e9da3, 0, 0, 0, 0.8, 1.06, rng);
  addCyl(crimsonGeos, 1.05, 1.05, 0.95, 8, scX, lanternY + 1.15, scZ, P.crimsonGlow || 0xff3a4a, 0, 0, 0, 0.95, 1.05, rng);
  addCyl(stoneGeos, 0.12, 1.65, 1.15, 10, scX, lanternY + 2.4, scZ, P.slate || 0x4a5560, 0, 0, 0, 0.82, 1.08, rng);
  addCyl(metalGoldGeos, 0.04, 0.22, 0.85, 8, scX, lanternY + 3.3, scZ, P.gold || 0xd8b45a, 0, 0, 0, 0.9, 1.15, rng);

  const doorZ = scZ + scRad - 0.15;
  addBox(stoneGeos, 3.6, 4.2, 0.95, scX, scFloorY + 2.1, doorZ, P.wallLit || 0xc4cbcf, 0, 0, 0, 0.78, 1.08, rng);
  addBox(stoneGeos, 4.1, 0.55, 1.18, scX, scFloorY + 4.35, doorZ + 0.05, P.wallShade || 0x8e9da3, 0, 0, 0, 0.84, 1.08, rng);

  addBox(stoneGeos, 3.1, 1.8, 0.98, scX, scFloorY + 0.9, doorZ + 0.02, 0x262022, 0, 0, 0, 0.45, 0.75, rng);
  addBox(stoneGeos, 2.8, 0.08, 1.6, scX, scFloorY + 0.04, doorZ + 0.65, 0x221b1d, 0, 0, 0, 0.4, 0.65, rng);

  for (const side of [-1, 1]) {
    const lx = scX + side * 0.74;
    addBox(plasterWoodGeos, 1.36, 3.55, 0.28, lx, scFloorY + 1.78, doorZ + 0.39, P.plaster || 0xdfe3df, 0, 0, 0, 0.82, 1.06, rng);
    addBox(metalGoldGeos, 1.4, 0.14, 0.34, lx, scFloorY + 3.45, doorZ + 0.37, P.gold || 0xd8b45a, 0, 0, 0, 0.88, 1.12, rng);
    addBox(metalGoldGeos, 1.4, 0.14, 0.34, lx, scFloorY + 1.85, doorZ + 0.37, P.gold || 0xd8b45a, 0, 0, 0, 0.88, 1.12, rng);
    addBox(metalGoldGeos, 1.4, 0.14, 0.34, lx, scFloorY + 0.25, doorZ + 0.37, P.gold || 0xd8b45a, 0, 0, 0, 0.88, 1.12, rng);
    addBox(metalGoldGeos, 0.82, 0.95, 0.32, lx, scFloorY + 2.65, doorZ + 0.37, P.gold || 0xd8b45a, 0, 0, 0, 0.88, 1.12, rng);
    addBox(metalGoldGeos, 0.82, 0.95, 0.32, lx, scFloorY + 1.05, doorZ + 0.37, P.gold || 0xd8b45a, 0, 0, 0, 0.88, 1.12, rng);
    addCyl(metalGoldGeos, 0.16, 0.16, 0.08, 8, scX + side * 0.24, scFloorY + 1.65, doorZ + 0.54, P.gold || 0xd8b45a, 0, Math.PI / 2, 0, 0.9, 1.15, rng);
  }

  addBox(crimsonGeos, 0.14, 3.62, 0.38, scX, scFloorY + 1.81, doorZ + 0.38, P.crimsonGlow || 0xff3a4a, 0, 0, 0, 0.95, 1.05, rng);
  addBox(crimsonGeos, 2.85, 0.1, 0.42, scX, scFloorY + 0.06, doorZ + 0.38, P.crimsonGlow || 0xff3a4a, 0, 0, 0, 0.95, 1.05, rng);
  addBox(crimsonGeos, 2.75, 0.12, 0.38, scX, scFloorY + 3.6, doorZ + 0.38, P.crimsonGlow || 0xff3a4a, 0, 0, 0, 0.95, 1.05, rng);

  for (let s = 0; s < 4; s++) {
    const stepH = scPodH - s * 0.2;
    const sz = doorZ + 0.72 + s * 0.46;
    addBox(stoneGeos, 4.2 + s * 0.25, stepH, 0.48, scX, scY + stepH * 0.5, sz, s % 2 === 0 ? (P.wallLit || 0xc4cbcf) : (P.groundBase || 0xa9b6ba), 0, 0, 0, 0.76, 1.05, rng);
  }

  const terZ = doorZ + 3.6;
  addBox(stoneGeos, 6.4, 0.12, 3.6, scX, scY + 0.06, terZ, P.groundBase || 0xa9b6ba, 0, 0, 0, 0.78, 1.04, rng);
  for (const side of [-1, 1]) {
    addBox(crimsonGeos, 0.1, 0.06, 2.8, scX + side * 0.85, scY + 0.11, terZ - 0.1, P.crimsonGlow || 0xff3a4a, side * 0.48, 0, 0, 0.95, 1.05, rng);
    addBox(crimsonGeos, 0.1, 0.06, 2.4, scX + side * 1.65, scY + 0.11, terZ, P.crimsonGlow || 0xff3a4a, 0, 0, 0, 0.95, 1.05, rng);
  }
  addBox(crimsonGeos, 3.4, 0.06, 0.1, scX, scY + 0.11, terZ + 0.95, P.crimsonGlow || 0xff3a4a, 0, 0, 0, 0.95, 1.05, rng);
  addBox(crimsonGeos, 3.4, 0.06, 0.1, scX, scY + 0.11, terZ - 0.95, P.crimsonGlow || 0xff3a4a, 0, 0, 0, 0.95, 1.05, rng);

  for (let m = 0; m < 8; m++) {
    const ma = (m / 8) * Math.PI * 2 + 0.25;
    const mx = scX + Math.cos(ma) * (scRad + 0.35);
    const mz = scZ + Math.sin(ma) * (scRad + 0.35);
    addBox(mossDirtGeos, 1.35, 0.22, 0.65, mx, corniceY + 0.92, mz, P.moss || 0x5f8a4a, -ma + Math.PI / 2, 0, 0, 0.78, 1.06, rng);
    if (m % 2 === 0) {
      addBox(mossDirtGeos, 0.55, 1.6, 0.2, mx, corniceY + 0.05, mz, P.ivy || 0x436836, -ma + Math.PI / 2, 0.05, 0, 0.72, 1.0, rng);
    }
  }

  colliders.push({ type: 'circle', x: scX, z: scZ, r: scRad + 0.45 });

  const synthDoorPos = new THREE.Vector3(
    (scCfg.door && scCfg.door.position.x) || 0.0,
    scY,
    (scCfg.door && scCfg.door.position.z) || -23.8
  );
  const synthDoorOut = new THREE.Vector3(
    (scCfg.door && scCfg.door.outward.x) || 0.0,
    0,
    (scCfg.door && scCfg.door.outward.z) || 1.0
  ).normalize();
  doors.push({ id: (scCfg.door && scCfg.door.id) || 'door_synthesis_chamber', position: synthDoorPos, outward: synthDoorOut });
  registerAnchor('door_synthesis_chamber', synthDoorPos);
  registerAnchor('synthesisDoor', new THREE.Vector3(scX, scFloorY + 1.6, doorZ + 0.45));
  anchors.door = synthDoorPos.clone();

  const scSign = getSignLayout(layout, 'synthesis_chamber');
  if (scSign) {
    registerAnchor('sign_synthesis_chamber', new THREE.Vector3(scSign.x, scSign.boardY, scSign.z));
    buildSignPost(stoneGeos, signGlyphGeos, scSign, rng, P);
  }

  const scAo = new THREE.CircleGeometry(scRad + 1.5, 24);
  scAo.rotateX(-Math.PI / 2);
  scAo.translate(scX, scY + 0.02, scZ);
  aoGeos.push(scAo);
}

export function buildArmory(bCtx) {
  const {
    rng, layout, getGroundY, P, dummy,
    stoneGeos, plasterWoodGeos, metalGoldGeos, forgeGeos, windowGeos, signGlyphGeos,
    crateMatrices, colliders, doors, lights, animRefs, registerAnchor
  } = bCtx;

  const arCfg = layout.armory || {
    center: { x: -6.0, z: -20.0 },
    footprint: { width: 10.5, height: 4.5, depth: 5.0, mainWidth: 7.0, mainDepth: 5.0, forgeWidth: 3.5, forgeDepth: 3.8 },
    door: { id: 'door_armory', position: { x: -6.0, y: 0.0, z: -17.4 }, outward: { x: 0.0, y: 0.0, z: 1.0 } }
  };
  const arX = arCfg.center.x;
  const arZ = arCfg.center.z;
  const arY = getGroundY(arX, arZ);
  const mainW = (arCfg.footprint && arCfg.footprint.mainWidth) || 7.0;
  const mainD = (arCfg.footprint && arCfg.footprint.mainDepth) || 5.0;
  const mainH = (arCfg.footprint && arCfg.footprint.height) || 4.5;
  const forgeW = (arCfg.footprint && arCfg.footprint.forgeWidth) || 3.5;
  const forgeD = (arCfg.footprint && arCfg.footprint.forgeDepth) || 3.8;

  const hallX = arX - 1.25;
  const shedX = hallX + mainW * 0.5 + forgeW * 0.5 - 0.1;

  addBox(stoneGeos, mainW + 0.4, 0.45, mainD + 0.4, hallX, arY + 0.225, arZ, P.groundDark || 0x68767c, 0, 0, 0, 0.7, 1.0, rng);
  addBox(stoneGeos, mainW, 1.8, mainD, hallX, arY + 1.35, arZ, P.wallShade || 0x8e9da3, 0, 0, 0, 0.74, 1.02, rng);
  addBox(plasterWoodGeos, mainW - 0.1, mainH - 2.1, mainD - 0.1, hallX, arY + 2.25 + (mainH - 2.1) * 0.5, arZ, P.plaster || 0xdfe3df, 0, 0, 0, 0.8, 1.05, rng);

  for (const sx of [-1, 0, 1]) {
    for (const sz of [-1, 1]) {
      addBox(plasterWoodGeos, 0.28, mainH - 0.3, 0.28, hallX + sx * (mainW * 0.48), arY + (mainH - 0.3) * 0.5 + 0.3, arZ + sz * (mainD * 0.48), P.timber || 0x2b2623, 0, 0, 0, 0.65, 0.95, rng);
    }
  }
  addBox(plasterWoodGeos, mainW + 0.18, 0.26, mainD + 0.18, hallX, arY + 2.25, arZ, P.timber || 0x2b2623, 0, 0, 0, 0.68, 0.95, rng);
  addBox(plasterWoodGeos, mainW + 0.22, 0.28, mainD + 0.22, hallX, arY + mainH - 0.15, arZ, P.timber || 0x2b2623, 0, 0, 0, 0.68, 0.95, rng);

  const roofPeakH = 1.65;
  for (const side of [-1, 1]) {
    const slopeLen = Math.hypot(mainD * 0.5 + 0.45, roofPeakH);
    const slopeAng = Math.atan2(roofPeakH, mainD * 0.5 + 0.45);
    addBox(stoneGeos, mainW + 0.6, 0.24, slopeLen, hallX, arY + mainH + roofPeakH * 0.45, arZ + side * (mainD * 0.26), P.slate || 0x4a5560, 0, side * slopeAng, 0, 0.75, 1.06, rng);
  }
  for (let g = 0; g < 4; g++) {
    const gw = (mainD - 0.4) * (1 - g * 0.23);
    const gy = arY + mainH + 0.2 + g * 0.36;
    addBox(plasterWoodGeos, mainW - 0.08, 0.38, gw, hallX, gy, arZ, g % 2 === 0 ? (P.plaster || 0xdfe3df) : (P.timber || 0x2b2623), 0, 0, 0, 0.8, 1.04, rng);
  }
  addBox(stoneGeos, mainW + 0.7, 0.22, 0.32, hallX, arY + mainH + roofPeakH - 0.05, arZ, P.wallLit || 0xc4cbcf, 0, 0, 0, 0.85, 1.1, rng);

  const arDoorX = (arCfg.door && arCfg.door.position.x) || -6.0;
  const arDoorZ = arZ + mainD * 0.5;
  addBox(stoneGeos, 1.85, 2.55, 0.42, arDoorX, arY + 1.275, arDoorZ, P.wallLit || 0xc4cbcf, 0, 0, 0, 0.78, 1.06, rng);
  addBox(plasterWoodGeos, 1.42, 2.22, 0.26, arDoorX, arY + 1.15, arDoorZ + 0.10, P.wood || 0x6a4a2e, 0, 0, 0, 0.72, 1.02, rng);
  for (let b = 0; b < 3; b++) {
    addBox(metalGoldGeos, 1.48, 0.12, 0.32, arDoorX, arY + 0.55 + b * 0.68, arDoorZ + 0.09, P.slate || 0x4a5560, 0, 0, 0, 0.75, 1.05, rng);
  }

  for (const wxOff of [-2.05, 1.85]) {
    const wx = hallX + wxOff;
    const wz = arZ + mainD * 0.5;
    addBox(stoneGeos, 1.25, 1.25, 0.32, wx, arY + 2.45, wz, P.wallLit || 0xc4cbcf, 0, 0, 0, 0.78, 1.06, rng);
    addBox(windowGeos, 0.95, 0.95, 0.18, wx, arY + 2.45, wz + 0.09, P.warmWindow || 0xffc27a, 0, 0, 0, 0.9, 1.05, rng);
    for (const bar of [-0.26, 0, 0.26]) {
      addBox(metalGoldGeos, 0.06, 1.02, 0.26, wx + bar, arY + 2.45, wz + 0.12, P.timber || 0x2b2623, 0, 0, 0, 0.7, 0.95, rng);
    }
    addBox(metalGoldGeos, 1.02, 0.06, 0.26, wx, arY + 2.45, wz + 0.12, P.timber || 0x2b2623, 0, 0, 0, 0.7, 0.95, rng);
  }

  addBox(stoneGeos, forgeW + 0.3, 0.36, forgeD + 0.3, shedX, arY + 0.18, arZ + 0.3, P.groundDark || 0x68767c, 0, 0, 0, 0.7, 1.0, rng);
  for (const pzOff of [-forgeD * 0.42, forgeD * 0.42]) {
    addBox(plasterWoodGeos, 0.26, 2.85, 0.26, shedX + forgeW * 0.42, arY + 1.55, arZ + 0.3 + pzOff, P.timber || 0x2b2623, 0, 0, 0, 0.68, 0.95, rng);
  }
  addBox(stoneGeos, forgeW + 0.55, 0.22, forgeD + 0.65, shedX + 0.1, arY + 3.35, arZ + 0.3, P.slate || 0x4a5560, 0, 0, -0.28, 0.76, 1.06, rng);

  const forgePos = new THREE.Vector3(shedX - 0.35, arY + 1.05, arZ - 0.35);
  addBox(stoneGeos, 1.65, 2.35, 1.55, forgePos.x, arY + 1.35, forgePos.z, P.groundDark || 0x68767c, 0, 0, 0, 0.68, 1.0, rng);
  addBox(stoneGeos, 1.15, 3.6, 1.15, forgePos.x, arY + 4.15, forgePos.z, P.wallShade || 0x8e9da3, 0, 0, 0, 0.75, 1.06, rng);
  addBox(stoneGeos, 1.35, 0.28, 1.35, forgePos.x, arY + 5.95, forgePos.z, P.wallLit || 0xc4cbcf, 0, 0, 0, 0.84, 1.08, rng);
  addBox(forgeGeos, 0.95, 0.65, 0.85, forgePos.x + 0.15, arY + 1.05, forgePos.z + 0.42, P.forgeOrange || 0xff8a3a, 0, 0, 0, 0.9, 1.1, rng);
  addBox(forgeGeos, 0.65, 0.48, 0.55, forgePos.x + 0.18, arY + 1.35, forgePos.z + 0.48, 0xffd27a, 0.2, 0.1, 0, 0.95, 1.1, rng);

  const anvilPos = new THREE.Vector3(shedX + 0.55, arY + 0.95, arZ + 0.95);
  addCyl(plasterWoodGeos, 0.42, 0.46, 0.55, 8, anvilPos.x, arY + 0.62, anvilPos.z, P.wood || 0x6a4a2e, 0, 0, 0, 0.72, 1.0, rng);
  addBox(metalGoldGeos, 0.68, 0.34, 0.36, anvilPos.x, arY + 1.04, anvilPos.z, P.slate || 0x4a5560, 0.25, 0, 0, 0.78, 1.1, rng);
  addBox(metalGoldGeos, 0.42, 0.22, 0.24, anvilPos.x + 0.38, arY + 1.08, anvilPos.z + 0.08, P.slate || 0x4a5560, 0.25, 0, 0.15, 0.8, 1.1, rng);
  addCyl(plasterWoodGeos, 0.38, 0.34, 0.82, 10, shedX + 1.15, arY + 0.75, arZ - 0.15, P.wood || 0x6a4a2e, 0, 0, 0, 0.72, 1.02, rng);
  addCyl(metalGoldGeos, 0.39, 0.39, 0.08, 10, shedX + 1.15, arY + 0.95, arZ - 0.15, P.timber || 0x2b2623, 0, 0, 0, 0.75, 1.0, rng);

  const rackX = hallX - 2.15;
  const rackZ = arZ + mainD * 0.5 + 0.65;
  addBox(plasterWoodGeos, 1.85, 1.35, 0.14, rackX, arY + 0.7, rackZ, P.wood || 0x6a4a2e, 0, -0.15, 0, 0.74, 1.02, rng);
  for (let w = 0; w < 4; w++) {
    const wx = rackX - 0.6 + w * 0.4;
    const bladeH = w % 2 === 0 ? 1.35 : 1.85;
    addBox(metalGoldGeos, 0.09, bladeH, 0.04, wx, arY + 0.45 + bladeH * 0.5, rackZ + 0.08, P.wallLit || 0xc4cbcf, 0, -0.15, 0, 0.85, 1.12, rng);
    addBox(metalGoldGeos, 0.28, 0.06, 0.08, wx, arY + 0.65, rackZ + 0.09, P.gold || 0xd8b45a, 0, -0.15, 0, 0.85, 1.1, rng);
  }
  addCyl(metalGoldGeos, 0.48, 0.48, 0.08, 8, rackX + 1.15, arY + 0.55, rackZ + 0.12, P.slate || 0x4a5560, 0.2, Math.PI * 0.42, 0, 0.8, 1.08, rng);
  addCyl(metalGoldGeos, 0.16, 0.16, 0.12, 8, rackX + 1.15, arY + 0.55, rackZ + 0.14, P.gold || 0xd8b45a, 0.2, Math.PI * 0.42, 0, 0.88, 1.12, rng);

  const crateCoords = [
    { x: hallX - mainW * 0.5 - 0.55, z: arZ + 1.4, s: 0.85, r: 0.18 },
    { x: hallX - mainW * 0.5 - 0.45, z: arZ + 0.45, s: 0.72, r: -0.32 },
    { x: hallX - mainW * 0.5 - 0.5, y: 0.72, z: arZ + 0.9, s: 0.6, r: 0.45 },
    { x: shedX + forgeW * 0.5 + 0.4, z: arZ + 1.2, s: 0.78, r: 0.12 }
  ];
  for (const c of crateCoords) {
    dummy.position.set(c.x, arY + (c.y || 0) + c.s * 0.5, c.z);
    dummy.rotation.set(0, c.r, 0);
    dummy.scale.set(c.s, c.s, c.s);
    dummy.updateMatrix();
    crateMatrices.push(dummy.matrix.clone());
  }

  colliders.push({ type: 'box', x: arX, z: arZ, w: 10.6, d: 5.2, rotY: 0 });

  const arDoorPos = new THREE.Vector3(arDoorX, arY, (arCfg.door && arCfg.door.position.z) || -17.4);
  const arDoorOut = new THREE.Vector3(0, 0, 1);
  doors.push({ id: (arCfg.door && arCfg.door.id) || 'door_armory', position: arDoorPos, outward: arDoorOut });
  registerAnchor('door_armory', arDoorPos);
  registerAnchor('anvil', anvilPos);
  registerAnchor('forge', forgePos);
  registerAnchor('forge_fire', forgePos);

  const arSign = getSignLayout(layout, 'armory');
  if (arSign) {
    registerAnchor('sign_armory', new THREE.Vector3(arSign.x, arSign.boardY, arSign.z));
    buildSignPost(stoneGeos, signGlyphGeos, arSign, rng, P);
  }

  animRefs.forgeLightIdx = lights.length;
  lights.push({
    position: new THREE.Vector3(forgePos.x + 0.2, arY + 1.35, forgePos.z + 0.65),
    color: 0xff8a3a,
    intensity: 5.5,
    distance: 9.0,
    baseIntensity: 5.5
  });
}

export function buildMessHallRow(bCtx) {
  const {
    rng, layout, getGroundY, P,
    stoneGeos, plasterWoodGeos, metalGoldGeos, mossDirtGeos, windowGeos, signGlyphGeos,
    colliders, doors, registerAnchor
  } = bCtx;

  const mhCfg = layout.mess_hall_row || {
    center: { x: 8.0, z: 38.0 },
    footprint: { type: 'box', width: 22.8, depth: 4.4, height: 4.4 },
    door: { id: 'door_mess_hall', position: { x: 8.0, y: 0.0, z: 35.8 }, outward: { x: 0.0, y: 0.0, z: -1.0 } }
  };
  const mhX = mhCfg.center.x;
  const mhZ = mhCfg.center.z;
  const mhY = getGroundY(mhX, mhZ);
  const mhW = (mhCfg.footprint && mhCfg.footprint.width) || 22.8;
  const mhD = (mhCfg.footprint && mhCfg.footprint.depth) || 4.4;
  const mhH = (mhCfg.footprint && mhCfg.footprint.height) || 4.4;

  const unitCount = 6;
  const unitW = mhW / unitCount;
  const startX = mhX - mhW * 0.5 + unitW * 0.5;

  addBox(stoneGeos, mhW + 0.4, 0.42, mhD + 0.4, mhX, mhY + 0.21, mhZ, P.groundDark || 0x68767c, 0, 0, 0, 0.7, 1.0, rng);

  for (let u = 0; u < unitCount; u++) {
    const ux = startX + u * unitW;
    const uH = mhH - 0.8 + (u % 2) * 0.22;

    addBox(stoneGeos, unitW + 0.04, 1.25, mhD, ux, mhY + 0.95, mhZ, P.wallShade || 0x8e9da3, 0, 0, 0, 0.74, 1.02, rng);
    addBox(plasterWoodGeos, unitW, uH - 1.25, mhD - 0.08, ux, mhY + 1.55 + (uH - 1.25) * 0.5, mhZ, u % 2 === 0 ? (P.plaster || 0xdfe3df) : (P.wallLit || 0xc4cbcf), 0, 0, 0, 0.8, 1.05, rng);

    addBox(stoneGeos, 0.34, uH + 0.3, mhD + 0.24, ux - unitW * 0.5, mhY + (uH + 0.3) * 0.5 + 0.2, mhZ, P.wallLit || 0xc4cbcf, 0, 0, 0, 0.76, 1.06, rng);

    const rPeak = 1.25;
    for (const side of [-1, 1]) {
      const sLen = Math.hypot(mhD * 0.5 + 0.35, rPeak);
      const sAng = Math.atan2(rPeak, mhD * 0.5 + 0.35);
      addBox(stoneGeos, unitW + 0.12, 0.2, sLen, ux, mhY + uH + rPeak * 0.45, mhZ + side * (mhD * 0.25), P.slate || 0x4a5560, 0, side * sAng, 0, 0.76, 1.06, rng);
    }

    if (u % 2 === 1) {
      addBox(stoneGeos, 0.68, 1.45, 0.68, ux + 0.8, mhY + uH + 1.15, mhZ + 0.6, P.wallShade || 0x8e9da3, 0, 0, 0, 0.78, 1.06, rng);
    }

    const winZ = mhZ - mhD * 0.5;
    if (u !== 2) {
      addBox(stoneGeos, 1.15, 1.15, 0.24, ux, mhY + 2.15, winZ, P.wallLit || 0xc4cbcf, 0, 0, 0, 0.78, 1.05, rng);
      addBox(windowGeos, 0.78, 0.82, 0.14, ux, mhY + 2.15, winZ - 0.07, P.warmWindow || 0xffc27a, 0, 0, 0, 0.85, 1.05, rng);
      addBox(plasterWoodGeos, 0.42, 0.88, 0.18, ux - 0.24, mhY + 2.15, winZ - 0.08, P.wood || 0x6a4a2e, 0.12, 0, 0, 0.74, 1.02, rng);
      addBox(plasterWoodGeos, 0.42, 0.88, 0.18, ux + 0.24, mhY + 2.15, winZ - 0.08, P.wood || 0x6a4a2e, -0.12, 0, 0, 0.74, 1.02, rng);
    }
  }
  addBox(stoneGeos, 0.34, mhH - 0.5, mhD + 0.24, mhX + mhW * 0.5, mhY + (mhH - 0.5) * 0.5 + 0.2, mhZ, P.wallLit || 0xc4cbcf, 0, 0, 0, 0.76, 1.06, rng);

  const mhDoorX = (mhCfg.door && mhCfg.door.position.x) || 8.0;
  const mhDoorZ = mhZ - mhD * 0.5;
  addBox(stoneGeos, 2.05, 2.55, 0.42, mhDoorX, mhY + 1.35, mhDoorZ, P.wallLit || 0xc4cbcf, 0, 0, 0, 0.78, 1.06, rng);
  addBox(plasterWoodGeos, 1.52, 2.22, 0.26, mhDoorX, mhY + 1.22, mhDoorZ - 0.10, P.timber || 0x2b2623, 0, 0, 0, 0.7, 0.98, rng);
  addBox(metalGoldGeos, 1.65, 0.14, 0.32, mhDoorX, mhY + 1.32, mhDoorZ - 0.12, P.slate || 0x4a5560, 0, 0, 0.42, 0.8, 1.08, rng);
  addBox(metalGoldGeos, 1.65, 0.14, 0.32, mhDoorX, mhY + 1.32, mhDoorZ - 0.12, P.slate || 0x4a5560, 0, 0, -0.42, 0.8, 1.08, rng);
  addBox(metalGoldGeos, 0.28, 0.36, 0.38, mhDoorX, mhY + 1.24, mhDoorZ - 0.15, P.gold || 0xd8b45a, 0, 0, 0, 0.88, 1.12, rng);

  for (let m = 0; m < 6; m++) {
    addBox(mossDirtGeos, 1.8, 0.18, 0.45, startX + m * unitW, mhY + mhH - 0.45, mhZ - mhD * 0.5, P.moss || 0x5f8a4a, 0, 0, 0, 0.78, 1.05, rng);
  }

  colliders.push({ type: 'box', x: mhX, z: mhZ, w: mhW + 0.4, d: mhD + 0.4, rotY: 0 });

  const mhDoorPos = new THREE.Vector3(mhDoorX, mhY, (mhCfg.door && mhCfg.door.position.z) || 35.8);
  const mhDoorOut = new THREE.Vector3(0, 0, -1);
  doors.push({ id: (mhCfg.door && mhCfg.door.id) || 'door_mess_hall', position: mhDoorPos, outward: mhDoorOut });
  registerAnchor('door_mess_hall', mhDoorPos);
  registerAnchor('door_mess_hall_row', mhDoorPos);

  const mhSign = getSignLayout(layout, 'mess_hall_row');
  if (mhSign) {
    registerAnchor('sign_mess_hall_row', new THREE.Vector3(mhSign.x, mhSign.boardY, mhSign.z));
    registerAnchor('sign_mess_hall', new THREE.Vector3(mhSign.x, mhSign.boardY, mhSign.z));
    buildSignPost(stoneGeos, signGlyphGeos, mhSign, rng, P);
  }
}

export function buildDungeonBoard(bCtx) {
  const {
    rng, layout, getGroundY, P,
    stoneGeos, plasterWoodGeos, metalGoldGeos, crimsonGeos, windowGeos, signGlyphGeos,
    colliders, registerAnchor
  } = bCtx;

  const dbCfg = layout.dungeon_board || {
    center: { x: 6.0, z: -2.0 },
    footprint: { type: 'box', width: 2.3, depth: 0.8, height: 3.0 }
  };
  const dbX = dbCfg.center.x;
  const dbZ = dbCfg.center.z;
  const dbY = getGroundY(dbX, dbZ);
  const dbW = (dbCfg.footprint && dbCfg.footprint.width) || 2.3;
  const dbD = (dbCfg.footprint && dbCfg.footprint.depth) || 0.8;
  const dbH = (dbCfg.footprint && dbCfg.footprint.height) || 3.0;

  addBox(stoneGeos, dbW + 0.35, 0.32, dbD + 0.35, dbX, dbY + 0.16, dbZ, P.groundDark || 0x68767c, 0, 0, 0, 0.72, 1.02, rng);
  addBox(stoneGeos, dbW + 0.1, 0.24, dbD + 0.1, dbX, dbY + 0.44, dbZ, P.wallLit || 0xc4cbcf, 0, 0, 0, 0.8, 1.06, rng);

  for (const side of [-1, 1]) {
    addBox(plasterWoodGeos, 0.24, dbH - 0.4, 0.26, dbX + side * (dbW * 0.44), dbY + 0.4 + (dbH - 0.4) * 0.5, dbZ, P.timber || 0x2b2623, 0, 0, 0, 0.68, 0.96, rng);
  }
  addBox(plasterWoodGeos, dbW - 0.22, 1.55, 0.14, dbX, dbY + 1.75, dbZ, P.wood || 0x6a4a2e, 0, 0, 0, 0.75, 1.04, rng);
  addBox(plasterWoodGeos, dbW + 0.05, 0.16, 0.28, dbX, dbY + 0.95, dbZ, P.timber || 0x2b2623, 0, 0, 0, 0.7, 0.98, rng);
  addBox(plasterWoodGeos, dbW + 0.05, 0.16, 0.28, dbX, dbY + 2.55, dbZ, P.timber || 0x2b2623, 0, 0, 0, 0.7, 0.98, rng);

  for (const side of [-1, 1]) {
    addBox(stoneGeos, dbW + 0.48, 0.14, 0.68, dbX, dbY + dbH - 0.12, dbZ + side * 0.26, P.slate || 0x4a5560, 0, side * 0.42, 0, 0.78, 1.08, rng);
  }
  addBox(plasterWoodGeos, dbW + 0.54, 0.14, 0.18, dbX, dbY + dbH + 0.04, dbZ, P.timber || 0x2b2623, 0, 0, 0, 0.8, 1.05, rng);

  const paperTones = [0xf2efe6, 0xe6dcc8, 0xded4be, 0xf7f4eb];
  for (const face of [-1, 1]) {
    for (let p = 0; p < 7; p++) {
      const px = dbX - 0.72 + (p % 4) * 0.46 + (rng() - 0.5) * 0.06;
      const py = dbY + 1.35 + Math.floor(p / 4) * 0.62 + (rng() - 0.5) * 0.06;
      const pw = 0.28 + (p % 3) * 0.05;
      const ph = 0.36 + (p % 2) * 0.08;
      const pRot = (rng() - 0.5) * 0.16;
      const pCol = paperTones[p % paperTones.length];
      addBox(plasterWoodGeos, pw, ph, 0.02, px, py, dbZ + face * 0.085, pCol, 0, 0, pRot, 0.92, 1.08, rng);
      addBox(crimsonGeos, 0.05, 0.05, 0.03, px, py + ph * 0.36, dbZ + face * 0.095, P.crimsonGlow || 0xff3a4a, 0, 0, 0, 0.95, 1.05, rng);
    }
  }

  const hookX = dbX + dbW * 0.5 + 0.22;
  addBox(metalGoldGeos, 0.42, 0.07, 0.07, hookX - 0.1, dbY + 2.45, dbZ, P.slate || 0x4a5560, 0, 0, 0.2, 0.8, 1.05, rng);
  addCyl(windowGeos, 0.14, 0.11, 0.28, 6, hookX + 0.06, dbY + 2.22, dbZ, P.warmWindow || 0xffc27a, 0, 0, 0, 0.95, 1.05, rng);
  addCyl(metalGoldGeos, 0.04, 0.18, 0.12, 6, hookX + 0.06, dbY + 2.4, dbZ, P.slate || 0x4a5560, 0, 0, 0, 0.8, 1.05, rng);

  colliders.push({ type: 'box', x: dbX, z: dbZ, w: dbW + 0.3, d: dbD + 0.4, rotY: 0 });

  const dbSign = getSignLayout(layout, 'dungeon_board');
  if (dbSign) {
    registerAnchor('sign_dungeon_board', new THREE.Vector3(dbSign.x, dbSign.boardY, dbSign.z));
    buildSignPost(stoneGeos, signGlyphGeos, dbSign, rng, P);
  }
}