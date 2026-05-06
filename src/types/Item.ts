import type { StatKey } from './Stats';

export enum ItemCategory {
  CONSUMABLE = 'CONSUMABLE',
  EQUIPMENT = 'EQUIPMENT',
  RELIC = 'RELIC',
  CURSED_RELIC = 'CURSED_RELIC',
}

export enum EquipmentSlot {
  WEAPON = 'WEAPON',
  ARMOR = 'ARMOR',
  AMULET = 'AMULET',
}

export enum Rarity {
  COMMON = 'COMMON',
  UNCOMMON = 'UNCOMMON',
  RARE = 'RARE',
  EPIC = 'EPIC',
  CURSED = 'CURSED',
}

export interface StatRequirement {
  stat: StatKey;
  minValue: number;
}

export type ItemEffectType =
  | 'stat_modifier'
  | 'resource_modifier'
  | 'on_combat_start'
  | 'on_kill'
  | 'passive_effect';

export interface ItemEffect {
  type: ItemEffectType;
  stat?: StatKey;
  amount?: number;
  description: string;
}

export interface ItemData {
  id: string;
  name: string;
  category: ItemCategory;
  rarity: Rarity;
  slot?: EquipmentSlot;
  requirements: StatRequirement[];
  setId?: string;
  effects: ItemEffect[];
  description: string;
  flavorText?: string;
}
