/**
 * 百煉 The Hundredfold sets and 譜 the codex, measured on the harness's own crafter.
 *
 * Bruno, 2026-10-06: the sets the workshop makes should be whole, their lines chosen by what
 * goes into the crucible, and hard to make; a goal for the long road, never a shortcut. The
 * proposal said the first sets reach Heaven in days, Jadewater around day 84, Fallen Star
 * around day 170, and Dragonwake and Ascendant Husk not within six months. This plays it.
 *
 *     npx tsx tools/hundredfold.ts            everything (a few minutes)
 *     npx tsx tools/hundredfold.ts quick      the climb and the six months only
 *
 * It prints, and asserts a floor on everything it counts:
 *   1. the climb: the day the ninth realm is reached by `crafts it all` without the sets,
 *      and with them, chased forge first and chased with the seven crafts kept level;
 *   2. the long road: both crafters played on to day 180, and the day each set is first
 *      finished at Mystic, Earth and Heaven;
 *   3. the ceiling: six Hundredfold pieces of a realm worn at its arrival, at each rank,
 *      lines chosen for power at the top of their band, against what the crafter wore;
 *   4. each codex bonus, measured on the fight or the system it reaches, at Heaven and at
 *      Heaven worn whole (its cap), against the same body without it;
 *   5. the endgame clock with and without the sets, and with the tower codex at its cap,
 *      pushed off its number the way CLAUDE.md asks (every Dragon a tenth heavier).
 */
import { strict as assert } from 'node:assert';
import { HABITS, play, type Habit } from './habits.ts';
import { arrivalOf, playEndgame } from './endgame.ts';
import {
  codexRank, codexValue, lineAxes, pieceOf, placesMade, type Order, type Portions,
} from '../src/sim/hundred.ts';
import { HUNDRED_RANKS, RECIPE_BY_KEY, hundredKey, type HundredRank } from '../src/data/crafts.ts';
import { CODEX, type CodexKey } from '../src/data/hundred.ts';
import {
  GEAR, REALM_SETS, SLOTS, type Affix, type Item, type Slot,
} from '../src/data/gear.ts';
import { SECONDARIES, CODEX_CAP } from '../src/sim/balance.ts';
import { power, type State } from '../src/sim/state.ts';
import { rate } from '../src/sim/time.ts';
import { commonsOf, isElite, wardenOf } from '../src/data/bestiary.ts';
import { lootFrom, odds } from '../src/sim/combat.ts';
import { carry, kitFor, levelIn, secondsOf } from '../src/sim/crafts.ts';
import { fateFull } from '../src/sim/fate.ts';
import { beastAt } from '../src/sim/secret.ts';
import { demonOf, demonPower } from '../src/sim/seclusion.ts';
import { floorBeast, floorPower } from '../src/sim/tower.ts';
import { challengerOf, challengerPower } from '../src/sim/platform.ts';

const quick = process.argv[2] === 'quick';
const DAYS = 180;
const base = HABITS.find((h) => h.name === 'crafts it all')!;
const chaser = (how: 'forge' | 'spread', on: boolean): Habit =>
  ({ ...base, name: `sets, ${how} first`, hundred: how, on });
const f1 = (x: number | undefined) => (x === undefined ? '    -' : x.toFixed(1).padStart(5));

/* ── 1 · the climb, with and without ─────────────────────────────────────── */

console.log('\n百煉 1 · the climb: the day the ninth realm is reached');
const without = play(base);
const withForge = play(chaser('forge', false));
const withSpread = play(chaser('spread', false));
const day9 = (r: ReturnType<typeof play>) => r.arrival[8];
for (const [name, r] of [['crafts it all, no sets', without], ['sets, forge first', withForge], ['sets, crafts kept level', withSpread]] as const) {
  console.log(`  ${name.padEnd(26)} realm 9 on day ${f1(day9(r))}   ${r.arrival.slice(1).map((d) => d.toFixed(1)).join(' ')}`);
}
assert(day9(without) !== undefined && day9(withForge) !== undefined && day9(withSpread) !== undefined, 'every crafter reaches the ninth realm');
const shift = Math.max(Math.abs(day9(withForge) - day9(without)), Math.abs(day9(withSpread) - day9(without)));
console.log(`  the sets move the ninth realm by ${shift.toFixed(1)} days at most`);
assert(shift <= 2.5, 'the sets are a goal beside the climb, never a shortcut up it (within about two days)');

/* ── 2 · the long road ───────────────────────────────────────────────────── */

interface Road {
  first: Record<string, number>; forge: number[]; atRealm: Record<number, State>; end: State;
  /** The climb and the road after it, a visit every two days or so: what the codex is measured on. */
  seen: State[];
}
function road(how: 'forge' | 'spread'): Road {
  const first: Record<string, number> = {};
  const forge: number[] = [];
  const atRealm: Record<number, State> = {};
  const seen: State[] = [];
  let last = -9;
  const run = play(chaser(how, true), DAYS, (day, s) => {
    if (!atRealm[s.realm]) atRealm[s.realm] = s;
    if (day - last >= 2) { seen.push(s); last = day; }
    for (let r = 1; r <= 9; r++) {
      const k = codexRank(s.crafts.made, r);
      for (let i = 1; i <= k; i++) first[`${r}:${i}`] ??= day;
    }
    const lv = levelIn(s, 'forge');
    for (let l = forge.length; l <= lv; l++) forge[l] = day;
  });
  return { first, forge, atRealm, end: run.state, seen };
}

console.log(`\n百煉 2 · the long road: the day each set is first finished, played to day ${DAYS}`);
const roads = { forge: road('forge'), spread: road('spread') };
console.log('                         forge first (M  E  H)        crafts kept level (M  E  H)');
let finished = 0;
for (let r = 1; r <= 9; r++) {
  const cols = (x: Road) => [1, 2, 3].map((k) => f1(x.first[`${r}:${k}`])).join(' ');
  console.log(`  ${r} ${REALM_SETS[r - 1].han} ${REALM_SETS[r - 1].name.padEnd(16)} ${cols(roads.forge)}          ${cols(roads.spread)}`);
  for (const x of Object.values(roads)) for (let k = 1; k <= 3; k++) if (x.first[`${r}:${k}`] !== undefined) finished++;
}
for (const [name, x] of Object.entries(roads)) {
  console.log(`  forge level, ${name.padEnd(7)}  ${[40, 50, 60, 70, 73, 80, 84, 90, 95, 99].map((l) => `${l}@${x.forge[l] === undefined ? '-' : x.forge[l].toFixed(0)}`).join(' ')}`);
}
assert(finished >= 20, `the long road reaches something: ${finished} completions counted`);
for (const x of Object.values(roads)) {
  // The first sets in days, the last two not within six months.
  assert((x.first['1:3'] ?? Infinity) <= 30, 'Mortal Iron reaches Heaven within a month');
  assert(x.first['8:3'] === undefined && x.first['9:3'] === undefined, 'Dragonwake and Ascendant Husk are not finished at Heaven within six months');
  assert((x.first['5:3'] ?? Infinity) >= 20, 'Jadewater at Heaven is weeks away, never days');
}

if (!quick) {
  /* ── 3 · the ceiling ───────────────────────────────────────────────────── */

  const POWER_FIRST: readonly Affix[] = ['power', 'sunder', 'art', 'rate', 'luck', 'refine', 'find', 'capacity'];
  /** Six pieces of a realm's set at a rank, the power shape where there is one, lines for power, three portions. */
  const dress = (s: State, realm: number, rarity: HundredRank, order = POWER_FIRST, made = true): State => {
    const worn: Partial<Record<Slot, Item>> = {};
    const m: Record<string, number> = { ...s.crafts.made };
    for (const slot of SLOTS) {
      const shapes = GEAR.filter((g) => g.realm === realm && g.slot === slot);
      const tpl = shapes.find((g) => g.affix === order[0]) ?? shapes.find((g) => g.affix === 'power') ?? shapes[0];
      const lines = order.filter((a) => lineAxes(tpl).includes(a)).slice(0, SECONDARIES[rarity]);
      const o: Order = { template: tpl.key, rarity, main: 3, lines: lines.map((affix) => ({ affix, n: 3 as Portions })) };
      worn[slot] = pieceOf(o, `x-${slot}`)!;
      if (made) m[hundredKey(realm, slot, rarity)] = Math.max(1, m[hundredKey(realm, slot, rarity)] ?? 0);
    }
    return { ...s, worn, crafts: { ...s.crafts, made: m } };
  };

  console.log('\n百煉 3 · the ceiling: six pieces of the realm\'s set worn at its arrival, against what the crafter wore');
  console.log('  realm   Mystic            Earth             Heaven            Heaven, qi lines first');
  for (let r = 2; r <= 9; r++) {
    const s = roads.forge.atRealm[r];
    if (!s) continue;
    const p0 = power(s), q0 = rate(s);
    const col = (x: State) => `力×${(power(x) / p0).toFixed(2)} 氣×${(rate(x) / q0).toFixed(2)}`;
    const qiFirst = dress(s, r, 'heaven', ['rate', 'power', 'sunder', 'art', 'luck', 'refine', 'find', 'capacity']);
    console.log(`  ${r} ${REALM_SETS[r - 1].han}  ${HUNDRED_RANKS.map((k) => col(dress(s, r, k)).padEnd(17)).join(' ')} ${col(qiFirst)}`);
    // 律 The qi a forged set adds goes through the same bend as any gear, under the same roof.
    assert(rate(qiFirst) / q0 < 1.6, 'a forged set never moves the qi rate past what gear can');
  }

  /* ── 4 · the codex, each on what it reaches ───────────────────────────── */

  console.log('\n譜 4 · each codex bonus, measured, against the same body without it (Heaven · Heaven worn whole, its cap)');
  const strip = (s: State, realm: number): State => {
    const made = Object.fromEntries(Object.entries(s.crafts.made).filter(([k]) => {
      const r = RECIPE_BY_KEY[k];
      return !(r?.makes.kind === 'hundred' && r.makes.realm === realm);
    }));
    return { ...s, crafts: { ...s.crafts, made } };
  };
  const unflag = (s: State): State => ({ ...s, worn: Object.fromEntries(Object.entries(s.worn)
    .map(([k, it]) => [k, it ? (({ hundred: _, ...rest }) => rest)(it) : it])) as State['worn'] });
  /**
   * Three bodies, the same body in all three: the set's six Heaven pieces worn with no codex,
   * the set finished at Heaven but its pieces not counted as worn (×2), and finished and worn
   * whole (its cap). Only what the codex reads differs.
   */
  const three = (s: State, realm: number) => {
    const whole = dress(strip(s, realm), realm, 'heaven');
    return { none: strip(unflag(whole), realm), heaven: unflag(whole), whole };
  };
  const pct = (x: number) => `${(x * 100).toFixed(1)}%`;
  const S9 = roads.forge.atRealm[9] ?? roads.forge.end;
  /** The fights a codex thins, read off one body: every one it reaches in that body's realm. */
  const fights = (key: CodexKey, x: State): number[] => {
    if (key === 'elite') {
      const e = commonsOf(x.realm)[commonsOf(x.realm).length - 1];
      return e && isElite(e) ? [odds(x, e)] : [];
    }
    if (key === 'vault') return [1, 3, 5].map((step) => {
      const b = beastAt({ ...x, runStep: step }, step);
      return odds(x, b, undefined, kitFor(x, b, 'vault').kit);
    });
    if (key === 'demon') return [odds(x, demonOf(x), demonPower(x))];
    if (key === 'platform') return ([0, 1, 2] as const).map((t) => odds(x, challengerOf(x, t), challengerPower(x, t)));
    const f = Math.max(1, x.tower);
    return [0, 5, 10, 20].map((d) => odds(x, floorBeast(f + d), floorPower(f + d)));
  };
  let measured = 0;
  for (const c of CODEX) {
    const t = three(S9, c.realm);
    const v = [codexValue(t.heaven, c.key), codexValue(t.whole, c.key)];
    assert(v[1] <= CODEX_CAP[c.key] + 1e-9 && v[1] > 0 && v[0] > 0, `${c.key} is earned and capped`);
    let line = '';
    switch (c.key) {
      case 'hunt': {
        const b = commonsOf(t.none.realm)[0];
        line = `material from a ${b.name}: ${[t.none, t.heaven, t.whole].map((x) => lootFrom(x, b)).join(' → ')}`;
        break;
      }
      case 'work': {
        const r = RECIPE_BY_KEY['forge:metal5'];
        line = `a Jadewater Ingot: ${[t.none, t.heaven, t.whole].map((x) => `${secondsOf(x, r).toFixed(2)}s`).join(' → ')}`;
        break;
      }
      case 'bond': line = `wins to fill a bond: ${[t.none, t.heaven, t.whole].map(fateFull).join(' → ')}`; break;
      case 'gates': {
        const w = wardenOf(7);
        const armed = (x: State) => carry(carry({ ...x, realm: 7, crafts: { ...x.crafts,
          pouch: { ...x.crafts.pouch, 'might7@4': 1, 'sigil:fivethunder@4': 1 } } }, 'elixir', 'might7@4'), 'sigil', 'sigil:fivethunder@4');
        const d = [t.none, t.heaven, t.whole].map((x) => kitFor(armed(x), w, 'warden').kit.breach ?? 0);
        line = `days a Heaven pill and sigil break at a warden: ${d.map((x) => x.toFixed(2)).join(' → ')} (worn whole includes the four-piece step's day each)`;
        break;
      }
      default: {
        // 戰 Every fight it reaches, on every sampled visit of the climb and the road after it.
        // Twice: on the body the crafter really wore, finished at Heaven (×2, nothing else
        // changed); and in the set's six pieces, worn whole, at the cap.
        const worst = [{ gain: -1, from: 0, to: 0 }, { gain: -1, from: 0, to: 0 }];
        let free = 0, n = 0;
        for (const s0 of roads.forge.seen) {
          if (s0.realm < c.realm) continue;
          const real = strip(s0, c.realm);
          const pairs: [State, State][] = [
            [real, { ...real, crafts: { ...real.crafts, made: { ...real.crafts.made, ...Object.fromEntries(SLOTS.map((x) => [hundredKey(c.realm, x, 'heaven'), 1])) } } }],
            (() => { const b = three(s0, c.realm); return [b.none, b.whole] as [State, State]; })(),
          ];
          pairs.forEach(([x0, x1], w) => {
            const o0 = fights(c.key, x0), o1 = fights(c.key, x1);
            o0.forEach((p, j) => {
              n++;
              const q = o1[j];
              if (p < 0.25 && q > 0.9) free++;
              if (q - p > worst[w].gain) worst[w] = { gain: q - p, from: p, to: q };
            });
          });
        }
        if (c.key === 'tower') {
          const reach = (x: State) => { let f = Math.max(1, x.tower); while (f < 5000 && odds(x, floorBeast(f), floorPower(f)) >= 0.6) f++; return f; };
          const fl = [t.none, t.heaven, t.whole].map(reach);
          line = `highest floor at 60% at the summit: ${fl.join(' → ')} (+${(100 * (fl[2] / fl[0] - 1)).toFixed(1)}%); `;
        }
        const most = (x: { from: number; to: number }) => `${Math.round(x.from * 100)}% → ${Math.round(x.to * 100)}%`;
        line += `${n} fights read; the most it moved one: ${most(worst[0])} at Heaven, ${most(worst[1])} at its cap; lost fights made free: ${free}`;
        assert(n > 0, `${c.key}: fights were read`);
        assert(free === 0, `${c.key}: no fight the build loses three times in four is ever made a free win`);
      }
    }
    measured++;
    console.log(`  ${c.han} ${c.sys.padEnd(12)} ${c.key === 'gates' ? `${v[0]}d · ${v[1]}d` : `${pct(v[0])} · ${pct(v[1])}`}   ${line}`);
  }
  assert(measured === 9, 'all nine codex bonuses measured');

  /* ── 5 · the endgame clock ─────────────────────────────────────────────── */

  console.log('\n劫 5 · the endgame clock, days a mark over 80 crossings (and every Dragon a tenth heavier)');
  const clock = (start: State, heavier = 1) => {
    const e = playEndgame(80, 'pill', arrivalOf(start), heavier);
    return e.days.reduce((a, b) => a + b, 0) / e.days.length;
  };
  const sNo = without.state;
  const sWith = withForge.state;
  const tower = three(sWith, 8);
  const rows: [string, State][] = [
    ['crafts it all, no sets', sNo], ['crafts it all, with its sets', sWith],
    ['Dragonwake worn, no codex', tower.none], ['Dragonwake worn, codex at cap', tower.whole],
  ];
  const clocks: Record<string, [number, number]> = {};
  for (const [name, s] of rows) {
    clocks[name] = [clock(s), clock(s, 1.1)];
    console.log(`  ${name.padEnd(32)} ${clocks[name][0].toFixed(2)} d/mark   heavier ${clocks[name][1].toFixed(2)} d/mark`);
    assert(clocks[name][0] > 0 && clocks[name][1] < 400, `${name}: the endgame keeps moving`);
  }
  const moved = (a: string, b: string, i: 0 | 1) => clocks[b][i] / clocks[a][i] - 1;
  for (const i of [0, 1] as const) {
    const sets = moved('crafts it all, no sets', 'crafts it all, with its sets', i);
    const cap = moved('Dragonwake worn, no codex', 'Dragonwake worn, codex at cap', i);
    console.log(`  ${i ? 'heavier' : 'as set '}: the sets move the clock ${(sets * 100).toFixed(1)}%, the tower codex at its cap ${(cap * 100).toFixed(1)}%`);
    assert(Math.abs(cap) <= 0.08, 'the tower codex moves the endgame clock a few per cent at most');
  }
  void placesMade; void SLOTS;
}
console.log('\n百煉 done');
