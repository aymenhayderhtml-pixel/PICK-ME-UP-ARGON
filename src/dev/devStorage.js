// src/dev/devStorage.js
// Scenario configuration persistence (localStorage & JSON export/import)

const STORAGE_KEY = 'devlab_scenarios_v1';

export class DevStorage {
  static getSetupsMap() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      console.warn('[DevStorage] Failed to read localStorage', e);
      return {};
    }
  }

  static saveSetup(name, scenarioData) {
    if (!name) return false;
    const map = this.getSetupsMap();
    map[name] = {
      name,
      updatedAt: new Date().toISOString(),
      ...scenarioData,
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
      return true;
    } catch (e) {
      console.error('[DevStorage] Failed to save setup', e);
      return false;
    }
  }

  static loadSetup(name) {
    const map = this.getSetupsMap();
    return map[name] || null;
  }

  static deleteSetup(name) {
    const map = this.getSetupsMap();
    if (map[name]) {
      delete map[name];
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
        return true;
      } catch (e) {
        console.error('[DevStorage] Failed to update localStorage', e);
        return false;
      }
    }
    return false;
  }

  static listSetups() {
    const map = this.getSetupsMap();
    return Object.keys(map);
  }

  static exportJSON(setup) {
    if (!setup) return;
    const jsonStr = JSON.stringify(setup, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `devlab-setup-${(setup.name || 'scenario').replace(/\s+/g, '_')}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  static importJSON(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target.result);
          if (data && data.name) {
            this.saveSetup(data.name, data);
            resolve(data);
          } else {
            reject(new Error('Invalid scenario JSON structure: missing name'));
          }
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = reject;
      reader.readAsText(file);
    });
  }
}
