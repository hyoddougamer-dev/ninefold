/**
 * 靈草 What grows in 洞天 the cave, and what it is worth.
 *
 * Bruno's fourth proposal and the one he asked for next: a place you own, that grows
 * while you are away. The only thing that happens today while the app is shut is a bar
 * filling, and a bar is not a place.
 *
 * 律 What it is allowed to be, and the rule this session had to learn the hard way.
 *
 * 悟道 The cards taught it: anything that pays while you are away must not let the
 * cultivator who is never there win. Five power cards compounding to 3.5x took fifty
 * days off the pure idler and less than one off everybody else, because they are gated
 * by qi and the idler is gated by power.
 *
 * So a bed is worked from **both ends by hand**. You plant it, hours pass, and you come
 * back and take it. A cultivator who never opens the app plants nothing and harvests
 * nothing, and three beds cap what any amount of opening it can be worth.
 *
 * 換 And what it converts is the other half of it. Planting costs 材 material, which
 * only ever falls off beasts, and a ripe bed pays 氣 qi, which is the climb. So the
 * cave is a hunter's road to the ladder, it cannot be walked by somebody who does not
 * hunt, and it puts a third answer next to 妖丹 cores and 煉器 refining for the
 * question of where the material goes.
 */

export interface Herb {
  readonly key: string;
  readonly han: string;
  readonly name: string;
  readonly icon: string;
  /** The realm it can first be planted in. */
  readonly realm: number;
  /** Hours from planting to ripe. */
  readonly hours: number;
  /** What a seed costs, in beasts of the planter's own realm. */
  readonly costBeasts: number;
  /** What it pays when taken, in minutes of the planter's own standing gathering. */
  readonly paysMinutes: number;
  readonly says: string;
}

/**
 * Three to start with, and the longer one is the better rate.
 *
 * That is the decision the beds are for: a short herb three times a day beats a long
 * one if you are there three times a day, and loses badly if you are not. Nothing here
 * rots and nothing is lost by being late, so the only thing a long wait costs is the
 * bed it is standing in.
 */
export const HERBS: readonly Herb[] = [
  {
    key: 'moss', han: '青苔', name: 'Spirit Moss', icon: 'spiral-bloom',
    realm: 2, hours: 2, costBeasts: 2, paysMinutes: 4,
    says: 'Quick and thin. Worth it if you are back within the hour.',
  },
  {
    key: 'orchid', han: '月華蘭', name: 'Moonlight Orchid', icon: 'crystal-cluster',
    realm: 2, hours: 6, costBeasts: 5, paysMinutes: 13,
    says: 'Half a working day. The bed is yours until you come back for it.',
  },
  {
    key: 'dragonblood', han: '龍血草', name: 'Dragonblood Grass', icon: 'fire-gem',
    realm: 3, hours: 12, costBeasts: 9, paysMinutes: 30,
    says: 'Overnight. The best rate in the cave, and the slowest to come round.',
  },
];

const BY_KEY: Readonly<Record<string, Herb>> =
  Object.fromEntries(HERBS.map((h) => [h.key, h]));

export function herbOf(key: string): Herb | undefined {
  return BY_KEY[key];
}

/** How many beds the cave has. Three, and nothing in the game adds a fourth yet. */
export const BEDS = 3;

/** 洞天 A bed: what is planted, and the instant it was planted. Nothing else is stored. */
export interface Bed {
  readonly herb: string | null;
  readonly at: number;
}

export const EMPTY: Bed = { herb: null, at: 0 };

/**
 * A save is input, so the beds are rebuilt rather than trusted.
 *
 * Always exactly three. A key that names no herb is an empty bed, an instant in the
 * future is pulled back to now, because a save does not get to plant tomorrow, and one
 * from before the cultivator existed is pulled up to when they started.
 *
 * It lives here rather than in sim/cave.ts for the same reason validMet lives beside
 * the meetings: state.ts has to reach it, and sim/cave.ts reads a State through time.ts,
 * so the two would import each other at runtime.
 */
export function validBeds(raw: unknown, now: number, startedAt: number): Bed[] {
  const list = Array.isArray(raw) ? raw : [];
  return Array.from({ length: BEDS }, (_, i) => {
    const o = (list[i] ?? {}) as Record<string, unknown>;
    const herb = typeof o.herb === 'string' && BY_KEY[o.herb] ? o.herb : null;
    if (!herb) return EMPTY;
    const at = typeof o.at === 'number' && Number.isFinite(o.at) ? o.at : now;
    return { herb, at: Math.max(startedAt, Math.min(now, at)) };
  });
}
