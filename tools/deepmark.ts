/**
 * 精 Whether a deep mark pays: how long +1% 材 material from every beast (DEEP_EVERYWHERE) takes
 * to give back what 1,000 kills of a weak beast gave up.
 *
 *     npx tsx tools/deepmark.ts
 *
 * A tester asked it on the Discord (2026-10-20). Each cultivator is played on past the summit,
 * five seeds, read by name. On each day the harness reads off the real state:
 *
 * - the beast they killed most that day (the one they would otherwise be on) and what one kill
 *   of it pays, against one kill of 山鼠 the Mountain Rat, the weakest there is;
 * - what the 1,000 rats give up. By hand or on Auto a kill is time, so it is 1,000 kills of the
 *   best beast less 1,000 rats. In a 圍 drive a kill is qi, and an old beast costs DRIVE_OLD of a
 *   kill, so the same qi would have driven DRIVE_OLD × 1,000 of the best beast;
 * - what the +1% is worth a day: every kill that day, at what it paid, times DEEP_EVERYWHERE over
 *   the record's own multiplier (the mark adds to it, it does not multiply it). Tower floors and
 *   melting take the +1% too and are left out, so the days are an upper bound.
 *
 * Nothing in the game is changed. A walk that reached no kills fails rather than print dashes.
 */
import { AUTO_HABIT, HABITS, play, type Habit } from './habits.ts';
import { SEEDS } from './trophy-climb.ts';
import { BEASTS, type Beast } from '../src/data/bestiary.ts';
import { lootFrom } from '../src/sim/combat.ts';
import { lootTaken } from '../src/sim/trials.ts';
import { recordMaterial } from '../src/sim/record.ts';
import { isOpen } from '../src/sim/unlocks.ts';
import { DEEP_EVERYWHERE, DEEP_MARKS, DRIVE_OLD } from '../src/sim/balance.ts';
import type { State } from '../src/sim/state.ts';

const WHO = ['active', 'runs auto', 'drives it all'] as const;
const AT = [15, 30, 45, 60, 90] as const;
const UNTIL = 90;
const KILLS = DEEP_MARKS[0];
const RAT = BEASTS.find((b) => b.key === 'rat')!;
const BY = Object.fromEntries(BEASTS.map((b) => [b.key, b])) as Record<string, Beast>;

const named = (name: string): Habit => {
  const h = [...HABITS, AUTO_HABIT].find((x) => x.name === name);
  if (!h) throw new Error(`精 there is no habit called ${name}`);
  return h;
};

export interface Reading {
  readonly day: number;
  readonly realm: number;
  readonly perDay: number;
  readonly best: string;
  /** What one kill of the best beast and of the rat pays, now. */
  readonly bestPays: number;
  readonly ratPays: number;
  /** 材 the 1,000 rats gave up, and what the +1% gives back a day. */
  readonly lost: number;
  readonly back: number;
  /** Days, and kills of the best beast, until it has given it back. */
  readonly days: number;
  readonly kills: number;
}

/** 精 One cultivator, one seed: a reading on each day of AT. */
export function measure(name: string, seed: number, driven = false): Reading[] {
  const out: Reading[] = [];
  let last: State | null = null;
  let lastDay = -1;
  play({ ...named(name), seed, on: true }, UNTIL, (d, s) => {
    const day = Math.floor(d + 1e-9);
    if (day === lastDay) return;
    const prev = last;
    last = s; lastDay = day;
    if (!prev || !AT.includes(day as (typeof AT)[number])) return;
    let income = 0, kills = 0, best: Beast | null = null, most = 0;
    for (const [key, n] of Object.entries(s.killed)) {
      const b = BY[key];
      const k = n - (prev.killed[key] ?? 0);
      if (!b || k <= 0) continue;
      kills += k;
      income += k * lootTaken(s, lootFrom(s, b));
      if (!b.warden && k > most) { most = k; best = b; }
    }
    if (!best) return;
    const bestPays = lootTaken(s, lootFrom(s, best));
    const ratPays = lootTaken(s, lootFrom(s, RAT));
    const lost = Math.max(0, KILLS * ((driven ? DRIVE_OLD : 1) * bestPays - ratPays));
    const record = isOpen(s.realm, 'record') ? recordMaterial(s.killed) : 1;
    const back = (income * DEEP_EVERYWHERE) / record;
    const days = back > 0 ? lost / back : Infinity;
    out.push({ day, realm: s.realm, perDay: kills, best: best.key, bestPays, ratPays, lost, back,
      days, kills: (bestPays * DEEP_EVERYWHERE) / record > 0 ? lost / ((bestPays * DEEP_EVERYWHERE) / record) : Infinity });
  });
  return out;
}

const median = (xs: number[]) => {
  const a = [...xs].sort((x, y) => x - y);
  return a.length ? a[Math.floor(a.length / 2)] : NaN;
};

if (import.meta.url === `file://${process.argv[1]}`) {
  let read = 0;
  for (const name of WHO) {
    const runs = SEEDS.map((seed) => measure(name, seed, name === 'drives it all'));
    console.log(`\n${name}  (median of ${SEEDS.length} seeds; drives priced at DRIVE_OLD ${DRIVE_OLD}: ${name === 'drives it all'})`);
    console.log('day  realm  kills/day  best    best/kill  rat/kill  lost     back/day  days   kills');
    for (const day of AT) {
      const rows = runs.map((r) => r.find((x) => x.day === day)).filter((x): x is Reading => !!x);
      if (!rows.length) continue;
      read += rows.length;
      const m = (f: (r: Reading) => number) => median(rows.map(f));
      const bests = [...new Set(rows.map((r) => r.best))].join(',');
      console.log([String(day).padEnd(4), String(m((r) => r.realm)).padEnd(6), String(Math.round(m((r) => r.perDay))).padEnd(10),
        bests.padEnd(7), String(Math.round(m((r) => r.bestPays))).padEnd(10), String(Math.round(m((r) => r.ratPays))).padEnd(9),
        String(Math.round(m((r) => r.lost))).padEnd(8), String(Math.round(m((r) => r.back))).padEnd(9),
        String(Math.round(m((r) => r.days))).padEnd(6), String(Math.round(m((r) => r.kills)))].join(' '));
    }
  }
  if (read < WHO.length * SEEDS.length * 3) throw new Error(`精 only ${read} readings: the walk reached too little to say anything`);
}
