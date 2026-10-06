import { RETRADE_DAYS } from './balance.ts';
import { TRIOS, cardOf, valid } from './awaken.ts';
import { chestLimit } from './chest.ts';
import { affinity } from './dao.ts';
import { wornTotals } from '../data/gear.ts';
import { freePoints } from './points.ts';
import { rate, type State } from './state.ts';

/**
 * 改 A card already taken, traded for another of the three it was offered with.
 *
 * rekaris, on the Discord: *"I would much rather be able to change my past choices when
 * tweaking/changing builds rather than being locked into previous poor decision,
 * especially in long term idle."* The cards were made permanent so that no two climbs
 * end alike; that still holds, because a trade costs real time and the newer the card
 * the cheaper it is to rethink. See RETRADE_DAYS.
 *
 * A trade swaps one entry of `awakened` in place, so the list keeps its order and
 * `valid()` still reads every entry against the trio its turn offered. Nothing is added
 * and nothing is stored beside it: what a trade cost is gone from the bar, and that is
 * the whole record of it.
 */

/** Why a trade cannot happen right now, or null when it can. */
export type Refusal = 'card' | 'qi' | 'dao' | 'chest';

/** Days of the cultivator's own gathering that trading card `index` costs. */
export function retradeDays(awakened: readonly string[], index: number): number {
  const n = valid(awakened).length;
  if (!Number.isInteger(index) || index < 0 || index >= n) return Infinity;
  return RETRADE_DAYS * (n - index);
}

/** The same, in qi, at the rate this cultivator gathers now. */
export function retradeCost(s: State, index: number): number {
  const days = retradeDays(s.awakened, index);
  return Number.isFinite(days) ? Math.ceil(days * 86_400 * rate(s)) : Infinity;
}

/** The two other cards card `index` could become. */
export function alternatives(awakened: readonly string[], index: number) {
  const list = valid(awakened);
  if (index < 0 || index >= list.length) return [];
  return TRIOS[index].filter((c) => c.key !== list[index]);
}

/**
 * The save with card `index` traded for `key`, and the qi paid, or the reason it cannot.
 *
 * 守 A trade that would leave the save impossible is refused rather than repaired: a card
 * that gave 道 points already spent in the tree, or chest places already filled. Taking
 * either back would leave a save the server reads as forged (a tree that spent more than
 * it earned), or one validate() trims on the next load, which is a piece thrown away for
 * a reason the player never saw.
 */
export function retrade(s: State, index: number, key: string): { state: State; refused: Refusal | null } {
  const list = [...valid(s.awakened)];
  const card = cardOf(key);
  if (index < 0 || index >= list.length || !card || list[index] === key
    || !TRIOS[index].some((c) => c.key === key)) return { state: s, refused: 'card' };
  const cost = retradeCost(s, index);
  if (!(s.qi >= cost)) return { state: s, refused: 'qi' };
  list[index] = key;
  const after: State = { ...s, awakened: list, qi: s.qi - cost };
  if (freePoints(after) < 0) return { state: s, refused: 'dao' };
  const room = chestLimit(after.unlocked, wornTotals(after.worn, (x) => affinity(after.unlocked, x), after.refined).capacity, list);
  if (after.chest.length > room) return { state: s, refused: 'chest' };
  return { state: after, refused: null };
}
