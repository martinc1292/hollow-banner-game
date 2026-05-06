type SoundKey =
  | 'attack'
  | 'hit'
  | 'skill'
  | 'heal'
  | 'defend'
  | 'death'
  | 'victory'
  | 'defeat'
  | 'ui_click'
  | 'ui_hover'
  | 'level_up'
  | 'relic'
  | 'status';

class SoundManager {
  play(key: SoundKey): void {
    console.log(`[sound] ${key}`);
  }

  playMusic(key: string): void {
    console.log(`[music] ${key}`);
  }

  stopMusic(): void {
    console.log('[music] stop');
  }
}

export const soundManager = new SoundManager();
