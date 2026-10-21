import * as THREE from 'three';

// 1. WebAudio Synthesizer for Parry Ping
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

export function playParrySound() {
  try {
    if (typeof window === 'undefined' || !hasUserGesture) return;
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;

    if (!audioCtx) {
      try {
        audioCtx = new AudioContextClass();
      } catch (e) {
        return;
      }
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {});
    }

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

// 4. Splinter Particle Burst when Item Breaks
export function spawnSplinters(scene, position, color = 0x8b5a2b, count = 18) {
  if (!scene || !position) return;

  const splinters = [];
  const geo = new THREE.BoxGeometry(0.08, 0.08, 0.08);
  const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.9 });

  for (let i = 0; i < count; i++) {
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(
      position.x + (Math.random() - 0.5) * 0.3,
      position.y + (Math.random() - 0.5) * 0.3,
      position.z + (Math.random() - 0.5) * 0.3
    );
    scene.add(mesh);

    const angle = Math.random() * Math.PI * 2;
    const speed = 2.5 + Math.random() * 4.5;
    splinters.push({
      mesh,
      vx: Math.cos(angle) * speed,
      vy: 2.0 + Math.random() * 4.0,
      vz: Math.sin(angle) * speed,
      rx: (Math.random() - 0.5) * 12,
      ry: (Math.random() - 0.5) * 12,
    });
  }

  let elapsed = 0;
  const duration = 0.5;

  const anim = () => {
    elapsed += 0.016;
    const p = Math.min(1.0, elapsed / duration);

    for (const sp of splinters) {
      sp.mesh.position.x += sp.vx * 0.016;
      sp.mesh.position.y += sp.vy * 0.016;
      sp.mesh.position.z += sp.vz * 0.016;
      sp.vy -= 14.0 * 0.016; // Heavy gravity

      sp.mesh.rotation.x += sp.rx * 0.016;
      sp.mesh.rotation.y += sp.ry * 0.016;
      sp.mesh.scale.setScalar(Math.max(0.1, 1.0 - p));
    }

    if (p < 1.0) {
      requestAnimationFrame(anim);
    } else {
      for (const sp of splinters) {
        scene.remove(sp.mesh);
      }
      geo.dispose();
      mat.dispose();
    }
  };
  requestAnimationFrame(anim);
}
