import { describe, expect, it } from 'vitest';
import { CARVED, columns, FIRST, foot, GATES, seenAt, shown, walkedBefore } from '../cliff.ts';
import { RANKS } from '../copy.ts';
import { WARDENS } from '../../data/bestiary.ts';
// @ts-expect-error a plain .mjs fixture shared with the harnesses, typed by what it returns
import { cliffRows, forerunnerRows, UNCARVED } from '../../../tools/cliff-fixture.mjs';
import type { Carved } from '../../net/cloud.ts';

/**
 * 題名崖 The Cliff of Names, folded from cliff()'s flat list (docs/SEASON0-THEME.md, 2c).
 * The server decides who is carved and where; these hold that the screen shows exactly that.
 */
const day9 = cliffRows({ me: 'Kestrel' }) as Carved[];

describe('題名崖 the Cliff of Names', () => {
  it('has nine columns, one per gate, each named for its warden from the bestiary', () => {
    const cols = columns([], null);
    expect(cols).toHaveLength(GATES);
    expect(cols.map((c) => c.han)).toEqual(['妖狐', '石猿', '仙鶴', '雷虎', '玄武', '石傀', '魔狼', '蛟', '龍']);
    expect(cols.map((c) => c.name)).toEqual(WARDENS.map((w) => w.name));
    // Day 0: every column in ink, nobody lit.
    expect(cols.every((c) => !c.on && c.rows.length === 0 && c.mine === null)).toBe(true);
  });

  it('puts every carving in its own gate, in rank order, and takes colour only where a name is', () => {
    const shuffled = [...day9].reverse();
    const cols = columns(shuffled, 'Kestrel');
    expect(cols.map((c) => c.rows.length)).toEqual([81, 60, 5, 2, 0, 0, 0, 0, 0]);
    expect(cols.map((c) => c.on)).toEqual([true, true, true, true, false, false, false, false, false]);
    for (const c of cols) expect(c.rows.map((r) => r.rank)).toEqual(c.rows.map((_, i) => i + 1));
  });

  it('never shows more than 81 in a column, nor a gate that does not exist', () => {
    const odd: Carved[] = [
      ...day9,
      { gate: 1, rank: 82, name: 'Late', at: '2026-10-30T00:00:00Z', forerunner: false },
      { gate: 0, rank: 1, name: 'Nowhere', at: '2026-10-30T00:00:00Z', forerunner: false },
      { gate: 10, rank: 1, name: 'Beyond', at: '2026-10-30T00:00:00Z', forerunner: false },
    ];
    const cols = columns(odd, null);
    expect(cols[0].rows).toHaveLength(CARVED);
    expect(cols.flatMap((c) => c.rows).some((r) => ['Late', 'Nowhere', 'Beyond'].includes(r.name))).toBe(false);
  });

  it('lights your own place by the name the boards show, on every gate you are through', () => {
    const cols = columns(day9, 'Kestrel');
    expect(cols.map((c) => c.mine)).toEqual([23, 5, null, null, null, null, null, null, null]);
    expect(columns(day9, null).every((c) => c.mine === null)).toBe(true);
    expect(columns(day9, 'Somebody Else').every((c) => c.mine === null)).toBe(true);
  });

  it('shows the first nine, and your own place under them when it is further down', () => {
    const [fox, ape, crane] = columns(day9, 'Kestrel');
    const top = shown(fox, false);
    expect(top).toHaveLength(FIRST + 1);
    expect(top.slice(0, FIRST).map((r) => r.rank)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(top[FIRST]).toMatchObject({ rank: 23, name: 'Kestrel' });
    // Inside the first nine already: no second copy of it.
    expect(shown(ape, false)).toHaveLength(FIRST);
    expect(shown(ape, false).filter((r) => r.name === 'Kestrel')).toHaveLength(1);
    expect(shown(crane, false)).toHaveLength(5);
    expect(shown(fox, true)).toHaveLength(81);
  });

  it('names those who walked before once each, in the order the server first saw them, with no number', () => {
    const before = walkedBefore(day9);
    expect(new Set(before).size).toBe(before.length);
    const all = new Set(day9.filter((r) => r.forerunner).map((r) => r.name));
    expect(new Set(before)).toEqual(all);
    expect(before).toContain('Kestrel');
    expect(before.every((n) => typeof n === 'string' && !/\d/.test(n))).toBe(true);
    const firstSeen = (n: string) => Math.min(...day9.filter((r) => r.name === n).map((r) => Date.parse(r.at)));
    for (let i = 1; i < before.length; i++) expect(firstSeen(before[i - 1])).toBeLessThanOrEqual(firstSeen(before[i]));
    expect(walkedBefore([])).toEqual([]);
    expect(walkedBefore(day9.map((r) => ({ ...r, forerunner: false })))).toEqual([]);
  });

  it('lists every Forerunner at the foot, carved or not, and falls back to the carved ones only when it must', () => {
    const every = (forerunnerRows(day9) as { name: string }[]).map((r) => r.name);
    const whole = foot(every, day9);
    expect(whole.whole).toBe(true);
    expect(whole.names).toEqual(every);
    for (const n of UNCARVED as string[]) expect(whole.names).toContain(n);
    // A name the server sent twice is still named once.
    expect(foot([...every, every[0]], day9).names).toEqual(every);
    // forerunners() could not be read: the carved ones, and it says so (whole is false).
    const carved = foot(null, day9);
    expect(carved.whole).toBe(false);
    expect(carved.names).toEqual(walkedBefore(day9));
    for (const n of UNCARVED as string[]) expect(carved.names).not.toContain(n);
    expect(foot(null, null)).toEqual({ names: [], whole: false });
    expect(foot([], day9)).toEqual({ names: [], whole: true });
  });

  it('dates a carving in the device\'s own time, in English, and says nothing for a date it cannot read', () => {
    const iso = '2026-10-26T00:41:00Z';
    const d = new Date(iso);
    const hm = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    expect(seenAt(iso)).toBe(`${d.getDate()} ${RANKS.cliff.months[d.getMonth()]}, ${hm}`);
    expect(seenAt('not a date')).toBe('');
  });

  it('says where you are carved in words, with the right ending on the number', () => {
    const y = RANKS.cliff.yours;
    expect(y(1, "Spirit Fox's gate")).toBe("You are carved 1st through the Spirit Fox's gate.");
    expect([2, 3, 4, 11, 12, 13, 21, 22, 23, 81].map((n) => y(n, 'x').match(/carved (\d+\w+)/)![1]))
      .toEqual(['2nd', '3rd', '4th', '11th', '12th', '13th', '21st', '22nd', '23rd', '81st']);
    expect(RANKS.cliff.count(81)).toMatch(/full/);
    expect(RANKS.cliff.gate(1)).toBe('into realm 2');
    expect(RANKS.cliff.gate(9)).toMatch(/tribulation/);
  });

  it('carries no dash in anything the player reads', () => {
    const words = JSON.stringify(RANKS.cliff) + RANKS.cliff.yours(3, 'x') + RANKS.cliff.more(4)
      + RANKS.cliff.date(1, 'Oct', '00:00') + RANKS.mineHead;
    expect(words).not.toMatch(/[–—]/);
    expect(words).not.toMatch(/, the /);
  });
});
