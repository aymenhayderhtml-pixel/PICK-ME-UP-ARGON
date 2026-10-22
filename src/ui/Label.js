import * as THREE from 'three';

const LABEL_FONT = '"Oswald", "Bebas Neue", "Arial Narrow", Arial, sans-serif';

// Draws `text` centred in the canvas. The font shrinks until the string fits
// the padded width, so a long name is never clipped by the canvas edge.
function drawFittedText(ctx, text, canvasW, canvasH, startSize, minSize, padding) {
  const label = (text || '').toUpperCase();
  let size = startSize;
  ctx.font = `bold ${size}px ${LABEL_FONT}`;
  while (size > minSize && ctx.measureText(label).width > canvasW - padding * 2) {
    size -= 2;
    ctx.font = `bold ${size}px ${LABEL_FONT}`;
  }
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, canvasW / 2, canvasH / 2);
  return label;
}

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

  // Text with uppercase condensed font, shrunk to fit the panel
  ctx.fillStyle = color;
  drawFittedText(ctx, text, canvas.width, canvas.height, isSign ? 16 : 13, 8, 12);

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

// Builds the text plate that sits on the front face of a town sign board.
// It is a flat plane (not a billboard sprite) so the text stays glued to the
// board: it is never mirrored, never re-scaled with the camera and never
// hidden behind the board it belongs to.
export function createSignLabelMesh({ text, width = 2.0, height = 0.5, color = '#eaf6ff' }) {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');

  const label = (text || '').toUpperCase();
  let size = 150;
  ctx.font = `bold ${size}px ${LABEL_FONT}`;
  while (size > 40 && ctx.measureText(label).width > canvas.width - 120) {
    size -= 4;
    ctx.font = `bold ${size}px ${LABEL_FONT}`;
  }
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  // Dark outline keeps the label readable on the dark slate board.
  ctx.lineJoin = 'round';
  ctx.lineWidth = Math.max(8, size * 0.18);
  ctx.strokeStyle = 'rgba(6, 8, 14, 0.95)';
  ctx.strokeText(label, canvas.width / 2, canvas.height / 2);
  ctx.fillStyle = color;
  ctx.fillText(label, canvas.width / 2, canvas.height / 2);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;

  const material = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    depthTest: true,
    depthWrite: false,
    side: THREE.FrontSide,
    toneMapped: false
  });

  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), material);
  mesh.name = 'signLabel';
  mesh.renderOrder = 2;
  mesh.userData.isSignLabel = true;
  return mesh;
}

export function disposeSignLabelMesh(mesh) {
  if (!mesh) return;
  if (mesh.geometry) mesh.geometry.dispose();
  if (mesh.material) {
    if (mesh.material.map) mesh.material.map.dispose();
    mesh.material.dispose();
  }
}

export function updateLabels(camera, heroSprites) {
  if (!camera) return;

  const vFovRad = (camera.fov * Math.PI) / 360;
  const viewportH = Math.max(window.innerHeight, 1);
  const viewportW = Math.max(window.innerWidth, 1);
  const scaleFactor = (2 * Math.tan(vFovRad)) / viewportH;

  const tempWorldPos = new THREE.Vector3();
  const tempScreenPos = new THREE.Vector3();

  // 1. Hero Labels (target ~16px height, max 14 units, smooth fade 11..14, prevent <40px screen overlap)
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
