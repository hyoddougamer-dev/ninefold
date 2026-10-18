/**
 * 升 The risen elite and the vault's risen gate, measured: what the odds are when the elite
 * walks out (layer 7 of its realm), bare and with the realm's Common elixir and the best sigil
 * carried, for the cultivators who fight, on five seeds. ELITE_EDGE and GATE_EDGE in
 * balance.ts are set against this table.
 *
 *     npm run elite            the table
 *     npm run elite -- push    and the same with every edge a tenth lighter and heavier
 *
 * Read by name, never by position (CLAUDE.md), with a floor on how many readings were made.
 */
import { HABITS, play } from './habits.ts';
import { eliteOf } from '../src/sim/elite.ts';
import { beastPower, oddsRaw } from '../src/sim/combat.ts';
import { kitFor } from '../src/sim/crafts.ts';
import { power, type State } from '../src/sim/state.ts';
import { stanceChoices } from '../src/sim/arts.ts';
import { beastAt } from '../src/sim/secret.ts';
import { roomsFor } from '../src/data/secret.ts';
import { gateEdge } from '../src/sim/risen.ts';
import { ELIXIR_LINES, SIGILS, elixirKey, pouchKey, sigilKey } from '../src/data/crafts.ts';
import { ELITE_RISEN_FROM } from '../src/sim/balance.ts';
import type { Kit } from '../src/sim/kit.ts';

export const ELITE_SEEDS: readonly number[] = [991, 1234, 5555, 7777, 31337];
export const ELITE_HABITS: readonly string[] = ['once a day', 'casual', 'active'];

/** The body in each stance it holds: a hard fight is taken in the stance that suits it. */
const bodies = (s: State): State[] => stanceChoices(s.realm, s.layer).map((x) => ({ ...s, stance: x.key }) as State);

/** Every Common elixir of the realm, with every sigil of a realm reached (or none) beside it. */
function kits(s: State): State[] {
  const out: State[] = [];
  const sigils = [null, ...SIGILS.filter((x) => x[4] <= s.realm && x[0] !== 'seeking').map((x) => x[0])];
  for (const line of ELIXIR_LINES) for (const sg of sigils) {
    const e = pouchKey(elixirKey(line.key, s.realm), 0);
    const g = sg ? pouchKey(sigilKey(sg), 0) : null;
    const pouch: Record<string, number> = { [e]: 1, ...(g ? { [g]: 1 } : {}) };
    out.push({ ...s, crafts: { ...s.crafts, pouch, carry: { elixir: e, sigil: g, pill: null } } });
  }
  return out;
}

export interface EliteReading {
  readonly habit: string;
  readonly seed: number;
  readonly realm: number;
  readonly day: number;
  /** The elite, bare and with the kit, in the best stance held. */
  readonly bare: number;
  readonly kit: number;
  /** The vault's last gate, bare and with the kit, in the best stance held (a walker sets it at the door). */
  readonly gateBare: number;
  readonly gateKit: number;
  /** And in the stance the harness happened to be holding, for comparison. */
  readonly gateOwn: number;
}

/** 量 Every reading: each habit, each seed, each realm from ELITE_RISEN_FROM, the day its elite walks out. */
export function readElite(scale = 1, habits = ELITE_HABITS, seeds = ELITE_SEEDS): EliteReading[] {
  const out: EliteReading[] = [];
  for (const name of habits) {
    const h = HABITS.find((x) => x.name === name);
    if (!h) throw new Error(`升 there is no habit called ${name}`);
    for (const seed of seeds) {
      const snaps = new Map<number, { s: State; day: number }>();
      play({ ...h, seed }, 200, (day, s) => {
        if (s.realm < ELITE_RISEN_FROM || snaps.has(s.realm)) return;
        const b = eliteOf(s.realm);
        if (b && s.layer >= b.layer) snaps.set(s.realm, { s, day });
      });
      for (const [realm, { s, day }] of snaps) {
        const b = eliteOf(realm)!;
        const heavier = (k: Kit): Kit => ({ ...k, foe: (k.foe ?? 1) * scale });
        const bare = Math.max(...bodies(s).map((x) => oddsRaw(x, b, undefined, heavier(kitFor(x, b, null).kit))));
        const kit = Math.max(...bodies(s).flatMap((x) => kits(x).map((y) => oddsRaw(y, b, undefined, heavier(kitFor(y, b, 'elite').kit)))));
        const rooms = roomsFor(realm);
        const step = rooms % 2 === 0 ? rooms - 1 : rooms - 2;
        const g = beastAt(s, step);
        const lift = (x: State) => Math.max(1, (power(x) * gateEdge(realm) * scale) / beastPower(g));
        const gk = (x: State): Kit => { const k = kitFor(x, g, 'vault').kit; return { ...k, foe: (k.foe ?? 1) * lift(x) }; };
        const gateOwn = oddsRaw(s, g, undefined, gk(s));
        const gateBare = Math.max(...bodies(s).map((x) => oddsRaw(x, g, undefined, gk(x))));
        const gateKit = Math.max(...bodies(s).flatMap((x) => kits(x).map((y) => oddsRaw(y, g, undefined, gk(y)))));
        out.push({ habit: name, seed, realm, day, bare, kit, gateBare, gateKit, gateOwn });
      }
    }
  }
  return out;
}

const pct = (x: number) => `${Math.round(x * 100)}%`;
const band = (xs: number[]) => {
  const v = [...xs].sort((a, b) => a - b);
  return `${pct(v[0])} to ${pct(v[v.length - 1])} (median ${pct(v[v.length >> 1])})`;
};

export function report(scale = 1): string {
  const rs = readElite(scale);
  if (rs.length < ELITE_HABITS.length * ELITE_SEEDS.length * 4) throw new Error(`升 only ${rs.length} readings: the harness reached nothing`);
  const lines = [`升 the risen elite and the vault's last gate, on ${ELITE_SEEDS.length} seeds, at the elite's walk-out${scale !== 1 ? `, every edge ×${scale}` : ''}`];
  for (let realm = ELITE_RISEN_FROM; realm <= 9; realm++) {
    const r = rs.filter((x) => x.realm === realm);
    if (!r.length) continue;
    lines.push(`  realm ${realm}: elite bare ${band(r.map((x) => x.bare))}, with kit ${band(r.map((x) => x.kit))}`);
    lines.push(`           gate  bare ${band(r.map((x) => x.gateBare))}, with kit ${band(r.map((x) => x.gateKit))}; in the stance held ${band(r.map((x) => x.gateOwn))}`);
  }
  return lines.join('\n');
}

if (process.argv[1]?.endsWith('elite.ts')) {
  console.log(report());
  if (process.argv.includes('push')) { console.log(report(0.9)); console.log(report(1.1)); }
}
