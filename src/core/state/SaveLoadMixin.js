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


export const SaveLoadMixin = (Base) => class extends Base {
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

  isDailyDungeonUnlocked() {
    return !!(this.dailyDungeonUnlocked || (this.clearedFloors || 0) >= 5 || (this.currentFloor || 1) > 5);
  }

  getDailyDungeonForDay(day = this.dayCount) {
    const d = ((Math.max(1, day || 1) - 1) % 7) + 1;
    if (d <= 2) return 'daily_mine';
    if (d <= 4) return 'daily_forest';
    if (d <= 6) return 'daily_plateau';
    return 'all';
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

};
