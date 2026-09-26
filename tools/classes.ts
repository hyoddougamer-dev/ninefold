import { callingOf } from '../src/data/gear.ts';
import { PAIRS, SCHOOLS, type Pair, type School } from '../src/data/schools.ts';
import { HABITS, play } from './habits.ts';
import { arrivalOf, playEndgame } from './endgame.ts';

/**
 * 職 Every class played out, by the active cultivator told to become it.
 *
 * The answer the classes were built to: each one a different way up, none of them a wall
 * and none a shortcut. The same run is read by the test, which holds the bounds, and by
 * the bible, which prints the table, so the page can never show numbers the tests did not
 * pass.
 */
export type Build = School | Pair;
export const BUILDS: readonly Build[] = [...SCHOOLS, ...PAIRS.map((p) => p.key)];

export interface ClassRun {
  readonly build: Build | null;
  /** The day realm 9 opened. */
  readonly realm9: number;
  /** The share of days the body wore the class it was told to. */
  readonly held: number;
  /** Forty crossings past the summit, each in days. */
  readonly crossings: readonly number[];
}

const active = () => HABITS.find((h) => h.name === 'active')!;

/** The plain active cultivator, who wears whatever is best: the yardstick. */
export function playPlain(): number {
  return play(active()).arrival[8];
}

export function playClass(build: Build, marks = 40): ClassRun {
  const h = { ...active(), name: `active ${build}`, calling: build };
  let held = 0, days = 0;
  const run = play(h, 400, (_d, s) => {
    days++;
    const c = callingOf(s.worn);
    if ((c.kind === 'pure' && c.school === build) || (c.kind === 'pair' && c.pair?.key === build)) held++;
  });
  const end = playEndgame(marks, 'pill', arrivalOf(run.state));
  return { build, realm9: run.arrival[8], held: days ? held / days : 0, crossings: end.days };
}
