// src/ui/RosterEmotionPanel.js
// The emotion, skills and activity sections of the Hero Roster.
//
// PROTECTED AREA (src/ui/*): this is a NEW file, so nothing existing is
// modified. It follows the inline-style visual language of RosterWindow.js and
// reads every threshold from the config files.
//
// The data presenter (getHeroEmotionDisplayModel) is pure and has no DOM
// dependency, so it can be verified in Node without a browser.

import { EMOTION_CONFIG } from '../data/emotions.config.js';
import { TRAINING_CONFIG } from '../data/training.config.js';
import { isHeroPanicking } from '../core/EmotionEngine.js';
import { getPainToleranceLevel } from '../core/Stats.js';

const BAR_COLORS = {
  hunger: '#ffaa44',
  fear: '#6fe0f0',
  anger: '#ff5a6e',
  motivation: '#7dffb0',
  fatigue: '#ffaa00',
  mentality: '#b48cff',
};

const ACTIVITY_LABELS = {
  idle: 'IDLE',
  train_dummy: 'TRAINING (WOODEN DUMMIES)',
  train_archery: 'TRAINING (ARCHERY TARGETS)',
  train_magic: 'TRAINING (FIRE TARGETS)',
  spar: 'SPARRING',
  eat: 'AT THE CAFETERIA',
  rest: 'RESTING IN THE DORMITORY',
};

const clamp100 = (v) => Math.max(0, Math.min(100, Math.round(v || 0)));

/**
 * Builds the pure data model the roster panel renders.
 * Returns a plain object: no DOM, no side effects.
 */
export function getHeroEmotionDisplayModel(hero) {
  if (!hero) {
    return {
      activityLabel: 'UNKNOWN',
      isSquadLeader: false,
      isPanicking: false,
      injuryText: null,
      bars: [],
      painTolerance: {
        unlocked: false,
        level: 0,
        damageReductionPct: '0.0%',
        damageTaken: 0,
        damageHealed: 0,
        nextThreshold: TRAINING_CONFIG.PAIN_TOLERANCE_THRESHOLD_PER_LEVEL,
      },
      skills: [],
      recentHistory: [],
    };
  }

  const panicking = isHeroPanicking(hero);

  const activityKey = hero.currentActivity || 'idle';
  const activityLabel = panicking
    ? 'PANICKED'
    : (ACTIVITY_LABELS[activityKey] || String(activityKey).toUpperCase());

  let injuryText = null;
  if (hero.injury) {
    const zone = String(hero.injury.zone || 'body').toUpperCase();
    const severity = String(hero.injury.severity || 'minor').toUpperCase();
    const days = hero.injury.daysRemaining || 0;
    injuryText = `${severity} ${zone} INJURY (${days}d left)`;
  }

  const bars = [
    { key: 'hunger', label: 'HUNGER', value: clamp100(hero.hunger), color: BAR_COLORS.hunger },
    { key: 'fear', label: 'FEAR', value: clamp100(hero.fear), color: BAR_COLORS.fear },
    { key: 'anger', label: 'ANGER', value: clamp100(hero.anger), color: BAR_COLORS.anger },
    { key: 'motivation', label: 'MOTIVATION', value: clamp100(hero.motivationScore), color: BAR_COLORS.motivation },
    { key: 'fatigue', label: 'FATIGUE', value: clamp100(hero.fatigue), color: BAR_COLORS.fatigue },
    { key: 'mentality', label: 'MENTALITY', value: clamp100(hero.mentality), color: BAR_COLORS.mentality },
  ];

  // --- Pain Tolerance -----------------------------------------------------
  const ptLevel = getPainToleranceLevel(hero);
  const counters = hero.painToleranceCounters || { damageTaken: 0, damageHealed: 0 };
  const dr = Math.min(
    0.75,
    ptLevel * TRAINING_CONFIG.PAIN_TOLERANCE_DR_PER_LEVEL
  );
  const nextThreshold =
    TRAINING_CONFIG.PAIN_TOLERANCE_THRESHOLD_PER_LEVEL * Math.max(1, ptLevel + 1);

  const painTolerance = {
    unlocked: ptLevel > 0,
    level: ptLevel,
    damageReductionPct: `${(dr * 100).toFixed(1)}%`,
    damageTaken: counters.damageTaken || 0,
    damageHealed: counters.damageHealed || 0,
    nextThreshold,
  };

  // --- Skills -------------------------------------------------------------
  const skills = (hero.skills || []).map((s) => {
    const id = typeof s === 'string' ? s : (s.id || s.name || '');
    const level = typeof s === 'object' ? (s.level || 1) : 1;
    const exp = typeof s === 'object' ? (s.exp || 0) : 0;
    const merged = typeof s === 'object' && s.merged === true;
    const mergedInto = typeof s === 'object' ? mergedIntoName(s.mergedInto) : null;
    return {
      id,
      name: (typeof s === 'object' && s.name) || id,
      level,
      exp,
      neededXp: 100 * level,
      isMerged: merged,
      mergedIntoName: mergedInto,
      isCombined: !merged && isCombinedSkill(id),
    };
  });

  // --- Recent history -----------------------------------------------------
  const recentHistory = (hero.activityHistory || [])
    .slice(-5)
    .reverse()
    .map((h) => ({ day: h.day, text: h.text, type: h.type }));

  return {
    activityLabel,
    isSquadLeader: hero.isSquadLeader === true,
    isPanicking: panicking,
    injuryText,
    bars,
    painTolerance,
    skills,
    recentHistory,
  };
}

function mergedIntoName(skillId) {
  if (!skillId) return null;
  return String(skillId).replace(/_/g, ' ').toUpperCase();
}

function isCombinedSkill(skillId) {
  const id = String(skillId || '');
  return [
    'basic_sword_shield',
    'rapid_volley_archery',
    'controlled_flamecraft',
    'phantom_lancer_style',
    'shadow_assassination',
  ].includes(id);
}

/** Builds a single labelled bar. */
function createBar(bar) {
  const wrap = document.createElement('div');
  wrap.style.display = 'flex';
  wrap.style.flexDirection = 'column';
  wrap.style.gap = '2px';
  wrap.style.marginBottom = '4px';

  const label = document.createElement('div');
  label.style.display = 'flex';
  label.style.justifyContent = 'space-between';
  label.style.fontSize = '10px';
  label.style.color = '#aaaaaa';
  label.innerHTML = `<span>${bar.label}</span><span>${bar.value}</span>`;

  const bg = document.createElement('div');
  bg.style.width = '100%';
  bg.style.height = '6px';
  bg.style.backgroundColor = 'rgba(255,255,255,0.06)';
  bg.style.borderRadius = '3px';
  bg.style.overflow = 'hidden';

  const fill = document.createElement('div');
  fill.style.width = `${bar.value}%`;
  fill.style.height = '100%';
  fill.style.backgroundColor = bar.color;
  bg.appendChild(fill);

  wrap.appendChild(label);
  wrap.appendChild(bg);
  return wrap;
}

/** The emotion bars plus the current activity pill. */
export function createEmotionBarsSection(hero) {
  const model = getHeroEmotionDisplayModel(hero);
  const section = document.createElement('div');
  section.style.backgroundColor = 'rgba(20, 15, 35, 0.6)';
  section.style.border = '1px solid var(--frame-inner)';
  section.style.borderRadius = '6px';
  section.style.padding = '8px 10px';
  section.style.marginTop = '8px';

  const head = document.createElement('div');
  head.style.display = 'flex';
  head.style.justifyContent = 'space-between';
  head.style.alignItems = 'center';
  head.style.marginBottom = '6px';

  const title = document.createElement('div');
  title.textContent = 'CONDITION';
  title.style.fontSize = '11px';
  title.style.fontWeight = 'bold';
  title.style.color = '#b48cff';

  const pill = document.createElement('div');
  pill.textContent = model.activityLabel;
  pill.style.fontSize = '10px';
  pill.style.fontWeight = 'bold';
  pill.style.padding = '2px 8px';
  pill.style.borderRadius = '10px';
  pill.style.border = '1px solid ' + (model.isPanicking ? '#ff5a6e' : '#5b4a8a');
  pill.style.color = model.isPanicking ? '#ff5a6e' : '#b48cff';
  pill.style.backgroundColor = model.isPanicking ? 'rgba(255,90,110,0.15)' : 'rgba(180,140,255,0.12)';

  head.appendChild(title);
  head.appendChild(pill);
  section.appendChild(head);

  if (model.injuryText) {
    const injury = document.createElement('div');
    injury.textContent = model.injuryText;
    injury.style.fontSize = '11px';
    injury.style.color = '#ff5a6e';
    injury.style.marginBottom = '4px';
    section.appendChild(injury);
  }

  for (const bar of model.bars) {
    section.appendChild(createBar(bar));
  }

  if (model.isSquadLeader) {
    const leader = document.createElement('div');
    leader.textContent = '[ SQUAD LEADER ]';
    leader.style.fontSize = '10px';
    leader.style.fontWeight = 'bold';
    leader.style.color = '#ffd36b';
    leader.style.marginTop = '2px';
    section.appendChild(leader);
  }

  return section;
}

/**
 * The skill combining line and the Pain Tolerance tracker.
 * The plain skill list already lives in the roster, so this section only
 * shows what is NEW: combined skills, merged parents and Pain Tolerance.
 */
export function createSkillsAndCombiningSection(hero) {
  const model = getHeroEmotionDisplayModel(hero);
  const section = document.createElement('div');
  section.style.backgroundColor = 'rgba(20, 15, 35, 0.6)';
  section.style.border = '1px solid var(--frame-inner)';
  section.style.borderRadius = '6px';
  section.style.padding = '8px 10px';
  section.style.marginTop = '8px';

  const title = document.createElement('div');
  title.textContent = 'SKILL COMBINING & PAIN TOLERANCE';
  title.style.fontSize = '11px';
  title.style.fontWeight = 'bold';
  title.style.color = '#7dffb0';
  title.style.marginBottom = '6px';
  section.appendChild(title);

  const special = model.skills.filter((s) => s.isCombined || s.isMerged);
  if (special.length === 0) {
    const empty = document.createElement('div');
    empty.textContent = 'No skills learned yet.';
    empty.style.fontSize = '11px';
    empty.style.color = '#777777';
    empty.style.fontStyle = 'italic';
    section.appendChild(empty);
  }

  for (const skill of special) {
    const row = document.createElement('div');
    row.style.backgroundColor = 'rgba(0,0,0,0.3)';
    row.style.borderRadius = '4px';
    row.style.padding = '5px 8px';
    row.style.marginBottom = '4px';
    row.style.opacity = skill.isMerged ? '0.55' : '1';

    const name = document.createElement('div');
    name.style.display = 'flex';
    name.style.justifyContent = 'space-between';
    name.style.fontSize = '12px';

    const left = document.createElement('div');
    left.innerHTML =
      `<span style="color:#ffffff;">${skill.name}</span> ` +
      `<span style="color:#ffd36b;">Lv${skill.level}</span>`;

    const right = document.createElement('div');
    right.style.fontSize = '10px';
    if (skill.isCombined) {
      right.textContent = '[COMBINED]';
      right.style.color = '#ffd36b';
    } else {
      right.textContent = `[MERGED -> ${skill.mergedIntoName}]`;
      right.style.color = '#9a9a9a';
    }

    name.appendChild(left);
    name.appendChild(right);
    row.appendChild(name);
    section.appendChild(row);
  }

  // --- Pain Tolerance tracker --------------------------------------------
  const pt = model.painTolerance;
  const ptBox = document.createElement('div');
  ptBox.style.backgroundColor = 'rgba(0,0,0,0.3)';
  ptBox.style.border = '1px solid rgba(111,224,240,0.25)';
  ptBox.style.borderRadius = '4px';
  ptBox.style.padding = '5px 8px';
  ptBox.style.marginTop = '4px';
  ptBox.style.fontSize = '11px';
  ptBox.style.color = pt.unlocked ? '#6fe0f0' : '#777777';
  ptBox.textContent =
    `PAIN TOLERANCE ${pt.unlocked ? `Lv${pt.level}` : '(LOCKED)'} | ` +
    `Dmg Taken: ${pt.damageTaken}/${pt.nextThreshold} | ` +
    `Healed: ${pt.damageHealed}/${pt.nextThreshold} | ` +
    `Reduction: -${pt.damageReductionPct}`;
  section.appendChild(ptBox);

  return section;
}

/** The short activity history. */
export function createActivityHistorySection(hero) {
  const model = getHeroEmotionDisplayModel(hero);
  const section = document.createElement('div');
  section.style.backgroundColor = 'rgba(20, 15, 35, 0.6)';
  section.style.border = '1px solid var(--frame-inner)';
  section.style.borderRadius = '6px';
  section.style.padding = '8px 10px';
  section.style.marginTop = '8px';

  const title = document.createElement('div');
  title.textContent = 'RECENT ACTIVITY';
  title.style.fontSize = '11px';
  title.style.fontWeight = 'bold';
  title.style.color = '#6fe0f0';
  title.style.marginBottom = '4px';
  section.appendChild(title);

  if (model.recentHistory.length === 0) {
    const empty = document.createElement('div');
    empty.textContent = 'No recent activity recorded.';
    empty.style.fontSize = '11px';
    empty.style.color = '#777777';
    empty.style.fontStyle = 'italic';
    section.appendChild(empty);
  } else {
    for (const entry of model.recentHistory) {
      const line = document.createElement('div');
      line.style.fontSize = '11px';
      line.style.color = '#aabbcc';
      line.textContent = `Day ${entry.day}: ${entry.text}`;
      section.appendChild(line);
    }
  }

  return section;
}
