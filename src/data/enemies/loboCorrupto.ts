import type { EnemyData } from '@/types';

export const loboCorrupto: EnemyData = {
  id: 'lobo_corrupto',
  name: 'Lobo Corrupto',
  baseStats: {
    hp: 24,
    hpMax: 24,
    attack: 5,
    power: 0,
    defense: 0,
    speed: 7,
    crit: 10,
    resistance: 0,
  },
  intentPattern: 'bleeder',
  description: 'Un lobo cuya mordida pudre la carne. Veloz y cruel.',
};
