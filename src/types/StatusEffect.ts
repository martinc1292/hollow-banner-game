export enum StatusEffectId {
  BLEED = 'BLEED',
  BURN = 'BURN',
  POISON = 'POISON',
  STUN = 'STUN',
  MARKED = 'MARKED',
  PROTECTED = 'PROTECTED',
  INSPIRED = 'INSPIRED',
  VULNERABLE = 'VULNERABLE',
  REGEN = 'REGEN',
  WEAKENED = 'WEAKENED',
}

export enum TriggerTiming {
  TURN_START = 'TURN_START',
  TURN_END = 'TURN_END',
  ON_ACT = 'ON_ACT',
  ON_DAMAGE_TAKEN = 'ON_DAMAGE_TAKEN',
  ON_DAMAGE_DEALT = 'ON_DAMAGE_DEALT',
}

export interface StatusEffectData {
  id: StatusEffectId;
  name: string;
  description: string;
  stackable: boolean;
  maxStacks: number | null;
  triggerTiming: TriggerTiming;
  isNegative: boolean;
}

export interface StatusEffectInstance {
  id: StatusEffectId;
  stacks: number;
  duration: number;
}
