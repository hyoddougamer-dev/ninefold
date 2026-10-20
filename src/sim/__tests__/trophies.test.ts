import { describe, expect, it } from 'vitest';
import { BEASTS } from '../../data/bestiary.ts';
import { TROPHIES } from '../../data/trophies.ts';
import { newState, power, rate, type State } from '../state.ts';
import { validate } from '../load.ts';
import { verify } from '../verify.ts';
import { drive } from '../hunt.ts';
import { reincarnate } from '../rebirth.ts';
import {
  barAt, barOf, canGild, canRender, effortOf, found, gild, giltCost, held, pageLevel, pageWhole,
  pagesHeld, render, trophyCeiling, trophyPower, validTrophies,
} from '../trophies.ts';
import {
  DEEP_MARKS, GILT_POWER, PAGE_POWER, TROPHY_DEEP, TROPHY_GROW, TROPHY_RENDER, TROPHY_WINDOW,
} from '../balance.ts';

const T0 = 1_700_000_000;
const COMMONS = BEASTS.filter((b) => !b.warden);
/** The fewest kills whose effort reaches `e`: the kills a bar of that length is certain by. */
const killsFor = (e: number) => { let k = 0; while (effortOf(k) < e) k += 50; while (k > 0 && effortOf(k - 1) >= e) k--; return k; };
const at = (killed: Record<string, number>, extra: Partial<State> = {}): State =>
  ({ ...newState(T0), realm: 9, layer: 8, killed, ...extra });

describe('珍 trophies, read off the kills', () => {
  it('has one trophy for every common beast, and none for a warden', () => {
    expect(TROPHIES.length).toBe(COMMONS.length);
    for (const b of COMMONS) expect(TROPHIES.some((t) => t.beast === b.key), b.key).toBe(true);
    for (const b of BEASTS.filter((x) => x.warden)) expect(TROPHIES.some((t) => t.beast === b.key)).toBe(false);
  });

  it('weighs a kill more past each deep mark', () => {
    expect(effortOf(0)).toBe(0);
    expect(effortOf(DEEP_MARKS[0])).toBe(DEEP_MARKS[0]);
    expect(effortOf(DEEP_MARKS[0] + 100)).toBeCloseTo(DEEP_MARKS[0] + 100 * (1 + TROPHY_DEEP[0]));
    expect(effortOf(DEEP_MARKS[1] + 100) - effortOf(DEEP_MARKS[1])).toBeCloseTo(100 * (1 + TROPHY_DEEP[0] + TROPHY_DEEP[1]));
  });

  it('finds every beast its first trophy by the end of its first bar, and never before a kill', () => {
    const end = killsFor(TROPHY_WINDOW);
    console.log(`\n  珍 a first bar of ${TROPHY_WINDOW} effort is certain by ${end} kills of one beast; the second bar is ${TROPHY_GROW}x as long\n`);
    for (const b of COMMONS) {
      expect(found(at({}), b.key)).toBe(0);
      expect(found(at({ [b.key]: end }), b.key), b.key).toBeGreaterThanOrEqual(1);
    }
    // And the second is certain by the end of the second bar, which is twice the first.
    const second = killsFor(barAt(1).start + barAt(1).size);
    for (const b of COMMONS) expect(found(at({ [b.key]: second }), b.key), b.key).toBeGreaterThanOrEqual(2);
  });

  it('only ever grows with the kills, and the same kills always find the same trophies', () => {
    for (const b of COMMONS.slice(0, 6)) {
      let last = 0;
      for (let k = 0; k <= 60_000; k += 997) {
        const n = found(at({ [b.key]: k }), b.key);
        expect(n).toBeGreaterThanOrEqual(last);
        expect(found(at({ [b.key]: k }), b.key)).toBe(n);
        last = n;
      }
    }
  });

  it('says the honest chance: one in what is left of the bar, rising as it fills, nothing once it has fallen', () => {
    const b = COMMONS[0];
    const fresh = barOf(at({ [b.key]: 1 }), b.key);
    expect(fresh.fallen).toBe(false);
    expect(fresh.chance).toBeCloseTo(1 / (TROPHY_WINDOW - 1), 8);
    // Walk the bar: until the trophy falls, the chance only rises.
    let prev = 0;
    for (let k = 1; k < killsFor(TROPHY_WINDOW); k += 211) {
      const bar = barOf(at({ [b.key]: k }), b.key);
      if (bar.fallen) { expect(bar.chance).toBe(0); expect(found(at({ [b.key]: k }), b.key)).toBe(1); break; }
      expect(bar.chance).toBeGreaterThanOrEqual(prev);
      prev = bar.chance;
    }
  });

  it('is found by a drive exactly as the taps would find it', () => {
    const b = COMMONS.find((x) => x.realm === 1)!;
    const s: State = { ...at({ [b.key]: 30_000 }), qi: 1e30 };
    const d = drive(s, b, 2000, 7);
    expect(d.kills).toBe(2000);
    expect(d.trophies).toBe(found(d.state, b.key) - found(s, b.key));
    expect(found(d.state, b.key)).toBe(found(at({ [b.key]: 32_000 }), b.key));
  });
});

describe('冊 the book', () => {
  const whole = (realm: number, kills = 200_000) =>
    Object.fromEntries(COMMONS.filter((b) => b.realm === realm).map((b) => [b.key, kills]));

  it('pays power for a whole page and never qi', () => {
    const s = at(whole(1));
    const bare = at(Object.fromEntries(Object.keys(whole(1)).map((k) => [k, 100])));
    expect(pageWhole(s, 1)).toBe(true);
    expect(pagesHeld(s)).toBe(1);
    expect(trophyPower(s)).toBeCloseTo(1 + PAGE_POWER);
    expect(power(s) / power(bare)).toBeGreaterThan(1 + PAGE_POWER - 1e-9);
    // 律 The economic law: the book never touches the qi rate.
    expect(rate(s)).toBe(rate(bare));
    expect(trophyCeiling()).toBeLessThan(1.7);
  });

  it('renders spares of a realm into the trophy it is missing, and nothing else', () => {
    const [x, y, z] = COMMONS.filter((b) => b.realm === 2);
    // Plenty of x and y, none of z.
    const s = at({ [x.key]: 400_000, [y.key]: 400_000 });
    expect(held(s, z.key)).toBe(0);
    expect(canRender(s, z.key)).toBe(true);
    const r = render(s, z.key);
    expect(held(r, z.key)).toBe(1);
    expect(held(r, x.key) + held(r, y.key)).toBe(held(s, x.key) + held(s, y.key) - TROPHY_RENDER);
    expect(pageWhole(r, 2)).toBe(true);
    // Nothing to render from: the same state back.
    const poor = at({ [x.key]: 1000 });
    expect(render(poor, z.key)).toBe(poor);
  });

  it('gilds a whole page with a spare of each and its material, once', () => {
    const s = { ...at(whole(3, 400_000)), materials: giltCost(3) * 2 };
    expect(canGild(s, 3)).toBe(true);
    const g = gild(s, 3);
    expect(g.materials).toBe(s.materials - giltCost(3));
    expect(pageLevel(g, 3)).toBe(2);
    expect(trophyPower(g)).toBeCloseTo(1 + PAGE_POWER + GILT_POWER);
    expect(canGild(g, 3)).toBe(false);
    expect(gild({ ...s, materials: 0 }, 3).materials).toBe(0);
  });
});

describe('守 a save is input', () => {
  it('drops what the furnace and the forge never paid for, and caps what was spent at what was found', () => {
    const [x, y, z] = COMMONS.filter((b) => b.realm === 4);
    const h = { killed: { [x.key]: 100 }, startedAt: T0, lives: [] };
    const v = validTrophies({ made: { [z.key]: 5 }, used: { [x.key]: 9 }, gilt: [4, 4, 12], kept: [2, 2, 2] }, h);
    expect(v.made[z.key]).toBeUndefined();
    expect(v.used[x.key] ?? 0).toBeLessThanOrEqual(found(h, x.key));
    expect(v.gilt).toEqual([]);
    // 承 A first life keeps nothing.
    expect(v.kept).toEqual([]);
    void y;
  });

  it('loads a save from before the book without one, and keeps an honest one', () => {
    const plain = at({ rat: 50 });
    expect(validate(plain, T0 + 10).trophy).toBeUndefined();
    const s = render({ ...at({ hound: 400_000, frog: 400_000 }), startedAt: T0 }, 'rat');
    const back = validate(JSON.parse(JSON.stringify(s)), T0 + 400 * 86_400);
    expect(held(back, 'rat')).toBe(1);
  });

  it('strikes a kept page that grew without a life ending, and passes the same pair without it', () => {
    const s = at({ rat: 10 });
    const ok = verify(s, s, 3600);
    expect(ok.why).not.toContain('codex');
    const forged = verify(s, { ...s, trophy: { used: {}, made: {}, gilt: [], kept: [2, 2, 2, 2, 2, 2, 2, 2, 2] } }, 3600);
    expect(forged.why).toContain('codex');
  });
});

describe('承 a rebirth', () => {
  it('keeps every page the life held', () => {
    const s: State = { ...at(Object.fromEntries(COMMONS.filter((b) => b.realm <= 2).map((b) => [b.key, 200_000]))), tribulation: 20 };
    const next = reincarnate(s, s.at + 60);
    // 底 The life has to have ended, or this test measured nothing.
    expect(next).not.toBe(s);
    expect(next.killed).toEqual({});
    expect(pageLevel(next, 1)).toBeGreaterThanOrEqual(1);
    expect(pageLevel(next, 2)).toBeGreaterThanOrEqual(1);
    expect(trophyPower(next)).toBeCloseTo(1 + 2 * PAGE_POWER);
  });
});
