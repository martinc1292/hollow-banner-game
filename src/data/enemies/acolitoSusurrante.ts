import type { EnemyData } from '@/types';

export const acolitoSusurrante: EnemyData = {
  id: 'acolito_susurrante',
  name: 'Acólito Susurrante',
  baseStats: {
    hp: 26,
    hpMax: 26,
    attack: 2,
    power: 5,
    defense: 1,
    speed: 4,
    crit: 4,
    resistance: 8,
  },
  intentPattern: 'caster',
  description: 'Murmura maldiciones. Debilita antes de golpear.',
};
