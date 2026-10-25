import { ENEMIES } from './enemies.js';
import { SKILLS } from './skills.js';
import { MATERIALS } from './materials.js';

const floor1Grunt = ENEMIES.goblin_grunt || {
  id: 'goblin_grunt',
  name: 'Goblin Grunt',
  floor: 1,
  level: 1,
  stats: { hp: 80, atk: 12, def: 4, spd: 3.2, atkSpd: 1.0 }
};

export const FLOOR5_CONFIG = {
  floor: 5,
  missionType: 'SURVIVAL',
  objective: 'SURVIVE UNTIL THE TIMER ENDS!',
  durationSec: 1800,

  pacing: [
    {
      t: 0,
      phase: 'arrival_and_probe',
      spawnPerSec: 0.35,
      maxAlive: 12,
      variantWeights: { grunt: 1.0, leaper: 0.0, climber: 0.0 }
    },
    {
      t: 300,
      phase: 'chokepoint_rotation',
      spawnPerSec: 0.55,
      maxAlive: 18,
      variantWeights: { grunt: 0.9, leaper: 0.1, climber: 0.0 }
    },
    {
      t: 600,
      phase: 'blunt_blades_and_leapers',
      spawnPerSec: 0.85,
      maxAlive: 28,
      variantWeights: { grunt: 0.7, leaper: 0.25, climber: 0.05 }
    },
    {
      t: 1200,
      phase: 'attrition_bleeding_fear',
      spawnPerSec: 1.15,
      maxAlive: 38,
      variantWeights: { grunt: 0.6, leaper: 0.25, climber: 0.15 }
    },
    {
      t: 1500,
      phase: 'wall_platform_climb',
      spawnPerSec: 1.45,
      maxAlive: 48,
      variantWeights: { grunt: 0.45, leaper: 0.2, climber: 0.35 }
    },
    {
      t: 1740,
      phase: 'final_60s_surge',
      spawnPerSec: 2.4,
      maxAlive: 72,
      variantWeights: { grunt: 0.4, leaper: 0.25, climber: 0.35 }
    }
  ],

  variants: {
    grunt: {
      enemyId: 'goblin_grunt',
      level: floor1Grunt.level,
      baseStats: { ...floor1Grunt.stats },
      role: 'frontline_pressure'
    },
    leaper: {
      enemyId: 'goblin_leaper',
      level: floor1Grunt.level,
      baseStats: { ...floor1Grunt.stats },
      role: 'jump_over_frontline',
      leapDistance: 4.5,
      leapHeight: 2.2,
      leapCooldownSec: 7.0
    },
    climber: {
      enemyId: 'goblin_climber',
      level: floor1Grunt.level,
      baseStats: { ...floor1Grunt.stats },
      role: 'stack_climb_wall_platform',
      canStack: true
    }
  },

  stackClimb: {
    stackHeight: 3,
    climbSpeed: 1.4,
    baseGatherRadius: 1.8,
    toppleKnockbackForce: 5.0
  },

  rotation: {
    swapCooldownSec: 8,
    restStaminaRegenMult: 3,
    autoSwapStaminaPct: 0.25
  },

  efficiency: {
    oneCleanHitStaminaSavePct: 0.30
  },

  durability: {
    killsUntilBlunt: 35,
    bluntDamageMult: 0.35,
    shieldBashDamage: 18
  },

  arrows: {
    start: 40,
    pickupRadius: 2.5,
    recoverChance: 0.65
  },

  bleeding: {
    tickSec: 2.0,
    hpPctPerTick: 0.015,
    staminaDrain: 2.5,
    staminaDrainPerSec: 2.5,
    durationSec: 12.0
  },

  fear: {
    statMult: 0.7,
    durationSec: 10.0,
    triggers: [
      'ally_near_death',
      'surrounded_4_plus',
      'ally_permadeath'
    ]
  },

  nearDeath: {
    hpPct: 0.15,
    rescueWindowSec: 6.0
  },

  stressAwakenings: [
    {
      skillId: 'basic_swordsmanship',
      name: SKILLS.basic_swordsmanship?.name || 'Basic Swordsmanship',
      trigger: 'sustained_melee_pressure',
      weight: 1.0,
      minElapsedSec: 300
    },
    {
      skillId: 'basic_sword_shield_technique',
      name: SKILLS.basic_sword_shield_technique?.name || 'Basic Sword-Shield Technique',
      trigger: 'blunt_weapon_shield_bash',
      weight: 1.0,
      minElapsedSec: 600
    },
    {
      skillId: 'pain_tolerance',
      name: SKILLS.pain_tolerance?.name || 'Pain Tolerance',
      trigger: 'bleeding_or_low_hp',
      weight: 0.9,
      minElapsedSec: 600
    },
    {
      skillId: 'composure',
      name: SKILLS.composure?.name || 'Composure',
      trigger: 'resist_fear_under_siege',
      weight: 0.85,
      minElapsedSec: 720
    },
    {
      skillId: 'quick_movements',
      name: SKILLS.quick_movements?.name || 'Quick Movements',
      trigger: 'evade_leaper_or_scavenge_arrows',
      weight: 0.9,
      minElapsedSec: 600
    },
    {
      skillId: 'berserk',
      name: SKILLS.berserk?.name || 'Berserk',
      trigger: 'near_death_or_final_stand',
      weight: 0.5,
      minElapsedSec: 1200
    }
  ],

  berserk: {
    duration: 20,
    durationSec: 20,
    statMult: 1.5,
    damageMult: 1.8,
    hpDrainPct: 0.02,
    redAura: true,
    auraColor: '#ff1a1a'
  },

  timerUI: {
    warningSec: 60,
    criticalSec: 30,
    thresholds: [60, 30]
  },

  endDissolve: {
    durationSec: 3.5,
    cyan: true,
    color: '#00ffff'
  },

  lighting: {
    preset: 'sunset',
    sunColor: '#ff7b39',
    sunIntensity: 2.2,
    ambientColor: '#3b243d',
    ambientIntensity: 0.65,
    fogColor: '#2a1829',
    fogNear: 14,
    fogFar: 65,
    driftingEmbers: {
      enabled: true,
      count: 120,
      color: '#ff944d',
      riseSpeed: 0.8
    }
  },

  layout: {
    environment: 'ruined_medieval_town_sunset',
    chokepointWidth: 3.2,
    chokepointLength: 14.0,
    platformHeight: 3.5,
    platformWidth: 6.0,
    platformDepth: 4.5,
    arrivalDomeRadius: 4.0,
    spawnPoints: [
      { id: 'alley_north', x: 0, y: 0, z: -28 },
      { id: 'alley_east', x: 12, y: 0, z: -24 },
      { id: 'alley_west', x: -12, y: 0, z: -24 }
    ]
  },

  rewards: {
    gold: 5000,
    materials: [
      { id: MATERIALS.iron_ore?.id || 'iron_ore', name: 'Iron Ore', grade: 'C', count: 1 },
      { id: MATERIALS.leather?.id || 'leather', name: 'Leather', grade: 'C', count: 3 },
      { id: MATERIALS.wooden_planks?.id || 'wooden_planks', name: 'Wooden Planks', grade: 'B', count: 2 }
    ]
  }
};

export default FLOOR5_CONFIG;