import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { PALETTE } from './palette.js';

function mulberry32(a) {
  return function() {
    let t = a += 0x6D2B79F5;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function createStoneTexture(seed = 202) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  const rng = mulberry32(seed);

  ctx.fillStyle = '#d4dadd';
  ctx.fillRect(0, 0, 512, 512);

  for (let i = 0; i < 5500; i++) {
    const x = rng() * 512;
    const y = rng() * 512;
    const v = 180 + Math.floor(rng() * 60);
    ctx.fillStyle = `rgb(${v},${v + 2},${v + 4})`;
    ctx.fillRect(x, y, 2 + rng() * 3, 2 + rng() * 3);
  }

  const rows = 8;
  const rowH = 512 / rows;
  ctx.strokeStyle = '#68767c';
  ctx.lineWidth = 3;

  for (let r = 0; r < rows; r++) {
    const y = r * rowH;
    ctx.beginPath();
    ctx.moveTo(0, y);
    for (let x = 32; x <= 512; x += 32) {
      ctx.lineTo(x, y + (rng() - 0.5) * 2.5);
    }
    ctx.stroke();

    const cols = 4 + (r % 2);
    const colW = 512 / cols;
    const offset = (r % 2) * (colW * 0.5);
    for (let c = 0; c < cols; c++) {
      const bx = (c * colW + offset) % 512;
      const shade = 210 + Math.floor((rng() - 0.5) * 30);
      ctx.fillStyle = `rgba(${shade},${shade + 3},${shade + 5},0.28)`;
      ctx.fillRect(bx + 2, y + 2, colW - 4, rowH - 4);

      ctx.beginPath();
      ctx.moveTo(bx, y);
      ctx.lineTo(bx + (rng() - 0.5) * 2, y + rowH);
      ctx.stroke();

      ctx.strokeStyle = 'rgba(255,255,255,0.32)';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(bx + 3, y + 3, colW - 6, rowH - 6);
      ctx.strokeStyle = '#68767c';
      ctx.lineWidth = 3;
    }
  }

  for (let i = 0; i < 26; i++) {
    const cx = rng() * 512;
    const cy = rng() * 512;
    const rad = 12 + rng() * 28;
    const grad = ctx.createRadialGradient(cx, cy, 1, cx, cy, rad);
    grad.addColorStop(0, 'rgba(67, 104, 54, 0.36)');
    grad.addColorStop(1, 'rgba(67, 104, 54, 0.0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, rad, 0, Math.PI * 2);
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.needsUpdate = true;
  return tex;
}

function createPlasterWoodTexture(seed = 303) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  const rng = mulberry32(seed);

  ctx.fillStyle = '#e2e5e1';
  ctx.fillRect(0, 0, 512, 512);

  for (let y = 0; y < 512; y += 4) {
    const v = 220 + Math.floor((rng() - 0.5) * 20);
    ctx.fillStyle = `rgba(${v},${v - 2},${v - 5},0.35)`;
    ctx.fillRect(0, y, 512, 3);
  }

  for (let i = 0; i < 90; i++) {
    const x = rng() * 512;
    const y = rng() * 512;
    const w = 16 + rng() * 64;
    const h = 2 + rng() * 4;
    ctx.fillStyle = rng() > 0.5 ? 'rgba(120,115,108,0.18)' : 'rgba(255,255,255,0.22)';
    ctx.fillRect(x, y, w, h);
  }

  ctx.strokeStyle = 'rgba(70,65,60,0.22)';
  ctx.lineWidth = 2;
  for (let p = 0; p < 8; p++) {
    const px = p * 64;
    ctx.beginPath();
    ctx.moveTo(px, 0);
    ctx.lineTo(px, 512);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.needsUpdate = true;
  return tex;
}

function prepareGeo(geo, baseHex, bottomDark = 0.76, topLight = 1.06, noiseAmp = 0.05, rng = Math.random) {
  const g = geo.index ? geo.toNonIndexed() : geo.clone();
  if (g.attributes.uv) g.deleteAttribute('uv');
  if (g.attributes.uv2) g.deleteAttribute('uv2');
  g.computeVertexNormals();

  const pos = g.attributes.position;
  const norm = g.attributes.normal;
  g.computeBoundingBox();
  const minY = g.boundingBox.min.y;
  const maxY = g.boundingBox.max.y;
  const spanY = Math.max(0.001, maxY - minY);

  const count = pos.count;
  const colors = new Float32Array(count * 3);
  const uvs = new Float32Array(count * 2);
  const c = new THREE.Color(baseHex);

  for (let i = 0; i < count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const nx = norm.getX(i);
    const ny = norm.getY(i);
    const nz = norm.getZ(i);

    const tY = (y - minY) / spanY;
    const grad = bottomDark + (topLight - bottomDark) * tY;
    const upBias = ny * 0.07;
    const n = (rng() - 0.5) * noiseAmp;
    const f = Math.max(0.22, Math.min(1.35, grad + upBias + n));

    colors[i * 3] = Math.min(1, c.r * f);
    colors[i * 3 + 1] = Math.min(1, c.g * f);
    colors[i * 3 + 2] = Math.min(1, c.b * f);

    if (Math.abs(ny) > 0.75) {
      uvs[i * 2] = x * 0.2;
      uvs[i * 2 + 1] = z * 0.2;
    } else if (Math.abs(nx) > Math.abs(nz)) {
      uvs[i * 2] = z * 0.2;
      uvs[i * 2 + 1] = y * 0.2;
    } else {
      uvs[i * 2] = x * 0.2;
      uvs[i * 2 + 1] = y * 0.2;
    }
  }

  g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  g.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  return g;
}

function addBox(list, w, h, d, x, y, z, hex, rotY = 0, rotX = 0, rotZ = 0, aoBot = 0.76, aoTop = 1.06, rng = Math.random) {
  const g = new THREE.BoxGeometry(w, h, d);
  const pg = prepareGeo(g, hex, aoBot, aoTop, 0.05, rng);
  g.dispose();
  if (rotX !== 0 || rotY !== 0 || rotZ !== 0) {
    const m = new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(rotX, rotY, rotZ, 'YXZ'));
    pg.applyMatrix4(m);
  }
  pg.translate(x, y, z);
  list.push(pg);
}

function addCyl(list, rTop, rBot, h, segs, x, y, z, hex, rotY = 0, rotX = 0, rotZ = 0, aoBot = 0.76, aoTop = 1.06, rng = Math.random) {
  const g = new THREE.CylinderGeometry(rTop, rBot, h, segs);
  const pg = prepareGeo(g, hex, aoBot, aoTop, 0.05, rng);
  g.dispose();
  if (rotX !== 0 || rotY !== 0 || rotZ !== 0) {
    const m = new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(rotX, rotY, rotZ, 'YXZ'));
    pg.applyMatrix4(m);
  }
  pg.translate(x, y, z);
  list.push(pg);
}

function createArchBlockGeo(innerR, outerR, height, startAngle, endAngle, segs, hex, yBase, cx, cz, rng) {
  const shape = new THREE.Shape();
  for (let i = 0; i <= segs; i++) {
    const a = startAngle + (endAngle - startAngle) * (i / segs);
    const x = Math.cos(a) * outerR;
    const y = -Math.sin(a) * outerR;
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  for (let i = segs; i >= 0; i--) {
    const a = startAngle + (endAngle - startAngle) * (i / segs);
    const x = Math.cos(a) * innerR;
    const y = -Math.sin(a) * innerR;
    shape.lineTo(x, y);
  }
  shape.closePath();

  const extrudeSettings = { depth: height, bevelEnabled: false, curveSegments: segs };
  const g = new THREE.ExtrudeGeometry(shape, extrudeSettings);
  g.rotateX(-Math.PI / 2);
  const pg = prepareGeo(g, hex, 0.74, 1.06, 0.05, rng);
  g.dispose();
  pg.translate(cx, yBase, cz);
  return pg;
}

export function buildLandmarksWork(ctx = {}) {
  const layout = ctx.layout || {};
  const getGroundY = typeof ctx.getGroundY === 'function' ? ctx.getGroundY : () => 0;
  let currentQuality = ctx.quality || 'high';
  const seed = ctx.seed || 2468;
  const P = ctx.PALETTE || PALETTE;

  const rootGroup = new THREE.Group();
  rootGroup.name = 'landmarksWork';

  const stoneTex = createStoneTexture(seed);
  const plasterTex = createPlasterWoodTexture(seed + 19);

  const matStone = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: stoneTex,
    roughness: 0.86,
    metalness: 0.06,
    vertexColors: true
  });

  const matPlasterWood = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: plasterTex,
    roughness: 0.82,
    metalness: 0.05,
    vertexColors: true
  });

  const matMetalGold = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.36,
    metalness: 0.72,
    vertexColors: true
  });

  const matMossDirt = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.94,
    metalness: 0.02,
    vertexColors: true
  });

  const matCrimson = new THREE.MeshStandardMaterial({
    color: P.crimsonGlow || 0xff3a4a,
    emissive: P.crimsonGlow || 0xff3a4a,
    emissiveIntensity: 1.65,
    roughness: 0.28,
    metalness: 0.1,
    vertexColors: true
  });

  const matForge = new THREE.MeshStandardMaterial({
    color: P.forgeOrange || 0xff8a3a,
    emissive: P.forgeOrange || 0xff8a3a,
    emissiveIntensity: 1.85,
    roughness: 0.25,
    metalness: 0.08,
    vertexColors: true
  });

  const matWindow = new THREE.MeshStandardMaterial({
    color: P.warmWindow || 0xffc27a,
    emissive: P.warmWindow || 0xffc27a,
    emissiveIntensity: 0.9,
    roughness: 0.35,
    metalness: 0.05,
    vertexColors: true
  });

  const matSignGlyph = new THREE.MeshStandardMaterial({
    color: P.teal || 0x6fe0f0,
    emissive: P.teal || 0x6fe0f0,
    emissiveIntensity: 1.35,
    roughness: 0.3,
    metalness: 0.1,
    vertexColors: true
  });

  const matAO = new THREE.MeshBasicMaterial({
    color: 0x161e22,
    transparent: true,
    opacity: 0.44,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1
  });

  // The landmark materials use vertex colors, so the training props get their
  // own simple materials (module scope: they are disposed with the landmark).
  const matTrainWood = new THREE.MeshStandardMaterial({
    color: P.wood || 0x6a4a2e, roughness: 0.85, metalness: 0.05
  });
  const matTrainStraw = new THREE.MeshStandardMaterial({
    color: 0xc9b183, roughness: 0.95, metalness: 0.0
  });
  const matTrainStone = new THREE.MeshStandardMaterial({
    color: P.stoneMid || 0xaab4ba, roughness: 0.88, metalness: 0.05
  });
  const matTrainFlame = new THREE.MeshStandardMaterial({
    color: P.forgeOrange || 0xff8a3a,
    emissive: P.forgeOrange || 0xff8a3a,
    emissiveIntensity: 1.6,
    roughness: 0.3,
    metalness: 0.05
  });
  const matTrainRope = new THREE.MeshStandardMaterial({
    color: P.gold || 0xd8b45a, roughness: 0.45, metalness: 0.5
  });

  const materials = [
    matStone,
    matPlasterWood,
    matMetalGold,
    matMossDirt,
    matCrimson,
    matForge,
    matWindow,
    matSignGlyph,
    matAO,
    matTrainWood,
    matTrainStraw,
    matTrainStone,
    matTrainFlame,
    matTrainRope
  ];

  const colliders = [];
  const doors = [];
  const anchors = {};
  const lights = [];

  let animRefs = {
    forgeLightIdx: -1,
    synthLightIdx: -1,
    dummies: [],
    flames: [],
    time: 0
  };

  let stats = { meshes: 0, triangles: 0, drawCallsEstimate: 0 };
  let activeDisposables = [];

  function clearScene() {
    while (rootGroup.children.length > 0) {
      rootGroup.remove(rootGroup.children[0]);
    }
    for (const d of activeDisposables) {
      if (d && typeof d.dispose === 'function') d.dispose();
    }
    activeDisposables = [];
    colliders.length = 0;
    doors.length = 0;
    lights.length = 0;
    for (const k of Object.keys(anchors)) delete anchors[k];
    animRefs = {
      forgeLightIdx: -1,
      synthLightIdx: -1,
      dummies: [],
      flames: [],
      time: animRefs.time
    };
  }

  function registerAnchor(name, vec) {
    const obj = new THREE.Object3D();
    obj.name = name;
    obj.position.copy(vec);
    rootGroup.add(obj);
    anchors[name] = vec.clone();
    anchors[`${name}_obj`] = obj;
  }

  function buildSignPlate(stoneList, glyphList, pos, rotY = 0, rng) {
    addBox(stoneList, 2.25, 0.62, 0.14, pos.x, pos.y, pos.z, P.slate || 0x4a5560, rotY, 0, 0, 0.8, 1.05, rng);
    addBox(stoneList, 2.4, 0.74, 0.1, pos.x, pos.y, pos.z, P.wallLit || 0xc4cbcf, rotY, 0, 0, 0.8, 1.05, rng);
    addBox(glyphList, 1.85, 0.08, 0.16, pos.x, pos.y, pos.z, P.teal || 0x6fe0f0, rotY, 0, 0, 0.95, 1.05, rng);
  }

  function buildGeometryForQuality(q) {
    clearScene();
    const rng = mulberry32(seed + 99);

    const stoneGeos = [];
    const plasterWoodGeos = [];
    const metalGoldGeos = [];
    const mossDirtGeos = [];
    const crimsonGeos = [];
    const forgeGeos = [];
    const windowGeos = [];
    const signGlyphGeos = [];
    const aoGeos = [];

    const columnMatrices = [];
    const stakeMatrices = [];
    const crateMatrices = [];

    const dummy = new THREE.Object3D();

    // =========================================================================
    // 1. SYNTHESIS CHAMBER (Round Domed Building with 10 Columns & Crimson Glow)
    // =========================================================================
    const scCfg = layout.synthesis_chamber || {
      center: { x: 0.0, z: -32.0 },
      footprint: { type: 'circle', radius: 8.2, height: 9.0 },
      door: { id: 'door_synthesis_chamber', position: { x: 0.0, y: 0.0, z: -23.8 }, outward: { x: 0.0, y: 0.0, z: 1.0 } },
      signOffset: { x: 0, y: 15.0, z: 0 }
    };
    const scX = scCfg.center.x;
    const scZ = scCfg.center.z;
    const scY = getGroundY(scX, scZ);
    const scRad = (scCfg.footprint && scCfg.footprint.radius) || 8.2;
    const scH = (scCfg.footprint && scCfg.footprint.height) || 9.0;
    const scPodH = 0.8;
    const scFloorY = scY + scPodH;

    const scSegs = q === 'low' ? 20 : q === 'medium' ? 28 : 36;
    // Stepped circular podium foundation
    addCyl(stoneGeos, scRad + 0.9, scRad + 1.15, 0.42, scSegs, scX, scY + 0.21, scZ, P.groundDark || 0x68767c, 0, 0, 0, 0.7, 1.0, rng);
    addCyl(stoneGeos, scRad + 0.4, scRad + 0.6, 0.42, scSegs, scX, scY + 0.6, scZ, P.wallLit || 0xc4cbcf, 0, 0, 0, 0.78, 1.05, rng);

    // Main circular rotunda stone drum with recessed blind-arch panels (no black voids)
    const wallH = scH * 0.62;
    addCyl(stoneGeos, scRad - 0.55, scRad - 0.45, wallH, scSegs, scX, scFloorY + wallH * 0.5, scZ, P.wallShade || 0x8e9da3, 0, 0, 0, 0.74, 1.04, rng);

    // 10 Perimeter Columns around Synthesis Chamber (via InstancedMesh) + wall pilasters
    const scColCount = 10;
    for (let i = 0; i < scColCount; i++) {
      const a = (i / scColCount) * Math.PI * 2 + Math.PI / scColCount; // Straddles south door at +Z (angle PI/2)
      const cx = scX + Math.cos(a) * (scRad + 0.08);
      const cz = scZ + Math.sin(a) * (scRad + 0.08);
      dummy.position.set(cx, scFloorY, cz);
      dummy.rotation.set(0, -a + Math.PI / 2, 0);
      dummy.scale.set(0.82, (wallH - 0.1) / 8.72, 0.82);
      dummy.updateMatrix();
      columnMatrices.push(dummy.matrix.clone());

      // Recessed cream plaster panel between columns on the drum wall
      const aMid = a + Math.PI / scColCount;
      if (Math.sin(aMid) < 0.88) {
        const px = scX + Math.cos(aMid) * (scRad - 0.42);
        const pz = scZ + Math.sin(aMid) * (scRad - 0.42);
        addBox(plasterWoodGeos, 1.65, wallH * 0.65, 0.24, px, scFloorY + wallH * 0.48, pz, P.plaster || 0xdfe3df, -aMid + Math.PI / 2, 0, 0, 0.82, 1.06, rng);
        addBox(stoneGeos, 1.95, 0.32, 0.34, px, scFloorY + wallH * 0.82, pz, P.wallLit || 0xc4cbcf, -aMid + Math.PI / 2, 0, 0, 0.84, 1.08, rng);
      }
    }

    // Decorative Cornice & Frieze Ring atop the drum
    const corniceY = scFloorY + wallH;
    addCyl(stoneGeos, scRad + 0.55, scRad + 0.15, 0.52, scSegs, scX, corniceY + 0.26, scZ, P.wallLit || 0xc4cbcf, 0, 0, 0, 0.82, 1.08, rng);
    addCyl(stoneGeos, scRad + 0.35, scRad + 0.55, 0.38, scSegs, scX, corniceY + 0.71, scZ, P.wallShade || 0x8e9da3, 0, 0, 0, 0.8, 1.06, rng);

    // Ribbed Slate Dome with 10 Stone Ribs & Top Lantern Cupola
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

    // 10 Raised Stone Ribs curving up the dome to the lantern
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

    // Lantern Cupola & Finial on top of the Dome
    const lanternY = domeBaseY + domeR * 0.68 - 0.15;
    addCyl(stoneGeos, 1.55, 1.75, 0.45, 10, scX, lanternY + 0.22, scZ, P.wallLit || 0xc4cbcf, 0, 0, 0, 0.82, 1.08, rng);
    addCyl(stoneGeos, 1.25, 1.35, 1.45, 10, scX, lanternY + 1.15, scZ, P.wallShade || 0x8e9da3, 0, 0, 0, 0.8, 1.06, rng);
    addCyl(crimsonGeos, 1.05, 1.05, 0.95, 8, scX, lanternY + 1.15, scZ, P.crimsonGlow || 0xff3a4a, 0, 0, 0, 0.95, 1.05, rng);
    addCyl(stoneGeos, 0.12, 1.65, 1.15, 10, scX, lanternY + 2.4, scZ, P.slate || 0x4a5560, 0, 0, 0, 0.82, 1.08, rng);
    addCyl(metalGoldGeos, 0.04, 0.22, 0.85, 8, scX, lanternY + 3.3, scZ, P.gold || 0xd8b45a, 0, 0, 0, 0.9, 1.15, rng);

    // Double Arched Cream Doors with Gold Trim, Panels, Scorch Marks & Crimson Door-Gap Glow
    const doorZ = scZ + scRad - 0.15;
    // Monumental stone door surround & pediment
    addBox(stoneGeos, 3.6, 4.2, 0.95, scX, scFloorY + 2.1, doorZ, P.wallLit || 0xc4cbcf, 0, 0, 0, 0.78, 1.08, rng);
    addBox(stoneGeos, 4.1, 0.55, 1.18, scX, scFloorY + 4.35, doorZ + 0.05, P.wallShade || 0x8e9da3, 0, 0, 0, 0.84, 1.08, rng);

    // Scorch marks framing the threshold and lower jambs
    addBox(stoneGeos, 3.1, 1.8, 0.98, scX, scFloorY + 0.9, doorZ + 0.02, 0x262022, 0, 0, 0, 0.45, 0.75, rng);
    addBox(stoneGeos, 2.8, 0.08, 1.6, scX, scFloorY + 0.04, doorZ + 0.65, 0x221b1d, 0, 0, 0, 0.4, 0.65, rng);

    // Double cream door leaves
    for (const side of [-1, 1]) {
      const lx = scX + side * 0.74;
      addBox(plasterWoodGeos, 1.36, 3.55, 0.28, lx, scFloorY + 1.78, doorZ + 0.36, P.plaster || 0xdfe3df, 0, 0, 0, 0.82, 1.06, rng);
      // Gold trim rails, stiles & decorative panels
      addBox(metalGoldGeos, 1.4, 0.14, 0.34, lx, scFloorY + 3.45, doorZ + 0.37, P.gold || 0xd8b45a, 0, 0, 0, 0.88, 1.12, rng);
      addBox(metalGoldGeos, 1.4, 0.14, 0.34, lx, scFloorY + 1.85, doorZ + 0.37, P.gold || 0xd8b45a, 0, 0, 0, 0.88, 1.12, rng);
      addBox(metalGoldGeos, 1.4, 0.14, 0.34, lx, scFloorY + 0.25, doorZ + 0.37, P.gold || 0xd8b45a, 0, 0, 0, 0.88, 1.12, rng);
      addBox(metalGoldGeos, 0.82, 0.95, 0.32, lx, scFloorY + 2.65, doorZ + 0.37, P.gold || 0xd8b45a, 0, 0, 0, 0.88, 1.12, rng);
      addBox(metalGoldGeos, 0.82, 0.95, 0.32, lx, scFloorY + 1.05, doorZ + 0.37, P.gold || 0xd8b45a, 0, 0, 0, 0.88, 1.12, rng);
      // Gold ring handles
      addCyl(metalGoldGeos, 0.16, 0.16, 0.08, 8, scX + side * 0.24, scFloorY + 1.65, doorZ + 0.54, P.gold || 0xd8b45a, 0, Math.PI / 2, 0, 0.9, 1.15, rng);
    }

    // Crimson Glow from the Center Door Gap & Threshold Seam (Always On)
    addBox(crimsonGeos, 0.14, 3.62, 0.38, scX, scFloorY + 1.81, doorZ + 0.38, P.crimsonGlow || 0xff3a4a, 0, 0, 0, 0.95, 1.05, rng);
    addBox(crimsonGeos, 2.85, 0.1, 0.42, scX, scFloorY + 0.06, doorZ + 0.38, P.crimsonGlow || 0xff3a4a, 0, 0, 0, 0.95, 1.05, rng);
    addBox(crimsonGeos, 2.75, 0.12, 0.38, scX, scFloorY + 3.6, doorZ + 0.38, P.crimsonGlow || 0xff3a4a, 0, 0, 0, 0.95, 1.05, rng);

    // 4 Front Steps facing outward (+Z) & Engraved Ritual Terrace in front
    for (let s = 0; s < 4; s++) {
      const stepH = scPodH - s * 0.2;
      const sz = doorZ + 0.72 + s * 0.46;
      addBox(stoneGeos, 4.2 + s * 0.25, stepH, 0.48, scX, scY + stepH * 0.5, sz, s % 2 === 0 ? (P.wallLit || 0xc4cbcf) : (P.groundBase || 0xa9b6ba), 0, 0, 0, 0.76, 1.05, rng);
    }

    // Front ritual terrace paving with engraved crimson ritual lines (angular, non-concentric)
    const terZ = doorZ + 3.6;
    addBox(stoneGeos, 6.4, 0.12, 3.6, scX, scY + 0.06, terZ, P.groundBase || 0xa9b6ba, 0, 0, 0, 0.78, 1.04, rng);
    // Diamond & cross ritual channels
    for (const side of [-1, 1]) {
      addBox(crimsonGeos, 0.1, 0.06, 2.8, scX + side * 0.85, scY + 0.11, terZ - 0.1, P.crimsonGlow || 0xff3a4a, side * 0.48, 0, 0, 0.95, 1.05, rng);
      addBox(crimsonGeos, 0.1, 0.06, 2.4, scX + side * 1.65, scY + 0.11, terZ, P.crimsonGlow || 0xff3a4a, 0, 0, 0, 0.95, 1.05, rng);
    }
    addBox(crimsonGeos, 3.4, 0.06, 0.1, scX, scY + 0.11, terZ + 0.95, P.crimsonGlow || 0xff3a4a, 0, 0, 0, 0.95, 1.05, rng);
    addBox(crimsonGeos, 3.4, 0.06, 0.1, scX, scY + 0.11, terZ - 0.95, P.crimsonGlow || 0xff3a4a, 0, 0, 0, 0.95, 1.05, rng);

    // Moss & Ivy patches on Synthesis Chamber ledges
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

    const scSignPos = new THREE.Vector3(
      scX + ((scCfg.signOffset && scCfg.signOffset.x) || 0),
      scY + ((scCfg.signOffset && scCfg.signOffset.y) || 15.0),
      scZ + ((scCfg.signOffset && scCfg.signOffset.z) || 0)
    );
    registerAnchor('sign_synthesis_chamber', scSignPos);
    buildSignPlate(stoneGeos, signGlyphGeos, scSignPos, 0, rng);

    const scAo = new THREE.CircleGeometry(scRad + 1.5, 24);
    scAo.rotateX(-Math.PI / 2);
    scAo.translate(scX, scY + 0.02, scZ);
    aoGeos.push(scAo);

    // =========================================================================
    // 2. ARMORY (Dark Timber-and-Stone Building + Lean-To Forge Shed)
    // =========================================================================
    const arCfg = layout.armory || {
      center: { x: -6.0, z: -20.0 },
      footprint: { width: 10.5, height: 4.5, depth: 5.0, mainWidth: 7.0, mainDepth: 5.0, forgeWidth: 3.5, forgeDepth: 3.8 },
      door: { id: 'door_armory', position: { x: -6.0, y: 0.0, z: -17.4 }, outward: { x: 0.0, y: 0.0, z: 1.0 } },
      signOffset: { x: 0, y: 5.6, z: 0 }
    };
    const arX = arCfg.center.x;
    const arZ = arCfg.center.z;
    const arY = getGroundY(arX, arZ);
    const mainW = (arCfg.footprint && arCfg.footprint.mainWidth) || 7.0;
    const mainD = (arCfg.footprint && arCfg.footprint.mainDepth) || 5.0;
    const mainH = (arCfg.footprint && arCfg.footprint.height) || 4.5;
    const forgeW = (arCfg.footprint && arCfg.footprint.forgeWidth) || 3.5;
    const forgeD = (arCfg.footprint && arCfg.footprint.forgeDepth) || 3.8;

    // Position main hall centered on door X (-6.0), and lean-to forge shed attached on its +X side
    const hallX = arX - 1.25;
    const shedX = hallX + mainW * 0.5 + forgeW * 0.5 - 0.1;

    // Main Hall Stone Plinth & Ashlar Lower Walls
    addBox(stoneGeos, mainW + 0.4, 0.45, mainD + 0.4, hallX, arY + 0.225, arZ, P.groundDark || 0x68767c, 0, 0, 0, 0.7, 1.0, rng);
    addBox(stoneGeos, mainW, 1.8, mainD, hallX, arY + 1.35, arZ, P.wallShade || 0x8e9da3, 0, 0, 0, 0.74, 1.02, rng);
    // Upper Plaster & Heavy Dark Timber Framing
    addBox(plasterWoodGeos, mainW - 0.1, mainH - 2.1, mainD - 0.1, hallX, arY + 2.25 + (mainH - 2.1) * 0.5, arZ, P.plaster || 0xdfe3df, 0, 0, 0, 0.8, 1.05, rng);

    // Timber corner posts, horizontal belt beams, and diagonal braces
    for (const sx of [-1, 0, 1]) {
      for (const sz of [-1, 1]) {
        addBox(plasterWoodGeos, 0.28, mainH - 0.3, 0.28, hallX + sx * (mainW * 0.48), arY + (mainH - 0.3) * 0.5 + 0.3, arZ + sz * (mainD * 0.48), P.timber || 0x2b2623, 0, 0, 0, 0.65, 0.95, rng);
      }
    }
    addBox(plasterWoodGeos, mainW + 0.18, 0.26, mainD + 0.18, hallX, arY + 2.25, arZ, P.timber || 0x2b2623, 0, 0, 0, 0.68, 0.95, rng);
    addBox(plasterWoodGeos, mainW + 0.22, 0.28, mainD + 0.22, hallX, arY + mainH - 0.15, arZ, P.timber || 0x2b2623, 0, 0, 0, 0.68, 0.95, rng);

    // Pitched Slate Gable Roof on Main Hall
    const roofPeakH = 1.65;
    for (const side of [-1, 1]) {
      const slopeLen = Math.hypot(mainD * 0.5 + 0.45, roofPeakH);
      const slopeAng = Math.atan2(roofPeakH, mainD * 0.5 + 0.45);
      addBox(stoneGeos, mainW + 0.6, 0.24, slopeLen, hallX, arY + mainH + roofPeakH * 0.45, arZ + side * (mainD * 0.26), P.slate || 0x4a5560, 0, side * slopeAng, 0, 0.75, 1.06, rng);
    }
    // Gable end triangles filled with stepped timber/plaster courses
    for (let g = 0; g < 4; g++) {
      const gw = (mainD - 0.4) * (1 - g * 0.23);
      const gy = arY + mainH + 0.2 + g * 0.36;
      addBox(plasterWoodGeos, mainW - 0.08, 0.38, gw, hallX, gy, arZ, g % 2 === 0 ? (P.plaster || 0xdfe3df) : (P.timber || 0x2b2623), 0, 0, 0, 0.8, 1.04, rng);
    }
    addBox(stoneGeos, mainW + 0.7, 0.22, 0.32, hallX, arY + mainH + roofPeakH - 0.05, arZ, P.wallLit || 0xc4cbcf, 0, 0, 0, 0.85, 1.1, rng);

    // Heavy Iron-Banded Door at Armory entrance (front +Z face)
    const arDoorX = (arCfg.door && arCfg.door.position.x) || -6.0;
    const arDoorZ = arZ + mainD * 0.5;
    addBox(stoneGeos, 1.85, 2.55, 0.42, arDoorX, arY + 1.275, arDoorZ, P.wallLit || 0xc4cbcf, 0, 0, 0, 0.78, 1.06, rng);
    addBox(plasterWoodGeos, 1.42, 2.22, 0.26, arDoorX, arY + 1.15, arDoorZ + 0.08, P.wood || 0x6a4a2e, 0, 0, 0, 0.72, 1.02, rng);
    for (let b = 0; b < 3; b++) {
      addBox(metalGoldGeos, 1.48, 0.12, 0.32, arDoorX, arY + 0.55 + b * 0.68, arDoorZ + 0.09, P.slate || 0x4a5560, 0, 0, 0, 0.75, 1.05, rng);
    }

    // Barred Windows with Recessed Warm Interior Back-Wall (no black voids)
    for (const wxOff of [-2.05, 1.85]) {
      const wx = hallX + wxOff;
      const wz = arZ + mainD * 0.5;
      addBox(stoneGeos, 1.25, 1.25, 0.32, wx, arY + 2.45, wz, P.wallLit || 0xc4cbcf, 0, 0, 0, 0.78, 1.06, rng);
      addBox(windowGeos, 0.95, 0.95, 0.18, wx, arY + 2.45, wz + 0.08, P.warmWindow || 0xffc27a, 0, 0, 0, 0.9, 1.05, rng);
      for (const bar of [-0.26, 0, 0.26]) {
        addBox(metalGoldGeos, 0.06, 1.02, 0.26, wx + bar, arY + 2.45, wz + 0.12, P.timber || 0x2b2623, 0, 0, 0, 0.7, 0.95, rng);
      }
      addBox(metalGoldGeos, 1.02, 0.06, 0.26, wx, arY + 2.45, wz + 0.12, P.timber || 0x2b2623, 0, 0, 0, 0.7, 0.95, rng);
    }

    // Lean-To Forge Shed on +X Side with Timber Posts, Sloped Slate Roof, Stone Chimney, Hearth, Anvil & Quench Barrel
    addBox(stoneGeos, forgeW + 0.3, 0.36, forgeD + 0.3, shedX, arY + 0.18, arZ + 0.3, P.groundDark || 0x68767c, 0, 0, 0, 0.7, 1.0, rng);
    // Shed support posts
    for (const pzOff of [-forgeD * 0.42, forgeD * 0.42]) {
      addBox(plasterWoodGeos, 0.26, 2.85, 0.26, shedX + forgeW * 0.42, arY + 1.55, arZ + 0.3 + pzOff, P.timber || 0x2b2623, 0, 0, 0, 0.68, 0.95, rng);
    }
    // Lean-to sloped roof
    addBox(stoneGeos, forgeW + 0.55, 0.22, forgeD + 0.65, shedX + 0.1, arY + 3.35, arZ + 0.3, P.slate || 0x4a5560, 0, 0, -0.28, 0.76, 1.06, rng);

    // Tall Stone Chimney & Brick Hearth with Glowing Orange Forge Fire (PALETTE.forgeOrange)
    const forgePos = new THREE.Vector3(shedX - 0.35, arY + 1.05, arZ - 0.35);
    addBox(stoneGeos, 1.65, 2.35, 1.55, forgePos.x, arY + 1.35, forgePos.z, P.groundDark || 0x68767c, 0, 0, 0, 0.68, 1.0, rng);
    addBox(stoneGeos, 1.15, 3.6, 1.15, forgePos.x, arY + 4.15, forgePos.z, P.wallShade || 0x8e9da3, 0, 0, 0, 0.75, 1.06, rng);
    addBox(stoneGeos, 1.35, 0.28, 1.35, forgePos.x, arY + 5.95, forgePos.z, P.wallLit || 0xc4cbcf, 0, 0, 0, 0.84, 1.08, rng);
    // Emissive orange forge coals and fire core inside hearth hood
    addBox(forgeGeos, 0.95, 0.65, 0.85, forgePos.x + 0.15, arY + 1.05, forgePos.z + 0.42, P.forgeOrange || 0xff8a3a, 0, 0, 0, 0.9, 1.1, rng);
    addBox(forgeGeos, 0.65, 0.48, 0.55, forgePos.x + 0.18, arY + 1.35, forgePos.z + 0.48, 0xffd27a, 0.2, 0.1, 0, 0.95, 1.1, rng);

    // Heavy Iron Anvil on Timber Block + Quench Barrel
    const anvilPos = new THREE.Vector3(shedX + 0.55, arY + 0.95, arZ + 0.95);
    addCyl(plasterWoodGeos, 0.42, 0.46, 0.55, 8, anvilPos.x, arY + 0.62, anvilPos.z, P.wood || 0x6a4a2e, 0, 0, 0, 0.72, 1.0, rng);
    addBox(metalGoldGeos, 0.68, 0.34, 0.36, anvilPos.x, arY + 1.04, anvilPos.z, P.slate || 0x4a5560, 0.25, 0, 0, 0.78, 1.1, rng);
    addBox(metalGoldGeos, 0.42, 0.22, 0.24, anvilPos.x + 0.38, arY + 1.08, anvilPos.z + 0.08, P.slate || 0x4a5560, 0.25, 0, 0.15, 0.8, 1.1, rng);
    // Quench barrel
    addCyl(plasterWoodGeos, 0.38, 0.34, 0.82, 10, shedX + 1.15, arY + 0.75, arZ - 0.15, P.wood || 0x6a4a2e, 0, 0, 0, 0.72, 1.02, rng);
    addCyl(metalGoldGeos, 0.39, 0.39, 0.08, 10, shedX + 1.15, arY + 0.95, arZ - 0.15, P.timber || 0x2b2623, 0, 0, 0, 0.75, 1.0, rng);

    // Weapon Racks with Swords, Spears & Shields + Supply Crates outside Armory
    const rackX = hallX - 2.15;
    const rackZ = arZ + mainD * 0.5 + 0.65;
    addBox(plasterWoodGeos, 1.85, 1.35, 0.14, rackX, arY + 0.7, rackZ, P.wood || 0x6a4a2e, 0, -0.15, 0, 0.74, 1.02, rng);
    for (let w = 0; w < 4; w++) {
      const wx = rackX - 0.6 + w * 0.4;
      // Sword/spear silhouettes
      const bladeH = w % 2 === 0 ? 1.35 : 1.85;
      addBox(metalGoldGeos, 0.09, bladeH, 0.04, wx, arY + 0.45 + bladeH * 0.5, rackZ + 0.08, P.wallLit || 0xc4cbcf, 0, -0.15, 0, 0.85, 1.12, rng);
      addBox(metalGoldGeos, 0.28, 0.06, 0.08, wx, arY + 0.65, rackZ + 0.09, P.gold || 0xd8b45a, 0, -0.15, 0, 0.85, 1.1, rng);
    }
    // Round heater shield leaning against rack
    addCyl(metalGoldGeos, 0.48, 0.48, 0.08, 8, rackX + 1.15, arY + 0.55, rackZ + 0.12, P.slate || 0x4a5560, 0.2, Math.PI * 0.42, 0, 0.8, 1.08, rng);
    addCyl(metalGoldGeos, 0.16, 0.16, 0.12, 8, rackX + 1.15, arY + 0.55, rackZ + 0.14, P.gold || 0xd8b45a, 0.2, Math.PI * 0.42, 0, 0.88, 1.12, rng);

    // Wooden supply crates via InstancedMesh
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

    const arSignPos = new THREE.Vector3(
      arX + ((arCfg.signOffset && arCfg.signOffset.x) || 0),
      arY + ((arCfg.signOffset && arCfg.signOffset.y) || 5.6),
      arZ + ((arCfg.signOffset && arCfg.signOffset.z) || 0)
    );
    registerAnchor('sign_armory', arSignPos);
    buildSignPlate(stoneGeos, signGlyphGeos, arSignPos, 0, rng);

    // Required Armory Orange Forge Light Entry
    animRefs.forgeLightIdx = lights.length;
    lights.push({
      position: new THREE.Vector3(forgePos.x + 0.2, arY + 1.35, forgePos.z + 0.65),
      color: 0xff8a3a,
      intensity: 5.5,
      distance: 9.0,
      baseIntensity: 5.5
    });

    // =========================================================================
    // 3. TRAINING GROUNDS (Packed Dirt Yard, 12 Separate Dummy Children, Barricade)
    // =========================================================================
    const tgCfg = layout.training_grounds || {
      center: { x: -24.0, z: 20.0 },
      footprint: { type: 'box', width: 16.0, depth: 16.0, height: 2.5 },
      door: { id: 'door_training_grounds', position: { x: -18.0, y: 0.0, z: 18.0 }, outward: { x: 1.0, y: 0.0, z: 0.0 } },
      signOffset: { x: 0, y: 4.0, z: 0 }
    };
    const tgX = tgCfg.center.x;
    const tgZ = tgCfg.center.z;
    const tgY = getGroundY(tgX, tgZ);
    const tgW = (tgCfg.footprint && tgCfg.footprint.width) || 16.0;
    const tgD = (tgCfg.footprint && tgCfg.footprint.depth) || 16.0;

    // Packed-dirt yard with irregular stone curbing, worn dirt patches & cracks
    addBox(mossDirtGeos, tgW - 0.6, 0.1, tgD - 0.6, tgX, tgY + 0.05, tgZ, P.dirt || 0xa89f8a, 0, 0, 0, 0.78, 1.02, rng);
    for (let p = 0; p < 14; p++) {
      const px = tgX + (rng() - 0.5) * (tgW - 3.2);
      const pz = tgZ + (rng() - 0.5) * (tgD - 3.2);
      const pw = 1.6 + rng() * 2.4;
      const pd = 1.2 + rng() * 2.2;
      addBox(mossDirtGeos, pw, 0.11, pd, px, tgY + 0.055, pz, p % 2 === 0 ? 0x918772 : (P.dirt || 0xa89f8a), rng() * Math.PI, 0, 0, 0.72, 1.0, rng);
    }

    // Low Stone Fence with Hedge on North (-Z) and West (-X) perimeter sides
    const westX = tgX - tgW * 0.5 + 0.35;
    const northZ = tgZ - tgD * 0.5 + 0.35;
    // West wall & hedge
    addBox(stoneGeos, 0.52, 0.95, tgD - 0.4, westX, tgY + 0.475, tgZ, P.wallShade || 0x8e9da3, 0, 0, 0, 0.72, 1.04, rng);
    addBox(stoneGeos, 0.64, 0.18, tgD - 0.2, westX, tgY + 1.02, tgZ, P.wallLit || 0xc4cbcf, 0, 0, 0, 0.82, 1.08, rng);
    addBox(mossDirtGeos, 0.75, 0.85, tgD - 1.2, westX + 0.55, tgY + 0.45, tgZ, P.mossDark || 0x436836, 0, 0, 0, 0.72, 1.04, rng);
    // North wall & hedge
    addBox(stoneGeos, tgW - 0.4, 0.95, 0.52, tgX, tgY + 0.475, northZ, P.wallShade || 0x8e9da3, 0, 0, 0, 0.72, 1.04, rng);
    addBox(stoneGeos, tgW - 0.2, 0.18, 0.64, tgX, tgY + 1.02, northZ, P.wallLit || 0xc4cbcf, 0, 0, 0, 0.82, 1.08, rng);
    addBox(mossDirtGeos, tgW - 1.2, 0.85, 0.75, tgX, tgY + 0.45, northZ + 0.55, P.moss || 0x5f8a4a, 0, 0, 0, 0.74, 1.05, rng);

    // Stone fence piers along north and west walls
    for (let i = 0; i <= 4; i++) {
      const offset = -tgW * 0.5 + 0.35 + i * (tgW - 0.7) * 0.25;
      addBox(stoneGeos, 0.78, 1.35, 0.78, westX, tgY + 0.675, tgZ + offset, P.wallLit || 0xc4cbcf, 0, 0, 0, 0.76, 1.06, rng);
      addBox(stoneGeos, 0.78, 1.35, 0.78, tgX + offset, tgY + 0.675, northZ, P.wallLit || 0xc4cbcf, 0, 0, 0, 0.76, 1.06, rng);
    }
    colliders.push({ type: 'box', x: westX, z: tgZ, w: 0.9, d: tgD, rotY: 0 });
    colliders.push({ type: 'box', x: tgX, z: northZ, w: tgW, d: 0.9, rotY: 0 });

    // Spiked Wooden Barricade of Angled Stakes along South-East edge (via InstancedMesh)
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

    // 3 Barrels, Weapon Rack & Training Swords stuck in the ground
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
    // Yard weapon rack
    addBox(plasterWoodGeos, 2.2, 1.3, 0.35, tgX + 5.6, tgY + 0.65, tgZ - 5.2, P.wood || 0x6a4a2e, -0.35, 0, 0, 0.72, 1.02, rng);
    // Training swords stuck in the dirt
    const swordCoords = [
      { x: tgX - 1.2, z: tgZ + 1.1, rx: 0.22, rz: -0.15 },
      { x: tgX + 1.8, z: tgZ - 0.6, rx: -0.18, rz: 0.24 },
      { x: tgX - 3.4, z: tgZ + 2.8, rx: 0.14, rz: 0.19 }
    ];
    for (const sw of swordCoords) {
      addBox(metalGoldGeos, 0.08, 0.95, 0.03, sw.x, tgY + 0.42, sw.z, P.wallLit || 0xc4cbcf, 0.4, sw.rx, sw.rz, 0.82, 1.1, rng);
      addBox(plasterWoodGeos, 0.28, 0.06, 0.06, sw.x, tgY + 0.78, sw.z, P.wood || 0x6a4a2e, 0.4, sw.rx, sw.rz, 0.78, 1.04, rng);
    }

    // 12 Separate Cross-Post Dummies named `dummy_0` .. `dummy_11` with shared prototype BufferGeometry
    const dummyGeoParts = [];
    const dSegs = q === 'low' ? 6 : 10;
    // Wooden base stand & vertical post
    addCyl(dummyGeoParts, 0.45, 0.52, 0.16, dSegs, 0, 0.08, 0, P.wood || 0x6a4a2e, 0, 0, 0, 0.7, 1.0, rng);
    addCyl(dummyGeoParts, 0.11, 0.13, 1.85, dSegs, 0, 0.95, 0, P.wood || 0x6a4a2e, 0, 0, 0, 0.72, 1.02, rng);
    // 2 Horizontal crossbars (arms & shoulder brace)
    addBox(dummyGeoParts, 1.25, 0.13, 0.13, 0, 1.32, 0, P.wood || 0x6a4a2e, 0, 0, 0, 0.76, 1.04, rng);
    addBox(dummyGeoParts, 0.13, 0.13, 0.85, 0, 1.18, 0, P.wood || 0x6a4a2e, 0, 0, 0, 0.76, 1.04, rng);
    // Straw torso bundle & head target with rope wraps
    addCyl(dummyGeoParts, 0.31, 0.28, 0.78, dSegs, 0, 1.18, 0, P.gold || 0xd8b45a, 0, 0, 0, 0.78, 1.06, rng);
    addCyl(dummyGeoParts, 0.33, 0.33, 0.08, dSegs, 0, 1.38, 0, P.dirt || 0xa89f8a, 0, 0, 0, 0.7, 0.95, rng);
    addCyl(dummyGeoParts, 0.33, 0.33, 0.08, dSegs, 0, 0.98, 0, P.dirt || 0xa89f8a, 0, 0, 0, 0.7, 0.95, rng);
    addCyl(dummyGeoParts, 0.2, 0.18, 0.34, dSegs, 0, 1.72, 0, P.dirt || 0xa89f8a, 0, 0, 0, 0.82, 1.08, rng);

    const sharedDummyGeo = mergeGeometries(dummyGeoParts, false);
    for (const p of dummyGeoParts) p.dispose();
    activeDisposables.push(sharedDummyGeo);

    // Build 12 dummy coordinates (first 3 from layout.training_grounds.dummyPositions, plus 3 more rows of 3 in the yard)
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

    // =========================================================================
    // 3b. TRAINING SUB-ZONES (Archery Targets, Fire Targets, Sparring Ring)
    // =========================================================================
    const tgZones = tgCfg.trainingZones || {};
    const archCfg = tgZones.archery_targets;
    const fireCfg = tgZones.fire_targets;
    const ringCfg = tgZones.sparring_ring;

    // The landmark materials use vertex colors, so the training props use the
    // dedicated matTrain* materials declared at landmark scope.

    // --- Archery targets: a timber post carrying a straw bullseye ---------
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

    // --- Fire targets: a stone brazier the mage lights --------------------
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

    // --- Sparring ring: a rope circle pinned by four posts -----------------
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

    const tgSignPos = new THREE.Vector3(
      tgX + ((tgCfg.signOffset && tgCfg.signOffset.x) || 0),
      tgY + ((tgCfg.signOffset && tgCfg.signOffset.y) || 4.0),
      tgZ + ((tgCfg.signOffset && tgCfg.signOffset.z) || 0)
    );
    registerAnchor('sign_training_grounds', tgSignPos);
    buildSignPlate(stoneGeos, signGlyphGeos, tgSignPos, Math.PI * 0.5, rng);

    // =========================================================================
    // 4. MESS HALL ROW (Long Low Row of 6 Connected Houses along South Wall)
    // =========================================================================
    const mhCfg = layout.mess_hall_row || {
      center: { x: 8.0, z: 38.0 },
      footprint: { type: 'box', width: 22.8, depth: 4.4, height: 4.4 },
      door: { id: 'door_mess_hall', position: { x: 8.0, y: 0.0, z: 35.8 }, outward: { x: 0.0, y: 0.0, z: -1.0 } },
      signOffset: { x: 0, y: 5.2, z: 0 }
    };
    const mhX = mhCfg.center.x;
    const mhZ = mhCfg.center.z;
    const mhY = getGroundY(mhX, mhZ);
    const mhW = (mhCfg.footprint && mhCfg.footprint.width) || 22.8;
    const mhD = (mhCfg.footprint && mhCfg.footprint.depth) || 4.4;
    const mhH = (mhCfg.footprint && mhCfg.footprint.height) || 4.4;

    const unitCount = 6;
    const unitW = mhW / unitCount; // 3.8 units each
    const startX = mhX - mhW * 0.5 + unitW * 0.5;

    // Continuous stone foundation plinth
    addBox(stoneGeos, mhW + 0.4, 0.42, mhD + 0.4, mhX, mhY + 0.21, mhZ, P.groundDark || 0x68767c, 0, 0, 0, 0.7, 1.0, rng);

    for (let u = 0; u < unitCount; u++) {
      const ux = startX + u * unitW;
      const uH = mhH - 0.8 + (u % 2) * 0.22;

      // Lower stone course & upper plaster body
      addBox(stoneGeos, unitW + 0.04, 1.25, mhD, ux, mhY + 0.95, mhZ, P.wallShade || 0x8e9da3, 0, 0, 0, 0.74, 1.02, rng);
      addBox(plasterWoodGeos, unitW, uH - 1.25, mhD - 0.08, ux, mhY + 1.55 + (uH - 1.25) * 0.5, mhZ, u % 2 === 0 ? (P.plaster || 0xdfe3df) : (P.wallLit || 0xc4cbcf), 0, 0, 0, 0.8, 1.05, rng);

      // Stone party wall pilaster between connected houses
      addBox(stoneGeos, 0.34, uH + 0.3, mhD + 0.24, ux - unitW * 0.5, mhY + (uH + 0.3) * 0.5 + 0.2, mhZ, P.wallLit || 0xc4cbcf, 0, 0, 0, 0.76, 1.06, rng);

      // Pitched slate roof per house
      const rPeak = 1.25;
      for (const side of [-1, 1]) {
        const sLen = Math.hypot(mhD * 0.5 + 0.35, rPeak);
        const sAng = Math.atan2(rPeak, mhD * 0.5 + 0.35);
        addBox(stoneGeos, unitW + 0.12, 0.2, sLen, ux, mhY + uH + rPeak * 0.45, mhZ + side * (mhD * 0.25), P.slate || 0x4a5560, 0, side * sAng, 0, 0.76, 1.06, rng);
      }

      // Chimney on alternate houses
      if (u % 2 === 1) {
        addBox(stoneGeos, 0.68, 1.45, 0.68, ux + 0.8, mhY + uH + 1.15, mhZ + 0.6, P.wallShade || 0x8e9da3, 0, 0, 0, 0.78, 1.06, rng);
      }

      // Shuttered Windows on front (-Z) face
      const winZ = mhZ - mhD * 0.5;
      if (u !== 2) {
        addBox(stoneGeos, 1.15, 1.15, 0.24, ux, mhY + 2.15, winZ, P.wallLit || 0xc4cbcf, 0, 0, 0, 0.78, 1.05, rng);
        addBox(windowGeos, 0.78, 0.82, 0.14, ux, mhY + 2.15, winZ - 0.04, P.warmWindow || 0xffc27a, 0, 0, 0, 0.85, 1.05, rng);
        // Closed/half-shuttered wooden shutters
        addBox(plasterWoodGeos, 0.42, 0.88, 0.18, ux - 0.24, mhY + 2.15, winZ - 0.08, P.wood || 0x6a4a2e, 0.12, 0, 0, 0.74, 1.02, rng);
        addBox(plasterWoodGeos, 0.42, 0.88, 0.18, ux + 0.24, mhY + 2.15, winZ - 0.08, P.wood || 0x6a4a2e, -0.12, 0, 0, 0.74, 1.02, rng);
      }
    }
    // End pilaster on 6th unit
    addBox(stoneGeos, 0.34, mhH - 0.5, mhD + 0.24, mhX + mhW * 0.5, mhY + (mhH - 0.5) * 0.5 + 0.2, mhZ, P.wallLit || 0xc4cbcf, 0, 0, 0, 0.76, 1.06, rng);

    // Locked Main Door at X = 8.0, Z = 35.8 with Heavy Crossed Iron Chains & Padlock
    const mhDoorX = (mhCfg.door && mhCfg.door.position.x) || 8.0;
    const mhDoorZ = mhZ - mhD * 0.5;
    addBox(stoneGeos, 2.05, 2.55, 0.42, mhDoorX, mhY + 1.35, mhDoorZ, P.wallLit || 0xc4cbcf, 0, 0, 0, 0.78, 1.06, rng);
    addBox(plasterWoodGeos, 1.52, 2.22, 0.26, mhDoorX, mhY + 1.22, mhDoorZ - 0.08, P.timber || 0x2b2623, 0, 0, 0, 0.7, 0.98, rng);
    // Heavy crossed iron chains & padlock across locked door
    addBox(metalGoldGeos, 1.65, 0.14, 0.32, mhDoorX, mhY + 1.32, mhDoorZ - 0.12, P.slate || 0x4a5560, 0, 0, 0.42, 0.8, 1.08, rng);
    addBox(metalGoldGeos, 1.65, 0.14, 0.32, mhDoorX, mhY + 1.32, mhDoorZ - 0.12, P.slate || 0x4a5560, 0, 0, -0.42, 0.8, 1.08, rng);
    addBox(metalGoldGeos, 0.28, 0.36, 0.38, mhDoorX, mhY + 1.24, mhDoorZ - 0.15, P.gold || 0xd8b45a, 0, 0, 0, 0.88, 1.12, rng);

    // Moss along Mess Hall eaves
    for (let m = 0; m < 6; m++) {
      addBox(mossDirtGeos, 1.8, 0.18, 0.45, startX + m * unitW, mhY + mhH - 0.45, mhZ - mhD * 0.5, P.moss || 0x5f8a4a, 0, 0, 0, 0.78, 1.05, rng);
    }

    colliders.push({ type: 'box', x: mhX, z: mhZ, w: mhW + 0.4, d: mhD + 0.4, rotY: 0 });

    const mhDoorPos = new THREE.Vector3(mhDoorX, mhY, (mhCfg.door && mhCfg.door.position.z) || 35.8);
    const mhDoorOut = new THREE.Vector3(0, 0, -1);
    doors.push({ id: (mhCfg.door && mhCfg.door.id) || 'door_mess_hall', position: mhDoorPos, outward: mhDoorOut });
    registerAnchor('door_mess_hall', mhDoorPos);
    registerAnchor('door_mess_hall_row', mhDoorPos);

    const mhSignPos = new THREE.Vector3(
      mhX + ((mhCfg.signOffset && mhCfg.signOffset.x) || 0),
      mhY + ((mhCfg.signOffset && mhCfg.signOffset.y) || 5.2),
      mhZ + ((mhCfg.signOffset && mhCfg.signOffset.z) || 0)
    );
    registerAnchor('sign_mess_hall_row', mhSignPos);
    registerAnchor('sign_mess_hall', mhSignPos);
    buildSignPlate(stoneGeos, signGlyphGeos, mhSignPos, Math.PI, rng);

    // =========================================================================
    // 5. DUNGEON BOARD (Wooden Notice Board, Shingle Roof, Pinned Papers, Hook)
    // =========================================================================
    const dbCfg = layout.dungeon_board || {
      center: { x: 6.0, z: -2.0 },
      footprint: { type: 'box', width: 2.3, depth: 0.8, height: 3.0 },
      signOffset: { x: 0, y: 3.4, z: 0 }
    };
    const dbX = dbCfg.center.x;
    const dbZ = dbCfg.center.z;
    const dbY = getGroundY(dbX, dbZ);
    const dbW = (dbCfg.footprint && dbCfg.footprint.width) || 2.3;
    const dbD = (dbCfg.footprint && dbCfg.footprint.depth) || 0.8;
    const dbH = (dbCfg.footprint && dbCfg.footprint.height) || 3.0;

    // Stepped Stone Base
    addBox(stoneGeos, dbW + 0.35, 0.32, dbD + 0.35, dbX, dbY + 0.16, dbZ, P.groundDark || 0x68767c, 0, 0, 0, 0.72, 1.02, rng);
    addBox(stoneGeos, dbW + 0.1, 0.24, dbD + 0.1, dbX, dbY + 0.44, dbZ, P.wallLit || 0xc4cbcf, 0, 0, 0, 0.8, 1.06, rng);

    // Two Vertical Timber Posts & Recessed Cork/Wood Backing Board
    for (const side of [-1, 1]) {
      addBox(plasterWoodGeos, 0.24, dbH - 0.4, 0.26, dbX + side * (dbW * 0.44), dbY + 0.4 + (dbH - 0.4) * 0.5, dbZ, P.timber || 0x2b2623, 0, 0, 0, 0.68, 0.96, rng);
    }
    addBox(plasterWoodGeos, dbW - 0.22, 1.55, 0.14, dbX, dbY + 1.75, dbZ, P.wood || 0x6a4a2e, 0, 0, 0, 0.75, 1.04, rng);
    addBox(plasterWoodGeos, dbW + 0.05, 0.16, 0.28, dbX, dbY + 0.95, dbZ, P.timber || 0x2b2623, 0, 0, 0, 0.7, 0.98, rng);
    addBox(plasterWoodGeos, dbW + 0.05, 0.16, 0.28, dbX, dbY + 2.55, dbZ, P.timber || 0x2b2623, 0, 0, 0, 0.7, 0.98, rng);

    // Small Pitched Shingle Roof Overhang
    for (const side of [-1, 1]) {
      addBox(stoneGeos, dbW + 0.48, 0.14, 0.68, dbX, dbY + dbH - 0.12, dbZ + side * 0.26, P.slate || 0x4a5560, 0, side * 0.42, 0, 0.78, 1.08, rng);
    }
    addBox(plasterWoodGeos, dbW + 0.54, 0.14, 0.18, dbX, dbY + dbH + 0.04, dbZ, P.timber || 0x2b2623, 0, 0, 0, 0.8, 1.05, rng);

    // Pinned Quest Papers on both front and back faces (thin flat quads in off-white/tan tones)
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
        // Crimson wax seal / pin at top of paper
        addBox(crimsonGeos, 0.05, 0.05, 0.03, px, py + ph * 0.36, dbZ + face * 0.095, P.crimsonGlow || 0xff3a4a, 0, 0, 0, 0.95, 1.05, rng);
      }
    }

    // Iron Lantern Hook & Warm Hanging Lantern on side of Dungeon Board
    const hookX = dbX + dbW * 0.5 + 0.22;
    addBox(metalGoldGeos, 0.42, 0.07, 0.07, hookX - 0.1, dbY + 2.45, dbZ, P.slate || 0x4a5560, 0, 0, 0.2, 0.8, 1.05, rng);
    addCyl(windowGeos, 0.14, 0.11, 0.28, 6, hookX + 0.06, dbY + 2.22, dbZ, P.warmWindow || 0xffc27a, 0, 0, 0, 0.95, 1.05, rng);
    addCyl(metalGoldGeos, 0.04, 0.18, 0.12, 6, hookX + 0.06, dbY + 2.4, dbZ, P.slate || 0x4a5560, 0, 0, 0, 0.8, 1.05, rng);

    colliders.push({ type: 'box', x: dbX, z: dbZ, w: dbW + 0.3, d: dbD + 0.4, rotY: 0 });

    const dbSignPos = new THREE.Vector3(
      dbX + ((dbCfg.signOffset && dbCfg.signOffset.x) || 0),
      dbY + ((dbCfg.signOffset && dbCfg.signOffset.y) || 3.4),
      dbZ + ((dbCfg.signOffset && dbCfg.signOffset.z) || 0)
    );
    registerAnchor('sign_dungeon_board', dbSignPos);
    buildSignPlate(stoneGeos, signGlyphGeos, dbSignPos, 0, rng);

    // =========================================================================
    // MERGE STATIC GEOMETRIES & BUILD INSTANCED MESHES
    // =========================================================================
    let totalTris = 0;
    let totalMeshes = 0;

    function addMergedMesh(geoList, mat, name, renderOrder = 0) {
      if (geoList.length === 0) return;
      const merged = mergeGeometries(geoList, false);
      for (const g of geoList) g.dispose();
      if (!merged) return;
      activeDisposables.push(merged);
      const mesh = new THREE.Mesh(merged, mat);
      mesh.name = name;
      mesh.frustumCulled = true;
      if (renderOrder !== 0) mesh.renderOrder = renderOrder;
      rootGroup.add(mesh);
      totalMeshes++;
      totalTris += merged.attributes.position.count / 3;
    }

    addMergedMesh(stoneGeos, matStone, 'landmarksWork_stone');
    addMergedMesh(plasterWoodGeos, matPlasterWood, 'landmarksWork_plasterWood');
    addMergedMesh(metalGoldGeos, matMetalGold, 'landmarksWork_metalGold');
    addMergedMesh(mossDirtGeos, matMossDirt, 'landmarksWork_mossDirt');
    addMergedMesh(crimsonGeos, matCrimson, 'landmarksWork_crimson');
    addMergedMesh(forgeGeos, matForge, 'landmarksWork_forge');
    addMergedMesh(windowGeos, matWindow, 'landmarksWork_windows');
    addMergedMesh(signGlyphGeos, matSignGlyph, 'landmarksWork_signGlyphs');

    if (aoGeos.length > 0) {
      const nonIdxAo = aoGeos.map(g => (g.index ? g.toNonIndexed() : g));
      const mergedAo = mergeGeometries(nonIdxAo, false);
      for (const g of aoGeos) g.dispose();
      for (const g of nonIdxAo) g.dispose();
      if (mergedAo) {
        activeDisposables.push(mergedAo);
        const aoMesh = new THREE.Mesh(mergedAo, matAO);
        aoMesh.name = 'landmarksWork_ao';
        aoMesh.renderOrder = 1;
        rootGroup.add(aoMesh);
        totalMeshes++;
        totalTris += mergedAo.attributes.position.count / 3;
      }
    }

    // Instanced Synthesis Chamber Columns
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
      totalMeshes++;
      totalTris += (colProto.attributes.position.count / 3) * columnMatrices.length;
    }

    // Instanced Spiked Wooden Barricade Stakes
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
      totalMeshes++;
      totalTris += (stakeProto.attributes.position.count / 3) * stakeMatrices.length;
    }

    // Instanced Supply Crates
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
      totalMeshes++;
      totalTris += (crateProto.attributes.position.count / 3) * crateMatrices.length;
    }

    // Account for the 12 separate dummy meshes
    if (animRefs.dummies.length > 0) {
      const dTris = sharedDummyGeo.attributes.position.count / 3;
      totalMeshes += animRefs.dummies.length;
      totalTris += dTris * animRefs.dummies.length;
    }

    stats = {
      meshes: totalMeshes,
      triangles: Math.round(totalTris),
      drawCallsEstimate: totalMeshes
    };
  }

  buildGeometryForQuality(currentQuality);

  function update(dt = 0.016) {
    animRefs.time += dt;
    const t = animRefs.time;

    // Subtle forge fire flicker & crimson synthesis pulse (allocation-free)
    const flicker = 1.0 + Math.sin(t * 9.5) * 0.12 + Math.cos(t * 15.3) * 0.06;
    matForge.emissiveIntensity = (matForge.userData.baseEmissive || 1.85) * flicker;
    matCrimson.emissiveIntensity = (matCrimson.userData.baseEmissive || 1.65) * (0.94 + Math.sin(t * 2.4) * 0.08);

    if (animRefs.forgeLightIdx >= 0 && lights[animRefs.forgeLightIdx]) {
      const fl = lights[animRefs.forgeLightIdx];
      fl.intensity = (fl.baseIntensity || 5.5) * flicker;
    }

    // Training brazier flames flicker and stretch (allocation-free)
    if (animRefs.flames.length > 0) {
      matTrainFlame.emissiveIntensity = 1.6 * flicker;
      for (let i = 0; i < animRefs.flames.length; i++) {
        const f = animRefs.flames[i];
        const s = 1.0 + Math.sin(t * 8.0 + i * 1.7) * 0.16 + Math.cos(t * 13.1 + i) * 0.07;
        f.scale.set(0.9 + (s - 1) * 0.4, s, 0.9 + (s - 1) * 0.4);
      }
    }
  }

  function setLighting(lighting = {}) {
    const winGlow = typeof lighting.windowGlow === 'number' ? lighting.windowGlow : 0.65;
    const lampGlow = typeof lighting.lampGlow === 'number' ? lighting.lampGlow : winGlow;

    // Windows scale with lighting.windowGlow
    matWindow.emissiveIntensity = 0.15 + winGlow * 1.45;
    matSignGlyph.emissiveIntensity = 1.05 + lampGlow * 0.55;

    // Armory forge and Synthesis door glow stay ALWAYS on, increasing slightly at night per Addendum (b)
    const forgeBase = 1.65 + lampGlow * 0.65;
    const crimsonBase = 1.45 + lampGlow * 0.65;
    matForge.userData.baseEmissive = forgeBase;
    matCrimson.userData.baseEmissive = crimsonBase;
    matForge.emissiveIntensity = forgeBase;
    matCrimson.emissiveIntensity = crimsonBase;

    if (animRefs.forgeLightIdx >= 0 && lights[animRefs.forgeLightIdx]) {
      lights[animRefs.forgeLightIdx].baseIntensity = 5.5 * (0.88 + lampGlow * 0.28);
      lights[animRefs.forgeLightIdx].intensity = lights[animRefs.forgeLightIdx].baseIntensity;
    }
  }

  function setTimeOfDay(t = 0.3) {
    const isNight = t < 0.22 || t > 0.78;
    const factor = isNight ? 1.0 : 0.22;
    setLighting({ windowGlow: factor, lampGlow: factor });
  }

  function setQuality(q) {
    if (!q || q === currentQuality) return;
    currentQuality = q;
    buildGeometryForQuality(currentQuality);
  }

  function getStats() {
    return { ...stats };
  }

  function dispose() {
    clearScene();
    stoneTex.dispose();
    plasterTex.dispose();
    for (const m of materials) {
      if (m && typeof m.dispose === 'function') m.dispose();
    }
  }

  return {
    group: rootGroup,
    colliders,
    doors,
    anchors,
    lights,
    update,
    setLighting,
    setTimeOfDay,
    setQuality,
    getStats,
    dispose
  };
}
