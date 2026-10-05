import {
  SLOTS, TEMPLATE_BY_KEY, callingOf, schoolOf, templateOf, valueOf, type Item, type Slot, type Worn,
} from '../data/gear.ts';
import { PAIRS, SCHOOLS, type Pair, type School } from '../data/schools.ts';
import { carryRefine } from './chest.ts';
import { beatable } from './combat.ts';
import { refineFactor } from './refine.ts';
import { callingKey } from './schools.ts';
import { wearPieces } from './sets.ts';
import { power, rate, type State } from './state.ts';
import { floorBeast, floorPower, nextFloor } from './tower.ts';
import { towerOpen } from './trials.ts';

/**
 * 較 Compare classes: for every class the chest can make, the strongest body of it.
 *
 * rekaris, on the Discord: nobody can tell which class is stronger without building
 * every set by hand. So this builds them, from the pieces the cultivator already holds
 * (the chest and what is worn, which is where every saved loadout's pieces are too), and
 * reads each body with the game's own numbers: 力 power(), 氣 rate(), and the highest
 * floor of the tower beatable() says it can take.
 *
 * Every body is put on through wearPieces, the path a loadout takes, so 承 refining
 * moves with the place on the body exactly as it does on the gear screen, and the body
 * read here is the body a tap on the row puts on.
 *
 * A class is a school at its full (five or six pieces of it) or one of the fifteen pairs
 * (three and three). A school at its first step is the same school, weaker, and is left
 * out. A class the chest cannot make has no row.
 */

export interface ClassBuild {
  /** callingKey of the body: "sword:2" for a school at its full, a pair's key for a pair. */
  readonly key: string;
  readonly school?: School;
  readonly pair?: Pair;
  /** Which piece goes where, by id: what a tap puts on. */
  readonly ids: Readonly<Partial<Record<Slot, string>>>;
  /** The save with this body on, put on through wearPieces. */
  readonly state: State;
  readonly power: number;
  readonly rate: number;
  /** Whether this body is what is worn right now, piece for piece. */
  readonly worn: boolean;
}

export interface ClassRead extends ClassBuild {
  /**
   * 塔 The highest floor this body beats, counting up from the floor waiting to be tried,
   * with every floor between beaten too. null when it cannot take the next one, or the
   * tower is shut.
   */
  readonly floor: number | null;
}

/**
 * 限 How much work one opening may do. The best few pieces of a school in a place are
 * the only ones tried there, and the tower is counted at most this many floors up: a
 * phone opens the sheet, so it has to open in a blink.
 */
export const COMPARE_PER_PLACE = 5;
export const COMPARE_FLOORS = 40;

type Pick = Partial<Record<Slot, Item>>;
type Want = Readonly<Record<Slot, School | 'any'>>;
interface Read { readonly power: number; readonly rate: number; readonly key: string | null }

/** Every piece the body could wear: what is on it, and the chest. */
function pool(s: State): readonly Item[] {
  const out: Item[] = [];
  for (const slot of SLOTS) { const it = s.worn[slot]; if (it) out.push(it); }
  for (const it of s.chest) if (TEMPLATE_BY_KEY[it.template]) out.push(it);
  return out;
}

/**
 * 序 A piece's first guess in its place, before the real numbers are read: its 力 power
 * and then its 氣 qi lines, at the refine level the place would give it (承 the higher of
 * its own and the worn piece's). Only an order to try them in and a cut-off.
 */
function guess(s: State, it: Item): number {
  const bare = { ...it, refine: 0 };
  const lvl = Math.max(it.refine ?? 0, s.worn[templateOf(it).slot]?.refine ?? 0);
  return (valueOf(bare, 'power') * 1000 + valueOf(bare, 'rate')) * refineFactor(lvl);
}

const better = (a: { power: number; rate: number }, b: { power: number; rate: number }) =>
  a.power > b.power * (1 + 1e-9) || (a.power >= b.power * (1 - 1e-9) && a.rate > b.rate * (1 + 1e-9));

/**
 * The best body for one shape of class: which school each place must be (or any), the
 * best few pieces of it in each place, then the places tried one at a time against the
 * real power() and rate() until nothing moves. Null if a place has nothing to wear.
 */
function bestFor(want: Want, byPlace: ReadonlyMap<string, readonly Item[]>, wanted: string,
  read: (pick: Pick) => Read): { pick: Pick; read: Read } | null {
  const options = {} as Record<Slot, readonly (Item | undefined)[]>;
  for (const slot of SLOTS) {
    const list = byPlace.get(`${slot}|${want[slot]}`) ?? [];
    // A place free for anything may stay empty when nothing in the chest fits it.
    if (list.length === 0 && want[slot] !== 'any') return null;
    options[slot] = list.length ? list : [undefined];
  }
  const pick: Pick = {};
  for (const slot of SLOTS) pick[slot] = options[slot][0];
  let best = read(pick);
  if (best.key !== wanted) return null;
  for (let pass = 0; pass < 2; pass++) {
    let moved = false;
    for (const slot of SLOTS) {
      for (const it of options[slot]) {
        if (pick[slot] === it) continue;
        const tried = read({ ...pick, [slot]: it });
        if (tried.key === wanted && better(tried, best)) { best = tried; pick[slot] = it; moved = true; }
      }
    }
    if (!moved) break;
  }
  return { pick: { ...pick }, read: best };
}

/** The twenty ways three of the six places take one school and three the other. */
const HALVES: readonly (readonly Slot[])[] = (() => {
  const out: Slot[][] = [];
  for (let a = 0; a < 6; a++) for (let b = a + 1; b < 6; b++) for (let c = b + 1; c < 6; c++) {
    out.push([SLOTS[a], SLOTS[b], SLOTS[c]]);
  }
  return out;
})();

const idsOf = (pick: Pick): Partial<Record<Slot, string>> => {
  const ids: Partial<Record<Slot, string>> = {};
  for (const slot of SLOTS) { const it = pick[slot]; if (it) ids[slot] = it.id; }
  return ids;
};

/** Whether a body is exactly what the save is wearing. */
const wearing = (s: State, ids: Readonly<Partial<Record<Slot, string>>>) =>
  SLOTS.every((slot) => ids[slot] === s.worn[slot]?.id);

/** 較 The strongest body of every class the chest can make, without the tower. */
function buildAll(s: State): readonly ClassBuild[] {
  const all = pool(s);
  // The best few of each school in each place, and the best few of anything.
  const byPlace = new Map<string, Item[]>();
  const add = (key: string, it: Item) => { const l = byPlace.get(key) ?? []; l.push(it); byPlace.set(key, l); };
  for (const it of all) {
    const slot = templateOf(it).slot;
    add(`${slot}|${schoolOf(it)}`, it);
    add(`${slot}|any`, it);
  }
  for (const [key, list] of byPlace) {
    list.sort((x, y) => guess(s, y) - guess(s, x) || (x.id < y.id ? -1 : 1));
    byPlace.set(key, list.slice(0, COMPARE_PER_PLACE));
  }

  /*
   * 承 Trying a body only needs what would be on it: each place takes the piece and, by
   * carryRefine (the very function equip() calls), the higher of its refining and the
   * worn piece's. The chest it leaves behind changes neither power() nor rate(), so it is
   * made once per class, for the winner, by wearPieces. One read per set of pieces.
   */
  const seen = new Map<string, Read>();
  const read = (pick: Pick): Read => {
    const memo = SLOTS.map((slot) => pick[slot]?.id ?? '').join('|');
    const known = seen.get(memo);
    if (known) return known;
    const worn: Worn = { ...s.worn };
    for (const slot of SLOTS) {
      const it = pick[slot];
      if (!it || it === s.worn[slot]) continue;
      worn[slot] = carryRefine(it, s.worn[slot]).on;
    }
    const body = { ...s, worn };
    const out: Read = { power: power(body), rate: rate(body), key: callingKey(body) };
    seen.set(memo, out);
    return out;
  };

  const out: ClassBuild[] = [];
  const settle = (wanted: string, wants: readonly Want[]) => {
    let best: { pick: Pick; read: Read } | null = null;
    for (const want of wants) {
      const found = bestFor(want, byPlace, wanted, read);
      if (found && (!best || better(found.read, best.read))) best = found;
    }
    if (!best) return;
    const ids = idsOf(best.pick);
    const state = wearPieces(s, ids).state;
    const c = callingOf(state.worn);
    out.push({
      key: wanted, ids, state, power: power(state), rate: rate(state), worn: wearing(s, ids),
      ...(c.kind === 'pure' && c.school ? { school: c.school } : {}),
      ...(c.kind === 'pair' && c.pair ? { pair: c.pair.key } : {}),
    });
  };

  // 全 A school at its full: five of its pieces and one place free for anything.
  for (const school of SCHOOLS) {
    settle(`${school}:2`, SLOTS.map((free) =>
      Object.fromEntries(SLOTS.map((slot) => [slot, slot === free ? 'any' : school])) as Want));
  }
  // 合 A pair: three places of one school and three of the other, every way round.
  for (const p of PAIRS) {
    settle(p.key, HALVES.map((half) =>
      Object.fromEntries(SLOTS.map((slot) => [slot, half.includes(slot) ? p.a : p.b])) as Want));
  }
  return out;
}

/**
 * 算 What a body is read against besides its pieces: everything power(), rate() and a
 * floor's fight read off a save. A cached reading is kept while every one is the same object.
 */
const depsOf = (s: State): readonly unknown[] => [s.realm, s.layer, s.levels, s.stance, s.sequence, s.awakened,
  s.unlocked, s.brewed, s.tribulation, s.killed, s.chose, s.demons, s.tower];

/**
 * 算 Built once per chest and worn body, as bodyTotals is read once per body: both are
 * replaced rather than changed, so the objects themselves are the key.
 */
const BUILT = new WeakMap<object, WeakMap<object, Built>>();
interface Built { readonly deps: readonly unknown[]; readonly rows: readonly ClassBuild[]; readonly now: ClassBuild }

function built(s: State): Built {
  const deps = depsOf(s);
  let byWorn = BUILT.get(s.chest);
  if (!byWorn) { byWorn = new WeakMap(); BUILT.set(s.chest, byWorn); }
  const known = byWorn.get(s.worn);
  if (known && known.deps.every((d, i) => d === deps[i])) return known;
  const ids: Partial<Record<Slot, string>> = {};
  for (const slot of SLOTS) { const it = s.worn[slot]; if (it) ids[slot] = it.id; }
  const c = callingOf(s.worn);
  const now: ClassBuild = {
    key: callingKey(s) ?? 'none', ids, state: s, power: power(s), rate: rate(s), worn: true,
    ...(c.kind === 'pure' && c.school ? { school: c.school } : {}),
    ...(c.kind === 'pair' && c.pair ? { pair: c.pair.key } : {}),
  };
  const out = { deps, rows: buildAll(s), now };
  byWorn.set(s.worn, out);
  return out;
}

/**
 * 較 The strongest body of every class the chest can make, without the tower. Pure: the
 * same save gives the same bodies, and the save itself is never changed.
 */
export function classBuilds(s: State): readonly ClassBuild[] {
  return built(s).rows;
}

/** 今 What is worn now, read the same way, so the sheet can set it beside the rest. */
export function wornBuild(s: State): ClassBuild {
  return built(s).now;
}

/**
 * 塔 The highest floor a body beats, counting up from the next one, at most
 * COMPARE_FLOORS up. null if it cannot take the next floor, or the tower is shut.
 */
export function floorReach(s: State, from = nextFloor(s.tower)): number | null {
  if (!towerOpen(s)) return null;
  let top: number | null = null;
  for (let f = from; f < from + COMPARE_FLOORS; f++) {
    if (!beatable(s, floorBeast(f), floorPower(f))) break;
    top = f;
  }
  return top;
}

/** 塔 floorReach for a built body, read once: a build is never changed, so it is the key. */
const REACH = new WeakMap<ClassBuild, number | null>();
export function buildFloor(b: ClassBuild): number | null {
  if (REACH.has(b)) return REACH.get(b)!;
  const f = floorReach(b.state);
  REACH.set(b, f);
  return f;
}

/** 塔 What buildFloor has read for a body already, or undefined while it has not. */
export function knownFloor(b: ClassBuild): number | null | undefined {
  return REACH.has(b) ? REACH.get(b)! : undefined;
}

/** 較 Every class the chest can make, read in full: power, qi, and the tower. */
export function compareClasses(s: State): readonly ClassRead[] {
  return classBuilds(s).map((b) => ({ ...b, floor: buildFloor(b) }));
}
