import * as THREE from 'three';

export const PALETTE = {
  stoneLit: 0xc4cbcf,
  stoneMid: 0xaab4ba,
  stoneShade: 0x8e9da3,
  stoneCrevice: 0x5c6b73,
  groundBase: 0xa9b6ba,
  groundLight: 0xc2cdd0,
  groundWarm: 0xb8b9b4,
  groundCrack: 0x68767c,
  mossDark: 0x436836,
  mossMid: 0x5f8a4a,
  mossLight: 0x7aa860,
  mud: 0x7c857d,
  strataLight: 0x939a9e,
  strataBrown: 0x767068,
  strataDarkBrown: 0x54504a,
  strataTeal: 0x455e66,
  strataDeep: 0x23353d,
  iron: 0x2c3236,
  plaqueBronze: 0x5a6b64,
  plaqueFrame: 0x98a2a8,
  tealGlow: 0x6fe0f0,
  tealBright: 0xb8f8ff,
  warmGlow: 0xffc27a
};

export const DEFAULT_AO_PADS = [
  { id: 'summoning_room', x: 30, z: 4, r: 12, strength: 0.36 },
  { id: 'synthesis_chamber', x: 0, z: -32, r: 10, strength: 0.34 },
  { id: 'landing_area', x: 20, z: 26, r: 14, strength: 0.26 },
  { id: 'town_square', x: 14, z: -8, r: 12, strength: 0.16 },
  { id: 'rift', x: 32.53, z: -32.53, r: 8, strength: 0.38 },
  { id: 'armory', x: -6, z: -20, r: 8, strength: 0.34 },
  { id: 'residences', x: -26, z: -4, r: 15, strength: 0.30 },
  { id: 'training', x: -24, z: 20, r: 13, strength: 0.26 },
  { id: 'mess_hall', x: 8, z: 38, r: 10, strength: 0.32 }
];

export const QUALITY_PRESETS = {
  high: {
    terrainSegs: 120,
    wallArchSegs: 7,
    pillarCapSegs: 4,
    vineLeavesPerMeter: 3.2,
    cliffRadialSegs: 72,
    cliffRingSegs: 4,
    undersideRadSegs: 52,
    undersideHeightSegs: 16,
    undersideChunks: 44,
    undersideSpikes: 26,
    rootCount: 48,
    cloudSheets: 4,
    leafCount: 120,
    glintCount: 200,
    starCount: 150
  },
  medium: {
    terrainSegs: 92,
    wallArchSegs: 5,
    pillarCapSegs: 4,
    vineLeavesPerMeter: 2.0,
    cliffRadialSegs: 52,
    cliffRingSegs: 3,
    undersideRadSegs: 36,
    undersideHeightSegs: 11,
    undersideChunks: 28,
    undersideSpikes: 16,
    rootCount: 30,
    cloudSheets: 3,
    leafCount: 72,
    glintCount: 120,
    starCount: 110
  },
  low: {
    terrainSegs: 64,
    wallArchSegs: 4,
    pillarCapSegs: 4,
    vineLeavesPerMeter: 1.1,
    cliffRadialSegs: 36,
    cliffRingSegs: 2,
    undersideRadSegs: 24,
    undersideHeightSegs: 8,
    undersideChunks: 14,
    undersideSpikes: 8,
    rootCount: 16,
    cloudSheets: 3,
    leafCount: 36,
    glintCount: 60,
    starCount: 75
  }
};

export const TIME_KEYFRAMES = [
  {
    t: 0.00,
    skyHorizon: 0xdcefee,
    skyHorizonBand: 0xc8e4e6,
    skyTop: 0x8fc4cf,
    sunColor: 0xfff1d6,
    sunIntensity: 1.0,
    sunDir: [-0.72, 0.36, -0.59],
    sunAlpha: 1.0,
    moonAlpha: 0.0,
    ambientColor: 0xcfe6ea,
    ambientIntensity: 0.80,
    hemiSky: 0xcfe9ee,
    hemiGround: 0x6c7d78,
    hemiIntensity: 0.80,
    fogColor: 0xcfe3e4,
    fogNear: 60.0,
    fogFar: 220.0,
    exposure: 1.18,
    windowGlow: 0.0,
    lampGlow: 0.1,
    starsAlpha: 0.0,
    leafGlow: 0.0,
    cloudTint: 0xe8f6f6,
    cloudOpacity: 0.34
  },
  {
    t: 0.30,
    skyHorizon: 0xbfe3ea,
    skyHorizonBand: 0x9fd2e0,
    skyTop: 0x6fb2c8,
    sunColor: 0xffffff,
    sunIntensity: 1.30,
    sunDir: [-0.24, 0.90, -0.36],
    sunAlpha: 1.0,
    moonAlpha: 0.0,
    ambientColor: 0xdff1f2,
    ambientIntensity: 0.90,
    hemiSky: 0xdbf0f5,
    hemiGround: 0x7c8c88,
    hemiIntensity: 0.85,
    fogColor: 0xbfe0e4,
    fogNear: 85.0,
    fogFar: 260.0,
    exposure: 1.25,
    windowGlow: 0.0,
    lampGlow: 0.0,
    starsAlpha: 0.0,
    leafGlow: 0.0,
    cloudTint: 0xf4fbfd,
    cloudOpacity: 0.30
  },
  {
    t: 0.62,
    skyHorizon: 0xe0a8b8,
    skyHorizonBand: 0x5a6fa0,
    skyTop: 0x23305a,
    sunColor: 0xffb98a,
    sunIntensity: 0.90,
    sunDir: [0.68, 0.32, -0.66],
    sunAlpha: 0.85,
    moonAlpha: 0.35,
    ambientColor: 0x9a9fc0,
    ambientIntensity: 0.70,
    hemiSky: 0x9ea8cc,
    hemiGround: 0x484d5e,
    hemiIntensity: 0.70,
    fogColor: 0x4a5a82,
    fogNear: 68.0,
    fogFar: 235.0,
    exposure: 1.15,
    windowGlow: 0.70,
    lampGlow: 0.80,
    starsAlpha: 0.45,
    leafGlow: 0.45,
    cloudTint: 0x8b8eb8,
    cloudOpacity: 0.32
  },
  {
    t: 0.78,
    skyHorizon: 0x1d4a55,
    skyHorizonBand: 0x133540,
    skyTop: 0x07161c,
    sunColor: 0xbfe4ff,
    sunIntensity: 1.00,
    sunDir: [-0.46, 0.68, -0.57],
    sunAlpha: 0.0,
    moonAlpha: 1.0,
    ambientColor: 0x6f94a8,
    ambientIntensity: 0.60,
    hemiSky: 0x8fc4d6,
    hemiGround: 0x2f3f44,
    hemiIntensity: 0.65,
    fogColor: 0x1d4a55,
    fogNear: 70.0,
    fogFar: 240.0,
    exposure: 1.15,
    windowGlow: 1.0,
    lampGlow: 1.0,
    starsAlpha: 1.0,
    leafGlow: 1.0,
    cloudTint: 0x427888,
    cloudOpacity: 0.28
  },
  {
    t: 0.95,
    skyHorizon: 0x173e48,
    skyHorizonBand: 0x0f2c36,
    skyTop: 0x051218,
    sunColor: 0xb4dcf8,
    sunIntensity: 0.92,
    sunDir: [-0.35, 0.74, -0.57],
    sunAlpha: 0.0,
    moonAlpha: 1.0,
    ambientColor: 0x66899c,
    ambientIntensity: 0.56,
    hemiSky: 0x82b8ca,
    hemiGround: 0x2b3a40,
    hemiIntensity: 0.62,
    fogColor: 0x18404a,
    fogNear: 70.0,
    fogFar: 240.0,
    exposure: 1.12,
    windowGlow: 1.0,
    lampGlow: 1.0,
    starsAlpha: 1.0,
    leafGlow: 1.0,
    cloudTint: 0x396b7a,
    cloudOpacity: 0.26
  }
];

export const BAKED_KEY_DIR = new THREE.Vector3(-0.42, 0.74, -0.52).normalize();

export function parseInitialTimeOfDay(timeParam) {
  if (typeof timeParam === 'number' && Number.isFinite(timeParam)) {
    return ((timeParam % 1) + 1) % 1;
  }
  if (timeParam === 'morning') return 0.00;
  if (timeParam === 'noon' || timeParam === 'day') return 0.30;
  if (timeParam === 'dusk') return 0.62;
  if (timeParam === 'deep_night') return 0.95;
  return 0.78;
}

export function createWallSpec(layout = {}) {
  return {
    sides: 12,
    apothem: layout.wall?.apothem ?? 46.0,
    vertexRadius: layout.wall?.vertexRadius ?? 47.62,
    height: layout.wall?.height ?? 10.0,
    thickness: layout.wall?.thickness ?? 2.5,
    pillarWidth: 3.0,
    pillarHeight: 13.0,
    pillarCapRadius: 2.3,
    pillarCapHeight: 1.5,
    pilasterSpacing: 6.0,
    pilasterWidth: 2.85,
    pilasterHeight: 10.5,
    pilasterDepth: 0.7,
    riftTargetX: layout.rift?.x ?? 32.53,
    riftTargetZ: layout.rift?.z ?? -32.53,
    riftWidth: layout.rift?.openingWidth ?? 6.5,
    riftHeight: layout.rift?.openingHeight ?? 10.0
  };
}

export function findRiftSideIndex(wallSpec) {
  const riftAngle = Math.atan2(wallSpec.riftTargetZ, wallSpec.riftTargetX);
  let riftSideIndex = 0;
  let bestAngleDiff = Infinity;
  for (let k = 0; k < 12; k++) {
    const midAngle = (k + 0.5) * (Math.PI / 6);
    const diff = Math.abs(Math.atan2(Math.sin(midAngle - riftAngle), Math.cos(midAngle - riftAngle)));
    if (diff < bestAngleDiff) {
      bestAngleDiff = diff;
      riftSideIndex = k;
    }
  }
  return riftSideIndex;
}

export function buildSpatialMetadata({
  wallSpec,
  layout,
  getGroundY,
  riftSideIndex,
  colliders,
  doors,
  lights,
  anchors
}) {
  colliders.length = 0;
  doors.length = 0;
  lights.length = 0;

  const sideLength = 2 * wallSpec.apothem * Math.tan(Math.PI / 12);

  for (let k = 0; k < 12; k++) {
    const vAngle = k * (Math.PI / 6);
    const vx = Math.cos(vAngle) * wallSpec.vertexRadius;
    const vz = Math.sin(vAngle) * wallSpec.vertexRadius;

    colliders.push({
      type: 'circle',
      x: vx,
      z: vz,
      r: wallSpec.pillarWidth * 0.68
    });

    const midAngle = (k + 0.5) * (Math.PI / 6);
    const nx = Math.cos(midAngle);
    const nz = Math.sin(midAngle);
    const tx = -nz;
    const tz = nx;
    const cx = nx * wallSpec.apothem;
    const cz = nz * wallSpec.apothem;
    const rotY = Math.atan2(nx, nz);

    if (k === riftSideIndex) {
      colliders.push({
        type: 'box',
        x: cx,
        z: cz,
        w: wallSpec.riftWidth,
        d: wallSpec.thickness,
        rotY
      });

      const wingWidth = (sideLength - wallSpec.riftWidth) * 0.5;
      const offset = (wallSpec.riftWidth + wingWidth) * 0.5;
      for (const sign of [-1, 1]) {
        colliders.push({
          type: 'box',
          x: cx + tx * offset * sign,
          z: cz + tz * offset * sign,
          w: wingWidth,
          d: wallSpec.thickness,
          rotY
        });
      }

      const gateGroundY = getGroundY(cx, cz);
      const gatePos = new THREE.Vector3(cx, gateGroundY, cz);
      const inward = new THREE.Vector3(-nx, 0, -nz).normalize();
      const doorPos = gatePos.clone().addScaledVector(inward, 2.0);

      const riftDoorId = layout.doors?.rift?.id || 'space_time_rift';
      doors.push({
        id: riftDoorId,
        position: doorPos.clone(),
        outward: inward.clone()
      });

      anchors.riftGate = gatePos.clone();
      anchors.door_space_time_rift = doorPos.clone();
      anchors.portal = gatePos.clone().add(new THREE.Vector3(0, 4.2, 0));
      anchors.portal_center = anchors.portal.clone();
      anchors.sign_space_time_rift = new THREE.Vector3(
        cx - nx * 1.5,
        gateGroundY + 10.5,
        cz - nz * 1.5
      );

      lights.push({
        position: new THREE.Vector3(cx - nx * 1.4, gateGroundY + 5.5, cz - nz * 1.4),
        color: PALETTE.tealGlow,
        intensity: 6.0,
        distance: 18.0
      });
    } else {
      colliders.push({
        type: 'box',
        x: cx,
        z: cz,
        w: sideLength,
        d: wallSpec.thickness,
        rotY
      });

      if (k % 3 === 0) {
        const wallY = getGroundY(cx, cz);
        lights.push({
          position: new THREE.Vector3(cx - nx * 1.8, wallY + 4.2, cz - nz * 1.8),
          color: PALETTE.warmGlow,
          intensity: 0.95,
          distance: 14.0
        });
      }
    }
  }
}