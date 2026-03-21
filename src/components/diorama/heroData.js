import { HERO_DIORAMAS_CRUSADER } from './heroData.crusader.js';
import { HERO_DIORAMAS_ANCIENT } from './heroData.ancient.js';
import { HERO_DIORAMAS_BRITISH } from './heroData.british.js';
import { HERO_DIORAMAS_CITY } from './heroData.city.js';
import { HERO_DIORAMAS_JAPANESE } from './heroData.japanese.js';

export const HERO_DIORAMAS = {
  ...HERO_DIORAMAS_ANCIENT,
  ...HERO_DIORAMAS_CRUSADER,
  ...HERO_DIORAMAS_BRITISH,
  ...HERO_DIORAMAS_CITY,
  ...HERO_DIORAMAS_JAPANESE,
};
