import { describe, expect, it } from 'vitest';
import { HABITS, play } from '../../../tools/habits.ts';
import { towerQi, verify, wearsMaster } from '../verify.ts';
import { saveSet } from '../sets.ts';
import { PAIR_TOWER_QI } from '../balance.ts';
import { advance } from '../time.ts';
import { beatable } from '../combat.ts';
import { floorBeast, floorPower, floorQiPay } from '../tower.ts';
import { clearFloor, standingFloor, towerOpen } from '../trials.ts';
import type { State } from '../state.ts';
import { num } from '../format.ts';
import { SLOTS, TEMPLATE_BY_KEY, shapesOf, type Item, type Slot } from '../../data/gear.ts';
import type { School } from '../../data/schools.ts';

/**
 * 塔 A climb that pays a day of qi in five minutes.
 *
 * A tester found it (2026-10-04): the tower opens at the fifth realm, every floor below
 * the cultivator's strength falls at once, and each pays a lump of qi. The game
 * syncs every five minutes, so the server saw a day's qi arrive in five, and flagged the
 * climb as faster than anybody honest. It was the game's own payment, so it is counted as
 * itself now, the way the week's quarry is.
 */

const SYNC = 300;

interface Shot { day: number; s: State }
const shots: Shot[] = [];
play(HABITS.find((h) => h.name === 'casual')!, 60, (day, s) => shots.push({ day, s: structuredClone(s) }));

/** Every floor this body can win, one after the other, the way a player taps through them. */
function climbAll(s: State): State {
  let t = s;
  for (let f = standingFloor(t); f < 2000 && beatable(t, floorBeast(f), floorPower(f)); f = standingFloor(t)) t = clearFloor(t, f);
  return t;
}

const open = shots.filter((x) => towerOpen(x.s));
const cases = open.filter((_, i) => i % 6 === 0).map((shot) => {
  const after = climbAll(advance(shot.s, shot.s.at + SYNC));
  const dayAgo = [...shots].reverse().find((x) => x.day <= shot.day - 1) ?? shots[0];
  return { shot, after, dayAgo };
});

describe('塔 a whole tower climbed at once is honest', () => {
  it('finds climbs that pay more than a day of qi, so it measures something', () => {
    const big = cases.filter(({ shot, after }) => after.tower - shot.s.tower >= 20);
    console.log(`    ${cases.length} climbs, ${big.length} of twenty floors or more, the first from floor ${cases[0]?.shot.s.tower} to ${cases[0]?.after.tower}`);
    expect(big.length).toBeGreaterThanOrEqual(3);
  });

  it('is ranked five minutes later, and never flagged', () => {
    for (const { shot, after } of cases) {
      const v = verify(shot.s, after, SYNC);
      expect(v.why, `day ${shot.day.toFixed(1)}, floors ${shot.s.tower}→${after.tower}`).toEqual([]);
      expect(v.suspect).toBe(false);
    }
  });

  it('and the day behind it reads it as honest too', () => {
    for (const { shot, after, dayAgo } of cases) {
      const v = verify(dayAgo.s, after, after.at - dayAgo.s.at);
      expect(v.suspect, `day ${shot.day.toFixed(1)} at pace ${v.pace.toFixed(2)}`).toBe(false);
      expect(v.ok, `day ${shot.day.toFixed(1)}: ${v.why.join(',')}`).toBe(true);
    }
  });

  it('but qi beyond what the floors paid still waits', () => {
    for (const { shot, after } of cases.slice(0, 3)) {
      const v = verify(shot.s, { ...after, qi: after.qi + (after.qi - shot.s.qi) * 3 + 1e12 }, SYNC);
      expect(v.why).toContain('too-fast');
    }
  });

  it('allows the floors exactly the sum they can pay, and the Celestial Master\'s at most', () => {
    for (const { shot, after } of cases) {
      const paid = after.qi - advance(shot.s, shot.s.at + SYNC).qi;
      const allowed = towerQi(shot.s, after, false);
      let sum = 0;
      for (let f = shot.s.tower + 1; f <= after.tower; f++) sum += floorQiPay(f);
      const master = wearsMaster(shot.s) || wearsMaster(after) ? PAIR_TOWER_QI : 1;
      expect(allowed).toBeGreaterThanOrEqual(paid * 0.999);
      expect(allowed).toBeCloseTo(sum * master, -3);
    }
    const { shot, after } = cases[0];
    console.log(`    floors ${shot.s.tower}→${after.tower} at realm ${shot.s.realm}: ${num(towerQi(shot.s, after, false))} qi allowed`);
    // Floors above the summit pay what the summit floor does, and are counted at once.
    const far = { ...after, tower: 1e9 };
    const master = wearsMaster(after) ? PAIR_TOWER_QI : 1;
    expect(towerQi({ ...after, tower: 200 }, far, false)).toBeCloseTo((1e9 - 200) * floorQiPay(200) * master, -6);
    // And a first sync brings none: it has its own allowance.
    expect(towerQi(shot.s, after, true)).toBe(0);
  });
});

/**
 * 天師 The Master's pay is two and a half times a floor's (2026-10-05), so the server credits
 * it only to a save that wears the Master or keeps him as a loadout.
 */
describe('天師 the Master\'s pay is credited to the Master', () => {
  const piece = (school: School, slot: Slot, i: number): Item => {
    const shape = shapesOf(school).find((a) => a.slot === slot)!;
    const template = Object.keys(TEMPLATE_BY_KEY).find((k) => TEMPLATE_BY_KEY[k].archetype === shape.key)!;
    return { id: `${school}-${slot}-${i}`, template, rarity: 'earth', rolls: [] };
  };
  const base = cases[0].shot.s;
  const qiArts = (slots: readonly Slot[]) => Object.fromEntries(slots.map((slot, i) => [slot, piece(i < 3 ? 'qi' : 'arts', slot, i)]));

  it('knows a body that wears the Master or keeps him as a loadout, and never loose pieces', () => {
    const worn = { ...base, worn: qiArts(SLOTS), chest: [], sets: [] } as State;
    expect(wearsMaster(worn)).toBe(true);
    // Six loose pieces in the chest are not the Master (the audit of 2026-10-05).
    const loose = { ...base, worn: {}, chest: SLOTS.map((slot, i) => piece(i < 3 ? 'qi' : 'arts', slot, i)), sets: [] } as State;
    expect(wearsMaster(loose)).toBe(false);
    // But kept as a loadout and taken off, he is.
    const kept = saveSet(worn, 0, 'Master');
    const off = { ...kept, worn: {}, chest: [...kept.chest, ...Object.values(kept.worn)] } as State;
    expect(wearsMaster(off)).toBe(true);
    // Five Qi places and one Arts place make no Master.
    const five = { ...base, worn: Object.fromEntries(SLOTS.map((slot, i) => [slot, piece(i < 5 ? 'qi' : 'arts', slot, i)])), chest: [], sets: [] } as State;
    expect(wearsMaster(five)).toBe(false);
  });

  it('credits the Master his pay, and anybody else a floor\'s own', () => {
    const lo = { ...base, tower: 40 };
    let sum = 0;
    for (let f = 41; f <= 80; f++) sum += floorQiPay(f);
    const master = { ...lo, worn: qiArts(SLOTS), chest: [], sets: [] } as State;
    expect(towerQi(master, { ...master, tower: 80 }, false)).toBeCloseTo(sum * PAIR_TOWER_QI, -3);
    const plain = { ...lo, worn: {}, chest: [], sets: [] } as State;
    expect(towerQi(plain, { ...plain, tower: 80 }, false)).toBeCloseTo(sum, -3);
  });
});
