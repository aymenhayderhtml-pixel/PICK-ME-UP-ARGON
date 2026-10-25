export const MISSION_TYPES = {
  SUBJUGATION: {
    type: 'SUBJUGATION',
    objective: 'ANNIHILATE YOUR ENEMIES!',
  },
  BOSS_BATTLE: {
    type: 'BOSS BATTLE',
    objective: 'DEFEAT THE BOSS!',
  },
  GATHERING: {
    type: 'GATHERING',
    objective: 'GATHER ORE AND DEFEAT THE MONSTERS!',
  },
  DAILY_DUNGEON: {
    type: 'DAILY DUNGEON',
    objective: 'COLLECT ALL SORTS OF RARE MATERIALS!',
  },
  SURVIVAL: {
    id: 'SURVIVAL',
    name: 'Survival',
    type: 'SURVIVAL',
    objective: 'SURVIVE UNTIL THE TIMER ENDS!',
  },
};

export const MISSIONS = {
  5: {
    floor: 5,
    id: 'floor_5',
    title: 'Floor 5: Ruined Town at Sunset',
    type: 'SURVIVAL',
    objective: 'SURVIVE UNTIL THE TIMER ENDS!',
    durationSec: 1800,
    environment: 'ruined_medieval_town_sunset',
    enemies: ['goblin_grunt', 'goblin_leaper', 'goblin_climber'],
    configKey: 'FLOOR5_CONFIG',
  },
};

/**
 * Returns formatted mission title, type, and objective string.
 * Used for the top-center .mm-panel mission banner on floor enter.
 */
export function getMissionInfo({ mode, floorNumber = 1, difficulty = 1 } = {}) {
  if (mode === 'mine') {
    return {
      title: 'MINE',
      missionType: MISSION_TYPES.GATHERING.type,
      objective: MISSION_TYPES.GATHERING.objective,
      line1: 'MISSION TYPE – GATHERING',
      line2: 'OBJECTIVE – GATHER ORE AND DEFEAT THE MONSTERS!',
    };
  }

  if (mode === 'hunt') {
    return {
      title: 'HUNTING GROUND',
      missionType: MISSION_TYPES.SUBJUGATION.type,
      objective: MISSION_TYPES.SUBJUGATION.objective,
      line1: 'MISSION TYPE – SUBJUGATION',
      line2: 'OBJECTIVE – ANNIHILATE YOUR ENEMIES!',
    };
  }

  if (floorNumber === 5) {
    return {
      title: 'FLOOR 5',
      missionType: 'SURVIVAL',
      objective: 'SURVIVE THE HORDE OF ENEMIES!',
      line1: 'MISSION CATEGORY - SURVIVAL',
      line2: 'GOAL - SURVIVE THE HORDE OF ENEMIES! GOBLIN LV.? X 1846',
    };
  }

  if (floorNumber === 6) {
    return {
      title: 'FLOOR 6',
      missionType: 'EXPLORE',
      objective: 'INVESTIGATE THE UNFAMILIAR LOCATION!',
      line1: 'MISSION TYPE - EXPLORE',
      line2: 'GOAL - INVESTIGATE THE UNFAMILIAR LOCATION!',
    };
  }

  if (floorNumber % 5 === 0) {
    return {
      title: `FLOOR ${floorNumber}`,
      missionType: MISSION_TYPES.BOSS_BATTLE.type,
      objective: MISSION_TYPES.BOSS_BATTLE.objective,
      line1: 'MISSION TYPE – BOSS BATTLE',
      line2: 'OBJECTIVE – DEFEAT THE BOSS!',
    };
  }

  if (floorNumber === 1) {
    return {
      title: 'FLOOR 1',
      missionType: MISSION_TYPES.SUBJUGATION.type,
      objective: MISSION_TYPES.SUBJUGATION.objective,
      line1: 'MISSION TYPE – SUBJUGATION',
      line2: 'OBJECTIVE – ANNIHILATE YOUR ENEMIES!',
    };
  }

  if (floorNumber === 3) {
    return {
      title: 'FLOOR 3',
      missionType: 'SUBJUGATION',
      objective: 'ANNIHILATE ALL THE ENEMIES!',
      line1: 'MISSION CATEGORY - SUBJUGATION',
      line2: 'GOAL - ANNIHILATE ALL THE ENEMIES!',
    };
  }

  // Floors 2, 4 use Floor 2 conquest wording
  return {
    title: `FLOOR ${floorNumber}`,
    missionType: 'CONQUEST',
    objective: 'KILL ALL THE ENEMIES!',
    line1: 'DUTY TYPE: CONQUEST',
    line2: 'GOAL: KILL ALL THE ENEMIES!',
  };
}

export const DAILY_DUNGEONS = {
  daily_mine: { id: 'daily_mine', name: 'ISRALTA MINE', title: 'ISRALTA MINE' },
  daily_forest: { id: 'daily_forest', name: 'KENDERT FOREST', title: 'KENDERT FOREST' },
  daily_plateau: { id: 'daily_plateau', name: 'SINMIEL PLATEAU', title: 'SINMIEL PLATEAU' },
};
