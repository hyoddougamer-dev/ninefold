import { callingOf, schoolTier, wornTotals, type Calling, type GearTotals } from '../data/gear.ts';
import type { Pair, School } from '../data/schools.ts';
import {
  ARTIFICER_REFINE, ARTS_STRIKE, ART_BEND, FATE_FULL, FIND_TOP, FORTUNE_BOND, FUSE_BEND, LUCK_BEND, PAIR_BOUNTY,
  PAIR_DRIVE, PAIR_DROP, PAIR_MATERIAL, PAIR_MELT, PAIR_PILLS, PAIR_SPRING, PAIR_TOWER,
  PAIR_FORM, PAIR_HERBS, PAIR_MEET, PAIR_MEND, PAIR_TOWER_QI,
  PAIR_WARDEN, QI_UPGRADES, SUNDER_BEND, SWORD_POWER,
} from './balance.ts';
import { affinity } from './dao.ts';
import type { State } from './state.ts';

/**
 * 職 What a class does, read off the body. Every perk is here, as one small function a
 * system multiplies by, so the harnesses see exactly what the player gets and a class
 * that pays nothing shows up in `classes.test.ts` as paying nothing.
 *
 * The body is read once per call. The classes are derived from what is worn and never
 * stored, so there is nothing to keep in step: take a piece off and the class is gone.
 */

type Body = Pick<State, 'worn' | 'unlocked'>;

export function callingOfState(s: Body): Calling {
  return callingOf(s.worn);
}

/**
 * Every line on the body, affinity and class included. Read once per body and tree: both
 * are replaced rather than changed, so the pair of objects is the key.
 */
const TOTALS = new WeakMap<object, WeakMap<object, GearTotals>>();
export function bodyTotals(s: Body): GearTotals {
  let byTree = TOTALS.get(s.worn);
  if (!byTree) { byTree = new WeakMap(); TOTALS.set(s.worn, byTree); }
  const known = byTree.get(s.unlocked);
  if (known) return known;
  const t = wornTotals(s.worn, (slot) => affinity(s.unlocked, slot));
  byTree.set(s.unlocked, t);
  return t;
}

const tierOf = (s: Body, school: School) => schoolTier(callingOf(s.worn), school);
const pairIs = (s: Body, key: Pair) => {
  const c = callingOf(s.worn);
  return c.kind === 'pair' && c.pair?.key === key;
};
const step = (t: 0 | 1 | 2, by: readonly [number, number], none = 1) => (t === 0 ? none : by[t - 1]);

// ── the six schools ───────────────────────────────────────────────────────────

/** 劍 Power, as a multiplier. */
export function classPower(s: Body): number { return step(tierOf(s, 'sword'), SWORD_POWER); }
/** 氣 What the four 修 upgrades cost, as a multiplier. */
export function classUpgrades(s: Body): number { return step(tierOf(s, 'qi'), QI_UPGRADES); }
/** 運 How many wins fill a bond. */
export function classBond(s: Body): number { return step(tierOf(s, 'fortune'), FORTUNE_BOND, FATE_FULL); }
/** 器 What a refine level costs, as a multiplier. */
export function classRefine(s: Body): number { return step(tierOf(s, 'artificer'), ARTIFICER_REFINE); }

/** 法 What an art strikes for when it fires, as a multiplier. */
export function classArts(s: Body): number { return step(tierOf(s, 'arts'), ARTS_STRIKE); }

// ── the fifteen pairs ─────────────────────────────────────────────────────────────

export function classTower(s: Body): number { return pairIs(s, 'swordimmortal') ? PAIR_TOWER : 1; }
export function classDrive(s: Body): number { return pairIs(s, 'wanderer') ? PAIR_DRIVE : 1; }
export function classWarden(s: Body): number { return pairIs(s, 'wargod') ? PAIR_WARDEN : 1; }
export function classMaterial(s: Body): number { return pairIs(s, 'swordsmith') ? PAIR_MATERIAL : 1; }
export function classSpring(s: Body): number { return pairIs(s, 'seeker') ? PAIR_SPRING : 1; }
export function classBounty(s: Body): number { return pairIs(s, 'vajra') ? PAIR_BOUNTY : 1; }
export function classPills(s: Body): number { return pairIs(s, 'alchemist') ? PAIR_PILLS : 1; }
export function classDrop(s: Body): number { return pairIs(s, 'huntking') ? PAIR_DROP : 0; }
export function classMelt(s: Body): number { return pairIs(s, 'treasuresmith') ? PAIR_MELT : 1; }
/** 劍聖 The lowest a fight's form can roll for this body, against its middle; 0 is no floor. */
export function classForm(s: Body): number { return pairIs(s, 'swordsaint') ? PAIR_FORM : 0; }
export function classTowerQi(s: Body): number { return pairIs(s, 'celestial') ? PAIR_TOWER_QI : 1; }
export function classMeet(s: Body): number { return pairIs(s, 'diviner') ? PAIR_MEET : 1; }
/** 羅漢 Health recovered every round, as a share of the whole. */
export function classMend(s: Body): number { return pairIs(s, 'arhat') ? PAIR_MEND : 0; }
export function classHerbs(s: Body): number { return pairIs(s, 'formation') ? PAIR_HERBS : 1; }

// ── 運拾破煉 the four lines, bent ──────────────────────────────────────────────

/** 運 What the body's rarer-drops line does to the rare end of the table. */
export function gearLuck(s: Body): number {
  return 1 + LUCK_BEND * Math.log1p(Math.max(0, bodyTotals(s).luck) / 100);
}
/** 拾 What the body's drop-chance line adds to a beast's chance of leaving a piece. */
export function gearFind(s: Body): number {
  const f = Math.max(0, bodyTotals(s).find) / 100;
  return FIND_TOP * (1 - 1 / (1 + f));
}
/** 破 How much of itself a beast counts against this body. Never the Dragon. */
export function gearSunder(s: Body): number {
  return 1 / (1 + SUNDER_BEND * Math.log1p(Math.max(0, bodyTotals(s).sunder) / 100));
}
/** 法 What an art strikes for, from the body's arts line. */
export function gearArt(s: Body): number {
  return 1 + ART_BEND * Math.log1p(Math.max(0, bodyTotals(s).art) / 100);
}
/** 煉 How much of its quality a fusion keeps. */
export function gearFuse(s: Body): number {
  return 1 + FUSE_BEND * Math.log1p(Math.max(0, bodyTotals(s).refine) / 100);
}

/**
 * 榜 The class as one short word for the boards: a school with its step ("sword:2"), a
 * pair by its key ("wargod"), or null. The sync function writes it beside the standing,
 * read off the same verified save, so the board can never show a class the save does not
 * wear.
 */
export function callingKey(s: Pick<State, 'worn'>): string | null {
  const c = callingOf(s.worn);
  if (c.kind === 'pure' && c.school) return `${c.school}:${c.tier}`;
  if (c.kind === 'pair' && c.pair) return c.pair.key;
  return null;
}
