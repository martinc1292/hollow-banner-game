export interface SpecialCombatRewardConfig {
  goldOverride?: number;
  fixedRewardItemIds?: string[];
  actComplete?: boolean;
  demoComplete?: boolean;
  partyHealPercent?: number;
}

const SPECIAL_COMBAT_REWARDS: Record<string, SpecialCombatRewardConfig> = {
  act1_miniboss_pregonero: {
    goldOverride: 80,
    fixedRewardItemIds: ['marca_pregonero'],
  },
  act1_boss_padre_oxidado: {
    fixedRewardItemIds: ['yelmo_padre'],
    actComplete: true,
    demoComplete: true,
    partyHealPercent: 0.5,
  },
};

export function getSpecialCombatReward(encounterId: string): SpecialCombatRewardConfig {
  return SPECIAL_COMBAT_REWARDS[encounterId] ?? {};
}
