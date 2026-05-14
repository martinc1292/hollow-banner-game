import Phaser from 'phaser';
import { SceneKeys } from '@/config/SceneKeys';
import { makeTextButton } from '@/ui/TextButton';
import { registry } from '@/data/Registry';
import { gameState } from '@/systems/GameState';
import { saveManager } from '@/systems/SaveManager';
import { createCharacterInstance } from '@/systems/battle/BattleState';
import {
  isCombatMapNodeType,
  type MapNode,
  type MapNodeType,
} from '@/systems/map/MapNode';
import type { BattleSceneInitData } from '@/scenes/BattleScene';

interface MapSceneInitData {
  completedCombat?: boolean;
}

const NODE_RADIUS = 24;
const MAP_LEFT = 120;
const MAP_RIGHT = 1140;
const MAP_TOP = 150;
const MAP_BOTTOM = 600;
const NODE_COLORS: Record<MapNodeType, number> = {
  normal: 0x2f5d7c,
  elite: 0x8f3b36,
  event: 0x6f628f,
  shop: 0x8a6b34,
  camp: 0x4f7a45,
  treasure: 0xb8903f,
  miniboss: 0x8b3e55,
  boss: 0x9b2f2f,
  special: 0x4e6b75,
};
const NODE_LABELS: Record<MapNodeType, string> = {
  normal: 'N',
  elite: 'E',
  event: 'V',
  shop: 'S',
  camp: 'C',
  treasure: 'T',
  miniboss: 'M',
  boss: 'J',
  special: 'X',
};
const NODE_NAMES: Record<MapNodeType, string> = {
  normal: 'Combate',
  elite: 'Elite',
  event: 'Evento',
  shop: 'Tienda',
  camp: 'Campamento',
  treasure: 'Tesoro',
  miniboss: 'Mini-jefe',
  boss: 'Jefe',
  special: 'Especial',
};

export class MapScene extends Phaser.Scene {
  private pendingCombatCompletion = false;
  private mapObjects: Phaser.GameObjects.GameObject[] = [];
  private toastObjects: Phaser.GameObjects.GameObject[] = [];
  private confirmObjects: Phaser.GameObjects.GameObject[] = [];

  constructor() {
    super({ key: SceneKeys.MAP });
  }

  init(data: MapSceneInitData = {}): void {
    this.pendingCombatCompletion = Boolean(data.completedCombat);
    this.mapObjects = [];
    this.toastObjects = [];
    this.confirmObjects = [];
  }

  create(): void {
    const mapState = gameState.ensureAct1Map();

    if (this.pendingCombatCompletion) {
      gameState.clearActiveCombat();
      const completedNode = mapState.getCurrentNode();
      if (completedNode && !completedNode.completed) {
        mapState.completeNode(completedNode.id);
      }
      saveManager.save();
    } else if (this.returnToActiveCombat()) {
      return;
    }

    const currentNode = mapState.getCurrentNode();
    if (currentNode?.type === 'boss' && currentNode.completed) {
      this.renderActCompleteScreen();
      return;
    }

    const skippedNodeId = gameState.consumeSkipNextFreeNode();
    this.renderMap();
    if (skippedNodeId) {
      this.showToast('Tiempo perdido: un nodo no-combate se cierra.');
    }
  }

  private renderMap(): void {
    this.clearMapObjects();

    const { width, height } = this.scale;
    const mapState = gameState.ensureAct1Map();

    this.addMapObject(this.add.rectangle(width / 2, height / 2, width, height, 0x151312, 1));
    this.renderSubtleGrid();
    this.renderHud();
    this.renderConnections(mapState.nodes);
    this.renderNodes(mapState.nodes);
    this.renderLegend();
  }

  private renderSubtleGrid(): void {
    const grid = this.add.graphics();
    grid.lineStyle(1, 0x2a2722, 0.35);

    for (let x = MAP_LEFT; x <= MAP_RIGHT; x += 85) {
      grid.lineBetween(x, MAP_TOP - 28, x, MAP_BOTTOM + 32);
    }

    for (let y = MAP_TOP - 20; y <= MAP_BOTTOM + 40; y += 60) {
      grid.lineBetween(MAP_LEFT - 28, y, MAP_RIGHT + 28, y);
    }

    this.addMapObject(grid);
  }

  private renderHud(): void {
    const { width } = this.scale;

    this.addMapObject(this.add.text(42, 28, 'Acto 1', {
      fontSize: '30px',
      color: '#f0e4c8',
      fontFamily: 'Georgia, serif',
    }));

    this.addMapObject(this.add.text(42, 64, 'Ruta de los caidos', {
      fontSize: '15px',
      color: '#9c927e',
      fontFamily: 'Georgia, serif',
    }));

    const meta = gameState.runMeta;
    const inventoryText = [
      `Oro ${meta.gold}`,
      `Items ${meta.items.length ? meta.items.join(', ') : '-'}`,
      `Reliquias ${meta.relics.length ? meta.relics.join(', ') : '-'}`,
    ].join('\n');

    this.addMapObject(this.add.text(width - 44, 28, inventoryText, {
      fontSize: '16px',
      color: '#d5c7a7',
      fontFamily: 'Georgia, serif',
      align: 'right',
      lineSpacing: 7,
    }).setOrigin(1, 0));

    const partyButton = makeTextButton(this, 95, 116, 'Ver party', () => {
      this.showToast('Party (a implementar)');
    }, {
      fontSize: '18px',
      color: '#d5c7a7',
      fontFamily: 'Georgia, serif',
    });
    this.addMapObject(partyButton);

    const inventoryButton = makeTextButton(this, 220, 116, 'Inventario', () => {
      this.scene.start(SceneKeys.INVENTORY, { returnScene: SceneKeys.MAP });
    }, {
      fontSize: '18px',
      color: '#d5c7a7',
      fontFamily: 'Georgia, serif',
    });
    this.addMapObject(inventoryButton);

    const menuButton = makeTextButton(this, width - 92, 116, 'Volver al menu', () => {
      this.showMenuConfirmation();
    }, {
      fontSize: '18px',
      color: '#d5c7a7',
      fontFamily: 'Georgia, serif',
    });
    this.addMapObject(menuButton);
  }

  private renderConnections(nodes: MapNode[]): void {
    const graphics = this.add.graphics();
    const byId = new Map(nodes.map((node) => [node.id, node]));
    const mapState = gameState.ensureAct1Map();
    const availableIds = new Set(mapState.getAvailableNodes().map((node) => node.id));
    const currentId = mapState.currentNodeId;

    for (const node of nodes) {
      const from = this.positionForNode(node);
      for (const connectionId of node.connections) {
        const target = byId.get(connectionId);
        if (!target) continue;

        const to = this.positionForNode(target);
        const isOpenPath = currentId === node.id && availableIds.has(connectionId);
        const isCompletedPath = node.completed;
        const color = isOpenPath ? 0xd7b35a : isCompletedPath ? 0x807457 : 0x4a4439;
        const alpha = isOpenPath ? 0.9 : isCompletedPath ? 0.55 : 0.28;
        const width = isOpenPath ? 3 : 2;

        graphics.lineStyle(width, color, alpha);
        graphics.lineBetween(from.x, from.y, to.x, to.y);
      }
    }

    this.addMapObject(graphics);
  }

  private renderNodes(nodes: MapNode[]): void {
    const mapState = gameState.ensureAct1Map();
    const availableIds = new Set(mapState.getAvailableNodes().map((node) => node.id));
    const currentId = mapState.currentNodeId;

    for (const node of nodes) {
      const position = this.positionForNode(node);
      const isAvailable = availableIds.has(node.id);
      const isCurrent = currentId === node.id;
      const isCompleted = node.completed;
      const alpha = isAvailable || isCurrent || isCompleted ? 1 : 0.28;
      const fillColor = isCompleted ? 0x55534f : NODE_COLORS[node.type];
      const strokeColor = isCurrent ? 0xf0c85a : isAvailable ? 0xffdf86 : 0xbfb49a;
      const strokeAlpha = isAvailable || isCurrent ? 0.95 : 0.35;
      const strokeWidth = isCurrent ? 4 : isAvailable ? 3 : 1;

      if (isAvailable) {
        const pulse = this.add.circle(position.x, position.y, NODE_RADIUS + 8, 0xffd56e, 0.12);
        this.addMapObject(pulse);
        this.tweens.add({
          targets: pulse,
          scale: { from: 0.85, to: 1.3 },
          alpha: { from: 0.2, to: 0.02 },
          duration: 950,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        });
      }

      const circle = this.add
        .circle(position.x, position.y, NODE_RADIUS, fillColor, alpha)
        .setStrokeStyle(strokeWidth, strokeColor, strokeAlpha);
      this.addMapObject(circle);

      const label = this.add.text(position.x, position.y, NODE_LABELS[node.type], {
        fontSize: node.type === 'miniboss' ? '18px' : '20px',
        color: isCompleted ? '#cfc7b7' : '#fff3d2',
        fontFamily: 'Georgia, serif',
        fontStyle: 'bold',
      }).setOrigin(0.5);
      label.setAlpha(alpha);
      this.addMapObject(label);

      if (isCompleted) {
        const check = this.add.text(position.x + 17, position.y - 19, '✓', {
          fontSize: '18px',
          color: '#d9c179',
          fontFamily: 'Georgia, serif',
          fontStyle: 'bold',
        }).setOrigin(0.5);
        this.addMapObject(check);
      }

      const caption = this.add.text(position.x, position.y + NODE_RADIUS + 11, NODE_NAMES[node.type], {
        fontSize: '11px',
        color: isAvailable ? '#e6cf93' : '#8e8574',
        fontFamily: 'Georgia, serif',
      }).setOrigin(0.5, 0);
      caption.setAlpha(isAvailable || isCurrent ? 1 : 0.48);
      this.addMapObject(caption);

      if (isAvailable) {
        circle.setInteractive({ useHandCursor: true });
        label.setInteractive({ useHandCursor: true });
        circle.on('pointerover', () => this.setNodeHover(circle, true));
        circle.on('pointerout', () => this.setNodeHover(circle, false));
        circle.on('pointerdown', () => this.handleNodeClick(node.id));
        label.on('pointerdown', () => this.handleNodeClick(node.id));
      }
    }
  }

  private renderLegend(): void {
    const legend = 'N combate  E elite  V evento  S tienda  C camp  T tesoro  M mini-jefe  J jefe';
    this.addMapObject(this.add.text(this.scale.width / 2, 668, legend, {
      fontSize: '14px',
      color: '#817765',
      fontFamily: 'Georgia, serif',
    }).setOrigin(0.5));
  }

  private handleNodeClick(nodeId: string): void {
    if (this.returnToActiveCombat()) {
      return;
    }

    const mapState = gameState.ensureAct1Map();
    const node = mapState.moveToNode(nodeId);

    if (isCombatMapNodeType(node.type)) {
      this.startCombatNode(node);
      return;
    }

    if (node.type === 'shop') {
      this.scene.start(SceneKeys.SHOP);
      return;
    }

    if (node.type === 'camp') {
      this.scene.start(SceneKeys.CAMP);
      return;
    }

    if (node.type === 'treasure') {
      this.scene.start(SceneKeys.TREASURE);
      return;
    }

    if (node.type === 'event') {
      this.scene.start(SceneKeys.EVENT, { eventId: node.eventId });
      return;
    }

    mapState.completeNode(node.id);
    saveManager.save();
    this.renderMap();
    this.showToast(`${NODE_NAMES[node.type]} (a implementar)`);
  }

  private startCombatNode(node: MapNode): void {
    if (!node.encounterId) {
      throw new Error(`MapScene: combat node '${node.id}' has no encounterId`);
    }

    const data: BattleSceneInitData = {
      party: this.getPartyForBattle(),
      encounterId: node.encounterId,
    };

    this.scene.start(SceneKeys.BATTLE, data);
  }

  private returnToActiveCombat(): boolean {
    const activeCombat = gameState.runMeta.activeCombat;
    if (!activeCombat) return false;

    this.scene.start(SceneKeys.BATTLE, {
      party: this.getPartyForBattle(),
      encounterId: activeCombat.encounterId,
    });
    return true;
  }

  private getPartyForBattle(): BattleSceneInitData['party'] {
    if (gameState.party.length === 0) {
      gameState.setParty([
        createCharacterInstance(registry.getCharacter('bram')),
        createCharacterInstance(registry.getCharacter('vera')),
        createCharacterInstance(registry.getCharacter('mira')),
      ]);
    }

    return gameState.party;
  }

  private positionForNode(node: MapNode): { x: number; y: number } {
    const xStep = (MAP_RIGHT - MAP_LEFT) / 6;
    const x = MAP_LEFT + node.column * xStep;
    const yStep = (MAP_BOTTOM - MAP_TOP) / 3;
    const y = MAP_TOP + node.row * yStep;
    return { x, y };
  }

  private setNodeHover(circle: Phaser.GameObjects.Arc, isHovered: boolean): void {
    circle.setScale(isHovered ? 1.12 : 1);
  }

  private showToast(message: string): void {
    this.clearToast();

    const { width } = this.scale;
    const bg = this.add.rectangle(width / 2, 105, 340, 42, 0x24201b, 0.92)
      .setStrokeStyle(1, 0x8b7652, 0.8);
    const text = this.add.text(width / 2, 105, message, {
      fontSize: '17px',
      color: '#f0e4c8',
      fontFamily: 'Georgia, serif',
    }).setOrigin(0.5);

    this.toastObjects.push(bg, text);
    this.time.delayedCall(1500, () => this.clearToast());
  }

  private showMenuConfirmation(): void {
    this.clearConfirmation();

    const { width, height } = this.scale;
    const shade = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.55);
    const panel = this.add.rectangle(width / 2, height / 2, 420, 170, 0x201c18, 0.98)
      .setStrokeStyle(2, 0xb99a58, 0.8);
    const title = this.add.text(width / 2, height / 2 - 48, 'Volver al menu?', {
      fontSize: '24px',
      color: '#f0e4c8',
      fontFamily: 'Georgia, serif',
    }).setOrigin(0.5);
    const body = this.add.text(width / 2, height / 2 - 12, 'Se perdera la run actual.', {
      fontSize: '16px',
      color: '#aaa08c',
      fontFamily: 'Georgia, serif',
    }).setOrigin(0.5);
    const cancel = makeTextButton(this, width / 2 - 85, height / 2 + 48, 'Cancelar', () => {
      this.clearConfirmation();
    }, {
      fontSize: '18px',
      color: '#d5c7a7',
      fontFamily: 'Georgia, serif',
    });
    const accept = makeTextButton(this, width / 2 + 85, height / 2 + 48, 'Salir', () => {
      gameState.reset();
      this.scene.start(SceneKeys.MAIN_MENU);
    }, {
      fontSize: '18px',
      color: '#e3b360',
      fontFamily: 'Georgia, serif',
    });

    this.confirmObjects.push(shade, panel, title, body, cancel, accept);
  }

  private renderActCompleteScreen(): void {
    const { width, height } = this.scale;

    this.add.rectangle(width / 2, height / 2, width, height, 0x14110f, 1);
    this.add.text(width / 2, height / 2 - 70, 'Acto 1 completado', {
      fontSize: '48px',
      color: '#f0d37a',
      fontFamily: 'Georgia, serif',
    }).setOrigin(0.5);
    this.add.text(width / 2, height / 2 - 14, 'La ruta queda atras. El estandarte sigue en pie.', {
      fontSize: '18px',
      color: '#a99e87',
      fontFamily: 'Georgia, serif',
    }).setOrigin(0.5);

    makeTextButton(this, width / 2, height / 2 + 72, 'Volver al menu', () => {
      gameState.reset();
      this.scene.start(SceneKeys.MAIN_MENU);
    }, {
      fontSize: '24px',
      color: '#d5c7a7',
      fontFamily: 'Georgia, serif',
    });
  }

  private addMapObject<T extends Phaser.GameObjects.GameObject>(object: T): T {
    this.mapObjects.push(object);
    return object;
  }

  private clearMapObjects(): void {
    for (const object of this.mapObjects) {
      object.destroy();
    }
    this.mapObjects = [];
    this.clearToast();
    this.clearConfirmation();
  }

  private clearToast(): void {
    for (const object of this.toastObjects) {
      object.destroy();
    }
    this.toastObjects = [];
  }

  private clearConfirmation(): void {
    for (const object of this.confirmObjects) {
      object.destroy();
    }
    this.confirmObjects = [];
  }
}
