import type { Beast } from '../data/bestiary.ts';
import { RARITIES, type Item } from '../data/gear.ts';
import { FATE_FLOOR, FATE_TOP_COMMON, FATE_TOP_WARDEN, LAYERS_PER_REALM } from './balance.ts';
import { rollDrop, type Fortune } from './drops.ts';
import { isOpen } from './unlocks.ts';
import { classBond } from './schools.ts';
import type { State } from './state.ts';

/**
 * 緣 The bond with a beast, and the drop it promises.
 *
 * Bruno chose it from the drop proposal: *"deve ser lógico, não 100% rng"*. Every win
 * over a beast fills its bar by one, and the win that fills it leaves a piece for
 * certain, at least a rank above the best that beast has ever left. So a run of bad luck
 * has a visible end, and the player can see how far off it is on the hunt row.
 *
 * Pure, and read by the app and by every harness through the same two calls, so a
 * reward the harnesses cannot see is not a reward this game has: `dropFor` rolls the
 * piece, `noteFate` moves the bar.
 */

export function fateOf(s: State, key: string): { n: number; best: number } {
  return s.fate?.[key] ?? { n: 0, best: -1 };
}

/** Does the next win over this beast fill the bar? */
export function fateDue(s: State, b: Beast): boolean {
  return fateOf(s, b.key).n + 1 >= fateFull(s);
}

/** 運 How many wins fill a bond on this body: fewer for a Fortune Seeker. */
export function fateFull(s: State): number {
  return classBond(s);
}

/** What a full bar promises from this beast: an index into RARITIES. */
export function fatePromise(s: State, b: Beast): number {
  const top = b.warden ? FATE_TOP_WARDEN : FATE_TOP_COMMON;
  return Math.min(top, Math.max(FATE_FLOOR, fateOf(s, b.key).best + 1));
}

/**
 * The piece a win leaves, if any. Nothing falls before 器 opens, and a full bar makes
 * the drop certain and lifts it to the promise.
 */
export function dropFor(
  s: State, b: Beast, seed: number, fortune: Fortune = {}, layer = s.layer ?? LAYERS_PER_REALM,
): Item | null {
  if (!isOpen(s.realm, 'gear')) return null;
  const due = fateDue(s, b);
  return rollDrop(b, s.realm, seed,
    due ? { ...fortune, always: true, floor: Math.max(fortune.floor ?? 0, fatePromise(s, b)) } : fortune,
    layer);
}

/** The bar after a win: one fuller, or empty again if this was the win that filled it. */
export function noteFate(s: State, b: Beast, drop: Item | null): State {
  if (!isOpen(s.realm, 'gear')) return s;
  const f = fateOf(s, b.key);
  const due = f.n + 1 >= fateFull(s);
  const got = drop ? RARITIES.indexOf(drop.rarity) : -1;
  return {
    ...s,
    fate: { ...s.fate, [b.key]: { n: due ? 0 : f.n + 1, best: Math.max(f.best, got) } },
  };
}
