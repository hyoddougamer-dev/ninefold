/**
 * 擂 What the Platform and the week's quarry pay, traced through every habit.
 *
 * rekaris (Discord, 2026-10-05): a challenger pays hours of the cultivator's own gathering,
 * so the same challenger in the same realm pays more to whoever bought rate first and fought
 * late in the realm, and the Platform resets at a breakthrough anyway. The same was said of
 * the tower, which now pays a fixed sum read off the floor (floorQiPay). This prints the
 * question for the Platform and the quarry the way towerpay.ts prints it for the tower:
 *
 *   1. per realm, the bare rate (nothing worn) a challenger can be paid at, from the first
 *      rung with the last realm's caps to the last rung with this realm's, against the rate
 *      at the middle of the realm's caps and rungs (the reference rekaris proposed);
 *   2. per habit, the ninth realm's day, the Platform's and the quarry's share of every unit
 *      of qi, and every challenger's and quarry's pay against that reference (min, median,
 *      max, and the whole sum against the whole reference);
 *   3. per habit and realm, how much the third challenger's pay grows from the first visit
 *      of the realm to the last: what waiting buys.
 *
 * Since 2026-10-05 both pay a fixed sum off that reference (PLATFORM_HOURS and QUARRY_HOURS of
 * midRate), so every ratio in the second table reads 1.00 and every growth in the third and
 * fourth reads x1.00 inside a realm: the table is what proves the pay no longer moves.
 *
 * The harness is chaotic: one warden won a visit earlier moves a habit a day or two. So
 * SEEDS=991,7,13 plays each habit on several drop and fight dice and prints the mean, which
 * is what a change to the pay has to be read against. 991 alone is the default.
 *
 * Run with `npx tsx tools/platformpay.ts` (ONLY=casual,active to narrow it).
 */
import { AUTO_HABIT, HABITS, play, type Run } from './habits.ts';
import { PLATFORM_HOURS, PLATFORM_REALM, challengerPays, periodNow } from '../src/sim/platform.ts';
import { quarryPaid } from '../src/sim/combat.ts';
import { quarryOf, weekOf } from '../src/sim/week.ts';
import {
  BASE_RATE, LAYER_BONUS, LAYERS_PER_REALM, LEVELS_PER_REALM, QUARRY_HOURS, UPGRADE_NUMBERS, ladderAt, midRate,
} from '../src/sim/balance.ts';
import { classBounty } from '../src/sim/schools.ts';
import type { State } from '../src/sim/state.ts';

const names = [...HABITS.map((h) => h.name), AUTO_HABIT.name];
const habitOf = (n: string) => (n === AUTO_HABIT.name ? AUTO_HABIT : HABITS.find((h) => h.name === n)!);
const pct = (a: number, b: number) => (b > 0 ? (100 * a) / b : 0).toFixed(1).padStart(5);
const REALMS = [4, 5, 6, 7, 8, 9].filter((r) => r >= PLATFORM_REALM);

/** The bare rate on a rung with both qi upgrades at a level: what towerRate reads, with no tree or marks. */
export function bareRate(rung: number, level: number): number {
  return BASE_RATE * LAYER_BONUS ** rung * (UPGRADE_NUMBERS.method.gain * UPGRADE_NUMBERS.pills.gain) ** level;
}

/** 中 rekaris's reference, which the Platform and the quarry now pay off (midRate in balance.ts). */
export { midRate };

export interface Trace {
  readonly name: string;
  /** One run per seed. */
  readonly runs: readonly Run[];
  /** Per realm, the third challenger's pay on the first and the last visit spent in it (first seed). */
  readonly span: Record<number, { firstPay: number; lastPay: number }>;
  /**
   * The same, inside one Platform period (a week and a realm) and one quarry week in one realm: what a
   * cultivator could have been paid by waiting for the last visit of the period instead of
   * fighting on the first. Only the period's own challengers and quarry can be waited on.
   */
  readonly periods: { readonly platform: number[]; readonly quarry: number[] };
}

export function measure(only?: readonly string[], seeds: readonly (number | undefined)[] = [undefined]): Trace[] {
  return names.filter((n) => !only || only.includes(n)).map((name) => {
    const span: Trace['span'] = {};
    const byPeriod = new Map<number, [number, number]>();
    const byWeek = new Map<number, [number, number]>();
    const note = (m: Map<number, [number, number]>, k: number, v: number) => {
      const e = m.get(k);
      if (e) e[1] = v; else m.set(k, [v, v]);
    };
    const runs = seeds.map((seed, i) => {
      const watch = i > 0 ? undefined : (_day: number, s: State) => {
        const q = quarryOf(s);
        if (q && s.realm >= PLATFORM_REALM) note(byWeek, weekOf(s.at) * 16 + s.realm, quarryPaid(s, q));
        if (s.realm < PLATFORM_REALM) return;
        const pay = challengerPays(s, 2);
        const r = (span[s.realm] ??= { firstPay: pay, lastPay: 0 });
        r.lastPay = pay;
        note(byPeriod, periodNow(s), pay);
      };
      const h = habitOf(name);
      return play(seed === undefined ? h : { ...h, seed }, 400, watch);
    });
    const grow = (m: Map<number, [number, number]>) => [...m.values()].map(([a, b]) => b / a);
    return { name, runs, span, periods: { platform: grow(byPeriod), quarry: grow(byWeek) } };
  });
}

const median = (xs: number[]) => {
  const v = [...xs].sort((a, b) => a - b);
  return v.length ? v[Math.floor(v.length / 2)] : NaN;
};
const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / Math.max(1, xs.length);
const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

export function report(traces: readonly Trace[]): string {
  const out: string[] = [];
  out.push('realm  bare low (r-1 caps, rung 0)  mid (caps-3, rung 4)  high (caps, rung 8)  high/low  mid in rungs');
  for (const r of REALMS) {
    const lo = bareRate((r - 1) * LAYERS_PER_REALM, (r - 1) * LEVELS_PER_REALM);
    const hi = bareRate((r - 1) * LAYERS_PER_REALM + LAYERS_PER_REALM - 1, r * LEVELS_PER_REALM);
    const mid = midRate(r);
    const rung = ladderAt((r - 1) * LAYERS_PER_REALM + 4);
    out.push(`  ${r}    ${lo.toExponential(2).padStart(10)}                ${mid.toExponential(2).padStart(10)}            `
      + `${hi.toExponential(2).padStart(10)}       x${(hi / lo).toFixed(1).padStart(4)}   1h = ${(mid * 3600 / rung).toFixed(3)} rung`);
  }
  out.push('');
  out.push(`seeds: ${traces[0]?.runs.map((r) => r.habit.seed ?? 991).join(', ')} (days and shares are means over them)`);
  out.push('habit             day9   done  platform%  quarry%  bouts       pay / (hours x mid): min   med   max   all'
    + '    quarry / (hours x mid): min   med   max   all');
  for (const { name, runs } of traces) {
    const beats = runs.flatMap((run) => run.beats.map((b) => ({ ...b, ref: PLATFORM_HOURS[b.tier] * 3600 * midRate(b.realm)
      * classBounty(run.state) })));
    const quarries = runs.flatMap((run) => run.quarries.filter((q) => q.realm >= PLATFORM_REALM)
      .map((q) => ({ ...q, ref: QUARRY_HOURS * 3600 * midRate(q.realm) * classBounty(run.state) })));
    const ratios = beats.map((b) => b.paid / b.ref);
    const qr = quarries.map((q) => q.paid / q.ref);
    const f = (x: number) => (Number.isFinite(x) ? x.toFixed(2) : '  - ').padStart(5);
    const bouts = [0, 1, 2].map((t) => mean(runs.map((r) => r.bouts[t])).toFixed(0)).join('/');
    out.push(`${name.padEnd(16)} ${mean(runs.map((r) => r.arrival[8] ?? NaN)).toFixed(1).padStart(5)}`
      + `  ${mean(runs.map((r) => r.days)).toFixed(1).padStart(5)}`
      + `    ${pct(mean(runs.map((r) => r.qi.platform / r.qi.gained)), 1)}    ${pct(mean(runs.map((r) => r.qi.quarry / r.qi.gained)), 1)}`
      + `  ${bouts.padStart(8)}                        ${f(Math.min(...ratios))} ${f(median(ratios))} ${f(Math.max(...ratios))}`
      + ` ${f(sum(beats.map((b) => b.paid)) / sum(beats.map((b) => b.ref)))}`
      + `                         ${f(Math.min(...qr))} ${f(median(qr))} ${f(Math.max(...qr))}`
      + ` ${f(sum(quarries.map((q) => q.paid)) / sum(quarries.map((q) => q.ref)))}`);
  }
  out.push('');
  out.push('habit             third challenger, last visit of the realm / first visit (what waiting buys)');
  out.push(`                  ${REALMS.map((r) => `r${r}`.padStart(7)).join('')}`);
  for (const { name, span } of traces) {
    out.push(`${name.padEnd(16)}  ${REALMS.map((r) => (span[r] ? `x${(span[r].lastPay / span[r].firstPay).toFixed(2)}` : '-').padStart(7)).join('')}`);
  }
  out.push('');
  out.push('habit             inside one period: last visit / first visit, median and max over periods (realm 4 on)');
  out.push('                  Platform (third)       quarry (a week in a realm)');
  for (const { name, periods } of traces) {
    const g = (xs: number[]) => (xs.length ? `x${median(xs).toFixed(2)}  x${Math.max(...xs).toFixed(2)}` : '-').padEnd(23);
    out.push(`${name.padEnd(16)}  ${g(periods.platform)}${g(periods.quarry)}`);
  }
  return out.join('\n');
}

if (process.argv[1]?.endsWith('platformpay.ts')) {
  const only = process.env.ONLY ? process.env.ONLY.split(',') : undefined;
  const seeds = process.env.SEEDS ? process.env.SEEDS.split(',').map(Number) : [undefined];
  console.log(report(measure(only, seeds)));
}
