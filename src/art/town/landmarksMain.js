import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { PALETTE } from './palette.js';
import { getSignLayout } from './layout.js';
import { FLOOR_DECAL_LAYERS } from './layout.js';

function mulberry32(a) {
  return function() {
    let t = a += 0x6D2B79F5;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function createStoneTexture(seed = 101) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  const rng = mulberry32(seed);

  ctx.fillStyle = '#d6dce0';
  ctx.fillRect(0, 0, 512, 512);

  for (let i = 0; i < 6000; i++) {
    const x = rng() * 512;
    const y = rng() * 512;
    const v = 185 + Math.floor(rng() * 55);
    ctx.fillStyle = `rgb(${v},${v + 2},${v + 5})`;
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
      const shade = 215 + Math.floor((rng() - 0.5) * 26);
      ctx.fillStyle = `rgba(${shade},${shade + 3},${shade + 6},0.28)`;
      ctx.fillRect(bx + 2, y + 2, colW - 4, rowH - 4);

      ctx.beginPath();
      ctx.moveTo(bx, y);
      ctx.lineTo(bx + (rng() - 0.5) * 2, y + rowH);
      ctx.stroke();

      ctx.strokeStyle = 'rgba(255,255,255,0.35)';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(bx + 3, y + 3, colW - 6, rowH - 6);
      ctx.strokeStyle = '#68767c';
      ctx.lineWidth = 3;
    }
  }

  for (let i = 0; i < 28; i++) {
    const cx = rng() * 512;
    const cy = rng() * 512;
    const rad = 10 + rng() * 28;
    const grad = ctx.createRadialGradient(cx, cy, 1, cx, cy, rad);
    grad.addColorStop(0, 'rgba(67, 104, 54, 0.38)');
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

export function createPortalSwirlTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  const cx = 256;
  const cy = 256;

  ctx.clearRect(0, 0, 512, 512);

  const bgGrad = ctx.createRadialGradient(cx, cy, 8, cx, cy, 250);
  bgGrad.addColorStop(0, 'rgba(235, 252, 255, 1.0)');
  bgGrad.addColorStop(0.22, 'rgba(130, 225, 255, 0.92)');
  bgGrad.addColorStop(0.55, 'rgba(55, 145, 255, 0.65)');
  bgGrad.addColorStop(0.85, 'rgba(25, 70, 175, 0.22)');
  bgGrad.addColorStop(1.0, 'rgba(10, 30, 90, 0.0)');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, 512, 512);

  ctx.save();
  ctx.translate(cx, cy);
  for (let arm = 0; arm < 6; arm++) {
    ctx.save();
    ctx.rotate((arm * Math.PI * 2) / 6);
    ctx.beginPath();
    for (let r = 8; r < 235; r += 3) {
      const a = r * 0.026;
      const x = Math.cos(a) * r;
      const y = Math.sin(a) * r;
      if (r === 8) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = arm % 2 === 0 ? 'rgba(210, 248, 255, 0.55)' : 'rgba(90, 195, 255, 0.4)';
    ctx.lineWidth = 10;
    ctx.lineCap = 'round';
    ctx.stroke();
    ctx.restore();
  }

  ctx.strokeStyle = 'rgba(220, 250, 255, 0.75)';
  ctx.lineWidth = 2.5;
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    const r1 = 155 + (i % 2) * 8;
    const r2 = 185 - (i % 3) * 5;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * r1, Math.sin(a) * r1);
    ctx.lineTo(Math.cos(a + 0.06) * r2, Math.sin(a + 0.06) * r2);
    ctx.stroke();
  }
  ctx.restore();

  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

function prepareGeo(geo, baseHex, bottomDark = 0.78, topLight = 1.06, noiseAmp = 0.05, rng = Math.random) {
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
  const c = new THREE.Color(baseHex);

  const uvs = new Float32Array(count * 2);
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
    const f = Math.max(0.25, Math.min(1.35, grad + upBias + n));

    colors[i * 3] = Math.min(1, c.r * f);
    colors[i * 3 + 1] = Math.min(1, c.g * f);
    colors[i * 3 + 2] = Math.min(1, c.b * f);

    if (Math.abs(ny) > 0.75) {
      uvs[i * 2] = x * 0.18;
      uvs[i * 2 + 1] = z * 0.18;
    } else if (Math.abs(nx) > Math.abs(nz)) {
      uvs[i * 2] = z * 0.18;
      uvs[i * 2 + 1] = y * 0.18;
    } else {
      uvs[i * 2] = x * 0.18;
      uvs[i * 2 + 1] = y * 0.18;
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

// Places a flat floor decal on its decal layer so that it never shares a
// plane with the floor it is inlaid in. `floorY` is the Y of that floor,
// `height` the thickness of the decal, `layer` one entry of
// FLOOR_DECAL_LAYERS. A decal thick enough to reach the layer height is
// embedded in the floor (only its top face shows, so the inlay relief does
// not change); a thinner decal is lifted off the floor by the layer's
// `lift`, which keeps it flush with the surface.
function decalCenterY(floorY, height, layer) {
  if (height >= layer.top) return floorY + layer.top - height * 0.5;
  return floorY + layer.lift + height * 0.5;
}

export function buildLandmarksMain(ctx = {}) {
  const layout = ctx.layout || {};
  const getGroundY = typeof ctx.getGroundY === 'function' ? ctx.getGroundY : () => 0;
  let currentQuality = ctx.quality || 'high';
  const seed = ctx.seed || 1337;
  const P = ctx.PALETTE || PALETTE;

  const rootGroup = new THREE.Group();
  rootGroup.name = 'landmarksMain';

  const stoneTex = createStoneTexture(seed);
  const portalTex = createPortalSwirlTexture();

  const matStone = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: stoneTex,
    roughness: 0.86,
    metalness: 0.06,
    vertexColors: true
  });

  const matMoss = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.92,
    metalness: 0.02,
    vertexColors: true,
    // The mossy floor joints are a decal layer of their own: the depth bias
    // keeps them winning against the paving they lie on.
    polygonOffset: true,
    polygonOffsetFactor: FLOOR_DECAL_LAYERS.moss.polygonOffsetFactor,
    polygonOffsetUnits: FLOOR_DECAL_LAYERS.moss.polygonOffsetUnits
  });

  const matGlyph = new THREE.MeshStandardMaterial({
    color: P.teal || 0x6fe0f0,
    emissive: P.teal || 0x6fe0f0,
    emissiveIntensity: 1.45,
    roughness: 0.3,
    metalness: 0.1,
    vertexColors: true
  });

  // The glowing lines inlaid in the floors. They are a separate mesh from
  // the raised glyphs (wall runes, sign plates) so they can be drawn after
  // the ground without writing depth: two flat surfaces on the same plane
  // z-fight, and the crawling edges show up as hatched stripes.
  const matFloorGlyph = new THREE.MeshStandardMaterial({
    color: P.teal || 0x6fe0f0,
    emissive: P.teal || 0x6fe0f0,
    emissiveIntensity: 1.45,
    roughness: 0.3,
    metalness: 0.1,
    vertexColors: true,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: FLOOR_DECAL_LAYERS.inlay.polygonOffsetFactor,
    polygonOffsetUnits: FLOOR_DECAL_LAYERS.inlay.polygonOffsetUnits
  });

  const matSphere = new THREE.MeshStandardMaterial({
    color: P.sphereCyan || 0xa8f4ff,
    emissive: P.sphereCyan || 0xa8f4ff,
    emissiveIntensity: 1.75,
    roughness: 0.18,
    metalness: 0.15
  });

  const matSphereRing = new THREE.MeshStandardMaterial({
    color: 0xe6fbff,
    emissive: P.teal || 0x6fe0f0,
    emissiveIntensity: 1.5,
    roughness: 0.25,
    metalness: 0.65
  });

  const matPortal = new THREE.MeshBasicMaterial({
    map: portalTex,
    color: 0x99dcff,
    transparent: true,
    opacity: 0.92,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide
  });

  const matShaft = new THREE.MeshBasicMaterial({
    color: P.sphereCyan || 0xa8f4ff,
    transparent: true,
    opacity: 0.13,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
    vertexColors: true
  });

  const matAO = new THREE.MeshBasicMaterial({
    color: 0x182228,
    transparent: true,
    opacity: 0.42,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: FLOOR_DECAL_LAYERS.patch.polygonOffsetFactor,
    polygonOffsetUnits: FLOOR_DECAL_LAYERS.patch.polygonOffsetUnits
  });

  const materials = [
    matStone,
    matMoss,
    matGlyph,
    matFloorGlyph,
    matSphere,
    matSphereRing,
    matPortal,
    matShaft,
    matAO
  ];

  const colliders = [];
  const doors = [];
  const anchors = {};
  const lights = [];

  let animRefs = {
    sphereMesh: null,
    sphereRings: [],
    portalDisc: null,
    portalRings: [],
    shaftMesh: null,
    time: 0
  };

  let stats = { meshes: 0, triangles: 0, drawCallsEstimate: 0 };
  let activeDisposables = [];

  function clearScene() {
    while (rootGroup.children.length > 0) {
      const ch = rootGroup.children[0];
      rootGroup.remove(ch);
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
      sphereMesh: null,
      sphereRings: [],
      portalDisc: null,
      portalRings: [],
      shaftMesh: null,
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

  // A zone signpost: a timber post standing on the terrain up to a slate
  // board whose bottom sits 2m above the ground. The board only ever rotates
  // around Y (the facing angle comes from the layout data), so it never tilts.
  function buildSignPost(stoneList, glyphList, plan, rng) {
    const postH = plan.post.height;
    addBox(stoneList, plan.post.width, postH + 0.12, plan.post.width,
      plan.x, plan.groundY + (postH + 0.12) * 0.5, plan.z,
      P.timber || 0x2b2623, plan.rotY, 0, 0, 0.72, 1.0, rng);
    addBox(stoneList, plan.board.width, plan.board.height, plan.board.depth,
      plan.x, plan.boardY, plan.z, P.slate || 0x4a5560, plan.rotY, 0, 0, 0.8, 1.05, rng);
    // Teal trim along the lower edge, clear of the text in the middle
    addBox(glyphList, plan.board.width - 0.3, 0.06, plan.board.depth + 0.02,
      plan.x, plan.boardY - plan.board.height * 0.5 + 0.1, plan.z,
      P.teal || 0x6fe0f0, plan.rotY, 0, 0, 0.95, 1.05, rng);
  }

  function buildGeometryForQuality(q) {
    clearScene();
    const rng = mulberry32(seed + 77);
    const qMult = q === 'low' ? 0.35 : q === 'medium' ? 0.65 : 1.0;

    const stoneGeos = [];
    const mossGeos = [];
    const glyphGeos = [];
    const floorGlyphGeos = [];
    const aoGeos = [];
    const shaftGeos = [];
    const columnMatrices = [];
    const balusterMatrices = [];

    const dummy = new THREE.Object3D();

    // =========================================================================
    // 1. LANDING AREA
    // =========================================================================
    const laCfg = layout.landing_area || {
      center: { x: 20.0, z: 26.0 },
      footprint: { radius: 8.0, terraceRadius: 14.0 },
      door: { id: 'door_landing_area', position: { x: 20.0, y: 0.0, z: 16.0 }, outward: { x: 0.0, y: 0.0, z: -1.0 } }
    };
    const laX = laCfg.center.x;
    const laZ = laCfg.center.z;
    const laY = getGroundY(laX, laZ);
    const laRad = (laCfg.footprint && laCfg.footprint.radius) || 8.0;
    const laTerRad = (laCfg.footprint && laCfg.footprint.terraceRadius) || 13.0;

    const laSegs = q === 'low' ? 20 : q === 'medium' ? 28 : 36;
    // Outer terrace base and molded curb
    addCyl(stoneGeos, laTerRad, laTerRad + 0.35, 0.24, laSegs, laX, laY + 0.12, laZ, P.groundDark || 0x68767c, 0, 0, 0, 0.72, 1.0, rng);
    addCyl(stoneGeos, laRad + 1.2, laRad + 1.45, 0.34, laSegs, laX, laY + 0.17, laZ, P.groundBase || 0xa9b6ba, 0, 0, 0, 0.78, 1.04, rng);
    addCyl(stoneGeos, laRad, laRad + 0.15, 0.44, laSegs, laX, laY + 0.22, laZ, P.wallLit || 0xc4cbcf, 0, 0, 0, 0.84, 1.08, rng);

    // Flagstone wedges with beveled crevices & moss joints
    const laRings = q === 'low' ? 2 : 3;
    const slabH = 0.04;
    const slabTopY = laY + 0.45; // Terrace height 0.44 + 0.01
    const slabCenterY = slabTopY - slabH * 0.5;
    for (let r = 0; r < laRings; r++) {
      const rIn = 2.0 + r * 2.8;
      const rOut = rIn + 2.55;
      const wedges = Math.max(8, Math.floor((12 + r * 6) * qMult));
      for (let w = 0; w < wedges; w++) {
        const a0 = (w / wedges) * Math.PI * 2 + (r % 2) * 0.15;
        const a1 = ((w + 0.92) / wedges) * Math.PI * 2 + (r % 2) * 0.15;
        const aMid = (a0 + a1) * 0.5;
        const rMid = (rIn + rOut) * 0.5;
        const wx = laX + Math.cos(aMid) * rMid;
        const wz = laZ + Math.sin(aMid) * rMid;
        const arcW = (a1 - a0) * rMid;
        const depth = rOut - rIn;
        const col = w % 3 === 0 ? (P.wallShade || 0x8e9da3) : (w % 2 === 0 ? (P.wallLit || 0xc4cbcf) : (P.groundBase || 0xa9b6ba));
        addBox(stoneGeos, arcW, slabH, depth, wx, slabCenterY, wz, col, -aMid + Math.PI / 2, 0, 0, 0.8, 1.05, rng);

        if (w % 3 === 0) {
          const mossH = 0.03; // No thicker than 0.04
          // The moss joint is a decal layer of its own: its top face used to
          // land exactly on the flagstone top, and two coplanar surfaces
          // z-fight (the moss edges crawled in stripes).
          const mossY = decalCenterY(slabTopY, mossH, FLOOR_DECAL_LAYERS.moss);
          addBox(mossGeos, arcW * 0.65, mossH, 0.22, laX + Math.cos(aMid) * rIn, mossY, laZ + Math.sin(aMid) * rIn, P.moss || 0x5f8a4a, -aMid + Math.PI / 2, 0, 0, 0.75, 1.05, rng);
        }
      }
    }

    // Bright summoning glyph inlaid in Landing Area floor (non-concentric geometric star + rune marks)
    const glyphH = 0.016;
    // The star lines are inlaid in the flagstones, on their own decal layer
    // so that they never share a plane with the stone they lie on.
    const glyphY = decalCenterY(slabTopY, glyphH, FLOOR_DECAL_LAYERS.inlay);
    const starPoints = 8;
    for (let i = 0; i < starPoints; i++) {
      const a = (i / starPoints) * Math.PI * 2;
      const nextA = ((i + 3) / starPoints) * Math.PI * 2;
      const x1 = laX + Math.cos(a) * (laRad - 0.65);
      const z1 = laZ + Math.sin(a) * (laRad - 0.65);
      const x2 = laX + Math.cos(nextA) * (laRad - 0.65);
      const z2 = laZ + Math.sin(nextA) * (laRad - 0.65);
      const mx = (x1 + x2) * 0.5;
      const mz = (z1 + z2) * 0.5;
      const len = Math.hypot(x2 - x1, z2 - z1);
      const ang = Math.atan2(x2 - x1, z2 - z1);
      addBox(floorGlyphGeos, 0.11, glyphH, len, mx, glyphY, mz, P.teal || 0x6fe0f0, ang, 0, 0, 0.95, 1.05, rng);

      // Outer rune ticks and diamond nodes
      const rx = laX + Math.cos(a) * (laRad - 0.55);
      const rz = laZ + Math.sin(a) * (laRad - 0.55);
      addBox(floorGlyphGeos, 0.42, glyphH, 0.42, rx, glyphY, rz, P.sphereCyan || 0xa8f4ff, a + Math.PI / 4, 0, 0, 0.95, 1.05, rng);
    }
    // Octagonal outer border segments (avoids concentric ring patterns)
    for (let i = 0; i < 16; i++) {
      const a1 = (i / 16) * Math.PI * 2;
      const a2 = ((i + 1) / 16) * Math.PI * 2;
      const rB = laRad - 0.35;
      const x1 = laX + Math.cos(a1) * rB;
      const z1 = laZ + Math.sin(a1) * rB;
      const x2 = laX + Math.cos(a2) * rB;
      const z2 = laZ + Math.sin(a2) * rB;
      const len = Math.hypot(x2 - x1, z2 - z1);
      const ang = Math.atan2(x2 - x1, z2 - z1);
      addBox(floorGlyphGeos, 0.14, glyphH, len + 0.06, (x1 + x2) * 0.5, glyphY, (z1 + z2) * 0.5, P.teal || 0x6fe0f0, ang, 0, 0, 0.95, 1.05, rng);
    }

    // 4 broken tall pillars around Landing Area with fallen drums and moss caps
    const pillarAngles = [Math.PI * 0.22, Math.PI * 0.78, Math.PI * 1.22, Math.PI * 1.72];
    const pillarHeights = [5.4, 3.8, 6.2, 4.5];
    const pSegs = q === 'low' ? 8 : 12;
    for (let i = 0; i < 4; i++) {
      const pa = pillarAngles[i];
      const pr = laRad + 1.8;
      const px = laX + Math.cos(pa) * pr;
      const pz = laZ + Math.sin(pa) * pr;
      const ph = pillarHeights[i];

      // Plinth base
      addBox(stoneGeos, 1.75, 0.55, 1.75, px, laY + 0.27, pz, P.wallShade || 0x8e9da3, pa, 0, 0, 0.7, 1.02, rng);
      addBox(stoneGeos, 1.48, 0.35, 1.48, px, laY + 0.72, pz, P.wallLit || 0xc4cbcf, pa, 0, 0, 0.78, 1.05, rng);
      // Stacked shaft drums
      const drums = Math.floor(ph / 1.1);
      for (let d = 0; d < drums; d++) {
        const dy = laY + 0.9 + d * 1.05 + 0.52;
        const offX = (rng() - 0.5) * 0.06;
        const offZ = (rng() - 0.5) * 0.06;
        addCyl(stoneGeos, 0.58, 0.61, 1.04, pSegs, px + offX, dy, pz + offZ, P.wallLit || 0xc4cbcf, rng() * 3, 0, 0, 0.78, 1.05, rng);
      }
      // Jagged broken top block + moss cushion
      const topY = laY + 0.9 + drums * 1.05;
      addBox(stoneGeos, 0.85, 0.45, 0.75, px + 0.08, topY + 0.15, pz - 0.05, P.wallShade || 0x8e9da3, pa + 0.4, 0.22, -0.18, 0.8, 1.06, rng);
      addBox(mossGeos, 0.92, 0.18, 0.92, px, topY + 0.08, pz, P.moss || 0x5f8a4a, pa, 0.1, 0.1, 0.78, 1.06, rng);
      addBox(mossGeos, 1.6, 0.22, 1.6, px, laY + 0.12, pz, P.mossDark || 0x436836, pa + 0.2, 0, 0, 0.7, 1.0, rng);

      // Fallen column drums resting on the ground nearby
      const fx = px + Math.cos(pa + 0.35) * 1.95;
      const fz = pz + Math.sin(pa + 0.35) * 1.95;
      addCyl(stoneGeos, 0.56, 0.58, 1.15, pSegs, fx, laY + 0.52, fz, P.wallShade || 0x8e9da3, pa + 0.8, Math.PI * 0.48, 0.12, 0.72, 1.04, rng);
      addBox(mossGeos, 0.75, 0.22, 0.95, fx, laY + 0.95, fz, P.moss || 0x5f8a4a, pa + 0.8, 0.05, 0, 0.8, 1.05, rng);

      colliders.push({ type: 'circle', x: px, z: pz, r: 1.05 });
      colliders.push({ type: 'circle', x: fx, z: fz, r: 0.75 });
    }

    // Wide transition steps from Landing Area toward Summoning Room corridor
    for (let s = 0; s < 3; s++) {
      const sx = laX + 1.1 + s * 0.75;
      const sz = laZ - 6.8 - s * 1.35;
      addBox(stoneGeos, 4.6, 0.24, 1.35, sx, laY + 0.12 + s * 0.1, sz, P.wallLit || 0xc4cbcf, -0.43, 0, 0, 0.78, 1.05, rng);
    }

    if (laCfg.door) {
      const dp = new THREE.Vector3(laCfg.door.position.x, laY, laCfg.door.position.z);
      const dw = new THREE.Vector3(laCfg.door.outward.x, 0, laCfg.door.outward.z).normalize();
      doors.push({ id: laCfg.door.id, position: dp, outward: dw });
      registerAnchor('door_landing_area', dp);
    }
    const laSign = getSignLayout(layout, 'landing_area');
    if (laSign) {
      registerAnchor('sign_landing_area', new THREE.Vector3(laSign.x, laSign.boardY, laSign.z));
      buildSignPost(stoneGeos, glyphGeos, laSign, rng);
    }

    // =========================================================================
    // 2. SUMMONING ROOM (HERO BUILDING)
    // =========================================================================
    const srCfg = layout.summoning_room || {
      center: { x: 30.0, z: 4.0 },
      footprint: { radius: 10.0, height: 11.0, wallRadius: 10.2 },
      door: { id: 'door_summoning_room', position: { x: 23.5, y: 1.8, z: 11.5 }, outward: { x: -0.4138, y: 0.0, z: 0.9104 } }
    };
    const srX = srCfg.center.x;
    const srZ = srCfg.center.z;
    const srGroundY = getGroundY(srX, srZ);
    const podiumH = 1.6;
    const srFloorY = srGroundY + podiumH;
    const srRad = (srCfg.footprint && srCfg.footprint.radius) || 10.0;
    const srWallRad = (srCfg.footprint && srCfg.footprint.wallRadius) || 10.2;
    const srH = (srCfg.footprint && srCfg.footprint.height) || 11.0;

    // Direction toward door (south-west face)
    const doorPosCfg = (srCfg.door && srCfg.door.position) || { x: 23.5, y: 1.8, z: 11.5 };
    const doorAng = Math.atan2(doorPosCfg.z - srZ, doorPosCfg.x - srX);

    // Stepped circular podium foundation with molded base & recessed panels
    const srSegs = q === 'low' ? 24 : q === 'medium' ? 36 : 48;
    addCyl(stoneGeos, srWallRad + 1.15, srWallRad + 1.45, 0.55, srSegs, srX, srGroundY + 0.275, srZ, P.groundDark || 0x68767c, 0, 0, 0, 0.68, 0.98, rng);
    addCyl(stoneGeos, srWallRad + 0.65, srWallRad + 0.85, 0.65, srSegs, srX, srGroundY + 0.82, srZ, P.wallShade || 0x8e9da3, 0, 0, 0, 0.74, 1.02, rng);
    addCyl(stoneGeos, srWallRad + 0.25, srWallRad + 0.35, 0.55, srSegs, srX, srGroundY + 1.35, srZ, P.wallLit || 0xc4cbcf, 0, 0, 0, 0.82, 1.06, rng);

    // Courtyard radial stone slabs and glowing glyph channels
    const courtBlocks = q === 'low' ? 16 : q === 'medium' ? 24 : 32;
    // The courtyard slabs are the floor the glyph channels are inlaid in.
    const courtSlabH = 0.14;
    const courtTopY = srFloorY + 0.02 + courtSlabH * 0.5;
    const courtGlyphH = 0.06;
    const courtGlyphY = decalCenterY(courtTopY, courtGlyphH, FLOOR_DECAL_LAYERS.inlay);
    for (let i = 0; i < courtBlocks; i++) {
      const a = (i / courtBlocks) * Math.PI * 2;
      for (let rStep = 0; rStep < 3; rStep++) {
        const radMid = 3.2 + rStep * 2.15;
        const bx = srX + Math.cos(a) * radMid;
        const bz = srZ + Math.sin(a) * radMid;
        const bw = (Math.PI * 2 * radMid) / courtBlocks - 0.08;
        const col = (i + rStep) % 2 === 0 ? (P.wallLit || 0xc4cbcf) : (P.groundBase || 0xa9b6ba);
        addBox(stoneGeos, bw, courtSlabH, 1.98, bx, srFloorY + 0.02, bz, col, -a + Math.PI / 2, 0, 0, 0.82, 1.05, rng);
      }
      if (i % 4 === 0) {
        // 8 radial glowing glyph rays in courtyard floor
        const rayLen = srRad - 2.6;
        const rx = srX + Math.cos(a) * (2.2 + rayLen * 0.5);
        const rz = srZ + Math.sin(a) * (2.2 + rayLen * 0.5);
        addBox(floorGlyphGeos, 0.14, courtGlyphH, rayLen, rx, courtGlyphY, rz, P.teal || 0x6fe0f0, -a + Math.PI / 2, 0, 0, 0.95, 1.05, rng);
      }
      // Octagonal glyph chord in courtyard
      if (i % 2 === 0) {
        const aNext = ((i + 2) / courtBlocks) * Math.PI * 2;
        const rG = 5.4;
        const x1 = srX + Math.cos(a) * rG;
        const z1 = srZ + Math.sin(a) * rG;
        const x2 = srX + Math.cos(aNext) * rG;
        const z2 = srZ + Math.sin(aNext) * rG;
        const clen = Math.hypot(x2 - x1, z2 - z1);
        const cang = Math.atan2(x2 - x1, z2 - z1);
        addBox(floorGlyphGeos, 0.12, courtGlyphH, clen, (x1 + x2) * 0.5, courtGlyphY, (z1 + z2) * 0.5, P.sphereCyan || 0xa8f4ff, cang, 0, 0, 0.95, 1.05, rng);
      }
    }

    // Back semicircular enclosed ashlar stone wall (north-east half) with pilasters & recessed alcoves
    const backSpan = Math.PI * 1.08;
    const backStart = doorAng + Math.PI - backSpan * 0.5;
    const wallPanels = q === 'low' ? 8 : q === 'medium' ? 12 : 16;
    const dAng = backSpan / wallPanels;

    for (let i = 0; i < wallPanels; i++) {
      const a0 = backStart + i * dAng;
      const a1 = a0 + dAng;
      const aMid = (a0 + a1) * 0.5;

      // Lower ashlar wall course
      stoneGeos.push(createArchBlockGeo(srRad - 0.65, srWallRad, 3.2, a0, a1, 2, P.wallShade || 0x8e9da3, srFloorY, srX, srZ, rng));
      // Recessed lighter back wall inside alcove (no black voids per Rule d)
      stoneGeos.push(createArchBlockGeo(srRad - 0.35, srWallRad - 0.18, 4.6, a0 + 0.03, a1 - 0.03, 2, P.plaster || 0xdfe3df, srFloorY + 3.2, srX, srZ, rng));
      // Alcove sill and lintel
      stoneGeos.push(createArchBlockGeo(srRad - 0.72, srWallRad + 0.08, 0.38, a0, a1, 2, P.wallLit || 0xc4cbcf, srFloorY + 3.05, srX, srZ, rng));
      // Upper wall frieze
      stoneGeos.push(createArchBlockGeo(srRad - 0.65, srWallRad, srH - 7.6, a0, a1, 2, P.wallLit || 0xc4cbcf, srFloorY + 7.6, srX, srZ, rng));

      // Pilaster between panels
      const px = srX + Math.cos(a0) * (srRad - 0.25);
      const pz = srZ + Math.sin(a0) * (srRad - 0.25);
      addBox(stoneGeos, 0.78, srH - 0.8, 0.98, px, srFloorY + (srH - 0.8) * 0.5, pz, P.wallLit || 0xc4cbcf, -a0 + Math.PI / 2, 0, 0, 0.76, 1.06, rng);

      // Glowing narrow vertical rune slit in every second alcove
      if (i % 2 === 1) {
        const wx = srX + Math.cos(aMid) * (srRad - 0.32);
        const wz = srZ + Math.sin(aMid) * (srRad - 0.32);
        addBox(glyphGeos, 0.16, 2.6, 0.14, wx, srFloorY + 5.4, wz, P.teal || 0x6fe0f0, -aMid + Math.PI / 2, 0, 0, 0.95, 1.05, rng);
      }

      // Collider per back wall segment
      const cx = srX + Math.cos(aMid) * (srRad - 0.25);
      const cz = srZ + Math.sin(aMid) * (srRad - 0.25);
      colliders.push({ type: 'circle', x: cx, z: cz, r: 1.35 });
    }

    // End-cap pilaster on the last panel
    const endA = backStart + backSpan;
    addBox(stoneGeos, 0.82, srH - 0.8, 1.02, srX + Math.cos(endA) * (srRad - 0.25), srFloorY + (srH - 0.8) * 0.5, srZ + Math.sin(endA) * (srRad - 0.25), P.wallLit || 0xc4cbcf, -endA + Math.PI / 2, 0, 0, 0.76, 1.06, rng);

    // South-West Open Colonnade of tall fluted columns (via InstancedMesh for budget efficiency)
    const colCount = 10;
    const colArc = Math.PI * 0.86;
    const colStart = doorAng - colArc * 0.5;
    for (let i = 0; i < colCount; i++) {
      const t = i / (colCount - 1);
      const a = colStart + t * colArc;
      // Leave wide central entrance bay open at doorAng
      if (Math.abs(a - doorAng) < 0.13) continue;

      const cx = srX + Math.cos(a) * (srRad - 0.2);
      const cz = srZ + Math.sin(a) * (srRad - 0.2);
      dummy.position.set(cx, srFloorY, cz);
      dummy.rotation.set(0, -a + Math.PI / 2, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      columnMatrices.push(dummy.matrix.clone());

      colliders.push({ type: 'circle', x: cx, z: cz, r: 0.78 });
    }

    // Full 360 Entablature, Architrave, Dentil Cornice, and Open Ribbed Ocular Dome Rim
    const ringSegs = q === 'low' ? 18 : q === 'medium' ? 28 : 36;
    for (let i = 0; i < ringSegs; i++) {
      const a0 = (i / ringSegs) * Math.PI * 2;
      const a1 = ((i + 1) / ringSegs) * Math.PI * 2;
      const aMid = (a0 + a1) * 0.5;

      // Architrave beam
      stoneGeos.push(createArchBlockGeo(srRad - 0.75, srWallRad + 0.2, 0.75, a0, a1, 1, P.wallShade || 0x8e9da3, srFloorY + srH - 2.2, srX, srZ, rng));
      // Overhanging cornice ledge
      stoneGeos.push(createArchBlockGeo(srRad - 0.95, srWallRad + 0.55, 0.65, a0, a1, 1, P.wallLit || 0xc4cbcf, srFloorY + srH - 1.45, srX, srZ, rng));
      // Low stepped attic crown
      stoneGeos.push(createArchBlockGeo(srRad - 1.65, srWallRad + 0.15, 0.65, a0, a1, 1, P.wallLit || 0xc4cbcf, srFloorY + srH - 0.8, srX, srZ, rng));

      // Curved inward dome ribs around the open sky oculus
      if (i % 2 === 0) {
        const ribR = srRad - 1.75;
        const rx = srX + Math.cos(aMid) * ribR;
        const rz = srZ + Math.sin(aMid) * ribR;
        addBox(stoneGeos, 0.52, 0.75, 2.7, rx, srFloorY + srH - 0.22, rz, P.wallShade || 0x8e9da3, -aMid + Math.PI / 2, -0.28, 0, 0.82, 1.08, rng);
      }

      // Moss & hanging ivy clusters along cornice and podium ledges
      if (i % 3 === 0) {
        const mx = srX + Math.cos(aMid) * (srWallRad + 0.35);
        const mz = srZ + Math.sin(aMid) * (srWallRad + 0.35);
        addBox(mossGeos, 1.35, 0.24, 0.65, mx, srFloorY + srH - 0.76, mz, P.moss || 0x5f8a4a, -aMid + Math.PI / 2, 0, 0, 0.78, 1.06, rng);
        addBox(mossGeos, 0.55, 1.65, 0.22, mx, srFloorY + srH - 1.65, mz, P.ivy || 0x436836, -aMid + Math.PI / 2, 0.06, 0, 0.72, 1.0, rng);
      }
    }

    // Inner oculus tension ring connecting all dome ribs cleanly
    for (let i = 0; i < 16; i++) {
      const a0 = (i / 16) * Math.PI * 2;
      const a1 = ((i + 1) / 16) * Math.PI * 2;
      stoneGeos.push(createArchBlockGeo(srRad - 3.25, srRad - 2.65, 0.55, a0, a1, 1, P.wallLit || 0xc4cbcf, srFloorY + srH - 0.1, srX, srZ, rng));
    }

    // Grand Arched Entrance Frame at top of the Summoning Room stairs (south-west face)
    const gateDist = srRad + 0.15;
    const gateX = srX + Math.cos(doorAng) * gateDist;
    const gateZ = srZ + Math.sin(doorAng) * gateDist;
    const gateRot = -doorAng + Math.PI / 2;
    const tangX = -Math.sin(doorAng);
    const tangZ = Math.cos(doorAng);

    // Left & right monumental gate piers
    for (const side of [-1, 1]) {
      const px = gateX + tangX * side * 1.65;
      const pz = gateZ + tangZ * side * 1.65;
      addBox(stoneGeos, 0.92, 4.4, 1.15, px, srFloorY + 2.2, pz, P.wallLit || 0xc4cbcf, gateRot, 0, 0, 0.76, 1.06, rng);
      addBox(stoneGeos, 1.12, 0.38, 1.32, px, srFloorY + 4.4, pz, P.wallShade || 0x8e9da3, gateRot, 0, 0, 0.82, 1.06, rng);
    }
    // Arch lintel, triangular pediment, and carved keystone over entrance
    addBox(stoneGeos, 4.5, 0.75, 1.25, gateX, srFloorY + 4.85, gateZ, P.wallLit || 0xc4cbcf, gateRot, 0, 0, 0.82, 1.06, rng);
    addBox(stoneGeos, 2.7, 0.85, 1.12, gateX + tangX * -0.95, srFloorY + 5.55, gateZ + tangZ * -0.95, P.wallLit || 0xc4cbcf, gateRot, 0, 0.34, 0.84, 1.08, rng);
    addBox(stoneGeos, 2.7, 0.85, 1.12, gateX + tangX * 0.95, srFloorY + 5.55, gateZ + tangZ * 0.95, P.wallLit || 0xc4cbcf, gateRot, 0, -0.34, 0.84, 1.08, rng);
    addBox(glyphGeos, 0.32, 0.65, 1.32, gateX, srFloorY + 4.95, gateZ, P.teal || 0x6fe0f0, gateRot, 0, 0, 0.95, 1.05, rng);

    // Wide Stair of 8 Steps with Side Balustrades going down toward the Landing Area
    const stairDirX = Math.cos(doorAng);
    const stairDirZ = Math.sin(doorAng);
    const stairW = 4.4;
    const stepD = 0.48;
    const stepH = podiumH / 8; // 0.2 units per step per scale contract

    for (let s = 0; s < 8; s++) {
      const dist = srWallRad + 0.35 + (s + 0.5) * stepD;
      const sx = srX + stairDirX * dist;
      const sz = srZ + stairDirZ * dist;
      const hRemain = podiumH - s * stepH;
      addBox(stoneGeos, stairW, hRemain, stepD + 0.04, sx, srGroundY + hRemain * 0.5, sz, s % 2 === 0 ? (P.wallLit || 0xc4cbcf) : (P.groundBase || 0xa9b6ba), gateRot, 0, 0, 0.75, 1.05, rng);

      // Baluster posts on both sides of the stair
      for (const side of [-1, 1]) {
        const bx = sx + tangX * side * (stairW * 0.5 + 0.28);
        const bz = sz + tangZ * side * (stairW * 0.5 + 0.28);
        dummy.position.set(bx, srGroundY + hRemain, bz);
        dummy.rotation.set(0, gateRot, 0);
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        balusterMatrices.push(dummy.matrix.clone());
      }
    }

    // Sloped side balustrade stringers, handrails, and bottom newel piers
    const stairTotalLen = 8 * stepD;
    const stairMidDist = srWallRad + 0.35 + stairTotalLen * 0.5;
    const stairSlope = Math.atan2(podiumH, stairTotalLen);
    for (const side of [-1, 1]) {
      const sOff = side * (stairW * 0.5 + 0.28);
      const mx = srX + stairDirX * stairMidDist + tangX * sOff;
      const mz = srZ + stairDirZ * stairMidDist + tangZ * sOff;

      // Solid stringer curb
      addBox(stoneGeos, 0.56, podiumH * 0.65, stairTotalLen + 0.4, mx, srGroundY + podiumH * 0.32, mz, P.wallShade || 0x8e9da3, gateRot, 0, 0, 0.72, 1.02, rng);
      // Sloped top handrail capping the balusters
      addBox(stoneGeos, 0.52, 0.22, stairTotalLen + 0.55, mx, srGroundY + podiumH * 0.5 + 0.88, mz, P.wallLit || 0xc4cbcf, gateRot, stairSlope, 0, 0.84, 1.08, rng);

      // Bottom newel post with carved finial
      const botDist = srWallRad + 0.35 + stairTotalLen + 0.35;
      const nx = srX + stairDirX * botDist + tangX * sOff;
      const nz = srZ + stairDirZ * botDist + tangZ * sOff;
      addBox(stoneGeos, 0.78, 1.35, 0.78, nx, srGroundY + 0.675, nz, P.wallLit || 0xc4cbcf, gateRot, 0, 0, 0.76, 1.06, rng);
      addBox(mossGeos, 0.82, 0.16, 0.82, nx, srGroundY + 1.36, nz, P.moss || 0x5f8a4a, gateRot, 0, 0, 0.8, 1.05, rng);
    }

    // Ornate Carved Pedestal in Courtyard Center
    const pedY = srFloorY;
    addCyl(stoneGeos, 2.45, 2.75, 0.45, 8, srX, pedY + 0.225, srZ, P.groundDark || 0x68767c, Math.PI / 8, 0, 0, 0.7, 1.0, rng);
    addCyl(stoneGeos, 1.85, 2.15, 0.65, 8, srX, pedY + 0.775, srZ, P.wallShade || 0x8e9da3, 0, 0, 0, 0.75, 1.04, rng);
    addCyl(stoneGeos, 1.25, 1.55, 1.15, 8, srX, pedY + 1.675, srZ, P.wallLit || 0xc4cbcf, Math.PI / 8, 0, 0, 0.8, 1.06, rng);
    addCyl(stoneGeos, 1.75, 1.15, 0.55, 8, srX, pedY + 2.525, srZ, P.wallLit || 0xc4cbcf, 0, 0, 0, 0.84, 1.08, rng);

    // 4 curved cradle claws + glowing rune inlays on pedestal sides
    for (let c = 0; c < 4; c++) {
      const ca = (c / 4) * Math.PI * 2 + Math.PI / 4;
      const cx = srX + Math.cos(ca) * 1.45;
      const cz = srZ + Math.sin(ca) * 1.45;
      addBox(stoneGeos, 0.42, 1.35, 0.68, cx, pedY + 2.55, cz, P.wallLit || 0xc4cbcf, -ca + Math.PI / 2, -0.38, 0, 0.82, 1.08, rng);
      addBox(glyphGeos, 0.16, 0.95, 0.72, cx, pedY + 1.65, cz, P.teal || 0x6fe0f0, -ca + Math.PI / 2, 0, 0, 0.95, 1.05, rng);
    }
    colliders.push({ type: 'circle', x: srX, z: srZ, r: 2.75 });

    // Pale-Cyan Glowing Sphere (radius 2.2) + 3 Thin Rotating Rings
    const sphereCenter = new THREE.Vector3(srX, pedY + 5.3, srZ);
    const sphSegs = q === 'low' ? 16 : q === 'medium' ? 24 : 32;
    const sphereGeo = new THREE.SphereGeometry(2.2, sphSegs, Math.floor(sphSegs * 0.75));
    activeDisposables.push(sphereGeo);
    const sphereMesh = new THREE.Mesh(sphereGeo, matSphere);
    sphereMesh.position.copy(sphereCenter);
    rootGroup.add(sphereMesh);
    animRefs.sphereMesh = sphereMesh;

    const ringRadii = [2.68, 3.05, 3.42];
    const ringTilts = [
      new THREE.Euler(0.45, 0.0, 0.32),
      new THREE.Euler(-0.52, 0.4, -0.28),
      new THREE.Euler(0.25, -0.6, 0.68)
    ];
    const ringTubularSegs = q === 'low' ? 32 : q === 'medium' ? 48 : 64;
    for (let r = 0; r < 3; r++) {
      const rGeo = new THREE.TorusGeometry(ringRadii[r], 0.055, 8, ringTubularSegs);
      activeDisposables.push(rGeo);
      const rMesh = new THREE.Mesh(rGeo, matSphereRing);
      rMesh.position.copy(sphereCenter);
      rMesh.rotation.copy(ringTilts[r]);
      rootGroup.add(rMesh);
      animRefs.sphereRings.push(rMesh);
    }

    // Soft additive light shafts descending through the open dome into the courtyard
    for (let s = 0; s < 3; s++) {
      const sa = (s / 3) * Math.PI + 0.35;
      const sGeo = new THREE.PlaneGeometry(3.4, srH + 1.5);
      const pShaft = prepareGeo(sGeo, P.sphereCyan || 0xa8f4ff, 0.15, 0.95, 0.0, rng);
      sGeo.dispose();
      pShaft.rotateY(sa);
      pShaft.rotateZ(0.12);
      pShaft.translate(srX, srFloorY + srH * 0.55, srZ);
      shaftGeos.push(pShaft);
    }

    // Baked AO decal under pedestal and stairs
    const srAoGeo = new THREE.CircleGeometry(srWallRad + 1.6, 24);
    srAoGeo.rotateX(-Math.PI / 2);
    // The AO disc is a flat decal on the terrain: it sits on the patch layer
    // so that it never shares a plane with the ground.
    srAoGeo.translate(srX, srGroundY + FLOOR_DECAL_LAYERS.patch.top, srZ);
    aoGeos.push(srAoGeo);

    // Summoning Room Anchors, Door, and Desired Light
    registerAnchor('sphere_center', sphereCenter);
    anchors.summoningSphere = sphereCenter.clone();
    const pedestalPos = new THREE.Vector3(srX, pedY + 2.8, srZ);
    registerAnchor('pedestal', pedestalPos);

    if (srCfg.door) {
      const dp = new THREE.Vector3(srCfg.door.position.x, srFloorY, srCfg.door.position.z);
      const dw = new THREE.Vector3(srCfg.door.outward.x, 0, srCfg.door.outward.z).normalize();
      doors.push({ id: srCfg.door.id, position: dp, outward: dw });
      registerAnchor('door_summoning_room', dp);
      anchors.door = dp.clone();
    }
    const srSign = getSignLayout(layout, 'summoning_room');
    if (srSign) {
      registerAnchor('sign_summoning_room', new THREE.Vector3(srSign.x, srSign.boardY, srSign.z));
      buildSignPost(stoneGeos, glyphGeos, srSign, rng);
    }

    lights.push({
      position: sphereCenter.clone(),
      color: P.sphereCyan || 0xa8f4ff,
      intensity: 5.5,
      distance: 18.0,
      baseIntensity: 5.5
    });

    // =========================================================================
    // 3. TOWN SQUARE
    // =========================================================================
    const tsCfg = layout.town_square || {
      center: { x: 14.0, z: -8.0 },
      footprint: { radius: 11.0 }
    };
    const tsX = tsCfg.center.x;
    const tsZ = tsCfg.center.z;
    const tsY = getGroundY(tsX, tsZ);
    const tsRad = (tsCfg.footprint && tsCfg.footprint.radius) || 11.0;

    // Distinct geometric herringbone/diamond pavement base
    const tsSegs = q === 'low' ? 24 : 36;
    addCyl(stoneGeos, tsRad, tsRad + 0.25, 0.18, tsSegs, tsX, tsY + 0.09, tsZ, P.groundBase || 0xa9b6ba, 0, 0, 0, 0.78, 1.04, rng);

    // Wheel Emblem inlaid in the floor: 2 concentric stone rings, 8 spokes, central hub
    // The rings, the spokes and the flagstone patches all overlap in plan, so
    // each one gets its own decal layer: on a shared plane their top faces
    // z-fight and the edges crawl in hatched stripes.
    const tsTopY = tsY + 0.18; // the pavement base top face
    const ringH = 0.12;
    const spokeH = 0.13;
    const lightSpokeH = 0.14;
    const patchH = 0.12;
    const ringY = decalCenterY(tsTopY, ringH, FLOOR_DECAL_LAYERS.line);
    const spokeY = decalCenterY(tsTopY, spokeH, FLOOR_DECAL_LAYERS.patch);
    const lightSpokeY = decalCenterY(tsTopY, lightSpokeH, FLOOR_DECAL_LAYERS.lineTop);
    const patchY = decalCenterY(tsTopY, patchH, FLOOR_DECAL_LAYERS.patch);
    const wheelRingRadii = [
      { rIn: 4.4, rOut: 5.2, segs: q === 'low' ? 16 : 24 },
      { rIn: 8.8, rOut: 9.7, segs: q === 'low' ? 20 : 32 }
    ];
    for (const wr of wheelRingRadii) {
      const stepA = (Math.PI * 2) / wr.segs;
      for (let i = 0; i < wr.segs; i++) {
        const a0 = i * stepA;
        const a1 = (i + 0.96) * stepA;
        const col = i % 2 === 0 ? (P.groundDark || 0x68767c) : (P.plaster || 0xdfe3df);
        stoneGeos.push(createArchBlockGeo(wr.rIn, wr.rOut, ringH, a0, a1, 1, col, ringY - ringH * 0.5, tsX, tsZ, rng));
      }
    }

    // 8 Wheel Spokes in contrasting dark and light stone
    for (let sp = 0; sp < 8; sp++) {
      const sa = (sp / 8) * Math.PI * 2;
      const sLen = 7.7;
      const sx = tsX + Math.cos(sa) * (1.8 + sLen * 0.5);
      const sz = tsZ + Math.sin(sa) * (1.8 + sLen * 0.5);
      addBox(stoneGeos, 0.68, spokeH, sLen, sx, spokeY, sz, P.groundDark || 0x68767c, -sa + Math.PI / 2, 0, 0, 0.78, 1.04, rng);
      addBox(stoneGeos, 0.26, lightSpokeH, sLen - 0.2, sx, lightSpokeY, sz, P.wallLit || 0xc4cbcf, -sa + Math.PI / 2, 0, 0, 0.85, 1.08, rng);

      // Geometric diamond flagstones in the 8 sectors between spokes
      const midA = sa + Math.PI / 8;
      for (const dRad of [3.1, 6.4, 7.6]) {
        const dx = tsX + Math.cos(midA) * dRad;
        const dz = tsZ + Math.sin(midA) * dRad;
        addBox(stoneGeos, 1.25, patchH, 1.25, dx, patchY, dz, P.wallShade || 0x8e9da3, -midA + Math.PI / 4, 0, 0, 0.8, 1.05, rng);
      }
    }

    // Central Hub & Low Central Plinth with Sundial/Compass Obelisk Stub
    addCyl(stoneGeos, 2.15, 2.35, 0.28, 16, tsX, tsY + 0.24, tsZ, P.groundDark || 0x68767c, 0, 0, 0, 0.75, 1.02, rng);
    addCyl(stoneGeos, 1.45, 1.65, 0.52, 8, tsX, tsY + 0.64, tsZ, P.wallLit || 0xc4cbcf, Math.PI / 8, 0, 0, 0.8, 1.06, rng);
    addCyl(stoneGeos, 0.85, 1.05, 0.55, 8, tsX, tsY + 1.15, tsZ, P.wallShade || 0x8e9da3, 0, 0, 0, 0.82, 1.06, rng);
    addBox(glyphGeos, 0.36, 0.24, 0.36, tsX, tsY + 1.48, tsZ, P.teal || 0x6fe0f0, Math.PI / 4, 0, 0, 0.95, 1.05, rng);
    colliders.push({ type: 'circle', x: tsX, z: tsZ, r: 1.85 });

    // 4 Curved Stone Benches around the Town Square perimeter
    const benchAngles = [Math.PI * 0.25, Math.PI * 0.75, Math.PI * 1.25, Math.PI * 1.75];
    for (const ba of benchAngles) {
      const bSpan = 0.42;
      const bStart = ba - bSpan * 0.5;
      const bEnd = ba + bSpan * 0.5;
      const bRad = tsRad - 0.95;

      // Curved seat slab & low backrest
      stoneGeos.push(createArchBlockGeo(bRad - 0.42, bRad + 0.42, 0.16, bStart, bEnd, 5, P.wallLit || 0xc4cbcf, tsY + 0.52, tsX, tsZ, rng));
      stoneGeos.push(createArchBlockGeo(bRad + 0.22, bRad + 0.46, 0.44, bStart, bEnd, 5, P.wallShade || 0x8e9da3, tsY + 0.68, tsX, tsZ, rng));

      // 3 carved leg supports per bench
      for (const lOff of [-0.18, 0, 0.18]) {
        const la = ba + lOff;
        const lx = tsX + Math.cos(la) * bRad;
        const lz = tsZ + Math.sin(la) * bRad;
        addBox(stoneGeos, 0.34, 0.42, 0.76, lx, tsY + 0.33, lz, P.groundDark || 0x68767c, -la + Math.PI / 2, 0, 0, 0.72, 1.0, rng);
      }
      // Moss accent at bench base
      const mx = tsX + Math.cos(ba) * (bRad + 0.38);
      const mz = tsZ + Math.sin(ba) * (bRad + 0.38);
      addBox(mossGeos, 1.15, 0.16, 0.42, mx, tsY + 0.22, mz, P.moss || 0x5f8a4a, -ba + Math.PI / 2, 0, 0, 0.78, 1.04, rng);

      colliders.push({
        type: 'box',
        x: tsX + Math.cos(ba) * bRad,
        z: tsZ + Math.sin(ba) * bRad,
        w: 3.4,
        d: 1.0,
        rotY: -ba + Math.PI / 2
      });
    }

    const tsSign = getSignLayout(layout, 'town_square');
    if (tsSign) {
      registerAnchor('sign_town_square', new THREE.Vector3(tsSign.x, tsSign.boardY, tsSign.z));
      buildSignPost(stoneGeos, glyphGeos, tsSign, rng);
    }

    // =========================================================================
    // 4. SPACE-TIME RIFT
    // Note: Relocated directly flush into the perimeter wall archway (k === riftSideIndex)
    // in src/art/town/shell.js to eliminate the freestanding courtyard obstruction and
    // seal the perimeter wall opening.
    // =========================================================================

    // =========================================================================
    // MERGE STATIC GEOMETRIES & BUILD INSTANCED MESHES
    // =========================================================================
    let totalTris = 0;
    let totalMeshes = 0;

    function addMergedMesh(geoList, mat, name, receiveOrder = 0) {
      if (geoList.length === 0) return;
      const merged = mergeGeometries(geoList, false);
      for (const g of geoList) g.dispose();
      if (!merged) return;
      activeDisposables.push(merged);
      const mesh = new THREE.Mesh(merged, mat);
      mesh.name = name;
      mesh.frustumCulled = true;
      if (receiveOrder !== 0) mesh.renderOrder = receiveOrder;
      rootGroup.add(mesh);
      totalMeshes++;
      totalTris += merged.attributes.position.count / 3;
    }

    addMergedMesh(stoneGeos, matStone, 'landmarksMain_stone');
    addMergedMesh(mossGeos, matMoss, 'landmarksMain_moss', FLOOR_DECAL_LAYERS.moss.renderOrder);
    // The glowing floor lines are drawn after the ground (and after the moss
    // joints) so that they always win the depth test against the floor.
    addMergedMesh(floorGlyphGeos, matFloorGlyph, 'landmarksMain_floorGlyphs', FLOOR_DECAL_LAYERS.inlay.renderOrder);
    addMergedMesh(glyphGeos, matGlyph, 'landmarksMain_glyphs');
    addMergedMesh(shaftGeos, matShaft, 'landmarksMain_shafts', 2);

    if (aoGeos.length > 0) {
      const nonIdxAo = aoGeos.map(g => (g.index ? g.toNonIndexed() : g));
      const mergedAo = mergeGeometries(nonIdxAo, false);
      for (const g of aoGeos) g.dispose();
      for (const g of nonIdxAo) g.dispose();
      if (mergedAo) {
        activeDisposables.push(mergedAo);
        const aoMesh = new THREE.Mesh(mergedAo, matAO);
        aoMesh.name = 'landmarksMain_ao';
        aoMesh.renderOrder = 1;
        rootGroup.add(aoMesh);
        totalMeshes++;
        totalTris += mergedAo.attributes.position.count / 3;
      }
    }

    // Instanced Fluted Columns (Summoning Room colonnade)
    if (columnMatrices.length > 0) {
      const colParts = [];
      const colSegs = q === 'low' ? 10 : q === 'medium' ? 14 : 18;
      // Plinth & torus base
      addBox(colParts, 1.42, 0.42, 1.42, 0, 0.21, 0, P.wallShade || 0x8e9da3, 0, 0, 0, 0.72, 1.0, rng);
      addCyl(colParts, 0.62, 0.68, 0.32, colSegs, 0, 0.58, 0, P.wallLit || 0xc4cbcf, 0, 0, 0, 0.78, 1.04, rng);
      // Tall fluted shaft
      addCyl(colParts, 0.48, 0.56, 7.2, colSegs, 0, 4.34, 0, P.wallLit || 0xc4cbcf, 0, 0, 0, 0.76, 1.08, rng);
      // Echinus & abacus capital
      addCyl(colParts, 0.68, 0.48, 0.42, colSegs, 0, 8.15, 0, P.wallLit || 0xc4cbcf, 0, 0, 0, 0.84, 1.08, rng);
      addBox(colParts, 1.38, 0.36, 1.38, 0, 8.54, 0, P.wallShade || 0x8e9da3, 0, 0, 0, 0.84, 1.08, rng);

      const colProto = mergeGeometries(colParts, false);
      for (const p of colParts) p.dispose();
      activeDisposables.push(colProto);

      const colInst = new THREE.InstancedMesh(colProto, matStone, columnMatrices.length);
      colInst.name = 'landmarksMain_columns';
      for (let i = 0; i < columnMatrices.length; i++) {
        colInst.setMatrixAt(i, columnMatrices[i]);
      }
      colInst.instanceMatrix.needsUpdate = true;
      rootGroup.add(colInst);
      totalMeshes++;
      totalTris += (colProto.attributes.position.count / 3) * columnMatrices.length;
    }

    // Instanced Balusters (Summoning Room grand staircase)
    if (balusterMatrices.length > 0) {
      const balParts = [];
      const bSegs = q === 'low' ? 6 : 8;
      addBox(balParts, 0.24, 0.14, 0.24, 0, 0.07, 0, P.wallShade || 0x8e9da3, 0, 0, 0, 0.75, 1.0, rng);
      addCyl(balParts, 0.07, 0.11, 0.56, bSegs, 0, 0.42, 0, P.wallLit || 0xc4cbcf, 0, 0, 0, 0.8, 1.06, rng);
      addBox(balParts, 0.24, 0.12, 0.24, 0, 0.76, 0, P.wallLit || 0xc4cbcf, 0, 0, 0, 0.85, 1.08, rng);

      const balProto = mergeGeometries(balParts, false);
      for (const p of balParts) p.dispose();
      activeDisposables.push(balProto);

      const balInst = new THREE.InstancedMesh(balProto, matStone, balusterMatrices.length);
      balInst.name = 'landmarksMain_balusters';
      for (let i = 0; i < balusterMatrices.length; i++) {
        balInst.setMatrixAt(i, balusterMatrices[i]);
      }
      balInst.instanceMatrix.needsUpdate = true;
      rootGroup.add(balInst);
      totalMeshes++;
      totalTris += (balProto.attributes.position.count / 3) * balusterMatrices.length;
    }

    // Add animated meshes to triangle & draw-call stats
    if (animRefs.sphereMesh) {
      totalMeshes++;
      totalTris += animRefs.sphereMesh.geometry.attributes.position.count / 3;
    }
    for (const r of animRefs.sphereRings) {
      totalMeshes++;
      totalTris += r.geometry.attributes.position.count / 3;
    }
    if (animRefs.portalDisc) {
      totalMeshes++;
      totalTris += animRefs.portalDisc.geometry.attributes.position.count / 3;
    }
    for (const r of animRefs.portalRings) {
      totalMeshes++;
      totalTris += r.geometry.attributes.position.count / 3;
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

    if (animRefs.sphereMesh) {
      animRefs.sphereMesh.rotation.y += dt * 0.35;
      animRefs.sphereMesh.position.y = getGroundY(30.0, 4.0) + 1.6 + 5.3 + Math.sin(t * 1.6) * 0.12;
    }

    for (let i = 0; i < animRefs.sphereRings.length; i++) {
      const ring = animRefs.sphereRings[i];
      ring.rotation.y += dt * (0.45 + i * 0.18) * (i % 2 === 0 ? 1 : -1);
      ring.rotation.z += dt * (0.25 + i * 0.1);
      if (animRefs.sphereMesh) {
        ring.position.y = animRefs.sphereMesh.position.y;
      }
    }

    if (animRefs.portalDisc) {
      animRefs.portalDisc.rotation.z -= dt * 0.55;
      const pulse = 0.86 + Math.sin(t * 2.8) * 0.12;
      matPortal.opacity = pulse;
    }

    for (let i = 0; i < animRefs.portalRings.length; i++) {
      const pr = animRefs.portalRings[i];
      pr.rotation.z += dt * (0.65 - i * 0.22) * (i % 2 === 0 ? 1 : -1);
    }
  }

  function setLighting(lighting = {}) {
    const nightBoost = typeof lighting.lampGlow === 'number'
      ? lighting.lampGlow
      : (typeof lighting.windowGlow === 'number' ? lighting.windowGlow : 0.7);

    // Sphere and Portal stay ALWAYS lit, increasing slightly at night per Addendum (b)
    matSphere.emissiveIntensity = 1.45 + nightBoost * 0.65;
    matSphereRing.emissiveIntensity = 1.25 + nightBoost * 0.55;
    matGlyph.emissiveIntensity = 1.15 + nightBoost * 0.65;
    matShaft.opacity = 0.09 + nightBoost * 0.08;

    for (let i = 0; i < lights.length; i++) {
      const l = lights[i];
      const base = l.baseIntensity || 6.0;
      l.intensity = base * (0.85 + nightBoost * 0.35);
    }
  }

  function setTimeOfDay(t = 0.3) {
    const isNight = t < 0.22 || t > 0.78;
    const nightFactor = isNight ? 1.0 : 0.25;
    setLighting({ lampGlow: nightFactor, windowGlow: nightFactor });
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
    portalTex.dispose();
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
