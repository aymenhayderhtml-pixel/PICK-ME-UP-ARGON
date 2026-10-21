// src/data/skillRecipes.config.js
// Data-driven skill combination recipe table.
//
// A recipe fires when BOTH parent skills are present on the hero, neither is
// already merged, both meet their minimum level, and the hero has trained
// them together at least `requiredCoTrainSessions` times.
//
// The combined skill level is the SUM of the two parent levels.
// Parent skills are not deleted: they are flagged `merged = true` and
// `mergedInto = <result skill id>` so the UI can show the lineage.

export const SKILL_RECIPES = Object.freeze([
  Object.freeze({
    id: 'recipe_sword_shield',
    parentA: 'basic_swordsmanship',
    parentAMinLevel: 2,
    parentB: 'basic_shield_technique',
    parentBMinLevel: 1,
    requiredCoTrainSessions: 3,
    resultSkillId: 'basic_sword_shield',
    resultName: 'Basic Sword-Shield',
    effects: Object.freeze({ damageMult: 0.06, blockStaminaMult: -0.04, blockWindow: 0.015 }),
  }),
  Object.freeze({
    id: 'recipe_bow_quiver',
    parentA: 'basic_archery',
    parentAMinLevel: 2,
    parentB: 'quiver_handling',
    parentBMinLevel: 1,
    requiredCoTrainSessions: 3,
    resultSkillId: 'rapid_volley_archery',
    resultName: 'Rapid Volley Archery',
    effects: Object.freeze({ damageMult: 0.06, critChanceBonus: 0.02, reloadSpeedMult: 0.08 }),
  }),
  Object.freeze({
    id: 'recipe_fire_mana',
    parentA: 'basic_fire_magic',
    parentAMinLevel: 2,
    parentB: 'mana_control',
    parentBMinLevel: 1,
    requiredCoTrainSessions: 3,
    resultSkillId: 'controlled_flamecraft',
    resultName: 'Controlled Flamecraft',
    effects: Object.freeze({ spellDamageMult: 0.07, manaCostReduction: 0.04 }),
  }),
  Object.freeze({
    id: 'recipe_spear_evasion',
    parentA: 'basic_spearmanship',
    parentAMinLevel: 2,
    parentB: 'evasion',
    parentBMinLevel: 1,
    requiredCoTrainSessions: 3,
    resultSkillId: 'phantom_lancer_style',
    resultName: 'Phantom Lancer Style',
    effects: Object.freeze({ damageMult: 0.06, dodgeWindowBonus: 0.02 }),
  }),
  Object.freeze({
    id: 'recipe_dagger_stealth',
    parentA: 'basic_dagger_technique',
    parentAMinLevel: 2,
    parentB: 'stealth',
    parentBMinLevel: 1,
    requiredCoTrainSessions: 3,
    resultSkillId: 'shadow_assassination',
    resultName: 'Shadow Assassination',
    effects: Object.freeze({ damageMult: 0.05, critDamageMult: 0.08 }),
  }),
]);
