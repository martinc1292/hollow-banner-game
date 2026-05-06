import type { EncounterType } from '@/types';

export type MapNodeType =
  | 'normal'
  | 'elite'
  | 'event'
  | 'shop'
  | 'camp'
  | 'treasure'
  | 'miniboss'
  | 'boss'
  | 'special';

export interface MapNode {
  id: string;
  column: number;
  row: number;
  type: MapNodeType;
  connections: string[];
  completed: boolean;
  encounterId?: string;
  eventId?: string;
}

export function isCombatMapNodeType(type: MapNodeType): type is EncounterType {
  return type === 'normal' || type === 'elite' || type === 'miniboss' || type === 'boss';
}
