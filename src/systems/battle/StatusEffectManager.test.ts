import { describe, expect, test } from 'vitest';
import { registry } from '@/data/Registry';
import { StatusEffectId, TriggerTiming } from '@/types';
import { BattleState, createCharacterInstance, createEnemyInstance } from './BattleState';
import { StatusEffectManager } from './StatusEffectManager';

describe('StatusEffectManager', () => {
  test('resists negative statuses using the target resistance stat', () => {
    const state = new BattleState();
    const target = createCharacterInstance(registry.getCharacter('bram'));
    target.currentStats.resistance = 100;
    const manager = new StatusEffectManager(state, () => 0);

    const result = manager.applyEffect(target, StatusEffectId.POISON, 3, 2);

    expect(result.applied).toBe(false);
    expect(result.resisted).toBe(true);
    expect(target.statusEffects).toHaveLength(0);
  });

  test('applies poison damage on turn start and decays stacks at round end', () => {
    const state = new BattleState();
    const target = createEnemyInstance(registry.getEnemy('bandido_hueco'));
    target.currentStats.resistance = 0;
    state.enemies = [target];
    const manager = new StatusEffectManager(state, () => 0.99);

    manager.applyEffect(target, StatusEffectId.POISON, 3, 2);
    const ticks = manager.tickAtTiming(target, TriggerTiming.TURN_START);
    const roundEnd = manager.tickRoundEnd();

    expect(ticks).toMatchObject([{ kind: 'damage', amount: 3, stacks: 3 }]);
    expect(target.currentStats.hp).toBe(target.data.baseStats.hp - 3);
    expect(roundEnd).toMatchObject([{ kind: 'stack_decay', amount: 1, stacks: 2 }]);
    expect(target.statusEffects).toMatchObject([{ id: StatusEffectId.POISON, stacks: 2, duration: 1 }]);
  });
});
