import * as THREE from 'three';
import { Enemy } from './Enemy.js';
import { resetWolfPackState } from './WolfAI.js';
import { showSystemMessage } from '../ui/Hud.js';
import { gameState } from '../core/GameState.js';
import { ITEM_TEMPLATES } from './Items.js';

export class EnemyManager {
  constructor(dropsManager, itemsManager = null) {
    this.dropsManager = dropsManager;
    this.itemsManager = itemsManager;
    this.enemies = [];
    this.clearingWaves = []; // { clearingIdx, enemies: [], barrierMesh, isTriggered, isCleared }
    this.scavengeItems = []; // { mesh, item }
    this.boss = null;
    this.bossDefeated = false;
    this.floorNumber = 1;
    this.dungeon = null;
    this.scene = null;
  }

  spawnHuntingGround(scene, dungeon, difficulty = 1) {
    this.clear(scene);
    this.scene = scene;
    this.dungeon = dungeon;
    this.floorNumber = difficulty;

    if (!dungeon) return;

    // 12 enemies (Goblin Grunts/Archers Lv D+1 to D+3, no boss)
    const count = 12;
    const clearings = dungeon.clearings || [];
    for (let i = 0; i < count; i++) {
      const isArcher = i % 3 === 2; // 8 grunts, 4 archers
      const type = isArcher ? 'ARCHER' : 'GRUNT';
      const lvl = difficulty + 1 + Math.floor(Math.random() * 3); // D+1 to D+3

      let x = 0, z = -25 - i * 8;
      if (clearings.length > 0) {
        const cl = clearings[i % clearings.length];
        const ang = (i / count) * Math.PI * 2;
        const rad = 2 + Math.random() * (cl.radius * 0.4);
        x = cl.center.x + Math.cos(ang) * rad;
        z = cl.center.z + Math.sin(ang) * rad;
      }
      const enemy = new Enemy(x, z, type, false, difficulty, lvl);
      this.enemies.push(enemy);
      scene.add(enemy.mesh);
    }
  }

  spawnMine(scene, caveFloor, difficulty = 1) {
    this.clear(scene);
    this.scene = scene;
    this.dungeon = caveFloor;
    this.floorNumber = difficulty;

    if (!caveFloor || !caveFloor.rooms) return;

    // Monsters: Crystal Slime and Rock Crawler (8-12 enemies Lv D+1)
    const enemyCount = Math.floor(Math.random() * 5) + 8; // 8 to 12
    const rooms = caveFloor.rooms.slice(1); // Exclude spawn room
    const lvl = difficulty + 1;

    for (let i = 0; i < enemyCount; i++) {
      const room = rooms[i % rooms.length];
      const isSlime = i % 2 === 0;
      const typeKey = isSlime ? 'CRYSTAL_SLIME' : 'ROCK_CRAWLER';
      const rx = (room.x + 1 + Math.random() * (room.w - 2)) * caveFloor.cellSize;
      const rz = (room.y + 1 + Math.random() * (room.h - 2)) * caveFloor.cellSize;

      const enemy = new Enemy(rx, rz, typeKey, false, difficulty, lvl);
      if (isSlime) {
        enemy.onSplit = (pos) => {
          for (let s = 0; s < 2; s++) {
            const ox = (Math.random() - 0.5) * 1.2;
            const oz = (Math.random() - 0.5) * 1.2;
            const mini = new Enemy(pos.x + ox, pos.z + oz, 'MINI_SLIME', false, difficulty, lvl);
            this.enemies.push(mini);
            scene.add(mini.mesh);
          }
        };
      }
      this.enemies.push(enemy);
      scene.add(enemy.mesh);
    }
  }

  spawn(scene, dungeon, floorNumber = 1) {
    this.clear(scene);
    this.scene = scene;
    this.dungeon = dungeon;
    this.floorNumber = floorNumber;

    if (!dungeon || !dungeon.clearings) return;

    // Floor 5: Survival mode trickle spawns
    if (floorNumber === 5) {
      this.survivalActive = true;
      this.survivalTimer = 120;
      this.survivalSpawnCooldown = 0;
      this.survivalAmbushTriggered = false;
      return;
    }

    // Floor 1 Greek Countryside: exactly 10 Goblin Grunts Lv.3 across 3 groups + ambushes
    if (floorNumber === 1) {
      const isRepeat = (gameState.clearedFloors || 0) >= 1;
      const farmGrunts = [
        // Group 1 (3 grunts, z around -28 to -35, beyond choke point 1)
        { x: 0, z: -32, ambush: false },
        { x: -8, z: -30, ambush: true },
        { x: 7, z: -34, ambush: true },
        // Group 2 (3 grunts, z around -68 to -75, beyond choke point 2)
        { x: -2, z: -70, ambush: false },
        { x: -11, z: -74, ambush: true },
        { x: 10, z: -72, ambush: true },
        // Group 3 (4 grunts, z around -108 to -115, around farmhouse and well)
        { x: -6, z: -112, ambush: false },
        { x: 0, z: -110, ambush: false },
        { x: 6, z: -112, ambush: false },
        { x: 3, z: -115, ambush: false },
      ];

      for (const g of farmGrunts) {
        const enemy = new Enemy(g.x, g.z, 'GRUNT', false, 1, 3);
        if (g.ambush) {
          enemy.state = 'ambushWait';
          enemy.pathDirection = new THREE.Vector3(0, 0, -1);
        }
        this.enemies.push(enemy);
        scene.add(enemy.mesh);
      }

      // Floor 1 repeat runs: spawn 3 Goblin Hound beasts (WolfAI pack behavior).
      if (isRepeat) {
        resetWolfPackState();
        const houndSpawns = [
          { x: -6, z: -40 },
          { x: 0, z: -44 },
          { x: 6, z: -40 },
        ];
        for (const h of houndSpawns) {
          const hound = new Enemy(h.x, h.z, 'GOBLIN_HOUND', false, 1, 3);
          hound.state = 'ambushWait';
          hound.pathDirection = new THREE.Vector3(0, 0, -1);
          this.enemies.push(hound);
          scene.add(hound.mesh);
        }
      }
      return;
    }

    // Floor 2 Prairie: 3 clearings, Prairie Wolves (Lv 4) + Goblins (Lv 3)
    // Clearing 1: 2 wolves + 3 goblin grunts
    // Clearing 2: 3 wolves + 3 goblins + 1 goblin archer (lv 3)
    // Clearing 3: 3 wolves + 4 goblins + 1 goblin shaman
    // Ambush: wolves wait in the ambush spots in tall grass.
    // Mission goal: kill all of them (no barrier sealing, same as floor 1).
    if (floorNumber === 2) {
      resetWolfPackState();
      const isRepeat = (gameState.clearedFloors || 0) >= 2;
      const prairieEnemies = [
        // Clearing 1 (z ~ -35): 2 wolves in ambush spots + 3 goblin grunts
        { x: -12, z: -28, type: 'PRAIRIE_WOLF', level: 4, ambush: true },
        { x: 11, z: -28, type: 'PRAIRIE_WOLF', level: 4, ambush: true },
        { x: -3, z: -34, type: 'GRUNT', level: 3, ambush: false },
        { x: 3, z: -34, type: 'GRUNT', level: 3, ambush: false },
        { x: 0, z: -38, type: 'GRUNT', level: 3, ambush: false },

        // Clearing 2 (z ~ -75): 3 wolves in ambush spots + 3 goblins + 1 archer
        { x: -13, z: -50, type: 'PRAIRIE_WOLF', level: 4, ambush: true },
        { x: -12, z: -70, type: 'PRAIRIE_WOLF', level: 4, ambush: true },
        { x: 14, z: -72, type: 'PRAIRIE_WOLF', level: 4, ambush: true },
        { x: -4, z: -74, type: 'GRUNT', level: 3, ambush: false },
        { x: 4, z: -74, type: 'GRUNT', level: 3, ambush: false },
        { x: 0, z: -78, type: 'GRUNT', level: 3, ambush: false },
        { x: 2, z: -83, type: 'ARCHER', level: 3, ambush: false },

        // Clearing 3 (z ~ -112): 3 wolves in ambush spots + 4 goblins + 1 shaman
        { x: -11, z: -90, type: 'PRAIRIE_WOLF', level: 4, ambush: true },
        { x: -9, z: -106, type: 'PRAIRIE_WOLF', level: 4, ambush: true },
        { x: 10, z: -106, type: 'PRAIRIE_WOLF', level: 4, ambush: true },
        { x: -5, z: -110, type: 'GRUNT', level: 3, ambush: false },
        { x: 5, z: -110, type: 'GRUNT', level: 3, ambush: false },
        { x: -2, z: -115, type: 'GRUNT', level: 3, ambush: false },
        { x: 3, z: -115, type: 'GRUNT', level: 3, ambush: false },
        { x: 0, z: -118, type: 'SHAMAN', level: 3, ambush: false },
      ];

      let wolfIdx = 0;
      for (const e of prairieEnemies) {
        let type = e.type;
        if (isRepeat && type === 'PRAIRIE_WOLF') {
          // Include BLACK_WOLF variants in the wolf pack spawns on repeat runs.
          if (wolfIdx % 2 === 0) type = 'BLACK_WOLF';
          wolfIdx++;
        } else if (type === 'PRAIRIE_WOLF') {
          wolfIdx++;
        }
        const enemy = new Enemy(e.x, e.z, type, false, 2, e.level);
        if (e.ambush) {
          enemy.state = 'ambushWait';
          enemy.pathDirection = new THREE.Vector3(0, 0, -1);
        }
        this.enemies.push(enemy);
        scene.add(enemy.mesh);
      }
      return;
    }

    // Floor 3 Bright Forest Clearing: 4 Armored Goblins (Lv. 4) on first run, 2 on repeat run
    if (floorNumber === 3) {
      const isRepeat = (gameState.clearedFloors || 0) >= 3;
      const f3Spawns = isRepeat
        ? [
            { x: -2, z: -34 },
            { x: 2, z: -34 },
          ]
        : [
            { x: -3, z: -32 },
            { x: 3, z: -32 },
            { x: -1, z: -36 },
            { x: 2, z: -36 },
          ];

      for (const pos of f3Spawns) {
        const enemy = new Enemy(pos.x, pos.z, 'ARMORED_GOBLIN', false, 3, 4);
        this.enemies.push(enemy);
        scene.add(enemy.mesh);
      }
      return;
    }

    // Floor 4 Conquest: Harpies + Armored Goblins
    if (floorNumber === 4) {
      const spawns = [
        { x: -8, z: -30, type: 'HARPY', level: 4 },
        { x: 8, z: -30, type: 'HARPY', level: 4 },
        { x: 0, z: -45, type: 'HARPY', level: 5 },
        { x: -4, z: -34, type: 'ARMORED_GOBLIN', level: 4 },
        { x: 4, z: -34, type: 'ARMORED_GOBLIN', level: 4 },
        { x: -2, z: -40, type: 'ARMORED_GOBLIN', level: 4 },
        { x: 2, z: -40, type: 'ARMORED_GOBLIN', level: 4 },
      ];
      for (const s of spawns) {
        const enemy = new Enemy(s.x, s.z, s.type, false, 4, s.level);
        this.enemies.push(enemy);
        scene.add(enemy.mesh);
      }
      return;
    }

    // Floor 6 Explore Mode: Goblin Scouts x3
    if (floorNumber === 6) {
      const scoutSpawns = [
        { x: -6, z: -30 },
        { x: 0, z: -34 },
        { x: 6, z: -30 },
      ];
      for (const s of scoutSpawns) {
        const enemy = new Enemy(s.x, s.z, 'GOBLIN_SCOUT', false, 6, 8);
        this.enemies.push(enemy);
        scene.add(enemy.mesh);
      }
      this.floor6AmbushTriggered = false;
      return;
    }

    // Daily Dungeons
    const dungeonType = String((gameState && gameState.activeDungeonType) || '').toLowerCase();
    if (dungeonType.includes('kendert') || dungeonType.includes('forest') || dungeonType === 'daily_forest') {
      const beasts = [
        { x: -4, z: -30, type: 'PRAIRIE_WOLF', level: 5 },
        { x: 4, z: -30, type: 'PRAIRIE_WOLF', level: 5 },
        { x: -2, z: -36, type: 'GOBLIN_HOUND', level: 5 },
        { x: 2, z: -36, type: 'GOBLIN_HOUND', level: 5 },
      ];
      for (const b of beasts) {
        const e = new Enemy(b.x, b.z, b.type, false, 1, b.level);
        this.enemies.push(e);
        scene.add(e.mesh);
      }
      const queen = new Enemy(0, -45, 'QUEEN_OF_THE_FOREST', true, 1, 8);
      this.enemies.push(queen);
      scene.add(queen.mesh);
      this.dailyDungeonType = 'forest';
      return;
    }
    if (dungeonType.includes('sinmiel') || dungeonType.includes('plateau') || dungeonType === 'daily_plateau') {
      for (let i = 0; i < 3; i++) {
        const w = new Enemy((i - 1) * 6, -32 - i * 4, 'LIGHTNING_WOLF', false, 1, 6);
        this.enemies.push(w);
        scene.add(w.mesh);
      }
      this.dailyDungeonType = 'plateau';
      return;
    }

    const clearings = dungeon.clearings;
    const extraGrunts = Math.max(0, floorNumber - 1); // +1 grunt per clearing for each floor above 1

    // Wave setup per clearing:
    // Clearing 1: 3 grunts, 1 archer
    // Clearing 2: 4 grunts, 2 archers (2 grunts in ambush spots)
    // Clearing 3: 4 grunts, 1 archer, 1 shaman, 1 leader on floors 2 to 4
    // Clearing 4: 5 grunts, 2 archers, 1 shaman, 1 leader on floors 2 to 4
    const waveConfigs = [
      { grunts: 3 + extraGrunts, archers: 1, shamans: 0, hasLeader: false, ambushes: 0 },
      { grunts: 4 + extraGrunts, archers: 2, shamans: 0, hasLeader: false, ambushes: 2 },
      { grunts: 4 + extraGrunts, archers: 1, shamans: 1, hasLeader: floorNumber >= 2, ambushes: 0 },
      { grunts: 5 + extraGrunts, archers: 2, shamans: 1, hasLeader: floorNumber >= 2, ambushes: 0 },
    ];

    for (let c = 0; c < Math.min(clearings.length, waveConfigs.length); c++) {
      const cl = clearings[c];
      const cfg = waveConfigs[c];
      const clearingEnemyList = [];

      // 1. Spawning Grunts
      for (let g = 0; g < cfg.grunts; g++) {
        let spawnPos;
        let isAmbush = false;

        // Check if this grunt is placed in an ambush spot
        if (g < cfg.ambushes && dungeon.ambushSpots && dungeon.ambushSpots.length > 0) {
          spawnPos = dungeon.ambushSpots[g % dungeon.ambushSpots.length];
          isAmbush = true;
        } else {
          const ang = (g / cfg.grunts) * Math.PI * 2 + Math.random() * 0.5;
          const rad = 2.0 + Math.random() * (cl.radius * 0.5);
          spawnPos = new THREE.Vector3(
            cl.center.x + Math.cos(ang) * rad,
            0,
            cl.center.z + Math.sin(ang) * rad
          );
        }

        const enemy = new Enemy(spawnPos.x, spawnPos.z, 'GRUNT', false, floorNumber);
        if (isAmbush) {
          enemy.state = 'ambushWait';
          // Path direction vector pointing forward (-Z)
          enemy.pathDirection = new THREE.Vector3(0, 0, -1);
        }
        clearingEnemyList.push(enemy);
        this.enemies.push(enemy);
        scene.add(enemy.mesh);
      }

      // 2. Spawning Archers
      for (let a = 0; a < cfg.archers; a++) {
        const ang = (a / cfg.archers) * Math.PI + Math.PI / 4;
        const rad = cl.radius * 0.65;
        const ax = cl.center.x + Math.cos(ang) * rad;
        const az = cl.center.z + Math.sin(ang) * rad;
        const archer = new Enemy(ax, az, 'ARCHER', false, floorNumber);
        clearingEnemyList.push(archer);
        this.enemies.push(archer);
        scene.add(archer.mesh);
      }

      // 3. Spawning Shamans
      for (let s = 0; s < cfg.shamans; s++) {
        const sx = cl.center.x + (Math.random() - 0.5) * 4.0;
        const sz = cl.center.z - cl.radius * 0.4;
        const shaman = new Enemy(sx, sz, 'SHAMAN', false, floorNumber);
        clearingEnemyList.push(shaman);
        this.enemies.push(shaman);
        scene.add(shaman.mesh);
      }

      // 4. Spawning Leader
      if (cfg.hasLeader) {
        const lx = cl.center.x;
        const lz = cl.center.z - 3.0;
        const leader = new Enemy(lx, lz, 'LEADER', true, floorNumber);
        clearingEnemyList.push(leader);
        this.enemies.push(leader);
        scene.add(leader.mesh);
      }

      // 5. Clearing barrier mesh across entrance
      const barrierMat = new THREE.MeshStandardMaterial({
        color: 0x0088ff,
        emissive: 0x0055cc,
        emissiveIntensity: 1.2,
        transparent: true,
        opacity: 0.0,
        depthWrite: false,
      });
      const barrierMesh = new THREE.Mesh(new THREE.BoxGeometry(9.0, 4.0, 0.4), barrierMat);
      // Place near southern edge of clearing entrance
      barrierMesh.position.set(cl.center.x, 2.0, cl.center.z + cl.radius - 0.5);
      barrierMesh.visible = false;
      scene.add(barrierMesh);

      this.clearingWaves.push({
        clearingIdx: c,
        clearing: cl,
        enemies: clearingEnemyList,
        barrierMesh,
        isTriggered: false,
        isCleared: false,
      });
    }
  }

  update(delta, player, dungeon, scene, camera, projectilesManager, partyAllies = []) {
    if (!player) return;

    // Floor 5 survival trickle spawns
    if (this.survivalActive) {
      this.survivalTimer -= delta;
      if (this.survivalTimer <= 0) {
        this.survivalFinished = true;
        this.survivalActive = false;
      }
      this.survivalSpawnCooldown -= delta;
      const activeCount = this.enemies.filter((e) => !e.dead).length;
      if (this.survivalSpawnCooldown <= 0 && activeCount < 14) {
        this.survivalSpawnCooldown = 1.5;
        const lvl = 3 + Math.floor(Math.random() * 3);
        const e = new Enemy((Math.random() - 0.5) * 12, -30 - Math.random() * 10, 'GRUNT', false, 5, lvl);
        this.enemies.push(e);
        if (scene) scene.add(e.mesh);
      }
    }

    // Floor 6: scout horn triggers ambush
    if (this.floorNumber === 6 && !this.floor6AmbushTriggered) {
      const finishedScout = (this.enemies || []).find((e) => e.typeKey === 'GOBLIN_SCOUT' && e.hornFinished);
      if (finishedScout) {
        this.floor6AmbushTriggered = true;
        for (let i = 0; i < 12; i++) {
          const g = new Enemy((Math.random() - 0.5) * 16, -28 - Math.random() * 12, 'GRUNT', false, 6, 4);
          this.enemies.push(g);
          if (scene) scene.add(g.mesh);
        }
      }
    }
    const pPos = player.mesh.position;

    // Check party talents & stealth skill
    const hasKeenSight = gameState.heroes.some(
      (h) => h.alive && (h.talents || []).some((t) => t.toLowerCase().includes('keen_sight'))
    );
    const han = gameState.heroes.find((h) => h.id === 'hero_han');
    const stealthSkill = han ? (han.skills || []).find((s) => s.id === 'stealth') : null;
    const stealthLevel = stealthSkill ? stealthSkill.level : 0;

    // Check if player is in a choke point
    let isPlayerInChokePoint = false;
    if (dungeon && dungeon.chokePoints) {
      for (const cp of dungeon.chokePoints) {
        if (Math.hypot(pPos.x - cp.position.x, pPos.z - cp.position.z) < 2.5) {
          isPlayerInChokePoint = true;
          break;
        }
      }
    }

    // 1. Check clearing triggers & blue barrier sealing
    for (const wave of this.clearingWaves) {
      if (!wave.isTriggered && !wave.isCleared) {
        const dist = Math.hypot(pPos.x - wave.clearing.center.x, pPos.z - wave.clearing.center.z);
        if (dist <= wave.clearing.triggerRadius) {
          // Trigger clearing wave!
          wave.isTriggered = true;
          wave.barrierMesh.visible = true;
          wave.barrierMesh.material.opacity = 0.55;

          // Aggro all non-ambush enemies in clearing
          for (const enemy of wave.enemies) {
            if (enemy.state !== 'ambushWait' && !enemy.dead) {
              enemy.isAggroed = true;
              enemy.state = 'chase';
            }
          }
        }
      }

      // Check if wave is cleared
      if (wave.isTriggered && !wave.isCleared) {
        const aliveCount = wave.enemies.filter((e) => !e.dead).length;
        if (aliveCount === 0) {
          wave.isCleared = true;
          wave.barrierMesh.visible = false;
          showSystemMessage('[Clearing secured! Path barrier unlocked]');
        }
      }
    }

    // 2. Token Allocation for Grunt Swarm Tactics (max 2 attacking at once)
    const activeGrunts = this.enemies.filter(
      (e) => !e.dead && e.typeKey === 'GRUNT' && (e.state === 'chase' || e.state === 'flank' || e.state === 'windup' || e.state === 'attack')
    );
    activeGrunts.sort((a, b) => a.mesh.position.distanceTo(pPos) - b.mesh.position.distanceTo(pPos));

    let assignedTokens = 0;
    for (let i = 0; i < activeGrunts.length; i++) {
      const g = activeGrunts[i];
      if (assignedTokens < 2) {
        g.hasAttackToken = true;
        assignedTokens++;
      } else {
        g.hasAttackToken = false;
      }
    }

    // 3. Separation Steering between enemies
    for (let i = 0; i < this.enemies.length; i++) {
      if (this.enemies[i].pushApart) {
        this.enemies[i].pushApart(this.enemies, delta);
      }
    }

    // 4. Update each enemy
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i];

      if (enemy.isBoss) {
        // LEADER enemies are bosses too and their rally aura iterates
        // `allies`, so the enemy list has to be passed in here as well.
        enemy.update(delta, player, dungeon, camera, projectilesManager, this.enemies);
        if (enemy.dead && enemy.stateTimer <= 0) {
          if (scene) scene.remove(enemy.mesh);
          enemy.dispose();
          this.enemies.splice(i, 1);
        }
        continue;
      }

      const distToPlayer = enemy.mesh.position.distanceTo(pPos);

      // Performance: Update far enemies (> 25 units) at half rate
      if (distToPlayer > 25.0) {
        enemy.frameSkip = (enemy.frameSkip || 0) + 1;
        if (enemy.frameSkip % 2 !== 0) continue;
      }

      // Build context for this enemy
      let surroundAngle = null;
      if (enemy.typeKey === 'GRUNT') {
        const gIdx = activeGrunts.indexOf(enemy);
        if (gIdx !== -1) {
          surroundAngle = (gIdx / Math.max(1, activeGrunts.length)) * Math.PI * 2;
        }
      }

      const context = {
        hasKeenSight,
        stealthLevel,
        isPlayerInChokePoint,
        activeAttackingCount: assignedTokens,
        totalTargetingGrunts: activeGrunts.length,
        surroundAngle,
        partyAllies,
      };

      const wasDeadBeforeUpdate = enemy.dead;

      enemy.update(delta, player, dungeon, camera, projectilesManager, this.enemies, context);

      // Harpy dive-bomb: chance to inflict Fear on nearby allies
      if (enemy.typeKey === 'HARPY' && !enemy.dead) {
        enemy.fearCooldown = Math.max(0, (enemy.fearCooldown || 0) - delta);
        if (enemy.fearCooldown <= 0 && (enemy.state === 'attack' || enemy.state === 'pounce')) {
          enemy.fearCooldown = 4.0;
          for (const ally of partyAllies || []) {
            if (!ally || ally.dead || ally.isAfraid) continue;
            const hasComposureSkill = (ally.hero && Array.isArray(ally.hero.skills))
              ? ally.hero.skills.some((s) => String(typeof s === 'string' ? s : (s.id || s.name || '')).toLowerCase().replace(/\s+/g, '_') === 'composure')
              : false;
            if (hasComposureSkill) continue;
            const dist = enemy.mesh.position.distanceTo(ally.mesh.position);
            if (dist <= (enemy.attackRange || 2.0) + 1.5 && Math.random() < 0.5) {
              const starStr = '★'.repeat(Math.max(1, Math.min(7, (ally.hero && ally.hero.star) || 1)));
              ally.isAfraid = true;
              ally.fearTimer = 20.0;
              ally.fearThreat = enemy;
              if (((ally.hero && ally.hero.star) || 1) === 1 && (ally.effectiveComposure || 0) < 35) {
                ally.isFleeing = true;
              }
              showSystemMessage(`[${ally.hero.name} (${starStr}) FEELS FEAR! ALL STATS ARE DECREASED BY 30%.]`);
            }
          }
        }
      }

      // Check if enemy just died this frame
      if (!wasDeadBeforeUpdate && enemy.dead) {
        this.onEnemyDeath(enemy, scene);
      }

      // Corpse removal after 6 seconds
      if (enemy.isCorpseCleaned) {
        if (scene) scene.remove(enemy.mesh);
        enemy.dispose();
        this.enemies.splice(i, 1);
      }
    }

    // 5. Update Scavenge Items
    for (const sc of this.scavengeItems) {
      sc.mesh.rotation.y += delta * 1.5;
      if (pPos.distanceTo(sc.mesh.position) <= 1.5) {
        console.log(`[Scavenge nearby: ${sc.item.type} (Durability: ${sc.item.durability})]`);
      }
    }
  }

  onEnemyDeath(enemy, scene) {
    // 1. Leader Death: Morale Shock
    if (enemy.typeKey === 'LEADER') {
      showSystemMessage('[The goblins break ranks!]');
      for (const other of this.enemies) {
        if (other !== enemy && !other.dead && other.mesh.position.distanceTo(enemy.mesh.position) <= 15.0) {
          other.morale = Math.max(0, other.morale - 25);
          other.enterHesitate(2.0); // 2 seconds hesitate
        }
      }
    } else {
      // Adjacent goblins (< 6 units) lose 8 morale
      for (const other of this.enemies) {
        if (other !== enemy && !other.dead && other.mesh.position.distanceTo(enemy.mesh.position) <= 6.0) {
          other.morale = Math.max(0, other.morale - 8);
          if (other.morale < 30 && other.state !== 'hesitate' && other.state !== 'flee') {
            other.enterHesitate(1.5);
          }
        }
      }
    }

    // 2. Scavenging Drop
    if (this.itemsManager && scene) {
      let candidate = null;
      const r = Math.random();
      if (enemy.typeKey === 'ARCHER') {
        if (r < 0.25) candidate = ITEM_TEMPLATES.RUSTY_DAGGER;
      } else if (enemy.typeKey === 'SHAMAN') {
        if (r < 0.3) candidate = ITEM_TEMPLATES.CRUDE_SHIELD;
      } else if (enemy.typeKey === 'LEADER') {
        if (r < 0.5) {
          const choice = [ITEM_TEMPLATES.CLUB, ITEM_TEMPLATES.RUSTY_SWORD, ITEM_TEMPLATES.CRUDE_SHIELD];
          candidate = choice[Math.floor(Math.random() * choice.length)];
        }
      } else {
        // Grunt
        if (r < 0.3) {
          const choice = [ITEM_TEMPLATES.CLUB, ITEM_TEMPLATES.RUSTY_DAGGER, ITEM_TEMPLATES.RUSTY_SWORD];
          candidate = choice[Math.floor(Math.random() * choice.length)];
        }
      }

      if (candidate) {
        const duraPct = 0.4 + Math.random() * 0.55;
        const remainingDura = Math.max(5, Math.floor(candidate.maxDurability * duraPct));
        this.itemsManager.spawnItem(scene, enemy.mesh.position.x, enemy.mesh.position.z, {
          ...candidate,
          durability: remainingDura,
        });
      }
    }

    // 3. Material Drops (Goblin Hide 40%, Crude Iron 25%, Goblin Tooth 20%)
    if (this.dropsManager && scene) {
      if (Math.random() < 0.40) {
        this.dropsManager.spawnMaterialDrop(scene, enemy.mesh.position.x, enemy.mesh.position.z, 'goblin_hide', 1);
      }
      if (Math.random() < 0.25) {
        this.dropsManager.spawnMaterialDrop(
          scene,
          enemy.mesh.position.x + (Math.random() - 0.5) * 0.6,
          enemy.mesh.position.z + (Math.random() - 0.5) * 0.6,
          'crude_iron',
          1
        );
      }
      if (Math.random() < 0.20) {
        this.dropsManager.spawnMaterialDrop(
          scene,
          enemy.mesh.position.x + (Math.random() - 0.5) * 0.6,
          enemy.mesh.position.z + (Math.random() - 0.5) * 0.6,
          'goblin_tooth',
          1
        );
      }

      // 4. Regular Drops (health, stamina)
      if (Math.random() < 0.25) {
        const dropKey = Math.random() < 0.5 ? 'HEALTH' : 'STAMINA';
        this.dropsManager.spawnDrop(scene, enemy.mesh.position.x, enemy.mesh.position.z, dropKey);
      }
    }
  }

  createScavengeMesh(weaponType) {
    const group = new THREE.Group();

    // Glowing yellow ring on ground
    const ringMat = new THREE.MeshBasicMaterial({ color: 0xffd700, wireframe: true });
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.3, 0.45, 12), ringMat);
    ring.rotation.x = -Math.PI / 2;
    group.add(ring);

    // Weapon item primitive
    const itemMat = new THREE.MeshStandardMaterial({ color: 0xcc9933, metalness: 0.6 });
    let itemObj;
    if (weaponType === 'bow') {
      itemObj = new THREE.Mesh(new THREE.TorusGeometry(0.25, 0.03, 6, 12, Math.PI), itemMat);
    } else if (weaponType === 'dagger') {
      itemObj = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.35, 0.03), itemMat);
    } else {
      itemObj = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.1, 0.55, 6), itemMat);
    }
    itemObj.position.y = 0.25;
    group.add(itemObj);

    return group;
  }

  killAllEnemies(scene) {
    for (const enemy of this.enemies) {
      if (!enemy.dead) {
        enemy.takeDamage(9999);
      }
    }
    showSystemMessage('[DEBUG: All enemies killed!]');
  }

  spawnLeader(scene, position, floorNumber = 1) {
    const leader = new Enemy(position.x, position.z, 'LEADER', true, floorNumber);
    leader.isAggroed = true;
    leader.state = 'chase';
    this.enemies.push(leader);
    if (scene) scene.add(leader.mesh);
    showSystemMessage('[DEBUG: Goblin Leader spawned!]');
  }

  dissolveAllEnemies(scene) {
    for (const enemy of this.enemies) {
      if (scene) scene.remove(enemy.mesh);
      if (enemy.dispose) enemy.dispose();
    }
    this.enemies = [];
  }

  clear(scene) {
    resetWolfPackState();
    for (const enemy of this.enemies) {
      if (scene) scene.remove(enemy.mesh);
      enemy.dispose();
    }
    for (const sc of this.scavengeItems) {
      if (scene) scene.remove(sc.mesh);
    }
    for (const wave of this.clearingWaves) {
      if (scene && wave.barrierMesh) {
        scene.remove(wave.barrierMesh);
        wave.barrierMesh.geometry.dispose();
        wave.barrierMesh.material.dispose();
      }
    }
    this.enemies = [];
    this.scavengeItems = [];
    this.clearingWaves = [];
    this.boss = null;
    this.bossDefeated = false;
  }
}
