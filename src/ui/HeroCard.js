import { getRarityHexString, getXpForLevel } from '../data/rules.js';
import { getSkill } from '../data/skills.js';
import { getTalent } from '../data/talents.js';
import { getHeroThreeGroups } from '../core/Stats.js';

function colorToHex(col, fallback) {
  if (typeof col === 'number') {
    return '#' + col.toString(16).padStart(6, '0');
  }
  if (typeof col === 'string') return col;
  return fallback;
}

export function createHeroCard(hero, delay = 0) {
  const card = document.createElement('div');
  const rarityColor = getRarityHexString(hero.star);

  card.style.width = '220px';
  card.style.height = '320px';
  card.style.position = 'relative';
  card.style.overflow = 'hidden';
  card.style.background = `
    repeating-linear-gradient(45deg, transparent, transparent 19px, rgba(255, 180, 140, 0.04) 19px, rgba(255, 180, 140, 0.04) 20px),
    repeating-linear-gradient(-45deg, transparent, transparent 19px, rgba(255, 180, 140, 0.04) 19px, rgba(255, 180, 140, 0.04) 20px),
    linear-gradient(160deg, #140d0f 0%, #2a1512 100%)
  `;
  card.style.border = '2px solid #c87a50'; // Copper 2px border
  card.style.borderRadius = '8px';
  card.style.boxShadow = `0 0 16px rgba(200, 122, 80, 0.35), 0 0 4px ${rarityColor}66`;
  card.style.padding = '10px';
  card.style.display = 'flex';
  card.style.flexDirection = 'column';
  card.style.justifyContent = 'space-between';
  card.style.fontFamily = "'Oswald', 'Bebas Neue', 'Arial Narrow', 'Roboto Condensed', Impact, sans-serif";
  card.style.color = '#ffffff';
  card.style.boxSizing = 'border-box';
  card.style.transition = 'transform 0.28s cubic-bezier(0.175, 0.885, 0.32, 1.275), opacity 0.28s ease';
  card.style.transform = 'perspective(600px) rotateY(90deg)';
  card.style.opacity = '0';

  // Ornate corner chevrons (copper 4 corners)
  const corners = [
    'top:3px; left:3px; border-top:2px solid #e29468; border-left:2px solid #e29468;',
    'top:3px; right:3px; border-top:2px solid #e29468; border-right:2px solid #e29468;',
    'bottom:3px; left:3px; border-bottom:2px solid #e29468; border-left:2px solid #e29468;',
    'bottom:3px; right:3px; border-bottom:2px solid #e29468; border-right:2px solid #e29468;',
  ];
  corners.forEach((css) => {
    const c = document.createElement('div');
    c.style.position = 'absolute';
    c.style.width = '8px';
    c.style.height = '8px';
    c.style.cssText += css;
    c.style.pointerEvents = 'none';
    card.appendChild(c);
  });

  // Flip-in animation
  setTimeout(() => {
    card.style.transform = 'perspective(600px) rotateY(0deg)';
    card.style.opacity = '1';
  }, delay * 1000);

  // 1. Header: Name & Stars
  const header = document.createElement('div');
  header.style.textAlign = 'center';
  header.style.borderBottom = '1px solid rgba(200, 122, 80, 0.35)';
  header.style.paddingBottom = '4px';

  const nameEl = document.createElement('div');
  nameEl.textContent = (hero.name || 'HERO').toUpperCase();
  nameEl.style.fontWeight = 'bold';
  nameEl.style.fontSize = '14px';
  nameEl.style.letterSpacing = '1px';
  nameEl.style.color = '#ffffff';
  nameEl.style.textShadow = '0 0 6px rgba(255,255,255,0.4)';
  header.appendChild(nameEl);

  const starEl = document.createElement('div');
  starEl.textContent = '★'.repeat(hero.star);
  starEl.style.color = rarityColor;
  starEl.style.fontSize = '12px';
  starEl.style.letterSpacing = '2px';
  header.appendChild(starEl);

  card.appendChild(header);

  // 2. Middle Artwork: Rotating Magic Circle + 2D Procedural Bust
  const artBox = document.createElement('div');
  artBox.style.position = 'relative';
  artBox.style.width = '100%';
  artBox.style.height = '140px';
  artBox.style.display = 'flex';
  artBox.style.alignItems = 'center';
  artBox.style.justifyContent = 'center';
  artBox.style.overflow = 'hidden';

  // Canvas for magic circle & procedural bust
  const canvas = document.createElement('canvas');
  canvas.width = 180;
  canvas.height = 130;
  canvas.style.width = '180px';
  canvas.style.height = '130px';
  artBox.appendChild(canvas);

  const ctx = canvas.getContext('2d');
  let angle = 0;
  let animId = null;

  const hairHex = colorToHex(hero.look?.hairColor ?? hero.hair, '#3d2715');
  const armorHex = colorToHex(hero.look?.topColor ?? hero.armor, '#48586c');
  const skinHex = colorToHex(hero.look?.skinTone, '#ffcd94');

  function drawArt() {
    ctx.clearRect(0, 0, 180, 130);

    const cx = 90;
    const cy = 60;

    // A. Rotating Magic Circle (3 concentric rings + 12 ticks)
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angle);

    ctx.strokeStyle = 'rgba(255, 110, 40, 0.6)';
    ctx.shadowColor = '#ff6a20';
    ctx.shadowBlur = 6;

    // Ring 1
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0, 0, 50, 0, Math.PI * 2);
    ctx.stroke();

    // Ring 2
    ctx.lineWidth = 1.0;
    ctx.beginPath();
    ctx.arc(0, 0, 40, 0, Math.PI * 2);
    ctx.stroke();

    // Ring 3
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.arc(0, 0, 26, 0, Math.PI * 2);
    ctx.stroke();

    // 12 rune ticks between ring 1 and ring 2
    ctx.lineWidth = 1.2;
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * 40, Math.sin(a) * 40);
      ctx.lineTo(Math.cos(a) * 50, Math.sin(a) * 50);
      ctx.stroke();
    }
    ctx.restore();

    // B. Procedural 2D Hero Bust
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
    ctx.shadowBlur = 4;

    // Torso / armor shoulders
    ctx.fillStyle = armorHex;
    ctx.beginPath();
    ctx.moveTo(cx - 36, 130);
    ctx.lineTo(cx - 28, 88);
    ctx.quadraticCurveTo(cx - 22, 74, cx - 9, 74);
    ctx.lineTo(cx + 9, 74);
    ctx.quadraticCurveTo(cx + 22, 74, cx + 28, 88);
    ctx.lineTo(cx + 36, 130);
    ctx.closePath();
    ctx.fill();

    // Neck
    ctx.fillStyle = skinHex;
    ctx.fillRect(cx - 7, 60, 14, 16);

    // Head
    ctx.beginPath();
    ctx.arc(cx, 48, 19, 0, Math.PI * 2);
    ctx.fill();

    // Hair
    ctx.fillStyle = hairHex;
    ctx.beginPath();
    ctx.arc(cx, 44, 20, Math.PI * 0.9, Math.PI * 2.1);
    ctx.quadraticCurveTo(cx, 38, cx, 30);
    ctx.fill();

    // Face / eye slits
    ctx.fillStyle = 'rgba(40, 20, 15, 0.7)';
    ctx.fillRect(cx - 9, 48, 5, 2);
    ctx.fillRect(cx + 4, 48, 5, 2);

    ctx.restore();

    angle += 0.015;
    animId = requestAnimationFrame(drawArt);
  }

  drawArt();
  card.appendChild(artBox);

  // 3. Class & Level & Three Groups Summary
  const midInfo = document.createElement('div');
  midInfo.style.textAlign = 'center';
  midInfo.style.fontSize = '11px';

  const groups = getHeroThreeGroups(hero);
  const classRow = document.createElement('div');
  classRow.textContent = `${hero.class.toUpperCase()} | LV ${hero.level || 1}`;
  classRow.style.color = 'var(--gold)';
  classRow.style.fontWeight = 'bold';
  classRow.style.letterSpacing = '0.5px';
  midInfo.appendChild(classRow);

  const groupsRow = document.createElement('div');
  groupsRow.style.display = 'flex';
  groupsRow.style.justifyContent = 'center';
  groupsRow.style.gap = '8px';
  groupsRow.style.marginTop = '2px';
  groupsRow.style.fontSize = '10px';
  groupsRow.style.fontWeight = 'bold';
  groupsRow.innerHTML = `
    <span style="color:#b48cff;">M:${groups.mentality.grade}</span>
    <span style="color:#7dffb0;">S:${groups.skills.grade}</span>
    <span style="color:#ffd36b;">P:${groups.physical.grade}</span>
  `;
  midInfo.appendChild(groupsRow);

  card.appendChild(midInfo);

  // 4. Talents / Hidden Talents Chips
  const talentsBox = document.createElement('div');
  talentsBox.style.display = 'flex';
  talentsBox.style.flexWrap = 'wrap';
  talentsBox.style.justifyContent = 'center';
  talentsBox.style.gap = '4px';
  talentsBox.style.borderTop = '1px solid rgba(200, 122, 80, 0.3)';
  talentsBox.style.paddingTop = '4px';

  const isHidden = hero.talentsRevealed === false;
  if (isHidden) {
    const hiddenChip = document.createElement('span');
    hiddenChip.textContent = 'TALENTS: ???';
    hiddenChip.style.fontSize = '9px';
    hiddenChip.style.color = '#888888';
    hiddenChip.style.border = '1px dashed #666666';
    hiddenChip.style.borderRadius = '3px';
    hiddenChip.style.padding = '1px 5px';
    talentsBox.appendChild(hiddenChip);
  } else {
    const allTalents = hero.talents || [];
    if (allTalents.length === 0) {
      const noneChip = document.createElement('span');
      noneChip.textContent = 'TALENTS: NONE';
      noneChip.style.fontSize = '9px';
      noneChip.style.color = '#777777';
      talentsBox.appendChild(noneChip);
    } else {
      allTalents.forEach((tal) => {
        const chip = document.createElement('span');
        const sDef = getSkill(tal);
        const tDef = getTalent(tal);
        const tName = (sDef?.name || tDef?.name || tal).replace(/_/g, ' ').toUpperCase();
        chip.textContent = tName;
        chip.style.fontSize = '9px';
        chip.style.backgroundColor = 'rgba(200, 122, 80, 0.2)';
        chip.style.border = '1px solid #c87a50';
        chip.style.borderRadius = '3px';
        chip.style.padding = '1px 5px';
        chip.style.color = '#ffcaa0';
        talentsBox.appendChild(chip);
      });
    }
  }

  card.appendChild(talentsBox);
  return card;
}
