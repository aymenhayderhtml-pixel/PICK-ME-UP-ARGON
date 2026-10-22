// src/data/rewards.js
// Per-floor stage clear reward table and formulas.

export const STAGE_REWARDS = {
  1: {
    gold: 2000,
    materials: [
      { id: 'steel', name: 'STEEL (C)', count: 2 },
      { id: 'copper', name: 'COPPER (C)', count: 1 },
      { id: 'leather', name: 'LEATHER (C)', count: 1 },
    ],
  },
  2: {
    gold: 5000,
    materials: [
      { id: 'crude_iron', name: 'IRON ORE (C)', count: 1 },
      { id: 'leather', name: 'LEATHER (C)', count: 3 },
    ],
  },
  3: {
    gold: 7000,
    materials: [
      { id: 'crude_iron', name: 'IRON ORE (C)', count: 2 },
      { id: 'leather', name: 'LEATHER (C)', count: 1 },
    ],
    gems: 0,
    tickets: 0,
  },
};

/**
 * Returns clear reward definition for a given floor number.
 * @param {number} floorNumber
 * @param {boolean} isFirstClear
 */
export function getFloorClearReward(floorNumber = 1, isFirstClear = false) {
  const floor = Math.max(1, Math.floor(floorNumber));

  if (STAGE_REWARDS[floor]) {
    const preset = STAGE_REWARDS[floor];
    let gems = preset.gems !== undefined ? preset.gems : Math.max(0, Math.floor((10 * floor) / 2));
    if (floor === 5 && isFirstClear) gems += 50;
    const tickets = preset.tickets !== undefined ? preset.tickets : (floor === 5 ? 1 : (Math.random() < 0.1 ? 1 : 0));

    return {
      gold: preset.gold,
      materials: preset.materials.map((m) => ({ ...m })),
      gems,
      tickets,
    };
  }

  // Floors 3 and above: gold 5000 * (floor - 1)
  const gold = 5000 * (floor - 1);
  const baseMats = [
    { id: 'steel', name: 'STEEL (C)', count: 1 + Math.floor((floor - 1) * 0.8) },
    { id: 'copper', name: 'COPPER (C)', count: 1 + Math.floor((floor - 1) * 0.6) },
    { id: 'leather', name: 'LEATHER (C)', count: 1 + Math.floor((floor - 1) * 0.7) },
    { id: 'crude_iron', name: 'IRON ORE (C)', count: Math.floor((floor - 1) * 0.5) },
  ].filter((m) => m.count > 0);

  // +1 on a random one per floor
  const randIdx = Math.floor(Math.random() * baseMats.length);
  if (baseMats[randIdx]) {
    baseMats[randIdx].count += 1;
  }

  let gems = Math.max(0, Math.floor((10 * floor) / 2));
  if (floor === 5 && isFirstClear) gems += 50;
  const tickets = floor === 5 ? 1 : (Math.random() < 0.1 ? 1 : 0);

  return {
    gold,
    materials: baseMats,
    gems,
    tickets,
  };
}
