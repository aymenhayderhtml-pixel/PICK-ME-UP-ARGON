// src/ui/ConfirmPrompt.js
// Reusable manhua-style YES / NO confirm prompt.
//
// The manhua shows the end-of-floor prompt as a dark navy / black box with
// ornate white-silver corner filigree, a centered prompt line and a RED
// "Yes" button next to a BLACK "No" button.
//
// Two entry points:
//   createConfirmPrompt() -> a DETACHED .mm-panel the caller drops into its
//                            own layout (e.g. the reward window button row).
//   showConfirmPrompt()   -> the same panel inside a centered modal overlay,
//                            returning a Promise<boolean> (true = YES).

import { attachOrnateCorners } from './ornaments.js';

// The system windows (reward window included) sit at z-index 10000 and the
// notice stack at 10010, so the modal prompt has to be well above both to
// stay readable and clickable while the reward window is still open.
const BACKDROP_Z_INDEX = 10050;
const OVERLAY_Z_INDEX = 10051;

// Only one modal prompt at a time. Opening a new one dismisses the old one
// (resolved as NO) so overlays can never pile up.
let activePrompt = null;

/**
 * Builds the confirm panel.
 *
 * @param {object}  options
 * @param {string}  options.title      Centered prompt line.
 * @param {string}  options.message    Optional smaller sub-line under the title.
 * @param {string}  options.yesLabel   Label of the red button.
 * @param {string}  options.noLabel    Label of the black button.
 * @param {?Function} options.onYes    Called when the YES button is pressed.
 * @param {?Function} options.onNo     Called when the NO button is pressed.
 * @returns {HTMLElement} A DETACHED `.mm-panel` element (not in the document).
 */
export function createConfirmPrompt({
  title = '',
  message = '',
  yesLabel = 'YES',
  noLabel = 'NO',
  onYes = null,
  onNo = null,
} = {}) {
  const panel = document.createElement('div');
  panel.className = 'mm-panel mm-confirm-prompt';
  panel.setAttribute('role', 'group');
  if (title) panel.setAttribute('aria-label', String(title));

  // Self-contained block: the caller can append it into an existing flex row
  // (the reward window button panel) and it keeps its own layout instead of
  // collapsing. It is never `position: fixed`.
  panel.style.display = 'flex';
  panel.style.flexDirection = 'column';
  panel.style.alignItems = 'center';
  panel.style.justifyContent = 'center';
  panel.style.gap = '10px';
  panel.style.flex = '0 0 auto';
  panel.style.alignSelf = 'center';

  const titleEl = document.createElement('div');
  titleEl.className = 'mm-confirm-title';
  titleEl.textContent = title || '';
  if (!title) titleEl.style.display = 'none';
  panel.appendChild(titleEl);

  const messageEl = document.createElement('div');
  messageEl.className = 'mm-confirm-message';
  messageEl.textContent = message || '';
  if (!message) messageEl.style.display = 'none';
  panel.appendChild(messageEl);

  const actions = document.createElement('div');
  actions.className = 'mm-confirm-actions';
  panel.appendChild(actions);

  const yesBtn = document.createElement('button');
  yesBtn.type = 'button';
  yesBtn.className = 'mm-btn mm-btn-yes';
  yesBtn.textContent = yesLabel;
  yesBtn.addEventListener('click', (e) => {
    // Never let the click reach a dismiss handler sitting behind the panel.
    e.stopPropagation();
    if (typeof onYes === 'function') onYes();
  });
  actions.appendChild(yesBtn);

  const noBtn = document.createElement('button');
  noBtn.type = 'button';
  noBtn.className = 'mm-btn mm-btn-no';
  noBtn.textContent = noLabel;
  noBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (typeof onNo === 'function') onNo();
  });
  actions.appendChild(noBtn);

  // Manhua filigree corners (white-silver through the local --frame override
  // declared in theme.css).
  attachOrnateCorners(panel, 44);

  // Handy handles for callers that want to focus or query the buttons.
  panel.yesButton = yesBtn;
  panel.noButton = noBtn;

  return panel;
}

/**
 * Shows the confirm prompt in a centered modal overlay.
 *
 * The overlay is a direct child of <body> with an INLINE `display` and an
 * INLINE `z-index`, which is what `isAnySystemWindowOpen()` looks for. That
 * is how the camera is kept still while the prompt is up: the scenes skip the
 * mouse-look / attack input while a system window is open and
 * `Input.updateCursor()` releases the captured pointer.
 *
 * @param {object} options
 * @param {string} options.title
 * @param {string} options.message
 * @param {string} options.yesLabel
 * @param {string} options.noLabel
 * @returns {Promise<boolean>} true = YES, false = NO (and false on dismiss).
 */
export function showConfirmPrompt({
  title = '',
  message = '',
  yesLabel = 'YES',
  noLabel = 'NO',
} = {}) {
  return new Promise((resolve) => {
    if (typeof document === 'undefined' || !document.body) {
      resolve(false);
      return;
    }

    // Only one modal prompt at a time: the previous one is dismissed (NO).
    if (activePrompt) {
      activePrompt.close(false);
      activePrompt = null;
    }

    const backdrop = document.createElement('div');
    backdrop.className = 'mm-confirm-backdrop';
    backdrop.style.cssText = `
      position: fixed;
      left: 0;
      top: 0;
      width: 100%;
      height: 100%;
      background: rgba(3, 5, 10, 0.62);
      z-index: ${BACKDROP_Z_INDEX};
      display: block;
      pointer-events: auto;
    `;

    const overlay = document.createElement('div');
    overlay.className = 'mm-confirm-overlay';
    // A stable id so the input layer can recognise the prompt as a pointer
    // overlay if it ever needs to (see `Input.hasPointerOverlay`).
    overlay.id = 'mm-confirm-prompt';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    if (title) overlay.setAttribute('aria-label', String(title));
    overlay.style.cssText = `
      position: fixed;
      left: 50%;
      top: 50%;
      transform: translateX(-50%) translateY(-50%);
      z-index: ${OVERLAY_Z_INDEX};
      display: flex;
      pointer-events: auto;
    `;

    let settled = false;

    function close(result) {
      if (settled) return;
      settled = true;

      document.removeEventListener('keydown', onKeyDown, true);
      backdrop.removeEventListener('click', onBackdropClick);
      overlay.removeEventListener('wheel', onWheel);
      backdrop.removeEventListener('wheel', onWheel);

      if (backdrop.parentNode) backdrop.parentNode.removeChild(backdrop);
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
      if (activePrompt && activePrompt.overlay === overlay) activePrompt = null;

      resolve(result === true);
    }

    function onBackdropClick(e) {
      // Only a click on the backdrop itself dismisses, never a click that
      // bubbled up from the panel.
      if (e.target !== backdrop) return;
      close(false);
    }

    function onKeyDown(e) {
      if (e.code !== 'Escape') return;
      // Escape means NO, and it must not also close the window underneath.
      e.stopPropagation();
      close(false);
    }

    // The third-person camera zooms on every 'wheel' event that reaches
    // `window`, so a wheel over the prompt would zoom the camera behind the
    // UI. Stopping the propagation keeps the wheel in the prompt. Passive,
    // and never preventDefault: the inner content still scrolls natively.
    function onWheel(e) {
      e.stopPropagation();
    }

    const panel = createConfirmPrompt({
      title,
      message,
      yesLabel,
      noLabel,
      onYes: () => close(true),
      onNo: () => close(false),
    });
    overlay.appendChild(panel);

    backdrop.addEventListener('click', onBackdropClick);
    backdrop.addEventListener('wheel', onWheel, { passive: true });
    overlay.addEventListener('wheel', onWheel, { passive: true });
    document.addEventListener('keydown', onKeyDown, true);

    document.body.appendChild(backdrop);
    document.body.appendChild(overlay);

    activePrompt = { overlay, close };

    // The camera is mouse-driven and the pointer is captured, so a captured
    // pointer would keep steering the camera even with the overlay up.
    // `Input.updateCursor()` releases it too (the overlay makes
    // `isAnySystemWindowOpen()` true), this makes it certain.
    if (document.pointerLockElement && typeof document.exitPointerLock === 'function') {
      try {
        document.exitPointerLock();
      } catch (err) {
        // The browser refused the unlock; the scene-level cursor handling
        // takes over.
      }
    }

    // Keyboard: focus NO so a stray Enter can never pick the red YES button
    // by accident. Both buttons stay focusable with Tab.
    const noBtn = panel.noButton;
    if (noBtn && typeof noBtn.focus === 'function') {
      try {
        noBtn.focus({ preventScroll: true });
      } catch (err) {
        noBtn.focus();
      }
    }
  });
}
