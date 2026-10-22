// src/core/AudioManager.js
// One shared WebAudio context for the whole game.
//
// Browsers refuse to start an AudioContext that is created before the user has
// interacted with the page ("An AudioContext was prevented from starting
// automatically"). The context is therefore created lazily and only after a
// real user gesture; before that every sound helper must skip silently.
//
// All synthesized SFX (tink, zap, door click, anvil clang, parry ping, spells)
// go through getAudioContext() so the game never creates a second context.

let audioCtx = null;
let hasUserGesture = false;

function markGesture() {
  hasUserGesture = true;
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('pointerdown', markGesture, { once: true, passive: true });
  window.addEventListener('keydown', markGesture, { once: true, passive: true });
}

// The event listeners above only fire for pointer/key gestures. The sticky
// activation flag also covers gestures the page handled some other way, and
// covers a module that is imported after the first click.
function userHasActivated() {
  if (hasUserGesture) return true;
  if (typeof navigator !== 'undefined' && navigator.userActivation?.hasBeenActive) {
    hasUserGesture = true;
    return true;
  }
  return false;
}

/**
 * The shared AudioContext, or null when the browser has not seen a user
 * gesture yet and would refuse to start one.
 * @returns {AudioContext|null}
 */
export function getAudioContext() {
  if (typeof window === 'undefined' || !userHasActivated()) return null;
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return null;

  if (!audioCtx) {
    try {
      audioCtx = new AudioContextClass();
    } catch (e) {
      return null;
    }
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

/**
 * True when the player muted the game, either with the M key or in the options
 * window.
 * @returns {boolean}
 */
export function isAudioMuted() {
  if (typeof window === 'undefined') return true;
  if (window.__audioMaster?.isMuted) return true;
  try {
    return localStorage.getItem('pm_muted') === 'true';
  } catch (e) {
    return false;
  }
}

/**
 * The master volume set in the options window.
 * @returns {number} 0..1
 */
export function getMasterVolume() {
  if (typeof window === 'undefined') return 0.3;
  const vol = window.__audioMaster?.masterVolume;
  return typeof vol === 'number' ? vol : 0.3;
}
