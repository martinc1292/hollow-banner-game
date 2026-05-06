import type { ItemCategory, Rarity } from './Item';
import type { StatKey } from './Stats';
import type { StatusEffectId } from './StatusEffect';

export type EventRequirement =
  | { type: 'gold'; amount: number }
  | { type: 'item'; itemId: string }
  | { type: 'character'; characterId: string }
  | { type: 'character_stat'; characterId: string; stat: StatKey; minValue: number };

export type EventEffect =
  | { type: 'gain_gold'; amount: number }
  | { type: 'lose_gold'; amount: number }
  | {
      type: 'gain_item';
      itemId?: string;
      category?: ItemCategory;
      rarity?: Rarity;
      relicOnly?: boolean;
    }
  | { type: 'lose_item'; itemId: string }
  | { type: 'gain_status_party'; statusId: StatusEffectId; stacks: number; duration: number }
  | { type: 'heal_party'; amount?: number; percent?: number }
  | { type: 'damage_party'; amount: number }
  | { type: 'modify_character_stat'; characterId: string; stat: StatKey; amount: number }
  | { type: 'modify_random_character_stat'; amount: number; stats: StatKey[] }
  | { type: 'skip_next_free_node' }
  | { type: 'recruit'; characterId: string }
  | { type: 'trigger_combat'; encounterId: string };

export interface EventOutcome {
  weight: number;
  resultText: string;
  effects: EventEffect[];
}

export interface EventOption {
  id: string;
  text: string;
  resultText: string;
  requirements?: EventRequirement[];
  effects?: EventEffect[];
  outcomes?: EventOutcome[];
}

export interface EventData {
  id: string;
  title: string;
  description: string;
  options: EventOption[];
}
