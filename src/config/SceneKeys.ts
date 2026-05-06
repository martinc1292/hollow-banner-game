export const SceneKeys = {
  BOOT: 'BootScene',
  MAIN_MENU: 'MainMenuScene',
  PARTY_SELECT: 'PartySelectScene',
  MAP: 'MapScene',
  INVENTORY: 'InventoryScene',
  SHOP: 'ShopScene',
  CAMP: 'CampScene',
  TREASURE: 'TreasureScene',
  EVENT: 'EventScene',
  BATTLE: 'BattleScene',
  REWARD: 'RewardScene',
  GAME_OVER: 'GameOverScene',
  DEMO_COMPLETE: 'DemoCompleteScene',
} as const;

export type SceneKey = (typeof SceneKeys)[keyof typeof SceneKeys];
