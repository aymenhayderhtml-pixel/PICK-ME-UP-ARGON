import { SystemWindow } from './SystemWindow.js';
import { gameState } from '../core/GameState.js';
import { getRarityHexString, getSynthesisXp, getSkillInheritChance, getXpForLevel, LEVEL_CAP_PER_STAR } from '../data/rules.js';
import { getDisplayStats, formatStatDisplay } from '../core/Stats.js';

export class SynthesisWindow extends SystemWindow {
  constructor(onConfirmSynthesis) {
    super('HERO SYNTHESIS CHAMBER');
    this.onConfirmSynthesis = onConfirmSynthesis;

    this.container.style.width = '840px';
    this.container.style.maxWidth = '95vw';
    this.container.style.border = '1px solid #ff3344';
    this.container.style.boxShadow = '0 0 20px rgba(255, 51, 68, 0.4)';
    this.container.style.backgroundColor = 'rgba(20, 10, 15, 0.94)';

    // Adjust title bar
    this.titleBar.style.backgroundColor = 'rgba(255, 51, 68, 0.2)';
    this.titleBar.style.borderBottom = '1px solid rgba(255, 51, 68, 0.4)';
    this.titleLabel.style.color = '#ff4455';
    this.closeBtn.style.color = '#ff4455';

    this.baseHeroId = null;
    this.materialHeroIds = []; // up to 4

    this.buildUI();
  }

  open(preselectedBaseId = null) {
    if (preselectedBaseId) {
      this.baseHeroId = preselectedBaseId;
      this.materialHeroIds = this.materialHeroIds.filter((id) => id !== preselectedBaseId);
    } else if (!this.baseHeroId && gameState.heroes.length > 0) {
      this.baseHeroId = gameState.heroes[0].id;
    }
    this.render();
    super.open();
  }

  buildUI() {
    this.contentElement.style.padding = '14px 18px';
    this.contentElement.style.display = 'flex';
    this.contentElement.style.flexDirection = 'column';
    this.contentElement.style.gap = '12px';

    // 1. Slots Overview: Base Hero on Left, up to 4 Materials on Right
    this.slotsSection = document.createElement('div');
    this.slotsSection.style.display = 'flex';
    this.slotsSection.style.gap = '14px';
    this.contentElement.appendChild(this.slotsSection);

    // 2. Live Preview Panel (EXP, Skills, Warning)
    this.previewPanel = document.createElement('div');
    this.previewPanel.style.backgroundColor = 'rgba(30, 12, 18, 0.8)';
    this.previewPanel.style.border = '1px solid rgba(255, 51, 68, 0.3)';
    this.previewPanel.style.borderRadius = '6px';
    this.previewPanel.style.padding = '10px 14px';
    this.previewPanel.style.display = 'flex';
    this.previewPanel.style.flexDirection = 'column';
    this.previewPanel.style.gap = '6px';
    this.contentElement.appendChild(this.previewPanel);

    // 3. Hero Picker List
    const pickerHeader = document.createElement('div');
    pickerHeader.style.display = 'flex';
    pickerHeader.style.justifyContent = 'space-between';
    pickerHeader.style.alignItems = 'center';
    pickerHeader.innerHTML = `
      <span style="font-size:12px; font-weight:bold; color:#ff8899;">SELECT HEROES FOR SYNTHESIS:</span>
      <span style="font-size:11px; color:#aaa;">(Han Islat cannot be used as material)</span>
    `;
    this.contentElement.appendChild(pickerHeader);

    this.pickerList = document.createElement('div');
    this.pickerList.style.maxHeight = '160px';
    this.pickerList.style.overflowY = 'auto';
    this.pickerList.style.display = 'grid';
    this.pickerList.style.gridTemplateColumns = 'repeat(2, 1fr)';
    this.pickerList.style.gap = '6px';
    this.contentElement.appendChild(this.pickerList);

    // 4. Action Bar (Hold 1.5s Confirm Button)
    const bottomBar = document.createElement('div');
    bottomBar.style.display = 'flex';
    bottomBar.style.justifyContent = 'flex-end';
    bottomBar.style.alignItems = 'center';
    bottomBar.style.gap = '12px';
    bottomBar.style.marginTop = '4px';

    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = 'Cancel';
    cancelBtn.style.padding = '8px 18px';
    cancelBtn.style.fontFamily = 'monospace';
    cancelBtn.style.fontSize = '12px';
    cancelBtn.style.backgroundColor = 'transparent';
    cancelBtn.style.border = '1px solid #666666';
    cancelBtn.style.color = '#aaaaaa';
    cancelBtn.style.borderRadius = '4px';
    cancelBtn.style.cursor = 'pointer';
    cancelBtn.addEventListener('click', () => this.close());
    bottomBar.appendChild(cancelBtn);

    this.confirmBtn = this.createHoldButton(
      'HOLD TO SYNTHESIZE (1.5s)',
      1500,
      '#ff2233',
      () => {
        if (!this.baseHeroId || this.materialHeroIds.length === 0) return;
        const baseId = this.baseHeroId;
        const matIds = [...this.materialHeroIds];
        this.close();
        if (this.onConfirmSynthesis) {
          this.onConfirmSynthesis(baseId, matIds);
        }
      }
    );
    bottomBar.appendChild(this.confirmBtn);

    this.contentElement.appendChild(bottomBar);
  }

  createHoldButton(label, holdMs, color, onConfirmed) {
    const btn = document.createElement('button');
    btn.style.position = 'relative';
    btn.style.padding = '10px 24px';
    btn.style.fontFamily = 'monospace, sans-serif';
    btn.style.fontSize = '13px';
    btn.style.fontWeight = 'bold';
    btn.style.color = '#ffffff';
    btn.style.backgroundColor = 'rgba(40, 10, 15, 0.9)';
    btn.style.border = `2px solid ${color}`;
    btn.style.borderRadius = '5px';
    btn.style.cursor = 'pointer';
    btn.style.overflow = 'hidden';
    btn.style.userSelect = 'none';

    const fillBar = document.createElement('div');
    fillBar.style.position = 'absolute';
    fillBar.style.top = '0';
    fillBar.style.left = '0';
    fillBar.style.height = '100%';
    fillBar.style.width = '0%';
    fillBar.style.backgroundColor = color;
    fillBar.style.opacity = '0.55';
    fillBar.style.pointerEvents = 'none';
    btn.appendChild(fillBar);

    const textSpan = document.createElement('span');
    textSpan.textContent = label;
    textSpan.style.position = 'relative';
    textSpan.style.zIndex = '1';
    btn.appendChild(textSpan);

    let startTime = 0;
    let animFrame = null;

    const startHold = (e) => {
      e.preventDefault();
      if (!this.baseHeroId || this.materialHeroIds.length === 0) return;
      startTime = Date.now();
      const updateFill = () => {
        const elapsed = Date.now() - startTime;
        const pct = Math.min(100, (elapsed / holdMs) * 100);
        fillBar.style.width = `${pct}%`;
        if (elapsed < holdMs) {
          animFrame = requestAnimationFrame(updateFill);
        } else {
          fillBar.style.width = '100%';
          onConfirmed();
          resetHold();
        }
      };
      animFrame = requestAnimationFrame(updateFill);
    };

    const resetHold = () => {
      if (animFrame) cancelAnimationFrame(animFrame);
      fillBar.style.width = '0%';
    };

    btn.addEventListener('mousedown', startHold);
    btn.addEventListener('mouseup', resetHold);
    btn.addEventListener('mouseleave', resetHold);
    btn.addEventListener('touchstart', startHold);
    btn.addEventListener('touchend', resetHold);

    return btn;
  }

  render() {
    const baseHero = gameState.heroes.find((h) => h.id === this.baseHeroId);
    const materials = this.materialHeroIds
      .map((id) => gameState.heroes.find((h) => h.id === id))
      .filter(Boolean);

    // 1. Render Slots Section
    this.slotsSection.innerHTML = '';

    // Base Hero Slot (160px)
    const baseSlot = document.createElement('div');
    baseSlot.style.width = '170px';
    baseSlot.style.backgroundColor = 'rgba(15, 10, 25, 0.85)';
    baseSlot.style.border = '2px solid var(--accent)';
    baseSlot.style.borderRadius = '6px';
    baseSlot.style.padding = '10px';
    baseSlot.style.display = 'flex';
    baseSlot.style.flexDirection = 'column';
    baseSlot.style.justifyContent = 'space-between';
    baseSlot.style.minHeight = '120px';

    if (baseHero) {
      const starColor = getRarityHexString(baseHero.star);
      const ds = getDisplayStats(baseHero);
      baseSlot.innerHTML = `
        <div>
          <div style="font-size:11px; font-weight:bold; color:var(--frame);">BASE HERO (RECIPIENT)</div>
          <div style="font-size:14px; font-weight:bold; color:#ffffff; margin-top:4px;">${baseHero.name}</div>
          <div style="font-size:12px; color:${starColor};">${'★'.repeat(baseHero.star)}</div>
          <div style="font-size:11px; color:#88aacc;">Lv ${baseHero.level}/${baseHero.star * 10} (${baseHero.class})</div>
          <div style="font-size:10px; color:#aaa; margin-top:4px;">
            STR ${formatStatDisplay(ds.str)} AGI ${formatStatDisplay(ds.agi)} VIT ${formatStatDisplay(ds.vit)}
          </div>
        </div>
        <div style="font-size:10px; color:var(--accent); margin-top:4px;">[Absorbs EXP & Skills]</div>
      `;
    } else {
      baseSlot.style.alignItems = 'center';
      baseSlot.style.justifyContent = 'center';
      baseSlot.innerHTML = `
        <div style="color:var(--frame); font-size:11px; font-weight:bold;">BASE HERO</div>
        <div style="color:#6688aa; font-size:10px; text-align:center; margin-top:4px;">Select from list below</div>
      `;
    }
    this.slotsSection.appendChild(baseSlot);

    // Arrow icon
    const arrow = document.createElement('div');
    arrow.style.display = 'flex';
    arrow.style.alignItems = 'center';
    arrow.style.fontSize = '22px';
    arrow.style.color = '#ff4455';
    arrow.textContent = '◀';
    this.slotsSection.appendChild(arrow);

    // Material Slots (starts with 1 slot, facility level adds +1 per level, up to 4)
    const maxMaterialSlots = Math.min(4, Math.max(1, (gameState.facilities?.synthesis?.level || 0) + 1));
    const matsWrap = document.createElement('div');
    matsWrap.style.flex = '1';
    matsWrap.style.display = 'grid';
    matsWrap.style.gridTemplateColumns = 'repeat(4, 1fr)';
    matsWrap.style.gap = '8px';

    for (let i = 0; i < 4; i++) {
      const isLocked = i >= maxMaterialSlots;
      const mat = materials[i];
      const mSlot = document.createElement('div');
      mSlot.style.backgroundColor = isLocked
        ? 'rgba(15, 10, 15, 0.4)'
        : mat
        ? 'rgba(40, 15, 20, 0.85)'
        : 'rgba(25, 10, 15, 0.45)';
      mSlot.style.border = isLocked
        ? '1px dashed #442222'
        : mat
        ? '1px solid #ff4455'
        : '1px dashed #663333';
      mSlot.style.borderRadius = '6px';
      mSlot.style.padding = '8px';
      mSlot.style.display = 'flex';
      mSlot.style.flexDirection = 'column';
      mSlot.style.justifyContent = 'space-between';
      mSlot.style.minHeight = '120px';

      if (isLocked) {
        mSlot.style.alignItems = 'center';
        mSlot.style.justifyContent = 'center';
        mSlot.innerHTML = `
          <div style="color:#663333; font-size:10px; font-weight:bold;">MATERIAL ${i + 1}</div>
          <div style="color:#552222; font-size:10px; text-align:center; margin-top:4px;">[Locked]<br><span style="font-size:9px;">Upgrade Room</span></div>
        `;
      } else if (mat) {
        const starColor = getRarityHexString(mat.star);
        mSlot.innerHTML = `
          <div>
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <span style="font-size:10px; color:#ff8899; font-weight:bold;">MATERIAL ${i + 1}</span>
              <span style="cursor:pointer; color:#ff4444; font-size:12px; font-weight:bold;" title="Remove">✕</span>
            </div>
            <div style="font-size:12px; font-weight:bold; color:#ffffff; margin-top:4px;">${mat.name}</div>
            <div style="font-size:11px; color:${starColor};">${'★'.repeat(mat.star)}</div>
            <div style="font-size:10px; color:#aaa;">Lv ${mat.level} (${mat.class})</div>
          </div>
          <div style="font-size:10px; color:#ff6666;">+${getSynthesisXp(mat.star, mat.level)} EXP</div>
        `;
        const removeX = mSlot.querySelector('span[title="Remove"]');
        if (removeX) {
          removeX.addEventListener('click', () => {
            this.materialHeroIds.splice(i, 1);
            this.render();
          });
        }
      } else {
        mSlot.style.alignItems = 'center';
        mSlot.style.justifyContent = 'center';
        mSlot.innerHTML = `
          <div style="color:#884455; font-size:10px; font-weight:bold;">MATERIAL ${i + 1}</div>
          <div style="color:#663344; font-size:10px; margin-top:4px;">[Empty]</div>
        `;
      }
      matsWrap.appendChild(mSlot);
    }
    this.slotsSection.appendChild(matsWrap);

    // 2. Render Live Preview
    this.previewPanel.innerHTML = '';
    let totalXp = 0;
    materials.forEach((m) => {
      totalXp += getSynthesisXp(m.star, m.level);
    });

    const previewHeader = document.createElement('div');
    previewHeader.style.display = 'flex';
    previewHeader.style.justifyContent = 'space-between';
    previewHeader.style.fontSize = '12px';
    previewHeader.innerHTML = `
      <span style="color:#ffffff;">Total EXP to Gain: <strong style="color:var(--ok);">+${totalXp} EXP</strong></span>
      <span style="color:#ff8888;">Materials Selected: ${materials.length}/4</span>
    `;
    this.previewPanel.appendChild(previewHeader);

    // Skill Inheritance Preview
    const skillListWrap = document.createElement('div');
    skillListWrap.style.display = 'flex';
    skillListWrap.style.flexWrap = 'wrap';
    skillListWrap.style.gap = '6px';
    skillListWrap.style.margin = '4px 0';

    materials.forEach((m) => {
      const chance = Math.round(getSkillInheritChance(m.star) * 100);
      (m.skills || []).forEach((sk) => {
        const chip = document.createElement('span');
        chip.style.backgroundColor = 'rgba(255, 68, 68, 0.15)';
        chip.style.border = '1px solid #ff4455';
        chip.style.color = '#ff99aa';
        chip.style.fontSize = '10px';
        chip.style.borderRadius = '3px';
        chip.style.padding = '2px 6px';
        chip.textContent = `${sk.name || sk.id}: ${chance}% inherit chance`;
        skillListWrap.appendChild(chip);
      });
    });

    if (materials.length > 0 && skillListWrap.children.length === 0) {
      const noSk = document.createElement('span');
      noSk.textContent = 'Materials have no transferable skills.';
      noSk.style.color = '#777';
      noSk.style.fontSize = '11px';
      skillListWrap.appendChild(noSk);
    }
    this.previewPanel.appendChild(skillListWrap);

    // Warning Banner
    const warning = document.createElement('div');
    warning.style.color = '#ff3344';
    warning.style.fontWeight = 'bold';
    warning.style.fontSize = '12px';
    warning.style.textAlign = 'center';
    warning.textContent = '[These heroes will be dissolved permanently.]';
    this.previewPanel.appendChild(warning);

    // 3. Render Hero Picker List
    this.pickerList.innerHTML = '';
    const matSet = new Set(this.materialHeroIds);

    gameState.heroes.forEach((h) => {
      const isBase = h.id === this.baseHeroId;
      const isMat = matSet.has(h.id);
      const isHan = h.id === 'hero_han';
      const starColor = getRarityHexString(h.star);

      const row = document.createElement('div');
      row.style.padding = '6px 10px';
      row.style.backgroundColor = isBase
        ? 'rgba(180, 140, 255, 0.2)'
        : isMat
        ? 'rgba(255, 51, 68, 0.2)'
        : 'rgba(20, 15, 25, 0.7)';
      row.style.border = isBase
        ? '1px solid var(--accent)'
        : isMat
        ? '1px solid var(--danger)'
        : '1px solid rgba(255, 255, 255, 0.1)';
      row.style.borderRadius = '4px';
      row.style.display = 'flex';
      row.style.justifyContent = 'space-between';
      row.style.alignItems = 'center';

      const ds = getDisplayStats(h);
      row.innerHTML = `
        <div>
          <span style="font-weight:bold; color:#ffffff; font-size:12px;">${h.name}</span>
          <span style="color:${starColor}; font-size:11px;">${'★'.repeat(h.star)}</span>
          <span style="color:#aaa; font-size:11px;">Lv ${h.level} (${h.class})</span>
          <span style="color:#8899aa; font-size:10px; margin-left:6px;">S:${formatStatDisplay(ds.str)} A:${formatStatDisplay(ds.agi)} V:${formatStatDisplay(ds.vit)}</span>
        </div>
        <div style="display:flex; gap:6px;">
          ${
            !isBase
              ? `<button class="btn-set-base mm-btn" style="padding:2px 8px; font-size:10px; cursor:pointer;">Set Base</button>`
              : `<span style="font-size:10px; color:var(--accent); font-weight:bold; padding:2px;">[BASE]</span>`
          }
          ${
            isHan
              ? `<span style="font-size:10px; color:#777; padding:2px;">[Protected]</span>`
              : isMat
              ? `<button class="btn-remove-mat" style="padding:2px 8px; font-size:10px; font-family:monospace; cursor:pointer; background:rgba(255,51,68,0.3); border:1px solid #ff4455; color:#ff4455; border-radius:3px;">Remove</button>`
              : !isBase && this.materialHeroIds.length < maxMaterialSlots
              ? `<button class="btn-add-mat" style="padding:2px 8px; font-size:10px; font-family:monospace; cursor:pointer; background:transparent; border:1px solid #ff8888; color:#ff8888; border-radius:3px;">+ Material</button>`
              : ''
          }
        </div>
      `;

      const setBaseBtn = row.querySelector('.btn-set-base');
      if (setBaseBtn) {
        setBaseBtn.addEventListener('click', () => {
          this.baseHeroId = h.id;
          this.materialHeroIds = this.materialHeroIds.filter((id) => id !== h.id);
          this.render();
        });
      }

      const addMatBtn = row.querySelector('.btn-add-mat');
      if (addMatBtn) {
        addMatBtn.addEventListener('click', () => {
          if (this.materialHeroIds.length < maxMaterialSlots) {
            this.materialHeroIds.push(h.id);
            this.render();
          }
        });
      }

      const removeMatBtn = row.querySelector('.btn-remove-mat');
      if (removeMatBtn) {
        removeMatBtn.addEventListener('click', () => {
          this.materialHeroIds = this.materialHeroIds.filter((id) => id !== h.id);
          this.render();
        });
      }

      this.pickerList.appendChild(row);
    });

    // 4. Update Button State
    const canSynthesize = this.baseHeroId && this.materialHeroIds.length > 0;
    this.confirmBtn.style.opacity = canSynthesize ? '1' : '0.4';
    this.confirmBtn.style.cursor = canSynthesize ? 'pointer' : 'not-allowed';
  }
}
