import type Phaser from 'phaser';
import type { Combatant } from '@/systems/battle/BattleState';

export interface SlotView {
  combatant: Combatant;
  rect: Phaser.GameObjects.Rectangle;
  portrait: Phaser.GameObjects.Image | null;
  shadow: Phaser.GameObjects.Ellipse;
  glow: Phaser.GameObjects.Graphics;
  frame: Phaser.GameObjects.Graphics;
  nameText: Phaser.GameObjects.Text;
  hpText: Phaser.GameObjects.Text;
  hpBarBg: Phaser.GameObjects.Rectangle;
  hpBarFg: Phaser.GameObjects.Rectangle;
  resourceText: Phaser.GameObjects.Text;
  vigorBarBg: Phaser.GameObjects.Rectangle | null;
  vigorBarFg: Phaser.GameObjects.Rectangle | null;
  manaBarBg: Phaser.GameObjects.Rectangle | null;
  manaBarFg: Phaser.GameObjects.Rectangle | null;
  battleText: Phaser.GameObjects.Text;
  intentText: Phaser.GameObjects.Text | null;
  statusObjects: Phaser.GameObjects.GameObject[];
  baseColor: number;
  baseX: number;
  baseY: number;
  isParty: boolean;
}
