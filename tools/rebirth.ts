/**
 * 轉世 The rebirth harness: lives one to six, for every habit, with the Echo each one carries.
 *
 *     npm run rebirth
 *
 * Bruno: *"from a certain realm onward you can reset, but the benefit of the reset depends
 * on how far ahead you are."* The design is in sim/rebirth.ts and the numbers in
 * balance.ts; this is where they are measured, and docs/DRAWER.md (轉世) is where they are
 * written down. It answers five questions:
 *
 *   1. How much faster is each life than the first, for every habit, when every life ends
 *      on its third mark (the policy the table is read on)?
 *   2. After how many lives does each habit reach the ceiling, ending each life on its
 *      first, third or seventh mark?
 *   3. The honest net: what a rebirth costs in days against staying and crossing marks.
 *   4. The knife edge: an Echo a tenth past the ceiling must slow nothing and wall nothing.
 *   5. The law: no life may be faster than the ceiling's own arithmetic allows.
 *
 * A climb depends on the Echo and on nothing else the record holds, so each habit's climb
 * is walked once per Echo and reused by every policy that reaches the same Echo.
 */
import { HABITS, play, type Habit, type Run } from './habits.ts';
import { arrivalOf, playEndgame } from './endgame.ts';
import { ECHO_CEILING, ECHO_LIFE_MAX, ECHO_STEP, LIVES_MAX, REBIRTH_MARKS } from '../src/sim/balance.ts';
import { echoOf, lifeEcho, type Life } from '../src/sim/echo.ts';
import { bornFrom } from '../src/sim/rebirth.ts';
import { newState, type State } from '../src/sim/state.ts';

const T0 = 1_700_000_000;
const NAMES = ['active', 'every hour', 'casual', 'once a day', 'never fights'] as const;
const POLICIES = [1, 3, 7] as const;
/** The policy the main table is read on: every life ends on its third mark. */
const MAIN = 3;
const SHOW = 6;

const habitOf = (name: string): Habit => {
  const h = HABITS.find((x) => x.name === name);
  if (!h) throw new Error(`no habit called ${name}`);
  return h;
};

/** A record of `n` lives that each ended on `marks`. */
const record = (n: number, marks: number): Life[] => Array.from({ length: n }, (_, i) => ({ marks, at: T0 + i }));

/**
 * A reborn cultivator at T0 carrying `lives`. The forward-only counters are cleared because
 * the harness restarts its clock at T0, and a week index from the end of the last walk would
 * stand in this one's future; nothing else a life carries moves a curve.
 */
const reborn = (lives: Life[]): State => ({ ...bornFrom(newState(T0), lives, T0), quarryWeek: -1, keyDay: 0 });

interface Life1 { readonly echo: number; readonly run: Run; readonly r9: number; readonly summit: number; readonly done: boolean }
const climbs = new Map<string, Life1>();
/** One habit's climb at one Echo, walked once. `gain` pushes the Echo past what lives can give. */
function climbAt(name: string, lives: Life[], gain = 1): Life1 {
  const echo = (1 + echoOf(lives)) * gain - 1;
  const key = `${name}@${echo.toFixed(4)}`;
  const hit = climbs.get(key);
  if (hit) return hit;
  const run = play(habitOf(name), 400, undefined, lives.length ? reborn(lives) : undefined, gain);
  const out = { echo, run, r9: run.arrival[8] ?? Infinity, summit: run.days, done: run.done };
  climbs.set(key, out);
  return out;
}

const ends = new Map<string, number[]>();
/** Days from the summit to each mark, on the run's own cultivator. */
function marksAfter(name: string, c: Life1, marks: number): number[] {
  const key = `${name}@${c.echo.toFixed(4)}`;
  const had = ends.get(key);
  if (had && had.length >= marks) return had.slice(0, marks);
  const e = playEndgame(marks, 'pill', arrivalOf(c.run.state));
  let t = 0;
  const days = e.days.map((d) => (t += d));
  ends.set(key, days);
  return days;
}

const f1 = (x: number) => x.toFixed(1).padStart(5);
const pc = (x: number) => `+${(x * 100).toFixed(1)}%`.padStart(7);
const pad = (s: string, n: number) => s.padEnd(n);
let failures = 0;
const check = (ok: boolean, what: string) => {
  if (!ok) { failures++; console.log(`  ✗ ${what}`); }
};

console.log('轉世 Rebirth, measured');
console.log(`  unlock: the summit and ${REBIRTH_MARKS} mark crossed. A life's Echo is ${pc(ECHO_STEP).trim()} for every doubling of its marks,`);
console.log(`  at most ${pc(ECHO_LIFE_MAX).trim()} a life, ${pc(ECHO_CEILING).trim()} across every life, ${LIVES_MAX} lives remembered.`);
console.log(`  a life ending on 1 / 3 / 7 / 15 / 31 marks leaves ${[1, 3, 7, 15, 31].map((m) => pc(lifeEcho(m)).trim()).join(' / ')}`);

// ── 1. Lives one to six, every life ending on its third mark ────────────────────────────
console.log(`\n1. Lives 1 to ${SHOW}, every life ending on mark ${MAIN}: days to realm 9 / the summit / mark ${MAIN}`);
console.log(`   ${pad('habit', 13)} ${Array.from({ length: SHOW }, (_, i) => pad(`life ${i + 1}`, 21)).join('')}`);
let rows = 0;
const table: Record<string, { echo: number; r9: number; summit: number; life: number }[]> = {};
for (const name of NAMES) {
  const line: string[] = [];
  table[name] = [];
  for (let n = 0; n < SHOW; n++) {
    const c = climbAt(name, record(n, MAIN));
    const m = marksAfter(name, c, MAIN);
    const life = c.summit + m[MAIN - 1];
    table[name].push({ echo: c.echo, r9: c.r9, summit: c.summit, life });
    line.push(pad(`${c.r9.toFixed(0)}/${c.summit.toFixed(0)}/${life.toFixed(0)} ${pc(c.echo).trim()}`, 21));
    check(c.done, `${name}, life ${n + 1}: reaches the summit`);
    rows++;
  }
  console.log(`   ${pad(name, 13)} ${line.join('')}`);
}
check(rows === NAMES.length * SHOW, `the table holds ${NAMES.length * SHOW} lives (it held ${rows})`);
console.log('   (each cell: realm 9 day / summit day / mark-three day, and the Echo that life carried)');

console.log('\n   The same, as what each life saves on the first (summit day):');
for (const name of NAMES) {
  const t = table[name];
  const first = t[0].summit;
  console.log(`   ${pad(name, 13)} ${t.map((x, i) => pad(`L${i + 1} ${f1(x.summit)} (${i ? `-${((1 - x.summit / first) * 100).toFixed(0)}%` : '  0%'})`, 21)).join('')}`);
  // 5. The law: every life is faster than the first, and none faster than the Echo itself.
  for (let i = 1; i < t.length; i++) {
    check(t[i].summit <= t[i - 1].summit + 1, `${name}: life ${i + 1} is not slower than life ${i}`);
    check(t[i].summit >= first / (1 + ECHO_CEILING) - 1, `${name}: life ${i + 1} saves no more than the ceiling's arithmetic (${f1(first / (1 + ECHO_CEILING))} days)`);
  }
  check(t[t.length - 1].summit < first, `${name}: a life at the ceiling is measurably faster than the first`);
}

// ── 2. Lives to the ceiling ─────────────────────────────────────────────────────────────
console.log('\n2. When the ceiling is reached: the first life to carry the whole Echo, and the calendar to its start');
for (const k of POLICIES) {
  let n = 0;
  while (n < LIVES_MAX && echoOf(record(n, k)) < ECHO_CEILING - 1e-9) n++;
  const reaches = echoOf(record(n, k)) >= ECHO_CEILING - 1e-9;
  if (!reaches) {
    console.log(`   ending on mark ${k}: never. ${LIVES_MAX} lives remembered give ${pc(echoOf(record(LIVES_MAX, k))).trim()}: rushing the first Dragon over and over is not the way to it.`);
    continue;
  }
  const cells = NAMES.map((name) => {
    let days = 0;
    for (let i = 0; i < n; i++) {
      const c = climbAt(name, record(i, k));
      days += c.summit + marksAfter(name, c, k)[k - 1];
    }
    return `${name} ${days.toFixed(0)}d`;
  });
  console.log(`   ending on mark ${k}: life ${n + 1} carries ${pc(ECHO_CEILING).trim()}, after ${n} lives: ${cells.join(', ')}`);
}

// ── 3. The honest net ───────────────────────────────────────────────────────────────────
console.log(`\n3. The honest net, at mark ${MAIN}: what one rebirth costs against staying`);
for (const name of NAMES) {
  const one = climbAt(name, []);
  const stay = marksAfter(name, one, 40);
  const at = stay[MAIN - 1];
  const back = table[name][1].life;
  const passed = stay.filter((d) => d <= at + back).length;
  const echo = table[name][1].echo;
  console.log(`   ${pad(name, 13)} back at mark ${MAIN} after ${back.toFixed(0)} days, Echo ${pc(echo).trim()}; staying, those days reach mark ${passed}${passed >= 40 ? '+' : ''}`);
}
console.log('   The endgame is a clock, so a rebirth always costs marks. What it gives instead: the Echo for every life after,');
console.log('   a title, the nine realms climbed again with what this game has become, and the records already on the boards.');

// ── 4. The knife edge ───────────────────────────────────────────────────────────────────
const over = 1.1;
console.log(`\n4. The knife edge: the ceiling pushed ${Math.round((over - 1) * 100)}% higher (${pc(ECHO_CEILING * over).trim()}), summit days`);
for (const name of NAMES) {
  const at = climbAt(name, record(SHOW - 1, MAIN));
  const past = climbAt(name, record(SHOW - 1, MAIN), (1 + ECHO_CEILING * over) / (1 + ECHO_CEILING));
  const none = table[name][0].summit;
  console.log(`   ${pad(name, 13)} none ${f1(none)}   ${pc(at.echo).trim()} ${f1(at.summit)}   ${pc(past.echo).trim()} ${f1(past.summit)}   (${(past.summit - at.summit).toFixed(1)} days)`);
  check(past.done, `${name}: still reaches the summit with the ceiling ${Math.round((over - 1) * 100)}% higher`);
  check(past.summit <= at.summit + 1, `${name}: a higher ceiling does not wall (slower by more than a day)`);
  check(at.summit - past.summit <= (at.summit * 0.1), `${name}: a higher ceiling moves the climb smoothly, not past a cliff`);
}

console.log(failures ? `\n✗ ${failures} checks failed` : '\n✓ every life reaches the summit, each is faster than the last within the ceiling, and the edge is smooth');
if (failures) process.exit(1);
