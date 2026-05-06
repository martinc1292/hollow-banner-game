import { registry } from '@/data/Registry';
import type { EncounterType } from '@/types';
import {
  isCombatMapNodeType,
  type MapNode,
  type MapNodeType,
} from './MapNode';

export type MapSeed = string | number;

const ACT_NUMBER = 1;
const ACT1_BOSS_COLUMN = 6;
const MINIBOSS_COLUMN = 4;
const MAX_ROW = 3;

const MIXED_TYPE_WEIGHTS: Array<{ type: MapNodeType; weight: number }> = [
  { type: 'normal', weight: 50 },
  { type: 'elite', weight: 10 },
  { type: 'event', weight: 15 },
  { type: 'shop', weight: 8 },
  { type: 'camp', weight: 8 },
  { type: 'treasure', weight: 5 },
  { type: 'special', weight: 3 },
];

interface SeededRng {
  next(): number;
  integer(minInclusive: number, maxInclusive: number): number;
  pick<T>(values: readonly T[]): T;
}

export function generateAct1Map(seed?: MapSeed): MapNode[] {
  const rng = createSeededRng(seed);
  const columns: MapNode[][] = [];

  columns[0] = createColumn(0, rng.integer(3, 4), () => 'normal', rng);
  columns[1] = createColumn(1, rng.integer(3, 4), () => pickWeightedType(rng), rng);
  columns[2] = createColumn(2, rng.integer(3, 4), () => pickWeightedType(rng), rng);
  columns[3] = createColumn(3, rng.integer(3, 4), () => pickWeightedType(rng), rng);
  columns[MINIBOSS_COLUMN] = [createNode(MINIBOSS_COLUMN, 1, 'miniboss', 0, rng)];
  columns[5] = createColumn(5, rng.integer(3, 4), () => pickWeightedType(rng), rng);
  columns[ACT1_BOSS_COLUMN] = [createNode(ACT1_BOSS_COLUMN, 1, 'boss', 0, rng)];

  connectColumns(columns, rng);

  const nodes = columns.flat();
  validateAct1Map(nodes);
  return nodes;
}

function createColumn(
  column: number,
  nodeCount: number,
  pickType: () => MapNodeType,
  rng: SeededRng,
): MapNode[] {
  return pickRows(nodeCount, rng).map((row, index) => (
    createNode(column, row, pickType(), index, rng)
  ));
}

function createNode(
  column: number,
  row: number,
  type: MapNodeType,
  index: number,
  rng: SeededRng,
): MapNode {
  const node: MapNode = {
    id: `act1-c${column}-r${row}-${index}`,
    column,
    row,
    type,
    connections: [],
    completed: false,
  };

  if (isCombatMapNodeType(type)) {
    node.encounterId = pickEncounterId(type, rng);
  }
  if (type === 'event') {
    node.eventId = pickEventId(rng);
  }

  return node;
}

function pickRows(count: number, rng: SeededRng): number[] {
  const rows = [0, 1, 2, 3];
  for (let i = rows.length - 1; i > 0; i -= 1) {
    const j = rng.integer(0, i);
    [rows[i], rows[j]] = [rows[j], rows[i]];
  }

  return rows.slice(0, count).sort((a, b) => a - b);
}

function pickWeightedType(rng: SeededRng): MapNodeType {
  const totalWeight = MIXED_TYPE_WEIGHTS.reduce((sum, entry) => sum + entry.weight, 0);
  let roll = rng.next() * totalWeight;

  for (const entry of MIXED_TYPE_WEIGHTS) {
    roll -= entry.weight;
    if (roll <= 0) return entry.type;
  }

  return MIXED_TYPE_WEIGHTS[MIXED_TYPE_WEIGHTS.length - 1].type;
}

function pickEncounterId(type: EncounterType, rng: SeededRng): string {
  const encounters = registry.getEncountersByActAndType(ACT_NUMBER, type);
  if (encounters.length === 0) {
    throw new Error(`MapGenerator: no act ${ACT_NUMBER} encounters found for '${type}'`);
  }

  return rng.pick(encounters).id;
}

function pickEventId(rng: SeededRng): string {
  const events = registry.getAllEvents();
  if (events.length === 0) {
    throw new Error('MapGenerator: no act 1 events found');
  }

  return rng.pick(events).id;
}

function connectColumns(columns: MapNode[][], rng: SeededRng): void {
  for (let column = 0; column < columns.length - 1; column += 1) {
    const sources = columns[column];
    const targets = columns[column + 1];

    if (targets.length === 1) {
      for (const source of sources) {
        source.connections = [targets[0].id];
      }
      continue;
    }

    if (sources.length === 1) {
      sources[0].connections = targets.map((target) => target.id);
      continue;
    }

    const incomingCount = new Map(targets.map((target) => [target.id, 0]));

    for (const source of sources) {
      const connectionCount = rng.next() < 0.45 ? 2 : 1;
      const pickedTargets = pickNearestTargets(source, targets, connectionCount, rng);
      source.connections = pickedTargets.map((target) => target.id);

      for (const target of pickedTargets) {
        incomingCount.set(target.id, (incomingCount.get(target.id) ?? 0) + 1);
      }
    }

    for (const target of targets) {
      if ((incomingCount.get(target.id) ?? 0) > 0) continue;

      const parent = pickParentForOrphan(sources, target, rng);
      parent.connections.push(target.id);
      incomingCount.set(target.id, 1);
    }
  }
}

function pickNearestTargets(
  source: MapNode,
  targets: MapNode[],
  count: number,
  rng: SeededRng,
): MapNode[] {
  return targets
    .map((target) => ({
      target,
      score: Math.abs(target.row - source.row) + rng.next() * 0.3,
    }))
    .sort((a, b) => a.score - b.score)
    .slice(0, count)
    .map((entry) => entry.target);
}

function pickParentForOrphan(sources: MapNode[], target: MapNode, rng: SeededRng): MapNode {
  return sources
    .map((source) => ({
      source,
      score: Math.abs(source.row - target.row)
        + source.connections.length * 1.25
        + rng.next() * 0.25,
    }))
    .sort((a, b) => a.score - b.score)[0].source;
}

function validateAct1Map(nodes: MapNode[]): void {
  const byId = new Map<string, MapNode>();
  const incomingCount = new Map<string, number>();

  for (const node of nodes) {
    if (byId.has(node.id)) {
      throw new Error(`MapGenerator: duplicated node id '${node.id}'`);
    }
    if (node.column < 0 || node.column > ACT1_BOSS_COLUMN) {
      throw new Error(`MapGenerator: node '${node.id}' has invalid column ${node.column}`);
    }
    if (node.row < 0 || node.row > MAX_ROW) {
      throw new Error(`MapGenerator: node '${node.id}' has invalid row ${node.row}`);
    }
    if (isCombatMapNodeType(node.type) && !node.encounterId) {
      throw new Error(`MapGenerator: combat node '${node.id}' has no encounterId`);
    }

    byId.set(node.id, node);
    incomingCount.set(node.id, 0);
  }

  for (const node of nodes) {
    for (const connectionId of node.connections) {
      const target = byId.get(connectionId);
      if (!target) {
        throw new Error(`MapGenerator: node '${node.id}' connects to missing '${connectionId}'`);
      }
      if (target.column !== node.column + 1) {
        throw new Error(
          `MapGenerator: node '${node.id}' connects to non-adjacent '${connectionId}'`,
        );
      }
      incomingCount.set(connectionId, (incomingCount.get(connectionId) ?? 0) + 1);
    }
  }

  for (const node of nodes) {
    if (node.column > 0 && (incomingCount.get(node.id) ?? 0) === 0) {
      throw new Error(`MapGenerator: node '${node.id}' has no reachable parent`);
    }
    if (node.column < ACT1_BOSS_COLUMN && node.connections.length === 0) {
      throw new Error(`MapGenerator: node '${node.id}' has no outgoing connection`);
    }
  }
}

function createSeededRng(seed?: MapSeed): SeededRng {
  let state = seed === undefined ? randomSeed() : hashSeed(seed);
  if (state === 0) state = 0x6d2b79f5;

  const next = (): number => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  return {
    next,
    integer: (minInclusive: number, maxInclusive: number) => (
      Math.floor(next() * (maxInclusive - minInclusive + 1)) + minInclusive
    ),
    pick: <T>(values: readonly T[]): T => values[Math.floor(next() * values.length)],
  };
}

function randomSeed(): number {
  return Math.floor(Math.random() * 0xffffffff) >>> 0;
}

function hashSeed(seed: MapSeed): number {
  const input = String(seed);
  let hash = 2166136261;

  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}
