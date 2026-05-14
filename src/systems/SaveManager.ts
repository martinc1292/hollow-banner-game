import { registry } from '@/data/Registry';
import { type CharacterInstance } from '@/types';
import { MapState } from './map/MapState';
import { type MapNode } from './map/MapNode';
import { gameState, type RunMeta } from './GameState';

const SAVE_KEY = 'hollow_banner_save';
const SAVE_VERSION = 1;

interface SavedCharacter {
  id: string;
  currentStats: CharacterInstance['currentStats'];
  currentResources: CharacterInstance['currentResources'];
  level: number;
  xp: number;
  equipment: CharacterInstance['equipment'];
  statusEffects: CharacterInstance['statusEffects'];
  block: number;
  isDown: boolean;
}

interface SavedMap {
  nodes: MapNode[];
  currentNodeId: string | null;
  actNumber: number;
}

interface SaveData {
  version: number;
  timestamp: number;
  party: SavedCharacter[];
  runMeta: RunMeta;
  map: SavedMap | null;
}

export class SaveManager {
  serialize(): string {
    const party: SavedCharacter[] = gameState.party.map((member) => ({
      id: member.data.id,
      currentStats: { ...member.currentStats },
      currentResources: { ...member.currentResources },
      level: member.level,
      xp: member.xp,
      equipment: { ...member.equipment },
      statusEffects: member.statusEffects.map((s) => ({ ...s })),
      block: member.block,
      isDown: member.isDown,
    }));

    const map: SavedMap | null = gameState.currentMap
      ? {
          nodes: gameState.currentMap.nodes.map((node) => ({ ...node, connections: [...node.connections] })),
          currentNodeId: gameState.currentMap.currentNodeId,
          actNumber: gameState.currentMap.actNumber,
        }
      : null;

    const saveData: SaveData = {
      version: SAVE_VERSION,
      timestamp: Date.now(),
      party,
      runMeta: {
        ...gameState.runMeta,
        items: [...gameState.runMeta.items],
        relics: [...gameState.runMeta.relics],
        relicChoices: { ...gameState.runMeta.relicChoices },
      },
      map,
    };

    return JSON.stringify(saveData);
  }

  save(): void {
    try {
      const data = this.serialize();
      localStorage.setItem(SAVE_KEY, data);
    } catch (e) {
      console.warn('[save] Failed to save:', e);
    }
  }

  hasSave(): boolean {
    return localStorage.getItem(SAVE_KEY) !== null;
  }

  load(): boolean {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return false;

    try {
      const data: SaveData = JSON.parse(raw);
      if (data.version !== SAVE_VERSION) {
        console.warn('[save] Version mismatch, discarding save.');
        this.clearSave();
        return false;
      }

      this.deserialize(data);
      return true;
    } catch (e) {
      console.warn('[save] Failed to load:', e);
      this.clearSave();
      return false;
    }
  }

  clearSave(): void {
    localStorage.removeItem(SAVE_KEY);
  }

  private deserialize(data: SaveData): void {
    gameState.reset();

    // Restore run meta (no relic activation yet — we'll sync after party is set)
    gameState.runMeta = {
      actNumber: data.runMeta.actNumber,
      gold: data.runMeta.gold,
      items: [...data.runMeta.items],
      relics: [...data.runMeta.relics],
      relicChoices: { ...data.runMeta.relicChoices },
      skipNextFreeNode: data.runMeta.skipNextFreeNode,
      activeCombat: data.runMeta.activeCombat ?? null,
      seed: data.runMeta.seed,
    };

    // Restore party
    const party: CharacterInstance[] = data.party.map((saved) => {
      const characterData = registry.getCharacter(saved.id);
      return {
        data: characterData,
        currentStats: { ...saved.currentStats },
        currentResources: { ...saved.currentResources },
        level: saved.level,
        xp: saved.xp,
        equipment: { ...saved.equipment },
        statusEffects: saved.statusEffects.map((s) => ({ ...s })),
        block: saved.block,
        isDown: saved.isDown,
      };
    });

    // setParty triggers relic passive sync
    gameState.setParty(party);

    // Restore map
    if (data.map) {
      gameState.currentMap = new MapState(
        data.map.nodes,
        data.map.actNumber,
        data.map.currentNodeId,
      );
    }
  }
}

export const saveManager = new SaveManager();
