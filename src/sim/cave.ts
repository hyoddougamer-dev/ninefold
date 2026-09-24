import { BEDS, EMPTY, HERBS, herbOf, type Bed, type Herb } from '../data/herbs.ts';
import { commonsOf } from '../data/bestiary.ts';
import { loot } from './combat.ts';
import { rate } from './time.ts';
import { isOpen } from './unlocks.ts';
import { isSeason } from './week.ts';
import { SEASON_HARVEST } from './balance.ts';
import type { State } from './state.ts';

/**
 * 洞天 The cave, and the three beds in it.
 *
 * 待 A bed is a key and an instant, and everything else is derived from the two. How
 * far along it is, whether it is ripe, how long is left: all of it is the instant in
 * the state minus the instant it was planted. So nothing ticks, nothing has to be
 * caught up on load, and a save that has been shut for a week comes back to three ripe
 * beds rather than to three beds that stopped.
 *
 * 取 And nothing is ever taken away for being late. A ripe bed waits for ever. The only
 * thing a long wait costs is the bed it is standing in, which is the whole of what
 * makes a twelve-hour herb a decision rather than an obvious answer.
 */

/** 材 What a beast of this realm pays, which is what a seed's price is a price in. */
function beastPay(s: State): number {
  const commons = commonsOf(Math.max(1, Math.min(9, s.realm)));
  return commons.length ? loot(commons[0]) : 1;
}

/** 氣 A minute of this cultivator's own standing gathering, the same unit 緣 uses. */
function perMinute(s: State): number {
  return rate(s) * 60;
}

/** What a seed costs, as a whole number of material. */
export function seedCost(s: State, h: Herb): number {
  return Math.max(1, Math.ceil(h.costBeasts * beastPay(s)));
}

/**
 * What a ripe bed pays, as a whole number of qi.
 *
 * 期 A bed of the herb in season pays half again. It is a multiplier on a payment and
 * never on the rate, and the cave is capped three ways over: three beds, planted by
 * hand, with material that only falls off a beast. See sim/week.ts.
 */
export function harvestValue(s: State, h: Herb): number {
  const week = isSeason(s, h) ? SEASON_HARVEST : 1;
  return Math.max(1, Math.round(h.paysMinutes * perMinute(s) * week));
}

/** The herbs this realm can plant. */
export function plantable(s: State): readonly Herb[] {
  return HERBS.filter((h) => h.realm <= s.realm);
}

/** How far along a bed is, 0 to 1. An empty bed is 0 and a ripe one is exactly 1. */
export function grown(s: State, bed: Bed): number {
  const h = bed.herb ? herbOf(bed.herb) : undefined;
  if (!h) return 0;
  const seconds = Math.max(0, s.at - bed.at);
  return Math.max(0, Math.min(1, seconds / (h.hours * 3600)));
}

/** Seconds left before a bed is ripe. Zero once it is. */
export function leftOn(s: State, bed: Bed): number {
  const h = bed.herb ? herbOf(bed.herb) : undefined;
  if (!h) return 0;
  return Math.max(0, h.hours * 3600 - Math.max(0, s.at - bed.at));
}

export function isRipe(s: State, bed: Bed): boolean {
  return bed.herb !== null && leftOn(s, bed) === 0;
}

export function caveOpen(s: State): boolean {
  return isOpen(s.realm, 'cave');
}

export function canPlant(s: State, which: number, key: string): boolean {
  const h = herbOf(key);
  if (!caveOpen(s) || !h || h.realm > s.realm) return false;
  if (which < 0 || which >= BEDS) return false;
  if (s.beds[which]?.herb) return false;              // a bed in use is not free
  return s.materials >= seedCost(s, h);
}

export function plant(s: State, which: number, key: string): State {
  if (!canPlant(s, which, key)) return s;
  const h = herbOf(key)!;
  const beds = s.beds.map((b, i) => (i === which ? { herb: key, at: s.at } : b));
  return { ...s, materials: s.materials - seedCost(s, h), beds };
}

/**
 * Take a ripe bed. An unripe one is left alone rather than taken early, because a bed
 * that can be pulled up for a fraction is a bed nobody ever waits on.
 */
export function harvest(s: State, which: number): State {
  const bed = s.beds[which];
  if (!caveOpen(s) || !bed || !isRipe(s, bed)) return s;
  const h = herbOf(bed.herb!)!;
  const beds = s.beds.map((b, i) => (i === which ? EMPTY : b));
  return { ...s, qi: s.qi + harvestValue(s, h), beds, reaped: (s.reaped ?? 0) + 1 };
}

/** Take everything that is ripe, which is what the button at the top of the cave does. */
export function harvestAll(s: State): State {
  let out = s;
  for (let i = 0; i < BEDS; i++) out = harvest(out, i);
  return out;
}

/** How many beds are ripe right now, for the count on the tab and in the advice. */
export function ripeCount(s: State): number {
  return caveOpen(s) ? s.beds.filter((b) => isRipe(s, b)).length : 0;
}

export { BEDS, EMPTY, HERBS, herbOf, type Bed, type Herb };
