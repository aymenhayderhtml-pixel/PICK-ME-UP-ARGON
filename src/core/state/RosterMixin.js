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


export const RosterMixin = (Base) => class extends Base {
  getControlledHero() {
    const byId = this.heroes?.find((h) => h.id === this.controlledHeroId);
    if (byId) return byId;
    const han = this.heroes?.find((h) => h.id === 'hero_han');
    return han || this.heroes?.[0] || null;
  }

  /**
   * Switches the hero the player controls in the world.
   */
  setControlledHero(heroId) {
    const hero = this.heroes?.find((h) => h.id === heroId);
    if (!hero) return false;
    this.controlledHeroId = hero.id;
    this.saveToLocalStorage();
    return true;
  }

  setPlayerClass(className) {
    const valid = ['Vanguard', 'Mage', 'Archer'];
    const matched = valid.find((c) => c.toLowerCase() === (className || '').toLowerCase()) || 'Vanguard';
    this.playerClass = matched;

    const han = this.heroes?.find((h) => h.id === 'hero_han');
    if (han) {
      const profileKey = matched === 'Mage' ? 'mage' : matched === 'Archer' ? 'archer' : 'vanguard';
      const profile = getHeroClassProfile({ class: profileKey });

      han.class = matched;
      han.weapon = profile
        ? (profile.defaultOffhandType === 'shield'
            ? `${profile.defaultWeaponType}+shield`
            : profile.defaultWeaponType)
        : 'sword+shield';
      if (matched === 'Mage') {
        han.stats.int = Math.max(han.stats.int || 5, 16);
      } else if (matched === 'Archer') {
        han.stats.agi = Math.max(han.stats.agi || 7, 14);
      }

      han.equipment = han.equipment || { weapon: null, offhand: null, armor: null };
      if (profile) {
        han.equipment.weapon = createItemInstance(profile.defaultWeapon, { source: 'starter', grade: 'D' });
        han.equipment.offhand = profile.defaultOffhand
          ? createItemInstance(profile.defaultOffhand, { source: 'starter', grade: 'D' })
          : null;
      }
    }

    // Starting consumables follow the chosen class.
    if (matched === 'Mage') {
      this.manaPotions = 3;
    } else if (matched === 'Archer') {
      this.arrows = 20;
    }

    // The world models, controls and HUD follow the class change immediately.
    if (han) emitEquipmentChanged(han, 'weapon');

    this.saveToLocalStorage();
    return matched;
  }

  /**
   * One-time migration: repairs heroes whose equipped weapon does not match
   * their class (e.g. a Mage holding a sword and shield).
   */
  runLoadoutMigration() {
    let changed = 0;
    for (const hero of this.heroes || []) {
      if (reconcileHeroLoadout(hero, this.inventory)) changed++;
    }
    return changed;
  }

  assignHouses() {
    this.heroes.forEach((h, idx) => {
      h.houseIndex = Math.min(10, Math.floor(idx / 2) + 1);
    });
  }

  // -------------------------------------------------------------------------
  // Emotion / training system
  // -------------------------------------------------------------------------

  /**
   * Ensures a hero carries every emotion / training field with a sane default.
   * `rawHero` is the pre-migration object, used to seed hunger from the legacy
   * satisfaction value before the legacy default is applied.
   */
  normalizeHeroEmotionFields(hero, rawHero = hero) {
    return normalizeHeroEmotionFields(hero, rawHero);
  }

  /**
   * One-time migration: the three training XP paths are merged into one
   * (src/core/TrainingEngine.js awardLiveTrainingTickXp). The manual
   * Training Window stays as a skill-pin override.
   *
   * A training slot whose hero no longer exists is cleared. A slot whose
   * skill the hero does not know yet is granted to the hero.
   */
  migrateTrainingXpV1() {
    this.trainingSlots = this.trainingSlots || [null, null, null];
    for (let i = 0; i < this.trainingSlots.length; i++) {
      const slot = this.trainingSlots[i];
      if (!slot) continue;
      const hero = this.heroes.find((h) => h.id === slot.heroId);
      if (!hero || !hero.alive) {
        this.trainingSlots[i] = null;
        continue;
      }
      if (!slot.skillId) continue;
      const known = (hero.skills || []).some(
        (s) => (typeof s === 'string' ? s : s.id || s.name) === slot.skillId
      );
      if (!known) {
        hero.skills = hero.skills || [];
        const def = getSkill(slot.skillId);
        hero.skills.push({
          id: slot.skillId,
          name: def ? def.name : slot.skillId,
          level: 1,
          exp: 0,
        });
      }
    }
  }

  /**
   * Ensures exactly one alive hero is the Squad Leader. Han Islat wins by
   * default; otherwise the first alive hero takes the role. Safe on an empty
   * roster.
   */
  ensureSquadLeader() {
    const alive = (this.heroes || []).filter((h) => h.alive);
    if (alive.length === 0) {
      for (const h of this.heroes || []) h.isSquadLeader = false;
      return null;
    }
    const current = alive.find((h) => h.isSquadLeader === true);
    if (current) {
      for (const h of this.heroes || []) {
        if (h !== current) h.isSquadLeader = false;
      }
      return current;
    }
    const han = alive.find((h) => h.id === 'hero_han');
    const leader = han || alive[0];
    for (const h of this.heroes || []) {
      h.isSquadLeader = h === leader;
    }
    return leader;
  }

  /** Current tension (0..100) between two heroes. */
  getTension(idA, idB) {
    if (!idA || !idB || idA === idB) return 0;
    const key = [idA, idB].sort().join('|');
    return this.tensions[key] || 0;
  }

  /** Adds to the tension between two heroes and returns the new value. */
  addTension(idA, idB, amount) {
    if (!idA || !idB || idA === idB || !amount) return 0;
    const key = [idA, idB].sort().join('|');
    const prev = this.tensions[key] || 0;
    const next = Math.min(100, Math.max(0, prev + amount));
    this.tensions[key] = next;
    this.saveToLocalStorage();
    return next;
  }

  /**
   * The full relationship picture between two heroes: how close they are
   * (intimacy) and how much friction they have (tension).
   */
  getPairRelationship(idA, idB) {
    const intimacy = this.getRelation(idA, idB);
    const tension = this.getTension(idA, idB);
    return {
      intimacy,
      tension,
      isRival: tension >= EMOTION_CONFIG.FIGHT_TENSION_THRESHOLD || intimacy < EMOTION_CONFIG.FIGHT_LOW_RELATION_THRESHOLD,
    };
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

    // The daily emotion tick and the daily decision.
    // THIS IS THE SAME CODE PATH the offline login simulation uses, so a hero
    // behaves identically whether the player is watching or away.
    // The fights are only PAIRED here: the live town plays them out in 3D
    // with the same fight engine (src/core/TrainingEngine.js).
    const dayReport = simulateGameDay(this, {
      mode: 'live',
      rng: Math.random,
      isellePresent: true,
      resolveFights: false,
    });
    this.lastDayReport = dayReport;

    // Heroes who are still hungry after today's decisions complain about it.
    for (const hero of this.heroes) {
      if (!hero.alive) continue;
      if ((hero.satisfaction ?? 100) < 35) {
        if (hasTrait(hero, EMOTION_CONFIG.FOOD_COMPLAINT_TRAITS)) {
          // The manhua's potato grumble.
          showHeroReport(
            `${hero.name} (${hero.star}★) ${EMOTION_CONFIG.FOOD_COMPLAINT_TEXT}`,
            'severe'
          );
        } else {
          showHeroReport(`${hero.name} (${hero.star}★) is discontent about the food.`, 'severe');
        }
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
    return dayReport;
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
    this.normalizeHeroEmotionFields(hero);

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

    // Anger is the source of truth; the legacy `stress` field mirrors it.
    const prevStress = hero.anger ?? hero.stress ?? 0;
    hero.anger = Math.min(100, Math.max(0, prevStress + effectiveAmount));
    hero.stress = hero.anger;

    // Severe stress warning at 80
    if (hero.stress >= 80 && !hero.severeStressWarned) {
      hero.severeStressWarned = true;
      showSystemMessage(`[${hero.name} is under severe stress]`);
    } else if (hero.stress < 80) {
      hero.severeStressWarned = false;
    }

    return hero.stress - prevStress;
  }

};
