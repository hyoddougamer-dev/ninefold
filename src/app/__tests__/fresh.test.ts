import { describe, expect, it } from 'vitest';
import { TAB_OF, clearFresh, freshTabs, markFresh, newTabsOf } from '../fresh.ts';
import { workshopLines } from '../away.ts';
import { SYSTEMS } from '../../sim/unlocks.ts';
import { newState, validate } from '../../sim/state.ts';
import type { Away } from '../../sim/save.ts';

const T0 = 1_700_000_000;

describe('新 the dot on a tab a breakthrough filled', () => {
  it('knows the tab of every system there is', () => {
    for (const s of SYSTEMS) expect(TAB_OF[s.key]).toBeTruthy();
  });

  it('names the second realm’s new tabs and never 修, where the breakthrough happens', () => {
    expect(newTabsOf(2)).toEqual(expect.arrayContaining(['gear', 'crafts', 'dao']));
    expect(newTabsOf(2)).not.toContain('cultivate');
  });

  it('stays through a reload and goes, tab by tab, as each is opened', () => {
    const s0 = markFresh(newState(T0), ['hunt', 'gear']);
    const reloaded = validate(JSON.parse(JSON.stringify(s0)), T0);
    expect(freshTabs(reloaded)).toEqual(['hunt', 'gear']);
    const s1 = clearFresh(reloaded, 'gear');
    expect(freshTabs(s1)).toEqual(['hunt']);
    expect(clearFresh(s1, 'dao')).toBe(s1);
    expect(freshTabs(clearFresh(s1, 'hunt'))).toEqual([]);
    expect(clearFresh(s1, 'hunt').seen.some((k) => k.startsWith('new:'))).toBe(false);
  });

  it('fits in one entry of the capped seen list, whatever it names', () => {
    const s = markFresh(newState(T0), ['hunt', 'trials', 'gear', 'crafts', 'dao']);
    const mark = s.seen.filter((k) => k.startsWith('new:'));
    expect(mark).toHaveLength(1);
    expect(mark[0].length).toBeLessThanOrEqual(32);
    expect(freshTabs(validate(JSON.parse(JSON.stringify(s)), T0))).toHaveLength(5);
  });

  it('leaves a save from before it existed without a single dot', () => {
    expect(freshTabs({ ...newState(T0), seen: ['whom', 'guide', 'workshop'] })).toEqual([]);
  });
});

describe('業 the workshop’s lines on the return card', () => {
  const away = (o: Partial<Away>): Away => ({
    task: 'vein:iron', made: 0, xp: 0, from: 5, to: 5, stood: null, still: 0, missing: null, hours: 12, ...o,
  });

  it('says what it made and that it rested after its window', () => {
    const lines = workshopLines(away({ made: 12126, stood: 'limit', still: 18 * 3600 }));
    expect(lines[0]).toMatch(/made 12,126 × Mortal Iron Ore/);
    expect(lines[1]).toMatch(/rested for 18h.*works 12 hours after each visit/);
  });

  it('has a line on a night that made nothing', () => {
    const lines = workshopLines(away({ task: 'forge:metal1', stood: 'needs', missing: 'iron', still: 8 * 3600 }));
    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatch(/waited 8h for Mortal Iron Ore to make/);
  });

  it('says a workshop with no task had none, and how to set one', () => {
    expect(workshopLines(away({ task: null, stood: 'idle', still: 5 * 3600 }))[0]).toMatch(/no task for 5h/);
  });

  it('never reads as a loss, and never with a dash', () => {
    for (const stood of ['limit', 'needs', 'chest', 'remains', 'idle'] as const) {
      for (const made of [0, 40]) {
        for (const line of workshopLines(away({ made, stood, still: 7200, missing: 'mat' }))) {
          expect(line).not.toMatch(/\b(lost|wasted|missed|spoil)/i);
          expect(line).not.toMatch(/—/);
        }
      }
    }
  });
});
