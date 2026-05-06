import type { EnemyData } from '@/types';

export const elPregonero: EnemyData = {
  id: 'el_pregonero',
  name: 'El Pregonero',
  baseStats: {
    hp: 80,
    hpMax: 80,
    attack: 6,
    power: 5,
    defense: 3,
    speed: 4,
    crit: 5,
    resistance: 15,
  },
  intentPattern: 'pregonero',
  description: 'Un heraldo quebrado que convierte cada sentencia en una marca de muerte.',
};
