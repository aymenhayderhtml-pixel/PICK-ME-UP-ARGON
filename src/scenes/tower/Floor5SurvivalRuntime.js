// Floor5SurvivalRuntime.js — Floor 5 (SURVIVAL) runtime mechanics.
// Pure state logic + optional Three.js visuals. No mutation of Ally.js/Player.js/Enemy.js source.
import * as THREE from 'three';
import { FLOOR5_CONFIG } from '../../data/floor5.config.js';
import {
  getPacingAt, isBlunt, slashDamageMult, shouldShieldBash, shieldBashDamage,
  applyArrowShot, recoverArrows, staminaRegenPerSec, autoSwapNeeded, cleanHitStaminaSave,
  bleedingTick, isBleedingActive, fearActive, fearStatMult, isNearDeath, rescueWindowActive,
  shouldDissolve, evalStressAwakening, berserkActive,
} from '../../data/floor5Survival.js';

const cfg = FLOOR5_CONFIG;

// ---------- Pure state helpers ----------

export function createHeroState(hero, isFrontline = true) {
  return {
    hero: hero || null,
    isFrontline: !!isFrontline,
    stamina: 100,
    maxStamina: 100,
    kills: 0,
    hits: 0,
    blunt: false,
    arrows: cfg.arrows.start,
    bleedingTimer: 0,
    bleedingTickAcc: 0,
    feared: false,
    fearTimer: 0,
    nearDeath: false,
    rescueTimer: 0,
    awakened: new Set(),
    berserkTimer: 0,
    berserkActive: false,
    swapCooldown: 0,
    auraMesh: null,
    auraLight: null,
  };
}

export function tickRotation(state, delta, isRear) {
  if (!state) return state;
  if (state.swapCooldown > 0) state.swapCooldown = Math.max(0, state.swapCooldown - delta);
  const regen = staminaRegenPerSec(5, isRear, cfg) * delta; // base 5 stamina/sec
  state.stamina = Math.min(state.maxStamina, state.stamina + regen);
  if (isRear) state.isFrontline = false;
  return state;
}

export function needsAutoSwap(state) {
  if (!state) return false;
  return autoSwapNeeded(state.stamina, state.maxStamina, cfg) && state.swapCooldown <= 0;
}

export function doAutoSwap(state) {
  if (!state) return state;
  state.isFrontline = !state.isFrontline;
  state.swapCooldown = cfg.rotation.swapCooldownSec;
  return state;
}

export function applyCleanHit(state, attackCost) {
  if (!state) return 0;
  return cleanHitStaminaSave(attackCost, cfg);
}

export function incrementDurability(state) {
  if (!state) return state;
  state.hits = (state.hits || 0) + 1;
  // treat hits as kills proxy for blunting
  state.kills = state.hits;
  state.blunt = isBlunt(state.kills, cfg);
  return state;
}

export function getSlashMult(state) {
  if (!state) return 1.0;
  return slashDamageMult(state.kills, cfg);
}

export function tryShieldBash(state, hasShield) {
  if (!state) return 0;
  if (shouldShieldBash(state.kills, hasShield, cfg)) {
    return shieldBashDamage(cfg);
  }
  return 0;
}

export function initArrows(state) {
  if (!state) return state;
  state.arrows = cfg.arrows.start;
  return state;
}

export function consumeArrow(state) {
  if (!state) return 0;
  state.arrows = applyArrowShot(state.arrows);
  return state.arrows;
}

export function recoverArrowsForState(state, groundArrows, rng) {
  if (!state) return state;
  state.arrows = recoverArrows(state.arrows, groundArrows, cfg, rng);
  return state;
}

export function applyBleeding(state, delta, maxHp) {
  if (!state) return { hpDelta: 0, staminaDelta: 0 };
  if (state.bleedingTimer <= 0) return { hpDelta: 0, staminaDelta: 0 };
  state.bleedingTimer = Math.max(0, state.bleedingTimer - delta);
  const r = bleedingTick(0, 0, maxHp, cfg);
  // r.hp is 0 - maxHp*hpPctPerTick; r.stamina is 0 - staminaDrain
  const hpDelta = -(maxHp * cfg.bleeding.hpPctPerTick) * (delta / cfg.bleeding.tickSec);
  const staminaDelta = -cfg.bleeding.staminaDrain * (delta / cfg.bleeding.tickSec);
  state.stamina = Math.max(0, state.stamina + staminaDelta);
  return { hpDelta, staminaDelta };
}

export function startBleeding(state, duration) {
  if (!state) return state;
  state.bleedingTimer = duration || cfg.bleeding.durationSec;
  return state;
}

export function applyFear(state, triggers) {
  if (!state) return state;
  if (fearActive(triggers, cfg)) {
    state.feared = true;
    state.fearTimer = cfg.fear.durationSec;
  }
  return state;
}

export function tickFear(state, delta) {
  if (!state) return state;
  if (state.feared) {
    state.fearTimer = Math.max(0, state.fearTimer - delta);
    if (state.fearTimer <= 0) state.feared = false;
  }
  return state;
}

export function fearMultiplier(state) {
  if (!state || !state.feared) return 1.0;
  return fearStatMult(cfg);
}

export function checkNearDeath(state, hp, maxHp) {
  if (!state) return false;
  const nd = isNearDeath(hp, maxHp, cfg);
  if (nd && !state.nearDeath) {
    state.nearDeath = true;
    state.rescueTimer = cfg.nearDeath.rescueWindowSec;
  }
  if (!nd) {
    state.nearDeath = false;
    state.rescueTimer = 0;
  }
  return state.nearDeath;
}

export function tickRescue(state, delta) {
  if (!state) return false;
  if (state.nearDeath) {
    state.rescueTimer = Math.max(0, state.rescueTimer - delta);
  }
  return state.nearDeath && state.rescueTimer > 0;
}

export function rescueActive(state) {
  if (!state) return false;
  return state.nearDeath && state.rescueTimer > 0;
}

export function evalAwakenings(cfgIn, elapsed, stressFlags) {
  return evalStressAwakening(cfgIn || cfg, elapsed, stressFlags);
}

export function grantAwakening(state, skillId) {
  if (!state) return state;
  state.awakened.add(skillId);
  return state;
}

export function hasAwakening(state, skillId) {
  if (!state) return false;
  return state.awakened.has(skillId);
}

export function activateBerserk(state) {
  if (!state) return state;
  state.berserkActive = true;
  state.berserkTimer = cfg.berserk.durationSec;
  return state;
}

export function tickBerserk(state, delta) {
  if (!state || !state.berserkActive) return 0;
  state.berserkTimer = Math.max(0, state.berserkTimer - delta);
  if (state.berserkTimer <= 0) state.berserkActive = false;
  return state.berserkActive ? cfg.berserk.hpDrainPct : 0;
}

export function isBerserk(state) {
  if (!state) return false;
  return state.berserkActive && state.berserkTimer > 0;
}

export function berserkStatMult() { return cfg.berserk.statMult; }
export function berserkDamageMult() { return cfg.berserk.damageMult; }

// ---------- Leaper arc ----------

export function leaperArc(t, duration, distance, height) {
  // t in [0,1], returns { x, y } offset from start toward target
  const x = distance * t;
  const y = 4 * height * t * (1 - t);
  return { x, y };
}

// ---------- Climber stacking ----------

export function climberStackCount(stack) {
  return Array.isArray(stack) ? stack.length : 0;
}

export function canStackMore(stack, cfgIn) {
  const limit = (cfgIn || cfg).stackClimb.stackHeight;
  return climberStackCount(stack) < limit;
}

export function pushClimber(stack, climber) {
  if (!Array.isArray(stack)) stack = [];
  if (canStackMore(stack, cfg)) stack.push(climber);
  return stack;
}

export function toppleStack(stack, force) {
  // returns remaining stack after toppling
  if (!Array.isArray(stack) || stack.length === 0) return [];
  if (force >= cfg.stackClimb.toppleKnockbackForce * 0.5) {
    return [];
  }
  return stack;
}

export function stackHeightMeters(stack, cfgIn) {
  const c = cfgIn || cfg;
  // each goblin ~1.0m tall
  return climberStackCount(stack) * 1.0;
}

export function reachesPlatform(stack, platformHeight, cfgIn) {
  const c = cfgIn || cfg;
  return climberStackCount(stack) >= c.stackClimb.stackHeight;
}

// ---------- Arrival dome / embers (Three.js, guarded) ----------

export function createArrivalDome(position) {
  if (typeof document === 'undefined') return null;
  try {
    const geo = new THREE.SphereGeometry(cfg.layout.arrivalDomeRadius, 24, 16);
    const mat = new THREE.MeshBasicMaterial({
      color: 0x00ffff, transparent: true, opacity: 0.6, wireframe: true, depthWrite: false,
    });
    const mesh = new THREE.Mesh(geo, mat);
    if (position) mesh.position.copy(position);
    mesh.position.y += 1.0;
    return mesh;
  } catch (e) {
    return null;
  }
}

export function updateArrivalDome(dome, delta, timer) {
  if (!dome) return timer;
  const t = Math.max(0, timer - delta);
  const progress = 1 - (t / 2.0);
  dome.material.opacity = Math.max(0, 0.6 * (1 - progress));
  const s = 1 + progress * 0.5;
  dome.scale.set(s, s, s);
  return t;
}

export function createEmberPoints() {
  if (typeof document === 'undefined') return null;
  try {
    const e = cfg.lighting.driftingEmbers;
    const count = e.count;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 40;
      positions[i * 3 + 1] = Math.random() * 10;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 40;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({ color: parseInt(e.color.replace('#', ''), 16), size: 0.15, transparent: true, opacity: 0.8 });
    return new THREE.Points(geo, mat);
  } catch (err) {
    return null;
  }
}

export function updateEmbers(points, delta) {
  if (!points || !points.geometry) return;
  const attr = points.geometry.attributes.position;
  if (!attr) return;
  const arr = attr.array;
  const n = arr.length / 3;
  const speed = cfg.lighting.driftingEmbers.riseSpeed;
  for (let i = 0; i < n; i++) {
    arr[i * 3 + 1] += speed * delta;
    if (arr[i * 3 + 1] > 12) arr[i * 3 + 1] = 0;
  }
  attr.needsUpdate = true;
}

export function createBerserkAura() {
  if (typeof document === 'undefined') return null;
  try {
    const geo = new THREE.SphereGeometry(1.2, 12, 8);
    const mat = new THREE.MeshBasicMaterial({ color: 0xff1a1a, transparent: true, opacity: 0.35, wireframe: true });
    return new THREE.Mesh(geo, mat);
  } catch (e) {
    return null;
  }
}

// ---------- Runtime manager class ----------

export class Floor5SurvivalRuntime {
  constructor(scene) {
    this.scene = scene || null;
    this.cfg = cfg;
    this.heroStates = new Map();
    this.groundArrows = [];
    this.groundArrowPoolSize = 64;
    this._groundArrowIdx = 0;
    // pre-allocate ground arrow slots
    this._groundArrows = new Array(this.groundArrowPoolSize);
    for (let i = 0; i < this.groundArrowPoolSize; i++) {
      this._groundArrows[i] = { x: 0, z: 0, active: false };
    }
    this.arrivalDome = null;
    this.arrivalDomeTimer = 2.0;
    this.embers = null;
    this.leaperStates = new Map();
    this.climberStacks = new Map(); // platformId -> array
    this.platformOccupied = false;
    this.elapsed = 0;
    this.floorActive = false;
  }

  activate(scene) {
    this.scene = scene || this.scene;
    this.floorActive = true;
    this.elapsed = 0;
    if (this.scene) {
      const playerPos = this.scene.position ? this.scene.position : null;
      this.arrivalDome = createArrivalDome(playerPos);
      if (this.arrivalDome) this.scene.add(this.arrivalDome);
      this.embers = createEmberPoints();
      if (this.embers) this.scene.add(this.embers);
    }
  }

  attachHero(hero, isFrontline) {
    if (!hero) return null;
    const key = hero.id || hero;
    if (this.heroStates.has(key)) return this.heroStates.get(key);
    const st = createHeroState(hero, isFrontline);
    initArrows(st);
    this.heroStates.set(key, st);
    return st;
  }

  attachAll(player, allies) {
    if (player) this.attachHero(player, true);
    if (Array.isArray(allies)) {
      allies.forEach((a, i) => this.attachHero(a, i === 0));
    }
  }

  getState(hero) {
    if (!hero) return null;
    return this.heroStates.get(hero.id || hero) || null;
  }

  tick(delta, elapsed, context) {
    if (!this.floorActive) return;
    this.elapsed = elapsed;
    // arrival dome fade
    if (this.arrivalDome) {
      this.arrivalDomeTimer -= delta;
      if (this.arrivalDomeTimer <= 0) {
        if (this.scene) this.scene.remove(this.arrivalDome);
        this.arrivalDome = null;
      } else {
        updateArrivalDome(this.arrivalDome, delta, this.arrivalDomeTimer + delta);
      }
    }
    // embers
    if (this.embers) updateEmbers(this.embers, delta);

    // tick hero states
    for (const st of this.heroStates.values()) {
      const isRear = !st.isFrontline;
      tickRotation(st, delta, isRear);
      tickFear(st, delta);
      const drain = tickBerserk(st, delta);
      if (drain > 0 && st.hero) {
        // hp drain handled by caller; record
        st._berserkDrain = drain;
      }
      // rescue window
      if (st.nearDeath) tickRescue(st, delta);
    }

    // wall platform occupancy trigger
    if (elapsed >= 1500) {
      this.platformOccupied = true;
    }
  }

  onMeleeKill(hero, attackCost) {
    const st = this.getState(hero);
    if (!st) return;
    incrementDurability(st);
    const saved = applyCleanHit(st, attackCost);
    st.stamina = Math.min(st.maxStamina, st.stamina + saved);
  }

  onRangedShot(hero) {
    const st = this.getState(hero);
    if (!st) return;
    consumeArrow(st);
  }

  dropArrow(x, z) {
    const slot = this._groundArrows[this._groundArrowIdx % this.groundArrowPoolSize];
    this._groundArrowIdx++;
    slot.x = x;
    slot.z = z;
    slot.active = true;
    if (this.groundArrows.indexOf(slot) === -1) this.groundArrows.push(slot);
    return slot;
  }

  tryRecover(hero, heroPos) {
    const st = this.getState(hero);
    if (!st || !heroPos) return 0;
    const nearby = this._groundArrows.filter((a) => a.active &&
      Math.hypot(a.x - heroPos.x, a.z - heroPos.z) <= cfg.arrows.pickupRadius);
    const before = st.arrows;
    recoverArrowsForState(st, nearby.map((a) => ({ distance: Math.hypot(a.x - heroPos.x, a.z - heroPos.z) })), Math.random);
    // deactivate recovered
    for (const a of nearby) {
      if (Math.random() < cfg.arrows.recoverChance) a.active = false;
    }
    return st.arrows - before;
  }

  applyBleedingToHero(state, delta, maxHp) {
    return applyBleeding(state, delta, maxHp);
  }

  startBleed(state, duration) {
    return startBleeding(state, duration);
  }

  triggerFear(state, triggers) {
    return applyFear(state, triggers);
  }

  triggerNearDeath(state, hp, maxHp) {
    return checkNearDeath(state, hp, maxHp);
  }

  isRescueActive(state) {
    return rescueActive(state);
  }

  tryAwaken(state, elapsed, stressFlags) {
    if (!state) return [];
    const skills = evalAwakenings(cfg, elapsed, stressFlags);
    for (const s of skills) {
      if (!state.awakened.has(s)) {
        grantAwakening(state, s);
      }
    }
    // berserk check
    if (stressFlags && stressFlags.near_death_or_final_stand && elapsed >= 1200) {
      if (!state.berserkActive && Math.random() < 0.5) {
        activateBerserk(state);
        if (state.hero && state.hero.mesh && !state.auraMesh && this.scene) {
          state.auraMesh = createBerserkAura();
          state.auraLight = new THREE.PointLight(0xff1a1a, 1.5, 6);
          if (state.auraMesh) {
            state.auraMesh.position.copy(state.hero.mesh.position);
            state.auraMesh.position.y += 1.0;
            this.scene.add(state.auraMesh);
          }
          if (state.auraLight) {
            state.auraLight.position.copy(state.hero.mesh.position);
            state.auraLight.position.y += 1.0;
            this.scene.add(state.auraLight);
          }
        }
      }
    }
    return skills;
  }

  updateAura(state) {
    if (!state || !state.berserkActive) {
      if (state && state.auraMesh && this.scene) {
        this.scene.remove(state.auraMesh);
        state.auraMesh = null;
      }
      if (state && state.auraLight && this.scene) {
        this.scene.remove(state.auraLight);
        state.auraLight = null;
      }
      return;
    }
    if (state.auraMesh && state.hero && state.hero.mesh) {
      state.auraMesh.position.copy(state.hero.mesh.position);
      state.auraMesh.position.y += 1.0;
      state.auraMesh.rotation.y += 0.05;
    }
    if (state.auraLight && state.hero && state.hero.mesh) {
      state.auraLight.position.copy(state.hero.mesh.position);
      state.auraLight.position.y += 1.0;
    }
  }

  tickAll(delta) {
    for (const st of this.heroStates.values()) {
      if (st.berserkActive) tickBerserk(st, delta);
      this.updateAura(st);
    }
  }

  // Leaper: compute leap arc position given progress t (0..1)
  computeLeaperPosition(start, target, t) {
    const dx = target.x - start.x;
    const dz = target.z - start.z;
    const dist = Math.hypot(dx, dz);
    const leapDist = Math.min(dist, cfg.variants.leaper.leapDistance);
    const frac = dist > 0 ? leapDist / dist : 0;
    const arc = leaperArc(t, 1.0, leapDist, cfg.variants.leaper.leapHeight);
    const nx = dist > 0 ? dx / dist : 0;
    const nz = dist > 0 ? dz / dist : 0;
    return {
      x: start.x + nx * arc.x,
      y: arc.y,
      z: start.z + nz * arc.x,
    };
  }

  // Climber stacking
  getClimberStack(platformId) {
    if (!this.climberStacks.has(platformId)) this.climberStacks.set(platformId, []);
    return this.climberStacks.get(platformId);
  }

  addClimberToStack(platformId, climber) {
    const stack = this.getClimberStack(platformId);
    if (canStackMore(stack, cfg)) {
      pushClimber(stack, climber);
    }
    return stack;
  }

  toppleClimberStack(platformId, force) {
    const stack = this.getClimberStack(platformId);
    const remaining = toppleStack(stack, force);
    this.climberStacks.set(platformId, remaining);
    return remaining;
  }

  stackReachesPlatform(platformId) {
    const stack = this.getClimberStack(platformId);
    return reachesPlatform(stack, cfg.layout.platformHeight, cfg);
  }

  getStatusSummary() {
    const out = [];
    for (const st of this.heroStates.values()) {
      out.push({
        blunt: st.blunt,
        arrows: st.arrows,
        bleeding: st.bleedingTimer > 0,
        feared: st.feared,
        nearDeath: st.nearDeath,
        rescueActive: rescueActive(st),
        awakened: [...st.awakened],
        berserk: st.berserkActive,
      });
    }
    return out;
  }

  dispose() {
    for (const st of this.heroStates.values()) {
      if (st.auraMesh && this.scene) this.scene.remove(st.auraMesh);
      if (st.auraLight && this.scene) this.scene.remove(st.auraLight);
    }
    if (this.arrivalDome && this.scene) this.scene.remove(this.arrivalDome);
    if (this.embers && this.scene) this.scene.remove(this.embers);
    this.heroStates.clear();
    this.floorActive = false;
  }
}

export default Floor5SurvivalRuntime;