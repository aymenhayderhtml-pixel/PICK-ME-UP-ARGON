// src/ui/IselleBubble.js
import * as THREE from 'three';
import { drawIsellePortrait } from '../art/iselle.js';
import { isAnySystemWindowOpen } from './Hud.js';
import { getAudioContext, isAudioMuted } from '../core/AudioManager.js';

let bubbleContainer = null;
let currentBubble = null;
const bubbleQueue = [];

function getBubbleContainer() {
  if (typeof document === 'undefined') return null;
  if (!bubbleContainer || !bubbleContainer.parentNode) {
    bubbleContainer = document.createElement('div');
    bubbleContainer.id = 'iselle-bubble-layer';
    bubbleContainer.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      pointer-events: none;
      z-index: 10050;
      overflow: hidden;
    `;
    document.body.appendChild(bubbleContainer);
  }
  return bubbleContainer;
}

function playTinkSound() {
  try {
    if (typeof window === 'undefined') return;
    if (isAudioMuted()) return;
    const ctx = getAudioContext();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1760, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.16);
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.16);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.16);
  } catch (e) {}
}

export function showIselleBubble(iselleRig, text, expression = 'smile', customDuration = null) {
  if (!iselleRig || !text || typeof document === 'undefined') return;

  const item = {
    iselleRig,
    text: String(text).trim(),
    expression: expression || 'smile',
    duration: customDuration || Math.min(7000, 2500 + text.length * 40),
  };

  if (currentBubble) {
    bubbleQueue.push(item);
    return;
  }

  displayBubble(item);
}

function displayBubble(item) {
  const container = getBubbleContainer();
  if (!container) return;

  const { iselleRig, text, expression, duration } = item;

  const el = document.createElement('div');
  el.className = 'mm-panel iselle-speech-bubble';
  el.style.cssText = `
    position: fixed;
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 14px;
    max-width: 300px;
    width: max-content;
    box-sizing: border-box;
    font-size: 16px;
    line-height: 1.35;
    background: rgba(11, 8, 16, 0.94);
    border: 1px solid var(--frame-inner, #4a3d66);
    box-shadow: 0 4px 14px rgba(0, 0, 0, 0.6);
    opacity: 0;
    transform: translateY(6px) scale(0.96);
    transition: opacity 0.22s ease-out, transform 0.22s ease-out;
    pointer-events: none;
    z-index: 10051;
  `;

  // Left side: 40x40 portrait canvas
  const canvas = document.createElement('canvas');
  canvas.width = 40;
  canvas.height = 40;
  canvas.style.cssText = `
    width: 40px;
    height: 40px;
    border-radius: 4px;
    flex-shrink: 0;
    border: 1px solid var(--frame-inner, #4a3d66);
    background: #171026;
  `;
  const ctx = canvas.getContext('2d');
  try {
    drawIsellePortrait(ctx, expression, 40);
  } catch (e) {}
  el.appendChild(canvas);

  // Right side: text content
  const textDiv = document.createElement('div');
  textDiv.style.cssText = `
    color: var(--text, #f8fafc);
    font-size: 15px;
    font-weight: 500;
    line-height: 1.3;
    overflow: hidden;
    display: -webkit-box;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.8);
  `;
  textDiv.textContent = `"${text}"`;
  el.appendChild(textDiv);

  // Pointer Tail at bottom
  const tail = document.createElement('div');
  tail.style.cssText = `
    position: absolute;
    bottom: -8px;
    left: 28px;
    width: 0;
    height: 0;
    border-left: 7px solid transparent;
    border-right: 7px solid transparent;
    border-top: 8px solid rgba(11, 8, 16, 0.94);
  `;
  el.appendChild(tail);

  container.appendChild(el);

  requestAnimationFrame(() => {
    el.style.opacity = '1';
    el.style.transform = 'translateY(0) scale(1)';
  });

  playTinkSound();

  let dismissTimer = null;
  const dismiss = () => {
    if (dismissTimer) clearTimeout(dismissTimer);
    el.style.opacity = '0';
    el.style.transform = 'translateY(6px) scale(0.96)';
    setTimeout(() => {
      if (el.parentNode) el.parentNode.removeChild(el);
      if (currentBubble && currentBubble.el === el) {
        currentBubble = null;
      }
      if (bubbleQueue.length > 0) {
        displayBubble(bubbleQueue.shift());
      }
    }, 220);
  };

  dismissTimer = setTimeout(dismiss, duration);

  currentBubble = {
    el,
    iselleRig,
    dismiss,
    timer: dismissTimer,
  };
}

export function updateIselleBubbles(camera) {
  if (!currentBubble || !camera || typeof window === 'undefined') return;

  const { el, iselleRig } = currentBubble;
  if (!el || !iselleRig) return;

  // Hide while any system window is open, resume when closed
  if (isAnySystemWindowOpen()) {
    el.style.display = 'none';
    return;
  }
  el.style.display = 'flex';

  const headPos = iselleRig.getHeadWorldPosition();
  headPos.y += 0.38; // Position bubble slightly above fairy head

  const proj = headPos.clone().project(camera);

  // Behind camera check
  if (proj.z > 1.0) {
    el.style.display = 'none';
    return;
  }

  const screenX = (proj.x * 0.5 + 0.5) * window.innerWidth;
  const screenY = (-proj.y * 0.5 + 0.5) * window.innerHeight;

  const rect = el.getBoundingClientRect();
  const bubbleW = rect.width || 240;
  const bubbleH = rect.height || 60;

  // Center horizontally over head and clamp to screen margins
  let left = screenX - bubbleW * 0.35;
  left = Math.max(12, Math.min(window.innerWidth - bubbleW - 12, left));

  // Anchor above head and clamp vertically
  let top = screenY - bubbleH - 12;
  top = Math.max(12, Math.min(window.innerHeight - bubbleH - 50, top));

  el.style.left = `${Math.round(left)}px`;
  el.style.top = `${Math.round(top)}px`;
}

export function clearIselleBubbles() {
  if (currentBubble) {
    currentBubble.dismiss();
    currentBubble = null;
  }
  bubbleQueue.length = 0;
}
