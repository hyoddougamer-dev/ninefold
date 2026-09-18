import { BANDS, type Band, type Stat } from '../data/mountain.ts';

/**
 * 營 Camping. The one decision a session is made of.
 *
 * Yield and pressure both climb with altitude, and pressure is checked against the one
 * stat that altitude demands. So the question is never "can I reach this band" — it is
 * "will I still be standing here when I open the app again", which is a bet the player
 * places knowingly rather than a gate the game closes in their face.
 */

export type Stats = Record<Stat, number>;

/** Hours of grace one point of the demanded stat buys against one point of pressure. */
export const FOOTING = 40;

/** Base qi per hour at the foot of the mountain, before any band multiplier. */
export const BASE_RATE = 60;

export interface Footing {
  readonly band: Band;
  /** Hours the cultivator can hold this altitude. Infinity where nothing is demanded. */
  readonly hours: number;
  /** Qi per hour while camped here. */
  readonly rate: number;
  readonly demanded: Stat | null;
  readonly have: number;
}

export function footing(bandN: number, stats: Stats): Footing {
  const band = BANDS[Math.max(0, Math.min(BANDS.length - 1, bandN - 1))];
  const demanded = band.demands;
  const have = demanded ? stats[demanded] : 0;
  const hours = !demanded || band.pressure === 0
    ? Infinity
    : (have * FOOTING) / band.pressure;
  return { band, hours, rate: BASE_RATE * band.yield * (1 + stats.qi / 100), demanded, have };
}

/** The highest band this build can hold for at least `hours`. Not a gate — a limit. */
export function reachable(stats: Stats, hours: number, frontier: number): number {
  let best = 1;
  for (let n = 1; n <= Math.min(frontier, BANDS.length); n++) {
    if (footing(n, stats).hours >= hours) best = n;
  }
  return best;
}

export function fmt(n: number): string {
  if (!Number.isFinite(n)) return '∞';
  // One decimal only while it still says something: 1.4M is informative, 940.0k is noise.
  const scaled = (v: number, suffix: string) =>
    `${v >= 100 ? Math.round(v) : Number(v.toFixed(1))}${suffix}`;
  if (n >= 1e9) return scaled(n / 1e9, 'B');
  if (n >= 1e6) return scaled(n / 1e6, 'M');
  if (n >= 1e4) return scaled(n / 1e3, 'k');
  return Math.round(n).toLocaleString('en-US');
}

export function fmtHours(h: number): string {
  if (!Number.isFinite(h)) return 'indefinitely';
  if (h < 1) return `${Math.round(h * 60)} min`;
  if (h < 48) return `${h.toFixed(1)} h`;
  return `${(h / 24).toFixed(1)} days`;
}
