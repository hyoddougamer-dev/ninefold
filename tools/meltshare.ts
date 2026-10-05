/**
 * 拆 What melting is worth in material against the kills that dropped it, per habit and realm.
 *
 * rekaris, on the Discord (2026-10-05): forty kills at the sixth realm paid 740k material,
 * and every piece they dropped, melted with the allowance empty, 37k. This asks the same
 * question of every cultivator in tools/habits.ts that picks gear up: the first time each
 * realm is reached (its fourth rung, so the realm's beasts are out), 400 kills of the
 * strongest beast it can safely hunt, every piece that falls melted into material, as the
 * allowance pays once it is spent (meltSpill and meltFactor, the sim's own).
 *
 * Read by src/sim/__tests__/salvage.test.ts and by MELT_MATERIAL's comment in balance.ts.
 * Run it as `npx tsx tools/meltshare.ts` for the whole table.
 */
import { HABITS, play, type Habit } from './habits.ts';
import { odds, takeKill } from '../src/sim/combat.ts';
import { dropFor, noteFate, secondDropFor } from '../src/sim/fate.ts';
import { fortuneOf } from '../src/sim/fortune.ts';
import { meltFactor, meltSpill } from '../src/sim/salvage.ts';
import { huntable } from '../src/data/bestiary.ts';
import { isOpen } from '../src/sim/unlocks.ts';
import type { State } from '../src/sim/state.ts';

export interface MeltRow {
  readonly realm: number;
  readonly beast: string;
  /** 材 What the kills paid. */
  readonly kills: number;
  /** 材 What every piece they dropped melts into, with the allowance empty. */
  readonly melt: number;
  readonly pieces: number;
  /** melt over kills. */
  readonly share: number;
}

/** 量 400 kills from this state, and the material their drops melt into. */
export function meltAt(s: State, n = 400): MeltRow | null {
  const b = [...huntable(s.realm, s.layer)].reverse().find((x) => odds(s, x) > 0.7);
  if (!b) return null;
  let x = s, kills = 0, melt = 0, pieces = 0;
  const factor = meltFactor(s);
  for (let i = 0; i < n; i++) {
    const before = x.materials;
    x = takeKill(x, b);
    kills += x.materials - before;
    const f = fortuneOf(x);
    const drop = dropFor(x, b, 7919 * i + 13, f, x.layer);
    const extra = secondDropFor(x, b, 7919 * i + 13, f, x.layer);
    x = noteFate(x, b, drop);
    for (const it of [drop, extra]) if (it) { melt += meltSpill(x, it) * factor; pieces++; }
  }
  return { realm: s.realm, beast: b.key, kills, melt, pieces, share: melt / Math.max(1, kills) };
}

/** 量 One habit's walk, measured the first time each realm with gear is four rungs in. */
export function meltShares(h: Habit, n = 400): MeltRow[] {
  const rows: MeltRow[] = [];
  const seen = new Set<number>();
  play(h, 400, (_day, s) => {
    if (seen.has(s.realm) || !isOpen(s.realm, 'gear') || s.layer < 4) return;
    seen.add(s.realm);
    const r = meltAt(s, n);
    if (r) rows.push(r);
  });
  return rows;
}

if (process.argv[1]?.endsWith('meltshare.ts')) {
  const only = process.argv[2]?.split(',');
  for (const h of HABITS) {
    if (!h.gear || (only && !only.includes(h.name))) continue;
    const rows = meltShares(h);
    console.log(`${h.name.padEnd(14)} ${rows.map((r) => `r${r.realm} ${(r.share * 100).toFixed(1)}%`).join('  ')}`);
  }
}
