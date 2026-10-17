import { RETRADE_DAO, RETRADE_DAYS } from './balance.ts';
import { TRIOS, cardOf, valid } from './awaken.ts';
import { chestLimit } from './chest.ts';
import { affinity } from './dao.ts';
import { wornTotals } from '../data/gear.ts';
import { freePoints, treeFull } from './points.ts';
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
 * `valid()` still reads every entry against the trio its turn offered. A trade paid in qi
 * stores nothing beside it: what it cost is gone from the bar, and that is the whole record.
 *
 * 道 A tree finished for good may pay in 道 points instead (RETRADE_DAO), which is the one
 * thing those points still buy (the release audit of 2026-10-16: 7 to 52 of them held from
 * the sixth realm to the summit with nothing to take them). A point paid is kept in
 * `daoPaid`, because the purse is derived and has to know where it went.
 */

/**
 * Why a trade cannot happen right now, or null when it can. `points` is a trade paid in 道
 * that the purse cannot pay, or that a tree with nodes still to buy may not pay at all.
 */
export type Refusal = 'card' | 'qi' | 'dao' | 'chest' | 'points';

/** 道 What a trade is paid with: the cultivator's qi, or 道 points a finished tree holds. */
export type Pay = 'qi' | 'dao';

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

/**
 * 道 The same trade in 道 points: RETRADE_DAO for each card back, so the step is the one the
 * qi price climbs by.
 */
export function retradeDao(awakened: readonly string[], index: number): number {
  const days = retradeDays(awakened, index);
  return Number.isFinite(days) ? RETRADE_DAO * Math.round(days / RETRADE_DAYS) : Infinity;
}

/**
 * 滿 Whether trades may be paid in 道 at all: only once the tree is finished for good, where
 * a point has nothing else to buy. A tree still growing keeps its points for the tree.
 */
export function paysInDao(s: State): boolean {
  return treeFull(s, false);
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
export function retrade(s: State, index: number, key: string, pay: Pay = 'qi'): { state: State; refused: Refusal | null } {
  const list = [...valid(s.awakened)];
  const card = cardOf(key);
  if (index < 0 || index >= list.length || !card || list[index] === key
    || !TRIOS[index].some((c) => c.key === key)) return { state: s, refused: 'card' };
  let after: State;
  if (pay === 'dao') {
    // 道 Paid from the purse a finished tree keeps, and counted in daoPaid like a node.
    const points = retradeDao(s.awakened, index);
    if (!paysInDao(s) || !(freePoints(s) >= points)) return { state: s, refused: 'points' };
    list[index] = key;
    after = { ...s, awakened: list, daoPaid: Math.max(0, s.daoPaid ?? 0) + points };
  } else {
    const cost = retradeCost(s, index);
    if (!(s.qi >= cost)) return { state: s, refused: 'qi' };
    list[index] = key;
    after = { ...s, awakened: list, qi: s.qi - cost };
  }
  if (freePoints(after) < 0) return { state: s, refused: 'dao' };
  const room = chestLimit(after.unlocked, wornTotals(after.worn, (x) => affinity(after.unlocked, x), after.refined).capacity, list);
  if (after.chest.length > room) return { state: s, refused: 'chest' };
  return { state: after, refused: null };
}
