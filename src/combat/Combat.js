import * as THREE from 'three';
import { getAudioContext } from '../core/AudioManager.js';

// 1. WebAudio Synthesizer for Parry Ping
export function playParrySound() {
  try {
    const audioCtx = getAudioContext();
    if (!audioCtx) return;

    const t = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    // High crisp metallic ping descending in pitch
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(1350, t);
    osc.frequency.exponentialRampToValueAtTime(720, t + 0.28);

    gain.gain.setValueAtTime(0.45, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.28);

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start(t);
    osc.stop(t + 0.3);
  } catch (err) {
    // Graceful fallback if WebAudio blocked or unsupported
  }
}

// 2. Shield Deflection Angle Calculation
export function calculateAttackAngle(playerFacingYaw, playerPos, attackerPos) {
  if (!playerPos || !attackerPos) return 0;

  // Player forward vector from rotation.y
  const fx = Math.sin(playerFacingYaw);
  const fz = Math.cos(playerFacingYaw);

  // Vector from player to attacker
  const dx = attackerPos.x - playerPos.x;
  const dz = attackerPos.z - playerPos.z;
  const dist = Math.hypot(dx, dz);

  if (dist < 0.001) return 0;

  const dot = (fx * dx + fz * dz) / dist;
  const clampedDot = Math.max(-1, Math.min(1, dot));
  return (Math.acos(clampedDot) * 180) / Math.PI; // 0 to 180 degrees
}

// 3. Visual Sparks & Hit Effects
export function spawnSparks(scene, position, color = 0xffea00, count = 16) {
  if (!scene || !position) return;

  const geo = new THREE.BufferGeometry();
  const positions = new Float32Array(count * 3);
  const velocities = [];

  for (let i = 0; i < count; i++) {
    positions[i * 3 + 0] = position.x;
    positions[i * 3 + 1] = position.y;
    positions[i * 3 + 2] = position.z;

    const angle = Math.random() * Math.PI * 2;
    const speed = 2.0 + Math.random() * 4.0;
    velocities.push({
      x: Math.cos(angle) * speed,
      y: 1.0 + Math.random() * 3.0,
      z: Math.sin(angle) * speed,
    });
  }

  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const mat = new THREE.PointsMaterial({
    color,
    size: 0.15,
    transparent: true,
    opacity: 1.0,
    blending: THREE.AdditiveBlending,
  });

  const points = new THREE.Points(geo, mat);
  scene.add(points);

  let elapsed = 0;
  const duration = 0.25;

  const anim = () => {
    elapsed += 0.016;
    const p = Math.min(1.0, elapsed / duration);
    const arr = geo.attributes.position.array;

    for (let i = 0; i < count; i++) {
      const v = velocities[i];
      arr[i * 3 + 0] += v.x * 0.016;
      arr[i * 3 + 1] += v.y * 0.016;
      arr[i * 3 + 2] += v.z * 0.016;
      v.y -= 9.8 * 0.016; // Gravity
    }
    geo.attributes.position.needsUpdate = true;
    mat.opacity = 1.0 - p;

    if (p < 1.0) {
      requestAnimationFrame(anim);
    } else {
      scene.remove(points);
      geo.dispose();
      mat.dispose();
    }
  };
  requestAnimationFrame(anim);
}

