/**
 * 需 What each system is worth to the climb, measured by taking it away.
 *
 * Bruno, 2026-10-06: "valida a necessidade de consumíveis, crafts, pills etc para
 * avançarem." A system a player does not need to advance is a system they will not
 * learn, so this plays the same cultivator over and over with one thing switched off
 * (or the workshop switched on) and prints, for each, the day the ninth realm is
 * reached, the days spent waiting at the nine gates, and the odds against the realm's
 * 霸 elite when its warden first comes out.
 *
 *     npx tsx tools/need.ts                 casual, once a day, active
 *     npx tsx tools/need.ts active          one
 */
import { AUTO_HABIT, HABITS, play, type Habit } from './habits.ts';
import { odds } from '../src/sim/combat.ts';
import { commonsOf, wardenOf } from '../src/data/bestiary.ts';
import { canFightWarden } from '../src/sim/state.ts';

const VARIANTS: readonly [string, (h: Habit) => Habit][] = [
  ['as played', (h) => h],
  ['+ workshop', (h) => ({ ...h, crafts: true })],
  ['- gear and refining', (h) => ({ ...h, gear: false })],
  ['- stance and arts', (h) => ({ ...h, build: false })],
  ['- the Path', (h) => ({ ...h, branch: undefined })],
  ['- the tower', (h) => ({ ...h, tower: false })],
  ['- the furnace', (h) => ({ ...h, furnace: false })],
];

const only = process.argv[2];
const pool = [...HABITS, AUTO_HABIT];
const names = only ? [only] : ['once a day', 'casual', 'active'];
for (const name of names) {
  const base = pool.find((x) => x.name === name);
  if (!base) throw new Error(`需 no habit called ${name}`);
  console.log(`\n${name}`);
  for (const [label, make] of VARIANTS) {
    const h = make(base);
    const gate: Record<number, number> = {};
    const elite: Record<number, number> = {};
    const r = play(h, 400, (day, s) => {
      if (s.realm < 9 && canFightWarden(s) && gate[s.realm] === undefined) {
        gate[s.realm] = day;
        const c = commonsOf(s.realm);
        if (s.realm >= 2 && c.length) elite[s.realm] = odds(s, c[c.length - 1]);
        void wardenOf;
      }
    });
    let wait = 0;
    for (let i = 1; i <= 8; i++) if (gate[i] !== undefined && r.arrival[i] !== undefined) wait += r.arrival[i] - gate[i];
    const el = [2, 3, 4, 5, 6, 7, 8].map((i) => (elite[i] === undefined ? '  -' : `${Math.round(elite[i] * 100)}`.padStart(3))).join(' ');
    console.log(`  ${label.padEnd(20)} realm 9 day ${r.arrival[8] !== undefined ? r.arrival[8].toFixed(1).padStart(6) : '     -'}`
      + `   waited at gates ${wait.toFixed(1).padStart(5)}d   elite odds at each gate (2..8) ${el}`);
  }
}
