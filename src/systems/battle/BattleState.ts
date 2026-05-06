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

export function isCharacterInstance(c: Combatant): c is CharacterInstance {
  return 'currentResources' in c;
}

/**
 * Per-battle volatile fields attached to every combatant. Lives on the instance
 * so DamageCalculator and BattleManager can read it without extra plumbing.
 */
export interface BattleRuntime {
  defendBonus: number;
  bramVigorGainedThisTurn: number;
  bramVotoTriggered: boolean;
  bramVotoDefenseBonus: number;
  veraSedTriggered: boolean;
  /** Provocar: redirige el próximo ataque enemigo a este combatiente. */
  tauntActive: boolean;
  tauntCharges: number;
  skipTurnOnce: boolean;
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
  if (typeof c.block !== 'number') {
    c.block = 0;
  }

  if (!c.battle) {
    c.battle = createBattleRuntime();
  }
  return c.battle;
}

function createBattleRuntime(): BattleRuntime {
  return {
    defendBonus: 0,
    bramVigorGainedThisTurn: 0,
    bramVotoTriggered: false,
    bramVotoDefenseBonus: 0,
    veraSedTriggered: false,
    tauntActive: false,
    tauntCharges: 0,
    skipTurnOnce: false,
  };
}

export function resetBattleRuntime(c: Combatant): void {
  c.block = 0;
  c.battle = createBattleRuntime();
}

export class BattleState {
  party: CharacterInstance[] = [];
  enemies: EnemyInstance[] = [];
  ashes = 0;
  currentRound = 0;
  turnQueue: Combatant[] = [];
  currentActorIndex = -1;
  phase: BattlePhase = 'start_round';

  initBattle(party: CharacterInstance[], enemies: EnemyInstance[]): void {
    this.party = party;
    this.enemies = enemies;
    this.ashes = 0;
    this.currentRound = 1;
    this.turnQueue = [];
    this.currentActorIndex = -1;
    this.phase = 'start_round';
    [...this.party, ...this.enemies].forEach(resetBattleRuntime);
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
    block: 0,
    isDown: false,
    battle: createBattleRuntime(),
  };
}

export function createEnemyInstance(data: EnemyData): EnemyInstance {
  return {
    data,
    currentStats: { ...data.baseStats },
    statusEffects: [],
    intent: null,
    block: 0,
    isDown: false,
    phase: 1,
    phaseTriggers: data.phaseTriggers?.map((trigger) => ({ ...trigger })) ?? [],
    aiState: {},
    battle: createBattleRuntime(),
  };
}
