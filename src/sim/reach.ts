import { huntable, type Beast } from '../data/bestiary.ts';
import { currentWarden, oddsRaw } from './combat.ts';
import { canFightWarden, type State } from './state.ts';
import { standingFloor, towerOpen } from './trials.ts';
import { floorBeast, floorPower } from './tower.ts';

/**
 * 戰 The fight a piece of gear should be read against: the nearest one not yet sure.
 *
 * Bruno chose it from the drop proposal: the item sheet says what a piece changes *in a
 * fight*, because "+3.7% power" is a number and "against the Harpy, 17% to 22%" is a
 * reason. The fight is the likeliest one still under 95% among what can be hunted now,
 * the warden included when it can be fought. When everything in reach is already sure,
 * it is the tower's next floor, which never runs out.
 */
export interface Trial {
  readonly beast: Beast;
  /** The tower's standing power for a floor, as `oddsRaw` takes it. */
  readonly standing?: number;
  readonly floor?: number;
}

export const SURE = 0.95;

export function nearestTrial(s: State): Trial | null {
  const pool: Beast[] = [...huntable(s.realm, s.layer)];
  if (canFightWarden(s)) pool.push(currentWarden(s));
  const open = pool
    .map((beast) => ({ beast, p: oddsRaw(s, beast) }))
    .filter((x) => x.p < SURE)
    .sort((a, b) => b.p - a.p);
  if (open.length) return { beast: open[0].beast };
  if (towerOpen(s)) {
    const floor = standingFloor(s);
    return { beast: floorBeast(floor), standing: floorPower(floor), floor };
  }
  return null;
}

export function trialOdds(s: State, t: Trial): number {
  return oddsRaw(s, t.beast, t.standing);
}
