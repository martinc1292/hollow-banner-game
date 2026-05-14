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
import { THEME } from '@/ui/UITheme';
import { drawCornerBox, drawSeparator, addVignette } from '@/ui/UIHelpers';

interface MapSceneInitData {
  completedCombat?: boolean;
}

const NODE_RADIUS = 24;
const MAP_LEFT = 120;
const MAP_RIGHT = 1140;
const MAP_TOP = 150;
const MAP_BOTTOM = 600;

// Colores semánticos de nodos — no cambian con el tema
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

    this.addMapObject(this.add.rectangle(width / 2, height / 2, width, height, THEME.bgDeep, 1));
    this.addMapObject(addVignette(this, width, height));
    this.renderSubtleGrid();
    this.renderHud();
    this.renderConnections(mapState.nodes);
    this.renderNodes(mapState.nodes);
    this.renderLegend();
  }

  private renderSubtleGrid(): void {
    const grid = this.add.graphics();
    grid.lineStyle(1, THEME.accentDeep, 0.07);

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

    // Header background
    const headerGfx = this.add.graphics();
    headerGfx.fillStyle(THEME.bgPanel, 0.85);
    headerGfx.fillRect(0, 0, width, 92);
    this.addMapObject(headerGfx);
    this.addMapObject(drawSeparator(this, 0, 92, width, THEME.accent, 0.3));

    this.addMapObject(this.add.text(42, 22, 'ACTO I', {
      ...THEME.fonts.heading,
      fontSize: '28px',
    }));

    this.addMapObject(this.add.text(42, 58, 'Ruta de los caídos', {
      ...THEME.fonts.dialogue,
      fontSize: '14px',
      color: THEME.textDim,
    }));

    const meta = gameState.runMeta;
    const inventoryText = [
      `ORO: ${meta.gold}`,
      meta.items.length ? `ITEMS: ${meta.items.length}` : '',
      meta.relics.length ? `RELIQUIAS: ${meta.relics.length}` : '',
    ].filter(Boolean).join('   ');

    this.addMapObject(this.add.text(width - 44, 34, inventoryText, {
      ...THEME.fonts.hudSmall,
      color: THEME.accentHex,
      letterSpacing: 2,
    }).setOrigin(1, 0));

    const partyButton = makeTextButton(this, 95, 116, 'VER PARTY', () => {
      this.scene.start(SceneKeys.INVENTORY, { returnScene: SceneKeys.MAP });
    }, { fontSize: '14px', letterSpacing: 2 });
    this.addMapObject(partyButton);

    const inventoryButton = makeTextButton(this, 230, 116, 'INVENTARIO', () => {
      this.scene.start(SceneKeys.INVENTORY, { returnScene: SceneKeys.MAP });
    }, { fontSize: '14px', letterSpacing: 2 });
    this.addMapObject(inventoryButton);

    const menuButton = makeTextButton(this, width - 92, 116, 'MENÚ', () => {
      this.showMenuConfirmation();
    }, { fontSize: '14px', letterSpacing: 2, color: THEME.textDim });
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
        const color = isOpenPath ? THEME.accent : isCompletedPath ? THEME.accentDim : THEME.accentDeep;
        const alpha = isOpenPath ? 0.8 : isCompletedPath ? 0.4 : 0.2;
        const lineWidth = isOpenPath ? 2 : 1;

        graphics.lineStyle(lineWidth, color, alpha);
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
      const fillColor = isCompleted ? 0x2a2730 : NODE_COLORS[node.type];
      const strokeColor = isCurrent ? THEME.accent : isAvailable ? THEME.accent : THEME.accentDeep;
      const strokeAlpha = isAvailable || isCurrent ? 0.9 : 0.3;
      const strokeWidth = isCurrent ? 3 : isAvailable ? 2 : 1;

      if (isAvailable) {
        const pulse = this.add.circle(position.x, position.y, NODE_RADIUS + 8, THEME.accent, 0.1);
        this.addMapObject(pulse);
        this.tweens.add({
          targets: pulse,
          scale: { from: 0.85, to: 1.4 },
          alpha: { from: 0.15, to: 0.02 },
          duration: 1100,
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
        ...THEME.fonts.hud,
        fontSize: node.type === 'miniboss' ? '14px' : '16px',
        color: isCompleted ? THEME.textDim : THEME.textPrimary,
        letterSpacing: 0,
      }).setOrigin(0.5);
      label.setAlpha(alpha);
      this.addMapObject(label);

      if (isCompleted) {
        const check = this.add.text(position.x + 17, position.y - 19, '◆', {
          ...THEME.fonts.hudSmall,
          color: THEME.accentHex,
        }).setOrigin(0.5);
        this.addMapObject(check);
      }

      const caption = this.add.text(position.x, position.y + NODE_RADIUS + 11, NODE_NAMES[node.type].toUpperCase(), {
        ...THEME.fonts.hudSmall,
        fontSize: '10px',
        color: isAvailable ? THEME.accentHex : THEME.textDim,
        letterSpacing: 1,
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
    this.addMapObject(this.add.text(this.scale.width / 2, 672, legend, {
      ...THEME.fonts.hudSmall,
      color: THEME.textDim,
      fontSize: '12px',
      letterSpacing: 1,
    }).setOrigin(0.5));
  }

  private handleNodeClick(nodeId: string): void {
    if (this.returnToActiveCombat()) return;

    const mapState = gameState.ensureAct1Map();
    const node = mapState.moveToNode(nodeId);

    if (isCombatMapNodeType(node.type)) {
      this.startCombatNode(node);
      return;
    }
    if (node.type === 'shop') { this.scene.start(SceneKeys.SHOP); return; }
    if (node.type === 'camp') { this.scene.start(SceneKeys.CAMP); return; }
    if (node.type === 'treasure') { this.scene.start(SceneKeys.TREASURE); return; }
    if (node.type === 'event') { this.scene.start(SceneKeys.EVENT, { eventId: node.eventId }); return; }
    if (node.type === 'special') {
      this.scene.start(SceneKeys.EVENT, { eventId: 'santuario_del_estandarte' });
      return;
    }

    mapState.completeNode(node.id);
    saveManager.save();
    this.renderMap();
  }

  private startCombatNode(node: MapNode): void {
    if (!node.encounterId) {
      throw new Error(`MapScene: combat node '${node.id}' has no encounterId`);
    }
    this.scene.start(SceneKeys.BATTLE, {
      party: this.getPartyForBattle(),
      encounterId: node.encounterId,
    } as BattleSceneInitData);
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
    const toastW = 360;
    const toastH = 44;
    const toastX = width / 2 - toastW / 2;
    const toastY = 99;

    const toastGfx = this.add.graphics();
    toastGfx.fillStyle(THEME.bgPanel, 0.95);
    toastGfx.fillRect(toastX, toastY, toastW, toastH);
    drawCornerBox(toastGfx, toastX, toastY, toastW, toastH, 8, THEME.accent, 0.7);

    const text = this.add.text(width / 2, toastY + toastH / 2, message, {
      ...THEME.fonts.hud,
      fontSize: '15px',
      color: THEME.textPrimary,
    }).setOrigin(0.5);

    this.toastObjects.push(toastGfx, text);
    this.time.delayedCall(1800, () => this.clearToast());
  }

  private showMenuConfirmation(): void {
    this.clearConfirmation();

    const { width, height } = this.scale;
    const pw = 440, ph = 180;
    const px = width / 2 - pw / 2;
    const py = height / 2 - ph / 2;

    const shade = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.65);
    const panelGfx = this.add.graphics();
    panelGfx.fillStyle(THEME.bgPanel, 0.97);
    panelGfx.fillRect(px, py, pw, ph);
    drawCornerBox(panelGfx, px, py, pw, ph, 16, THEME.accent, 0.9);

    const title = this.add.text(width / 2, height / 2 - 46, '¿VOLVER AL MENÚ?', {
      ...THEME.fonts.heading,
      fontSize: '22px',
    }).setOrigin(0.5);

    const body = this.add.text(width / 2, height / 2 - 10, 'Se perderá el progreso de la run actual.', {
      ...THEME.fonts.dialogue,
      fontSize: '15px',
      color: THEME.textDim,
    }).setOrigin(0.5);

    drawSeparator(this, width / 2 - 160, height / 2 + 14, 320, THEME.accentDim, 0.4);

    const cancel = makeTextButton(this, width / 2 - 90, height / 2 + 52, 'CANCELAR', () => {
      this.clearConfirmation();
    }, { fontSize: '16px', color: THEME.textDim, letterSpacing: 2 });

    const accept = makeTextButton(this, width / 2 + 90, height / 2 + 52, 'SALIR', () => {
      gameState.reset();
      this.scene.start(SceneKeys.MAIN_MENU);
    }, { fontSize: '16px', letterSpacing: 2 });

    this.confirmObjects.push(shade, panelGfx, title, body, cancel, accept);
  }

  private renderActCompleteScreen(): void {
    const { width, height } = this.scale;

    this.add.rectangle(width / 2, height / 2, width, height, THEME.bgDeep, 1);
    addVignette(this, width, height);
    drawSeparator(this, width / 2 - 300, height / 2 - 100, 600);

    this.add.text(width / 2, height / 2 - 60, 'ACTO I COMPLETADO', {
      ...THEME.fonts.title,
      fontSize: '48px',
    }).setOrigin(0.5);

    this.add.text(width / 2, height / 2, 'La ruta queda atrás. El estandarte sigue en pie.', {
      ...THEME.fonts.dialogue,
      fontSize: '18px',
      color: THEME.textDim,
    }).setOrigin(0.5);

    drawSeparator(this, width / 2 - 200, height / 2 + 36, 400, THEME.accentDim, 0.4);

    makeTextButton(this, width / 2, height / 2 + 80, 'VOLVER AL MENÚ', () => {
      gameState.reset();
      this.scene.start(SceneKeys.MAIN_MENU);
    }, { fontSize: '22px', letterSpacing: 3 });
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
