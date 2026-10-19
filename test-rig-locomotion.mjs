// test-rig-locomotion.mjs
// Automated verification for HeroRig locomotion poses, frequencies, and foot ground contact.

import * as THREE from 'three';
const { HeroRig } = await import('./src/art/HeroRig.js');

const dt = 1 / 60; // 60 FPS simulation
const rig = new HeroRig();

console.log('\n================================================================================');
console.log('HERO RIG LOCOMOTION & GROUND CONTACT TEST');
console.log('================================================================================');

function analyzeOscillation(samples, dt) {
  let prevVal = samples[0];
  let prevSlope = 0;
  const peakTimes = [];

  for (let i = 1; i < samples.length; i++) {
    const val = samples[i];
    const slope = val - prevVal;
    if (prevSlope > 0 && slope <= 0) {
      peakTimes.push(i * dt);
    }
    prevVal = val;
    prevSlope = slope;
  }

  const minVal = Math.min(...samples);
  const maxVal = Math.max(...samples);
  const p2p = maxVal - minVal;

  if (peakTimes.length < 2) {
    return { p2p, freq: 0, minVal, maxVal };
  }

  const periods = [];
  for (let i = 1; i < peakTimes.length; i++) {
    periods.push(peakTimes[i] - peakTimes[i - 1]);
  }
  const avgPeriod = periods.reduce((a, b) => a + b, 0) / periods.length;
  const freq = 1 / avgPeriod;

  return { p2p, freq, minVal, maxVal };
}

// -----------------------------------------------------------------------------
// 1. Standing Test (3s)
// -----------------------------------------------------------------------------
const idleHips = [];
let idleMinSole = Infinity;
let idleMaxCorrection = 0;

for (let f = 0; f < 180; f++) {
  rig.update(dt, { moving: false, speed: 0, sprinting: false, action: 'none' });
  idleHips.push(rig.model.parts.hipL.rotation.x);

  rig.footBoxL.setFromObject(rig.model.parts.footL);
  rig.footBoxR.setFromObject(rig.model.parts.footR);
  const minFootWorldY = Math.min(rig.footBoxL.min.y, rig.footBoxR.min.y);
  const groundWorldY = rig.group.parent ? rig.group.parent.position.y : (rig.group.position.y - rig.footCorrection);
  const relativeSoleY = minFootWorldY - groundWorldY;
  if (relativeSoleY < idleMinSole) idleMinSole = relativeSoleY;
  if (rig.footCorrection > idleMaxCorrection) idleMaxCorrection = rig.footCorrection;
}

const idleAnalysis = analyzeOscillation(idleHips, dt);
const idlePosePassed = rig.currentPose === 'idle';
const idleP2pPassed = idleAnalysis.p2p < 0.05;
const idleSolePassed = idleMinSole >= -0.02;
const idlePassed = idlePosePassed && idleP2pPassed && idleSolePassed;

// -----------------------------------------------------------------------------
// 2. Walking Test (3s)
// -----------------------------------------------------------------------------
// Warm up crossfade
for (let f = 0; f < 30; f++) {
  rig.update(dt, { moving: true, speed: 5.0, sprinting: false, action: 'none' });
}

const walkHips = [];
let walkMinSole = Infinity;
let walkMaxCorrection = 0;

for (let f = 0; f < 180; f++) {
  rig.update(dt, { moving: true, speed: 5.0, sprinting: false, action: 'none' });
  walkHips.push(rig.model.parts.hipL.rotation.x);

  rig.footBoxL.setFromObject(rig.model.parts.footL);
  rig.footBoxR.setFromObject(rig.model.parts.footR);
  const minFootWorldY = Math.min(rig.footBoxL.min.y, rig.footBoxR.min.y);
  const groundWorldY = rig.group.parent ? rig.group.parent.position.y : (rig.group.position.y - rig.footCorrection);
  const relativeSoleY = minFootWorldY - groundWorldY;
  if (relativeSoleY < walkMinSole) walkMinSole = relativeSoleY;
  if (rig.footCorrection > walkMaxCorrection) walkMaxCorrection = rig.footCorrection;
}

const walkAnalysis = analyzeOscillation(walkHips, dt);
const walkPosePassed = rig.currentPose === 'walk';
const walkP2pPassed = walkAnalysis.p2p > 0.5;
const walkFreqPassed = walkAnalysis.freq >= 0.8 && walkAnalysis.freq <= 1.3;
const walkSolePassed = walkMinSole >= -0.02 && walkMaxCorrection <= 0.35;
const walkPassed = walkPosePassed && walkP2pPassed && walkFreqPassed && walkSolePassed;

// -----------------------------------------------------------------------------
// 3. Sprinting Test (3s)
// -----------------------------------------------------------------------------
// Warm up crossfade
for (let f = 0; f < 30; f++) {
  rig.update(dt, { moving: true, speed: 9.0, sprinting: true, action: 'none' });
}

const runHips = [];
let runMinSole = Infinity;
let runMaxCorrection = 0;

for (let f = 0; f < 180; f++) {
  rig.update(dt, { moving: true, speed: 9.0, sprinting: true, action: 'none' });
  runHips.push(rig.model.parts.hipL.rotation.x);

  rig.footBoxL.setFromObject(rig.model.parts.footL);
  rig.footBoxR.setFromObject(rig.model.parts.footR);
  const minFootWorldY = Math.min(rig.footBoxL.min.y, rig.footBoxR.min.y);
  const groundWorldY = rig.group.parent ? rig.group.parent.position.y : (rig.group.position.y - rig.footCorrection);
  const relativeSoleY = minFootWorldY - groundWorldY;
  if (relativeSoleY < runMinSole) runMinSole = relativeSoleY;
  if (rig.footCorrection > runMaxCorrection) runMaxCorrection = rig.footCorrection;
}

const runAnalysis = analyzeOscillation(runHips, dt);
const runPosePassed = rig.currentPose === 'run';
const runP2pPassed = runAnalysis.p2p > 0.5;
const runFreqPassed = runAnalysis.freq >= 1.3 && runAnalysis.freq <= 2.2;
const runSolePassed = runMinSole >= -0.02 && runMaxCorrection <= 0.35;
const runPassed = runPosePassed && runP2pPassed && runFreqPassed && runSolePassed;

// -----------------------------------------------------------------------------
// Report Output
// -----------------------------------------------------------------------------
console.log('| Mode     | Pose | Hip P2P (rad) | Target P2P | Freq (Hz) | Target Freq | Min Sole Y | Max Corr | Status |');
console.log('|----------|------|---------------|------------|-----------|-------------|------------|----------|--------|');
console.log(`| Standing | ${idlePosePassed ? 'idle' : 'FAIL'} | ${idleAnalysis.p2p.toFixed(3).padStart(13)} |    < 0.050 | ${idleAnalysis.freq.toFixed(2).padStart(9)} |      0.00 Hz | ${idleMinSole.toFixed(3).padStart(10)} | ${idleMaxCorrection.toFixed(3).padStart(8)} | ${idlePassed ? 'PASS' : 'FAIL'} |`);
console.log(`| Walking  | ${walkPosePassed ? 'walk' : 'FAIL'} | ${walkAnalysis.p2p.toFixed(3).padStart(13)} |    > 0.500 | ${walkAnalysis.freq.toFixed(2).padStart(9)} | 0.8-1.30 Hz | ${walkMinSole.toFixed(3).padStart(10)} | ${walkMaxCorrection.toFixed(3).padStart(8)} | ${walkPassed ? 'PASS' : 'FAIL'} |`);
console.log(`| Sprinting| ${runPosePassed ? 'run ' : 'FAIL'} | ${runAnalysis.p2p.toFixed(3).padStart(13)} |    > 0.500 | ${runAnalysis.freq.toFixed(2).padStart(9)} | 1.3-2.20 Hz | ${runMinSole.toFixed(3).padStart(10)} | ${runMaxCorrection.toFixed(3).padStart(8)} | ${runPassed ? 'PASS' : 'FAIL'} |`);
console.log('================================================================================');

if (!idlePassed || !walkPassed || !runPassed) {
  console.error('TEST FAILED: Locomotion or ground contact checks failed.');
  process.exit(1);
} else {
  console.log('TEST PASSED: All locomotion poses, frequencies, and foot clamps verified successfully.\n');
  process.exit(0);
}
