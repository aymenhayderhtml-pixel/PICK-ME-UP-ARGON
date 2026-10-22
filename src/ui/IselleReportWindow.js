// src/ui/IselleReportWindow.js
// "Iselle's Report" - the login report panel shown before gameplay.
//
// PROTECTED AREA (src/ui/*): this is a NEW file, so nothing existing is
// modified. It follows the SystemWindow pattern and the inline-style visual
// language used by RosterWindow.js.

import { SystemWindow } from './SystemWindow.js';
import { pickLine } from '../data/iselle.js';

const EVENT_COLORS = {
  died: '#ff5a6e',
  iselle_intervened: '#b48cff',
  law_broken: '#ff9f43',
  fought_hero: '#ff7a7a',
  fight_ended: '#e07a5f',
  fight_won: '#f4a261',
  fight_lost: '#d62828',
  sanctioned_bout: '#4ea8de',
  injured: '#ff5a6e',
  skill_combined: '#ffd36b',
  new_skill: '#7dffb0',
  level_up: '#7dffb0',
  leader_ordered: '#6fe0f0',
  got_scared: '#6fe0f0',
  trained: '#aabbcc',
  ate: '#aabbcc',
  rested: '#aabbcc',
  did_nothing: '#777777',
};

export class IselleReportWindow extends SystemWindow {
  constructor(onDismissCallback = null) {
    super("ISELLE'S REPORT");
    this.onDismissCallback = onDismissCallback;
    this.container.style.width = '720px';
    this.container.style.maxWidth = '95vw';
    this.reportModel = null;
    this.buildUI();
  }

  buildUI() {
    this.contentElement.style.padding = '14px';
    this.contentElement.style.display = 'flex';
    this.contentElement.style.flexDirection = 'column';
    this.contentElement.style.gap = '10px';
    this.contentElement.style.textAlign = 'left';
    this.contentElement.style.maxHeight = '70vh';
    this.contentElement.style.overflowY = 'auto';
    // The scroll stays inside the report: it never chains out to the page.
    this.contentElement.style.overscrollBehavior = 'contain';

    this.quoteEl = document.createElement('div');
    this.quoteEl.style.fontSize = '13px';
    this.quoteEl.style.fontStyle = 'italic';
    this.quoteEl.style.color = '#b48cff';
    this.quoteEl.style.borderLeft = '3px solid var(--accent)';
    this.quoteEl.style.paddingLeft = '10px';
    this.quoteEl.style.marginBottom = '4px';

    this.summaryEl = document.createElement('div');
    this.summaryEl.style.backgroundColor = 'rgba(20, 15, 35, 0.7)';
    this.summaryEl.style.border = '1px solid var(--frame-inner)';
    this.summaryEl.style.borderRadius = '6px';
    this.summaryEl.style.padding = '10px 12px';
    this.summaryEl.style.fontSize = '14px';
    this.summaryEl.style.fontWeight = 'bold';
    this.summaryEl.style.color = '#ffffff';

    this.metaEl = document.createElement('div');
    this.metaEl.style.fontSize = '11px';
    this.metaEl.style.color = '#8a8a99';
    this.metaEl.style.textAlign = 'right';

    this.listEl = document.createElement('div');
    this.listEl.style.display = 'flex';
    this.listEl.style.flexDirection = 'column';
    this.listEl.style.gap = '8px';
    // The report list is the element that scrolls: the wheel over it reads
    // the report and never reaches the camera behind the window.
    this.listEl.style.maxHeight = '48vh';
    this.listEl.style.minHeight = '0';
    this.listEl.style.overflowY = 'auto';
    this.listEl.style.overscrollBehavior = 'contain';

    this.fightsEl = document.createElement('div');
    this.fightsEl.style.backgroundColor = 'rgba(40, 18, 12, 0.7)';
    this.fightsEl.style.border = '1px solid #663322';
    this.fightsEl.style.borderRadius = '6px';
    this.fightsEl.style.padding = '8px 12px';
    this.fightsEl.style.marginBottom = '8px';
    this.fightsEl.style.fontSize = '12px';
    this.fightsEl.style.color = '#ffb08a';

    this.idleEl = document.createElement('div');
    this.idleEl.style.backgroundColor = 'rgba(10, 10, 14, 0.7)';
    this.idleEl.style.border = '1px solid #444450';
    this.idleEl.style.borderRadius = '6px';
    this.idleEl.style.padding = '8px 12px';
    this.idleEl.style.fontSize = '12px';
    this.idleEl.style.color = '#999999';

    this.fallenEl = document.createElement('div');
    this.fallenEl.style.backgroundColor = 'rgba(40, 10, 16, 0.7)';
    this.fallenEl.style.border = '1px solid #662222';
    this.fallenEl.style.borderRadius = '6px';
    this.fallenEl.style.padding = '8px 12px';
    this.fallenEl.style.fontSize = '12px';
    this.fallenEl.style.color = '#ff8888';

    this.contentElement.appendChild(this.quoteEl);
    this.contentElement.appendChild(this.summaryEl);
    this.contentElement.appendChild(this.metaEl);
    this.contentElement.appendChild(this.listEl);
    this.contentElement.appendChild(this.fightsEl);
    this.contentElement.appendChild(this.idleEl);
    this.contentElement.appendChild(this.fallenEl);
  }

  /** Renders a report model and opens the window. */
  openReport(reportModel) {
    this.reportModel = reportModel;
    this.renderReport(reportModel);
    super.open();
  }

  /** The display name of a hero, from the report model. */
  heroNameOf(reportModel, heroId) {
    if (!heroId) return 'UNKNOWN';
    const summary = (reportModel.perHeroSummaries || []).find((s) => s.heroId === heroId);
    if (summary) return summary.heroName;
    const fallen = (reportModel.fallenHeroes || []).find((f) => f.heroId === heroId);
    if (fallen) return fallen.heroName;
    return heroId;
  }

  renderReport(reportModel) {
    if (!reportModel) {
      this.quoteEl.textContent = '';
      this.summaryEl.textContent = 'No report available.';
      this.metaEl.textContent = '';
      this.listEl.innerHTML = '';
      this.fightsEl.style.display = 'none';
      this.idleEl.style.display = 'none';
      this.fallenEl.style.display = 'none';
      return;
    }

    this.quoteEl.textContent = `"${reportModel.iselleQuote || pickLine('reportIntro')}"`;

    this.summaryEl.textContent = reportModel.summaryLine;

    this.metaEl.textContent =
      `${reportModel.gameDaysSimulated} game day(s) simulated` +
      `  |  Day ${reportModel.startDay} -> ${reportModel.endDay}`;

    // --- Per hero event cards ---------------------------------------------
    this.listEl.innerHTML = '';
    const summaries = (reportModel.perHeroSummaries || []).slice();
    summaries.sort((a, b) => (b.topEventImportance || 0) - (a.topEventImportance || 0));

    if (summaries.length === 0) {
      const empty = document.createElement('div');
      empty.textContent = 'No heroes to report on.';
      empty.style.color = '#777777';
      empty.style.fontStyle = 'italic';
      empty.style.textAlign = 'center';
      empty.style.padding = '18px';
      this.listEl.appendChild(empty);
    }

    for (const summary of summaries) {
      const card = document.createElement('div');
      card.style.backgroundColor = 'rgba(20, 20, 25, 0.7)';
      card.style.border = '1px solid #444450';
      card.style.borderRadius = '6px';
      card.style.padding = '8px 12px';

      const header = document.createElement('div');
      header.style.display = 'flex';
      header.style.justifyContent = 'space-between';
      header.style.alignItems = 'center';
      header.style.marginBottom = '4px';

      const name = document.createElement('div');
      name.innerHTML =
        `<span style="color:#ffffff; font-weight:bold;">${summary.heroName}</span> ` +
        `<span style="color:#888888;">${'★'.repeat(summary.star || 1)}</span> ` +
        `<span style="color:#8a8a99;">(${summary.heroClass || 'Unknown'})</span>`;

      const count = document.createElement('div');
      count.style.fontSize = '11px';
      count.style.color = '#8a8a99';
      count.textContent = `${summary.events.length} event(s)`;

      header.appendChild(name);
      header.appendChild(count);
      card.appendChild(header);

      for (const event of summary.events) {
        const line = document.createElement('div');
        line.style.fontSize = '12px';
        line.style.color = EVENT_COLORS[event.type] || '#cccccc';
        line.style.paddingLeft = '8px';
        line.style.borderLeft = `2px solid ${EVENT_COLORS[event.type] || '#444450'}`;
        line.style.marginTop = '3px';
        line.textContent = `Day ${event.day}: ${event.text}`;
        card.appendChild(line);
      }

      this.listEl.appendChild(card);
    }

    // --- The fights that happened -------------------------------------------
    const fights = reportModel.fightsSummary || [];
    if (fights.length > 0) {
      this.fightsEl.style.display = 'block';
      let html = '<span style="font-weight:bold;">FIGHTS:</span>';
      for (const fight of fights) {
        const attacker = this.heroNameOf(reportModel, fight.attackerId);
        const defender = this.heroNameOf(reportModel, fight.defenderId);
        const winner = fight.winnerId ? this.heroNameOf(reportModel, fight.winnerId) : 'NOBODY';
        const law = fight.lawBroken ? ' [LAW BROKEN]' : '';
        const stopped =
          fight.stoppedBy === 'iselle'
            ? ' - stopped by Iselle'
            : fight.stoppedBy === 'leader'
              ? ' - stopped by the Squad Leader'
              : fight.stoppedBy === 'flee'
                ? ' - one fighter fled'
                : '';
        const cost =
          fight.intimacyDelta !== undefined
            ? ` | Intimacy ${fight.intimacyDelta >= 0 ? '+' : ''}${fight.intimacyDelta}, Tension +${fight.tensionDelta}`
            : '';
        html +=
          `<div style="margin-top:3px;">Day ${fight.day}: ${attacker} vs ${defender} ` +
          `(${fight.exchanges} exchanges) - won by ${winner}${law}${stopped}${cost}</div>`;
      }
      this.fightsEl.innerHTML = html;
    } else {
      this.fightsEl.style.display = 'none';
    }

    // --- Heroes who did nothing -------------------------------------------
    const idleNames = reportModel.idleHeroNames || [];
    if (idleNames.length > 0) {
      this.idleEl.style.display = 'block';
      this.idleEl.innerHTML =
        `<span style="color:#777777; font-weight:bold;">DID NOTHING:</span> ` +
        `<span style="color:#999999;">${idleNames.join(', ')}</span>`;
    } else {
      this.idleEl.style.display = 'none';
    }

    // --- Fallen heroes ------------------------------------------------------
    const fallen = reportModel.fallenHeroes || [];
    if (fallen.length > 0) {
      this.fallenEl.style.display = 'block';
      let html = '<span style="font-weight:bold;">FALLEN:</span>';
      for (const dead of fallen) {
        const gear = dead.droppedItems && dead.droppedItems.length > 0
          ? ` (gear returned: ${dead.droppedItems.join(', ')})`
          : '';
        html += `<div style="margin-top:3px;">${dead.heroName} - ${dead.cause}${gear}</div>`;
      }
      this.fallenEl.innerHTML = html;
    } else {
      this.fallenEl.style.display = 'none';
    }
  }

  close() {
    super.close();
    if (this.onDismissCallback) {
      const cb = this.onDismissCallback;
      this.onDismissCallback = null;
      cb();
    }
  }
}
