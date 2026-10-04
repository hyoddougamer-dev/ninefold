import { describe, expect, it, beforeEach, vi } from 'vitest';

/**
 * 音 The volume: a slider and a mute, and every key the three steps left behind.
 *
 * A missing key is not a choice. `Number(null)` is 0, and 0 was a valid step, so the
 * first read of an empty store set the volume to silent, and the game shipped muted
 * for anybody who had never touched the button. It was found in a screenshot, not in a
 * test, which is why there is one. The slider replaced the steps (rekaris: *"quiet"* was
 * still loud), and a player who chose a step keeps the loudness they chose.
 */
describe('音 the volume', () => {
  const store = new Map<string, string>();

  beforeEach(() => {
    store.clear();
    vi.resetModules();
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k),
    });
  });

  it('starts audible, at the top, when nothing has ever been chosen', async () => {
    const { isMuted, soundVolume } = await import('../sound.ts');
    expect(soundVolume()).toEqual({ pct: 100, muted: false });
    expect(isMuted()).toBe(false);
    const m = await import('../music.ts');
    expect(m.musicVolume()).toEqual({ pct: 100, muted: false });
  });

  it('keeps an old step at the loudness it had, and honours an old mute once', async () => {
    store.set('ninefold.volume', '1');
    store.set('ninefold.music', '1');
    const a = await import('../sound.ts');
    expect(a.isMuted()).toBe(false);
    expect(a.gainOf(a.soundVolume().pct)).toBeCloseTo(0.4, 1);
    const am = await import('../music.ts');
    expect(am.musicGain(am.musicVolume().pct)).toBeCloseTo(0.28, 1);

    store.clear();
    store.set('ninefold.volume', '0');
    store.set('ninefold.music', '0');
    vi.resetModules();
    const b = await import('../sound.ts');
    expect(b.isMuted()).toBe(true);
    expect((await import('../music.ts')).musicVolume().muted).toBe(true);

    store.clear();
    store.set('ninefold.muted', '1');
    vi.resetModules();
    const c = await import('../sound.ts');
    expect(c.isMuted()).toBe(true);
  });

  it('remembers a level and a mute, and the mute keeps the level to come back to', async () => {
    const a = await import('../sound.ts');
    a.setSoundVolume(35);
    a.setSoundMuted(true);
    expect(store.get('ninefold.volume.pct')).toBe('35');
    expect(store.get('ninefold.volume.mute')).toBe('1');
    vi.resetModules();
    const b = await import('../sound.ts');
    expect(b.soundVolume()).toEqual({ pct: 35, muted: true });
    expect(b.isMuted()).toBe(true);
    // Moving the slider is wanting to hear it.
    b.setSoundVolume(20);
    expect(b.isMuted()).toBe(false);
    // A new key wins over the old step, and nonsense in it is no choice at all.
    store.set('ninefold.volume', '0');
    vi.resetModules();
    expect((await import('../sound.ts')).soundVolume()).toEqual({ pct: 20, muted: false });
    store.set('ninefold.volume.pct', 'loud');
    store.delete('ninefold.volume');
    vi.resetModules();
    expect((await import('../sound.ts')).soundVolume().pct).toBe(100);
  });

  it('reads the slider on a square, so the bottom of it is really quiet', async () => {
    const { gainOf } = await import('../sound.ts');
    expect(gainOf(0)).toBe(0);
    expect(gainOf(100)).toBe(1);
    expect(gainOf(50)).toBeCloseTo(0.25);
    expect(gainOf(10)).toBeLessThan(0.02);
    expect(gainOf(150)).toBe(1);
    expect(gainOf(-5)).toBe(0);
  });
});
