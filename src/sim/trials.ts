import { furnaceDiscount } from './crafts.ts';
import { LINES, pillOf, type Line } from '../data/alchemy.ts';
import { pillCost } from './furnace.ts';
import { floorLoot, floorQiPay, lootBonus, nextFloor } from './tower.ts';
import { recordMaterial } from './record.ts';
import { rate, type State } from './state.ts';
import { REFINE_LIMIT, clampRefine, refineCost } from './refine.ts';
import { materialBonus, pillFactor, refineFactor, towerBonus } from './awaken.ts';
import type { Slot } from '../data/gear.ts';
import { isOpen } from './unlocks.ts';
import { classMaterial, classPills, classRefine, classTowerQi } from './schools.ts';

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
 * 吸 This cultivator's gathering with nothing worn: what 擂台 the Platform pays its hours of.
 *
 * The levels, the pills, the tree and the marks all count, because none of them can be
 * taken off. The gear's 氣 lines do not, so the pay never moves when the clothes do. The
 * tower used to pay in it too, until 2026-10-05: see floorQi.
 */
export function towerRate(s: State): number {
  return rate({ ...s, worn: BARE });
}
const BARE = {} as State['worn'];

/**
 * 吸 What a floor gives up in qi when it falls: the floor's own fixed sum (floorQiPay in
 * tower.ts), and 天師 the Celestial Master's quarter again, which is the one thing a build adds.
 *
 * 誤 It was hours of gathering, and twice the hours read the climber. First the rate with
 * gear on and the floor's power against the cultivator's own (2026-10-04: taking a piece
 * off raised the pay of every floor outgrown, ×1.55 on a sweep from the first floor).
 * Then the rate with nothing worn and the realm (rekaris and speculaether, 2026-10-05):
 * buying rate before climbing paid more, a floor beaten a realm early paid less, a floor
 * beaten high paid half, and a floor falls only once. Now the floor decides and nothing
 * else does, so what the card says before the fight is what the fight pays, to anybody.
 */
export function floorQi(s: State, floor = standingFloor(s)): number {
  // 天師 The Celestial Master is paid a quarter again for a floor. A payment, never the rate.
  return floorQiPay(floor) * classTowerQi(s);
}

/**
 * A floor only counts once, and only the next one is ever open.
 *
 * It pays in qi as well as in material, and that is the one place in the game where
 * fighting turns into *progress* rather than only into power. It is safe to be generous
 * because a floor falls once: there is nothing here to farm, and the next floor is
 * always harder than the last.
 */
/**
 * 材 What a floor pays in material to *this* cultivator: the table, the heavens' 塔 cards,
 * the seals, the record and every card that touches material.
 *
 * 誤 Two screens used to work it out for themselves, as the table times the seals, and
 * both said less than the save was credited: the tower card's "pays" line before the
 * climb, and the arena's verdict after it. One function, read by all three.
 */
export function floorMaterial(s: State, floor: number): number {
  return lootTaken(s, floorLoot(floor) * towerBonus(s.awakened));
}

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
    materials: s.materials + floorMaterial(s, floor),
  };
}

/** 丹 What the next pill of a line costs *this* cultivator, thrift cards counted. */
export function pillPrice(s: State, line: Line): { qi: number; materials: number } {
  // 職 丹師 The Alchemist brews cheaper, in qi and in material alike.
  const c = pillCost(s.brewed, line, s.tribulation, pillFactor(s.awakened));
  const k = classPills(s);
  // 丹 And every Alchemy level takes a little off the material. See furnaceDiscount.
  const m = s.crafts ? furnaceDiscount(s) : 1;
  return k === 1 && m === 1 ? c : { qi: Math.ceil(c.qi * k), materials: Math.max(1, Math.ceil(c.materials * k * m)) };
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
  return Math.max(1, Math.round(base * lootBonus(s.tower) * record * materialBonus(s.awakened) * classMaterial(s)));
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
 * 盡 As many pills of one line as can be paid for now, each at its own price, the way a
 * player tapping the pill until it greys out would brew them. Nothing is cheaper for being
 * brewed together: it is brew() in a loop and stops where brew() would, as buyMax does on 修.
 */
export function brewMax(s: State, line: Line): { state: State; n: number; qi: number; materials: number } {
  let state = s;
  let n = 0;
  for (; n < 10_000 && canBrew(state, line); n++) state = brew(state, line);
  return { state, n, qi: s.qi - state.qi, materials: s.materials - state.materials };
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
  return Math.max(1, Math.ceil(refineCost(clampRefine(item.refine)) * refineFactor(s.awakened) * classRefine(s)));
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
