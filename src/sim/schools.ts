import { callingOf, schoolTier, wornTotals, type GearTotals, type Refined } from '../data/gear.ts';
import type { Pair, School } from '../data/schools.ts';
import {
  ARTIFICER_REFINE, ARTS_STRIKE, ART_BEND, FATE_FULL, FIND_TOP, FORTUNE_BOND, FUSE_BEND, LUCK_BEND, PAIR_BOUNTY,
  PAIR_CHEST, PAIR_DRIVE, PAIR_DROP, PAIR_MATERIAL, PAIR_MELT, PAIR_PILLS, PAIR_SPRING, PAIR_TOWER,
  PAIR_DRAGON, PAIR_HERBS, PAIR_MEET, PAIR_MEND, PAIR_TOWER_QI,
  PAIR_WARDEN, QI_FULL_ROOF, QI_UPGRADES, SUNDER_BEND, SWORD_POWER,
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

/** 煉 The body: what is worn, the tree, and the refining of each place it is worn in. */
type Body = Pick<State, 'worn' | 'unlocked' | 'refined'>;

/** 煉 What a body built by hand without its places' levels reads: none. */
const UNREFINED: Refined = Object.freeze({});

/**
 * Every line on the body, affinity, refining and class included. Read once per body, tree
 * and places' levels: all three are replaced rather than changed, so the objects are the key.
 */
const TOTALS = new WeakMap<object, WeakMap<object, WeakMap<object, GearTotals>>>();
export function bodyTotals(s: Body): GearTotals {
  const refined = s.refined ?? UNREFINED;
  let byTree = TOTALS.get(s.worn);
  if (!byTree) { byTree = new WeakMap(); TOTALS.set(s.worn, byTree); }
  let byLevels = byTree.get(s.unlocked);
  if (!byLevels) { byLevels = new WeakMap(); byTree.set(s.unlocked, byLevels); }
  const known = byLevels.get(refined);
  if (known) return known;
  const t = wornTotals(s.worn, (slot) => affinity(s.unlocked, slot), refined);
  byLevels.set(refined, t);
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
/** 氣滿 How much higher the qi roof stands: QI_FULL_ROOF in the full Qi school, else 0. */
export function classQiRoof(s: Body): number { return tierOf(s, 'qi') === 2 ? QI_FULL_ROOF : 0; }
/** 運 How many wins fill a bond. */
export function classBond(s: Body): number { return step(tierOf(s, 'fortune'), FORTUNE_BOND, FATE_FULL); }
/** 器 What a refine level costs, as a multiplier. */
export function classRefine(s: Body): number { return step(tierOf(s, 'artificer'), ARTIFICER_REFINE); }

/** 法 What an art strikes for when it fires, as a multiplier. */
export function classArts(s: Body): number { return step(tierOf(s, 'arts'), ARTS_STRIKE); }

// ── the fifteen pairs ─────────────────────────────────────────────────────────────

/**
 * 合 Each pair's perk, as the number it pays. One table, read by the functions below and
 * by the sentence the player reads (pairSays in classes.ts), so the two cannot drift.
 * 甲匠 the Armourer's places are counted where the chest is (wornTotals, chest.ts).
 */
export const PAIR_VALUE: Readonly<Record<Pair, number>> = {
  swordimmortal: PAIR_TOWER, wanderer: PAIR_DRIVE, wargod: PAIR_WARDEN, swordsmith: PAIR_MATERIAL,
  seeker: PAIR_SPRING, vajra: PAIR_BOUNTY, alchemist: PAIR_PILLS, huntking: PAIR_DROP,
  treasuresmith: PAIR_MELT, armourer: PAIR_CHEST,
  swordsaint: PAIR_DRAGON, celestial: PAIR_TOWER_QI, diviner: PAIR_MEET, arhat: PAIR_MEND, formation: PAIR_HERBS,
};
/** A pair's own number on the body that is that pair, and `none` on any other. */
const perk = (s: Body, key: Pair, none = 1) => (pairIs(s, key) ? PAIR_VALUE[key] : none);

export function classTower(s: Body): number { return perk(s, 'swordimmortal'); }
export function classDrive(s: Body): number { return perk(s, 'wanderer'); }
export function classWarden(s: Body): number { return perk(s, 'wargod'); }
export function classMaterial(s: Body): number { return perk(s, 'swordsmith'); }
export function classSpring(s: Body): number { return perk(s, 'seeker'); }
export function classBounty(s: Body): number { return perk(s, 'vajra'); }
export function classPills(s: Body): number { return perk(s, 'alchemist'); }
export function classDrop(s: Body): number { return perk(s, 'huntking', 0); }
export function classMelt(s: Body): number { return perk(s, 'treasuresmith'); }
/** 劍聖 How much of itself the Dragon of the tribulation counts against this body. */
export function classDragon(s: Body): number { return perk(s, 'swordsaint'); }
export function classTowerQi(s: Body): number { return perk(s, 'celestial'); }
export function classMeet(s: Body): number { return perk(s, 'diviner'); }
/** 羅漢 Health recovered every round, as a share of the whole. */
export function classMend(s: Body): number { return perk(s, 'arhat', 0); }
export function classHerbs(s: Body): number { return perk(s, 'formation'); }

// ── 運拾破煉 the four lines, bent ──────────────────────────────────────────────

/**
 * 彎 The bends themselves, on a line's total as the screen prints it (+46.9% is 46.9).
 * The body reads them through the functions below, and 註 the gear notes quote them by
 * example, so a note's "+100% gives ×1.35" is this function and cannot drift from play.
 */
const frac = (sum: number) => Math.max(0, sum) / 100;
export const bendLuck = (sum: number): number => 1 + LUCK_BEND * Math.log1p(frac(sum));
export const bendFind = (sum: number): number => FIND_TOP * (1 - 1 / (1 + frac(sum)));
export const bendSunder = (sum: number): number => 1 / (1 + SUNDER_BEND * Math.log1p(frac(sum)));
export const bendArt = (sum: number): number => 1 + ART_BEND * Math.log1p(frac(sum));
export const bendFuse = (sum: number): number => 1 + FUSE_BEND * Math.log1p(frac(sum));

/** 運 What the body's rarer-drops line does to the rare end of the table. */
export function gearLuck(s: Body): number { return bendLuck(bodyTotals(s).luck); }
/** 拾 What the body's drop-chance line adds to a beast's chance of leaving a piece. */
export function gearFind(s: Body): number { return bendFind(bodyTotals(s).find); }
/** 破 How much of itself a beast counts against this body. Never the Dragon. */
export function gearSunder(s: Body): number { return bendSunder(bodyTotals(s).sunder); }
/** 法 What an art strikes for, from the body's arts line. */
export function gearArt(s: Body): number { return bendArt(bodyTotals(s).art); }
/** 煉 How much of its quality a fusion keeps. */
export function gearFuse(s: Body): number { return bendFuse(bodyTotals(s).refine); }

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
