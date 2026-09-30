import { RARITIES, templateOf, type Item, type Rarity } from '../data/gear.ts';
import { addToChest, chestLimit, fuse } from './chest.ts';
import { dropsRankUp, fuseQuality } from './dao.ts';
import { meltFactor, returnMetal, salvageValue } from './salvage.ts';
import { bodyTotals, gearFuse } from './schools.ts';
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
}

export function stash(s: State, found: Item | null): Stashed {
  if (!found) return { state: s, item: null, dropped: null, melted: 0 };
  const item = lifted(s, found);
  const kept = addToChest(s.chest, item, limitFor(s));
  const melted = kept.dropped ? salvageValue(kept.dropped, meltFactor(s)) : 0;
  const state = { ...s, chest: [...kept.chest], qi: s.qi + melted };
  return { state: kept.dropped ? returnMetal(state, [kept.dropped]) : state, item, dropped: kept.dropped, melted };
}

/**
 * 煉 Three become one, with everything this cultivator brings to a fusion: 巧手 Deft
 * Hands on the tree and the 煉 line on the body. The game's button and the harnesses call
 * this one function, so what the curves measure is what the button does.
 */
export function fuseIn(s: State, template: string, rarity: Rarity): { state: State; made: Item | null } {
  const out = fuse(s.chest, template, rarity, fuseQuality(s.unlocked) * gearFuse(s));
  return out.made ? { state: { ...s, chest: [...out.chest] }, made: out.made } : { state: s, made: null };
}

/** The name a player would know the melted piece by. */
export function droppedName(x: Item): string {
  return templateOf(x).name;
}
