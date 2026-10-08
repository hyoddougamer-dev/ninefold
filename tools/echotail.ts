/**
 * 宿慧 The endless road: the Echo's soft tail and its hard roof, measured. BUILT 2026-10-08.
 *
 *     npm run echotail
 *
 * rekaris (Discord, 2026-10-08) asked for an Echo with "no cap, diminishing returns, nothing
 * is lost but it is an endless road". A stacked multiplier with no roof was measured earlier
 * (2x a life cut the climb by 45%), and the server bounds every save by the Echo of its
 * record (verify.ts reads echoFactor of it), so the owner chose the form that respects the
 * economic law: the Echo keeps its 25% (ECHO_CEILING) for the first lives, exactly, and past
 * it grows as a logarithmic tail under a hard roof (ECHO_ROOF):
 *
 *     sum  = the sum of lifeEcho over the record
 *     tail = ECHO_TAIL * log2(1 + max(0, sum - ECHO_CEILING) / ECHO_LIFE_MAX)
 *     echo = min(ECHO_ROOF, min(ECHO_CEILING, sum) + tail)
 *
 * Every number is the real one (sim/echo.ts echoOf); this file only walks the climbs. It asks:
 *
 *   1. What the Echo is after n lives, and that the form here is the form in the sim.
 *   2. The days to the summit of a reborn life at 10, 20 and 40 lives of 15 marks against
 *      today's roof (the 25% every record read before), for each habit, the mean of three
 *      gear seeds because a visit-a-day habit steps in whole visits.
 *   3. The knife edge: ECHO_TAIL and ECHO_ROOF each pushed a tenth either way must slow
 *      the climb a little and wall nothing.
 *   4. The first lives: the Echo they give is the Echo they always gave, and past the
 *      ceiling it never runs ahead of the lives (how many points the tail adds, life by life).
 */
import { HABITS, play } from './habits.ts';
import { ECHO_CEILING, ECHO_LIFE_MAX, ECHO_ROOF, ECHO_TAIL, LIVES_MAX } from '../src/sim/balance.ts';
import { echoOf, lifeEcho, type Life } from '../src/sim/echo.ts';
import { bornFrom } from '../src/sim/rebirth.ts';
import { newState, type State } from '../src/sim/state.ts';

const T0 = 1_700_000_000;
const NAMES = ['active', 'every hour', 'casual', 'once a day', 'never fights'] as const;
const SEEDS = [991, 7, 1234] as const;
const record = (n: number, marks: number): Life[] => Array.from({ length: n }, (_, i) => ({ marks, at: T0 + i }));
const pad = (s: string, n: number) => s.padEnd(n);
const pc = (x: number) => `+${(x * 100).toFixed(1)}%`;
const mean = (xs: readonly number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
let failures = 0;
const check = (ok: boolean, what: string) => { if (!ok) { failures++; console.log(`  ✗ ${what}`); } };

/** The same form as sim/echo.ts, with the tail and the roof as arguments, to be pushed. */
const echoWith = (n: number, marks: number, tail: number, roof: number): number => {
  const sum = n * lifeEcho(marks);
  return Math.min(roof, Math.min(ECHO_CEILING, sum) + (sum > ECHO_CEILING ? tail * Math.log2(1 + (sum - ECHO_CEILING) / ECHO_LIFE_MAX) : 0));
};

console.log('宿慧 The Echo\'s soft tail and hard roof, measured');
console.log(`  quick to ${pc(ECHO_CEILING)}, then ${pc(ECHO_TAIL)} for every doubling of the full lives past it, never past ${pc(ECHO_ROOF)}; ${LIVES_MAX} lives remembered`);

// ── 1. The Echo after n lives ───────────────────────────────────────────────────────────
console.log('\n1. The Echo after n lives of 15 marks (12.5% each) or of 3 marks (7.5% each), and the roof a tenth either side');
console.log(`   ${pad('lives', 7)} ${pad('15 marks', 10)} ${pad('tail -10%', 11)} ${pad('tail +10%', 11)} ${pad('roof -10%', 11)} ${pad('roof +10%', 11)} ${pad('3 marks', 9)}`);
for (const n of [2, 4, 9, 10, 20, 33, 40]) {
  const e = echoOf(record(n, 15));
  check(Math.abs(e - echoWith(n, 15, ECHO_TAIL, ECHO_ROOF)) < 1e-12, `${n} lives: the harness form is the sim's form`);
  console.log(`   ${pad(String(n), 7)} ${pad(pc(e), 10)} ${pad(pc(echoWith(n, 15, ECHO_TAIL * 0.9, ECHO_ROOF)), 11)} ${pad(pc(echoWith(n, 15, ECHO_TAIL * 1.1, ECHO_ROOF)), 11)} ${pad(pc(echoWith(n, 15, ECHO_TAIL, ECHO_ROOF * 0.9)), 11)} ${pad(pc(echoWith(n, 15, ECHO_TAIL, ECHO_ROOF * 1.1)), 11)} ${pad(pc(echoOf(record(n, 3))), 9)}`);
}
check(echoOf(record(LIVES_MAX, 15)) === ECHO_ROOF, 'the longest record reads exactly the roof');
let reach = 0;
while (reach < LIVES_MAX && echoOf(record(reach, 15)) < ECHO_ROOF) reach++;
console.log(`   The roof is reached at ${reach} lives of 15 marks (${reach} of the ${LIVES_MAX} a save remembers).`);

// ── 2. Days to the summit ───────────────────────────────────────────────────────────────
interface Walk { readonly summit: number; readonly done: boolean }
const cache = new Map<string, Walk>();
/** A reborn life that carries `echo` (as a total Echo), walked on one gear seed. */
const climb = (name: string, seed: number, echo: number): Walk => {
  const key = `${name}#${seed}@${echo.toFixed(5)}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const habit = { ...HABITS.find((x) => x.name === name)!, seed };
  // The life is born with five lives of 3 marks so it is a reborn one; the gain moves its
  // Echo from what that record reads to the Echo asked for.
  const lives = record(5, 3);
  const start: State = { ...bornFrom(newState(T0), lives, T0, []), quarryWeek: -1, keyDay: 0 };
  const run = play(habit, 400, undefined, start, (1 + echo) / (1 + echoOf(lives)));
  const out = { summit: run.days, done: run.done };
  cache.set(key, out);
  return out;
};
const summit = (name: string, echo: number): number => {
  const walks = SEEDS.map((seed) => climb(name, seed, echo));
  check(walks.every((w) => w.done), `${name} at ${pc(echo)}: every seed reaches the summit`);
  return mean(walks.map((w) => w.summit));
};

console.log('\n2. Days to the summit of a reborn life: today\'s roof (+25%) against 10, 20 and 40 lives of 15 marks');
console.log(`   mean of ${SEEDS.length} gear seeds; the saving on +25% in brackets`);
const counts = [10, 20, 40] as const;
console.log(`   ${pad('habit', 13)} ${pad(`${pc(ECHO_CEILING)} (today)`, 16)} ${counts.map((n) => pad(`${n} lives ${pc(echoOf(record(n, 15)))}`, 24)).join('')}`);
const base: Record<string, number> = {};
const longest: Record<string, number> = {};
for (const name of NAMES) {
  const today = summit(name, ECHO_CEILING);
  base[name] = today;
  const cells = counts.map((n) => {
    const d = summit(name, echoOf(record(n, 15)));
    if (n === 40) longest[name] = d;
    check(d <= today + 2, `${name}: ${n} lives are not slower than the roof they used to meet`);
    check(d >= today * 0.9, `${name}: ${n} lives save no more than a tenth of the summit`);
    return pad(`${d.toFixed(1)} (-${((1 - d / today) * 100).toFixed(1)}%)`, 24);
  });
  console.log(`   ${pad(name, 13)} ${pad(today.toFixed(1), 16)} ${cells.join('')}`);
}
console.log('   (a visit-a-day habit moves in whole visits, so its column can step by a day or two.)');
console.log(`   A mark's wait scales with 1 / (1 + Echo): from ${pc(ECHO_CEILING)} to ${pc(echoOf(record(20, 15)))} a mark comes ${((1 - (1 + ECHO_CEILING) / (1 + echoOf(record(20, 15)))) * 100).toFixed(1)}% sooner, to ${pc(ECHO_ROOF)} ${((1 - (1 + ECHO_CEILING) / (1 + ECHO_ROOF)) * 100).toFixed(1)}% sooner.`);

// ── 3. The knife edge ───────────────────────────────────────────────────────────────────
console.log('\n3. The knife edge: 40 lives of 15 marks, ECHO_TAIL and ECHO_ROOF each pushed a tenth either way (summit days)');
console.log(`   ${pad('habit', 13)} ${pad('built', 14)} ${pad('tail -10%', 14)} ${pad('tail +10%', 14)} ${pad('roof -10%', 14)} ${pad('roof +10%', 14)}`);
for (const name of NAMES) {
  const built = summit(name, echoWith(40, 15, ECHO_TAIL, ECHO_ROOF));
  const pushes = [
    echoWith(40, 15, ECHO_TAIL * 0.9, ECHO_ROOF), echoWith(40, 15, ECHO_TAIL * 1.1, ECHO_ROOF),
    echoWith(40, 15, ECHO_TAIL, ECHO_ROOF * 0.9), echoWith(40, 15, ECHO_TAIL, ECHO_ROOF * 1.1),
  ].map((e) => ({ e, d: summit(name, e) }));
  console.log(`   ${pad(name, 13)} ${pad(built.toFixed(1), 14)} ${pushes.map((p) => pad(`${p.d.toFixed(1)} (${(p.d - built >= 0 ? '+' : '') + (p.d - built).toFixed(1)})`, 14)).join('')}`);
  for (const p of pushes) {
    // A tenth on a tail or a roof is a point or three of Echo: a few days of summit either way,
    // never a cliff, and never slower than the roof the lives used to meet.
    check(Math.abs(p.d - built) <= built * 0.1, `${name}: a tenth on the tail or the roof moves the summit smoothly (${(p.d - built).toFixed(1)} days)`);
    check(p.d <= base[name] + 2, `${name}: pushed, 40 lives are not slower than today's roof`);
  }
}

// ── 4. The first lives ──────────────────────────────────────────────────────────────────
console.log('\n4. Life by life: the Echo each life is born with, before (the old 25% roof) and after, lives ending on marks 1 / 3 / 7 / 15');
const oldEcho = (lives: readonly Life[]) => Math.min(ECHO_CEILING, lives.reduce((n, l) => n + lifeEcho(l.marks), 0));
let ahead = 0;
for (const marks of [1, 3, 7, 15]) {
  const row: string[] = [];
  for (const n of [1, 2, 3, 4, 5, 6, 9, 12]) {
    const lives = record(n, marks);
    const was = oldEcho(lives);
    const now = echoOf(lives);
    check(was < ECHO_CEILING - 1e-12 ? now === was : now >= was, `${n} lives of ${marks} marks: the first lives read exactly what they read`);
    ahead = Math.max(ahead, now - was);
    row.push(`${n}:${pc(now).slice(1)}${now - was > 1e-12 ? `(+${((now - was) * 100).toFixed(1)})` : ''}`);
  }
  console.log(`   ${pad(`mark ${marks}`, 8)} ${row.join('  ')}`);
}
console.log(`   Up to twelve lives the tail has added ${(ahead * 100).toFixed(1)} points at the most to what the old roof read.`);
// 6 lives is the longest the earlier measurement (npm run rebirth, section 1) walked: what the tail adds there.
for (const name of NAMES) {
  const lives = record(5, 3);
  const was = summit(name, oldEcho(lives));
  const now = summit(name, echoOf(lives));
  console.log(`   ${pad(name, 13)} life 6 on mark-3 lives: ${pc(oldEcho(lives))} -> ${pc(echoOf(lives))}, summit ${was.toFixed(1)} -> ${now.toFixed(1)} days (${(now - was >= 0 ? '+' : '') + (now - was).toFixed(1)})`);
  check(now >= was - 3, `${name}: life 6 is not sooner than the earlier measurement allowed by more than a few days`);
}

console.log(failures ? `\n✗ ${failures} checks failed` : '\n✓ the tail slows the climb a little, the roof walls nothing, and the first lives are what they were');
if (failures) process.exit(1);
