import type { ResourceCost, SkillData } from '@/types';
import type { BattleState, Combatant } from './BattleState';
import type { DamageResult } from './DamageCalculator';

export enum PassiveHookType {
  ON_DAMAGE_DEALT = 'ON_DAMAGE_DEALT',
  ON_DAMAGE_TAKEN = 'ON_DAMAGE_TAKEN',
  ON_KILL = 'ON_KILL',
  ON_TURN_START = 'ON_TURN_START',
  ON_HP_THRESHOLD = 'ON_HP_THRESHOLD',
  ON_RESOURCE_SPENT = 'ON_RESOURCE_SPENT',
  ON_ALLY_DOWN = 'ON_ALLY_DOWN',
}

export interface PassiveHookContext {
  state: BattleState;
  actor?: Combatant;
  source?: Combatant;
  target?: Combatant;
  killedUnit?: Combatant;
  skill?: SkillData;
  damageResult?: DamageResult;
  resourceSpent?: number;
  resourceType?: ResourceCost | null;
}

export type PassiveHookCallback = (context: PassiveHookContext) => void;

interface RegisteredPassiveHook {
  characterId: string;
  callback: PassiveHookCallback;
}

export class PassiveHooks {
  private readonly hooks = new Map<PassiveHookType, RegisteredPassiveHook[]>();

  register(
    characterId: string,
    hookType: PassiveHookType,
    callback: PassiveHookCallback,
  ): void {
    const existing = this.hooks.get(hookType) ?? [];
    existing.push({ characterId, callback });
    this.hooks.set(hookType, existing);
  }

  trigger(hookType: PassiveHookType, context: PassiveHookContext): void {
    const hooks = this.hooks.get(hookType) ?? [];
    for (const hook of hooks) {
      hook.callback(context);
    }
  }

  clear(): void {
    this.hooks.clear();
  }
}
