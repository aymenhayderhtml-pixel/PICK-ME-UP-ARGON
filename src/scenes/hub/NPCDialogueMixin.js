import * as THREE from 'three';
import { LAYOUT } from '../../art/town/layout.js';
import { getGroundY } from '../../art/town/ground.js';
import { Iselle } from '../../hub/Iselle.js';
import { HubHeroNPC } from '../../hub/HubHeroes.js';
import { gameState } from '../../core/GameState.js';
import { showSystemMessage } from '../../ui/Hud.js';
import { queueHeroWalkoutNotice } from '../../ui/Notices.js';
import { runOfflineLoginSimulation } from '../../core/LoginSimulation.js';
import { applyEatOutcome } from '../../core/EmotionEngine.js';
import { pickLine } from '../../data/iselle.js';
import { spawnSparks } from '../../combat/Combat.js';
import { IselleTutorial } from '../../ui/IselleTutorial.js';
import { createHeroFromTemplate } from '../../data/heroes.js';
import { GroundDebug } from '../../debug/GroundDebug.js';

export const NPCDialogueMixin = (Base) => class extends Base {

  /**
   * Runs the offline simulation for the time the player was away and shows
   * "Iselle's Report" before gameplay. Uses the SAME simulation code path as
   * live play (src/core/DailyDecisionEngine.js).
   */
  checkOfflineLoginReport() {
    const report = runOfflineLoginSimulation(gameState, Date.now(), { isellePresent: true });
    if (report) {
      report.iselleQuote = pickLine(report.hasIncident ? 'reportIncident' : 'reportPeaceful');
      this.iselleReportWindow.openReport(report);
      if (this.iselle) {
        this.iselle.say('reportIntro', { force: true, text: report.iselleQuote });
      }
      if (report.fallenHeroes && report.fallenHeroes.length > 0) {
        // A hero who died while the player was away dissolves into light.
        this.playHeroDissolve(report.fallenHeroes.length);
        if (this.iselle) {
          this.iselle.say('heroDied', { force: true });
        }
      }
      return;
    }
    this.checkTutorial();
  }

  /**
   * The light pillar that marks a hero who died while the player was away.
   */
  playHeroDissolve(count = 1) {
    const cfg = LAYOUT.zones.training_grounds;
    const x = cfg ? cfg.center.x : -24;
    const z = cfg ? cfg.center.z : 20;
    const y = this.getWalkY(x, z);
    for (let i = 0; i < Math.min(count, 5); i++) {
      const offset = (i - (Math.min(count, 5) - 1) / 2) * 0.9;
      spawnSparks(
        this.scene,
        new THREE.Vector3(x + offset, y + 1.1, z),
        0xa8f4ff,
        18
      );
    }
  }

  /**
   * Plays out the emotion-driven brawls of the day in the open.
   * These fights are unsanctioned: they happen in the town plaza, so
   * NO_OUTSIDE_FIGHTING is broken and Iselle has to break them up.
   */
  startPendingTownFights(pairs) {
    for (const pair of pairs) {
      const npcA = this.heroesManager.npcs.find(
        (n) => n.heroData && n.heroData.id === pair.heroA.id
      );
      const npcB = this.heroesManager.npcs.find(
        (n) => n.heroData && n.heroData.id === pair.heroB.id
      );
      if (!npcA || !npcB) continue;
      this.sparringController.startSpar(npcA, npcB, false);
    }
  }

  /** Shows the most recent "Iselle's Report" from the login report history. */
  showLatestIselleReport() {
    const history = gameState.loginReportHistory || [];
    if (history.length === 0) {
      showSystemMessage('[No report yet. Come back after being away for a while.]');
      return;
    }
    const report = history[0];
    if (!report.iselleQuote) {
      report.iselleQuote = pickLine(report.hasIncident ? 'reportIncident' : 'reportPeaceful');
    }
    this.iselleReportWindow.openReport(report);
  }

  /**
   * Feeds the squad at the Mess Hall. Heroes who are hungry eat, which lowers
   * their hunger and raises their motivation.
   */
  feedSquadAtMessHall() {
    const party = (gameState.party || []).map((p) => (typeof p === 'string' ? p : p.id));
    let count = 0;
    for (const id of party) {
      const hero = gameState.heroes.find((h) => h.id === id && h.alive);
      if (!hero) continue;
      applyEatOutcome(hero, gameState.foodQuality);
      count++;
    }
    showSystemMessage(`[The squad eats at the Mess Hall. ${count} fed.]`);
    gameState.saveToLocalStorage();
  }

  checkTutorial() {
    // Iselle Tutorial
    if (!gameState.flags?.tutorialSeen) {
      if (!this.iselleTutorial) {
        this.iselleTutorial = new IselleTutorial(() => {
          if (!gameState.flags) gameState.flags = {};
          gameState.flags.tutorialSeen = true;
          gameState.saveToLocalStorage();
          this.playTutorialWalkout();
        }, this.iselle);
      }
      this.iselleTutorial.open();
      return;
    }

    // Tutorial walkout
    if (!gameState.flags?.tutorialWalkoutDone) {
      this.playTutorialWalkout();
      return;
    }

    // Ground Contact Debug Overlay (Backslash key)
    if (this.groundDebug) this.groundDebug.dispose();
    this.groundDebug = new GroundDebug(this);

    // Normal hero spawning in hub
    this.heroesManager.spawnHeroes(gameState.heroes, this.getWalkY);

    // Scripted punishment
    if (!gameState.flags?.tutorialPunishmentDone) {
      setTimeout(() => {
        if (!this.isActive) return;
        this.triggerScriptedPunishment();
      }, 1500);
      return;
    }

    // Equipment notice
    if (!gameState.equipmentSummoned && !gameState.flags?.equipmentSummoned) {
      this.showIselleEquipmentPrompt();
    }

    // Jenna & Aaron arrival after Floor 1 clear
    if ((gameState.clearedFloors >= 1 || gameState.unlockedFloor > 1) && !gameState.flags?.jennaAaronArrived) {
      if (!gameState.flags) gameState.flags = {};
      gameState.flags.jennaAaronArrived = true;
      if (!gameState.heroes.some((h) => h.name === 'Jenna')) {
        gameState.addHero(createHeroFromTemplate('JENNA'));
      }
      if (!gameState.heroes.some((h) => h.name === 'Aaron')) {
        gameState.addHero(createHeroFromTemplate('AARON'));
      }
      gameState.saveToLocalStorage();
      this.playJennaAaronWalkout();
      return;
    }

    // Hero death reaction
    if (gameState.deadHeroes && gameState.deadHeroes.length > 0 && !gameState.flags?.heroDiedReactionPlayed) {
      if (!gameState.flags) gameState.flags = {};
      gameState.flags.heroDiedReactionPlayed = true;
      gameState.saveToLocalStorage();
      if (this.iselle) {
        this.iselle.say('heroDied', { force: true });
      }
    }
  }

  playTutorialWalkout() {
    this.heroesManager.clear();
    const heroes = gameState.heroes.slice(0, 5);
    const targets = [
      new THREE.Vector3(20, this.getGroundY(20, 26), 26),
      new THREE.Vector3(18, this.getGroundY(18, 24), 24),
      new THREE.Vector3(22, this.getGroundY(22, 24), 24),
      new THREE.Vector3(17, this.getGroundY(17, 28), 28),
      new THREE.Vector3(23, this.getGroundY(23, 28), 28),
    ];

    const corridorWaypoints = (LAYOUT.zones.summoning_room?.doorCorridor || [
      { x: 30, z: 4 },
      { x: 26.5, z: 9.0 },
      { x: 23.5, z: 14.5 },
      { x: 20, z: 26 },
    ]).map((pt) => new THREE.Vector3(pt.x, this.getGroundY(pt.x, pt.z), pt.z));

    heroes.forEach((h, index) => {
      setTimeout(() => {
        if (!this.isActive) return;
        const npc = new HubHeroNPC(h, this.scene, (obj) => this.heroesManager.handleRuleBreak(obj), (x, z) => this.getGroundY(x, z), this.navGrid);
        const spawnY = this.getGroundY(30, 4) + 1.8;
        npc.mesh.position.set(30, spawnY, 4);
        const finalTarget = targets[index] || new THREE.Vector3(20, this.getGroundY(20, 26), 26);
        npc.corridorQueue = [
          ...corridorWaypoints.slice(1, -1),
          finalTarget,
        ];
        npc.corridorIndex = 0;
        npc.state = 'walk_corridor';
        npc.speed = 2.4;
        npc.onCorridorFinish = () => {
          npc.state = 'idle';
          npc.timer = 2 + Math.random() * 3;
        };
        this.heroesManager.npcs.push(npc);

        if (h.id === 'hero_han') {
          npc.showSpeechBubble('...I am Han Islat.', 4.0);
        } else {
          npc.showSpeechBubble(`I am ${h.name}, a former ${h.pastJob || 'peasant'}.`, 4.0);
        }

        if (index === heroes.length - 1) {
          if (!gameState.flags) gameState.flags = {};
          gameState.flags.tutorialWalkoutDone = true;
          gameState.saveToLocalStorage();
          queueHeroWalkoutNotice(heroes);
          setTimeout(() => {
            if (!this.isActive) return;
            this.triggerScriptedPunishment();
          }, 3500);
        }
      }, index * 1200);
    });
  }

  triggerScriptedPunishment() {
    const target = this.heroesManager.npcs.find(
      (n) => n.heroData.cooperation === 'uncooperative' && n.heroData.id !== 'hero_han'
    ) || this.heroesManager.npcs[1];

    if (!target) return;
    this.heroesManager.triggerPunishmentOnNpc(target, () => {
      if (!gameState.flags) gameState.flags = {};
      gameState.flags.tutorialPunishmentDone = true;
      gameState.flags.tutorialStep = 4;
      gameState.saveToLocalStorage();
      showSystemMessage('[TUTORIAL: RULE BREAKERS HAVE BEEN WARNED]');
      setTimeout(() => {
        if (this.isActive) this.showIselleEquipmentPrompt();
      }, 1500);
    });
  }

  showIselleEquipmentPrompt() {
    // Just Iselle talking: the modal notice only appears when the player
    // actually heads for a floor without a weapon.
    if (this.iselle) {
      this.iselle.overrideTarget = new THREE.Vector3(20, 3.2, 26);
      this.iselle.say('equipmentPrompt', { force: true });
    }
  }

  playJennaAaronWalkout() {
    const jenna = gameState.heroes.find((h) => h.name === 'Jenna');
    const aaron = gameState.heroes.find((h) => h.name === 'Aaron');
    const arrivals = [jenna, aaron].filter(Boolean);

    showSystemMessage('[Jenna and Aaron have arrived]');
    queueHeroWalkoutNotice(arrivals);
    setTimeout(() => {
      showSystemMessage('[Iselle]: "Two promising warriors summoned by the goddess have arrived."');
    }, 1200);

    const corridorWaypoints = (LAYOUT.zones.summoning_room?.doorCorridor || [
      { x: 30, z: 4 },
      { x: 26.5, z: 9.0 },
      { x: 23.5, z: 14.5 },
      { x: 20, z: 26 },
    ]).map((pt) => new THREE.Vector3(pt.x, this.getWalkY(pt.x, pt.z), pt.z));

    arrivals.forEach((h, idx) => {
      setTimeout(() => {
        if (!this.isActive) return;
        const targetX = idx === 0 ? 18.0 : 22.0;
        const targetZ = 25.0;
        const targetY = this.getWalkY(targetX, targetZ);
        const spawnY = this.getWalkY(30, 4);
        const npc = new HubHeroNPC(h, this.scene, (obj) => this.heroesManager.handleRuleBreak(obj), (x, z) => this.getWalkY(x, z), this.navGrid);
        npc.mesh.position.set(30, spawnY, 4);
        npc.corridorQueue = [
          ...corridorWaypoints.slice(1, -1),
          new THREE.Vector3(targetX, targetY, targetZ),
        ];
        npc.corridorIndex = 0;
        npc.state = 'walk_corridor';
        npc.speed = 2.4;
        npc.onCorridorFinish = () => {
          npc.state = 'idle';
          npc.timer = 2 + Math.random() * 3;
        };
        this.heroesManager.npcs.push(npc);
        npc.showSpeechBubble(idx === 0 ? 'I am Jenna... where is this?' : 'I am Aaron. I will protect you!', 3.5);
      }, idx * 1800);
    });
  }
};
