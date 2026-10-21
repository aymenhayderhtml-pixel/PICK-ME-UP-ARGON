// src/dev/devSpells.js
// Spells tab controller: spell casting, caster picking, mana/cd tuning, and geometric debug drawing

import * as THREE from 'three';
import { SPELLS_TABLE } from '../combat/CombatData.js';

export class DevSpellsController {
  constructor(scene, spellSystem) {
    this.scene = scene;
    this.spellSystem = spellSystem;

    // Geometric shape debug drawing group
    this.debugGroup = new THREE.Group();
    this.debugGroup.visible = true;
    this.scene.add(this.debugGroup);

    this.setupDebugShapes();

    // Spell tuning overrides
    this.manaOverride = null;
    this.cooldownOverride = null;
    this.showShapeDebug = true;
  }

  setupDebugShapes() {
    // 1. Projectile Sphere Wireframe (Fireball / IceSpike)
    const sphereGeo = new THREE.SphereGeometry(0.45, 16, 12);
    const sphereMat = new THREE.MeshBasicMaterial({ color: 0xf97316, wireframe: true });
    this.projMesh = new THREE.Mesh(sphereGeo, sphereMat);
    this.projMesh.visible = false;
    this.debugGroup.add(this.projMesh);

    // 2. Beam Cylinder Wireframe
    const beamGeo = new THREE.CylinderGeometry(0.2, 0.2, 10.0, 12, 1, true);
    const beamMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, wireframe: true });
    this.beamMesh = new THREE.Mesh(beamGeo, beamMat);
    this.beamMesh.visible = false;
    this.debugGroup.add(this.beamMesh);

    // 3. Chain Line Segments Wireframe
    const chainGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(), new THREE.Vector3(),
      new THREE.Vector3(), new THREE.Vector3(),
      new THREE.Vector3(), new THREE.Vector3(),
    ]);
    const chainMat = new THREE.LineBasicMaterial({ color: 0xa855f7 });
    this.chainMesh = new THREE.LineSegments(chainGeo, chainMat);
    this.chainMesh.visible = false;
    this.debugGroup.add(this.chainMesh);

    // 4. Area AOE Cylinder Wireframe (Meteor / Ward / Heal)
    const areaGeo = new THREE.CylinderGeometry(4.0, 4.0, 0.8, 32, 1, true);
    const areaMat = new THREE.MeshBasicMaterial({ color: 0xef4444, wireframe: true });
    this.areaMesh = new THREE.Mesh(areaGeo, areaMat);
    this.areaMesh.visible = false;
    this.debugGroup.add(this.areaMesh);
  }

  setShapeDebugVisible(visible) {
    this.showShapeDebug = Boolean(visible);
    this.debugGroup.visible = this.showShapeDebug;
  }

  castSpell(spellId, caster, targetPos, targetEntity = null) {
    if (!caster || caster.isDead) return;

    // Apply mana / cooldown overrides if specified
    const spellData = SPELLS_TABLE[spellId];
    if (spellData) {
      if (this.manaOverride !== null) {
        caster.mana = Math.max(caster.mana, this.manaOverride);
      }
      if (this.cooldownOverride !== null) {
        caster.spellCooldowns[spellId] = 0;
      }
    }

    if (typeof caster.castSpell === 'function') {
      caster.castSpell(spellId, targetPos, targetEntity);
    }

    // Trigger visual debug geometry for this spell type
    this.highlightSpellShape(spellId, caster, targetPos);
  }

  highlightSpellShape(spellId, caster, targetPos) {
    if (!this.showShapeDebug || !caster) return;
    const tPos = targetPos && typeof targetPos.clone === 'function'
      ? targetPos.clone()
      : (targetPos && typeof targetPos.x === 'number'
        ? new THREE.Vector3(targetPos.x, targetPos.y || 0, targetPos.z || 0)
        : caster.position.clone());

    if (spellId === 'fireball') {
      this.projMesh.visible = true;
      this.projMesh.position.copy(tPos).add(new THREE.Vector3(0, 0.5, 0));
      setTimeout(() => { this.projMesh.visible = false; }, 800);
    } else if (spellId === 'iceSpike') {
      this.beamMesh.visible = true;
      const start = caster.position.clone().add(new THREE.Vector3(0, 1.2, 0));
      const end = tPos.clone().add(new THREE.Vector3(0, 1.2, 0));
      const mid = start.clone().add(end).multiplyScalar(0.5);
      const len = Math.max(0.1, start.distanceTo(end));
      this.beamMesh.position.copy(mid);
      this.beamMesh.scale.set(1, len / 10.0, 1);
      const dir = end.clone().sub(start);
      if (dir.lengthSq() > 0.0001) {
        this.beamMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
      }
      setTimeout(() => { this.beamMesh.visible = false; }, 600);
    } else if (spellId === 'lightningChain') {
      this.chainMesh.visible = true;
      const pts = [
        caster.position.clone().add(new THREE.Vector3(0, 1.2, 0)),
        tPos.clone().add(new THREE.Vector3(0, 1.0, 0)),
        tPos.clone().add(new THREE.Vector3(0, 1.0, 0)),
        tPos.clone().add(new THREE.Vector3(1.5, 1.0, -1.0)),
        tPos.clone().add(new THREE.Vector3(1.5, 1.0, -1.0)),
        tPos.clone().add(new THREE.Vector3(-1.5, 1.0, -1.0)),
      ];
      this.chainMesh.geometry.setFromPoints(pts);
      this.chainMesh.geometry.computeBoundingSphere();
      setTimeout(() => { this.chainMesh.visible = false; }, 700);
    } else if (spellId === 'meteor') {
      this.areaMesh.visible = true;
      this.areaMesh.scale.set(1, 1, 1); // 4m blast radius
      this.areaMesh.material.color.setHex(0xef4444);
      this.areaMesh.position.copy(tPos).setY(0.4);
      setTimeout(() => { this.areaMesh.visible = false; }, 1200);
    } else if (spellId === 'ward' || spellId === 'heal') {
      this.areaMesh.visible = true;
      this.areaMesh.scale.set(0.75, 1, 0.75); // 3m radius
      this.areaMesh.material.color.setHex(spellId === 'heal' ? 0x22c55e : 0x06b6d4);
      this.areaMesh.position.copy(caster.position).setY(0.4);
      setTimeout(() => { this.areaMesh.visible = false; }, 900);
    }
  }

  update(worldDt) {
    // If cooldown override is 0, keep all cooldowns reset
    if (this.cooldownOverride === 0 && this.spellSystem?.combatants) {
      for (const c of this.spellSystem.combatants) {
        if (c.spellCooldowns) {
          for (const k in c.spellCooldowns) {
            c.spellCooldowns[k] = 0;
          }
        }
      }
    }
  }
}
