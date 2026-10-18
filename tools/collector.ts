/**
 * 珍 The collector: how a cultivator who wants the trophy book spends qi on it.
 *
 * Read by tools/habits.ts (a habit with `collects`, past the summit) and tools/trophies.ts
 * (a share of each day's gathering in the endgame). It does what the screens let a player
 * do and nothing else: tap an old beast to 熟 Known so it can be driven, drive it with the
 * qi given, render spares at the furnace and gild a page when the material is there.
 *
 * Which beast: the one whose next trophy is worth most to the book. A beast with none held
 * on a page nearest whole first (fewest missing, then the cheaper old price), then a beast
 * whose page is whole and wants a spare for the gilding. Between equals, the one whose bar
 * has least left, because that is the trophy nearest.
 */
import { BEASTS, type Beast } from '../src/data/bestiary.ts';
import { canDrive, drive, driveCost, driveMax } from '../src/sim/hunt.ts';
import { takeKill } from '../src/sim/combat.ts';
import type { State } from '../src/sim/state.ts';
import {
  barOf, canGild, canRender, gild, held, pageBeasts, pageWhole, render, spares,
} from '../src/sim/trophies.ts';
import { MARKS } from '../src/sim/record.ts';

const COMMONS = BEASTS.filter((b) => !b.warden);

/** The beast the next qi goes to, or undefined once the whole book is gilt or nothing is reached. */
export function target(s: State): Beast | undefined {
  const reached = COMMONS.filter((b) => b.realm <= s.realm && (s.realm > b.realm || s.layer >= b.layer));
  const missing = (r: number) => pageBeasts(r).filter((b) => held(s, b.key) === 0).length;
  const gilt = s.trophy?.gilt ?? [];
  const score = (b: Beast): number[] | null => {
    if (held(s, b.key) === 0) return [0, missing(b.realm), b.realm < s.realm ? 0 : 1, barOf(s, b.key).killsLeft];
    if (pageWhole(s, b.realm) && !gilt.includes(b.realm) && spares(s, b.key) === 0) {
      return [1, pageBeasts(b.realm).filter((x) => spares(s, x.key) === 0).length, b.realm < s.realm ? 0 : 1, barOf(s, b.key).killsLeft];
    }
    return null;
  };
  const ranked = reached.map((b) => ({ b, k: score(b) })).filter((x) => x.k !== null)
    .sort((x, y) => { for (let i = 0; i < 4; i++) { const d = x.k![i] - y.k![i]; if (d) return d; } return 0; });
  return ranked[0]?.b;
}

/** 化 鎏 Everything the furnace and the forge will take right now. */
export function tidy(s: State): State {
  for (let guard = 0; guard < 40; guard++) {
    let moved = false;
    for (const b of COMMONS) {
      if (held(s, b.key) === 0 && canRender(s, b.key)) { s = render(s, b.key); moved = true; }
    }
    for (let r = 1; r <= 9; r++) if (canGild(s, r)) { s = gild(s, r); moved = true; }
    if (!moved) break;
  }
  return s;
}

export interface Collected {
  readonly state: State;
  readonly kills: number;
  readonly qi: number;
}

/**
 * Spend up to `budget` qi on the book. `seed` seeds the drives' drops, as the habits seed theirs.
 * Drives at most DRIVE_MOST a time and at most `drives` of them, which is a session of taps.
 */
export function collect(s: State, budget: number, seed: number, drives = 60): Collected {
  let left = Math.max(0, budget);
  let kills = 0;
  let spent = 0;
  for (let i = 0; i < drives; i++) {
    s = tidy(s);
    const b = target(s);
    if (!b) break;
    // 熟 A beast must be Known before it can be driven: ten taps of an old animal.
    for (let k = 0; k < MARKS[1] && !canDrive(s, b); k++) { s = takeKill(s, b); kills++; }
    if (!canDrive(s, b)) break;
    const n = Math.min(driveMax({ ...s, qi: Math.min(s.qi, left) }, b), barOf(s, b.key).killsLeft + 1);
    if (n <= 0) break;
    const cost = driveCost(s, n, b);
    const d = drive(s, b, n, seed + i * 7919);
    if (d.kills === 0) break;
    s = d.state;
    left -= cost;
    spent += cost;
    kills += d.kills;
  }
  return { state: tidy(s), kills, qi: spent };
}
