// src/core/TrainingEngine.js
// Pure, headless training and fight resolution engine.
//
// Handles: skill XP from real actions, session outcomes, skill combining,
// Pain Tolerance, hit zones, sparring and emotion-driven fights.
//
// The fight engine here is the SINGLE code path used by both the live 3D town
// and the offline login simulation. It drives real Combatants and resolves
// every blow through the real DamageResolver.

import * as THREE from 'three';
import { TRAINING_CONFIG } from '../../data/training.config.js';
import { EMOTION_CONFIG } from '../../data/emotions.config.js';
import { SKILL_RECIPES } from '../../data/skillRecipes.config.js';
import { getSkill, addSkillExp } from '../../data/skills.js';
import { getWeightedStatsForClass, addHeroAnger } from '../../data/heroes.js';
import { ISELLE_FIGHT_EVENT_TEXT, ISELLE_INTERVENTION_REPORT_TEXT } from '../../data/iselle.js';
import { getCombatStats } from '../Stats.js';
import { applyFearGain } from '../EmotionEngine.js';
import { chooseFightAction, chooseSwitchTarget, getFightStyleForHero } from '../FightAI.js';
import { Combatant } from '../../combat/Combatant.js';
import { COMBAT_STATES } from '../../combat/StateMachine.js';
import { DamageResolver } from '../../combat/DamageResolver.js';
import { showSystemMessage } from '../../ui/Notices.js';

const normalizeId = (v) => String(v || '').toLowerCase().replace(/\s+/g, '_');

/** Fills `{token}` placeholders in a report text template. */

function formatTemplate(template, vars) {
  return String(template || '').replace(
    /\{(\w+)\}/g,
    (_, key) => (vars[key] !== undefined ? String(vars[key]) : '')
  );
}

/** Snapshots a hero's level and skill ids before a progression step. */
function captureProgression(hero) {
  const skillIds = new Set();
  for (const s of (hero && hero.skills) || []) {
    skillIds.add(normalizeId(typeof s === 'string' ? s : (s.id || s.name)));
  }
  return { level: hero && hero.level ? hero.level : 1, skillIds };
}

/**
 * Compares a hero's current level and skills to a snapshot taken by
 * captureProgression. Returns the level-up flag, the new level and every skill
 * the hero learned in between (with a resolved display name).
 */
function diffProgression(hero, snapshot) {
  const newLevel = hero && hero.level ? hero.level : 1;
  const leveledUp = newLevel > snapshot.level;
  const newSkills = [];
  for (const s of (hero && hero.skills) || []) {
    const entry = typeof s === 'object' ? s : { id: s, name: s };
    const id = normalizeId(entry.id || entry.name);
    if (!snapshot.skillIds.has(id)) {
      const def = getSkill(id);
      newSkills.push({ id, name: def ? def.name : entry.name });
    }
  }
  return { leveledUp, newLevel, newSkills };
}

/** Finds a skill entry on a hero. Returns the object or null. */
