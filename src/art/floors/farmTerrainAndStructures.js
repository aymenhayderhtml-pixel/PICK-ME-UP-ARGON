// src/art/floors/farmTerrainAndStructures.js
// Terrain mesh, choke walls/posts, arrival yard, carts, temple ruin, farmhouse, and stone well for Floor 1.

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { FARM_COLORS } from './farmConfig.js';
import {
  fbm2D,
  clamp,
  smoothstep,
  distanceToPolyline,
  paintTexturedGeometry,
  buildOutlinedClone,
  getChunkIndex,
  pushToChunk,
  createContactDecal
} from './farmMaterials.js';

export function buildTerrainMesh({ layout, seed, palette, qCfg, trackGeo }) {
  const b = layout.bounds || { minX: -46, maxX: 46, minZ: -130, maxZ: 7 };
  const padX = 28;
  const padZ = 24;
  const width = b.maxX - b.minX + padX * 2;
  const depth = b.maxZ - b.minZ + padZ * 2;
  const centerX = (b.minX + b.maxX) * 0.5;
  const centerZ = (b.minZ + b.maxZ) * 0.5;

  const geo = new THREE.PlaneGeometry(width, depth, qCfg.terrainSegX, qCfg.terrainSegZ);
  geo.rotateX(-Math.PI / 2);
  geo.translate(centerX, 0, centerZ);

  const pos = geo.attributes.position;
  const uvs = geo.attributes.uv;
  const count = pos.count;
  const colors = new Float32Array(count * 3);

  const poly = layout.pathPolyline || [
    { x: 0, z: 6 },
    { x: 0, z: -20 },
    { x: 2, z: -55 },
    { x: -2, z: -94 },
    { x: 0, z: -125 }
  ];
  const halfPath = (layout.pathWidth || 4.7) * 0.5;
  const clearings = layout.clearings || [];
  const chokes = layout.chokePoints || [];
  const camps = layout.campSpots || [];
  const templeSpot = camps.find((c) => c.type === 'temple') || { x: 16, z: -75, radius: 9 };
  const farmSpot = camps.find((c) => c.type === 'farm') || { x: -14, z: -112, radius: 5.5 };

  const cRoadCenter = new THREE.Color(FARM_COLORS.ochreLight);
  const cRoadBase = new THREE.Color(FARM_COLORS.ochreBase);
  const cRoadRut = new THREE.Color(FARM_COLORS.ochreRut);
  const cClearing = new THREE.Color(palette.dirt).lerp(new THREE.Color(FARM_COLORS.ochreBase), 0.65);
  const cGrassLight = new THREE.Color(FARM_COLORS.dryGrassLight);
  const cGrassMid = new THREE.Color(FARM_COLORS.dryGrassMid);
  const cGrassOlive = new THREE.Color(FARM_COLORS.dryGrassOlive);
  const cGrassDark = new THREE.Color(FARM_COLORS.dryGrassDark);
  const cStone = new THREE.Color(FARM_COLORS.marbleMid);
  const cTmp = new THREE.Color();
  const cGrassMix = new THREE.Color();
  const cRoadLocal = new THREE.Color();

  for (let i = 0; i < count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    uvs.setXY(i, x * 0.16, z * 0.16);

    const n1 = fbm2D(x * 0.06, z * 0.06, seed);
    const n2 = fbm2D(x * 0.18 + 19.3, z * 0.18 - 7.1, seed + 101);
    const edgeNoise = (n2 - 0.5) * 0.85;

    const roadInfo = distanceToPolyline(x, z, poly);
    const dRoad = roadInfo.dist + edgeNoise * 0.35;

    let roadWeight = 1.0 - smoothstep(halfPath - 0.55, halfPath + 0.65, dRoad);
    for (let c = 0; c < chokes.length; c++) {
      const ch = chokes[c];
      const dz = Math.abs(z - ch.position.z);
      if (dz < 2.5) {
        const halfChoke = ch.width * 0.5;
        const dChoke = Math.abs(x - ch.position.x);
        const chokeMask = 1.0 - smoothstep(halfChoke - 0.25, halfChoke + 0.35, dChoke);
        roadWeight = Math.max(roadWeight * 0.3, chokeMask);
      }
    }

    let clearingWeight = 0;
    for (let c = 0; c < clearings.length; c++) {
      const cl = clearings[c];
      const dCl = Math.hypot(x - cl.center.x, z - cl.center.z) + edgeNoise * 0.9;
      const w = 1.0 - smoothstep(cl.radius - 2.4, cl.radius + 0.8, dCl);
      if (w > clearingWeight) clearingWeight = w;
    }

    const dTemple = Math.hypot(x - templeSpot.x, z - templeSpot.z);
    const templeWeight = 1.0 - smoothstep(templeSpot.radius - 2.5, templeSpot.radius + 1.2, dTemple);

    const dFarm = Math.hypot(x - farmSpot.x, z - farmSpot.z);
    const farmWeight = 1.0 - smoothstep(farmSpot.radius - 1.0, farmSpot.radius + 2.0, dFarm);

    cGrassMix.copy(cGrassMid).lerp(cGrassLight, smoothstep(0.35, 0.75, n1));
    cGrassMix.lerp(cGrassOlive, smoothstep(0.4, 0.8, n2) * 0.65);

    cTmp.copy(cGrassMix).lerp(cClearing, clearingWeight * (0.68 + 0.25 * n2));

    if (templeWeight > 0.01) {
      cTmp.lerp(cStone, templeWeight * 0.55);
    }
    if (farmWeight > 0.01) {
      cTmp.lerp(cRoadRut, farmWeight * 0.45);
    }

    if (roadWeight > 0.001) {
      const rutDist = Math.abs(roadInfo.dist - 1.05);
      const rutFactor = 1.0 - smoothstep(0.08, 0.44, rutDist);
      const centerCrown = 1.0 - smoothstep(0.0, 0.75, roadInfo.dist);

      cRoadLocal.copy(cRoadBase);
      cRoadLocal.lerp(cRoadCenter, centerCrown * 0.65);
      cRoadLocal.lerp(cRoadRut, rutFactor * 0.72);
      cTmp.lerp(cRoadLocal, roadWeight);
    }

    const outX = Math.max(0, Math.abs(x) - (b.maxX - 2));
    const outZMin = Math.max(0, b.minZ + 2 - z);
    const outZMax = Math.max(0, z - (b.maxZ - 1));
    const outDist = Math.sqrt(outX * outX + outZMin * outZMin + outZMax * outZMax);

    let y = (n1 - 0.5) * 0.035 * (1.0 - Math.max(roadWeight, clearingWeight * 0.8));
    if (roadWeight > 0.2) {
      const rutDist = Math.abs(roadInfo.dist - 1.05);
      const rutIndent = (1.0 - smoothstep(0.05, 0.4, rutDist)) * 0.016;
      y -= rutIndent * roadWeight;
    }

    if (outDist > 0) {
      const hillT = smoothstep(0, 26, outDist);
      const hillH = (0.4 + 0.6 * n1 + 0.35 * n2) * hillT * 9.5;
      y += hillH;
      cTmp.lerp(cGrassDark, hillT * 0.45);
    }

    pos.setY(i, y);
    colors[i * 3] = clamp(cTmp.r, 0, 1);
    colors[i * 3 + 1] = clamp(cTmp.g, 0, 1);
    colors[i * 3 + 2] = clamp(cTmp.b, 0, 1);
  }

  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  return trackGeo(geo);
}

export function buildChokeWallsAndPosts({
  layout,
  palette,
  chokePosts,
  chunks,
  outlineChunks,
  shadowDecals,
  fenceInstances,
  rng,
  qCfg
}) {
  const chokes = layout.chokePoints || [];
  const b = layout.bounds || { minX: -46, maxX: 46 };

  for (let i = 0; i < chokePosts.length; i++) {
    const ob = chokePosts[i];
    const r = ob.radius || 0.8;

    const baseGeo = new THREE.CylinderGeometry(r * 0.82, r * 0.96, 1.45, 8);
    baseGeo.translate(ob.x, 0.725, ob.z);
    pushToChunk(
      chunks,
      paintTexturedGeometry(baseGeo, FARM_COLORS.marbleShade, FARM_COLORS.plasterWarm, 0.16, rng),
      ob.z,
      qCfg.useOutlines ? outlineChunks : null,
      0.03
    );

    const capGeo = new THREE.BoxGeometry(r * 1.75, 0.18, r * 1.75);
    capGeo.translate(ob.x, 1.5, ob.z);
    pushToChunk(
      chunks,
      paintTexturedGeometry(capGeo, palette.moss, FARM_COLORS.marbleLit, 0.18, rng),
      ob.z
    );

    const timberGeo = new THREE.BoxGeometry(0.46, 1.1, 0.46);
    timberGeo.translate(ob.x, 1.95, ob.z);
    pushToChunk(
      chunks,
      paintTexturedGeometry(timberGeo, FARM_COLORS.woodDark, FARM_COLORS.woodWeathered, 0.15, rng),
      ob.z,
      qCfg.useOutlines ? outlineChunks : null,
      0.025
    );

    const strapGeo = new THREE.BoxGeometry(0.52, 0.1, 0.52);
    strapGeo.translate(ob.x, 2.2, ob.z);
    pushToChunk(
      chunks,
      paintTexturedGeometry(strapGeo, palette.iron, FARM_COLORS.ironRust, 0.12, rng),
      ob.z
    );

    shadowDecals.push(createContactDecal(ob.x, ob.z, r * 1.35, r * 1.35, 1.0));
  }

  for (let c = 0; c < chokes.length; c++) {
    const ch = chokes[c];
    const z = ch.position.z;

    for (const side of [-1, 1]) {
      const startX = side * 2.55;
      const endX = side * (b.maxX - 3);
      const span = Math.abs(endX - startX);
      const wallSegments = 7;
      const segLen = span / wallSegments;

      for (let s = 0; s < wallSegments; s++) {
        const t0 = s / wallSegments;
        const fadeHeight = 1.0 - smoothstep(0.55, 1.0, t0) * 0.45;
        const xCenter = startX + side * (s + 0.5) * segLen;
        const zWave = z + Math.sin(s * 1.3 + c) * 0.35;
        const h = (0.78 + (rng() - 0.5) * 0.14) * fadeHeight;

        if (s < 5) {
          const wallGeo = new THREE.BoxGeometry(segLen * 0.96, h, 0.72);
          wallGeo.rotateY((rng() - 0.5) * 0.06);
          wallGeo.translate(xCenter, h * 0.5, zWave);
          const topColor = rng() > 0.45 ? FARM_COLORS.marbleLit : palette.moss;
          pushToChunk(
            chunks,
            paintTexturedGeometry(wallGeo, FARM_COLORS.marbleShade, topColor, 0.16, rng),
            zWave
          );
          shadowDecals.push(createContactDecal(xCenter, zWave, segLen * 0.52, 0.65, 0.7));
        }

        const postCount = 2;
        for (let p = 0; p < postCount; p++) {
          const px = startX + side * (s * segLen + (p + 0.5) * (segLen / postCount));
          const pz = zWave + (rng() - 0.5) * 0.15;
          fenceInstances.push({
            x: px,
            y: 0,
            z: pz,
            rotY: (rng() - 0.5) * 0.18,
            rotZ: (rng() - 0.5) * 0.12,
            scaleY: 0.85 + rng() * 0.25,
            hasRails: p === 0,
            railLen: segLen * 0.52 * side
          });
        }
      }
    }
  }
}

export function buildClearing0ArrivalYard({ anchors, palette, chunks, shadowDecals, rng }) {
  const signX = -9.5;
  const signZ = -2.5;
  anchors.arrivalSignpost = new THREE.Vector3(signX, 0, signZ);

  const postGeo = new THREE.CylinderGeometry(0.11, 0.14, 2.25, 7);
  postGeo.rotateZ(0.04);
  postGeo.translate(signX, 1.12, signZ);
  pushToChunk(
    chunks,
    paintTexturedGeometry(postGeo, FARM_COLORS.woodDark, FARM_COLORS.woodWeathered, 0.16, rng),
    signZ
  );

  const boardGeo = new THREE.BoxGeometry(1.15, 0.34, 0.08);
  boardGeo.rotateY(0.35);
  boardGeo.translate(signX + 0.35, 1.85, signZ + 0.12);
  pushToChunk(
    chunks,
    paintTexturedGeometry(boardGeo, FARM_COLORS.woodWeathered, FARM_COLORS.ochreLight, 0.15, rng),
    signZ
  );

  const hitchX = 9.8;
  const hitchZ = -1.5;
  for (const dx of [-0.9, 0.9]) {
    const hp = new THREE.CylinderGeometry(0.09, 0.11, 1.25, 6);
    hp.translate(hitchX + dx, 0.62, hitchZ);
    pushToChunk(
      chunks,
      paintTexturedGeometry(hp, FARM_COLORS.woodDark, FARM_COLORS.woodWeathered, 0.14, rng),
      hitchZ
    );
  }
  const bar = new THREE.CylinderGeometry(0.06, 0.06, 2.1, 6);
  bar.rotateZ(Math.PI / 2);
  bar.translate(hitchX, 1.08, hitchZ);
  pushToChunk(
    chunks,
    paintTexturedGeometry(bar, FARM_COLORS.woodWeathered, FARM_COLORS.ochreLight, 0.14, rng),
    hitchZ
  );

  const trough = new THREE.BoxGeometry(1.4, 0.45, 0.65);
  trough.translate(hitchX, 0.225, hitchZ + 0.65);
  pushToChunk(
    chunks,
    paintTexturedGeometry(trough, FARM_COLORS.marbleShade, palette.moss, 0.16, rng),
    hitchZ
  );
  shadowDecals.push(createContactDecal(signX, signZ, 0.7, 0.7, 0.8));
  shadowDecals.push(createContactDecal(hitchX, hitchZ + 0.3, 1.4, 1.1, 0.85));

  for (let i = 0; i < 12; i++) {
    const angle = (i / 12) * Math.PI * 2 + rng() * 0.4;
    const rad = 3.2 + rng() * 6.5;
    const sx = Math.cos(angle) * rad;
    const sz = Math.sin(angle) * rad - 1.0;
    const cobble = new THREE.CylinderGeometry(0.32 + rng() * 0.25, 0.38 + rng() * 0.25, 0.035, 6);
    cobble.rotateY(rng() * Math.PI);
    cobble.translate(sx, 0.015, sz);
    pushToChunk(
      chunks,
      paintTexturedGeometry(cobble, FARM_COLORS.marbleShade, FARM_COLORS.marbleMid, 0.1, rng),
      sz
    );
  }
}

export function buildCartAndPloughLandmark({ x, z, rotY, palette, chunks, shadowDecals, rng }) {
  const cartGroup = [];
  const bed = new THREE.BoxGeometry(1.65, 0.16, 2.3);
  bed.translate(0, 0.68, 0);
  cartGroup.push(paintTexturedGeometry(bed, FARM_COLORS.woodDark, FARM_COLORS.woodWeathered, 0.16, rng));

  for (const side of [-1, 1]) {
    const rail = new THREE.BoxGeometry(0.1, 0.48, 2.2);
    if (side === 1) rail.rotateZ(-0.22);
    rail.translate(side * 0.78, 0.96, 0);
    cartGroup.push(paintTexturedGeometry(rail, FARM_COLORS.woodWeathered, FARM_COLORS.ochreLight, 0.15, rng));
  }

  for (const side of [-0.48, 0.48]) {
    const shaft = new THREE.CylinderGeometry(0.05, 0.06, 1.8, 6);
    shaft.rotateX(Math.PI / 2 + 0.28);
    shaft.translate(side, 0.42, 1.85);
    cartGroup.push(paintTexturedGeometry(shaft, FARM_COLORS.woodDark, FARM_COLORS.woodWeathered, 0.14, rng));
  }

  for (const side of [-1, 1]) {
    const wheelRing = new THREE.TorusGeometry(0.58, 0.07, 6, 12);
    wheelRing.rotateY(Math.PI / 2);
    if (side === -1) {
      wheelRing.rotateZ(0.35);
      wheelRing.translate(side * 0.95, 0.52, -0.1);
    } else {
      wheelRing.translate(side * 0.88, 0.58, -0.1);
    }
    cartGroup.push(paintTexturedGeometry(wheelRing, FARM_COLORS.ironRust, FARM_COLORS.woodWeathered, 0.15, rng));
  }

  const ploughBeam = new THREE.CylinderGeometry(0.06, 0.08, 1.9, 6);
  ploughBeam.rotateZ(0.65);
  ploughBeam.translate(-1.35, 0.45, 0.6);
  cartGroup.push(paintTexturedGeometry(ploughBeam, FARM_COLORS.woodDark, FARM_COLORS.woodWeathered, 0.15, rng));

  const ploughShare = new THREE.ConeGeometry(0.28, 0.65, 4);
  ploughShare.rotateX(Math.PI / 2);
  ploughShare.translate(-1.75, 0.18, 0.7);
  cartGroup.push(paintTexturedGeometry(ploughShare, palette.iron, FARM_COLORS.ironRust, 0.18, rng));

  const merged = mergeGeometries(cartGroup, false);
  merged.rotateY(rotY);
  merged.translate(x, 0, z);
  pushToChunk(chunks, merged, z);
  shadowDecals.push(createContactDecal(x, z, 1.8, 2.1, 0.9));
}

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