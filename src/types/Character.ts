import type { Stats, Resources } from './Stats';
import type { StatusEffectInstance } from './StatusEffect';

export enum CharacterClass {
  KNIGHT = 'KNIGHT',
  MERCENARY = 'MERCENARY',
  SORCERESS = 'SORCERESS',
  PRIEST = 'PRIEST',
  HUNTER = 'HUNTER',
}

export enum PrimaryStat {
  ATTACK = 'ATTACK',
  POWER = 'POWER',
  DEFENSE = 'DEFENSE',
  SPEED = 'SPEED',
}

export interface CharacterData {
  id: string;
  name: string;
  className: CharacterClass;
  primaryStat: PrimaryStat;
  baseStats: Stats;
  baseResources: Resources;
  usesMana: boolean;
  skillIds: string[];
  description: string;
}

export interface CharacterEquipment {
  weapon: string | null;
  armor: string | null;
  amulet: string | null;
}

export interface CharacterInstance {
  data: CharacterData;
  currentStats: Stats;
  currentResources: Resources;
  level: number;
  xp: number;
  equipment: CharacterEquipment;
  statusEffects: StatusEffectInstance[];
  block: number;
  isDown: boolean;
}
