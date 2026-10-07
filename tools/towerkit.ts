/**
 * 攜 塔 What a pill and a sigil are worth up the tower, per habit (2026-10-05).
 *
 * rekaris asked for them to be allowed there, and asked the right question with it: *"If
 * there is an instant-win pill or combination, it would need rebalancing."* So this takes
 * every climbing cultivator in tools/habits.ts every three days from the day the tower
 * opens, and reads the highest floor it would climb (the harness's own bar, odds of 0.65)
 * with nothing carried and with every pairing of elixir and sigil the realm allows, made
 * at Common rank and at Heaven rank, the best a make can roll. A floor's kit is read through
 * kitFor in the climber's own realm (see fightRealmOf in sim/crafts.ts for why).
 *
 * 驗 It also reads what the server sees: the highest floor any kit could make beatable at
 * all (bestKit, which is every best thing at once at Heaven rank), against the furthest
 * reach towerVerdict reads (power over the class's share of a floor). TOWER_FORGED must
 * stand well past it, or an honest kit-assisted floor would be struck.
 *
 * Read by src/sim/__tests__/towerkit.test.ts; run `npx tsx tools/towerkit.ts` for the table.
 */
import { HABITS, play, type Habit } from './habits.ts';
import { beatable, odds } from '../src/sim/combat.ts';
import { bestKit, kitFor } from '../src/sim/crafts.ts';
import { floorBeast, floorPower } from '../src/sim/tower.ts';
import { XP_TABLE, elixirKey, sigilKey } from '../src/data/crafts.ts';
import { power, type State } from '../src/sim/state.ts';
import { classTower } from '../src/sim/schools.ts';
import { opensAt } from '../src/sim/unlocks.ts';
import { TOWER_FORGED, kitReach } from '../src/sim/verify.ts';
import { NO_KIT, type Kit } from '../src/sim/kit.ts';

/** The harness's own bar for a floor it climbs: tools/habits.ts. */
const BAR = 0.65;

/** Every elixir and sigil the realm allows that could do anything in a tower fight. */
function choices(realm: number): { elixirs: string[]; sigils: string[] } {
  const tier = Math.min(9, realm);
  const elixirs = [elixirKey('might', tier), elixirKey('guard', tier), elixirKey('mend', tier)];
  if (realm >= 9) elixirs.push('nineturn');
  const sigils = [sigilKey('warding')];
  if (realm >= 3) sigils.push(sigilKey('thunder'));
  if (realm >= 4) sigils.push(sigilKey('binding'));
  if (realm >= 5) sigils.push(sigilKey('mirror'));
  if (realm >= 7) sigils.push(sigilKey('fivethunder'));
  if (realm >= 9) sigils.push(sigilKey('heavenseal'));
  return { elixirs, sigils };
}

/** A body holding one of each and carrying them, at one rank (0 Common, 4 Heaven). */
function holding(s: State, elixir: string | null, sigil: string | null, rank: number): State {
  const e = elixir ? `${elixir}@${rank}` : null;
  const g = sigil ? `${sigil}@${rank}` : null;
  const pouch = { ...s.crafts.pouch, ...(e ? { [e]: 1 } : {}), ...(g ? { [g]: 1 } : {}) };
  return { ...s, crafts: { ...s.crafts, pouch, carry: { elixir: e, sigil: g } } };
}

/** 驗 The same body with Alchemy and Sigil Writing at 99: what bestKit reads for the server. */
export function maker(s: State): State {
  const top = XP_TABLE[99];
  return { ...s, crafts: { ...s.crafts, xp: { ...s.crafts.xp, alchemy: top, sigil: top } } };
}

/** The highest floor at or above `from` this body climbs at the bar, one floor at a time. */
function climbs(s: State, kitOf: (f: number) => Kit, from: number): number {
  let f = Math.max(1, from);
  while (f < from + 60 && odds(s, floorBeast(f), floorPower(f), kitOf(f)) >= BAR) f++;
  return f - 1;
}

export interface KitRow {
  readonly day: number;
  readonly realm: number;
  /** 塔 The highest floor at the bar with nothing carried. */
  readonly bare: number;
  /** The same with the best Common pairing, and which. */
  readonly common: number;
  readonly commonWith: string;
  /** The same with the best Heaven pairing, and which. */
  readonly heaven: number;
  readonly heavenWith: string;
  /**
   * 驗 The highest floor bestKit makes beatable at all for this body with every craft at 99
   * (maker), and its power over the reach towerVerdict reads, kit included.
   */
  readonly serverFloor: number;
  readonly serverRatio: number;
  /** The same floor over the reach read as power alone, as towerVerdict read it before kitReach. */
  readonly serverBare: number;
  /** The body it was read from, for a test that asks the server about it. */
  readonly state: State;
}

/** 量 One cultivator, every `every` days from the tower's realm on. */
export function towerKit(h: Habit, every = 3, maxDays = 400): KitRow[] {
  const rows: KitRow[] = [];
  let next = 0;
  // 頂 The first visit in the ninth realm is always read, whatever the step, so the summit is
  // measured however the days fall between the samples.
  let summit = false;
  play(h, maxDays, (day, s) => {
    const first9 = s.realm === 9 && !summit;
    if ((day < next && !first9) || s.realm < opensAt('tower')) return;
    if (s.realm === 9) summit = true;
    next = day + every;
    const from = Math.max(1, s.tower - 2);
    const bare = climbs(s, () => NO_KIT, from);
    const { elixirs, sigils } = choices(s.realm);
    const best = (rank: number) => {
      let top = bare, which = 'nothing';
      for (const e of [null, ...elixirs]) for (const g of [null, ...sigils]) {
        if (!e && !g) continue;
        const body = holding(s, e, g, rank);
        const f = climbs(body, (fl) => kitFor(body, floorBeast(fl), 'tower').kit, bare);
        if (f > top) { top = f; which = [e, g].filter(Boolean).join(' + '); }
      }
      return { top, which };
    };
    const c = best(0), hv = best(4);
    // 驗 Read as a hand that could make every pairing above: Alchemy and Sigil Writing at 99.
    const hand = maker(s);
    let sf = Math.max(bare, hv.top);
    while (sf < hv.top + 40 && beatable(hand, floorBeast(sf + 1), floorPower(sf + 1), bestKit(hand, floorBeast(sf + 1), 'tower'))) sf++;
    const reach = (power(hand) / classTower(hand)) * kitReach(bestKit(hand, floorBeast(sf), 'tower'));
    rows.push({ day, realm: s.realm, bare, common: c.top, commonWith: c.which, heaven: hv.top, heavenWith: hv.which,
      serverFloor: sf, serverRatio: floorPower(sf) / Math.max(1e-9, reach),
      serverBare: floorPower(sf) / Math.max(1e-9, power(hand) / classTower(hand)), state: s });
  });
  return rows;
}

export { TOWER_FORGED };

if (process.argv[1]?.endsWith('towerkit.ts')) {
  const only = process.argv[2]?.split(',');
  for (const h of HABITS) {
    if (!h.tower || (only && !only.includes(h.name))) continue;
    const rows = towerKit(h);
    const most = rows.reduce((a, r) => Math.max(a, r.heaven - r.bare), 0);
    const mostC = rows.reduce((a, r) => Math.max(a, r.common - r.bare), 0);
    const avg = rows.reduce((a, r) => a + (r.heaven - r.bare), 0) / Math.max(1, rows.length);
    const ratio = rows.reduce((a, r) => Math.max(a, r.serverRatio), 0);
    const bareRatio = rows.reduce((a, r) => Math.max(a, r.serverBare), 0);
    const withs = new Map<string, number>();
    for (const r of rows) withs.set(r.heavenWith, (withs.get(r.heavenWith) ?? 0) + 1);
    console.log(`${h.name.padEnd(14)} extra floors: Common up to +${mostC}, Heaven up to +${most} (avg +${avg.toFixed(1)}); server reach up to x${ratio.toFixed(2)} of ${TOWER_FORGED} (x${bareRatio.toFixed(2)} read as power alone); best Heaven pairings ${[...withs].map(([k, n]) => `${k} ${n}`).join(', ')}`);
    for (const r of rows) console.log(`  d${r.day.toFixed(0)} r${r.realm} bare ${r.bare} common ${r.common} (${r.commonWith}) heaven ${r.heaven} (${r.heavenWith}) server ${r.serverFloor} x${r.serverRatio.toFixed(2)}`);
  }
}
