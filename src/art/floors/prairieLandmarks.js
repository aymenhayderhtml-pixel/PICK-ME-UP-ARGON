import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import {
  DEFAULT_LAYOUT,
  OUTLINE_COLOR,
  MOSS_COLOR,
  ASH_COLOR,
} from './prairieConfig.js';
import {
  createRng,
  normalizeGeometry,
  createInvertedOutlineGeometry,
  getChunkIndex,
  createSculptedRockGeometry,
  createContactDecalGeometry,
} from './prairieHelpers.js';
import { addDryStoneWallSegment } from './prairieStructures.js';

export function buildAncientRuins(
  campSpot,
  layout,
  seed,
  palette,
  cfg,
  stoneChunks,
  propChunks,
  flagInstances,
  emberSources,
  lights,
  anchors
) {
  const rng = createRng(seed ^ 0x7712b9);
  const cx = campSpot.x;
  const cz = campSpot.z;
  const rad = campSpot.radius || 7.5;
  const cIdx = getChunkIndex(cz);

  anchors.ruinCenter = new THREE.Vector3(cx, 0, cz);

  const slabCount = 22;
  for (let i = 0; i < slabCount; i++) {
    const a = (i / slabCount) * Math.PI * 2 + rng() * 0.35;
    const d = 1.6 + rng() * (rad - 2.1);
    const sx = cx + Math.cos(a) * d;
    const sz = cz + Math.sin(a) * d;
    const sw = 0.9 + rng() * 1.3;
    const sd = 0.8 + rng() * 1.2;
    const sh = 0.038;
    const slab = new THREE.BoxGeometry(sw, sh, sd);
    slab.rotateY(rng() * Math.PI);
    slab.translate(sx, sh * 0.5, sz);
    stoneChunks[cIdx].push(
      normalizeGeometry(slab, i % 2 === 0 ? palette.stoneRuin : palette.rockBase, {
        mossColor: MOSS_COLOR,
        mossStrength: 0.75,
        bottomAO: 0.1,
        variation: 0.06,
      })
    );
  }

  const centerPlinth1 = new THREE.CylinderGeometry(2.85, 3.15, 0.42, 8);
  centerPlinth1.translate(cx, 0.21, cz);
  stoneChunks[cIdx].push(
    normalizeGeometry(centerPlinth1, palette.stoneRuin, {
      mossColor: MOSS_COLOR,
      mossStrength: 0.78,
      bottomAO: 0.35,
    })
  );

  const centerPlinth2 = new THREE.CylinderGeometry(1.95, 2.25, 0.48, 8);
  centerPlinth2.translate(cx, 0.66, cz);
  stoneChunks[cIdx].push(
    normalizeGeometry(centerPlinth2, palette.rockHighlight, {
      mossColor: MOSS_COLOR,
      mossStrength: 0.65,
      bottomAO: 0.25,
    })
  );

  const obeliskH = 2.85;
  const obelisk = new THREE.CylinderGeometry(0.55, 0.92, obeliskH, 6);
  obelisk.rotateZ(0.06);
  obelisk.translate(cx, 0.9 + obeliskH * 0.5, cz);
  stoneChunks[cIdx].push(
    normalizeGeometry(obelisk, palette.stoneRuin, {
      mossColor: MOSS_COLOR,
      mossStrength: 0.85,
      bottomAO: 0.35,
      aoHeight: 1.5,
    })
  );
  propChunks[cIdx].push(createInvertedOutlineGeometry(obelisk, 0.036, OUTLINE_COLOR));

  const fallenTop = new THREE.CylinderGeometry(0.32, 0.54, 1.45, 6);
  fallenTop.rotateZ(Math.PI * 0.44);
  fallenTop.rotateY(0.75);
  fallenTop.translate(cx + 1.45, 0.52, cz + 0.95);
  stoneChunks[cIdx].push(
    normalizeGeometry(fallenTop, palette.rockBase, {
      mossColor: MOSS_COLOR,
      mossStrength: 0.88,
      bottomAO: 0.3,
    })
  );

  const pillarAngles = [0.2, 1.05, 1.92, 2.75, 3.85, 4.75, 5.55];
  const pillarHeights = [3.6, 3.6, 2.1, 1.45, 3.1, 1.75, 2.55];
  const ringR = rad - 1.05;

  for (let i = 0; i < pillarAngles.length; i++) {
    const ang = pillarAngles[i];
    const px = cx + Math.cos(ang) * ringR;
    const pz = cz + Math.sin(ang) * ringR;
    const ph = pillarHeights[i];

    const base = new THREE.BoxGeometry(1.12, 0.36, 1.12);
    base.rotateY(ang);
    base.translate(px, 0.18, pz);
    stoneChunks[cIdx].push(
      normalizeGeometry(base, palette.rockBase, {
        mossColor: MOSS_COLOR,
        mossStrength: 0.7,
        bottomAO: 0.35,
      })
    );

    const shaft = new THREE.CylinderGeometry(0.38, 0.44, ph, 8);
    shaft.translate(px, 0.36 + ph * 0.5, pz);
    stoneChunks[cIdx].push(
      normalizeGeometry(shaft, palette.stoneRuin, {
        mossColor: MOSS_COLOR,
        mossStrength: 0.72,
        bottomAO: 0.32,
        aoHeight: 1.2,
      })
    );
    if (ph >= 2.5) {
      propChunks[cIdx].push(createInvertedOutlineGeometry(shaft, 0.032, OUTLINE_COLOR));
    }

    if (ph >= 3.0) {
      const cap = new THREE.BoxGeometry(1.06, 0.32, 1.06);
      cap.rotateY(ang);
      cap.translate(px, 0.36 + ph + 0.16, pz);
      stoneChunks[cIdx].push(
        normalizeGeometry(cap, palette.rockHighlight, {
          mossColor: MOSS_COLOR,
          mossStrength: 0.85,
          bottomAO: 0.15,
        })
      );
    }

    propChunks[cIdx].push(createContactDecalGeometry(px, pz, 0.88, 0.88, ang));

    if (i < pillarAngles.length - 1 && i !== 2 && i !== 5) {
      const nextAng = pillarAngles[i + 1];
      const nx = cx + Math.cos(nextAng) * ringR;
      const nz = cz + Math.sin(nextAng) * ringR;
      addDryStoneWallSegment(px, pz, nx, nz, seed + 300 + i * 19, palette, stoneChunks, propChunks);
    }
  }

  const p0x = cx + Math.cos(pillarAngles[0]) * ringR;
  const p0z = cz + Math.sin(pillarAngles[0]) * ringR;
  const p1x = cx + Math.cos(pillarAngles[1]) * ringR;
  const p1z = cz + Math.sin(pillarAngles[1]) * ringR;
  const lintelLen = Math.hypot(p1x - p0x, p1z - p0z) + 0.85;
  const lintelAng = Math.atan2(p1x - p0x, p1z - p0z);
  const lintel = new THREE.BoxGeometry(0.82, 0.52, lintelLen);
  lintel.rotateY(lintelAng);
  lintel.translate((p0x + p1x) * 0.5, 0.36 + 3.6 + 0.52, (p0z + p1z) * 0.5);
  stoneChunks[cIdx].push(
    normalizeGeometry(lintel, palette.stoneRuin, {
      mossColor: MOSS_COLOR,
      mossStrength: 0.9,
      bottomAO: 0.22,
    })
  );
  propChunks[cIdx].push(createInvertedOutlineGeometry(lintel, 0.032, OUTLINE_COLOR));

  const brazierX = cx - rad + 1.65;
  const brazierZ = cz + 0.6;
  const bPedestal = new THREE.CylinderGeometry(0.45, 0.62, 1.15, 7);
  bPedestal.translate(brazierX, 0.575, brazierZ);
  stoneChunks[cIdx].push(
    normalizeGeometry(bPedestal, palette.rockCrevice, {
      mossColor: MOSS_COLOR,
      mossStrength: 0.45,
      bottomAO: 0.35,
    })
  );
  const bBowl = new THREE.CylinderGeometry(0.68, 0.38, 0.36, 7);
  bBowl.translate(brazierX, 1.28, brazierZ);
  propChunks[cIdx].push(normalizeGeometry(bBowl, palette.woodDark, { bottomAO: 0.2 }));

  const lightPos = new THREE.Vector3(brazierX, 1.65, brazierZ);
  lights.push({ position: lightPos, color: 0xffaa4c, intensity: 1.9, distance: 14 });
  anchors.torches.push(lightPos);
  emberSources.push({ x: brazierX, y: 1.46, z: brazierZ, radius: 0.32, count: 14 });

  flagInstances.push({
    x: p0x - 0.42,
    y: 3.3,
    z: p0z,
    sx: 0.95,
    sy: 1.15,
    sz: 0.95,
    rotY: -0.4,
  });
}

export function buildGoblinCampsite(
  campSpot,
  layout,
  seed,
  palette,
  cfg,
  stoneChunks,
  propChunks,
  flagInstances,
  emberSources,
  lights,
  anchors
) {
  const rng = createRng(seed ^ 0x5581e2);
  const cx = campSpot.x;
  const cz = campSpot.z;
  const rad = campSpot.radius || 5.5;
  const cIdx = getChunkIndex(cz);

  anchors.goblinCamp = new THREE.Vector3(cx, 0, cz);

  const ashDisc = new THREE.CircleGeometry(1.45, 14);
  ashDisc.rotateX(-Math.PI / 2);
  ashDisc.translate(cx, 0.016, cz);
  propChunks[cIdx].push(normalizeGeometry(ashDisc, ASH_COLOR, { bottomAO: 0, variation: 0.05 }));

  const ringStones = 11;
  for (let i = 0; i < ringStones; i++) {
    const a = (i / ringStones) * Math.PI * 2 + rng() * 0.15;
    const rx = cx + Math.cos(a) * 1.05;
    const rz = cz + Math.sin(a) * 1.05;
    const st = createSculptedRockGeometry(0.32 + rng() * 0.1, 0.28 + rng() * 0.12, 1, seed + 500 + i);
    st.rotateY(a);
    st.translate(rx, 0, rz);
    stoneChunks[cIdx].push(
      normalizeGeometry(st, i % 2 === 0 ? palette.rockCrevice : palette.rockBase, {
        bottomAO: 0.4,
      })
    );
  }

  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 + 0.3;
    const log = new THREE.CylinderGeometry(0.09, 0.11, 1.35, 6);
    log.rotateZ(Math.PI * 0.38);
    log.rotateY(a);
    log.translate(cx + Math.cos(a) * 0.25, 0.22, cz + Math.sin(a) * 0.25);
    propChunks[cIdx].push(normalizeGeometry(log, palette.woodDark, { bottomAO: 0.35 }));
  }

  const spitY = 1.08;
  const forkL = new THREE.CylinderGeometry(0.05, 0.07, 1.25, 5);
  forkL.rotateZ(0.08);
  forkL.translate(cx - 1.15, 0.6, cz - 0.15);
  const forkR = new THREE.CylinderGeometry(0.05, 0.07, 1.25, 5);
  forkR.rotateZ(-0.08);
  forkR.translate(cx + 1.15, 0.6, cz + 0.15);
  const crossbar = new THREE.CylinderGeometry(0.035, 0.035, 2.55, 5);
  crossbar.rotateZ(Math.PI * 0.5);
  crossbar.rotateY(-0.13);
  crossbar.translate(cx, spitY, cz);
  propChunks[cIdx].push(normalizeGeometry(forkL, palette.woodLight, { bottomAO: 0.25 }));
  propChunks[cIdx].push(normalizeGeometry(forkR, palette.woodLight, { bottomAO: 0.25 }));
  propChunks[cIdx].push(normalizeGeometry(crossbar, palette.woodDark, { bottomAO: 0.1 }));

  const fireLightPos = new THREE.Vector3(cx, 0.85, cz);
  lights.push({ position: fireLightPos, color: 0xff7b29, intensity: 2.5, distance: 18 });
  anchors.torches.push(fireLightPos);
  emberSources.push({ x: cx, y: 0.25, z: cz, radius: 0.58, count: 28 });

  const bedrollSpecs = [
    { dx: 0.4, dz: -2.65, rot: 0.22 },
    { dx: 2.55, dz: -0.85, rot: -1.18 },
    { dx: 1.15, dz: 2.45, rot: 2.75 },
  ];

  for (let i = 0; i < bedrollSpecs.length; i++) {
    const b = bedrollSpecs[i];
    const bx = cx + b.dx;
    const bz = cz + b.dz;

    const matGeom = new THREE.BoxGeometry(1.12, 0.08, 1.92, 2, 1, 3).toNonIndexed();
    const pos = matGeom.attributes.position;
    for (let k = 0; k < pos.count; k++) {
      const vx = pos.getX(k);
      const vy = pos.getY(k) + 0.04;
      const vz = pos.getZ(k);
      const wave = Math.sin(vz * 2.5 + vx * 3.0) * 0.015;
      pos.setXYZ(k, vx, Math.max(0.005, vy + wave), vz);
    }
    matGeom.rotateY(b.rot);
    matGeom.translate(bx, 0, bz);
    matGeom.computeVertexNormals();
    propChunks[cIdx].push(
      normalizeGeometry(matGeom, palette.furBedroll, {
        bottomAO: 0.28,
        variation: 0.08,
      })
    );

    const pillow = new THREE.CylinderGeometry(0.16, 0.16, 0.98, 7);
    pillow.rotateZ(Math.PI * 0.5);
    pillow.rotateY(b.rot);
    pillow.translate(
      bx - Math.sin(b.rot) * 0.72,
      0.14,
      bz - Math.cos(b.rot) * 0.72
    );
    propChunks[cIdx].push(
      normalizeGeometry(pillow, palette.woodLight, {
        bottomAO: 0.2,
        variation: 0.06,
      })
    );
  }

  const tentX = cx - 3.35;
  const tentZ = cz - 0.35;
  const tentRot = 1.35;
  const doorH = 2.15;
  const tentW = 2.8;
  const tentD = 2.5;

  const poleFrontL = new THREE.CylinderGeometry(0.06, 0.08, doorH + 0.2, 6);
  poleFrontL.translate(-tentW * 0.45, (doorH + 0.2) * 0.5, tentD * 0.42);
  const poleFrontR = new THREE.CylinderGeometry(0.06, 0.08, doorH + 0.2, 6);
  poleFrontR.translate(tentW * 0.45, (doorH + 0.2) * 0.5, tentD * 0.42);
  const ridgePole = new THREE.CylinderGeometry(0.055, 0.055, tentW * 1.12, 6);
  ridgePole.rotateZ(Math.PI * 0.5);
  ridgePole.translate(0, doorH + 0.08, tentD * 0.42);

  const canopySlopeLen = Math.hypot(tentD, doorH - 0.35);
  const canopySlopeAng = Math.atan2(doorH - 0.35, tentD);
  const canopyHide = new THREE.BoxGeometry(tentW * 1.04, 0.07, canopySlopeLen);
  canopyHide.rotateX(canopySlopeAng);
  canopyHide.translate(0, (doorH + 0.35) * 0.5, -0.05);

  const tentParts = [poleFrontL, poleFrontR, ridgePole, canopyHide];
  for (let t = 0; t < tentParts.length; t++) {
    const g = tentParts[t];
    g.rotateY(tentRot);
    g.translate(tentX, 0, tentZ);
    const col = t === 3 ? palette.furBedroll : palette.woodDark;
    propChunks[cIdx].push(
      normalizeGeometry(g, col, {
        bottomAO: 0.28,
        variation: 0.07,
      })
    );
    if (t === 3) {
      propChunks[cIdx].push(createInvertedOutlineGeometry(g, 0.028, OUTLINE_COLOR));
    }
  }

  const totemX = cx - 2.15;
  const totemZ = cz + 2.85;
  const totemPole = new THREE.CylinderGeometry(0.07, 0.1, 2.65, 6);
  totemPole.rotateZ(-0.08);
  totemPole.translate(totemX, 1.32, totemZ);
  propChunks[cIdx].push(normalizeGeometry(totemPole, palette.woodDark, { bottomAO: 0.3 }));

  const totemSkull = new THREE.IcosahedronGeometry(0.28, 1);
  totemSkull.scale(0.85, 1.1, 1.25);
  totemSkull.translate(totemX + 0.08, 2.68, totemZ);
  propChunks[cIdx].push(normalizeGeometry(totemSkull, palette.boneIvory, { bottomAO: 0.2 }));

  const hornL = new THREE.ConeGeometry(0.07, 0.48, 5);
  hornL.rotateZ(-0.95);
  hornL.translate(totemX - 0.18, 2.82, totemZ + 0.08);
  const hornR = new THREE.ConeGeometry(0.07, 0.48, 5);
  hornR.rotateZ(0.95);
  hornR.translate(totemX + 0.34, 2.82, totemZ - 0.08);
  propChunks[cIdx].push(normalizeGeometry(hornL, palette.boneIvory, { bottomAO: 0.15 }));
  propChunks[cIdx].push(normalizeGeometry(hornR, palette.boneIvory, { bottomAO: 0.15 }));

  flagInstances.push({
    x: totemX + 0.05,
    y: 2.1,
    z: totemZ,
    sx: 0.9,
    sy: 1.05,
    sz: 0.9,
    rotY: 0.65,
  });

  const boneCount = 14;
  for (let i = 0; i < boneCount; i++) {
    const a = (i / boneCount) * Math.PI * 2 + rng() * 0.45;
    const d = 1.65 + rng() * (rad - 2.1);
    const bx = cx + Math.cos(a) * d;
    const bz = cz + Math.sin(a) * d;

    if (i % 4 === 0) {
      const skull = new THREE.IcosahedronGeometry(0.22, 1);
      skull.scale(0.9, 0.82, 1.25);
      skull.rotateY(rng() * Math.PI * 2);
      skull.translate(bx, 0.14, bz);
      propChunks[cIdx].push(
        normalizeGeometry(skull, palette.boneIvory, {
          bottomAO: 0.35,
          aoHeight: 0.25,
          variation: 0.05,
        })
      );
    } else {
      const len = 0.42 + rng() * 0.45;
      const shaft = new THREE.CylinderGeometry(0.04, 0.045, len, 5);
      shaft.rotateZ(Math.PI * 0.48);
      shaft.rotateY(rng() * Math.PI * 2);
      shaft.translate(bx, 0.045, bz);
      propChunks[cIdx].push(
        normalizeGeometry(shaft, palette.boneIvory, {
          bottomAO: 0.3,
          aoHeight: 0.12,
          variation: 0.05,
        })
      );
    }
  }
}

export function buildGates(
  layout,
  palette,
  stoneChunks,
  propChunks,
  flagInstances,
  emberSources,
  lights,
  anchors
) {
  const ent = layout.entranceBarrier || DEFAULT_LAYOUT.entranceBarrier;
  const ex = layout.exitGate || DEFAULT_LAYOUT.exitGate;
  const pathW = layout.pathWidth || 5.8;

  anchors.entranceGate = new THREE.Vector3(ent.position.x, 0, ent.position.z);
  anchors.exitGate = new THREE.Vector3(ex.position.x, 0, ex.position.z);

  const entChunk = getChunkIndex(ent.position.z);
  const entHalfRoad = pathW * 0.5 + 0.25;
  const entTotalHalf = (ent.width || 14) * 0.5;
  const postH = 2.75;

  const entPostsX = [-entHalfRoad, entHalfRoad, -entTotalHalf, entTotalHalf];
  for (let i = 0; i < entPostsX.length; i++) {
    const px = ent.position.x + entPostsX[i];
    const pz = ent.position.z;
    const isMain = i < 2;
    const ph = isMain ? postH : 1.65;
    const pr = isMain ? 0.24 : 0.16;

    const plinth = new THREE.CylinderGeometry(pr * 1.55, pr * 1.85, 0.38, 7);
    plinth.translate(px, 0.19, pz);
    stoneChunks[entChunk].push(
      normalizeGeometry(plinth, palette.rockBase, {
        mossColor: MOSS_COLOR,
        mossStrength: 0.55,
        bottomAO: 0.35,
      })
    );

    const post = new THREE.BoxGeometry(pr * 2, ph, pr * 2);
    post.translate(px, ph * 0.5 + 0.2, pz);
    propChunks[entChunk].push(
      normalizeGeometry(post, isMain ? palette.woodDark : palette.woodWeathered, {
        mossColor: MOSS_COLOR,
        mossStrength: 0.3,
        bottomAO: 0.3,
        aoHeight: 1.0,
      })
    );
    if (isMain) {
      propChunks[entChunk].push(createInvertedOutlineGeometry(post, 0.03, OUTLINE_COLOR));
    }
  }

  const lintelW = entHalfRoad * 2 + 1.35;
  const entLintel = new THREE.BoxGeometry(lintelW, 0.34, 0.42);
  entLintel.translate(ent.position.x, postH + 0.22, ent.position.z);
  propChunks[entChunk].push(
    normalizeGeometry(entLintel, palette.woodLight, {
      mossColor: MOSS_COLOR,
      mossStrength: 0.65,
      bottomAO: 0.18,
    })
  );
  propChunks[entChunk].push(createInvertedOutlineGeometry(entLintel, 0.03, OUTLINE_COLOR));

  const entSubBeam = new THREE.BoxGeometry(lintelW - 0.5, 0.2, 0.28);
  entSubBeam.translate(ent.position.x, postH - 0.18, ent.position.z);
  propChunks[entChunk].push(normalizeGeometry(entSubBeam, palette.woodDark, { bottomAO: 0.15 }));

  for (const side of [-1, 1]) {
    const xInner = ent.position.x + side * entHalfRoad;
    const xOuter = ent.position.x + side * entTotalHalf;
    const wingLen = Math.abs(xOuter - xInner);
    const wingMidX = (xInner + xOuter) * 0.5;

    for (const rh of [0.52, 1.02, 1.44]) {
      const rail = new THREE.BoxGeometry(wingLen, 0.12, 0.1);
      rail.translate(wingMidX, rh, ent.position.z);
      propChunks[entChunk].push(
        normalizeGeometry(rail, palette.woodWeathered, {
          mossColor: MOSS_COLOR,
          mossStrength: 0.35,
          bottomAO: 0.12,
        })
      );
    }

    const torchX = xInner + side * 0.05;
    const torchZ = ent.position.z - 0.34;
    const sconce = new THREE.CylinderGeometry(0.12, 0.06, 0.38, 6);
    sconce.rotateX(-0.25);
    sconce.translate(torchX, 2.05, torchZ);
    propChunks[entChunk].push(normalizeGeometry(sconce, palette.woodDark, { bottomAO: 0.2 }));

    const tPos = new THREE.Vector3(torchX, 2.28, torchZ - 0.05);
    lights.push({ position: tPos, color: 0xffa84a, intensity: 1.75, distance: 13 });
    anchors.torches.push(tPos);
    emberSources.push({ x: tPos.x, y: tPos.y, z: tPos.z, radius: 0.14, count: 8 });

    flagInstances.push({
      x: xInner - side * 0.18,
      y: postH - 0.2,
      z: ent.position.z - 0.22,
      sx: 0.85,
      sy: 1.05,
      sz: 0.85,
      rotY: side * 0.2,
    });
  }

  const exChunk = getChunkIndex(ex.position.z);
  const exHalfW = (ex.width || 4.0) * 0.5;
  const exPostH = 2.85;

  for (const side of [-1, 1]) {
    const px = ex.position.x + side * (exHalfW + 0.26);
    const pz = ex.position.z;

    const plinth = new THREE.BoxGeometry(0.96, 0.55, 0.96);
    plinth.translate(px, 0.275, pz);
    stoneChunks[exChunk].push(
      normalizeGeometry(plinth, palette.stoneRuin, {
        mossColor: MOSS_COLOR,
        mossStrength: 0.65,
        bottomAO: 0.38,
      })
    );

    const post = new THREE.BoxGeometry(0.46, exPostH, 0.46);
    post.translate(px, exPostH * 0.5 + 0.4, pz);
    propChunks[exChunk].push(
      normalizeGeometry(post, palette.woodDark, {
        mossColor: MOSS_COLOR,
        mossStrength: 0.4,
        bottomAO: 0.3,
        aoHeight: 1.2,
      })
    );
    propChunks[exChunk].push(createInvertedOutlineGeometry(post, 0.032, OUTLINE_COLOR));

    const buttress = new THREE.BoxGeometry(0.95, 1.15, 0.55);
    buttress.translate(px + side * 0.55, 0.575, pz);
    stoneChunks[exChunk].push(
      normalizeGeometry(buttress, palette.rockBase, {
        mossColor: MOSS_COLOR,
        mossStrength: 0.75,
        bottomAO: 0.35,
      })
    );

    const torchX = px - side * 0.12;
    const torchZ = pz + 0.35;
    const sconce = new THREE.CylinderGeometry(0.13, 0.06, 0.4, 6);
    sconce.rotateX(0.25);
    sconce.translate(torchX, 2.15, torchZ);
    propChunks[exChunk].push(normalizeGeometry(sconce, palette.woodDark, { bottomAO: 0.2 }));

    const tPos = new THREE.Vector3(torchX, 2.38, torchZ + 0.06);
    if (side === -1) {
      lights.push({
        position: new THREE.Vector3(ex.position.x, 2.38, pz + 0.4),
        color: 0xffa84a,
        intensity: 2.0,
        distance: 15,
      });
    }
    anchors.torches.push(tPos);
    emberSources.push({ x: tPos.x, y: tPos.y, z: tPos.z, radius: 0.14, count: 8 });

    flagInstances.push({
      x: px + side * 0.25,
      y: exPostH + 0.1,
      z: pz + 0.22,
      sx: 0.95,
      sy: 1.2,
      sz: 0.95,
      rotY: -side * 0.25,
    });
  }

  const exLintelW = exHalfW * 2 + 1.85;
  const exLintel = new THREE.BoxGeometry(exLintelW, 0.42, 0.56);
  exLintel.translate(ex.position.x, exPostH + 0.48, ex.position.z);
  propChunks[exChunk].push(
    normalizeGeometry(exLintel, palette.woodLight, {
      mossColor: MOSS_COLOR,
      mossStrength: 0.72,
      bottomAO: 0.2,
    })
  );
  propChunks[exChunk].push(createInvertedOutlineGeometry(exLintel, 0.032, OUTLINE_COLOR));

  const exCapStone = new THREE.BoxGeometry(exLintelW - 0.4, 0.26, 0.46);
  exCapStone.translate(ex.position.x, exPostH + 0.82, ex.position.z);
  stoneChunks[exChunk].push(
    normalizeGeometry(exCapStone, palette.stoneRuin, {
      mossColor: MOSS_COLOR,
      mossStrength: 0.85,
      bottomAO: 0.15,
    })
  );
}

export function createGateDoorLeafMesh(leafWidth, height, isLeft, palette, material) {
  const parts = [];
  const sign = isLeft ? 1 : -1;
  const midX = sign * (leafWidth * 0.5);

  const railBottom = new THREE.BoxGeometry(leafWidth, 0.14, 0.12);
  railBottom.translate(midX, 0.32, 0);
  const railMid = new THREE.BoxGeometry(leafWidth, 0.14, 0.12);
  railMid.translate(midX, height * 0.52, 0);
  const railTop = new THREE.BoxGeometry(leafWidth, 0.15, 0.12);
  railTop.translate(midX, height - 0.18, 0);
  parts.push(
    normalizeGeometry(railBottom, palette.woodDark, { bottomAO: 0.2 }),
    normalizeGeometry(railMid, palette.woodDark, { bottomAO: 0.15 }),
    normalizeGeometry(railTop, palette.woodDark, { bottomAO: 0.1 })
  );

  const diagLen = Math.hypot(leafWidth * 0.9, height - 0.55);
  const diagAng = Math.atan2(height - 0.55, leafWidth * 0.9) * sign;
  const brace = new THREE.BoxGeometry(diagLen, 0.11, 0.1);
  brace.rotateZ(diagAng);
  brace.translate(midX, height * 0.52, 0);
  parts.push(normalizeGeometry(brace, palette.woodWeathered, { bottomAO: 0.15 }));

  const slatCount = Math.max(4, Math.floor(leafWidth / 0.36));
  for (let i = 0; i < slatCount; i++) {
    const t = (i + 0.5) / slatCount;
    const sx = sign * (t * leafWidth);
    const sh = height - 0.12 + (i % 2) * 0.08;
    const slat = new THREE.BoxGeometry(0.11, sh, 0.06);
    slat.translate(sx, sh * 0.5 + 0.08, 0);
    parts.push(
      normalizeGeometry(slat, i % 2 === 0 ? palette.woodLight : palette.woodWeathered, {
        bottomAO: 0.25,
        aoHeight: 0.8,
      })
    );
  }

  const merged = mergeGeometries(parts, false);
  for (let i = 0; i < parts.length; i++) parts[i].dispose();
  const mesh = new THREE.Mesh(merged, material);
  mesh.frustumCulled = true;
  return mesh;
}