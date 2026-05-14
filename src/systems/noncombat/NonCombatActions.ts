import { registry } from '@/data/Registry';
import { gameState } from '@/systems/GameState';
import { createCharacterInstance } from '@/systems/battle/BattleState';
import {
  ItemCategory,
  Rarity,
  type CharacterInstance,
  type ItemData,
  type StatKey,
  type StatusEffectId,
} from '@/types';

export interface ItemRollFilter {
  category?: ItemCategory;
  rarity?: Rarity;
  relicOnly?: boolean;
  includeCursed?: boolean;
}

export interface AppliedItemResult {
  item: ItemData;
  message: string;
}

const RARITY_ORDER = [
  Rarity.COMMON,
  Rarity.UNCOMMON,
  Rarity.RARE,
  Rarity.EPIC,
  Rarity.CURSED,
];

export function ensureRunParty(): CharacterInstance[] {
  if (gameState.party.length === 0) {
    gameState.setParty([
      createCharacterInstance(registry.getCharacter('bram')),
      createCharacterInstance(registry.getCharacter('vera')),
      createCharacterInstance(registry.getCharacter('mira')),
    ]);
  }

  return gameState.party;
}

export function getShortName(fullName: string): string {
  const comma = fullName.indexOf(',');
  return comma >= 0 ? fullName.slice(0, comma) : fullName;
}

export function rollItem(filter: ItemRollFilter, rng: () => number = Math.random): ItemData {
  const candidates = getItemCandidates(filter);
  if (candidates.length === 0) {
    throw new Error('NonCombatActions: item pool is empty');
  }

  return candidates[Math.floor(rng() * candidates.length)];
}

export function addRolledItem(
  filter: ItemRollFilter,
  rng: () => number = Math.random,
): AppliedItemResult {
  const item = rollItem(filter, rng);
  gameState.addItem(item.id);
  return {
    item,
    message: `${item.name} agregado a la mochila.`,
  };
}

export function addOrRefreshStatus(
  character: CharacterInstance,
  statusId: StatusEffectId,
  stacks: number,
  duration: number,
): void {
  const statusData = registry.getStatusEffect(statusId);
  const existing = character.statusEffects.find((status) => status.id === statusId);
  const nextStacks = Math.max(1, Math.floor(stacks));
  const cappedStacks = statusData.maxStacks === null
    ? nextStacks
    : Math.min(statusData.maxStacks, nextStacks);

  if (!existing) {
    character.statusEffects.push({ id: statusId, stacks: cappedStacks, duration });
    return;
  }

  existing.stacks = statusData.stackable
    ? capStatusStacks(existing.stacks + nextStacks, statusData.maxStacks)
    : Math.max(existing.stacks, cappedStacks);
  existing.duration = refreshDuration(existing.duration, duration);
}

export function addStatusToParty(
  statusId: StatusEffectId,
  stacks: number,
  duration: number,
): void {
  for (const member of ensureRunParty()) {
    addOrRefreshStatus(member, statusId, stacks, duration);
  }
}

export function healPartyByPercent(percent: number): number {
  let totalHealed = 0;

  for (const member of ensureRunParty()) {
    if (gameState.isHealingBlocked(member)) continue;

    const amount = Math.max(1, Math.floor(member.currentStats.hpMax * percent));
    const before = member.currentStats.hp;
    member.currentStats.hp = Math.min(member.currentStats.hpMax, member.currentStats.hp + amount);
    member.isDown = member.currentStats.hp <= 0;
    totalHealed += member.currentStats.hp - before;
  }

  return totalHealed;
}

export function healPartyByAmount(amount: number): number {
  let totalHealed = 0;

  for (const member of ensureRunParty()) {
    if (gameState.isHealingBlocked(member)) continue;

    const before = member.currentStats.hp;
    member.currentStats.hp = Math.min(member.currentStats.hpMax, member.currentStats.hp + amount);
    member.isDown = member.currentStats.hp <= 0;
    totalHealed += member.currentStats.hp - before;
  }

  return totalHealed;
}

export function damageParty(amount: number): number {
  let totalDamage = 0;

  for (const member of ensureRunParty()) {
    const before = member.currentStats.hp;
    member.currentStats.hp = Math.max(1, member.currentStats.hp - amount);
    member.isDown = false;
    totalDamage += before - member.currentStats.hp;
  }

  return totalDamage;
}

export function modifyPartyStat(stat: StatKey, amount: number): void {
  for (const member of ensureRunParty()) {
    modifyCharacterStat(member, stat, amount);
  }
}

export function modifyCharacterStat(
  character: CharacterInstance,
  stat: StatKey,
  amount: number,
): void {
  character.currentStats[stat] += amount;
  character.currentStats.hpMax = Math.max(1, character.currentStats.hpMax);
  character.currentStats.attack = Math.max(0, character.currentStats.attack);
  character.currentStats.power = Math.max(0, character.currentStats.power);
  character.currentStats.defense = Math.max(0, character.currentStats.defense);
  character.currentStats.speed = Math.max(0, character.currentStats.speed);
  character.currentStats.crit = Math.max(0, Math.min(100, character.currentStats.crit));
  character.currentStats.resistance = Math.max(0, Math.min(100, character.currentStats.resistance));
  character.currentStats.hp = Math.min(character.currentStats.hp, character.currentStats.hpMax);
  if (stat === 'hpMax' && amount > 0) {
    character.currentStats.hp = Math.min(
      character.currentStats.hpMax,
      character.currentStats.hp + amount,
    );
  }
}

export function getUpgradableSkills(character: CharacterInstance): ItemlessSkill[] {
  return character.data.skillIds
    .map((skillId) => registry.getSkill(skillId))
    .filter((skill) => Boolean(skill.improvedVersion))
    .map((skill) => ({
      skillId: skill.id,
      skillName: skill.name,
      improvedSkillId: skill.improvedVersion?.id ?? skill.id,
      improvedSkillName: skill.improvedVersion?.name ?? skill.name,
      description: skill.improvedVersion?.description ?? skill.description,
    }));
}

export function upgradeSkill(character: CharacterInstance, skillId: string): string | null {
  const skill = registry.getSkill(skillId);
  const improved = skill.improvedVersion;
  if (!improved) return null;

  character.data = {
    ...character.data,
    skillIds: character.data.skillIds.map((id) => (id === skillId ? improved.id : id)),
  };
  return improved.name;
}

export function completeCurrentMapNode(): void {
  const mapState = gameState.ensureAct1Map();
  const currentNode = mapState.getCurrentNode();
  if (currentNode && !currentNode.completed) {
    mapState.completeNode(currentNode.id);
  }
}

export function itemRarityColor(rarity: Rarity): number {
  switch (rarity) {
    case Rarity.COMMON:
      return 0xb9aa8c;
    case Rarity.UNCOMMON:
      return 0x78b56f;
    case Rarity.RARE:
      return 0x74a8d8;
    case Rarity.EPIC:
      return 0xc88dde;
    case Rarity.CURSED:
      return 0xc55f65;
  }
}

export function itemRarityLabel(rarity: Rarity): string {
  switch (rarity) {
    case Rarity.COMMON:
      return 'Comun';
    case Rarity.UNCOMMON:
      return 'Poco comun';
    case Rarity.RARE:
      return 'Rara';
    case Rarity.EPIC:
      return 'Epica';
    case Rarity.CURSED:
      return 'Maldita';
  }
}

export function statLabel(stat: StatKey): string {
  switch (stat) {
    case 'hp':
      return 'HP';
    case 'hpMax':
      return 'HP max';
    case 'attack':
      return 'Ataque';
    case 'power':
      return 'Poder';
    case 'defense':
      return 'Defensa';
    case 'speed':
      return 'Velocidad';
    case 'crit':
      return 'Critico';
    case 'resistance':
      return 'Resistencia';
  }
}

interface ItemlessSkill {
  skillId: string;
  skillName: string;
  improvedSkillId: string;
  improvedSkillName: string;
  description: string;
}

function getItemCandidates(filter: ItemRollFilter): ItemData[] {
  const includeCursed = filter.includeCursed ?? false;
  const category = filter.relicOnly ? undefined : filter.category;
  const exact = filterPool(registry.getAllItems(), {
    ...filter,
    category,
    includeCursed,
  });
  if (exact.length > 0) return exact;

  if (filter.rarity) {
    for (const rarity of nearestRarities(filter.rarity)) {
      const fallback = filterPool(registry.getAllItems(), {
        ...filter,
        rarity,
        category,
        includeCursed,
      });
      if (fallback.length > 0) return fallback;
    }
  }

  return filterPool(registry.getAllItems(), {
    category,
    relicOnly: filter.relicOnly,
    includeCursed,
  });
}

function filterPool(
  items: ItemData[],
  filter: ItemRollFilter,
): ItemData[] {
  return items.filter((item) => {
    if (!filter.includeCursed && item.category === ItemCategory.CURSED_RELIC) return false;
    if (filter.relicOnly && !isRelic(item)) return false;
    if (filter.category && item.category !== filter.category) return false;
    if (filter.rarity && item.rarity !== filter.rarity) return false;
    return true;
  });
}

function isRelic(item: ItemData): boolean {
  return item.category === ItemCategory.RELIC || item.category === ItemCategory.CURSED_RELIC;
}

function nearestRarities(rarity: Rarity): Rarity[] {
  const startIndex = RARITY_ORDER.indexOf(rarity);
  return RARITY_ORDER
    .map((candidate, index) => ({
      candidate,
      distance: Math.abs(index - startIndex),
    }))
    .sort((a, b) => a.distance - b.distance)
    .map((entry) => entry.candidate);
}

function capStatusStacks(stacks: number, maxStacks: number | null): number {
  return maxStacks === null ? stacks : Math.min(maxStacks, stacks);
}

function refreshDuration(current: number, next: number): number {
  if (current < 0 || next < 0) return -1;
  return Math.max(current, next);
}
