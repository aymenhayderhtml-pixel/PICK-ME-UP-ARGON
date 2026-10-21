// src/combat/SquadController.js
// Universal Combat Engine Phase 2 - 4-Slot Squad Hero Skill Controller
// Zero allocations: Pre-allocated skill state polling cache for HUD

import { SQUAD_SKILLS_TABLE } from './CombatData.js';
import { combatEvents } from './CombatEvents.js';

export class SquadController {
  constructor() {
    this.skills = SQUAD_SKILLS_TABLE;
    this.heroes = [null, null, null, null]; // Combatant references
    this.cooldowns = [0, 0, 0, 0];
    this.maxCooldowns = [
      this.skills[0].cooldown,
      this.skills[1].cooldown,
      this.skills[2].cooldown,
      this.skills[3].cooldown,
    ];

    // Pre-allocated polling objects for HUD (zero GC)
    this._pollingStateCache = this.skills.map((s, idx) => ({
      slot: idx + 1,
      heroName: s.heroName,
      role: s.role,
      name: s.name,
      spellId: s.spellId,
      ready: true,
      cooldownRemaining: 0.0,
      maxCooldown: s.cooldown,
      cooldownRatio: 0.0,
      manaCost: s.manaCost,
      staminaCost: s.staminaCost,
    }));
  }

  registerHero(slotIndex, combatant) {
    if (slotIndex >= 0 && slotIndex < 4) {
      this.heroes[slotIndex] = combatant;
    }
  }

  update(delta) {
    for (let i = 0; i < 4; i++) {
      if (this.cooldowns[i] > 0) {
        this.cooldowns[i] = Math.max(0, this.cooldowns[i] - delta);
      }
    }
  }

  isReady(slotIndex) {
    if (slotIndex < 0 || slotIndex >= 4) return false;
    if (this.cooldowns[slotIndex] > 0) return false;

    const hero = this.heroes[slotIndex];
    if (hero) {
      if (hero.isDead) return false;
      const skill = this.skills[slotIndex];
      if (skill.manaCost > 0 && hero.mana < skill.manaCost) return false;
      if (skill.staminaCost > 0 && hero.stamina < skill.staminaCost) return false;
    }
    return true;
  }

  triggerSquadSkill(slotIndex, targetPos = null, targetEntity = null) {
    if (!this.isReady(slotIndex)) {
      return false;
    }

    const skill = this.skills[slotIndex];
    const hero = this.heroes[slotIndex];
    this.cooldowns[slotIndex] = this.maxCooldowns[slotIndex];

    if (hero) {
      if (skill.spellId) {
        // Cast signature spell
        hero.castSpell(skill.spellId, targetPos, targetEntity);
      } else {
        // Melee signature skill (e.g. Velkist Heavy Cleave)
        if (targetPos) {
          const dx = targetPos.x - hero.position.x;
          const dz = targetPos.z - hero.position.z;
          hero.facingYaw = Math.atan2(dx, dz);
        }
        hero.stateMachine.transitionTo('ATTACK', { heavy: true });
      }
    }

    combatEvents.emit('onCast', {
      name: `${skill.heroName} (Squad ${slotIndex + 1})`,
      spellId: skill.name,
      slot: slotIndex + 1,
    });

    return true;
  }

  getSkillState(slotIndex) {
    if (slotIndex < 0 || slotIndex >= 4) return null;
    const cache = this._pollingStateCache[slotIndex];
    const rem = this.cooldowns[slotIndex];
    const maxCd = this.maxCooldowns[slotIndex];
    const hero = this.heroes[slotIndex];

    cache.cooldownRemaining = rem;
    cache.cooldownRatio = maxCd > 0 ? (rem / maxCd) : 0.0;
    cache.ready = (rem <= 0) && (!hero || (!hero.isDead && (cache.manaCost === 0 || hero.mana >= cache.manaCost)));

    return cache;
  }
}
