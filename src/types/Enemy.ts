import type { Stats } from './Stats';
import type { StatusEffectInstance } from './StatusEffect';

export type EnemyIntentType = 'attack' | 'buff' | 'apply_status' | 'defend';

export type EnemyIntentTargetType = 'single_ally' | 'all_allies' | 'self' | 'random_enemy';

export interface EnemyIntent {
  type: EnemyIntentType;
  targetType: EnemyIntentTargetType;
  value: number;
  description: string;
}

export interface EnemyData {
  id: string;
  name: string;
  baseStats: Stats;
  intentPattern: string;
  description: string;
}

export interface EnemyInstance {
  data: EnemyData;
  currentStats: Stats;
  statusEffects: StatusEffectInstance[];
  intent: EnemyIntent | null;
  isDown: boolean;
}
