import type { MapNode } from './MapNode';

export class MapState {
  nodes: MapNode[];
  currentNodeId: string | null;
  actNumber: number;

  constructor(nodes: MapNode[] = [], actNumber = 1, currentNodeId: string | null = null) {
    this.nodes = nodes;
    this.actNumber = actNumber;
    this.currentNodeId = currentNodeId;
  }

  getAvailableNodes(): MapNode[] {
    if (this.currentNodeId === null) {
      return this.nodes.filter((node) => node.column === 0 && !node.completed);
    }

    const currentNode = this.getNode(this.currentNodeId);
    if (!currentNode.completed) {
      return [currentNode];
    }

    return currentNode.connections
      .map((nodeId) => this.getNode(nodeId))
      .filter((node) => !node.completed);
  }

  moveToNode(nodeId: string): MapNode {
    const availableIds = new Set(this.getAvailableNodes().map((node) => node.id));
    if (!availableIds.has(nodeId)) {
      throw new Error(`MapState: node '${nodeId}' is not available from current position`);
    }

    this.currentNodeId = nodeId;
    return this.getNode(nodeId);
  }

  completeNode(nodeId = this.currentNodeId): MapNode {
    if (nodeId === null) {
      throw new Error('MapState: cannot complete a node before the run has started');
    }

    const node = this.getNode(nodeId);
    node.completed = true;
    return node;
  }

  getCurrentNode(): MapNode | null {
    return this.currentNodeId === null ? null : this.getNode(this.currentNodeId);
  }

  getNode(nodeId: string): MapNode {
    const node = this.nodes.find((candidate) => candidate.id === nodeId);
    if (!node) {
      throw new Error(`MapState: node not found '${nodeId}'`);
    }

    return node;
  }
}
