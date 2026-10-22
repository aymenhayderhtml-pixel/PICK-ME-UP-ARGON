// src/enemies/models/Geometries.js
// Merged geometry builders and geometry caching per type, weapon variant and armor tier.
import * as THREE from 'three';
import { CACHES, getGeom, paintGeom, mergeGeoms, placeGeom, buildInvertedHullGeom, buildTaperedLimbGeom, buildTorsoGeom, buildWedgeGeom, buildCurvedBladeGeom, buildLatheClubGeom, buildPlankShieldGeom, buildSickleKnifeGeom, buildCleaverGeom } from '../shared.js';

// Build and cache merged geometries per type + weapon + levelTier so 25 enemies share exact buffers
export function getTypeGeometries(type, arch, wVariant, armorTier) {
  const cacheKey = `rigGeoms_${type}_${wVariant}_${armorTier}`;
  if (CACHES.geoms.has(cacheKey)) return CACHES.geoms.get(cacheKey);

  const legL = arch.legLen;
  const torsoH = arch.torsoH;
  const armL = arch.armLen;
  const hScale = arch.headScale;
  const shldrW = arch.torsoWTop * 1.12;

  const skinWhite = 0xffffff; // Driven by shared/tinted skinMat.color
  const darkLeather = 0x36281e;
  const tanFur = 0x8c7248;
  const whiteTuft = 0xd2c8b0;
  const darkIron = 0x3b3e45;
  const boneWhite = 0xe5dec9;
  const hairBlack = 0x16181c;
  const goldHex = 0xd4af37;
  const tongueRed = 0xc42424;
  const robeHex = 0x2b2523;
  const woodHex = 0x5c3d24;

  // 1. HIPS (Loincloth + tufts + shaman skirt + chief skull belt)
  const hipsParts = [];
  const loinBase = new THREE.CylinderGeometry(arch.torsoWBot * 1.05, arch.torsoWBot * 1.28, legL * 0.72, 8, 1, false);
  hipsParts.push(placeGeom(loinBase, tanFur, 0, -legL * 0.22, 0));

  // White/tan fur tufts around waist
  const tuftWedge = buildWedgeGeom(arch.torsoWBot * 0.28, legL * 0.42, arch.torsoWBot * 0.18, 0.02);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    hipsParts.push(
      placeGeom(
        tuftWedge,
        i % 2 === 0 ? whiteTuft : tanFur,
        Math.sin(a) * arch.torsoWBot * 1.02,
        -legL * 0.35,
        Math.cos(a) * arch.torsoWBot * 0.82,
        Math.PI,
        a,
        0
      )
    );
  }
  if (arch.hasRobe) {
    const skirt = new THREE.CylinderGeometry(arch.torsoWBot * 1.08, arch.torsoWBot * 1.75, legL * 1.55, 8, 1, true);
    hipsParts.push(placeGeom(skirt, robeHex, 0, -legL * 0.75, 0));
  }
  if (arch.hasSkullBelt) {
    const skG = new THREE.IcosahedronGeometry(0.088, 1);
    const jawB = new THREE.BoxGeometry(0.075, 0.05, 0.07);
    for (let i = -2; i <= 2; i++) {
      const ang = i * 0.42;
      const sx = Math.sin(ang) * arch.torsoWBot * 1.08;
      const sz = Math.cos(ang) * arch.torsoWBot * 0.78;
      hipsParts.push(placeGeom(skG, boneWhite, sx, 0.02, sz));
      hipsParts.push(placeGeom(jawB, boneWhite, sx, -0.04, sz + 0.03));
    }
  }
  const hipsGeom = mergeGeoms(hipsParts);

  // 2. TORSO + CHEST (Lean muscular ribcage + chest strap / bone necklace / spiked collar / quiver / banner pole)
  const torsoSkinParts = [
    placeGeom(
      buildTorsoGeom(arch.torsoWTop, arch.torsoWBot, torsoH, arch.torsoWTop * 0.68, arch.torsoWBot * 0.65, 0.04),
      skinWhite,
      0, 0, 0, 0, 0, 0, 1, 1, 1, 0.82
    )
  ];
  // Sculpted rib ridges on goblin/chief chest
  const ribG = new THREE.CylinderGeometry(0.014, 0.014, arch.torsoWTop * 0.85, 5);
  for (let r = 0; r < 3; r++) {
    const ry = torsoH * (0.28 + r * 0.14);
    const rz = arch.torsoWTop * 0.56;
    torsoSkinParts.push(placeGeom(ribG, 0xd8d8d8, arch.torsoWTop * 0.25, ry, rz, 0, 0.35, Math.PI * 0.42));
    torsoSkinParts.push(placeGeom(ribG, 0xd8d8d8, -arch.torsoWTop * 0.25, ry, rz, 0, -0.35, -Math.PI * 0.42));
  }
  // Pectoral slabs
  const pecG = new THREE.BoxGeometry(arch.torsoWTop * 0.75, torsoH * 0.24, arch.torsoWTop * 0.45);
  torsoSkinParts.push(placeGeom(pecG, skinWhite, arch.torsoWTop * 0.36, torsoH * 0.74, arch.torsoWTop * 0.42, 0.15, 0.18, -0.08));
  torsoSkinParts.push(placeGeom(pecG, skinWhite, -arch.torsoWTop * 0.36, torsoH * 0.74, arch.torsoWTop * 0.42, 0.15, -0.18, 0.08));

  const torsoSkinGeom = mergeGeoms(torsoSkinParts);

  const chestGearParts = [];
  if (!arch.hasRobe && !arch.isBoss) {
    const strap = new THREE.TorusGeometry(arch.torsoWTop * 0.82, 0.022, 5, 10);
    chestGearParts.push(placeGeom(strap, darkLeather, 0, torsoH * 0.62, 0.02, 0.5, 0.6, 0.7));
    const buckle = new THREE.BoxGeometry(0.055, 0.055, 0.03);
    chestGearParts.push(placeGeom(buckle, goldHex, 0, torsoH * 0.62, arch.torsoWTop * 0.68));
  }
  if (arch.hasChestPlate) {
    const plate = new THREE.BoxGeometry(arch.torsoWTop * 0.95, torsoH * 0.70, 0.08);
    chestGearParts.push(placeGeom(plate, darkIron, 0, torsoH * 0.55, arch.torsoWTop * 0.42));
  }
  if (arch.hasBoneNecklace) {
    const neckRing = new THREE.TorusGeometry(arch.torsoWTop * 0.66, 0.018, 5, 8);
    chestGearParts.push(placeGeom(neckRing, darkLeather, 0, torsoH * 0.88, 0.04, 1.25, 0, 0));
    const fang = buildWedgeGeom(0.022, 0.085, 0.022, 0.01);
    for (let i = -2; i <= 2; i++) {
      chestGearParts.push(
        placeGeom(fang, boneWhite, i * 0.045, torsoH * 0.78, arch.torsoWTop * 0.66, Math.PI * 0.88, 0, i * 0.12)
      );
    }
  }
  if (arch.hasSpikedCollar) {
    const col = new THREE.TorusGeometry(arch.torsoWTop * 0.56, 0.048, 6, 10);
    chestGearParts.push(placeGeom(col, darkIron, 0, torsoH * 0.92, 0.02, 1.45, 0, 0));
    const cSpike = new THREE.ConeGeometry(0.028, 0.11, 4);
    for (let i = -2; i <= 2; i++) {
      const a = i * 0.55;
      chestGearParts.push(
        placeGeom(cSpike, boneWhite, Math.sin(a) * arch.torsoWTop * 0.6, torsoH * 0.95, Math.cos(a) * arch.torsoWTop * 0.55, 0.7, a, 0)
      );
    }
  }
  if (arch.hasQuiver) {
    const quiv = new THREE.CylinderGeometry(0.055, 0.045, 0.38, 6);
    chestGearParts.push(placeGeom(quiv, darkLeather, -0.08, torsoH * 0.70, -0.15, 0, 0, -0.38));
    const shaft = new THREE.CylinderGeometry(0.007, 0.007, 0.24, 4);
    const fletch = new THREE.BoxGeometry(0.028, 0.06, 0.008);
    for (let i = 0; i < 3; i++) {
      const ox = -0.13 + i * 0.025;
      const oy = torsoH * 0.90 + (i % 2) * 0.03;
      chestGearParts.push(placeGeom(shaft, woodHex, ox, oy, -0.15, 0.1 * i, 0, -0.35));
      chestGearParts.push(placeGeom(fletch, whiteTuft, ox - 0.03, oy + 0.08, -0.15, 0, 0, -0.35));
    }
  }
  if (arch.hasBanner) {
    const pole = new THREE.CylinderGeometry(0.018, 0.02, torsoH * 1.65, 5);
    const cross = new THREE.CylinderGeometry(0.015, 0.015, 0.38, 5);
    chestGearParts.push(placeGeom(pole, woodHex, 0, torsoH * 1.15, -arch.torsoWTop * 0.58));
    chestGearParts.push(placeGeom(cross, woodHex, 0, torsoH * 1.92, -arch.torsoWTop * 0.58, 0, 0, Math.PI * 0.5));
  }
  const chestGearGeom = chestGearParts.length > 0 ? mergeGeoms(chestGearParts) : null;

  // 3. HEAD & EXPRESSIVE GOBLIN FACE (Cranium + heavy brow ridges + flat wide nose + pointed ears + gold ring + upper fangs + 10 spiky hair wedges / hood / horned helm)
  const headSkinParts = [];
  const cranium = new THREE.IcosahedronGeometry(hScale * 0.50, 1);
  cranium.scale(1.16, 0.92, 1.08);
  headSkinParts.push(placeGeom(cranium, skinWhite, 0, hScale * 0.18, 0.02));

  // Heavy angry V-shaped brow ridges over the eyes
  const brow = new THREE.BoxGeometry(hScale * 0.38, hScale * 0.095, hScale * 0.18);
  headSkinParts.push(placeGeom(brow, skinWhite, hScale * 0.19, hScale * 0.25, hScale * 0.48, 0.15, -0.22, -0.32));
  headSkinParts.push(placeGeom(brow, skinWhite, -hScale * 0.19, hScale * 0.25, hScale * 0.48, 0.15, 0.22, 0.32));

  // Wide flat hooked goblin nose + cheekbones
  const nose = buildWedgeGeom(hScale * 0.15, hScale * 0.24, hScale * 0.16, 0.02);
  headSkinParts.push(placeGeom(nose, skinWhite, 0, hScale * 0.04, hScale * 0.54, Math.PI * 0.62, 0, 0));

  const cheek = new THREE.BoxGeometry(hScale * 0.22, hScale * 0.16, hScale * 0.24);
  headSkinParts.push(placeGeom(cheek, skinWhite, hScale * 0.34, hScale * 0.05, hScale * 0.34, 0, 0.3, 0));
  headSkinParts.push(placeGeom(cheek, skinWhite, -hScale * 0.34, hScale * 0.05, hScale * 0.34, 0, -0.3, 0));

  // Big pointed swept-back goblin ears baked into head skin
  const earWedge = buildWedgeGeom(hScale * 0.17, hScale * 0.88, hScale * 0.11, -0.06);
  headSkinParts.push(
    placeGeom(earWedge, skinWhite, hScale * 0.46, hScale * 0.14, -hScale * 0.02, -0.28, -0.25, -1.28)
  );
  headSkinParts.push(
    placeGeom(earWedge, skinWhite, -hScale * 0.46, hScale * 0.14, -hScale * 0.02, -0.28, 0.25, 1.28)
  );
  const headSkinGeom = mergeGeoms(headSkinParts);

  // Head non-skin details (Upper row of sharp white fangs + gold ear ring + 10 spiky hair wedges or hood/helmet)
  const headDetailParts = [];
  // Upper row of 5 sharp white fangs hanging from upper lip
  const uFang = new THREE.ConeGeometry(hScale * 0.042, hScale * 0.13, 4);
  for (let i = -2; i <= 2; i++) {
    headDetailParts.push(
      placeGeom(
        uFang,
        boneWhite,
        i * hScale * 0.11,
        -hScale * 0.04,
        hScale * 0.47 - Math.abs(i) * hScale * 0.03,
        Math.PI,
        0,
        0
      )
    );
  }
  // Dark inner mouth cavity behind teeth so opened mouth reads clearly at 10m
  const mouthCav = new THREE.BoxGeometry(hScale * 0.52, hScale * 0.18, hScale * 0.25);
  headDetailParts.push(placeGeom(mouthCav, 0x24080c, 0, -hScale * 0.04, hScale * 0.32));

  if (arch.hasEarring) {
    const ring = new THREE.TorusGeometry(hScale * 0.095, hScale * 0.025, 5, 8);
    headDetailParts.push(placeGeom(ring, goldHex, hScale * 0.78, hScale * 0.02, -hScale * 0.06, 0.3, 0.4, 0));
  }

  if (arch.hasHair) {
    // 10 layered black spiky wedges swept back from forehead and down the neck
    const spike = buildWedgeGeom(hScale * 0.18, hScale * 0.68, hScale * 0.14, -0.08);
    const hairTransforms = [
      // Crown row swept sharply back
      [0, 0.36, 0.12, -1.25, 0, 0, 1.1],
      [0.18, 0.34, 0.08, -1.22, 0.28, -0.32, 1.0],
      [-0.18, 0.34, 0.08, -1.22, -0.28, 0.32, 1.0],
      [0.32, 0.26, 0.0, -1.15, 0.48, -0.62, 0.9],
      [-0.32, 0.26, 0.0, -1.15, -0.48, 0.62, 0.9],
      // Middle wild layer
      [0, 0.30, -0.14, -1.58, 0, 0, 1.2],
      [0.22, 0.26, -0.16, -1.52, 0.35, -0.38, 1.05],
      [-0.22, 0.26, -0.16, -1.52, -0.35, 0.38, 1.05],
      // Nape/neck layer pointing down-back
      [0.12, 0.12, -0.26, -1.95, 0.18, -0.2, 0.95],
      [-0.12, 0.12, -0.26, -1.95, -0.18, 0.2, 0.95]
    ];
    for (const [hx, hy, hz, rx, ry, rz, sc] of hairTransforms) {
      headDetailParts.push(
        placeGeom(spike, hairBlack, hx * hScale, hy * hScale, hz * hScale, rx, ry, rz, sc, sc, sc, 0.75)
      );
    }
  }

  if (arch.hasHood || arch.hasPointedHood) {
    const hoodH = arch.hasPointedHood ? hScale * 1.48 : hScale * 1.08;
    const hood = new THREE.ConeGeometry(hScale * 0.72, hoodH, 7, 1, true);
    headDetailParts.push(
      placeGeom(hood, arch.hasPointedHood ? robeHex : darkLeather, 0, hoodH * 0.38, -0.02, 0.22, 0, 0)
    );
  }

  if (arch.hasHelm) {
    const helm = new THREE.CylinderGeometry(hScale * 0.56, hScale * 0.60, hScale * 0.54, 8, 1);
    const noseGuard = new THREE.BoxGeometry(hScale * 0.12, hScale * 0.38, hScale * 0.08);
    const horn = buildWedgeGeom(hScale * 0.16, hScale * 0.78, hScale * 0.16, 0.16);
    headDetailParts.push(placeGeom(helm, darkIron, 0, hScale * 0.34, 0));
    headDetailParts.push(placeGeom(noseGuard, darkIron, 0, hScale * 0.18, hScale * 0.56));
    headDetailParts.push(placeGeom(horn, darkIron, hScale * 0.46, hScale * 0.42, 0, 0, 0, -0.88));
    headDetailParts.push(placeGeom(horn, darkIron, -hScale * 0.46, hScale * 0.42, 0, 0, 0, 0.88));
  }
  const headDetailGeom = mergeGeoms(headDetailParts);

  // Glowing narrow slanted eyes merged into 1 geometry
  const eyeBox = new THREE.BoxGeometry(hScale * 0.23, hScale * 0.075, hScale * 0.09);
  const eyesGeom = mergeGeoms([
    placeGeom(eyeBox, 0xff2a2a, hScale * 0.20, hScale * 0.15, hScale * 0.49, 0, 0.18, -0.26, 1, 1, 1, 1.0),
    placeGeom(eyeBox, 0xff2a2a, -hScale * 0.20, hScale * 0.15, hScale * 0.49, 0, -0.18, 0.26, 1, 1, 1, 1.0)
  ]);

  // 4. JAW (Lower jaw + 2 large curved lower tusks + lower fang row + long red swaying tongue)
  const jawParts = [];
  const jawBox = new THREE.BoxGeometry(hScale * 0.68, hScale * 0.26, hScale * 0.56);
  jawParts.push(placeGeom(jawBox, arch.skinHex, 0, -hScale * 0.07, hScale * 0.14));

  // Two prominent curved lower tusks rising from the jaw
  const tuskLen = arch.isBoss ? hScale * 0.48 : hScale * 0.34;
  const tuskG = buildWedgeGeom(hScale * 0.085, tuskLen, hScale * 0.085, -0.04);
  jawParts.push(placeGeom(tuskG, boneWhite, hScale * 0.26, 0.0, hScale * 0.36, 0.15, 0, -0.08));
  jawParts.push(placeGeom(tuskG, boneWhite, -hScale * 0.26, 0.0, hScale * 0.36, 0.15, 0, 0.08));

  // Lower row of 4 sharp white fangs between tusks
  const lFang = new THREE.ConeGeometry(hScale * 0.036, hScale * 0.11, 4);
  for (let i = -1.5; i <= 1.5; i += 1) {
    jawParts.push(placeGeom(lFang, boneWhite, i * hScale * 0.11, 0.02, hScale * 0.38));
  }
  const jawGeom = mergeGeoms(jawParts);

  const tongueGeom = paintGeom(
    buildWedgeGeom(hScale * 0.15, hScale * 0.44, hScale * 0.065, 0.06),
    tongueRed,
    0.8
  );

  // 5. ARMS (Upper arm + shoulder plates; Forearm wrapped bandages + hands + weapons merged!)
  const uArmBase = buildTaperedLimbGeom(arch.torsoWTop * 0.35, arch.torsoWTop * 0.26, armL, 7, true);
  const uArmLParts = [placeGeom(uArmBase, arch.skinHex, 0, 0, 0)];
  const uArmRParts = [placeGeom(uArmBase, arch.skinHex, 0, 0, 0)];

  if (arch.shoulderL || armorTier >= 1) {
    const pad = new THREE.SphereGeometry(arch.torsoWTop * 0.54, 7, 5, 0, Math.PI * 2, 0, Math.PI * 0.55);
    const pSpike = new THREE.ConeGeometry(arch.torsoWTop * 0.12, arch.torsoWTop * 0.38, 4);
    uArmLParts.push(placeGeom(pad, darkIron, 0.03, 0.02, 0, 0, 0, -0.38));
    uArmLParts.push(placeGeom(pSpike, boneWhite, arch.torsoWTop * 0.36, arch.torsoWTop * 0.32, 0, 0, 0, -0.65));
    if (arch.shoulderR || armorTier >= 2) {
      uArmRParts.push(placeGeom(pad, darkIron, -0.03, 0.02, 0, 0, 0, 0.38));
      uArmRParts.push(placeGeom(pSpike, boneWhite, -arch.torsoWTop * 0.36, arch.torsoWTop * 0.32, 0, 0, 0, 0.65));
    }
  }
  const uArmLGeom = mergeGeoms(uArmLParts);
  const uArmRGeom = mergeGeoms(uArmRParts);

  // Forearms + hands + weapons merged directly per elbow pivot to eliminate extra draw calls
  const fArmBase = buildTaperedLimbGeom(arch.torsoWTop * 0.29, arch.torsoWTop * 0.22, armL * 0.95, 7, true);
  const handBox = new THREE.BoxGeometry(armL * 0.28, armL * 0.28, armL * 0.32);
  const fArmLParts = [
    placeGeom(fArmBase, darkLeather, 0, 0, 0),
    placeGeom(handBox, arch.skinHex, 0, -armL * 0.95, 0.02)
  ];
  const fArmRParts = [
    placeGeom(fArmBase, darkLeather, 0, 0, 0),
    placeGeom(handBox, arch.skinHex, 0, -armL * 0.95, 0.02)
  ];

  const handY = -armL * 0.95;
  if (type === 'goblin_grunt') {
    if (wVariant === 'dualKnives') {
      const knife = buildSickleKnifeGeom();
      fArmRParts.push(placeGeom(knife, 0xffffff, 0, handY, 0.04, 0, 0, 0, 1, 1, 1, 1.0));
      fArmLParts.push(placeGeom(knife, 0xffffff, 0, handY, 0.04, 0, 0, 0, 1, 1, 1, 1.0));
    } else if (wVariant === 'knifeShield') {
      const knife = buildSickleKnifeGeom();
      const shield = buildPlankShieldGeom();
      fArmRParts.push(placeGeom(knife, 0xffffff, 0, handY, 0.04, 0, 0, 0, 1, 1, 1, 1.0));
      fArmLParts.push(placeGeom(shield, 0xffffff, 0.03, -armL * 0.45, 0.04, 0, 0, 0, 1, 1, 1, 1.0));
    } else if (wVariant === 'club') {
      const club = buildLatheClubGeom();
      fArmRParts.push(placeGeom(club, 0xffffff, 0, handY, 0.04, 0, 0, 0, 1, 1, 1, 1.0));
    }
  } else if (type === 'goblin_archer' || type === 'orc_archer') {
    const bow = new THREE.TorusGeometry(0.32, 0.022, 5, 10, Math.PI * 0.88);
    fArmLParts.push(placeGeom(bow, woodHex, 0, handY, 0.04, 0, Math.PI * 0.5, -Math.PI * 0.44));
  } else if (type === 'goblin_shaman') {
    const staff = new THREE.CylinderGeometry(0.022, 0.018, 1.38, 6);
    const skullTop = new THREE.IcosahedronGeometry(0.055, 1);
    fArmRParts.push(placeGeom(staff, boneWhite, 0, handY + 0.15, 0.12, 0.25, 0, 0));
    fArmRParts.push(placeGeom(skullTop, boneWhite, 0, handY + 0.72, 0.26));
  } else if (type === 'goblin_leader' || type === 'orc_warrior' || type === 'orc_berserker' || type === 'orc_lord') {
    const sc = arch.height / 1.7;
    const haft = new THREE.CylinderGeometry(0.024 * sc, 0.022 * sc, 0.88 * sc, 6);
    const blade = buildWedgeGeom(0.04 * sc, 0.32 * sc, 0.28 * sc, 0.04);
    fArmRParts.push(placeGeom(haft, woodHex, 0, handY, 0.26 * sc, Math.PI * 0.5, 0, 0));
    fArmRParts.push(placeGeom(blade, darkIron, 0, handY - 0.16 * sc, 0.58 * sc, 0, 0, 0));
  } else if (type === 'hobgoblin_chief') {
    const cleaver = buildCleaverGeom();
    fArmRParts.push(placeGeom(cleaver, 0xffffff, 0, handY, 0.05, 0, 0, 0, 1, 1, 1, 1.0));
  }

  const fArmLGeom = mergeGeoms(fArmLParts);
  const fArmRGeom = mergeGeoms(fArmRParts);

  // 6. LEGS (Thighs & Calves with clawed bare feet merged into calf)
  const thighGeom = paintGeom(
    buildTaperedLimbGeom(arch.torsoWBot * 0.48, arch.torsoWBot * 0.34, legL, 7, true),
    skinWhite,
    0.85
  );

  const calfBase = buildTaperedLimbGeom(arch.torsoWBot * 0.35, arch.torsoWBot * 0.25, legL * 0.92, 7, true);
  const footBox = new THREE.BoxGeometry(arch.torsoWBot * 0.44, legL * 0.20, legL * 0.65);
  const claw = new THREE.ConeGeometry(arch.torsoWBot * 0.08, legL * 0.18, 4);
  const calfParts = [
    placeGeom(calfBase, arch.skinHex, 0, 0, 0),
    placeGeom(footBox, arch.skinHex, 0, -legL * 0.95, legL * 0.16)
  ];
  for (let c = -1; c <= 1; c++) {
    calfParts.push(
      placeGeom(
        claw,
        boneWhite,
        c * arch.torsoWBot * 0.13,
        -legL * 0.98,
        legL * 0.52,
        Math.PI * 0.48,
        0,
        0
      )
    );
  }
  const calfGeom = mergeGeoms(calfParts);

  // Build single merged inverted-hull outline geometries per limb group
  const bundle = {
    hipsGeom,
    hipsOl: buildInvertedHullGeom(hipsGeom, 0.009),
    torsoSkinGeom,
    torsoOl: buildInvertedHullGeom(torsoSkinGeom, 0.011),
    chestGearGeom,
    headSkinGeom,
    headOl: buildInvertedHullGeom(headSkinGeom, 0.010),
    headDetailGeom,
    eyesGeom,
    jawGeom,
    jawOl: buildInvertedHullGeom(jawGeom, 0.008),
    tongueGeom,
    uArmLGeom,
    uArmLOl: buildInvertedHullGeom(uArmLGeom, 0.009),
    uArmRGeom,
    uArmROl: buildInvertedHullGeom(uArmRGeom, 0.009),
    fArmLGeom,
    fArmLOl: buildInvertedHullGeom(fArmLGeom, 0.009),
    fArmRGeom,
    fArmROl: buildInvertedHullGeom(fArmRGeom, 0.009),
    thighGeom,
    thighOl: buildInvertedHullGeom(thighGeom, 0.009),
    calfGeom,
    calfOl: buildInvertedHullGeom(calfGeom, 0.009)
  };

  CACHES.geoms.set(cacheKey, bundle);
  return bundle;
}
