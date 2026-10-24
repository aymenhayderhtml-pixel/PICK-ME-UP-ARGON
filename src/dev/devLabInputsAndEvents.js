import * as THREE from 'three';
import { combatEvents } from '../combat/CombatEvents.js';
import { ATTACK_PHASES } from '../combat/StateMachine.js';
import { playSpellSound, playPotionSound, playFizzleSound } from '../combat/SpellAudio.js';

const _castBarVec = new THREE.Vector3();

export const devLabInputsAndEventsMethods = {
  setupInputs() {
    this.keys = new Set();
    this.lmbDown = false;
    this.lmbHoldTimer = 0.0;
    this.rmbDown = false;

    window.addEventListener('mousemove', (e) => {
      this.mouseScreenPos.x = (e.clientX / window.innerWidth) * 2 - 1;
      this.mouseScreenPos.y = -(e.clientY / window.innerHeight) * 2 + 1;
      this.mouseRaycaster.setFromCamera(this.mouseScreenPos, this.arena.camera);
      this.mouseRaycaster.ray.intersectPlane(this.groundPlane, this.groundAimPoint);
    });

    window.addEventListener('keydown', (e) => {
      if (e.target.matches('input, select, textarea')) return;

      this.keys.add(e.code);

      if (e.code === 'F3') {
        e.preventDefault();
        const dbg = document.getElementById('mage-debug-panel');
        if (dbg) {
          dbg.style.display = (dbg.style.display === 'none' || !dbg.style.display) ? 'block' : 'none';
        }
        return;
      }

      if (e.code === 'KeyR' && (e.shiftKey || this.activeHero?.isDead)) {
        this.resetArena();
        return;
      }

      if (e.code === 'KeyP') {
        this.togglePause();
        return;
      }

      if (e.code === 'KeyN') {
        this.stepFrame();
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        if (this.weapons.isBowAiming) {
          this.arena.setAimMode(false);
          this.weapons.cancelAim();
          const reticle = document.getElementById('aim-reticle');
          if (reticle) reticle.style.display = 'none';
        }

        let mx = 0, mz = 0;
        if (this.keys.has('KeyW')) mz -= 1;
        if (this.keys.has('KeyS')) mz += 1;
        if (this.keys.has('KeyA')) mx -= 1;
        if (this.keys.has('KeyD')) mx += 1;

        const dir = new THREE.Vector3(mx, 0, mz);
        if (dir.lengthSq() < 0.001) {
          const yaw = this.activeHero.facingYaw;
          dir.set(Math.sin(yaw), 0, Math.cos(yaw));
        } else {
          dir.normalize();
        }
        if (this.weapons.isBowAiming) {
          this.arena.setAimMode(false, this.activeHero);
          this.weapons.cancelAim();
          const reticle = document.getElementById('aim-reticle');
          if (reticle) reticle.style.display = 'none';
        }
        this.activeHero.stateMachine?.transitionTo('DODGE', { direction: dir });
      }

      if (e.code === 'KeyX' && this.activeHero && !this.activeHero.isDead) {
        if (this.activeHero.weapon.kind === 'dagger' && this.activeHero.arrows > 0) {
          this.activeHero.swapToBow(() => {
            this.weapons.setWeapon('bow');
            this.damageTextPool.spawn('SWAPPED TO BOW', this.activeHero.position, '#38bdf8', false);
          });
        } else if (this.activeHero.weapon.kind === 'bow') {
          this.activeHero.swapToDagger(() => {
            this.weapons.setWeapon('dagger');
            this.damageTextPool.spawn('SWAPPED TO DAGGER', this.activeHero.position, '#facc15', false);
          });
        }
      }

      if (e.code === 'KeyQ') {
        if (this.activeHero && !this.activeHero.isDead) {
          const used = this.activeHero.useManaPotion();
          if (used) {
            this.damageTextPool.spawn('+40% MANA (POTION)', this.activeHero.position, '#38bdf8', true);
          } else if (this.activeHero.manaPotions <= 0) {
            this.damageTextPool.spawn('NO POTIONS LEFT', this.activeHero.position, '#ef4444', false);
          } else if (this.activeHero.manaPotionCooldown > 0) {
            this.damageTextPool.spawn(`POTION ON COOLDOWN (${this.activeHero.manaPotionCooldown.toFixed(1)}s)`, this.activeHero.position, '#facc15', false);
          }
        }
        return;
      }

      const isMageWeapon = this.activeHero?.weapon?.kind === 'staff';

      if (e.code === 'Digit1') {
        if (isMageWeapon) this.activeHero.castSpell('emberBolt', this.groundAimPoint);
        else this.squadController.triggerSquadSkill(0, this.groundAimPoint);
      }
      if (e.code === 'Digit2') {
        if (isMageWeapon) this.activeHero.castSpell('fireDartVolley', this.groundAimPoint);
        else this.squadController.triggerSquadSkill(1, this.groundAimPoint);
      }
      if (e.code === 'Digit3') {
        if (isMageWeapon) this.activeHero.castSpell('fireball', this.groundAimPoint);
        else this.squadController.triggerSquadSkill(2, this.groundAimPoint);
      }
      if (e.code === 'Digit4') {
        if (isMageWeapon) this.activeHero.castSpell('flameWall', this.groundAimPoint);
        else this.squadController.triggerSquadSkill(3, this.groundAimPoint);
      }
      if (e.code === 'Digit5') {
        if (isMageWeapon) {
          if (this.activeHero.channeledSpell) this.activeHero.stopChannel();
          else this.activeHero.castSpell('infernoBeam', this.groundAimPoint);
        }
      }
      if (e.code === 'Digit6') {
        if (isMageWeapon) this.activeHero.castSpell('fireNova', this.groundAimPoint);
      }

      if (e.code === 'KeyR' && !e.shiftKey && !this.activeHero?.isDead) {
        if (isMageWeapon) {
          this.activeHero.castSpell('solarCataclysm', this.groundAimPoint);
        } else {
          this.spells.castSpell('lightningChain', this.activeHero, this.groundAimPoint);
        }
      }

      if (e.code === 'KeyE') this.spells.castSpell('iceSpike', this.activeHero, this.groundAimPoint);
      if (e.code === 'KeyF') this.spells.castSpell('heal', this.activeHero, this.groundAimPoint);
      if (e.code === 'KeyT') this.spells.castSpell('ward', this.activeHero, this.groundAimPoint);
      if (e.code === 'KeyG') this.spells.castSpell('meteor', this.activeHero, this.groundAimPoint);
    });

    window.addEventListener('keyup', (e) => {
      this.keys.delete(e.code);
    });

    window.addEventListener('mousedown', (e) => {
      if (e.target.closest('#left-panel, #right-panel, #top-navbar, .side-panel, button, select, input, label, textarea')) return;

      if (e.button === 0) {
        this.lastInputEvent = 'LMB DOWN';
        if (this.weapons.currentWeapon === 'bow') {
          if (this.weapons.isBowAiming) {
            this.lastInputEvent = 'LMB FIRE (AIMED)';
            const aimPoint = this.arena.getScreenAimPoint(undefined, this.combatants, this.activeHero);
            this.weapons.fireBowAimed(aimPoint, true);
            if (this.activeHero.arrows <= 0) {
              this.arena.setAimMode(false, this.activeHero);
              this.weapons.cancelAim();
              const reticle = document.getElementById('aim-reticle');
              if (reticle) reticle.style.display = 'none';
              this.activeHero.swapToDagger(() => this.weapons.setWeapon('dagger'));
            }
          } else {
            this.lmbDown = true;
            this.lmbDownStartTime = performance.now();
            this.lmbHoldTimer = 0.0;
            this.heavyTriggered = false;
          }
        } else {
          this.lmbDown = true;
          this.lmbDownStartTime = performance.now();
          this.lmbHoldTimer = 0.0;
          this.heavyTriggered = false;
        }
      } else if (e.button === 2) {
        e.preventDefault();
        this.lastInputEvent = 'RMB DOWN';
        if (this.weapons.currentWeapon === 'bow') {
          this.arena.prevAimX = e.clientX;
          this.arena.prevAimY = e.clientY;
          this.arena.setAimMode(true, this.activeHero);
          this.weapons.startAim();
          const reticle = document.getElementById('aim-reticle');
          if (reticle) reticle.style.display = 'block';
        } else {
          this.rmbDown = true;
          this.activeHero?.stateMachine?.transitionTo('BLOCK');
        }
      }
    });

    window.addEventListener('mouseup', (e) => {
      if (e.button === 0) {
        this.lastInputEvent = 'LMB UP';
        if (this.weapons.currentWeapon === 'bow') {
          if (this.lmbDown && !this.weapons.isBowAiming) {
            this.lastInputEvent = 'LMB SNAP SHOT';
            this.weapons.fireBowSnapshot(this.groundAimPoint);
            if (this.activeHero.arrows <= 0) {
              this.activeHero.swapToDagger(() => this.weapons.setWeapon('dagger'));
            }
          }
        } else if (this.lmbDown && !this.heavyTriggered) {
          const holdSec = (performance.now() - (this.lmbDownStartTime || 0)) / 1000;
          if (holdSec >= 0.35) {
            this.heavyTriggered = true;
            this.lastInputEvent = 'LMB HOLD (HEAVY)';
            this.triggerHeroAttack(true);
          } else {
            this.lastInputEvent = 'LMB TAP (LIGHT)';
            this.triggerHeroAttack(false);
          }
        }
        this.lmbDown = false;
        this.lmbHoldTimer = 0.0;
      } else if (e.button === 2) {
        this.lastInputEvent = 'RMB UP';
        this.rmbDown = false;
        if (this.weapons.currentWeapon === 'bow') {
          this.arena.setAimMode(false, this.activeHero);
          this.weapons.cancelAim();
          const reticle = document.getElementById('aim-reticle');
          if (reticle) reticle.style.display = 'none';
        } else {
          if (this.activeHero?.stateMachine?.state === 'BLOCK') {
            this.activeHero.stateMachine.transitionTo('IDLE');
          }
        }
      }
    });

    window.addEventListener('contextmenu', (e) => {
      if (!e.target.closest('input, textarea')) e.preventDefault();
    });
  },

  triggerHeroAttack(isHeavy = false) {
    if (!this.activeHero?.stateMachine || this.activeHero.isDead) return;

    const dx = this.groundAimPoint.x - this.activeHero.position.x;
    const dz = this.groundAimPoint.z - this.activeHero.position.z;
    if (Math.hypot(dx, dz) > 0.15) {
      this.activeHero.facingYaw = Math.atan2(dx, dz);
    }

    const st = this.activeHero.stateMachine.state;
    if (st === 'IDLE' || st === 'MOVE' || this.activeHero.stateMachine.attackPhase === ATTACK_PHASES.RECOVERY) {
      this.activeHero.stateMachine.transitionTo('ATTACK', { heavy: isHeavy, targets: this.combatants });
    } else {
      this.activeHero.stateMachine.bufferInput('ATTACK', { heavy: isHeavy, targets: this.combatants });
    }
  },

  showHitMarker(isHeadshot = false) {
    const marker = document.getElementById('hit-marker');
    if (!marker) return;
    const line1 = marker.querySelector('.hm-line1');
    const line2 = marker.querySelector('.hm-line2');
    const color = isHeadshot ? '#ef4444' : '#ffffff';
    const shadow = isHeadshot ? '0 0 6px #ef4444' : '0 0 4px #38bdf8';
    if (line1) { line1.style.background = color; line1.style.boxShadow = shadow; }
    if (line2) { line2.style.background = color; line2.style.boxShadow = shadow; }
    marker.style.opacity = '1';
    if (this._hitMarkerTimeout) clearTimeout(this._hitMarkerTimeout);
    this._hitMarkerTimeout = setTimeout(() => {
      marker.style.opacity = '0';
    }, 150);
  },

  setupCombatEventListeners() {
    combatEvents.on('onHit', (payload) => {
      const defName = payload.targetName || payload.defenderName;
      const target = this.combatants.find((c) => c.name === defName);
      const pos = payload.hitPoint || (target ? target.position : this.groundAimPoint);
      const isCrit = payload.isCritical || payload.isPoiseBreak;
      const isBurn = payload.isBurn || payload.attackerName === 'Burn';
      const col = isBurn ? '#f97316' : (isCrit ? '#facc15' : '#ffffff');
      this.damageTextPool.spawn(`-${payload.damage}`, pos, col, isCrit);
    });

    combatEvents.on('onCombo', (payload) => {
      if (this.activeHero) {
        this.damageTextPool.spawn(`🔥 ${payload.name} (${payload.bonus})`, this.activeHero.position, '#f97316', true);
      }
    });

    combatEvents.on('onOverheat', () => {
      if (this.activeHero) {
        this.damageTextPool.spawn('⚠️ OVERHEATED', this.activeHero.position, '#ef4444', true);
      }
    });

    combatEvents.on('onBlock', (payload) => {
      const defName = payload.targetName || payload.defenderName;
      const target = this.combatants.find((c) => c.name === defName);
      const pos = target ? target.position : this.groundAimPoint;
      this.damageTextPool.spawn(`BLOCKED (-${payload.chipDamage})`, pos, '#38bdf8', false);
    });

    combatEvents.on('onParry', (payload) => {
      const defName = payload.targetName || payload.defenderName;
      const target = this.combatants.find((c) => c.name === defName);
      const pos = target ? target.position : this.groundAimPoint;
      this.damageTextPool.spawn('PERFECT PARRY!', pos, '#00ffff', true);
    });

    combatEvents.on('onHeal', (payload) => {
      const target = this.combatants.find((c) => c.name === payload.targetName);
      const pos = target ? target.position : this.groundAimPoint;
      this.damageTextPool.spawn(`+${payload.amount} HP`, pos, '#22c55e', true);
    });

    combatEvents.on('onWard', (payload) => {
      const target = this.combatants.find((c) => c.name === payload.targetName);
      const pos = target ? target.position : this.groundAimPoint;
      this.damageTextPool.spawn(`WARD +${payload.barrierHp}`, pos, '#06b6d4', false);
    });

    combatEvents.on('onSpellCast', ({ spellId }) => {
      playSpellSound(spellId);
    });
    combatEvents.on('onPotionUsed', () => {
      playPotionSound();
    });
    combatEvents.on('onManaFizzle', () => {
      playFizzleSound();
    });
    combatEvents.on('onCastInterrupted', () => {
      const barEl = document.getElementById('overhead-cast-bar');
      if (barEl) barEl.style.display = 'none';
      playFizzleSound();
    });
  },

  updateCastBar() {
    const barEl = document.getElementById('overhead-cast-bar');
    const fillEl = document.getElementById('overhead-cast-fill');
    const textEl = document.getElementById('overhead-cast-text');
    if (!barEl || !fillEl || !textEl) return;

    const hero = this.activeHero;
    if (!hero || hero.isDead || hero.stateMachine.state !== 'CAST') {
      if (barEl.style.display !== 'none') barEl.style.display = 'none';
      return;
    }

    const castDuration = hero.stateMachine.castDuration || hero.stateMachine.currentSpell?.castTime || 0;
    if (castDuration <= 0.4) {
      if (barEl.style.display !== 'none') barEl.style.display = 'none';
      return;
    }

    _castBarVec.copy(hero.position);
    _castBarVec.y += 2.15;
    _castBarVec.project(this.arena.camera);

    if (_castBarVec.z > 1.0) {
      if (barEl.style.display !== 'none') barEl.style.display = 'none';
      return;
    }

    const sx = (_castBarVec.x * 0.5 + 0.5) * window.innerWidth;
    const sy = (-(_castBarVec.y * 0.5) + 0.5) * window.innerHeight;

    barEl.style.display = 'block';
    barEl.style.left = `${sx}px`;
    barEl.style.top = `${sy}px`;

    const timer = hero.stateMachine.castTimer !== undefined ? hero.stateMachine.castTimer : (hero.stateMachine.stateTime || 0);
    const progress = Math.max(0, Math.min(100, (timer / castDuration) * 100));
    fillEl.style.width = `${progress}%`;
    const spellName = hero.stateMachine.currentSpell?.name || 'Casting...';
    textEl.textContent = `${spellName} ${timer.toFixed(1)}s / ${castDuration.toFixed(1)}s`;
  },
};