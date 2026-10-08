/**
 * 宿慧 The endless road: what an Echo with no roof would do, measured and NOT built.
 *
 *     npm run echotail
 *
 * rekaris (Discord, 2026-10-08) asked for an Echo with "no cap, diminishing returns, nothing
 * is lost but it is an endless road". ECHO_CEILING (25%) is the roof the economic law asks
 * for, the server bounds every save by it (verify.ts reads echoFactor of the record), and
 * a stacked multiplier with no roof was measured earlier (2x a life cut the climb by 45%).
 * This asks the narrower question the owner needs before deciding: if the roof were a soft
 * one, a logarithmic tail past the ceiling, how far would twenty lives move the summit?
 *
 * The tail measured here is the simplest honest one. Every life gives lifeEcho(marks) as
 * now. Past the ceiling, what the lives add up to is counted in full lives (the most one
 * life gives, ECHO_LIFE_MAX each), and each doubling of that count is worth TAIL more:
 *
 *     tail = TAIL * log2(1 + (sum of lifeEcho - ECHO_CEILING) / ECHO_LIFE_MAX)
 *
 * It never ends, and every step costs twice the lives the one before it did.
 */
import { HABITS, play } from './habits.ts';
import { ECHO_CEILING, ECHO_LIFE_MAX } from '../src/sim/balance.ts';
import { echoOf, lifeEcho, type Life } from '../src/sim/echo.ts';
import { bornFrom } from '../src/sim/rebirth.ts';
import { newState, type State } from '../src/sim/state.ts';

const T0 = 1_700_000_000;
const NAMES = ['active', 'every hour', 'once a day'] as const;
const record = (n: number, marks: number): Life[] => Array.from({ length: n }, (_, i) => ({ marks, at: T0 + i }));
const pad = (s: string, n: number) => s.padEnd(n);
const pc = (x: number) => `+${(x * 100).toFixed(1)}%`;

/** The Echo of `n` lives that each ended on `marks`, with a tail worth `tail` per doubling. */
const echoWith = (n: number, marks: number, tail: number): number => {
  const raw = n * lifeEcho(marks);
  const full = Math.max(0, raw - ECHO_CEILING) / ECHO_LIFE_MAX;
  return Math.min(raw, ECHO_CEILING) + tail * Math.log2(1 + full);
};

console.log('宿慧 An Echo with a logarithmic tail past the ceiling, measured, not built');
console.log(`  today: ${pc(ECHO_CEILING)} under the ceiling, reached after 2 lives of 15 marks or 4 of 3 marks, and nothing after`);
console.log('\n1. The Echo after n lives, a tail of 1% / 2% / 3% per doubling, lives ending on 15 marks (12.5% each) or 3 marks (7.5% each)');
for (const marks of [15, 3]) {
  console.log(`   lives of ${marks} marks (${pc(lifeEcho(marks))} each)`);
  for (const n of [4, 9, 20, 40]) {
    console.log(`     ${pad(`${n} lives`, 10)} ${[0.01, 0.02, 0.03].map((t) => pad(pc(echoWith(n, marks, t)), 9)).join('')}`);
  }
}

const climbAt = (name: string, echo: number): { summit: number; done: boolean } => {
  const h = HABITS.find((x) => x.name === name)!;
  const lives = record(5, 3);
  const base = 1 + echoOf(lives);
  const start: State = { ...bornFrom(newState(T0), lives, T0, []), quarryWeek: -1, keyDay: 0 };
  const run = play(h, 400, undefined, start, (1 + echo) / base);
  return { summit: run.days, done: run.done };
};

const levels = [ECHO_CEILING, 0.28, 0.3, 0.33, 0.36, 0.4, 0.5];
console.log('\n2. Days to the summit of a reborn life at each total Echo (the first line is today\'s ceiling), and the saving on it');
console.log(`   ${pad('Echo', 8)} ${NAMES.map((n) => pad(n, 18)).join('')}`);
const table: Record<string, number[]> = {};
for (const name of NAMES) table[name] = levels.map((e) => climbAt(name, e).summit);
levels.forEach((e, i) => {
  console.log(`   ${pad(pc(e), 8)} ${NAMES.map((n) => pad(`${table[n][i].toFixed(1)} (${i ? `${table[n][i] <= table[n][0] ? '-' : '+'}${Math.abs((1 - table[n][i] / table[n][0]) * 100).toFixed(1)}%` : '  0%'})`, 18)).join('')}`);
});
console.log('   (a visit-a-day habit moves in whole visits, so its column can step backwards by a day or two.)');
console.log(`\n   Each mark's wait scales with 1 / (1 + Echo): from ${pc(ECHO_CEILING)} to ${pc(0.36)} a mark comes ${((1 - 1.25 / 1.36) * 100).toFixed(1)}% sooner, to ${pc(0.4)} ${((1 - 1.25 / 1.4) * 100).toFixed(1)}% sooner.`);
