// src/hub/TownSparringController.js
// Live 3D sparring inside the training yard.
//
// PROTECTED AREA (src/hub/*): this is a NEW file, so nothing existing is
// modified. The fighters are real Combatants and every blow goes through the
// real DamageResolver, so sparring uses the real combat code.
//
// Zero allocations in update(): scratch vectors are module scoped.

import * as THREE from 'three';
import { EMOTION_CONFIG } from '../data/emotions.config.js';
import { TRAINING_CONFIG } from '../data/training.config.js';
import { Combatant } from '../combat/Combatant.js';
import { DamageResolver } from '../combat/DamageResolver.js';
import { rollHitZone } from '../core/TrainingEngine.js';
import { getCombatStats } from '../core/Stats.js';
import { addHeroAnger } from '../data/heroes.js';
import { applyFearGain } from '../core/EmotionEngine.js';

// Pre-allocated scratch objects (zero allocation in the frame loop)
const _vMid = new THREE.Vector3();
const _vToA = new THREE.Vector3();
const _vToB = new THREE.Vector3();

const EXCHANGE_INTERVAL = 0.9; // seconds between blows
const SPAR_SPEED = 3.2;

export class TownSparringController {
  constructor(scene, heroesManager, iselle, navGrid = null) {
    this.scene = scene;
    this.heroesManager = heroesManager;
    this.iselle = iselle;
    this.navGrid = navGrid;
    this.anchors = {};
    this.activeSpar = null;
    this.lastReport = null;
  }

  setAnchors(anchors, ringRadius = 2.2) {
    this.anchors = anchors || {};
    this.ringRadius = ringRadius;
  }

  /** Creates a real Combatant for a town hero. */
  createFighter(npc) {
    const hero = npc.heroData;
    const stats = getCombatStats(hero);
    const weapon = hero.equipment && hero.equipment.weapon;
    const offhand = hero.equipment && hero.equipment.offhand;

    const fighter = new Combatant({
      id: `spar_${hero.id}`,
      name: hero.name,
      team: 'neutral',
      roleTag: 'grunt',
      maxHp: stats.maxHp,
      hp: stats.maxHp,
      maxStamina: stats.maxStamina,
      stamina: stats.maxStamina,
      defense: stats.defense,
      baseAttack: stats.damage,
      moveSpeed: stats.moveSpeed,
      position: npc.mesh.position,
      weapon: {
        kind: (weapon && weapon.weaponType) || 'sword',
        grade: (weapon && weapon.grade) || 'D',
        damageMult: (weapon && weapon.damageMult) || 1.0,
      },
      shield:
        offhand && offhand.weaponType === 'shield'
          ? { kind: 'shield', grade: offhand.grade || 'D', blockEfficiency: 0.65 }
          : null,
    });
    fighter.incomingDamageReduction = stats.incomingDamageReduction || 0;
    return fighter;
  }

  /**
   * Starts a spar between two town heroes.
   * `isSanctionedInRing` false means the fight started outside the ring, which
   * immediately breaks the NO_OUTSIDE_FIGHTING lobby law.
   */
  startSpar(npcA, npcB, isSanctionedInRing = true) {
    if (!npcA || !npcB || this.activeSpar) return null;

    const ring = this.anchors.sparring_ring_center;
    const spotA = this.anchors.sparring_spot_a;
    const spotB = this.anchors.sparring_spot_b;

    const session = {
      npcA,
      npcB,
      fighterA: this.createFighter(npcA),
      fighterB: this.createFighter(npcB),
      elapsed: 0,
      totalDamage: 0,
      exchangeTimer: 0,
      exchanges: 0,
      inRing: isSanctionedInRing,
      fightersInRing: false,
      stoppedBy: null,
      stopReason: null,
      lawBroken: null,
      ringCenter: ring ? ring.clone() : new THREE.Vector3(),
      spotA: spotA ? spotA.clone() : new THREE.Vector3(),
      spotB: spotB ? spotB.clone() : new THREE.Vector3(),
      zone: 'torso',
      events: [],
    };

    this.activeSpar = session;

    // Walk both fighters into the ring.
    npcA.setDestination(session.spotA.x, session.spotA.z, null);
    npcB.setDestination(session.spotB.x, session.spotB.z, null);
    npcA.state = 'walk';
    npcB.state = 'walk';

    if (!isSanctionedInRing) {
      session.lawBroken = EMOTION_CONFIG.LOBBY_LAWS.NO_OUTSIDE_FIGHTING;
    }

    return session;
  }

  /** True when a world position is inside the sparring ring. */
  isInsideRing(x, z) {
    const ring = this.anchors.sparring_ring_center;
    const cfg = this.getRingRadius();
    if (!ring) return false;
    const dx = x - ring.x;
    const dz = z - ring.z;
    return Math.hypot(dx, dz) <= cfg;
  }

  getRingRadius() {
    return this.ringRadius || 2.2;
  }

  /**
   * The Squad Leader breaks up a fight before Iselle when he is nearby and
   * stronger than both fighters.
   */
  interveneWithLeader(session, leaderHero) {
    if (!session || !leaderHero) return false;
    session.stoppedBy = 'leader';
    session.stopReason = 'squad_leader';
    session.events.push({
      type: 'leader_ordered',
      text: `${leaderHero.name} broke up the fight.`,
    });
    this.separateFighters(session);
    return true;
  }

  /**
   * Iselle separates the fighters, heals them to a safe level, calms their
   * anger and adds a report line.
   */
  interveneWithIselle(session, reason, lawBroken = null) {
    if (!session) return false;
    session.stoppedBy = 'iselle';
    session.stopReason = reason;
    if (lawBroken) session.lawBroken = lawBroken;

    const safeA = Math.round(session.fighterA.maxHp * EMOTION_CONFIG.ISELLE_SAFE_HEAL_HP_RATIO);
    const safeB = Math.round(session.fighterB.maxHp * EMOTION_CONFIG.ISELLE_SAFE_HEAL_HP_RATIO);
    session.fighterA.hp = Math.max(session.fighterA.hp, safeA);
    session.fighterB.hp = Math.max(session.fighterB.hp, safeB);

    for (const npc of [session.npcA, session.npcB]) {
      const hero = npc.heroData;
      addHeroAnger(hero, -EMOTION_CONFIG.ISELLE_ANGER_REDUCTION);
      applyFearGain(hero, EMOTION_CONFIG.ISELLE_FEAR_GAIN);
    }

    if (lawBroken) {
      // The offender loses motivation.
      const offender = session.npcA.heroData;
      offender.motivationScore = Math.max(
        0,
        Math.min(
          100,
          (offender.motivationScore ?? 50) - EMOTION_CONFIG.LAW_BREAK_MOTIVATION_PENALTY
        )
      );
    }

    this.separateFighters(session);

    if (this.iselle) {
      const line = lawBroken
        ? 'That is a LOBBY LAW, hero. Read it!'
        : 'I have separated you. Try to stay separated.';
      this.iselle.say('lawReprimand', { force: true, text: line });
    }

    session.events.push({
      type: 'iselle_intervened',
      text: `Iselle separated ${session.npcA.heroData.name} and ${session.npcB.heroData.name}.`,
    });

    return true;
  }

  /** Pushes the fighters apart and ends the spar. */
  separateFighters(session) {
    _vMid.set(
      (session.npcA.mesh.position.x + session.npcB.mesh.position.x) * 0.5,
      0,
      (session.npcA.mesh.position.z + session.npcB.mesh.position.z) * 0.5
    );
    _vToA.subVectors(session.npcA.mesh.position, _vMid);
    _vToB.subVectors(session.npcB.mesh.position, _vMid);
    if (_vToA.lengthSq() < 0.0001) _vToA.set(1, 0, 0);
    if (_vToB.lengthSq() < 0.0001) _vToB.set(-1, 0, 0);
    _vToA.normalize();
    _vToB.normalize();
    session.npcA.setDestination(_vMid.x + _vToA.x * 2.2, _vMid.z + _vToA.z * 2.2, null);
    session.npcB.setDestination(_vMid.x + _vToB.x * 2.2, _vMid.z + _vToB.z * 2.2, null);
    session.npcA.state = 'walk';
    session.npcB.state = 'walk';
  }

  /** Resolves one blow through the real DamageResolver. */
  resolveBlow(attackerFighter, defenderFighter, attackerNpc, defenderNpc) {
    const zone = rollHitZone('melee', Math.random);
    const stats = getCombatStats(attackerNpc.heroData);

    const payload = {
      attacker: attackerFighter,
      attackerPosition: attackerFighter.position,
      attackerName: attackerFighter.name,
      target: defenderFighter,
      rawDamage: stats.damage,
      poiseDamage: 20,
      weaponMult: attackerFighter.weapon.damageMult || 1.0,
      weaponGrade: attackerFighter.weapon.grade || 'D',
      attackMoveMult: 1.0,
      hitZone: zone,
    };

    const hpBefore = defenderFighter.hp;
    const result = DamageResolver.resolve(defenderFighter, payload);
    const dealt = result && result.damage !== undefined ? result.damage : Math.max(0, hpBefore - defenderFighter.hp);

    // A head or heart wound does not fast-heal.
    const critical = TRAINING_CONFIG.CRITICAL_ZONES.includes(zone);
    if (critical) {
      const hero = defenderNpc.heroData;
      hero.injury = {
        zone,
        severity: 'serious',
        daysRemaining: TRAINING_CONFIG.CRITICAL_INJURY_DURATION_DAYS,
        healRateMult: TRAINING_CONFIG.CRITICAL_INJURY_HEAL_MULT,
      };
      applyFearGain(hero, EMOTION_CONFIG.FEAR_GAIN_BIG_DAMAGE);
    } else {
      // Fast heal at the training ground. The main heal is applied per frame
      // in update(); this only tops the wound up a little.
      const healMult = defenderNpc.heroData.injury
        ? defenderNpc.heroData.injury.healRateMult
        : 1.0;
      const heal = TRAINING_CONFIG.TRAINING_FAST_HEAL_PER_SEC * 0.016 * healMult;
      defenderFighter.hp = Math.min(defenderFighter.maxHp, defenderFighter.hp + heal);
    }

    return { zone, dealt, critical, result };
  }

  /** Finds the Squad Leader NPC. */
  findLeaderNpc() {
    const npcs = this.heroesManager && this.heroesManager.npcs ? this.heroesManager.npcs : [];
    for (const npc of npcs) {
      if (npc.heroData && npc.heroData.isSquadLeader) return npc;
    }
    return null;
  }

  update(delta, leaderPos = null) {
    const session = this.activeSpar;
    if (!session) return;

    session.elapsed += delta;
    session.exchangeTimer += delta;

    // --- The Squad Leader can break the fight up first --------------------
    const leaderNpc = this.findLeaderNpc();
    if (leaderNpc && leaderNpc !== session.npcA && leaderNpc !== session.npcB) {
      const dist = Math.hypot(
        leaderNpc.mesh.position.x - session.ringCenter.x,
        leaderNpc.mesh.position.z - session.ringCenter.z
      );
      if (dist <= EMOTION_CONFIG.LEADER_INTERVENE_MAX_DIST) {
        const leaderPower = this.powerOf(leaderNpc);
        if (
          leaderPower >
          Math.max(this.powerOf(session.npcA), this.powerOf(session.npcB)) *
            EMOTION_CONFIG.LEADER_INTERVENE_POWER_RATIO
        ) {
          this.interveneWithLeader(session, leaderNpc.heroData);
          this.finishSpar(session);
          return;
        }
      }
    }

    // --- Exchange blows ----------------------------------------------------
    if (session.exchangeTimer >= EXCHANGE_INTERVAL) {
      session.exchangeTimer -= EXCHANGE_INTERVAL;
      session.exchanges += 1;

      const blowA = this.resolveBlow(
        session.fighterA, session.fighterB, session.npcA, session.npcB
      );
      session.totalDamage += blowA.dealt;
      session.zone = blowA.zone;

      const blowB = this.resolveBlow(
        session.fighterB, session.fighterA, session.npcB, session.npcA
      );
      session.totalDamage += blowB.dealt;
      session.zone = blowB.zone;

      // Keep the fighters facing each other.
      session.npcA.mesh.rotation.y = Math.atan2(
        session.npcB.mesh.position.x - session.npcA.mesh.position.x,
        session.npcB.mesh.position.z - session.npcA.mesh.position.z
      );
      session.npcB.mesh.rotation.y = Math.atan2(
        session.npcA.mesh.position.x - session.npcB.mesh.position.x,
        session.npcA.mesh.position.z - session.npcB.mesh.position.z
      );

      // --- Intervention checks --------------------------------------------
      const ratioA = session.fighterA.hp / Math.max(1, session.fighterA.maxHp);
      const ratioB = session.fighterB.hp / Math.max(1, session.fighterB.maxHp);

      // Track the ring: the fighters walk in first, and leaving it later is a
      // law break. A spar that never started in the ring is already illegal.
      const aInRing = this.isInsideRing(session.npcA.mesh.position.x, session.npcA.mesh.position.z);
      const bInRing = this.isInsideRing(session.npcB.mesh.position.x, session.npcB.mesh.position.z);
      if (aInRing && bInRing) {
        session.fightersInRing = true;
      } else if (session.fightersInRing) {
        this.interveneWithIselle(
          session,
          'outside_ring',
          EMOTION_CONFIG.LOBBY_LAWS.NO_OUTSIDE_FIGHTING
        );
      }

      if (!session.inRing) {
        // A fight that never started in the ring is illegal from the first blow.
        this.interveneWithIselle(
          session,
          'outside_ring',
          EMOTION_CONFIG.LOBBY_LAWS.NO_OUTSIDE_FIGHTING
        );
      } else if (blowA.critical || blowB.critical) {
        this.interveneWithIselle(
          session,
          'critical_zone',
          EMOTION_CONFIG.LOBBY_LAWS.NO_LETHAL_SPAR_BLOWS
        );
      } else if (ratioA < EMOTION_CONFIG.ISELLE_INTERVENE_HP_RATIO || ratioB < EMOTION_CONFIG.ISELLE_INTERVENE_HP_RATIO) {
        this.interveneWithIselle(session, 'low_hp', EMOTION_CONFIG.LOBBY_LAWS.NO_ATTACK_LOW_HP);
      } else if (session.elapsed > EMOTION_CONFIG.ISELLE_MAX_FIGHT_DURATION_SEC) {
        this.interveneWithIselle(session, 'duration', null);
      } else if (session.totalDamage > EMOTION_CONFIG.ISELLE_MAX_FIGHT_TOTAL_DAMAGE) {
        this.interveneWithIselle(session, 'total_damage', null);
      }

      if (session.stoppedBy) {
        this.finishSpar(session);
        return;
      }
    }

    // --- Fast heal both fighters (critical wounds barely heal) ------------
    // The heal runs AFTER the exchange so Iselle still sees the HP a blow
    // actually left behind.
    for (const [fighter, npc] of [
      [session.fighterA, session.npcA],
      [session.fighterB, session.npcB],
    ]) {
      if (fighter.isDead) continue;
      const injury = npc.heroData.injury;
      const mult = injury ? injury.healRateMult : 1.0;
      const heal = TRAINING_CONFIG.TRAINING_FAST_HEAL_PER_SEC * delta * mult;
      fighter.hp = Math.min(fighter.maxHp, fighter.hp + heal);
    }
  }

  /** A rough combat power used to compare the leader with the fighters. */
  powerOf(npc) {
    const stats = getCombatStats(npc.heroData);
    return stats.maxHp + stats.damage * 5 + stats.defense * 4;
  }

  /** Ends the spar and applies the outcome to the heroes. */
  finishSpar(session) {
    if (!session) return;
    this.activeSpar = null;
    this.lastReport = session;

    // The loser is afraid and angry.
    const aWins = session.fighterA.hp >= session.fighterB.hp;
    const loser = aWins ? session.npcB : session.npcA;
    applyFearGain(loser.heroData, EMOTION_CONFIG.FEAR_GAIN_LOSS);
    addHeroAnger(loser.heroData, EMOTION_CONFIG.ANGER_GAIN_LOSS);

    // Both fighters are tired.
    for (const npc of [session.npcA, session.npcB]) {
      npc.heroData.fatigue = Math.min(100, (npc.heroData.fatigue || 0) + 20);
      npc.heroData.currentActivity = 'rest';
    }

    session.npcA.state = 'idle';
    session.npcB.state = 'idle';
  }

  isSparring() {
    return !!this.activeSpar;
  }
}
