// src/combat/CombatEvents.js
// Universal Combat Engine Phase 1 - Zero-Allocation Combat Event Bus

export class CombatEventBus {
  constructor(maxLogEntries = 8) {
    this._listeners = new Map();
    this._maxLogEntries = maxLogEntries;

    // Pre-allocated ring buffer objects for zero runtime GC
    this._logBuffer = [];
    for (let i = 0; i < maxLogEntries; i++) {
      this._logBuffer.push({
        id: i,
        time: 0,
        event: '',
        detail: '',
        active: false,
      });
    }
    this._logHead = 0;
    this._logCount = 0;
  }

  on(eventName, handler) {
    if (!this._listeners.has(eventName)) {
      this._listeners.set(eventName, new Set());
    }
    this._listeners.get(eventName).add(handler);
    return () => this.off(eventName, handler);
  }

  off(eventName, handler) {
    const set = this._listeners.get(eventName);
    if (set) {
      set.delete(handler);
    }
  }

  emit(eventName, payload = {}) {
    // 1. Record to pre-allocated ring buffer
    const entry = this._logBuffer[this._logHead];
    entry.time = performance.now() * 0.001;
    entry.event = eventName;
    entry.active = true;

    // Build brief detail string without allocating excessive sub-objects
    if (eventName === 'onHit') {
      entry.detail = `${payload.attackerName || 'Hero'} -> ${payload.targetName || 'Dummy'} (-${payload.damage || 0} HP, -${payload.poiseDamage || 0} Poise)`;
    } else if (eventName === 'onBlock') {
      entry.detail = `${payload.targetName || 'Hero'} blocked (-${payload.staminaCost || 0} Stamina, ${payload.chipDamage || 0} chip)`;
    } else if (eventName === 'onParry') {
      entry.detail = `[PARRY] ${payload.targetName || 'Hero'} parried ${payload.attackerName || 'Enemy'}! (SlowMo 0.25s, Counter bonus)`;
    } else if (eventName === 'onDodge') {
      entry.detail = payload.perfect ? `[PERFECT DODGE] ${payload.name || 'Hero'} (SlowMo 0.25s)` : `[DODGE] ${payload.name || 'Hero'}`;
    } else if (eventName === 'onStagger') {
      entry.detail = `${payload.name || 'Target'} staggered (${payload.duration?.toFixed(2) || '0.45'}s)`;
    } else if (eventName === 'onPoiseBreak') {
      entry.detail = `[POISE BREAK] ${payload.name || 'Target'} guard broken!`;
    } else if (eventName === 'onCast') {
      entry.detail = `${payload.name || payload.caster?.name || 'Caster'} cast ${payload.spellId || 'spell'}`;
    } else if (eventName === 'onHeal') {
      entry.detail = `${payload.targetName || 'Target'} restored +${payload.amount || 0} HP (${payload.currentHp}/${payload.maxHp})`;
    } else if (eventName === 'onWard') {
      entry.detail = `${payload.targetName || 'Target'} gained Arcane Ward (${payload.barrierHp || 60} HP)`;
    } else if (eventName === 'onStatusTick') {
      entry.detail = `${payload.targetName || 'Target'} took -${payload.damage || 0} ${payload.status || 'DoT'} damage`;
    } else if (eventName === 'onSpellImpact') {
      entry.detail = `${payload.spellId || 'Spell'} hit ${payload.targetsHit || 1} target(s)`;
    } else if (eventName === 'onDeath') {
      entry.detail = `${payload.name || 'Combatant'} defeated`;
    } else if (eventName === 'onReset') {
      entry.detail = `${payload.message || 'Arena reset'}`;
    } else if (eventName === 'onManaFizzle') {
      entry.detail = `${payload.name || payload.combatant?.name || 'Mage'} mana fizzle (insufficient mana)`;
    } else if (eventName === 'onPotionUsed') {
      entry.detail = `${payload.name || payload.combatant?.name || 'Mage'} drank Mana Potion (+${payload.restoreAmount || 0} MP)`;
    } else if (eventName === 'onSpellCast') {
      entry.detail = `${payload.caster?.name || 'Mage'} cast ${payload.spellId || 'spell'}`;
    } else {
      try {
        entry.detail = JSON.stringify(payload);
      } catch (err) {
        entry.detail = `[${eventName}] ${payload.name || payload.targetName || payload.attackerName || ''}`;
      }
    }

    this._logHead = (this._logHead + 1) % this._maxLogEntries;
    if (this._logCount < this._maxLogEntries) {
      this._logCount++;
    }

    // 2. Dispatch to listeners
    const handlers = this._listeners.get(eventName);
    if (handlers && handlers.size > 0) {
      for (const fn of handlers) {
        fn(payload);
      }
    }
  }

  getRecentLogs() {
    const list = [];
    if (this._logCount === 0) return list;

    // Return in chronological order (oldest to newest)
    const start = (this._logHead - this._logCount + this._maxLogEntries) % this._maxLogEntries;
    for (let i = 0; i < this._logCount; i++) {
      const idx = (start + i) % this._maxLogEntries;
      list.push(this._logBuffer[idx]);
    }
    return list;
  }

  clear() {
    this._listeners.clear();
    this._logHead = 0;
    this._logCount = 0;
    for (const item of this._logBuffer) {
      item.active = false;
      item.event = '';
      item.detail = '';
    }
  }
}

export const combatEvents = new CombatEventBus(8);
