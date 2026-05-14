import {
  CharacterClass,
  CharacterData,
  PrimaryStat,
} from '@/types';

export const lyra: CharacterData = {
  id: 'lyra',
  name: 'Lyra, la Cazadora del Velo',
  className: CharacterClass.HUNTER,
  primaryStat: PrimaryStat.SPEED,
  baseStats: {
    hp: 50,
    hpMax: 50,
    attack: 5,
    power: 4,
    defense: 3,
    speed: 7,
    crit: 10,
    resistance: 10,
  },
  baseResources: {
    vigor: 0,
    vigorMax: 10,
    mana: 0,
    manaMax: 0,
  },
  usesMana: false,
  skillIds: [
    'lyra_basic',
    'lyra_marcar_presa',
    'lyra_flecha_ponzona',
    'lyra_disparo_aturdidor',
    'lyra_ult_caza',
    'lyra_native_marca',
    'lyra_passive_ojos',
  ],
  description:
    'Control y debuffs. Actúa primero, aplica Marcado y Veneno, y gana +20% de daño cuando lidera el round.',
};
