import {
  CharacterClass,
  CharacterData,
  PrimaryStat,
} from '@/types';

export const aren: CharacterData = {
  id: 'aren',
  name: 'Aren, la Sacerdotisa Silenciosa',
  className: CharacterClass.PRIEST,
  primaryStat: PrimaryStat.POWER,
  baseStats: {
    hp: 55,
    hpMax: 55,
    attack: 2,
    power: 6,
    defense: 4,
    speed: 5,
    crit: 5,
    resistance: 15,
  },
  baseResources: {
    vigor: 2,
    vigorMax: 10,
    mana: 0,
    manaMax: 0,
  },
  usesMana: false,
  skillIds: [
    'aren_basic',
    'aren_mano_luz',
    'aren_purgar',
    'aren_aura_vigor',
    'aren_ult_coro',
    'aren_native_voto',
    'aren_passive_susurro',
  ],
  description:
    'Soporte y curación. Gana Vigor al curar aliados y puede revivir a un compañero caído una vez por combate.',
};
