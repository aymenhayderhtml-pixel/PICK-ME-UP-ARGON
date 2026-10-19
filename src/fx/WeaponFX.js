// src/fx/WeaponFX.js
import * as THREE from 'three';

const GRADE_FX_COLORS = {
  'E': 0xb0b0b0,
  'D': 0x6fbf73,
  'C': 0x4aa3ff,
  'B': 0xb26bff,
  'A': 0xffc83a,
  'S': 0xff4d5e,
  'S+': 0xffffff
};

// Reusable geometries & materials for particle FX
let _sparkGeo = null;
let _shardGeo = null;
let _parryRingGeo = null;

function getSparkGeo() {
  if (!_sparkGeo) _sparkGeo = new THREE.SphereGeometry(0.025, 4, 4);
  return _sparkGeo;
}

function getShardGeo() {
  if (!_shardGeo) _shardGeo = new THREE.BoxGeometry(0.045, 0.045, 0.02);
  return _shardGeo;
}

function getParryRingGeo() {
  if (!_parryRingGeo) _parryRingGeo = new THREE.RingGeometry(0.2, 0.45, 20);
  return _parryRingGeo;
}

export function spawnHitSparks(scene, hitPosition, grade = 'E') {
  if (!scene || !hitPosition) return;
  const colHex = GRADE_FX_COLORS[grade] || 0xffe08a;
  const count = 3 + Math.floor(Math.random() * 3); // 3 to 5 sparks

  const particles = [];
  const mat = new THREE.MeshBasicMaterial({
    color: colHex,
    transparent: true,
    opacity: 1.0,
    blending: THREE.AdditiveBlending
  });

  const geo = getSparkGeo();
  for (let i = 0; i < count; i++) {
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(hitPosition);
    scene.add(mesh);

    const angle = Math.random() * Math.PI * 2;
    const speed = 1.8 + Math.random() * 2.5;
    particles.push({
      mesh,
      vx: Math.cos(angle) * speed,
      vy: 0.8 + Math.random() * 2.2,
      vz: Math.sin(angle) * speed
    });
  }

  let elapsed = 0;
  const duration = 0.25;

  const anim = () => {
    elapsed += 0.016;
    const p = Math.min(1.0, elapsed / duration);
    mat.opacity = 1.0 - p;

    for (const pt of particles) {
      pt.mesh.position.x += pt.vx * 0.016;
      pt.mesh.position.y += pt.vy * 0.016;
      pt.mesh.position.z += pt.vz * 0.016;
      pt.vy -= 9.8 * 0.016;
      pt.mesh.scale.setScalar(Math.max(0.1, 1.0 - p));
    }

    if (p < 1.0) {
      requestAnimationFrame(anim);
    } else {
      for (const pt of particles) scene.remove(pt.mesh);
      mat.dispose();
    }
  };
  requestAnimationFrame(anim);
}

let _starGeo = null;
let _triangleGeo = null;

function getStarGeo() {
  if (!_starGeo) {
    const geo = new THREE.BufferGeometry();
    const vertices = [];
    const numPoints = 8;
    const rOuter = 0.55;
    const rInner = 0.16;
    const totalVerts = numPoints * 2;
    for (let i = 0; i < totalVerts; i++) {
      const a1 = (i / totalVerts) * Math.PI * 2;
      const a2 = ((i + 1) / totalVerts) * Math.PI * 2;
      const r1 = i % 2 === 0 ? rOuter : rInner;
      const r2 = (i + 1) % 2 === 0 ? rOuter : rInner;
      vertices.push(
        0, 0, 0,
        Math.cos(a1) * r1, Math.sin(a1) * r1, 0,
        Math.cos(a2) * r2, Math.sin(a2) * r2, 0
      );
    }
    geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geo.computeVertexNormals();
    _starGeo = geo;
  }
  return _starGeo;
}

function getTriangleGeo() {
  if (!_triangleGeo) {
    const geo = new THREE.BufferGeometry();
    const s = 0.05;
    const vertices = [
      0, s, 0,
      -s * 0.866, -s * 0.5, 0,
      s * 0.866, -s * 0.5, 0
    ];
    geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geo.computeVertexNormals();
    _triangleGeo = geo;
  }
  return _triangleGeo;
}

export function spawnBlockHitEffect(scene, blockPosition, camera = null) {
  if (!scene || !blockPosition) return;

  // 1. White spiky starburst (flat 8-point star, additive white, scale 0.2 -> 1.0 in 0.12s, fading, camera-facing)
  const starGeo = getStarGeo();
  const starMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 1.0,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    depthWrite: false
  });
  const starMesh = new THREE.Mesh(starGeo, starMat);
  starMesh.position.copy(blockPosition);
  starMesh.scale.setScalar(0.2);
  if (camera && camera.camera) {
    starMesh.quaternion.copy(camera.camera.quaternion);
  } else if (camera && camera.quaternion) {
    starMesh.quaternion.copy(camera.quaternion);
  }
  scene.add(starMesh);

  let starElapsed = 0;
  const starDuration = 0.12;
  const animStar = () => {
    starElapsed += 0.016;
    const p = Math.min(1.0, starElapsed / starDuration);
    const s = 0.2 + p * 0.8;
    starMesh.scale.setScalar(s);
    starMat.opacity = Math.max(0, 1.0 - p);
    if (camera && camera.camera) {
      starMesh.quaternion.copy(camera.camera.quaternion);
    } else if (camera && camera.quaternion) {
      starMesh.quaternion.copy(camera.quaternion);
    }
    if (p < 1.0) {
      requestAnimationFrame(animStar);
    } else {
      scene.remove(starMesh);
      starMat.dispose();
    }
  };
  requestAnimationFrame(animStar);

  // 2. 6 to 8 dark debris fragments (small dark triangles flying outward with gravity for 0.5s)
  const triGeo = getTriangleGeo();
  const debrisMat = new THREE.MeshBasicMaterial({
    color: 0x1f1d24,
    side: THREE.DoubleSide
  });
  const count = 6 + Math.floor(Math.random() * 3);
  const debris = [];

  for (let i = 0; i < count; i++) {
    const mesh = new THREE.Mesh(triGeo, debrisMat);
    mesh.position.copy(blockPosition);
    scene.add(mesh);
    const angle = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
    const speed = 2.0 + Math.random() * 2.0;
    debris.push({
      mesh,
      vx: Math.cos(angle) * speed,
      vy: 1.5 + Math.random() * 2.0,
      vz: Math.sin(angle) * speed,
      rx: (Math.random() - 0.5) * 15,
      ry: (Math.random() - 0.5) * 15
    });
  }

  let debrisElapsed = 0;
  const debrisDuration = 0.5;
  const animDebris = () => {
    debrisElapsed += 0.016;
    const p = Math.min(1.0, debrisElapsed / debrisDuration);
    for (const d of debris) {
      d.mesh.position.x += d.vx * 0.016;
      d.mesh.position.y += d.vy * 0.016;
      d.mesh.position.z += d.vz * 0.016;
      d.vy -= 9.8 * 0.016;
      d.mesh.rotation.x += d.rx * 0.016;
      d.mesh.rotation.y += d.ry * 0.016;
    }
    if (p < 1.0) {
      requestAnimationFrame(animDebris);
    } else {
      for (const d of debris) scene.remove(d.mesh);
      debrisMat.dispose();
    }
  };
  requestAnimationFrame(animDebris);
}

export function triggerShieldBlock(shieldModel, scene, blockPosition, camera = null) {
  // Spawn white spiky starburst + dark debris fragments
  spawnBlockHitEffect(scene, blockPosition, camera);

  // 2. Shield model shake: 6 degrees (0.105 rad) back and return in 0.12s
  if (shieldModel && shieldModel.group) {
    const group = shieldModel.group;
    const origRotX = group.rotation.x;
    let elapsed = 0;
    const duration = 0.12;
    const shakeAngle = 0.105; // ~6 degrees

    const animShake = () => {
      elapsed += 0.016;
      const p = Math.min(1.0, elapsed / duration);
      // Half sine wave: 0 -> peak -> 0
      const offset = Math.sin(p * Math.PI) * shakeAngle;
      group.rotation.x = origRotX - offset;

      if (p < 1.0) {
        requestAnimationFrame(animShake);
      } else {
        group.rotation.x = origRotX;
      }
    };
    requestAnimationFrame(animShake);
  }
}

export function triggerParryFlash(scene, shieldModel) {
  if (!scene || !shieldModel || !shieldModel.group) return;

  const ringGeo = getParryRingGeo();
  const ringMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.95,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });

  const ringMesh = new THREE.Mesh(ringGeo, ringMat);
  const worldPos = new THREE.Vector3();
  if (shieldModel.anchors && shieldModel.anchors.hit) {
    shieldModel.anchors.hit.getWorldPosition(worldPos);
  } else {
    shieldModel.group.getWorldPosition(worldPos);
  }

  ringMesh.position.copy(worldPos);
  // Point forward in world space
  ringMesh.rotation.y = shieldModel.group.rotation.y;
  scene.add(ringMesh);

  let elapsed = 0;
  const duration = 0.20;

  const anim = () => {
    elapsed += 0.016;
    const p = Math.min(1.0, elapsed / duration);
    const scale = 0.6 + p * 1.8;
    ringMesh.scale.set(scale, scale, scale);
    ringMat.opacity = Math.max(0, 1.0 - p);

    if (p < 1.0) {
      requestAnimationFrame(anim);
    } else {
      scene.remove(ringMesh);
      ringMat.dispose();
    }
  };
  requestAnimationFrame(anim);
}

export function spawnItemBreakShards(scene, worldPos, grade = 'E') {
  if (!scene || !worldPos) return;
  const count = 6 + Math.floor(Math.random() * 3); // 6 to 8 shards
  const colHex = GRADE_FX_COLORS[grade] || 0xb0b0b0;

  const geo = getShardGeo();
  const mat = new THREE.MeshStandardMaterial({
    color: colHex,
    roughness: 0.7,
    metalness: 0.4
  });

  const shards = [];
  for (let i = 0; i < count; i++) {
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(
      worldPos.x + (Math.random() - 0.5) * 0.2,
      worldPos.y + (Math.random() - 0.5) * 0.2,
      worldPos.z + (Math.random() - 0.5) * 0.2
    );
    scene.add(mesh);

    const angle = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.5;
    const speed = 2.0 + Math.random() * 3.0;
    shards.push({
      mesh,
      vx: Math.cos(angle) * speed,
      vy: 2.2 + Math.random() * 2.8,
      vz: Math.sin(angle) * speed,
      rx: (Math.random() - 0.5) * 15,
      ry: (Math.random() - 0.5) * 15
    });
  }

  let elapsed = 0;
  const duration = 0.8;

  const anim = () => {
    elapsed += 0.016;
    const p = Math.min(1.0, elapsed / duration);

    for (const sh of shards) {
      sh.mesh.position.x += sh.vx * 0.016;
      sh.mesh.position.y += sh.vy * 0.016;
      sh.mesh.position.z += sh.vz * 0.016;
      sh.vy -= 12.0 * 0.016; // Gravity

      sh.mesh.rotation.x += sh.rx * 0.016;
      sh.mesh.rotation.y += sh.ry * 0.016;
      sh.mesh.scale.setScalar(Math.max(0.05, 1.0 - p * 0.6));
    }

    if (p < 1.0) {
      requestAnimationFrame(anim);
    } else {
      for (const sh of shards) scene.remove(sh.mesh);
      mat.dispose();
    }
  };
  requestAnimationFrame(anim);
}
