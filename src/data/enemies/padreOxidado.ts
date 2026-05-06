import type { EnemyData } from '@/types';

export const padreOxidado: EnemyData = {
  id: 'padre_oxidado',
  name: 'Padre Oxidado',
  baseStats: {
    hp: 200,
    hpMax: 200,
    attack: 10,
    power: 0,
    defense: 8,
    speed: 3,
    crit: 2,
    resistance: 25,
  },
  intentPattern: 'padre_oxidado',
  phaseTriggers: [
    { hpPercent: 50, phase: 2 },
  ],
  description: 'El ultimo guardian del Acto 1: blindado, paciente y brutal cuando se rompe.',
};
