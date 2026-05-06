import type { Stats } from './Stats';
import type { StatusEffectId, StatusEffectInstance } from './StatusEffect';

export type EnemyIntentType = 'attack' | 'buff' | 'apply_status' | 'defend';

export type EnemyIntentTargetType =
  | 'single_ally'
  | 'highest_hp_ally'
  | 'lowest_speed_ally'
  | 'all_allies'
  | 'self'
  | 'random_enemy';

export interface EnemyIntent {
  type: EnemyIntentType;
  targetType: EnemyIntentTargetType;
  value: number;
  description: string;
  statusId?: StatusEffectId;
  statusTargetType?: EnemyIntentTargetType;
  hits?: number;
  block?: number;
  defendBonus?: number;
  forceCrit?: boolean;
}

export interface HpThreshold {
  hpPercent: number;
  phase: number;
}

export interface EnemyData {
  id: string;
  name: string;
  baseStats: Stats;
  intentPattern: string;
  description: string;
  phaseTriggers?: HpThreshold[];
}

export interface EnemyInstance {
  data: EnemyData;
  currentStats: Stats;
  statusEffects: StatusEffectInstance[];
  intent: EnemyIntent | null;
  block: number;
  isDown: boolean;
  phase: number;
  phaseTriggers: HpThreshold[];
  aiState: Record<string, boolean | number | string>;
}
