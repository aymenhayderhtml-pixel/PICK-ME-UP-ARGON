// src/dev/devStats.js
// Live combat telemetry tracker, 10s rolling DPS calculator, and Canvas graph

import { combatEvents } from '../combat/CombatEvents.js';

export class DevStatsTracker {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas ? canvas.getContext('2d') : null;

    // Metrics counters
    this.damageDealt = 0;
    this.damageTaken = 0;
    this.hitsLanded = 0;
    this.blocks = 0;
    this.parries = 0;
    this.perfectDodges = 0;
    this.poiseBreaks = 0;
    this.deaths = 0;
    this.kills = 0;

    // Rolling 10s DPS tracker (pre-allocated ring buffer)
    this.dpsBufferMax = 120;
    this.dpsBuffer = new Array(this.dpsBufferMax);
    for (let i = 0; i < this.dpsBufferMax; i++) {
      this.dpsBuffer[i] = { time: 0, damage: 0, active: false };
    }
    this.dpsHead = 0;

    // Time-series history for hero HP, Stamina, Poise (pre-allocated ring buffer)
    this.historyMax = 150;
    this.history = new Array(this.historyMax);
    for (let i = 0; i < this.historyMax; i++) {
      this.history[i] = { hpPct: 1, staminaPct: 1, poisePct: 1, active: false };
    }
    this.historyHead = 0;
    this.sampleTimer = 0;
    this.sampleInterval = 0.1; // 10 samples per sec

    this.activeHero = null;
    this.initEventListeners();
  }

  setActiveHero(hero) {
    this.activeHero = hero;
  }

  initEventListeners() {
    this._unsubs = [
      combatEvents.on('onHit', (payload) => {
        const heroName = this.activeHero?.name;
        if (payload.attackerName === heroName) {
          this.damageDealt += (payload.damage || 0);
          this.hitsLanded++;
          this.recordDpsDamage(payload.damage || 0);
        } else if (payload.targetName === heroName) {
          this.damageTaken += (payload.damage || 0);
        }
        if (payload.isPoiseBreak) {
          this.poiseBreaks++;
        }
      }),

      combatEvents.on('onBlock', (payload) => {
        if (payload.targetName === this.activeHero?.name) {
          this.blocks++;
        }
      }),

      combatEvents.on('onParry', (payload) => {
        if (payload.targetName === this.activeHero?.name) {
          this.parries++;
        }
      }),

      combatEvents.on('onDodge', (payload) => {
        if (payload.name === this.activeHero?.name && payload.perfect) {
          this.perfectDodges++;
        }
      }),

      combatEvents.on('onPoiseBreak', (payload) => {
        if (payload.name !== this.activeHero?.name) {
          this.poiseBreaks++;
        }
      }),
    ];
  }

  recordDpsDamage(damage) {
    const now = performance.now() * 0.001;
    const entry = this.dpsBuffer[this.dpsHead];
    entry.time = now;
    entry.damage = damage;
    entry.active = true;
    this.dpsHead = (this.dpsHead + 1) % this.dpsBufferMax;
  }

  getRollingDps() {
    const now = performance.now() * 0.001;
    const windowStart = now - 10.0;
    let sum = 0;
    for (let i = 0; i < this.dpsBufferMax; i++) {
      const e = this.dpsBuffer[i];
      if (e.active && e.time >= windowStart) {
        sum += e.damage;
      }
    }
    return sum / 10.0;
  }

  update(rawDt, combatants = []) {
    // Check for deaths and kills among combatants
    for (const c of combatants) {
      if (c._justDied) {
        c._justDied = false;
        if (c === this.activeHero) {
          this.deaths++;
        } else if (c.team !== this.activeHero?.team) {
          this.kills++;
        }
      }
    }

    // Sample Hero stats
    if (this.activeHero) {
      this.sampleTimer += rawDt;
      if (this.sampleTimer >= this.sampleInterval) {
        this.sampleTimer = 0;
        const entry = this.history[this.historyHead];
        entry.hpPct = Math.max(0, Math.min(1, this.activeHero.hp / (this.activeHero.maxHp || 1)));
        entry.staminaPct = Math.max(0, Math.min(1, this.activeHero.stamina / (this.activeHero.maxStamina || 1)));
        entry.poisePct = Math.max(0, Math.min(1, this.activeHero.poise / (this.activeHero.maxPoise || 1)));
        entry.active = true;
        this.historyHead = (this.historyHead + 1) % this.historyMax;
      }
    }

    // Only render canvas chart if visible, throttled to 10 Hz to prevent CPU/GPU stalls
    this.graphRenderTimer = (this.graphRenderTimer || 0) + rawDt;
    if (this.graphRenderTimer >= 0.10) {
      this.graphRenderTimer = 0;
      if (this.canvas && this.canvas.offsetParent !== null) {
        this.renderGraph();
      }
    }
  }

  renderGraph() {
    if (!this.ctx || !this.canvas) return;
    const w = this.canvas.width;
    const h = this.canvas.height;
    const ctx = this.ctx;

    ctx.clearRect(0, 0, w, h);

    // Background and grid lines
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, h * 0.25); ctx.lineTo(w, h * 0.25);
    ctx.moveTo(0, h * 0.50); ctx.lineTo(w, h * 0.50);
    ctx.moveTo(0, h * 0.75); ctx.lineTo(w, h * 0.75);
    ctx.stroke();

    // Collect ordered history points
    const pts = [];
    for (let i = 0; i < this.historyMax; i++) {
      const idx = (this.historyHead + i) % this.historyMax;
      const pt = this.history[idx];
      if (pt.active) pts.push(pt);
    }
    if (pts.length < 2) return;

    const step = w / (this.historyMax - 1);
    const startX = w - (pts.length - 1) * step;

    // Helper to draw a single line
    const drawLine = (prop, color) => {
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let i = 0; i < pts.length; i++) {
        const x = startX + i * step;
        const y = h - (pts[i][prop] * (h - 8) + 4);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    };

    // Draw lines: HP (Red/Green), Stamina (Cyan), Poise (Amber)
    drawLine('hpPct', '#ef4444');
    drawLine('staminaPct', '#06b6d4');
    drawLine('poisePct', '#f59e0b');
  }

  reset() {
    this.damageDealt = 0;
    this.damageTaken = 0;
    this.hitsLanded = 0;
    this.blocks = 0;
    this.parries = 0;
    this.perfectDodges = 0;
    this.poiseBreaks = 0;
    this.deaths = 0;
    this.kills = 0;

    for (let i = 0; i < this.dpsBufferMax; i++) {
      this.dpsBuffer[i].active = false;
      this.dpsBuffer[i].damage = 0;
    }
    this.dpsHead = 0;

    for (let i = 0; i < this.historyMax; i++) {
      this.history[i].active = false;
    }
    this.historyHead = 0;
  }

  getReport() {
    return {
      timestamp: new Date().toISOString(),
      heroName: this.activeHero?.name || 'Unknown',
      damageDealt: Math.round(this.damageDealt),
      damageTaken: Math.round(this.damageTaken),
      hitsLanded: this.hitsLanded,
      blocks: this.blocks,
      parries: this.parries,
      perfectDodges: this.perfectDodges,
      poiseBreaks: this.poiseBreaks,
      deaths: this.deaths,
      kills: this.kills,
      dpsLast10s: Number(this.getRollingDps().toFixed(1)),
      heroCurrentHp: Math.round(this.activeHero?.hp || 0),
      heroMaxHp: this.activeHero?.maxHp || 0,
      heroCurrentPoise: Math.round(this.activeHero?.poise || 0),
      heroMaxPoise: this.activeHero?.maxPoise || 0,
    };
  }

  exportJSON() {
    const report = this.getReport();
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(report, null, 2));
    const a = document.createElement('a');
    a.setAttribute('href', dataStr);
    a.setAttribute('download', `devlab-fight-report-${Date.now()}.json`);
    document.body.appendChild(a);
    a.click();
    a.remove();
  }
}
