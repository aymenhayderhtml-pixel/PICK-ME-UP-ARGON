import * as THREE from 'three';
import { createWeaponModel, createShieldModel, GRADE_UI_COLORS } from '../art/weapons.js';
import { mapItemToModel } from '../art/itemModels.js';

const iconCache = new Map();
const renderQueue = [];
let isProcessingQueue = false;

let offscreenRenderer = null;
let offscreenScene = null;
let offscreenSceneGroup = null;
let offscreenCamera = null;
let isContextLost = false;

function initOffscreen() {
  if (offscreenRenderer || isContextLost) return;
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 96;
    canvas.height = 96;
    offscreenRenderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      preserveDrawingBuffer: true
    });
    offscreenRenderer.setSize(96, 96);
    offscreenRenderer.setClearColor(0x000000, 0);

    canvas.addEventListener('webglcontextlost', (e) => {
      e.preventDefault();
      isContextLost = true;
    });

    offscreenScene = new THREE.Scene();
    offscreenSceneGroup = new THREE.Group();
    offscreenScene.add(offscreenSceneGroup);

    offscreenCamera = new THREE.PerspectiveCamera(40, 1, 0.1, 20);

    const hemi = new THREE.HemisphereLight(0xffffff, 0x444455, 1.4);
    offscreenScene.add(hemi);
    const dir = new THREE.DirectionalLight(0xffffff, 1.8);
    dir.position.set(2, 3, 4);
    offscreenScene.add(dir);
    const fill = new THREE.DirectionalLight(0x88bbff, 0.8);
    fill.position.set(-2, -1, -2);
    offscreenScene.add(fill);
  } catch (err) {
    console.warn('[ItemIcon] Failed to initialize offscreen WebGL renderer:', err);
    isContextLost = true;
  }
}

function hexToRgba(hex, alpha = 1.0) {
  const r = (hex >> 16) & 255;
  const g = (hex >> 8) & 255;
  const b = hex & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function drawEmptyIcon(canvas) {
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, 96, 96);
  ctx.fillStyle = 'rgba(10, 15, 25, 0.4)';
  ctx.fillRect(0, 0, 96, 96);
}

function drawFallbackGlyph(canvas, modelData, item) {
  const ctx = canvas.getContext('2d');
  const grade = modelData.grade || item.grade || 'E';
  const gradeColHex = GRADE_UI_COLORS[grade] || 0x9a9a9a;
  const gradeCol = hexToRgba(gradeColHex, 1.0);

  ctx.clearRect(0, 0, 96, 96);

  // Background
  const grad = ctx.createLinearGradient(0, 0, 96, 96);
  grad.addColorStop(0, 'rgba(18, 25, 38, 0.95)');
  grad.addColorStop(1, 'rgba(8, 12, 20, 0.95)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 96, 96);

  // Border glow
  ctx.strokeStyle = hexToRgba(gradeColHex, 0.4);
  ctx.lineWidth = 3;
  ctx.strokeRect(2, 2, 92, 92);

  // Centered glyph or icon symbol
  ctx.fillStyle = gradeCol;
  ctx.font = 'bold 28px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(grade, 48, 44);

  // Kind or Category name
  ctx.fillStyle = '#88aacc';
  ctx.font = '10px monospace';
  const label = (modelData.kind || item.slot || 'ITEM').toUpperCase();
  ctx.fillText(label, 48, 76);
}

function cloneCanvas(source) {
  const c = document.createElement('canvas');
  c.width = source.width;
  c.height = source.height;
  const ctx = c.getContext('2d');
  ctx.drawImage(source, 0, 0);
  return c;
}

function enqueueRender(key, item, modelData, targetCanvas) {
  const existing = renderQueue.find((q) => q.key === key);
  if (existing) {
    if (!existing.targets.includes(targetCanvas)) {
      existing.targets.push(targetCanvas);
    }
  } else {
    renderQueue.push({
      key,
      item,
      modelData,
      targets: [targetCanvas]
    });
  }

  if (!isProcessingQueue) {
    isProcessingQueue = true;
    requestAnimationFrame(processRenderQueue);
  }
}

function processRenderQueue() {
  if (renderQueue.length === 0) {
    isProcessingQueue = false;
    return;
  }

  initOffscreen();

  // Rate limit: max 2 renders per frame
  let processedThisFrame = 0;
  while (renderQueue.length > 0 && processedThisFrame < 2) {
    const job = renderQueue.shift();
    processedThisFrame++;

    let cacheCanvas = null;
    if (isContextLost || !offscreenRenderer) {
      cacheCanvas = document.createElement('canvas');
      cacheCanvas.width = 96;
      cacheCanvas.height = 96;
      drawFallbackGlyph(cacheCanvas, job.modelData, job.item);
    } else {
      try {
        cacheCanvas = renderOffscreenItem(job.modelData);
      } catch (err) {
        console.warn('[ItemIcon] Render error for', job.key, err);
        cacheCanvas = document.createElement('canvas');
        cacheCanvas.width = 96;
        cacheCanvas.height = 96;
        drawFallbackGlyph(cacheCanvas, job.modelData, job.item);
      }
    }

    iconCache.set(job.key, cacheCanvas);

    // Update all target canvases waiting for this icon
    for (const target of job.targets) {
      const ctx = target.getContext('2d');
      ctx.clearRect(0, 0, 96, 96);
      ctx.drawImage(cacheCanvas, 0, 0);
    }
  }

  if (renderQueue.length > 0) {
    requestAnimationFrame(processRenderQueue);
  } else {
    isProcessingQueue = false;
  }
}

function renderOffscreenItem(modelData) {
  while (offscreenSceneGroup.children.length > 0) {
    offscreenSceneGroup.remove(offscreenSceneGroup.children[0]);
  }

  const isShield = modelData.category === 'shield';
  const model = isShield
    ? createShieldModel(modelData.kind, modelData)
    : createWeaponModel(modelData.kind, modelData);

  offscreenSceneGroup.add(model.group);

  if (isShield) {
    model.group.rotation.set(0.12, 0.32, 0.05);
  } else {
    model.group.rotation.set(0.2, 0.38, Math.PI * 0.22);
  }

  const box = new THREE.Box3().setFromObject(model.group);
  const center = new THREE.Vector3();
  box.getCenter(center);
  const size = new THREE.Vector3();
  box.getSize(size);
  model.group.position.sub(center);

  const maxDim = Math.max(size.x, size.y, size.z, 0.3);
  offscreenCamera.position.set(0, 0, maxDim * 1.55);
  offscreenCamera.lookAt(0, 0, 0);

  if (modelData.grade === 'S' || modelData.grade === 'S+') {
    if (model.setGlow) model.setGlow(0.6);
  }
  model.update(0.016);

  offscreenRenderer.render(offscreenScene, offscreenCamera);

  const cacheCanvas = document.createElement('canvas');
  cacheCanvas.width = 96;
  cacheCanvas.height = 96;
  const ctx = cacheCanvas.getContext('2d');
  ctx.drawImage(offscreenRenderer.domElement, 0, 0);

  offscreenSceneGroup.remove(model.group);
  model.dispose();

  return cacheCanvas;
}

export function getItemIconKey(item) {
  if (!item) return 'none';
  const modelData = mapItemToModel(item);
  const kind = modelData.kind || item.slot || 'item';
  const grade = modelData.grade || 'E';
  const enhance = modelData.enhance || 0;
  const wearInt = Math.round((modelData.wear || 0) * 4);
  return `${kind}_${grade}_${enhance}_${wearInt}`;
}

export function getItemIcon(item) {
  const canvas = document.createElement('canvas');
  canvas.width = 96;
  canvas.height = 96;
  canvas.className = 'item-icon-canvas';
  canvas.style.display = 'block';

  if (!item) {
    drawEmptyIcon(canvas);
    return canvas;
  }

  const modelData = mapItemToModel(item);
  const key = getItemIconKey(item);

  if (iconCache.has(key)) {
    const cached = iconCache.get(key);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(cached, 0, 0);
    return canvas;
  }

  drawFallbackGlyph(canvas, modelData, item);

  if (modelData.category === 'armor' || !modelData.kind) {
    const cached = cloneCanvas(canvas);
    iconCache.set(key, cached);
    return canvas;
  }

  enqueueRender(key, item, modelData, canvas);
  return canvas;
}

export class ItemPreviewViewer {
  constructor(size = 140) {
    this.size = size;
    this.canvas = document.createElement('canvas');
    this.canvas.width = size;
    this.canvas.height = size;
    this.canvas.style.width = `${size}px`;
    this.canvas.style.height = `${size}px`;
    this.canvas.style.borderRadius = '6px';
    this.canvas.style.backgroundColor = 'rgba(5, 10, 18, 0.7)';
    this.canvas.style.border = '1px solid var(--frame-inner)';
    this.canvas.style.display = 'block';

    try {
      this.renderer = new THREE.WebGLRenderer({
        canvas: this.canvas,
        antialias: true,
        alpha: true,
      });
      this.renderer.setSize(size, size);
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

      this.scene = new THREE.Scene();
      this.camera = new THREE.PerspectiveCamera(40, 1, 0.1, 20);

      const hemi = new THREE.HemisphereLight(0xffffff, 0x444455, 1.4);
      this.scene.add(hemi);
      const dir = new THREE.DirectionalLight(0xffffff, 1.8);
      dir.position.set(2, 3, 4);
      this.scene.add(dir);
      const fill = new THREE.DirectionalLight(0x88bbff, 0.8);
      fill.position.set(-2, -1, -2);
      this.scene.add(fill);

      this.holder = new THREE.Group();
      this.scene.add(this.holder);
    } catch (e) {
      console.warn('[ItemPreviewViewer] WebGL initialization failed', e);
      this.renderer = null;
    }

    this.currentModel = null;
    this.lastFrameTime = 0;
    this.animId = null;
    this.active = false;
  }

  setItem(item) {
    this.stop();
    if (!this.renderer) return false;

    while (this.holder.children.length > 0) {
      this.holder.remove(this.holder.children[0]);
    }
    if (this.currentModel) {
      this.currentModel.dispose();
      this.currentModel = null;
    }

    if (!item) return false;
    const modelData = mapItemToModel(item);
    if (modelData.category === 'armor' || !modelData.kind) {
      return false;
    }

    const isShield = modelData.category === 'shield';
    this.currentModel = isShield
      ? createShieldModel(modelData.kind, modelData)
      : createWeaponModel(modelData.kind, modelData);

    this.holder.add(this.currentModel.group);
    this.holder.rotation.set(0, 0, 0);

    if (!isShield) {
      this.currentModel.group.rotation.set(0.18, 0, 0.12);
    } else {
      this.currentModel.group.rotation.set(0.1, 0, 0);
    }

    const box = new THREE.Box3().setFromObject(this.holder);
    const center = new THREE.Vector3();
    box.getCenter(center);
    const bSize = new THREE.Vector3();
    box.getSize(bSize);
    this.currentModel.group.position.sub(center);

    const maxDim = Math.max(bSize.x, bSize.y, bSize.z, 0.3);
    this.camera.position.set(0, 0, maxDim * 1.6);
    this.camera.lookAt(0, 0, 0);

    this.start();
    return true;
  }

  start() {
    if (this.active || !this.renderer) return;
    this.active = true;
    this.lastFrameTime = performance.now();
    const frameInterval = 1000 / 24; // 24 FPS cap

    const loop = (now) => {
      if (!this.active) return;
      this.animId = requestAnimationFrame(loop);
      const elapsed = now - this.lastFrameTime;
      if (elapsed >= frameInterval) {
        const dt = elapsed * 0.001;
        this.lastFrameTime = now - (elapsed % frameInterval);

        // 45 degrees per second = PI * 0.25 rad/s
        this.holder.rotation.y += Math.PI * 0.25 * dt;

        if (this.currentModel) {
          this.currentModel.update(dt);
        }
        this.renderer.render(this.scene, this.camera);
      }
    };
    this.animId = requestAnimationFrame(loop);
  }

  stop() {
    this.active = false;
    if (this.animId) {
      cancelAnimationFrame(this.animId);
      this.animId = null;
    }
  }

  dispose() {
    this.stop();
    if (this.currentModel) {
      this.currentModel.dispose();
      this.currentModel = null;
    }
    if (this.renderer) {
      this.renderer.dispose();
    }
  }
}
