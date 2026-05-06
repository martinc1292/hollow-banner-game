import type {
  CharacterData,
  CharacterInstance,
  EnemyData,
  EnemyInstance,
} from '@/types';

export type BattlePhase =
  | 'start_round'
  | 'player_turn'
  | 'enemy_turn'
  | 'end_round'
  | 'victory'
  | 'defeat';

export type Combatant = CharacterInstance | EnemyInstance;

/**
 * Per-battle volatile fields attached to every combatant. Lives on the instance
 * so DamageCalculator and BattleManager can read it without extra plumbing.
 */
export interface BattleRuntime {
  block: number;
  defendBonus: number;
  bramVigorGainedThisTurn: number;
}

declare module '@/types' {
  interface CharacterInstance {
    battle?: BattleRuntime;
  }
  interface EnemyInstance {
    battle?: BattleRuntime;
  }
}

export function ensureBattleRuntime(c: Combatant): BattleRuntime {
  if (!c.battle) {
    c.battle = { block: 0, defendBonus: 0, bramVigorGainedThisTurn: 0 };
  }
  return c.battle;
}

export class BattleState {
  party: CharacterInstance[] = [];
  enemies: EnemyInstance[] = [];
  currentRound = 0;
  turnQueue: Combatant[] = [];
  currentActorIndex = -1;
  phase: BattlePhase = 'start_round';

  initBattle(party: CharacterInstance[], enemies: EnemyInstance[]): void {
    this.party = party;
    this.enemies = enemies;
    this.currentRound = 1;
    this.turnQueue = [];
    this.currentActorIndex = -1;
    this.phase = 'start_round';
  }

  nextActor(): Combatant | null {
    this.currentActorIndex += 1;
    if (this.currentActorIndex >= this.turnQueue.length) {
      return null;
    }
    return this.turnQueue[this.currentActorIndex];
  }

  isPartyDefeated(): boolean {
    return this.party.every((c) => c.isDown);
  }

  areEnemiesDefeated(): boolean {
    return this.enemies.every((e) => e.isDown);
  }
}

export function createCharacterInstance(data: CharacterData): CharacterInstance {
  return {
    data,
    currentStats: { ...data.baseStats },
    currentResources: { ...data.baseResources },
    level: 1,
    xp: 0,
    equipment: { weapon: null, armor: null, amulet: null },
    statusEffects: [],
    isDown: false,
    battle: { block: 0, defendBonus: 0, bramVigorGainedThisTurn: 0 },
  };
}

export function createEnemyInstance(data: EnemyData): EnemyInstance {
  return {
    data,
    currentStats: { ...data.baseStats },
    statusEffects: [],
    intent: null,
    isDown: false,
    battle: { block: 0, defendBonus: 0, bramVigorGainedThisTurn: 0 },
  };
}
