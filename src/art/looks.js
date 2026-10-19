import { PRESETS } from './presets.js';

function hashString(str) {
  let hash = 2166136261;
  const s = String(str || 'hero');
  for (let i = 0; i < s.length; i++) {
    hash ^= s.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash >>> 0);
}

function mulberry32(seed) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick(rng, arr) {
  return arr[Math.floor(rng() * arr.length)];
}

const SKIN_TONES = [0xf3d8c4, 0xe8c3a5, 0xd8a987, 0xbc8762, 0x8c5b3e, 0xf7e2d2];
const HAIR_COLORS = [0x141418, 0x2a211d, 0x453022, 0x6b3e26, 0xa85232, 0xc29b58, 0x6e7278, 0xdcd0b8];
const HAIR_STYLES = ['spiky', 'short', 'long', 'braid', 'ponytail', 'bowl', 'bald', 'messy'];
const FACE_STYLES = ['neutral', 'stern', 'young', 'old', 'fierce'];

const PAST_JOB_LOOKS = {
  mercenary: {
    top: 'vest',
    topColor: 0xc4b59d,
    vestColor: 0x2c221e,
    bottomColor: 0x242328,
    bootsColor: 0x181619,
    accentColor: 0x5a3d24,
  },
  farmer: {
    top: 'shirt',
    topColor: 0xdcd3c2,
    vestColor: 0x000000,
    bottomColor: 0x36322e,
    bootsColor: 0x2b221e,
    accentColor: 0x6b472e,
  },
  shopkeeper: {
    top: 'vest',
    topColor: 0xe8e4dc,
    vestColor: 0x47392f,
    bottomColor: 0x33363b,
    bootsColor: 0x2b221e,
    accentColor: 0x8c5b3e,
  },
  thief: {
    top: 'shirtRolled',
    topColor: 0x363338,
    vestColor: 0x000000,
    bottomColor: 0x1c1b20,
    bootsColor: 0x141418,
    accentColor: 0x2b2b36,
  },
  hunter: {
    top: 'tunic',
    topColor: 0x556852,
    vestColor: 0x47392f,
    bottomColor: 0x36322e,
    bootsColor: 0x2b221e,
    accentColor: 0x6b472e,
  },
  student: {
    top: 'shirt',
    topColor: 0xf5f3ee,
    vestColor: 0x000000,
    bottomColor: 0x262e38,
    bootsColor: 0x181619,
    accentColor: 0x3b4a62,
  },
  sailor: {
    top: 'shirtRolled',
    topColor: 0xe8e4dc,
    vestColor: 0x000000,
    bottomColor: 0x262e38,
    bootsColor: 0x181619,
    accentColor: 0x2d4868,
  },
  bard: {
    top: 'vest',
    topColor: 0xdcd3c2,
    vestColor: 0x8a394c,
    bottomColor: 0x36322e,
    bootsColor: 0x2b221e,
    accentColor: 0xb48a32,
  },
  bandit: {
    top: 'tunic',
    topColor: 0x47392f,
    vestColor: 0x000000,
    bottomColor: 0x242328,
    bootsColor: 0x181619,
    accentColor: 0x332822,
  },
  noble: {
    top: 'shirt',
    topColor: 0xf8f6f0,
    vestColor: 0x000000,
    bottomColor: 0x242328,
    bootsColor: 0x181619,
    accentColor: 0x96283c,
  },
  cook: {
    top: 'shirtRolled',
    topColor: 0xf2eee3,
    vestColor: 0x000000,
    bottomColor: 0x36322e,
    bootsColor: 0x2b221e,
    accentColor: 0x685444,
  },
  merchant: {
    top: 'vest',
    topColor: 0xe8e4dc,
    vestColor: 0x574332,
    bottomColor: 0x2b221e,
    bootsColor: 0x181619,
    accentColor: 0x946b38,
  },
};

/**
 * Generates or retrieves the canonical 'look' options object for a hero.
 */
export function generateLook(hero = {}) {
  const id = (hero.id || '').toLowerCase();
  const name = (hero.name || '').toLowerCase();

  // 1. Han Islat
  if (id === 'hero_han' || name.includes('han')) {
    return JSON.parse(JSON.stringify(PRESETS.han));
  }

  // 2. Jenna
  if (id === 'hero_jenna' || name.includes('jenna')) {
    return JSON.parse(JSON.stringify(PRESETS.jenna));
  }

  // 3. Aaron
  if (id === 'hero_aaron' || name.includes('aaron')) {
    return JSON.parse(JSON.stringify(PRESETS.aaron));
  }

  // 4. Tutorial Novices 1..4
  if (hero.noviceIndex === 1 || id === 'novice1') return JSON.parse(JSON.stringify(PRESETS.novice1));
  if (hero.noviceIndex === 2 || id === 'novice2') return JSON.parse(JSON.stringify(PRESETS.novice2));
  if (hero.noviceIndex === 3 || id === 'novice3') return JSON.parse(JSON.stringify(PRESETS.novice3));
  if (hero.noviceIndex === 4 || id === 'novice4') return JSON.parse(JSON.stringify(PRESETS.novice4));

  // 5. Named Hero: Shay Lannister
  if (id === 'hero_shay' || name.includes('shay')) {
    return {
      seed: 2001,
      heightScale: 1.0,
      build: 'average',
      skinTone: 0xf3d8c4,
      faceStyle: 'stern',
      hair: { style: 'short', color: 0xf5d77f },
      facialHair: 'none',
      outfit: {
        top: 'tunic',
        topColor: 0x486581,
        vestColor: 0x000000,
        bottom: 'trousers',
        bottomColor: 0x22262c,
        bootsColor: 0x1b1d22,
        accentColor: 0xc4b59d,
      },
      outline: true,
    };
  }

  // 6. Named Hero: Velkist
  if (id === 'hero_velkist' || name.includes('velkist')) {
    return {
      seed: 2002,
      heightScale: 1.08,
      build: 'muscular',
      skinTone: 0xd8a987,
      faceStyle: 'fierce',
      hair: { style: 'messy', color: 0x18161a },
      facialHair: 'stubble',
      outfit: {
        top: 'vest',
        topColor: 0x36322e,
        vestColor: 0x2c221e,
        bottom: 'trousers',
        bottomColor: 0x1c1b20,
        bootsColor: 0x181619,
        accentColor: 0x6b3e26,
      },
      outline: true,
    };
  }

  // 7. Named Hero: Eolka
  if (id === 'hero_eolka' || name.includes('eolka')) {
    return {
      seed: 2003,
      heightScale: 0.96,
      build: 'slim',
      skinTone: 0xf7e2d2,
      faceStyle: 'young',
      hair: { style: 'long', color: 0xd96aa7 },
      facialHair: 'none',
      outfit: {
        top: 'robe',
        topColor: 0x881122,
        vestColor: 0x5a111a,
        bottom: 'trousers',
        bottomColor: 0x26141a,
        bootsColor: 0x1a1215,
        accentColor: 0xd4af37,
      },
      outline: true,
    };
  }

  // 8. Named Hero: Sirris
  if (id === 'hero_sirris' || name.includes('sirris')) {
    return {
      seed: 2004,
      heightScale: 0.98,
      build: 'slim',
      skinTone: 0xf3d8c4,
      faceStyle: 'stern',
      hair: { style: 'ponytail', color: 0xcfd3dc },
      facialHair: 'none',
      outfit: {
        top: 'tunic',
        topColor: 0xd4af37,
        vestColor: 0x000000,
        bottom: 'trousers',
        bottomColor: 0x2a2a30,
        bootsColor: 0x1a1a1e,
        accentColor: 0xe8e4dc,
      },
      outline: true,
    };
  }

  // 9. Named Hero: Catio
  if (id === 'hero_catio' || name.includes('catio')) {
    return {
      seed: 2005,
      heightScale: 0.88,
      build: 'stocky',
      skinTone: 0xbc8762,
      faceStyle: 'neutral',
      hair: { style: 'short', color: 0x5a3d24 },
      facialHair: 'beard',
      outfit: {
        top: 'vest',
        topColor: 0xdcd3c2,
        vestColor: 0x8b5a2b,
        bottom: 'trousers',
        bottomColor: 0x2b221e,
        bootsColor: 0x181619,
        accentColor: 0x4a3728,
      },
      outline: true,
    };
  }

  // 10. All other heroes: seeded PRNG from hash(hero.id)
  const seed = hashString(hero.id || hero.name || 'hero_random');
  const rng = mulberry32(seed);

  // Class determines build
  const cls = (hero.class || '').toLowerCase();
  let build = 'average';
  if (cls.includes('vanguard') || cls.includes('knight') || cls.includes('tank')) {
    build = rng() < 0.5 ? 'stocky' : 'muscular';
  } else if (cls.includes('scout') || cls.includes('mage') || cls.includes('valkyrie')) {
    build = 'slim';
  } else if (cls.includes('berserker')) {
    build = 'muscular';
  } else if (cls.includes('healer') || cls.includes('priest')) {
    build = 'average';
  } else {
    // Novice or other
    build = pick(rng, ['slim', 'average', 'stocky', 'muscular']);
  }

  const heightScale = Math.round((0.92 + rng() * 0.16) * 100) / 100;
  const skinTone = pick(rng, SKIN_TONES);
  const faceStyle = pick(rng, FACE_STYLES);
  const hairStyle = pick(rng, HAIR_STYLES);
  const hairColor = hero.hair ? (typeof hero.hair === 'number' ? hero.hair : parseInt(hero.hair, 16)) : pick(rng, HAIR_COLORS);

  const hasBeard = rng() < 0.2;
  const facialHair = hasBeard ? pick(rng, ['stubble', 'beard', 'mustache']) : 'none';

  // Past job influences outfit
  const pj = (hero.pastJob || 'mercenary').toLowerCase();
  const pjOutfit = PAST_JOB_LOOKS[pj] || PAST_JOB_LOOKS.mercenary;

  return {
    seed,
    heightScale,
    build,
    skinTone,
    faceStyle,
    hair: {
      style: hairStyle,
      color: hairColor,
    },
    facialHair,
    outfit: {
      top: pjOutfit.top,
      topColor: pjOutfit.topColor,
      vestColor: pjOutfit.vestColor,
      bottom: 'trousers',
      bottomColor: pjOutfit.bottomColor,
      bootsColor: pjOutfit.bootsColor,
      accentColor: pjOutfit.accentColor,
    },
    outline: true,
  };
}
