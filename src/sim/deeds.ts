/**
 * 碑 The stele: what this cultivator has actually done.
 *
 * Three rules, and the first one is the whole design.
 *
 *   1. **A deed pays nothing.** Not qi, not power, not material. The economy's one law
 *      is that nothing uncapped may raise the qi rate, and a list of deeds is about as
 *      uncapped as a thing can get — but the deeper reason is that the moment a deed
 *      pays, it becomes something worth faking. 九境 is meant to go online, and a
 *      leaderboard of achievements that buy power is a leaderboard of forged saves.
 *      These are a record. That is the entire point of them.
 *
 *   2. **A deed is derived, never stored.** Exactly like 勢 the stances and 訣 the arts:
 *      nothing in the save says "I have done this", the deed is recomputed from the
 *      numbers the save already has to carry and already validates. There is no flag to
 *      flip, so a hand-edited save cannot claim a deed without claiming the whole run
 *      that leads to it.
 *
 *   3. **A deed has a number.** Every one of them is `at / want`, so an unfinished deed
 *      is a progress bar rather than a locked box. A cultivator should be able to see
 *      that they are two floors from 塔 and nine hundred kills from 萬獸.
 *
 * They are grouped by the system they belong to, so the stele reads as the game's own
 * shape rather than as a flat list of two dozen chores.
 */
import { LAYERS_PER_REALM, MARK_DAYS } from './balance.ts';
import { REALMS } from '../data/realms.ts';
import { BEASTS, wardenOf } from '../data/bestiary.ts';
import { MARKS } from './record.ts';
import { seals } from './tower.ts';
import { pillsTaken } from './furnace.ts';
import { clampRefine } from './refine.ts';
import { daoSpent } from './dao.ts';
import { NODES } from '../data/techniques.ts';
import { RARITIES, SLOTS, templateOf } from '../data/gear.ts';
import type { State } from './state.ts';

export type Track = 'climb' | 'hunt' | 'tower' | 'furnace' | 'gear' | 'path' | 'thunder';

export interface TrackInfo {
  readonly key: Track;
  readonly han: string;
  readonly name: string;
}

export const TRACKS: readonly TrackInfo[] = [
  { key: 'climb', han: '階', name: 'The climb' },
  { key: 'hunt', han: '狩', name: 'The hunt' },
  { key: 'tower', han: '塔', name: 'The tower' },
  { key: 'furnace', han: '爐', name: 'The furnace' },
  { key: 'gear', han: '器', name: 'The gear' },
  { key: 'path', han: '道', name: 'The path' },
  { key: 'thunder', han: '劫', name: 'The tribulation' },
];

export interface Deed {
  readonly key: string;
  readonly track: Track;
  readonly han: string;
  readonly name: string;
  /** What it asks for, in the unit the screen shows. */
  readonly want: number;
  /** How far along this cultivator is, capped at `want`. */
  readonly at: (s: State) => number;
  /** One line, said as a fact rather than as an instruction. */
  readonly line: string;
}

/** Total kills, wardens included. */
export function killCount(s: State): number {
  return Object.values(s.killed).reduce((a, b) => a + b, 0);
}

/** How many beasts have been killed a hundred times: the 通 mark. */
export function mastered(s: State): number {
  return BEASTS.filter((b) => (s.killed[b.key] ?? 0) >= MARKS[MARKS.length - 1]).length;
}

/** How many beasts have been seen at all: the 見 mark. */
export function seenBeasts(s: State): number {
  return BEASTS.filter((b) => (s.killed[b.key] ?? 0) > 0).length;
}

/** Wardens put down, which is what the arts and the 道 points are counted from. */
export function wardensFelled(s: State): number {
  return REALMS.filter((r) => (s.killed[wardenOf(r.n).key] ?? 0) > 0).length;
}

/** The best rank anywhere on the body, as an index into RARITIES. */
export function bestWornRank(s: State): number {
  let best = -1;
  for (const slot of SLOTS) {
    const it = s.worn[slot];
    if (it) best = Math.max(best, RARITIES.indexOf(it.rarity));
  }
  return best;
}

/** How many slots are filled. */
export function wornCount(s: State): number {
  return SLOTS.filter((slot) => s.worn[slot]).length;
}

/** The most pieces of one lineage worn at once — what the set bonuses count. */
export function bestLineage(s: State): number {
  const byRealm = new Map<number, number>();
  for (const slot of SLOTS) {
    const it = s.worn[slot];
    if (!it) continue;
    const realm = templateOf(it).realm;
    byRealm.set(realm, (byRealm.get(realm) ?? 0) + 1);
  }
  return Math.max(0, ...byRealm.values());
}

/** The deepest refine on anything worn. */
export function bestRefine(s: State): number {
  return Math.max(0, ...SLOTS.map((slot) => clampRefine(s.worn[slot]?.refine)));
}

/** Days since the run began, which is the one number every other one is read against. */
export function daysIn(s: State): number {
  return Math.max(0, (s.at - s.startedAt) / 86_400);
}

/** The three forks in the tree, each of which asks you to give something up. */
const KEYSTONES = NODES.filter((n) => n.keystone);

/** 階 One deed for every realm, because a realm reached is the deed this game is about. */
const CLIMB: Deed[] = REALMS.slice(1).map((r) => ({
  key: `realm${r.n}`,
  track: 'climb' as Track,
  han: r.han,
  name: r.name,
  want: r.n,
  at: (s: State) => Math.min(r.n, s.realm),
  line: `Reach the ${['', 'first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth', 'ninth'][r.n]} realm.`,
}));

export const DEEDS: readonly Deed[] = [
  ...CLIMB,
  {
    key: 'ladder', track: 'climb', han: '階', name: 'The whole mountain',
    want: 81, line: 'Open every one of the eighty-one layers.',
    at: (s) => Math.min(81, (s.realm - 1) * LAYERS_PER_REALM + s.layer + 1),
  },

  {
    key: 'seen', track: 'hunt', han: '見', name: 'Every beast seen',
    want: BEASTS.length, line: 'Kill one of every beast in the game, wardens included.',
    at: seenBeasts,
  },
  {
    key: 'kills100', track: 'hunt', han: '百獸', name: 'A hundred beasts',
    want: 100, line: 'A hundred kills.', at: (s) => Math.min(100, killCount(s)),
  },
  {
    key: 'kills10k', track: 'hunt', han: '萬獸', name: 'Ten thousand beasts',
    want: 10_000, line: 'Ten thousand kills. Nobody does this by accident.',
    at: (s) => Math.min(10_000, killCount(s)),
  },
  {
    key: 'master1', track: 'hunt', han: '通', name: 'Mastery',
    want: 1, line: `Kill one beast ${MARKS[MARKS.length - 1]} times for its 通 mark.`,
    at: (s) => Math.min(1, mastered(s)),
  },
  {
    key: 'masterAll', track: 'hunt', han: '全通', name: 'The finished record',
    want: BEASTS.length, line: 'Every 通 mark on every beast. The record closed.',
    at: mastered,
  },
  {
    key: 'wardens', track: 'hunt', han: '妖', name: 'Nine wardens',
    want: REALMS.length, line: 'Put down the warden of every realm.', at: wardensFelled,
  },

  {
    key: 'floor9', track: 'tower', han: '登', name: 'The first seal',
    want: 9, line: 'Nine floors of 無盡塔, and the first 塔印 seal.',
    at: (s) => Math.min(9, s.tower),
  },
  {
    key: 'floor81', track: 'tower', han: '塔', name: 'As high as the mountain',
    want: 81, line: 'Floor eighty-one. The tower has now matched the whole climb.',
    at: (s) => Math.min(81, s.tower),
  },
  {
    key: 'floor150', track: 'tower', han: '越', name: 'Past the mountain',
    want: 150, line: 'Floor a hundred and fifty, where the realms ran out.',
    at: (s) => Math.min(150, s.tower),
  },
  {
    key: 'seals20', track: 'tower', han: '塔印', name: 'Twenty seals',
    want: 20, line: 'Twenty 塔印 seals, each one nine floors.',
    at: (s) => Math.min(20, seals(s.tower)),
  },

  {
    key: 'brew1', track: 'furnace', han: '丹', name: 'The first pill',
    want: 1, line: 'Light the furnace.', at: (s) => Math.min(1, pillsTaken(s.brewed)),
  },
  {
    key: 'brew100', track: 'furnace', han: '百丹', name: 'A hundred pills',
    want: 100, line: 'A hundred pills brewed, on any of the three lines.',
    at: (s) => Math.min(100, pillsTaken(s.brewed)),
  },
  {
    key: 'body50', track: 'furnace', han: '煉體', name: 'Fifty temperings',
    want: 50, line: 'Fifty 煉體 pills. The line the Dragon can feel.',
    at: (s) => Math.min(50, s.brewed.body),
  },

  {
    key: 'heaven', track: 'gear', han: '天', name: 'A Heaven piece',
    want: 1, line: `Wear a 天 piece, the rarest of the ${RARITIES.length} ranks.`,
    at: (s) => (bestWornRank(s) >= RARITIES.length - 1 ? 1 : 0),
  },
  {
    key: 'dressed', track: 'gear', han: '備', name: 'Fully dressed',
    want: SLOTS.length, line: 'Something in all six slots at once.', at: wornCount,
  },
  {
    key: 'lineage', track: 'gear', han: '相', name: 'A whole lineage',
    want: SLOTS.length, line: 'Six pieces of one lineage, worn together.',
    at: bestLineage,
  },
  {
    key: 'refine10', track: 'gear', han: '煉器', name: 'Ten refinings',
    want: 10, line: 'Take one piece to 煉 10 and keep it.', at: bestRefine,
  },

  {
    key: 'dao20', track: 'path', han: '道', name: 'Twenty points spent',
    want: 20, line: 'Twenty 道 points into the tree.',
    at: (s) => Math.min(20, daoSpent(s.unlocked)),
  },
  {
    key: 'keystone', track: 'path', han: '捨', name: 'A keystone taken',
    want: 1, line: 'Take a keystone, and give up what it asks for.',
    at: (s) => Math.min(1, KEYSTONES.filter((k) => s.unlocked.includes(k.key)).length),
  },
  {
    key: 'keystones', track: 'path', han: '三捨', name: 'Every keystone',
    want: KEYSTONES.length, line: 'All three keystones at once, which costs more than it looks.',
    at: (s) => KEYSTONES.filter((k) => s.unlocked.includes(k.key)).length,
  },

  {
    key: 'mark1', track: 'thunder', han: '雷印', name: 'The first crossing',
    want: 1, line: `Fill 雷池 the pool — ${MARK_DAYS} days of your own gathering — and put the Dragon down.`,
    at: (s) => Math.min(1, s.tribulation),
  },
  {
    key: 'mark10', track: 'thunder', han: '十劫', name: 'Ten marks',
    want: 10, line: 'Ten crossings. The Dragon is ten times the one you first met, and worse.',
    at: (s) => Math.min(10, s.tribulation),
  },
  {
    key: 'mark40', track: 'thunder', han: '四十劫', name: 'Forty marks',
    want: 40, line: 'Forty crossings, which is about four months of endgame.',
    at: (s) => Math.min(40, s.tribulation),
  },
];

export function doneBy(s: State, d: Deed): boolean {
  return d.at(s) >= d.want;
}

/** How many deeds this cultivator holds, and how many there are. */
export function tally(s: State): { done: number; all: number } {
  return { done: DEEDS.filter((d) => doneBy(s, d)).length, all: DEEDS.length };
}

/** The deeds of one track, in the order they are written above. */
export function deedsOn(track: Track): readonly Deed[] {
  return DEEDS.filter((d) => d.track === track);
}

/**
 * The nearest deed not yet held, by how much of it is done.
 *
 * It is what the stele leads with, because "you are two floors away" is the only line
 * on a page of thirty that is about tonight.
 */
export function closest(s: State): Deed | null {
  const open = DEEDS.filter((d) => !doneBy(s, d) && d.at(s) > 0);
  if (!open.length) return DEEDS.find((d) => !doneBy(s, d)) ?? null;
  return open.reduce((best, d) => (d.at(s) / d.want > best.at(s) / best.want ? d : best));
}
