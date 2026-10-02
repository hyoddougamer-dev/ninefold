import { describe, expect, it } from 'vitest';
import { AUTO_HABIT, HABITS, play } from '../../../tools/habits.ts';

/**
 * 自 The auto-hunt, played for a whole climb.
 *
 * rekaris, on the Discord (2026-10-02): with Auto on, kills came in hundreds a visit and
 * melting turned them into qi with no ceiling. Measured then: the ninth realm on day 12
 * for the cultivator who leaves Auto on, against day 44 for the same cultivator by hand.
 * MELT_FILL put a ceiling on melting; this holds it there. Auto may be quicker than the
 * active hand (it plays more), but never quicker than the most played hand in the game.
 */
describe('自 the auto-hunt over a whole climb', () => {
  it('never outruns the cultivator who plays every waking hour by hand', () => {
    const auto = play(AUTO_HABIT, 42);
    const hourly = play(HABITS.find((h) => h.name === 'every hour')!, 42);
    console.log(`\n  自 the ninth realm: auto three minutes a visit on day ${auto.arrival[8]?.toFixed(1)}, `
      + `every hour by hand on day ${hourly.arrival[8]?.toFixed(1)} (${auto.fights} fights against ${hourly.fights})\n`);
    expect(auto.arrival[8]).toBeGreaterThan((hourly.arrival[8] ?? 0) - 1);
  }, 180_000);
});
