import assert from 'node:assert/strict';
import * as THREE from 'three';
import { gameState } from '../src/core/GameState.js';
import { Player } from '../src/player/Player.js';
import { Ally } from '../src/combat/Ally.js';
import { Enemy } from '../src/combat/Enemy.js';
import { EnemyManager } from '../src/combat/EnemyManager.js';
import { buildFloor5Town } from '../src/world/Floor5TownBuilder.js';

const scene = new THREE.Scene();
gameState.setPlayerClass('Vanguard');
const player = new Player(scene);
const floor = buildFloor5Town({ floorNumber: 5, scene });
player.mesh.position.copy(floor.startPosition);
player.mesh.position.y = 0;

const input = {
  isDown: (k) => k === 'KeyW',
  isActionDown: () => false,
  isRmbDown: () => false,
  isLmbDown: () => false,
  consumeMouseDelta: () => ({ x: 0, y: 0 }),
};

const startZ = player.mesh.position.z;
const startX = player.mesh.position.x;
for (let i = 0; i < 10; i++) {
  player.update(0.05, input, 0, floor, null, [], () => {});
}
const moved = Math.abs(player.mesh.position.z - startZ) > 0.1 || Math.abs(player.mesh.position.x - startX) > 0.1;
assert.ok(moved, `player did not move: dz=${player.mesh.position.z - startZ}, dx=${player.mesh.position.x - startX}`);
console.log('[PASS] player moves on Floor 5 with KeyW');
// Ally smoke: instantiate and tick toward an enemy
const allyHero = { id: 'nov1', name: 'Novice', class: 'Vanguard', weapon: 'sword+shield', star: 1, level: 1, stats: { str: 6, agi: 5, vit: 6, int: 4, wil: 4 }, skills: [] };
const ally = new Ally(scene, allyHero, true, 0);
ally.mesh.position.set(0, 0, 0);
const en = new Enemy(0, -5, 'GRUNT', false, 5, 1);
scene.add(en.mesh);
const beforeAllyZ = ally.mesh.position.z;
ally.update(0.05, player, [en], floor, null, null, null, 0);
// ally may or may not move depending on AI; just ensure no crash and mesh finite
assert.ok(Number.isFinite(ally.mesh.position.x) && Number.isFinite(ally.mesh.position.z), 'ally position NaN');
console.log('[PASS] ally ticks without crash on Floor 5');
// Collision check: central street walkable, no colliders near spawn
assert.ok(floor.isWalkable(0, 0), 'spawn (0,0) must be walkable');
assert.ok(floor.colliders.filter(c => Math.hypot(c.x, c.z) < 6).length === 0, 'no colliders near spawn');
// goblin spawn + aggro check via EnemyManager
const em = new EnemyManager(null, null);
const fakeScene = new THREE.Scene();
em.spawn(fakeScene, floor, 5);
// tick update to spawn
for (let i = 0; i < 5; i++) em.update(1, player, floor, fakeScene, null, null, []);
const gobs = em.enemies.filter(e => !e.dead);
assert.ok(gobs.length > 0, 'goblins spawned');
for (const g of gobs) {
  assert.ok(g.isAggroed === true, 'goblin must be aggroed');
  assert.ok(g.state === 'chase', 'goblin must be chasing');
  assert.ok(g.detectionRange > 100, 'goblin detection range must be high');
}
console.log('[PASS] floor 5 goblins aggroed and advancing');
console.log('OK: floor 5 movement test passed');