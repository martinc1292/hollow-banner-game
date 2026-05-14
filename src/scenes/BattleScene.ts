import Phaser from 'phaser';
import { SceneKeys } from '@/config/SceneKeys';
import { makeTextButton } from '@/ui/TextButton';
import { registry } from '@/data/Registry';
import { getSpecialCombatReward } from '@/data/SpecialCombatRewards';
import { THEME } from '@/ui/UITheme';
import { drawCornerBox, drawSeparator, addVignette } from '@/ui/UIHelpers';
import {
  ACTIVE_TURN_STROKE,
  DEFAULT_ENCOUNTER_ID,
  DOWN_COLOR,
  ENEMY_COLOR,
  ENEMY_PORTRAIT_ASSETS,
  ENEMY_SLOT_COUNT,
  HP_BAR_BG,
  HP_BAR_FG,
  HP_BAR_FG_LOW,
  LOG_LINES,
  PARTY_COLOR,
  PARTY_SLOT_COUNT,
  PARTY_SLOT_HEIGHT,
  PARTY_SLOT_WIDTH,
  PORTRAIT_ASSETS,
  RESOURCE_BAR_BG,
  RESOURCE_BAR_MANA,
  RESOURCE_BAR_VIGOR,
  ROW_ACTIONS_Y,
  ROW_ENEMY_Y,
  ROW_PARTY_Y,
  SLOT_HEIGHT,
  SLOT_SPACING,
  SLOT_WIDTH,
  TARGET_STROKE_COLOR,
  TURN_QUEUE_Y,
} from '@/scenes/battle/BattleSceneLayout';
import type { SlotView } from '@/scenes/battle/BattleSceneViewTypes';
import { gameState } from '@/systems/GameState';
import { saveManager } from '@/systems/SaveManager';
import { soundManager } from '@/systems/SoundManager';
import {
  awardXp,
  getCombatXp,
  rollCombatGold,
  type CombatRewardSummary,
} from '@/systems/Progression';
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
  type ConsumableUsedEvent,
  type DefendEvent,
  type DamageEvent,
  type EnemyWillAttackEvent,
  type HealedEvent,
  type RelicTriggeredEvent,
  type ResourceChangedEvent,
  type StatusAppliedEvent,
  type StatusRemovedEvent,
  type StatusResistedEvent,
  type StatusTickedEvent,
  type SkillUsedEvent,
} from '@/systems/battle/BattleManager';
import {
  ResourceCost,
  SkillTarget,
  SkillType,
  StatusEffectId,
  ItemCategory,
  type CharacterInstance,
  type Encounter,
  type EnemyInstance,
  type ItemData,
  type SkillData,
  type StatusEffectInstance,
} from '@/types';

export interface BattleSceneInitData {
  party?: CharacterInstance[];
  encounterId?: string;
}

export class BattleScene extends Phaser.Scene {
  private state!: BattleState;
  private manager!: BattleManager;
  private pendingParty?: CharacterInstance[];
  private pendingEncounterId?: string;
  private activeEncounter!: Encounter;

  private slotViews = new Map<Combatant, SlotView>();
  private statusText!: Phaser.GameObjects.Text;
  private roundText!: Phaser.GameObjects.Text;
  private actionButtons: Phaser.GameObjects.Text[] = [];
  private ultimateButton: Phaser.GameObjects.Text | null = null;
  private currentActor: CharacterInstance | null = null;
  private targetingActor: CharacterInstance | null = null;
  private pendingSkill: SkillData | null = null;
  private pendingConsumable: ItemData | null = null;
  private targetingAllies = false;
  private skillMenuObjects: Phaser.GameObjects.GameObject[] = [];
  private itemMenuObjects: Phaser.GameObjects.GameObject[] = [];
  private tooltipText: Phaser.GameObjects.Text | null = null;

  // Combat log
  private logLines: string[] = [];
  private logTexts: Phaser.GameObjects.Text[] = [];

  // Turn order queue display
  private turnQueueContainer: Phaser.GameObjects.Container | null = null;

  // Input lock during animations
  private animating = false;

  // Speed multiplier: 1 = normal (slower), 2 = fast (original speed)
  private battleSpeed: 1 | 2 = 1;
  private speedBtn1: Phaser.GameObjects.Text | null = null;
  private speedBtn2: Phaser.GameObjects.Text | null = null;

  constructor() {
    super({ key: SceneKeys.BATTLE });
  }

  preload(): void {
    const partyPaths: Record<string, string> = {
      bram: '/assets/characters/bram_tank.png',
      vera: '/assets/characters/vera_dps.png',
      mira: '/assets/characters/mira_mage.png',
      aren: '/assets/characters/aren_support.png',
      lyra: '/assets/characters/lyra_control.png',
    };
    for (const [id, key] of Object.entries(PORTRAIT_ASSETS)) {
      if (!this.textures.exists(key)) {
        this.load.image(key, partyPaths[id]);
      }
    }

    const enemyPaths: Record<string, string> = {
      peregrino_vacio:    '/assets/enemies/peregrino_vacio.png',
      lobo_corrupto:      '/assets/enemies/lobo_corrupto.png',
      cuervo_carronero:   '/assets/enemies/cuervo_carronero.png',
      guardian_oxidado:   '/assets/enemies/guardian_oxidado.png',
      acolito_susurrante: '/assets/enemies/acolito_susurrante.png',
      bandido_hueco:      '/assets/enemies/bandido_hueco.png',
      el_pregonero:       '/assets/enemies/pregonero_miniboss.png',
      padre_oxidado:      '/assets/enemies/bosses/padre_oxidado_boss.png',
    };
    for (const [id, key] of Object.entries(ENEMY_PORTRAIT_ASSETS)) {
      if (!this.textures.exists(key)) {
        this.load.image(key, enemyPaths[id]);
      }
    }
  }

  init(data: BattleSceneInitData = {}): void {
    this.pendingParty = data.party;
    this.pendingEncounterId = data.encounterId ?? DEFAULT_ENCOUNTER_ID;
    this.slotViews = new Map();
    this.actionButtons = [];
    this.ultimateButton = null;
    this.currentActor = null;
    this.targetingActor = null;
    this.pendingSkill = null;
    this.pendingConsumable = null;
    this.targetingAllies = false;
    this.skillMenuObjects = [];
    this.itemMenuObjects = [];
    this.tooltipText = null;
    this.logLines = [];
    this.logTexts = [];
    this.turnQueueContainer = null;
    this.animating = false;
    this.battleSpeed = 1;
    this.speedBtn1 = null;
    this.speedBtn2 = null;
  }

  create(): void {
    const party = this.pendingParty ?? this.buildDefaultParty();
    if (gameState.party.length === 0) {
      gameState.setParty(party);
    }

    this.activeEncounter = registry.getEncounter(this.pendingEncounterId ?? DEFAULT_ENCOUNTER_ID);
    gameState.beginCombat(this.activeEncounter.id);
    saveManager.save();

    const enemies = this.buildEnemiesFromEncounter(this.activeEncounter);

    this.state = new BattleState();
    this.state.initBattle(party, enemies);
    this.manager = new BattleManager(this.state);

    this.renderBackground();
    this.renderEnemyRow();
    this.renderPartyRow();
    this.renderHud();
    this.renderCombatLog();
    this.renderTurnQueue();
    this.createActionButtons();
    this.bindBattleEvents();

    this.manager.startBattle();
  }

  private renderBackground(): void {
    const { width, height } = this.scale;
    this.add.rectangle(width / 2, height / 2, width, height, THEME.bgDeep);

    addVignette(this, width, height);

    // Subtle grid
    const gfx = this.add.graphics();
    gfx.lineStyle(1, THEME.accentDeep, 0.07);
    for (let x = 0; x < width; x += 80) gfx.lineBetween(x, 0, x, height);
    for (let y = 0; y < height; y += 60) gfx.lineBetween(0, y, width, y);

    // Divider between enemy zone and party zone
    const divY = Math.round((ROW_ENEMY_Y + SLOT_HEIGHT / 2 + ROW_PARTY_Y - PARTY_SLOT_HEIGHT / 2) / 2);
    drawSeparator(this, 0, divY, width, THEME.accentDim, 0.25);
    // Divider above action bar
    drawSeparator(this, 0, ROW_ACTIONS_Y - 32, width, THEME.accent, 0.3);
  }

  private buildDefaultParty(): CharacterInstance[] {
    return [
      createCharacterInstance(registry.getCharacter('bram')),
      createCharacterInstance(registry.getCharacter('vera')),
      createCharacterInstance(registry.getCharacter('mira')),
    ];
  }

  private buildEnemiesFromEncounter(encounter: Encounter): EnemyInstance[] {
    return encounter.enemies.map((enemyId) => createEnemyInstance(registry.getEnemy(enemyId)));
  }

  private renderHud(): void {
    const { width } = this.scale;

    // Round counter
    this.roundText = this.add
      .text(width / 2, 20, `ROUND ${this.state.currentRound}`, {
        ...THEME.fonts.label,
        fontSize: '14px',
      })
      .setOrigin(0.5, 0);

    // Status text (turns, actions)
    this.statusText = this.add
      .text(width / 2, 44, '', {
        ...THEME.fonts.hud,
        color: THEME.textPrimary,
      })
      .setOrigin(0.5, 0);

    // Gold display
    this.add.text(width - 16, 16, `ORO: ${gameState.runMeta.gold}`, {
      ...THEME.fonts.hudSmall,
      color: THEME.accentHex,
      letterSpacing: 2,
    }).setOrigin(1, 0).setName('goldText');

    // Speed selector (top-left)
    this.speedBtn1 = this.add.text(12, 12, '▶', {
      ...THEME.fonts.hudSmall,
      color: THEME.textPrimary,
      backgroundColor: THEME.bgPanelHex,
      padding: { left: 6, right: 6, top: 3, bottom: 3 },
    })
      .setOrigin(0, 0)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.setBattleSpeed(1));

    this.speedBtn2 = this.add.text(48, 12, '⏩', {
      ...THEME.fonts.hudSmall,
      color: THEME.textDim,
      backgroundColor: THEME.bgPanelHex,
      padding: { left: 6, right: 6, top: 3, bottom: 3 },
    })
      .setOrigin(0, 0)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.setBattleSpeed(2));

    this.refreshSpeedButtons();
  }

  private setBattleSpeed(speed: 1 | 2): void {
    this.battleSpeed = speed;
    this.refreshSpeedButtons();
  }

  private refreshSpeedButtons(): void {
    if (this.speedBtn1) this.speedBtn1.setColor(this.battleSpeed === 1 ? THEME.textPrimary : THEME.accentDeepHex);
    if (this.speedBtn2) this.speedBtn2.setColor(this.battleSpeed === 2 ? THEME.textPrimary : THEME.accentDeepHex);
  }

  private animDuration(base: number): number {
    // x1 = 2× slower than base (base is the original x2 speed)
    return this.battleSpeed === 2 ? base : base * 2;
  }

  private renderCombatLog(): void {
    const { width } = this.scale;
    const logW = 230;
    const logH = LOG_LINES * 18 + 28;
    const logX = width - logW - 12;
    const logY = ROW_ENEMY_Y + SLOT_HEIGHT / 2 + 16;

    const logBg = this.add.graphics().setDepth(10);
    logBg.fillStyle(THEME.bgPanel, 0.88);
    logBg.fillRect(logX, logY, logW, logH);
    drawCornerBox(logBg, logX, logY, logW, logH, 8, THEME.accentDim, 0.5);

    this.add.text(logX + 8, logY + 6, 'COMBATE', {
      ...THEME.fonts.hudSmall,
      color: THEME.accentDimHex,
      letterSpacing: 3,
    }).setDepth(11);

    for (let i = 0; i < LOG_LINES; i++) {
      const txt = this.add.text(logX + 8, logY + 20 + i * 18, '', {
        ...THEME.fonts.hudSmall,
        color: THEME.textPrimary,
        wordWrap: { width: logW - 16 },
      }).setDepth(11);
      this.logTexts.push(txt);
    }
  }

  private addLog(message: string): void {
    this.logLines.push(message);
    if (this.logLines.length > LOG_LINES) {
      this.logLines.shift();
    }
    this.logTexts.forEach((txt, i) => {
      txt.setText(this.logLines[i] ?? '');
    });
  }

  private renderTurnQueue(): void {
    if (this.turnQueueContainer) {
      this.turnQueueContainer.destroy();
    }

    const { width } = this.scale;
    this.turnQueueContainer = this.add.container(0, TURN_QUEUE_Y - 14);

    const queue = this.state.turnQueue;
    const dotSize = 24;
    const dotGap = 6;
    const totalW = queue.length * (dotSize + dotGap) - dotGap;
    const startX = width / 2 - totalW / 2;

    queue.forEach((unit, i) => {
      const x = startX + i * (dotSize + dotGap) + dotSize / 2;
      const isPlayer = isCharacterInstance(unit);
      const isActive = i === this.state.currentActorIndex;
      const fillColor = isPlayer ? 0x2c4a7d : 0x7d2c2c;
      const alpha = unit.isDown ? 0.25 : 1;

      const dot = this.add.rectangle(x, 0, dotSize, dotSize, fillColor, alpha)
        .setStrokeStyle(isActive ? 2 : 1, isActive ? ACTIVE_TURN_STROKE : 0x555555, alpha);

      const label = isPlayer
        ? (unit as CharacterInstance).data.name.charAt(0).toUpperCase()
        : (unit as EnemyInstance).data.name.charAt(0).toUpperCase();

      const txt = this.add.text(x, 0, label, {
        ...THEME.fonts.hudSmall,
        color: unit.isDown ? '#444444' : THEME.textPrimary,
      }).setOrigin(0.5).setAlpha(alpha);

      this.turnQueueContainer!.add([dot, txt]);
    });
  }

  private renderEnemyRow(): void {
    const rowWidth = ENEMY_SLOT_COUNT * SLOT_WIDTH + (ENEMY_SLOT_COUNT - 1) * SLOT_SPACING;
    const startX = (this.scale.width - rowWidth) / 2 + SLOT_WIDTH / 2;

    this.state.enemies.forEach((enemy, i) => {
      const x = startX + i * (SLOT_WIDTH + SLOT_SPACING);
      this.drawSlot(enemy, x, ROW_ENEMY_Y, ENEMY_COLOR, enemy.data.name, false);
    });
  }

  private renderPartyRow(): void {
    const rowWidth = PARTY_SLOT_COUNT * PARTY_SLOT_WIDTH + (PARTY_SLOT_COUNT - 1) * SLOT_SPACING;
    const startX = (this.scale.width - rowWidth) / 2 + PARTY_SLOT_WIDTH / 2;

    this.state.party.forEach((member, i) => {
      const x = startX + i * (PARTY_SLOT_WIDTH + SLOT_SPACING);
      this.drawSlot(member, x, ROW_PARTY_Y, PARTY_COLOR, this.shortName(member.data.name), true);
    });
  }

  private drawSlot(
    combatant: Combatant,
    x: number,
    y: number,
    color: number,
    name: string,
    isParty: boolean,
  ): void {
    const slotW = isParty ? PARTY_SLOT_WIDTH : SLOT_WIDTH;
    const slotH = isParty ? PARTY_SLOT_HEIGHT : SLOT_HEIGHT;
    const barW = slotW - 12;

    // [capa 0] Sombra elíptica bajo el sprite
    const shadow = this.add
      .ellipse(x, y + slotH / 2 - 6, slotW * 0.7, 14, 0x000000, 0.5)
      .setOrigin(0.5);

    // [capa 1] Halo radial de glow (alpha=0 inicialmente)
    const glow = this.add.graphics();
    glow.setPosition(x, y);
    this.drawSlotGlow(glow, slotW, slotH, 0);

    // [capa 2] Rect base — sin stroke visible (el frame lo reemplaza)
    const rect = this.add
      .rectangle(x, y, slotW, slotH, isParty ? THEME.bgPanel : color, isParty ? 0.8 : 1)
      .setInteractive({ useHandCursor: true });

    rect.on('pointerdown', () => this.handleSlotClick(combatant));
    rect.on('pointerover', () => this.handleSlotHover(combatant, true));
    rect.on('pointerout', () => this.handleSlotHover(combatant, false));

    // [capa 3] Sprite (player o enemy portrait)
    let portrait: Phaser.GameObjects.Image | null = null;
    const spriteCenterY = isParty ? y - 38 : y - 30;
    const spriteW = isParty ? slotW - 8 : slotW - 24;
    const spriteH = isParty ? 146 : 112;

    if (isParty && isCharacterInstance(combatant)) {
      const portraitKey = PORTRAIT_ASSETS[combatant.data.id];
      if (portraitKey && this.textures.exists(portraitKey)) {
        portrait = this.add
          .image(x, spriteCenterY, portraitKey)
          .setDisplaySize(spriteW, spriteH)
          .setOrigin(0.5);
      }
    } else if (!isParty && !isCharacterInstance(combatant)) {
      const enemyKey = ENEMY_PORTRAIT_ASSETS[combatant.data.id];
      if (enemyKey && this.textures.exists(enemyKey)) {
        portrait = this.add
          .image(x, spriteCenterY, enemyKey)
          .setDisplaySize(spriteW, spriteH)
          .setOrigin(0.5);
      }
    }

    // Idle breathing tween — sutil signo de vida
    if (portrait) {
      const baseScaleX = portrait.scaleX;
      const baseScaleY = portrait.scaleY;
      this.tweens.add({
        targets: portrait,
        scaleX: baseScaleX * 1.018,
        scaleY: baseScaleY * 1.018,
        duration: 2400,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }

    // [capa 4] Marco decorativo de esquinas
    const frame = this.add.graphics();
    frame.setPosition(x, y);
    this.drawSlotFrame(frame, slotW, slotH, THEME.accent, 0.4, 1);

    // Info area: name + bars debajo del sprite
    const infoTop = y + slotH / 2 - (isParty ? 76 : 60);

    const nameText = this.add
      .text(x, infoTop, name.toUpperCase(), {
        ...THEME.fonts.hudSmall,
        fontSize: isParty ? '12px' : '13px',
        color: THEME.textPrimary,
        letterSpacing: 2,
      })
      .setOrigin(0.5);

    // HP bar
    const barH = isParty ? 7 : 8;
    const hpBarY = infoTop + 16;
    const hpBarBg = this.add.rectangle(x, hpBarY, barW, barH, HP_BAR_BG).setOrigin(0.5);
    const hpFrac = combatant.currentStats.hp / combatant.currentStats.hpMax;
    const hpColor = hpFrac > 0.4 ? HP_BAR_FG : HP_BAR_FG_LOW;
    const hpBarFg = this.add
      .rectangle(x - barW / 2, hpBarY, barW * hpFrac, barH, hpColor)
      .setOrigin(0, 0.5);

    const hpText = this.add
      .text(x, hpBarY + 10, this.formatHp(combatant), {
        ...THEME.fonts.hudSmall,
        color: THEME.textPrimary,
      })
      .setOrigin(0.5);

    // Resource bars (vigor / mana) — only for party members
    let vigorBarBg: Phaser.GameObjects.Rectangle | null = null;
    let vigorBarFg: Phaser.GameObjects.Rectangle | null = null;
    let manaBarBg: Phaser.GameObjects.Rectangle | null = null;
    let manaBarFg: Phaser.GameObjects.Rectangle | null = null;
    let resourceText: Phaser.GameObjects.Text;

    if (isParty && isCharacterInstance(combatant)) {
      const res = combatant.currentResources;
      const vigorBarY = hpBarY + 24;

      vigorBarBg = this.add.rectangle(x, vigorBarY, barW, 5, RESOURCE_BAR_BG).setOrigin(0.5);
      const vigorFrac = res.vigorMax > 0 ? res.vigor / res.vigorMax : 0;
      vigorBarFg = this.add
        .rectangle(x - barW / 2, vigorBarY, barW * vigorFrac, 5, RESOURCE_BAR_VIGOR)
        .setOrigin(0, 0.5);

      if (res.manaMax > 0) {
        const manaBarY = vigorBarY + 8;
        manaBarBg = this.add.rectangle(x, manaBarY, barW, 5, RESOURCE_BAR_BG).setOrigin(0.5);
        const manaFrac = res.mana / res.manaMax;
        manaBarFg = this.add
          .rectangle(x - barW / 2, manaBarY, barW * manaFrac, 5, RESOURCE_BAR_MANA)
          .setOrigin(0, 0.5);
      }

      const resTextY = (manaBarFg ? hpBarY + 41 : hpBarY + 33);
      resourceText = this.add
        .text(x, resTextY, this.formatResources(combatant), {
          ...THEME.fonts.hudSmall,
          color: THEME.vigorHex,
        })
        .setOrigin(0.5);
    } else {
      resourceText = this.add.text(x, y + 30, '', { fontSize: '11px' });
    }

    const battleTextY = y + slotH / 2 - 10;
    const battleText = this.add
      .text(x, battleTextY, this.formatBattleRuntime(combatant), {
        ...THEME.fonts.hudSmall,
        color: THEME.accentHex,
      })
      .setOrigin(0.5);

    let intentText: Phaser.GameObjects.Text | null = null;
    if (!isCharacterInstance(combatant)) {
      intentText = this.add
        .text(x, y - slotH / 2 - 18, '', {
          fontSize: '13px',
          color: '#ffdd88',
          fontFamily: 'sans-serif',
          stroke: '#000000',
          strokeThickness: 3,
          align: 'center',
          wordWrap: { width: slotW + 36, useAdvancedWrap: true },
        })
        .setOrigin(0.5, 1);
    }

    this.slotViews.set(combatant, {
      combatant,
      rect,
      portrait,
      shadow,
      glow,
      frame,
      nameText,
      hpText,
      hpBarBg,
      hpBarFg,
      resourceText,
      vigorBarBg,
      vigorBarFg,
      manaBarBg,
      manaBarFg,
      battleText,
      intentText,
      statusObjects: [],
      baseColor: color,
      baseX: x,
      baseY: y,
      isParty,
    });
    this.refreshStatusIcons(combatant);
  }

  // ── Helpers de presentación visual del slot ──────────────────────────────

  /**
   * Dibuja el marco decorativo de esquinas alrededor del slot.
   * Coordenadas relativas (el Graphics está posicionado en el centro del slot).
   */
  private drawSlotFrame(
    g: Phaser.GameObjects.Graphics,
    w: number,
    h: number,
    color: number,
    alpha: number,
    lineWidth: number,
  ): void {
    g.clear();
    g.lineStyle(lineWidth, color, alpha);
    const left = -w / 2;
    const top = -h / 2;
    const right = w / 2;
    const bottom = h / 2;
    const size = 16;

    g.beginPath();
    g.moveTo(left, top + size); g.lineTo(left, top); g.lineTo(left + size, top);
    g.strokePath();
    g.beginPath();
    g.moveTo(right - size, top); g.lineTo(right, top); g.lineTo(right, top + size);
    g.strokePath();
    g.beginPath();
    g.moveTo(right, bottom - size); g.lineTo(right, bottom); g.lineTo(right - size, bottom);
    g.strokePath();
    g.beginPath();
    g.moveTo(left + size, bottom); g.lineTo(left, bottom); g.lineTo(left, bottom - size);
    g.strokePath();
  }

  /**
   * Dibuja el halo radial de glow detrás del slot. alpha=0 lo oculta.
   */
  private drawSlotGlow(
    g: Phaser.GameObjects.Graphics,
    w: number,
    h: number,
    alpha: number,
  ): void {
    g.clear();
    if (alpha <= 0) return;
    const layers = 5;
    for (let i = layers - 1; i >= 0; i--) {
      const t = i / layers;
      const a = alpha * (1 - t) * 0.45;
      g.fillStyle(THEME.accent, a);
      g.fillEllipse(0, 0, w * (1 + t * 0.4), h * (1 + t * 0.4));
    }
  }

  private createActionButtons(): void {
    const { width } = this.scale;

    // ── Action bar background strip ──────────────────────────────────────────
    const abBg = this.add.graphics();
    abBg.fillStyle(THEME.bgPanel, 0.92);
    abBg.fillRect(20, ROW_ACTIONS_Y - 26, width - 40, 52);
    drawCornerBox(abBg, 20, ROW_ACTIONS_Y - 26, width - 40, 52, 10, THEME.accent, 0.5);

    // ── Action buttons ───────────────────────────────────────────────────────
    // Each entry: { label, key, onClick }
    // Replace makeTextButton calls here with styled button components later
    const actions: Array<{ label: string; key: string; onClick: () => void }> = [
      { label: 'Atacar',     key: 'attack',   onClick: () => this.beginBasicAttackTargeting() },
      { label: 'Habilidad',  key: 'skill',    onClick: () => this.openSkillMenu() },
      { label: 'Defender',   key: 'defend',   onClick: () => this.performDefend() },
      { label: 'Objeto',     key: 'item',     onClick: () => this.openItemMenu() },
      { label: 'Definitiva', key: 'ultimate', onClick: () => this.performUltimate() },
    ];

    const btnSpacing = 148;
    const totalW = (actions.length - 1) * btnSpacing;
    const startX = width / 2 - totalW / 2;

    actions.forEach((action, i) => {
      const btn = makeTextButton(this, startX + i * btnSpacing, ROW_ACTIONS_Y, action.label, action.onClick);
      btn.setName(`action_btn_${action.key}`);
      btn.setVisible(false);
      this.actionButtons.push(btn);
      if (action.key === 'ultimate') {
        this.ultimateButton = btn;
      }
    });

    this.input.keyboard?.on('keydown-ESC', () => this.handleCancel());
    this.input.on('pointerdown', (ptr: Phaser.Input.Pointer) => {
      if (ptr.rightButtonDown()) this.handleCancel();
    });
  }

  // ── Skill menu ────────────────────────────────────────────────────────────

  private openSkillMenu(): void {
    if (!this.currentActor) return;
    this.closeSkillMenu();
    this.closeItemMenu();

    const actor = this.currentActor;
    const skills = actor.data.skillIds
      .map((id) => registry.getSkill(id))
      .filter((skill) => skill.type === SkillType.ACTIVE && !skill.id.endsWith('_basic'));

    const { width } = this.scale;
    const panelW = 340;
    const panelH = 30 + skills.length * 70 + 20;
    const panelX = width / 2 - panelW / 2;
    const panelY = ROW_ACTIONS_Y - 32 - panelH - 8;

    const bgGfx = this.add.graphics().setDepth(50);
    bgGfx.fillStyle(THEME.bgPanel, 0.97);
    bgGfx.fillRect(panelX, panelY, panelW, panelH);
    drawCornerBox(bgGfx, panelX, panelY, panelW, panelH, 12, THEME.accent, 0.8);
    this.skillMenuObjects.push(bgGfx);

    const title = this.add.text(panelX + panelW / 2, panelY + 14, 'HABILIDADES', {
      ...THEME.fonts.label,
      fontSize: '13px',
    }).setOrigin(0.5, 0).setDepth(51);
    this.skillMenuObjects.push(title);

    skills.forEach((skill, i) => {
      const rowY = panelY + 42 + i * 70;
      const canUse = this.manager.skillExecutor.canUseSkill(actor, skill);
      const nameColor = canUse ? THEME.accentHex : THEME.accentDeepHex;
      const costStr = this.formatSkillCost(skill);

      const nameBtn = this.add.text(panelX + 12, rowY, skill.name.toUpperCase(), {
        ...THEME.fonts.hud,
        fontSize: '15px',
        color: nameColor,
        letterSpacing: 2,
      }).setOrigin(0, 0).setDepth(51);
      this.skillMenuObjects.push(nameBtn);

      const costTxt = this.add.text(panelX + panelW - 12, rowY, costStr, {
        ...THEME.fonts.hudSmall,
        color: canUse ? THEME.accentHex : THEME.accentDeepHex,
      }).setOrigin(1, 0).setDepth(51);
      this.skillMenuObjects.push(costTxt);

      const descTxt = this.add.text(panelX + 12, rowY + 22, skill.description, {
        ...THEME.fonts.body,
        fontSize: '11px',
        color: canUse ? THEME.textPrimary : THEME.textDim,
        wordWrap: { width: panelW - 24 },
      }).setOrigin(0, 0).setDepth(51);
      this.skillMenuObjects.push(descTxt);

      if (canUse) {
        const hitArea = this.add.rectangle(
          panelX + panelW / 2, rowY + 28, panelW, 60, 0xffffff, 0,
        ).setInteractive({ useHandCursor: true }).setDepth(52);
        this.skillMenuObjects.push(hitArea);
        hitArea.on('pointerover', () => nameBtn.setColor('#ffee88'));
        hitArea.on('pointerout', () => nameBtn.setColor(nameColor));
        hitArea.on('pointerdown', () => this.onSkillSelected(skill));
      }
    });

    this.statusText.setText(`${this.combatantName(actor)}: elegí una habilidad (ESC para cancelar)`);
  }

  private closeSkillMenu(): void {
    this.skillMenuObjects.forEach((o) => o.destroy());
    this.skillMenuObjects = [];
    this.tooltipText?.destroy();
    this.tooltipText = null;
  }

  private onSkillSelected(skill: SkillData): void {
    this.closeSkillMenu();
    if (!this.currentActor) return;

    this.pendingSkill = skill;

    if (!this.manager.skillExecutor.needsTargetSelection(skill)) {
      this.commitSkill(null);
    } else {
      this.targetingActor = this.currentActor;
      this.targetingAllies = skill.target === SkillTarget.SINGLE_ALLY;
      this.statusText.setText(
        `${skill.name}: elegí un ${this.targetingAllies ? 'aliado' : 'enemigo'} (ESC para cancelar)`,
      );
      this.updateTargetHighlights();
    }
  }

  private commitSkill(pickedTarget: Combatant | null): void {
    const actor = this.currentActor;
    const skill = this.pendingSkill;
    if (!actor || !skill) return;

    const target = pickedTarget ?? undefined;
    this.pendingSkill = null;
    this.clearTargeting();
    this.setActionButtonsVisible(false);
    this.currentActor = null;
    this.manager.performSkill(actor, skill, target);
  }

  private handleCancel(): void {
    if (this.pendingConsumable && this.targetingActor) {
      this.pendingConsumable = null;
      this.clearTargeting();
      this.openItemMenu();
    } else if (this.pendingSkill && this.targetingActor) {
      this.pendingSkill = null;
      this.clearTargeting();
      this.openSkillMenu();
    } else if (this.itemMenuObjects.length > 0) {
      this.closeItemMenu();
      if (this.currentActor) {
        this.statusText.setText(`Turno de ${this.combatantName(this.currentActor)}`);
      }
    } else if (this.skillMenuObjects.length > 0) {
      this.closeSkillMenu();
      if (this.currentActor) {
        this.statusText.setText(`Turno de ${this.combatantName(this.currentActor)}`);
      }
    } else if (this.targetingActor) {
      this.clearTargeting();
      if (this.currentActor) {
        this.statusText.setText(`Turno de ${this.combatantName(this.currentActor)}`);
      }
    }
  }

  private formatSkillCost(skill: SkillData): string {
    if (!skill.costType) return '';
    const icon = skill.costType === ResourceCost.VIGOR ? 'V' : 'M';
    return `${skill.costAmount} ${icon}`;
  }

  private openItemMenu(): void {
    if (!this.currentActor) return;
    this.closeSkillMenu();
    this.closeItemMenu();

    const entries = this.consumableEntries();
    const { width } = this.scale;
    const panelW = 340;
    const rowCount = Math.max(1, entries.length);
    const panelH = 42 + rowCount * 58 + 18;
    const panelX = width / 2 - panelW / 2;
    const panelY = ROW_ACTIONS_Y - 32 - panelH - 8;

    const itemBgGfx = this.add.graphics().setDepth(50);
    itemBgGfx.fillStyle(THEME.bgPanel, 0.97);
    itemBgGfx.fillRect(panelX, panelY, panelW, panelH);
    drawCornerBox(itemBgGfx, panelX, panelY, panelW, panelH, 12, THEME.accent, 0.8);
    this.itemMenuObjects.push(itemBgGfx);

    const title = this.add.text(panelX + panelW / 2, panelY + 14, 'CONSUMIBLES', {
      ...THEME.fonts.label,
      fontSize: '13px',
    }).setOrigin(0.5, 0).setDepth(51);
    this.itemMenuObjects.push(title);

    if (entries.length === 0) {
      const empty = this.add.text(panelX + 18, panelY + 52, 'No hay consumibles en la mochila.', {
        ...THEME.fonts.body,
        fontSize: '13px',
        color: THEME.textDim,
      }).setDepth(51);
      this.itemMenuObjects.push(empty);
      this.statusText.setText('No hay consumibles disponibles');
      return;
    }

    entries.forEach((entry, index) => {
      const rowY = panelY + 44 + index * 58;
      const name = this.add.text(panelX + 12, rowY, `${entry.item.name.toUpperCase()}${entry.count > 1 ? ` ×${entry.count}` : ''}`, {
        ...THEME.fonts.hud,
        fontSize: '14px',
        letterSpacing: 2,
      }).setOrigin(0, 0).setDepth(51);
      const desc = this.add.text(panelX + 12, rowY + 22, entry.item.description, {
        ...THEME.fonts.body,
        fontSize: '11px',
        color: THEME.textPrimary,
        wordWrap: { width: panelW - 24 },
      }).setOrigin(0, 0).setDepth(51);
      const hitArea = this.add.rectangle(
        panelX + panelW / 2,
        rowY + 25,
        panelW,
        52,
        0xffffff,
        0,
      ).setInteractive({ useHandCursor: true }).setDepth(52);

      hitArea.on('pointerover', () => name.setColor('#ffee88'));
      hitArea.on('pointerout', () => name.setColor('#ffffff'));
      hitArea.on('pointerdown', () => this.onConsumableSelected(entry.item));

      this.itemMenuObjects.push(name, desc, hitArea);
    });

    this.statusText.setText(`${this.combatantName(this.currentActor)}: elegí un consumible`);
  }

  private closeItemMenu(): void {
    this.itemMenuObjects.forEach((o) => o.destroy());
    this.itemMenuObjects = [];
  }

  private consumableEntries(): Array<{ item: ItemData; count: number }> {
    const byId = new Map<string, { item: ItemData; count: number }>();
    for (const itemId of gameState.runMeta.items) {
      const item = registry.getItem(itemId);
      if (item.category !== ItemCategory.CONSUMABLE) continue;

      const existing = byId.get(item.id);
      if (existing) {
        existing.count += 1;
      } else {
        byId.set(item.id, { item, count: 1 });
      }
    }
    return Array.from(byId.values()).sort((a, b) => a.item.name.localeCompare(b.item.name));
  }

  private onConsumableSelected(item: ItemData): void {
    this.closeItemMenu();
    if (!this.currentActor) return;

    this.pendingConsumable = item;
    if (item.id === 'granada_cenizas') {
      this.commitConsumable(null);
      return;
    }

    this.targetingActor = this.currentActor;
    this.targetingAllies = true;
    this.statusText.setText(`${item.name}: elegí un aliado (ESC para cancelar)`);
    this.updateTargetHighlights();
  }

  private commitConsumable(pickedTarget: Combatant | null): void {
    const actor = this.currentActor;
    const item = this.pendingConsumable;
    if (!actor || !item) return;

    const result = this.manager.performConsumable(actor, item, pickedTarget ?? undefined);
    if (!result.consumed) {
      this.statusText.setText(result.message);
      this.pendingConsumable = null;
      this.clearTargeting();
      this.setActionButtonsVisible(true);
      return;
    }

    this.pendingConsumable = null;
    this.clearTargeting();
    this.setActionButtonsVisible(false);
    this.currentActor = null;
  }

  // ── Basic attack targeting ────────────────────────────────────────────────

  private beginBasicAttackTargeting(): void {
    if (!this.currentActor) return;
    this.closeItemMenu();
    this.closeSkillMenu();

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
    this.closeItemMenu();
    this.closeSkillMenu();
    this.clearTargeting();
    this.setActionButtonsVisible(false);
    this.currentActor = null;
    this.manager.performDefend(actor);
    soundManager.play('defend');
  }

  private performUltimate(): void {
    if (!this.currentActor) return;
    this.closeItemMenu();
    this.closeSkillMenu();

    const skill = this.getUltimateSkill(this.currentActor);
    if (!skill || !this.manager.skillExecutor.canUseSkill(this.currentActor, skill)) {
      this.statusText.setText('Definitiva no disponible');
      return;
    }

    this.pendingSkill = skill;
    if (!this.manager.skillExecutor.needsTargetSelection(skill)) {
      this.commitSkill(null);
      return;
    }

    this.targetingActor = this.currentActor;
    this.targetingAllies = skill.target === SkillTarget.SINGLE_ALLY;
    this.statusText.setText(`${skill.name}: elegí objetivo (ESC para cancelar)`);
    this.updateTargetHighlights();
  }

  private getUltimateSkill(actor: CharacterInstance): SkillData | null {
    const ultimateId = actor.data.skillIds.find((id) => id.includes('_ult_'));
    return ultimateId ? registry.getSkill(ultimateId) : null;
  }

  private handleSlotClick(combatant: Combatant): void {
    if (this.animating) return;
    if (!this.targetingActor) return;

    if (this.pendingConsumable) {
      if (!isCharacterInstance(combatant) || combatant.isDown) return;
      this.commitConsumable(combatant);
      return;
    }

    if (this.pendingSkill) {
      if (this.targetingAllies) {
        if (!isCharacterInstance(combatant) || combatant.isDown) return;
      } else {
        if (isCharacterInstance(combatant) || combatant.isDown) return;
      }
      this.commitSkill(combatant);
      return;
    }

    // Basic attack
    if (isCharacterInstance(combatant) || combatant.isDown) return;
    const actor = this.targetingActor;
    this.clearTargeting();
    this.setActionButtonsVisible(false);
    this.currentActor = null;
    soundManager.play('attack');
    this.playAttackTween(actor, combatant, () => {
      this.manager.performBasicAttack(actor, combatant);
    });
  }

  private handleSlotHover(combatant: Combatant, isHovered: boolean): void {
    const view = this.slotViews.get(combatant);
    if (!view || !this.isTargetable(combatant)) return;

    const slotW = view.isParty ? PARTY_SLOT_WIDTH : SLOT_WIDTH;
    const slotH = view.isParty ? PARTY_SLOT_HEIGHT : SLOT_HEIGHT;
    this.drawSlotFrame(view.frame, slotW, slotH, TARGET_STROKE_COLOR, isHovered ? 1 : 0.9, isHovered ? 3 : 2);
    this.drawSlotGlow(view.glow, slotW, slotH, isHovered ? 0.55 : 0.4);
  }

  private clearTargeting(): void {
    this.targetingActor = null;
    this.targetingAllies = false;
    this.updateTargetHighlights();
  }

  private updateTargetHighlights(): void {
    for (const [combatant, view] of this.slotViews) {
      const slotW = view.isParty ? PARTY_SLOT_WIDTH : SLOT_WIDTH;
      const slotH = view.isParty ? PARTY_SLOT_HEIGHT : SLOT_HEIGHT;

      if (combatant.isDown) {
        this.drawSlotFrame(view.frame, slotW, slotH, THEME.accent, 0.15, 1);
        this.drawSlotGlow(view.glow, slotW, slotH, 0);
        view.shadow.setAlpha(0.2);
      } else if (this.isTargetable(combatant)) {
        this.drawSlotFrame(view.frame, slotW, slotH, TARGET_STROKE_COLOR, 0.9, 2);
        this.drawSlotGlow(view.glow, slotW, slotH, 0.4);
      } else {
        const isActive = this.state.turnQueue[this.state.currentActorIndex] === combatant;
        if (isActive) {
          this.drawSlotFrame(view.frame, slotW, slotH, ACTIVE_TURN_STROKE, 1, 2);
          this.drawSlotGlow(view.glow, slotW, slotH, 0.45);
        } else {
          this.drawSlotFrame(view.frame, slotW, slotH, THEME.accent, 0.4, 1);
          this.drawSlotGlow(view.glow, slotW, slotH, 0);
        }
      }
    }
  }

  private isTargetable(combatant: Combatant): boolean {
    if (!this.targetingActor || combatant.isDown) return false;
    if (this.targetingAllies) return isCharacterInstance(combatant);
    return !isCharacterInstance(combatant);
  }

  // ── Attack tween ─────────────────────────────────────────────────────────

  private playAttackTween(actor: Combatant, target: Combatant | null, onLand: () => void): void {
    const actorView = this.slotViews.get(actor);
    const targetView = target ? this.slotViews.get(target) : null;
    if (!actorView || !targetView) {
      onLand();
      return;
    }

    this.animating = true;
    const origX = actorView.rect.x;
    const origY = actorView.rect.y;
    const dirX = (targetView.baseX - actorView.baseX) * 0.3;
    const dirY = (targetView.baseY - actorView.baseY) * 0.3;

    // Move all slot objects together
    const objects = [
      actorView.rect, actorView.nameText, actorView.hpText,
      actorView.hpBarBg, actorView.hpBarFg,
      actorView.resourceText, actorView.battleText,
      actorView.shadow, actorView.glow, actorView.frame,
      ...(actorView.portrait ? [actorView.portrait] : []),
      ...(actorView.vigorBarBg ? [actorView.vigorBarBg] : []),
      ...(actorView.vigorBarFg ? [actorView.vigorBarFg] : []),
      ...(actorView.manaBarBg ? [actorView.manaBarBg] : []),
      ...(actorView.manaBarFg ? [actorView.manaBarFg] : []),
      ...actorView.statusObjects,
    ];

    this.tweens.add({
      targets: objects,
      x: `+=${dirX}`,
      y: `+=${dirY}`,
      duration: this.animDuration(140),
      ease: 'Cubic.easeOut',
      onComplete: () => {
        onLand();
        this.tweens.add({
          targets: objects,
          x: origX,
          y: origY,
          duration: this.animDuration(160),
          ease: 'Back.easeOut',
          onComplete: () => {
            this.animating = false;
            // Snap back all bars/texts to correct position
            this.forceRefreshSlotPositions(actorView);
          },
        });
      },
    });
  }

  private forceRefreshSlotPositions(view: SlotView): void {
    const x = view.baseX;
    const y = view.baseY;
    const slotH = view.isParty ? PARTY_SLOT_HEIGHT : SLOT_HEIGHT;
    const barW = (view.isParty ? PARTY_SLOT_WIDTH : SLOT_WIDTH) - 12;
    const infoTop = y + slotH / 2 - (view.isParty ? 76 : 60);
    const hpBarY = infoTop + 16;
    const spriteCenterY = view.isParty ? y - 38 : y - 30;

    view.rect.setPosition(x, y);
    view.shadow.setPosition(x, y + slotH / 2 - 6);
    view.glow.setPosition(x, y);
    view.frame.setPosition(x, y);
    view.portrait?.setPosition(x, spriteCenterY);
    view.nameText.setPosition(x, infoTop);
    view.hpBarBg.setPosition(x, hpBarY);
    view.hpText.setPosition(x, hpBarY + 10);
    if (view.vigorBarBg) view.vigorBarBg.setPosition(x, hpBarY + 24);
    if (view.manaBarBg) view.manaBarBg.setPosition(x, hpBarY + 32);
    view.battleText.setPosition(x, y + slotH / 2 - 10);

    const hpFrac = Math.max(0, view.combatant.currentStats.hp / view.combatant.currentStats.hpMax);
    view.hpBarFg.setPosition(x - barW / 2, hpBarY);
    view.hpBarFg.width = barW * hpFrac;

    if (view.vigorBarFg && isCharacterInstance(view.combatant)) {
      const res = view.combatant.currentResources;
      const vFrac = res.vigorMax > 0 ? res.vigor / res.vigorMax : 0;
      view.vigorBarFg.setPosition(x - barW / 2, hpBarY + 24);
      view.vigorBarFg.width = barW * vFrac;
    }
    if (view.manaBarFg && isCharacterInstance(view.combatant)) {
      const res = view.combatant.currentResources;
      const mFrac = res.manaMax > 0 ? res.mana / res.manaMax : 0;
      view.manaBarFg.setPosition(x - barW / 2, hpBarY + 32);
      view.manaBarFg.width = barW * mFrac;
    }
  }

  // ── Camera shake ─────────────────────────────────────────────────────────

  private shakeCamera(intensity = 0.004, duration = 100): void {
    this.cameras.main.shake(this.animDuration(duration) / 2, intensity);
  }

  // ── Battle events ─────────────────────────────────────────────────────────

  private bindBattleEvents(): void {
    const e = this.manager.events;

    e.on(BattleEvents.ROUND_STARTED, (round: number) => {
      this.roundText.setText(`Round ${round}`);
      this.refreshAllEnemyIntents();
      this.renderTurnQueue();
    });

    e.on(BattleEvents.TURN_START, (actor: Combatant) => {
      const name = this.combatantName(actor);
      this.statusText.setText(`Turno de ${name}`);
      this.renderTurnQueue();
      // Highlight active slot
      this.updateTargetHighlights();
    });

    e.on(BattleEvents.PLAYER_TURN_START, (actor: CharacterInstance) => {
      this.currentActor = actor;
      this.clearTargeting();
      this.closeSkillMenu();
      this.closeItemMenu();
      this.refreshSlot(actor);
      this.setActionButtonsVisible(true);
    });

    e.on(BattleEvents.ENEMY_TURN_START, () => {
      this.currentActor = null;
      this.clearTargeting();
      this.closeSkillMenu();
      this.closeItemMenu();
      this.setActionButtonsVisible(false);
    });

    e.on(BattleEvents.ENEMY_WILL_ATTACK, (ev: EnemyWillAttackEvent) => {
      const firstTarget = ev.targets[0] ?? null;
      this.playAttackTween(ev.enemy, firstTarget, ev.onAnimationDone);
    });

    e.on(BattleEvents.DAMAGE_DEALT, (ev: DamageEvent) => {
      this.refreshSlot(ev.source);
      this.refreshSlot(ev.target);
      this.showFloatingDamage(ev);

      if (ev.amount >= 15) {
        this.shakeCamera(0.006, 120);
      } else if (ev.amount > 0) {
        this.shakeCamera(0.003, 80);
      }

      const sourceName = this.combatantName(ev.source);
      const targetName = this.combatantName(ev.target);
      const critStr = ev.wasCrit ? ' CRIT!' : '';
      this.addLog(`${sourceName} → ${targetName} ${ev.amount}${critStr}`);
      soundManager.play('hit');
    });

    e.on(BattleEvents.UNIT_DIED, (unit: Combatant) => {
      this.markSlotDown(unit);
      this.addLog(`${this.combatantName(unit)} cae.`);
      soundManager.play('death');
    });

    e.on(BattleEvents.RESOURCE_CHANGED, (ev: ResourceChangedEvent) => {
      this.refreshSlot(ev.unit);
      if (ev.vigorDelta > 0) {
        this.showFloatingText(ev.unit, `+${ev.vigorDelta} V`, '#8ee6a8');
      }
      if ((ev.manaDelta ?? 0) > 0) {
        this.showFloatingText(ev.unit, `+${ev.manaDelta} M`, '#8eb8ff');
      }
      if (ev.reason === 'mira_native_ceniza') {
        this.showFloatingText(ev.unit, `Ceniza ${this.state.ashes}/5`, '#ffb86b');
      }
    });

    e.on(BattleEvents.DEFENDED, (ev: DefendEvent) => {
      this.refreshSlot(ev.actor);
      this.showFloatingText(ev.actor, `DEF +${ev.defendBonus}`, '#9fd1ff');
      this.addLog(`${this.combatantName(ev.actor)} se defiende.`);
    });

    e.on(BattleEvents.STATUS_APPLIED, (ev: StatusAppliedEvent) => {
      this.refreshSlot(ev.target);
      this.showFloatingText(ev.target, this.statusLabel(ev.statusId), '#d4a5ff');
      this.addLog(`${this.combatantName(ev.target)}: ${this.statusLabel(ev.statusId)}`);
    });

    e.on(BattleEvents.STATUS_RESISTED, (ev: StatusResistedEvent) => {
      this.refreshSlot(ev.target);
      this.showFloatingText(ev.target, 'Resiste', '#d9d2bd');
    });

    e.on(BattleEvents.STATUS_REMOVED, (ev: StatusRemovedEvent) => {
      this.refreshSlot(ev.target);
    });

    e.on(BattleEvents.STATUS_TICKED, (ev: StatusTickedEvent) => {
      this.refreshSlot(ev.unit);
      this.showStatusTick(ev);
    });

    e.on(BattleEvents.SKILL_USED, (ev: SkillUsedEvent) => {
      this.refreshSlot(ev.actor);
      this.addLog(`${this.combatantName(ev.actor)} usa ${ev.skill.name}.`);
      soundManager.play('skill');
    });

    e.on(BattleEvents.HEALED, (ev: HealedEvent) => {
      this.refreshSlot(ev.target);
      this.showFloatingText(ev.target, `+${ev.amount} HP`, '#8ee6a8');
      this.addLog(`${this.combatantName(ev.target)} sana ${ev.amount} HP.`);
      soundManager.play('heal');
    });

    e.on(BattleEvents.CONSUMABLE_USED, (ev: ConsumableUsedEvent) => {
      this.refreshSlot(ev.actor);
      if (ev.target) this.refreshSlot(ev.target);
      this.statusText.setText(ev.message);
    });

    e.on(BattleEvents.RELIC_TRIGGERED, (ev: RelicTriggeredEvent) => {
      if (ev.target) {
        this.refreshSlot(ev.target);
        this.showFloatingText(ev.target, ev.relicName, '#f0d37a');
      } else {
        this.statusText.setText(ev.message);
      }
      this.addLog(ev.message);
    });

    e.on(BattleEvents.ROUND_ENDED, () => {
      // Queue rerenders on next round start
    });

    e.on(BattleEvents.BATTLE_WON, () => {
      this.clearTargeting();
      this.closeSkillMenu();
      this.closeItemMenu();
      this.setActionButtonsVisible(false);
      this.statusText.setText('¡Victoria!');
      this.state.party.forEach((p) => this.refreshSlot(p));
      soundManager.play('victory');

      const xpGained = getCombatXp(this.activeEncounter.type);
      const xpResult = awardXp(this.state.party, xpGained);
      const specialReward = getSpecialCombatReward(this.activeEncounter.id);
      const goldGained = specialReward.goldOverride ?? rollCombatGold(this.activeEncounter.type);
      gameState.addGold(goldGained);
      this.grantFixedRewardItems(specialReward.fixedRewardItemIds ?? []);
      if (specialReward.partyHealPercent) {
        this.healPartyByPercent(specialReward.partyHealPercent);
      }
      const rewardData: CombatRewardSummary = {
        encounterId: this.activeEncounter.id,
        encounterType: this.activeEncounter.type,
        xpGained,
        goldGained,
        levelUps: xpResult.levelUps,
        fixedRewardItemIds: specialReward.fixedRewardItemIds,
        actComplete: specialReward.actComplete,
        demoComplete: specialReward.demoComplete,
        partyHealPercent: specialReward.partyHealPercent,
      };
      this.time.delayedCall(this.animDuration(2000), () => {
        this.scene.start(SceneKeys.REWARD, rewardData);
      });
    });

    e.on(BattleEvents.BATTLE_LOST, () => {
      this.clearTargeting();
      this.closeSkillMenu();
      this.closeItemMenu();
      this.setActionButtonsVisible(false);
      this.statusText.setText('Derrota...');
      soundManager.play('defeat');
      this.time.delayedCall(this.animDuration(2000), () => this.scene.start(SceneKeys.GAME_OVER));
    });
  }

  private grantFixedRewardItems(itemIds: string[]): void {
    for (const itemId of itemIds) {
      if (!gameState.runMeta.items.includes(itemId)) {
        gameState.addItem(itemId);
      }
    }
  }

  private healPartyByPercent(percent: number): void {
    for (const member of this.state.party) {
      const amount = Math.max(1, Math.ceil(member.currentStats.hpMax * percent));
      member.currentStats.hp = Math.min(member.currentStats.hpMax, member.currentStats.hp + amount);
      member.isDown = false;
      this.refreshSlot(member);
    }
  }

  private setActionButtonsVisible(visible: boolean): void {
    this.actionButtons.forEach((b) => b.setVisible(visible));
    this.updateUltimateButtonState();
  }

  private updateUltimateButtonState(): void {
    if (!this.ultimateButton) return;

    const skill = this.currentActor ? this.getUltimateSkill(this.currentActor) : null;
    const canUse = Boolean(
      this.currentActor
      && skill
      && this.manager.skillExecutor.canUseSkill(this.currentActor, skill),
    );

    if (canUse) {
      this.ultimateButton.setInteractive({ useHandCursor: true });
      this.ultimateButton.setColor('#ffd166');
    } else {
      this.ultimateButton.disableInteractive();
      this.ultimateButton.setColor('#555555');
    }
  }

  // ── Slot refresh ──────────────────────────────────────────────────────────

  private refreshSlot(combatant: Combatant): void {
    const view = this.slotViews.get(combatant);
    if (!view) return;

    view.rect.fillColor = combatant.isDown ? DOWN_COLOR : view.baseColor;

    // HP bar
    const barW = (view.isParty ? PARTY_SLOT_WIDTH : SLOT_WIDTH) - 12;
    const hpFrac = combatant.isDown ? 0 : Math.max(0, combatant.currentStats.hp / combatant.currentStats.hpMax);
    const hpColor = hpFrac > 0.4 ? HP_BAR_FG : HP_BAR_FG_LOW;
    view.hpBarFg.width = barW * hpFrac;
    view.hpBarFg.fillColor = hpColor;
    view.hpText.setText(this.formatHp(combatant));

    // Resource bars
    if (isCharacterInstance(combatant) && view.vigorBarFg) {
      const res = combatant.currentResources;
      const vFrac = res.vigorMax > 0 ? res.vigor / res.vigorMax : 0;
      view.vigorBarFg.width = barW * vFrac;
    }
    if (isCharacterInstance(combatant) && view.manaBarFg) {
      const res = combatant.currentResources;
      const mFrac = res.manaMax > 0 ? res.mana / res.manaMax : 0;
      view.manaBarFg.width = barW * mFrac;
    }

    view.resourceText.setText(this.formatResources(combatant));
    view.battleText.setText(this.formatBattleRuntime(combatant));

    if (view.intentText && !isCharacterInstance(combatant)) {
      view.intentText.setText(this.formatEnemyIntent(combatant));
    }

    this.refreshStatusIcons(combatant);
    this.updateTargetHighlights();
  }

  private refreshAllEnemyIntents(): void {
    for (const enemy of this.state.enemies) {
      const view = this.slotViews.get(enemy);
      if (view?.intentText) {
        view.intentText.setText(this.formatEnemyIntent(enemy));
      }
    }
  }

  private formatEnemyIntent(enemy: EnemyInstance): string {
    const intent = enemy.intent;
    if (!intent || enemy.isDown) return '';
    if (intent.description) return intent.description;
    switch (intent.type) {
      case 'attack':
        return `⚔ ${intent.value}`;
      case 'apply_status':
        return intent.description;
      case 'defend':
        return '🛡';
      case 'buff':
        return '↑';
      case 'heal':
        return `✚ ${intent.value}`;
    }
  }

  private markSlotDown(combatant: Combatant): void {
    const view = this.slotViews.get(combatant);
    if (!view) return;
    view.rect.fillColor = DOWN_COLOR;
    view.portrait?.setTint(0x444444);
    view.shadow.setAlpha(0.2);
    view.hpBarFg.width = 0;
    view.hpText.setText('Caído');
    view.hpText.setColor('#666666');
    view.resourceText.setText('');
    view.battleText.setText('');
    view.intentText?.setText('');
    view.nameText.setColor('#555555');
    this.refreshStatusIcons(combatant);
    this.updateTargetHighlights();
  }

  private refreshStatusIcons(combatant: Combatant): void {
    const view = this.slotViews.get(combatant);
    if (!view) return;

    view.statusObjects.forEach((obj) => obj.destroy());
    view.statusObjects = [];

    const statuses = combatant.statusEffects;
    if (statuses.length === 0) return;

    const iconSize = 18;
    const gap = 4;
    const totalWidth = statuses.length * iconSize + (statuses.length - 1) * gap;
    const startX = view.rect.x - totalWidth / 2 + iconSize / 2;
    const slotH = view.isParty ? PARTY_SLOT_HEIGHT : SLOT_HEIGHT;
    const y = view.rect.y + slotH / 2 + 14;

    statuses.forEach((status, index) => {
      const x = startX + index * (iconSize + gap);
      const bg = this.add
        .rectangle(x, y, iconSize, iconSize, this.statusColor(status.id), 0.95)
        .setStrokeStyle(1, 0x111111, 0.9)
        .setInteractive({ useHandCursor: true });
      const label = this.add
        .text(x, y, this.statusInitial(status.id), {
          fontSize: '11px',
          color: '#111111',
          fontFamily: 'sans-serif',
          fontStyle: 'bold',
        })
        .setOrigin(0.5);

      bg.on('pointerover', () => this.showStatusTooltip(status, x + 14, y - 10));
      bg.on('pointerout', () => this.hideTooltip());
      label.setInteractive({ useHandCursor: true });
      label.on('pointerover', () => this.showStatusTooltip(status, x + 14, y - 10));
      label.on('pointerout', () => this.hideTooltip());

      view.statusObjects.push(bg, label);
    });
  }

  // ── Formatters ────────────────────────────────────────────────────────────

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

    if (combatant.block > 0) parts.push(`Bloque ${combatant.block}`);
    if (runtime.defendBonus > 0) parts.push(`DEF +${runtime.defendBonus}`);
    if (runtime.bramVotoDefenseBonus > 0) parts.push(`Voto DEF +${runtime.bramVotoDefenseBonus}`);
    if (runtime.tauntActive) parts.push(`Provocar ${runtime.tauntCharges}`);
    if (!isCharacterInstance(combatant) && combatant.phase > 1) parts.push(`Fase ${combatant.phase}`);
    if (isCharacterInstance(combatant) && combatant.data.id === 'mira' && this.state.ashes > 0) {
      parts.push(`Cenizas ${this.state.ashes}/5`);
    }

    return parts.join('  ');
  }

  // ── Floating text ─────────────────────────────────────────────────────────

  private showFloatingDamage(ev: DamageEvent): void {
    const pieces: string[] = [];
    if (ev.wasCrit) pieces.push('CRIT!');
    pieces.push(ev.amount > 0 ? `-${ev.amount}` : '0');
    if (ev.blocked > 0) pieces.push(`Blq ${ev.blocked}`);

    const color = ev.wasCrit ? '#ffd166' : ev.amount > 0 ? '#ff9f9f' : '#9fd1ff';
    const size = ev.wasCrit ? '28px' : '22px';
    this.showFloatingText(ev.target, pieces.join(' '), color, size);
  }

  private showFloatingText(combatant: Combatant, text: string, color: string, fontSize = '22px'): void {
    const view = this.slotViews.get(combatant);
    if (!view) return;

    const floating = this.add
      .text(view.rect.x + Phaser.Math.Between(-20, 20), view.rect.y - 72, text, {
        fontSize,
        color,
        fontFamily: 'sans-serif',
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setDepth(200);

    this.tweens.add({
      targets: floating,
      y: floating.y - 48,
      alpha: 0,
      duration: this.animDuration(900),
      ease: 'Cubic.easeOut',
      onComplete: () => floating.destroy(),
    });
  }

  private showStatusTick(ev: StatusTickedEvent): void {
    if (ev.kind === 'damage' && ev.amount > 0) {
      this.showFloatingText(
        ev.unit,
        `-${ev.amount} ${this.statusLabel(ev.statusId)}`,
        this.statusTextColor(ev.statusId),
      );
      this.addLog(`${this.combatantName(ev.unit)}: ${this.statusLabel(ev.statusId)} -${ev.amount}`);
      return;
    }
    if (ev.kind === 'heal' && ev.amount > 0) {
      this.showFloatingText(ev.unit, `+${ev.amount} Regen`, '#8ee6a8');
      return;
    }
    if (ev.kind === 'skip') {
      this.showFloatingText(ev.unit, 'Aturdido', '#ffe082');
      this.addLog(`${this.combatantName(ev.unit)}: pierde su turno (aturdido)`);
    }
  }

  private showStatusTooltip(status: StatusEffectInstance, x: number, y: number): void {
    this.hideTooltip();
    const data = registry.getStatusEffect(status.id);
    this.tooltipText = this.add
      .text(
        x, y,
        `${data.name}\nStacks: ${status.stacks}\nDuracion: ${this.formatStatusDuration(status.duration)}\n${data.description}`,
        {
          fontSize: '13px',
          color: '#ffffff',
          fontFamily: 'sans-serif',
          backgroundColor: '#111122',
          padding: { x: 8, y: 6 },
          wordWrap: { width: 200 },
        },
      )
      .setDepth(1000);
  }

  private hideTooltip(): void {
    this.tooltipText?.destroy();
    this.tooltipText = null;
  }

  private formatStatusDuration(duration: number): string {
    if (duration < 0) return 'hasta consumir';
    return `${duration} turno${duration === 1 ? '' : 's'}`;
  }

  private statusLabel(statusId: StatusEffectId): string {
    return registry.getStatusEffect(statusId).name;
  }

  private statusInitial(statusId: StatusEffectId): string {
    switch (statusId) {
      case StatusEffectId.BLEED: return 'S';
      case StatusEffectId.BURN: return 'Q';
      case StatusEffectId.POISON: return 'V';
      case StatusEffectId.STUN: return 'A';
      case StatusEffectId.MARKED: return 'M';
      case StatusEffectId.PROTECTED: return 'P';
      case StatusEffectId.INSPIRED: return 'I';
      case StatusEffectId.VULNERABLE: return 'V';
      case StatusEffectId.REGEN: return 'R';
      case StatusEffectId.WEAKENED: return 'D';
    }
  }

  private statusColor(statusId: StatusEffectId): number {
    switch (statusId) {
      case StatusEffectId.BLEED: return 0xc43d4b;
      case StatusEffectId.BURN: return 0xff8c2a;
      case StatusEffectId.POISON: return 0x66c56c;
      case StatusEffectId.STUN: return 0xf5d76e;
      case StatusEffectId.MARKED: return 0xd4a5ff;
      case StatusEffectId.PROTECTED: return 0x77a8ff;
      case StatusEffectId.INSPIRED: return 0x9ee6ff;
      case StatusEffectId.VULNERABLE: return 0xff6f91;
      case StatusEffectId.REGEN: return 0x74d680;
      case StatusEffectId.WEAKENED: return 0xb5b5b5;
    }
  }

  private statusTextColor(statusId: StatusEffectId): string {
    switch (statusId) {
      case StatusEffectId.BLEED: return '#ff6b7a';
      case StatusEffectId.BURN: return '#ff9f45';
      case StatusEffectId.POISON: return '#85e089';
      case StatusEffectId.STUN: return '#ffe082';
      case StatusEffectId.REGEN: return '#8ee6a8';
      default: return '#d4a5ff';
    }
  }

  private combatantName(c: Combatant): string {
    return isCharacterInstance(c) ? this.shortName(c.data.name) : c.data.name;
  }

  private shortName(fullName: string): string {
    const comma = fullName.indexOf(',');
    return comma >= 0 ? fullName.slice(0, comma) : fullName;
  }
}
