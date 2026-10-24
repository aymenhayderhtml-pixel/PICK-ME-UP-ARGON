import { EMOTION_CONFIG, getDefaultMentality, getDefaultMotivationScore } from './emotions.config.js';
import { TRAIT_POOL_BY_MOTIVATION, TRAIT_POOL_BY_CLASS } from './heroTemplates.config.js';

export function rollMotivation(heroName, cooperation = null) {
  if (heroName === 'Han Islat') return 'diligent';
  if (cooperation === 'uncooperative') return 'lazy';
  const r = Math.random();
  if (r < 0.25) return 'diligent';
  if (r < 0.80) return 'normal';
  return 'lazy';
}

export function getWeightedStatsForClass(heroClass) {
  const c = (heroClass || '').toLowerCase();
  if (c.includes('tank') || c.includes('vanguard')) {
    return ['str', 'str', 'vit', 'vit', 'vit', 'wil', 'agi'];
  }
  if (c.includes('mercenary')) {
    return ['str', 'str', 'vit', 'vit', 'wil', 'agi'];
  }
  if (c.includes('commoner')) {
    return ['str', 'agi', 'agi', 'vit', 'wil'];
  }
  if (c.includes('scout') || c.includes('ranger') || c.includes('archer') || c.includes('rogue')) {
    return ['agi', 'agi', 'agi', 'str', 'wil', 'vit'];
  }
  if (c.includes('mage') || c.includes('wizard')) {
    return ['int', 'int', 'int', 'wil', 'wil', 'vit'];
  }
  if (c.includes('cleric') || c.includes('priest') || c.includes('healer')) {
    return ['wil', 'wil', 'int', 'int', 'vit', 'str'];
  }
  return ['str', 'agi', 'vit', 'int', 'wil'];
}

export function rollPersonalityTraits(
  motivation = 'normal',
  cooperation = 'cooperative',
  rng = Math.random,
  heroClass = null
) {
  const pool = TRAIT_POOL_BY_MOTIVATION[motivation] || TRAIT_POOL_BY_MOTIVATION.normal;
  const weights = { ...pool };
  if (cooperation === 'uncooperative') {
    const mult = EMOTION_CONFIG.UNCOOPERATIVE_TRAIT_WEIGHT_MULT;
    weights.hot_headed = (weights.hot_headed || 0) * mult;
    weights.coward = (weights.coward || 0) * mult;
    weights.exit_seeker = (weights.exit_seeker || 0) * mult;
  }
  const classPool = TRAIT_POOL_BY_CLASS[heroClass];
  if (classPool) {
    for (const [id, w] of Object.entries(classPool)) {
      weights[id] = (weights[id] || 0) + w;
    }
  }

  const pick = () => {
    const entries = Object.entries(weights);
    const total = entries.reduce((sum, [, w]) => sum + w, 0);
    if (total <= 0) return 'cautious';
    let roll = rng() * total;
    for (const [id, w] of entries) {
      roll -= w;
      if (roll <= 0) return id;
    }
    return entries[entries.length - 1][0];
  };

  const traits = [];
  const first = pick();
  traits.push(first);
  if (rng() < 0.3) {
    const second = pick();
    if (second !== first && !(first === 'diligent' && second === 'lazy') && !(first === 'lazy' && second === 'diligent')) {
      traits.push(second);
    }
  }
  return traits;
}

export function setHeroAnger(hero, value) {
  if (!hero) return 0;
  const next = Math.max(0, Math.min(100, Math.round(value || 0)));
  hero.anger = next;
  hero.stress = next;
  return next;
}

export function addHeroAnger(hero, amount) {
  if (!hero || !amount) return 0;
  const prev = hero.anger ?? hero.stress ?? 0;
  const next = setHeroAnger(hero, prev + amount);
  return next - prev;
}

export function setHeroHunger(hero, value) {
  if (!hero) return 0;
  const next = Math.max(0, Math.min(100, Math.round(value || 0)));
  hero.hunger = next;
  hero.satisfaction = Math.max(0, Math.min(100, 100 - next));
  return next;
}

export function addHeroHunger(hero, amount) {
  if (!hero || !amount) return 0;
  const prev = hero.hunger ?? 0;
  const next = setHeroHunger(hero, prev + amount);
  return next - prev;
}

export function normalizeHeroEmotionFields(hero, rawHero = hero) {
  if (!hero) return hero;

  const star = hero.star || 1;
  const heroClass = hero.class || 'Novice';

  if (hero.mentality === undefined || hero.mentality === null) {
    const legacyComposure = rawHero && rawHero.composure !== undefined && rawHero.composure !== null
      ? rawHero.composure
      : null;
    const seed = legacyComposure !== null ? legacyComposure : getDefaultMentality(heroClass, star);
    hero.mentality = Math.max(0, Math.min(100, Math.round(seed)));
  }

  if (hero.hunger === undefined || hero.hunger === null) {
    const legacySatisfaction = rawHero && rawHero.satisfaction !== undefined && rawHero.satisfaction !== null
      ? rawHero.satisfaction
      : null;
    const seed = legacySatisfaction !== null
      ? 100 - legacySatisfaction
      : EMOTION_CONFIG.DEFAULT_HUNGER;
    hero.hunger = Math.max(0, Math.min(100, Math.round(seed)));
  }

  if (hero.fear === undefined || hero.fear === null) {
    hero.fear = EMOTION_CONFIG.DEFAULT_FEAR;
  }
  hero.fear = Math.max(0, Math.min(100, Math.round(hero.fear)));

  if (hero.anger === undefined || hero.anger === null) {
    hero.anger = hero.stress ?? EMOTION_CONFIG.DEFAULT_ANGER;
  }
  hero.anger = Math.max(0, Math.min(100, Math.round(hero.anger)));

  if (hero.motivationScore === undefined || hero.motivationScore === null) {
    hero.motivationScore = getDefaultMotivationScore(hero.motivation);
  }
  hero.motivationScore = Math.max(0, Math.min(100, Math.round(hero.motivationScore)));

  if (!Array.isArray(hero.traits)) hero.traits = [];
  if (!hero.traits.some((t) => EMOTION_CONFIG.PERSONALITY_TRAITS.includes(t))) {
    const rolled = rollPersonalityTraits(hero.motivation, hero.cooperation, Math.random, heroClass);
    hero.traits = hero.traits.concat(rolled);
  }

  if (hero.isSquadLeader === undefined) {
    hero.isSquadLeader = hero.id === 'hero_han';
  }
  if (!hero.currentActivity) hero.currentActivity = 'idle';
  if (hero.injury === undefined) hero.injury = null;
  if (!hero.painToleranceCounters) {
    hero.painToleranceCounters = { damageTaken: 0, damageHealed: 0 };
  }
  if (!hero.coTrainedPairs) hero.coTrainedPairs = {};
  if (!Array.isArray(hero.activityHistory)) hero.activityHistory = [];

  hero.stress = hero.anger;
  hero.satisfaction = Math.max(0, Math.min(100, 100 - hero.hunger));

  return hero;
}