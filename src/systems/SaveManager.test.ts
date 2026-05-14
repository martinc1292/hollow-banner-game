import { beforeEach, describe, expect, test } from 'vitest';
import { registry } from '@/data/Registry';
import { gameState } from './GameState';
import { saveManager } from './SaveManager';
import { createCharacterInstance } from './battle/BattleState';

describe('SaveManager', () => {
  beforeEach(() => {
    localStorage.clear();
    gameState.reset();
  });

  test('round-trips party, map, run meta, relic choices, and active combat', () => {
    const map = gameState.startNewRun('save-regression');
    const bram = createCharacterInstance(registry.getCharacter('bram'));
    bram.currentStats.hp = 42;
    gameState.setParty([bram]);
    gameState.addGold(30);
    gameState.addItem('pacto_hambre', { relicTargetCharacterId: 'bram' });
    const firstNode = map.getAvailableNodes()[0];
    map.moveToNode(firstNode.id);
    gameState.beginCombat('act1_normal_bandit_pair');

    saveManager.save();
    gameState.reset();
    const loaded = saveManager.load();

    expect(loaded).toBe(true);
    expect(gameState.party).toHaveLength(1);
    expect(gameState.party[0].data.id).toBe('bram');
    expect(gameState.party[0].currentStats.hp).toBe(42);
    expect(gameState.runMeta.gold).toBe(80);
    expect(gameState.runMeta.relics).toContain('pacto_hambre');
    expect(gameState.runMeta.relicChoices.pacto_hambre).toBe('bram');
    expect(gameState.runMeta.activeCombat).toMatchObject({
      encounterId: 'act1_normal_bandit_pair',
      nodeId: firstNode.id,
    });
    expect(gameState.currentMap?.currentNodeId).toBe(firstNode.id);
  });
});
