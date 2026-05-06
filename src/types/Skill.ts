import type { StatKey } from './Stats';

export enum SkillType {
  ACTIVE = 'ACTIVE',
  PASSIVE = 'PASSIVE',
  NATIVE = 'NATIVE',
  ULTIMATE = 'ULTIMATE',
}

export enum SkillTarget {
  SELF = 'SELF',
  SINGLE_ALLY = 'SINGLE_ALLY',
  ALL_ALLIES = 'ALL_ALLIES',
  SINGLE_ENEMY = 'SINGLE_ENEMY',
  ALL_ENEMIES = 'ALL_ENEMIES',
  RANDOM_ENEMIES = 'RANDOM_ENEMIES',
}

export enum ResourceCost {
  VIGOR = 'VIGOR',
  MANA = 'MANA',
}

export type SkillEffectType =
  | 'damage'
  | 'heal'
  | 'apply_status'
  | 'buff'
  | 'block'
  | 'gain_resource';

export interface SkillEffect {
  type: SkillEffectType;
  amount?: number;
  statusId?: string;
  stacks?: number;
  scalingStat?: StatKey;
  scalingMultiplier?: number;
}

export interface SkillData {
  id: string;
  name: string;
  type: SkillType;
  costType: ResourceCost | null;
  costAmount: number;
  target: SkillTarget;
  effects: SkillEffect[];
  description: string;
  characterId: string;
  improvedVersion?: SkillData;
}
