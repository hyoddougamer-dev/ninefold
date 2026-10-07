import { describe, expect, it } from 'vitest';
import { HABITS, play } from '../../../tools/habits.ts';
import { validate } from '../state.ts';
import { levelIn, totalLevel } from '../crafts.ts';
import { SKILL_KEYS } from '../../data/crafts.ts';
import { SEAL_DAYS } from '../balance.ts';

/**
 * 業 The crafter, played for a whole climb and read back as a save at every week.
 *
 * validate() caps the workshop against the clock, the kills and the levels. A cap that
 * clips an honest player takes something away from somebody who did nothing wrong, which
 * is the one thing this game promises never to do. So the strongest crafter the harness
 * can play is written out and read back every seven days, and must come back unchanged.
 */
describe('業 a crafter played for a whole climb', () => {
  const h = HABITS.find((x) => x.name === 'crafts it all')!;
  const clipped: string[] = [];
  let weeks = 0;
  let last = -7;
  const run = play(h, 400, (day, s) => {
    if (day - last < 7) return;
    last = day;
    weeks++;
    const back = validate(JSON.parse(JSON.stringify(s)), s.at);
    if (JSON.stringify(back.crafts) !== JSON.stringify(s.crafts)) clipped.push(`day ${day.toFixed(1)}`);
  });

  it('is never clipped by validate(), on any week of the climb', () => {
    expect(weeks).toBeGreaterThanOrEqual(7);
    expect(clipped).toEqual([]);
  });

  it('works every craft it can reach, and levels them the way the curve says', () => {
    const s = run.state;
    console.log(`    crafts it all  day ${run.days.toFixed(1)}  total ${totalLevel(s)}/693  `
      + SKILL_KEYS.map((k) => `${k} ${levelIn(s, k)}`).join(' · '));
    for (const k of SKILL_KEYS) expect(levelIn(s, k), k).toBeGreaterThan(20);
    // 1550 hours to 99 per craft: a two-month climb must not come near it.
    for (const k of SKILL_KEYS) expect(levelIn(s, k), k).toBeLessThan(92);
  });

  /**
   * 路 The workshop is a second road beside the climb, not a shortcut up it, and not a tax
   * on it either: the kit is carried only into a warden, a demon or a vault gate, and the
   * ladder is paid for in qi. Measured with the same cultivator with and without it, at
   * two paces of play, the whole ladder lands within two days either way.
   *
   * 量 Once a day is counted in whole visits, so its difference is a whole number of days.
   * It has read anywhere from two days ahead to two days behind as numbers elsewhere
   * moved (81 against 83 on 2026-09-30, while the first realm was being shortened). When
   * it is behind, the days are the crafter's own errand: one hunt a visit spent learning
   * a beast for Rendering, which is a quarter of a once-a-day player's hunting, and with
   * that errand switched off the two landed on the same day. So the bound is the one the
   * dev log states, two days, inclusive.
   *
   * 精 When the elites came to pay triple (2026-10-06) the errand, which took the first of
   * a visit's four hunts, cost five days, and none of them at a gate. The harness now does
   * the learning kill on the way, as the game does: 84 against 85.
   *
   * 封 Since the seal (2026-10-07) the workshop is meant to buy something: the gates of
   * realms 5 to 8 stay shut for SEAL_DAYS after the warden comes out, and a Breakthrough
   * Pill opens them at once. So it is still never a tax (never two days behind the same
   * cultivator without it), and what it buys is the seal's own days and no more: once a
   * day reads 77 against 72, active 49.3 against 45.5 (tools/seal.ts).
   */
  it.each(['active', 'once a day'])('never taxes the climb and buys no more than the seal: %s, against the same cultivator without it', (name) => {
    const base = HABITS.find((x) => x.name === name)!;
    const plain = play(base, 400);
    const crafted = name === h.name ? run : play({ ...base, crafts: true }, 400);
    console.log(`    ${name.padEnd(12)} plain day ${plain.days.toFixed(1)}  with the workshop day ${crafted.days.toFixed(1)}`);
    expect(crafted.done).toBe(true);
    expect(crafted.days - plain.days).toBeLessThanOrEqual(2);
    const seal = SEAL_DAYS.reduce((a, b) => a + b, 0);
    expect(plain.days - crafted.days).toBeLessThanOrEqual(seal + 2);
  }, 60_000);
});
