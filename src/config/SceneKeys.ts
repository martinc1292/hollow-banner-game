export const SceneKeys = {
  BOOT: 'BootScene',
  MAIN_MENU: 'MainMenuScene',
  PARTY_SELECT: 'PartySelectScene',
  MAP: 'MapScene',
  BATTLE: 'BattleScene',
  REWARD: 'RewardScene',
  GAME_OVER: 'GameOverScene',
} as const;

export type SceneKey = (typeof SceneKeys)[keyof typeof SceneKeys];
