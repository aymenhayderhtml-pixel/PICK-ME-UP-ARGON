import { getXpForLevel, LEVEL_CAP_PER_STAR, getPromotionCost, getSynthesisXp, getSkillInheritChance } from '../data/rules.js';
import { showSystemMessage } from '../ui/Hud.js';
import { createInitialMaterials } from '../data/materials.js';
import { createItemInstance, FORGE_RECIPES, ITEM_TEMPLATES } from '../data/items.js';
import { getBestSmith, MAX_INVENTORY_CAPACITY } from './Inventory.js';
import { generateNoviceHero, rollMotivation } from '../data/heroes.js';
import { getSkill, getSkillEffects } from '../data/skills.js';
import { showHeroReport } from '../ui/HeroReport.js';
import { generateLook } from '../art/looks.js';

const SAVE_KEY = 'pickmeup_save_v1';

export function rollHeroPotentials(hero) {
  const isHighTier = (hero.star >= 3) || hero.id === 'hero_han' || hero.id === 'hero_jenna' || hero.id === 'hero_aaron';
  const min = isHighTier ? 1.0 : 0.75;
  const max = isHighTier ? 1.4 : 1.35;
  const roll = () => Math.round((min + Math.random() * (max - min)) * 100) / 100;
  return {
    str: roll(),
    agi: roll(),
    vit: roll(),
    int: roll(),
    wil: roll(),
  };
}

const TALENT_ROLL_POOL = [
  'superhuman_strength',
  'quick_learner',
  'natural_leader',
  'iron_stomach',
  'composure',
  'keen_sight',
  'pain_tolerance',
];

export function rollHiddenTalents(hero) {
  if (hero.star >= 3) {
    return { hiddenTalents: [], talentsRevealed: true };
  }
  const r = Math.random();
  const count = r < 0.10 ? 2 : r < 0.55 ? 1 : 0;
  if (count === 0) {
    return { hiddenTalents: [], talentsRevealed: true };
  }
  const existing = new Set((hero.talents || []).map((t) => (t || '').toLowerCase()));
  const available = TALENT_ROLL_POOL.filter((t) => !existing.has(t));
  const shuffled = [...available].sort(() => Math.random() - 0.5);
  return {
    hiddenTalents: shuffled.slice(0, count),
    talentsRevealed: false,
  };
}

function getWeightedStatsForClass(heroClass) {
  const c = (heroClass || '').toLowerCase();
  if (c.includes('tank') || c.includes('vanguard')) {
    return ['str', 'str', 'vit', 'vit', 'vit', 'wil', 'agi'];
  }
  if (c.includes('scout') || c.includes('ranger') || c.includes('archer') || c.includes('rogue')) {
    return ['agi', 'agi', 'agi', 'str', 'wil', 'vit'];
  }
  if (c.includes('mage') || c.includes('wizard')) {
    return ['int', 'int', 'int', 'wil', 'wil', 'vit'];
  }
  if (c.includes('cleric') || c.includes('priest') || c.includes('healer')) {
    return ['wil', 'wil', 'int', 'int', 'vit', 'str'];
  }
  return ['str', 'agi', 'vit', 'int', 'wil'];
}

export class GameState {
  constructor() {
    this.masterName = '';
    this.gold = 50000;
    this.gems = 0;
    this.freeTickets = 0;
    this.premiumSummons = 1;
    this.heroes = [];
    this.party = []; // Array of { id, formation: 'front'|'back' }
    this.currentFloor = 1;
    this.clearedFloors = 0;
    this.deadHeroes = [];
    this.dissolvedHeroes = 0;
    this.trainingSlots = [null, null, null]; // [ { heroId, skillId, tickTimer, animTimer } | null ]
    this.inventory = [];
    this.materials = createInitialMaterials();
    this.forgeQueue = [];
    this.flags = { tutorialDone: false, tutorialStep: 0, heroDiedReactionPlayed: false };

    // Manhua systems: Day cycle, food quality, relations
    this.dayCount = 1;
    this.dayTimer = 0.08 * 480;
    this.dayPaused = false;
    this.settings = { quality: 'medium', resolutionScale: 1, showFps: true };
    this.foodQuality = 'basic';
    this.relations = {
      'hero_han|hero_jenna': 25,
      'hero_aaron|hero_han': 25,
      'hero_aaron|hero_jenna': 25,
    };
    this.bondsAnnounced = {};

    this.facilities = {
      altar: { level: 1, unlocked: true },
      synthesis: { level: 1, unlocked: true },
      dormitory: { level: 1, unlocked: true },
      training: { level: 1, unlocked: false, unlockCost: 200 },
      blacksmith: { level: 1, unlocked: false, unlockedByFloor: 5 },
      cafeteria: { level: 1, unlocked: false, unlockedByFloor: 10 },
      infirmary: { level: 1, unlocked: false, unlockedByFloor: 10 },
    };

    if (!this.loadFromLocalStorage()) {
      this.initNewGame();
    }
  }

  initNewGame() {
    this.masterName = '';
    this.gold = 50000;
    this.gems = 0;
    this.freeTickets = 0;
    this.premiumSummons = 1;
    this.currentFloor = 1;
    this.clearedFloors = 0;
    this.deadHeroes = [];
    this.dissolvedHeroes = 0;
    this.trainingSlots = [null, null, null];
    this.inventory = [];
    this.materials = createInitialMaterials();
    this.forgeQueue = [];
    this.flags = {
      tutorialDone: false,
      tutorialStep: 0,
      tutorialSeen: false,
      tutorialWalkoutDone: false,
      tutorialPunishmentDone: false,
      equipmentSummoned: false,
      initialSummonDone: false,
      jennaAaronArrived: false,
      tutorialRuleBreakDone: false,
      heroDiedReactionPlayed: false,
    };

    this.facilities = {
      altar: { level: 1, unlocked: true },
      synthesis: { level: 1, unlocked: true },
      dormitory: { level: 1, unlocked: true },
      training: { level: 1, unlocked: false, unlockCost: 200 },
      blacksmith: { level: 1, unlocked: false, unlockedByFloor: 5 },
      cafeteria: { level: 1, unlocked: false, unlockedByFloor: 10 },
      infirmary: { level: 1, unlocked: false, unlockedByFloor: 10 },
    };

    this.dayCount = 1;
    this.dayTimer = 0.08 * 480;
    this.dayPaused = false;
    this.foodQuality = 'basic';
    this.relations = {
      'hero_han|hero_jenna': 25,
      'hero_aaron|hero_han': 25,
      'hero_aaron|hero_jenna': 25,
    };
    this.bondsAnnounced = {};

    const han = {
      id: 'hero_han',
      name: 'Han Islat',
      star: 1,
      level: 1,
      exp: 0,
      fatigue: 0,
      stress: 0,
      satisfaction: 50,
      traits: [],
      potentials: rollHeroPotentials({ star: 3 }),
      hiddenTalents: ['composure'],
      talentsRevealed: false,
      class: 'Vanguard',
      motivation: 'diligent',
      hair: 0x111111,
      armor: 0x2a303c,
      weapon: 'sword+shield',
      personality: 'Analytical & Cold',
      stats: { str: 7, agi: 7, vit: 8, int: 5, wil: 12 },
      skills: [
        { id: 'basic_swordsmanship', name: 'Basic Swordsmanship', level: 1, exp: 0 },
        { id: 'basic_shield_technique', name: 'Basic Shield Technique', level: 1, exp: 0 },
      ],
      talents: [],
      hiddenTalent: 'composure',
      equipment: {
        weapon: createItemInstance('rusty_sword', { source: 'starter' }),
        offhand: createItemInstance('wooden_shield', { source: 'starter' }),
        armor: null,
      },
      alive: true,
    };
    han.look = generateLook(han);

    // In the tutorial at least ONE novice is forced uncooperative
    const heroes = [han];
    const nov1 = generateNoviceHero({ forceUncooperative: true, existingHeroes: heroes });
    nov1.noviceIndex = 1;
    nov1.look = generateLook(nov1);
    nov1.potentials = rollHeroPotentials(nov1);
    const ht1 = rollHiddenTalents(nov1);
    nov1.hiddenTalents = ht1.hiddenTalents;
    nov1.talentsRevealed = ht1.talentsRevealed;
    nov1.satisfaction = 50;
    nov1.traits = Math.random() < 0.20 ? ['picky'] : [];
    heroes.push(nov1);

    const nov2 = generateNoviceHero({ existingHeroes: heroes });
    nov2.noviceIndex = 2;
    nov2.look = generateLook(nov2);
    nov2.potentials = rollHeroPotentials(nov2);
    const ht2 = rollHiddenTalents(nov2);
    nov2.hiddenTalents = ht2.hiddenTalents;
    nov2.talentsRevealed = ht2.talentsRevealed;
    nov2.satisfaction = 50;
    nov2.traits = Math.random() < 0.20 ? ['picky'] : [];
    heroes.push(nov2);

    const nov3 = generateNoviceHero({ existingHeroes: heroes });
    nov3.noviceIndex = 3;
    nov3.look = generateLook(nov3);
    nov3.potentials = rollHeroPotentials(nov3);
    const ht3 = rollHiddenTalents(nov3);
    nov3.hiddenTalents = ht3.hiddenTalents;
    nov3.talentsRevealed = ht3.talentsRevealed;
    nov3.satisfaction = 50;
    nov3.traits = Math.random() < 0.20 ? ['picky'] : [];
    heroes.push(nov3);

    const nov4 = generateNoviceHero({ existingHeroes: heroes });
    nov4.noviceIndex = 4;
    nov4.look = generateLook(nov4);
    nov4.potentials = rollHeroPotentials(nov4);
    const ht4 = rollHiddenTalents(nov4);
    nov4.hiddenTalents = ht4.hiddenTalents;
    nov4.talentsRevealed = ht4.talentsRevealed;
    nov4.satisfaction = 50;
    nov4.traits = Math.random() < 0.20 ? ['picky'] : [];
    heroes.push(nov4);

    this.heroes = heroes;
    this.assignHouses();
    this.party = [
      { id: han.id, formation: 'front' },
      { id: nov1.id, formation: 'front' },
      { id: nov2.id, formation: 'front' },
      { id: nov3.id, formation: 'back' },
      { id: nov4.id, formation: 'back' },
    ];
    this.saveToLocalStorage();
  }

  assignHouses() {
    this.heroes.forEach((h, idx) => {
      h.houseIndex = Math.min(10, Math.floor(idx / 2) + 1);
    });
  }

  checkTalentReveal(hero) {
    if (!hero || hero.talentsRevealed || !hero.hiddenTalents || !hero.hiddenTalents.length) {
      return;
    }
    const hasSkillLv3 = (hero.skills || []).some((s) => (s.level || 1) >= 3);
    if (hero.star >= 3 || (hero.level || 1) >= 3 || hasSkillLv3 || hero.survivedFear) {
      hero.talentsRevealed = true;
      hero.talents = hero.talents || [];
      for (const tId of hero.hiddenTalents) {
        if (!hero.talents.includes(tId)) {
          hero.talents.push(tId);
          const def = getSkill(tId);
          const tName = def ? def.name : tId;
          showSystemMessage(`[TALENT AWAKENED: ${hero.name.toUpperCase()} REVEALED TALENT ${tName.toUpperCase()}!]`);
        }
      }
      this.saveToLocalStorage();
    }
  }

  getRelation(idA, idB) {
    if (!idA || !idB || idA === idB) return 0;
    const key = [idA, idB].sort().join('|');
    return this.relations[key] || 0;
  }

  addIntimacy(idA, idB, amount) {
    if (!idA || !idB || idA === idB || amount === 0) return 0;
    const key = [idA, idB].sort().join('|');
    const prev = this.relations[key] || 0;
    const next = Math.min(100, Math.max(0, prev + amount));
    this.relations[key] = next;

    if (next >= 25 && !this.bondsAnnounced[key]) {
      this.bondsAnnounced[key] = true;
      const hA = this.heroes.find((h) => h.id === idA);
      const hB = this.heroes.find((h) => h.id === idB);
      if (hA && hB) {
        showSystemMessage(`${hA.name.toUpperCase()} AND ${hB.name.toUpperCase()} FORMED A BOND`);
      }
    }
    this.saveToLocalStorage();
    return next;
  }

  get dayPhase() {
    const cycle = 480;
    const t = ((this.dayTimer % cycle) + cycle) % cycle;
    return t / cycle;
  }

  setDayPhase(phase) {
    const cycle = 480;
    const p = ((phase % 1) + 1) % 1;
    this.dayTimer = p * cycle;
  }

  tickDay(delta) {
    if (this.dayPaused) return;
    const cycle = 480;
    const prevPhase = this.dayPhase;
    this.dayTimer = (this.dayTimer || 0) + delta;
    const newPhase = this.dayPhase;
    if (prevPhase < 0.97 && newPhase >= 0.97) {
      this.startNewDay();
    }
    if (this.dayTimer >= cycle) {
      this.dayTimer %= cycle;
    }
  }

  startNewDay() {
    this.dayCount = (this.dayCount || 1) + 1;

    let costPerHero = this.foodQuality === 'feast' ? 40 : this.foodQuality === 'good' ? 15 : 0;
    const aliveCount = this.heroes.filter((h) => h.alive).length;
    let totalCost = costPerHero * aliveCount;

    if (this.gold < totalCost) {
      this.foodQuality = 'basic';
      costPerHero = 0;
      totalCost = 0;
      showSystemMessage('[NOT ENOUGH GOLD FOR MEALS. FELL BACK TO BASIC RATIONS.]');
    } else if (totalCost > 0) {
      this.gold -= totalCost;
    }

    const targetMap = { basic: 40, good: 65, feast: 85 };
    const baseTarget = targetMap[this.foodQuality] || 40;

    for (const hero of this.heroes) {
      if (!hero.alive) continue;
      let target = baseTarget;
      if (hero.traits?.includes('picky')) target -= 20;
      const fx = getSkillEffects(hero);
      if (fx.foodTolerance) target += fx.foodTolerance;
      target = Math.min(100, Math.max(0, target));
      hero.satisfaction = target;

      if (hero.satisfaction < 35) {
        this.addStress(hero, 5);
        showHeroReport(`${hero.name} (${hero.star}★) is discontent about the food.`, 'severe');
      } else if (hero.satisfaction > 85 && Math.random() < 0.10) {
        this.addStress(hero, -5);
        showHeroReport(`${hero.name} (${hero.star}★) is satisfied with the meals.`, 'low');
      }
    }

    // Intimacy +1/day sharing house
    for (let house = 1; house <= 10; house++) {
      const roommates = this.heroes.filter((h) => h.houseIndex === house && h.alive);
      if (roommates.length === 2) {
        this.addIntimacy(roommates[0].id, roommates[1].id, 1);
      }
    }

    showSystemMessage('DAILY NECESSITIES AND FOOD HAVE BEEN REFILLED.');
    this.saveToLocalStorage();
  }

  unlockFacility(id, cost = 0) {
    if (this.facilities[id]) {
      if (cost > 0) {
        if (this.gold < cost) return false;
        this.gold -= cost;
      }
      this.facilities[id].unlocked = true;
      this.saveToLocalStorage();
      return true;
    }
    return false;
  }

  isFacilityUnlocked(id) {
    return !!(this.facilities[id] && this.facilities[id].unlocked);
  }

  getFacilityList() {
    return Object.entries(this.facilities).map(([key, data]) => ({
      id: key,
      ...data,
    }));
  }

  addHero(hero) {
    if (!hero.id) {
      hero.id = 'hero_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
    }
    hero.alive = true;
    if (hero.fatigue === undefined) hero.fatigue = 0;
    if (hero.stress === undefined) hero.stress = 0;
    if (hero.exp === undefined) hero.exp = 0;
    if (hero.level === undefined) hero.level = 1;
    if (hero.satisfaction === undefined) hero.satisfaction = 50;
    if (!hero.traits) {
      hero.traits = Math.random() < 0.20 ? ['picky'] : [];
    }
    if (!hero.potentials) {
      hero.potentials = rollHeroPotentials(hero);
    }
    if (hero.hiddenTalents === undefined) {
      const ht = rollHiddenTalents(hero);
      hero.hiddenTalents = ht.hiddenTalents;
      hero.talentsRevealed = ht.talentsRevealed;
    }
    if (!hero.motivation) hero.motivation = rollMotivation(hero.name, hero.cooperation);
    if (!hero.look) hero.look = generateLook(hero);

    this.heroes.push(hero);
    this.assignHouses();
    if (this.party.length < 5) {
      this.party.push({ id: hero.id, formation: 'front' });
    }
    this.saveToLocalStorage();
    return hero;
  }

  addStress(heroOrId, amount) {
    const hero = typeof heroOrId === 'string' ? this.heroes.find((h) => h.id === heroOrId) : heroOrId;
    if (!hero || hero.id === 'hero_han') return 0;

    // Heroes with Composure talent gain stress at half rate
    const hasComposure =
      (hero.talents || []).some((t) => (t || '').toLowerCase().includes('composure')) ||
      (hero.hiddenTalent || '').toLowerCase().includes('composure');

    let effectiveAmount = amount;
    if (amount > 0 && hasComposure) {
      effectiveAmount = Math.round(amount * 0.5);
    }

    const prevStress = hero.stress || 0;
    hero.stress = Math.min(100, Math.max(0, prevStress + effectiveAmount));

    // Severe stress warning at 80
    if (hero.stress >= 80 && !hero.severeStressWarned) {
      hero.severeStressWarned = true;
      showSystemMessage(`[${hero.name} is under severe stress]`);
    } else if (hero.stress < 80) {
      hero.severeStressWarned = false;
    }

    return hero.stress - prevStress;
  }

  killHero(id, floor = 1, deathCause = null) {
    if (id === 'hero_han') return; // Han can never be deleted from the save
    const idx = this.heroes.findIndex((h) => h.id === id);
    if (idx !== -1) {
      const hero = this.heroes[idx];
      hero.alive = false;
      hero.deathFloor = floor;
      hero.deathCause = deathCause || hero.deathCause || 'Killed in battle';
      this.heroes.splice(idx, 1);
      this.party = this.party.filter((p) => (typeof p === 'string' ? p : p.id) !== id);
      this.deadHeroes.push(hero);
      this.saveToLocalStorage();
    }
  }

  isInParty(heroId) {
    return this.party.some((p) => (typeof p === 'string' ? p : p.id) === heroId);
  }

  getPartySlot(heroId) {
    const idx = this.party.findIndex((p) => (typeof p === 'string' ? p : p.id) === heroId);
    return idx === -1 ? null : idx + 1;
  }

  getPartyFormation(heroId) {
    const item = this.party.find((p) => (typeof p === 'string' ? p : p.id) === heroId);
    if (!item || typeof item === 'string') return 'front';
    return item.formation || 'front';
  }

  setPartyFormation(heroId, formation) {
    const item = this.party.find((p) => (typeof p === 'string' ? p : p.id) === heroId);
    if (item) {
      if (typeof item === 'object') {
        item.formation = formation;
      }
      this.saveToLocalStorage();
    }
  }

  addToParty(heroId, formation = 'front') {
    if (this.isInParty(heroId)) return false;
    if (this.party.length >= 5) return false;
    this.party.push({ id: heroId, formation });
    this.saveToLocalStorage();
    return true;
  }

  removeFromParty(heroId) {
    if (heroId === 'hero_han') return false; // Han can never be removed from party
    this.party = this.party.filter((p) => (typeof p === 'string' ? p : p.id) !== heroId);
    this.saveToLocalStorage();
    return true;
  }

  setParty(partyArray) {
    const clean = [];
    clean.push({ id: 'hero_han', formation: 'front' });
    for (const item of partyArray) {
      const id = typeof item === 'string' ? item : item.id;
      const formation = typeof item === 'string' ? 'front' : (item.formation || 'front');
      if (id !== 'hero_han' && this.heroes.some((h) => h.id === id)) {
        if (clean.length < 5 && !clean.some((c) => c.id === id)) {
          clean.push({ id, formation });
        }
      }
    }
    this.party = clean;
    this.saveToLocalStorage();
  }

  addExp(heroId, amount) {
    const hero = this.heroes.find((h) => h.id === heroId);
    if (!hero) return;

    const maxLevel = hero.star * LEVEL_CAP_PER_STAR;
    if (hero.level >= maxLevel) {
      hero.exp = 0;
      this.saveToLocalStorage();
      return;
    }

    let remainingXp = amount;
    while (remainingXp > 0 && hero.level < maxLevel) {
      const neededForNext = getXpForLevel(hero.level);
      const toLevelUp = neededForNext - hero.exp;

      if (remainingXp >= toLevelUp) {
        remainingXp -= toLevelUp;
        hero.level += 1;
        hero.exp = 0;

        // Stat growth: +1 to two random stats, weighted toward class, scaled by potential
        const pool = getWeightedStatsForClass(hero.class);
        const stat1 = pool[Math.floor(Math.random() * pool.length)];
        const stat2 = pool[Math.floor(Math.random() * pool.length)];
        const pot1 = (hero.potentials && hero.potentials[stat1]) || 1.0;
        const pot2 = (hero.potentials && hero.potentials[stat2]) || 1.0;
        const gain1 = Math.floor(pot1) + (Math.random() < (pot1 % 1) ? 1 : 0);
        const gain2 = Math.floor(pot2) + (Math.random() < (pot2 % 1) ? 1 : 0);
        hero.stats[stat1] = (hero.stats[stat1] || 0) + gain1;
        hero.stats[stat2] = (hero.stats[stat2] || 0) + gain2;
        this.checkTalentReveal(hero);

        showSystemMessage(`[${hero.name} reached level ${hero.level}!]`);
      } else {
        hero.exp += remainingXp;
        remainingXp = 0;
      }
    }

    if (hero.level >= maxLevel) {
      hero.exp = 0; // Overflow wasted at level cap
    }

    this.saveToLocalStorage();
  }

  promoteHero(heroId) {
    const hero = this.heroes.find((h) => h.id === heroId);
    if (!hero) return { error: 'Hero not found' };

    const cap = hero.star * LEVEL_CAP_PER_STAR;
    if (hero.level < cap) return { error: `Hero must be at level cap (${cap})` };
    if (hero.star >= 6) return { error: 'Hero already at natural max star (6★)' };

    const cost = getPromotionCost(hero.star);
    if (this.gems < cost) return { error: `Need ${cost} gems (have ${this.gems})` };

    this.gems -= cost;
    hero.star += 1;
    for (const key of ['str', 'agi', 'vit', 'int', 'wil']) {
      hero.stats[key] = (hero.stats[key] || 0) + 2;
    }

    // Special Han rule: unlocks Composure at 2 stars
    let unlockedTalent = null;
    if (hero.id === 'hero_han' && hero.star === 2) {
      if (!hero.talents.includes('composure')) {
        hero.talents.push('composure');
        unlockedTalent = 'Composure';
      }
    }

    this.saveToLocalStorage();
    return { success: true, hero, newStar: hero.star, unlockedTalent };
  }

  synthesizeHeroes(baseHeroId, materialHeroIds) {
    const baseHero = this.heroes.find((h) => h.id === baseHeroId);
    if (!baseHero) return { error: 'Base hero not found' };

    if (!materialHeroIds || materialHeroIds.length === 0) {
      return { error: 'No material heroes selected' };
    }

    // Verify materials
    const materials = [];
    for (const id of materialHeroIds) {
      if (id === 'hero_han') return { error: 'Han can never be used as synthesis material' };
      if (id === baseHeroId) return { error: 'Base hero cannot be its own material' };
      const mat = this.heroes.find((h) => h.id === id);
      if (!mat) return { error: `Material hero not found: ${id}` };
      materials.push(mat);
    }

    // Calculate EXP
    let totalExp = 0;
    for (const mat of materials) {
      totalExp += getSynthesisXp(mat.star, mat.level || 1);
    }

    // Roll skill inheritances
    const inheritedSkills = [];
    for (const mat of materials) {
      const chance = getSkillInheritChance(mat.star);
      for (const skill of mat.skills || []) {
        if (Math.random() < chance) {
          const existing = (baseHero.skills || []).find((s) => s.id === skill.id);
          if (!existing) {
            baseHero.skills = baseHero.skills || [];
            baseHero.skills.push({ id: skill.id, name: skill.name, level: 1, exp: 0 });
            inheritedSkills.push({ name: skill.name, level: 1, isNew: true });
          } else if (existing.level < 10) {
            existing.level = Math.min(10, existing.level + 1);
            inheritedSkills.push({ name: skill.name, level: existing.level, isNew: false });
          }
        }
      }
    }

    // Delete materials from heroes and party
    const matIdSet = new Set(materialHeroIds);
    this.heroes = this.heroes.filter((h) => !matIdSet.has(h.id));
    this.party = this.party.filter((p) => !matIdSet.has(typeof p === 'string' ? p : p.id));
    this.dissolvedHeroes = (this.dissolvedHeroes || 0) + materials.length;

    // Apply EXP
    this.addExp(baseHero.id, totalExp);
    this.saveToLocalStorage();

    return { success: true, baseHero, totalExp, inheritedSkills };
  }

  addMaterial(matId, count = 1) {
    if (!this.materials) this.materials = createInitialMaterials();
    this.materials[matId] = (this.materials[matId] || 0) + count;
    this.saveToLocalStorage();
  }

  hasMaterials(costMap) {
    if (!costMap) return true;
    for (const [matId, needed] of Object.entries(costMap)) {
      if ((this.materials[matId] || 0) < needed) return false;
    }
    return true;
  }

  consumeMaterials(costMap) {
    if (!this.hasMaterials(costMap)) return false;
    for (const [matId, needed] of Object.entries(costMap)) {
      this.materials[matId] = Math.max(0, (this.materials[matId] || 0) - needed);
    }
    this.saveToLocalStorage();
    return true;
  }

  addItemToInventory(item) {
    if (!this.inventory) this.inventory = [];
    if (this.inventory.length >= MAX_INVENTORY_CAPACITY) {
      return false;
    }
    this.inventory.push(item);
    this.saveToLocalStorage();
    return true;
  }

  removeItemFromInventory(itemId) {
    if (!this.inventory) return null;
    const idx = this.inventory.findIndex((i) => i.id === itemId);
    if (idx !== -1) {
      const item = this.inventory.splice(idx, 1)[0];
      this.saveToLocalStorage();
      return item;
    }
    return null;
  }

  startForge(recipeId) {
    const recipe = FORGE_RECIPES.find((r) => r.id === recipeId);
    if (!recipe) return { error: 'Unknown forge recipe' };

    if (this.gold < recipe.goldCost) {
      return { error: `Not enough gold (requires ${recipe.goldCost}G)` };
    }

    if (!this.hasMaterials(recipe.materials)) {
      return { error: 'Missing required crafting materials' };
    }

    // Deduct cost
    this.gold -= recipe.goldCost;
    this.consumeMaterials(recipe.materials);

    // Compute quality
    const bestSmith = getBestSmith(this.heroes);
    const forgeQuality = bestSmith ? bestSmith.forgeQuality : 0;
    const isFine = Math.random() < 0.05; // 5% chance of Fine quality

    let resultItem = null;
    if (recipe.isMaterialResult) {
      resultItem = { isMaterial: true, materialId: recipe.resultMaterialId, count: 1 };
    } else {
      const tpl = ITEM_TEMPLATES[recipe.resultTemplateId];
      const maxDura = tpl.maxDurability;
      const initialDura = Math.max(5, Math.round(maxDura * (0.9 + forgeQuality)));
      const damageMult = isFine ? Math.round(tpl.damageMult * 1.1 * 100) / 100 : tpl.damageMult;
      const defense = isFine ? Math.round(tpl.defense * 1.1) : tpl.defense;
      const name = isFine ? `Fine ${tpl.name}` : tpl.name;

      resultItem = createItemInstance(recipe.resultTemplateId, {
        name,
        durability: initialDura,
        damageMult,
        defense,
        quality: isFine ? 'Fine' : 'Standard',
        source: 'forge',
      });
    }

    const job = {
      id: `forge_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      recipeId: recipe.id,
      recipeName: recipe.name,
      resultItem,
      progress: 0,
      duration: 20, // 20 real seconds
      isFine,
    };

    if (!this.forgeQueue) this.forgeQueue = [];
    this.forgeQueue.push(job);
    this.saveToLocalStorage();

    return { success: true, job };
  }

  updateForge(delta) {
    if (!this.forgeQueue || this.forgeQueue.length === 0) return [];
    const completed = [];

    for (let i = this.forgeQueue.length - 1; i >= 0; i--) {
      const job = this.forgeQueue[i];
      job.progress = (job.progress || 0) + delta;
      if (job.progress >= (job.duration || 20)) {
        this.forgeQueue.splice(i, 1);
        if (job.resultItem?.isMaterial) {
          this.addMaterial(job.resultItem.materialId, job.resultItem.count || 1);
          showSystemMessage(`[Forge Complete: ${job.recipeName} created!]`);
        } else if (job.resultItem) {
          this.addItemToInventory(job.resultItem);
          const fineTag = job.isFine ? ' (★ FINE QUALITY!)' : '';
          showSystemMessage(`[Forge Complete: ${job.resultItem.name} added to inventory!${fineTag}]`);
        }
        completed.push(job);
      }
    }

    if (completed.length > 0) {
      this.saveToLocalStorage();
    }
    return completed;
  }

  awakenHero(heroId) {
    const hero = this.heroes.find((h) => h.id === heroId);
    if (!hero) return { error: 'Hero not found' };
    if (hero.star < 6) return { error: 'Hero must be 6 stars to awaken' };
    if (hero.star >= 7) return { error: 'Hero already awakened to 7 stars' };
    if (hero.level < 60) return { error: 'Hero must be at level cap (Lv 60)' };
    if ((this.materials.awakening_stone || 0) < 1) return { error: 'Requires 1 Awakening Stone' };
    if (this.gems < 2000) return { error: 'Requires 2000 Gems' };

    this.materials.awakening_stone -= 1;
    this.gems -= 2000;
    hero.star = 7;
    hero.isAwakened = true;

    for (const key of ['str', 'agi', 'vit', 'int', 'wil']) {
      hero.stats[key] = (hero.stats[key] || 0) + 5;
    }

    hero.talents = hero.talents || [];
    if (!hero.talents.some((t) => (t || '').toLowerCase() === 'transcendence')) {
      hero.talents.push('transcendence');
    }

    this.saveToLocalStorage();
    return { success: true, hero };
  }

  saveToLocalStorage() {
    try {
      const data = {
        masterName: this.masterName,
        gold: this.gold,
        gems: this.gems,
        freeTickets: this.freeTickets,
        premiumSummons: this.premiumSummons,
        heroes: this.heroes,
        party: this.party,
        currentFloor: this.currentFloor,
        clearedFloors: this.clearedFloors,
        deadHeroes: this.deadHeroes,
        dissolvedHeroes: this.dissolvedHeroes,
        trainingSlots: this.trainingSlots,
        facilities: this.facilities,
        inventory: this.inventory,
        materials: this.materials,
        forgeQueue: this.forgeQueue,
        flags: this.flags,
        dayCount: this.dayCount,
        dayTimer: this.dayTimer,
        foodQuality: this.foodQuality,
        relations: this.relations,
        bondsAnnounced: this.bondsAnnounced,
        settings: this.settings,
      };
      if (typeof localStorage === 'undefined') return;
      localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    } catch (e) {
      console.warn('Could not save to localStorage:', e);
    }
  }

  loadFromLocalStorage() {
    try {
      if (typeof localStorage === 'undefined') return false;
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return false;
      const data = JSON.parse(raw);

      this.masterName = data.masterName !== undefined ? data.masterName : 'Master';
      this.gold = data.gold ?? 1000;
      this.gems = data.gems ?? 0;
      this.freeTickets = data.freeTickets ?? 0;
      this.premiumSummons = data.premiumSummons ?? 0;
      this.currentFloor = data.currentFloor ?? 1;
      this.clearedFloors = data.clearedFloors ?? 0;
      this.deadHeroes = data.deadHeroes ?? [];
      this.dissolvedHeroes = data.dissolvedHeroes ?? 0;
      this.trainingSlots = data.trainingSlots || [null, null, null];
      this.inventory = data.inventory || [];
      this.materials = { ...createInitialMaterials(), ...(data.materials || {}) };
      if (data.materials && data.materials.leather_scrap !== undefined) {
        this.materials.leather = (this.materials.leather || 0) + data.materials.leather_scrap;
        delete this.materials.leather_scrap;
      }
      this.forgeQueue = data.forgeQueue || [];
      this.flags = { tutorialDone: false, tutorialSeen: false, heroDiedReactionPlayed: false, ...(data.flags || {}) };

      this.dayCount = data.dayCount ?? 1;
      this.dayTimer = data.dayTimer ?? 0;
      this.foodQuality = data.foodQuality ?? 'basic';
      this.relations = {
        'hero_han|hero_jenna': 25,
        'hero_aaron|hero_han': 25,
        'hero_aaron|hero_jenna': 25,
        ...(data.relations || {}),
      };
      this.bondsAnnounced = data.bondsAnnounced || {};
      this.settings = { quality: 'medium', resolutionScale: 1, showFps: true, ...(data.settings || {}) };

      // Safe migration for facilities
      if (data.facilities) {
        this.facilities = { ...this.facilities, ...data.facilities };
      }

      // Safe migration for heroes
      this.heroes = (data.heroes || []).map((h) => {
        const lvl = h.level ?? 1;
        const maxExp = getXpForLevel(lvl);
        const potentials = h.potentials || rollHeroPotentials(h);
        let hiddenTalents = h.hiddenTalents;
        let talentsRevealed = h.talentsRevealed;
        if (hiddenTalents === undefined) {
          const ht = rollHiddenTalents(h);
          hiddenTalents = ht.hiddenTalents;
          talentsRevealed = ht.talentsRevealed;
        }
        return {
          ...h,
          stress: h.stress ?? 0,
          fatigue: h.fatigue ?? 0,
          satisfaction: h.satisfaction ?? 50,
          traits: h.traits || (Math.random() < 0.20 ? ['picky'] : []),
          potentials,
          hiddenTalents,
          talentsRevealed: talentsRevealed ?? (h.star >= 3),
          exp: Math.min(h.exp ?? 0, maxExp),
          level: lvl,
          skills: (h.skills || []).map((s) =>
            typeof s === 'string'
              ? { id: s, name: s, level: 1, exp: 0 }
              : { ...s, exp: s.exp ?? 0 }
          ),
          motivation: h.id === 'hero_han' ? 'diligent' : (h.motivation || rollMotivation(h.name, h.cooperation)),
          talents: h.talents || [],
          equipment: h.equipment || { weapon: null, offhand: null, armor: null },
          look: h.look || generateLook(h),
        };
      });
      this.assignHouses();

      // Safe migration for Han Islat
      const han = this.heroes.find((h) => h.id === 'hero_han');
      if (han) {
        han.class = 'Vanguard';
        if (han.star === 1) {
          han.talents = (han.talents || []).filter(
            (t) =>
              t.toLowerCase() !== 'composure' &&
              t.toLowerCase() !== 'master_experience' &&
              t.toLowerCase() !== 'master experience'
          );
          if (han.level === 1) {
            han.stats = { str: 7, agi: 7, vit: 8, int: 5, wil: 12 };
          }
        }
        if (!han.equipment || !han.equipment.weapon) {
          han.equipment = {
            weapon: createItemInstance('rusty_sword', { source: 'starter' }),
            offhand: createItemInstance('wooden_shield', { source: 'starter' }),
            armor: null,
            ...(han.equipment || {}),
          };
        }
      }

      // Safe migration for other heroes' initial equipment
      const jenna = this.heroes.find((h) => h.id === 'hero_jenna');
      if (jenna && (!jenna.equipment || !jenna.equipment.weapon)) {
        jenna.equipment = {
          weapon: createItemInstance('hunting_bow', { source: 'starter' }),
          offhand: createItemInstance('short_dagger', { source: 'starter' }),
          armor: createItemInstance('leather_armor', { source: 'starter' }),
          ...(jenna.equipment || {}),
        };
      }

      const aaron = this.heroes.find((h) => h.id === 'hero_aaron');
      if (aaron && (!aaron.equipment || !aaron.equipment.weapon)) {
        aaron.equipment = {
          weapon: createItemInstance('iron_spear', { source: 'starter' }),
          offhand: null,
          armor: createItemInstance('chain_armor', { source: 'starter' }),
          ...(aaron.equipment || {}),
        };
      }

      // Safe migration for party
      if (data.party && Array.isArray(data.party)) {
        this.party = data.party.map((p) =>
          typeof p === 'string' ? { id: p, formation: 'front' } : p
        );
      } else {
        this.party = this.heroes.length > 0 ? [{ id: this.heroes[0].id, formation: 'front' }] : [];
      }
      // Safe migration for duplicate hero names
      const seenNames = new Set();
      const romanNumerals = ['II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];
      const dedupeList = (list) => {
        for (const h of list) {
          if (!h.name) continue;
          if (seenNames.has(h.name)) {
            for (const r of romanNumerals) {
              const candidate = `${h.name} ${r}`;
              if (!seenNames.has(candidate)) {
                h.name = candidate;
                break;
              }
            }
          }
          seenNames.add(h.name);
        }
      };
      dedupeList(this.heroes);
      dedupeList(this.deadHeroes);

      return true;
    } catch (e) {
      console.warn('Could not load from localStorage:', e);
      return false;
    }
  }
}

export const gameState = new GameState();
