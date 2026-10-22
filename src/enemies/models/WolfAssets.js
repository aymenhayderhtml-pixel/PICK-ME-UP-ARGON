// src/enemies/models/WolfAssets.js
// Procedural geometry, textures, materials and cache for Wolf quadruped enemy models.
import * as THREE from 'three';

export const WOLF_ART_CACHE = {
  initialized: false,
  gradientTex: null,
  furMat: null,
  outlineMat: null,
  eyeMat: null,
  geomsBody: {},
  geomsOutlined: {},
  outlineShells: {},
};

export function getPrairieWolfAssets() {
  if (WOLF_ART_CACHE.initialized) {
    return WOLF_ART_CACHE;
  }

  const gradData = new Uint8Array([
    64, 64, 64, 255,
    124, 124, 124, 255,
    190, 190, 190, 255,
    255, 255, 255, 255,
  ]);
  const gradientTex = new THREE.DataTexture(gradData, 4, 1, THREE.RGBAFormat);
  gradientTex.minFilter = THREE.NearestFilter;
  gradientTex.magFilter = THREE.NearestFilter;
  gradientTex.generateMipmaps = false;
  gradientTex.needsUpdate = true;

  const furMat = new THREE.MeshToonMaterial({
    color: 0xffffff,
    gradientMap: gradientTex,
    vertexColors: true,
  });

  const outlineMat = new THREE.MeshBasicMaterial({
    color: 0x14101c,
    side: THREE.BackSide,
  });

  const eyeMat = new THREE.MeshBasicMaterial({
    color: 0xffd23a,
    vertexColors: true,
  });

  const C_FUR_DARK = 0x4a4d55;
  const C_FUR_DEEP = 0x353840;
  const C_FUR_PAW = 0x24262c;
  const C_FUR_LIGHT = 0x7c808c;
  const C_EAR_INNER = 0x9fa5b3;
  const C_NOSE = 0x16161c;
  const C_FANG = 0xd8d0bc;
  const C_GUM = 0x78262e;
  const C_SCAR = 0x7e242b;
  const C_OUTLINE = 0x14101c;
  const C_EYE = 0xffd23a;
  const C_STREAK = 0xffb82e;

  function rgb(hex) {
    return [
      ((hex >> 16) & 255) / 255,
      ((hex >> 8) & 255) / 255,
      (hex & 255) / 255,
    ];
  }

  function colorizeGeom(geom, baseHex, bellyHex = null, bellyY = -99, topHex = null, topY = 99) {
    const g = geom.index ? geom.toNonIndexed() : geom.clone();
    g.computeVertexNormals();
    const pos = g.attributes.position;
    const norm = g.attributes.normal;
    const count = pos.count;
    const col = new Float32Array(count * 3);
    const cBase = rgb(baseHex);
    const cBelly = bellyHex !== null ? rgb(bellyHex) : null;
    const cTop = topHex !== null ? rgb(topHex) : null;

    for (let i = 0; i < count; i++) {
      const vy = pos.getY(i);
      const ny = norm.getY(i);
      let r = cBase[0];
      let gr = cBase[1];
      let b = cBase[2];

      const shade = 0.92 + Math.max(-0.5, Math.min(1.0, ny)) * 0.12;
      r *= shade;
      gr *= shade;
      b *= shade;

      if (cBelly && (vy < bellyY || ny < -0.25)) {
        const t = Math.max(0, Math.min(1, (bellyY - vy) * 4.5 + Math.max(0, -ny - 0.2) * 0.75));
        r = r + (cBelly[0] - r) * t;
        gr = gr + (cBelly[1] - gr) * t;
        b = b + (cBelly[2] - b) * t;
      }

      if (cTop && vy > topY) {
        const t = Math.max(0, Math.min(1, (vy - topY) * 5.0));
        r = r + (cTop[0] - r) * t;
        gr = gr + (cTop[1] - gr) * t;
        b = b + (cTop[2] - b) * t;
      }

      col[i * 3] = Math.max(0, Math.min(1, r));
      col[i * 3 + 1] = Math.max(0, Math.min(1, gr));
      col[i * 3 + 2] = Math.max(0, Math.min(1, b));
    }

    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    for (const k of Object.keys(g.attributes)) {
      if (k !== 'position' && k !== 'normal' && k !== 'color') {
        g.deleteAttribute(k);
      }
    }
    return g;
  }

  function joinGeoms(list) {
    let totalVerts = 0;
    for (let i = 0; i < list.length; i++) {
      totalVerts += list[i].attributes.position.count;
    }
    const pos = new Float32Array(totalVerts * 3);
    const norm = new Float32Array(totalVerts * 3);
    const col = new Float32Array(totalVerts * 3);
    let offset = 0;
    for (let i = 0; i < list.length; i++) {
      const g = list[i];
      const p = g.attributes.position.array;
      const n = g.attributes.normal.array;
      const c = g.attributes.color.array;
      pos.set(p, offset);
      norm.set(n, offset);
      col.set(c, offset);
      offset += p.length;
      g.dispose();
    }
    const out = new THREE.BufferGeometry();
    out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    out.setAttribute('normal', new THREE.BufferAttribute(norm, 3));
    out.setAttribute('color', new THREE.BufferAttribute(col, 3));
    return out;
  }

  function appendInvertedOutline(baseGeom, scale = 1.03) {
    const hull = baseGeom.clone();
    const pos = hull.attributes.position;
    const norm = hull.attributes.normal;
    const count = pos.count;
    const thickness = (scale - 1.0) * 0.42;

    for (let i = 0; i < count; i++) {
      const nx = norm.getX(i);
      const ny = norm.getY(i);
      const nz = norm.getZ(i);
      pos.setXYZ(
        i,
        pos.getX(i) * scale + nx * thickness,
        pos.getY(i) * scale + ny * thickness,
        pos.getZ(i) * scale + nz * thickness
      );
      norm.setXYZ(i, -nx, -ny, -nz);
    }

    for (let i = 0; i < count; i += 3) {
      const i1 = i + 1;
      const i2 = i + 2;
      const tx = pos.getX(i1), ty = pos.getY(i1), tz = pos.getZ(i1);
      pos.setXYZ(i1, pos.getX(i2), pos.getY(i2), pos.getZ(i2));
      pos.setXYZ(i2, tx, ty, tz);

      const tnx = norm.getX(i1), tny = norm.getY(i1), tnz = norm.getZ(i1);
      norm.setXYZ(i1, norm.getX(i2), norm.getY(i2), norm.getZ(i2));
      norm.setXYZ(i2, tnx, tny, tnz);
    }

    const col = new Float32Array(count * 3);
    const cOut = rgb(C_OUTLINE);
    for (let i = 0; i < count; i++) {
      col[i * 3] = cOut[0];
      col[i * 3 + 1] = cOut[1];
      col[i * 3 + 2] = cOut[2];
    }
    hull.setAttribute('color', new THREE.BufferAttribute(col, 3));
    return joinGeoms([baseGeom.clone(), hull]);
  }

  function makeFurWedge(w, h, len, x, y, z, rx, ry, rz, hex = C_FUR_DEEP) {
    const cone = new THREE.ConeGeometry(w, h, 4);
    cone.scale(0.65, 1.0, len / Math.max(0.01, w));
    cone.rotateX(rx);
    cone.rotateY(ry);
    cone.rotateZ(rz);
    cone.translate(x, y, z);
    return colorizeGeom(cone, hex);
  }

  function registerPart(name, bodyGeom, withEmbeddedOutline = true) {
    WOLF_ART_CACHE.geomsBody[name] = bodyGeom;
    WOLF_ART_CACHE.geomsOutlined[name] = withEmbeddedOutline
      ? appendInvertedOutline(bodyGeom, 1.03)
      : bodyGeom;
  }

  // 1. HIPS (pelvis + muscular hindquarters + spine wedges)
  {
    const parts = [];
    const pelvis = new THREE.CylinderGeometry(0.19, 0.21, 0.46, 8, 2);
    pelvis.scale(1.05, 0.96, 1.0);
    pelvis.rotateX(Math.PI * 0.52);
    pelvis.translate(0, 0.0, 0.02);
    parts.push(colorizeGeom(pelvis, C_FUR_DARK, C_FUR_LIGHT, -0.06, C_FUR_DEEP, 0.12));

    for (let i = 0; i < 3; i++) {
      parts.push(
        makeFurWedge(0.07, 0.14, 0.11, 0, 0.19 - i * 0.01, 0.14 - i * 0.13, -0.85, 0, 0, C_FUR_DEEP)
      );
    }
    registerPart('hips', joinGeoms(parts), true);
  }

  // 2. TORSO (tucked athletic flank bridging hips to chest + dorsal fur ridge)
  {
    const parts = [];
    const flank = new THREE.CylinderGeometry(0.23, 0.18, 0.62, 8, 2);
    flank.scale(0.95, 0.92, 1.0);
    flank.rotateX(Math.PI * 0.48);
    flank.translate(0, 0.02, -0.12);
    parts.push(colorizeGeom(flank, C_FUR_DARK, C_FUR_LIGHT, -0.05, C_FUR_DEEP, 0.12));

    for (let i = 0; i < 4; i++) {
      parts.push(
        makeFurWedge(0.075, 0.16, 0.12, 0, 0.21 + i * 0.012, -0.34 + i * 0.15, -0.82, 0, 0, C_FUR_DEEP)
      );
    }
    registerPart('torso', joinGeoms(parts), true);
  }

  // 3. CHEST (broad muscular ribcage + spiky manhwa shoulder mane + pale throat/chest patch)
  {
    const parts = [];
    const ribcage = new THREE.CylinderGeometry(0.24, 0.26, 0.56, 8, 2);
    ribcage.scale(1.08, 1.04, 1.0);
    ribcage.rotateX(Math.PI * 0.46);
    ribcage.translate(0, -0.01, -0.02);
    parts.push(colorizeGeom(ribcage, C_FUR_DARK, C_FUR_LIGHT, -0.06, C_FUR_DEEP, 0.15));

    const breast = new THREE.ConeGeometry(0.18, 0.28, 6);
    breast.scale(1.0, 1.0, 0.85);
    breast.rotateX(Math.PI * 0.68);
    breast.translate(0, -0.05, 0.24);
    parts.push(colorizeGeom(breast, C_FUR_LIGHT));

    // Spiky shoulder and upper-back fur mane wedges
    const maneSpecs = [
      [0.0, 0.27, 0.08, -0.85, 0, 0],
      [0.0, 0.25, -0.08, -0.9, 0, 0],
      [0.16, 0.20, 0.04, -0.75, 0.35, -0.48],
      [-0.16, 0.20, 0.04, -0.75, -0.35, 0.48],
      [0.24, 0.08, 0.02, -0.65, 0.45, -0.82],
      [-0.24, 0.08, 0.02, -0.65, -0.45, 0.82],
      [0.19, -0.04, 0.16, -0.55, 0.4, -0.75],
      [-0.19, -0.04, 0.16, -0.55, -0.4, 0.75],
    ];
    for (let i = 0; i < maneSpecs.length; i++) {
      const m = maneSpecs[i];
      parts.push(makeFurWedge(0.09, 0.22, 0.14, m[0], m[1], m[2], m[3], m[4], m[5], C_FUR_DEEP));
    }

    const chestGeom = joinGeoms(parts);
    registerPart('chest', chestGeom, true);
    WOLF_ART_CACHE.outlineShells.chest = chestGeom;
  }

  // 4. NECK (muscular angled wolf neck + spiky ruff collar)
  {
    const parts = [];
    const neckCyl = new THREE.CylinderGeometry(0.15, 0.20, 0.34, 7, 1);
    neckCyl.rotateX(Math.PI * 0.32);
    neckCyl.translate(0, 0.05, 0.10);
    parts.push(colorizeGeom(neckCyl, C_FUR_DARK, C_FUR_LIGHT, 0.0, C_FUR_DEEP, 0.12));

    const ruffSpecs = [
      [0.0, 0.17, 0.04, -0.95, 0, 0],
      [0.13, 0.12, 0.05, -0.8, 0.35, -0.55],
      [-0.13, 0.12, 0.05, -0.8, -0.35, 0.55],
      [0.16, 0.02, 0.08, -0.65, 0.48, -0.88],
      [-0.16, 0.02, 0.08, -0.65, -0.48, 0.88],
    ];
    for (let i = 0; i < ruffSpecs.length; i++) {
      const r = ruffSpecs[i];
      parts.push(makeFurWedge(0.08, 0.19, 0.12, r[0], r[1], r[2], r[3], r[4], r[5], C_FUR_DEEP));
    }
    registerPart('neck', joinGeoms(parts), true);
  }

  // 5. HEAD (angular wolf cranium, cheek spikes, snarling snout, scars, fangs & teeth)
  {
    const parts = [];

    const cranium = new THREE.BoxGeometry(0.26, 0.21, 0.24, 2, 2, 2).toNonIndexed();
    const cPos = cranium.attributes.position;
    for (let i = 0; i < cPos.count; i++) {
      let vx = cPos.getX(i);
      let vy = cPos.getY(i);
      let vz = cPos.getZ(i);
      if (vz > 0) {
        vx *= 0.84;
        vy *= 0.88;
      }
      if (vy > 0) {
        vx *= 0.88;
      }
      cPos.setXYZ(i, vx, vy + 0.02, vz + 0.02);
    }
    parts.push(colorizeGeom(cranium, C_FUR_DARK, C_FUR_LIGHT, -0.05, C_FUR_DEEP, 0.08));

    // Snarling tapered upper muzzle
    const snout = new THREE.BoxGeometry(0.16, 0.12, 0.30, 2, 1, 2).toNonIndexed();
    const sPos = snout.attributes.position;
    for (let i = 0; i < sPos.count; i++) {
      let vx = sPos.getX(i);
      let vy = sPos.getY(i);
      let vz = sPos.getZ(i);
      const t = (vz + 0.15) / 0.30;
      vx *= 1.0 - t * 0.34;
      vy *= 1.0 - t * 0.28;
      if (vy > 0) {
        vy += Math.sin(t * Math.PI) * 0.015;
      }
      sPos.setXYZ(i, vx, vy - 0.01, vz + 0.26);
    }
    parts.push(colorizeGeom(snout, C_FUR_DARK, C_FUR_LIGHT, -0.02, C_FUR_LIGHT, 0.03));

    // Black nose tip
    const nose = new THREE.BoxGeometry(0.075, 0.055, 0.055);
    nose.rotateX(0.18);
    nose.translate(0, 0.015, 0.42);
    parts.push(colorizeGeom(nose, C_NOSE));

    // Jagged cheek ruffs (left and right)
    for (const side of [-1, 1]) {
      parts.push(
        makeFurWedge(0.065, 0.16, 0.10, side * 0.14, 0.01, -0.02, -0.45, side * 0.55, -side * 1.1, C_FUR_DEEP),
        makeFurWedge(0.06, 0.14, 0.09, side * 0.13, -0.05, 0.04, -0.35, side * 0.45, -side * 1.25, C_FUR_LIGHT),
        makeFurWedge(0.055, 0.13, 0.08, side * 0.09, 0.11, -0.08, -0.85, side * 0.25, -side * 0.35, C_FUR_DEEP)
      );
    }

    // Battle scars across left brow and snout bridge
    const scar1 = new THREE.BoxGeometry(0.016, 0.014, 0.15);
    scar1.rotateY(-0.28);
    scar1.rotateX(0.24);
    scar1.translate(0.068, 0.068, 0.15);
    parts.push(colorizeGeom(scar1, C_SCAR));

    const scar2 = new THREE.BoxGeometry(0.11, 0.014, 0.016);
    scar2.rotateZ(-0.22);
    scar2.translate(0.02, 0.046, 0.26);
    parts.push(colorizeGeom(scar2, C_SCAR));

    // Long curved ivory fangs protruding from upper jaw + sharp upper incisors
    for (const side of [-1, 1]) {
      const fang = new THREE.ConeGeometry(0.022, 0.125, 5);
      fang.rotateX(Math.PI - 0.16);
      fang.rotateZ(side * 0.06);
      fang.translate(side * 0.056, -0.095, 0.31);
      parts.push(colorizeGeom(fang, C_FANG));

      const premolar = new THREE.ConeGeometry(0.014, 0.055, 4);
      premolar.rotateX(Math.PI);
      premolar.translate(side * 0.052, -0.068, 0.24);
      parts.push(colorizeGeom(premolar, C_FANG));

      const incisor = new THREE.ConeGeometry(0.011, 0.042, 4);
      incisor.rotateX(Math.PI - 0.1);
      incisor.translate(side * 0.022, -0.065, 0.37);
      parts.push(colorizeGeom(incisor, C_FANG));
    }

    const headGeom = joinGeoms(parts);
    registerPart('head', headGeom, true);
    WOLF_ART_CACHE.outlineShells.head = headGeom;
  }

  // 6. EYES & GOLDEN STREAK MARKINGS
  {
    const parts = [];
    for (const side of [-1, 1]) {
      const eye = new THREE.BoxGeometry(0.036, 0.024, 0.048);
      eye.rotateY(side * 0.38);
      eye.rotateZ(-side * 0.26);
      eye.translate(side * 0.088, 0.036, 0.145);
      parts.push(colorizeGeom(eye, C_EYE));

      const streak1 = new THREE.ConeGeometry(0.018, 0.16, 4);
      streak1.scale(0.65, 1.0, 0.45);
      streak1.rotateX(-Math.PI * 0.38);
      streak1.rotateZ(-side * 0.28);
      streak1.translate(side * 0.098, 0.078, 0.09);
      parts.push(colorizeGeom(streak1, C_STREAK));

      const streak2 = new THREE.ConeGeometry(0.014, 0.14, 4);
      streak2.scale(0.55, 1.0, 0.45);
      streak2.rotateX(-Math.PI * 0.44);
      streak2.rotateZ(-side * 0.34);
      streak2.translate(side * 0.112, 0.115, -0.01);
      parts.push(colorizeGeom(streak2, C_EYE));
    }
    registerPart('eyes', joinGeoms(parts), false);
  }

  // 7. JAW (articulated lower jaw + tongue/gums + lower canines & teeth)
  {
    const parts = [];
    const jawBone = new THREE.BoxGeometry(0.125, 0.052, 0.25, 1, 1, 2).toNonIndexed();
    const jPos = jawBone.attributes.position;
    for (let i = 0; i < jPos.count; i++) {
      let vx = jPos.getX(i);
      let vy = jPos.getY(i);
      let vz = jPos.getZ(i);
      const t = (vz + 0.125) / 0.25;
      vx *= 1.0 - t * 0.38;
      jPos.setXYZ(i, vx, vy - 0.018, vz + 0.11);
    }
    parts.push(colorizeGeom(jawBone, C_FUR_DARK, C_FUR_LIGHT, -0.01));

    const gum = new THREE.BoxGeometry(0.09, 0.024, 0.21);
    gum.translate(0, 0.008, 0.11);
    parts.push(colorizeGeom(gum, C_GUM));

    for (const side of [-1, 1]) {
      const lFang = new THREE.ConeGeometry(0.015, 0.068, 4);
      lFang.rotateX(0.14);
      lFang.translate(side * 0.042, 0.038, 0.19);
      parts.push(colorizeGeom(lFang, C_FANG));

      const lTooth = new THREE.ConeGeometry(0.011, 0.036, 4);
      lTooth.translate(side * 0.018, 0.026, 0.22);
      parts.push(colorizeGeom(lTooth, C_FANG));
    }
    registerPart('jaw', joinGeoms(parts), true);
  }

  // 8. EAR L (torn left ear with battle notch) & EAR R (intact right ear)
  {
    function makeEar(isTornLeft) {
      const parts = [];
      const outer = new THREE.ConeGeometry(0.062, 0.21, 4).toNonIndexed();
      outer.scale(0.82, 1.0, 0.55);
      if (isTornLeft) {
        const pos = outer.attributes.position;
        for (let i = 0; i < pos.count; i++) {
          let vx = pos.getX(i);
          let vy = pos.getY(i);
          let vz = pos.getZ(i);
          if (vy > 0.02) {
            vy *= 0.78;
            vx -= 0.012;
          }
          if (vx > 0.01 && Math.abs(vy) < 0.05) {
            vx -= 0.026;
          }
          pos.setXYZ(i, vx, vy, vz);
        }
      }
      outer.rotateX(-0.18);
      outer.rotateZ(isTornLeft ? -0.22 : 0.22);
      outer.translate(0, 0.09, 0);
      parts.push(colorizeGeom(outer, C_FUR_DEEP));

      const inner = new THREE.ConeGeometry(0.038, 0.15, 3);
      inner.scale(0.75, 1.0, 0.35);
      inner.rotateX(-0.18);
      inner.rotateZ(isTornLeft ? -0.22 : 0.22);
      inner.translate(0, 0.075, 0.016);
      parts.push(colorizeGeom(inner, C_EAR_INNER));

      return joinGeoms(parts);
    }

    registerPart('earL', makeEar(true), true);
    registerPart('earR', makeEar(false), true);
  }

  // 9. BUSHY SEGMENTED TAIL (tail1, tail2, tail3)
  {
    const t1Parts = [];
    const seg1 = new THREE.CylinderGeometry(0.068, 0.095, 0.28, 6, 1);
    seg1.rotateX(Math.PI * 0.28);
    seg1.translate(0, -0.07, -0.10);
    t1Parts.push(colorizeGeom(seg1, C_FUR_DARK, C_FUR_LIGHT, -0.08));
    t1Parts.push(makeFurWedge(0.055, 0.14, 0.08, 0, -0.04, -0.12, -1.1, 0, 0, C_FUR_DEEP));
    registerPart('tail1', joinGeoms(t1Parts), true);

    const t2Parts = [];
    const seg2 = new THREE.CylinderGeometry(0.095, 0.072, 0.30, 6, 1);
    seg2.rotateX(Math.PI * 0.28);
    seg2.translate(0, -0.08, -0.11);
    t2Parts.push(colorizeGeom(seg2, C_FUR_DARK, C_FUR_LIGHT, -0.10));
    t2Parts.push(
      makeFurWedge(0.06, 0.15, 0.09, 0.04, -0.09, -0.12, -1.05, 0.25, -0.35, C_FUR_DEEP),
      makeFurWedge(0.06, 0.15, 0.09, -0.04, -0.09, -0.12, -1.05, -0.25, 0.35, C_FUR_DEEP)
    );
    registerPart('tail2', joinGeoms(t2Parts), true);

    const t3Parts = [];
    const seg3 = new THREE.ConeGeometry(0.085, 0.32, 6, 1);
    seg3.rotateX(-Math.PI * 0.72);
    seg3.translate(0, -0.09, -0.12);
    t3Parts.push(colorizeGeom(seg3, C_FUR_DEEP, C_FUR_LIGHT, -0.12));
    registerPart('tail3', joinGeoms(t3Parts), true);
  }

  // 10. FORELEG & HINDLEG SEGMENTS + PAWS WITH CLAWS
  {
    const uFrontParts = [];
    const uFront = new THREE.CylinderGeometry(0.098, 0.064, 0.40, 7, 1);
    uFront.translate(0, -0.19, 0);
    uFrontParts.push(colorizeGeom(uFront, C_FUR_DARK, null, -99, C_FUR_DEEP, -0.05));
    uFrontParts.push(makeFurWedge(0.045, 0.13, 0.07, 0, -0.32, -0.055, -2.2, 0, 0, C_FUR_DEEP));
    registerPart('upperForeleg', joinGeoms(uFrontParts), true);

    const lFront = new THREE.CylinderGeometry(0.062, 0.046, 0.41, 6, 1);
    lFront.translate(0, -0.20, 0.01);
    registerPart('lowerForeleg', colorizeGeom(lFront, C_FUR_PAW, null, -99, C_FUR_DARK, -0.12), true);

    const uHindParts = [];
    const uHind = new THREE.CylinderGeometry(0.125, 0.072, 0.39, 7, 1);
    uHind.scale(0.92, 1.0, 1.18);
    uHind.rotateX(-0.10);
    uHind.translate(0, -0.18, 0.015);
    uHindParts.push(colorizeGeom(uHind, C_FUR_DARK, null, -99, C_FUR_DEEP, -0.05));
    uHindParts.push(makeFurWedge(0.05, 0.14, 0.08, 0, -0.24, -0.075, -2.15, 0, 0, C_FUR_DEEP));
    registerPart('upperHindleg', joinGeoms(uHindParts), true);

    const lHindParts = [];
    const shinUpper = new THREE.CylinderGeometry(0.066, 0.052, 0.21, 6, 1);
    shinUpper.rotateX(0.34);
    shinUpper.translate(0, -0.095, -0.032);
    lHindParts.push(colorizeGeom(shinUpper, C_FUR_DARK));

    const metatarsus = new THREE.CylinderGeometry(0.050, 0.044, 0.23, 6, 1);
    metatarsus.rotateX(-0.26);
    metatarsus.translate(0, -0.285, -0.032);
    lHindParts.push(colorizeGeom(metatarsus, C_FUR_PAW));
    registerPart('lowerHindleg', joinGeoms(lHindParts), true);

    const pawParts = [];
    const pad = new THREE.BoxGeometry(0.105, 0.068, 0.135);
    pad.translate(0, -0.036, 0.032);
    pawParts.push(colorizeGeom(pad, C_FUR_PAW));

    const clawOffsets = [-0.034, -0.011, 0.011, 0.034];
    for (let i = 0; i < 4; i++) {
      const claw = new THREE.ConeGeometry(0.011, 0.045, 4);
      claw.rotateX(Math.PI * 0.44);
      claw.translate(clawOffsets[i], -0.054, 0.112);
      pawParts.push(colorizeGeom(claw, C_NOSE));
    }
    registerPart('paw', joinGeoms(pawParts), true);
  }

  WOLF_ART_CACHE.gradientTex = gradientTex;
  WOLF_ART_CACHE.furMat = furMat;
  WOLF_ART_CACHE.outlineMat = outlineMat;
  WOLF_ART_CACHE.eyeMat = eyeMat;
  WOLF_ART_CACHE.initialized = true;
  return WOLF_ART_CACHE;
}