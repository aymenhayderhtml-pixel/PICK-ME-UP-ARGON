export function cornerSvg(size = 56) {
  return `<svg class="ornate-corner-svg" width="${size}" height="${size}" viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0 0 4px rgba(170,130,255,0.7)); width:${size}px; height:${size}px;">
    <!-- Corner diamond at vertex -->
    <polygon points="10,4 16,10 10,16 4,10" stroke="var(--frame, #d9ccff)" stroke-width="2" fill="none" />
    <!-- Horizontal curling stroke with inward flourish -->
    <path d="M 16 10 Q 34 8 44 18 Q 50 25 43 32 Q 36 36 32 30 C 29 24 36 19 41 22" stroke="var(--frame, #d9ccff)" stroke-width="2" stroke-linecap="round" fill="none" />
    <!-- Vertical curling stroke with inward flourish -->
    <path d="M 10 16 Q 8 34 18 44 Q 25 50 32 43 Q 36 36 30 32 C 24 29 19 36 22 41" stroke="var(--frame, #d9ccff)" stroke-width="2" stroke-linecap="round" fill="none" />
    <!-- Inner leaf curl -->
    <path d="M 17 17 Q 27 27 34 24 C 29 29 24 33 21 37" stroke="var(--frame, #d9ccff)" stroke-width="1.8" stroke-linecap="round" fill="none" />
    <!-- Tiny tip diamond -->
    <polygon points="26,22 28,24 26,26 24,24" stroke="var(--frame, #d9ccff)" stroke-width="1.5" fill="none" />
  </svg>`;
}

export function attachOrnateCorners(element, size = 56) {
  if (!element || element.querySelector('.ornate-corner')) return;

  const offset = Math.round(size * 0.18);
  const positions = [
    { cls: 'ornate-corner-tl', style: `top: -${offset}px; left: -${offset}px;` },
    { cls: 'ornate-corner-tr', style: `top: -${offset}px; right: -${offset}px; transform: scaleX(-1);` },
    { cls: 'ornate-corner-bl', style: `bottom: -${offset}px; left: -${offset}px; transform: scaleY(-1);` },
    { cls: 'ornate-corner-br', style: `bottom: -${offset}px; right: -${offset}px; transform: scale(-1, -1);` },
  ];

  const svgHtml = cornerSvg(size);

  positions.forEach(({ cls, style }) => {
    const corner = document.createElement('div');
    corner.className = `ornate-corner ${cls}`;
    corner.style.cssText = `position: absolute; width: ${size}px; height: ${size}px; pointer-events: none; z-index: 10; ${style}`;
    corner.innerHTML = svgHtml;
    element.appendChild(corner);
  });
}
