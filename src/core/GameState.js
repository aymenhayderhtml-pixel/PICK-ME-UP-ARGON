import { getXpForLevel, LEVEL_CAP_PER_STAR, getPromotionCost, getSynthesisXp, getSkillInheritChance } from '../data/rules.js';
import { showSystemMessage } from '../ui/Hud.js';
import { createInitialMaterials } from '../data/materials.js';
import { createItemInstance, FORGE_RECIPES, ITEM_TEMPLATES } from '../data/items.js';
import { getBestSmith, MAX_INVENTORY_CAPACITY } from './Inventory.js';
import { generateNoviceHero, rollMotivation, normalizeHeroEmotionFields, getWeightedStatsForClass, UNNAMED_MEN_RECRUITS } from '../data/heroes.js';
import { EMOTION_CONFIG } from '../data/emotions.config.js';
import { getSkill, getSkillEffects } from '../data/skills.js';
import { simulateGameDay } from './DailyDecisionEngine.js';
import { hasTrait } from './EmotionEngine.js';
import { showHeroReport } from '../ui/HeroReport.js';
import { generateLook } from '../art/looks.js';
import { getHeroClassProfile, reconcileHeroLoadout } from './loadout.js';
import { emitEquipmentChanged } from './equipmentEvents.js';
export function rollHeroPotentials(hero) {
  const isHighTier = (hero.star >= 3) || hero.id === 'hero_han' || hero.id === 'hero_jenna' || hero.id === 'hero_aaron';
  const min = isHighTier ? 1.0 : 0.75;
  const max = isHighTier ? 1.4 : 1.35;
  const roll = () => Math.round((min + Math.random() * (max - min)) * 100) / 100;
  return { str: roll(), agi: roll(), vit: roll(), int: roll(), wil: roll() };
}
import { RosterMixin } from './state/RosterMixin.js';
import { SaveLoadMixin } from './state/SaveLoadMixin.js';
import { SettingsMixin } from './state/SettingsMixin.js';

export class GameState extends SettingsMixin(SaveLoadMixin(RosterMixin(Object))) {
  get party() {
    if (!this.parties || !this.parties.length) this.parties = [[], []];
    if (this.activePartyIndex === undefined || this.activePartyIndex === null) this.activePartyIndex = 0;
    if (!this.parties[this.activePartyIndex]) this.parties[this.activePartyIndex] = [];
    return this.parties[this.activePartyIndex];
  }
  set party(value) {
    if (!this.parties || !this.parties.length) this.parties = [[], []];
    if (this.activePartyIndex === undefined || this.activePartyIndex === null) this.activePartyIndex = 0;
    if (!this.parties[this.activePartyIndex]) this.parties[this.activePartyIndex] = [];
    this.parties[this.activePartyIndex] = value;
  }

  constructor() {
    super();
    this.masterName = '';
    this.gold = 50000;
    this.gems = 0;
    this.freeTickets = 0;
    this.premiumSummons = 1;
    this.heroes = [];
    this.parties = [[], []]; // at least 2 parties; active synced to this.party
    this.activePartyIndex = 0;
    this.assignedCookId = null;
    this.party = []; // Array of { id, formation: 'front'|'back' } (synced to active party)
    this.currentFloor = 1;
    this.clearedFloors = 0;
    this.deadHeroes = [];
    this.dissolvedHeroes = 0;
    this.dailyDungeonUnlocked = false;
    this.activeDungeonType = null;
    this.fallenHeroes = [];
    this.trainingSlots = [null, null, null]; // [ { heroId, skillId, tickTimer, animTimer } | null ]
    this.inventory = [];
    this.materials = createInitialMaterials();
    this.forgeQueue = [];
    this.flags = { tutorialDone: false, tutorialStep: 0, heroDiedReactionPlayed: false };
    this.playerClass = 'Vanguard'; // 'Vanguard' | 'Mage' | 'Archer'
    this.controlledHeroId = 'hero_han';
    this.manaPotions = 3;
    this.arrows = 20;
    this.spellMastery = {};

    // Manhua systems: Day cycle, food quality, relations
    this.dayCount = 1;
    this.dayTimer = 0.08 * 480;
    this.dayPaused = false;
    this.settings = {
      quality: 'medium',
      resolutionScale: 1,
      showFps: true,
      controls: { attackButton: 'left', blockButton: 'right' },
      camera: { followSpeed: 'tight', autoTurn: true, distance: 'normal' },
    };
    this.foodQuality = 'basic';
    this.relations = {
      'hero_han|hero_jenna': 25,
      'hero_aaron|hero_han': 25,
      'hero_aaron|hero_jenna': 25,
    };
    this.bondsAnnounced = {};

    // --- Emotion / training system ---------------------------------------
    this.lastLoginTimestamp = Date.now();
    this.tensions = {};              // Record<'idA|idB', number> 0..100
    this.loginReportHistory = [];    // Array<IselleReportModel>, capped at REPORT_HISTORY_MAX
    this.overflowLoot = [];          // ItemInstance[] when the inventory is full on death

    this.facilities = {
      altar: { level: 1, unlocked: true },
      synthesis: { level: 1, unlocked: true },
      dormitory: { level: 1, unlocked: true },
      training: { level: 1, unlocked: true, unlockCost: 200 },
      blacksmith: { level: 1, unlocked: false, unlockedByFloor: 5 },
      cafeteria: { level: 1, unlocked: true, unlockedByFloor: 10 },
      infirmary: { level: 1, unlocked: false, unlockedByFloor: 10 },
    };

    if (!this.loadFromLocalStorage()) {
      this.initNewGame();
    }
  }

  get party() {
    if (!this.parties || !this.parties.length) this.parties = [[], []];
    if (this.activePartyIndex === undefined || this.activePartyIndex === null) this.activePartyIndex = 0;
    if (!this.parties[this.activePartyIndex]) this.parties[this.activePartyIndex] = [];
    return this.parties[this.activePartyIndex];
  }
  set party(value) {
    if (!this.parties || !this.parties.length) this.parties = [[], []];
    if (this.activePartyIndex === undefined || this.activePartyIndex === null) this.activePartyIndex = 0;
    if (!this.parties[this.activePartyIndex]) this.parties[this.activePartyIndex] = [];
    this.parties[this.activePartyIndex] = value;
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
    this.dailyDungeonUnlocked = false;
    this.activeDungeonType = null;
    this.fallenHeroes = [];
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
      training: { level: 1, unlocked: true, unlockCost: 200 },
      blacksmith: { level: 1, unlocked: false, unlockedByFloor: 5 },
      cafeteria: { level: 1, unlocked: true, unlockedByFloor: 10 },
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
    this.lastLoginTimestamp = Date.now();
    this.tensions = {};
    this.loginReportHistory = [];
    this.overflowLoot = [];

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
    this.normalizeHeroEmotionFields(han);

    // In the tutorial at least ONE novice is forced uncooperative
    const heroes = [han];
    const nov1 = generateNoviceHero({ forceUncooperative: true, existingHeroes: heroes });
    nov1.noviceIndex = 1;
    nov1.look = generateLook(nov1);
    nov1.potentials = rollHeroPotentials(nov1);
    const ht1 = rollHiddenTalents(nov1);
    nov1.hiddenTalents = ht1.hiddenTalents;
    nov1.talentsRevealed = ht1.talentsRevealed;
    nov1.traits = [...(nov1.traits || []), ...(Math.random() < 0.20 ? ['picky'] : [])];
    this.normalizeHeroEmotionFields(nov1);
    heroes.push(nov1);

    // The manhua's three "unnamed men": 1-star Commoners. One refuses to
    // fight (coward), one looks for an exit (exit_seeker), one complains
    // about eating only potatoes (food_complainer).
    const nov2 = generateNoviceHero({
      job: UNNAMED_MEN_RECRUITS[0].job,
      heroClass: UNNAMED_MEN_RECRUITS[0].heroClass,
      forceCooperative: true,
      traits: [UNNAMED_MEN_RECRUITS[0].trait],
      existingHeroes: heroes,
    });
    nov2.noviceIndex = 2;
    nov2.look = generateLook(nov2);
    nov2.potentials = rollHeroPotentials(nov2);
    const ht2 = rollHiddenTalents(nov2);
    nov2.hiddenTalents = ht2.hiddenTalents;
    nov2.talentsRevealed = ht2.talentsRevealed;
    nov2.traits = [...(nov2.traits || []), ...(Math.random() < 0.20 ? ['picky'] : [])];
    this.normalizeHeroEmotionFields(nov2);
    heroes.push(nov2);

    const nov3 = generateNoviceHero({
      job: UNNAMED_MEN_RECRUITS[1].job,
      heroClass: UNNAMED_MEN_RECRUITS[1].heroClass,
      forceCooperative: true,
      traits: [UNNAMED_MEN_RECRUITS[1].trait],
      existingHeroes: heroes,
    });
    nov3.noviceIndex = 3;
    nov3.look = generateLook(nov3);
    nov3.potentials = rollHeroPotentials(nov3);
    const ht3 = rollHiddenTalents(nov3);
    nov3.hiddenTalents = ht3.hiddenTalents;
    nov3.talentsRevealed = ht3.talentsRevealed;
    nov3.traits = [...(nov3.traits || []), ...(Math.random() < 0.20 ? ['picky'] : [])];
    this.normalizeHeroEmotionFields(nov3);
    heroes.push(nov3);

    const nov4 = generateNoviceHero({
      job: UNNAMED_MEN_RECRUITS[2].job,
      heroClass: UNNAMED_MEN_RECRUITS[2].heroClass,
      forceCooperative: true,
      traits: [UNNAMED_MEN_RECRUITS[2].trait],
      existingHeroes: heroes,
    });
    nov4.noviceIndex = 4;
    nov4.look = generateLook(nov4);
    nov4.potentials = rollHeroPotentials(nov4);
    const ht4 = rollHiddenTalents(nov4);
    nov4.hiddenTalents = ht4.hiddenTalents;
    nov4.talentsRevealed = ht4.talentsRevealed;
    nov4.traits = [...(nov4.traits || []), ...(Math.random() < 0.20 ? ['picky'] : [])];
    this.normalizeHeroEmotionFields(nov4);
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
    if (!this.parties || this.parties.length < 2) this.parties = [this.party, []];
    else { this.parties[0] = this.party; if (!this.parties[1]) this.parties[1] = []; }
    this.activePartyIndex = 0;
    this.assignedCookId = null;
    this.playerClass = 'Vanguard';
    this.controlledHeroId = 'hero_han';
    this.manaPotions = 3;
    this.arrows = 20;
    this.spellMastery = {};
    this.saveToLocalStorage();
  }

  /**
   * The hero the player currently controls in the world.
   */
  get dayPhase() {
    const cycle = 480;
    const t = ((this.dayTimer % cycle) + cycle) % cycle;
    return t / cycle;
  }

}

export const gameState = new GameState();
