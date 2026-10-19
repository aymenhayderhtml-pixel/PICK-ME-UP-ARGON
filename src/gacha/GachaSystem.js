import { gameState } from '../core/GameState.js';
import { generateRandomHero, HERO_TEMPLATES } from '../data/heroes.js';

export class GachaSystem {
  constructor() {
    this.history = []; // History of last 10 pulls: { name, star, class }
  }

  rollSingleStar(guaranteeMinStar = 1) {
    const r = Math.random();
    let star = 1;

    if (r < 0.003) {
      star = 5; // 0.3%
    } else if (r < 0.018) {
      star = 4; // 1.5%
    } else if (r < 0.080) {
      star = 3; // 6.2%
    } else if (r < 0.320) {
      star = 2; // 24%
    } else {
      star = 1; // 68%
    }

    if (star < guaranteeMinStar) {
      star = guaranteeMinStar;
    }

    return star;
  }

  createHeroForStar(star) {
    const ownedIds = new Set(gameState.heroes.map((h) => h.id));

    // 1/20 chance for named hero
    const isNamedChance = Math.random() < 0.05;

    if (isNamedChance) {
      if (star === 1 && !ownedIds.has('hero_velkist')) {
        const t = HERO_TEMPLATES.VELKIST;
        return {
          id: t.id,
          name: t.name,
          star: t.star,
          level: 1,
          exp: 0,
          fatigue: 0,
          class: t.class,
          hair: t.hair,
          armor: t.armor,
          weapon: t.weapon,
          personality: t.personality,
          stats: { ...t.baseStats },
          skills: t.skills.map((s) => ({ ...s, exp: 0 })),
          talents: [...t.talents],
          alive: true,
        };
      } else if (star === 3 && !ownedIds.has('hero_catio') && Math.random() < 0.1) {
        const t = HERO_TEMPLATES.CATIO;
        return {
          id: t.id,
          name: t.name,
          star: t.star,
          level: 1,
          exp: 0,
          fatigue: 0,
          class: t.class,
          hair: t.hair,
          armor: t.armor,
          weapon: t.weapon,
          scale: t.scale || 0.85,
          isDwarf: true,
          personality: t.personality,
          stats: { ...t.baseStats },
          skills: t.skills.map((s) => ({ ...s, exp: 0 })),
          talents: [...t.talents],
          alive: true,
        };
      } else if (star === 4) {
        const unownedNamed = [];
        if (!ownedIds.has('hero_eolka')) unownedNamed.push(HERO_TEMPLATES.EOLKA);
        if (!ownedIds.has('hero_sirris')) unownedNamed.push(HERO_TEMPLATES.SIRRIS);

        if (unownedNamed.length > 0) {
          const t = unownedNamed[Math.floor(Math.random() * unownedNamed.length)];
          return {
            id: t.id,
            name: t.name,
            star: t.star,
            level: 1,
            exp: 0,
            fatigue: 0,
            class: t.class,
            hair: t.hair,
            armor: t.armor,
            weapon: t.weapon,
            personality: t.personality,
            stats: { ...t.baseStats },
            skills: t.skills.map((s) => ({ ...s, exp: 0 })),
            talents: [...t.talents],
            alive: true,
          };
        }
      }
    }

    // Default: procedurally generate unique hero
    const existing = (gameState.heroes || []).concat(gameState.deadHeroes || []);
    return generateRandomHero(star, Math.random, existing);
  }

  canAfford(count) {
    if (count === 1) {
      return gameState.freeTickets >= 1 || gameState.gems >= 100;
    } else if (count === 10) {
      return gameState.gems >= 900;
    }
    return false;
  }

  pull(count = 1) {
    if (!this.canAfford(count)) {
      return { error: 'Not enough gems or tickets' };
    }

    // Deduct currency
    if (count === 1) {
      if (gameState.freeTickets >= 1) {
        gameState.freeTickets -= 1;
      } else {
        gameState.gems -= 100;
      }
    } else if (count === 10) {
      gameState.gems -= 900;
    }

    // Roll stars
    const stars = [];
    for (let i = 0; i < count; i++) {
      stars.push(this.rollSingleStar(1));
    }

    // 10-pull guarantee: at least one 2-star or higher
    if (count === 10) {
      const has2StarPlus = stars.some((s) => s >= 2);
      if (!has2StarPlus) {
        const replaceIdx = Math.floor(Math.random() * 10);
        stars[replaceIdx] = this.rollSingleStar(2);
      }
    }

    // Instantiate heroes and add to gameState
    const results = [];
    for (const star of stars) {
      const hero = this.createHeroForStar(star);
      gameState.addHero(hero);
      results.push(hero);

      // Record in recent history
      this.history.unshift({
        name: hero.name,
        star: hero.star,
        class: hero.class,
      });
    }

    // Limit history to 10
    if (this.history.length > 10) {
      this.history = this.history.slice(0, 10);
    }

    gameState.saveToLocalStorage();
    return { success: true, heroes: results };
  }
}

export const gachaSystem = new GachaSystem();
