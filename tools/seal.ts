/**
 * 封 What the seal at the gates of realms 5 to 8 costs each way of playing, and what the
 * 破境丹 Breakthrough Pill gives back.
 *
 * Bruno, 2026-10-06, announced as a proposal and then asked for live: after a warden comes
 * out in realms 5 to 8 the gate stays sealed for a day or two whatever the power, waiting
 * it out always works, and a Breakthrough Pill from Alchemy breaks it outright (since
 * 2026-10-07, with half of the wall's days; it counted as two days of both before). The promise it was announced with, and what this prints to hold it to:
 * whoever uses the workshop climbs at today's pace, whoever ignores it and plays actively
 * loses three to seven days by the ninth realm, and whoever only waits loses nothing beyond
 * the seal's own days.
 *
 * Each habit is played as it is, and again with the workshop on (`crafts`), and for each
 * the day the ninth realm opened and the days spent at each gate from five to eight.
 *
 * 封 Since 2026-10-08 the seal is a bar (rekaris): time fills it by itself, qi can fill up to
 * SEAL_PAY_SHARE of it a tap at a time, and lesser pills fill the rest of what they can.
 * Each habit is therefore played four ways: `waits` (the seal as it was, and the numbers
 * every earlier measurement was made on), and `pays` at the real price, half of it and
 * twice it, which pushes the number off its value to see that it slows and never walls.
 *
 *     npx tsx tools/seal.ts                          every habit, every way
 *     npx tsx tools/seal.ts active                   one habit, every way
 *     npx tsx tools/seal.ts active 1                 one habit, paying the real price
 *     npx tsx tools/seal.ts active wait              one habit, waiting
 *     npx tsx tools/seal.ts active "" workshop       only the rows with the workshop
 */
import { HABITS, play, type Habit } from './habits.ts';
import { canFightWarden, wardenStands } from '../src/sim/state.ts';

export interface SealRow {
  readonly name: string;
  readonly crafts: boolean;
  /** The day realm 9 opened, or undefined inside the 400 days. */
  readonly realm9: number | undefined;
  /** Days between the warden coming out and the breakthrough, at gates 5 to 8. */
  readonly waited: readonly number[];
  /** Days the gate stood sealed while a fight was wanted, at gates 5 to 8. */
  readonly sealed: readonly number[];
}

export function sealRow(h: Habit): SealRow {
  const out: Record<number, number> = {};
  const shut: Record<number, number> = {};
  const lockedSince: Record<number, number> = {};
  const r = play(h, 400, (day, s) => {
    if (s.realm < 5 || s.realm > 8 || s.wardenFell || !wardenStands(s)) return;
    if (out[s.realm] === undefined) out[s.realm] = day;
    if (!canFightWarden(s) && lockedSince[s.realm] === undefined) lockedSince[s.realm] = day;
    if (canFightWarden(s) && lockedSince[s.realm] !== undefined && shut[s.realm] === undefined) {
      shut[s.realm] = day - lockedSince[s.realm];
    }
  });
  const waited = [5, 6, 7, 8].map((g) => (out[g] !== undefined && r.arrival[g] !== undefined ? r.arrival[g] - out[g] : NaN));
  const sealed = [5, 6, 7, 8].map((g) => shut[g] ?? 0);
  return { name: h.name, crafts: !!h.crafts, realm9: r.arrival[8], waited, sealed };
}

const WHO = ['never fights', 'barely fights', 'once a day', 'casual', 'active', 'every hour'];

/** 封 How each way of paying is named, and what the habit is told to do: undefined waits (the seal as it was). */
export const PRICES: readonly (number | undefined)[] = [undefined, 1, 0.5, 2];
const label = (p: number | undefined) => (p === undefined ? 'waits' : `pays x${p}`);

if (import.meta.url === `file://${process.argv[1]}`) {
  // npx tsx tools/seal.ts [habit] [price]: price is a multiple of the real one, "wait" for none.
  const only = process.argv[2];
  const one = process.argv[3];
  const prices = one === undefined || one === '' ? PRICES : [one === 'wait' ? undefined : Number(one)];
  const rows: SealRow[] = [];
  for (const name of only ? [only] : WHO) {
    const base = HABITS.find((x) => x.name === name);
    if (!base) throw new Error(`封 no habit called ${name}`);
    const hands = base.hunts > 0 ? [base, { ...base, crafts: true }] : [base];
    for (const h of process.argv[4] === 'workshop' ? hands.filter((x) => x.crafts) : hands) {
      for (const price of prices) {
        const row = sealRow({ ...h, paysSeal: price });
        rows.push(row);
        const f = (x: number) => (Number.isFinite(x) ? x.toFixed(1).padStart(5) : '    -');
        console.log(`${(row.name + (row.crafts ? ' + workshop' : '')).padEnd(26)} ${label(price).padEnd(9)} realm 9 on day ${row.realm9 !== undefined ? row.realm9.toFixed(1).padStart(6) : '     -'}`
          + `   at gates 5..8 ${row.waited.map(f).join(' ')} d   sealed ${row.sealed.map(f).join(' ')} d`);
      }
    }
  }
  // 底 A harness that reached nothing passes, so it says how many it reached and stops if
  // that is fewer than every one asked for.
  const reached = rows.filter((r) => r.realm9 !== undefined).length;
  console.log(`\n${reached} of ${rows.length} reached the ninth realm`);
  if (reached < rows.length) throw new Error(`封 only ${reached} of ${rows.length} reached the ninth realm`);
}
