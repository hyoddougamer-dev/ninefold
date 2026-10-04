import { describe, expect, it } from 'vitest';
import { existsSync, statSync } from 'node:fs';
import { MUSIC_TOP, PLAYLIST, TRACKS, moodFor, musicGain } from '../music.ts';

describe('樂 the music', () => {
  it('cultivates to the cultivation tracks, hunts to the hunt', () => {
    expect(moodFor({ tab: 'cultivate', fight: null, heavens: false })).toBe('cultivate');
    expect(moodFor({ tab: 'gear', fight: null, heavens: false })).toBe('cultivate');
    expect(moodFor({ tab: 'hunt', fight: null, heavens: false })).toBe('hunt');
  });

  it('keeps the hunt through an ordinary fight, and changes for a big one', () => {
    expect(moodFor({ tab: 'hunt', fight: 'beast', heavens: false })).toBe('hunt');
    expect(moodFor({ tab: 'trials', fight: 'beast', heavens: false })).toBe('hunt');
    expect(moodFor({ tab: 'cultivate', fight: 'boss', heavens: false })).toBe('battle');
  });

  it('plays the heavens above the ninth realm', () => {
    expect(moodFor({ tab: 'cultivate', fight: null, heavens: true })).toBe('heavens');
    expect(moodFor({ tab: 'hunt', fight: null, heavens: true })).toBe('hunt');
  });

  it('has a real, light file behind every track any mood can ask for', () => {
    for (const list of Object.values(PLAYLIST)) {
      expect(list.length).toBeGreaterThan(0);
      for (const t of list) {
        for (const ext of ['m4a', 'webm']) {
          const file = `public/${TRACKS[t]}.${ext}`;
          expect(existsSync(file), file).toBe(true);
          // Streamed on a phone: a track over 4 MB was not run through tools/music.mjs.
          expect(statSync(file).size).toBeLessThan(4e6);
        }
      }
    }
  });

  it('can be turned all the way down, and is quieter than the sound at the top', () => {
    expect(musicGain(0)).toBe(0);
    expect(musicGain(100)).toBe(MUSIC_TOP);
    expect(MUSIC_TOP).toBeLessThan(1);
  });
});
