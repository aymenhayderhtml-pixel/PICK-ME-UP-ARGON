// src/art/town/ground.js
// Shared ground height function and building terrace pads for Niflheimr town.

export const HUB_TERRAIN_AMPLITUDE = 0;

export const BUILDING_PADS = [
  { x: 30, z: 4, radius: 12.0, height: 1.8 },    // Summoning Room terrace (+1.8)
  { x: 0, z: -32, radius: 10.0, height: 1.2 },   // Synthesis Chamber terrace (+1.2)
  { x: 20, z: 26, radius: 14.0, height: 0.0 },   // Landing Area
  { x: 14, z: -8, radius: 12.0, height: 0.0 },   // Town Square
  { x: 27, z: -27, radius: 8.0, height: 0.0 },   // Space-Time Rift gate area
  { x: -6, z: -20, radius: 8.0, height: 0.0 },   // Armory
  { x: -26, z: -4, radius: 15.0, height: 0.0 },  // Residences
  { x: -24, z: 20, radius: 13.0, height: 0.0 },  // Training Grounds
  { x: 8, z: 38, radius: 10.0, height: 0.0 },    // Mess Hall row
  { x: 6, z: -2, radius: 5.0, height: 0.0 },     // Dungeon Board
];

export function getGroundY(x, z) {
  if (HUB_TERRAIN_AMPLITUDE === 0) return 0;

  // Base gentle rolling terrain (sin-based, amplitude 0.6)
  const rawWave = Math.sin(x * 0.08) * Math.cos(z * 0.08) * 0.6 * HUB_TERRAIN_AMPLITUDE;

  // Smooth blend around building pads and terraces
  let blendHeight = rawWave;
  let maxWeight = 0;

  for (let i = 0; i < BUILDING_PADS.length; i++) {
    const pad = BUILDING_PADS[i];
    const dist = Math.hypot(x - pad.x, z - pad.z);
    if (dist < pad.radius) {
      const weight = 1 - dist / pad.radius;
      if (weight > maxWeight) {
        maxWeight = weight;
        const smooth = weight * weight * (3 - 2 * weight);
        blendHeight = (1 - smooth) * rawWave + smooth * (pad.height * HUB_TERRAIN_AMPLITUDE);
      }
    }
  }

  return blendHeight;
}
