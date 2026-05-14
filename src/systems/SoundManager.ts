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

type SoundInstance = {
  play: () => void;
  stop?: () => void;
  setVolume?: (volume: number) => void;
};

type SoundScene = {
  sound?: {
    add: (key: string, config?: { volume?: number; loop?: boolean }) => SoundInstance;
  };
  cache?: {
    audio?: {
      exists: (key: string) => boolean;
    };
  };
};

const SOUND_KEYS: Record<SoundKey, string> = {
  attack: 'sfx_attack',
  hit: 'sfx_hit',
  skill: 'sfx_skill',
  heal: 'sfx_heal',
  defend: 'sfx_defend',
  death: 'sfx_death',
  victory: 'sfx_victory',
  defeat: 'sfx_defeat',
  ui_click: 'sfx_ui_click',
  ui_hover: 'sfx_ui_hover',
  level_up: 'sfx_level_up',
  relic: 'sfx_relic',
  status: 'sfx_status',
};

export class SoundManager {
  private scene: SoundScene | null = null;
  private volume = 0.6;
  private muted = false;
  private currentMusic: SoundInstance | null = null;

  attachScene(scene: SoundScene): void {
    this.scene = scene;
  }

  play(key: SoundKey): void {
    if (this.muted) return;
    const audioKey = SOUND_KEYS[key];
    const instance = this.createSound(audioKey, { volume: this.volume });
    instance?.play();
  }

  playMusic(key: string): void {
    if (this.muted) return;
    this.stopMusic();
    this.currentMusic = this.createSound(key, { volume: this.volume, loop: true });
    this.currentMusic?.play();
  }

  stopMusic(): void {
    this.currentMusic?.stop?.();
    this.currentMusic = null;
  }

  setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume));
    this.currentMusic?.setVolume?.(this.volume);
  }

  getVolume(): number {
    return this.volume;
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    if (muted) {
      this.stopMusic();
    }
  }

  isMuted(): boolean {
    return this.muted;
  }

  private createSound(
    key: string,
    config: { volume?: number; loop?: boolean },
  ): SoundInstance | null {
    if (!this.scene?.sound) return null;
    if (this.scene.cache?.audio && !this.scene.cache.audio.exists(key)) return null;

    try {
      return this.scene.sound.add(key, config);
    } catch {
      return null;
    }
  }
}

export const soundManager = new SoundManager();
