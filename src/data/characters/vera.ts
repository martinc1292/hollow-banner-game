import {
  CharacterClass,
  CharacterData,
  PrimaryStat,
} from '@/types';

export const vera: CharacterData = {
  id: 'vera',
  name: 'Vera, la Mercenaria del Hierro Negro',
  className: CharacterClass.MERCENARY,
  primaryStat: PrimaryStat.ATTACK,
  baseStats: {
    hp: 60,
    hpMax: 60,
    attack: 8,
    power: 1,
    defense: 3,
    speed: 6,
    crit: 5,
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
    'vera_basic',
    'vera_tajo_doble',
    'vera_corte_profundo',
    'vera_danza_acero',
    'vera_ult_carniceria',
    'vera_native_sed',
    'vera_passive_frenesi',
  ],
  description:
    'DPS físico sostenido. Apila Sangrado, golpea múltiples veces y persigue kills para encadenar turnos.',
};
