// src/art/floors/farmCampsAndGates.js
// Goblin camp pockets, scarecrow, courtyard props, entrance/exit gates, and cloth/flame mesh builders for Floor 1.

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { FARM_COLORS } from './farmConfig.js';
import {
  paintGeometry,
  paintTexturedGeometry,
  pushToChunk,
  createContactDecal
} from './farmMaterials.js';

export function createBannerAndFlameHelpers({ group, materials, animatedRefs, trackGeo }) {
  function addFlutteringBanner(x, y, z, width, height, rotY, colorTop, colorBot, rng) {
    const geo = new THREE.PlaneGeometry(width, height, 3, 6);
    geo.translate(0, -height * 0.5, 0);
    const painted = paintGeometry(geo, colorBot, colorTop, 0.15, rng);
    const pos = painted.attributes.position;
    const baseY = new Float32Array(pos.count);
    const baseZ = new Float32Array(pos.count);
    for (let i = 0; i < pos.count; i++) {
      baseY[i] = pos.getY(i);
      baseZ[i] = pos.getZ(i);
    }
    trackGeo(painted);
    const mesh = new THREE.Mesh(painted, materials.cloth);
    mesh.position.set(x, y, z);
    mesh.rotation.y = rotY;
    group.add(mesh);
    animatedRefs.clothMeshes.push({ mesh, geo: painted, baseY, baseZ, height, phase: rng() * Math.PI * 2 });
  }

  function addFireFlameMesh(x, y, z, scale, rng) {
    const flameGeo = new THREE.ConeGeometry(scale * 0.5, scale * 1.35, 6);
    flameGeo.translate(0, scale * 0.5, 0);
    const painted = paintGeometry(flameGeo, FARM_COLORS.amberFire, 0xfff3b0, 0.05, rng);
    trackGeo(painted);
    const mesh = new THREE.Mesh(painted, materials.emissive);
    mesh.position.set(x, y, z);
    group.add(mesh);
    animatedRefs.flameMeshes.push({ mesh, baseY: y, baseScale: 1.0, phase: rng() * Math.PI * 2 });
  }

  return { addFlutteringBanner, addFireFlameMesh };
}

export function buildGoblinCampsAndCourtyardProps({
  lights,
  chunks,
  shadowDecals,
  rng,
  addFlutteringBanner,
  addFireFlameMesh
}) {
  const campSites = [
    { x: -11.5, z: -23.5, rotY: 0.6, hasFire: false },
    { x: 11.8, z: -42.0, rotY: -0.7, hasFire: false },
    { x: 19.5, z: -75.0, rotY: -1.4, hasFire: false },
    { x: -3.5, z: -104.5, rotY: 0.4, hasFire: true }
  ];

  for (let i = 0; i < campSites.length; i++) {
    const cs = campSites[i];
    const parts = [];

    const tentFlap = new THREE.ConeGeometry(1.75, 2.15, 5, 1, true);
    tentFlap.rotateY(cs.rotY);
    tentFlap.translate(cs.x, 1.075, cs.z);
    parts.push(paintTexturedGeometry(tentFlap, FARM_COLORS.goblinHide, FARM_COLORS.goblinCream, 0.18, rng));

    for (const side of [-0.85, 0.85]) {
      const pole = new THREE.CylinderGeometry(0.05, 0.07, 2.35, 5);
      pole.rotateZ(side * 0.28);
      pole.translate(cs.x + Math.cos(cs.rotY) * side, 1.12, cs.z - Math.sin(cs.rotY) * side);
      parts.push(paintTexturedGeometry(pole, FARM_COLORS.woodDark, FARM_COLORS.woodWeathered, 0.14, rng));
    }

    const rackX = cs.x + Math.cos(cs.rotY + 1.2) * 2.1;
    const rackZ = cs.z + Math.sin(cs.rotY + 1.2) * 2.1;
    for (let s = 0; s < 3; s++) {
      const spear = new THREE.CylinderGeometry(0.025, 0.035, 2.1, 5);
      spear.rotateZ((s - 1) * 0.14);
      spear.translate(rackX + (s - 1) * 0.22, 1.02, rackZ);
      parts.push(paintTexturedGeometry(spear, FARM_COLORS.woodDark, FARM_COLORS.ironRust, 0.15, rng));
    }

    const totemPole = new THREE.CylinderGeometry(0.05, 0.07, 2.2, 5);
    totemPole.translate(rackX - 0.7, 1.1, rackZ + 0.4);
    parts.push(paintTexturedGeometry(totemPole, FARM_COLORS.woodDark, FARM_COLORS.goblinRed, 0.15, rng));

    const skull = new THREE.IcosahedronGeometry(0.22, 0);
    skull.scale(0.85, 1.1, 1.25);
    skull.translate(rackX - 0.7, 2.25, rackZ + 0.4);
    parts.push(paintTexturedGeometry(skull, FARM_COLORS.marbleShade, FARM_COLORS.bone, 0.18, rng));

    addFlutteringBanner(
      rackX - 0.7,
      1.95,
      rackZ + 0.4,
      0.55,
      1.25,
      cs.rotY,
      FARM_COLORS.goblinRed,
      FARM_COLORS.goblinCream,
      rng
    );

    if (cs.hasFire) {
      const fx = cs.x + 2.4;
      const fz = cs.z - 1.2;
      for (let st = 0; st < 8; st++) {
        const ang = (st / 8) * Math.PI * 2;
        const stone = new THREE.DodecahedronGeometry(0.18, 0);
        stone.scale(1.2, 0.7, 1.0);
        stone.translate(fx + Math.cos(ang) * 0.52, 0.1, fz + Math.sin(ang) * 0.52);
        parts.push(paintTexturedGeometry(stone, FARM_COLORS.marbleShade, FARM_COLORS.outline, 0.15, rng));
      }
      addFireFlameMesh(fx, 0.26, fz, 0.45, rng);
      lights.push({
        position: new THREE.Vector3(fx, 0.85, fz),
        color: FARM_COLORS.amberFire,
        intensity: 1.2,
        distance: 10
      });
    }

    pushToChunk(chunks, mergeGeometries(parts, false), cs.z);
    shadowDecals.push(createContactDecal(cs.x, cs.z, 2.1, 2.1, 0.85));
  }

  const scX = 13.5;
  const scZ = -100.5;
  const scParts = [];
  const scPole = new THREE.CylinderGeometry(0.06, 0.07, 2.15, 6);
  scPole.translate(scX, 1.07, scZ);
  scParts.push(paintTexturedGeometry(scPole, FARM_COLORS.woodDark, FARM_COLORS.woodWeathered, 0.14, rng));

  const scArms = new THREE.CylinderGeometry(0.045, 0.045, 1.55, 5);
  scArms.rotateZ(Math.PI / 2 - 0.08);
  scArms.translate(scX, 1.62, scZ);
  scParts.push(paintTexturedGeometry(scArms, FARM_COLORS.woodDark, FARM_COLORS.woodWeathered, 0.14, rng));

  const scTorso = new THREE.ConeGeometry(0.38, 0.95, 6);
  scTorso.translate(scX, 1.38, scZ);
  scParts.push(paintTexturedGeometry(scTorso, FARM_COLORS.goblinHide, FARM_COLORS.hayBright, 0.16, rng));

  const scHead = new THREE.SphereGeometry(0.22, 7, 6);
  scHead.translate(scX, 1.98, scZ);
  scParts.push(paintTexturedGeometry(scHead, FARM_COLORS.hayShade, FARM_COLORS.hayBright, 0.16, rng));

  pushToChunk(chunks, mergeGeometries(scParts, false), scZ);
  shadowDecals.push(createContactDecal(scX, scZ, 0.8, 0.8, 0.75));

  const propSpots = [
    { x: -10.2, z: -114.5 },
    { x: -11.0, z: -108.2 },
    { x: 8.5, z: -117.5 },
    { x: 12.2, z: -70.5 },
    { x: -7.5, z: -17.5 }
  ];
  for (let i = 0; i < propSpots.length; i++) {
    const ps = propSpots[i];
    const crate = new THREE.BoxGeometry(0.65, 0.55, 0.65);
    crate.rotateY(rng() * Math.PI);
    crate.translate(ps.x, 0.275, ps.z);
    pushToChunk(chunks, paintTexturedGeometry(crate, FARM_COLORS.woodDark, FARM_COLORS.woodWeathered, 0.15, rng), ps.z);

    const amphora = new THREE.CylinderGeometry(0.14, 0.22, 0.62, 7);
    amphora.rotateZ((rng() - 0.5) * 0.9);
    amphora.translate(ps.x + 0.55, 0.26, ps.z + 0.35);
    pushToChunk(
      chunks,
      paintTexturedGeometry(amphora, FARM_COLORS.terracottaDark, FARM_COLORS.terracottaLit, 0.18, rng),
      ps.z
    );
  }
}

export function applyGateVisuals(gateState, animatedRefs) {
  const entOpenAngle = gateState.entranceOpen ? 1.35 : 0.0;
  const exitOpenAngle = gateState.exitOpen && !gateState.arenaSealed ? -1.42 : 0.0;

  if (animatedRefs.entranceLeftBar) {
    animatedRefs.entranceLeftBar.rotation.y = entOpenAngle;
  }
  if (animatedRefs.entranceRightBar) {
    animatedRefs.entranceRightBar.rotation.y = -entOpenAngle;
  }
  if (animatedRefs.exitLeftLeaf) {
    animatedRefs.exitLeftLeaf.rotation.y = exitOpenAngle;
  }
  if (animatedRefs.exitRightLeaf) {
    animatedRefs.exitRightLeaf.rotation.y = -exitOpenAngle;
  }
}

export function buildGates({
  layout,
  group,
  anchors,
  lights,
  palette,
  materials,
  animatedRefs,
  gateState,
  trackGeo,
  chunks,
  outlineChunks,
  shadowDecals,
  rng,
  qCfg,
  addFireFlameMesh
}) {
  const ent = layout.entranceBarrier || { position: { x: 0, z: 6.5 }, rotationY: 0, width: 14 };
  const ex = ent.position.x;
  const ez = ent.position.z;
  const ew = ent.width || 14;
  anchors.entranceGate = new THREE.Vector3(ex, 0, ez);

  const gateGap = 4.8;
  for (const side of [-1, 1]) {
    const pierX = ex + side * (gateGap * 0.5);
    const pier = new THREE.CylinderGeometry(0.45, 0.55, 2.35, 8);
    pier.translate(pierX, 1.175, ez);
    pushToChunk(
      chunks,
      paintTexturedGeometry(pier, FARM_COLORS.marbleShade, FARM_COLORS.marbleLit, 0.16, rng),
      ez,
      qCfg.useOutlines ? outlineChunks : null,
      0.028
    );
    shadowDecals.push(createContactDecal(pierX, ez, 0.85, 0.85, 0.9));

    const wingLen = (ew - gateGap) * 0.5;
    const wingX = pierX + side * (wingLen * 0.5);
    for (const railY of [0.55, 1.05]) {
      const rail = new THREE.BoxGeometry(wingLen, 0.11, 0.1);
      rail.translate(wingX, railY, ez);
      pushToChunk(
        chunks,
        paintTexturedGeometry(rail, FARM_COLORS.woodDark, FARM_COLORS.woodWeathered, 0.14, rng),
        ez
      );
    }
  }

  const entLanternX = ex - gateGap * 0.5 + 0.35;
  const entLanternZ = ez - 0.35;
  addFireFlameMesh(entLanternX, 2.15, entLanternZ, 0.22, rng);
  lights.push({
    position: new THREE.Vector3(entLanternX, 2.2, entLanternZ),
    color: FARM_COLORS.lanternWarm,
    intensity: 1.15,
    distance: 11
  });

  const buildGateLeafMesh = (leafWidth, height) => {
    const leafParts = [];
    const stiles = [0, leafWidth];
    for (const sx of stiles) {
      const stile = new THREE.BoxGeometry(0.12, height, 0.12);
      stile.translate(sx, height * 0.5, 0);
      leafParts.push(paintTexturedGeometry(stile, palette.timber, FARM_COLORS.woodWeathered, 0.15, rng));
    }
    for (const ry of [0.4, 1.15, 1.95]) {
      const rail = new THREE.BoxGeometry(leafWidth, 0.12, 0.1);
      rail.translate(leafWidth * 0.5, ry, 0);
      leafParts.push(paintTexturedGeometry(rail, FARM_COLORS.woodDark, FARM_COLORS.woodWeathered, 0.15, rng));
    }
    const brace = new THREE.BoxGeometry(Math.hypot(leafWidth, 1.5), 0.1, 0.08);
    brace.rotateZ(Math.atan2(1.5, leafWidth));
    brace.translate(leafWidth * 0.5, 1.15, 0);
    leafParts.push(paintTexturedGeometry(brace, FARM_COLORS.woodDark, FARM_COLORS.ochreLight, 0.15, rng));

    const geo = trackGeo(mergeGeometries(leafParts, false));
    return new THREE.Mesh(geo, materials.solid);
  };

  const entLeafW = gateGap * 0.48;
  const entLeft = buildGateLeafMesh(entLeafW, 2.2);
  entLeft.position.set(ex - gateGap * 0.5, 0, ez);
  group.add(entLeft);
  animatedRefs.entranceLeftBar = entLeft;

  const entRight = buildGateLeafMesh(entLeafW, 2.2);
  entRight.scale.x = -1;
  entRight.position.set(ex + gateGap * 0.5, 0, ez);
  group.add(entRight);
  animatedRefs.entranceRightBar = entRight;

  const ext = layout.exitGate || { position: { x: 0, z: -125 }, rotationY: 0, width: 3.6 };
  const xgx = ext.position.x;
  const xgz = ext.position.z;
  const xgw = ext.width || 3.6;
  anchors.exitGate = new THREE.Vector3(xgx, 0, xgz);

  for (const side of [-1, 1]) {
    const px = xgx + side * (xgw * 0.5 + 0.42);
    const pillar = new THREE.BoxGeometry(0.92, 2.65, 0.92);
    pillar.translate(px, 1.325, xgz);
    pushToChunk(
      chunks,
      paintTexturedGeometry(pillar, FARM_COLORS.marbleShade, FARM_COLORS.marbleLit, 0.18, rng),
      xgz,
      qCfg.useOutlines ? outlineChunks : null,
      0.032
    );

    const cap = new THREE.BoxGeometry(1.12, 0.24, 1.12);
    cap.translate(px, 2.75, xgz);
    pushToChunk(
      chunks,
      paintTexturedGeometry(cap, FARM_COLORS.terracottaDark, FARM_COLORS.terracottaLit, 0.18, rng),
      xgz
    );
    shadowDecals.push(createContactDecal(px, xgz, 0.95, 0.95, 1.0));
  }

  const exitLeafW = xgw * 0.49;
  const exitLeft = buildGateLeafMesh(exitLeafW, 2.4);
  exitLeft.position.set(xgx - xgw * 0.5, 0, xgz);
  group.add(exitLeft);
  animatedRefs.exitLeftLeaf = exitLeft;

  const exitRight = buildGateLeafMesh(exitLeafW, 2.4);
  exitRight.scale.x = -1;
  exitRight.position.set(xgx + xgw * 0.5, 0, xgz);
  group.add(exitRight);
  animatedRefs.exitRightLeaf = exitRight;

  applyGateVisuals(gateState, animatedRefs);
}