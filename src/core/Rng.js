// src/core/Rng.js
// Small deterministic seeded random generator.
//
// A local copy of the mulberry32 generator used by src/world/floorLayouts.js,
// placed here so core systems can use a seeded RNG without depending on the
// (protected) world module.

/**
 * Creates a seeded pseudo random generator returning floats in [0, 1).
 * The same seed always produces the same sequence.
 */
export function createRng(seed) {
  let s = (seed >>> 0) || 1;
  return function () {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return (t >>> 0) / 4294967296;
  };
}
