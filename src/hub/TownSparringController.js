// src/hub/TownSparringController.js
// Live 3D sparring inside the training yard.
//
// PROTECTED AREA (src/hub/*): this file was created in Phase 1 and is
// rewritten in Phase 2 so the live town and the offline simulation use the
// SAME fight engine (src/core/TrainingEngine.js). The fighters are real
// Combatants and every blow goes through the real DamageResolver.
//
// Zero allocations in update(): scratch vectors are module scoped.

import * as THREE from 'three';
import { EMOTION_CONFIG } from '../data/emotions.config.js';
import { gameState } from '../core/GameState.js';
import { getCombatStats } from '../core/Stats.js';
import {
  createFightSession,
  createFighterFromHero,
  stepFightExchange,
  evaluateFightIntervention,
  applyFightConsequences,
} from '../core/TrainingEngine.js';
import { FairyInterventionEffect } from './FairyInterventionEffect.js';

// Pre-allocated scratch objects (zero allocation in the frame loop)
const _vMid = new THREE.Vector3();
const _vToA = new THREE.Vector3();
const _vToB = new THREE.Vector3();

const EXCHANGE_INTERVAL = 0.9; // seconds between blows

export class TownSparringController {
  constructor(scene, heroesManager, iselle, navGrid = null) {
    this.scene = scene;
    this.heroesManager = heroesManager;
    this.iselle = iselle;
    this.navGrid = navGrid;
    this.anchors = {};
    this.ringRadius = 2.2;
    this.activeSpar = null;
    // Fights that start while another is still running wait here and play one
    // after another, so every paired brawl of the day shows up in the live
    // town instead of only the first.
    this.sparQueue = [];
    this.nextSparDelayMs = 1500;
    this._startNextSparTimeout = null;
    this.lastReport = null;
    this.interventionEffect = new FairyInterventionEffect(scene);
  }

  setAnchors(anchors, ringRadius = 2.2) {
    this.anchors = anchors || {};
    this.ringRadius = ringRadius;
  }

  /** Creates a real Combatant for a town hero. */
  createFighter(npc) {
    return createFighterFromHero(npc.heroData, npc.mesh.position);
  }

  /**
   * Starts a spar between two town heroes.
   * `isSanctionedInRing` false means the fight started outside the ring, which
   * immediately breaks the NO_OUTSIDE_FIGHTING lobby law.
   *
   * Returns the session when it starts immediately, the string 'queued' when a
   * spar is already running and this one is waiting its turn, or null when the
   * request is invalid (a missing fighter).
   */
  startSpar(npcA, npcB, isSanctionedInRing = true) {
    if (!npcA || !npcB) return null;
    if (this.activeSpar) {
      this.sparQueue.push({ npcA, npcB, isSanctionedInRing });
      return 'queued';
    }

    const ring = this.anchors.sparring_ring_center;
    const spotA = this.anchors.sparring_spot_a;
    const spotB = this.anchors.sparring_spot_b;

    const session = createFightSession(npcA.heroData, npcB.heroData, {
      isSanctioned: isSanctionedInRing,
      // A sanctioned spar uses the ring spots; an unsanctioned brawl uses the
      // town plaza spots from the config.
      spotA: isSanctionedInRing
        ? spotA
          ? { x: spotA.x, z: spotA.z }
          : { x: npcA.mesh.position.x, z: npcA.mesh.position.z }
        : undefined,
      spotB: isSanctionedInRing
        ? spotB
          ? { x: spotB.x, z: spotB.z }
          : { x: npcB.mesh.position.x, z: npcB.mesh.position.z }
        : undefined,
      ringCenter: ring ? { x: ring.x, z: ring.z } : { x: -18.7, z: 23.3 },
      ringRadius: this.getRingRadius(),
      triggerReason: isSanctionedInRing ? 'spar' : 'anger_rival',
    });

    // The controller drives the town avatars; the engine drives the fighters.
    session.npcA = npcA;
    session.npcB = npcB;

    this.activeSpar = session;

    // Both fighters walk into the ring.
    npcA.setDestination(session.spotA.x, session.spotA.z, null);
    npcB.setDestination(session.spotB.x, session.spotB.z, null);
    npcA.state = 'walk';
    npcB.state = 'walk';

    return session;
  }

  /** True when a world position is inside the sparring ring. */
  isInsideRing(x, z) {
    const ring = this.anchors.sparring_ring_center;
    if (!ring) return false;
    const dx = x - ring.x;
    const dz = z - ring.z;
    return Math.hypot(dx, dz) <= this.getRingRadius();
  }

  getRingRadius() {
    return this.ringRadius || 2.2;
  }

  /**
   * The Squad Leader breaks up a fight before Iselle does, when he is nearby
   * and stronger than both fighters.
   */
  interveneWithLeader(session, leaderHero) {
    if (!session || !leaderHero) return false;
    session.stoppedBy = 'leader';
    session.stopReason = 'leader_stopped';
    this.separateFighters(session);
    if (this.iselle && this.iselle.say) {
      this.iselle.say('idleTeasing', { force: true });
    }
    return true;
  }

  /**
   * Iselle separates the fighters. The emotional and relationship
   * consequences are applied by the shared fight engine (idempotent), and the
   * separation beam, the healing columns and the reprimand are played out.
   */
  interveneWithIselle(session, reason, lawBroken = null) {
    if (!session) return false;
    session.stoppedBy = 'iselle';
    session.stopReason = reason;
    if (lawBroken) session.lawBroken = lawBroken;

    // The numbers (heal, calm, motivation penalty, relationship) live in the
    // shared engine so the offline simulation produces the same result.
    applyFightConsequences(session, gameState);

    if (this.interventionEffect.isActive()) return true;

    this.interventionEffect.play(
      session.npcA,
      session.npcB,
      this.iselle,
      null,
      () => this.finishSpar(session)
    );
    return true;
  }

  /** Pushes the fighters apart. */
  separateFighters(session) {
    if (!session || !session.npcA || !session.npcB) return;
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
    const dist = EMOTION_CONFIG.ISELLE_SEPARATION_DISTANCE;
    session.npcA.setDestination(_vMid.x + _vToA.x * dist, _vMid.z + _vToA.z * dist, null);
    session.npcB.setDestination(_vMid.x + _vToB.x * dist, _vMid.z + _vToB.z * dist, null);
    session.npcA.state = 'walk';
    session.npcB.state = 'walk';
  }

  /** Finds the Squad Leader NPC. */
  findLeaderNpc() {
    const npcs = this.heroesManager && this.heroesManager.npcs ? this.heroesManager.npcs : [];
    for (const npc of npcs) {
      if (npc.heroData && npc.heroData.isSquadLeader) return npc;
    }
    return null;
  }

  /** A rough combat power used to compare the leader with the fighters. */
  powerOf(npc) {
    const stats = getCombatStats(npc.heroData);
    return stats.maxHp + stats.damage * 5 + stats.defense * 4;
  }

  update(delta, leaderPos = null) {
    // The intervention VFX keeps running after the fight has stopped.
    this.interventionEffect.update(delta);

    const session = this.activeSpar;
    if (!session) return;

    session.elapsed += delta;
    session.exchangeTimer = (session.exchangeTimer || 0) + delta;

    // Keep the fighters where the town avatars are, so the AI sees the real
    // distance between them.
    if (session.npcA && session.npcB) {
      session.fighterA.position.set(
        session.npcA.mesh.position.x,
        session.npcA.mesh.position.y,
        session.npcA.mesh.position.z
      );
      session.fighterB.position.set(
        session.npcB.mesh.position.x,
        session.npcB.mesh.position.y,
        session.npcB.mesh.position.z
      );
    }

    // The Squad Leader can break the fight up before Iselle does.
    const leaderNpc = this.findLeaderNpc();
    let leaderDistance = 999;
    let leader = null;
    if (leaderNpc && leaderNpc !== session.npcA && leaderNpc !== session.npcB) {
      leader = leaderNpc.heroData;
      // The leader's distance to the FIGHT, not to the ring: an unsanctioned
      // brawl happens in the town plaza.
      const midX = (session.fighterA.position.x + session.fighterB.position.x) * 0.5;
      const midZ = (session.fighterA.position.z + session.fighterB.position.z) * 0.5;
      leaderDistance = Math.hypot(
        leaderNpc.mesh.position.x - midX,
        leaderNpc.mesh.position.z - midZ
      );
    }

    // --- Exchange blows ----------------------------------------------------
    if (session.exchangeTimer >= EXCHANGE_INTERVAL) {
      session.exchangeTimer -= EXCHANGE_INTERVAL;
      stepFightExchange(session, Math.random);

      // Keep the fighters facing each other.
      if (session.npcA && session.npcB) {
        session.npcA.mesh.rotation.y = Math.atan2(
          session.npcB.mesh.position.x - session.npcA.mesh.position.x,
          session.npcB.mesh.position.z - session.npcA.mesh.position.z
        );
        session.npcB.mesh.rotation.y = Math.atan2(
          session.npcA.mesh.position.x - session.npcB.mesh.position.x,
          session.npcA.mesh.position.z - session.npcB.mesh.position.z
        );
      }
    }

    // --- Intervention checks ----------------------------------------------
    // The shared engine owns every rule: Squad Leader, flee, critical zone,
    // low HP, ring boundary, unsanctioned window, duration and total damage.
    const check = evaluateFightIntervention(session, gameState, {
      leader,
      leaderDistance,
    });

    if (check.shouldStop) {
      if (check.stoppedBy === 'leader') {
        this.interveneWithLeader(session, leader);
        this.finishSpar(session);
      } else if (check.stoppedBy === 'iselle') {
        this.interveneWithIselle(session, check.stopReason, check.lawBroken);
      } else {
        // A fighter fled: no intervention, the fight just ends.
        this.finishSpar(session);
      }
    }
  }

  /**
   * Ends the spar and applies the outcome to the heroes. The consequences are
   * idempotent, so calling this after the intervention is safe.
   */
  finishSpar(session) {
    if (!session) return;
    this.activeSpar = null;
    this.lastReport = session;

    applyFightConsequences(session, gameState);

    if (session.npcA) {
      session.npcA.state = 'idle';
      session.npcA.timer = 4;
    }
    if (session.npcB) {
      session.npcB.state = 'idle';
      session.npcB.timer = 4;
    }

    // Start the next queued fight after a short gap.
    this.dequeueNextSpar();
  }

  /**
   * Starts the next queued spar after `nextSparDelayMs`. Only one wait is ever
   * pending, and the queued fight only starts if the controller is idle.
   */
  dequeueNextSpar() {
    if (this._startNextSparTimeout) {
      clearTimeout(this._startNextSparTimeout);
      this._startNextSparTimeout = null;
    }
    if (this.sparQueue.length === 0 || this.activeSpar) return;
    const next = this.sparQueue.shift();
    if (!next || !next.npcA || !next.npcB) return;
    this._startNextSparTimeout = setTimeout(() => {
      this._startNextSparTimeout = null;
      if (!this.activeSpar && next.npcA.mesh && next.npcB.mesh) {
        this.startSpar(next.npcA, next.npcB, next.isSanctionedInRing);
      }
    }, this.nextSparDelayMs);
  }

  /** Drops every queued fight (used on a new day and on scene exit). */
  clearQueue() {
    if (this._startNextSparTimeout) {
      clearTimeout(this._startNextSparTimeout);
      this._startNextSparTimeout = null;
    }
    this.sparQueue = [];
  }

  isSparring() {
    return !!this.activeSpar;
  }

  dispose() {
    this.clearQueue();
    this.interventionEffect.dispose();
  }
}
