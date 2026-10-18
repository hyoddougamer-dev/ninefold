/**
 * 珍 The climb and the thunder marks on five seeds, read by name: what tools/trophies.ts
 * compares a build against. It imports only the habits and the endgame, so the same file
 * runs on an older build unchanged, which is how the before column is taken.
 *
 *     npx tsx tools/trophy-climb.ts [habit ...]      prints JSON, one line per habit and seed
 */
import { HABITS, play } from './habits.ts';
import { arrivalOf, playEndgame } from './endgame.ts';

export const SEEDS = [991, 1234, 5555, 7777, 31337] as const;
/** 季 The season's sixteen weeks: the marks a cultivator holds by this day. */
export const SEASON_DAY = 112;

export interface ClimbRow {
  readonly habit: string;
  readonly seed: number;
  readonly realm9?: number;
  readonly summit?: number;
  readonly marks112: number;
}

export function climbOf(name: string, seed: number, endgame = true): ClimbRow {
  const h = HABITS.find((x) => x.name === name);
  if (!h) throw new Error(`珍 there is no habit called ${name}`);
  const run = play({ ...h, seed });
  const realm9 = run.arrival[8];
  const summit = run.layerDay[80];
  let marks112 = 0;
  if (endgame && summit !== undefined && summit < SEASON_DAY) {
    const e = playEndgame(30, 'pill', arrivalOf(run.state));
    let day = summit;
    for (const d of e.days) { day += d; if (day > SEASON_DAY) break; marks112++; }
  }
  return { habit: name, seed, realm9, summit, marks112 };
}

if (process.argv[1]?.endsWith('trophy-climb.ts')) {
  const names = process.argv.slice(2);
  const endgame = process.env.NF_NO_ENDGAME !== '1';
  for (const h of HABITS.filter((x) => names.length === 0 || names.includes(x.name))) {
    for (const seed of SEEDS) console.log(JSON.stringify(climbOf(h.name, seed, endgame)));
  }
}
