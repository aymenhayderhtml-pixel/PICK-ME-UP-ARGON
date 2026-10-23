import { getXpForLevel, LEVEL_CAP_PER_STAR, getPromotionCost, getSynthesisXp, getSkillInheritChance } from '../../data/rules.js';
import { showSystemMessage } from '../../ui/Hud.js';
import { createInitialMaterials } from '../../data/materials.js';
import { createItemInstance, FORGE_RECIPES, ITEM_TEMPLATES } from '../../data/items.js';
import { getBestSmith, MAX_INVENTORY_CAPACITY } from '../Inventory.js';
import { generateNoviceHero, rollMotivation, normalizeHeroEmotionFields, getWeightedStatsForClass, UNNAMED_MEN_RECRUITS } from '../../data/heroes.js';
import { EMOTION_CONFIG } from '../../data/emotions.config.js';
import { getSkill, getSkillEffects } from '../../data/skills.js';
import { simulateGameDay } from '../DailyDecisionEngine.js';
import { hasTrait } from '../EmotionEngine.js';
import { showHeroReport } from '../../ui/HeroReport.js';
import { generateLook } from '../../art/looks.js';
import { getHeroClassProfile, reconcileHeroLoadout } from '../loadout.js';
import { emitEquipmentChanged } from '../equipmentEvents.js';


const SAVE_KEY = 'pickmeup_save_v1';

export const SettingsMixin = (Base) => class extends Base {
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
        parties: this.parties,
        activePartyIndex: this.activePartyIndex,
        assignedCookId: this.assignedCookId,
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
        lastLoginTimestamp: this.lastLoginTimestamp,
        tensions: this.tensions,
        loginReportHistory: this.loginReportHistory,
        overflowLoot: this.overflowLoot,
        settings: this.settings,
        playerClass: this.playerClass || 'Vanguard',
        controlledHeroId: this.controlledHeroId || 'hero_han',
        manaPotions: this.manaPotions ?? 3,
        arrows: this.arrows ?? 20,
        spellMastery: this.spellMastery || {},
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
      this.dailyDungeonUnlocked = data.dailyDungeonUnlocked ?? (this.clearedFloors >= 5);
      this.activeDungeonType = data.activeDungeonType ?? null;
      this.fallenHeroes = data.fallenHeroes ?? [];
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
      this.tensions = { ...(data.tensions || {}) };
      this.lastLoginTimestamp = data.lastLoginTimestamp ?? Date.now();
      this.loginReportHistory = Array.isArray(data.loginReportHistory) ? data.loginReportHistory : [];
      this.overflowLoot = Array.isArray(data.overflowLoot) ? data.overflowLoot : [];
      this.settings = {
        quality: 'medium',
        resolutionScale: 1,
        showFps: true,
        controls: { attackButton: 'left', blockButton: 'right' },
        camera: { followSpeed: 'tight', autoTurn: true, distance: 'normal' },
        ...(data.settings || {})
      };
      if (!this.settings.controls) {
        this.settings.controls = { attackButton: 'left', blockButton: 'right' };
      }
      if (!this.settings.camera) {
        this.settings.camera = { followSpeed: 'tight', autoTurn: true, distance: 'normal' };
      }

      // Controls migration v1: the canonical layout is LEFT = ATTACK and
      // RIGHT = BLOCK. Older saves stored the mirrored layout, which made the
      // left click do nothing useful.
      if (!this.flags.controlsMigrationV1) {
        this.flags.controlsMigrationV1 = true;
        this.settings.controls = { attackButton: 'left', blockButton: 'right' };
      }

      this.playerClass = data.playerClass || 'Vanguard';
      this.controlledHeroId = data.controlledHeroId || 'hero_han';
      this.manaPotions = data.manaPotions !== undefined ? data.manaPotions : 3;
      this.arrows = data.arrows !== undefined ? data.arrows : 20;
      this.spellMastery = data.spellMastery || {};
      this.assignedCookId = data.assignedCookId || null;
      this.activePartyIndex = (typeof data.activePartyIndex === 'number') ? data.activePartyIndex : 0;
      if (Array.isArray(data.parties) && data.parties.length >= 2) {
        this.parties = data.parties.map((p) => Array.isArray(p) ? p : []);
        if (this.parties.length < 2) while (this.parties.length < 2) this.parties.push([]);
      } else {
        this.parties = [[], []];
      }
      if (!this.parties[0]) this.parties[0] = [];
      if (!this.parties[1]) this.parties[1] = [];

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
        return this.normalizeHeroEmotionFields({
          ...h,
          stress: h.stress ?? 0,
          fatigue: h.fatigue ?? 0,
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
          isFavorite: h.isFavorite === true,
        }, h);
      });
      this.assignHouses();

      // Safe migration for Han Islat
      const han = this.heroes.find((h) => h.id === 'hero_han');
      if (han) {
        // The class is never overwritten: older saves lost the player's class
        // choice, so restore it from the saved player class when possible.
        han.class = han.class || 'Vanguard';
        if ((this.playerClass === 'Mage' || this.playerClass === 'Archer') && han.class === 'Vanguard') {
          han.class = this.playerClass;
          han.weapon = this.playerClass === 'Mage' ? 'staff' : 'bow';
        }
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
          const profile = getHeroClassProfile(han);
          const weaponTemplate = profile ? profile.defaultWeapon : 'rusty_sword';
          const offhandTemplate = profile ? profile.defaultOffhand : 'wooden_shield';
          han.equipment = {
            weapon: createItemInstance(weaponTemplate, { source: 'starter' }),
            offhand: offhandTemplate ? createItemInstance(offhandTemplate, { source: 'starter' }) : null,
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

      // One-time migration: repair heroes whose class and equipped weapon do not
      // match (a Mage holding a sword and shield, a shield held with a staff...).
      if (!this.flags.loadoutMigrationV1) {
        const fixed = this.runLoadoutMigration();
        this.flags.loadoutMigrationV1 = true;
        if (fixed > 0) {
          console.log(`[GameState] Loadout migration repaired ${fixed} hero(s).`);
        }
      }

      // One-time migration: the emotion / training system (Phase 1).
      // Old saves have no mentality, hunger, fear, anger, tensions or squad
      // leader flag; they are seeded from the legacy fields above.
      if (!this.flags.emotionTrainingMigrationV1) {
        this.ensureSquadLeader();
        // The Cafeteria and the Training Grounds are part of the vertical
        // slice from day one.
        if (this.facilities.cafeteria) {
          this.facilities.cafeteria.unlocked = true;
        }
        if (this.facilities.training) {
          this.facilities.training.unlocked = true;
        }
        this.flags.emotionTrainingMigrationV1 = true;
      }

      // One-time migration: the training XP paths are merged into one.
      if (!this.flags.trainingXpMigrationV1) {
        this.migrateTrainingXpV1();
        this.flags.trainingXpMigrationV1 = true;
      }

      // The controlled hero must still exist in the roster.
      if (!this.heroes.some((h) => h.id === this.controlledHeroId)) {
        this.controlledHeroId = 'hero_han';
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
};
