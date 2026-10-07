/**
 * 百煉 The Hundredfold sets and 譜 the codex, as the simulation sees them: pure, like the rest
 * of `sim/`.
 *
 * A Hundredfold piece is a piece of its realm's set made at the forge, and only there. The
 * player chooses its shape and its rank; every line on it comes from what is put in the
 * crucible (data/hundred.ts CRUCIBLE), and one, two or three portions of a material put the
 * line at the bottom, the middle or the top of the band any drop rolls in (HUNDRED_BAND).
 * Nothing about a piece is rolled, so the same order always makes the same piece.
 *
 * 律 A line is never better than the best a drop of the same shape, realm and rank could
 * roll, and a 氣 line goes through the same gear bend as any other. So a forged set can
 * never raise the qi rate past what a dropped one could, and the economic law holds.
 *
 * 譜 What a set leaves is derived, never stored. The workshop already counts every recipe it
 * has made (Crafts.made), and a Hundredfold recipe is one per realm, place and rank, so the
 * codex is read off those counts: a set is finished at a rank when each of its six places
 * has been made at that rank or above. The counts are capped by the experience the forge
 * earned (validCrafts), so a codex cannot be claimed without the hours.
 */
import {
  CODEX_CAP, CODEX_RANK, CODEX_STEP, CODEX_WORN, CRAFT_RENDER_KNOWN, HUNDRED_BAND, HUNDRED_BREACH,
  HUNDRED_HEAVEN_MADE, HUNDRED_INGOTS, HUNDRED_KIT, HUNDRED_PORTION, SECONDARIES, SECONDARY_SHARE,
} from './balance.ts';
import {
  FORGED, HUNDRED_RANKS, RECIPES, RECIPE_BY_KEY, hundredElite, hundredKey, levelOf, metalKey,
  type HundredRank, type Recipe,
} from '../data/crafts.ts';
import {
  AFFIXES, RARITIES, SLOTS, TEMPLATE_BY_KEY, baseValue, roundValue,
  type Affix, type GearTemplate, type Item, type Roll, type Slot, type Worn,
} from '../data/gear.ts';
import { BEASTS, wardenOf } from '../data/bestiary.ts';
import { CODEX, CRUCIBLE, codexOf, type CodexKey } from '../data/hundred.ts';
import type { State } from './state.ts';
import type { Kit } from './kit.ts';

/** 爐 One, two or three portions of a material. */
export type Portions = 1 | 2 | 3;

/**
 * 爐 What is in the crucible: the shape (a template of the set's realm), the rank, how many
 * portions of ingots go to the main line, and for every other line the axis and how many
 * portions of its material. A rank carries as many lines as a drop of it (SECONDARIES).
 */
export interface Order {
  readonly template: string;
  readonly rarity: HundredRank;
  readonly main: Portions;
  readonly lines: readonly { readonly affix: Affix; readonly n: Portions }[];
}

const isPortions = (x: unknown): x is Portions => x === 1 || x === 2 || x === 3;

/** 數 How many of a crucible material one portion is, for a piece of this realm. */
export const portionOf = (realm: number) => HUNDRED_PORTION * Math.max(1, Math.min(9, realm));

/** The recipe an order is made by: its shape's realm and place, at its rank. */
export function orderRecipe(o: Order): Recipe | undefined {
  const tpl = TEMPLATE_BY_KEY[o.template];
  return tpl ? RECIPE_BY_KEY[hundredKey(tpl.realm, tpl.slot, o.rarity)] : undefined;
}

/** 線 The value a line takes at this many portions: the bottom, middle or top of its band. */
export function lineValue(tpl: GearTemplate, rarity: HundredRank, affix: Affix, n: Portions, primary: boolean): number {
  return roundValue(affix, baseValue(tpl, rarity, affix) * (primary ? 1 : SECONDARY_SHARE) * HUNDRED_BAND[n - 1]);
}

/** 頂 The most a line can be on a Hundredfold piece: three portions, the top of the band. */
export function bandTop(tpl: GearTemplate, rarity: HundredRank, affix: Affix, primary: boolean): number {
  return lineValue(tpl, rarity, affix, 3, primary);
}

/** 爐 Everything an order asks for: the recipe's own needs, more ingots, and each line's material. */
export function orderNeeds(o: Order): readonly (readonly [string, number])[] {
  const r = orderRecipe(o);
  const tpl = TEMPLATE_BY_KEY[o.template];
  if (!r || !tpl) return [];
  const out = new Map<string, number>();
  const add = (k: string, n: number) => out.set(k, (out.get(k) ?? 0) + n);
  for (const [k, n] of r.needs) add(k, k === metalKey(tpl.realm) ? HUNDRED_INGOTS * o.main : n);
  for (const l of o.lines) add(CRUCIBLE[l.affix](tpl.realm), portionOf(tpl.realm) * l.n);
  return [...out.entries()];
}

/** 器 The piece an order makes. `id` is the caller's, so the workshop's dice stay its own. */
export function pieceOf(o: Order, id: string): Item | null {
  const tpl = TEMPLATE_BY_KEY[o.template];
  if (!tpl) return null;
  const rolls: Roll[] = [{ affix: tpl.affix, value: lineValue(tpl, o.rarity, tpl.affix, o.main, true) },
    ...o.lines.map((l) => ({ affix: l.affix, value: lineValue(tpl, o.rarity, l.affix, l.n, false) }))];
  return { id, template: tpl.key, rarity: o.rarity, rolls, from: FORGED, hundred: true };
}

/** The axes a line of this shape may take: every one but the shape's own, each once. */
export function lineAxes(tpl: GearTemplate): readonly Affix[] {
  return AFFIXES.filter((a) => a !== tpl.affix);
}

/**
 * 守 An order from a save, or null: a real shape of a realm reached, a rank the forge makes,
 * as many lines as the rank carries, each on its own axis and never the shape's own, and
 * one to three portions of everything. Anything else is no order at all.
 */
export function validOrder(raw: unknown, realm: number): Order | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const tpl = typeof o.template === 'string' ? TEMPLATE_BY_KEY[o.template] : undefined;
  if (!tpl || tpl.realm > realm) return null;
  const rarity = HUNDRED_RANKS.includes(o.rarity as HundredRank) ? o.rarity as HundredRank : null;
  if (!rarity || !isPortions(o.main) || !Array.isArray(o.lines)) return null;
  if (o.lines.length !== SECONDARIES[rarity]) return null;
  const seen = new Set<Affix>();
  const lines: { affix: Affix; n: Portions }[] = [];
  for (const x of o.lines) {
    const l = (x ?? {}) as Record<string, unknown>;
    const affix = l.affix as Affix;
    if (!lineAxes(tpl).includes(affix) || seen.has(affix) || !isPortions(l.n)) return null;
    seen.add(affix);
    lines.push({ affix, n: l.n });
  }
  return { template: tpl.key, rarity, main: o.main, lines };
}

/* ── 譜 The codex, read off the pieces made ─────────────────────────────────── */

type Made = Readonly<Record<string, number>>;

/** 階 The best rank each place of a realm's set has been made at: -1, or 0 Mystic to 2 Heaven. */
export function placesMade(made: Made, realm: number): Readonly<Record<Slot, number>> {
  const out = {} as Record<Slot, number>;
  for (const slot of SLOTS) {
    let best = -1;
    HUNDRED_RANKS.forEach((rank, i) => { if ((made[hundredKey(realm, slot, rank)] ?? 0) > 0) best = i; });
    out[slot] = best;
  }
  return out;
}

/** 數 Every piece of a realm's set ever made, at any rank. */
export function piecesMade(made: Made, realm: number): number {
  let n = 0;
  for (const slot of SLOTS) for (const rank of HUNDRED_RANKS) n += made[hundredKey(realm, slot, rank)] ?? 0;
  return n;
}

const RANK_CACHE = new WeakMap<object, number[]>();
/**
 * 譜 How far a realm's set has been finished: 0 not yet, 1 Mystic, 2 Earth, 3 Heaven. A set is
 * finished at a rank when all six places have been made at it or above, once each.
 */
export function codexRank(made: Made, realm: number): 0 | 1 | 2 | 3 {
  let ranks = RANK_CACHE.get(made);
  if (!ranks) {
    ranks = CODEX.map((c) => 1 + Math.min(...Object.values(placesMade(made, c.realm))));
    RANK_CACHE.set(made, ranks);
  }
  return Math.max(0, Math.min(3, ranks[Math.max(1, Math.min(9, realm)) - 1])) as 0 | 1 | 2 | 3;
}

/** 百 How many Hundredfold pieces of a realm's set are worn, and at what ranks. */
export function wornOfSet(worn: Worn, realm: number): Item[] {
  return SLOTS.map((x) => worn[x]).filter((it): it is Item =>
    !!it && it.hundred === true && TEMPLATE_BY_KEY[it.template]?.realm === realm);
}

/** 百 The most Hundredfold pieces of any one set worn together: what the steps read. */
export function hundredWorn(worn: Worn): number {
  let most = 0;
  for (let r = 1; r <= 9; r++) most = Math.max(most, wornOfSet(worn, r).length);
  return most;
}

type Body = Pick<State, 'worn' | 'crafts'>;

/**
 * 譜 What a codex bonus is worth to this cultivator now, as a share (0.08 is 8%) or, for 瓶
 * the bottlenecks, in days: its step, times its rank, doubled while the whole set is worn,
 * and never past its cap.
 */
export function codexValue(s: Body, key: CodexKey): number {
  const entry = CODEX.find((c) => c.key === key)!;
  const rank = codexRank(s.crafts?.made ?? {}, entry.realm);
  if (rank === 0) return 0;
  const whole = wornOfSet(s.worn ?? {}, entry.realm).length >= SLOTS.length;
  return codexWorth(key, rank, whole);
}

/** 譜 A codex bonus at a rank (1 Mystic to 3 Heaven), whole or not: the page quotes every one. */
export function codexWorth(key: CodexKey, rank: 1 | 2 | 3, whole: boolean): number {
  return Math.min(CODEX_CAP[key], CODEX_STEP[key] * CODEX_RANK[rank - 1] * (whole ? CODEX_WORN : 1));
}

/** 譜 What a bonus that thins a fight multiplies the beast's power by: 1 less its share. */
export function codexFoe(s: Body, key: 'elite' | 'vault' | 'demon' | 'tower' | 'platform'): number {
  return 1 - codexValue(s, key);
}

/**
 * 百 What the Hundredfold steps and 雷紋 the Thunderscript codex do to what is carried into a
 * fight: at two pieces of one set worn, every effect a quarter stronger; at four, and with
 * the codex, days more of a warden's bottleneck for each thing carried. `used` is how many
 * things took part. Called once, at the end of kitFor, on what the carried things did.
 */
export function hundredKit<K extends { strike: number; taken: number; mend: number; reflect: number; demon: number; breach: number }>(
  s: Body, warden: boolean, k: K, used: number,
): K {
  if (used <= 0) return k;
  const n = hundredWorn(s.worn ?? {});
  const amp = n >= 2 ? 1 + HUNDRED_KIT : 1;
  const days = warden ? used * ((n >= 4 ? HUNDRED_BREACH : 0) + codexValue(s, 'gates')) : 0;
  if (amp === 1 && days === 0) return k;
  return {
    ...k,
    strike: 1 + (k.strike - 1) * amp,
    taken: Math.max(0, 1 - (1 - k.taken) * amp),
    mend: k.mend * amp,
    reflect: k.reflect * amp,
    demon: Math.max(0, 1 - (1 - k.demon) * amp),
    breach: k.breach + days,
  };
}

/**
 * 驗 The most the Hundredfold steps and the Thunderscript codex could add to the best kit
 * (bestKit in sim/crafts.ts), for the server, which sees the body at the end and not the one
 * a fight was fought in: every Hundredfold piece the save holds, worn or in the chest, counts
 * as if worn together, and both hands as carried.
 */
export function bestHundred<K extends Kit>(s: Pick<State, 'worn' | 'chest' | 'crafts'>, where: string, k: K): K {
  const held: Worn[] = [];
  for (let r = 1; r <= 9; r++) {
    const body: Partial<Record<Slot, Item>> = {};
    for (const it of [...SLOTS.map((x) => s.worn[x]), ...(s.chest ?? [])]) {
      const tpl = it?.hundred ? TEMPLATE_BY_KEY[it.template] : undefined;
      if (it && tpl?.realm === r && !body[tpl.slot]) body[tpl.slot] = it;
    }
    held.push(body);
  }
  const best = held.reduce((a, b) => (Object.keys(b).length > Object.keys(a).length ? b : a), {} as Worn);
  const gates = held[6] ?? {};
  const body = { worn: Object.keys(gates).length >= SLOTS.length ? gates : best, crafts: s.crafts };
  const amp = hundredKit({ worn: best, crafts: { ...s.crafts, made: {} } }, false,
    { strike: k.strike, taken: k.taken, mend: k.mend, reflect: k.reflect, demon: k.demon, breach: 0 }, 2);
  const days = where === 'warden'
    ? 2 * ((Object.keys(best).length >= 4 ? HUNDRED_BREACH : 0) + codexValue(body, 'gates')) : 0;
  return { ...k, ...amp, breach: (k.breach ?? 0) + days };
}

/** 器靈 The set whose six pieces, all Hundredfold and all Heaven, are worn: its spirit is awake. */
export function spiritOf(worn: Worn): number | null {
  for (let r = 9; r >= 1; r--) {
    const w = wornOfSet(worn, r);
    if (w.length >= SLOTS.length && w.every((x) => x.rarity === 'heaven')) return r;
  }
  return null;
}

/* ── 守 A save is input ─────────────────────────────────────────────────────── */

/** 解 Whether a beast is known to Rendering by these kills: ten of a common, one warden. */
function knows(killed: Readonly<Record<string, number>>, key: string): boolean {
  const warden = BEASTS.find((b) => b.key === key)?.warden ?? false;
  return (killed[key] ?? 0) >= (warden ? 1 : CRAFT_RENDER_KNOWN);
}

/** 霸 Whether a realm's set could have been made at all: its elite and its warden known. */
export function setOpen(killed: Readonly<Record<string, number>>, realm: number): boolean {
  return knows(killed, hundredElite(realm).key) && knows(killed, wardenOf(realm).key);
}

/**
 * 守 The pieces made, as a save may hold them: only sets whose elite and warden were known
 * (their parts are in every piece), and a Heaven piece only where the set has the
 * HUNDRED_HEAVEN_MADE others it asks for. Called by validCrafts on counts it has already
 * held to the forge's level, the realm and the experience.
 */
export function validHundredMade(made: Record<string, number>, killed: Readonly<Record<string, number>>): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [k, n] of Object.entries(made)) {
    const r = RECIPE_BY_KEY[k];
    if (r?.makes.kind !== 'hundred') { out[k] = n; continue; }
    if (setOpen(killed, r.makes.realm)) out[k] = n;
  }
  for (let realm = 1; realm <= 9; realm++) {
    const all = piecesMade(out, realm);
    const heaven = SLOTS.reduce((t, slot) => t + (out[hundredKey(realm, slot, 'heaven')] ?? 0), 0);
    if (heaven > 0 && all - heaven < HUNDRED_HEAVEN_MADE) {
      for (const slot of SLOTS) delete out[hundredKey(realm, slot, 'heaven')];
    }
  }
  return out;
}

/** 線 Whether a piece's lines are ones the crucible could have put on it: the band, and one each. */
export function linesFit(it: Item): boolean {
  const tpl = TEMPLATE_BY_KEY[it.template];
  if (!tpl || !HUNDRED_RANKS.includes(it.rarity as HundredRank)) return false;
  const rarity = it.rarity as HundredRank;
  if (it.rolls.length !== 1 + SECONDARIES[rarity] || it.rolls[0].affix !== tpl.affix) return false;
  const seen = new Set<Affix>();
  return it.rolls.every((r, i) => {
    if (seen.has(r.affix)) return false;
    seen.add(r.affix);
    return r.value <= bandTop(tpl, rarity, r.affix, i === 0) + 1e-9;
  });
}

/** 守 Whether a Hundredfold mark is backed by the pieces this save has made. */
export function backed(made: Made, it: Item): boolean {
  const tpl = TEMPLATE_BY_KEY[it.template];
  return !!tpl && HUNDRED_RANKS.includes(it.rarity as HundredRank)
    && (made[hundredKey(tpl.realm, tpl.slot, it.rarity as HundredRank)] ?? 0) > 0;
}

/**
 * 守 A piece from a save with the mark kept only where the save backs it. One without is
 * still the forged piece it is, its lines already held to the band by validate().
 */
export function backHundred(made: Made): (it: Item) => Item {
  return (it) => {
    if (!it.hundred || backed(made, it)) return it;
    const { hundred: _, ...rest } = it;
    return rest;
  };
}

/**
 * 物 Whether a crucible material for this line could ever have been in the pouch: the craft
 * that gathers it at the level and realm it asks for. A Hundredfold piece of the third realm
 * with a 拾 line needs Immortal Gold, which only the ninth realm's veins give.
 */
export function materialReached(s: Pick<State, 'realm' | 'crafts'>, key: string): boolean {
  const r = RECIPES.find((x) => x.makes.kind === 'item' && x.makes.item === key);
  if (!r) return false;
  return s.realm >= r.realm && levelOf(s.crafts?.xp?.[r.skill] ?? 0) >= r.level;
}

/**
 * 驗 Whether every Hundredfold thing in a save could have been made honestly: the codex its
 * counts claim (sets opened, Heaven only after five), and every marked piece backed by those
 * counts, its lines inside the band, and each line's material one the save could have had.
 * The server reads it on every sync; validate() already trims what it would refuse, so an
 * honest save always passes and a hand-made one never gets this far unchanged.
 */
export function hundredFits(s: Pick<State, 'realm' | 'killed' | 'worn' | 'chest' | 'crafts'>): boolean {
  const made = s.crafts?.made ?? {};
  const fair = validHundredMade({ ...made }, s.killed ?? {});
  for (const [k, n] of Object.entries(made)) {
    const r = RECIPE_BY_KEY[k];
    if (r?.makes.kind !== 'hundred') continue;
    if (fair[k] !== n || s.realm < r.realm || levelOf(s.crafts.xp.forge ?? 0) < r.level) return false;
  }
  const pieces = [...SLOTS.map((x) => s.worn[x]), ...s.chest].filter((x): x is Item => !!x && x.hundred === true);
  return pieces.every((it) => {
    const tpl = TEMPLATE_BY_KEY[it.template];
    return it.from === FORGED && backed(made, it) && linesFit(it)
      && it.rolls.slice(1).every((l) => materialReached(s, CRUCIBLE[l.affix](tpl.realm)));
  });
}

/** 階 A rank's place on the ladder, 2 Mystic to 4 Heaven, for a frame or a colour. */
export const rankIndex = (rank: HundredRank) => RARITIES.indexOf(rank);

export { HUNDRED_RANKS, codexOf };
