import { callingOf } from '../src/data/gear.ts';
import { HABITS, play } from './habits.ts';
import { arrivalOf, playEndgame } from './endgame.ts';
import { PAIR_TOWER_QI } from '../src/sim/balance.ts';

/**
 * 天師 Is the Celestial Master the tower's qi class? rekaris (Discord, 2026-10-04): a body
 * that reaches more floors sooner may out-earn a class paid more per floor, and snowball.
 * Each builder is the active cultivator told to wear one class, played over SEEDS rolls of
 * the dice; read off each: the ninth realm's day, the tower's qi over the climb (and as a
 * share of everything gathered), the top floor the day the ninth realm opens, and forty
 * crossings past the summit. Means over the seeds.
 *
 *     npx tsx tools/celestial.ts            (PAIR_TOWER_QI as it stands in balance.ts)
 */
const BUILDS = ['sword', 'swordimmortal', 'celestial'] as const;
const SEEDS = [991, 17, 4242, 777, 31337];
const active = HABITS.find((h) => h.name === 'active')!;
const mean = (xs: number[]) => xs.reduce((a, x) => a + x, 0) / xs.length;

console.log(`天師 PAIR_TOWER_QI ${PAIR_TOWER_QI}, ${SEEDS.length} seeds`);
console.log('build          realm9  tower qi   share  floor@r9  held  40 marks');
for (const build of [null, ...BUILDS]) {
  const r9: number[] = [], qi: number[] = [], share: number[] = [], top: number[] = [], held: number[] = [], marks: number[] = [];
  for (const seed of SEEDS) {
    const h = build ? { ...active, name: `active ${build}`, calling: build, seed } : { ...active, seed };
    let on = 0, days = 0, atR9 = 0;
    const run = play(h, 400, (_d, s) => {
      days++;
      const c = callingOf(s.worn);
      if (build && ((c.kind === 'pure' && c.school === build) || (c.kind === 'pair' && c.pair?.key === build))) on++;
      if (s.realm >= 9 && !atR9) atR9 = s.tower;
    });
    r9.push(run.arrival[8]); qi.push(run.tower.qi); share.push(run.tower.qi / run.qi.gained); top.push(atR9);
    held.push(days ? on / days : 0);
    marks.push(playEndgame(40, 'pill', arrivalOf(run.state)).days.reduce((a, x) => a + x, 0));
  }
  console.log(`${(build ?? 'plain').padEnd(14)} ${mean(r9).toFixed(1).padStart(6)}  ${mean(qi).toExponential(2).padStart(9)}` +
    `  ${(100 * mean(share)).toFixed(1).padStart(5)}%  ${mean(top).toFixed(1).padStart(8)}  ${build ? (100 * mean(held)).toFixed(0).padStart(3) + '%' : '   -'}  ${mean(marks).toFixed(0).padStart(7)}`);
}
