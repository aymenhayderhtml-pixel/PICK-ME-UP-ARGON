import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import {
  GRADE_STYLES,
  _geomCache,
  prepPart,
  makeDiamondBlade,
  makeCurvedPickArm,
  makeBox,
  makeCyl,
  makeOcta,
  buildRuneStrips
} from './weaponMaterialsAndParts.js';

export function getWeaponGeometryData(kind, grade) {
  const cacheKey = `wgeom_${kind}_${grade}`;
  if (_geomCache.has(cacheKey)) return _geomCache.get(cacheKey);

  const st = GRADE_STYLES[grade] || GRADE_STYLES['E'];
  const isHigh = grade === 'A' || grade === 'S' || grade === 'S+';
  const hasFuller = grade !== 'E';
  const bodyParts = [];
  const runeStrips = [];
  let specialGeom = null;
  let anchors = {};

  if (kind === 'sword') {
    // Total length 1.0m: pommel +0.16, grip [-0.09..+0.13], guard -0.09, blade [-0.08..-0.84]
    bodyParts.push(prepPart(makeCyl(0.017, 0.020, 0.22, 6, 0, 0.02, 0), st.grip, false, 0));
    bodyParts.push(prepPart(makeOcta(0.035, 1, 1.15, 1, 0, 0.14, 0), st.guard, true, 0));
    const gw = isHigh ? 0.26 : 0.22;
    bodyParts.push(prepPart(makeBox(0.036, 0.038, gw, 0, -0.09, 0), st.guard, true, 0));
    if (isHigh) {
      bodyParts.push(prepPart(makeOcta(0.025, 1.25, 1, 1, 0, -0.09, 0), st.gem, true, 0));
      bodyParts.push(prepPart(makeBox(0.024, 0.052, 0.036, 0, -0.10, gw * 0.47), st.trim, true, 0));
      bodyParts.push(prepPart(makeBox(0.024, 0.052, 0.036, 0, -0.10, -gw * 0.47), st.trim, true, 0));
    }
    // Blade overlaps inside guard (-0.08 to -0.84) with bright edge highlight
    const blade = makeDiamondBlade(0.76, 0.076, 0.052, 0.022, 0.014);
    blade.translate(0, -0.08, 0);
    bodyParts.push(prepPart(blade, st.blade, true, 1, st.edge));
    if (hasFuller) {
      bodyParts.push(prepPart(makeBox(0.025, 0.48, 0.016, 0, -0.34, 0), st.guard, true, 0));
    }

    runeStrips.push(
      { sx: 0.028, sy: 0.46, sz: 0.009, x: 0, y: -0.37, z: 0 },
      { sx: 0.030, sy: 0.012, sz: 0.038, x: 0, y: -0.22, z: 0 },
      { sx: 0.030, sy: 0.012, sz: 0.034, x: 0, y: -0.38, z: 0 },
      { sx: 0.030, sy: 0.012, sz: 0.028, x: 0, y: -0.54, z: 0 }
    );
    anchors = {
      grip: [0, 0, 0], pommel: [0, 0.16, 0], tip: [0, -0.84, 0],
      edgeBase: [0, -0.11, 0.038], edgeTip: [0, -0.83, 0.01], hit: [0, -0.48, 0]
    };
  } else if (kind === 'greatsword') {
    // Total length 1.5m: pommel +0.26, grip [-0.15..+0.23], guard -0.15, blade [-0.13..-1.24]
    bodyParts.push(prepPart(makeCyl(0.021, 0.024, 0.38, 6, 0, 0.04, 0), st.grip, false, 0));
    bodyParts.push(prepPart(makeOcta(0.046, 1, 1.2, 1, 0, 0.24, 0), st.guard, true, 0));
    const gw = isHigh ? 0.38 : 0.33;
    bodyParts.push(prepPart(makeBox(0.048, 0.048, gw, 0, -0.15, 0), st.guard, true, 0));
    bodyParts.push(prepPart(makeBox(0.034, 0.13, 0.09, 0, -0.21, 0), st.trim, true, 0));
    if (isHigh) {
      bodyParts.push(prepPart(makeOcta(0.032, 1.3, 1, 1, 0, -0.15, 0), st.gem, true, 0));
    }
    const blade = makeDiamondBlade(1.11, 0.106, 0.075, 0.030, 0.018);
    blade.translate(0, -0.13, 0);
    bodyParts.push(prepPart(blade, st.blade, true, 1, st.edge));
    if (hasFuller) {
      bodyParts.push(prepPart(makeBox(0.033, 0.68, 0.022, 0, -0.58, 0), st.guard, true, 0));
    }

    runeStrips.push(
      { sx: 0.035, sy: 0.78, sz: 0.014, x: 0, y: -0.58, z: 0 },
      { sx: 0.037, sy: 0.016, sz: 0.055, x: 0, y: -0.35, z: 0 },
      { sx: 0.037, sy: 0.016, sz: 0.050, x: 0, y: -0.58, z: 0 },
      { sx: 0.037, sy: 0.016, sz: 0.042, x: 0, y: -0.81, z: 0 }
    );
    anchors = {
      grip: [0, 0, 0], pommel: [0, 0.26, 0], tip: [0, -1.24, 0],
      edgeBase: [0, -0.18, 0.052], edgeTip: [0, -1.22, 0.012], hit: [0, -0.72, 0]
    };
  } else if (kind === 'spear') {
    // Total length 2.0m: pommel +0.65, shaft [+0.63..-0.96], ferrule [-0.88..-0.98], leaf blade [-0.93..-1.35]
    bodyParts.push(prepPart(makeCyl(0.018, 0.019, 1.59, 6, 0, -0.165, 0), st.wood, false, 0));
    bodyParts.push(prepPart(makeCyl(0.022, 0.022, 0.36, 6, 0, 0.0, 0), st.grip, false, 0));
    bodyParts.push(prepPart(makeOcta(0.028, 0.9, 1.4, 0.9, 0, 0.63, 0), st.guard, true, 0));
    // Overlapping ferrule collar & tassel
    bodyParts.push(prepPart(makeCyl(0.030, 0.021, 0.11, 6, 0, -0.93, 0), st.guard, true, 0));
    bodyParts.push(prepPart(makeBox(0.018, 0.13, 0.036, 0, -0.89, -0.026), 0xc42b2b, false, 0));
    // Leaf blade deeply socketed into ferrule (-0.93 to -1.35)
    const blade = makeDiamondBlade(0.42, 0.056, 0.090, 0.025, 0.016);
    blade.translate(0, -0.93, 0);
    bodyParts.push(prepPart(blade, st.blade, true, 1, st.edge));

    runeStrips.push(
      { sx: 0.028, sy: 0.28, sz: 0.012, x: 0, y: -1.11, z: 0 },
      { sx: 0.044, sy: 0.05, sz: 0.044, x: 0, y: -0.93, z: 0 }
    );
    anchors = {
      grip: [0, 0, 0], pommel: [0, 0.65, 0], tip: [0, -1.35, 0],
      edgeBase: [0, -0.95, 0.042], edgeTip: [0, -1.35, 0.01], hit: [0, -1.15, 0]
    };
  } else if (kind === 'dagger') {
    // Total length 0.40m: pommel +0.08, grip [-0.055..+0.068], guard -0.055, blade [-0.045..-0.32]
    bodyParts.push(prepPart(makeCyl(0.014, 0.016, 0.125, 6, 0, 0.005, 0), st.grip, false, 0));
    bodyParts.push(prepPart(makeOcta(0.025, 1, 0.95, 1, 0, 0.070, 0), st.guard, true, 0));
    bodyParts.push(prepPart(makeBox(0.028, 0.024, 0.12, 0, -0.055, 0), st.guard, true, 0));
    const blade = makeDiamondBlade(0.275, 0.052, 0.038, 0.018, 0.012);
    blade.translate(0, -0.045, 0);
    bodyParts.push(prepPart(blade, st.blade, true, 1, st.edge));

    runeStrips.push(
      { sx: 0.022, sy: 0.18, sz: 0.008, x: 0, y: -0.16, z: 0 }
    );
    anchors = {
      grip: [0, 0, 0], pommel: [0, 0.08, 0], tip: [0, -0.32, 0],
      edgeBase: [0, -0.06, 0.026], edgeTip: [0, -0.32, 0.008], hit: [0, -0.19, 0]
    };
  } else if (kind === 'bow') {
    // Height 1.2m along Y [-0.60..+0.60], grip at [0,0,0], limbs curve toward -Z
    const riserParts = [];
    riserParts.push(prepPart(makeCyl(0.021, 0.021, 0.22, 6, 0, 0, 0.018), st.grip, false, 0));
    riserParts.push(prepPart(makeBox(0.034, 0.045, 0.046, 0, 0.10, 0.016), st.guard, true, 0));
    riserParts.push(prepPart(makeBox(0.034, 0.045, 0.046, 0, -0.10, 0.016), st.guard, true, 0));

    // Grade upgrades: C/B adds iron reinforced plates; A adds rune trims
    if (grade === 'C' || grade === 'B' || isHigh) {
      riserParts.push(prepPart(makeBox(0.038, 0.16, 0.012, 0, 0, 0.038), st.guard, true, 1));
    }

    const segs = [
      { y0: 0.09, z0: 0.016, y1: 0.29, z1: 0.04, r0: 0.020, r1: 0.017 },
      { y0: 0.27, z0: 0.038, y1: 0.47, z1: -0.02, r0: 0.017, r1: 0.014 },
      { y0: 0.45, z0: -0.018, y1: 0.60, z1: -0.13, r0: 0.014, r1: 0.010 }
    ];

    const topParts = [];
    const botParts = [];

    for (const s of segs) {
      const dy = s.y1 - s.y0;
      const dz = s.z1 - s.z0;
      const len = Math.hypot(dy, dz);
      const angle = Math.atan2(dz, dy);

      // Top limb relative to pivot [0, 0.10, 0.016]
      const gTop = new THREE.CylinderGeometry(s.r1, s.r0, len, 6, 1);
      gTop.rotateX(angle);
      gTop.translate(0, (s.y0 + s.y1) * 0.5 - 0.10, (s.z0 + s.z1) * 0.5 - 0.016);
      topParts.push(prepPart(gTop, isHigh ? st.blade : st.wood, isHigh, 1));

      // Bot limb relative to pivot [0, -0.10, 0.016]
      const gBot = new THREE.CylinderGeometry(s.r1, s.r0, len, 6, 1);
      gBot.rotateX(-angle);
      gBot.translate(0, -((s.y0 + s.y1) * 0.5) - (-0.10), (s.z0 + s.z1) * 0.5 - 0.016);
      botParts.push(prepPart(gBot, isHigh ? st.blade : st.wood, isHigh, 1));
    }

    // Tips
    const topTip = makeOcta(0.020, 0.85, 1.4, 1.0, 0, 0.595 - 0.10, -0.128 - 0.016);
    topParts.push(prepPart(topTip, (grade === 'S' || grade === 'S+') ? st.gem : st.trim, true, 0));

    const botTip = makeOcta(0.020, 0.85, 1.4, 1.0, 0, -0.595 - (-0.10), -0.128 - 0.016);
    botParts.push(prepPart(botTip, (grade === 'S' || grade === 'S+') ? st.gem : st.trim, true, 0));

    if (grade === 'S+') {
      topParts.push(prepPart(makeBox(0.008, 0.14, 0.05, 0, 0.52 - 0.10, -0.10 - 0.016), st.gem, true, 0));
      botParts.push(prepPart(makeBox(0.008, 0.14, 0.05, 0, -0.52 - (-0.10), -0.10 - 0.016), st.gem, true, 0));
    }

    const riserGeom = mergeGeometries(riserParts, false);
    const limbTopGeom = mergeGeometries(topParts, false);
    const limbBotGeom = mergeGeometries(botParts, false);

    // Merge static version into bodyParts for bounds & fallback
    bodyParts.push(...riserParts);
    for (const sign of [1, -1]) {
      for (const s of segs) {
        const dy = (s.y1 - s.y0) * sign;
        const dz = s.z1 - s.z0;
        const len = Math.hypot(dy, dz);
        const angle = Math.atan2(dz, dy);
        const g = new THREE.CylinderGeometry(s.r1, s.r0, len, 6, 1);
        g.rotateX(angle);
        g.translate(0, (s.y0 + s.y1) * 0.5 * sign, (s.z0 + s.z1) * 0.5);
        bodyParts.push(prepPart(g, isHigh ? st.blade : st.wood, isHigh, 1));
      }
      bodyParts.push(prepPart(makeOcta(0.020, 0.85, 1.4, 1.0, 0, 0.595 * sign, -0.128), st.trim, true, 0));
    }

    specialGeom = { riserGeom, limbTopGeom, limbBotGeom };

    runeStrips.push(
      { sx: 0.036, sy: 0.18, sz: 0.015, x: 0, y: 0.25, z: 0.03 },
      { sx: 0.036, sy: 0.18, sz: 0.015, x: 0, y: -0.25, z: 0.03 }
    );
    anchors = {
      grip: [0, 0, 0], pommel: [0, 0.60, -0.13], tip: [0, -0.60, -0.13],
      nock: [0, 0, -0.13], arrowShelf: [0.015, 0.02, 0.02],
      edgeBase: [0, 0.58, 0.03], edgeTip: [0, -0.58, 0.03], hit: [0, 0, 0.05]
    };
  } else if (kind === 'staff') {
    // Total length 1.70m: bottom butt +0.79, grip [0,0,0] (46% from bottom), crown [-0.78..-1.02], orb at [-0.91, 0.03] (up and forward)
    bodyParts.push(prepPart(makeCyl(0.019, 0.017, 1.62, 6, 0, -0.06, 0.01), st.wood, false, 0));
    bodyParts.push(prepPart(makeCyl(0.023, 0.023, 0.32, 6, 0, 0, 0), st.grip, false, 0));
    bodyParts.push(prepPart(makeOcta(0.029, 1, 1.4, 1, 0, 0.79, -0.02), st.guard, true, 0));
    // Crown base collar & wide bridge tilted slightly forward (+Z)
    bodyParts.push(prepPart(makeCyl(0.036, 0.022, 0.10, 6, 0, -0.78, 0.03), st.guard, true, 0));
    const prongOffset = isHigh ? 0.088 : 0.072;
    bodyParts.push(prepPart(makeBox(0.030, 0.036, prongOffset * 1.7, 0, -0.80, 0.03), st.guard, true, 0));

    for (const dir of [1, -1]) {
      const p1 = makeBox(0.024, 0.16, 0.026, 0, 0, 0);
      p1.rotateX(dir * -0.15);
      p1.translate(0, -0.86, 0.03 + dir * prongOffset * 0.68);
      bodyParts.push(prepPart(p1, st.guard, true, 1));

      const p2 = makeBox(0.020, 0.13, 0.024, 0, 0, 0);
      p2.rotateX(dir * 0.25);
      p2.translate(0, -0.97, 0.04 + dir * prongOffset * 0.52);
      bodyParts.push(prepPart(p2, st.trim, true, 1));
    }
    if (isHigh) {
      bodyParts.push(prepPart(makeBox(0.022, 0.12, 0.19, 0, -0.81, 0.03), st.trim, true, 0));
    }
    specialGeom = prepPart(makeOcta(0.058, 1, 1.15, 1, 0, 0, 0), st.gem, true, 0);

    runeStrips.push(
      { sx: 0.042, sy: 0.04, sz: 0.042, x: 0, y: -0.78, z: 0.03 },
      { sx: 0.026, sy: 0.25, sz: 0.026, x: 0, y: -0.55, z: 0.02 }
    );
    anchors = {
      grip: [0, 0, 0],
      staffGrip: [0, 0, 0], // exactly 46% (~40%) from bottom pommel
      pommel: [0, 0.79, -0.02],
      tip: [0, -1.02, 0.05],
      edgeBase: [0, -0.78, 0.05],
      edgeTip: [0, -1.02, 0.05],
      hit: [0, -0.91, 0.03]
    };
  } else if (kind === 'mace') {
    // Morning star 0.90m: pommel +0.18, haft [+0.17..-0.61] embedded directly into spiked ball at -0.64
    bodyParts.push(prepPart(makeCyl(0.021, 0.018, 0.78, 6, 0, -0.22, 0), st.wood, false, 0));
    bodyParts.push(prepPart(makeCyl(0.024, 0.024, 0.24, 6, 0, 0.0, 0), st.grip, false, 0));
    bodyParts.push(prepPart(makeOcta(0.031, 1, 1.1, 1, 0, 0.17, 0), st.guard, true, 0));
    bodyParts.push(prepPart(makeCyl(0.036, 0.024, 0.09, 6, 0, -0.55, 0), st.guard, true, 0));

    // Morning star ball + 8 spikes overlapping inside the ball (radius 0.082, spike bases at 0.055)
    const headParts = [];
    headParts.push(prepPart(new THREE.IcosahedronGeometry(0.082, 0), st.blade, true, 1, st.edge));
    const spikeDirs = [
      [0, -1, 0], [0, 0, 1], [0, 0, -1], [1, 0, 0], [-1, 0, 0],
      [0, -0.707, 0.707], [0, -0.707, -0.707], [0.707, -0.707, 0]
    ];
    const up = new THREE.Vector3(0, 1, 0);
    for (const d of spikeDirs) {
      const v = new THREE.Vector3(d[0], d[1], d[2]).normalize();
      const sp = new THREE.ConeGeometry(0.025, 0.085, 4);
      sp.translate(0, 0.042, 0);
      const q = new THREE.Quaternion().setFromUnitVectors(up, v);
      sp.applyMatrix4(new THREE.Matrix4().makeRotationFromQuaternion(q));
      sp.translate(v.x * 0.055, v.y * 0.055, v.z * 0.055);
      headParts.push(prepPart(sp, st.trim, true, 1, st.edge));
    }
    specialGeom = mergeGeometries(headParts, false);

    runeStrips.push(
      { sx: 0.12, sy: 0.12, sz: 0.03, x: 0, y: -0.64, z: 0 },
      { sx: 0.03, sy: 0.12, sz: 0.12, x: 0, y: -0.64, z: 0 }
    );
    anchors = {
      grip: [0, 0, 0], pommel: [0, 0.18, 0], tip: [0, -0.72, 0],
      edgeBase: [0, -0.55, 0.09], edgeTip: [0, -0.72, 0.09], hit: [0, -0.64, 0]
    };
  } else if (kind === 'club') {
    // Tapered wooden club 0.80m: pommel +0.15, thick head to -0.65 with iron studs embedded inside wood
    bodyParts.push(prepPart(makeCyl(0.056, 0.020, 0.78, 7, 0, -0.23, 0), st.wood, false, 1));
    bodyParts.push(prepPart(makeCyl(0.024, 0.022, 0.22, 6, 0, 0.0, 0), st.grip, false, 0));
    bodyParts.push(prepPart(makeOcta(0.028, 1, 0.95, 1, 0, 0.15, 0), st.guard, true, 0));
    // End cap & iron band
    bodyParts.push(prepPart(makeOcta(0.052, 1, 0.5, 1, 0, -0.62, 0), st.wood, false, 1));
    bodyParts.push(prepPart(makeCyl(0.053, 0.049, 0.045, 7, 0, -0.48, 0), st.guard, true, 0));

    // Studs embedded deep into the club radius (~0.042 from center so no gaps)
    const studOffsets = [
      [0, -0.38, 0.040], [0, -0.38, -0.040],
      [0.043, -0.48, 0], [-0.043, -0.48, 0],
      [0, -0.55, 0.046], [0, -0.55, -0.046]
    ];
    for (const so of studOffsets) {
      bodyParts.push(prepPart(makeOcta(0.022, 1, 1, 1, so[0], so[1], so[2]), st.blade, true, 1, st.edge));
    }

    runeStrips.push(
      { sx: 0.09, sy: 0.26, sz: 0.02, x: 0, y: -0.46, z: 0 },
      { sx: 0.02, sy: 0.26, sz: 0.09, x: 0, y: -0.46, z: 0 }
    );
    anchors = {
      grip: [0, 0, 0], pommel: [0, 0.15, 0], tip: [0, -0.65, 0],
      edgeBase: [0, -0.30, 0.06], edgeTip: [0, -0.63, 0.06], hit: [0, -0.48, 0]
    };
  } else if (kind === 'pickaxe') {
    // Miner's pickaxe 0.90m: pommel +0.20, shaft [+0.19..-0.67], eye block at -0.62, connected curved picks
    bodyParts.push(prepPart(makeCyl(0.022, 0.019, 0.86, 6, 0, -0.24, 0), st.wood, false, 0));
    bodyParts.push(prepPart(makeCyl(0.025, 0.025, 0.24, 6, 0, 0.0, 0), st.grip, false, 0));
    bodyParts.push(prepPart(makeOcta(0.027, 1, 0.9, 1, 0, 0.19, 0), st.guard, true, 0));
    // Heavy eye sleeve block & top cap overlapping shaft
    bodyParts.push(prepPart(makeBox(0.048, 0.085, 0.076, 0, -0.62, 0), st.guard, true, 0));
    bodyParts.push(prepPart(makeCyl(0.016, 0.025, 0.06, 6, 0, -0.68, 0), st.trim, true, 0));
    // Connected one-piece curved tapered pick spikes starting inside the eye block
    bodyParts.push(prepPart(makeCurvedPickArm(1), st.blade, true, 1, st.edge));
    bodyParts.push(prepPart(makeCurvedPickArm(-1), st.blade, true, 1, st.edge));

    runeStrips.push(
      { sx: 0.036, sy: 0.022, sz: 0.34, x: 0, y: -0.61, z: 0 },
      { sx: 0.032, sy: 0.22, sz: 0.022, x: 0, y: -0.48, z: 0 }
    );
    anchors = {
      grip: [0, 0, 0], pommel: [0, 0.20, 0], tip: [0, -0.70, 0],
      edgeBase: [0, -0.568, 0.265], edgeTip: [0, -0.62, 0.14], hit: [0, -0.59, 0.22]
    };
  }

  const bodyGeom = mergeGeometries(bodyParts, false);
  const runeGeom = buildRuneStrips(runeStrips);
  const data = { bodyGeom, runeGeom, specialGeom, anchors };
  _geomCache.set(cacheKey, data);
  return data;
}

export function getShieldGeometryData(kind, grade) {
  const cacheKey = `sgeom_${kind}_${grade}`;
  if (_geomCache.has(cacheKey)) return _geomCache.get(cacheKey);

  const st = GRADE_STYLES[grade] || GRADE_STYLES['E'];
  const isHigh = grade === 'A' || grade === 'S' || grade === 'S+';
  const bodyParts = [];
  const runeStrips = [];

  // Build shield centered at [0,0,0] with face normal +Z, then shift +0.06 along face normal and orient for handL
  // Interior strap bridges from origin [0,0,0] into the back of the shield plate at z = 0.05
  bodyParts.push(prepPart(makeBox(0.11, 0.035, 0.055, 0, 0, 0.025), st.grip, false, 0));

  if (kind === 'woodenRound') {
    // Required size: diameter 0.55m (radius 0.275m), center at z = 0.06
    const disc = new THREE.CylinderGeometry(0.255, 0.265, 0.028, 12, 1);
    disc.rotateX(Math.PI * 0.5);
    disc.translate(0, 0, 0.058);
    bodyParts.push(prepPart(disc, st.wood, false, 1));

    // Overlapping 12-segment iron rim (outer diameter 0.55m)
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const seg = makeBox(0.15, 0.034, 0.036, 0, 0, 0);
      seg.rotateZ(a);
      seg.translate(Math.sin(a) * 0.260, -Math.cos(a) * 0.260, 0.060);
      bodyParts.push(prepPart(seg, st.guard, true, 1, st.edge));
    }
    // Center boss deeply seated into the wooden disc
    bodyParts.push(prepPart(makeOcta(0.068, 1, 1, 0.65, 0, 0, 0.072), st.blade, true, 0, st.edge));
    if (isHigh) {
      bodyParts.push(prepPart(makeBox(0.48, 0.032, 0.018, 0, 0, 0.070), st.trim, true, 0));
      bodyParts.push(prepPart(makeBox(0.032, 0.48, 0.018, 0, 0, 0.070), st.trim, true, 0));
    }
    runeStrips.push(
      { sx: 0.36, sy: 0.020, sz: 0.014, x: 0, y: 0, z: 0.076 },
      { sx: 0.020, sy: 0.36, sz: 0.014, x: 0, y: 0, z: 0.076 }
    );
  } else if (kind === 'plank') {
    // Required size: 0.50m wide by 0.60m tall, overlapping planks with slight bend
    const plankX = [-0.18, -0.06, 0.06, 0.18];
    for (let i = 0; i < 4; i++) {
      const px = plankX[i];
      const bz = 0.062 - Math.abs(px) * 0.05;
      const p = makeBox(0.132, 0.58 + (i % 2) * 0.02, 0.028, px, 0, bz);
      p.rotateY(px * -0.18);
      bodyParts.push(prepPart(p, st.wood, false, 1));
    }
    // Iron cross-bars seated flush across the planks
    bodyParts.push(prepPart(makeBox(0.49, 0.048, 0.036, 0, 0.17, 0.060), st.guard, true, 0));
    bodyParts.push(prepPart(makeBox(0.49, 0.048, 0.036, 0, -0.17, 0.060), st.guard, true, 0));
    // Embedded spikes along the bars and edges
    const spikes = [
      [-0.24, 0.17, 0.056], [0.24, 0.17, 0.056],
      [-0.24, -0.17, 0.056], [0.24, -0.17, 0.056],
      [-0.12, 0.17, 0.075], [0.12, 0.17, 0.075],
      [-0.12, -0.17, 0.075], [0.12, -0.17, 0.075]
    ];
    for (const sp of spikes) {
      bodyParts.push(prepPart(makeOcta(0.026, 0.8, 0.8, 1.5, sp[0], sp[1], sp[2]), st.blade, true, 1, st.edge));
    }
    runeStrips.push(
      { sx: 0.42, sy: 0.020, sz: 0.014, x: 0, y: 0.17, z: 0.078 },
      { sx: 0.42, sy: 0.020, sz: 0.014, x: 0, y: -0.17, z: 0.078 }
    );
  } else if (kind === 'ironRound') {
    // Required size: diameter 0.55m (radius 0.275m), domed iron shield with rivets
    const outer = new THREE.CylinderGeometry(0.255, 0.275, 0.030, 12, 1);
    outer.rotateX(Math.PI * 0.5);
    outer.translate(0, 0, 0.056);
    bodyParts.push(prepPart(outer, st.blade, true, 1, st.edge));

    const innerDome = new THREE.CylinderGeometry(0.15, 0.255, 0.028, 12, 1);
    innerDome.rotateX(Math.PI * 0.5);
    innerDome.translate(0, 0, 0.072);
    bodyParts.push(prepPart(innerDome, st.guard, true, 0));

    bodyParts.push(prepPart(makeOcta(0.068, 1, 1, 0.65, 0, 0, 0.088), st.trim, true, 0, st.edge));

    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      bodyParts.push(prepPart(
        makeOcta(0.018, 1, 1, 0.8, Math.cos(a) * 0.22, Math.sin(a) * 0.22, 0.070),
        st.trim, true, 0
      ));
    }
    runeStrips.push(
      { sx: 0.36, sy: 0.022, sz: 0.015, x: 0, y: 0, z: 0.086 },
      { sx: 0.022, sy: 0.36, sz: 0.015, x: 0, y: 0, z: 0.086 }
    );
  } else if (kind === 'kite') {
    // Required size: 0.50m wide by 0.85m tall (Y from +0.425 down to -0.425)
    // Upper curved wings overlapping seamlessly at X=0
    const leftWing = makeBox(0.26, 0.46, 0.030, 0, 0, 0);
    leftWing.rotateY(0.16);
    leftWing.translate(-0.12, 0.19, 0.058);
    bodyParts.push(prepPart(leftWing, st.blade, true, 1, st.edge));

    const rightWing = makeBox(0.26, 0.46, 0.030, 0, 0, 0);
    rightWing.rotateY(-0.16);
    rightWing.translate(0.12, 0.19, 0.058);
    bodyParts.push(prepPart(rightWing, st.blade, true, 1, st.edge));

    // Pointed lower half overlapping upper wings from Y=+0.02 down to Y=-0.425
    const lowerCone = new THREE.ConeGeometry(0.35, 0.45, 4);
    lowerCone.rotateY(Math.PI * 0.25);
    lowerCone.rotateX(Math.PI);
    lowerCone.scale(1.0, 1.0, 0.14);
    lowerCone.translate(0, -0.20, 0.060);
    bodyParts.push(prepPart(lowerCone, st.blade, true, 1, st.edge));

    // Raised metallic Cross emblem seated into the front plate
    bodyParts.push(prepPart(makeBox(0.058, 0.72, 0.026, 0, 0.0, 0.074), st.trim, true, 0));
    bodyParts.push(prepPart(makeBox(0.38, 0.058, 0.026, 0, 0.15, 0.072), st.trim, true, 0));
    if (isHigh) {
      bodyParts.push(prepPart(makeOcta(0.038, 1, 1.2, 0.7, 0, 0.15, 0.088), st.gem, true, 0));
    }

    runeStrips.push(
      { sx: 0.026, sy: 0.64, sz: 0.014, x: 0, y: 0.0, z: 0.086 },
      { sx: 0.34, sy: 0.026, sz: 0.014, x: 0, y: 0.15, z: 0.084 }
    );
  }

  const bodyGeom = mergeGeometries(bodyParts, false);
  const runeGeom = buildRuneStrips(runeStrips);

  // Rotate shield geometries so when attached to `handL` in block/combat poses:
  // the shield face points forward (+X in handL local space -> away from forearm/chest)
  // and the vertical rim aligns upright perpendicular to the forearm (-Y).
  const shieldOrient = new THREE.Matrix4().makeBasis(
    new THREE.Vector3(0, 0, 1),  // shield local X (width) -> socket +Z
    new THREE.Vector3(0, 1, 0),  // shield local Y (height) -> socket +Y
    new THREE.Vector3(1, 0, 0)   // shield face normal (+Z) -> socket +X (out of outer forearm)
  );
  // Handedness-preserving proper rotation: R_y(PI/2) * R_z(-PI/2) puts face normal along +X
  // and shield vertical top along +Z (which points up when forearm is horizontal in block pose)
  const blockRot = new THREE.Matrix4().makeRotationFromEuler(
    new THREE.Euler(0, Math.PI * 0.5, -Math.PI * 0.5, 'YXZ')
  );
  bodyGeom.applyMatrix4(blockRot);
  runeGeom.applyMatrix4(blockRot);

  const anchors = {
    grip: [0, 0, 0], pommel: [0, 0, 0.28], tip: [0, 0, -0.28],
    edgeBase: [0.06, 0, 0.25], edgeTip: [0.06, 0, -0.25], hit: [0.07, 0, 0]
  };
  const data = { bodyGeom, runeGeom, specialGeom: null, anchors };
  _geomCache.set(cacheKey, data);
  return data;
}

export function buildArrowGeometry(grade = 'E') {
  const key = `arrow_${grade}`;
  if (_geomCache.has(key)) return _geomCache.get(key);
  const st = GRADE_STYLES[grade] || GRADE_STYLES['E'];
  const parts = [];

  // 1. Shaft: Cylinder length 0.72m, radius 0.005m, along +Z centered at [0, 0, 0.36]
  const shaft = new THREE.CylinderGeometry(0.005, 0.005, 0.72, 6, 1);
  shaft.rotateX(Math.PI * 0.5);
  shaft.translate(0, 0, 0.36);
  parts.push(prepPart(shaft, st.wood, false, 0));

  // 2. Broadhead: Diamond razor head (Cone radius 0.014m, length 0.06m, 4 segments) at z = 0.75
  const head = new THREE.ConeGeometry(0.014, 0.06, 4);
  head.rotateX(Math.PI * 0.5);
  head.translate(0, 0, 0.75);
  parts.push(prepPart(head, st.blade, true, 0, st.edge));

  // 3. 3 Radial Fletching Vanes (0.09m long, 0.018m wide, 0.002m thick) at z = 0.06m, spaced 120 deg apart
  for (let i = 0; i < 3; i++) {
    const angle = (i * Math.PI * 2) / 3;
    const vane = makeBox(0.002, 0.018, 0.09, 0, 0.009, 0.06);
    vane.rotateZ(angle);
    parts.push(prepPart(vane, st.rune, false, 0));
  }

  // 4. Carved wooden nock groove at [0, 0, 0]
  const nock = new THREE.CylinderGeometry(0.006, 0.006, 0.02, 6, 1);
  nock.rotateX(Math.PI * 0.5);
  nock.translate(0, 0, 0.01);
  parts.push(prepPart(nock, st.wood, false, 0));

  const geom = mergeGeometries(parts, false);
  _geomCache.set(key, geom);
  return geom;
}
