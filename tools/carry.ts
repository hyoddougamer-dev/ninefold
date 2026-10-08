/**
 * 業 The workshop through a rebirth, measured: what a new life keeps of its crafts.
 *
 *     npm run carry
 *
 * rekaris (Discord, 2026-10-08): the crafts are a thick part of the time spent, and running
 * them all again after a rebirth sounds exhausting. Before this a new life began every craft
 * at level 1. CRAFT_CARRY (balance.ts) is the share of each craft's experience a new life
 * begins with, and this is where it is measured, and where the numbers in docs/DRAWER.md
 * (轉世) come from. It answers these questions:
 *
 *   1. What does re-crafting cost? The days a life takes to bring its slowest craft to
 *      level 60, 70 and 75, with nothing carried (the first life), against with CRAFT_CARRY.
 *   2. Does it trivialise the climb? Life 2's days to realm 9 and the summit with the carry
 *      and without it, over three gear seeds, then for every habit played as a crafter, then
 *      lives 1 to 6. The Echo is the climb's bonus; the carry must add nothing to it.
 *   3. Does it raise the qi rate? The rate at the same day, with and without. It must not.
 *   4. The knife edge: the share pushed a tenth either way must slow the saving a little
 *      and wall nothing.
 *
 * The workshop only touches the climb through the kit it makes (tools/crafter.ts), so the
 * habits that do not craft cannot be moved by it. The rest are played as crafters here
 * (`crafts: true`), which is the only honest way to ask what the carry does to them.
 * Each life ends on its third mark, as in tools/rebirth.ts: the experience it carries is
 * what the crafter held at that instant, summit and the endgame's days to the third mark.
 *
 * A walk is minutes of CPU, so the walks run in separate processes, four at a time.
 */
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { HABITS, play, type Habit } from './habits.ts';
import { arrivalOf, playEndgame } from './endgame.ts';
import { SKILL_KEYS, levelOf } from '../src/data/crafts.ts';
import { CRAFT_CARRY } from '../src/sim/balance.ts';
import { echoOf, type Life } from '../src/sim/echo.ts';
import { NO_CRAFTS, carriedXp } from '../src/sim/crafts.ts';
import { bornFrom } from '../src/sim/rebirth.ts';
import { newState, rate, type State } from '../src/sim/state.ts';

const T0 = 1_700_000_000;
const MARKS = 3;
const FILE = fileURLToPath(import.meta.url);
/** The days a detailed life is watched for, past the summit: long enough for level 75 in every craft. */
const WATCH = 135;
const CHECKPOINTS = [0, 10, 30, 60] as const;
const LEVELS = [60, 70, 75] as const;

type Xp = Record<(typeof SKILL_KEYS)[number], number>;

interface Job {
  readonly habit: string;
  readonly share: number;
  readonly seed: number;
  /** How many lives to walk: 1 is the first alone. */
  readonly lives: number;
  /** Which lives are watched for WATCH days (their levels read day by day). */
  readonly watch: readonly number[];
}

interface LifeOut {
  readonly life: number;
  readonly echo: number;
  readonly summit: number;
  readonly r9: number;
  readonly done: boolean;
  /** The day the life's third mark falls: summit plus the endgame's days to it. */
  readonly end: number;
  readonly born: number[];
  /** Levels of the seven crafts, the tools held (0 to 42), and the qi rate, at the checkpoints. */
  readonly at: Record<number, { readonly lv: number[]; readonly tools: number; readonly rate: number }>;
  /** For a watched life: the first day each craft was at each level (Infinity when it never was). */
  readonly daysTo?: Record<number, number[]>;
}

const habitOf = (name: string, seed: number): Habit => {
  const h = HABITS.find((x) => x.name === name);
  if (!h) throw new Error(`no habit called ${name}`);
  return { ...h, crafts: true, seed };
};

const xpList = (xp: Xp) => SKILL_KEYS.map((k) => xp[k]);
const xpOfList = (l: readonly number[]): Xp => Object.fromEntries(SKILL_KEYS.map((k, i) => [k, l[i]])) as Xp;

/** One life's walk, then the days past the summit to its third mark (or to WATCH when watched). */
function walkLife(h: Habit, start: State | undefined, watched: boolean, echo: number): LifeOut & { xpEnd: number[] } {
  const at: LifeOut['at'] = {};
  const perDay: { lv: number[]; xp: number[] }[] = [];
  const note = (offset: number) => (day: number, s: State) => {
    const d = Math.floor(day) + offset;
    if (!perDay[d]) perDay[d] = { lv: SKILL_KEYS.map((k) => levelOf(s.crafts.xp[k])), xp: xpList(s.crafts.xp) };
    if ((CHECKPOINTS as readonly number[]).includes(d) && !at[d]) {
      at[d] = { lv: perDay[d].lv, tools: SKILL_KEYS.reduce((n, k) => n + (s.crafts.tools[k] ?? 0), 0), rate: rate(s) };
    }
  };
  const run = play(h, 400, note(0), start);
  const summit = run.days;
  const tail = playEndgame(MARKS, 'pill', arrivalOf(run.state)).days.reduce((a, b) => a + b, 0);
  const end = summit + tail;
  // The same cultivator played on past the summit: the workshop does not stop for the Dragon.
  const more = Math.ceil(watched ? Math.max(WATCH - summit, tail) : tail) + 1;
  const after = play({ ...h, on: true }, more, note(Math.floor(summit)), run.state);
  const day = Math.min(perDay.length - 1, Math.floor(end));
  const xpEnd = perDay[day]?.xp ?? xpList(after.state.crafts.xp);
  let daysTo: Record<number, number[]> | undefined;
  if (watched) {
    daysTo = {};
    for (const L of LEVELS) {
      daysTo[L] = SKILL_KEYS.map((_, i) => {
        const d = perDay.findIndex((p) => p && p.lv[i] >= L);
        return d < 0 ? Infinity : d;
      });
    }
  }
  return { life: 0, echo, summit, r9: run.arrival[8] ?? Infinity, done: run.done, end, born: [],
    at, daysTo, xpEnd };
}

/** A reborn cultivator at T0: the Echo of `lives`, and `share` of the experience the last life ended with. */
function reborn(lives: Life[], xpPrev: readonly number[], share: number): State {
  const prev: State = { ...newState(T0), crafts: { ...NO_CRAFTS, xp: xpOfList(xpPrev) } };
  const born = bornFrom(prev, lives, T0, []);
  // The harness restarts its clock at T0, so a week index from the last walk would stand in
  // this one's future (tools/rebirth.ts does the same). The share is passed rather than read
  // from CRAFT_CARRY so a walk can push it off its value.
  return { ...born, quarryWeek: -1, keyDay: 0, crafts: { ...born.crafts, xp: carriedXp(prev.crafts.xp, share) } };
}

function chain(job: Job): LifeOut[] {
  const out: (LifeOut & { xpEnd: number[] })[] = [];
  const lives: Life[] = [];
  let xp: number[] = [];
  for (let n = 0; n < job.lives; n++) {
    const start = n === 0 ? undefined : reborn(lives, xp, job.share);
    const echo = echoOf(lives);
    const w = walkLife(habitOf(job.habit, job.seed), start, job.watch.includes(n + 1), echo);
    out.push({ ...w, life: n + 1, born: start ? xpList(start.crafts.xp).map(levelOf) : SKILL_KEYS.map(() => 1) });
    xp = w.xpEnd;
    lives.push({ marks: MARKS, at: T0 + n });
  }
  return out.map(({ xpEnd: _x, ...o }) => o);
}

/* ── The child: one job in, one line of JSON out ─────────────────────────────────────── */
const jobArg = process.argv.indexOf('--job');
if (jobArg > 0) {
  const job = JSON.parse(process.argv[jobArg + 1]) as Job;
  const result = JSON.stringify(chain(job), (_k, v) => (v === Infinity ? 'inf' : v));
  console.log(`RESULT ${result}`);
  process.exit(0);
}

/* ── The parent: the walks, four at a time, then the tables ──────────────────────────── */
const cache = new Map<string, Promise<LifeOut[]>>();
let running = 0;
const queue: (() => void)[] = [];
const slot = () => new Promise<void>((go) => { if (running < 4) { running++; go(); } else queue.push(() => { running++; go(); }); });
const free = () => { running--; queue.shift()?.(); };

function walks(job: Job): Promise<LifeOut[]> {
  const key = JSON.stringify(job);
  const hit = cache.get(key);
  if (hit) return hit;
  const p = (async () => {
    await slot();
    try {
      return await new Promise<LifeOut[]>((done, fail) => {
        const child = spawn(process.execPath, ['--import', 'tsx', FILE, '--job', key], { stdio: ['ignore', 'pipe', 'inherit'] });
        let buf = '';
        child.stdout.on('data', (d) => { buf += d; });
        child.on('exit', (code) => {
          const line = buf.split('\n').find((l) => l.startsWith('RESULT '));
          if (code !== 0 || !line) return fail(new Error(`walk failed: ${key}`));
          done(JSON.parse(line.slice(7), (_k, v) => (v === 'inf' ? Infinity : v)));
        });
      });
    } finally { free(); }
  })();
  cache.set(key, p);
  return p;
}

const CARRY = CRAFT_CARRY > 0 ? CRAFT_CARRY : 0.25;
const SEEDS = [991, 7, 1234] as const;
const BASE = 991;
const SHARES = [0, CARRY * 0.9, CARRY, CARRY * 1.1] as const;
const CRAFTER = 'crafts it all';
const OTHERS = ['every hour', 'casual', 'once a day', 'never fights'] as const;

const f1 = (x: number) => (Number.isFinite(x) ? x.toFixed(1) : 'never').padStart(5);
const pc = (x: number) => `${x >= 0 ? '-' : '+'}${Math.abs(x * 100).toFixed(0)}%`;
const pad = (s: string, n: number) => s.padEnd(n);
const mean = (xs: readonly number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
const slowest = (xs: readonly number[]) => Math.max(...xs);
let failures = 0;
let checks = 0;
const check = (ok: boolean, what: string) => { checks++; if (!ok) { failures++; console.log(`  ✗ ${what}`); } };

const lifeAt = (rs: LifeOut[], n: number) => rs[n - 1];

console.log('業 The workshop through a rebirth, measured');
console.log(`  CRAFT_CARRY is ${CRAFT_CARRY}; the tables push it to ${SHARES.slice(1).map((x) => x.toFixed(3)).join(', ')}.`);
console.log(`  A life ends on its third mark; it carries that share of each craft's experience, floored.`);
console.log(`  Every walk is the habit played as a crafter (workshop running, kit carried into every hard fight).`);

const jobs = {
  // lives 1 to 6, nothing carried and CARRY, life 1 and 2 watched day by day
  none6: walks({ habit: CRAFTER, share: 0, seed: BASE, lives: 6, watch: [1, 2] }),
  carry6: walks({ habit: CRAFTER, share: CARRY, seed: BASE, lives: 6, watch: [2] }),
  low3: walks({ habit: CRAFTER, share: SHARES[1], seed: BASE, lives: 3, watch: [2] }),
  high3: walks({ habit: CRAFTER, share: SHARES[3], seed: BASE, lives: 3, watch: [2] }),
  // Two more gear seeds for life 2, and the first of them walked on to life 6, so the six
  // lives are read as the mean of two seeds: one seed's drops move a life by a day or two.
  seeds: SEEDS.slice(1).map((seed, i) => ({
    none: walks({ habit: CRAFTER, share: 0, seed, lives: i === 0 ? 6 : 2, watch: [] }),
    carry: walks({ habit: CRAFTER, share: CARRY, seed, lives: i === 0 ? 6 : 2, watch: [] }),
  })),
  others: OTHERS.map((name) => ({
    name,
    none: walks({ habit: name, share: 0, seed: BASE, lives: 2, watch: [] }),
    carry: walks({ habit: name, share: CARRY, seed: BASE, lives: 2, watch: [] }),
  })),
};

const none6 = await jobs.none6;
const carry6 = await jobs.carry6;
const low3 = await jobs.low3;
const high3 = await jobs.high3;
const seeded = await Promise.all(jobs.seeds.map(async (x) => ({ none: await x.none, carry: await x.carry })));
const others = await Promise.all(jobs.others.map(async (x) => ({ name: x.name, none: await x.none, carry: await x.carry })));

// ── 1. What re-crafting costs ───────────────────────────────────────────────────────────
const first = lifeAt(none6, 1);
const second = lifeAt(none6, 2);
const secondCarry = lifeAt(carry6, 2);
console.log(`\n1. What re-crafting costs: the ${CRAFTER} cultivator, levels of the seven crafts (herb, vein, render, forge, alchemy, sigil, array)`);
console.log(`   ${pad('', 22)} ${CHECKPOINTS.map((d) => pad(`day ${d}`, 24)).join('')}`);
const lv = (o: LifeOut, d: number) => (o.at[d]?.lv ?? []).join(' ');
console.log(`   ${pad('first life', 22)} ${CHECKPOINTS.map((d) => pad(lv(first, d), 24)).join('')}`);
console.log(`   ${pad('life 2, nothing carried', 22)} ${CHECKPOINTS.map((d) => pad(lv(second, d), 24)).join('')}`);
console.log(`   ${pad(`life 2, ${CARRY * 100}% carried`, 22)} ${CHECKPOINTS.map((d) => pad(lv(secondCarry, d), 24)).join('')}`);
console.log(`   Born with (levels): ${secondCarry.born.join(' ')}   (the life before ended on levels ${lv(first, 60)} at day 60)`);
console.log(`   Days until the slowest of the seven crafts reaches a level (the median in brackets), the summit on day ${first.summit.toFixed(0)}:`);
console.log(`   ${pad('', 26)} ${LEVELS.map((L) => pad(`level ${L}`, 16)).join('')}`);
const med = (xs: readonly number[]) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];
const row = (tag: string, o: LifeOut) =>
  console.log(`   ${pad(tag, 26)} ${LEVELS.map((L) => pad(`${f1(slowest(o.daysTo![L])).trim()} (${f1(med(o.daysTo![L])).trim()})`, 16)).join('')}`);
row('first life', first);
row('life 2, nothing carried', second);
for (const [tag, o] of [[`${(SHARES[1] * 100).toFixed(1)}%`, lifeAt(low3, 2)], [`${CARRY * 100}%`, secondCarry], [`${(SHARES[3] * 100).toFixed(1)}%`, lifeAt(high3, 2)]] as const) row(`life 2, ${tag} carried`, o);
const saved = LEVELS.map((L) => slowest(second.daysTo![L]) - slowest(secondCarry.daysTo![L]));
console.log(`   Saved at the slowest craft by ${CARRY * 100}%: ${LEVELS.map((L, i) => `level ${L} ${f1(saved[i]).trim()} days`).join(', ')}.`);
check(secondCarry.born.every((l) => l >= 40), 'a life born with the carry starts every craft at level 40 or more');
check(secondCarry.born.every((l, i) => l < (first.at[60]?.lv[i] ?? 99)), 'a life is born below the levels the life before it ended on');
check(saved.every((d) => d > 0), `the carry brings the slowest craft to level ${LEVELS.join(', ')} sooner`);

// ── 2. The climb ────────────────────────────────────────────────────────────────────────
console.log(`\n2. The climb: life 2's days to realm 9 / the summit, mean of ${SEEDS.length} gear seeds, nothing carried against ${CARRY * 100}%`);
const pair = (seed: number) => seed === BASE
  ? { none: lifeAt(none6, 2), carry: lifeAt(carry6, 2) }
  : { none: lifeAt(seeded[SEEDS.indexOf(seed as 7 | 1234) - 1].none, 2), carry: lifeAt(seeded[SEEDS.indexOf(seed as 7 | 1234) - 1].carry, 2) };
let climb9 = 0, climbS = 0;
for (const seed of SEEDS) {
  const { none, carry } = pair(seed);
  console.log(`   seed ${String(seed).padEnd(5)} ${f1(none.r9)}/${f1(none.summit)}  ->  ${f1(carry.r9)}/${f1(carry.summit)}   (summit ${(carry.summit - none.summit >= 0 ? '+' : '')}${(carry.summit - none.summit).toFixed(1)} days)`);
  climb9 = Math.max(climb9, none.r9 - carry.r9);
  climbS = Math.max(climbS, none.summit - carry.summit);
  check(none.done && carry.done, `seed ${seed}: both lives reach the summit`);
}
const mn = mean(SEEDS.map((s) => pair(s).none.summit));
const mc = mean(SEEDS.map((s) => pair(s).carry.summit));
console.log(`   mean summit ${mn.toFixed(1)} -> ${mc.toFixed(1)} (${(mc - mn >= 0 ? '+' : '')}${(mc - mn).toFixed(1)} days, ${pc((mn - mc) / mn)} sooner)`);
check(mn - mc <= mn * 0.03, `the carry moves life 2's summit by 3% at most on average (${(mn - mc).toFixed(1)} of ${mn.toFixed(1)} days)`);
check(climb9 <= 3 && climbS <= 3, `no seed reaches realm 9 or the summit more than 3 days sooner (${climb9.toFixed(1)}, ${climbS.toFixed(1)})`);

console.log('\n   The same for every habit played as a crafter (seed 991), life 1 / life 2 nothing carried / life 2 carried, summit days:');
for (const x of [{ name: CRAFTER, none: none6.slice(0, 2), carry: carry6.slice(0, 2) }, ...others]) {
  const a = lifeAt(x.none, 2), b = lifeAt(x.carry, 2);
  console.log(`   ${pad(x.name, 14)} ${f1(lifeAt(x.none, 1).summit)}  ${f1(a.summit)}  ${f1(b.summit)}   (${(b.summit - a.summit >= 0 ? '+' : '')}${(b.summit - a.summit).toFixed(1)} days)`);
  check(a.done && b.done, `${x.name}: both lives reach the summit`);
  check(a.summit - b.summit <= Math.max(3, a.summit * 0.04), `${x.name}: the carry moves the summit by no more than 4% (${(a.summit - b.summit).toFixed(1)} days)`);
  check(b.summit - a.summit <= Math.max(3, a.summit * 0.04), `${x.name}: the carry does not slow the summit past 4% (${(b.summit - a.summit).toFixed(1)} days)`);
}

console.log(`\n   Lives 1 to 6, summit days (and the saving on the first life), the mean of seeds ${SEEDS[0]} and ${SEEDS[1]}: the Echo alone, then with ${CARRY * 100}% of the workshop carried`);
const six = (a: LifeOut[], b: LifeOut[]) => a.map((r, i) => ({ summit: (r.summit + b[i].summit) / 2, r9: (r.r9 + b[i].r9) / 2 }));
const noneSix = six(none6, seeded[0].none);
const carrySix = six(carry6, seeded[0].carry);
const rowOf = (tag: string, rs: { summit: number }[]) =>
  console.log(`   ${pad(tag, 16)} ${rs.map((r, i) => pad(`${r.summit.toFixed(0)} (${i ? pc(1 - r.summit / rs[0].summit) : '  0%'})`, 12)).join('')}`);
rowOf('Echo only', noneSix);
rowOf(`+ ${CARRY * 100}% carried`, carrySix);
for (let i = 1; i < 6; i++) {
  const only = 1 - noneSix[i].summit / noneSix[0].summit;
  const both = 1 - carrySix[i].summit / carrySix[0].summit;
  check(both - only <= 0.03, `life ${i + 1}: the carry adds no more than 3 points to the Echo's saving (${((both - only) * 100).toFixed(1)})`);
  check(both <= 0.25, `life ${i + 1}: the summit is not more than 25% sooner than the first life's (${(both * 100).toFixed(0)}%)`);
}

// ── 3. The qi rate ──────────────────────────────────────────────────────────────────────
console.log('\n3. The qi rate at the same day of life 2 (seed 991): with the carry as a multiple of without');
for (const d of [10, 30, 60]) {
  const a = secondCarry.at[d]?.rate ?? 0, b = second.at[d]?.rate ?? 1;
  console.log(`   day ${String(d).padEnd(3)} ${a.toExponential(2)} / ${b.toExponential(2)} = ${(a / b).toFixed(2)}x`);
  check(a / b <= 1.2, `day ${d}: the carry does not raise the rate by more than the gear lottery's 20% (${(a / b).toFixed(2)}x)`);
}
console.log('   (no craft level is read by rate(); what moves it is gear, and the same gear is forged either way.)');

// ── 4. The knife edge ───────────────────────────────────────────────────────────────────
console.log(`\n4. The knife edge: the share pushed a tenth either way (${SHARES[1].toFixed(3)}, ${CARRY}, ${SHARES[3].toFixed(3)}), life 2`);
console.log(`   ${pad('', 10)} ${pad('summit', 8)} ${LEVELS.map((L) => pad(`L${L} slowest`, 14)).join('')}`);
const edge = [[0, second], [SHARES[1], lifeAt(low3, 2)], [CARRY, secondCarry], [SHARES[3], lifeAt(high3, 2)]] as const;
for (const [share, o] of edge) {
  console.log(`   ${pad(`${(share * 100).toFixed(1)}%`, 10)} ${pad(f1(o.summit).trim(), 8)} ${LEVELS.map((L) => pad(f1(slowest(o.daysTo![L])).trim(), 14)).join('')}`);
}
for (const L of LEVELS) {
  const d = edge.map(([, o]) => slowest(o.daysTo![L]));
  check(d[1] <= d[0] + 3 && d[2] <= d[1] + 3 && d[3] <= d[2] + 3, `level ${L}: more carried is never slower by more than the visit's 3 days (${d.map((x) => x.toFixed(0)).join(', ')})`);
  check((d[1] - d[3]) <= (d[0] - d[2]) * 0.6 + 3, `level ${L}: a tenth either way moves the saving by a fraction of it, not past a cliff`);
}
check(edge.every(([, o]) => o.done), 'every pushed share still reaches the summit');
for (const [, o] of edge) check(Math.abs(o.summit - second.summit) <= 4, `a pushed share moves life 2's summit by 4 days at most (${(o.summit - second.summit).toFixed(1)})`);
for (let i = 1; i < 3; i++) {
  for (const rs of [low3, high3]) check(rs[i].done && Math.abs(rs[i].summit - none6[i].summit) <= 5, `life ${i + 1}: a pushed share still climbs within 5 days of nothing carried`);
}

// ── 5. Tools: the crafting speed ────────────────────────────────────────────────────────
console.log('\n5. The tools (crafting speed, 0 to 42 steps held) at day 10 / 30 / 60: first life, life 2 nothing carried, life 2 carried');
const tl = (o: LifeOut) => [10, 30, 60].map((d) => o.at[d]?.tools ?? 0).join(' / ');
console.log(`   ${tl(first)}    ${tl(second)}    ${tl(secondCarry)}`);

console.log(`\n${checks} checks.`);
console.log(failures ? `✗ ${failures} checks failed` : '✓ the carry shortens the workshop and leaves the climb, the qi rate and the edge as they were');
if (failures) process.exit(1);
