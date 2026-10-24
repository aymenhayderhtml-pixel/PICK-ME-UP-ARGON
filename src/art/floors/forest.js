// src/art/floors/forest.js
// Procedural 3D floor art orchestrator for Floor 3: Forest Glade ("buildFloor3Clearing" / "buildForestFloorArt").

import * as THREE from 'three';
import {
  BRIGHT_FOREST_LIGHTING,
  FOREST_FLOOR_LIGHTING,
  PILLAR_SPECS,
  GRASS_PALETTE_HEX,
  createSeededRandom,
  valueNoise2D,
  mergeStaticGeometries,
  evaluateTerrainHeight,
  attachWindSwayShader
} from './forestUtils.js';
import {
  buildRollingMeadowTerrainGeometry,
  buildWornDirtOverlayGeometry,
  buildTapered3VertexGrassBladeGeometry,
  buildFlowerClusterGeometry,
  buildPineTreeGeometry,
  buildBroadleafTrunkWithBranchesGeometry,
  buildBroadleafCanopyGeometry,
  buildBushGeometry,
  buildFernGeometry,
  buildMossBoulderGeometry,
  buildAncientBrokenPillarAssembly
} from './forestGeometries.js';
import {
  updateFloor3Debris,
  clearActiveDebrisStateIfMatch,
  buildSkyAndLighting,
  buildMountainsAndDebris
} from './forestAtmosphere.js';

export {
  BRIGHT_FOREST_LIGHTING,
  FOREST_FLOOR_LIGHTING,
  createSeededRandom,
  mergeStaticGeometries,
  updateFloor3Debris
};

const _tempMat4 = new THREE.Matrix4();
const _tempPos = new THREE.Vector3();
const _tempQuat = new THREE.Quaternion();
const _tempScale = new THREE.Vector3();
const _tempEuler = new THREE.Euler();
const _tempColor = new THREE.Color();

export function getForestPalette() {
  return {};
}

export function getForestGeometries() {
  return {};
}

export function buildFloor3Clearing(ctx = {}) {
  const rand = createSeededRandom(ctx.seed ?? 3005);

  const centerX = ctx.center?.x ?? 0;
  const centerY = ctx.center?.y ?? 0;
  const centerZ = ctx.center?.z ?? -34;

  const group = new THREE.Group();
  group.name = 'Floor3_ForestGlade';

  const ownedGeometries = [];
  const ownedMaterials = [];
  const windUniforms = [];

  let drawCalls = 0;
  let triangleCount = 0;

  const trackGeometry = (g) => {
    ownedGeometries.push(g);
    return g;
  };
  const trackMaterial = (m) => {
    ownedMaterials.push(m);
    return m;
  };

  const registerMesh = (mesh, instanceCount = 1) => {
    group.add(mesh);
    drawCalls += 1;
    const geom = mesh.geometry;
    const trisPerInstance = geom.index
      ? geom.index.count / 3
      : geom.attributes.position.count / 3;
    triangleCount += Math.round(trisPerInstance * instanceCount);
  };

  const { fallbackSun, restoreSceneFog } = buildSkyAndLighting({
    ctx,
    group,
    centerX,
    centerY,
    centerZ,
    trackGeometry,
    trackMaterial,
    registerMesh
  });

  const terrainGeo = trackGeometry(buildRollingMeadowTerrainGeometry());
  const terrainMat = trackMaterial(
    new THREE.MeshLambertMaterial({
      vertexColors: true,
    })
  );
  const terrainMesh = new THREE.Mesh(terrainGeo, terrainMat);
  terrainMesh.position.set(centerX, centerY, centerZ);
  terrainMesh.receiveShadow = true;
  registerMesh(terrainMesh);

  const dirtOverlayGeo = trackGeometry(buildWornDirtOverlayGeometry());
  const dirtOverlayMat = trackMaterial(
    new THREE.MeshLambertMaterial({
      vertexColors: true,
    })
  );
  const dirtOverlayMesh = new THREE.Mesh(dirtOverlayGeo, dirtOverlayMat);
  dirtOverlayMesh.position.set(centerX, centerY, centerZ);
  dirtOverlayMesh.receiveShadow = true;
  registerMesh(dirtOverlayMesh);

  const grassBladeGeo = trackGeometry(buildTapered3VertexGrassBladeGeometry());
  const grassMat = trackMaterial(
    attachWindSwayShader(
      new THREE.MeshLambertMaterial({
        vertexColors: true,
        side: THREE.DoubleSide,
      }),
      windUniforms,
      0.19,
      2.15
    )
  );

  const grassCount = 33750;
  const grassInst = new THREE.InstancedMesh(grassBladeGeo, grassMat, grassCount);
  grassInst.receiveShadow = true;

  const grassPalette = GRASS_PALETTE_HEX.map((hex) => new THREE.Color(hex));

  for (let i = 0; i < grassCount; i++) {
    let lx = 0;
    let lz = 0;
    let scaleY = 0.7 + rand() * 0.6;
    const scaleXZ = 0.8 + rand() * 0.4;

    if (i < 7500) {
      const side = i % 2 === 0 ? -1 : 1;
      lz = -1.5 + rand() * 41.0;
      const pathCurve = Math.sin(lz * 0.11) * 0.85;
      const edgeOffset = 1.65 + Math.pow(rand(), 1.6) * 2.8;
      lx = pathCurve + side * edgeOffset;
      scaleY = 0.8 + rand() * 0.5;
    } else if (i < 13000) {
      const ang = rand() * Math.PI * 2;
      const rad = 5.6 + Math.pow(rand(), 1.35) * 4.5;
      lx = Math.cos(ang) * rad * 1.08;
      lz = Math.sin(ang) * rad * 0.96 - 1.6;
      scaleY = 0.7 + rand() * 0.5;
    } else {
      const ang = rand() * Math.PI * 2;
      const rad = Math.sqrt(rand()) * 37.5;
      lx = Math.cos(ang) * rad;
      lz = Math.sin(ang) * rad;

      const dClear = Math.hypot(lx * 0.9, (lz + 1.8) * 1.05);
      const pathCenter = Math.sin(lz * 0.11) * 0.85;
      const onTrail = lz > -2.0 && lz < 40.0 && Math.abs(lx - pathCenter) < 1.35;
      if (dClear < 5.1 || onTrail) {
        const pushAng = Math.atan2(lz, lx);
        const pushRad = 6.2 + rand() * 14.0;
        lx = Math.cos(pushAng) * pushRad;
        lz = Math.sin(pushAng) * pushRad;
      }
    }

    const ly = evaluateTerrainHeight(lx, lz);
    _tempPos.set(centerX + lx, centerY + ly, centerZ + lz);
    _tempEuler.set((rand() - 0.5) * 0.22, rand() * Math.PI * 2, (rand() - 0.5) * 0.22);
    _tempQuat.setFromEuler(_tempEuler);
    _tempScale.set(scaleXZ, scaleY, scaleXZ);
    _tempMat4.compose(_tempPos, _tempQuat, _tempScale);
    grassInst.setMatrixAt(i, _tempMat4);

    const nCol = valueNoise2D(lx * 0.14 + 5.2, lz * 0.14 - 3.8);
    const colIdx = Math.min(grassPalette.length - 1, Math.floor(nCol * grassPalette.length));
    _tempColor.copy(grassPalette[colIdx]);
    _tempColor.offsetHSL((rand() - 0.5) * 0.03, (rand() - 0.5) * 0.08, (rand() - 0.5) * 0.06);
    grassInst.setColorAt(i, _tempColor);
  }
  grassInst.instanceMatrix.needsUpdate = true;
  if (grassInst.instanceColor) grassInst.instanceColor.needsUpdate = true;
  registerMesh(grassInst, grassCount);

  const flowerMat = trackMaterial(
    attachWindSwayShader(
      new THREE.MeshLambertMaterial({
        vertexColors: true,
      }),
      windUniforms,
      0.12,
      2.0
    )
  );

  const whiteFlowerGeo = trackGeometry(buildFlowerClusterGeometry(0xfafdf6, 0xf2c138));
  const yellowFlowerGeo = trackGeometry(buildFlowerClusterGeometry(0xffdd3c, 0xe07b18));

  const whiteFlowerCount = 1750;
  const yellowFlowerCount = 1750;
  const whiteFlowerInst = new THREE.InstancedMesh(whiteFlowerGeo, flowerMat, whiteFlowerCount);
  const yellowFlowerInst = new THREE.InstancedMesh(yellowFlowerGeo, flowerMat, yellowFlowerCount);

  const populateFlowers = (instMesh, count, phaseShift) => {
    for (let i = 0; i < count; i++) {
      let lx = 0;
      let lz = 0;
      if (i < count * 0.22) {
        const side = i % 2 === 0 ? -1 : 1;
        lz = -1.0 + rand() * 38.0;
        const pathCurve = Math.sin(lz * 0.11) * 0.85;
        lx = pathCurve + side * (2.0 + rand() * 3.2);
      } else {
        const ang = rand() * Math.PI * 2 + phaseShift;
        const rad = 6.2 + Math.sqrt(rand()) * 27.5;
        lx = Math.cos(ang) * rad;
        lz = Math.sin(ang) * rad;
        if (lz > -1.0 && lz < 40.0) {
          const pathCurve = Math.sin(lz * 0.11) * 0.85;
          if (Math.abs(lx - pathCurve) < 1.8) {
            lx += (lx >= pathCurve ? 1 : -1) * 2.4;
          }
        }
      }
      const ly = evaluateTerrainHeight(lx, lz);
      const sc = 0.72 + rand() * 0.62;
      _tempPos.set(centerX + lx, centerY + ly, centerZ + lz);
      _tempEuler.set((rand() - 0.5) * 0.12, rand() * Math.PI * 2, (rand() - 0.5) * 0.12);
      _tempQuat.setFromEuler(_tempEuler);
      _tempScale.set(sc, sc, sc);
      _tempMat4.compose(_tempPos, _tempQuat, _tempScale);
      instMesh.setMatrixAt(i, _tempMat4);
    }
    instMesh.instanceMatrix.needsUpdate = true;
  };

  populateFlowers(whiteFlowerInst, whiteFlowerCount, 0.0);
  populateFlowers(yellowFlowerInst, yellowFlowerCount, 1.57);
  registerMesh(whiteFlowerInst, whiteFlowerCount);
  registerMesh(yellowFlowerInst, yellowFlowerCount);

  const pillarMat = trackMaterial(
    new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.86,
      metalness: 0.05,
    })
  );

  const pillars = [];
  const colliders = [];
  const blockers = [];

  for (let i = 0; i < PILLAR_SPECS.length; i++) {
    const spec = PILLAR_SPECS[i];
    const px = centerX + spec.dx;
    const pz = centerZ + spec.dz;
    const py = centerY + evaluateTerrainHeight(spec.dx, spec.dz);

    const pGeo = trackGeometry(buildAncientBrokenPillarAssembly(i + 1, rand));
    const pillarMesh = new THREE.Mesh(pGeo, pillarMat);
    pillarMesh.position.set(px, py, pz);
    pillarMesh.rotation.set(spec.leanX, spec.rotY, spec.leanZ);
    pillarMesh.castShadow = true;
    pillarMesh.receiveShadow = true;

    const radius = 0.66;
    const height = 3.8;
    const blockerEntry = {
      id: i,
      index: i,
      type: 'pillar',
      x: px,
      y: py,
      z: pz,
      radius,
      height,
      minX: px - radius,
      maxX: px + radius,
      minZ: pz - radius,
      maxZ: pz + radius,
      position: new THREE.Vector3(px, py, pz),
      mesh: pillarMesh,
      destroyed: false,
      active: true,
    };

    pillarMesh.userData = {
      id: i,
      index: i,
      destroyed: false,
      collider: true,
      radius,
      height,
      blocker: blockerEntry,
    };

    pillars.push(pillarMesh);
    colliders.push(pillarMesh);
    blockers.push(blockerEntry);
    registerMesh(pillarMesh);
  }

  const gateStoneGeo = trackGeometry(buildAncientBrokenPillarAssembly(99, rand));
  const gateLeft = new THREE.Mesh(gateStoneGeo, pillarMat);
  gateLeft.position.set(centerX - 2.35, centerY, centerZ - 17.5);
  gateLeft.scale.set(0.85, 1.05, 0.85);
  gateLeft.castShadow = true;
  gateLeft.receiveShadow = true;
  registerMesh(gateLeft);

  const gateRight = new THREE.Mesh(gateStoneGeo, pillarMat);
  gateRight.position.set(centerX + 2.35, centerY, centerZ - 17.5);
  gateRight.rotation.y = Math.PI;
  gateRight.scale.set(0.85, 1.05, 0.85);
  gateRight.castShadow = true;
  gateRight.receiveShadow = true;
  registerMesh(gateRight);

  const gatePortalGeo = trackGeometry(new THREE.CircleGeometry(1.85, 24));
  const gatePortalMat = trackMaterial(
    new THREE.MeshBasicMaterial({
      color: 0x9b6bff,
      transparent: true,
      opacity: 0.68,
      side: THREE.DoubleSide,
    })
  );
  const gatePortalMesh = new THREE.Mesh(gatePortalGeo, gatePortalMat);
  gatePortalMesh.position.set(centerX, centerY + 2.0, centerZ - 17.5);
  gatePortalMesh.visible = false;
  registerMesh(gatePortalMesh);

  const pineCount = 145;
  const broadleafCount = 165;
  const totalTrees = pineCount + broadleafCount;

  const pineGeo = trackGeometry(buildPineTreeGeometry());
  const pineMat = trackMaterial(
    new THREE.MeshLambertMaterial({
      vertexColors: true,
    })
  );
  const pineInst = new THREE.InstancedMesh(pineGeo, pineMat, pineCount);
  pineInst.castShadow = true;
  pineInst.receiveShadow = true;

  const broadleafTrunkGeo = trackGeometry(buildBroadleafTrunkWithBranchesGeometry());
  const broadleafTrunkMat = trackMaterial(
    new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.92,
      metalness: 0.0,
    })
  );
  const broadleafTrunkInst = new THREE.InstancedMesh(
    broadleafTrunkGeo,
    broadleafTrunkMat,
    broadleafCount
  );
  broadleafTrunkInst.castShadow = true;
  broadleafTrunkInst.receiveShadow = true;

  const broadleafCanopyGeo = trackGeometry(buildBroadleafCanopyGeometry());
  const broadleafCanopyMat = trackMaterial(
    new THREE.MeshLambertMaterial({
      vertexColors: true,
    })
  );
  const broadleafCanopyInst = new THREE.InstancedMesh(
    broadleafCanopyGeo,
    broadleafCanopyMat,
    broadleafCount
  );
  broadleafCanopyInst.castShadow = true;
  broadleafCanopyInst.receiveShadow = true;

  const treePositions = [];

  const sampleValidTreeCoord = (idx, total) => {
    for (let attempt = 0; attempt < 16; attempt++) {
      let lx = 0;
      let lz = 0;
      if (idx < 34 && attempt === 0) {
        const side = idx % 2 === 0 ? -1 : 1;
        lz = 15.0 + (idx / 34) * 27.0 + (rand() - 0.5) * 2.2;
        const pathCenter = Math.sin(lz * 0.11) * 0.85;
        lx = pathCenter + side * (6.8 + rand() * 14.5);
      } else {
        const goldenAngle = idx * 2.399963229728653 + attempt * 0.47;
        const ringT = (idx / total + rand() * 0.12) % 1.0;
        const radius = 19.2 + Math.pow(ringT, 0.82) * 29.5;
        lx = Math.cos(goldenAngle) * radius;
        lz = Math.sin(goldenAngle) * radius;
      }

      if (lz > -2.0 && lz < 46.0) {
        const pathCenter = Math.sin(lz * 0.11) * 0.85;
        if (Math.abs(lx - pathCenter) < 6.2) continue;
      }
      if (lz < -14.0 && lz > -24.0 && Math.abs(lx) < 4.5) continue;

      return { lx, lz };
    }
    const fallbackAngle = (idx / total) * Math.PI * 2;
    return {
      lx: Math.cos(fallbackAngle) * 24.0,
      lz: Math.sin(fallbackAngle) * 24.0,
    };
  };

  let pIdx = 0;
  let bIdx = 0;

  for (let i = 0; i < totalTrees; i++) {
    const { lx, lz } = sampleValidTreeCoord(i, totalTrees);
    const ly = evaluateTerrainHeight(lx, lz) - 0.12;
    const rotY = rand() * Math.PI * 2;
    const tiltX = (rand() - 0.5) * 0.07;
    const tiltZ = (rand() - 0.5) * 0.07;
    const scaleXZ = 0.84 + rand() * 0.56;
    const scaleY = 0.86 + rand() * 0.64;

    treePositions.push({ lx, ly, lz, scale: scaleXZ });

    _tempPos.set(centerX + lx, centerY + ly, centerZ + lz);
    _tempEuler.set(tiltX, rotY, tiltZ);
    _tempQuat.setFromEuler(_tempEuler);
    _tempScale.set(scaleXZ, scaleY, scaleXZ);
    _tempMat4.compose(_tempPos, _tempQuat, _tempScale);

    const isPine = (i % 2 === 0 && pIdx < pineCount) || bIdx >= broadleafCount;
    if (isPine) {
      pineInst.setMatrixAt(pIdx, _tempMat4);
      _tempColor.setHSL(0.31 + (rand() - 0.5) * 0.04, 0.52, 0.48 + (rand() - 0.5) * 0.08);
      pineInst.setColorAt(pIdx, _tempColor);
      pIdx++;
    } else {
      broadleafTrunkInst.setMatrixAt(bIdx, _tempMat4);
      broadleafCanopyInst.setMatrixAt(bIdx, _tempMat4);
      _tempColor.setHSL(0.27 + (rand() - 0.5) * 0.05, 0.62, 0.52 + (rand() - 0.5) * 0.10);
      broadleafCanopyInst.setColorAt(bIdx, _tempColor);
      bIdx++;
    }
  }

  pineInst.instanceMatrix.needsUpdate = true;
  if (pineInst.instanceColor) pineInst.instanceColor.needsUpdate = true;
  broadleafTrunkInst.instanceMatrix.needsUpdate = true;
  broadleafCanopyInst.instanceMatrix.needsUpdate = true;
  if (broadleafCanopyInst.instanceColor) broadleafCanopyInst.instanceColor.needsUpdate = true;

  registerMesh(pineInst, pineCount);
  registerMesh(broadleafTrunkInst, broadleafCount);
  registerMesh(broadleafCanopyInst, broadleafCount);

  const bushCount = 520;
  const bushGeo = trackGeometry(buildBushGeometry());
  const bushMat = trackMaterial(
    new THREE.MeshLambertMaterial({
      vertexColors: true,
    })
  );
  const bushInst = new THREE.InstancedMesh(bushGeo, bushMat, bushCount);
  bushInst.castShadow = true;
  bushInst.receiveShadow = true;

  for (let i = 0; i < bushCount; i++) {
    const baseTree = treePositions[i % treePositions.length];
    const ang = rand() * Math.PI * 2;
    const dist = 0.9 + rand() * 2.8;
    let lx = baseTree.lx + Math.cos(ang) * dist;
    let lz = baseTree.lz + Math.sin(ang) * dist;
    if (Math.hypot(lx, lz) < 17.8) {
      const push = 18.2 / Math.max(0.1, Math.hypot(lx, lz));
      lx *= push;
      lz *= push;
    }
    const ly = evaluateTerrainHeight(lx, lz) - 0.06;
    const sx = 0.72 + rand() * 0.75;
    const sy = 0.68 + rand() * 0.68;

    _tempPos.set(centerX + lx, centerY + ly, centerZ + lz);
    _tempEuler.set((rand() - 0.5) * 0.1, rand() * Math.PI * 2, (rand() - 0.5) * 0.1);
    _tempQuat.setFromEuler(_tempEuler);
    _tempScale.set(sx, sy, sx);
    _tempMat4.compose(_tempPos, _tempQuat, _tempScale);
    bushInst.setMatrixAt(i, _tempMat4);

    _tempColor.setHSL(0.28 + (rand() - 0.5) * 0.05, 0.58, 0.48 + (rand() - 0.5) * 0.10);
    bushInst.setColorAt(i, _tempColor);
  }
  bushInst.instanceMatrix.needsUpdate = true;
  if (bushInst.instanceColor) bushInst.instanceColor.needsUpdate = true;
  registerMesh(bushInst, bushCount);

  const fernCount = 850;
  const fernGeo = trackGeometry(buildFernGeometry());
  const fernMat = trackMaterial(
    attachWindSwayShader(
      new THREE.MeshLambertMaterial({
        vertexColors: true,
        side: THREE.DoubleSide,
      }),
      windUniforms,
      0.09,
      1.85
    )
  );
  const fernInst = new THREE.InstancedMesh(fernGeo, fernMat, fernCount);
  fernInst.receiveShadow = true;

  for (let i = 0; i < fernCount; i++) {
    let lx = 0;
    let lz = 0;
    if (i < 120) {
      const pSpec = PILLAR_SPECS[i % PILLAR_SPECS.length];
      const ang = rand() * Math.PI * 2;
      const dist = 0.85 + rand() * 1.45;
      lx = pSpec.dx + Math.cos(ang) * dist;
      lz = pSpec.dz + Math.sin(ang) * dist;
    } else {
      const baseTree = treePositions[i % treePositions.length];
      const ang = rand() * Math.PI * 2;
      const dist = 0.65 + rand() * 2.6;
      lx = baseTree.lx + Math.cos(ang) * dist;
      lz = baseTree.lz + Math.sin(ang) * dist;
    }
    const ly = evaluateTerrainHeight(lx, lz);
    const sc = 0.68 + rand() * 0.72;
    _tempPos.set(centerX + lx, centerY + ly, centerZ + lz);
    _tempEuler.set((rand() - 0.5) * 0.14, rand() * Math.PI * 2, (rand() - 0.5) * 0.14);
    _tempQuat.setFromEuler(_tempEuler);
    _tempScale.set(sc, sc, sc);
    _tempMat4.compose(_tempPos, _tempQuat, _tempScale);
    fernInst.setMatrixAt(i, _tempMat4);
  }
  fernInst.instanceMatrix.needsUpdate = true;
  registerMesh(fernInst, fernCount);

  const rockCount = 250;
  const { rock: boulderGeo, moss: mossCapGeo } = buildMossBoulderGeometry();
  trackGeometry(boulderGeo);
  trackGeometry(mossCapGeo);

  const boulderMat = trackMaterial(
    new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.88,
      metalness: 0.04,
    })
  );
  const mossCapMat = trackMaterial(
    new THREE.MeshLambertMaterial({
      vertexColors: true,
    })
  );

  const stoneInst = new THREE.InstancedMesh(boulderGeo, boulderMat, rockCount);
  const mossCapInst = new THREE.InstancedMesh(mossCapGeo, mossCapMat, rockCount);
  stoneInst.castShadow = true;
  stoneInst.receiveShadow = true;
  mossCapInst.receiveShadow = true;

  for (let i = 0; i < rockCount; i++) {
    const baseTree = treePositions[(i * 3) % treePositions.length];
    const ang = rand() * Math.PI * 2;
    const dist = 0.8 + rand() * 2.5;
    let lx = baseTree.lx + Math.cos(ang) * dist;
    let lz = baseTree.lz + Math.sin(ang) * dist;
    if (Math.hypot(lx, lz) < 17.2) {
      const push = 17.6 / Math.max(0.1, Math.hypot(lx, lz));
      lx *= push;
      lz *= push;
    }
    const ly = evaluateTerrainHeight(lx, lz) - 0.08;
    const sx = 0.45 + rand() * 0.78;
    const sy = 0.38 + rand() * 0.65;
    const sz = 0.45 + rand() * 0.78;

    _tempPos.set(centerX + lx, centerY + ly, centerZ + lz);
    _tempEuler.set((rand() - 0.5) * 0.25, rand() * Math.PI * 2, (rand() - 0.5) * 0.25);
    _tempQuat.setFromEuler(_tempEuler);
    _tempScale.set(sx, sy, sz);
    _tempMat4.compose(_tempPos, _tempQuat, _tempScale);

    stoneInst.setMatrixAt(i, _tempMat4);
    mossCapInst.setMatrixAt(i, _tempMat4);
  }
  stoneInst.instanceMatrix.needsUpdate = true;
  mossCapInst.instanceMatrix.needsUpdate = true;
  registerMesh(stoneInst, rockCount);
  registerMesh(mossCapInst, rockCount);

  const {
    debrisState,
    leafInst,
    leafCount,
    pollenInst,
    pollenCount
  } = buildMountainsAndDebris({
    centerX,
    centerY,
    centerZ,
    rand,
    windUniforms,
    gatePortalMesh,
    trackGeometry,
    trackMaterial,
    registerMesh
  });

  const anchors = {
    arena: new THREE.Vector3(centerX, centerY, centerZ),
    center: new THREE.Vector3(centerX, centerY, centerZ),
    playerSpawn: new THREE.Vector3(centerX, centerY, centerZ + 11.0),
    gate: new THREE.Vector3(centerX, centerY, centerZ - 17.5),
    bossSpawn: new THREE.Vector3(centerX, centerY, centerZ - 6.0),
    enemySpawns: [
      new THREE.Vector3(centerX - 4.5, centerY, centerZ - 3.5),
      new THREE.Vector3(centerX + 4.5, centerY, centerZ - 3.5),
      new THREE.Vector3(centerX - 2.5, centerY, centerZ - 7.0),
      new THREE.Vector3(centerX + 2.5, centerY, centerZ - 7.0),
      new THREE.Vector3(centerX, centerY, centerZ - 5.0),
    ],
  };

  function update(delta, time) {
    if (typeof time === 'number' && (!delta || delta <= 0)) {
      const computedDt = time - debrisState.time;
      updateFloor3Debris(computedDt > 0 && computedDt < 0.25 ? computedDt : 0.016);
    } else {
      updateFloor3Debris(delta);
    }
  }

  function setQuality(quality) {
    if (quality === 'low') {
      pollenInst.count = Math.floor(pollenCount * 0.4);
      leafInst.count = Math.floor(leafCount * 0.6);
    } else {
      pollenInst.count = pollenCount;
      leafInst.count = leafCount;
    }
  }

  function setLighting(lightOverride) {
    if (!lightOverride) return;
    if (lightOverride.sun?.intensity !== undefined) {
      fallbackSun.intensity = lightOverride.sun.intensity;
    }
  }

  function setGateState(state) {
    const isOpen =
      state === true ||
      state === 'open' ||
      state === 'active' ||
      (typeof state === 'object' && state !== null && (state.open || state.active));
    gatePortalMesh.visible = Boolean(isOpen);
  }

  function destroyPillar(indexOrId) {
    const target = pillars.find(
      (p, idx) => idx === indexOrId || p.userData?.id === indexOrId
    );
    if (!target || target.userData.destroyed) return false;
    target.userData.destroyed = true;
    target.scale.y = 0.22;
    if (target.userData.blocker) {
      target.userData.blocker.destroyed = true;
      target.userData.blocker.active = false;
      target.userData.blocker.radius = 0;
    }
    return true;
  }

  function getStats() {
    return {
      floor: 3,
      drawCalls,
      triangles: triangleCount,
      instancedLeaves: leafCount,
      instancedGrass: grassCount,
      instancedTrees: totalTrees,
      pillars: pillars.length,
    };
  }

  function dispose() {
    clearActiveDebrisStateIfMatch(debrisState);
    restoreSceneFog();

    for (let i = 0; i < ownedGeometries.length; i++) {
      ownedGeometries[i].dispose();
    }
    ownedGeometries.length = 0;

    for (let i = 0; i < ownedMaterials.length; i++) {
      const mat = ownedMaterials[i];
      if (mat.map) mat.map.dispose();
      mat.dispose();
    }
    ownedMaterials.length = 0;

    if (group.parent) {
      group.parent.remove(group);
    }
  }

  return {
    group,
    anchors,
    lights: BRIGHT_FOREST_LIGHTING,
    pillars,
    colliders,
    blockers,
    update,
    setQuality,
    setLighting,
    setGateState,
    destroyPillar,
    getStats,
    dispose,
  };
}

export const buildForestFloor = buildFloor3Clearing;

export const buildForestFloorArt = buildFloor3Clearing;