import { PAIRS, SCHOOLS, SCHOOL_INFO, type Pair, type School } from '../data/schools.ts';
import {
  ARTIFICER_REFINE, ARTS_STRIKE, CLASS_AMP, FORTUNE_BOND, PAIR_BOUNTY, PAIR_CHEST, PAIR_DRIVE, PAIR_DROP,
  PAIR_DRAGON, PAIR_HERBS, PAIR_MATERIAL, PAIR_MEET, PAIR_MELT, PAIR_MEND, PAIR_PILLS, PAIR_SPRING,
  PAIR_TOWER, PAIR_TOWER_QI, PAIR_WARDEN, QI_UPGRADES,
  SWORD_POWER,
} from '../sim/balance.ts';
import { CLASS } from './copy.ts';

/**
 * 職 What a school or a pair gives, as the player reads it, built from the same numbers
 * the sim multiplies by. One place, so the key, the gear screen and the sheet say the
 * same sentence and none of them can promise what the game does not pay.
 */
export function schoolSays(sc: School): string {
  switch (sc) {
    case 'sword': return CLASS.school.sword(SWORD_POWER[0], SWORD_POWER[1]);
    case 'qi': return CLASS.school.qi(QI_UPGRADES[0], QI_UPGRADES[1]);
    case 'fortune': return CLASS.school.fortune(FORTUNE_BOND[0], FORTUNE_BOND[1], CLASS_AMP[0], CLASS_AMP[1]);
    case 'body': return CLASS.school.body(CLASS_AMP[0], CLASS_AMP[1]);
    case 'artificer': return CLASS.school.artificer(ARTIFICER_REFINE[0], ARTIFICER_REFINE[1], CLASS_AMP[0], CLASS_AMP[1]);
    case 'arts': return CLASS.school.arts(ARTS_STRIKE[0], ARTS_STRIKE[1]);
  }
}

/** The same, at the one step the body is at: 1 awake, 2 at its full. */
export function schoolSaysAt(sc: School, tier: number): string {
  const i = tier >= 2 ? 1 : 0;
  switch (sc) {
    case 'sword': return CLASS.schoolAt.sword(SWORD_POWER[i]);
    case 'qi': return CLASS.schoolAt.qi(QI_UPGRADES[i]);
    case 'fortune': return CLASS.schoolAt.fortune(FORTUNE_BOND[i], CLASS_AMP[i]);
    case 'body': return CLASS.schoolAt.body(CLASS_AMP[i]);
    case 'artificer': return CLASS.schoolAt.artificer(ARTIFICER_REFINE[i], CLASS_AMP[i]);
    case 'arts': return CLASS.schoolAt.arts(ARTS_STRIKE[i]);
  }
}

const PAIR_SIZE: Record<Pair, number> = {
  swordimmortal: PAIR_TOWER, wanderer: PAIR_DRIVE, wargod: PAIR_WARDEN, swordsmith: PAIR_MATERIAL,
  seeker: PAIR_SPRING, vajra: PAIR_BOUNTY, alchemist: PAIR_PILLS, huntking: PAIR_DROP,
  treasuresmith: PAIR_MELT, armourer: PAIR_CHEST,
  swordsaint: PAIR_DRAGON, celestial: PAIR_TOWER_QI, diviner: PAIR_MEET, arhat: PAIR_MEND, formation: PAIR_HERBS,
};

export function pairSays(p: Pair): string {
  return CLASS.pair[p](PAIR_SIZE[p]);
}

export interface CallingLabel {
  readonly han: string;
  readonly name: string;
  readonly colour: string;
}

/**
 * 榜 A class as the board sends it back: "sword:2", a pair's key, or nothing. What the
 * server holds is read like a save is, as input: anything that is not one of the fifteen
 * names shows no chip rather than a wrong one.
 */
export function callingLabel(key: string | null | undefined): CallingLabel | null {
  if (!key) return null;
  const pair = PAIRS.find((p) => p.key === key);
  if (pair) return { han: pair.han, name: pair.name, colour: SCHOOL_INFO[pair.a].colour };
  const [sc, tier] = key.split(':');
  if (!(SCHOOLS as readonly string[]).includes(sc) || (tier !== '1' && tier !== '2')) return null;
  const info = SCHOOL_INFO[sc as School];
  return { han: info.han, name: info.name, colour: info.colour };
}
