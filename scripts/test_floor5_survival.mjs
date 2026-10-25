import assert from 'node:assert/strict';
import { FLOOR5_CONFIG } from '../src/data/floor5.config.js';
import * as S from '../src/data/floor5Survival.js';
import * as R from '../src/scenes/tower/Floor5SurvivalRuntime.js';

const cfg = FLOOR5_CONFIG;

// Pacing lookup
{
  const p0 = S.getPacingAt(cfg, 0);
  assert.equal(p0.t, 0);
  const p500 = S.getPacingAt(cfg, 500);
  assert.equal(p500.t, 300);
  const p1740 = S.getPacingAt(cfg, 1740);
  assert.equal(p1740.t, 1740);
  const p1799 = S.getPacingAt(cfg, 1799);
  assert.equal(p1799.t, 1740);
  console.log('[PASS] pacing lookup returns correct keyframe');
}

// Durability blunting & shield bash fallback
{
  assert.equal(S.isBlunt(34, cfg), false);
  assert.equal(S.isBlunt(35, cfg), true);
  assert.equal(S.slashDamageMult(34, cfg), 1.0);
  assert.equal(S.slashDamageMult(35, cfg), 0.35);
  assert.equal(S.shouldShieldBash(35, true, cfg), true);
  assert.equal(S.shouldShieldBash(35, false, cfg), false);
  assert.equal(S.shouldShieldBash(34, true, cfg), false);
  assert.equal(S.shieldBashDamage(cfg), 18);
  console.log('[PASS] durability blunting & shield bash fallback');
}

// Arrow depletion/recovery
{
  let q = cfg.arrows.start;
  q = S.applyArrowShot(q);
  assert.equal(q, 39);
  const ground = [
    { distance: 1.0 },
    { distance: 3.0 },
    { distance: 2.0 },
  ];
  // deterministic rng: first recovers, others not
  let idx = 0;
  const seq = [0.1, 0.1];
  const rng = () => seq[idx++];
  const q2 = S.recoverArrows(q, ground, cfg, rng);
  // ground[0] dist 1.0 <=2.5, rng 0.1 < 0.65 -> recover
  // ground[1] dist 3.0 > 2.5 -> no
  // ground[2] dist 2.0 <=2.5, rng 0.1 < 0.65 -> recover
  assert.equal(q2, 39 + 2);
  console.log('[PASS] arrow depletion/recovery');
}

// Rotation stamina regen
{
  assert.equal(S.staminaRegenPerSec(10, false, cfg), 10);
  assert.equal(S.staminaRegenPerSec(10, true, cfg), 30);
  assert.equal(S.autoSwapNeeded(30, 100, cfg), false);
  assert.equal(S.autoSwapNeeded(24, 100, cfg), true);
  assert.equal(S.autoSwapNeeded(25, 100, cfg), true);
  assert.ok(Math.abs(S.cleanHitStaminaSave(10, cfg) - 7.0) < 1e-9);
  console.log('[PASS] rotation stamina regen');
}

// Bleeding/fear/near-death transitions
{
  const r = S.bleedingTick(100, 50, 1000, cfg);
  assert.ok(Math.abs(r.hp - (100 - 1000 * 0.015)) < 1e-9);
  assert.ok(Math.abs(r.stamina - (50 - 2.5)) < 1e-9);
  assert.equal(S.isBleedingActive(5), true);
  assert.equal(S.isBleedingActive(0), false);
  assert.equal(S.fearActive(['ally_near_death'], cfg), true);
  assert.equal(S.fearActive(['foo'], cfg), false);
  assert.equal(S.fearStatMult(cfg), 0.7);
  assert.equal(S.isNearDeath(10, 100, cfg), true);
  assert.equal(S.isNearDeath(20, 100, cfg), false);
  assert.equal(S.rescueWindowActive(3, cfg), true);
  assert.equal(S.rescueWindowActive(6, cfg), false);
  // berserk eval
  const aw = S.evalStressAwakening(cfg, 400, { sustained_melee_pressure: true });
  assert.ok(aw.indexOf('basic_swordsmanship') !== -1);
  assert.equal(S.berserkActive(5), true);
  assert.equal(S.berserkActive(0), false);
  console.log('[PASS] bleeding/fear/near-death transitions');
}

// 00:00 dissolve trigger
{
  assert.equal(S.shouldDissolve(1799, cfg), false);
  assert.equal(S.shouldDissolve(1800, cfg), true);
  console.log('[PASS] 00:00 dissolve trigger');
}

// Floor5SurvivalRuntime tests
{
  const st = R.createHeroState({ id: 'h1' }, true);
  assert.equal(st.arrows, cfg.arrows.start);
  assert.equal(st.bleedingTimer, 0);
  assert.equal(st.berserkActive, false);
  // rotation
  R.tickRotation(st, 1, false);
  assert.ok(st.stamina >= 100 || st.stamina > 0);
  assert.equal(R.needsAutoSwap(st), false);
  // durability
  for (let i = 0; i < cfg.durability.killsUntilBlunt; i++) R.incrementDurability(st);
  assert.equal(st.blunt, true);
  assert.equal(R.getSlashMult(st), 0.35);
  assert.equal(R.tryShieldBash(st, true), cfg.durability.shieldBashDamage);
  // arrows
  R.consumeArrow(st);
  assert.equal(st.arrows, cfg.arrows.start - 1);
  const before = st.arrows;
  R.recoverArrowsForState(st, [{ distance: 1.0 }, { distance: 1.0 }], () => 0.1);
  assert.ok(st.arrows >= before);
  // bleeding
  R.startBleeding(st, 12);
  assert.ok(st.bleedingTimer > 0);
  const r = R.applyBleeding(st, 2, 1000);
  assert.ok(typeof r.hpDelta === 'number');
  // fear
  R.applyFear(st, ['ally_near_death']);
  assert.equal(st.feared, true);
  assert.equal(R.fearMultiplier(st), 0.7);
  R.tickFear(st, 1);
  // near death
  const nd = R.checkNearDeath(st, 10, 100);
  assert.equal(nd, true);
  assert.equal(R.rescueActive(st), true);
  R.tickRescue(st, 1);
  // awakenings
  const skills = R.evalAwakenings(cfg, 400, { sustained_melee_pressure: true });
  assert.ok(skills.indexOf('basic_swordsmanship') !== -1);
  R.grantAwakening(st, 'basic_swordsmanship');
  assert.equal(R.hasAwakening(st, 'basic_swordsmanship'), true);
  // berserk
  R.activateBerserk(st);
  assert.equal(R.isBerserk(st), true);
  assert.equal(R.berserkStatMult(), 1.5);
  assert.equal(R.berserkDamageMult(), 1.8);
  const drain = R.tickBerserk(st, 1);
  assert.ok(typeof drain === 'number');
  // leaper arc
  const arc = R.leaperArc(0.5, 1, 4.5, 2.2);
  assert.ok(arc.y > 0);
  // climber stack
  let stack = [];
  stack = R.pushClimber(stack, { id: 'c1' });
  stack = R.pushClimber(stack, { id: 'c2' });
  stack = R.pushClimber(stack, { id: 'c3' });
  assert.equal(R.climberStackCount(stack), 3);
  assert.equal(R.canStackMore(stack, cfg), false);
  const rem = R.toppleStack(stack, 10);
  assert.equal(rem.length, 0);
  assert.equal(R.reachesPlatform([{},{},{}], cfg.layout.platformHeight, cfg), true);
  // runtime class
  const rt = new R.Floor5SurvivalRuntime(null);
  assert.ok(rt);
  rt.attachHero({ id: 'h2' }, true);
  assert.ok(rt.getState({ id: 'h2' }));
  rt.tick(0.1, 100, {});
  rt.tickAll(0.1);
  rt.dispose();
  console.log('[PASS] Floor5SurvivalRuntime rotation, blunt, arrows, bleeding, fear, near-death, awakenings, berserk, leaper, climber');
}

console.log('OK: all Floor 5 survival tests passed');