/**
 * 神器 鬥關 What the relics and the gates as effort do, measured on five seeds and read by name.
 *
 *     npx tsx tools/relics.ts [climb|chase|push|all] [habit names...]
 *
 *   climb  each habit as it plays (relics made when they fall into its hands, nobody goes back
 *          for one): the day the ninth realm opens, the summit, and the thunder marks by day 112.
 *   chase  each habit playing on past the summit to day 160 and going back for the relics
 *          (Habit.chases): the day each realm's relic is seen, and the day it is made.
 *   push   the climb and the chase for the active and hourly cultivators with every relic and
 *          gate number a tenth lower and a tenth higher (NF_RELIC_PUSH, read by balance.ts
 *          callers through relicPush below), so a number off its value slows and never walls.
 *
 * Without the relics' code (the build before them) the same table comes from
 * tools/relics-base.ts in the scratchpad, which reads only what that build has.
 */
import { HABITS, AUTO_HABIT, play, type Habit, type Run } from './habits.ts';
import { arrivalOf, playEndgame } from './endgame.ts';
import { LAYERS } from '../src/sim/balance.ts';

export const SEEDS = [991, 1234, 5555, 7777, 31337] as const;
const SEASON_DAYS = 112;

export function habitNamed(name: string): Habit {
  const h = [...HABITS, AUTO_HABIT].find((x) => x.name === name);
  if (!h) throw new Error(`神器 there is no habit called ${name}`);
  return h;
}

/** 印 The thunder marks crossed by day `by`, from where this run stood at the summit. */
export function marksBy(run: Run, by = SEASON_DAYS): number {
  const summit = run.layerDay[LAYERS - 1];
  if (summit === undefined || summit > by) return 0;
  const game = playEndgame(40, 'pill', arrivalOf(run.state));
  let day = summit;
  let n = 0;
  for (const d of game.days) {
    day += d;
    if (day > by) break;
    n++;
  }
  return n;
}

export interface Climb { name: string; seed: number; r9: number; summit: number; marks: number }

export function climbOf(name: string, seed: number): Climb {
  const run = play({ ...habitNamed(name), seed });
  return { name, seed, r9: run.arrival[8] ?? NaN, summit: run.layerDay[LAYERS - 1] ?? NaN, marks: marksBy(run) };
}

export interface Chase { name: string; seed: number; seen: readonly number[]; made: readonly number[] }

export function chaseOf(name: string, seed: number, days = 160): Chase {
  const run = play({ ...habitNamed(name), seed, born: seed, on: true, chases: true }, days);
  return { name, seed, seen: run.relicSeenDays, made: run.relicDays };
}

const mean = (xs: readonly number[]) => {
  const ok = xs.filter((x) => Number.isFinite(x));
  return ok.length ? ok.reduce((a, b) => a + b, 0) / ok.length : NaN;
};
const f1 = (x: number) => (Number.isFinite(x) ? x.toFixed(1) : '-');

if (process.argv[1]?.endsWith('relics.ts')) {
  const [what = 'all', ...names] = process.argv.slice(2);
  const who = names.length ? names : HABITS.map((h) => h.name);
  if (what === 'climb' || what === 'all') {
    console.log('\n神器 climb: mean of five seeds (realm 9 day, summit day, thunder marks by day 112)\n');
    for (const name of who) {
      const rows = SEEDS.map((seed) => climbOf(name, seed));
      console.log(`  ${name.padEnd(16)} r9 ${f1(mean(rows.map((r) => r.r9))).padStart(6)}  summit ${f1(mean(rows.map((r) => r.summit))).padStart(6)}`
        + `  marks@112 ${f1(mean(rows.map((r) => r.marks))).padStart(5)}   [${rows.map((r) => `${f1(r.r9)}/${f1(r.summit)}/${r.marks}`).join(' ')}]`);
    }
  }
  if (what === 'chase' || what === 'all') {
    console.log('\n神器 chase to day 160: mean day each relic is made (made on n of 5 seeds), realm 1 to 9\n');
    for (const name of who) {
      const rows = SEEDS.map((seed) => chaseOf(name, seed));
      const cells = Array.from({ length: 9 }, (_, i) => {
        const days = rows.map((r) => r.made[i]);
        const n = days.filter((d) => Number.isFinite(d)).length;
        return `${f1(mean(days))}(${n})`.padStart(10);
      });
      console.log(`  ${name.padEnd(16)} ${cells.join('')}`);
    }
  }
}
