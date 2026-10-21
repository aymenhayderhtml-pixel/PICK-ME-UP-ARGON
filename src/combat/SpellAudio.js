// src/combat/SpellAudio.js
// Procedural WebAudio synthesizer for Fire Mage spells, mana potions, and fizzles.
// Zero external sound assets: pure oscillator & gain nodes.

let audioCtx = null;
let hasUserGesture = false;

if (typeof window !== 'undefined') {
  const markGesture = () => {
    hasUserGesture = true;
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {});
    }
  };
  window.addEventListener('pointerdown', markGesture, { once: true, passive: true });
  window.addEventListener('keydown', markGesture, { once: true, passive: true });
}

function getAudioContext() {
  if (typeof window === 'undefined' || !hasUserGesture) return null;
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
 * Plays synthesized sound cue for a specific fire spell.
 * @param {string} spellId
 */
export function playSpellSound(spellId) {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    switch (spellId) {
      case 'emberBolt': {
        // Snappy fast fireball chirp
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(650, t);
        osc.frequency.exponentialRampToValueAtTime(260, t + 0.22);
        gain.gain.setValueAtTime(0.28, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 0.23);
        break;
      }

      case 'fireDartVolley': {
        // Multi-tone spread volley
        osc.type = 'square';
        osc.frequency.setValueAtTime(820, t);
        osc.frequency.exponentialRampToValueAtTime(320, t + 0.28);
        gain.gain.setValueAtTime(0.22, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.28);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 0.29);
        break;
      }

      case 'fireball': {
        // Heavy explosive fireball whoosh
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(460, t);
        osc.frequency.exponentialRampToValueAtTime(95, t + 0.42);
        gain.gain.setValueAtTime(0.40, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.42);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 0.44);
        break;
      }

      case 'flameWall': {
        // Low blazing wall eruption
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(320, t);
        osc.frequency.exponentialRampToValueAtTime(120, t + 0.55);
        gain.gain.setValueAtTime(0.35, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.55);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 0.58);
        break;
      }

      case 'infernoBeam': {
        // Focused high-intensity plasma hum
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(540, t);
        osc.frequency.linearRampToValueAtTime(480, t + 0.22);
        gain.gain.setValueAtTime(0.25, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 0.24);
        break;
      }

      case 'fireNova': {
        // Deep radial explosion detonation
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(280, t);
        osc.frequency.exponentialRampToValueAtTime(50, t + 0.55);
        gain.gain.setValueAtTime(0.45, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.55);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 0.58);
        break;
      }

      case 'solarCataclysm': {
        // Epic cataclysmic rumble & divine celestial chord
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(160, t);
        osc.frequency.exponentialRampToValueAtTime(42, t + 1.20);
        gain.gain.setValueAtTime(0.55, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 1.20);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 1.25);
        break;
      }

      default: {
        // Generic fallback spell sound
        osc.type = 'sine';
        osc.frequency.setValueAtTime(400, t);
        osc.frequency.exponentialRampToValueAtTime(200, t + 0.25);
        gain.gain.setValueAtTime(0.20, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 0.26);
        break;
      }
    }
  } catch (err) {
    // Non-fatal if audio context is blocked
  }
}

/**
 * Plays refreshing mana potion drinking sound.
 */
export function playPotionSound() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(360, t);
    osc.frequency.exponentialRampToValueAtTime(780, t + 0.32);

    gain.gain.setValueAtTime(0.35, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.32);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(t);
    osc.stop(t + 0.35);
  } catch (err) {}
}

/**
 * Plays short fizzle sound when mana is insufficient.
 */
export function playFizzleSound() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(140, t);
    osc.frequency.linearRampToValueAtTime(70, t + 0.18);

    gain.gain.setValueAtTime(0.25, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(t);
    osc.stop(t + 0.20);
  } catch (err) {}
}
