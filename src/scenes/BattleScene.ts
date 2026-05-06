import Phaser from 'phaser';
import { SceneKeys } from '@/config/SceneKeys';
import { makeTextButton } from '@/ui/TextButton';
import { registry } from '@/data/Registry';
import { bandidoHueco } from '@/data/enemies/bandidoHueco';
import {
  BattleState,
  createCharacterInstance,
  createEnemyInstance,
  ensureBattleRuntime,
  type Combatant,
} from '@/systems/battle/BattleState';
import {
  BattleEvents,
  BattleManager,
  isCharacterInstance,
  type DefendEvent,
  type DamageEvent,
  type ResourceChangedEvent,
  type StatusAppliedEvent,
} from '@/systems/battle/BattleManager';
import type { CharacterInstance, EnemyInstance } from '@/types';

export interface BattleSceneInitData {
  party?: CharacterInstance[];
  enemies?: EnemyInstance[];
}

const PARTY_SLOT_COUNT = 4;
const ENEMY_SLOT_COUNT = 4;
const SLOT_WIDTH = 180;
const SLOT_HEIGHT = 120;
const SLOT_SPACING = 40;

const PARTY_COLOR = 0x2c4a7d;
const ENEMY_COLOR = 0x7d2c2c;
const DOWN_COLOR = 0x333333;
const TARGET_STROKE_COLOR = 0xffd166;
const DEFAULT_STROKE_COLOR = 0xffffff;

interface SlotView {
  combatant: Combatant;
  rect: Phaser.GameObjects.Rectangle;
  hpText: Phaser.GameObjects.Text;
  resourceText: Phaser.GameObjects.Text;
  battleText: Phaser.GameObjects.Text;
  baseColor: number;
}

export class BattleScene extends Phaser.Scene {
  private state!: BattleState;
  private manager!: BattleManager;
  private pendingParty?: CharacterInstance[];
  private pendingEnemies?: EnemyInstance[];

  private slotViews = new Map<Combatant, SlotView>();
  private statusText!: Phaser.GameObjects.Text;
  private roundText!: Phaser.GameObjects.Text;
  private actionButtons: Phaser.GameObjects.Text[] = [];
  private currentActor: CharacterInstance | null = null;
  private targetingActor: CharacterInstance | null = null;

  constructor() {
    super({ key: SceneKeys.BATTLE });
  }

  init(data: BattleSceneInitData): void {
    this.pendingParty = data.party;
    this.pendingEnemies = data.enemies;
    this.slotViews = new Map();
    this.actionButtons = [];
    this.currentActor = null;
    this.targetingActor = null;
  }

  create(): void {
    const party = this.pendingParty ?? this.buildDefaultParty();
    const enemies = this.pendingEnemies ?? this.buildDefaultEnemies();

    this.state = new BattleState();
    this.state.initBattle(party, enemies);
    this.manager = new BattleManager(this.state);

    this.renderEnemyRow();
    this.renderPartyRow();
    this.renderHud();
    this.createActionButtons();
    this.bindBattleEvents();

    this.manager.startBattle();
  }

  private buildDefaultParty(): CharacterInstance[] {
    return [
      createCharacterInstance(registry.getCharacter('bram')),
      createCharacterInstance(registry.getCharacter('vera')),
      createCharacterInstance(registry.getCharacter('mira')),
    ];
  }

  private buildDefaultEnemies(): EnemyInstance[] {
    return [createEnemyInstance(bandidoHueco), createEnemyInstance(bandidoHueco)];
  }

  private renderHud(): void {
    const { width } = this.scale;
    this.roundText = this.add
      .text(width / 2, 20, `Round ${this.state.currentRound}`, {
        fontSize: '18px',
        color: '#888888',
        fontFamily: 'sans-serif',
      })
      .setOrigin(0.5, 0);

    this.statusText = this.add
      .text(width / 2, 50, '', {
        fontSize: '22px',
        color: '#ffffff',
        fontFamily: 'sans-serif',
      })
      .setOrigin(0.5, 0);
  }

  private renderEnemyRow(): void {
    const y = 160;
    const rowWidth = ENEMY_SLOT_COUNT * SLOT_WIDTH + (ENEMY_SLOT_COUNT - 1) * SLOT_SPACING;
    const startX = (this.scale.width - rowWidth) / 2 + SLOT_WIDTH / 2;

    this.state.enemies.forEach((enemy, i) => {
      const x = startX + i * (SLOT_WIDTH + SLOT_SPACING);
      this.drawSlot(enemy, x, y, ENEMY_COLOR, enemy.data.name);
    });
  }

  private renderPartyRow(): void {
    const y = this.scale.height - 260;
    const rowWidth = PARTY_SLOT_COUNT * SLOT_WIDTH + (PARTY_SLOT_COUNT - 1) * SLOT_SPACING;
    const startX = (this.scale.width - rowWidth) / 2 + SLOT_WIDTH / 2;

    this.state.party.forEach((member, i) => {
      const x = startX + i * (SLOT_WIDTH + SLOT_SPACING);
      this.drawSlot(member, x, y, PARTY_COLOR, this.shortName(member.data.name));
    });
  }

  private drawSlot(combatant: Combatant, x: number, y: number, color: number, name: string): void {
    const rect = this.add
      .rectangle(x, y, SLOT_WIDTH, SLOT_HEIGHT, color)
      .setStrokeStyle(2, DEFAULT_STROKE_COLOR, 0.4)
      .setInteractive({ useHandCursor: true });

    rect.on('pointerdown', () => this.handleSlotClick(combatant));
    rect.on('pointerover', () => this.handleSlotHover(combatant, true));
    rect.on('pointerout', () => this.handleSlotHover(combatant, false));

    this.add
      .text(x, y - 24, name, {
        fontSize: '18px',
        color: '#ffffff',
        fontFamily: 'sans-serif',
      })
      .setOrigin(0.5);

    const hpText = this.add
      .text(x, y + 16, this.formatHp(combatant), {
        fontSize: '16px',
        color: '#dddddd',
        fontFamily: 'sans-serif',
      })
      .setOrigin(0.5);

    const resourceText = this.add
      .text(x, y + 40, this.formatResources(combatant), {
        fontSize: '14px',
        color: '#b8d4ff',
        fontFamily: 'sans-serif',
      })
      .setOrigin(0.5);

    const battleText = this.add
      .text(x, y + 60, this.formatBattleRuntime(combatant), {
        fontSize: '13px',
        color: '#ffd166',
        fontFamily: 'sans-serif',
      })
      .setOrigin(0.5);

    this.slotViews.set(combatant, {
      combatant,
      rect,
      hpText,
      resourceText,
      battleText,
      baseColor: color,
    });
  }

  private createActionButtons(): void {
    const actions = [
      { label: 'Atacar', onClick: () => this.beginBasicAttackTargeting() },
      { label: 'Habilidad', onClick: () => this.showUnavailableAction('Habilidad') },
      { label: 'Defender', onClick: () => this.performDefend() },
      { label: 'Objeto', onClick: () => this.showUnavailableAction('Objeto') },
    ];
    const { width, height } = this.scale;
    const spacing = 200;
    const totalWidth = (actions.length - 1) * spacing;
    const startX = width / 2 - totalWidth / 2;
    const y = height - 80;

    actions.forEach((action, i) => {
      const btn = makeTextButton(this, startX + i * spacing, y, action.label, action.onClick);
      btn.setVisible(false);
      this.actionButtons.push(btn);
    });

    makeTextButton(this, width / 2, height - 30, 'Volver al mapa', () => {
      this.scene.start(SceneKeys.MAP);
    });
  }

  private beginBasicAttackTargeting(): void {
    if (!this.currentActor) return;

    const basicSkill = registry.getSkill(
      this.currentActor.data.skillIds.find((id) => id.endsWith('_basic')) ?? '',
    );
    this.targetingActor = this.currentActor;
    this.statusText.setText(`${this.combatantName(this.currentActor)}: ${basicSkill.name}`);
    this.updateTargetHighlights();
  }

  private performDefend(): void {
    if (!this.currentActor) return;

    const actor = this.currentActor;
    this.clearTargeting();
    this.setActionButtonsVisible(false);
    this.currentActor = null;
    this.manager.performDefend(actor);
  }

  private showUnavailableAction(label: string): void {
    if (!this.currentActor) return;
    this.clearTargeting();
    this.statusText.setText(`${label} llega en el siguiente ticket`);
  }

  private handleSlotClick(combatant: Combatant): void {
    if (!this.targetingActor || isCharacterInstance(combatant) || combatant.isDown) return;

    const actor = this.targetingActor;
    this.clearTargeting();
    this.setActionButtonsVisible(false);
    this.currentActor = null;
    this.manager.performBasicAttack(actor, combatant);
  }

  private handleSlotHover(combatant: Combatant, isHovered: boolean): void {
    const view = this.slotViews.get(combatant);
    if (!view || !this.isTargetableEnemy(combatant)) return;

    view.rect.setStrokeStyle(
      isHovered ? 5 : 4,
      TARGET_STROKE_COLOR,
      isHovered ? 1 : 0.9,
    );
  }

  private clearTargeting(): void {
    this.targetingActor = null;
    this.updateTargetHighlights();
  }

  private updateTargetHighlights(): void {
    for (const [combatant, view] of this.slotViews) {
      if (this.isTargetableEnemy(combatant)) {
        view.rect.setStrokeStyle(4, TARGET_STROKE_COLOR, 0.9);
      } else {
        view.rect.setStrokeStyle(2, DEFAULT_STROKE_COLOR, 0.4);
      }
    }
  }

  private isTargetableEnemy(combatant: Combatant): combatant is EnemyInstance {
    return Boolean(this.targetingActor) && !isCharacterInstance(combatant) && !combatant.isDown;
  }

  private bindBattleEvents(): void {
    const e = this.manager.events;

    e.on(BattleEvents.ROUND_STARTED, (round: number) => {
      console.log(`[battle] round ${round} start`);
      this.roundText.setText(`Round ${round}`);
    });

    e.on(BattleEvents.TURN_START, (actor: Combatant) => {
      const name = isCharacterInstance(actor)
        ? this.shortName(actor.data.name)
        : actor.data.name;
      console.log(`[battle] turn_start: ${name}`);
      this.statusText.setText(`Turno de ${name}`);
    });

    e.on(BattleEvents.PLAYER_TURN_START, (actor: CharacterInstance) => {
      this.currentActor = actor;
      this.clearTargeting();
      this.refreshSlot(actor);
      this.setActionButtonsVisible(true);
    });

    e.on(BattleEvents.ENEMY_TURN_START, () => {
      this.currentActor = null;
      this.clearTargeting();
      this.setActionButtonsVisible(false);
    });

    e.on(BattleEvents.DAMAGE_DEALT, (ev: DamageEvent) => {
      console.log(
        `[battle] damage_dealt: ${ev.amount} -> ${this.combatantName(ev.target)}`
        + ` crit=${ev.wasCrit} block=${ev.blocked}`,
      );
      this.refreshSlot(ev.source);
      this.refreshSlot(ev.target);
      this.showFloatingDamage(ev);
    });

    e.on(BattleEvents.UNIT_DIED, (unit: Combatant) => {
      console.log(`[battle] unit_died: ${this.combatantName(unit)}`);
      this.markSlotDown(unit);
    });

    e.on(BattleEvents.RESOURCE_CHANGED, (ev: ResourceChangedEvent) => {
      console.log(
        `[battle] resource_changed: ${this.combatantName(ev.unit)} +${ev.vigorDelta} vigor`,
      );
      this.refreshSlot(ev.unit);
      this.showFloatingText(ev.unit, `+${ev.vigorDelta} V`, '#8ee6a8');
    });

    e.on(BattleEvents.DEFENDED, (ev: DefendEvent) => {
      console.log(`[battle] defended: ${this.combatantName(ev.actor)} +${ev.defendBonus}`);
      this.refreshSlot(ev.actor);
      this.showFloatingText(ev.actor, `DEF +${ev.defendBonus}`, '#9fd1ff');
    });

    e.on(BattleEvents.STATUS_APPLIED, (ev: StatusAppliedEvent) => {
      console.log(
        `[battle] status_applied: ${ev.statusId} x${ev.stacks} -> ${this.combatantName(ev.target)}`,
      );
      this.showFloatingText(ev.target, ev.statusId, '#d4a5ff');
    });

    e.on(BattleEvents.ROUND_ENDED, (round: number) => {
      console.log(`[battle] round_ended: ${round}`);
    });

    e.on(BattleEvents.BATTLE_WON, () => {
      console.log('[battle] battle_won');
      this.clearTargeting();
      this.setActionButtonsVisible(false);
      this.statusText.setText('¡Victoria!');
      this.state.party.forEach((p) => this.refreshSlot(p));
      this.time.delayedCall(2000, () => this.scene.start(SceneKeys.MAP));
    });

    e.on(BattleEvents.BATTLE_LOST, () => {
      console.log('[battle] battle_lost');
      this.clearTargeting();
      this.setActionButtonsVisible(false);
      this.statusText.setText('Derrota...');
      this.time.delayedCall(2000, () => this.scene.start(SceneKeys.GAME_OVER));
    });
  }

  private setActionButtonsVisible(visible: boolean): void {
    this.actionButtons.forEach((b) => b.setVisible(visible));
  }

  private refreshSlot(combatant: Combatant): void {
    const view = this.slotViews.get(combatant);
    if (!view) return;
    view.rect.fillColor = combatant.isDown ? DOWN_COLOR : view.baseColor;
    view.hpText.setText(this.formatHp(combatant));
    view.resourceText.setText(this.formatResources(combatant));
    view.battleText.setText(this.formatBattleRuntime(combatant));
    this.updateTargetHighlights();
  }

  private markSlotDown(combatant: Combatant): void {
    const view = this.slotViews.get(combatant);
    if (!view) return;
    view.rect.fillColor = DOWN_COLOR;
    view.hpText.setText(this.formatHp(combatant));
    view.resourceText.setText(this.formatResources(combatant));
    view.battleText.setText(this.formatBattleRuntime(combatant));
    this.updateTargetHighlights();
  }

  private formatHp(combatant: Combatant): string {
    return `HP ${combatant.currentStats.hp}/${combatant.currentStats.hpMax}`;
  }

  private formatResources(combatant: Combatant): string {
    if (!isCharacterInstance(combatant)) return '';

    const resources = combatant.currentResources;
    const parts = [`V ${resources.vigor}/${resources.vigorMax}`];
    if (resources.manaMax > 0) {
      parts.push(`M ${resources.mana}/${resources.manaMax}`);
    }
    return parts.join('  ');
  }

  private formatBattleRuntime(combatant: Combatant): string {
    const runtime = ensureBattleRuntime(combatant);
    const parts: string[] = [];

    if (runtime.block > 0) {
      parts.push(`Bloque ${runtime.block}`);
    }
    if (runtime.defendBonus > 0) {
      parts.push(`DEF +${runtime.defendBonus}`);
    }

    return parts.join('  ');
  }

  private showFloatingDamage(ev: DamageEvent): void {
    const pieces: string[] = [];
    if (ev.wasCrit) {
      pieces.push('CRIT!');
    }
    pieces.push(ev.amount > 0 ? `-${ev.amount}` : '0');
    if (ev.blocked > 0) {
      pieces.push(`Block ${ev.blocked}`);
    }

    const color = ev.wasCrit ? '#ffd166' : ev.amount > 0 ? '#ff9f9f' : '#9fd1ff';
    this.showFloatingText(ev.target, pieces.join(' '), color);
  }

  private showFloatingText(combatant: Combatant, text: string, color: string): void {
    const view = this.slotViews.get(combatant);
    if (!view) return;

    const floating = this.add
      .text(view.rect.x, view.rect.y - 72, text, {
        fontSize: '22px',
        color,
        fontFamily: 'sans-serif',
        stroke: '#000000',
        strokeThickness: 4,
      })
      .setOrigin(0.5);

    this.tweens.add({
      targets: floating,
      y: floating.y - 42,
      alpha: 0,
      duration: 800,
      ease: 'Cubic.easeOut',
      onComplete: () => floating.destroy(),
    });
  }

  private combatantName(c: Combatant): string {
    return isCharacterInstance(c) ? this.shortName(c.data.name) : c.data.name;
  }

  private shortName(fullName: string): string {
    const comma = fullName.indexOf(',');
    return comma >= 0 ? fullName.slice(0, comma) : fullName;
  }
}
