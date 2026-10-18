/**
 * 珍 Trophies, and 冊 the book they fill. Pure, like the rest of sim/.
 *
 * Every common beast can leave one very rare thing (data/trophies.ts). It is not rolled on
 * a kill and stored: it is **read off the kills**, the way the marks are. Each beast's
 * hunting is cut into bars of effort (TROPHY_WINDOW, each bar TROPHY_GROW times the one
 * before), and one trophy lies at a seeded point inside each bar. A kill is one effort, and
 * the beast's own 精 絕 deep marks make each of its kills worth more (TROPHY_DEEP).
 *
 * Three things follow, and they are the reasons it is built this way:
 *
 *   1. **The odds are honest and they move.** The trophy is somewhere in what is left of
 *      the bar, so the chance on the next kill is one in what is left, and the hunt row can
 *      say so. Luck decides where in the bar it falls; the end of the bar is a promise.
 *   2. **Nothing has to be stored to be believed.** A save's trophies are its kills, which
 *      the server already bounds against the clock (verify.ts). An edited trophy count is
 *      not a thing a save can even say. Only what the player *did* with trophies is stored
 *      (`used`, `made`, `gilt`), and validate() holds each of those to the kills under it.
 *   3. **A drive finds them exactly as taps would**, because a drive is kills. That is the
 *      drive's own second rule (sim/hunt.ts), kept.
 *
 * 化 Spares (a trophy past the first of a beast) are rendered at the furnace, TROPHY_RENDER
 * of one realm into the one of that realm still missing. 鎏 And a page held whole can be
 * gilt at the forge with a spare of each of its three and a great deal of 材 material.
 *
 * 冊 The book pays power and never qi (PAGE_POWER, GILT_POWER, BOOK_POWER), capped by its
 * own size, so the economic law holds. 承 And what a life leaves, the pages it held, is kept
 * by the next one (`kept`), as the codex is: a rebirth never takes a finished page away.
 */
import { BEASTS, type Beast } from '../data/bestiary.ts';
import { BOOK_TITLE, PAGE_TITLES, TROPHIES, TROPHY_BY_BEAST, type Trophy } from '../data/trophies.ts';
import {
  BOOK_POWER, DEEP_MARKS, GILT_MATERIAL, GILT_POWER, GILT_STEP, PAGE_POWER,
  TROPHY_DEEP, TROPHY_GROW, TROPHY_RENDER, TROPHY_WINDOW,
} from './balance.ts';

export { TROPHIES, TROPHY_BY_BEAST, PAGE_TITLES, BOOK_TITLE, type Trophy };

export interface Trophies {
  /** 化 鎏 Trophies spent, by beast: rendered at the furnace or burned into a gilt page. */
  readonly used: Readonly<Record<string, number>>;
  /** 化 Trophies the furnace made out of spares, by beast. */
  readonly made: Readonly<Record<string, number>>;
  /** 鎏 The realms whose page is gilt. */
  readonly gilt: readonly number[];
  /** 承 What the lives before left, per realm (index realm - 1): 0 nothing, 1 the page, 2 gilt. */
  readonly kept: readonly number[];
}

export const NO_TROPHIES: Trophies = { used: {}, made: {}, gilt: [], kept: [] };

/** The slice of a state the book reads: the kills, the run's seed and the life it is in. */
export interface Hunter {
  readonly killed: Readonly<Record<string, number>>;
  readonly startedAt: number;
  readonly lives?: readonly unknown[];
  readonly trophy?: Trophies;
}

const COMMONS = BEASTS.filter((b) => !b.warden && TROPHY_BY_BEAST[b.key]);
const INDEX: Readonly<Record<string, number>> = Object.fromEntries(COMMONS.map((b, i) => [b.key, i]));

/** The commons of a realm that leave a trophy, in the table's order. */
export function pageBeasts(realm: number): readonly Beast[] {
  return COMMONS.filter((b) => b.realm === realm);
}

/** 精 What one kill of this beast is worth to its bar, at this many kills already made. */
export function effortPerKill(kills: number): number {
  let e = 1;
  DEEP_MARKS.forEach((at, i) => { if (kills >= at) e += TROPHY_DEEP[i] ?? 0; });
  return e;
}

/** 精 The effort this many kills of one beast add up to: one each, more past each deep mark. */
export function effortOf(kills: number): number {
  const k = Math.max(0, Math.floor(kills));
  let e = k;
  DEEP_MARKS.forEach((at, i) => { e += (TROPHY_DEEP[i] ?? 0) * Math.max(0, k - at); });
  return e;
}

/**
 * 量 The knife-edge check's lever, for the harnesses alone (tools/trophies.ts): every bar, the
 * book's power and the gilding's material scaled by these. The game never calls it, so in the
 * game they are always 1, and the save holds nothing that depends on them.
 */
const SCALE = { window: 1, power: 1, material: 1 };
export function scaleTrophies(x: Partial<typeof SCALE>): void {
  Object.assign(SCALE, { window: 1, power: 1, material: 1 }, x);
  FOUND.clear();
}

/** Where bar j begins and how long it is. */
export function barAt(j: number): { start: number; size: number } {
  const g: number = TROPHY_GROW;
  const w = TROPHY_WINDOW * SCALE.window;
  const size = w * g ** j;
  const start = g === 1 ? w * j : (w * (g ** j - 1)) / (g - 1);
  return { start, size };
}

/** Deterministic noise from three numbers: the same run, beast and bar always give the same point. */
function mix(a: number, b: number, c: number): number {
  let h = (Math.imul((a >>> 0) ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(b + 1, 0xc2b2ae35) ^ Math.imul(c + 7, 0x27d4eb2f)) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x7feb352d) >>> 0;
  h = Math.imul(h ^ (h >>> 15), 0x846ca68b) >>> 0;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/** 珍 The point inside bar j where this beast's trophy lies, as effort from the bar's start: (0, size]. */
export function pointIn(h: Hunter, key: string, j: number): number {
  const { size } = barAt(j);
  const u = mix(Math.floor(h.startedAt), (INDEX[key] ?? 0) * 31 + (h.lives?.length ?? 0) * 1009, j);
  return Math.max(1, Math.ceil(u * size));
}

/** 珍 How many of this beast's trophies its kills have found: every bar whose point the effort has passed. */
export function found(h: Hunter, key: string): number {
  if (INDEX[key] === undefined) return 0;
  const kills = h.killed[key] ?? 0;
  if (kills <= 0) return 0;
  // 算 power() reads the book, and power is read inside every simulated fight, so the
  // count is remembered by everything it depends on. It is a pure function of those four.
  const id = `${h.startedAt}|${h.lives?.length ?? 0}|${key}|${kills}`;
  const hit = FOUND.get(id);
  if (hit !== undefined) return hit;
  if (FOUND.size > 50_000) FOUND.clear();
  const n = countFound(h, key, effortOf(kills));
  FOUND.set(id, n);
  return n;
}

const FOUND = new Map<string, number>();

function countFound(h: Hunter, key: string, e: number): number {
  let n = 0;
  for (let j = 0; j < 64; j++) {
    const { start } = barAt(j);
    if (start >= e) break;
    if (start + pointIn(h, key, j) <= e) n++;
  }
  return n;
}

/** 珍 Trophies of this beast in hand: found, plus made at the furnace, less those spent. */
export function held(h: Hunter, key: string): number {
  const t = h.trophy ?? NO_TROPHIES;
  return Math.max(0, found(h, key) + (t.made[key] ?? 0) - (t.used[key] ?? 0));
}

/** 化 The ones past the first: what the furnace and the forge may take. */
export function spares(h: Hunter, key: string): number {
  return Math.max(0, held(h, key) - 1);
}

/**
 * 珍 The bar a beast stands in now, for the hunt row: which bar, how far in, how long, whether
 * its trophy has already fallen, and the honest chance the next kill finds it.
 */
export interface Bar {
  readonly bar: number;
  readonly into: number;
  readonly size: number;
  readonly fallen: boolean;
  /** The chance on the next kill: this kill's effort over what is left of the bar. 0 once fallen. */
  readonly chance: number;
  /** Kills left until the bar ends, at this beast's present effort per kill. */
  readonly killsLeft: number;
}

export function barOf(h: Hunter, key: string): Bar {
  const kills = h.killed[key] ?? 0;
  const e = effortOf(kills);
  let j = 0;
  while (barAt(j + 1).start <= e && j < 63) j++;
  const { start, size } = barAt(j);
  const into = e - start;
  const fallen = start + pointIn(h, key, j) <= e;
  const per = effortPerKill(kills);
  const left = Math.max(0, size - into);
  return {
    bar: j, into, size, fallen,
    chance: fallen ? 0 : Math.min(1, per / Math.max(1, left)),
    killsLeft: Math.ceil(left / per),
  };
}

/** 冊 Is a realm's page whole in this life: each of its three trophies held. */
export function pageWhole(h: Hunter, realm: number): boolean {
  const of = pageBeasts(realm);
  return of.length > 0 && of.every((b) => held(h, b.key) > 0);
}

/** 冊 A page's level, counting what the lives before kept: 0 none, 1 whole, 2 gilt. */
export function pageLevel(h: Hunter, realm: number): number {
  const t = h.trophy ?? NO_TROPHIES;
  const now = pageWhole(h, realm) ? (t.gilt.includes(realm) ? 2 : 1) : 0;
  return Math.max(now, t.kept[realm - 1] ?? 0);
}

export function pagesHeld(h: Hunter): number {
  let n = 0;
  for (let r = 1; r <= 9; r++) if (pageLevel(h, r) > 0) n++;
  return n;
}

export function pagesGilt(h: Hunter): number {
  let n = 0;
  for (let r = 1; r <= 9; r++) if (pageLevel(h, r) > 1) n++;
  return n;
}

export function bookWhole(h: Hunter): boolean {
  return pagesHeld(h) === 9;
}

/** 冊 What the book adds to power, as a multiplier. Never to qi. */
export function trophyPower(h: Hunter): number {
  if (!h.trophy && !Object.keys(h.killed).length) return 1;
  const pages = pagesHeld(h);
  return 1 + SCALE.power * (PAGE_POWER * pages + GILT_POWER * pagesGilt(h) + (pages === 9 ? BOOK_POWER : 0));
}

/** 冊 The most the book can ever be worth, for the screen that promises it. */
export function trophyCeiling(): number {
  return 1 + 9 * PAGE_POWER + 9 * GILT_POWER + BOOK_POWER;
}

/** Every trophy found or made, across the book: what the record line counts. */
export function trophiesHeld(h: Hunter): number {
  return COMMONS.reduce((n, b) => n + held(h, b.key), 0);
}

/** 冊 The title a cultivator wears from the book: the whole book's, or the highest page's, or none. */
export function bookTitle(h: Hunter): { han: string; name: string } | null {
  if (bookWhole(h)) return BOOK_TITLE;
  for (let r = 9; r >= 1; r--) if (pageLevel(h, r) > 0) return PAGE_TITLES[r - 1];
  return null;
}

/* ── 化 The furnace and 鎏 the forge ─────────────────────────────────────────── */

/** 化 Spares of a realm's other two beasts, which is what can be rendered into this one. */
export function renderable(h: Hunter, key: string): number {
  const b = COMMONS.find((x) => x.key === key);
  if (!b) return 0;
  return pageBeasts(b.realm).filter((x) => x.key !== key).reduce((n, x) => n + spares(h, x.key), 0);
}

export function canRender(h: Hunter, key: string): boolean {
  return renderable(h, key) >= TROPHY_RENDER;
}

/**
 * 化 Render TROPHY_RENDER spares of a realm's other beasts into one of this beast's trophy,
 * the largest pile first. The same state back when it cannot be done.
 */
export function render<S extends Hunter>(s: S, key: string): S {
  if (!canRender(s, key)) return s;
  const b = COMMONS.find((x) => x.key === key)!;
  const t = s.trophy ?? NO_TROPHIES;
  const used = { ...t.used };
  let owe = TROPHY_RENDER;
  let at: S = s;
  while (owe > 0) {
    const from = pageBeasts(b.realm).filter((x) => x.key !== key)
      .sort((x, y) => spares(at, y.key) - spares(at, x.key))[0];
    if (!from || spares(at, from.key) <= 0) return s;
    used[from.key] = (used[from.key] ?? 0) + 1;
    owe--;
    at = { ...s, trophy: { ...t, used } };
  }
  return { ...s, trophy: { ...t, used, made: { ...t.made, [key]: (t.made[key] ?? 0) + 1 } } };
}

/** 鎏 What gilding a realm's page costs in 材 material. */
export function giltCost(realm: number): number {
  return GILT_MATERIAL * SCALE.material * GILT_STEP ** (Math.max(1, Math.min(9, realm)) - 1);
}

/** 鎏 A whole page, not yet gilt, with a spare of each of its three. Material aside. */
export function giltReady(h: Hunter, realm: number): boolean {
  const t = h.trophy ?? NO_TROPHIES;
  return pageWhole(h, realm) && !t.gilt.includes(realm) && pageBeasts(realm).every((b) => spares(h, b.key) > 0);
}

export function canGild<S extends Hunter & { readonly materials: number }>(s: S, realm: number): boolean {
  return giltReady(s, realm) && s.materials >= giltCost(realm);
}

/** 鎏 Gild a page: a spare of each of its three and giltCost of material, for GILT_POWER, for good. */
export function gild<S extends Hunter & { readonly materials: number }>(s: S, realm: number): S {
  if (!canGild(s, realm)) return s;
  const t = s.trophy ?? NO_TROPHIES;
  const used = { ...t.used };
  for (const b of pageBeasts(realm)) used[b.key] = (used[b.key] ?? 0) + 1;
  return { ...s, materials: s.materials - giltCost(realm), trophy: { ...t, used, gilt: [...t.gilt, realm].sort((a, c) => a - c) } };
}

/* ── 承 Rebirth, and 守 a save is input ──────────────────────────────────────── */

/** 承 What a life that ends leaves the next: each page's level, the kept ones included. */
export function trophyToKeep(h: Hunter): number[] {
  const out = Array.from({ length: 9 }, (_, i) => pageLevel(h, i + 1));
  return out.some((x) => x > 0) ? out : [];
}

/** 承 Whether record `a` keeps every page at least as high as record `b`. */
export function keptCoversPages(a: readonly number[] | undefined, b: readonly number[] | undefined): boolean {
  for (let i = 0; i < 9; i++) if ((a?.[i] ?? 0) < (b?.[i] ?? 0)) return false;
  return true;
}

const int = (x: unknown, hi: number) => {
  const n = typeof x === 'number' && Number.isFinite(x) ? Math.floor(x) : 0;
  return Math.max(0, Math.min(hi, n));
};

/**
 * 守 The trophy record from a save, held to the kills under it. `h` carries the validated
 * kills, start and lives.
 *
 *   - Only beasts that leave a trophy, and whole numbers.
 *   - 化 Per realm, what the furnace made is paid for: TROPHY_RENDER spent for each one,
 *     and three more for a gilt page. A realm that does not add up loses its made ones,
 *     and then its gilt, rather than the save being refused.
 *   - A trophy is never spent that was not found or made.
 *   - 承 And a kept record only in a life that is not the first.
 */
export function validTrophies(raw: unknown, h: Hunter): Trophies {
  const o = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const read = (x: unknown) => {
    const src = (x && typeof x === 'object' ? x : {}) as Record<string, unknown>;
    const out: Record<string, number> = {};
    for (const b of COMMONS) { const n = int(src[b.key], 1e6); if (n > 0) out[b.key] = n; }
    return out;
  };
  const made = read(o.made);
  const used = read(o.used);
  let gilt = (Array.isArray(o.gilt) ? o.gilt : [])
    .map((x) => int(x, 9)).filter((r, i, all) => r >= 1 && all.indexOf(r) === i).sort((a, c) => a - c);
  for (let r = 1; r <= 9; r++) {
    const of = pageBeasts(r);
    const spent = of.reduce((n, b) => n + (used[b.key] ?? 0), 0);
    const owed = TROPHY_RENDER * of.reduce((n, b) => n + (made[b.key] ?? 0), 0) + (gilt.includes(r) ? of.length : 0);
    if (spent < owed) for (const b of of) delete made[b.key];
    const owedNow = gilt.includes(r) ? of.length : 0;
    if (spent < owedNow || !of.every((b) => (used[b.key] ?? 0) > 0)) gilt = gilt.filter((x) => x !== r);
  }
  for (const b of COMMONS) {
    const cap = found(h, b.key) + (made[b.key] ?? 0);
    if ((used[b.key] ?? 0) > cap) used[b.key] = cap;
    if (!used[b.key]) delete used[b.key];
  }
  const lives = h.lives?.length ?? 0;
  const keptRaw = Array.isArray(o.kept) ? o.kept : [];
  const kept = lives > 0 ? Array.from({ length: 9 }, (_, i) => int(keptRaw[i], 2)) : [];
  return { used, made, gilt, kept: kept.some((x) => x > 0) ? kept : [] };
}

/** For a screen: every trophy with its beast, by realm. */
export function trophiesOf(realm: number): readonly { beast: Beast; trophy: Trophy }[] {
  return pageBeasts(realm).map((beast) => ({ beast, trophy: TROPHY_BY_BEAST[beast.key] }));
}
