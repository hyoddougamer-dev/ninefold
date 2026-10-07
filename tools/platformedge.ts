/**
 * 擂 How often each Platform challenger falls, and what the realm's edge costs the climb.
 *
 * The challengers stand at PLATFORM_EDGE of the cultivator's own power, so a cheaper body
 * shrinks the challenger with it, and for a long time the third one fell 0 to 5% of the
 * weeks a cultivator stood early in a realm and about 90% late in the climb: the same
 * fight got easier the higher the climb went. Since 2026-10-07 the edge grows with the
 * realm (platformEdge, PLATFORM_EDGE_GROWTH). This prints, per habit, the share of
 * Platform periods in which each challenger fell, and the day the ninth realm opened.
 *
 *     npx tsx tools/platformedge.ts
 */
import { HABITS, play, type Habit } from './habits.ts';
import { periodNow, standingTier } from '../src/sim/platform.ts';

export interface EdgeRow {
  readonly name: string;
  readonly realm9: number | undefined;
  readonly periods: number;
  /** Share of periods each challenger fell, first to third. */
  readonly fell: readonly number[];
  /** The third challenger's share early (realms 4 to 6) and late (7 to 9) in the climb. */
  readonly early: number;
  readonly late: number;
}

export function edgeRow(h: Habit): EdgeRow {
  const seen = new Map<number, number>();
  let last = -1;
  const r = play(h, 400, (_d, s) => {
    if (standingTier(s) === null && last === -1) return;
    const p = periodNow(s);
    if (p !== last) { last = p; seen.set(s.realm, (seen.get(s.realm) ?? 0) + 1); }
  });
  const third = (lo: number, hi: number) => {
    const won = r.beats.filter((b) => b.tier === 2 && b.realm >= lo && b.realm <= hi).length;
    let n = 0;
    for (const [realm, k] of seen) if (realm >= lo && realm <= hi) n += k;
    return n ? won / n : 0;
  };
  return {
    name: h.name, realm9: r.arrival[8], periods: r.periods,
    fell: r.bouts.map((n) => (r.periods ? n / r.periods : 0)),
    early: third(4, 6), late: third(7, 9),
  };
}

/** The fighters who stand on the Platform, and the Vajra, whose class is the Platform's. */
export const EDGE_HABITS: readonly Habit[] = [
  ...['once a day', 'casual', 'active', 'every hour', 'crafts it all'].map((n) => HABITS.find((h) => h.name === n)!),
  { ...HABITS.find((h) => h.name === 'active')!, name: 'active vajra', calling: 'vajra' },
];

if (import.meta.url === `file://${process.argv[1]}`) {
  let periods = 0;
  console.log('habit            realm 9   periods   1st    2nd    3rd   3rd in realms 4-6 / 7-9');
  for (const h of EDGE_HABITS) {
    const row = edgeRow(h);
    periods += row.periods;
    console.log(`${row.name.padEnd(16)} ${row.realm9 !== undefined ? row.realm9.toFixed(1).padStart(6) : '     -'}   ${String(row.periods).padStart(5)}   `
      + row.fell.map((x) => `${Math.round(x * 100)}%`.padStart(5)).join('  ')
      + `   ${`${Math.round(row.early * 100)}%`.padStart(5)} / ${Math.round(row.late * 100)}%`);
  }
  // 底 A harness that reached nothing passes, so it counts the periods it read.
  console.log(`\n${periods} Platform periods read`);
  if (periods < EDGE_HABITS.length * 4) throw new Error(`擂 only ${periods} periods read`);
}
