/**
 * 塔 What the tower pays, traced through every habit and the endgame.
 *
 * Rekaris and speculaether (Discord, 2026-10-05): a floor's qi depended on the climber's
 * own gathering and realm, so it paid more to whoever bought rate first and less to whoever
 * climbed early or high. This prints what the pay does to the climb: the tower's share of
 * every realm's qi, the biggest single visit, the ninth realm's day and the endgame, so the
 * next change to the pay is measured the same way. Run with `npx tsx tools/towerpay.ts`.
 */
import { AUTO_HABIT, HABITS, play, type Run } from './habits.ts';
import { playEndgame } from './endgame.ts';

const pct = (a: number, b: number) => (b > 0 ? (100 * a) / b : 0).toFixed(1).padStart(5);
const names = [...HABITS.map((h) => h.name), AUTO_HABIT.name];
const habitOf = (n: string) => (n === AUTO_HABIT.name ? AUTO_HABIT : HABITS.find((h) => h.name === n)!);

export function measure(only?: readonly string[]): Run[] {
  return names.filter((n) => !only || only.includes(n)).map((n) => play(habitOf(n), 400));
}

export function report(runs: readonly Run[]): string {
  const out: string[] = [];
  out.push('habit             day9  r5 share  big h  big rungs   r6    r7    r8    r9   whole  biggest anywhere (rungs)');
  for (const r of runs) {
    const t = r.tower;
    const nine = r.arrival[8];
    const shares = [6, 7, 8, 9].map((k) => pct(t.byRealm[k], t.gained[k])).join(' ');
    const whole = pct(t.qi, r.qi.gained);
    out.push(`${r.habit.name.padEnd(16)} ${(nine ?? NaN).toFixed(1).padStart(5)}  ${pct(t.byRealm[5], t.gained[5])}   `
      + `${t.biggest[5].hours.toFixed(1).padStart(6)}  ${t.biggest[5].rungs.toFixed(2).padStart(6)}   ${shares}  ${whole}  `
      + `${Math.max(...t.biggest.map((b) => b.rungs)).toFixed(2)} (realm ${t.biggest.findIndex((b) => b.rungs === Math.max(...t.biggest.map((x) => x.rungs)))})`);
  }
  return out.join('\n');
}

if (process.argv[1]?.endsWith('towerpay.ts')) {
  const only = process.env.ONLY ? process.env.ONLY.split(',') : undefined;
  const runs = measure(only);
  console.log(report(runs));
  if (process.env.ENDGAME !== '0') {
    for (const [m, heavier] of [[40, 1], [80, 1], [80, 1.1]] as const) {
      const e = playEndgame(m, 'pill', undefined, heavier);
      const total = e.days.reduce((a, b) => a + b, 0);
      console.log(`endgame ${m}${heavier !== 1 ? ' x1.1' : ''}: ${total} days, slowest ${Math.max(...e.days)}, floor ${e.end.tower}`);
    }
  }
}
