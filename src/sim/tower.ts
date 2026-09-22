import { BEASTS, type Beast } from '../data/bestiary.ts';
import { FLOOR_LOOT, FLOOR_LOOT_GROWTH } from './balance.ts';
import { WARDEN_EDGE, referenceAt } from './combat.ts';

/**
 * 無盡塔 The Endless Tower.
 *
 * The climb has a top and the tower does not. One floor, one beast, one fight; win and
 * the floor is yours for good, lose and you come back when you are stronger. Nothing is
 * ever lost by trying, so the tower is the one place in the game where the only question
 * is whether the build works.
 *
 * It is also the whole material economy. Hunting drops a handful of 材 and always did;
 * the tower pays in the quantities the furnace actually eats, and it pays *once* per
 * floor, so the way to more materials is up, never round in circles.
 */

/** Floors per realm, so floor 9 is the first realm's warden and floor 81 is the Dragon. */
export const FLOORS_PER_REALM = 9;

/**
 * What stands on a floor.
 *
 * Derived, never typed. The ninth floor is the first realm's warden, the twenty-seventh
 * is the third realm's, the eighty-first is the Dragon, and the two-hundredth is what a
 * twenty-second realm's warden would be, if the mountain had one. Nothing in this file
 * needs touching when the curve moves, because the tower simply reads the same reference
 * the beasts read, one realm every nine floors, and never stops reading it.
 */
export function floorPower(floor: number): number {
  return referenceAt(Math.max(1, floor) / FLOORS_PER_REALM) * WARDEN_EDGE;
}

/**
 * Which beast it is. Floors inside the first eighty-one draw from their own realm, and
 * above that the whole bestiary comes round again: the shapes repeat, the power does
 * not.
 */
export function floorBeast(floor: number): Beast {
  const realm = Math.max(1, Math.min(9, Math.ceil(floor / FLOORS_PER_REALM)));
  const pool = floor <= 81 ? BEASTS.filter((b) => b.realm === realm) : BEASTS;
  return pool[(floor - 1) % pool.length];
}

/** How much material a floor pays, the first time it falls. */
export function floorLoot(floor: number): number {
  return Math.round(FLOOR_LOOT * FLOOR_LOOT_GROWTH ** (floor - 1));
}

/**
 * 塔印 A tower seal, one for every nine floors.
 *
 * Seals pay in materials rather than in power, because the tower must not be able to
 * buy its own next floor: a ladder that pays for climbing itself is not a ladder.
 */
export function seals(best: number): number {
  return Math.floor(Math.max(0, best) / FLOORS_PER_REALM);
}

export const SEAL_LOOT = 0.15;

/** What the seals are worth to everything that drops materials. */
export function lootBonus(best: number): number {
  return 1 + SEAL_LOOT * seals(best);
}

/** The floor waiting to be tried. There is always exactly one. */
export function nextFloor(best: number): number {
  return Math.max(0, Math.floor(best)) + 1;
}
