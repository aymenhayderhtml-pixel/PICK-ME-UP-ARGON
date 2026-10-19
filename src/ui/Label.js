import * as THREE from 'three';

export function createLabelSprite({ text, isSign = false, color = '#d9ccff' }) {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');

  // Violet dark panel background
  ctx.fillStyle = isSign ? 'rgba(11, 8, 16, 0.75)' : 'rgba(26, 19, 38, 0.65)';
  if (ctx.roundRect) {
    ctx.beginPath();
    ctx.roundRect(4, 4, 248, 56, 10);
    ctx.fill();
    ctx.strokeStyle = isSign ? 'rgba(217, 204, 255, 0.75)' : 'rgba(180, 140, 255, 0.6)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  } else {
    ctx.fillRect(4, 4, 248, 56);
    ctx.strokeStyle = isSign ? 'rgba(217, 204, 255, 0.75)' : 'rgba(180, 140, 255, 0.6)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(4, 4, 248, 56);
  }

  // Text with uppercase condensed font
  ctx.fillStyle = color;
  ctx.font = isSign
    ? 'bold 16px "Oswald", "Bebas Neue", "Arial Narrow", monospace'
    : 'bold 13px "Oswald", "Bebas Neue", "Arial Narrow", monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text.toUpperCase(), 128, 32);

  const texture = new THREE.CanvasTexture(canvas);
  // depthTest: true so walls and geometry occlude labels
  const spriteMat = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthTest: true,
    depthWrite: false,
    opacity: 0.95,
  });

  const sprite = new THREE.Sprite(spriteMat);
  sprite.userData = {
    isSign,
    targetPx: isSign ? 20 : 16,
    maxDistance: isSign ? 30 : 14,
    fadeStart: isSign ? 24 : 11,
    aspectRatio: 256 / 64,
    baseOpacity: isSign ? 0.95 : 0.9,
  };

  return sprite;
}

export function updateLabels(camera, heroSprites, signSprites) {
  if (!camera) return;

  const vFovRad = (camera.fov * Math.PI) / 360;
  const viewportH = Math.max(window.innerHeight, 1);
  const viewportW = Math.max(window.innerWidth, 1);
  const scaleFactor = (2 * Math.tan(vFovRad)) / viewportH;

  const tempWorldPos = new THREE.Vector3();
  const tempScreenPos = new THREE.Vector3();

  // 1. Building Signs (target ~20px height, max 30 units, smooth fade 24..30)
  if (signSprites) {
    for (const sprite of signSprites) {
      if (!sprite || !sprite.parent) continue;
      sprite.getWorldPosition(tempWorldPos);
      const dist = camera.position.distanceTo(tempWorldPos);

      // Check if behind camera
      tempScreenPos.copy(tempWorldPos).project(camera);
      if (tempScreenPos.z > 1.0 || dist > 30) {
        sprite.visible = false;
        continue;
      }

      // Smooth fade 24..30
      const fade = dist <= 24 ? 1.0 : Math.max(0, (30 - dist) / 6);
      if (fade <= 0.01) {
        sprite.visible = false;
        continue;
      }

      // Fixed on-screen height ~20px
      const hWorld = dist * 20 * scaleFactor;
      const wWorld = hWorld * (sprite.userData.aspectRatio || 4.0);
      sprite.scale.set(wWorld, hWorld, 1);
      sprite.material.opacity = (sprite.userData.baseOpacity || 0.95) * fade;
      sprite.visible = true;
    }
  }

  // 2. Hero Labels (target ~16px height, max 14 units, smooth fade 11..14, prevent <40px screen overlap)
  if (heroSprites && heroSprites.length > 0) {
    const visibleCandidates = [];

    for (const sprite of heroSprites) {
      if (!sprite || !sprite.parent) continue;
      // If parent hero mesh is hidden (e.g. training or inside dorm), hide label
      if (sprite.parent.visible === false) {
        sprite.visible = false;
        continue;
      }

      sprite.getWorldPosition(tempWorldPos);
      const dist = camera.position.distanceTo(tempWorldPos);

      tempScreenPos.copy(tempWorldPos).project(camera);
      if (tempScreenPos.z > 1.0 || dist > 14) {
        sprite.visible = false;
        continue;
      }

      const fade = dist <= 11 ? 1.0 : Math.max(0, (14 - dist) / 3);
      if (fade <= 0.01) {
        sprite.visible = false;
        continue;
      }

      const screenX = (tempScreenPos.x + 1) * 0.5 * viewportW;
      const screenY = (1 - tempScreenPos.y) * 0.5 * viewportH;

      visibleCandidates.push({
        sprite,
        dist,
        fade,
        screenX,
        screenY,
      });
    }

    // Sort by distance ascending (closest first)
    visibleCandidates.sort((a, b) => a.dist - b.dist);

    const acceptedScreenPositions = [];

    for (const cand of visibleCandidates) {
      // Check 40px overlap with already accepted closer labels
      let overlap = false;
      for (const acc of acceptedScreenPositions) {
        const dx = cand.screenX - acc.x;
        const dy = cand.screenY - acc.y;
        if (Math.hypot(dx, dy) < 40) {
          overlap = true;
          break;
        }
      }

      if (overlap) {
        // Hide the farther label
        cand.sprite.visible = false;
      } else {
        acceptedScreenPositions.push({ x: cand.screenX, y: cand.screenY });
        // Fixed on-screen height ~16px
        const hWorld = cand.dist * 16 * scaleFactor;
        const wWorld = hWorld * (cand.sprite.userData.aspectRatio || 4.0);
        cand.sprite.scale.set(wWorld, hWorld, 1);
        cand.sprite.material.opacity = (cand.sprite.userData.baseOpacity || 0.9) * cand.fade;
        cand.sprite.visible = true;
      }
    }
  }
}
