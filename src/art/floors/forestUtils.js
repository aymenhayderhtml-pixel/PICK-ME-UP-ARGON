// src/art/floors/forestUtils.js
// Lighting/layout constants, deterministic PRNG/noise, terrain height evaluation, and geometry/shader utilities for Floor 3.

import * as THREE from 'three';

export const BRIGHT_FOREST_LIGHTING = {
  background: 0xccead9,
  fog: { color: 0xd8efe2, near: 26, far: 88, density: 0.0105 },
  exposure: 1.14,
  ambient: { color: 0x6b8f8c, intensity: 0.48 },
  hemi: { sky: 0xdcf7e8, ground: 0x314927, intensity: 0.75 },
  sun: { color: 0xfff3d1, intensity: 1.85, direction: { x: 24, y: 44, z: 16 } },
};

export const FOREST_FLOOR_LIGHTING = BRIGHT_FOREST_LIGHTING;

export const PILLAR_SPECS = [
  { dx: -7.5, dz: -6.5, leanX:  0.045, leanZ: -0.055, rotY: 0.4 },
  { dx:  7.5, dz: -6.5, leanX: -0.050, leanZ:  0.040, rotY: 1.9 },
  { dx: -8.2, dz:  5.5, leanX:  0.055, leanZ:  0.035, rotY: 3.1 },
  { dx:  8.2, dz:  5.5, leanX: -0.040, leanZ: -0.060, rotY: 4.5 },
  { dx: -13.6, dz: -1.2, leanX:  0.065, leanZ:  0.045, rotY: 0.8 },
  { dx:  13.6, dz: -1.2, leanX: -0.060, leanZ: -0.050, rotY: 2.3 },
  { dx: -12.2, dz: -10.8, leanX: 0.050, leanZ: -0.065, rotY: 3.7 },
  { dx:  12.2, dz: -10.8, leanX:-0.055, leanZ:  0.055, rotY: 5.1 },
  { dx: -5.8,  dz: -14.8, leanX: 0.070, leanZ:  0.030, rotY: 1.2 },
  { dx:  5.8,  dz: -14.8, leanX:-0.065, leanZ: -0.035, rotY: 2.8 },
  { dx: -11.8, dz:  11.2, leanX: 0.045, leanZ:  0.070, rotY: 4.1 },
  { dx:  11.8, dz:  11.2, leanX:-0.050, leanZ: -0.065, rotY: 5.6 },
];

export const GRASS_PALETTE_HEX = [
  0x4b8732,
  0x63a13b,
  0x7ebb42,
  0x9bd14a,
  0xb2df54,
];

export const HILL_LAYER_SPECS = [
  { innerR: 54, outerR: 66, minH: 9, maxH: 17, segs: 44, colorBot: 0x477856, colorTop: 0x6ea07c, seed: 11.4, yOffset: -0.5 },
  { innerR: 72, outerR: 88, minH: 18, maxH: 33, segs: 48, colorBot: 0x689984, colorTop: 0x91bca9, seed: 27.9, yOffset: -1.0 },
  { innerR: 94, outerR: 116, minH: 30, maxH: 54, segs: 52, colorBot: 0x8bb6a4, colorTop: 0xc3e2d3, seed: 53.2, yOffset: -1.5 },
];

export function createSeededRandom(seed = 3005) {
  let s = (seed >>> 0) || 3005;
  return function nextRandom() {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hash2D(ix, iz) {
  let n = Math.imul(ix, 374761393) + Math.imul(iz, 668265263);
  n = (n ^ (n >>> 13)) * 1274126177;
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
}

export function valueNoise2D(x, z) {
  const ix = Math.floor(x);
  const iz = Math.floor(z);
  const fx = x - ix;
  const fz = z - iz;
  const ux = fx * fx * (3 - 2 * fx);
  const uz = fz * fz * (3 - 2 * fz);

  const a = hash2D(ix, iz);
  const b = hash2D(ix + 1, iz);
  const c = hash2D(ix, iz + 1);
  const d = hash2D(ix + 1, iz + 1);

  return a + (b - a) * ux + (c - a) * uz + (a - b - c + d) * ux * uz;
}

export function fbm2D(x, z) {
  let v = 0;
  let amp = 0.5;
  let freq = 1.0;
  for (let i = 0; i < 4; i++) {
    v += amp * valueNoise2D(x * freq, z * freq);
    freq *= 2.03;
    amp *= 0.5;
  }
  return v;
}

export function smoothstep(edge0, edge1, x) {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

export function mergeStaticGeometries(geometries) {
  const valid = geometries.filter(Boolean);
  if (valid.length === 0) return new THREE.BufferGeometry();

  const nonIndexed = valid.map((g) => (g.index ? g.toNonIndexed() : g.clone()));
  let totalVerts = 0;
  let hasColor = false;
  let hasUV = false;

  for (let i = 0; i < nonIndexed.length; i++) {
    totalVerts += nonIndexed[i].attributes.position.count;
    if (nonIndexed[i].attributes.color) hasColor = true;
    if (nonIndexed[i].attributes.uv) hasUV = true;
  }

  const positions = new Float32Array(totalVerts * 3);
  const normals = new Float32Array(totalVerts * 3);
  const colors = hasColor ? new Float32Array(totalVerts * 3) : null;
  const uvs = hasUV ? new Float32Array(totalVerts * 2) : null;

  let offset3 = 0;
  let offset2 = 0;

  for (let i = 0; i < nonIndexed.length; i++) {
    const g = nonIndexed[i];
    if (!g.attributes.normal) g.computeVertexNormals();

    const posAttr = g.attributes.position;
    const normAttr = g.attributes.normal;
    const colAttr = g.attributes.color;
    const uvAttr = g.attributes.uv;
    const count = posAttr.count;

    positions.set(posAttr.array, offset3);
    normals.set(normAttr.array, offset3);

    if (colors) {
      if (colAttr) {
        colors.set(colAttr.array, offset3);
      } else {
        for (let k = 0; k < count * 3; k++) colors[offset3 + k] = 1.0;
      }
    }

    if (uvs) {
      if (uvAttr) {
        uvs.set(uvAttr.array, offset2);
      } else {
        for (let k = 0; k < count * 2; k++) uvs[offset2 + k] = 0.0;
      }
    }

    offset3 += count * 3;
    offset2 += count * 2;
    g.dispose();
  }

  const merged = new THREE.BufferGeometry();
  merged.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  merged.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
  if (colors) merged.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  if (uvs) merged.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  return merged;
}

export function paintGeometryGradientY(geom, bottomColorHex, topColorHex, noiseAmount = 0.06) {
  geom.computeBoundingBox();
  const minY = geom.boundingBox.min.y;
  const maxY = Math.max(minY + 0.0001, geom.boundingBox.max.y);
  const pos = geom.attributes.position;
  const count = pos.count;
  const colors = new Float32Array(count * 3);
  const cBot = new THREE.Color(bottomColorHex);
  const cTop = new THREE.Color(topColorHex);
  const cMix = new THREE.Color();

  for (let i = 0; i < count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const t = Math.max(0, Math.min(1, (y - minY) / (maxY - minY)));
    const n = (valueNoise2D(x * 1.7 + 11.3, z * 1.7 - 7.1) - 0.5) * noiseAmount;
    cMix.copy(cBot).lerp(cTop, Math.max(0, Math.min(1, t + n)));
    colors[i * 3] = cMix.r;
    colors[i * 3 + 1] = cMix.g;
    colors[i * 3 + 2] = cMix.b;
  }
  geom.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return geom;
}

export function evaluateTerrainHeight(localX, localZ) {
  const distFromCenter = Math.hypot(localX, localZ);
  const arenaMask = smoothstep(18.5, 27.5, distFromCenter);

  let corridorMask = 1.0;
  if (localZ > -2.0 && localZ < 48.0) {
    const pathCenterOffset = Math.sin(localZ * 0.11) * 0.85;
    const dx = Math.abs(localX - pathCenterOffset);
    corridorMask = smoothstep(5.8, 13.5, dx);
  }

  let gateMask = 1.0;
  if (localZ < -12.0 && localZ > -23.0) {
    const dx = Math.abs(localX);
    gateMask = smoothstep(4.2, 9.5, dx);
  }

  const flatMask = arenaMask * corridorMask * gateMask;
  if (flatMask <= 0.0001) return 0;

  const n1 = fbm2D(localX * 0.045 + 13.7, localZ * 0.045 - 9.2);
  const n2 = valueNoise2D(localX * 0.11 - 4.1, localZ * 0.11 + 8.3);
  const rimLift = smoothstep(22.0, 56.0, distFromCenter) * 1.65;
  const rolling = (n1 - 0.36) * 2.65 + (n2 - 0.5) * 0.65 + rimLift;
  return rolling * flatMask;
}

export function attachWindSwayShader(material, windUniforms, swayAmplitude = 0.18, swayFrequency = 2.1) {
  const uTime = { value: 0 };
  windUniforms.push(uTime);
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = uTime;
    shader.vertexShader = `uniform float uTime;\n` + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace(
      '#include <begin_vertex>',
      `
      #include <begin_vertex>
      vec3 instWorld = vec3(0.0);
      #ifdef USE_INSTANCING
        instWorld = vec3(instanceMatrix[3][0], instanceMatrix[3][1], instanceMatrix[3][2]);
      #endif
      float hFactor = clamp(position.y * 1.65, 0.0, 1.4);
      float wave = sin(uTime * ${swayFrequency.toFixed(2)} + instWorld.x * 0.34 + instWorld.z * 0.29)
                 + 0.45 * cos(uTime * ${(swayFrequency * 1.6).toFixed(2)} - instWorld.z * 0.52 + instWorld.x * 0.21);
      transformed.x += wave * ${swayAmplitude.toFixed(3)} * hFactor * hFactor;
      transformed.z += wave * ${(swayAmplitude * 0.65).toFixed(3)} * hFactor * hFactor;
      `
    );
  };
  return material;
}