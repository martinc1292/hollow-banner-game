import {
  CharacterClass,
  CharacterData,
  PrimaryStat,
} from '@/types';

export const bram: CharacterData = {
  id: 'bram',
  name: 'Bram, el Caballero Caído',
  className: CharacterClass.KNIGHT,
  primaryStat: PrimaryStat.DEFENSE,
  baseStats: {
    hp: 80,
    hpMax: 80,
    attack: 4,
    power: 1,
    defense: 6,
    speed: 4,
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
    'bram_basic',
    'bram_provocar',
    'bram_escudo_hierro',
    'bram_embestida',
    'bram_ult_estandarte',
    'bram_native_juramento',
    'bram_passive_voto',
  ],
  description:
    'Tanque pesado. Aguanta golpes, controla el aggro y reparte Vigor cuando sus aliados sangran.',
};
