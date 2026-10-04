import { describe, expect, it } from 'vitest';
import { HABITS, play } from '../../../tools/habits.ts';
import { towerQi, verify } from '../verify.ts';
import { PAIR_TOWER_QI, TOWER_QI_HOURS } from '../balance.ts';
import { towerRate } from '../trials.ts';
import { advance } from '../time.ts';
import { beatable } from '../combat.ts';
import { floorBeast, floorPower } from '../tower.ts';
import { clearFloor, standingFloor, towerOpen } from '../trials.ts';
import type { State } from '../state.ts';

/**
 * 塔 A climb that pays a day of qi in five minutes.
 *
 * A tester found it (2026-10-04): the tower opens at the fifth realm, every floor below
 * the cultivator's strength falls at once, and each pays hours of gathering. The game
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

  it('allows the floors what they paid, and no more than six hours each', () => {
    for (const { shot, after } of cases) {
      const paid = after.qi - advance(shot.s, shot.s.at + SYNC).qi;
      const allowed = towerQi(shot.s, after, false);
      expect(allowed).toBeGreaterThanOrEqual(paid * 0.999);
      expect(allowed).toBeLessThanOrEqual((after.tower - shot.s.tower) * TOWER_QI_HOURS * 3600 * PAIR_TOWER_QI * towerRate(after) * 1.001);
    }
    const { shot, after } = cases[0];
    console.log(`    floors ${shot.s.tower}→${after.tower} at realm ${shot.s.realm}: ${(towerQi(shot.s, after, false) / towerRate(after) / 3600).toFixed(1)} h allowed`);
    // And a first sync brings none: it has its own allowance.
    expect(towerQi(shot.s, after, true)).toBe(0);
  });
});
