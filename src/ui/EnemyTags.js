import * as THREE from 'three';

/**
 * Manages floating manhua-style enemy tags above enemy heads:
 * '<GOBLIN LV.3>' with red glow text-shadow, distance fading, and damage HP bar.
 */
export class EnemyTagsOverlay {
  constructor() {
    this.container = document.createElement('div');
    this.container.id = 'mm-enemy-tags-overlay';
    this.container.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      user-select: none;
      overflow: hidden;
      z-index: 9998;
    `;
    document.body.appendChild(this.container);

    this.tagMap = new Map();
    this.tempVec = new THREE.Vector3();
  }

  getOrCreateTag(enemy) {
    let entry = this.tagMap.get(enemy);
    if (!entry) {
      const el = document.createElement('div');
      el.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        display: none;
        flex-direction: column;
        align-items: center;
        transform: translate(-50%, -100%);
        pointer-events: none;
        will-change: transform, opacity;
      `;

      const isBoss = !!enemy.isBoss;
      const fontSize = isBoss ? '26px' : '18px';

      const textEl = document.createElement('div');
      textEl.style.cssText = `
        font-family: 'Oswald', 'Bebas Neue', 'Arial Narrow', 'Roboto Condensed', Impact, sans-serif;
        font-weight: 700;
        font-stretch: condensed;
        color: #ffffff;
        font-size: ${fontSize};
        line-height: 1;
        letter-spacing: 0.5px;
        white-space: nowrap;
        text-align: center;
        background: transparent;
        text-shadow: 0 0 6px #ff2a2a, 0 0 14px #ff2a2a;
      `;
      const enemyName = (enemy.name || (enemy.typeKey === 'LEADER' ? 'Hobgoblin Chief' : 'Goblin')).toUpperCase();
      textEl.textContent = `<${enemyName} LV.${enemy.level || 3}>`;
      el.appendChild(textEl);

      // Small HP bar under tag (shown only after taking damage)
      const hpBar = document.createElement('div');
      hpBar.style.cssText = `
        width: ${isBoss ? '90px' : '50px'};
        height: 4px;
        background: rgba(0, 0, 0, 0.5);
        border-radius: 2px;
        margin-top: 3px;
        overflow: hidden;
        display: none;
      `;
      const hpFill = document.createElement('div');
      hpFill.style.cssText = `
        width: 100%;
        height: 100%;
        background: #ff3a3a;
        transition: width 0.1s ease-out;
      `;
      hpBar.appendChild(hpFill);
      el.appendChild(hpBar);

      this.container.appendChild(el);
      entry = { element: el, textEl, hpBar, hpFill, isBoss };
      this.tagMap.set(enemy, entry);
    }
    return entry;
  }

  update(camera, enemies) {
    if (!camera || !enemies) return;

    // Remove tags for enemies no longer in the list
    const activeSet = new Set(enemies);
    for (const [enemy, entry] of this.tagMap.entries()) {
      if (!activeSet.has(enemy) || enemy.isCorpseCleaned) {
        if (entry.element.parentNode) {
          entry.element.parentNode.removeChild(entry.element);
        }
        this.tagMap.delete(enemy);
      }
    }

    const candidates = [];
    const width = window.innerWidth;
    const height = window.innerHeight;

    for (const enemy of enemies) {
      const entry = this.getOrCreateTag(enemy);

      // Hide dead or dying enemies
      if (enemy.dead || enemy.isDying) {
        entry.element.style.display = 'none';
        continue;
      }

      // World position above enemy head
      const headOffset = enemy.tagHeight || (entry.isBoss ? 2.85 : 1.25);
      this.tempVec.set(
        enemy.mesh.position.x,
        enemy.mesh.position.y + headOffset,
        enemy.mesh.position.z
      );

      const dist = camera.position.distanceTo(this.tempVec);
      // Max distance 28 units
      if (dist > 28.0) {
        entry.element.style.display = 'none';
        continue;
      }

      // Project into normalized device coords
      this.tempVec.project(camera);
      // Behind camera or off-screen frustum
      if (this.tempVec.z > 1.0 || this.tempVec.z < -1.0) {
        entry.element.style.display = 'none';
        continue;
      }

      const screenX = (this.tempVec.x * 0.5 + 0.5) * width;
      const screenY = (-this.tempVec.y * 0.5 + 0.5) * height;

      // Distance fading (20 to 28 units)
      let opacity = 1.0;
      if (dist > 20.0) {
        opacity = Math.max(0, (28.0 - dist) / 8.0);
      }

      // HP bar visibility: only after taking damage
      if (enemy.hp < enemy.maxHp && !enemy.dead) {
        entry.hpBar.style.display = 'block';
        const pct = Math.max(0, Math.min(100, (enemy.hp / enemy.maxHp) * 100));
        entry.hpFill.style.width = `${pct}%`;
      } else {
        entry.hpBar.style.display = 'none';
      }

      candidates.push({
        entry,
        dist,
        screenX,
        screenY,
        opacity,
      });
    }

    // Sort by distance (closest first) for de-cluttering
    candidates.sort((a, b) => a.dist - b.dist);

    const placed = [];
    for (const cand of candidates) {
      // If two tags are closer than 36px on screen, hide the farther one
      const overlap = placed.some(
        (p) => Math.hypot(p.screenX - cand.screenX, p.screenY - cand.screenY) < 36.0
      );

      if (overlap) {
        cand.entry.element.style.display = 'none';
      } else {
        placed.push(cand);
        cand.entry.element.style.display = 'flex';
        cand.entry.element.style.opacity = cand.opacity;
        cand.entry.element.style.transform = `translate(-50%, -100%) translate(${cand.screenX.toFixed(1)}px, ${cand.screenY.toFixed(1)}px)`;
      }
    }
  }

  clear() {
    for (const entry of this.tagMap.values()) {
      if (entry.element.parentNode) {
        entry.element.parentNode.removeChild(entry.element);
      }
    }
    this.tagMap.clear();
  }

  dispose() {
    this.clear();
    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
  }
}
