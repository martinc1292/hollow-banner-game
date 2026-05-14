import { describe, expect, test } from 'vitest';
import { generateAct1Map } from './MapGenerator';

describe('generateAct1Map', () => {
  test('creates a reachable act 1 route with fixed miniboss and boss columns', () => {
    const nodes = generateAct1Map('act-1-regression');
    const byId = new Map(nodes.map((node) => [node.id, node]));
    const incoming = new Map(nodes.map((node) => [node.id, 0]));

    for (const node of nodes) {
      for (const connectionId of node.connections) {
        const target = byId.get(connectionId);
        expect(target).toBeDefined();
        expect(target?.column).toBe(node.column + 1);
        incoming.set(connectionId, (incoming.get(connectionId) ?? 0) + 1);
      }
    }

    expect(nodes.filter((node) => node.column === 4)).toMatchObject([
      { type: 'miniboss', encounterId: 'act1_miniboss_pregonero' },
    ]);
    expect(nodes.filter((node) => node.column === 6)).toMatchObject([
      { type: 'boss', encounterId: 'act1_boss_padre_oxidado' },
    ]);
    expect(nodes.filter((node) => node.column > 0).every((node) => (incoming.get(node.id) ?? 0) > 0))
      .toBe(true);
    expect(nodes.filter((node) => node.column < 6).every((node) => node.connections.length > 0))
      .toBe(true);
  });
});
