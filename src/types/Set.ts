import type { ItemEffect } from './Item';

export interface SetBonus {
  piecesRequired: number;
  effects: ItemEffect[];
  description: string;
}

export interface SetData {
  id: string;
  name: string;
  description: string;
  flavorText?: string;
  itemIds: string[];
  bonuses: SetBonus[];
}
