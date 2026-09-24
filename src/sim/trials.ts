import { LINES, pillOf, type Line } from '../data/alchemy.ts';
import { pillCost } from './furnace.ts';
import { floorLoot, floorPower, lootBonus, nextFloor } from './tower.ts';
import { TOWER_QI_HOURS } from './balance.ts';
import { recordMaterial } from './record.ts';
import { power, rate, type State } from './state.ts';
import { REFINE_LIMIT, clampRefine, refineCost } from './refine.ts';
import { materialBonus, pillFactor, refineFactor, towerBonus } from './awaken.ts';
import type { Slot } from '../data/gear.ts';
import { isOpen } from './unlocks.ts';

/**
 * 塔, 爐 and 煉器: everything that has no ceiling.
 *
 * The curves live in `tower.ts`, `furnace.ts` and `refine.ts` and know nothing about a
 * save. This is where they touch the state: climbing a floor, brewing a pill, refining a
 * worn piece. All three are pure, all three refuse rather than half-apply, and none of
 * them can ever raise the qi rate.
 */

/** The floor waiting to be tried. Exactly one, always, and losing costs nothing. */
export function standingFloor(s: State): number {
  return nextFloor(s.tower);
}

/** 塔 The tower opens at its realm, and until then there is no floor to stand on. */
export function towerOpen(s: State): boolean {
  return isOpen(s.realm, 'tower');
}

/**
 * 吸 What a floor gives up when it falls: material, and hours of gathering.
 *
 * Six hours, scaled by how much of a fight the floor actually was.
 *
 * Without the scaling the tower paid its whole back catalogue at once. 塔 opens at the
 * fifth realm, and a cultivator arriving there swept forty-three floors in a single
 * sitting and walked away with **ten days and eighteen hours** of gathering, measured,
 * which made the fifth realm the shortest in the run, shorter than the fourth. A reward
 * for opening a system is right; a reward that rewrites the curve is not.
 *
 * So a floor at your own power pays the full six hours and a floor a tenth of it pays a
 * tenth. Sweeping what is far below you is a quick errand for material; pushing into
 * something that can actually beat you is what pays in qi. Nothing changes for the floor
 * you are really climbing. It is always near your power, and it always pays in full.
 */
export function floorQi(s: State, floor = standingFloor(s)): number {
  const mine = power(s);
  const standing = mine > 0 ? Math.min(1, floorPower(floor) / mine) : 1;
  return rate(s) * 3600 * TOWER_QI_HOURS * standing;
}

/**
 * A floor only counts once, and only the next one is ever open.
 *
 * It pays in qi as well as in material, and that is the one place in the game where
 * fighting turns into *progress* rather than only into power. It is safe to be generous
 * because a floor falls once: there is nothing here to farm, and the next floor is
 * always harder than the last.
 */
export function clearFloor(s: State, floor: number): State {
  if (!towerOpen(s) || floor !== standingFloor(s)) return s;
  return {
    ...s,
    tower: floor,
    qi: s.qi + floorQi(s, floor),
    // 悟道 境外 The heavens' 塔 cards multiply the floor's own loot and nothing else, so
    // they pay only to somebody climbing. It is applied to the base rather than to the
    // result, so the record and the seals still compound on top of it the way they do
    // for every other kill. See towerBonus in sim/awaken.ts.
    materials: s.materials + lootTaken(s, floorLoot(floor) * towerBonus(s.awakened)),
  };
}

/** 丹 What the next pill of a line costs *this* cultivator, thrift cards counted. */
export function pillPrice(s: State, line: Line): { qi: number; materials: number } {
  return pillCost(s.brewed, line, pillFactor(s.awakened));
}

/**
 * What a kill is worth in materials, once the tower's seals and 錄 the record count.
 *
 * The record's marks are counted from the first kill of the game but only *pay* from the
 * realm that opens them, so the system arrives full rather than arriving empty.
 */
export function lootTaken(s: State, base: number): number {
  const record = isOpen(s.realm, 'record') ? recordMaterial(s.killed) : 1;
  // 悟道 Every card that pays material pays it here, which is the one place all of it
  // passes through, hunting and 塔 the tower alike.
  return Math.max(1, Math.round(base * lootBonus(s.tower) * record * materialBonus(s.awakened)));
}

export function canBrew(s: State, line: Line): boolean {
  if (!isOpen(s.realm, 'furnace')) return false;
  const cost = pillPrice(s, line);
  return s.qi >= cost.qi && s.materials >= cost.materials;
}

export function brew(s: State, line: Line): State {
  if (!canBrew(s, line)) return s;
  const cost = pillPrice(s, line);
  return {
    ...s,
    qi: s.qi - cost.qi,
    materials: s.materials - cost.materials,
    brewed: { ...s.brewed, [line]: s.brewed[line] + 1 },
  };
}

/**
 * 煉器 What refining the piece in a slot would cost, and whether it can be paid.
 *
 * Material only. Qi buys the mountain and the furnace; material buys the body of your
 * gear, and until this existed material stopped meaning anything the moment the cores
 * were full, measured, eight times more of it than the game had any use for.
 */
export function refinePrice(s: State, slot: Slot): number | null {
  const item = s.worn[slot];
  if (!item) return null;
  // 悟道 火候 and 薪火 make every level cheaper, for ever. Rounded up, so a discount
  // can never make a level free however many of them are taken.
  return Math.max(1, Math.ceil(refineCost(clampRefine(item.refine)) * refineFactor(s.awakened)));
}

export function canRefine(s: State, slot: Slot): boolean {
  if (!isOpen(s.realm, 'refine')) return false;
  const price = refinePrice(s, slot);
  return price !== null && s.materials >= price;
}

export function refine(s: State, slot: Slot): State {
  if (!isOpen(s.realm, 'refine')) return s;
  const item = s.worn[slot];
  const price = refinePrice(s, slot);
  if (!item || price === null || s.materials < price) return s;
  if (clampRefine(item.refine) >= REFINE_LIMIT) return s;
  return {
    ...s,
    materials: s.materials - price,
    worn: { ...s.worn, [slot]: { ...item, refine: clampRefine(item.refine) + 1 } },
  };
}

/** The name of the pill this furnace would make right now, for each line. */
export function furnaceMenu(s: State) {
  return LINES.map((line) => ({
    line,
    pill: pillOf(line, s.realm),
    cost: pillPrice(s, line),
    held: s.brewed[line],
    affordable: canBrew(s, line),
  }));
}
