/**
 * 傳說 擊 What the legendary works and the hard wins do, measured on five seeds and read by name.
 *
 *     npx tsx tools/ascent.ts [climb|chase|busy] [habit names...]
 *
 *   climb  each habit as it plays (HABITS as they are: nobody chases a work, the hard wins
 *          land wherever the habit already fights): the day the ninth realm opens, the summit,
 *          and the thunder marks by day 112, with the hard wins counted.
 *   chase  each habit made a crafter that chases the works (crafts and legends on, playing on
 *          past the summit to CHASE_DAYS): the day each craft's work is made.
 *   busy   the share of visits with something new on them (not bare: tools/busy.ts).
 *
 * The same table for the build before the works comes from the copy of 3e92b8e in the
 * scratchpad, which has no legend fields; the push to ±10% runs this file in a copy of the
 * tree with the numbers in balance.ts changed (see the report on the ch-ascent branch), so
 * nothing in sim/ ever reads an environment variable.
 */
import { HABITS, AUTO_HABIT, play, type Habit, type Run } from './habits.ts';
import { arrivalOf, playEndgame } from './endgame.ts';
import { LAYERS } from '../src/sim/balance.ts';
import { SKILL_KEYS } from '../src/data/crafts.ts';
import { legendNeed } from '../src/sim/legend.ts';

export const SEEDS = [991, 1234, 5555, 7777, 31337] as const;
const SEASON_DAYS = 112;
export const CHASE_DAYS = 200;

export function habitNamed(name: string): Habit {
  const h = [...HABITS, AUTO_HABIT].find((x) => x.name === name);
  if (!h) throw new Error(`傳說 there is no habit called ${name}`);
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

export interface Climb {
  readonly name: string; readonly seed: number; readonly r9: number; readonly summit: number; readonly marks: number;
  readonly elite: number; readonly gates: number;
}

export function climbOf(name: string, seed: number): Climb {
  const run = play({ ...habitNamed(name), seed });
  return { name, seed, r9: run.arrival[8] ?? NaN, summit: run.layerDay[LAYERS - 1] ?? NaN, marks: marksBy(run),
    elite: run.legend.eliteWins, gates: run.legend.gateWins };
}

export interface Chase {
  readonly name: string; readonly seed: number; readonly made: readonly number[]; readonly soul: number;
  /** 擊 For each work, the most of its forging hard wins had struck off when last seen on the anvil, 0..LEGEND_FIGHT_SHARE. */
  readonly struck: readonly number[];
}

/** 傳說 The habit as a crafter chasing the works, on to `days`. */
export function chaseOf(name: string, seed: number, days = CHASE_DAYS): Chase {
  const struck: number[] = SKILL_KEYS.map(() => 0);
  const run = play({ ...habitNamed(name), seed, crafts: true, legends: true, on: true }, days, (_, s) => {
    const w = s.crafts.legend;
    const i = w ? SKILL_KEYS.indexOf(w.key.slice('legend:'.length) as never) : -1;
    if (w && i >= 0) struck[i] = Math.max(struck[i], w.struck / legendNeed(w.key));
  });
  return { name, seed, made: run.legend.made, soul: run.legend.firstSoul, struck };
}

export const mean = (xs: readonly number[]) => {
  const ok = xs.filter((x) => Number.isFinite(x));
  return ok.length ? ok.reduce((a, b) => a + b, 0) / ok.length : NaN;
};
export const f1 = (x: number) => (Number.isFinite(x) ? x.toFixed(1) : '-');

if (process.argv[1]?.endsWith('ascent.ts')) {
  const [what = 'climb', ...names] = process.argv.slice(2);
  const who = names.length ? names : HABITS.map((h) => h.name);
  if (what === 'climb') {
    for (const name of who) {
      const rows = SEEDS.map((seed) => climbOf(name, seed));
      console.log(JSON.stringify({ what, name, rows }));
    }
  }
  if (what === 'chase') {
    for (const name of who) {
      const rows = SEEDS.map((seed) => chaseOf(name, seed));
      console.log(JSON.stringify({ what, name, rows }));
      const cells = SKILL_KEYS.map((k, i) => {
        const d = rows.map((r) => r.made[i]);
        return `${k} ${f1(mean(d))}(${d.filter(Number.isFinite).length})`;
      });
      // The works each seed had made by the season's end and by day 160, so the chase reads as a count too.
      const by = (day: number) => rows.map((r) => r.made.filter((d) => d <= day).length).join(' ');
      console.error(`${name.padEnd(14)} soul ${f1(mean(rows.map((r) => r.soul)))}  ${cells.join('  ')}  by 112 [${by(SEASON_DAYS)}]  by 160 [${by(160)}]`);
    }
  }
}
