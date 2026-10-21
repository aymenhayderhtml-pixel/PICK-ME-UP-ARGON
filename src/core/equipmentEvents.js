// src/core/equipmentEvents.js
/**
 * Tiny pub/sub used to tell the live scenes that a hero's gear changed so the
 * 3D models, controls and HUD can be rebuilt immediately instead of waiting
 * for a scene reload.
 */

const listeners = new Set();

/**
 * Subscribes to equipment changes.
 * @param {(hero: object, slot: string) => void} fn
 * @returns {() => void} unsubscribe
 */
export function onEquipmentChanged(fn) {
  if (typeof fn !== 'function') return () => {};
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/**
 * Broadcasts an equipment change.
 * @param {object} hero the hero whose gear changed
 * @param {string} slot 'weapon' | 'offhand' | 'armor'
 */
export function emitEquipmentChanged(hero, slot) {
  for (const fn of Array.from(listeners)) {
    try {
      fn(hero, slot);
    } catch (err) {
      console.warn('[equipmentEvents] listener failed:', err);
    }
  }
}
