// src/debug/GroundDebug.js
import * as THREE from 'three';
import { gameState } from '../core/GameState.js';

export class GroundDebug {
  constructor(hubScene) {
    this.hubScene = hubScene;
    this.visible = false;
    this.container = null;
    this.contentEl = null;
    this.copyBtn = null;
    this.toastEl = null;

    this.timer = 0;
    this.prevPlayerPos = null;
    this.measuredSpeed = 0;

    // 5-second report recording state
    this.isRecording = false;
    this.recordTimer = 0;
    this.sampleTimer = 0;
    this.recordedSamples = [];

    this._box = new THREE.Box3();
    this._v = new THREE.Vector3();
    this._vLocal = new THREE.Vector3();

    if (typeof document !== 'undefined') {
      this.initUI();
      this.initEvents();
    }
  }

  initUI() {
    this.container = document.createElement('div');
    this.container.id = 'ground-debug-overlay';
    this.container.style.position = 'fixed';
    this.container.style.top = '58px';
    this.container.style.left = '12px';
    this.container.style.zIndex = '10010';
    this.container.style.pointerEvents = 'auto';
    this.container.style.backgroundColor = 'rgba(10, 14, 20, 0.88)';
    this.container.style.border = '1px solid rgba(111, 224, 240, 0.4)';
    this.container.style.boxShadow = '0 0 14px rgba(0, 0, 0, 0.7)';
    this.container.style.borderRadius = '6px';
    this.container.style.padding = '10px 14px';
    this.container.style.fontFamily = 'monospace, monospace';
    this.container.style.fontSize = '11px';
    this.container.style.lineHeight = '1.45';
    this.container.style.color = '#e2e8f0';
    this.container.style.minWidth = '340px';
    this.container.style.display = 'none';

    // Header & Actions
    const topBar = document.createElement('div');
    topBar.style.display = 'flex';
    topBar.style.justifyContent = 'space-between';
    topBar.style.alignItems = 'center';
    topBar.style.marginBottom = '6px';
    topBar.style.borderBottom = '1px solid rgba(255, 255, 255, 0.12)';
    topBar.style.paddingBottom = '4px';

    const title = document.createElement('span');
    title.textContent = 'GROUND & RIG DIAGNOSTIC (\\)';
    title.style.fontWeight = 'bold';
    title.style.color = '#6fe0f0';

    this.copyBtn = document.createElement('button');
    this.copyBtn.textContent = 'Copy report (Shift+\\)';
    this.copyBtn.style.backgroundColor = 'rgba(111, 224, 240, 0.15)';
    this.copyBtn.style.border = '1px solid #6fe0f0';
    this.copyBtn.style.color = '#6fe0f0';
    this.copyBtn.style.borderRadius = '4px';
    this.copyBtn.style.padding = '2px 8px';
    this.copyBtn.style.fontSize = '10px';
    this.copyBtn.style.cursor = 'pointer';
    this.copyBtn.style.fontFamily = 'monospace';
    this.copyBtn.onclick = () => this.startRecordingReport();

    this.toastEl = document.createElement('span');
    this.toastEl.style.color = '#4ade80';
    this.toastEl.style.fontWeight = 'bold';
    this.toastEl.style.marginLeft = '8px';
    this.toastEl.style.display = 'none';
    this.toastEl.textContent = 'COPIED';

    const btnWrapper = document.createElement('div');
    btnWrapper.appendChild(this.copyBtn);
    btnWrapper.appendChild(this.toastEl);

    topBar.appendChild(title);
    topBar.appendChild(btnWrapper);
    this.container.appendChild(topBar);

    this.contentEl = document.createElement('div');
    this.contentEl.style.whiteSpace = 'pre';
    this.container.appendChild(this.contentEl);

    document.body.appendChild(this.container);
  }

  initEvents() {
    this._keyHandler = (e) => {
      if (e.code === 'Backslash') {
        e.preventDefault();
        if (e.shiftKey) {
          this.startRecordingReport();
        } else {
          this.toggle();
        }
      }
    };
    window.addEventListener('keydown', this._keyHandler);
  }

  toggle() {
    this.visible = !this.visible;
    if (this.container) {
      this.container.style.display = this.visible ? 'block' : 'none';
    }
  }

  startRecordingReport() {
    if (this.isRecording) return;
    this.isRecording = true;
    this.recordTimer = 0;
    this.sampleTimer = 0;
    this.recordedSamples = [];
    if (this.copyBtn) this.copyBtn.textContent = 'Recording (5s)...';
  }

  captureSample() {
    const data = this.gatherSnapshot();
    this.recordedSamples.push(data);
  }

  finishRecordingReport() {
    this.isRecording = false;
    if (this.copyBtn) this.copyBtn.textContent = 'Copy report (Shift+\\)';

    const quality = (gameState.settings?.quality || 'medium').toUpperCase();
    const buildTime = new Date().toISOString();

    let text = `# Ground & Locomotion Diagnostic Report\nBuild Time: ${buildTime} | Quality: ${quality}\nSamples: 25 (every 0.2s over 5.0s)\n\n`;
    text += '| Sec | Pos (X, Y, Z) | GroundY | WalkY | Diff | WorldSpeed | Pose | WalkClock | HipL rotX | KneeL rotX | Model MinY |\n';
    text += '|---|---|---|---|---|---|---|---|---|---|---|\n';

    for (let i = 0; i < this.recordedSamples.length; i++) {
      const s = this.recordedSamples[i];
      const sec = (i * 0.2).toFixed(1);
      const pos = `(${s.pX.toFixed(2)}, ${s.pY.toFixed(2)}, ${s.pZ.toFixed(2)})`;
      text += `| ${sec}s | ${pos} | ${s.groundY.toFixed(3)} | ${s.walkYStr} | ${s.diffStr} | ${s.speed.toFixed(2)}m/s | ${s.pose} | ${s.walkClock.toFixed(2)} | ${s.hipL.toFixed(3)} | ${s.kneeL.toFixed(3)} | ${s.minWorldY.toFixed(3)} |\n`;
    }

    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(text).catch(() => {});
    }
    console.log(text);

    if (this.toastEl) {
      this.toastEl.style.display = 'inline';
      setTimeout(() => {
        if (this.toastEl) this.toastEl.style.display = 'none';
      }, 2000);
    }
  }

  gatherSnapshot() {
    const player = this.hubScene?.player;
    const pMesh = player?.mesh;
    const rig = player?.rig;
    const map = this.hubScene?.walkHeightMap;

    const pX = pMesh ? pMesh.position.x : 0;
    const pY = pMesh ? pMesh.position.y : 0;
    const pZ = pMesh ? pMesh.position.z : 0;

    const groundY = this.hubScene?.getGroundY ? this.hubScene.getGroundY(pX, pZ) : 0;
    const isReady = map?.isReady ? map.isReady() : false;
    const walkY = isReady && map ? map.getWalkY(pX, pZ) : (map ? map.getWalkY(pX, pZ) : groundY);
    const walkYStr = isReady ? walkY.toFixed(3) : 'NOT READY';
    const diff = pY - walkY;
    const diffStr = isReady ? diff.toFixed(3) : (pY - groundY).toFixed(3);

    let minWorldY = pY;
    if (rig?.model?.group) {
      this._box.setFromObject(rig.model.group);
      minWorldY = this._box.min.y;
    }

    const parts = rig?.model?.parts || {};
    const hipL = parts.hipL ? parts.hipL.rotation.x : 0;
    const kneeL = parts.kneeL ? parts.kneeL.rotation.x : 0;
    const footL = parts.footL ? parts.footL.rotation.x : 0;

    return {
      pX, pY, pZ,
      groundY,
      walkY,
      walkYStr,
      diff,
      diffStr,
      speed: this.measuredSpeed,
      pose: rig?.currentPose || 'none',
      walkClock: rig?.walkClock || 0,
      intensity: rig?.smoothedSpeed ? rig.smoothedSpeed / 5.0 : 1.0,
      hipL,
      kneeL,
      footL,
      minWorldY,
    };
  }

  update(delta) {
    const player = this.hubScene?.player;
    const pMesh = player?.mesh;

    // Track real controller world speed independent of rig
    if (pMesh) {
      if (this.prevPlayerPos) {
        const dist = Math.hypot(pMesh.position.x - this.prevPlayerPos.x, pMesh.position.z - this.prevPlayerPos.z);
        if (delta > 0.0001) {
          const instSpeed = dist / delta;
          this.measuredSpeed += (instSpeed - this.measuredSpeed) * Math.min(1.0, 15 * delta);
        }
      } else {
        this.prevPlayerPos = new THREE.Vector2(pMesh.position.x, pMesh.position.z);
      }
      this.prevPlayerPos.set(pMesh.position.x, pMesh.position.z);
    }

    // Report recording loop (every 0.2s for 5.0s)
    if (this.isRecording) {
      this.recordTimer += delta;
      this.sampleTimer += delta;
      if (this.sampleTimer >= 0.2) {
        this.sampleTimer = 0;
        this.captureSample();
      }
      if (this.recordTimer >= 5.0) {
        this.finishRecordingReport();
      }
    }

    if (!this.visible || !this.contentEl) return;

    this.timer += delta;
    if (this.timer < 0.1) return; // 10 updates per second
    this.timer = 0;

    this.renderOverlay();
  }

  renderOverlay() {
    const player = this.hubScene?.player;
    const pMesh = player?.mesh;
    const rig = player?.rig;
    const map = this.hubScene?.walkHeightMap;

    const pX = pMesh ? pMesh.position.x : 0;
    const pY = pMesh ? pMesh.position.y : 0;
    const pZ = pMesh ? pMesh.position.z : 0;

    const groundY = this.hubScene?.getGroundY ? this.hubScene.getGroundY(pX, pZ) : 0;
    const isReady = map?.isReady ? map.isReady() : false;
    const walkY = isReady && map ? map.getWalkY(pX, pZ) : (map ? map.getWalkY(pX, pZ) : groundY);
    const walkYStr = isReady ? walkY.toFixed(3) : 'NOT READY';
    const diff = pY - (isReady ? walkY : groundY);

    const progressPct = map?.getProgress ? Math.round(map.getProgress() * 100) : (isReady ? 100 : 0);

    let rigWorldPos = '(none)';
    let rigLocalPos = '(none)';
    let minWorldY = 0;
    if (rig?.group) {
      rig.group.getWorldPosition(this._v);
      rigWorldPos = `(${this._v.x.toFixed(2)}, ${this._v.y.toFixed(2)}, ${this._v.z.toFixed(2)})`;
      rigLocalPos = `(${rig.group.position.x.toFixed(2)}, ${rig.group.position.y.toFixed(2)}, ${rig.group.position.z.toFixed(2)})`;
      this._box.setFromObject(rig.model?.group || rig.group);
      minWorldY = this._box.min.y;
    }

    const lastState = rig?._lastPassedState || {};
    const parts = rig?.model?.parts || {};
    const hipL = parts.hipL ? parts.hipL.rotation.x.toFixed(3) : '0';
    const kneeL = parts.kneeL ? parts.kneeL.rotation.x.toFixed(3) : '0';
    const footL = parts.footL ? parts.footL.rotation.x.toFixed(3) : '0';

    let heroInfo = 'Nearest Hero: (none spawned)';
    const npcs = this.hubScene?.heroesManager?.npcs || [];
    let nearestDist = Infinity;
    let nearestHero = null;
    for (const npc of npcs) {
      if (npc.mesh && npc.mesh.visible) {
        const d = Math.hypot(npc.mesh.position.x - pX, npc.mesh.position.z - pZ);
        if (d < nearestDist) {
          nearestDist = d;
          nearestHero = npc;
        }
      }
    }

    if (nearestHero) {
      const hX = nearestHero.mesh.position.x;
      const hY = nearestHero.mesh.position.y;
      const hZ = nearestHero.mesh.position.z;
      const hGy = this.hubScene?.getGroundY ? this.hubScene.getGroundY(hX, hZ) : 0;
      const hWy = this.hubScene?.getWalkY ? this.hubScene.getWalkY(hX, hZ) : hGy;
      let hMinY = hY;
      if (nearestHero.rig?.model?.group) {
        this._box.setFromObject(nearestHero.rig.model.group);
        hMinY = this._box.min.y;
      }
      heroInfo = `Nearest Hero: ${nearestHero.heroData?.name || 'NPC'} (dist ${nearestDist.toFixed(1)}m)\n` +
        `  Pos: (${hX.toFixed(2)}, ${hY.toFixed(2)}, ${hZ.toFixed(2)})\n` +
        `  GroundY: ${hGy.toFixed(3)} | WalkY: ${hWy.toFixed(3)} | Diff: ${(hY - hWy).toFixed(3)}\n` +
        `  Model min world Y: ${hMinY.toFixed(4)}`;
    }

    this.contentEl.textContent =
      `PLAYER:\n` +
      `  World Pos:   (${pX.toFixed(2)}, ${pY.toFixed(2)}, ${pZ.toFixed(2)})\n` +
      `  GroundY:     ${groundY.toFixed(3)} | WalkY: ${walkYStr} | Diff: ${diff.toFixed(3)}\n` +
      `  Map Build:   ${progressPct}% complete\n` +
      `  Rig World:   ${rigWorldPos}\n` +
      `  Rig Local:   ${rigLocalPos}\n` +
      `  Model Min Y: ${minWorldY.toFixed(4)}\n` +
      `  World Speed: ${this.measuredSpeed.toFixed(2)} m/s (from controller)\n` +
      `  Rig Input:   moving=${Boolean(lastState.moving)} speed=${Number(lastState.speed || 0).toFixed(2)} sprint=${Boolean(lastState.sprinting)} action=${lastState.action || 'none'}\n` +
      `  Active Pose: ${rig?.currentPose || 'idle'}\n` +
      `  Walk Clock:  ${(rig?.walkClock || 0).toFixed(2)} | Intensity: ${(rig?.smoothedSpeed ? rig.smoothedSpeed / 5.0 : 1.0).toFixed(2)}\n` +
      `  Joints RotX: hipL=${hipL} kneeL=${kneeL} footL=${footL}\n\n` +
      `${heroInfo}`;
  }

  dispose() {
    if (this._keyHandler) {
      window.removeEventListener('keydown', this._keyHandler);
    }
    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
  }
}
