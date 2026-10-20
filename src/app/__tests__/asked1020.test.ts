import { describe, expect, it } from 'vitest';
import { CLASS, RANKS } from '../copy.ts';
import { absentFromWeek } from '../ui/Ranks.tsx';
import { SLOTS, SLOT_INFO, shapesOf } from '../../data/gear.ts';
import { SCHOOL_FULL } from '../../sim/balance.ts';
import { schoolSays } from '../classes.ts';
import type { Mine, Row } from '../../net/cloud.ts';

/**
 * 便 Three small things the testers asked about on 2026-10-20: why a cultivator vanished from
 * This Week, where the Artificer's weapon went, and (in balance.ts) whether the deep marks pay.
 */
describe('期 This Week says why the player is not on it', () => {
  const me: Mine = { name: 'Tester', suspect: false, banned: false, climb: 40, marks: 0, tower: 0,
    verified_at: null, latest_at: null, title: null };
  const row = (mine: boolean): Row => ({ rank: 1, name: mine ? 'Tester' : 'Other', climb: 50, marks: 0,
    tower: 0, gain: 3, title: null, me: mine } as Row);

  it('says it once the week has loaded without the player', () => {
    expect(absentFromWeek('week', [row(false), row(false)], me, false)).toBe(true);
  });

  it('stays quiet when the player is on it, on another board, while loading, or on an empty board', () => {
    expect(absentFromWeek('week', [row(false), row(true)], me, false)).toBe(false);
    expect(absentFromWeek('climb', [row(false)], me, false)).toBe(false);
    expect(absentFromWeek('week', null, me, false)).toBe(false);
    expect(absentFromWeek('week', [], me, false)).toBe(false);
    expect(absentFromWeek('week', [row(false)], null, false)).toBe(false);
  });

  it('leaves a reborn life and a held account to the lines that already speak for them', () => {
    expect(absentFromWeek('week', [row(false)], me, true)).toBe(false);
    expect(absentFromWeek('week', [row(false)], { ...me, suspect: true }, false)).toBe(false);
    expect(absentFromWeek('week', [row(false)], { ...me, banned: true }, false)).toBe(false);
  });

  it('names both boards by their English names', () => {
    expect(RANKS.weekAbsent).toContain(RANKS.boards.week.name);
    expect(RANKS.weekAbsent).toContain(`${RANKS.boards.climb.han} the ${RANKS.boards.climb.name}`);
    expect(RANKS.weekAbsent).toContain('since Monday');
  });
});

describe('器 the Artificer says it has no weapon', () => {
  it('is true: no weapon shape is Artificer, and the other five places make its full', () => {
    const places = SLOTS.filter((s) => shapesOf('artificer').some((a) => a.slot === s));
    expect(places).not.toContain('weapon');
    expect(places.length).toBe(SCHOOL_FULL);
    const said = schoolSays('artificer');
    expect(said).toContain('No weapon is an Artificer piece');
    for (const s of places) expect(said).toContain(SLOT_INFO[s].name.toLowerCase());
    expect(CLASS.school.artificer(0.9, 0.8, 1.5, 2)).toContain('by design');
  });
});
