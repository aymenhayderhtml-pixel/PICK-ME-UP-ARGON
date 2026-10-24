import { RANGED_ANIMATIONS } from './rangedAnims.js';
import { BLUNT_ANIMATIONS } from './bluntAnims.js';

export const RANGED_AND_BLUNT_ANIMATIONS = {
  ...RANGED_ANIMATIONS,
  ...BLUNT_ANIMATIONS
};

export { RANGED_ANIMATIONS, BLUNT_ANIMATIONS };