import { registry } from '@/data/Registry';
import { gameState } from '@/systems/GameState';
import {
  EquipmentSlot,
  ItemCategory,
  StatusEffectId,
  type CharacterEquipment,
  type CharacterInstance,
  type ItemEffect,
  type ItemData,
  type SetData,
  type StatKey,
  type Stats,
  type StatusEffectInstance,
} from '@/types';

export interface StatBuff {
  stat: StatKey;
  amount: number;
}

export interface RequirementCheck {
  stat: StatKey;
  required: number;
  actual: number;
  missing: number;
}

export interface ActiveSet {
  setId: string;
  set: SetData;
  piecesEquipped: number;
  equippedItemIds: string[];
}

export interface ActiveSetBonus {
  setId: string;
  setName: string;
  piecesRequired: number;
  description: string;
  effect: ItemEffect;
}

export function calculateEffectiveStats(
  character: CharacterInstance,
  equipment: CharacterEquipment = character.equipment,
  statusEffects: StatusEffectInstance[] = character.statusEffects,
  buffs: StatBuff[] = [],
  currentEquipment: CharacterEquipment = character.equipment,
  partyRelicIds: string[] = gameState.runMeta.relics,
  currentPartyRelicIds: string[] = partyRelicIds,
): Stats {
  const stats = removeEquipmentModifiers({ ...character.currentStats }, currentEquipment);

  removeSetBonusModifiers(stats, currentEquipment, currentPartyRelicIds);
  applyEquipmentModifiers(stats, equipment);
  applySetBonusModifiers(stats, equipment, partyRelicIds);
  applyStatusModifiers(stats, statusEffects);

  for (const buff of buffs) {
    stats[buff.stat] += buff.amount;
  }

  return clampStats(stats);
}

export function calculateActiveSets(
  equipment: CharacterEquipment,
  partyRelicIds: string[] = gameState.runMeta.relics,
): ActiveSet[] {
  const activeItemIds = new Set([...getEquippedItemIds(equipment), ...partyRelicIds]);

  return registry.getAllSets()
    .map((set) => {
      const equippedItemIds = set.itemIds.filter((itemId) => activeItemIds.has(itemId));
      return {
        setId: set.id,
        set,
        piecesEquipped: equippedItemIds.length,
        equippedItemIds,
      };
    })
    .filter((activeSet) => activeSet.piecesEquipped > 0);
}

export function getActiveSetBonuses(activeSets: ActiveSet[]): ItemEffect[] {
  return getActiveSetBonusDetails(activeSets).map((bonus) => bonus.effect);
}

export function getActiveSetBonusDetails(activeSets: ActiveSet[]): ActiveSetBonus[] {
  return activeSets.flatMap((activeSet) => (
    activeSet.set.bonuses
      .filter((bonus) => activeSet.piecesEquipped >= bonus.piecesRequired)
      .flatMap((bonus) => bonus.effects.map((effect) => ({
        setId: activeSet.setId,
        setName: activeSet.set.name,
        piecesRequired: bonus.piecesRequired,
        description: bonus.description,
        effect,
      })))
  ));
}

export function canEquip(
  character: CharacterInstance,
  item: ItemData,
  currentEquipment: CharacterEquipment = character.equipment,
): boolean {
  return getMissingRequirements(character, item, currentEquipment).length === 0;
}

export function getMissingRequirements(
  character: CharacterInstance,
  item: ItemData,
  currentEquipment: CharacterEquipment = character.equipment,
): RequirementCheck[] {
  if (item.category !== ItemCategory.EQUIPMENT || !item.slot) {
    return [{ stat: 'attack', required: 1, actual: 0, missing: 1 }];
  }

  const slotKey = equipmentSlotToKey(item.slot);
  const equipmentWithoutTargetSlot: CharacterEquipment = {
    ...currentEquipment,
    [slotKey]: null,
  };
  const stats = calculateEffectiveStats(
    character,
    equipmentWithoutTargetSlot,
    character.statusEffects,
    [],
    currentEquipment,
  );

  return item.requirements
    .map((requirement) => {
      const actual = stats[requirement.stat];
      return {
        stat: requirement.stat,
        required: requirement.minValue,
        actual,
        missing: Math.max(0, requirement.minValue - actual),
      };
    })
    .filter((check) => check.missing > 0);
}

export function syncCharacterEffectiveStats(
  character: CharacterInstance,
  previousEquipment: CharacterEquipment = character.equipment,
): void {
  character.currentStats = calculateEffectiveStats(
    character,
    character.equipment,
    character.statusEffects,
    [],
    previousEquipment,
  );
}

export function equipmentSlotToKey(slot: EquipmentSlot): keyof CharacterEquipment {
  switch (slot) {
    case EquipmentSlot.WEAPON:
      return 'weapon';
    case EquipmentSlot.ARMOR:
      return 'armor';
    case EquipmentSlot.AMULET:
      return 'amulet';
  }
}

function applyEquipmentModifiers(stats: Stats, equipment: CharacterEquipment): void {
  for (const item of getEquippedItems(equipment)) {
    for (const effect of item.effects) {
      if (effect.type === 'stat_modifier' && effect.stat && typeof effect.amount === 'number') {
        stats[effect.stat] += effect.amount;
      }
    }
  }
}

function applySetBonusModifiers(
  stats: Stats,
  equipment: CharacterEquipment,
  partyRelicIds: string[],
): void {
  for (const effect of getActiveSetBonuses(calculateActiveSets(equipment, partyRelicIds))) {
    if (effect.type === 'stat_modifier' && effect.stat && typeof effect.amount === 'number') {
      stats[effect.stat] += effect.amount;
    }
  }
}

function removeEquipmentModifiers(stats: Stats, equipment: CharacterEquipment): Stats {
  for (const item of getEquippedItems(equipment)) {
    for (const effect of item.effects) {
      if (effect.type === 'stat_modifier' && effect.stat && typeof effect.amount === 'number') {
        stats[effect.stat] -= effect.amount;
      }
    }
  }

  return stats;
}

function removeSetBonusModifiers(
  stats: Stats,
  equipment: CharacterEquipment,
  partyRelicIds: string[],
): Stats {
  for (const effect of getActiveSetBonuses(calculateActiveSets(equipment, partyRelicIds))) {
    if (effect.type === 'stat_modifier' && effect.stat && typeof effect.amount === 'number') {
      stats[effect.stat] -= effect.amount;
    }
  }

  return stats;
}

function getEquippedItems(equipment: CharacterEquipment): ItemData[] {
  return getEquippedItemIds(equipment)
    .map((itemId) => registry.getItem(itemId));
}

function getEquippedItemIds(equipment: CharacterEquipment): string[] {
  return [equipment.weapon, equipment.armor, equipment.amulet]
    .filter((itemId): itemId is string => Boolean(itemId))
}

function applyStatusModifiers(stats: Stats, statusEffects: StatusEffectInstance[]): void {
  for (const status of statusEffects) {
    switch (status.id) {
      case StatusEffectId.WEAKENED:
      case StatusEffectId.PROTECTED:
      case StatusEffectId.INSPIRED:
      case StatusEffectId.VULNERABLE:
      case StatusEffectId.STUN:
      case StatusEffectId.MARKED:
      case StatusEffectId.BLEED:
      case StatusEffectId.BURN:
      case StatusEffectId.POISON:
      case StatusEffectId.REGEN:
        break;
    }
  }

  clampStats(stats);
}

function clampStats(stats: Stats): Stats {
  stats.hpMax = Math.max(1, stats.hpMax);
  stats.hp = Math.max(0, Math.min(stats.hp, stats.hpMax));
  stats.attack = Math.max(0, stats.attack);
  stats.power = Math.max(0, stats.power);
  stats.defense = Math.max(0, stats.defense);
  stats.speed = Math.max(0, stats.speed);
  stats.crit = Math.max(0, Math.min(100, stats.crit));
  stats.resistance = Math.max(0, Math.min(100, stats.resistance));
  return stats;
}
