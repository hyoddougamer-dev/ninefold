/**
 * 珍 The trophy book, measured: how long each habit takes to reach each chase item.
 *
 *     npx tsx tools/trophies.ts chase [habit ...]     the all-in collector past the summit
 *     npx tsx tools/trophies.ts marks [habit ...]     thunder marks by day 112, a share of qi to the book
 *     npx tsx tools/trophies.ts busy [habit ...]      the share of visits with something new in them
 *     NF_TROPHY_WINDOW=1.1 NF_TROPHY_POWER=0.9 ...   every number pushed, for the knife-edge check
 *
 * Five seeds, every habit read by name (never by position), and a floor on what was read: a
 * walk that reached nothing must fail rather than print a table of dashes.
 */
import { HABITS, play, type Habit } from './habits.ts';
import { arrivalOf, playEndgame } from './endgame.ts';
import { collect } from './collector.ts';
import { SEEDS, SEASON_DAY } from './trophy-climb.ts';
import { BEASTS } from '../src/data/bestiary.ts';
import { layersOpened } from '../src/sim/time.ts';
import { LAYERS } from '../src/sim/balance.ts';
import { SYSTEMS, opensAt } from '../src/sim/unlocks.ts';
import type { State } from '../src/sim/state.ts';
import {
  found, pagesGilt, pagesHeld, scaleTrophies, trophiesHeld,
} from '../src/sim/trophies.ts';

const env = (k: string) => (process.env[k] ? Number(process.env[k]) : 1);
scaleTrophies({ window: env('NF_TROPHY_WINDOW'), power: env('NF_TROPHY_POWER'), material: env('NF_TROPHY_MATERIAL') });

const COMMONS = BEASTS.filter((b) => !b.warden);
const firstFound = (s: State) => COMMONS.some((b) => found(s, b.key) > 0);

/** The chase items, in the order they come. */
export const ITEMS = ['first trophy', 'first page', 'three pages', 'whole book', 'first gilt', 'book gilt'] as const;
type Item = (typeof ITEMS)[number];

function reachedOf(s: State): Record<Item, boolean> {
  return {
    'first trophy': firstFound(s) || trophiesHeld(s) > 0,
    'first page': pagesHeld(s) >= 1,
    'three pages': pagesHeld(s) >= 3,
    'whole book': pagesHeld(s) >= 9,
    'first gilt': pagesGilt(s) >= 1,
    'book gilt': pagesGilt(s) >= 9,
  };
}

export interface Chase {
  readonly habit: string;
  readonly seed: number;
  readonly summit?: number;
  readonly days: Partial<Record<Item, number>>;
  readonly visits: number;
}

/** 珍 The habit played as a collector from the summit on, to day `until`: the day each item came. */
export function chase(h: Habit, seed: number, until = 200): Chase {
  const days: Partial<Record<Item, number>> = {};
  let summit: number | undefined;
  let visits = 0;
  play({ ...h, seed, on: true, collects: true }, until, (day, s) => {
    visits++;
    if (summit === undefined && layersOpened(s) >= LAYERS - 1) summit = day;
    const r = reachedOf(s);
    for (const k of ITEMS) if (r[k] && days[k] === undefined) days[k] = day;
  });
  return { habit: h.name, seed, summit, days, visits };
}

/**
 * 雷 The marks by day 112, the endgame played with `share` of each day's gathering put into
 * the book first. Share 0 is the plain endgame, so the two columns differ by the book alone.
 */
export function marksWith(h: Habit, seed: number, share: number): { marks: number; pages: number; gilt: number; summit?: number } {
  const run = play({ ...h, seed });
  const summit = run.layerDay[80];
  if (summit === undefined || summit >= SEASON_DAY) return { marks: 0, pages: pagesHeld(run.state), gilt: 0, summit };
  let n = 0;
  const e = playEndgame(30, 'pill', arrivalOf(run.state), 1, 'game', share > 0 ? (s, gathered) => {
    // The share is taken out of the day's qi, so it is qi the pool and the furnace never see.
    const c = collect(s, Math.min(s.qi, gathered * share), seed + ++n);
    return c.state;
  } : undefined);
  let day = summit;
  let marks = 0;
  for (const d of e.days) { day += d; if (day > SEASON_DAY) break; marks++; }
  return { marks, pages: pagesHeld(e.end), gilt: pagesGilt(e.end), summit };
}

/**
 * 新 The share of visits to day 112 on which something arrived that was not there the visit
 * before: a realm, a system opening, or (with the book) a trophy, a page or a gilding.
 */
export function busyNew(h: Habit, seed: number, collects: boolean): { share: number; visits: number; trophyVisits: number } {
  let visits = 0, fresh = 0, trophyVisits = 0;
  let realm = 0, held = 0, pages = 0, gilt = 0;
  const opened = new Set<string>();
  play({ ...h, seed, on: true, collects }, SEASON_DAY, (_day, s) => {
    visits++;
    let isNew = false;
    if (s.realm > realm) {
      realm = s.realm; isNew = true;
      for (const sys of SYSTEMS) if (opensAt(sys.key) <= realm && !opened.has(sys.key)) opened.add(sys.key);
    }
    const t = trophiesHeld(s), p = pagesHeld(s), g = pagesGilt(s);
    if (t > held || p > pages || g > gilt) { isNew = true; trophyVisits++; }
    held = t; pages = p; gilt = g;
    if (isNew) fresh++;
  });
  return { share: fresh / Math.max(1, visits), visits, trophyVisits };
}

const habitsNamed = (names: string[]) => {
  const hs = HABITS.filter((x) => names.length === 0 ? x.name !== 'never fights' : names.includes(x.name));
  if (hs.length === 0) throw new Error(`珍 no habit called ${names.join(', ')}`);
  return hs;
};

if (process.argv[1]?.endsWith('trophies.ts')) {
  const [mode, ...names] = process.argv.slice(2);
  const hs = habitsNamed(names);
  let read = 0;
  if (mode === 'chase') {
    for (const h of hs) for (const seed of SEEDS) { console.log(JSON.stringify(chase(h, seed))); read++; }
  } else if (mode === 'marks') {
    const share = process.env.NF_SHARE ? Number(process.env.NF_SHARE) : 0.25;
    for (const h of hs) for (const seed of SEEDS) {
      const plain = marksWith(h, seed, 0);
      const book = marksWith(h, seed, share);
      console.log(JSON.stringify({ habit: h.name, seed, share, summit: plain.summit, plain: plain.marks, book: book.marks, pages: book.pages, gilt: book.gilt }));
      read++;
    }
  } else if (mode === 'busy') {
    for (const h of hs) for (const seed of SEEDS) {
      const plain = busyNew(h, seed, false);
      const book = busyNew(h, seed, true);
      console.log(JSON.stringify({ habit: h.name, seed, plain: plain.share, book: book.share, visits: book.visits, trophyVisits: book.trophyVisits }));
      read++;
    }
  } else throw new Error('珍 mode is chase, marks or busy');
  // 底 A harness that reached nothing passes, and that is the worst kind of green.
  if (read < SEEDS.length) throw new Error(`珍 read ${read} rows, under the floor of ${SEEDS.length}`);
}
