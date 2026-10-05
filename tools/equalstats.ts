/**
 * 量 What a piece's school does to its numbers, and what every class is worth on them.
 *
 * rekaris, on the Discord (2026-10-05, "Consider equalizing equipment stats"): Sword pieces
 * grant far more power than Arts pieces, so it is hard to tell what six Sword pieces and
 * their x1.2 are worth against three and three and the Sword Immortal's 0.65. His proposal
 * is that a piece gives the same stats whatever its school. This harness measures the game
 * as it stands, and runs unchanged against a scratch copy with the proposal built in, so
 * the two can be put side by side.
 *
 * Three parts, each read off the game's own functions:
 *
 *   pieces   rollDrop itself, sampled: the mean of every line a piece of each school
 *            carries, by realm and rank (no luck, so no lift)
 *   bodies   six pieces of each pure school and of each of the fifteen pairs, each place
 *            the mean piece of its school there: power and rate as the sim multiplies them,
 *            and the four bent lines
 *   claims   the same bodies on one played cultivator (the active habit at realm 6 and at
 *            the summit): the tower floor it reaches, its margin over a warden, and the qi
 *            and material of sweeping the tower to its reach. The Dragon is anchored to the
 *            body that meets it, so only `play` can say what a class does there
 *   play     every class played by the active cultivator over several seeds: realm 9 day,
 *            forty crossings, the tower floor at the summit and at the fortieth crossing,
 *            the tower's qi and material through the climb
 *
 *     npx tsx tools/equalstats.ts [pieces|bodies|claims|play|all] [seeds]
 *     NF_OUT=today.json npx tsx tools/equalstats.ts play 5      writes the play rows as JSON
 *     npx tsx tools/equalstats.ts compare before.json after.json
 *
 * Measured 2026-10-05, five seeds, against a scratch copy where a piece's lead is drawn from
 * the secondaries' own weighted pool and its school is read off its shape: the realm-9 day
 * spread went from 39.8..49.6 to 41.5..48.7, pure Sword from day 43.1 to 45.3, and every
 * pair stayed first at its own claim. 天師 the Celestial Master is not the most tower qi in
 * either game: the floors the Sword bodies climb past it pay more than its quarter.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import {
  AFFIXES, ARCHETYPES, RARITIES, SLOTS, callingOf, templateOf, wornTotals,
  type Affix, type Item, type Rarity, type Slot, type Worn,
} from '../src/data/gear.ts';
import { PAIRS, SCHOOLS, SCHOOL_INFO, schoolOfAxis, type School } from '../src/data/schools.ts';
import { BEASTS, wardenOf } from '../src/data/bestiary.ts';
import { rollDrop } from '../src/sim/drops.ts';
import {
  classArts, classPower, gearArt, gearFind, gearFuse, gearLuck, gearSunder,
} from '../src/sim/schools.ts';
import { newState, power, rateBonus, type State } from '../src/sim/state.ts';
import { effectiveBeastPower, odds } from '../src/sim/combat.ts';
import { floorBeast, floorPower } from '../src/sim/tower.ts';
import { floorMaterial, floorQi } from '../src/sim/trials.ts';
import { HABITS, play } from './habits.ts';
import { arrivalOf, playEndgame } from './endgame.ts';
import { BUILDS, type Build } from './classes.ts';

const active = () => HABITS.find((h) => h.name === 'active')!;
const fx = (x: number, d = 1) => x.toFixed(d);
const pad = (x: string | number, n: number) => String(x).padStart(n);

// ── pieces ────────────────────────────────────────────────────────────────────

type Lines = Record<Affix, number>;
const zero = (): Lines => Object.fromEntries(AFFIXES.map((a) => [a, 0])) as Lines;

/** The mean lines of a piece, by archetype, sampled off rollDrop at one realm and rank. */
const SAMPLED = new Map<string, Map<string, Lines>>();
export function sampleLines(realm: number, rarity: Rarity, n = 400_000): Map<string, Lines> {
  const key = `${realm}-${rarity}`;
  const known = SAMPLED.get(key);
  if (known) return known;
  const beast = BEASTS.find((b) => b.realm === 9 && !b.warden)!;
  const sums = new Map<string, Lines>();
  const count = new Map<string, number>();
  for (let seed = 1; seed <= n; seed++) {
    const it = rollDrop(beast, 9, seed, { always: true, anyShape: true, floor: RARITIES.indexOf(rarity) });
    if (!it || it.rarity !== rarity) continue;
    const tpl = templateOf(it);
    if (tpl.realm !== realm) continue;
    const l = sums.get(tpl.archetype) ?? zero();
    for (const r of it.rolls) l[r.affix] += r.value;
    sums.set(tpl.archetype, l);
    count.set(tpl.archetype, (count.get(tpl.archetype) ?? 0) + 1);
  }
  const out = new Map<string, Lines>();
  for (const [k, l] of sums) {
    const c = count.get(k)!;
    out.set(k, Object.fromEntries(AFFIXES.map((a) => [a, l[a] / c])) as Lines);
  }
  SAMPLED.set(key, out);
  return out;
}

const schoolOfArch = (key: string): School => schoolOfAxis(ARCHETYPES.find((a) => a.key === key)!.affix);

/** The mean of a school's pieces, over its shapes (a drop picks a shape evenly). */
function schoolMean(lines: Map<string, Lines>, school: School, slot?: Slot): Lines {
  const keys = ARCHETYPES.filter((a) => schoolOfArch(a.key) === school && (!slot || a.slot === slot)).map((a) => a.key);
  const out = zero();
  for (const k of keys) for (const a of AFFIXES) out[a] += (lines.get(k)?.[a] ?? 0) / keys.length;
  return out;
}

const CELLS: readonly [number, Rarity][] = [[5, 'earth'], [5, 'heaven'], [9, 'earth'], [9, 'heaven']];

function printPieces(): void {
  console.log('\n  件 The mean piece of each school, sampled off rollDrop (luck 1). Lines in % (藏 in places).');
  for (const [realm, rarity] of CELLS) {
    const lines = sampleLines(realm, rarity);
    console.log(`\n  realm ${realm} ${rarity}`);
    console.log(`    ${'school'.padEnd(10)}${AFFIXES.map((a) => pad(a, 9)).join('')}`);
    for (const sc of SCHOOLS) {
      const m = schoolMean(lines, sc);
      console.log(`    ${sc.padEnd(10)}${AFFIXES.map((a) => pad(fx(m[a]), 9)).join('')}`);
    }
  }
}

// ── bodies ────────────────────────────────────────────────────────────────────

const canWear = (sc: School, slot: Slot) => ARCHETYPES.some((x) => x.slot === slot && schoolOfArch(x.key) === sc);

/** Which school goes in each place for a build: the classes test's own assignment. */
export function planOf(build: Build): (School | null)[] {
  const pair = PAIRS.find((p) => p.key === build);
  if (!pair) {
    const sc = build as School;
    // A school with no shape in a place (器 has no weapon) wears a Sword piece there.
    return SLOTS.map((slot) => (canWear(sc, slot) ? sc : sc === 'sword' ? null : 'sword'));
  }
  let na = 0, nb = 0;
  return SLOTS.map((slot) => {
    if (na < 3 && canWear(pair.a, slot)) { na++; return pair.a; }
    if (nb < 3 && canWear(pair.b, slot)) { nb++; return pair.b; }
    return null;
  });
}

/** A body of mean pieces: each place the mean of its school's shapes there. */
export function bodyOf(build: Build, realm: number, rarity: Rarity): Worn {
  const lines = sampleLines(realm, rarity);
  const plan = planOf(build);
  const worn: Worn = {};
  SLOTS.forEach((slot, i) => {
    const sc = plan[i];
    if (!sc) return;
    const arch = ARCHETYPES.find((a) => a.slot === slot && schoolOfArch(a.key) === sc)!;
    const m = schoolMean(lines, sc, slot);
    const lead = SCHOOL_INFO[sc].axes.reduce((x, y) => (m[y] > m[x] ? y : x));
    const rolls = [{ affix: lead, value: m[lead] },
      ...AFFIXES.filter((a) => a !== lead && m[a] > 0).map((a) => ({ affix: a, value: m[a] }))];
    worn[slot] = { id: `${build}-${slot}`, template: `${arch.key}${realm}`, rarity, rolls } as Item;
  });
  return worn;
}

const wears = (s: State, worn: Worn): State => ({ ...s, worn });

function printBodies(): void {
  const builds: Build[] = [...BUILDS];
  for (const [realm, rarity] of CELLS) {
    const s0 = { ...newState(1_700_000_000), realm, layer: 8 } as State;
    const p0 = power(s0), r0 = rateBonus(s0);
    console.log(`\n  身 Six mean pieces, realm ${realm} ${rarity}: the multiplier the sim applies, sets included`);
    console.log(`    ${'build'.padEnd(14)}${'class'.padEnd(14)}${pad('力 gear%', 9)}${pad('x劍', 6)}${pad('x力', 7)}${pad('氣 gear%', 9)}${pad('x氣', 7)}` +
      `${pad('法', 7)}${pad('x法', 6)}${pad('破', 7)}${pad('運', 7)}${pad('拾', 7)}${pad('煉', 7)}${pad('藏', 6)}`);
    for (const b of builds) {
      const worn = bodyOf(b, realm, rarity);
      const s = wears(s0, worn);
      const t = wornTotals(worn);
      const c = callingOf(worn);
      const name = c.kind === 'pair' ? c.pair!.key : c.kind === 'pure' ? `${c.school}:${c.tier}` : '-';
      console.log(`    ${b.padEnd(14)}${name.padEnd(14)}${pad(fx(t.power, 0), 9)}${pad(fx(classPower(s), 2), 6)}${pad(fx(power(s) / p0, 2), 7)}` +
        `${pad(fx(t.rate, 0), 9)}${pad(fx(rateBonus(s) / r0, 2), 7)}${pad(fx(gearArt(s), 2), 7)}${pad(fx(classArts(s), 2), 6)}` +
        `${pad(fx(1 / gearSunder(s), 2), 7)}${pad(fx(gearLuck(s), 2), 7)}${pad(fx(gearFind(s), 3), 7)}${pad(fx(gearFuse(s), 2), 7)}${pad(fx(t.capacity, 0), 6)}`);
    }
  }
  console.log('\n    x力 power(s) over the same cultivator bare; x氣 rateBonus likewise (bent by the knee); 法 the art bend,');
  console.log('    x法 the Arts school; 破 how many times weaker a beast reads; 運 the luck bend; 拾 added drop chance; 煉 fuse bend.');
}

// ── claims ────────────────────────────────────────────────────────────────────

let BARE: State | null = null;
function bare(): State {
  if (!BARE) BARE = { ...play(active()).state, worn: {} };
  return BARE;
}

/** The active cultivator as it stood the day realm 6 opened, and at the summit. */
let AT6: State | null = null;
function at6(): State {
  if (!AT6) {
    let got: State | null = null;
    play(active(), 400, (_d, s) => { if (!got && s.realm >= 6) got = s; });
    AT6 = { ...got!, worn: {} };
  }
  return AT6;
}

export interface Claim {
  readonly build: Build;
  readonly reach: number;
  readonly warden: number;
  readonly towerQi: number;
  readonly material: number;
}

/** The floor this body clears at the harness's own 0.65, walked up from the first. */
function reachOf(s: State): number {
  let f = 1;
  while (f < 2000 && odds(s, floorBeast(f), floorPower(f)) >= 0.65) f++;
  return f - 1;
}

export function claimsAt(at: 'six' | 'summit', rarity: Rarity): Claim[] {
  const base = at === 'six' ? at6() : arrivalOf(bare());
  const realm = at === 'six' ? 6 : 9;
  const warden = wardenOf(at === 'six' ? 6 : 8);
  return BUILDS.map((b) => {
    const s = { ...base, worn: bodyOf(b, realm, rarity), tower: 0 } as State;
    const reach = reachOf(s);
    let towerQi = 0, material = 0;
    for (let f = 1; f <= reach; f++) {
      towerQi += floorQi(s, f);
      material += floorMaterial({ ...s, tower: f - 1 }, f);
    }
    return { build: b, reach, warden: power(s) / effectiveBeastPower(s, warden), towerQi, material };
  });
}

function printClaims(): void {
  for (const at of ['six', 'summit'] as const) {
    for (const rarity of ['earth', 'heaven'] as Rarity[]) {
      const rows = claimsAt(at, rarity);
      const best = (k: keyof Claim) => Math.max(...rows.map((r) => (r[k] as number) ?? 0));
      console.log(`\n  稱 Claims on one cultivator (${at === 'six' ? 'realm 6 opening' : 'the summit'}), ${rarity} bodies. * marks the best.`);
      console.log(`    ${'build'.padEnd(14)}${pad('floor', 7)}${pad('warden', 9)}${pad('tower qi', 12)}${pad('材', 12)}`);
      const star = (r: Claim, k: keyof Claim) => ((r[k] as number) >= best(k) * 0.9999 ? '*' : ' ');
      for (const r of rows) {
        console.log(`    ${r.build.padEnd(14)}${pad(r.reach, 6)}${star(r, 'reach')}${pad(fx(r.warden, 3), 8)}${star(r, 'warden')}` +
          `${pad(r.towerQi.toExponential(2), 11)}${star(r, 'towerQi')}${pad(r.material.toExponential(2), 11)}${star(r, 'material')}`);
      }
    }
  }
}

// ── play ──────────────────────────────────────────────────────────────────────

export interface PlayRow {
  readonly build: string;
  readonly seed: number;
  readonly realm9: number;
  readonly held: number;
  readonly crossings: number;
  readonly longest: number;
  readonly summitFloor: number;
  readonly lastFloor: number;
  readonly climbTowerQi: number;
  readonly climbMaterial: number;
  readonly power: number;
}

export function playOne(build: Build | null, seed: number, marks = 40): PlayRow {
  const h = { ...active(), name: `active ${build ?? 'plain'}`, seed, ...(build ? { calling: build } : {}) };
  let held = 0, days = 0, prevTower = 0, material = 0;
  const run = play(h, 400, (_d, s) => {
    days++;
    const c = callingOf(s.worn);
    if (build && ((c.kind === 'pure' && c.school === build) || (c.kind === 'pair' && c.pair?.key === build))) held++;
    // 材 The tower's material, floor by floor, read off the state the floor fell in.
    for (let f = prevTower + 1; f <= s.tower; f++) material += floorMaterial({ ...s, tower: f - 1 }, f);
    prevTower = Math.max(prevTower, s.tower);
  });
  const end = playEndgame(marks, 'pill', arrivalOf(run.state));
  return {
    build: build ?? 'plain', seed, realm9: run.arrival[8], held: days ? held / days : 1,
    crossings: end.days.reduce((a, x) => a + x, 0), longest: Math.max(...end.days),
    summitFloor: run.state.tower, lastFloor: end.floors[end.floors.length - 1] ?? 0,
    climbTowerQi: run.tower.qi, climbMaterial: material, power: run.power,
  };
}

export const SEEDS = [991, 17, 2026, 4242, 77];

function playAllRows(nSeeds: number): PlayRow[] {
  const rows: PlayRow[] = [];
  for (const b of [null, ...BUILDS] as (Build | null)[]) {
    for (const seed of SEEDS.slice(0, nSeeds)) rows.push(playOne(b, seed));
    process.stderr.write('.');
  }
  process.stderr.write('\n');
  return rows;
}

const mean = (xs: number[]) => xs.reduce((a, x) => a + x, 0) / Math.max(1, xs.length);

export function summarise(rows: readonly PlayRow[]): Map<string, Record<string, number>> {
  const by = new Map<string, PlayRow[]>();
  for (const r of rows) by.set(r.build, [...(by.get(r.build) ?? []), r]);
  const out = new Map<string, Record<string, number>>();
  for (const [b, rs] of by) {
    out.set(b, {
      realm9: mean(rs.map((r) => r.realm9)), held: mean(rs.map((r) => r.held)),
      crossings: mean(rs.map((r) => r.crossings)), longest: Math.max(...rs.map((r) => r.longest)),
      summitFloor: mean(rs.map((r) => r.summitFloor)), lastFloor: mean(rs.map((r) => r.lastFloor)),
      climbTowerQi: mean(rs.map((r) => r.climbTowerQi)), climbMaterial: mean(rs.map((r) => r.climbMaterial)),
    });
  }
  return out;
}

function printPlay(rows: readonly PlayRow[]): void {
  const sum = summarise(rows);
  const n = new Set(rows.map((r) => r.seed)).size;
  console.log(`\n  玩 Every class, played by the active cultivator, mean of ${n} seed(s)`);
  console.log(`    ${'build'.padEnd(14)}${pad('realm9', 8)}${pad('held', 6)}${pad('40 marks', 10)}${pad('longest', 9)}${pad('floor@9', 9)}${pad('floor@40', 10)}${pad('climb 塔qi', 12)}${pad('climb 材', 12)}`);
  for (const [b, m] of sum) {
    console.log(`    ${b.padEnd(14)}${pad(fx(m.realm9), 8)}${pad(Math.round(100 * m.held) + '%', 6)}${pad(fx(m.crossings, 0), 10)}${pad(m.longest, 9)}` +
      `${pad(fx(m.summitFloor), 9)}${pad(fx(m.lastFloor), 10)}${pad(m.climbTowerQi.toExponential(2), 12)}${pad(m.climbMaterial.toExponential(2), 12)}`);
  }
}

function compare(a: string, b: string): void {
  const A = summarise(JSON.parse(readFileSync(a, 'utf8')) as PlayRow[]);
  const B = summarise(JSON.parse(readFileSync(b, 'utf8')) as PlayRow[]);
  console.log(`\n  比 ${a} → ${b}`);
  console.log(`    ${'build'.padEnd(14)}${pad('realm9', 15)}${pad('40 marks', 13)}${pad('floor@9', 13)}${pad('floor@40', 13)}${pad('climb 塔qi', 11)}${pad('climb 材', 10)}`);
  for (const [k, x] of A) {
    const y = B.get(k);
    if (!y) continue;
    const r = (f: string) => fx(y[f] / x[f], 2);
    console.log(`    ${k.padEnd(14)}${pad(`${fx(x.realm9)}→${fx(y.realm9)}`, 15)}${pad(`${fx(x.crossings, 0)}→${fx(y.crossings, 0)}`, 13)}` +
      `${pad(`${fx(x.summitFloor, 0)}→${fx(y.summitFloor, 0)}`, 13)}${pad(`${fx(x.lastFloor, 0)}→${fx(y.lastFloor, 0)}`, 13)}${pad('x' + r('climbTowerQi'), 11)}${pad('x' + r('climbMaterial'), 10)}`);
  }
}

// ── main ──────────────────────────────────────────────────────────────────────

if (process.argv[1]?.endsWith('equalstats.ts')) {
  const [what = 'all', arg2, arg3] = process.argv.slice(2);
  if (what === 'compare') compare(arg2, arg3);
  else {
    if (what === 'pieces' || what === 'all') printPieces();
    if (what === 'bodies' || what === 'all') printBodies();
    if (what === 'claims' || what === 'all') printClaims();
    if (what === 'play' || what === 'all') {
      const rows = playAllRows(Number(arg2 ?? 1));
      if (process.env.NF_OUT) writeFileSync(process.env.NF_OUT, JSON.stringify(rows));
      printPlay(rows);
    }
  }
}

