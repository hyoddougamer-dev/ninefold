import { BEASTS, type Beast } from '../data/bestiary.ts';
import {
  FLOORS_PER_REALM, LAYERS, LAYERS_PER_REALM, SEAL_LOOT, TOWER_QI_LEAST, TOWER_QI_REALM_FLOORS, TOWER_QI_RUNG, TOWER_QI_SUMMIT,
  ladderAt, ladderBetween, pastDragon, towerLoot,
} from './balance.ts';
import { WARDEN_EDGE, referenceAt } from './combat.ts';
import { opensAt } from './unlocks.ts';

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

/**
 * Floors per realm, so floor 9 is the first realm's warden and floor 81 is the Dragon. It
 * is LAYERS_PER_REALM under the tower's own name, in balance.ts.
 */
export { FLOORS_PER_REALM };

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
  // 塔 Past the Dragon's floor each stands TOWER_PAST_DRAGON above the curve: see balance.ts.
  return referenceAt(Math.max(1, floor) / FLOORS_PER_REALM) * WARDEN_EDGE * pastDragon(floor);
}

/**
 * Which beast it is. Floors inside the first eighty-one draw from their own realm, and
 * above that the whole bestiary comes round again: the shapes repeat, the power does
 * not.
 */
export function floorBeast(floor: number): Beast {
  const realm = Math.max(1, Math.min(9, Math.ceil(floor / FLOORS_PER_REALM)));
  const pool = floor <= LAYERS ? BEASTS.filter((b) => b.realm === realm) : BEASTS;
  return pool[(floor - 1) % pool.length];
}

/** How much material a floor pays, the first time it falls. */
export function floorLoot(floor: number): number {
  return Math.round(towerLoot(floor));
}

/**
 * 吸 The rung whose price a floor pays a share of: the rung a climber stands on when that
 * floor falls, read off a straight line through the measured climb (TOWER_QI_SUMMIT and
 * TOWER_QI_REALM_FLOORS in balance.ts). It never goes under the first rung or over the last.
 */
export function floorRung(floor: number): number {
  const below = Math.max(0, TOWER_QI_SUMMIT - Math.max(1, floor));
  return Math.max(0, LAYERS - 1 - (below * LAYERS_PER_REALM) / TOWER_QI_REALM_FLOORS);
}

/**
 * 吸 What a floor pays in qi, the first time it falls: a fixed sum, read off the floor and
 * nothing else. Not the realm, not the gathering, not what is worn, not when.
 *
 * TOWER_QI_RUNG of the price of floorRung's rung, so a floor near where a climber stands
 * pays about that share of their own next rung in every realm, and every floor above the
 * summit floor pays what the summit floor does. 天師 the Celestial Master's PAIR_TOWER_QI
 * is added where the floor is cleared (floorQi in trials.ts): it is the one thing a build adds.
 */
export function floorQiPay(floor: number): number {
  return Math.max(towerLeast(), TOWER_QI_RUNG * ladderBetween(floorRung(floor)));
}

/**
 * 吸 The least any floor pays: TOWER_QI_LEAST of the first rung of the realm the tower opens
 * in, so the floors a newcomer sweeps the day it opens are worth opening it for.
 */
export function towerLeast(): number {
  return TOWER_QI_LEAST * ladderAt((opensAt('tower') - 1) * LAYERS_PER_REALM);
}

/** 吸 The last floor that pays only the least: every floor above it pays more than the one below. */
export function leastUntil(): number {
  let f = 1;
  while (f < TOWER_QI_SUMMIT && TOWER_QI_RUNG * ladderBetween(floorRung(f + 1)) <= towerLeast()) f++;
  return f;
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

export { SEAL_LOOT };

/** What the seals are worth to everything that drops materials. */
export function lootBonus(best: number): number {
  return 1 + SEAL_LOOT * seals(best);
}

/** The floor waiting to be tried. There is always exactly one. */
export function nextFloor(best: number): number {
  return Math.max(0, Math.floor(best)) + 1;
}
