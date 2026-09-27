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
 * 界 It used to hold eighty crossings and then slope: past a fortnight from about the
 * hundredth, 32 days at the hundred and twentieth. 穩 PILL_AHEAD took the slope away.
 * Measured on the active cultivator, the marks settle at seven or eight days and are
 * still seven or eight at the hundred and sixtieth.
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

  /**
   * 穩 The knife edge, gone. The old endgame balanced on a point: a Dragon 2% heavier
   * than the harness walled the fiftieth crossing and 10% walled the tenth, so any
   * player whose economy was a little short of the harness's hit a wall the harness never
   * saw. Every Dragon here stands a tenth heavier, for eighty crossings, and the marks
   * are slower and still never a fortnight.
   */
  it('slows under a heavier Dragon and never walls', () => {
    const g = playEndgame(80, 'pill', undefined, 1.1);
    const plain = playEndgame(80);
    const total = (d: readonly number[]) => d.reduce((a, b) => a + b, 0);
    console.log(`\n  穩 eighty crossings with every Dragon a tenth heavier: ${total(g.days)} days` +
      ` (plain ${total(plain.days)}), longest ${Math.max(...g.days)}` +
      `, the last ten ${g.days.slice(-10).join(' ')}\n`);
    for (const d of g.days) expect(d).toBeLessThanOrEqual(MAX_MARK_DAYS);
    expect(total(g.days)).toBeGreaterThan(total(plain.days));
    // Flat, not climbing: the last ten crossings take no longer than the ten before them.
    const last = total(g.days.slice(-10)), before = total(g.days.slice(-20, -10));
    expect(last).toBeLessThanOrEqual(before * 1.15);
  }, 300_000);
});
