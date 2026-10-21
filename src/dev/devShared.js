// src/dev/devShared.js
// Shared Three.js and DOM visualizer pools for dev test sandboxes

import * as THREE from 'three';
import { ATTACK_PHASES } from '../combat/StateMachine.js';
import { MELEE_HIT_SECTORS } from '../combat/CombatData.js';

/**
 * Creates a floating damage number pool rendered as HTML overlay.
 */
export function createDamageTextPool(container = document.body) {
  const floatingTexts = [];
  const textPoolContainer = document.createElement('div');
  textPoolContainer.id = 'floating-damage-container';
  textPoolContainer.style.position = 'fixed';
  textPoolContainer.style.top = '0';
  textPoolContainer.style.left = '0';
  textPoolContainer.style.width = '100%';
  textPoolContainer.style.height = '100%';
  textPoolContainer.style.pointerEvents = 'none';
  textPoolContainer.style.zIndex = '50';
  container.appendChild(textPoolContainer);

  const _tempPos = new THREE.Vector3();

  function spawn(text, pos, color = '#ff4d4d', isCrit = false) {
    const el = document.createElement('div');
    el.textContent = text;
    el.style.position = 'absolute';
    el.style.fontFamily = 'monospace';
    el.style.fontWeight = 'bold';
    el.style.fontSize = isCrit ? '16px' : '12px';
    el.style.color = color;
    el.style.textShadow = '0 1px 3px #000';
    el.style.transform = 'translate(-50%, -50%)';
    el.style.transition = 'opacity 0.2s';
    textPoolContainer.appendChild(el);

    floatingTexts.push({
      el,
      pos: pos.clone().add(_tempPos.set((Math.random() - 0.5) * 0.4, 1.2, (Math.random() - 0.5) * 0.4)),
      life: 0.8,
      elapsed: 0,
    });
  }

  function update(rawDt, camera) {
    for (let i = floatingTexts.length - 1; i >= 0; i--) {
      const ft = floatingTexts[i];
      ft.elapsed += rawDt;
      ft.pos.y += rawDt * 1.5;

      const pScreen = ft.pos.clone().project(camera);
      const sx = (pScreen.x * 0.5 + 0.5) * window.innerWidth;
      const sy = (-(pScreen.y * 0.5) + 0.5) * window.innerHeight;

      ft.el.style.left = `${sx}px`;
      ft.el.style.top = `${sy}px`;
      ft.el.style.opacity = `${Math.max(0, 1.0 - ft.elapsed / ft.life)}`;

      if (ft.elapsed >= ft.life) {
        textPoolContainer.removeChild(ft.el);
        floatingTexts.splice(i, 1);
      }
    }
  }

  function clear() {
    for (const ft of floatingTexts) {
      if (ft.el.parentNode === textPoolContainer) {
        textPoolContainer.removeChild(ft.el);
      }
    }
    floatingTexts.length = 0;
  }

  return { spawn, update, clear, containerEl: textPoolContainer };
}

/**
 * Creates Ground Team Decal Rings.
 */
export function createTeamDecals(scene) {
  const decalGroup = new THREE.Group();
  scene.add(decalGroup);

  const teamDecalPool = [];

  function getMesh(index, isElite = false) {
    if (index < teamDecalPool.length) {
      return teamDecalPool[index];
    }
    const innerR = isElite ? 0.60 : 0.42;
    const outerR = isElite ? 0.74 : 0.54;
    const geo = new THREE.RingGeometry(innerR, outerR, 32);
    geo.rotateX(-Math.PI / 2);
    const mat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.y = 0.015;
    decalGroup.add(mesh);
    teamDecalPool.push(mesh);
    return mesh;
  }

  function update(combatants, activeHero) {
    for (let i = 0; i < combatants.length; i++) {
      const c = combatants[i];
      const isPlayer = c === activeHero;
      const decal = getMesh(i, c.isElite);
      decal.visible = !c.isDead;
      if (decal.visible) {
        decal.position.x = c.position.x;
        decal.position.z = c.position.z;
        const targetColor = isPlayer
          ? 0x0284c7
          : c.team === 'player'
          ? 0x10b981
          : c.isElite
          ? 0xf59e0b
          : 0xef4444;
        decal.material.color.setHex(targetColor);
      }
    }
    for (let i = combatants.length; i < teamDecalPool.length; i++) {
      teamDecalPool[i].visible = false;
    }
  }

  return { decalGroup, getMesh, update };
}

/**
 * Creates Overhead Floating HUD Badges for combatants.
 */
export function createOverheadBadges(container = document.body) {
  const overheadContainer = document.createElement('div');
  overheadContainer.id = 'overhead-hud-container';
  overheadContainer.style.position = 'fixed';
  overheadContainer.style.top = '0';
  overheadContainer.style.left = '0';
  overheadContainer.style.width = '100%';
  overheadContainer.style.height = '100%';
  overheadContainer.style.pointerEvents = 'none';
  overheadContainer.style.zIndex = '45';
  container.appendChild(overheadContainer);

  const overheadBadgePool = [];

  function getBadge(index) {
    if (index < overheadBadgePool.length) {
      return overheadBadgePool[index];
    }
    const el = document.createElement('div');
    el.style.position = 'absolute';
    el.style.transform = 'translate(-50%, -100%)';
    el.style.display = 'flex';
    el.style.flexDirection = 'column';
    el.style.alignItems = 'center';
    el.style.gap = '1px';
    el.style.fontFamily = 'monospace';
    el.style.pointerEvents = 'none';
    el.style.textShadow = '0 1px 2px #000';
    el.innerHTML = `
      <div class="oh-name" style="font-weight:bold; padding:1px 4px; border-radius:2px; font-size:8px; background:rgba(12,18,25,0.85); border:1px solid rgba(255,255,255,0.15); white-space:nowrap;"></div>
      <div class="oh-hp-wrap" style="width:42px; height:3px; background:rgba(0,0,0,0.85); border-radius:1px; overflow:hidden; border:1px solid #334155;">
        <div class="oh-hp-bar" style="height:100%; width:100%; background:#ef4444; transition:width 0.05s linear;"></div>
      </div>
      <div class="oh-poise-wrap" style="width:42px; height:2px; background:rgba(0,0,0,0.85); border-radius:1px; overflow:hidden; display:none; margin-top:1px;">
        <div class="oh-poise-bar" style="height:100%; width:100%; background:#f59e0b;"></div>
      </div>
      <div class="oh-status" style="display:flex; gap:2px; font-size:8px; margin-top:1px;"></div>
    `;
    overheadContainer.appendChild(el);
    const item = {
      el,
      nameEl: el.querySelector('.oh-name'),
      hpWrap: el.querySelector('.oh-hp-wrap'),
      hpBar: el.querySelector('.oh-hp-bar'),
      poiseWrap: el.querySelector('.oh-poise-wrap'),
      poiseBar: el.querySelector('.oh-poise-bar'),
      statusEl: el.querySelector('.oh-status'),
      cachedName: '',
      cachedColor: '',
      cachedHpPct: -1,
      cachedPoisePct: -1,
      cachedStatusKey: '',
    };
    overheadBadgePool.push(item);
    return item;
  }

  const _tempProj = new THREE.Vector3();
  const _projectedPositions = [];

  function update(combatants, activeHero, camera) {
    if (!combatants || combatants.length === 0) {
      clear();
      return;
    }

    // Filter to active living combatants: hero + up to 3 nearest enemies (max 4 total)
    const livingEnemies = [];
    let heroEntry = null;

    for (let i = 0; i < combatants.length; i++) {
      const c = combatants[i];
      if (!c.isDead) {
        if (c === activeHero) {
          heroEntry = { combatant: c, dist: 0, isHero: true };
        } else {
          const dist = activeHero ? c.position.distanceToSquared(activeHero.position) : i;
          livingEnemies.push({ combatant: c, dist, isHero: false });
        }
      }
    }

    livingEnemies.sort((a, b) => a.dist - b.dist);
    const displayed = [];
    if (heroEntry) displayed.push(heroEntry);
    for (let i = 0; i < Math.min(3, livingEnemies.length); i++) {
      displayed.push(livingEnemies[i]);
    }

    const displayCount = displayed.length;
    _projectedPositions.length = 0;

    for (let slot = 0; slot < displayCount; slot++) {
      const { combatant: c, isHero } = displayed[slot];
      const badge = getBadge(slot);

      _tempProj.set(c.position.x, c.position.y + (c.capsuleHeight ? c.capsuleHeight + 0.3 : 1.8), c.position.z).project(camera);
      if (_tempProj.z > 1.0) {
        badge.el.style.display = 'none';
        continue;
      }

      let sx = (_tempProj.x * 0.5 + 0.5) * window.innerWidth;
      let sy = (-(_tempProj.y * 0.5) + 0.5) * window.innerHeight;

      // Stagger / offset to prevent overlapping nearby tags
      for (const prev of _projectedPositions) {
        if (Math.abs(prev.x - sx) < 58 && Math.abs(prev.y - sy) < 26) {
          sy -= 22; // Shift upward so it stacks cleanly above
        }
      }
      _projectedPositions.push({ x: sx, y: sy });

      badge.el.style.display = 'flex';
      badge.el.style.left = `${Math.round(sx)}px`;
      badge.el.style.top = `${Math.round(sy)}px`;

      const nameColor = isHero ? '#38bdf8' : c.team === 'player' ? '#4ade80' : c.isElite ? '#facc15' : '#f87171';
      if (badge.cachedName !== c.name || badge.cachedColor !== nameColor) {
        badge.cachedName = c.name;
        badge.cachedColor = nameColor;
        badge.nameEl.style.color = nameColor;
        badge.nameEl.textContent = c.name;
      }

      const hpPct = Math.round(Math.max(0, Math.min(100, (c.hp / c.maxHp) * 100)));
      if (badge.cachedHpPct !== hpPct) {
        badge.cachedHpPct = hpPct;
        badge.hpBar.style.width = `${hpPct}%`;
        badge.hpBar.style.background = c.team === 'player' ? '#22c55e' : '#ef4444';
      }

      if (c.maxPoise >= 50 || c.isElite) {
        badge.poiseWrap.style.display = 'block';
        const poisePct = Math.round(Math.max(0, Math.min(100, (c.poise / c.maxPoise) * 100)));
        if (badge.cachedPoisePct !== poisePct) {
          badge.cachedPoisePct = poisePct;
          badge.poiseBar.style.width = `${poisePct}%`;
        }
      } else {
        badge.poiseWrap.style.display = 'none';
      }

      // Status indicator icons
      const hasBurn = c.statusEffects?.get('burn')?.active ? 'B' : '';
      const hasFreeze = c.statusEffects?.get('freeze_slow')?.active ? 'F' : '';
      const hasStun = c.statusEffects?.get('stun')?.active ? 'S' : '';
      const hasWard = c.statusEffects?.get('ward_barrier')?.active ? 'W' : '';
      const statusKey = `${hasBurn}${hasFreeze}${hasStun}${hasWard}`;
      if (badge.cachedStatusKey !== statusKey) {
        badge.cachedStatusKey = statusKey;
        let html = '';
        if (hasBurn) html += '<span>🔥</span>';
        if (hasFreeze) html += '<span>❄️</span>';
        if (hasStun) html += '<span>⚡</span>';
        if (hasWard) html += '<span>🛡️</span>';
        badge.statusEl.innerHTML = html;
      }
    }

    // Hide any unused badges
    for (let i = displayCount; i < overheadBadgePool.length; i++) {
      overheadBadgePool[i].el.style.display = 'none';
    }
  }

  function clear() {
    for (const b of overheadBadgePool) {
      b.el.style.display = 'none';
    }
  }

  return { getBadge, update, clear, containerEl: overheadContainer };
}

/**
 * Creates 3D Arrow Pickup Bundle item in the arena.
 */
export function createArrowPickup(scene, position = new THREE.Vector3(2.5, 0, 0)) {
  const group = new THREE.Group();
  group.position.copy(position);

  // Quiver pouch base (brown leather cylinder)
  const quiverGeo = new THREE.CylinderGeometry(0.12, 0.08, 0.55, 8);
  const quiverMat = new THREE.MeshStandardMaterial({ color: 0x854d0e, roughness: 0.8 });
  const quiverMesh = new THREE.Mesh(quiverGeo, quiverMat);
  quiverMesh.position.y = 0.28;
  quiverMesh.rotation.z = 0.15;
  group.add(quiverMesh);

  // Arrow shafts with fletchings sticking out
  const arrowGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.65, 5);
  const arrowMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.6 });
  const fletchMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });

  for (let i = 0; i < 5; i++) {
    const angle = (i / 5) * Math.PI * 2;
    const aMesh = new THREE.Mesh(arrowGeo, arrowMat);
    aMesh.position.set(Math.cos(angle) * 0.05, 0.42, Math.sin(angle) * 0.05);
    aMesh.rotation.x = (Math.random() - 0.5) * 0.2;
    aMesh.rotation.z = (Math.random() - 0.5) * 0.2;
    group.add(aMesh);

    // Cyan fletching
    const fGeo = new THREE.BoxGeometry(0.06, 0.08, 0.01);
    const fMesh = new THREE.Mesh(fGeo, fletchMat);
    fMesh.position.set(0, 0.28, 0);
    aMesh.add(fMesh);
  }

  // Golden glow ring on ground
  const ringGeo = new THREE.RingGeometry(0.35, 0.45, 24);
  ringGeo.rotateX(-Math.PI / 2);
  const ringMat = new THREE.MeshBasicMaterial({
    color: 0xfacc15,
    transparent: true,
    opacity: 0.75,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const ringMesh = new THREE.Mesh(ringGeo, ringMat);
  ringMesh.position.y = 0.02;
  group.add(ringMesh);

  scene.add(group);

  let bobTime = 0;
  let active = true;

  function update(dt, hero, onCollect) {
    if (!active) return;
    bobTime += dt;
    group.position.y = Math.sin(bobTime * 2.5) * 0.08;
    group.rotation.y += dt * 1.2;

    if (hero && !hero.isDead) {
      const d = Math.hypot(hero.position.x - group.position.x, hero.position.z - group.position.z);
      if (d < 1.35) {
        if (onCollect) onCollect();
      }
    }
  }

  function setVisible(v) {
    group.visible = v;
    active = v;
  }

  return { group, update, setVisible, position: group.position };
}

/**
 * Creates wireframe capsule and swept-weapon visualizers.
 */
export function createWireframeVisualizer(scene) {
  const wireframeGroup = new THREE.Group();
  wireframeGroup.visible = false;
  scene.add(wireframeGroup);

  const capsuleMeshPool = [];
  function getCapsule(index) {
    if (index < capsuleMeshPool.length) {
      return capsuleMeshPool[index];
    }
    const geo = new THREE.CylinderGeometry(0.35, 0.35, 1.55, 14, 1, true);
    const mat = new THREE.MeshBasicMaterial({ color: 0x22c55e, wireframe: true });
    const m = new THREE.Mesh(geo, mat);
    wireframeGroup.add(m);
    capsuleMeshPool.push(m);
    return m;
  }

  const weaponLineGeo = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0, 0, 0),
  ]);
  const weaponLineMat = new THREE.LineBasicMaterial({ color: 0x00ffff });
  const weaponLineMesh = new THREE.LineSegments(weaponLineGeo, weaponLineMat);
  wireframeGroup.add(weaponLineMesh);

  // Ground melee circle sector mesh (Fix 2)
  const SECTOR_SEGMENTS = 24;
  const sectorPositions = new Float32Array((SECTOR_SEGMENTS + 2) * 3);
  const sectorIndices = [];
  for (let s = 1; s <= SECTOR_SEGMENTS; s++) {
    sectorIndices.push(0, s, s + 1);
  }
  const sectorGeo = new THREE.BufferGeometry();
  sectorGeo.setAttribute('position', new THREE.BufferAttribute(sectorPositions, 3));
  sectorGeo.setIndex(sectorIndices);

  const sectorMat = new THREE.MeshBasicMaterial({
    color: 0x38bdf8,
    transparent: true,
    opacity: 0.25,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const sectorMesh = new THREE.Mesh(sectorGeo, sectorMat);
  wireframeGroup.add(sectorMesh);

  function update(combatants, activeHero) {
    if (!wireframeGroup.visible) return;

    for (let i = 0; i < combatants.length; i++) {
      const c = combatants[i];
      const m = getCapsule(i);
      m.visible = !c.isDead;
      m.position.set(c.position.x, c.position.y + 0.775, c.position.z);
      const col = c === activeHero ? 0x38bdf8 : c.team === 'player' ? 0x22c55e : c.isElite ? 0xf59e0b : 0xef4444;
      m.material.color.setHex(col);
    }
    for (let i = combatants.length; i < capsuleMeshPool.length; i++) {
      capsuleMeshPool[i].visible = false;
    }

    if (activeHero && activeHero.weaponAnchorsValid && activeHero.stateMachine.attackPhase === ATTACK_PHASES.ACTIVE) {
      weaponLineMesh.visible = true;
      const arr = weaponLineGeo.attributes.position.array;
      arr[0] = activeHero.prevWeaponBase.x; arr[1] = activeHero.prevWeaponBase.y; arr[2] = activeHero.prevWeaponBase.z;
      arr[3] = activeHero.prevWeaponTip.x;  arr[4] = activeHero.prevWeaponTip.y;  arr[5] = activeHero.prevWeaponTip.z;
      arr[6] = activeHero.currWeaponBase.x; arr[7] = activeHero.currWeaponBase.y; arr[8] = activeHero.currWeaponBase.z;
      arr[9] = activeHero.currWeaponTip.x;  arr[10] = activeHero.currWeaponTip.y; arr[11] = activeHero.currWeaponTip.z;
      weaponLineGeo.attributes.position.needsUpdate = true;
    } else {
      weaponLineMesh.visible = false;
    }

    // Ground melee circle sector visualization
    if (activeHero && !activeHero.isDead && activeHero.weapon && activeHero.weapon.kind !== 'bow') {
      const sector = MELEE_HIT_SECTORS[activeHero.weapon.kind] || MELEE_HIT_SECTORS.sword;
      sectorMesh.visible = true;

      const r = sector.radius;
      const angleRad = (sector.angleDeg * Math.PI) / 180;
      const halfAngle = angleRad * 0.5;
      const yaw = activeHero.facingYaw || 0;
      const px = activeHero.position.x;
      const py = activeHero.position.y + 0.02; // slightly above ground to prevent z-fighting
      const pz = activeHero.position.z;

      // Center vertex
      sectorPositions[0] = px;
      sectorPositions[1] = py;
      sectorPositions[2] = pz;

      // Arc vertices
      for (let s = 0; s <= SECTOR_SEGMENTS; s++) {
        const u = s / SECTOR_SEGMENTS;
        const a = -halfAngle + u * angleRad;
        const worldAngle = yaw + a;
        const vx = px + Math.sin(worldAngle) * r;
        const vz = pz + Math.cos(worldAngle) * r;
        const idx = (s + 1) * 3;
        sectorPositions[idx + 0] = vx;
        sectorPositions[idx + 1] = py;
        sectorPositions[idx + 2] = vz;
      }
      sectorGeo.attributes.position.needsUpdate = true;

      // Color red while the active window is on, translucent blue otherwise
      const isActive = activeHero.stateMachine &&
                       activeHero.stateMachine.state === 'ATTACK' &&
                       activeHero.stateMachine.attackPhase === ATTACK_PHASES.ACTIVE;
      if (isActive) {
        sectorMat.color.setHex(0xef4444);
        sectorMat.opacity = 0.55;
      } else {
        sectorMat.color.setHex(0x38bdf8);
        sectorMat.opacity = 0.20;
      }
    } else {
      sectorMesh.visible = false;
    }
  }

  function setVisible(val) {
    wireframeGroup.visible = Boolean(val);
    return wireframeGroup.visible;
  }

  function toggle() {
    wireframeGroup.visible = !wireframeGroup.visible;
    return wireframeGroup.visible;
  }

  return {
    wireframeGroup,
    getCapsule,
    update,
    setVisible,
    toggle,
    isVisible: () => wireframeGroup.visible,
  };
}

/**
 * Creates 36m circular stone floor with concentric rings.
 */
export function createArenaFloor(scene, arenaRadius = 18.0, combatRadius = 12.0) {
  const arenaGeo = new THREE.CylinderGeometry(arenaRadius, arenaRadius + 0.6, 0.4, 64);
  const arenaMat = new THREE.MeshStandardMaterial({
    color: 0x141d28,
    roughness: 0.85,
    metalness: 0.1,
  });
  const arenaMesh = new THREE.Mesh(arenaGeo, arenaMat);
  arenaMesh.position.y = -0.2;
  arenaMesh.receiveShadow = true;
  scene.add(arenaMesh);

  const ringGroup = new THREE.Group();
  const ringRadii = [4.0, 8.0, combatRadius];
  for (const r of ringRadii) {
    const isPerimeter = r === combatRadius;
    const ringGeo = new THREE.RingGeometry(r - (isPerimeter ? 0.08 : 0.04), r + (isPerimeter ? 0.08 : 0.04), 64);
    const ringMat = new THREE.MeshBasicMaterial({
      color: isPerimeter ? 0x38bdf8 : 0x0284c7,
      transparent: true,
      opacity: isPerimeter ? 0.70 : 0.35,
      side: THREE.DoubleSide,
    });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.rotation.x = -Math.PI / 2;
    ringMesh.position.y = 0.012;
    ringGroup.add(ringMesh);
  }
  scene.add(ringGroup);

  return { arenaMesh, ringGroup, arenaRadius, combatRadius };
}
