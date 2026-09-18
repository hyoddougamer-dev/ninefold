import { TRAIL_PERIOD_SECONDS } from './balance';
import { GROUNDS, type Beast, type Ground } from '../data/world';
import { PATH_TUNING } from './balance';
import type { State } from './types';

/** FNV-1a. Stable across devices and runs; GDD §11 rule 1 allows no other randomness. */
function hash(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

/** Which six-hour window the clock is in. Two devices in the same second agree. */
export function trailWindow(now: number): number {
  return Math.floor(now / TRAIL_PERIOD_SECONDS);
}

export function secondsUntilNextTrail(now: number): number {
  return (trailWindow(now) + 1) * TRAIL_PERIOD_SECONDS - now;
}

export interface TrailEntry {
  readonly ground: Ground;
  readonly beast: Beast;
  /** 0.8 .. 1.3 — what attention buys. Quality, never quantity. */
  readonly quality: number;
  readonly open: boolean;
}

/** What stands on a ground in this window. Deterministic; no server, no dice. */
export function trailFor(ground: Ground, now: number, s: State): TrailEntry {
  const w = trailWindow(now);
  const pick = hash(`${ground.key}:${w}`) % ground.beasts.length;
  const q = hash(`${ground.key}:${w}:q`) % 1000;
  return {
    ground,
    beast: ground.beasts[pick],
    quality: 0.8 + (q / 1000) * 0.5,
    open: groundOpen(ground, s),
  };
}

/** 弓 the bow reaches one realm early, which is the whole of its identity. */
export function groundOpen(ground: Ground, s: State): boolean {
  return s.realm >= ground.opensAt - PATH_TUNING[s.path].reach;
}

export function trail(now: number, s: State): readonly TrailEntry[] {
  return GROUNDS.map((g) => trailFor(g, now, s));
}
