import { describe, expect, test } from 'vitest';
import { registry } from '@/data/Registry';
import { StatusEffectId } from '@/types';
import { createCharacterInstance } from './BattleState';
import { calculateDamage } from './DamageCalculator';

describe('calculateDamage', () => {
  test('always deals at least 1 damage after defense', () => {
    const attacker = createCharacterInstance(registry.getCharacter('mira'));
    const target = createCharacterInstance(registry.getCharacter('bram'));

    const result = calculateDamage(attacker, target, 0, 'physical', { rng: () => 0.99 });

    expect(result.finalDamage).toBe(1);
    expect(result.wasCrit).toBe(false);
  });

  test('absorbs incoming damage with block before HP damage', () => {
    const attacker = createCharacterInstance(registry.getCharacter('vera'));
    const target = createCharacterInstance(registry.getCharacter('mira'));
    target.block = 5;

    const result = calculateDamage(attacker, target, 10, 'physical', { rng: () => 0.99 });

    expect(result.blocked).toBe(5);
    expect(target.block).toBe(0);
    expect(result.finalDamage).toBe(11);
  });

  test('marked targets receive a guaranteed critical hit and consume the mark', () => {
    const attacker = createCharacterInstance(registry.getCharacter('vera'));
    const target = createCharacterInstance(registry.getCharacter('mira'));
    target.statusEffects.push({ id: StatusEffectId.MARKED, stacks: 1, duration: 1 });

    const result = calculateDamage(attacker, target, 10, 'physical', { rng: () => 0.99 });

    expect(result.wasCrit).toBe(true);
    expect(result.consumedMark).toBe(true);
    expect(target.statusEffects.some((status) => status.id === StatusEffectId.MARKED)).toBe(false);
  });
});
