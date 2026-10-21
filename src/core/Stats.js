import { getSkillEffects } from '../data/skills.js';
import { getStarMultiplier } from '../data/rules.js';
import { TRAINING_CONFIG } from '../data/training.config.js';

/**
 * Current level of the Pain Tolerance skill (0 when the hero does not have it).
 * Pain Tolerance may exist as a levelled skill and/or as a legacy 1-level
 * talent; the highest of the two wins.
 */
export function getPainToleranceLevel(hero) {
  if (!hero) return 0;
  let level = 0;
  const norm = (v) => String(v || '').toLowerCase().replace(/\s+/g, '_');
  for (const s of hero.skills || []) {
    const id = typeof s === 'string' ? s : (s.id || s.name || '');
    if (norm(id) === 'pain_tolerance') {
      level = Math.max(level, typeof s === 'object' ? (s.level || 1) : 1);
    }
  }
  for (const t of hero.talents || []) {
    const id = typeof t === 'string' ? t : (t.id || t.name || '');
    if (norm(id) === 'pain_tolerance') {
      level = Math.max(level, 1);
    }
  }
  return level;
}

export function getCombatStats(hero, party = null, relations = null) {
  if (!hero) {
    return {
      maxHp: 100,
      maxStamina: 100,
      damage: 10,
      defense: 0,
      moveSpeed: 5,
      critChance: 0.05,
      rollInvuln: 0.35,
      blockWindow: 0.2,
      reach: 2.0,
      isExhausted: false,
    };
  }

  const str = hero.stats?.str || 5;
  const agi = hero.stats?.agi || 5;
  const vit = hero.stats?.vit || 5;
  const wil = hero.stats?.wil || 5;
  const level = hero.level || 1;
  const star = hero.star || 1;

  // Base Formulas from specification:
  // maxHp = 50 + vit * 8 + level * 5
  // maxStamina = 60 + vit * 3 + wil * 2
  // damage = 6 + str * 1.2 + level
  // defense = vit * 0.5 + str * 0.2
  let maxHp = 50 + vit * 8 + level * 5;
  let maxStamina = 60 + vit * 3 + wil * 2;
  let damage = 6 + str * 1.2 + level;
  let defense = vit * 0.5 + str * 0.2;
  let moveSpeed = 5 + agi * 0.08;
  let critChance = 0.05 + agi * 0.005;
  let rollInvuln = 0.35;
  let blockWindow = 0.2;
  let reach = 2.0;

  // Star scaling: stars are only a starting point (1.0 at 1 star, 1.5 at 7).
  const starMult = getStarMultiplier(star);
  maxHp *= starMult;
  damage *= starMult;

  // Equipment integration
  const eq = hero.equipment || {};
  let blockMult = 0.5;
  let attackSpeed = 1.0;

  // Weapon: damage * weapon.damageMult * (1 + 0.1 * enhance)
  if (eq.weapon) {
    const w = eq.weapon;
    const wEnhance = w.enhance || 0;
    const wDura = w.durability !== undefined ? w.durability : (w.maxDurability || 40);
    const wMult = (wDura > 0) ? (w.damageMult ?? 1.0) : 0.4;
    damage *= wMult * (1 + 0.1 * wEnhance);
    if (w.weaponType === 'mace') {
      reach = Math.max(reach, 2.4);
      attackSpeed *= 0.85;
    }
  }

  // Armor: defense from armor * (1 + 0.1 * enhance)
  if (eq.armor) {
    const a = eq.armor;
    const aEnhance = a.enhance || 0;
    defense += (a.defense || 0) * (1 + 0.1 * aEnhance);
  }

  // Offhand: block and defense from offhand
  if (eq.offhand) {
    const o = eq.offhand;
    const oEnhance = o.enhance || 0;
    defense += (o.defense || 0) * (1 + 0.1 * oEnhance);
    blockMult = (o.blockMult || 1.0) * (1 + 0.1 * oEnhance);
  }

  // Apply Skill Effects from skills.js
  const skillFx = getSkillEffects(hero);
  if (skillFx.damageMult) damage *= (1 + skillFx.damageMult);
  if (skillFx.defenseMult) defense *= (1 + skillFx.defenseMult);
  if (skillFx.blockWindow) blockWindow += skillFx.blockWindow;
  if (skillFx.rollInvuln) rollInvuln += skillFx.rollInvuln;
  if (skillFx.moveSpeedMult) moveSpeed *= (1 + skillFx.moveSpeedMult);
  if (skillFx.critChance) critChance += skillFx.critChance;
  if (skillFx.reach) reach += skillFx.reach;
  if (skillFx.strMult) damage *= (1 + skillFx.strMult);

  // Intimacy / Bonds bonus: +3% (25-59), +6% (60-89), +10% (90+), capped at +20%
  if (party && party.length > 0 && relations) {
    let totalBondBonus = 0;
    for (const member of party) {
      const mId = typeof member === 'string' ? member : member.id;
      if (mId && mId !== hero.id) {
        const key = [hero.id, mId].sort().join('|');
        const relVal = relations[key] || 0;
        if (relVal >= 90) totalBondBonus += 0.10;
        else if (relVal >= 60) totalBondBonus += 0.06;
        else if (relVal >= 25) totalBondBonus += 0.03;
      }
    }
    const cappedBondBonus = Math.min(0.20, totalBondBonus);
    if (cappedBondBonus > 0) {
      maxHp *= (1 + cappedBondBonus);
      maxStamina *= (1 + cappedBondBonus);
      damage *= (1 + cappedBondBonus);
      defense *= (1 + cappedBondBonus);
      moveSpeed *= (1 + cappedBondBonus);
    }
  }

  // Plate Armor check: stamina drain +10% unless hero has Heavy Armor Mastery
  let staminaDrainMult = skillFx.staminaDrainMult || 0;
  const armorDesc = (eq.armor?.name || eq.armor?.templateId || '').toLowerCase();
  if (armorDesc.includes('plate')) {
    const hasHeavyArmorMastery = (hero.skills || []).some((s) => {
      const sName = (s.id || s.name || '').toLowerCase();
      return sName.includes('heavy_armor_mastery') || sName.includes('heavy armor mastery');
    });
    if (!hasHeavyArmorMastery) {
      staminaDrainMult += 0.1;
    }
  }

  // Transcendence Talent: +10% to all combat stats
  const hasTranscendence =
    (hero.talents || []).some((t) => (t || '').toLowerCase() === 'transcendence') ||
    (skillFx.allStatsMult > 0);
  if (hasTranscendence) {
    maxHp *= 1.1;
    maxStamina *= 1.1;
    damage *= 1.1;
    defense *= 1.1;
    moveSpeed *= 1.1;
  }

  // Exhaustion penalty: fatigue above 80 means -20% stats
  const isExhausted = (hero.fatigue || 0) > 80;
  if (isExhausted) {
    maxHp *= 0.8;
    maxStamina *= 0.8;
    damage *= 0.8;
    defense *= 0.8;
    moveSpeed *= 0.8;
  }

  // Pain Tolerance: each level shaves incoming damage.
  const painToleranceLevel = getPainToleranceLevel(hero);
  const incomingDamageReduction = Math.min(
    0.75,
    painToleranceLevel * TRAINING_CONFIG.PAIN_TOLERANCE_DR_PER_LEVEL
  );

  return {
    maxHp: Math.round(maxHp),
    maxStamina: Math.round(maxStamina),
    damage: Math.round(damage * 10) / 10,
    defense: Math.round(defense * 10) / 10,
    moveSpeed: Math.round(moveSpeed * 10) / 10,
    critChance: Math.round(critChance * 100) / 100,
    rollInvuln: Math.round(rollInvuln * 100) / 100,
    blockWindow: Math.round((skillFx.blockWindow || 0) * 100) / 100,
    parryWindow: Math.round((0.18 + (skillFx.blockWindow || 0)) * 100) / 100,
    blockStaminaMult: skillFx.blockStaminaMult || 0,
    damageMult: skillFx.damageMult || 0,
    blockMult,
    staminaDrainMult,
    reach,
    attackSpeed: Math.round(attackSpeed * 100) / 100,
    painToleranceLevel,
    incomingDamageReduction,
    isExhausted,
  };
}

export function getDisplayStats(hero) {
  if (!hero) {
    const d = { current: 5, base: 5 };
    return { str: d, agi: d, vit: d, int: d, wil: d };
  }

  const statKeys = ['str', 'agi', 'vit', 'int', 'wil'];
  const res = {};
  const eq = hero.equipment || {};

  // Modifiers:
  // - Fatigue above 80: -20% stats
  // - Afraid / Panic state: -30% stats
  let mult = 1.0;
  if ((hero.fatigue || 0) > 80) mult -= 0.2;
  if (hero.isAfraid || hero.afraid || hero.moraleState === 'afraid' || hero.state === 'panic') {
    mult -= 0.3;
  }

  const hasTranscendence =
    (hero.talents || []).some((t) => (t || '').toLowerCase() === 'transcendence');
  if (hasTranscendence) mult += 0.1;

  for (const k of statKeys) {
    const base = Math.round(hero.stats?.[k] || 5);
    let bonus = 0;

    // Equipment bonuses
    for (const slot of ['weapon', 'offhand', 'armor']) {
      const item = eq[slot];
      if (item) {
        if (item.stats && typeof item.stats[k] === 'number') {
          bonus += item.stats[k];
        } else if (typeof item[k] === 'number') {
          bonus += item[k];
        }
      }
    }

    // Buff bonuses from buffs object if present
    if (hero.buffs && typeof hero.buffs[k] === 'number') {
      bonus += hero.buffs[k];
    }

    const current = Math.max(1, Math.round((base + bonus) * mult));
    res[k] = { current, base };
  }

  return res;
}

export function formatStatDisplay(statObj) {
  if (!statObj) return '0';
  const { current, base } = statObj;
  if (current === base) return `${base}`;
  if (current > base) {
    return `<span style="color:#55ff55;font-weight:bold;">${current}/${base}</span>`;
  } else {
    return `<span style="color:#ff4444;font-weight:bold;">${current}/${base}</span>`;
  }
}

export function getGrowthRate(hero) {
  if (!hero || !hero.potentials) return 'NORMAL';
  const vals = Object.values(hero.potentials);
  if (!vals.length) return 'NORMAL';
  const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
  if (avg > 1.12) return 'HIGH';
  if (avg < 0.92) return 'LOW';
  return 'NORMAL';
}

export function getHeroThreeGroups(hero) {
  if (!hero) {
    const fallback = { score: 50, grade: 'C' };
    return { mentality: fallback, skills: fallback, physical: fallback };
  }

  // Mentality: the 0..100 Mentality stat is primary; the legacy composure
  // field is only the fallback for saves that predate the emotion system.
  const wil = hero.stats?.wil || 5;
  const mentalBase =
    hero.mentality !== undefined && hero.mentality !== null
      ? hero.mentality
      : (hero.composure !== undefined ? hero.composure : 50);
  let mentScore = mentalBase * 0.6 + wil * 2.5;
  const tList = (hero.talents || []).map((t) => (t || '').toLowerCase());
  const sList = (hero.skills || []).map((s) =>
    (typeof s === 'string' ? s : (s.id || s.name || '')).toLowerCase()
  );
  if (tList.includes('composure')) mentScore += 12;
  if (tList.includes('natural_leader')) mentScore += 10;
  if (tList.includes('pain_tolerance') || sList.includes('pain_tolerance')) mentScore += 8;
  if (hero.id === 'hero_han') mentScore += 15;

  const toGrade = (sc) => (sc >= 85 ? 'S' : sc >= 70 ? 'A' : sc >= 55 ? 'B' : sc >= 40 ? 'C' : sc >= 25 ? 'D' : 'E');
  const mentGrade = toGrade(mentScore);

  // Skills: star, skills count & levels, skill talents
  const star = hero.star || 1;
  const skList = hero.skills || [];
  const skLevelSum = skList.reduce((acc, s) => acc + (s.level || 1), 0);
  let skScore = star * 10 + skLevelSum * 4 + skList.length * 3;
  if (tList.includes('combat_logic')) skScore += 10;
  if (tList.includes('quick_learner')) skScore += 8;
  if (tList.includes('transcendence')) skScore += 15;
  const skGrade = toGrade(skScore);

  // Physical: str, agi, vit
  const str = hero.stats?.str || 5;
  const agi = hero.stats?.agi || 5;
  const vit = hero.stats?.vit || 5;
  let physScore = (str + agi + vit) * 1.4;
  if (tList.includes('superhuman_strength')) physScore += 12;
  const physGrade = toGrade(physScore);

  return {
    mentality: { score: Math.round(mentScore), grade: mentGrade },
    skills: { score: Math.round(skScore), grade: skGrade },
    physical: { score: Math.round(physScore), grade: physGrade },
  };
}
