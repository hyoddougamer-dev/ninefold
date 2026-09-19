import { LINES, pillOf, type Line } from '../data/alchemy.ts';
import { pillCost } from './furnace.ts';
import { floorLoot, lootBonus, nextFloor } from './tower.ts';
import type { State } from './state.ts';

/**
 * 塔 and 爐 — the two halves of the loop that has no ceiling.
 *
 * The curves live in `tower.ts` and `furnace.ts` and know nothing about a save. This is
 * where they touch the state: climbing a floor, and brewing a pill. Both are pure, both
 * refuse rather than half-apply, and neither can ever raise the qi rate.
 */

/** The floor waiting to be tried. Exactly one, always, and losing costs nothing. */
export function standingFloor(s: State): number {
  return nextFloor(s.tower);
}

/** A floor only counts once, and only the next one is ever open. */
export function clearFloor(s: State, floor: number): State {
  if (floor !== standingFloor(s)) return s;
  return {
    ...s,
    tower: floor,
    materials: s.materials + Math.round(floorLoot(floor) * lootBonus(s.tower)),
  };
}

/** What a kill is worth in materials, once the tower's seals are counted. */
export function lootTaken(s: State, base: number): number {
  return Math.max(1, Math.round(base * lootBonus(s.tower)));
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
