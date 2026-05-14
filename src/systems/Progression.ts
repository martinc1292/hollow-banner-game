import {
  PrimaryStat,
  Rarity,
  type CharacterInstance,
  type EncounterType,
  type ItemData,
  type StatKey,
  type Stats,
} from '@/types';

export const ProgressionEvents = {
  LEVEL_UP: 'level_up',
} as const;

type ProgressionEventName = typeof ProgressionEvents[keyof typeof ProgressionEvents];
type ProgressionListener = (payload: LevelUpResult) => void;

class ProgressionEventEmitter {
  private listeners = new Map<ProgressionEventName, Set<ProgressionListener>>();

  on(eventName: ProgressionEventName, listener: ProgressionListener): this {
    const listeners = this.listeners.get(eventName) ?? new Set<ProgressionListener>();
    listeners.add(listener);
    this.listeners.set(eventName, listeners);
    return this;
  }

  off(eventName: ProgressionEventName, listener: ProgressionListener): this {
    this.listeners.get(eventName)?.delete(listener);
    return this;
  }

  emit(eventName: ProgressionEventName, payload: LevelUpResult): boolean {
    const listeners = this.listeners.get(eventName);
    if (!listeners || listeners.size === 0) return false;

    for (const listener of listeners) {
      listener(payload);
    }
    return true;
  }
}

export const progressionEvents = new ProgressionEventEmitter();

export interface LevelUpResult {
  characterId: string;
  characterName: string;
  fromLevel: number;
  toLevel: number;
  gainedStats: Partial<Stats>;
  xpRemaining: number;
  nextLevelXp: number;
}

export interface AwardXpResult {
  xpAwarded: number;
  levelUps: LevelUpResult[];
}

export interface CombatRewardSummary {
  encounterId: string;
  encounterType: EncounterType;
  xpGained: number;
  goldGained: number;
  levelUps: LevelUpResult[];
  fixedRewardItemIds?: string[];
  actComplete?: boolean;
  demoComplete?: boolean;
  partyHealPercent?: number;
}

export interface PermanentStatReward {
  characterId: string;
  characterName: string;
  stat: StatKey;
  amount: number;
}

const XP_BY_ENCOUNTER: Record<EncounterType, number> = {
  normal: 20,
  elite: 40,
  miniboss: 60,
  boss: 100,
};

const GOLD_BY_ENCOUNTER: Record<EncounterType, [number, number]> = {
  normal: [15, 25],
  elite: [30, 50],
  miniboss: [60, 60],
  boss: [100, 100],
};

const DROP_TABLES: Record<EncounterType, Array<{ rarity: Rarity; weight: number }>> = {
  normal: [
    { rarity: Rarity.COMMON, weight: 70 },
    { rarity: Rarity.UNCOMMON, weight: 25 },
    { rarity: Rarity.RARE, weight: 5 },
  ],
  elite: [
    { rarity: Rarity.UNCOMMON, weight: 30 },
    { rarity: Rarity.RARE, weight: 60 },
    { rarity: Rarity.EPIC, weight: 10 },
  ],
  miniboss: [
    { rarity: Rarity.RARE, weight: 100 },
  ],
  boss: [
    { rarity: Rarity.EPIC, weight: 100 },
  ],
};

export function getCombatXp(encounterType: EncounterType): number {
  return XP_BY_ENCOUNTER[encounterType];
}

export function getNextLevelXp(level: number): number {
  return level * 50;
}

export function awardXp(party: CharacterInstance[], amount: number): AwardXpResult {
  const levelUps: LevelUpResult[] = [];

  for (const character of party) {
    character.xp += amount;

    while (character.xp >= getNextLevelXp(character.level)) {
      const fromLevel = character.level;
      character.xp -= getNextLevelXp(character.level);
      character.level += 1;

      const gainedStats = applyLevelUpStats(character);
      const result: LevelUpResult = {
        characterId: character.data.id,
        characterName: character.data.name,
        fromLevel,
        toLevel: character.level,
        gainedStats,
        xpRemaining: character.xp,
        nextLevelXp: getNextLevelXp(character.level),
      };

      levelUps.push(result);
      progressionEvents.emit(ProgressionEvents.LEVEL_UP, result);
    }
  }

  return {
    xpAwarded: amount,
    levelUps,
  };
}

export function rollCombatGold(
  encounterType: EncounterType,
  rng: () => number = Math.random,
): number {
  const [min, max] = GOLD_BY_ENCOUNTER[encounterType];
  return min + Math.floor(rng() * (max - min + 1));
}

export function rollItemDrop(
  itemPool: ItemData[],
  encounterType: EncounterType,
  rng: () => number = Math.random,
): ItemData {
  const rarity = rollDropRarity(encounterType, rng);
  const matchingItems = itemPool.filter((item) => item.rarity === rarity);
  const candidates = matchingItems.length > 0 ? matchingItems : itemPool;

  if (candidates.length === 0) {
    throw new Error('Progression: item drop pool is empty');
  }

  return candidates[Math.floor(rng() * candidates.length)];
}

export function rollPermanentStatReward(
  party: CharacterInstance[],
  rng: () => number = Math.random,
): PermanentStatReward {
  if (party.length === 0) {
    throw new Error('Progression: cannot roll stat reward without party members');
  }

  const character = party[Math.floor(rng() * party.length)];
  const primaryStat = primaryStatToStatKey(character.data.primaryStat);
  const possibleStats = uniqueStats(['hpMax', 'defense', primaryStat]);
  const stat = possibleStats[Math.floor(rng() * possibleStats.length)];

  return {
    characterId: character.data.id,
    characterName: character.data.name,
    stat,
    amount: stat === 'hpMax' ? 5 : 1,
  };
}

export function applyPermanentStatReward(
  character: CharacterInstance,
  reward: PermanentStatReward,
): void {
  addStat(character.currentStats, reward.stat, reward.amount);

  if (reward.stat === 'hpMax') {
    character.currentStats.hp = Math.min(
      character.currentStats.hpMax,
      character.currentStats.hp + reward.amount,
    );
  }
}

export function describeStatReward(stat: StatKey, amount: number): string {
  const label: Record<StatKey, string> = {
    hp: 'HP actual',
    hpMax: 'HP max',
    attack: 'Ataque',
    power: 'Poder',
    defense: 'Defensa',
    speed: 'Velocidad',
    crit: 'Crítico',
    resistance: 'Resistencia',
  };
  return `+${formatStatAmount(amount)} ${label[stat]}`;
}

export function rarityLabel(rarity: Rarity): string {
  switch (rarity) {
    case Rarity.COMMON:
      return 'Común';
    case Rarity.UNCOMMON:
      return 'Poco común';
    case Rarity.RARE:
      return 'Rara';
    case Rarity.EPIC:
      return 'Épica';
    case Rarity.CURSED:
      return 'Maldita';
  }
}

function applyLevelUpStats(character: CharacterInstance): Partial<Stats> {
  const gainedStats: Partial<Stats> = {
    hpMax: 5,
    speed: 0.5,
  };
  const primaryStat = primaryStatToStatKey(character.data.primaryStat);
  gainedStats[primaryStat] = (gainedStats[primaryStat] ?? 0) + 1;

  addStat(character.currentStats, 'hpMax', 5);
  addStat(character.currentStats, primaryStat, 1);
  addStat(character.currentStats, 'speed', 0.5);
  character.currentStats.hp = character.currentStats.hpMax;
  character.isDown = false;

  return gainedStats;
}

function primaryStatToStatKey(primaryStat: PrimaryStat): StatKey {
  switch (primaryStat) {
    case PrimaryStat.ATTACK:
      return 'attack';
    case PrimaryStat.POWER:
      return 'power';
    case PrimaryStat.DEFENSE:
      return 'defense';
    case PrimaryStat.SPEED:
      return 'speed';
  }
}

function rollDropRarity(encounterType: EncounterType, rng: () => number): Rarity {
  const table = DROP_TABLES[encounterType];
  const totalWeight = table.reduce((sum, row) => sum + row.weight, 0);
  let roll = rng() * totalWeight;

  for (const row of table) {
    roll -= row.weight;
    if (roll <= 0) return row.rarity;
  }

  return table[table.length - 1].rarity;
}

function addStat(stats: Stats, stat: StatKey, amount: number): void {
  stats[stat] += amount;
}

function uniqueStats(stats: StatKey[]): StatKey[] {
  return Array.from(new Set(stats));
}

function formatStatAmount(amount: number): string {
  return Number.isInteger(amount) ? `${amount}` : `${amount.toFixed(1)}`;
}
