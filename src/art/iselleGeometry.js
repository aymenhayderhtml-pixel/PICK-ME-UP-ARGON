import * as THREE from 'three';

export function mergeGeos(list) {
  let totalVerts = 0;
  let totalIdx = 0;
  const geos = list.map(g => {
    const nonIdx = g.index ? g.toNonIndexed() : g;
    totalVerts += nonIdx.attributes.position.count;
    totalIdx += nonIdx.index ? nonIdx.index.count : nonIdx.attributes.position.count;
    return nonIdx;
  });

  const pos = new Float32Array(totalVerts * 3);
  const norm = new Float32Array(totalVerts * 3);
  const uv = new Float32Array(totalVerts * 2);
  const indices = new Uint32Array(totalIdx);

  let vOffset = 0;
  let iOffset = 0;

  for (const g of geos) {
    const pAttr = g.attributes.position;
    const nAttr = g.attributes.normal;
    const uAttr = g.attributes.uv;
    const count = pAttr.count;

    for (let i = 0; i < count; i++) {
      pos[(vOffset + i) * 3]     = pAttr.getX(i);
      pos[(vOffset + i) * 3 + 1] = pAttr.getY(i);
      pos[(vOffset + i) * 3 + 2] = pAttr.getZ(i);
      if (nAttr) {
        norm[(vOffset + i) * 3]     = nAttr.getX(i);
        norm[(vOffset + i) * 3 + 1] = nAttr.getY(i);
        norm[(vOffset + i) * 3 + 2] = nAttr.getZ(i);
      }
      if (uAttr) {
        uv[(vOffset + i) * 2]     = uAttr.getX(i);
        uv[(vOffset + i) * 2 + 1] = uAttr.getY(i);
      }
    }

    if (g.index) {
      const idx = g.index.array;
      for (let i = 0; i < idx.length; i++) {
        indices[iOffset + i] = idx[i] + vOffset;
      }
      iOffset += idx.length;
    } else {
      for (let i = 0; i < count; i++) {
        indices[iOffset + i] = vOffset + i;
      }
      iOffset += count;
    }
    vOffset += count;
  }

  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(norm, 3));
  out.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  out.setIndex(new THREE.BufferAttribute(indices, 1));
  return out;
}

export function xform(geo, tx = 0, ty = 0, tz = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) {
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz));
  m.compose(new THREE.Vector3(tx, ty, tz), q, new THREE.Vector3(sx, sy, sz));
  geo.applyMatrix4(m);
  return geo;
}

export function makeToonGrad() {
  const data = new Uint8Array([95, 165, 235, 255]);
  const tex = new THREE.DataTexture(data, 4, 1, THREE.RedFormat);
  tex.minFilter = THREE.NearestFilter;
  tex.magFilter = THREE.NearestFilter;
  tex.needsUpdate = true;
  return tex;
}

export function createCurvedFacePlateGeo(width, height, radius, segX = 6, segY = 6) {
  const geo = new THREE.PlaneGeometry(width, height, segX, segY);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const angle = x / radius;
    const ny = y / (height * 0.5);
    const yCurve = (1 - ny * ny * 0.13);
    const r = radius * yCurve;
    pos.setX(i, Math.sin(angle) * r);
    pos.setZ(i, Math.cos(angle) * r);
  }
  geo.computeVertexNormals();
  return geo;
}

export function createHeadGeometry() {
  const sphere = new THREE.SphereGeometry(0.18, 14, 10);
  const pos = sphere.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    let x = pos.getX(i);
    let y = pos.getY(i);
    let z = pos.getZ(i);
    x *= 1.06;
    z *= 0.90;
    if (y < 0) {
      const t = Math.min(1, -y / 0.18);
      x *= (1.0 - t * 0.35);
      z *= (1.0 - t * 0.22);
      if (z > 0) z += t * 0.012;
    }
    pos.setXYZ(i, x, y, z);
  }
  sphere.computeVertexNormals();
  return sphere;
}

export function createHairCrownAndFringeGeo() {
  const parts = [];

  const cap = new THREE.SphereGeometry(0.194, 12, 9);
  const cPos = cap.attributes.position;
  for (let i = 0; i < cPos.count; i++) {
    let x = cPos.getX(i);
    let y = cPos.getY(i);
    let z = cPos.getZ(i);
    x *= 1.06;
    if (z > 0.03 && y < 0.12) {
      y += (0.12 - y) * 0.72;
      z *= 0.84;
    }
    cPos.setXYZ(i, x, y + 0.015, z - 0.014);
  }
  cap.computeVertexNormals();
  parts.push(cap);

  for (const side of [-1, 1]) {
    const arch = xform(
      new THREE.ConeGeometry(0.050, 0.16, 5),
      side * 0.095, 0.112, 0.138,
      0.22, 0, side * 1.15,
      1.0, 1.0, 0.50
    );
    const lock = xform(
      new THREE.ConeGeometry(0.045, 0.24, 5),
      side * 0.172, -0.025, 0.092,
      0.06, 0, -side * 0.10,
      0.85, 1.0, 0.55
    );
    const bunBase = xform(
      new THREE.SphereGeometry(0.045, 6, 5),
      side * 0.145, 0.175, 0.01,
      0, 0, -side * 0.45,
      1.0, 0.85, 0.9
    );
    const bunHorn = xform(
      new THREE.ConeGeometry(0.040, 0.115, 6),
      side * 0.175, 0.235, 0.01,
      -0.1, 0, -side * 0.52
    );
    parts.push(arch, lock, bunBase, bunHorn);
  }

  return mergeGeos(parts);
}

export function createTwinTailGeo(side) {
  const seg1 = xform(
    new THREE.CylinderGeometry(0.035, 0.056, 0.26, 6),
    0, -0.12, 0,
    0.10, 0, side * 0.18
  );
  const seg2 = xform(
    new THREE.ConeGeometry(0.060, 0.30, 6),
    side * 0.045, -0.36, -0.02,
    Math.PI + 0.12, 0, -side * 0.12
  );
  return mergeGeos([seg1, seg2]);
}

export function createCohesiveWingGeos(side) {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0.02);
  shape.quadraticCurveTo(side * 0.24, 0.26, side * 0.64, 0.18);
  shape.quadraticCurveTo(side * 0.54, 0.04, side * 0.56, -0.08);
  shape.quadraticCurveTo(side * 0.43, -0.02, side * 0.41, -0.18);
  shape.quadraticCurveTo(side * 0.28, -0.08, side * 0.24, -0.22);
  shape.quadraticCurveTo(side * 0.12, -0.10, 0, -0.05);
  shape.closePath();

  const membraneGeo = new THREE.ShapeGeometry(shape, 5);

  const edgeParts = [];

  const addStrut = (x1, y1, x2, y2, thickness = 0.018) => {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.hypot(dx, dy);
    const ang = Math.atan2(dy, dx);
    const bar = xform(
      new THREE.BoxGeometry(len, thickness, 0.018),
      (x1 + x2) * 0.5, (y1 + y2) * 0.5, 0,
      0, 0, ang
    );
    edgeParts.push(bar);
  };

  addStrut(0, 0.02, side * 0.28, 0.20, 0.024);
  addStrut(side * 0.28, 0.20, side * 0.64, 0.18, 0.022);

  addStrut(side * 0.26, 0.19, side * 0.56, -0.08, 0.016);
  addStrut(side * 0.22, 0.16, side * 0.41, -0.18, 0.016);
  addStrut(side * 0.15, 0.11, side * 0.24, -0.22, 0.016);
  addStrut(side * 0.06, 0.05, 0, -0.05, 0.015);

  addStrut(side * 0.64, 0.18, side * 0.56, -0.08, 0.016);
  addStrut(side * 0.56, -0.08, side * 0.41, -0.18, 0.016);
  addStrut(side * 0.41, -0.18, side * 0.24, -0.22, 0.016);
  addStrut(side * 0.24, -0.22, 0, -0.05, 0.016);

  return {
    membraneGeo,
    edgeGeo: mergeGeos(edgeParts),
  };
}

export function makeArmSingleGeo() {
  const sleeve = xform(new THREE.ConeGeometry(0.048, 0.15, 6), 0, -0.075, 0, 0, 0, Math.PI);
  const forearm = xform(new THREE.CylinderGeometry(0.025, 0.022, 0.14, 6), 0, -0.19, 0);
  const hand = xform(new THREE.SphereGeometry(0.028, 6, 5), 0, -0.27, 0);
  return mergeGeos([sleeve, forearm, hand]);
}

export function makeLegSingleGeo() {
  const thigh = xform(new THREE.CylinderGeometry(0.040, 0.032, 0.25, 6), 0, -0.14, 0);
  const boot = xform(new THREE.CylinderGeometry(0.035, 0.040, 0.22, 6), 0, -0.36, 0);
  const foot = xform(new THREE.BoxGeometry(0.068, 0.052, 0.12), 0, -0.46, 0.02);
  return mergeGeos([thigh, boot, foot]);
}