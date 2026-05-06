import Phaser from 'phaser';
import { SceneKeys } from '@/config/SceneKeys';
import {
  completeCurrentMapNode,
  ensureRunParty,
  getShortName,
  getUpgradableSkills,
  healPartyByPercent,
  modifyCharacterStat,
  statLabel,
  upgradeSkill,
} from '@/systems/noncombat/NonCombatActions';
import { saveManager } from '@/systems/SaveManager';
import { type CharacterInstance, type StatKey } from '@/types';

type CampMode = 'options' | 'skills' | 'forge';

const PANEL_X = 86;
const PANEL_Y = 128;
const PANEL_WIDTH = 1108;
const PANEL_HEIGHT = 470;

export class CampScene extends Phaser.Scene {
  private mode: CampMode = 'options';
  private viewObjects: Phaser.GameObjects.GameObject[] = [];

  constructor() {
    super({ key: SceneKeys.CAMP });
  }

  init(): void {
    this.mode = 'options';
    this.viewObjects = [];
  }

  create(): void {
    ensureRunParty();
    this.render();
  }

  private render(): void {
    this.clearViewObjects();
    this.renderBackground();
    this.renderHeader();

    if (this.mode === 'options') {
      this.renderOptions();
    } else if (this.mode === 'skills') {
      this.renderSkillUpgrade();
    } else {
      this.renderForge();
    }
  }

  private renderBackground(): void {
    const { width, height } = this.scale;
    this.addViewObject(this.add.rectangle(width / 2, height / 2, width, height, 0x101515, 1));

    const glow = this.add.circle(width / 2, height - 84, 230, 0xb66f32, 0.08);
    this.addViewObject(glow);

    const grid = this.add.graphics();
    grid.lineStyle(1, 0x2f3c37, 0.28);
    for (let x = 52; x < width; x += 84) {
      grid.lineBetween(x, 104, x, height - 54);
    }
    for (let y = 122; y < height - 52; y += 56) {
      grid.lineBetween(42, y, width - 42, y);
    }
    this.addViewObject(grid);
  }

  private renderHeader(): void {
    const subtitle = this.mode === 'options'
      ? 'Elige una unica accion antes de seguir la ruta.'
      : this.mode === 'skills'
        ? 'Elige una habilidad para reemplazarla por su version mejorada.'
        : 'Elige un personaje y una forja permanente.';

    this.addViewObject(this.add.text(42, 25, 'Campamento', {
      fontSize: '38px',
      color: '#f0e4c8',
      fontFamily: 'Georgia, serif',
    }));

    this.addViewObject(this.add.text(44, 68, subtitle, {
      fontSize: '15px',
      color: '#9fb0a7',
      fontFamily: 'Georgia, serif',
    }));

    if (this.mode !== 'options') {
      this.addViewObject(this.createActionText(this.scale.width - 94, 52, 'Volver', () => {
        this.mode = 'options';
        this.render();
      }, 18, '#d5c7a7'));
    }
  }

  private renderOptions(): void {
    const options = [
      {
        title: 'Descansar',
        kicker: 'Curar 30% HP',
        body: 'Toda la party recupera 30% de su HP maximo. Los pactos que bloquean curacion se respetan.',
        action: () => this.applyRest(),
        accent: 0x78b56f,
      },
      {
        title: 'Entrenar',
        kicker: 'Mejorar una habilidad',
        body: 'Selecciona un personaje y una habilidad activa para reemplazarla por su version +.',
        action: () => {
          this.mode = 'skills';
          this.render();
        },
        accent: 0xd1ad63,
      },
      {
        title: 'Forjar',
        kicker: '+1 stat permanente',
        body: 'Aplica +1 Ataque, +1 Poder o +1 Defensa a un personaje de la party.',
        action: () => {
          this.mode = 'forge';
          this.render();
        },
        accent: 0x74a8d8,
      },
    ];
    const cardWidth = 330;
    const gap = 28;
    const startX = this.scale.width / 2 - (cardWidth * options.length + gap * 2) / 2;

    options.forEach((option, index) => {
      this.renderOptionCard(
        startX + index * (cardWidth + gap),
        198,
        cardWidth,
        250,
        option,
      );
    });
  }

  private renderOptionCard(
    x: number,
    y: number,
    width: number,
    height: number,
    option: { title: string; kicker: string; body: string; action: () => void; accent: number },
  ): void {
    const bg = this.add.rectangle(x, y, width, height, 0x18201d, 0.98)
      .setOrigin(0, 0)
      .setStrokeStyle(1, 0x536b5e, 0.78)
      .setInteractive({ useHandCursor: true });
    const strip = this.add.rectangle(x, y, width, 8, option.accent, 0.92)
      .setOrigin(0, 0);
    const kicker = this.add.text(x + 18, y + 28, option.kicker, {
      fontSize: '12px',
      color: '#99aea4',
      fontFamily: 'Georgia, serif',
      fontStyle: 'bold',
    });
    const title = this.add.text(x + 18, y + 58, option.title, {
      fontSize: '28px',
      color: '#f0e4c8',
      fontFamily: 'Georgia, serif',
    });
    const body = this.add.text(x + 18, y + 112, option.body, {
      fontSize: '15px',
      color: '#c5bba6',
      fontFamily: 'Georgia, serif',
      lineSpacing: 5,
      wordWrap: { width: width - 36, useAdvancedWrap: true },
    });
    const action = this.add.text(x + 18, y + height - 40, 'Elegir', {
      fontSize: '16px',
      color: '#f0d37a',
      fontFamily: 'Georgia, serif',
      fontStyle: 'bold',
    });

    bg.on('pointerover', () => {
      bg.setStrokeStyle(3, option.accent, 1);
      action.setColor('#fff0ad');
    });
    bg.on('pointerout', () => {
      bg.setStrokeStyle(1, 0x536b5e, 0.78);
      action.setColor('#f0d37a');
    });
    bg.on('pointerdown', option.action);

    this.addViewObject(bg);
    this.addViewObject(strip);
    this.addViewObject(kicker);
    this.addViewObject(title);
    this.addViewObject(body);
    this.addViewObject(action);
  }

  private renderSkillUpgrade(): void {
    const panel = this.add.rectangle(PANEL_X, PANEL_Y, PANEL_WIDTH, PANEL_HEIGHT, 0x17201d, 0.96)
      .setOrigin(0, 0)
      .setStrokeStyle(1, 0x536b5e, 0.78);
    this.addViewObject(panel);

    const cardWidth = 340;
    const gap = 22;
    const startX = PANEL_X + 22;

    ensureRunParty().forEach((character, index) => {
      this.renderCharacterSkillColumn(
        character,
        startX + index * (cardWidth + gap),
        PANEL_Y + 26,
        cardWidth,
        PANEL_HEIGHT - 52,
      );
    });
  }

  private renderCharacterSkillColumn(
    character: CharacterInstance,
    x: number,
    y: number,
    width: number,
    height: number,
  ): void {
    const bg = this.add.rectangle(x, y, width, height, 0x101817, 0.95)
      .setOrigin(0, 0)
      .setStrokeStyle(1, this.characterAccent(character.data.id), 0.82);
    this.addViewObject(bg);

    this.addViewObject(this.add.text(x + 16, y + 16, getShortName(character.data.name), {
      fontSize: '22px',
      color: '#f0e4c8',
      fontFamily: 'Georgia, serif',
      fontStyle: 'bold',
    }));

    const skills = getUpgradableSkills(character);
    if (skills.length === 0) {
      this.addViewObject(this.add.text(x + 16, y + 58, 'Sin habilidades pendientes de mejora.', {
        fontSize: '14px',
        color: '#7d8b86',
        fontFamily: 'Georgia, serif',
        wordWrap: { width: width - 32, useAdvancedWrap: true },
      }));
      return;
    }

    skills.forEach((skill, index) => {
      const rowY = y + 58 + index * 88;
      const row = this.add.rectangle(x + 14, rowY, width - 28, 72, 0x17211e, 0.96)
        .setOrigin(0, 0)
        .setStrokeStyle(1, 0x3f5c4e, 0.78)
        .setInteractive({ useHandCursor: true });
      const name = this.add.text(x + 28, rowY + 11, `${skill.skillName} -> ${skill.improvedSkillName}`, {
        fontSize: '15px',
        color: '#f0d37a',
        fontFamily: 'Georgia, serif',
        fontStyle: 'bold',
        fixedWidth: width - 56,
      });
      const description = this.add.text(x + 28, rowY + 34, skill.description, {
        fontSize: '12px',
        color: '#b9c5bd',
        fontFamily: 'Georgia, serif',
        wordWrap: { width: width - 56, useAdvancedWrap: true },
      });

      row.on('pointerover', () => row.setStrokeStyle(3, 0xd1ad63, 1));
      row.on('pointerout', () => row.setStrokeStyle(1, 0x3f5c4e, 0.78));
      row.on('pointerdown', () => this.applySkillUpgrade(character, skill.skillId));

      this.addViewObject(row);
      this.addViewObject(name);
      this.addViewObject(description);
    });
  }

  private renderForge(): void {
    const panel = this.add.rectangle(PANEL_X, PANEL_Y, PANEL_WIDTH, PANEL_HEIGHT, 0x151d21, 0.96)
      .setOrigin(0, 0)
      .setStrokeStyle(1, 0x4f6870, 0.78);
    this.addViewObject(panel);

    const cardWidth = 340;
    const gap = 22;
    const startX = PANEL_X + 22;

    ensureRunParty().forEach((character, index) => {
      this.renderForgeColumn(
        character,
        startX + index * (cardWidth + gap),
        PANEL_Y + 36,
        cardWidth,
      );
    });
  }

  private renderForgeColumn(
    character: CharacterInstance,
    x: number,
    y: number,
    width: number,
  ): void {
    const bg = this.add.rectangle(x, y, width, 300, 0x101719, 0.95)
      .setOrigin(0, 0)
      .setStrokeStyle(1, this.characterAccent(character.data.id), 0.82);
    this.addViewObject(bg);

    this.addViewObject(this.add.text(x + 18, y + 18, getShortName(character.data.name), {
      fontSize: '24px',
      color: '#f0e4c8',
      fontFamily: 'Georgia, serif',
      fontStyle: 'bold',
    }));

    const stats = [
      `ATQ ${this.formatNumber(character.currentStats.attack)}`,
      `POD ${this.formatNumber(character.currentStats.power)}`,
      `DEF ${this.formatNumber(character.currentStats.defense)}`,
    ].join('  ');
    this.addViewObject(this.add.text(x + 18, y + 56, stats, {
      fontSize: '14px',
      color: '#aebebf',
      fontFamily: 'Georgia, serif',
    }));

    (['attack', 'power', 'defense'] as StatKey[]).forEach((stat, index) => {
      const button = this.createWideButton(
        x + 24,
        y + 104 + index * 58,
        width - 48,
        `+1 ${statLabel(stat)}`,
        () => this.applyForge(character, stat),
      );
      this.addViewObject(button.bg);
      this.addViewObject(button.text);
    });
  }

  private applyRest(): void {
    const healed = healPartyByPercent(0.3);
    this.finishCamp(`La party recupera ${this.formatNumber(healed)} HP en total.`);
  }

  private applySkillUpgrade(character: CharacterInstance, skillId: string): void {
    const improvedName = upgradeSkill(character, skillId);
    if (!improvedName) return;

    this.finishCamp(`${getShortName(character.data.name)} aprende ${improvedName}.`);
  }

  private applyForge(character: CharacterInstance, stat: StatKey): void {
    modifyCharacterStat(character, stat, 1);
    this.finishCamp(`${getShortName(character.data.name)} gana +1 ${statLabel(stat)}.`);
  }

  private finishCamp(message: string): void {
    this.showResult(message);
    completeCurrentMapNode();
    saveManager.save();
    this.time.delayedCall(950, () => this.scene.start(SceneKeys.MAP));
  }

  private showResult(message: string): void {
    const bg = this.add.rectangle(this.scale.width / 2, 640, 640, 44, 0x111817, 0.98)
      .setStrokeStyle(1, 0xd1ad63, 0.86)
      .setDepth(900);
    const text = this.add.text(this.scale.width / 2, 640, message, {
      fontSize: '16px',
      color: '#f0e4c8',
      fontFamily: 'Georgia, serif',
    }).setOrigin(0.5).setDepth(901);

    this.addViewObject(bg);
    this.addViewObject(text);
  }

  private createWideButton(
    x: number,
    y: number,
    width: number,
    label: string,
    onClick: () => void,
  ): { bg: Phaser.GameObjects.Rectangle; text: Phaser.GameObjects.Text } {
    const bg = this.add.rectangle(x, y, width, 42, 0x1d2b2d, 0.96)
      .setOrigin(0, 0)
      .setStrokeStyle(1, 0x5e7c80, 0.82)
      .setInteractive({ useHandCursor: true });
    const text = this.add.text(x + width / 2, y + 21, label, {
      fontSize: '17px',
      color: '#f0d37a',
      fontFamily: 'Georgia, serif',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    bg.on('pointerover', () => {
      bg.setStrokeStyle(3, 0x74a8d8, 1);
      text.setColor('#fff0ad');
    });
    bg.on('pointerout', () => {
      bg.setStrokeStyle(1, 0x5e7c80, 0.82);
      text.setColor('#f0d37a');
    });
    bg.on('pointerdown', onClick);

    return { bg, text };
  }

  private createActionText(
    x: number,
    y: number,
    label: string,
    onClick: () => void,
    fontSize: number,
    color: string,
  ): Phaser.GameObjects.Text {
    const text = this.add.text(x, y, label, {
      fontSize: `${fontSize}px`,
      color,
      fontFamily: 'Georgia, serif',
      fontStyle: 'bold',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    text.setData('baseColor', color);
    text.on('pointerover', () => text.setColor('#fff0ad'));
    text.on('pointerout', () => text.setColor(text.getData('baseColor') as string));
    text.on('pointerdown', onClick);
    return text;
  }

  private characterAccent(characterId: string): number {
    switch (characterId) {
      case 'bram':
        return 0xd5b46a;
      case 'vera':
        return 0xc5695a;
      case 'mira':
        return 0x8aa7c7;
      default:
        return 0x8dc08b;
    }
  }

  private formatNumber(value: number): string {
    return Number.isInteger(value) ? `${value}` : `${value.toFixed(1)}`;
  }

  private addViewObject<T extends Phaser.GameObjects.GameObject>(object: T): T {
    this.viewObjects.push(object);
    return object;
  }

  private clearViewObjects(): void {
    for (const object of this.viewObjects) {
      object.destroy();
    }
    this.viewObjects = [];
  }
}
