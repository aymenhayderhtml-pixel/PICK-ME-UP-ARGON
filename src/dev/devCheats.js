// src/dev/devCheats.js
// Cheats and developer intervention tools

import * as THREE from 'three';
import { createEnemyCombatant } from './devCombatants.js';

export class DevCheats {
  constructor(lab) {
    this.lab = lab;

    // Toggle flags
    this.godMode = false;
    this.infiniteStamina = false;
    this.infiniteMana = false;
    this.noCooldowns = false;
  }

  toggleGodMode() {
    this.godMode = !this.godMode;
    return this.godMode;
  }

  toggleInfiniteStamina() {
    this.infiniteStamina = !this.infiniteStamina;
    return this.infiniteStamina;
  }

  toggleInfiniteMana() {
    this.infiniteMana = !this.infiniteMana;
    return this.infiniteMana;
  }

  toggleNoCooldowns() {
    this.noCooldowns = !this.noCooldowns;
    return this.noCooldowns;
  }

  killAllEnemies() {
    for (const c of this.lab.combatants) {
      if (c.team === 'enemy' && !c.isDead) {
        c.hp = 0;
        c.isDead = true;
        c._justDied = true;
        if (c.mesh) c.mesh.visible = false;
        c.stateMachine?.transitionTo('DEAD');
      }
    }
    this.lab.damageTextPool?.spawn('ALL ENEMIES KILLED', this.lab.activeHero.position, '#ef4444', true);
  }

  healAll() {
    for (const c of this.lab.combatants) {
      c.hp = c.maxHp;
      c.stamina = c.maxStamina;
      c.mana = c.maxMana;
      c.poise = c.maxPoise;
      c.isDead = false;
      if (c.mesh) c.mesh.visible = true;
      c.statusEffects?.clear();
    }
    this.lab.damageTextPool?.spawn('ALL HEALED', this.lab.activeHero.position, '#22c55e', true);
  }

  spawnEnemyAtCursor(typeKey = 'dummy') {
    const pos = this.lab.groundAimPoint.clone();
    pos.y = 0;
    const enemy = createEnemyCombatant({
      typeKey,
      team: 'enemy',
      position: pos,
      scene: this.lab.arena.scene,
      spellSystem: this.lab.spellSystem,
    });
    this.lab.combatants.push(enemy);
    this.lab.damageTextPool?.spawn(`SPAWNED ${enemy.name}`, pos, '#38bdf8', false);
    return enemy;
  }

  triggerAllEnemiesAttack() {
    for (const c of this.lab.combatants) {
      if (c.team === 'enemy' && !c.isDead) {
        // Face active hero
        const dx = this.lab.activeHero.position.x - c.position.x;
        const dz = this.lab.activeHero.position.z - c.position.z;
        c.facingYaw = Math.atan2(dx, dz);
        if (c.classTags?.has('mage') || c.classTags?.has('shaman')) {
          c.castSpell('fireball', this.lab.activeHero.position, this.lab.activeHero);
        } else {
          c.stateMachine?.transitionTo('ATTACK', { heavy: false });
        }
      }
    }
    this.lab.damageTextPool?.spawn('ALL ATTACK!', this.lab.activeHero.position, '#f59e0b', true);
  }

  update() {
    const hero = this.lab.activeHero;
    if (!hero) return;

    if (this.godMode) {
      hero.hp = hero.maxHp;
      hero.isPoiseBroken = false;
      hero.poise = hero.maxPoise;
    }

    if (this.infiniteStamina) {
      hero.stamina = hero.maxStamina;
    }

    if (this.infiniteMana) {
      hero.mana = hero.maxMana;
    }

    if (this.noCooldowns) {
      if (hero.spellCooldowns) {
        for (const k in hero.spellCooldowns) {
          hero.spellCooldowns[k] = 0;
        }
      }
      if (this.lab.squadController?.skillStates) {
        for (const slot of this.lab.squadController.skillStates) {
          slot.cooldownTimer = 0;
        }
      }
    }
  }
}
