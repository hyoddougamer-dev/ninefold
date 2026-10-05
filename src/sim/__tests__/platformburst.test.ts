import { describe, expect, it } from 'vitest';
import { newState, type State } from '../state.ts';
import { beatChallenger, challengerPays, challengerQi } from '../platform.ts';
import { verify } from '../verify.ts';
import { LEVELS_PER_REALM, PAIR_BOUNTY, PLATFORM_HOURS, midRate } from '../balance.ts';

/**
 * 擂 A whole week of the Platform taken in one sync.
 *
 * A challenger pays a fixed sum read off the realm since 2026-10-05 (challengerQi), no longer
 * hours of the cultivator's own rate. To a body that bought no rate yet, the third alone is
 * days of its own gathering, and the phone syncs every five minutes, so the server sees the
 * three arrive at once. It credits each bout as the third's sum, 金剛 the Vajra's half again,
 * in seconds at the fastest rate there was (the tower's way): the slower the body, the more
 * time it is credited for the same fight, so nobody honest waits for it.
 */

const DAY = 86_400;
const T0 = 1_700_000_000;
const SYNC = 300;

/** A body standing on the first rung of a realm with both qi upgrades at `lv`. */
const body = (realm: number, lv: number): State => ({
  ...newState(T0), realm, layer: 0, qi: 0, materials: 0, wardenFell: false, stance: 'endure',
  levels: { technique: realm * 6, method: lv, pills: lv, cores: realm * 6 + 18 },
  at: T0 + 30 * DAY, startedAt: T0, runAt: T0, springAt: T0, spring: 0, tower: 0,
} as State);

const allThree = (s: State): State => ({ ...beatChallenger(beatChallenger(beatChallenger(s, 0), 1), 2), at: s.at + SYNC });

// None bought, the last realm's caps, three under this realm's caps, and the caps.
const LEVELS = (r: number) => ({
  none: 0, entry: (r - 1) * LEVELS_PER_REALM, mid: r * LEVELS_PER_REALM - 3, cap: r * LEVELS_PER_REALM,
});

describe('擂 three challengers in one sync are honest', () => {
  it('pays each the realm\'s fixed sum, the same to every body in the realm', () => {
    for (const r of [6, 7, 8, 9]) {
      const sums = Object.values(LEVELS(r)).map((lv) => allThree(body(r, lv)).qi);
      const sum = PLATFORM_HOURS.reduce((n, h) => n + h, 0) * 3600 * midRate(r);
      for (const paid of sums) expect(paid).toBeCloseTo(sum, -2);
    }
  });

  it('is ranked five minutes later, whatever the body bought, and never flagged', () => {
    let count = 0;
    for (const r of [6, 7, 8, 9]) {
      for (const [label, lv] of Object.entries(LEVELS(r))) {
        const before = body(r, lv);
        const after = allThree(before);
        expect(after.bouts, `realm ${r} ${label}`).toBe(3);
        const v = verify(before, after, SYNC);
        expect(v.why, `realm ${r} ${label}`).toEqual([]);
        expect(v.suspect).toBe(false);
        count++;
      }
    }
    // A harness that reached nothing passes: sixteen bodies, each with its three bouts.
    expect(count).toBe(16);
  });

  it('but qi beyond what the bouts paid still waits', () => {
    for (const r of [6, 7, 8, 9]) {
      const before = body(r, 0);
      const after = allThree(before);
      // Twice the third's Vajra pay again for each bout, over the most the server credits.
      const extra = 3 * challengerQi(r, 2) * PAIR_BOUNTY * 2;
      expect(verify(before, { ...after, qi: after.qi + extra }, SYNC).why, `realm ${r}`).toContain('too-fast');
    }
  });

  it('credits a bout no more than the third\'s Vajra pay', () => {
    const s = body(7, 0);
    for (const tier of [0, 1, 2] as const) expect(challengerPays(s, tier)).toBeLessThanOrEqual(challengerQi(7, 2) * PAIR_BOUNTY);
  });
});
