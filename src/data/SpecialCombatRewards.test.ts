import { describe, expect, test } from 'vitest';
import { getSpecialCombatReward } from './SpecialCombatRewards';

describe('getSpecialCombatReward', () => {
  test('keeps fixed miniboss and boss rewards outside BattleScene', () => {
    expect(getSpecialCombatReward('act1_miniboss_pregonero')).toMatchObject({
      goldOverride: 80,
      fixedRewardItemIds: ['marca_pregonero'],
    });
    expect(getSpecialCombatReward('act1_boss_padre_oxidado')).toMatchObject({
      fixedRewardItemIds: ['yelmo_padre'],
      actComplete: true,
      demoComplete: true,
      partyHealPercent: 0.5,
    });
    expect(getSpecialCombatReward('act1_normal_bandit_pair')).toEqual({});
  });
});
