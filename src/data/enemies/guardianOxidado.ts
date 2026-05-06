import type { EnemyData } from '@/types';

export const guardianOxidado: EnemyData = {
  id: 'guardian_oxidado',
  name: 'Guardián Oxidado',
  baseStats: {
    hp: 52,
    hpMax: 52,
    attack: 8,
    power: 0,
    defense: 5,
    speed: 2,
    crit: 3,
    resistance: 10,
  },
  intentPattern: 'simple_attacker',
  description: 'Una armadura que sigue en pie por inercia. Golpea fuerte, sin descanso.',
};
