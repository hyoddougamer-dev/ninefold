import { PILE_HOLD } from './balance.ts';
import { RARITIES, type Item } from '../data/gear.ts';
import { melt, returnMetal, salvageable } from './salvage.ts';
import { limitFor, stash } from './stash.ts';
import type { State } from './state.ts';
import type { Drive } from './hunt.ts';

/**
 * 圍 What a drive leaves on the table, and the player's say over it.
 *
 * rekaris and razielmorgenstern, on the Discord (2026-10-06): the Drive is dear, and worse,
 * it decides for you what happens to what dropped. It always did: the best piece went to
 * the chest, melting the weakest piece already there if the chest was full, and every
 * other piece was left on the mountain. This is the window that gives the choice back.
 *
 * Three rules keep it honest.
 *
 *   1. The default is what the game always did (settleDefault). A player who never opens
 *      the window, or whose drive ended with the game shut, gets exactly that, once
 *      PILE_HOLD has gone by (settleStale), and until then the pieces wait in the save and
 *      nothing is lost.
 *   2. A choice is only refused for not fitting: the pieces marked to keep must have room
 *      in the chest, counting whatever the same choice melts out of the bag. A full chest
 *      never locks the player out of the window, because the bag can be melted from it.
 *   3. Nothing here is a new door into qi. Every melt goes through melt() and draws the
 *      same capped allowance as any other melt, and a forged piece melts back into metal
 *      and never into qi. What a drive's other pieces pay is what melting them anywhere
 *      pays, no more.
 */

/** 圍 Put a drive's pieces on the table. Whatever was waiting from before is answered first, the game's way. */
export function holdDrops(s: State, drove: Pick<Drive, 'drops'>): State {
  const base = settleDefault(s);
  if (drove.drops.length === 0) return base;
  return { ...base, pile: [...drove.drops], pileAt: base.at };
}

/**
 * 圍 The game's own answer: the best piece into the chest (a full chest melts its weakest
 * to make room, as it always has), the rest left. Exactly what a drive did before the
 * window, and what a drive does now for a player who does not choose.
 */
export function settleDefault(s: State): State {
  if (s.pile.length === 0) return s.pileAt ? { ...s, pileAt: 0 } : s;
  // The pile is already lifted (空囊 applied when it fell), so it goes in as it is.
  return stash({ ...s, pile: [], pileAt: 0 }, s.pile[0], false).state;
}

/** 圍 Whether the pieces have waited as long as they are going to. */
export function pileStale(s: State): boolean {
  return s.pile.length > 0 && s.at - s.pileAt >= PILE_HOLD;
}

/** 圍 Answer for the player once the pieces have waited a day. A pile still fresh is left alone. */
export function settleStale(s: State): State {
  return pileStale(s) ? settleDefault(s) : s;
}

/** 圍 The player's choice: which pieces to keep, and whether the bag is melted to make room. */
export interface Choice {
  /** Ids from the pile that go into the chest. */
  readonly keep: readonly string[];
  /** Also melt every piece in the chest that is not locked, before the kept ones go in. */
  readonly meltBag?: boolean;
}

/** What a choice comes to, read before the tap: the same arithmetic as settle(), no state changed. */
export interface Plan {
  /** The pieces that would go into the chest. */
  readonly kept: readonly Item[];
  /** The pile's other pieces, which would be melted. */
  readonly melted: readonly Item[];
  /** The unlocked pieces of the chest that would be melted too. */
  readonly bag: readonly Item[];
  /** Free places in the chest once the bag is dealt with, before the kept pieces go in. */
  readonly room: number;
  /** Whether the kept pieces fit. */
  readonly fits: boolean;
  /** Qi and 材 material the melts pay, from the allowance (melt()). */
  readonly qi: number;
  readonly materials: number;
}

export function plan(s: State, choice: Choice): Plan {
  const wanted = new Set(choice.keep);
  const kept = s.pile.filter((x) => wanted.has(x.id));
  const melted = s.pile.filter((x) => !wanted.has(x.id));
  const bag = choice.meltBag ? salvageable(s.chest, RARITIES[RARITIES.length - 1]) : [];
  const room = Math.max(0, limitFor(s) - (s.chest.length - bag.length));
  // The pile's pieces melt first, then the bag: the allowance is spent on what was just won.
  const m = melt(s, [...melted, ...bag]);
  return { kept, melted, bag, room, fits: kept.length <= room, qi: m.qi, materials: m.materials };
}

/**
 * 圍 Settle the pile as the player chose. Refused (the same state back) if what is kept would
 * not fit, so the drive is not finished until the choice does. Pieces named that are not in
 * the pile are ignored, and a piece not named is melted, never silently kept.
 */
export function settle(s: State, choice: Choice): State {
  if (s.pile.length === 0) return s;
  const p = plan(s, choice);
  if (!p.fits) return s;
  const gone = new Set(p.bag.map((x) => x.id));
  const m = melt(s, [...p.melted, ...p.bag]);
  return returnMetal({
    ...m.state,
    chest: [...s.chest.filter((x) => !gone.has(x.id)), ...p.kept],
    pile: [],
    pileAt: 0,
  }, [...p.melted, ...p.bag]);
}
