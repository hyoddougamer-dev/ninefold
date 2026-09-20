import { describe, expect, it, beforeEach, vi } from 'vitest';

/**
 * 音 The one thing about sound worth a test.
 *
 * A missing key is not a choice. `Number(null)` is 0, and 0 is a valid level, so the
 * first read of an empty store set the volume to silent — and the game shipped muted
 * for anybody who had never touched the button. It was found in a screenshot, not in a
 * test, which is why there is one now.
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

  it('starts audible when nothing has ever been chosen', async () => {
    const { isMuted, soundLevel, LEVELS } = await import('../sound.ts');
    expect(soundLevel()).toBe(LEVELS.length - 1);
    expect(isMuted()).toBe(false);
  });

  it('keeps a chosen level, and honours an old mute once', async () => {
    store.set('ninefold.volume', '1');
    const a = await import('../sound.ts');
    expect(a.soundLevel()).toBe(1);
    expect(a.isMuted()).toBe(false);

    store.clear();
    store.set('ninefold.muted', '1');
    vi.resetModules();
    const b = await import('../sound.ts');
    expect(b.isMuted()).toBe(true);
  });

  it('cycles off, quiet and on, and remembers', async () => {
    const { cycleSound, soundLevel, LEVELS } = await import('../sound.ts');
    const seen = new Set<number>();
    for (let i = 0; i < LEVELS.length; i++) seen.add(cycleSound());
    expect(seen.size).toBe(LEVELS.length);
    expect(store.get('ninefold.volume')).toBe(String(soundLevel()));
  });
});
