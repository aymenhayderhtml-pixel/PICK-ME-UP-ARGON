import * as THREE from 'three';
import { DEFAULT_LAYOUT, ASH_COLOR } from './prairieConfig.js';
import {
  clamp,
  smoothstep,
  lerp,
  hexToRgb,
  normalizeGeometry,
  getChunkIndex,
  getSurfaceMetrics,
  computeTerrainHeight,
} from './prairieHelpers.js';

export function buildTerrainAndPaths(layout, palette, cfg, terrainChunks) {
  const bounds = layout.bounds || DEFAULT_LAYOUT.bounds;
  const padX = 86;
  const padZ = 76;
  const minX = bounds.minX - padX;
  const maxX = bounds.maxX + padX;
  const minZ = bounds.minZ - padZ;
  const maxZ = bounds.maxZ + padZ;

  const segX = cfg.terrainSegX;
  const segZ = cfg.terrainSegZ;
  const stepX = (maxX - minX) / segX;
  const stepZ = (maxZ - minZ) / segZ;

  const cBase = hexToRgb(palette.terrainBase);
  const cDry = hexToRgb(palette.terrainDry);
  const cDarkGrass = hexToRgb(palette.grassDark);
  const cDirt = hexToRgb(palette.pathDirt);
  const cGravel = hexToRgb(palette.pathGravel);
  const cRock = hexToRgb(palette.rockBase);
  const cSky = hexToRgb(palette.sky);
  const cRuin = hexToRgb(palette.stoneRuin);
  const cAsh = hexToRgb(ASH_COLOR);

  const gridCols = segX + 1;
  const gridRows = segZ + 1;
  const vxArr = new Float32Array(gridCols * gridRows);
  const vyArr = new Float32Array(gridCols * gridRows);
  const vzArr = new Float32Array(gridCols * gridRows);
  const colArr = new Float32Array(gridCols * gridRows * 3);

  for (let iz = 0; iz <= segZ; iz++) {
    const z = minZ + iz * stepZ;
    for (let ix = 0; ix <= segX; ix++) {
      const x = minX + ix * stepX;
      const idx = iz * gridCols + ix;

      const y = computeTerrainHeight(x, z, bounds);
      vxArr[idx] = x;
      vyArr[idx] = y;
      vzArr[idx] = z;

      const m = getSurfaceMetrics(x, z, layout);
      const meadowNoise = Math.sin(x * 0.14 + z * 0.11) * Math.cos(x * 0.08 - z * 0.13) * 0.5 + 0.5;

      let r = lerp(cBase.r, cDry.r, meadowNoise * 0.52);
      let g = lerp(cBase.g, cDry.g, meadowNoise * 0.52);
      let b = lerp(cBase.b, cDry.b, meadowNoise * 0.52);

      if (m.clearingNorm < 1.25) {
        const cBlend = 1.0 - smoothstep(0.55, 1.2, m.clearingNorm);
        r = lerp(r, lerp(cDry.r, cDirt.r, 0.35), cBlend * 0.65);
        g = lerp(g, lerp(cDry.g, cDirt.g, 0.35), cBlend * 0.65);
        b = lerp(b, lerp(cDry.b, cDirt.b, 0.35), cBlend * 0.65);

        const ring = 1.0 - smoothstep(0.0, 1.4, m.clearingEdgeDist);
        r = lerp(r, cDirt.r * 0.9, ring * 0.45);
        g = lerp(g, cDirt.g * 0.9, ring * 0.45);
        b = lerp(b, cDirt.b * 0.9, ring * 0.45);
      }

      if (m.pathDist < m.pathHalfWidth + 1.8) {
        const roadFactor = 1.0 - smoothstep(m.pathHalfWidth - 0.3, m.pathHalfWidth + 1.4, m.pathDist);
        const rut = Math.sin((m.pathDist / m.pathHalfWidth) * Math.PI * 2.0) * 0.5 + 0.5;
        const pr = lerp(cDirt.r, cGravel.r, rut * 0.55);
        const pg = lerp(cDirt.g, cGravel.g, rut * 0.55);
        const pb = lerp(cDirt.b, cGravel.b, rut * 0.55);
        r = lerp(r, pr, roadFactor);
        g = lerp(g, pg, roadFactor);
        b = lerp(b, pb, roadFactor);
      }

      if (m.ruinDist < 8.8) {
        const rf = 1.0 - smoothstep(4.5, 8.8, m.ruinDist);
        r = lerp(r, cRuin.r * 0.88, rf * 0.65);
        g = lerp(g, cRuin.g * 0.92, rf * 0.65);
        b = lerp(b, cRuin.b * 0.88, rf * 0.65);
      }

      if (m.goblinCampDist < 6.8) {
        const gf = 1.0 - smoothstep(2.0, 6.8, m.goblinCampDist);
        const fireCore = 1.0 - smoothstep(0.0, 2.2, m.goblinCampDist);
        const tr = lerp(cDirt.r * 0.72, cAsh.r, fireCore);
        const tg = lerp(cDirt.g * 0.68, cAsh.g, fireCore);
        const tb = lerp(cDirt.b * 0.64, cAsh.b, fireCore);
        r = lerp(r, tr, gf * 0.85);
        g = lerp(g, tg, gf * 0.85);
        b = lerp(b, tb, gf * 0.85);
      }

      if (m.obstacleClearance < 0.9) {
        const ao = smoothstep(-0.4, 0.9, m.obstacleClearance);
        const mul = lerp(0.62, 1.0, ao);
        r *= mul;
        g *= mul;
        b *= mul;
      }

      if (y > 0.05) {
        const hillT = smoothstep(0.2, 8.5, y);
        r = lerp(r, cDarkGrass.r * 0.88, hillT * 0.45);
        g = lerp(g, cDarkGrass.g * 0.88, hillT * 0.45);
        b = lerp(b, cDarkGrass.b * 0.88, hillT * 0.45);

        const rockT = smoothstep(6.5, 16.0, y);
        r = lerp(r, cRock.r * 0.92, rockT * 0.68);
        g = lerp(g, cRock.g * 0.95, rockT * 0.68);
        b = lerp(b, cRock.b * 0.98, rockT * 0.68);

        const hazeT = smoothstep(10.0, 24.0, y);
        r = lerp(r, cSky.r * 0.82, hazeT * 0.62);
        g = lerp(g, cSky.g * 0.86, hazeT * 0.62);
        b = lerp(b, cSky.b * 0.88, hazeT * 0.62);
      }

      colArr[idx * 3] = clamp(r, 0, 1);
      colArr[idx * 3 + 1] = clamp(g, 0, 1);
      colArr[idx * 3 + 2] = clamp(b, 0, 1);
    }
  }

  const chunkPositions = [[], [], [], []];
  const chunkColors = [[], [], [], []];
  const chunkUvs = [[], [], [], []];

  const uvScale = 0.14;
  function pushTri(cIdx, i0, i1, i2) {
    const posList = chunkPositions[cIdx];
    const colList = chunkColors[cIdx];
    const uvList = chunkUvs[cIdx];

    const indices = [i0, i1, i2];
    for (let k = 0; k < 3; k++) {
      const id = indices[k];
      const px = vxArr[id];
      const py = vyArr[id];
      const pz = vzArr[id];
      posList.push(px, py, pz);
      colList.push(colArr[id * 3], colArr[id * 3 + 1], colArr[id * 3 + 2]);
      uvList.push(px * uvScale, pz * uvScale);
    }
  }

  for (let iz = 0; iz < segZ; iz++) {
    const zMid = minZ + (iz + 0.5) * stepZ;
    const cIdx = getChunkIndex(zMid);
    for (let ix = 0; ix < segX; ix++) {
      const i00 = iz * gridCols + ix;
      const i10 = i00 + 1;
      const i01 = (iz + 1) * gridCols + ix;
      const i11 = i01 + 1;
      pushTri(cIdx, i00, i01, i10);
      pushTri(cIdx, i10, i01, i11);
    }
  }

  for (let c = 0; c < 4; c++) {
    if (chunkPositions[c].length > 0) {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(chunkPositions[c], 3));
      g.setAttribute('color', new THREE.Float32BufferAttribute(chunkColors[c], 3));
      g.setAttribute('uv', new THREE.Float32BufferAttribute(chunkUvs[c], 2));
      g.computeVertexNormals();
      terrainChunks[c].push(g);
    }
  }

  buildRoadRibbonAndClearings(layout, palette, cfg, terrainChunks);
}

export function buildRoadRibbonAndClearings(layout, palette, cfg, terrainChunks) {
  const pts = layout.pathPolyline || DEFAULT_LAYOUT.pathPolyline;
  if (pts.length < 2) return;

  const curvePts = pts.map((p) => new THREE.Vector3(p.x, 0, p.z));
  const curve = new THREE.CatmullRomCurve3(curvePts, false, 'catmullrom', 0.18);
  const segsZ = cfg.roadLengthSegs;
  const segsX = 6;

  const cDirt = hexToRgb(palette.pathDirt);
  const cGravel = hexToRgb(palette.pathGravel);
  const cDry = hexToRgb(palette.terrainDry);

  const chokes = layout.chokePoints || [];
  const baseWidth = layout.pathWidth || 5.8;

  const ringCols = segsX + 1;
  const roadVerts = [];
  const roadCols = [];
  const roadUvs = [];

  for (let i = 0; i <= segsZ; i++) {
    const u = i / segsZ;
    const pt = curve.getPoint(u);
    const tan = curve.getTangent(u);
    const nx = -tan.z;
    const nz = tan.x;

    let width = baseWidth;
    for (let k = 0; k < chokes.length; k++) {
      const cp = chokes[k];
      const d = Math.hypot(pt.x - cp.position.x, pt.z - cp.position.z);
      if (d < 9.0) {
        const f = smoothstep(0.0, 9.0, d);
        width = Math.min(width, lerp(cp.width || 4.2, baseWidth, f));
      }
    }

    const halfW = width * 0.5;
    const meander = Math.sin(pt.z * 0.22) * 0.16;

    for (let j = 0; j <= segsX; j++) {
      const v = j / segsX;
      const side = (v - 0.5) * 2.0;
      const absSide = Math.abs(side);

      const wx = pt.x + nx * (side * halfW + meander * (1 - absSide * 0.5));
      const wz = pt.z + nz * (side * halfW);
      const wy = (1.0 - absSide * absSide) * 0.018 + 0.003;

      roadVerts.push(wx, wy, wz);
      roadUvs.push(wx * 0.22, wz * 0.22);

      let r = cDirt.r;
      let g = cDirt.g;
      let b = cDirt.b;

      const track = Math.exp(-Math.pow(absSide - 0.42, 2) / 0.045);
      r = lerp(r, cGravel.r * 0.96, track * 0.72);
      g = lerp(g, cGravel.g * 0.96, track * 0.72);
      b = lerp(b, cGravel.b * 0.96, track * 0.72);

      if (absSide > 0.78) {
        const edgeT = (absSide - 0.78) / 0.22;
        r = lerp(r, cDry.r * 0.85, edgeT);
        g = lerp(g, cDry.g * 0.85, edgeT);
        b = lerp(b, cDry.b * 0.85, edgeT);
      }

      roadCols.push(r, g, b);
    }
  }

  for (let i = 0; i < segsZ; i++) {
    const zMid = roadVerts[(i * ringCols + 3) * 3 + 2];
    const cIdx = getChunkIndex(zMid);
    const posArr = [];
    const colArr = [];
    const uvArr = [];

    for (let j = 0; j < segsX; j++) {
      const a = i * ringCols + j;
      const b = a + 1;
      const c = (i + 1) * ringCols + j;
      const d = c + 1;
      const tris = [a, c, b, b, c, d];
      for (let t = 0; t < 6; t++) {
        const idx = tris[t];
        posArr.push(roadVerts[idx * 3], roadVerts[idx * 3 + 1], roadVerts[idx * 3 + 2]);
        colArr.push(roadCols[idx * 3], roadCols[idx * 3 + 1], roadCols[idx * 3 + 2]);
        uvArr.push(roadUvs[idx * 2], roadUvs[idx * 2 + 1]);
      }
    }

    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(posArr, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(colArr, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uvArr, 2));
    g.computeVertexNormals();
    terrainChunks[cIdx].push(g);
  }

  const clearings = layout.clearings || DEFAULT_LAYOUT.clearings;
  for (let c = 0; c < clearings.length; c++) {
    const cl = clearings[c];
    const cIdx = getChunkIndex(cl.center.z);
    const radSegs = cfg.clearingRingSegs;
    const innerR = cl.radius - 1.15;
    const outerR = cl.radius + 0.35;

    const posArr = [];
    const colArr = [];
    const uvArr = [];

    for (let s = 0; s < radSegs; s++) {
      const a0 = (s / radSegs) * Math.PI * 2;
      const a1 = ((s + 1) / radSegs) * Math.PI * 2;
      const wobble0 = Math.sin(a0 * 5 + c) * 0.25;
      const wobble1 = Math.sin(a1 * 5 + c) * 0.25;

      const x0i = cl.center.x + Math.cos(a0) * (innerR + wobble0);
      const z0i = cl.center.z + Math.sin(a0) * (innerR + wobble0);
      const x0o = cl.center.x + Math.cos(a0) * (outerR + wobble0);
      const z0o = cl.center.z + Math.sin(a0) * (outerR + wobble0);

      const x1i = cl.center.x + Math.cos(a1) * (innerR + wobble1);
      const z1i = cl.center.z + Math.sin(a1) * (innerR + wobble1);
      const x1o = cl.center.x + Math.cos(a1) * (outerR + wobble1);
      const z1o = cl.center.z + Math.sin(a1) * (outerR + wobble1);

      const quad = [
        [x0i, 0.011, z0i, cDirt.r * 0.94, cDirt.g * 0.94, cDirt.b * 0.94],
        [x0o, 0.003, z0o, cGravel.r * 0.86, cGravel.g * 0.88, cGravel.b * 0.84],
        [x1i, 0.011, z1i, cDirt.r * 0.94, cDirt.g * 0.94, cDirt.b * 0.94],
        [x1i, 0.011, z1i, cDirt.r * 0.94, cDirt.g * 0.94, cDirt.b * 0.94],
        [x0o, 0.003, z0o, cGravel.r * 0.86, cGravel.g * 0.88, cGravel.b * 0.84],
        [x1o, 0.003, z1o, cGravel.r * 0.86, cGravel.g * 0.88, cGravel.b * 0.84],
      ];

      for (let q = 0; q < 6; q++) {
        const v = quad[q];
        posArr.push(v[0], v[1], v[2]);
        colArr.push(v[3], v[4], v[5]);
        uvArr.push(v[0] * 0.2, v[2] * 0.2);
      }
    }

    const ringGeom = new THREE.BufferGeometry();
    ringGeom.setAttribute('position', new THREE.Float32BufferAttribute(posArr, 3));
    ringGeom.setAttribute('color', new THREE.Float32BufferAttribute(colArr, 3));
    ringGeom.setAttribute('uv', new THREE.Float32BufferAttribute(uvArr, 2));
    ringGeom.computeVertexNormals();
    terrainChunks[cIdx].push(ringGeom);

    const spawns = cl.spawnPoints || [];
    for (let s = 0; s < spawns.length; s++) {
      const sp = spawns[s];
      const patch = new THREE.CircleGeometry(1.15, 10);
      patch.rotateX(-Math.PI / 2);
      patch.translate(sp.x, 0.009, sp.z);
      terrainChunks[cIdx].push(
        normalizeGeometry(patch, palette.pathDirt, { bottomAO: 0, variation: 0.04 })
      );
    }
  }
}