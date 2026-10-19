let reportContainer = null;

function getReportContainer() {
  if (!reportContainer && typeof document !== 'undefined') {
    reportContainer = document.createElement('div');
    reportContainer.id = 'hero-report-stack';
    reportContainer.style.position = 'fixed';
    reportContainer.style.top = '54px';
    reportContainer.style.left = '12px';
    reportContainer.style.display = 'flex';
    reportContainer.style.flexDirection = 'column';
    reportContainer.style.gap = '6px';
    reportContainer.style.zIndex = '10005';
    reportContainer.style.pointerEvents = 'none';
    reportContainer.style.userSelect = 'none';
    document.body.appendChild(reportContainer);
  }
  return reportContainer;
}

export function showHeroReport(text, severity = 'low') {
  // Low severity filtered (shown 40% of time), severe always shown
  if (severity === 'low' && Math.random() > 0.4) {
    return;
  }

  const container = getReportContainer();
  if (!container) return;

  // Max 3 stacked
  while (container.children.length >= 3) {
    container.removeChild(container.firstChild);
  }

  const panel = document.createElement('div');
  panel.style.clipPath = 'polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 10px 100%, 0 calc(100% - 10px))';
  panel.style.backgroundColor = 'rgba(20, 18, 40, 0.88)';
  panel.style.border = '1px solid #b9a8ff';
  panel.style.borderRight = severity === 'severe' ? '4px solid var(--danger)' : '4px solid #b9a8ff';
  panel.style.boxShadow = severity === 'severe' ? '0 0 12px rgba(255, 90, 110, 0.5)' : '0 0 10px rgba(185, 168, 255, 0.4)';
  panel.style.padding = '6px 14px';
  panel.style.fontFamily = "'Oswald', 'Bebas Neue', 'Arial Narrow', 'Roboto Condensed', Impact, sans-serif";
  panel.style.fontSize = '14px';
  panel.style.fontWeight = '600';
  panel.style.textTransform = 'uppercase';
  panel.style.color = severity === 'severe' ? '#ffccd5' : '#ffffff';
  panel.style.letterSpacing = '0.5px';
  panel.style.maxWidth = '400px';
  panel.style.opacity = '0';
  panel.style.transform = 'translateX(-12px)';
  panel.style.transition = 'opacity 0.25s ease-out, transform 0.25s ease-out';
  panel.textContent = text;

  container.appendChild(panel);

  // Animate in
  requestAnimationFrame(() => {
    panel.style.opacity = '1';
    panel.style.transform = 'translateX(0)';
  });

  // 6s lifetime
  setTimeout(() => {
    panel.style.opacity = '0';
    panel.style.transform = 'translateX(-12px)';
    setTimeout(() => {
      if (panel.parentNode) {
        panel.parentNode.removeChild(panel);
      }
    }, 280);
  }, 5700);
}
