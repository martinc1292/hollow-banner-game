import Phaser from 'phaser';
import { SceneKeys } from '@/config/SceneKeys';
import { makeTextButton } from '@/ui/TextButton';
import { registry } from '@/data/Registry';
import { bandidoHueco } from '@/data/enemies/bandidoHueco';
import {
  createCharacterInstance,
  createEnemyInstance,
} from '@/systems/battle/BattleState';
import type { BattleSceneInitData } from '@/scenes/BattleScene';

export class MapScene extends Phaser.Scene {
  constructor() {
    super({ key: SceneKeys.MAP });
  }

  create(): void {
    const { width, height } = this.scale;

    this.add
      .text(width / 2, height / 2 - 60, 'Mapa (a implementar)', {
        fontSize: '32px',
        color: '#aaaaaa',
        fontFamily: 'sans-serif',
      })
      .setOrigin(0.5);

    makeTextButton(this, width / 2, height / 2 + 40, 'Combate de prueba', () => {
      const data: BattleSceneInitData = {
        party: [
          createCharacterInstance(registry.getCharacter('bram')),
          createCharacterInstance(registry.getCharacter('vera')),
          createCharacterInstance(registry.getCharacter('mira')),
        ],
        enemies: [createEnemyInstance(bandidoHueco), createEnemyInstance(bandidoHueco)],
      };
      this.scene.start(SceneKeys.BATTLE, data);
    });
  }
}
