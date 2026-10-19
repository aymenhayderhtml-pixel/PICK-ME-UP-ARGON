// src/art/town/palette.js
// Shared color palette for Niflheimr town modules.
// Real colors extracted from src/art/town/shell.js and manhwa lore specifications.

export const PALETTE = {
  // Shell base stone and ground (real values from shell.js)
  wallLit: 0xc4cbcf,
  wallShade: 0x8e9da3,
  groundBase: 0xa9b6ba,
  groundDark: 0x68767c,
  moss: 0x5f8a4a,
  mossDark: 0x436836,
  ivy: 0x436836,

  // Sky colors per time of day (from shell.js TIME_KEYFRAMES)
  skyHorizon: {
    morning: 0xdcefee,
    midday: 0xbfe3ea,
    dusk: 0xe0a8b8,
    night: 0x1d4a55,
    deepNight: 0x173e48
  },
  skyTop: {
    morning: 0x8fc4cf,
    midday: 0x6fb2c8,
    dusk: 0x23305a,
    night: 0x07161c,
    deepNight: 0x051218
  },

  // Default flat sky fallbacks
  skyHorizonNight: 0x1d4a55,
  skyTopNight: 0x07161c,

  // Fixed palette colors
  plaster: 0xdfe3df,
  timber: 0x2b2623,
  slate: 0x4a5560,
  warmWindow: 0xffc27a,
  teal: 0x6fe0f0,
  portalBlue: 0x5ab4ff,
  forgeOrange: 0xff8a3a,
  sphereCyan: 0xa8f4ff,
  crimsonGlow: 0xff3a4a,
  gold: 0xd8b45a,
  dirt: 0xa89f8a,
  wood: 0x6a4a2e,

  // Shell stone and strata compatibility aliases
  stoneLit: 0xc4cbcf,
  stoneMid: 0xaab4ba,
  stoneShade: 0x8e9da3,
  stoneCrevice: 0x5c6b73,
  groundLight: 0xc2cdd0,
  groundWarm: 0xb8b9b4,
  groundCrack: 0x68767c,
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
