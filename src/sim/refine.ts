import { FLOOR_LOOT, FLOOR_LOOT_GROWTH } from './balance.ts';
import { REFINE_PER_LEVEL } from '../data/gear.ts';

/**
 * 煉器 Refining: what 材 material is actually for.
 *
 * Measured, the material economy was eight times over-supplied. Everything material
 * could ever buy (all fifty-four 妖丹 cores) costs 93.6M, and 無盡塔 the tower alone
 * pays 803M over its first ninety floors, before a single beast is hunted. A cultivator
 * playing normally finished the climb sitting on three billion of it with nothing to
 * spend it on, and one who tapped 狩 Hunt hard finished on two hundred and eighty
 * billion. Material stopped meaning anything the moment the cores were full.
 *
 * Refining is the sink, and it is bottomless: a piece has no top level, and the price is
 * the only ceiling. It also fixes the quieter fault in the gear loop: a 天 Heaven piece
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
 * a hard-tapping one at about thirty, which is the difference farming should make.
 */
export const REFINE_DEPTH = 4;

/**
 * The arithmetic guard, and nothing more: 1.04 to the 999th is about 1e17, a long way
 * short of where a double stops being a number.
 *
 * 頂 It was 99, with a comment saying nothing reachable came near it, and both halves of
 * that stopped being true the night 煉器 refining was put into the endgame harness.
 * Measured, a cultivator who refines the way 示 the advice line tells them to comes out
 * of forty crossings at level 90 on every slot. Eight crossings later every slot is at
 * 99, the material has nowhere left to go, the power stops growing with the tower, and
 * the Dragon, which is footed on a cultivator who refines, walks away: a mark of 16
 * days at the fifty-fifth crossing, 54 at the sixty-second, and none at all from the
 * seventy-fourth. The header of this file says a piece has no top level and the price
 * is the only ceiling, and the limit was the one thing making that false.
 *
 * What stops a hand-edited save claiming a sword worth fifty thousand of itself is now
 * refineCeiling, which is read off the save rather than typed.
 */
export const REFINE_LIMIT = 999;

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

/**
 * 頂 The highest level a piece could have been paid up to, by a save that could never
 * have held more than `material`.
 *
 * validate already has that number: the material ceiling it reads off 塔 the tower,
 * which is where the material comes from, ten thousand times over. A level whose price
 * is past it is a level nobody paid for. It rides the tower on its own, about one level
 * for every four floors, which is the same four floors a level costs, and it sits a
 * dozen levels above anything the harnesses have ever reached at any depth.
 */
export function refineCeiling(material: number): number {
  if (!(material >= FLOOR_LOOT)) return 0;
  const steps = Math.log(material / FLOOR_LOOT) / Math.log(FLOOR_LOOT_GROWTH);
  return Math.max(0, Math.min(REFINE_LIMIT, Math.floor(steps / REFINE_DEPTH) + 1));
}
