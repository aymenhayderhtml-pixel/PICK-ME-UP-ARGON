import { attachOrnateCorners } from './ornaments.js';
import { getDisplayStats, getCombatStats } from '../core/Stats.js';
import { getXpForLevel } from '../data/rules.js';
import { isAnySystemWindowOpen } from './Hud.js';
import { drawIsellePortrait } from '../art/iselle.js';

let noticeContainer = null;
let statusNoticeContainer = null;
let activeNotices = [];
let pendingNoticeQueue = [];
let activeStatusNotices = [];
let walkoutQueue = [];
let isProcessingWalkout = false;
let activeEquipNotice = null;

function getNoticeContainer() {
  if (typeof document === 'undefined') return null;
  if (!noticeContainer || !noticeContainer.parentNode) {
    noticeContainer = document.createElement('div');
    noticeContainer.id = 'mm-notice-stack';
    noticeContainer.style.cssText = `
      position: fixed;
      top: 84px;
      left: 50%;
      transform: translateX(-50%);
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 10px;
      z-index: 10010;
      pointer-events: none;
      width: 100%;
      max-width: 420px;
      box-sizing: border-box;
      transition: all 0.3s ease;
    `;
    document.body.appendChild(noticeContainer);
  }

  // When a system window is open, shift notice stack to top right so windows are never covered
  if (isAnySystemWindowOpen()) {
    noticeContainer.style.left = 'auto';
    noticeContainer.style.right = '20px';
    noticeContainer.style.transform = 'none';
  } else {
    noticeContainer.style.left = '50%';
    noticeContainer.style.right = 'auto';
    noticeContainer.style.transform = 'translateX(-50%)';
  }

  return noticeContainer;
}

function getStatusNoticeContainer() {
  if (typeof document === 'undefined') return null;
  if (!statusNoticeContainer || !statusNoticeContainer.parentNode) {
    statusNoticeContainer = document.createElement('div');
    statusNoticeContainer.id = 'mm-status-notice-stack';
    statusNoticeContainer.style.cssText = `
      position: fixed;
      top: 280px;
      right: 20px;
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 10px;
      z-index: 10010;
      pointer-events: none;
      width: 340px;
      max-width: 90vw;
      box-sizing: border-box;
    `;
    document.body.appendChild(statusNoticeContainer);
  }
  return statusNoticeContainer;
}

export function clearSystemMessages() {
  for (const item of activeNotices) {
    if (item.timer) clearTimeout(item.timer);
    if (item.box && item.box.parentNode) {
      item.box.parentNode.removeChild(item.box);
    }
  }
  activeNotices = [];
  pendingNoticeQueue = [];

  for (const item of activeStatusNotices) {
    if (item.timer) clearTimeout(item.timer);
    if (item.box && item.box.parentNode) {
      item.box.parentNode.removeChild(item.box);
    }
  }
  activeStatusNotices = [];
}

function processNoticeQueue() {
  while (activeNotices.length < 2 && pendingNoticeQueue.length > 0) {
    const nextNotice = pendingNoticeQueue.shift();
    displayNoticeBox(nextNotice.htmlOrText, nextNotice.duration, nextNotice.options);
  }
}

function displayNoticeBox(htmlOrText, duration = 2500, options = {}) {
  const container = getNoticeContainer();
  if (!container) return null;

  const box = document.createElement('div');
  box.className = 'mm-panel';
  box.style.cssText = `
    width: 100%;
    max-width: 420px;
    width: min(420px, 90vw);
    padding: 12px 22px;
    font-size: 17px;
    box-sizing: border-box;
    background: rgba(11, 8, 16, 0.94);
    opacity: 0;
    transform: scale(0.96);
    transition: opacity 0.22s ease-out, transform 0.22s ease-out;
    pointer-events: ${options.interactive ? 'auto' : 'none'};
    ${options.extraStyle || ''}
  `;

  if (options.iselleSpeaker) {
    const row = document.createElement('div');
    row.style.cssText = 'display:flex; align-items:center; gap:12px; width:100%; text-align:left;';

    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    canvas.style.cssText = 'width:52px; height:52px; border-radius:6px; border:1px solid var(--frame-inner); background:#171026; flex-shrink:0;';
    const ctx = canvas.getContext('2d');
    try {
      drawIsellePortrait(ctx, options.expression || 'sweet_cruel', 64);
    } catch (e) {}
    row.appendChild(canvas);

    const contentDiv = document.createElement('div');
    contentDiv.style.cssText = 'flex:1;';
    if (typeof htmlOrText === 'string') {
      contentDiv.innerHTML = htmlOrText;
    } else if (htmlOrText instanceof HTMLElement) {
      contentDiv.appendChild(htmlOrText);
    }
    row.appendChild(contentDiv);
    box.appendChild(row);
  } else {
    if (typeof htmlOrText === 'string') {
      box.innerHTML = htmlOrText;
    } else if (htmlOrText instanceof HTMLElement) {
      box.appendChild(htmlOrText);
    }
  }

  // Corner ornaments scaled to 30px
  attachOrnateCorners(box, 30);
  container.appendChild(box);

  requestAnimationFrame(() => {
    box.style.opacity = '1';
    box.style.transform = 'scale(1)';
  });

  const item = { box, timer: null, text: options.text || '' };

  const dismiss = () => {
    if (item.timer) clearTimeout(item.timer);
    box.style.opacity = '0';
    box.style.transform = 'scale(0.96)';
    setTimeout(() => {
      if (box.parentNode) box.parentNode.removeChild(box);
      const idx = activeNotices.indexOf(item);
      if (idx !== -1) activeNotices.splice(idx, 1);
      processNoticeQueue();
    }, 220);
  };

  if (duration > 0) {
    item.timer = setTimeout(dismiss, duration);
  }

  activeNotices.push(item);
  return { box, dismiss };
}

export function createNoticeBox(htmlOrText, duration = 2500, options = {}) {
  // Queue notice if 2 are already displayed
  if (activeNotices.length >= 2) {
    pendingNoticeQueue.push({ htmlOrText, duration, options });
    return null;
  }
  return displayNoticeBox(htmlOrText, duration, options);
}

// showSystemMessage: Strip square brackets, uppercase, max 2 visible, queued, 2.5s duration
export function showSystemMessage(text) {
  if (!text || typeof document === 'undefined') return;

  const cleanText = String(text)
    .replace(/^[\[\s]+|[\]\s]+$/g, '')
    .replace(/[\[\]]/g, '')
    .trim()
    .toUpperCase();

  // Deduplicate rapid consecutive identical messages
  const last = activeNotices[activeNotices.length - 1];
  if (last && last.text === cleanText) return;

  createNoticeBox(`<div>${cleanText}</div>`, 2500, { text: cleanText });
}

export function showSystemNotice(title, text) {
  if (typeof document === 'undefined') return;
  const content = `<div><b style="color:var(--gold);">${String(title).toUpperCase()}</b><br><span style="font-size:14px;">${String(text).toUpperCase()}</span></div>`;
  createNoticeBox(content, 2500, { text: `${title}: ${text}` });
}

// showNotices: queue multiple notices sequentially (supports options with iselleSpeaker: true)
export function showNotices(texts, durationOrOptions = 2500, maybeOptions = {}) {
  if (!Array.isArray(texts) || typeof document === 'undefined') return;

  let duration = 2500;
  let options = {};
  if (typeof durationOrOptions === 'number') {
    duration = durationOrOptions;
    options = maybeOptions || {};
  } else if (durationOrOptions && typeof durationOrOptions === 'object') {
    options = durationOrOptions;
    duration = options.duration || 2500;
  }

  texts.forEach((t) => {
    const clean = String(t)
      .replace(/^[\[\s]+|[\]\s]+$/g, '')
      .replace(/[\[\]]/g, '')
      .trim()
      .toUpperCase();
    createNoticeBox(`<div>${clean}</div>`, duration, { ...options, text: clean });
  });
}

// showStatusNotice: compact hero stats on right side under minimap (top: 280px, right: 20px, width: 340px, font: 15px, 3.5s)
export function showStatusNotice(hero, duration = 3500) {
  if (!hero || typeof document === 'undefined') return null;

  const container = getStatusNoticeContainer();
  if (!container) return null;

  const name = (hero.name || 'HERO').toUpperCase();
  const starCount = Math.max(1, hero.star || 1);
  const starStr = '★'.repeat(starCount);
  const level = hero.level || 1;
  const exp = hero.exp || 0;
  const maxExp = getXpForLevel(level);

  const isNovice = starCount <= 2 || !hero.class || hero.class.toLowerCase() === 'none' || hero.class.toLowerCase() === 'novice';
  const className = isNovice ? 'NOVICE' : hero.class.toUpperCase();

  const disp = getDisplayStats(hero);
  const combat = getCombatStats(hero);
  const hpVal = Math.round((combat.maxHp || 100) / 10);

  const skills = hero.skills && hero.skills.length > 0
    ? hero.skills.map((s) => `${(s.name || s.id || 'SKILL').toUpperCase()} (LV.${s.level || 1})`).join(', ')
    : 'NONE';

  const box = document.createElement('div');
  box.className = 'mm-panel';
  box.style.cssText = `
    width: 340px;
    padding: 10px 14px;
    font-size: 15px;
    background: rgba(11, 8, 16, 0.94);
    box-sizing: border-box;
    opacity: 0;
    transform: scale(0.96);
    transition: opacity 0.22s ease-out, transform 0.22s ease-out;
  `;

  box.innerHTML = `
    <div style="display:flex; flex-direction:column; gap:4px; letter-spacing:0.4px; text-align:left;">
      <div style="font-size:16px; color:var(--text); font-weight:700; text-align:center;">${name} (${starStr}) LV.${level} (EXP ${exp}/${maxExp})</div>
      <div style="font-size:13px; color:var(--accent); text-align:center;">CLASS: ${className}</div>
      <div style="font-size:12px; color:var(--text); margin-top:2px;">
        STR: ${disp.str.current}/${disp.str.base} &bull; INT: ${disp.int.current}/${disp.int.base} &bull; HP: ${hpVal}/${hpVal}
      </div>
      <div style="font-size:12px; color:var(--text);">AGI: ${disp.agi.current}/${disp.agi.base}</div>
      <div style="font-size:11px; color:var(--frame); margin-top:2px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">SKILLS: ${skills}</div>
    </div>
  `;

  attachOrnateCorners(box, 26);
  container.appendChild(box);

  requestAnimationFrame(() => {
    box.style.opacity = '1';
    box.style.transform = 'scale(1)';
  });

  const item = { box, timer: null };
  const dismiss = () => {
    if (item.timer) clearTimeout(item.timer);
    box.style.opacity = '0';
    box.style.transform = 'scale(0.96)';
    setTimeout(() => {
      if (box.parentNode) box.parentNode.removeChild(box);
      const idx = activeStatusNotices.indexOf(item);
      if (idx !== -1) activeStatusNotices.splice(idx, 1);
    }, 220);
  };

  item.timer = setTimeout(dismiss, duration);
  activeStatusNotices.push(item);

  // Keep max 2 status notices
  while (activeStatusNotices.length > 2) {
    const oldest = activeStatusNotices.shift();
    if (oldest.timer) clearTimeout(oldest.timer);
    if (oldest.box && oldest.box.parentNode) {
      oldest.box.parentNode.removeChild(oldest.box);
    }
  }

  return { box, dismiss };
}

// Hero death notice sequence: ONE panel with 3 lines, preceded by status notice
export function showHeroDeathNotice(hero, deathCause) {
  if (!hero) return;
  const name = (hero.name || 'HERO').toUpperCase();
  const cause = (deathCause || 'KILLED IN BATTLE').toUpperCase();

  // Show status notice first
  showStatusNotice(hero, 4000);

  // Single death notice panel with 3 lines
  const deathHtml = `
    <div style="display:flex; flex-direction:column; gap:4px; line-height:1.35; text-align:center;">
      <div style="color:var(--danger); font-weight:bold; font-size:17px;">${name} HAS RETURNED TO THE GODDESS.</div>
      <div style="color:var(--accent); font-size:14px;">THEIR FIGHTING SPIRIT WILL BE REMEMBERED FOR ETERNITY.</div>
      <div style="color:var(--text); font-size:14px; margin-top:2px;">CAUSE OF DEATH: ${cause}</div>
    </div>
  `;

  createNoticeBox(deathHtml, 4500, { extraStyle: 'padding: 14px 20px;' });
}

// Queue for hero walkouts from summoning house
export function queueHeroWalkoutNotice(heroes) {
  if (!heroes || heroes.length === 0) return;

  if (heroes.length > 1) {
    const highTier = heroes.filter((h) => (h.star || 1) >= 3);
    const lowTierCount = heroes.length - highTier.length;
    if (lowTierCount > 0) {
      showSystemMessage(`${lowTierCount} HEROES SUMMONED`);
    }
    highTier.forEach((h) => walkoutQueue.push(h));
  } else {
    walkoutQueue.push(heroes[0]);
  }

  processWalkoutQueue();
}

function processWalkoutQueue() {
  if (isProcessingWalkout || walkoutQueue.length === 0) return;
  isProcessingWalkout = true;

  const hero = walkoutQueue.shift();
  showStatusNotice(hero, 3500);

  setTimeout(() => {
    isProcessingWalkout = false;
    processWalkoutQueue();
  }, 1200);
}

// Equipment Notice for Deploy Window & Tutorial: stays at bottom-center above hint bar until player answers
export function showEquipmentNotice(optionsOrOnSummon = {}, maybeOnLater = null) {
  let onSummon = null;
  let onLater = null;

  if (typeof optionsOrOnSummon === 'function') {
    onSummon = optionsOrOnSummon;
    onLater = maybeOnLater;
  } else if (optionsOrOnSummon && typeof optionsOrOnSummon === 'object') {
    onSummon = optionsOrOnSummon.onSummon;
    onLater = optionsOrOnSummon.onLater;
  }

  if (activeEquipNotice) {
    activeEquipNotice.dismiss();
    activeEquipNotice = null;
  }

  const equipWrap = document.createElement('div');
  equipWrap.id = 'mm-equipment-notice';
  equipWrap.style.cssText = `
    position: fixed;
    bottom: 74px;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    z-index: 10020;
    width: 100%;
    max-width: 420px;
    width: min(420px, 92vw);
    box-sizing: border-box;
    pointer-events: auto;
  `;

  const box = document.createElement('div');
  box.className = 'mm-panel';
  box.style.cssText = `
    width: 100%;
    padding: 12px 18px;
    font-size: 16px;
    box-sizing: border-box;
    background: rgba(11, 8, 16, 0.94);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
  `;
  attachOrnateCorners(box, 30);

  const contentRow = document.createElement('div');
  contentRow.style.cssText = 'display: flex; align-items: center; gap: 12px; width: 100%;';

  const portraitCanvas = document.createElement('canvas');
  portraitCanvas.width = 64;
  portraitCanvas.height = 64;
  portraitCanvas.style.cssText = 'width: 56px; height: 56px; border-radius: 6px; border: 1px solid var(--frame-inner); background: #171026; flex-shrink: 0;';
  const pCtx = portraitCanvas.getContext('2d');
  try {
    drawIsellePortrait(pCtx, 'sweet_cruel', 64);
  } catch (e) {}
  contentRow.appendChild(portraitCanvas);

  const textCol = document.createElement('div');
  textCol.style.cssText = 'display: flex; flex-direction: column; gap: 4px; flex: 1;';

  const t1 = document.createElement('div');
  t1.style.cssText = 'color:var(--text); font-weight:bold; font-size:15px; text-align:left;';
  t1.textContent = "MASTER, THE HEROES DON'T HAVE EQUIPMENT.";
  textCol.appendChild(t1);

  const t2 = document.createElement('div');
  t2.style.cssText = 'color:var(--accent); font-size:13px; text-align:left; line-height:1.25;';
  t2.textContent = 'HOW ABOUT SUMMONING EQUIPMENT FOR A SMOOTH BATTLE AHEAD?';
  textCol.appendChild(t2);

  contentRow.appendChild(textCol);
  box.appendChild(contentRow);

  const btnRow = document.createElement('div');
  btnRow.style.cssText = 'display: flex; gap: 12px; justify-content: center; width: 100%; margin-top: 4px;';

  const summonBtn = document.createElement('button');
  summonBtn.className = 'mm-btn mm-btn-gold';
  summonBtn.textContent = 'SUMMON EQUIPMENT';
  summonBtn.style.padding = '6px 16px';
  summonBtn.style.fontSize = '13px';

  const laterBtn = document.createElement('button');
  laterBtn.className = 'mm-btn';
  laterBtn.textContent = 'LATER';
  laterBtn.style.padding = '6px 16px';
  laterBtn.style.fontSize = '13px';

  btnRow.appendChild(summonBtn);
  btnRow.appendChild(laterBtn);
  box.appendChild(btnRow);

  equipWrap.appendChild(box);
  document.body.appendChild(equipWrap);

  const dismiss = () => {
    if (equipWrap.parentNode) equipWrap.parentNode.removeChild(equipWrap);
    if (activeEquipNotice && activeEquipNotice.dismiss === dismiss) {
      activeEquipNotice = null;
    }
  };

  summonBtn.addEventListener('click', () => {
    dismiss();
    if (onSummon) onSummon();
  });

  laterBtn.addEventListener('click', () => {
    dismiss();
    if (onLater) onLater();
  });

  activeEquipNotice = { dismiss, box: equipWrap };
  return activeEquipNotice;
}
