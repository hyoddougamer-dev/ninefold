import type { Beast } from '../data/bestiary.ts';
import { RARITIES, type Item } from '../data/gear.ts';
import { FATE_FLOOR, FATE_TOP_COMMON, FATE_TOP_WARDEN, LAYERS_PER_REALM, SECOND_DROP_CAP } from './balance.ts';
import { rollDrop, type Fortune } from './drops.ts';
import { isOpen } from './unlocks.ts';
import { classBond } from './schools.ts';
import type { State } from './state.ts';
import { deepDrop } from './record.ts';
import { codexValue } from './hundred.ts';

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

/**
 * 運 How many wins fill a bond on this body: fewer for a Fortune Seeker. 譜 落星 The Fallen
 * Star codex gives every win more bond, which is the same bar filled in fewer wins.
 */
export function fateFull(s: State): number {
  const bond = codexValue(s, 'bond');
  return bond > 0 ? Math.max(1, Math.ceil(classBond(s) / (1 + bond) - 1e-9)) : classBond(s);
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
  // 精 A beast's deep marks make it leave a piece more often: see DEEP_DROP.
  const deep = deepDrop(s.killed[b.key] ?? 0);
  const f = deep > 0 ? { ...fortune, chance: (fortune.chance ?? 0) + deep } : fortune;
  return rollDrop(b, s.realm, seed,
    due ? { ...f, always: true, floor: Math.max(f.floor ?? 0, fatePromise(s, b)) } : f,
    layer);
}

/** 造化 How likely a second piece is from one kill: the drop chance, once Creation has
 * made the first certain, a beast's own 精 deep marks included. 0 without Creation. */
export function secondChance(s: State, b: Beast, fortune: Fortune = {}): number {
  if (!fortune.always || b.warden || !isOpen(s.realm, 'gear')) return 0;
  const deep = deepDrop(s.killed[b.key] ?? 0);
  return Math.min(SECOND_DROP_CAP, Math.max(0, (fortune.chance ?? 0) + deep));
}

/**
 * 造化 The second piece a kill leaves, if the dice give one. Seeded from the kill, apart
 * from the first piece's dice, so the same kill always leaves the same pair. It never
 * moves the bond bar: the bar counts wins, not pieces.
 */
export function secondDropFor(
  s: State, b: Beast, seed: number, fortune: Fortune = {}, layer = s.layer ?? LAYERS_PER_REALM,
): Item | null {
  const chance = secondChance(s, b, fortune);
  if (chance <= 0) return null;
  let x = (seed ^ 0x5bd1e995) >>> 0;
  x = Math.imul(x ^ (x >>> 15), 2246822507) >>> 0;
  x = (x ^ (x >>> 13)) >>> 0;
  if (x / 4294967296 >= chance) return null;
  return rollDrop(b, s.realm, (seed ^ 0x2545f491) >>> 0, { ...fortune, always: true }, layer);
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
