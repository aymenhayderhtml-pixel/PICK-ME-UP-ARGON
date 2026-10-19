// src/ui/RewardIcons.js
// Procedural 2D canvas icon renderer with clean manhwa outlines and shading.
// Exports drawRewardIcon(ctx, id, size) and caches rendered icons by id and size.

const ICON_CACHE = new Map();

function createOffscreen(size) {
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  return c;
}

function normalizeId(rawId) {
  const id = String(rawId || '').toLowerCase().trim();
  if (id === 'gold' || id === 'coins' || id === 'money' || id.endsWith('g')) return 'gold';
  if (id === 'crude_iron' || id === 'iron_ore' || id === 'iron ore' || id === 'iron') return 'iron_ore';
  if (id === 'leather' || id === 'leather (c)') return 'leather';
  if (id === 'steel' || id === 'steel (c)' || id === 'steel_ingot') return 'steel_ingot';
  if (id === 'copper' || id === 'copper (c)' || id === 'copper_ore') return 'copper_ore';
  if (id === 'goblin_hide') return 'goblin_hide';
  if (id === 'goblin_tooth') return 'goblin_tooth';
  if (id === 'gem' || id === 'gems') return 'gem';
  if (id === 'ticket' || id === 'tickets') return 'ticket';
  return id;
}

function renderGold(ctx, s) {
  const cx = s * 0.5;
  const cy = s * 0.5;
  const rx = s * 0.32;
  const ry = s * 0.12;

  // Stack of 3 beveled gold coins (0xf2d27a)
  const coinYs = [cy + s * 0.16, cy, cy - s * 0.16];
  const depth = s * 0.08;

  for (let i = 0; i < coinYs.length; i++) {
    const y = coinYs[i];

    // Coin rim / depth
    ctx.beginPath();
    ctx.ellipse(cx, y + depth, rx, ry, 0, 0, Math.PI);
    ctx.lineTo(cx - rx, y);
    ctx.ellipse(cx, y, rx, ry, 0, Math.PI, 0, true);
    ctx.closePath();
    ctx.fillStyle = '#bfa145';
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = '#14101c';
    ctx.stroke();

    // Coin top face
    ctx.beginPath();
    ctx.ellipse(cx, y, rx, ry, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#f2d27a';
    ctx.fill();
    ctx.stroke();

    // Inner embossed bevel
    ctx.beginPath();
    ctx.ellipse(cx, y, rx * 0.75, ry * 0.75, 0, 0, Math.PI * 2);
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.stroke();
    ctx.strokeStyle = '#14101c';

    // Soft highlight glint
    ctx.beginPath();
    ctx.ellipse(cx - rx * 0.3, y - ry * 0.25, rx * 0.25, ry * 0.25, -0.3, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
    ctx.fill();
  }
}

function renderIronOre(ctx, s) {
  // Dark gray-black faceted rock cluster with pale edge highlights
  const cx = s * 0.5;
  const cy = s * 0.54;

  ctx.lineWidth = 1.5;
  ctx.strokeStyle = '#14101c';

  // Back shadow facet
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.35, cy + s * 0.18);
  ctx.lineTo(cx - s * 0.25, cy - s * 0.28);
  ctx.lineTo(cx + s * 0.05, cy - s * 0.36);
  ctx.lineTo(cx + s * 0.36, cy - s * 0.15);
  ctx.lineTo(cx + s * 0.32, cy + s * 0.24);
  ctx.lineTo(cx - s * 0.08, cy + s * 0.32);
  ctx.closePath();
  ctx.fillStyle = '#1e2126';
  ctx.fill();
  ctx.stroke();

  // Primary facets
  const facets = [
    { pts: [[-0.25, -0.28], [0.05, -0.36], [0, -0.05], [-0.18, -0.08]], col: '#3e434d' },
    { pts: [[0.05, -0.36], [0.36, -0.15], [0.18, 0.04], [0, -0.05]], col: '#2c3038' },
    { pts: [[-0.35, 0.18], [-0.18, -0.08], [0, 0.08], [-0.15, 0.26]], col: '#333740' },
    { pts: [[-0.18, -0.08], [0, -0.05], [0.18, 0.04], [0.1, 0.22], [0, 0.08]], col: '#4a505c' },
    { pts: [[0.18, 0.04], [0.36, -0.15], [0.32, 0.24], [0.1, 0.22]], col: '#22252c' },
    { pts: [[-0.15, 0.26], [0, 0.08], [0.1, 0.22], [-0.08, 0.32]], col: '#292d34' },
  ];

  for (const f of facets) {
    ctx.beginPath();
    ctx.moveTo(cx + f.pts[0][0] * s, cy + f.pts[0][1] * s);
    for (let i = 1; i < f.pts.length; i++) {
      ctx.lineTo(cx + f.pts[i][0] * s, cy + f.pts[i][1] * s);
    }
    ctx.closePath();
    ctx.fillStyle = f.col;
    ctx.fill();
    ctx.stroke();
  }

  // Pale edge highlights
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.24, cy - s * 0.27);
  ctx.lineTo(cx + s * 0.04, cy - s * 0.35);
  ctx.lineTo(cx, cy - s * 0.05);
  ctx.strokeStyle = '#9ca8b8';
  ctx.lineWidth = 1.2;
  ctx.stroke();
}

function renderLeather(ctx, s) {
  // Crumpled brown-orange hide piece (0xb5532a)
  const cx = s * 0.5;
  const cy = s * 0.5;

  ctx.beginPath();
  ctx.moveTo(cx - s * 0.28, cy - s * 0.32);
  ctx.bezierCurveTo(cx - s * 0.05, cy - s * 0.38, cx + s * 0.18, cy - s * 0.30, cx + s * 0.32, cy - s * 0.25);
  ctx.bezierCurveTo(cx + s * 0.38, cy - s * 0.02, cx + s * 0.34, cy + s * 0.22, cx + s * 0.26, cy + s * 0.34);
  ctx.bezierCurveTo(cx + s * 0.08, cy + s * 0.38, cx - s * 0.12, cy + s * 0.32, cx - s * 0.32, cy + s * 0.24);
  ctx.bezierCurveTo(cx - s * 0.38, cy + s * 0.06, cx - s * 0.35, cy - s * 0.18, cx - s * 0.28, cy - s * 0.32);
  ctx.closePath();

  ctx.fillStyle = '#b5532a';
  ctx.fill();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = '#14101c';
  ctx.stroke();

  // Fold shadow
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.15, cy - s * 0.28);
  ctx.quadraticCurveTo(cx + s * 0.02, cy - s * 0.05, cx + s * 0.24, cy + s * 0.18);
  ctx.strokeStyle = '#7c3314';
  ctx.lineWidth = 3;
  ctx.stroke();

  // Soft crumpled highlight
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.18, cy - s * 0.20);
  ctx.quadraticCurveTo(cx - s * 0.02, cy + s * 0.02, cx + s * 0.12, cy + s * 0.22);
  ctx.strokeStyle = '#e07d50';
  ctx.lineWidth = 1.8;
  ctx.stroke();

  // Stitched corner detail
  ctx.fillStyle = '#ffd2a3';
  for (let i = 0; i < 4; i++) {
    const d = (i - 1.5) * s * 0.05;
    ctx.fillRect(cx + s * 0.18 + d, cy - s * 0.22 + d * 0.4, 2, 2);
  }
}

function renderSteel(ctx, s) {
  // Beveled steel ingot (clean silver/blue-gray)
  const cx = s * 0.5;
  const cy = s * 0.52;
  const w = s * 0.65;
  const h = s * 0.34;

  ctx.lineWidth = 1.5;
  ctx.strokeStyle = '#14101c';

  // Bottom edge/depth
  ctx.beginPath();
  ctx.moveTo(cx - w * 0.5, cy + h * 0.1);
  ctx.lineTo(cx - w * 0.36, cy + h * 0.5);
  ctx.lineTo(cx + w * 0.36, cy + h * 0.5);
  ctx.lineTo(cx + w * 0.5, cy + h * 0.1);
  ctx.closePath();
  ctx.fillStyle = '#4c5c6e';
  ctx.fill();
  ctx.stroke();

  // Top trapezoid facet
  ctx.beginPath();
  ctx.moveTo(cx - w * 0.38, cy - h * 0.5);
  ctx.lineTo(cx + w * 0.38, cy - h * 0.5);
  ctx.lineTo(cx + w * 0.5, cy + h * 0.1);
  ctx.lineTo(cx - w * 0.5, cy + h * 0.1);
  ctx.closePath();
  ctx.fillStyle = '#9cb4c9';
  ctx.fill();
  ctx.stroke();

  // Front trapezoid facet
  ctx.beginPath();
  ctx.moveTo(cx - w * 0.5, cy + h * 0.1);
  ctx.lineTo(cx + w * 0.5, cy + h * 0.1);
  ctx.lineTo(cx + w * 0.36, cy + h * 0.48);
  ctx.lineTo(cx - w * 0.36, cy + h * 0.48);
  ctx.closePath();
  ctx.fillStyle = '#72889c';
  ctx.fill();
  ctx.stroke();

  // Specular gleam
  ctx.beginPath();
  ctx.moveTo(cx - w * 0.32, cy - h * 0.45);
  ctx.lineTo(cx + w * 0.32, cy - h * 0.45);
  ctx.strokeStyle = '#eef6fc';
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

function renderCopper(ctx, s) {
  // Orange-brown rock with green flecks
  const cx = s * 0.5;
  const cy = s * 0.52;

  ctx.lineWidth = 1.5;
  ctx.strokeStyle = '#14101c';

  // Base rock
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.32, cy + s * 0.15);
  ctx.lineTo(cx - s * 0.22, cy - s * 0.30);
  ctx.lineTo(cx + s * 0.12, cy - s * 0.35);
  ctx.lineTo(cx + s * 0.35, cy - s * 0.08);
  ctx.lineTo(cx + s * 0.26, cy + s * 0.30);
  ctx.lineTo(cx - s * 0.10, cy + s * 0.34);
  ctx.closePath();
  ctx.fillStyle = '#9e4d25';
  ctx.fill();
  ctx.stroke();

  // Warm highlight facet
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.22, cy - s * 0.30);
  ctx.lineTo(cx + s * 0.12, cy - s * 0.35);
  ctx.lineTo(cx + s * 0.05, cy - s * 0.02);
  ctx.lineTo(cx - s * 0.12, cy - s * 0.06);
  ctx.closePath();
  ctx.fillStyle = '#d4733d';
  ctx.fill();
  ctx.stroke();

  // Shaded lower facet
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.10, cy + s * 0.34);
  ctx.lineTo(cx + s * 0.26, cy + s * 0.30);
  ctx.lineTo(cx + s * 0.18, cy + s * 0.08);
  ctx.lineTo(cx - s * 0.02, cy + s * 0.12);
  ctx.closePath();
  ctx.fillStyle = '#6e3012';
  ctx.fill();
  ctx.stroke();

  // Green malachite / patina flecks
  ctx.fillStyle = '#34d399';
  const flecks = [
    [-0.08, -0.18, 3],
    [0.10, -0.12, 3.5],
    [-0.02, 0.04, 2.5],
    [0.15, 0.12, 3],
    [-0.16, 0.10, 2],
  ];
  for (const [fx, fy, fr] of flecks) {
    ctx.beginPath();
    ctx.arc(cx + fx * s, cy + fy * s, fr, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#14101c';
    ctx.lineWidth = 0.8;
    ctx.stroke();
  }
}

function renderGoblinHide(ctx, s) {
  // Greenish-brown ragged cured hide
  const cx = s * 0.5;
  const cy = s * 0.5;

  ctx.beginPath();
  ctx.moveTo(cx - s * 0.30, cy - s * 0.28);
  ctx.lineTo(cx + s * 0.28, cy - s * 0.32);
  ctx.lineTo(cx + s * 0.34, cy + s * 0.20);
  ctx.lineTo(cx + s * 0.12, cy + s * 0.34);
  ctx.lineTo(cx - s * 0.25, cy + s * 0.30);
  ctx.lineTo(cx - s * 0.35, cy);
  ctx.closePath();
  ctx.fillStyle = '#556832';
  ctx.fill();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = '#14101c';
  ctx.stroke();

  // Patch / stitch
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.12, cy - s * 0.15);
  ctx.lineTo(cx + s * 0.14, cy + s * 0.15);
  ctx.strokeStyle = '#323d1b';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.strokeStyle = '#cdd8a0';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.18, cy - s * 0.22);
  ctx.lineTo(cx + s * 0.20, cy - s * 0.24);
  ctx.stroke();
}

function renderGoblinTooth(ctx, s) {
  // Sharp curved ivory tooth with dark root
  const cx = s * 0.5;
  const cy = s * 0.5;

  // Root
  ctx.beginPath();
  ctx.ellipse(cx, cy - s * 0.24, s * 0.14, s * 0.08, 0, 0, Math.PI * 2);
  ctx.fillStyle = '#483526';
  ctx.fill();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = '#14101c';
  ctx.stroke();

  // Curved tooth cone
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.13, cy - s * 0.22);
  ctx.quadraticCurveTo(cx - s * 0.18, cy + s * 0.05, cx + s * 0.12, cy + s * 0.36);
  ctx.quadraticCurveTo(cx + s * 0.02, cy + s * 0.08, cx + s * 0.13, cy - s * 0.22);
  ctx.closePath();
  ctx.fillStyle = '#f8f4e6';
  ctx.fill();
  ctx.stroke();

  // Shadow ridge
  ctx.beginPath();
  ctx.moveTo(cx, cy - s * 0.20);
  ctx.quadraticCurveTo(cx - s * 0.05, cy + s * 0.06, cx + s * 0.12, cy + s * 0.36);
  ctx.strokeStyle = '#d6cca8';
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

function renderGem(ctx, s) {
  // Brilliant faceted cyan gem
  const cx = s * 0.5;
  const cy = s * 0.5;
  const r = s * 0.36;

  ctx.lineWidth = 1.5;
  ctx.strokeStyle = '#14101c';

  // Octagon outline
  const pts = [];
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4 + Math.PI / 8;
    pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
  }

  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.closePath();
  ctx.fillStyle = '#06b6d4';
  ctx.fill();
  ctx.stroke();

  // Inner table facet
  const ir = r * 0.55;
  const ipts = [];
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4 + Math.PI / 8;
    ipts.push([cx + Math.cos(a) * ir, cy + Math.sin(a) * ir]);
  }
  ctx.beginPath();
  ctx.moveTo(ipts[0][0], ipts[0][1]);
  for (let i = 1; i < ipts.length; i++) ctx.lineTo(ipts[i][0], ipts[i][1]);
  ctx.closePath();
  ctx.fillStyle = '#67e8f9';
  ctx.fill();
  ctx.stroke();

  // Connecting radial facets
  for (let i = 0; i < 8; i++) {
    ctx.beginPath();
    ctx.moveTo(pts[i][0], pts[i][1]);
    ctx.lineTo(ipts[i][0], ipts[i][1]);
    ctx.stroke();
  }

  // Pure white spark glint
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(cx - ir * 0.4, cy - ir * 0.4, s * 0.05, 0, Math.PI * 2);
  ctx.fill();
}

function renderTicket(ctx, s) {
  // Golden summon ticket
  const cx = s * 0.5;
  const cy = s * 0.5;
  const w = s * 0.62;
  const h = s * 0.42;

  ctx.lineWidth = 1.5;
  ctx.strokeStyle = '#14101c';

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(-0.15);

  ctx.beginPath();
  ctx.rect(-w * 0.5, -h * 0.5, w, h);
  ctx.fillStyle = '#f5c542';
  ctx.fill();
  ctx.stroke();

  // Notches on left/right
  ctx.fillStyle = '#171026';
  ctx.beginPath();
  ctx.arc(-w * 0.5, 0, s * 0.06, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(w * 0.5, 0, s * 0.06, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Inner star badge
  ctx.fillStyle = '#946608';
  ctx.beginPath();
  ctx.arc(0, 0, s * 0.1, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.font = `bold ${Math.round(s * 0.2)}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('★', 0, 1);

  ctx.restore();
}

function renderFallback(ctx, s) {
  // Clean item crate / box fallback
  const cx = s * 0.5;
  const cy = s * 0.5;
  const b = s * 0.32;

  ctx.lineWidth = 1.5;
  ctx.strokeStyle = '#14101c';

  ctx.beginPath();
  ctx.rect(cx - b, cy - b, b * 2, b * 2);
  ctx.fillStyle = '#4a5568';
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(cx - b, cy - b);
  ctx.lineTo(cx + b, cy + b);
  ctx.moveTo(cx + b, cy - b);
  ctx.lineTo(cx - b, cy + b);
  ctx.stroke();
}

/**
 * Draw 2D reward icon onto target canvas context.
 * Caches rendered result by id and size.
 * @param {CanvasRenderingContext2D} ctx
 * @param {string} id Icon identifier
 * @param {number} size Pixel size (e.g. 64)
 */
export function drawRewardIcon(ctx, id, size = 64) {
  const norm = normalizeId(id);
  const cacheKey = `${norm}_${size}`;

  let cached = ICON_CACHE.get(cacheKey);
  if (!cached) {
    cached = createOffscreen(size);
    const octx = cached.getContext('2d');
    octx.imageSmoothingEnabled = true;

    switch (norm) {
      case 'gold':
        renderGold(octx, size);
        break;
      case 'iron_ore':
        renderIronOre(octx, size);
        break;
      case 'leather':
        renderLeather(octx, size);
        break;
      case 'steel_ingot':
        renderSteel(octx, size);
        break;
      case 'copper_ore':
        renderCopper(octx, size);
        break;
      case 'goblin_hide':
        renderGoblinHide(octx, size);
        break;
      case 'goblin_tooth':
        renderGoblinTooth(octx, size);
        break;
      case 'gem':
        renderGem(octx, size);
        break;
      case 'ticket':
        renderTicket(octx, size);
        break;
      default:
        renderFallback(octx, size);
        break;
    }
    ICON_CACHE.set(cacheKey, cached);
  }

  ctx.drawImage(cached, 0, 0, size, size);
}
