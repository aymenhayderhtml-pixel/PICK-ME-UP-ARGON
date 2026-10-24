import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { FARM_COLORS } from './farmConfig.js';
import {
  paintTexturedGeometry,
  buildOutlinedClone,
  getChunkIndex,
  pushToChunk,
  createContactDecal
} from './farmMaterials.js';

export function buildTempleRuin({
  anchors,
  lights,
  palette,
  templeSpot,
  templeColumns,
  chunks,
  outlineChunks,
  shadowDecals,
  rng,
  qCfg,
  addFireFlameMesh,
  addFlutteringBanner
}) {
  const tx = templeSpot.x;
  const tz = templeSpot.z;
  anchors.templeRuin = new THREE.Vector3(tx, 0, tz);

  const slabDefs = [
    { x: tx - 3.2, z: tz, w: 6.4, d: 14.2, h: 0.038 },
    { x: tx + 2.4, z: tz, w: 6.8, d: 14.2, h: 0.18 },
    { x: tx + 3.2, z: tz, w: 5.2, d: 12.6, h: 0.34 }
  ];
  for (let i = 0; i < slabDefs.length; i++) {
    const s = slabDefs[i];
    const slab = new THREE.BoxGeometry(s.w, s.h, s.d, 4, 1, 6);
    const pos = slab.attributes.position;
    for (let v = 0; v < pos.count; v++) {
      if (pos.getY(v) > 0) {
        pos.setY(v, pos.getY(v) + (rng() - 0.5) * 0.012);
      }
    }
    slab.translate(s.x, s.h * 0.5, s.z);
    const topCol = i === 0 ? FARM_COLORS.marbleMid : FARM_COLORS.marbleLit;
    pushToChunk(
      chunks,
      paintTexturedGeometry(slab, FARM_COLORS.marbleShade, topCol, 0.16, rng),
      tz
    );
  }

  for (let m = 0; m < 10; m++) {
    const mx = tx - 5.5 + rng() * 11.5;
    const mz = tz - 6.2 + rng() * 12.4;
    const mossPatch = new THREE.BoxGeometry(0.6 + rng() * 1.1, 0.03, 0.25 + rng() * 0.4);
    mossPatch.rotateY(rng() * Math.PI);
    mossPatch.translate(mx, 0.025, mz);
    pushToChunk(
      chunks,
      paintTexturedGeometry(mossPatch, palette.mossDark, palette.moss, 0.12, rng),
      mz
    );
  }

  const colHeights = [3.8, 2.4, 4.1, 4.1, 1.9, 3.7, 4.1, 2.8];
  const sortedCols = [...templeColumns].sort((a, b) => a.z - b.z || a.x - b.x);

  for (let i = 0; i < sortedCols.length; i++) {
    const col = sortedCols[i];
    const r = col.radius || 0.8;
    const h = colHeights[i % colHeights.length];
    const radial = qCfg.columnRadial;

    const plinth = new THREE.BoxGeometry(r * 1.85, 0.32, r * 1.85);
    plinth.translate(col.x, 0.16, col.z);
    pushToChunk(
      chunks,
      paintTexturedGeometry(plinth, FARM_COLORS.marbleShade, palette.moss, 0.16, rng),
      col.z
    );

    const torusBase = new THREE.CylinderGeometry(r * 0.88, r * 0.94, 0.24, radial);
    torusBase.translate(col.x, 0.44, col.z);
    pushToChunk(
      chunks,
      paintTexturedGeometry(torusBase, FARM_COLORS.marbleMid, FARM_COLORS.marbleLit, 0.15, rng),
      col.z
    );

    const shaft = new THREE.CylinderGeometry(r * 0.72, r * 0.82, h, radial, 3);
    const sPos = shaft.attributes.position;
    for (let v = 0; v < sPos.count; v++) {
      const vx = sPos.getX(v);
      const vz = sPos.getZ(v);
      const vy = sPos.getY(v);
      const ang = Math.atan2(vz, vx);
      const flute = Math.cos(ang * 12) * 0.025;
      sPos.setX(v, vx + Math.cos(ang) * flute);
      sPos.setZ(v, vz + Math.sin(ang) * flute);
      if (vy > h * 0.45 && h < 3.5) {
        sPos.setY(v, vy + Math.sin(ang * 3 + i) * 0.16);
      }
    }
    shaft.translate(col.x, 0.56 + h * 0.5, col.z);
    pushToChunk(
      chunks,
      paintTexturedGeometry(shaft, FARM_COLORS.marbleMid, FARM_COLORS.marbleLit, 0.18, rng),
      col.z,
      qCfg.useOutlines ? outlineChunks : null,
      0.032
    );

    if (h >= 3.6) {
      const echinus = new THREE.CylinderGeometry(r * 0.95, r * 0.72, 0.28, radial);
      echinus.translate(col.x, 0.56 + h + 0.14, col.z);
      pushToChunk(
        chunks,
        paintTexturedGeometry(echinus, FARM_COLORS.marbleMid, FARM_COLORS.marbleLit, 0.16, rng),
        col.z
      );

      const abacus = new THREE.BoxGeometry(r * 1.95, 0.24, r * 1.95);
      abacus.translate(col.x, 0.56 + h + 0.4, col.z);
      pushToChunk(
        chunks,
        paintTexturedGeometry(abacus, FARM_COLORS.marbleShade, palette.moss, 0.18, rng),
        col.z,
        qCfg.useOutlines ? outlineChunks : null,
        0.028
      );
    }

    shadowDecals.push(createContactDecal(col.x, col.z, r * 1.45, r * 1.45, 1.0));
  }

  const beams = [
    { x: 20.0, y: 5.3, z: -81.0, w: 5.2, h: 0.62, d: 1.15 },
    { x: 16.0, y: 5.3, z: -69.0, w: 5.2, h: 0.62, d: 1.15 },
    { x: 18.0, y: 5.85, z: -81.0, w: 3.4, h: 0.45, d: 1.05 }
  ];
  for (let i = 0; i < beams.length; i++) {
    const b = beams[i];
    const beamGeo = new THREE.BoxGeometry(b.w, b.h, b.d);
    beamGeo.translate(b.x, b.y, b.z);
    pushToChunk(
      chunks,
      paintTexturedGeometry(beamGeo, FARM_COLORS.marbleMid, palette.moss, 0.18, rng),
      b.z,
      qCfg.useOutlines ? outlineChunks : null,
      0.032
    );
  }

  const fallenDrums = [
    { x: 24.2, z: -76.5, rotX: 1.48, rotZ: 0.4 },
    { x: 23.5, z: -74.8, rotX: 1.52, rotZ: -0.25 },
    { x: 19.5, z: -83.2, rotX: 1.45, rotZ: 1.1 }
  ];
  for (let i = 0; i < fallenDrums.length; i++) {
    const fd = fallenDrums[i];
    const drum = new THREE.CylinderGeometry(0.56, 0.58, 1.15, qCfg.columnRadial);
    drum.rotateX(fd.rotX);
    drum.rotateY(fd.rotZ);
    drum.translate(fd.x, 0.48, fd.z);
    pushToChunk(
      chunks,
      paintTexturedGeometry(drum, FARM_COLORS.marbleShade, palette.moss, 0.16, rng),
      fd.z
    );
    shadowDecals.push(createContactDecal(fd.x, fd.z, 0.9, 0.9, 0.8));
  }

  const brazierX = 16.0;
  const brazierZ = -75.0;
  const pedestal = new THREE.CylinderGeometry(0.45, 0.58, 0.95, 8);
  pedestal.translate(brazierX, 0.475, brazierZ);
  pushToChunk(
    chunks,
    paintTexturedGeometry(pedestal, FARM_COLORS.marbleShade, FARM_COLORS.marbleLit, 0.16, rng),
    brazierZ
  );

  const bowl = new THREE.CylinderGeometry(0.68, 0.35, 0.38, 8);
  bowl.translate(brazierX, 1.1, brazierZ);
  pushToChunk(
    chunks,
    paintTexturedGeometry(bowl, palette.iron, FARM_COLORS.ironRust, 0.18, rng),
    brazierZ
  );
  shadowDecals.push(createContactDecal(brazierX, brazierZ, 1.0, 1.0, 0.9));

  addFireFlameMesh(brazierX, 1.32, brazierZ, 0.55, rng);
  lights.push({
    position: new THREE.Vector3(brazierX, 1.65, brazierZ),
    color: FARM_COLORS.amberFire,
    intensity: 1.35,
    distance: 13
  });

  addFlutteringBanner(16.0, 4.95, -69.0, 0.95, 2.1, 0, FARM_COLORS.goblinRed, FARM_COLORS.goblinCream, rng);
  addFlutteringBanner(20.0, 4.95, -81.0, 0.85, 1.85, Math.PI, FARM_COLORS.goblinCream, FARM_COLORS.goblinRed, rng);
}

export function buildFarmhouseAndWell({
  anchors,
  lights,
  palette,
  farmhouseOb,
  wellOb,
  chunks,
  outlineChunks,
  shadowDecals,
  rng,
  qCfg,
  addFireFlameMesh
}) {
  const fx = farmhouseOb.x;
  const fz = farmhouseOb.z;
  anchors.farmhouse = new THREE.Vector3(fx, 0, fz);

  const terrace = new THREE.CylinderGeometry(5.6, 5.8, 0.038, 12);
  terrace.translate(fx + 0.6, 0.019, fz + 0.4);
  pushToChunk(
    chunks,
    paintTexturedGeometry(terrace, FARM_COLORS.marbleShade, FARM_COLORS.marbleMid, 0.12, rng),
    fz
  );

  const wallH = 3.15;
  const halfW = 2.45;
  const halfD = 2.35;
  const wallThick = 0.42;

  const houseParts = [];
  const outlineParts = [];

  const socle = new THREE.CylinderGeometry(3.85, 3.98, 0.55, 10);
  socle.translate(fx, 0.275, fz);
  houseParts.push(paintTexturedGeometry(socle, FARM_COLORS.marbleShade, FARM_COLORS.plasterWeathered, 0.16, rng));

  const westWall = new THREE.BoxGeometry(wallThick, wallH, halfD * 2);
  westWall.translate(fx - halfW, wallH * 0.5, fz);
  houseParts.push(paintTexturedGeometry(westWall, FARM_COLORS.plasterWeathered, FARM_COLORS.plasterWarm, 0.16, rng));
  outlineParts.push(westWall);

  const northWall = new THREE.BoxGeometry(halfW * 2, wallH, wallThick);
  northWall.translate(fx, wallH * 0.5, fz - halfD);
  houseParts.push(paintTexturedGeometry(northWall, FARM_COLORS.plasterWeathered, FARM_COLORS.plasterWarm, 0.16, rng));
  outlineParts.push(northWall);

  const southWallLow = new THREE.BoxGeometry(halfW * 2, wallH * 0.62, wallThick);
  southWallLow.translate(fx, wallH * 0.31, fz + halfD);
  houseParts.push(paintTexturedGeometry(southWallLow, FARM_COLORS.plasterWeathered, FARM_COLORS.plasterWarm, 0.16, rng));
  outlineParts.push(southWallLow);

  for (const side of [-1, 1]) {
    const pier = new THREE.BoxGeometry(wallThick, wallH, 1.55);
    pier.translate(fx + halfW, wallH * 0.5, fz + side * 1.55);
    houseParts.push(paintTexturedGeometry(pier, FARM_COLORS.plasterWeathered, FARM_COLORS.plasterWarm, 0.16, rng));
    outlineParts.push(pier);
  }

  const lintelWall = new THREE.BoxGeometry(wallThick, wallH - 2.25, 1.65);
  lintelWall.translate(fx + halfW, 2.25 + (wallH - 2.25) * 0.5, fz);
  houseParts.push(paintTexturedGeometry(lintelWall, FARM_COLORS.plasterWeathered, FARM_COLORS.plasterWarm, 0.16, rng));

  const timberLintel = new THREE.BoxGeometry(0.54, 0.22, 1.85);
  timberLintel.translate(fx + halfW, 2.3, fz);
  houseParts.push(paintTexturedGeometry(timberLintel, palette.timber, FARM_COLORS.woodDark, 0.14, rng));

  for (const side of [-0.75, 0.75]) {
    const jamb = new THREE.BoxGeometry(0.48, 2.25, 0.2);
    jamb.translate(fx + halfW, 1.125, fz + side);
    houseParts.push(paintTexturedGeometry(jamb, palette.timber, FARM_COLORS.woodDark, 0.14, rng));
  }

  const interiorBack = new THREE.BoxGeometry(0.2, 2.25, 1.5);
  interiorBack.translate(fx + halfW - 0.65, 1.125, fz);
  houseParts.push(paintTexturedGeometry(interiorBack, FARM_COLORS.trunkDark, FARM_COLORS.woodDark, 0.08, rng));

  for (let r = 0; r < 5; r++) {
    const rz = fz - halfD + 0.45 + r * 0.95;
    const rafter = new THREE.BoxGeometry(halfW * 2.2, 0.18, 0.18);
    rafter.rotateZ(r > 2 ? -0.18 : 0.05);
    rafter.translate(fx, wallH + 0.15 - (r > 2 ? 0.35 : 0), rz);
    houseParts.push(paintTexturedGeometry(rafter, palette.timber, FARM_COLORS.woodDark, 0.15, rng));
  }

  const roofNorth = new THREE.BoxGeometry(halfW * 2.25, 0.24, 2.8);
  roofNorth.rotateX(0.38);
  roofNorth.translate(fx, wallH + 0.58, fz - 1.15);
  houseParts.push(
    paintTexturedGeometry(roofNorth, FARM_COLORS.terracottaDark, FARM_COLORS.terracottaLit, 0.2, rng)
  );
  outlineParts.push(roofNorth);

  const roofCollapsed = new THREE.BoxGeometry(halfW * 1.9, 0.22, 2.3);
  roofCollapsed.rotateX(-0.55);
  roofCollapsed.rotateZ(0.22);
  roofCollapsed.translate(fx - 0.2, wallH - 0.35, fz + 1.05);
  houseParts.push(
    paintTexturedGeometry(roofCollapsed, FARM_COLORS.terracottaDark, FARM_COLORS.terracottaMid, 0.2, rng)
  );

  const leanToRoof = new THREE.BoxGeometry(2.6, 0.14, 1.5);
  leanToRoof.rotateX(0.32);
  leanToRoof.translate(fx, 2.15, fz - halfD - 0.65);
  houseParts.push(paintTexturedGeometry(leanToRoof, FARM_COLORS.woodDark, FARM_COLORS.terracottaMid, 0.16, rng));

  for (const lx of [fx - 1.1, fx + 1.1]) {
    const lPost = new THREE.CylinderGeometry(0.09, 0.1, 1.9, 6);
    lPost.translate(lx, 0.95, fz - halfD - 1.2);
    houseParts.push(paintTexturedGeometry(lPost, palette.timber, FARM_COLORS.woodWeathered, 0.14, rng));
  }

  const mergedHouse = mergeGeometries(houseParts, false);
  pushToChunk(chunks, mergedHouse, fz);

  if (qCfg.useOutlines && outlineParts.length > 0) {
    const mergedHouseOutline = mergeGeometries(outlineParts, false);
    outlineChunks[getChunkIndex(fz)].push(buildOutlinedClone(mergedHouseOutline, 0.038));
  }
  shadowDecals.push(createContactDecal(fx, fz, 4.4, 4.4, 1.0));

  const lanternX = -11.4;
  const lanternZ = -109.8;
  const bracket = new THREE.BoxGeometry(0.45, 0.08, 0.08);
  bracket.translate(lanternX - 0.15, 2.25, lanternZ);
  pushToChunk(chunks, paintTexturedGeometry(bracket, palette.iron, FARM_COLORS.ironRust, 0.12, rng), lanternZ);

  const lanternCage = new THREE.CylinderGeometry(0.16, 0.12, 0.34, 6);
  lanternCage.translate(lanternX, 2.04, lanternZ);
  pushToChunk(chunks, paintTexturedGeometry(lanternCage, palette.iron, FARM_COLORS.ironRust, 0.12, rng), lanternZ);

  addFireFlameMesh(lanternX, 2.04, lanternZ, 0.22, rng);
  lights.push({
    position: new THREE.Vector3(-12, 2.1, -109),
    color: FARM_COLORS.lanternWarm,
    intensity: 1.25,
    distance: 11
  });

  const wx = wellOb.x;
  const wz = wellOb.z;
  anchors.well = new THREE.Vector3(wx, 0, wz);

  const wellParts = [];
  const wellRim = new THREE.CylinderGeometry(1.16, 1.22, 0.88, 12);
  wellRim.translate(wx, 0.44, wz);
  wellParts.push(paintTexturedGeometry(wellRim, FARM_COLORS.marbleShade, palette.moss, 0.18, rng));

  const wellInner = new THREE.CylinderGeometry(0.88, 0.88, 0.9, 10);
  wellInner.translate(wx, 0.46, wz);
  wellParts.push(paintTexturedGeometry(wellInner, FARM_COLORS.waterDark, FARM_COLORS.outline, 0.05, rng));

  for (const side of [-0.95, 0.95]) {
    const wPost = new THREE.BoxGeometry(0.16, 1.65, 0.16);
    wPost.translate(wx + side, 1.65, wz);
    wellParts.push(paintTexturedGeometry(wPost, palette.timber, FARM_COLORS.woodWeathered, 0.15, rng));
  }

  const winch = new THREE.CylinderGeometry(0.09, 0.09, 2.05, 8);
  winch.rotateZ(Math.PI / 2);
  winch.translate(wx, 2.15, wz);
  wellParts.push(paintTexturedGeometry(winch, FARM_COLORS.woodDark, FARM_COLORS.woodWeathered, 0.14, rng));

  const ropeCoil = new THREE.CylinderGeometry(0.15, 0.15, 0.35, 8);
  ropeCoil.rotateZ(Math.PI / 2);
  ropeCoil.translate(wx, 2.15, wz);
  wellParts.push(paintTexturedGeometry(ropeCoil, FARM_COLORS.hayShade, FARM_COLORS.ochreLight, 0.14, rng));

  const ropeDrop = new THREE.CylinderGeometry(0.025, 0.025, 0.85, 5);
  ropeDrop.translate(wx, 1.72, wz);
  wellParts.push(paintTexturedGeometry(ropeDrop, FARM_COLORS.hayShade, FARM_COLORS.ochreLight, 0.12, rng));

  const bucket = new THREE.CylinderGeometry(0.18, 0.14, 0.28, 7);
  bucket.translate(wx, 1.22, wz);
  wellParts.push(paintTexturedGeometry(bucket, FARM_COLORS.woodDark, FARM_COLORS.ironRust, 0.15, rng));

  const wellRoof = new THREE.ConeGeometry(1.35, 0.65, 4);
  wellRoof.rotateY(Math.PI / 4);
  wellRoof.scale(1.05, 1.0, 0.72);
  wellRoof.translate(wx, 2.72, wz);
  wellParts.push(paintTexturedGeometry(wellRoof, FARM_COLORS.terracottaDark, FARM_COLORS.terracottaLit, 0.18, rng));

  const mergedWell = mergeGeometries(wellParts, false);
  pushToChunk(chunks, mergedWell, wz, qCfg.useOutlines ? outlineChunks : null, 0.028);
  shadowDecals.push(createContactDecal(wx, wz, 1.65, 1.65, 0.95));
}