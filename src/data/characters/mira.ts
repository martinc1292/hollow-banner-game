import {
  CharacterClass,
  CharacterData,
  PrimaryStat,
} from '@/types';

export const mira: CharacterData = {
  id: 'mira',
  name: 'Mira, la Hechicera de Cenizas',
  className: CharacterClass.SORCERESS,
  primaryStat: PrimaryStat.POWER,
  baseStats: {
    hp: 50,
    hpMax: 50,
    attack: 1,
    power: 8,
    defense: 2,
    speed: 5,
    crit: 5,
    resistance: 10,
  },
  baseResources: {
    vigor: 0,
    vigorMax: 8,
    mana: 5,
    manaMax: 10,
  },
  usesMana: true,
  skillIds: [
    'mira_basic',
    'mira_llamarada',
    'mira_tormenta',
    'mira_velo_humo',
    'mira_ult_pira',
    'mira_native_ceniza',
    'mira_passive_catalizadora',
  ],
  description:
    'Daño mágico AoE. Apila Quemadura y acumula Cenizas para detonarlas con su definitiva.',
};
