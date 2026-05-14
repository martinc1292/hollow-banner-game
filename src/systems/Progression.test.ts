import { describe, expect, test } from 'vitest';
import { registry } from '@/data/Registry';
import { Rarity } from '@/types';
import { createCharacterInstance } from './battle/BattleState';
import {
  awardXp,
  getCombatXp,
  rollCombatGold,
  rollItemDrop,
} from './Progression';

describe('Progression', () => {
  test('awards level ups and primary stat gains when XP crosses the threshold', () => {
    const vera = createCharacterInstance(registry.getCharacter('vera'));

    const result = awardXp([vera], 55);

    expect(result.levelUps).toMatchObject([
      {
        characterId: 'vera',
        fromLevel: 1,
        toLevel: 2,
        xpRemaining: 5,
        gainedStats: { hpMax: 5, attack: 1, speed: 0.5 },
      },
    ]);
    expect(vera.level).toBe(2);
    expect(vera.currentStats.hp).toBe(vera.currentStats.hpMax);
  });

  test('uses deterministic combat reward ranges by encounter type', () => {
    expect(getCombatXp('normal')).toBe(20);
    expect(getCombatXp('boss')).toBe(100);
    expect(rollCombatGold('normal', () => 0)).toBe(15);
    expect(rollCombatGold('normal', () => 0.999)).toBe(25);
  });

  test('rolls item drops from the selected rarity table', () => {
    const item = rollItemDrop(registry.getAllItems(), 'boss', () => 0);

    expect(item.rarity).toBe(Rarity.EPIC);
  });
});
