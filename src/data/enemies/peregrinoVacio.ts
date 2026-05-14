import type { EnemyData } from '@/types';

export const peregrinoVacio: EnemyData = {
  id: 'peregrino_vacio',
  name: 'Peregrino Vacío',
  baseStats: {
    hp: 30,
    hpMax: 30,
    attack: 3,
    power: 0,
    defense: 4,
    speed: 2,
    crit: 3,
    resistance: 8,
  },
  intentPattern: 'healer_support',
  description: 'Un viajero sin destino. Cura a sus aliados con plegarias, pero ataca cuando acorralan al grupo.',
};
