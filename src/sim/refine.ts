import { FLOOR_LOOT, FLOOR_LOOT_GROWTH } from './balance.ts';
import { REFINE_PER_LEVEL } from '../data/gear.ts';

/**
 * 煉器 Refining: what 材 material is actually for.
 *
 * Measured, the material economy was eight times over-supplied. Everything material
 * could ever buy — all fifty-four 妖丹 cores — costs 93.6M, and 無盡塔 the tower alone
 * pays 803M over its first ninety floors, before a single beast is hunted. A cultivator
 * playing normally finished the climb sitting on three billion of it with nothing to
 * spend it on, and one who tapped 狩 Hunt hard finished on two hundred and eighty
 * billion. Material stopped meaning anything the moment the cores were full.
 *
 * Refining is the sink, and it is bottomless: a piece has no top level, and the price is
 * the only ceiling. It also fixes the quieter fault in the gear loop — a 天 Heaven piece
 * found in the third realm used to be replaced and forgotten, because nothing could make
 * it grow. Now it can, and choosing *which* piece to pour a run's material into is a
 * decision the gear screen never used to ask.
 *
 * It buys power and fortune, never the qi rate, so the standing rule holds: nothing
 * uncapped may ever raise gathering.
 */

/** What one level adds to every line on the piece. It is declared beside the item so
 *  that nothing can read a roll without it; this is the same number. */
export const REFINE_GAIN = REFINE_PER_LEVEL;

/**
 * How many floors of the tower's own pay curve a refine level costs.
 *
 * The price rides the material curve exactly as an upgrade rides the mountain, so it
 * stays meaningful at every realm instead of being unaffordable at the first and free at
 * the ninth. Four floors a level puts a normal run at about level twenty on a piece and
 * a hard-tapping one at about thirty — which is the difference farming should make.
 */
export const REFINE_DEPTH = 4;

/**
 * The guard, not the design. Nothing reachable comes near it; it exists so a hand-edited
 * save cannot claim a piece worth fifty thousand times what it is.
 */
export const REFINE_LIMIT = 99;

/** What the next level on a piece costs, in material. */
export function refineCost(level: number): number {
  return Math.ceil(FLOOR_LOOT * FLOOR_LOOT_GROWTH ** (Math.max(0, level) * REFINE_DEPTH));
}

/** Everything spent to bring a piece from nothing to this level. */
export function refineSpent(level: number): number {
  let total = 0;
  for (let n = 0; n < Math.max(0, level); n++) total += refineCost(n);
  return total;
}

/** What a refined piece's lines are multiplied by. */
export function refineFactor(level: number | undefined): number {
  return (1 + REFINE_GAIN) ** clampRefine(level);
}

export function clampRefine(level: number | undefined): number {
  if (typeof level !== 'number' || !Number.isFinite(level)) return 0;
  return Math.max(0, Math.min(REFINE_LIMIT, Math.floor(level)));
}
