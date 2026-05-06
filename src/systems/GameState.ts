import { registry } from '@/data/Registry';
import { ItemCategory, type CharacterInstance, type ItemData } from '@/types';
import { generateAct1Map, type MapSeed } from './map/MapGenerator';
import { MapState } from './map/MapState';
import { isCombatMapNodeType } from './map/MapNode';

export interface RunMeta {
  actNumber: number;
  gold: number;
  items: string[];
  relics: string[];
  relicChoices: Record<string, string>;
  skipNextFreeNode: boolean;
  seed?: MapSeed;
}

interface AddItemOptions {
  relicTargetCharacterId?: string;
  skipRelicActivation?: boolean;
}

class GameState {
  party: CharacterInstance[] = [];
  currentMap: MapState | null = null;
  runMeta: RunMeta = createInitialRunMeta();
  private readonly appliedRelicIds = new Set<string>();

  startNewRun(seed?: MapSeed): MapState {
    this.party = [];
    this.runMeta = createInitialRunMeta(seed);
    this.appliedRelicIds.clear();
    this.currentMap = new MapState(generateAct1Map(seed), this.runMeta.actNumber);
    return this.currentMap;
  }

  ensureAct1Map(seed = this.runMeta.seed): MapState {
    if (!this.currentMap || this.currentMap.actNumber !== 1) {
      this.runMeta = createInitialRunMeta(seed);
      this.currentMap = new MapState(generateAct1Map(seed), this.runMeta.actNumber);
    }

    return this.currentMap;
  }

  setParty(party: CharacterInstance[]): void {
    this.party = party;
    this.syncRelicPassives();
  }

  addGold(amount: number): void {
    this.runMeta.gold = Math.max(0, this.runMeta.gold + amount);
  }

  addItem(itemId: string, options: AddItemOptions = {}): void {
    this.runMeta.items.push(itemId);
    if (options.skipRelicActivation) return;

    const item = registry.getItem(itemId);
    if (isRelic(item)) {
      this.addRelic(itemId, options.relicTargetCharacterId);
    }
  }

  removeItem(itemId: string): boolean {
    const index = this.runMeta.items.indexOf(itemId);
    if (index < 0) return false;

    this.runMeta.items.splice(index, 1);
    return true;
  }

  addRelic(itemId: string, targetCharacterId?: string): void {
    if (!this.runMeta.relics.includes(itemId)) {
      this.runMeta.relics.push(itemId);
    }

    if (itemId === 'pacto_hambre') {
      this.runMeta.relicChoices[itemId] = (
        targetCharacterId
        ?? this.runMeta.relicChoices[itemId]
        ?? this.party[0]?.data.id
        ?? ''
      );
    }

    this.syncRelicPassives();
  }

  removeRelic(itemId: string): boolean {
    const index = this.runMeta.relics.indexOf(itemId);
    if (index < 0) return false;

    this.revertRelicPassive(itemId);
    this.appliedRelicIds.delete(itemId);
    this.runMeta.relics.splice(index, 1);
    delete this.runMeta.relicChoices[itemId];
    return true;
  }

  hasRelic(itemId: string): boolean {
    return this.runMeta.relics.includes(itemId);
  }

  getActiveRelics(): ItemData[] {
    return this.runMeta.relics.map((itemId) => registry.getItem(itemId));
  }

  getPactBearerId(): string | null {
    if (!this.hasRelic('pacto_hambre')) return null;
    return this.runMeta.relicChoices.pacto_hambre || null;
  }

  scheduleSkipNextFreeNode(): void {
    this.runMeta.skipNextFreeNode = true;
  }

  consumeSkipNextFreeNode(): string | null {
    if (!this.runMeta.skipNextFreeNode || !this.currentMap) return null;

    this.runMeta.skipNextFreeNode = false;
    const availableNodes = this.currentMap.getAvailableNodes();
    if (availableNodes.length <= 1) return null;

    const skippableNode = availableNodes.find((node) => (
      !isCombatMapNodeType(node.type)
      && !node.completed
    ));
    if (!skippableNode) return null;

    skippableNode.completed = true;
    return skippableNode.id;
  }

  isHealingBlocked(character: CharacterInstance): boolean {
    return this.getPactBearerId() === character.data.id;
  }

  reset(): void {
    this.party = [];
    this.currentMap = null;
    this.runMeta = createInitialRunMeta();
    this.appliedRelicIds.clear();
  }

  private syncRelicPassives(): void {
    if (this.party.length === 0) return;

    for (const itemId of this.runMeta.relics) {
      if (!this.appliedRelicIds.has(itemId)) {
        this.applyRelicPassive(itemId);
        this.appliedRelicIds.add(itemId);
      }
    }
  }

  private applyRelicPassive(itemId: string): void {
    switch (itemId) {
      case 'yelmo_padre':
        this.modifyBramStats(10, 2);
        break;
      case 'craneo_cuervo':
        this.modifyPartyHpMax(-5);
        break;
      case 'cinta_manchada':
        this.modifyPartyHpMax(-10);
        this.modifyPartyVigorMax(5);
        break;
      default:
        break;
    }
  }

  private revertRelicPassive(itemId: string): void {
    switch (itemId) {
      case 'yelmo_padre':
        this.modifyBramStats(-10, -2);
        break;
      case 'craneo_cuervo':
        this.modifyPartyHpMax(5);
        break;
      case 'cinta_manchada':
        this.modifyPartyHpMax(10);
        this.modifyPartyVigorMax(-5);
        break;
      default:
        break;
    }
  }

  private modifyBramStats(hpMaxDelta: number, defenseDelta: number): void {
    const bram = this.party.find((member) => member.data.id === 'bram');
    if (!bram) return;

    bram.currentStats.hpMax = Math.max(1, bram.currentStats.hpMax + hpMaxDelta);
    bram.currentStats.hp = Math.max(0, Math.min(
      bram.currentStats.hpMax,
      bram.currentStats.hp + Math.max(0, hpMaxDelta),
    ));
    bram.currentStats.defense = Math.max(0, bram.currentStats.defense + defenseDelta);
  }

  private modifyPartyHpMax(amount: number): void {
    for (const member of this.party) {
      member.currentStats.hpMax = Math.max(1, member.currentStats.hpMax + amount);
      if (amount > 0) {
        member.currentStats.hp = Math.min(member.currentStats.hpMax, member.currentStats.hp + amount);
      } else {
        member.currentStats.hp = Math.min(member.currentStats.hp, member.currentStats.hpMax);
      }
    }
  }

  private modifyPartyVigorMax(amount: number): void {
    for (const member of this.party) {
      member.currentResources.vigorMax = Math.max(0, member.currentResources.vigorMax + amount);
      if (amount > 0) {
        member.currentResources.vigor = Math.min(
          member.currentResources.vigorMax,
          member.currentResources.vigor + amount,
        );
      } else {
        member.currentResources.vigor = Math.min(
          member.currentResources.vigor,
          member.currentResources.vigorMax,
        );
      }
    }
  }
}

function createInitialRunMeta(seed?: MapSeed): RunMeta {
  return {
    actNumber: 1,
    gold: 50,
    items: [],
    relics: [],
    relicChoices: {},
    skipNextFreeNode: false,
    seed,
  };
}

function isRelic(item: ItemData): boolean {
  return item.category === ItemCategory.RELIC || item.category === ItemCategory.CURSED_RELIC;
}

export const gameState = new GameState();
