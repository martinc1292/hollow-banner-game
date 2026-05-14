import { describe, expect, test, vi } from 'vitest';
import { SoundManager } from './SoundManager';

describe('SoundManager', () => {
  test('does not log in production and supports mute/volume controls', () => {
    const scene = {
      sound: {
        add: vi.fn(() => ({
          play: vi.fn(),
          stop: vi.fn(),
          setVolume: vi.fn(),
        })),
      },
    };
    const manager = new SoundManager();
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    manager.attachScene(scene);
    manager.setVolume(0.25);
    manager.play('attack');
    manager.setMuted(true);
    manager.play('hit');

    expect(scene.sound.add).toHaveBeenCalledWith('sfx_attack', { volume: 0.25 });
    expect(scene.sound.add).not.toHaveBeenCalledWith('sfx_hit', expect.anything());
    expect(manager.isMuted()).toBe(true);
    expect(logSpy).not.toHaveBeenCalled();

    logSpy.mockRestore();
  });
});
