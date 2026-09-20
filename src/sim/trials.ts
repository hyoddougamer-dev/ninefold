import { LINES, pillOf, type Line } from '../data/alchemy.ts';
import { pillCost } from './furnace.ts';
import { floorLoot, lootBonus, nextFloor } from './tower.ts';
import { TOWER_QI_HOURS } from './balance.ts';
import { recordMaterial } from './record.ts';
import { rate, type State } from './state.ts';
import { REFINE_LIMIT, clampRefine, refineCost } from './refine.ts';
import type { Slot } from '../data/gear.ts';

/**
 * 塔, 爐 and 煉器 — everything that has no ceiling.
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

/** 吸 What a floor gives up when it falls: material, and hours of gathering. */
export function floorQi(s: State): number {
  return rate(s) * 3600 * TOWER_QI_HOURS;
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
  if (floor !== standingFloor(s)) return s;
  return {
    ...s,
    tower: floor,
    qi: s.qi + floorQi(s),
    materials: s.materials + lootTaken(s, floorLoot(floor)),
  };
}

/** What a kill is worth in materials, once the tower's seals and 錄 the record count. */
export function lootTaken(s: State, base: number): number {
  return Math.max(1, Math.round(base * lootBonus(s.tower) * recordMaterial(s.killed)));
}

export function canBrew(s: State, line: Line): boolean {
  const cost = pillCost(s.brewed, line);
  return s.qi >= cost.qi && s.materials >= cost.materials;
}

export function brew(s: State, line: Line): State {
  if (!canBrew(s, line)) return s;
  const cost = pillCost(s.brewed, line);
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
 * were full — measured, eight times more of it than the game had any use for.
 */
export function refinePrice(s: State, slot: Slot): number | null {
  const item = s.worn[slot];
  return item ? refineCost(clampRefine(item.refine)) : null;
}

export function canRefine(s: State, slot: Slot): boolean {
  const price = refinePrice(s, slot);
  return price !== null && s.materials >= price;
}

export function refine(s: State, slot: Slot): State {
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
    cost: pillCost(s.brewed, line),
    held: s.brewed[line],
    affordable: canBrew(s, line),
  }));
}
