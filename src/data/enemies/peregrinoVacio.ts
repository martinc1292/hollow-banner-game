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
  intentPattern: 'defensive',
  description: 'Un viajero sin destino. Cada tercer paso retrocede y se cubre.',
};
