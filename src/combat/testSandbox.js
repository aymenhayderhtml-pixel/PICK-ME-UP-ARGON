// src/combat/testSandbox.js
// Universal Combat Engine Phase 2 - Standalone Combat Sandbox Engine
// Staff & Magic Spellcasting, Pooled Primitive VFX, Status Engine, & Autonomous Mage AI

import * as THREE from 'three';
import { HeroRig } from '../art/HeroRig.js';
import { createWeaponModel, createShieldModel } from '../art/weapons.js';
import { Combatant } from './Combatant.js';
import { HitPipeline } from './HitPipeline.js';
import { DamageResolver } from './DamageResolver.js';
import { timeScale } from './TimeScale.js';
import { combatEvents } from './CombatEvents.js';
import { ATTACK_PHASES } from './StateMachine.js';
import { SpellVFXPool } from './SpellVFXPool.js';
import { SpellSystem } from './SpellSystem.js';
import { MageAI } from './MageAI.js';
import { SquadController } from './SquadController.js';
import { SPELLS_TABLE } from './CombatData.js';

export function initCombatSandbox(container, debugUI = {}) {
  // 1. Scene, Camera, Renderer Setup
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0c1219);

  const camera = new THREE.PerspectiveCamera(46, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.set(0, 8.5, 13.0);

  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    powerPreference: 'high-performance',
    preserveDrawingBuffer: true,
  });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);

  // 2. Lighting Setup
  const hemiLight = new THREE.HemisphereLight(0xdcebf5, 0x141e28, 1.3);
  scene.add(hemiLight);

  const dirLight = new THREE.DirectionalLight(0xffffff, 1.7);
  dirLight.position.set(10, 18, 12);
  dirLight.castShadow = true;
  dirLight.shadow.mapSize.width = 1024;
  dirLight.shadow.mapSize.height = 1024;
  dirLight.shadow.camera.near = 0.5;
  dirLight.shadow.camera.far = 40;
  dirLight.shadow.camera.left = -18;
  dirLight.shadow.camera.right = 18;
  dirLight.shadow.camera.top = 18;
  dirLight.shadow.camera.bottom = -18;
  scene.add(dirLight);

  // 3. 36m Diameter Circular Stone Floor with 24m Combat Rings
  const arenaRadius = 18.0; // 36m diameter floor
  const combatRadius = 12.0; // 24m combat boundary
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

  // Concentric decorative ring lines (4m, 8m, and 12m perimeter)
  const ringGroup = new THREE.Group();
  const ringRadii = [4.0, 8.0, 12.0];
  for (const r of ringRadii) {
    const isPerimeter = r === 12.0;
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

  // 4. Combat Management Structures
  const combatants = [];
  const hitPipeline = new HitPipeline();
  const spellVFXPool = new SpellVFXPool(scene);
  const spellSystem = new SpellSystem(scene, spellVFXPool, combatants);
  const squadController = new SquadController();

  // Floating damage number pool
  const floatingTexts = [];
  const textPoolContainer = document.createElement('div');
  textPoolContainer.style.position = 'fixed';
  textPoolContainer.style.top = '0';
  textPoolContainer.style.left = '0';
  textPoolContainer.style.width = '100%';
  textPoolContainer.style.height = '100%';
  textPoolContainer.style.pointerEvents = 'none';
  textPoolContainer.style.zIndex = '50';
  document.body.appendChild(textPoolContainer);

  function spawnDamageText(text, pos, color = '#ff4d4d', isCrit = false) {
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
      pos: pos.clone().add(new THREE.Vector3((Math.random() - 0.5) * 0.4, 1.2, (Math.random() - 0.5) * 0.4)),
      life: 0.8,
      elapsed: 0,
    });
  }

  // 5. Heroes: Han Islat (Vanguard) and Eolka (Mage Ally / Playable)
  // A. Han Islat (Sword + Shield)
  const hanRig = new HeroRig({ hair: 0x111111, armor: 0x2a303c });
  hanRig.equip({
    weapon: { kind: 'sword', grade: 'D', enhance: 0, durability: 100 },
    offhand: { kind: 'round_wood', grade: 'D', durability: 100 },
  });
  scene.add(hanRig.group);

  const han = new Combatant({
    id: 1,
    name: 'Han Islat (Hero)',
    team: 'player',
    roleTag: 'vanguard',
    classTags: ['melee', 'vanguard', 'mage'], // Han can also cast spells through table
    maxHp: 120,
    maxStamina: 100,
    maxMana: 100,
    maxPoise: 100,
    baseAttack: 22,
    defense: 0.15,
    position: new THREE.Vector3(0, 0, 2.0),
    facingYaw: 0,
    mesh: hanRig.group,
    rig: hanRig,
    weapon: { kind: 'sword', grade: 'D', damageMult: 1.0, reach: 0.85, radius: 0.12 },
    shield: { kind: 'ironRound', grade: 'D', blockEfficiency: 0.65 },
  });
  han.spellSystem = spellSystem;
  han.init();
  combatants.push(han);

  // B. Eolka (Mage Ally equipped with Staff)
  const eolkaRig = new HeroRig({ hair: 0xd946ef, armor: 0x4a044e });
  eolkaRig.equip({
    weapon: { kind: 'staff', grade: 'C', enhance: 0, durability: 100 },
  });
  scene.add(eolkaRig.group);

  const eolka = new Combatant({
    id: 10,
    name: 'Eolka (Mage)',
    team: 'player',
    roleTag: 'mage',
    classTags: ['mage', 'ranged'],
    maxHp: 90,
    maxStamina: 80,
    maxMana: 100,
    maxPoise: 60,
    baseAttack: 18,
    defense: 0.08,
    position: new THREE.Vector3(-2.0, 0, 3.5),
    facingYaw: 0,
    mesh: eolkaRig.group,
    rig: eolkaRig,
    weapon: { kind: 'staff', grade: 'C', damageMult: 1.15, reach: 1.1, radius: 0.14 },
  });
  eolka.spellSystem = spellSystem;
  eolka.init();
  combatants.push(eolka);

  // Register Eolka to Squad Slot 4 (Meteor Bombardment)
  squadController.registerHero(3, eolka);
  // Register Han to Squad Slot 2 (Aegis Ward)
  squadController.registerHero(1, han);

  // Autonomous Mage AI for Eolka (active when Han is player-controlled)
  const eolkaAI = new MageAI(eolka, combatants);

  // Active Player-Controlled Hero: default is Han
  let activeHero = han;
  let isEolkaAutonomous = true;

  function setHeroRole(role) {
    if (role === 'eolka') {
      activeHero = eolka;
      isEolkaAutonomous = false;
    } else {
      activeHero = han;
      isEolkaAutonomous = true;
    }
  }

  // 6. Phase 2 Arena Test Entities
  // A. Dummy 1: Passive Dummy ([-3.5, 0, -3.0]) - Infinite HP (9999), Grunt Poise (15)
  const dummy1Rig = new HeroRig({ hair: 0x5a3d1c, armor: 0x4a2e18 });
  dummy1Rig.equip({ weapon: { kind: 'sword', grade: 'E' } });
  scene.add(dummy1Rig.group);

  const dummy1 = new Combatant({
    id: 2,
    name: 'Passive Dummy',
    team: 'enemy',
    roleTag: 'grunt',
    maxHp: 9999,
    hp: 9999,
    maxPoise: 15,
    baseAttack: 0,
    defense: 0.05,
    position: new THREE.Vector3(-3.5, 0, -3.0),
    facingYaw: Math.PI,
    mesh: dummy1Rig.group,
    rig: dummy1Rig,
  });
  dummy1.spellSystem = spellSystem;
  dummy1.init();
  combatants.push(dummy1);

  // B. Dummy 2: Timed Attacker Dummy ([0, 0, -3.5]) - Attacks every 3.0s with sword
  const dummy2Rig = new HeroRig({ hair: 0x882222, armor: 0x551111 });
  dummy2Rig.equip({
    weapon: { kind: 'sword', grade: 'C' },
    offhand: { kind: 'round_wood', grade: 'D' },
  });
  scene.add(dummy2Rig.group);

  const dummy2 = new Combatant({
    id: 3,
    name: 'Timed Attacker',
    team: 'enemy',
    roleTag: 'grunt',
    maxHp: 200,
    hp: 200,
    maxPoise: 15,
    baseAttack: 18,
    defense: 0.10,
    position: new THREE.Vector3(0, 0, -3.5),
    facingYaw: 0,
    mesh: dummy2Rig.group,
    rig: dummy2Rig,
  });
  dummy2.spellSystem = spellSystem;
  dummy2.init();
  dummy2.attackTimer = 0.0;
  dummy2.attackInterval = 3.0;
  combatants.push(dummy2);

  // C. Dummy 3: Elite Poise Dummy ([3.0, 0, -2.5]) - 100 HP, 80 Poise
  const dummy3Rig = new HeroRig({ hair: 0x222233, armor: 0x667788 });
  dummy3Rig.equip({ weapon: { kind: 'greatsword', grade: 'B' } });
  scene.add(dummy3Rig.group);

  const dummy3 = new Combatant({
    id: 4,
    name: 'Elite Knight Dummy',
    team: 'enemy',
    roleTag: 'elite',
    isElite: true,
    maxHp: 200,
    hp: 200,
    maxPoise: 80,
    baseAttack: 25,
    defense: 0.20,
    position: new THREE.Vector3(4.5, 0, 0.5),
    facingYaw: -Math.PI / 2,
    mesh: dummy3Rig.group,
    rig: dummy3Rig,
    weapon: { kind: 'greatsword', grade: 'B', damageMult: 1.45, reach: 1.15, radius: 0.16 },
  });
  dummy3.spellSystem = spellSystem;
  dummy3.init();
  combatants.push(dummy3);

  // D. Enemy Shaman Caster Dummy ([0.0, 0, -6.5]) - Staff Caster, 250 HP, 80 Poise
  const shamanRig = new HeroRig({ hair: 0x1e293b, armor: 0x14532d });
  shamanRig.equip({ weapon: { kind: 'staff', grade: 'B' } });
  scene.add(shamanRig.group);

  const shamanDummy = new Combatant({
    id: 5,
    name: 'Enemy Shaman Caster',
    team: 'enemy',
    roleTag: 'shaman',
    classTags: ['shaman', 'mage'],
    maxHp: 250,
    hp: 250,
    maxPoise: 80,
    maxMana: 150,
    mana: 150,
    baseAttack: 20,
    defense: 0.12,
    position: new THREE.Vector3(0.0, 0, -6.5),
    facingYaw: 0,
    mesh: shamanRig.group,
    rig: shamanRig,
    weapon: { kind: 'staff', grade: 'B', damageMult: 1.25, reach: 1.1, radius: 0.14 },
  });
  shamanDummy.spellSystem = spellSystem;
  shamanDummy.init();
  shamanDummy.castTimer = 0.0;
  shamanDummy.castInterval = 4.0;
  shamanDummy.spellToggle = false;
  combatants.push(shamanDummy);

  // E. Hurt Ally Dummy ([-4.5, 0, -1.5]) - 25% HP (25/100) on 'player' team for smart heal testing
  const hurtAllyRig = new HeroRig({ hair: 0xd97706, armor: 0x1e3a8a });
  hurtAllyRig.equip({ weapon: { kind: 'sword', grade: 'D' } });
  scene.add(hurtAllyRig.group);

  const hurtAllyDummy = new Combatant({
    id: 6,
    name: 'Wounded Scout (Ally)',
    team: 'player',
    roleTag: 'scout',
    classTags: ['melee'],
    maxHp: 100,
    hp: 25, // 25% HP!
    maxPoise: 50,
    defense: 0.10,
    position: new THREE.Vector3(-4.5, 0, -1.5),
    facingYaw: 0,
    mesh: hurtAllyRig.group,
    rig: hurtAllyRig,
  });
  hurtAllyDummy.spellSystem = spellSystem;
  hurtAllyDummy.init();
  combatants.push(hurtAllyDummy);
  squadController.registerHero(0, hurtAllyDummy); // Jenna slot

  // F. Dummy Cluster (3 Grunts grouped within 1.5m) for testing splash, meteor, chain jumps
  const clusterDummies = [];
  const clusterPositions = [
    new THREE.Vector3(3.5, 0, -4.0),
    new THREE.Vector3(4.2, 0, -3.5),
    new THREE.Vector3(3.8, 0, -5.0),
  ];

  for (let i = 0; i < 3; i++) {
    const rig = new HeroRig({ hair: 0x78350f, armor: 0x451a03 });
    rig.equip({ weapon: { kind: 'dagger', grade: 'E' } });
    scene.add(rig.group);

    const gr = new Combatant({
      id: 7 + i,
      name: `Cluster Grunt ${i + 1}`,
      team: 'enemy',
      roleTag: 'grunt',
      maxHp: 80,
      hp: 80,
      maxPoise: 15,
      position: clusterPositions[i],
      facingYaw: Math.PI,
      mesh: rig.group,
      rig,
    });
    gr.spellSystem = spellSystem;
    gr.init();
    combatants.push(gr);
    clusterDummies.push(gr);
  }

  // Snapshot initial state for every combatant for instant reset & auto-respawn
  for (const c of combatants) {
    c._initial = {
      pos: c.position.clone(),
      yaw: c.facingYaw,
      hp: c.hp,
      maxHp: c.maxHp,
      mana: c.mana || 100,
      maxMana: c.maxMana || 100,
      poise: c.poise,
      maxPoise: c.maxPoise,
      stamina: c.stamina || 100,
      maxStamina: c.maxStamina || 100,
    };
  }

  // 7. Wireframe Visualizers (Matching real 1.55m height and 0.35m radius)
  const wireframeGroup = new THREE.Group();
  wireframeGroup.visible = false;
  scene.add(wireframeGroup);

  const capsuleMeshPool = [];
  function getCapsuleWireframe(index) {
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

  // 7b. Ground Team Decal Rings (Blue = Player, Green = Ally, Amber = Elite, Red = Enemy)
  const decalGroup = new THREE.Group();
  scene.add(decalGroup);

  const teamDecalPool = [];
  function getTeamDecalMesh(index, isElite = false) {
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

  // 7c. Overhead Floating Badges (Name, HP, Poise, and Status icons)
  const overheadContainer = document.createElement('div');
  overheadContainer.id = 'overhead-hud-container';
  overheadContainer.style.position = 'fixed';
  overheadContainer.style.top = '0';
  overheadContainer.style.left = '0';
  overheadContainer.style.width = '100%';
  overheadContainer.style.height = '100%';
  overheadContainer.style.pointerEvents = 'none';
  overheadContainer.style.zIndex = '45';
  document.body.appendChild(overheadContainer);

  const overheadBadgePool = [];
  function getOverheadBadge(index) {
    if (index < overheadBadgePool.length) {
      return overheadBadgePool[index];
    }
    const el = document.createElement('div');
    el.style.position = 'absolute';
    el.style.transform = 'translate(-50%, -100%)';
    el.style.display = 'flex';
    el.style.flexDirection = 'column';
    el.style.alignItems = 'center';
    el.style.gap = '2px';
    el.style.fontFamily = 'monospace';
    el.style.pointerEvents = 'none';
    el.style.textShadow = '0 1px 2px #000';
    el.innerHTML = `
      <div class="oh-name" style="font-weight:bold; padding:1px 5px; border-radius:2px; font-size:9px; background:rgba(12,18,25,0.75); border:1px solid rgba(255,255,255,0.15); white-space:nowrap;"></div>
      <div class="oh-hp-wrap" style="width:58px; height:5px; background:rgba(0,0,0,0.8); border-radius:2px; overflow:hidden; border:1px solid #334155;">
        <div class="oh-hp-bar" style="height:100%; width:100%; background:#ef4444; transition:width 0.06s linear;"></div>
      </div>
      <div class="oh-poise-wrap" style="width:58px; height:3px; background:rgba(0,0,0,0.8); border-radius:1px; overflow:hidden; display:none; margin-top:1px;">
        <div class="oh-poise-bar" style="height:100%; width:100%; background:#f59e0b;"></div>
      </div>
      <div class="oh-status" style="display:flex; gap:3px; font-size:10px; margin-top:1px;"></div>
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
    };
    overheadBadgePool.push(item);
    return item;
  }

  // Arena Reset & Auto-Respawn Logic
  let autoRespawnEnabled = true;
  function resetAllCombatants() {
    for (const c of combatants) {
      c.isDead = false;
      if (c.mesh) {
        c.mesh.visible = true;
      }
      if (c._initial) {
        c.position.copy(c._initial.pos);
        c.facingYaw = c._initial.yaw;
        c.hp = c._initial.hp;
        c.maxHp = c._initial.maxHp;
        c.mana = c._initial.mana;
        c.maxMana = c._initial.maxMana;
        c.poise = c._initial.poise;
        c.maxPoise = c._initial.maxPoise;
        c.stamina = c._initial.stamina;
        c.maxStamina = c._initial.maxStamina;
      } else {
        c.hp = c.maxHp;
        c.mana = c.maxMana;
        c.poise = c.maxPoise;
        c.stamina = c.maxStamina;
      }
      c.statusEffects.clear();
      c.spellCooldowns = {};
      c.stateMachine.state = 'IDLE';
      c.stateMachine.stateTime = 0;
      c.stateMachine.attackPhase = ATTACK_PHASES.NONE;
      c.stateMachine.castPhase = 'NONE';
      c.iFrameTimer = 0;
      c.parryWindowTimer = 0;
      c.counterWindowTimer = 0;
      c._respawnTimer = 0;
    }
    if (dummy2) dummy2.attackTimer = 0.0;
    if (shamanDummy) {
      shamanDummy.castTimer = 0.0;
      shamanDummy.spellToggle = false;
    }
    combatEvents.emit('onReset', { message: 'Arena and all combatants reset' });
    spawnDamageText('ARENA RESET', activeHero.position, '#38bdf8', true);
  }

  function toggleAutoRespawn() {
    autoRespawnEnabled = !autoRespawnEnabled;
    return autoRespawnEnabled;
  }

  // Swept weapon lines
  const weaponLineGeo = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0, 0, 0),
  ]);
  const weaponLineMat = new THREE.LineBasicMaterial({ color: 0x00ffff });
  const weaponLineMesh = new THREE.LineSegments(weaponLineGeo, weaponLineMat);
  wireframeGroup.add(weaponLineMesh);

  // 8. 30-Dummy Stress Test Spawner
  const extraDummies = [];
  let isStressTesting = false;

  function toggleStressTest() {
    isStressTesting = !isStressTesting;
    if (isStressTesting) {
      // Current combatants: Han, Eolka, Passive, Timed, Elite, Shaman, HurtAlly, 3 Cluster = 10
      // Spawn 21 extra dummies to reach 31 total combatants
      for (let i = 0; i < 21; i++) {
        const angle = (i / 21) * Math.PI * 2;
        const rad = 5.5 + (i % 3) * 2.2;
        const dx = Math.cos(angle) * rad;
        const dz = Math.sin(angle) * rad;

        const rig = new HeroRig({ hair: 0x333333, armor: 0x444444 });
        rig.equip({ weapon: { kind: 'sword', grade: 'E' } });
        scene.add(rig.group);

        const d = new Combatant({
          name: `Swarm_${i + 1}`,
          team: 'enemy',
          maxHp: 80,
          maxPoise: 15,
          position: new THREE.Vector3(dx, 0, dz),
          facingYaw: Math.atan2(-dx, -dz),
          mesh: rig.group,
          rig,
        });
        d.isSwarmDummy = true;
        d.spellSystem = spellSystem;
        d.init();
        combatants.push(d);
        extraDummies.push(d);
      }
    } else {
      for (const d of extraDummies) {
        const idx = combatants.indexOf(d);
        if (idx !== -1) combatants.splice(idx, 1);
        if (d.mesh && d.mesh.parent) d.mesh.parent.remove(d.mesh);
        d.dispose();
      }
      extraDummies.length = 0;
    }
  }

  // 9. Input Controller & Mouse Aim Raycaster
  const keys = new Set();
  let lmbDown = false;
  let lmbHoldTimer = 0.0;
  let rmbDown = false;
  const mouseScreenPos = new THREE.Vector2();
  const mouseRaycaster = new THREE.Raycaster();
  const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const groundAimPoint = new THREE.Vector3();

  window.addEventListener('mousemove', (e) => {
    mouseScreenPos.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouseScreenPos.y = -(e.clientY / window.innerHeight) * 2 + 1;
    mouseRaycaster.setFromCamera(mouseScreenPos, camera);
    mouseRaycaster.ray.intersectPlane(groundPlane, groundAimPoint);
  });

  window.addEventListener('keydown', (e) => {
    keys.add(e.code);

    if (e.code === 'Space') {
      e.preventDefault();
      // Directional Dodge Roll
      let mx = 0, mz = 0;
      if (keys.has('KeyW')) mz -= 1;
      if (keys.has('KeyS')) mz += 1;
      if (keys.has('KeyA')) mx -= 1;
      if (keys.has('KeyD')) mx += 1;

      const dir = new THREE.Vector3(mx, 0, mz);
      if (dir.lengthSq() < 0.001) {
        const yaw = activeHero.facingYaw;
        dir.set(Math.sin(yaw), 0, Math.cos(yaw));
      } else {
        dir.normalize();
      }

      activeHero.stateMachine.transitionTo('DODGE', { direction: dir });
    }

    // Squad Skills Hotkeys: 1 to 4 (and F1-F4 / Z/X/C/V)
    if (e.code === 'Digit1' || e.code === 'KeyZ' || e.code === 'F1') squadController.triggerSquadSkill(0, groundAimPoint);
    if (e.code === 'Digit2' || e.code === 'KeyX' || e.code === 'F2') squadController.triggerSquadSkill(1, groundAimPoint);
    if (e.code === 'Digit3' || e.code === 'KeyC' || e.code === 'F3') squadController.triggerSquadSkill(2, groundAimPoint);
    if (e.code === 'Digit4' || e.code === 'KeyV' || e.code === 'F4') squadController.triggerSquadSkill(3, groundAimPoint);

    // Direct Spell Hotkeys: Q, E, R, F, T, G (Casts from active hero)
    if (e.code === 'KeyQ') activeHero.castSpell('fireball', groundAimPoint);
    if (e.code === 'KeyE') activeHero.castSpell('iceSpike', groundAimPoint);
    if (e.code === 'KeyR') {
      if (activeHero.isDead || e.shiftKey) {
        resetAllCombatants();
      } else {
        activeHero.castSpell('lightningChain', groundAimPoint);
      }
    }
    if (e.code === 'KeyF') activeHero.castSpell('heal', groundAimPoint);
    if (e.code === 'KeyT') activeHero.castSpell('ward', groundAimPoint);
    if (e.code === 'KeyG') activeHero.castSpell('meteor', groundAimPoint);

    // Reset hotkey: KeyP or dead R or Shift+R
    if (e.code === 'KeyP') resetAllCombatants();
  });

  window.addEventListener('keyup', (e) => {
    keys.delete(e.code);
  });

  window.addEventListener('mousedown', (e) => {
    if (e.target.closest('#debug-panel') || e.target.closest('#hero-hud') || e.target.closest('#spell-cast-hud')) return;
    if (e.button === 0) {
      lmbDown = true;
      lmbHoldTimer = 0.0;
    } else if (e.button === 2) {
      e.preventDefault();
      rmbDown = true;
      activeHero.stateMachine.transitionTo('BLOCK');
    }
  });

  window.addEventListener('mouseup', (e) => {
    if (e.button === 0 && lmbDown) {
      lmbDown = false;
      const isHeavy = lmbHoldTimer >= 0.35;
      if (activeHero.stateMachine.state === 'IDLE' || activeHero.stateMachine.state === 'MOVE' || activeHero.stateMachine.attackPhase === ATTACK_PHASES.RECOVERY) {
        activeHero.stateMachine.transitionTo('ATTACK', { heavy: isHeavy });
      } else {
        activeHero.stateMachine.bufferInput('ATTACK', { heavy: isHeavy });
      }
      lmbHoldTimer = 0.0;
    } else if (e.button === 2) {
      rmbDown = false;
      if (activeHero.stateMachine.state === 'BLOCK') {
        activeHero.stateMachine.transitionTo('IDLE');
      }
    }
  });

  window.addEventListener('contextmenu', (e) => e.preventDefault());

  // Combat Events Listeners for floating numbers & FX
  combatEvents.on('onHit', (payload) => {
    const isCrit = payload.isCritical || payload.isPoiseBreak;
    const col = payload.isPoiseBreak ? '#ffd700' : isCrit ? '#ff8800' : '#ff4444';
    const target = combatants.find((c) => c.name === payload.targetName);
    const pos = target ? target.position : new THREE.Vector3();
    spawnDamageText(`-${payload.damage}`, pos, col, isCrit);
  });

  combatEvents.on('onBlock', (payload) => {
    const target = combatants.find((c) => c.name === payload.targetName);
    const pos = target ? target.position : new THREE.Vector3();
    spawnDamageText(`BLOCKED (-${payload.chipDamage})`, pos, '#38bdf8', false);
  });

  combatEvents.on('onParry', (payload) => {
    const target = combatants.find((c) => c.name === payload.targetName);
    const pos = target ? target.position : new THREE.Vector3();
    spawnDamageText('PERFECT PARRY!', pos, '#00ffff', true);
  });

  combatEvents.on('onHeal', (payload) => {
    const target = combatants.find((c) => c.name === payload.targetName);
    const pos = target ? target.position : new THREE.Vector3();
    spawnDamageText(`+${payload.amount} HP`, pos, '#22c55e', true);
  });

  combatEvents.on('onWard', (payload) => {
    const target = combatants.find((c) => c.name === payload.targetName);
    const pos = target ? target.position : new THREE.Vector3();
    spawnDamageText(`WARD +${payload.barrierHp}`, pos, '#06b6d4', false);
  });

  // 10. Main Animation & Update Loop
  let lastTime = performance.now();
  let cpuTickMs = 0;

  function animate() {
    requestAnimationFrame(animate);

    const now = performance.now();
    const rawDt = Math.min(0.05, (now - lastTime) * 0.001);
    lastTime = now;

    const tStart = performance.now();

    // Global TimeScale update
    const worldDt = timeScale.update(rawDt);
    squadController.update(worldDt);

    // Hero Input / Movement Execution
    if (lmbDown) {
      lmbHoldTimer += rawDt;
    }

    if (activeHero.stateMachine.state === 'IDLE' || activeHero.stateMachine.state === 'MOVE' || activeHero.stateMachine.state === 'CAST') {
      let mx = 0, mz = 0;
      if (keys.has('KeyW')) mz -= 1;
      if (keys.has('KeyS')) mz += 1;
      if (keys.has('KeyA')) mx -= 1;
      if (keys.has('KeyD')) mx += 1;

      if (mx !== 0 || mz !== 0) {
        const len = Math.hypot(mx, mz);
        const vx = (mx / len) * activeHero.effectiveMoveSpeed;
        const vz = (mz / len) * activeHero.effectiveMoveSpeed;

        activeHero.position.x += vx * worldDt;
        activeHero.position.z += vz * worldDt;
        activeHero.facingYaw = Math.atan2(vx, vz);
        if (activeHero.stateMachine.state !== 'CAST') {
          activeHero.stateMachine.transitionTo('MOVE');
        }
      } else if (activeHero.stateMachine.state === 'MOVE') {
        activeHero.stateMachine.transitionTo('IDLE');
      }
    }

    // Autonomous Eolka Mage AI Update
    if (isEolkaAutonomous && activeHero !== eolka) {
      eolkaAI.update(worldDt);
    }

    // Clamp combatants within 24m arena radius
    for (const c of combatants) {
      const d = Math.hypot(c.position.x, c.position.z);
      if (d > arenaRadius - c.capsuleRadius) {
        const ratio = (arenaRadius - c.capsuleRadius) / d;
        c.position.x *= ratio;
        c.position.z *= ratio;
      }
    }

    // Timed Attacker Dummy (Dummy 2)
    if (!dummy2.isDead) {
      dummy2.attackTimer += worldDt;
      const cycle = dummy2.attackTimer % dummy2.attackInterval;
      const dx = activeHero.position.x - dummy2.position.x;
      const dz = activeHero.position.z - dummy2.position.z;
      dummy2.facingYaw = Math.atan2(dx, dz);

      if (cycle >= 2.70 && cycle < 2.75 && dummy2.stateMachine.state !== 'ATTACK') {
        dummy2.stateMachine.transitionTo('ATTACK');
      }
    }

    // Shaman Dummy Caster Cycle: Alternates Fireball and Meteor every 4.0s
    if (!shamanDummy.isDead) {
      shamanDummy.castTimer += worldDt;
      const dx = activeHero.position.x - shamanDummy.position.x;
      const dz = activeHero.position.z - shamanDummy.position.z;
      shamanDummy.facingYaw = Math.atan2(dx, dz);

      if (shamanDummy.castTimer >= shamanDummy.castInterval) {
        shamanDummy.castTimer = 0.0;
        shamanDummy.spellToggle = !shamanDummy.spellToggle;
        if (shamanDummy.spellToggle) {
          shamanDummy.castSpell('fireball', activeHero.position, activeHero);
        } else {
          shamanDummy.castSpell('meteor', activeHero.position);
        }
      }
    }

    // Update all combatants
    for (let i = 0; i < combatants.length; i++) {
      combatants[i].update(rawDt, worldDt);
    }

    // Auto-Respawn check
    if (autoRespawnEnabled) {
      for (const c of combatants) {
        if (c.isDead) {
          c._respawnTimer = (c._respawnTimer || 0) + worldDt;
          if (c._respawnTimer >= 3.0) {
            c.isDead = false;
            if (c.mesh) c.mesh.visible = true;
            if (c._initial) {
              c.position.copy(c._initial.pos);
              c.facingYaw = c._initial.yaw;
              c.hp = c._initial.hp;
              c.maxHp = c._initial.maxHp;
              c.mana = c._initial.mana;
              c.maxMana = c._initial.maxMana;
              c.poise = c._initial.poise;
              c.maxPoise = c._initial.maxPoise;
              c.stamina = c._initial.stamina;
              c.maxStamina = c._initial.maxStamina;
            } else {
              c.hp = c.maxHp;
              c.mana = c.maxMana;
              c.poise = c.maxPoise;
              c.stamina = c.maxStamina;
            }
            c.statusEffects.clear();
            c.stateMachine.state = 'IDLE';
            c._respawnTimer = 0;
            spawnDamageText('RESPAWNED', c.position, '#4ade80', false);
          }
        }
      }
    }

    // Swept-Capsule Collision Pipeline & Spells
    hitPipeline.update(combatants, worldDt);
    spellSystem.update(worldDt);

    cpuTickMs = performance.now() - tStart;

    // Update floating damage texts
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

    // Update Ground Team Decals
    for (let i = 0; i < combatants.length; i++) {
      const c = combatants[i];
      const isPlayer = c === activeHero;
      const decal = getTeamDecalMesh(i, c.isElite);
      decal.visible = !c.isDead;
      if (decal.visible) {
        decal.position.x = c.position.x;
        decal.position.z = c.position.z;
        const targetColor = isPlayer ? 0x0284c7 : c.team === 'player' ? 0x10b981 : c.isElite ? 0xf59e0b : 0xef4444;
        decal.material.color.setHex(targetColor);
      }
    }
    for (let i = combatants.length; i < teamDecalPool.length; i++) {
      teamDecalPool[i].visible = false;
    }

    // Update Overhead Floating HUD Badges
    const _tempProj = new THREE.Vector3();
    for (let i = 0; i < combatants.length; i++) {
      const c = combatants[i];
      if (c.isSwarmDummy && combatants.length > 15) {
        if (i < overheadBadgePool.length) overheadBadgePool[i].el.style.display = 'none';
        continue;
      }
      const badge = getOverheadBadge(i);
      if (c.isDead) {
        badge.el.style.display = 'none';
        continue;
      }
      _tempProj.set(c.position.x, c.position.y + 1.85, c.position.z).project(camera);
      if (_tempProj.z > 1.0) {
        badge.el.style.display = 'none';
        continue;
      }
      const sx = (_tempProj.x * 0.5 + 0.5) * window.innerWidth;
      const sy = (-(_tempProj.y * 0.5) + 0.5) * window.innerHeight;
      badge.el.style.display = 'flex';
      badge.el.style.left = `${sx}px`;
      badge.el.style.top = `${sy}px`;

      const isHero = c === activeHero;
      const nameColor = isHero ? '#38bdf8' : c.team === 'player' ? '#4ade80' : c.isElite ? '#facc15' : '#f87171';
      badge.nameEl.style.color = nameColor;
      badge.nameEl.textContent = c.name;

      const hpPct = Math.max(0, Math.min(100, (c.hp / c.maxHp) * 100));
      badge.hpBar.style.width = `${hpPct}%`;
      badge.hpBar.style.background = c.team === 'player' ? '#22c55e' : '#ef4444';

      if (c.maxPoise >= 50 || c.isElite) {
        badge.poiseWrap.style.display = 'block';
        const poisePct = Math.max(0, Math.min(100, (c.poise / c.maxPoise) * 100));
        badge.poiseBar.style.width = `${poisePct}%`;
      } else {
        badge.poiseWrap.style.display = 'none';
      }

      let statusHtml = '';
      if (c.statusEffects.get('burn')?.active) statusHtml += '<span title="Burn">🔥</span>';
      if (c.statusEffects.get('freeze_slow')?.active) statusHtml += '<span title="Slow">❄️</span>';
      if (c.statusEffects.get('stun')?.active) statusHtml += '<span title="Stun">⚡</span>';
      const ward = c.statusEffects.get('ward_barrier');
      if (ward?.active && ward.barrierHp > 0) statusHtml += '<span title="Ward">🛡️</span>';
      badge.statusEl.innerHTML = statusHtml;
    }
    for (let i = combatants.length; i < overheadBadgePool.length; i++) {
      overheadBadgePool[i].el.style.display = 'none';
    }

    // Update Wireframe visualizers if enabled
    if (wireframeGroup.visible) {
      for (let i = 0; i < combatants.length; i++) {
        const c = combatants[i];
        const m = getCapsuleWireframe(i);
        m.visible = !c.isDead;
        m.position.set(c.position.x, c.position.y + 0.775, c.position.z);
        const col = c === activeHero ? 0x38bdf8 : c.team === 'player' ? 0x22c55e : c.isElite ? 0xf59e0b : 0xef4444;
        m.material.color.setHex(col);
      }
      for (let i = combatants.length; i < capsuleMeshPool.length; i++) {
        capsuleMeshPool[i].visible = false;
      }

      if (activeHero.weaponAnchorsValid && activeHero.stateMachine.attackPhase === ATTACK_PHASES.ACTIVE) {
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
    }

    // Camera follow active hero smoothly
    const targetCamX = activeHero.position.x;
    const targetCamZ = activeHero.position.z + 7.5;
    camera.position.x += (targetCamX - camera.position.x) * 0.1;
    camera.position.z += (targetCamZ - camera.position.z) * 0.1;
    camera.lookAt(activeHero.position.x, activeHero.position.y + 1.2, activeHero.position.z);

    renderer.render(scene, camera);

    // Update debug overlay UI
    if (debugUI.update) {
      debugUI.update({
        hero: activeHero,
        han,
        eolka,
        dummy1,
        dummy2,
        dummy3,
        shamanDummy,
        hurtAllyDummy,
        clusterDummies,
        combatantsCount: combatants.length,
        cpuTickMs,
        timeScale: timeScale.currentScale * timeScale.debugScale,
        events: combatEvents.getRecentLogs(),
        squadController,
      });
    }
  }

  animate();

  // Expose global test handle for Playwright automated QA testing
  window.__combatSandbox = {
    hero: han,
    han,
    eolka,
    activeHero,
    dummy1,
    dummy2,
    dummy3,
    shamanDummy,
    hurtAllyDummy,
    clusterDummies,
    combatants,
    hitPipeline,
    spellSystem,
    spellVFXPool,
    timeScale,
    combatEvents,
    squadController,
    setHeroRole,
    toggleStressTest,
    toggleWireframes: () => {
      wireframeGroup.visible = !wireframeGroup.visible;
      return wireframeGroup.visible;
    },
    resetAllCombatants,
    toggleAutoRespawn,
    isAutoRespawnEnabled: () => autoRespawnEnabled,
    getCpuTickMs: () => cpuTickMs,
  };

  return window.__combatSandbox;
}
