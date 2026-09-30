import { describe, expect, it } from 'vitest';
import { HABITS, play } from '../../../tools/habits.ts';
import { validate } from '../state.ts';
import { levelIn, totalLevel } from '../crafts.ts';
import { SKILL_KEYS } from '../../data/crafts.ts';

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
   */
  it.each(['active', 'once a day'])('neither buys nor taxes the climb: %s, within two days of the same cultivator without it', (name) => {
    const base = HABITS.find((x) => x.name === name)!;
    const plain = play(base, 400);
    const crafted = name === h.name ? run : play({ ...base, crafts: true }, 400);
    console.log(`    ${name.padEnd(12)} plain day ${plain.days.toFixed(1)}  with the workshop day ${crafted.days.toFixed(1)}`);
    expect(crafted.done).toBe(true);
    expect(Math.abs(plain.days - crafted.days)).toBeLessThan(2);
  }, 60_000);
});
