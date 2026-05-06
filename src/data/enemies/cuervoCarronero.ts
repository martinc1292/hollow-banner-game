import type { EnemyData } from '@/types';

export const cuervoCarronero: EnemyData = {
  id: 'cuervo_carronero',
  name: 'Cuervo Carroñero',
  baseStats: {
    hp: 18,
    hpMax: 18,
    attack: 6,
    power: 0,
    defense: 0,
    speed: 8,
    crit: 14,
    resistance: 0,
  },
  intentPattern: 'random_target_attacker',
  description: 'Picotea al azar. Pequeño pero impredecible.',
};
