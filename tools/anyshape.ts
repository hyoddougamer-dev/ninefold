/**
 * 百形 What forging any shape of a realm is worth, and whether it is a shortcut.
 *
 * Bruno, 2026-10-06, announced to the players and asked for live the day after: a forge
 * recipe existed only for the three shapes each beast of a realm leaves, so no school
 * could put five pieces together out of one realm's beasts and a pure set was impossible
 * (the fifth realm reaches four places of 法 Arts at most; the ninth has no 體 Body shape).
 * Once a realm's warden has fallen the forge now makes any of its fifty-four shapes.
 *
 * The question is whether that is a shortcut. So the active cultivator with the workshop,
 * told to become each class, is played three ways: forging nothing for the class (the
 * crafter as it was), forging only the shapes the beasts teach (the forge as it was), and
 * forging any shape (the forge now). For each: the day the ninth realm opens, the share
 * of days the class was worn, the most pieces of its school worn at once, the first day
 * the class was full, and its power against the plain crafter's at the ninth realm.
 *
 *     npx tsx tools/anyshape.ts            the six schools
 *     npx tsx tools/anyshape.ts all        every class
 *     npx tsx tools/anyshape.ts arts       one
 */
import { HABITS, play, type Habit } from './habits.ts';
import { setForging, type Forging } from './crafter.ts';
import { callingOf, type Worn } from '../src/data/gear.ts';
import { SCHOOLS, PAIRS, type Pair, type School } from '../src/data/schools.ts';
import { power } from '../src/sim/state.ts';

export interface ShapeRow {
  readonly build: School | Pair | null;
  readonly forging: Forging;
  readonly realm9: number | undefined;
  /** Share of days the body wore the class it was told to. */
  readonly held: number;
  /** The most pieces of the build's schools worn at once (5 or 6 is a pure set). */
  readonly most: number;
  /** The first day the class was full (five of a school, or a pair's three and three). */
  readonly full: number | undefined;
  /** Power at the ninth realm's arrival. */
  readonly power: number;
}

const crafter = (): Habit => ({ ...HABITS.find((h) => h.name === 'active')!, crafts: true });

function wornOf(worn: Worn, build: School | Pair): number {
  const c = callingOf(worn).counts;
  const pair = PAIRS.find((p) => p.key === build);
  return pair ? Math.min(c[pair.a], 3) + Math.min(c[pair.b], 3) : c[build as School];
}

export function playShape(build: School | Pair | null, f: Forging): ShapeRow {
  setForging(f);
  try {
    const h = build ? { ...crafter(), name: `crafter ${build}`, calling: build } : crafter();
    let held = 0, days = 0, most = 0, at9 = 0;
    let full: number | undefined;
    const r = play(h, 400, (day, s) => {
      days++;
      if (s.realm === 9 && !at9) at9 = power(s);
      if (!build) return;
      const c = callingOf(s.worn);
      const mine = (c.kind === 'pure' && c.school === build) || (c.kind === 'pair' && c.pair?.key === build);
      if (mine) held++;
      // A school is full at five worn; a pair is whole the day it forms (three and three).
      if (mine && (c.kind === 'pair' || c.tier === 2) && full === undefined) full = day;
      most = Math.max(most, wornOf(s.worn, build));
    });
    return { build, forging: f, realm9: r.arrival[8], held: days ? held / days : 0, most, full, power: at9 };
  } finally {
    setForging('any');
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const arg = process.argv[2];
  const builds: (School | Pair)[] = arg === 'all' ? [...SCHOOLS, ...PAIRS.map((p) => p.key)]
    : arg ? [arg as School | Pair] : [...SCHOOLS];
  const plain = playShape(null, 'any');
  console.log(`plain crafter (no class): realm 9 on day ${plain.realm9?.toFixed(1)}, power there ${plain.power.toExponential(2)}\n`);
  console.log('build          forging   realm 9   held   most  full on   power at 9 vs plain');
  let reached = 0, rows = 0;
  for (const b of builds) {
    for (const f of ['none', 'taught', 'any'] as const) {
      const r = playShape(b, f);
      rows++;
      if (r.realm9 !== undefined) reached++;
      console.log(`${b.padEnd(14)} ${f.padEnd(8)} ${r.realm9 !== undefined ? r.realm9.toFixed(1).padStart(6) : '     -'}  ${String(Math.round(r.held * 100)).padStart(4)}%  ${String(r.most).padStart(4)}  ${r.full !== undefined ? r.full.toFixed(1).padStart(6) : '     -'}   ×${(r.power / plain.power).toFixed(2)}`);
    }
  }
  // 底 A harness that reached nothing passes, so it counts what reached the summit.
  console.log(`\n${reached} of ${rows} reached the ninth realm`);
  if (reached < rows) throw new Error(`百形 only ${reached} of ${rows} reached the ninth realm`);
}
