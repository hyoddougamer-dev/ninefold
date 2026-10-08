import { RARITIES, TEMPLATE_BY_KEY, baseValue, type Item, type Rarity } from '../data/gear.ts';
import { addToChest, chestLimit, fusable, fuse, fuseThree, fusedPrimary, fusedQuality, fusesInto } from './chest.ts';
import { dropsRankUp, fuseQuality } from './dao.ts';
import { melt, returnMetal } from './salvage.ts';
import { bodyTotals, gearFuse } from './schools.ts';
import { keptByFilter } from './filters.ts';
import { taskBody } from './sets.ts';
import type { State } from './state.ts';
import { FORGED } from '../data/crafts.ts';

/**
 * 藏 Where a piece goes when it is found: the one way, for the game and the harnesses.
 *
 * It was written four times. The harness, a meeting and 秘境 the vault each melted what a
 * full chest turned away into qi; the game's own kill and drive threw it on the floor,
 * so the curves counted qi no player was ever paid. And 空囊 Empty Pouch lifted a drop a
 * rank only in the game, so the harness measured a tree node that did nothing. One
 * function now, called from all of them.
 */

/** How many pieces this cultivator's chest holds. */
export function limitFor(s: State): number {
  return chestLimit(s.unlocked, bodyTotals(s).capacity, s.awakened);
}

/**
 * 空囊 The chest's size once node `key` is learned, when the chest already holds more
 * than that, or null when the node leaves room enough. Empty Pouch caps the chest at 12,
 * and a chest of thirty would sit over its limit with nothing to say why. So it is refused
 * rather than repaired, the way 改 a card trade is refused over chest places (retrade.ts):
 * the player melts or fuses first, and chooses which pieces go.
 */
export function capRefuses(s: State, key: string): number | null {
  const room = limitFor({ ...s, unlocked: [...s.unlocked, key] });
  return s.chest.length > room && room < limitFor(s) ? room : null;
}

/**
 * 空囊 A drop a rank higher, when the tree says so. A drop, not a forged piece: the forge
 * shows its odds on the recipe, and a piece that came out a rank above them would make
 * those odds wrong on the one screen that quotes them.
 */
export function lifted(s: State, item: Item): Item {
  if (!dropsRankUp(s.unlocked) || item.from === FORGED) return item;
  const i = Math.min(RARITIES.length - 1, RARITIES.indexOf(item.rarity) + 1);
  return { ...item, rarity: RARITIES[i] };
}

export interface Stashed {
  readonly state: State;
  /** The piece as it went in, 空囊 applied. */
  readonly item: Item | null;
  /** Whatever a full chest turned away (the new piece, or its weakest), melted. */
  readonly dropped: Item | null;
  readonly melted: number;
  /** 材 What the cast-off melted into once the melting allowance was spent. */
  readonly meltedMaterial: number;
  /**
   * 熔 The piece that went was one no kept filter shows, while the player keeps some: it may
   * have been stronger than the one that stayed, so the screen must not call it the weakest.
   */
  readonly unkept: boolean;
}

export function stash(s: State, found: Item | null, lift = true): Stashed {
  if (!found) return { state: s, item: null, dropped: null, melted: 0, meltedMaterial: 0, unkept: false };
  // 圍 A drive's pile is lifted when it falls, so it is stashed as it is (sim/pile.ts).
  const item = lift ? lifted(s, found) : found;
  // 熔 A full chest melts what no kept filter shows first (sim/filters.ts).
  const kept = addToChest(s.chest, item, limitFor(s), (it) => keptByFilter(s.filters, it));
  const m = kept.dropped ? melt(s, [kept.dropped]) : null;
  const state = { ...(m ? m.state : s), chest: [...kept.chest] };
  return {
    state: kept.dropped ? returnMetal(state, [kept.dropped]) : state,
    item, dropped: kept.dropped, melted: m?.qi ?? 0, meltedMaterial: m?.materials ?? 0,
    unkept: !!kept.dropped && s.filters.some((f) => f.keep) && !keptByFilter(s.filters, kept.dropped),
  };
}

/**
 * 煉 What this cultivator multiplies a fusion's quality by: 巧手 on the tree, 煉 on the body.
 * 套 The body is the fusing loadout's when one is given (sets.ts taskBody), what is worn when not.
 */
export function fusionQuality(s: State): number {
  return fuseQuality(s.unlocked) * gearFuse(taskBody(s, 'fuse'));
}

/**
 * 質 What a fusion of this group would come out at, read before the tap (sim/chest.ts): the
 * quality of the first line it would make, rounded and held to fusedTop as fuse() holds it,
 * so the number on the button is the number on the piece.
 */
export function fuseQuote(s: State, template: string, rarity: Rarity): number {
  const q = fusedQuality(fuseThree(s.chest, template, rarity), fusionQuality(s));
  const up = fusesInto(rarity);
  const tpl = TEMPLATE_BY_KEY[template];
  if (!up || !tpl || q <= 0) return q;
  const base = baseValue(tpl, up, tpl.affix);
  return base > 0 ? fusedPrimary(tpl, up, q) / base : q;
}

/**
 * 煉 Three become one, with everything this cultivator brings to a fusion: 巧手 Deft
 * Hands on the tree and the 煉 line on the body. The game's button and the harnesses call
 * this one function, so what the curves measure is what the button does.
 */
export function fuseIn(s: State, template: string, rarity: Rarity): { state: State; made: Item | null } {
  const worn = Object.values(s.worn).filter((x): x is Item => !!x).map((x) => x.id);
  const out = fuse(s.chest, template, rarity, fusionQuality(s), worn);
  return out.made ? { state: { ...s, chest: [...out.chest] }, made: out.made } : { state: s, made: null };
}

/**
 * 煉 Fuse every group: three of a kind become one a rank higher, again and again until no
 * three of a kind are left, which is what pressing every 煉 row in turn does (a fusion can
 * make the third of a new group). fusable() already leaves out 鎖 locked and 業 forged
 * pieces, so neither is ever melted into anything. It is fuseIn() in a loop, the harness's
 * own loop, so the pieces it makes are the pieces the single taps make.
 *
 * 天 It ends. Below Heaven every fusion climbs a rank and the top rank is a wall; at
 * Heaven a fusion takes only pieces that were found and makes one that was not (chest.ts
 * fusesAt), so each found piece is fused at most once and a made piece never comes back
 * in. rekaris asked for exactly that: Fuse all must not fold a chest into one piece.
 */
export function fuseAllIn(s: State): { state: State; made: readonly Item[] } {
  let out = s;
  const made: Item[] = [];
  for (let i = 0; i < 200; i++) {
    const g = fusable(out.chest)[0];
    if (!g) break;
    const f = fuseIn(out, g.template, g.rarity);
    if (!f.made) break;
    out = f.state;
    made.push(f.made);
  }
  // A piece made and then melted into a later one is not a piece the chest holds.
  const held = new Set(out.chest.map((x) => x.id));
  return { state: out, made: made.filter((x) => held.has(x.id)) };
}
