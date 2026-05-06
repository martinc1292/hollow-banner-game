import type { Encounter } from '@/types';

export const act1Encounters: Encounter[] = [
  {
    id: 'act1_normal_bandit_pair',
    type: 'normal',
    enemies: ['bandido_hueco', 'bandido_hueco'],
    actNumber: 1,
    difficulty: 2,
  },
  {
    id: 'act1_normal_wolf_and_crow',
    type: 'normal',
    enemies: ['lobo_corrupto', 'cuervo_carronero'],
    actNumber: 1,
    difficulty: 3,
  },
  {
    id: 'act1_normal_empty_road',
    type: 'normal',
    enemies: ['peregrino_vacio', 'bandido_hueco'],
    actNumber: 1,
    difficulty: 3,
  },
  {
    id: 'act1_normal_whispering_cult',
    type: 'normal',
    enemies: ['acolito_susurrante', 'cuervo_carronero', 'cuervo_carronero'],
    actNumber: 1,
    difficulty: 4,
  },
  {
    id: 'act1_normal_corrupted_pack',
    type: 'normal',
    enemies: ['lobo_corrupto', 'lobo_corrupto', 'bandido_hueco'],
    actNumber: 1,
    difficulty: 4,
  },
  {
    id: 'act1_elite_rusted_guardian',
    type: 'elite',
    enemies: ['guardian_oxidado'],
    actNumber: 1,
    difficulty: 6,
  },
  {
    id: 'act1_elite_cult_escort',
    type: 'elite',
    enemies: ['acolito_susurrante', 'peregrino_vacio', 'bandido_hueco'],
    actNumber: 1,
    difficulty: 7,
  },
  {
    id: 'act1_miniboss_pregonero',
    type: 'miniboss',
    enemies: ['el_pregonero'],
    actNumber: 1,
    difficulty: 8,
  },
  {
    id: 'act1_boss_padre_oxidado',
    type: 'boss',
    enemies: ['padre_oxidado'],
    actNumber: 1,
    difficulty: 10,
  },
];
