import { describe, expect, it } from 'vitest';
import { HABITS, play } from '../../../tools/habits.ts';
import { verify } from '../verify.ts';
import type { State } from '../state.ts';

/**
 * 二機 One run played on two devices is never struck (the audit of 2026-10-05).
 *
 * An APK and a browser, or a phone and a tablet, on one account carry one run (the same
 * startedAt) and each lives on: each meets its own road and answers it. The server sees
 * them in turn. Each is behind the other somewhere, so it is 'went-down', never a strike;
 * but an answer that differed was read as 'road', a strike, and the account was banned on
 * game day 33. Two seeds of one habit stand for the two devices' diverging dice.
 *
 * Whether two seeds ever answer a meeting differently is chaos: the Platform's fixed pay
 * (2026-10-05) moved a few kills and seed 17 came to answer every meeting as 991 did, so
 * the test reached nothing. The second device is played on three seeds now, and the floor
 * below says at least one of them has to meet the case.
 */
describe('二機 two devices on one run', () => {
  const h = HABITS.find((x) => x.name === 'active')!;
  const run = (seed: number) => {
    const out: State[] = [];
    play({ ...h, seed }, 40, (_d, s) => out.push(structuredClone(s)));
    return out;
  };
  const a = run(991);
  const others = [17, 7, 29].map(run);

  it('are refused in turn as not progress, and never struck', () => {
    let road = 0;
    for (const b of others) {
      const n = Math.min(a.length, b.length) - 1;
      for (let i = 0; i < n; i++) {
        // Device two syncs after device one, then device one again: each over the other.
        for (const [prev, next] of [[a[i], { ...b[i], at: a[i].at + 40 }], [{ ...b[i], at: a[i].at + 40 }, { ...a[i + 1] }]] as const) {
          if (next.at <= prev.at) continue;
          const v = verify(prev, next, next.at - prev.at);
          if (v.why.includes('road')) road++;
          expect(v.strike, `day ${(i / (a.length / 40)).toFixed(1)}: ${v.why.join(',')}`).toBe(false);
        }
      }
    }
    // It has to have met the case, or it measured nothing.
    expect(road).toBeGreaterThan(0);
  }, 120_000);

  it('but a straight successor that rewrites an answer is still struck', () => {
    const s = a.find((x) => Object.keys(x.chose).length > 0)!;
    const k = Object.keys(s.chose)[0];
    const next = { ...s, at: s.at + 600, chose: { ...s.chose, [k]: (s.chose[k] === 0 ? 1 : 0) as 0 | 1 } };
    const v = verify(s, next, 600);
    expect(v.why).toContain('road');
    expect(v.strike).toBe(true);
  });
});
