import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { MOSS_COLOR } from './prairieConfig.js';
import { normalizeGeometry } from './prairieHelpers.js';

export function createGrassTuftGeometry(bladeCount) {
  const blades = [];
  for (let i = 0; i < bladeCount; i++) {
    const ang = (i / bladeCount) * Math.PI * 2 + (i * 1.17);
    const dist = i === 0 ? 0 : 0.08 + (i % 3) * 0.045;
    const ox = Math.cos(ang) * dist;
    const oz = Math.sin(ang) * dist;
    const h = 0.58 + (i % 3) * 0.14;
    const w = 0.068;
    const lean = 0.14 + (i % 2) * 0.08;
    const lx = Math.cos(ang + 0.3) * lean;
    const lz = Math.sin(ang + 0.3) * lean;

    const p0x = ox - Math.sin(ang) * w;
    const p0z = oz + Math.cos(ang) * w;
    const p1x = ox + Math.sin(ang) * w;
    const p1z = oz - Math.cos(ang) * w;

    const m0x = ox + lx * 0.45 - Math.sin(ang) * (w * 0.62);
    const m0z = oz + lz * 0.45 + Math.cos(ang) * (w * 0.62);
    const m1x = ox + lx * 0.45 + Math.sin(ang) * (w * 0.62);
    const m1z = oz + lz * 0.45 - Math.cos(ang) * (w * 0.62);
    const my = h * 0.52;

    const tx = ox + lx;
    const tz = oz + lz;
    const ty = h;

    const posArr = [
      p0x, 0, p0z,
      p1x, 0, p1z,
      m0x, my, m0z,
      m0x, my, m0z,
      p1x, 0, p1z,
      m1x, my, m1z,
      m0x, my, m0z,
      m1x, my, m1z,
      tx, ty, tz,
    ];

    const colArr = [
      0.58, 0.62, 0.55,
      0.58, 0.62, 0.55,
      0.86, 0.90, 0.84,
      0.86, 0.90, 0.84,
      0.58, 0.62, 0.55,
      0.86, 0.90, 0.84,
      0.86, 0.90, 0.84,
      0.86, 0.90, 0.84,
      1.08, 1.12, 1.02,
    ];

    const uvArr = [
      0, 0, 1, 0, 0, 0.5,
      0, 0.5, 1, 0, 1, 0.5,
      0, 0.5, 1, 0.5, 0.5, 1,
    ];

    const bg = new THREE.BufferGeometry();
    bg.setAttribute('position', new THREE.Float32BufferAttribute(posArr, 3));
    bg.setAttribute('color', new THREE.Float32BufferAttribute(colArr, 3));
    bg.setAttribute('uv', new THREE.Float32BufferAttribute(uvArr, 2));
    bg.computeVertexNormals();
    blades.push(bg);
  }
  const merged = mergeGeometries(blades, false);
  for (let i = 0; i < blades.length; i++) blades[i].dispose();
  return merged;
}

export function createWildflowerClusterGeometry() {
  const parts = [];
  const blossoms = [
    { x: 0.0, y: 0.36, z: 0.0, r: 0.095, tiltX: 0.18, tiltZ: -0.12 },
    { x: 0.11, y: 0.30, z: 0.08, r: 0.082, tiltX: -0.22, tiltZ: 0.16 },
    { x: -0.09, y: 0.27, z: -0.07, r: 0.076, tiltX: 0.14, tiltZ: 0.22 },
  ];

  for (let i = 0; i < blossoms.length; i++) {
    const b = blossoms[i];
    const head = new THREE.CircleGeometry(b.r, 5);
    head.rotateX(-Math.PI * 0.5 + b.tiltX);
    head.rotateZ(b.tiltZ);
    head.translate(b.x, b.y, b.z);
    parts.push(normalizeGeometry(head, 0xffffff, { bottomAO: 0, variation: 0.03 }));
  }

  const stem = new THREE.PlaneGeometry(0.035, 0.34);
  stem.translate(0, 0.17, 0);
  parts.push(normalizeGeometry(stem, 0x7ea058, { bottomAO: 0.25, variation: 0 }));

  const merged = mergeGeometries(parts, false);
  for (let i = 0; i < parts.length; i++) parts[i].dispose();
  return merged;
}

export function createCanopyPuffGeometry() {
  const geom = new THREE.IcosahedronGeometry(1.0, 1).toNonIndexed();
  const pos = geom.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    let vx = pos.getX(i);
    let vy = pos.getY(i);
    let vz = pos.getZ(i);
    const lump = 0.9 + Math.sin(vx * 3.1 + vz * 2.7) * 0.14;
    if (vy < 0) vy *= 0.62;
    pos.setXYZ(i, vx * lump, vy * lump, vz * lump);
  }
  geom.computeVertexNormals();
  return normalizeGeometry(geom, 0xffffff, {
    bottomAO: 0.32,
    minY: -0.7,
    aoHeight: 1.5,
    variation: 0.05,
  });
}

export function createDistantConiferGeometry(palette) {
  const parts = [];
  const c1 = new THREE.ConeGeometry(1.15, 2.4, 6);
  c1.translate(0, 1.4, 0);
  const c2 = new THREE.ConeGeometry(0.88, 2.0, 6);
  c2.translate(0, 2.6, 0);
  const c3 = new THREE.ConeGeometry(0.58, 1.6, 6);
  c3.translate(0, 3.6, 0);

  parts.push(
    normalizeGeometry(c1, 0x3b5842, { bottomAO: 0.35, minY: 0, aoHeight: 2.2 }),
    normalizeGeometry(c2, 0x46684c, { bottomAO: 0.25, minY: 1.4, aoHeight: 2.0 }),
    normalizeGeometry(c3, palette.grassDark, { bottomAO: 0.15, minY: 2.6, aoHeight: 1.6 })
  );

  const merged = mergeGeometries(parts, false);
  for (let i = 0; i < parts.length; i++) parts[i].dispose();
  return merged;
}

export function createFencePostGeometry(palette) {
  const geom = new THREE.CylinderGeometry(0.085, 0.105, 1.18, 6, 1).toNonIndexed();
  geom.translate(0, 0.59, 0);
  geom.computeVertexNormals();
  return normalizeGeometry(geom, palette.woodWeathered, {
    mossColor: MOSS_COLOR,
    mossStrength: 0.5,
    bottomAO: 0.35,
    aoHeight: 0.6,
  });
}

export function createFlagPennantGeometry() {
  const geom = new THREE.PlaneGeometry(0.95, 0.42, 4, 1).toNonIndexed();
  const pos = geom.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const vx = pos.getX(i) + 0.475;
    let vy = pos.getY(i);
    const taper = 1.0 - (vx / 0.95) * 0.65;
    vy *= taper;
    pos.setXYZ(i, vx, vy, pos.getZ(i));
  }
  geom.computeVertexNormals();
  return normalizeGeometry(geom, 0x9b4b38, { bottomAO: 0.15, variation: 0.06 });
}

export function createEmberMoteGeometry() {
  const geom = new THREE.OctahedronGeometry(0.09, 0);
  return normalizeGeometry(geom, 0xffffff, { bottomAO: 0, variation: 0 });
}