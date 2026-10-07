import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { HABITS, play } from '../../../tools/habits.ts';
import { arrivalOf, playEndgame } from '../../../tools/endgame.ts';
import { hundredKey, type HundredRank } from '../../data/crafts.ts';
import { CODEX, CODEX_KEYS } from '../../data/hundred.ts';
import { SLOTS } from '../../data/gear.ts';
import { CODEX_CAP, LAYERS, REBIRTH_MARKS } from '../balance.ts';
import { progressOf } from '../echo.ts';
import {
  codexHeld, codexRank, codexToKeep, codexValue, keptCovers, keptRank, validKept,
} from '../hundred.ts';
import { bornFrom, reincarnate } from '../rebirth.ts';
import { gathering, layersOpened, newState, rate, validate, type State } from '../state.ts';
import { keepSpare, load, rearm, save } from '../save.ts';
import { GAME_EPOCH, firstSync, verify } from '../verify.ts';

/**
 * 承 The codex is kept through a new life. Bruno, 2026-10-07: *"o codex não deve reset,
 * seria injusto."* The promise on the page was "finish a set once and it leaves a bonus for
 * good", and a reborn life used to lose it with the workshop.
 *
 *   - reincarnate() writes the best rank every set was finished at, in any life, and nothing
 *     else does;
 *   - the codex reads the higher of that and what this life has made;
 *   - a save is input: nine ranks, none past Heaven, none for a first life;
 *   - no codex bonus passes its cap or touches the qi rate, kept or not;
 *   - an honest reborn cultivator is never struck or flagged, and a forged record is
 *     refused or bounded by the caps.
 */
const T0 = 1_700_000_000;
const DAY = 86_400;

const madeAll = (realm: number, rarity: HundredRank) =>
  Object.fromEntries(SLOTS.map((slot) => [hundredKey(realm, slot, rarity), 1]));

/** A summit cultivator by hand, `made` the Hundredfold pieces this life has forged. */
const summit = (made: Record<string, number> = {}, kept: number[] = [], lives = 0): State => {
  const s = newState(T0);
  return {
    ...s, at: T0 + 90 * DAY, realm: 9, layer: 8, tribulation: 3, qi: 1e9, self: 'woman', seen: ['whom'],
    crafts: { ...s.crafts, made },
    lives: Array.from({ length: lives }, (_, i) => ({ marks: 3, at: T0 + i })),
    codexKept: kept,
  };
};

describe('承 a new life keeps the codex', () => {
  it('writes every set at the best rank it was finished at, and the new life reads it as earned', () => {
    const old = summit({ ...madeAll(1, 'mystic'), ...madeAll(1, 'heaven'), ...madeAll(3, 'earth') });
    expect(codexRank(old.crafts.made, 1)).toBe(3);
    const s = reincarnate(old, old.at + 60);
    expect(s.realm).toBe(1);
    expect(s.crafts.made).toEqual({});
    expect(s.codexKept).toEqual([3, 0, 2, 0, 0, 0, 0, 0, 0]);
    for (const c of CODEX) expect(codexValue(s, c.key)).toBeCloseTo(codexValue({ ...old, worn: {} }, c.key), 12);
    expect(codexValue(s, 'hunt')).toBeGreaterThan(0);
    expect(codexHeld(s, 3)).toBe(2);
  });

  it('takes the best of every life, and finishing a set again only matters at a higher rank', () => {
    const second = { ...summit(madeAll(3, 'mystic'), [3, 0, 2, 0, 0, 0, 0, 0, 0], 1) };
    // This life finished Elder Bronze at Mystic, lower than the Earth a life before left.
    expect(codexHeld(second, 3)).toBe(2);
    expect(codexValue(second, 'vault')).toBeCloseTo(codexValue(summit(madeAll(3, 'earth')), 'vault'), 12);
    // And finished the second set for the first time: the third life keeps both.
    const more = { ...second, crafts: { ...second.crafts, made: { ...madeAll(3, 'mystic'), ...madeAll(2, 'earth') } } };
    expect(reincarnate(more, more.at + 60).codexKept).toEqual([3, 2, 2, 0, 0, 0, 0, 0, 0]);
    // Higher this life than kept: the higher counts, and is what the next life keeps.
    const higher = { ...second, crafts: { ...second.crafts, made: { ...madeAll(3, 'mystic'), ...madeAll(3, 'heaven') } } };
    expect(codexHeld(higher, 3)).toBe(3);
    expect(reincarnate(higher, higher.at + 60).codexKept[2]).toBe(3);
  });

  it('leaves nothing when no set was ever finished, and a first life holds none', () => {
    expect(reincarnate(summit(), T0 + 91 * DAY).codexKept).toEqual([]);
    expect(newState(T0).codexKept).toEqual([]);
    expect(codexToKeep(newState(T0))).toEqual([]);
  });

  it('keeps the steps for pieces worn per life: the whole set doubles only while it is worn now', () => {
    const s = reincarnate(summit({ ...madeAll(1, 'mystic'), ...madeAll(1, 'heaven') }), T0 + 91 * DAY);
    // Heaven kept, nothing worn: the Heaven step, not the doubled cap.
    expect(codexValue(s, 'hunt')).toBeLessThan(CODEX_CAP.hunt);
    expect(s.worn).toEqual({});
    expect(s.chest).toEqual([]);
  });

  it('never passes a cap, and never touches the qi rate', () => {
    const full = summit({}, [3, 3, 3, 3, 3, 3, 3, 3, 3], 1);
    const none = summit({}, [], 1);
    for (const k of CODEX_KEYS) expect(codexValue(full, k)).toBeLessThanOrEqual(CODEX_CAP[k] + 1e-12);
    expect(rate(full)).toBe(rate(none));
    expect(gathering(full)).toBe(gathering(none));
  });
});

describe('守 the kept codex is input', () => {
  const now = T0 + 400 * DAY;
  it('holds nine ranks between none and Heaven, and nothing for a first life', () => {
    expect(validKept([7, -2, 2.9, 'x', null, 1, 1, 1, 1, 3, 3, 3], 1)).toEqual([3, 0, 2, 0, 0, 1, 1, 1, 1]);
    expect(validKept([3, 3, 3, 3, 3, 3, 3, 3, 3], 0)).toEqual([]);
    expect(validKept([0, 0, 0], 2)).toEqual([]);
    expect(validKept('nope', 2)).toEqual([]);
    expect(validKept({ 0: 3 }, 2)).toEqual([]);
    expect(keptRank(undefined, 4)).toBe(0);
  });

  it('round-trips through validate(), and a save with no lives record reads as holding none', () => {
    const s = reincarnate(summit({ ...madeAll(2, 'earth') }), T0 + 91 * DAY);
    expect(validate(JSON.parse(JSON.stringify(s)), now).codexKept).toEqual(s.codexKept);
    const forged = { ...summit(), codexKept: [3, 3, 3, 3, 3, 3, 3, 3, 3] };
    expect(validate(JSON.parse(JSON.stringify(forged)), now).codexKept).toEqual([]);
    const { codexKept: _gone, ...old } = s;
    expect(validate(old, now).codexKept).toEqual([]);
  });

  it('a reborn save with a codex is further along than any copy of the life it left', () => {
    const old = summit({ ...madeAll(1, 'heaven'), ...madeAll(1, 'mystic') });
    const s = reincarnate(old, old.at + 60);
    expect(progressOf(s)).toBeGreaterThan(progressOf(old));
  });
});

describe('備 the spare copy never loses the codex', () => {
  beforeEach(() => {
    const map = new Map<string, string>();
    (globalThis as { localStorage?: unknown }).localStorage = {
      getItem: (k: string) => map.get(k) ?? null,
      setItem: (k: string, v: string) => { map.set(k, v); },
      removeItem: (k: string) => { map.delete(k); },
    };
    rearm();
  });
  it('loads the new life and its kept codex over a spare that is the old life', () => {
    const old = summit({ ...madeAll(1, 'heaven'), ...madeAll(1, 'mystic') });
    keepSpare(old);
    const s = reincarnate(old, old.at + 60);
    save(s);
    expect(load(s.at + 120).state.codexKept).toEqual([3, 0, 0, 0, 0, 0, 0, 0, 0]);
  });
});

/**
 * 驗 The server, against a crafter who really chased the sets for a whole climb, crossed
 * the first Dragon, was reborn and climbed again with the codex kept.
 */
describe('驗 a reborn set-chaser on the ranked server', () => {
  const base = HABITS.find((h) => h.name === 'crafts it all')!;
  const h = { ...base, name: 'sets, forge first', hundred: 'forge' as const };
  const weekly: { at: number; s: State }[] = [];
  const shots: { at: number; s: State }[] = [];
  let old: State;
  let bornAt: number;
  let reborn: State;
  /** 歇 A breath between the long walks, so the worker answers the runner between them. */
  const breathe = () => new Promise((r) => setTimeout(r, 0));
  beforeAll(async () => {
    let lastDay = -7;
    const first = play(h, 400, (day, s) => {
      if (day - lastDay < 7) return;
      lastDay = day;
      weekly.push({ at: s.at, s: structuredClone(s) });
    });
    await breathe();
    const e = playEndgame(REBIRTH_MARKS, 'pill', arrivalOf(first.state));
    const endAt = first.state.at + e.days.reduce((a, b) => a + b, 0) * DAY;
    old = validate({ ...e.end, at: endAt }, endAt);
    bornAt = old.at + 300;
    reborn = reincarnate(old, bornAt);
    await breathe();
    play(h, 30, (_d, s) => shots.push({ at: s.at, s: structuredClone(s) }), reborn);
  }, 300_000);

  it('finished sets in the life it left, and the new life holds them', () => {
    const sets = CODEX.map((c) => codexRank(old.crafts.made, c.realm));
    console.log(`    set-chaser, life 1 codex ${sets.join(' ')}; life 2 kept ${reborn.codexKept.join(' ')}`);
    expect(sets.filter((x) => x > 0).length).toBeGreaterThanOrEqual(3);
    expect(reborn.codexKept).toEqual(sets);
    expect(reborn.crafts.made).toEqual({});
    expect(shots.length).toBeGreaterThan(100);
    const last = validate(shots[shots.length - 1].s, shots[shots.length - 1].at);
    expect(last.codexKept).toEqual(sets);
    expect(layersOpened(old)).toBe(LAYERS - 1);
  });

  it('is never struck and never flagged, from the life it left through every visit of the new one', () => {
    let at = old.at;
    let prev = old;
    const held: string[] = [];
    let accepted = 0;
    for (const shot of shots) {
      const s = validate(shot.s, shot.at);
      const v = verify(prev, s, shot.at - at);
      if (v.strike || v.suspect || v.why.includes('codex') || v.why.includes('went-down')) {
        held.push(`${((shot.at - bornAt) / DAY).toFixed(2)}: ${v.why.join(',')}`);
      }
      if (v.ok) { prev = s; at = shot.at; accepted++; }
    }
    expect(held.slice(0, 5)).toEqual([]);
    expect(accepted).toBeGreaterThan(shots.length / 2);
  });

  it('is accepted when the server last saw the old life before its last set was finished', () => {
    // The last weekly save of the climb that holds fewer sets than the life ended with.
    const fewer = [...weekly].reverse().find((w) => {
      const v = validate(w.s, w.at);
      return codexToKeep(v).filter((r) => r > 0).length < reborn.codexKept.filter((r) => r > 0).length;
    })!;
    expect(fewer).toBeDefined();
    const before = validate(fewer.s, fewer.at);
    expect(keptCovers(reborn.codexKept, codexToKeep(before))).toBe(true);
    const later = shots[Math.floor(shots.length / 3)];
    const v = verify(before, validate(later.s, later.at), later.at - fewer.at);
    expect(v.why.filter((w) => w === 'codex' || w === 'went-down')).toEqual([]);
    expect(v.strike).toBe(false);
  });

  it('a first sync of the new life is measured from a fresh start and never struck', () => {
    // Moved so the run begins just after the game's epoch, as the server's own test does.
    const last = shots[shots.length - 1];
    const shift = GAME_EPOCH + 3600 - old.startedAt;
    const later = validate({ ...last.s, startedAt: last.s.startedAt + shift, at: last.at + shift,
      lives: last.s.lives.map((l) => ({ ...l, at: l.at + shift })) }, last.at + shift);
    expect(later.codexKept).toEqual(reborn.codexKept);
    const f = firstSync(later, later.at, later.startedAt);
    const v = verify(f.before, later, f.seconds, true);
    expect(v.why).not.toContain('codex');
    expect(v.strike).toBe(false);
  });

  it('a kept codex in a first life is struck', () => {
    const early = validate(weekly[2].s, weekly[2].at);
    const forged = { ...early, at: early.at + 3600, codexKept: [3, 3, 3, 3, 3, 3, 3, 3, 3] };
    const v = verify(early, forged, 3600);
    expect(v.why).toContain('codex');
    expect(v.strike).toBe(true);
    // And validate(), which the server reads every save through first, drops it.
    expect(validate(forged, forged.at).codexKept).toEqual([]);
  });

  it('a kept codex that grows without a new life is struck', () => {
    const a = validate(shots[10].s, shots[10].at);
    const b = validate(shots[20].s, shots[20].at);
    const grown = { ...b, codexKept: a.codexKept.map(() => 3) };
    const v = verify(a, grown, shots[20].at - shots[10].at);
    expect(v.why).toContain('codex');
    expect(v.strike).toBe(true);
  });

  it('a kept codex that shrank is another copy, never a strike', () => {
    const a = validate(shots[10].s, shots[10].at);
    const b = validate(shots[20].s, shots[20].at);
    const v = verify(a, { ...b, codexKept: [] }, shots[20].at - shots[10].at);
    expect(v.why).toContain('went-down');
    expect(v.why).not.toContain('codex');
    expect(v.strike).toBe(false);
  });

  it('a rebirth that keeps less than the old life finished is another copy, never a strike', () => {
    const later = validate(shots[20].s, shots[20].at);
    const v = verify(old, { ...later, codexKept: [] }, later.at - old.at);
    expect(v.why).toContain('went-down');
    expect(v.strike).toBe(false);
  });

  it('a rebirth that claims every set at Heaven is bounded by the caps, and buys no qi', () => {
    const later = validate(shots[20].s, shots[20].at);
    const forged = validate({ ...later, codexKept: [9, 9, 9, 9, 9, 9, 9, 9, 9, 9] }, later.at);
    expect(forged.codexKept).toEqual([3, 3, 3, 3, 3, 3, 3, 3, 3]);
    for (const k of CODEX_KEYS) expect(codexValue(forged, k)).toBeLessThanOrEqual(CODEX_CAP[k] + 1e-12);
    expect(gathering(forged)).toBe(gathering(later));
    // The server reads it as the life it says it is: bornFrom with that record.
    expect(bornFrom(old, forged.lives, bornAt, forged.codexKept).codexKept).toEqual(forged.codexKept);
    const v = verify(old, forged, forged.at - old.at);
    expect(v.why).not.toContain('codex');
  });
});
