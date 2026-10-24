import * as THREE from 'three';
import { HeroRig } from '../art/HeroRig.js';
import { Combatant } from './Combatant.js';
import { MageAI } from './MageAI.js';
import { ATTACK_PHASES } from './StateMachine.js';
import { combatEvents } from './CombatEvents.js';

export function setupSandboxEntities({ scene, spellSystem, squadController, spawnDamageText }) {
  const combatants = [];

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
    classTags: ['melee', 'vanguard', 'mage'],
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

  squadController.registerHero(3, eolka);
  squadController.registerHero(1, han);

  const eolkaAI = new MageAI(eolka, combatants);

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
    hp: 25,
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
  squadController.registerHero(0, hurtAllyDummy);

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

  const weaponLineGeo = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0, 0, 0),
  ]);
  const weaponLineMat = new THREE.LineBasicMaterial({ color: 0x00ffff });
  const weaponLineMesh = new THREE.LineSegments(weaponLineGeo, weaponLineMat);
  wireframeGroup.add(weaponLineMesh);

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

  const extraDummies = [];
  let isStressTesting = false;

  function toggleStressTest() {
    isStressTesting = !isStressTesting;
    if (isStressTesting) {
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

  function resetAllCombatants(activeHero) {
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

  return {
    combatants,
    han,
    eolka,
    eolkaAI,
    dummy1,
    dummy2,
    dummy3,
    shamanDummy,
    hurtAllyDummy,
    clusterDummies,
    wireframeGroup,
    capsuleMeshPool,
    getCapsuleWireframe,
    weaponLineGeo,
    weaponLineMesh,
    teamDecalPool,
    getTeamDecalMesh,
    overheadBadgePool,
    getOverheadBadge,
    toggleStressTest,
    resetAllCombatants,
  };
}