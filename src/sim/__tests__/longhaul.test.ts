import { describe, expect, it } from 'vitest';
import { MAX_MARK_DAYS } from '../balance.ts';
import { SLOTS } from '../../data/gear.ts';
import { playEndgame } from '../../../tools/endgame.ts';

/**
 * 久 The endgame past the forty crossings every other test stops at.
 *
 * It exists because forty was hiding a wall. With 煉器 refining in the endgame loop and
 * the Dragon footed on a cultivator who refines, every slot reached the old limit of 99
 * around the forty-eighth crossing, the material stopped having anywhere to go, and the
 * crossings walked off a cliff: 16 days at the fifty-fifth, 54 at the sixty-second, and
 * none at all from the seventy-fourth. tribulation.test.ts played forty and passed.
 *
 * 界 What it holds, and what it does not, written down so neither is a surprise. The
 * rule is held for eighty crossings, which is a little over a year of play. Measured
 * past that, a crossing passes a fortnight from about the hundredth, around a year and
 * three quarters in, and reads 32 days at the hundred and twentieth. That horizon is
 * the next thing to look at, and it is a slope rather than the cliff this replaced.
 *
 * It lives in its own file because eighty crossings are the slowest single thing the
 * suite plays, and a file is what vitest runs beside the others.
 */
describe('久 the long haul', () => {
  it('keeps every crossing under a fortnight for eighty of them', () => {
    const g = playEndgame(80);
    let total = 0;
    const rows: string[] = [];
    g.days.forEach((d, i) => {
      total += d;
      if ((i + 1) % 10 === 0) {
        const levels = i + 1 === 80 ? `   refine ${SLOTS.map((x) => g.end.worn[x]?.refine ?? 0).join(' ')}` : '';
        rows.push(`    劫 ${String(i + 1).padStart(3)}  ${String(total).padStart(4)} days in all` +
          `   longest so far ${Math.max(...g.days.slice(0, i + 1))}   tower ${g.floors[i]}${levels}`);
      }
    });
    console.log(`\n  久 eighty crossings, played out:\n${rows.join('\n')}\n`);

    for (const d of g.days) expect(d).toBeLessThanOrEqual(MAX_MARK_DAYS);
    // 煉 And the refining really did go past the old limit, or this measures nothing.
    expect(Math.max(...SLOTS.map((x) => g.end.worn[x]?.refine ?? 0))).toBeGreaterThan(99);
  }, 300_000);
});
