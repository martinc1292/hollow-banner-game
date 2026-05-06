import type { EnemyData } from '@/types';

export const bandidoHueco: EnemyData = {
  id: 'bandido_hueco',
  name: 'Bandido Hueco',
  baseStats: {
    hp: 30,
    hpMax: 30,
    attack: 7,
    power: 0,
    defense: 1,
    speed: 3,
    crit: 5,
    resistance: 5,
  },
  intentPattern: 'simple_attacker',
  description: 'Un bandido sin nombre, ojos hundidos. Va al primero que ve.',
};
