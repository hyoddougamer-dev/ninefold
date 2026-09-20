import { LINES, type Line } from '../data/alchemy.ts';
import { LADDER_GROWTH_LAST, LAYERS_PER_REALM, ladderOpen } from './balance.ts';
import { opensAt } from './unlocks.ts';

/**
 * 丹爐 The Furnace: the one thing qi buys that no realm caps.
 *
 * It is paid for twice — in qi, which comes from waiting, and in 材 materials, which
 * come from killing things. That is the point. Waiting alone cannot buy power any more,
 * and neither can fighting alone; the furnace is where the two halves of the game meet.
 *
 * Every price rises by the same small step, for ever, so it is bottomless without ever
 * being a wall: the next pill is always a little dearer than the last and never out of
 * reach twice over.
 */

/**
 * A pill's price rides the mountain, exactly as an upgrade's does — a pill costs half of
 * what a layer of the climb costs, and past the summit it goes on rising at the rate the
 * summit was rising at.
 *
 * So it is never cheap and never a wall, and a cultivator at the top pays a layer of the
 * mountain for two, which is the only reason the endgame has a pace at all.
 */
export const PILL_SHARE = 0.5;

/**
 * 爐底 Where the furnace's prices start on the mountain.
 *
 * The furnace opens at 合體, the seventh realm, and until this existed its first pill was
 * priced for the first realm — 450 qi and 14 材 to somebody gathering 192k qi a second.
 * Measured on a traced save: **one hour after the furnace opened, tapping the buttons
 * bought a hundred pills and 3.2x power**, and a day bought 4.5x. That is a whole realm's
 * worth of power for an hour of nothing, and it is the same fault the tower had when it
 * paid its entire back catalogue on the first visit.
 *
 * The rule that fixes it is the rule everything else in the game already follows: a
 * system that opens late starts where the player is standing, not where the game began.
 *
 * It starts **one realm behind** them rather than level with them, and that gap is the
 * whole design. Level with them, the first pill costs half of the layer they are
 * standing on: fifteen hours of gathering for +3% power, so the furnace opens as three
 * prices nobody can pay and the notice that says *start with a 煉體丹* is a lie. Two
 * realms behind, the first pill costs seven minutes and the back catalogue is a freebie
 * again. One realm behind, the first pill is an hour and a half, and buying a realm's
 * worth of pills costs about six days of a nineteen-day realm for 1.30x power — dear
 * enough to be a decision, cheap enough that the system is alive on the day it arrives.
 *
 * It is derived from the unlock ladder rather than written down, so moving the furnace
 * moves its prices with it and the two can never disagree.
 */
export const PILL_RUNG = (opensAt('furnace') - 2) * LAYERS_PER_REALM;

/** What the first pill of a line costs in materials, and what each one after adds. */
export const PILL_MATERIALS = 14;
/** One pill answers one tower floor, so its material price grows like a floor's pay. */
export const PILL_MATERIAL_STEP = LADDER_GROWTH_LAST;

/** What one pill of each line is worth. */
export const PILL_POWER = 0.03;       // 煉體 +3% power, multiplied
export const PILL_BANE = 0.985;       // 破煞 beasts at 98.5% per pill…
export const PILL_BANE_FLOOR = 0.4;   // …and never below this share of their power
export const PILL_FORTUNE = 0.04;     // 聚寶 +4% weight on the rare end of the table

export type Brewed = Record<Line, number>;

export const NO_PILLS: Brewed = { body: 0, bane: 0, fortune: 0 };

export function brewed(raw: unknown): Brewed {
  const o = (raw ?? {}) as Record<string, unknown>;
  const out = { ...NO_PILLS };
  for (const line of LINES) {
    const n = typeof o[line] === 'number' && Number.isFinite(o[line]) ? Math.floor(o[line] as number) : 0;
    out[line] = Math.max(0, Math.min(3000, n));
  }
  return out;
}

/** What the next pill of a line costs, in qi and in materials. */
export function pillCost(held: Brewed, line: Line): { qi: number; materials: number } {
  const n = held[line] + PILL_RUNG;
  return {
    qi: Math.ceil(PILL_SHARE * ladderOpen(n)),
    materials: Math.ceil(PILL_MATERIALS * PILL_MATERIAL_STEP ** n),
  };
}

/** 煉體 What every 煉體丹 ever taken is worth to power. */
export function pillPower(held: Brewed): number {
  return (1 + PILL_POWER) ** held.body;
}

/**
 * 破煞 What every 破煞丹 is worth against a beast.
 *
 * It closes on a floor instead of running to zero. A beast that can be reduced to
 * nothing is a beast that stops being a fight, and then the tower has no top.
 */
export function pillBane(held: Brewed): number {
  return PILL_BANE_FLOOR + (1 - PILL_BANE_FLOOR) * PILL_BANE ** held.bane;
}

/** 聚寶 What every 聚寶丹 is worth to the rare end of the drop table. */
export function pillFortune(held: Brewed): number {
  return 1 + PILL_FORTUNE * held.fortune;
}

/** How many pills have been brewed in all — the number the furnace shows. */
export function pillsTaken(held: Brewed): number {
  return LINES.reduce((sum, line) => sum + held[line], 0);
}
