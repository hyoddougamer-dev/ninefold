import type { Phase } from '../art/palette';

/** The five things a cultivator is made of. A build is how these are weighted. */
export type Stat = 'body' | 'qi' | 'spirit' | 'bone' | 'intent';

export const STAT_HAN: Record<Stat, string> = {
  body: '體', qi: '氣', spirit: '神', bone: '骨', intent: '意',
};

export const STAT_NAME: Record<Stat, string> = {
  body: 'Body', qi: 'Qi', spirit: 'Spirit', bone: 'Bone', intent: 'Intent',
};

/**
 * 九重山 Nine tiers, one mountain, and everyone climbs the same one.
 *
 * A band is not a level gate — it is a *tax*. Camping in a band applies its pressure
 * against the stat it demands, every hour you are away. Yield rises with altitude and
 * so does the pressure, which is what makes "how high do I camp before I close the app"
 * the one decision a session is made of.
 */
export interface Band {
  readonly n: number;
  readonly han: string;
  readonly name: string;
  readonly phase: Phase;
  /** The stat this altitude taxes. The mountain is the balance; no build holds all nine. */
  readonly demands: Stat | null;
  /** Qi yield multiplier for camping here. */
  readonly yield: number;
  /** Pressure per hour, checked against the demanded stat. */
  readonly pressure: number;
}

export const BANDS: readonly Band[] = [
  { n: 1, han: '山門',   name: 'The Mountain Gate', phase: 'wood',  demands: null,     yield: 1.0, pressure: 0 },
  { n: 2, han: '竹徑',   name: 'Bamboo Path',       phase: 'wood',  demands: 'body',   yield: 1.6, pressure: 4 },
  { n: 3, han: '丹爐',   name: 'Cinnabar Furnace',  phase: 'fire',  demands: 'qi',     yield: 2.6, pressure: 9 },
  { n: 4, han: '焚崖',   name: 'Burning Cliff',     phase: 'fire',  demands: 'intent', yield: 4.2, pressure: 18 },
  { n: 5, han: '石胎',   name: 'The Stone Womb',    phase: 'earth', demands: 'bone',   yield: 6.8, pressure: 34 },
  { n: 6, han: '骨階',   name: 'Stair of Bones',    phase: 'earth', demands: 'body',   yield: 11,  pressure: 62 },
  { n: 7, han: '霜鋒',   name: 'The Frost Edge',    phase: 'metal', demands: 'spirit', yield: 18,  pressure: 112 },
  { n: 8, han: '天壺',   name: "Heaven's Vessel",   phase: 'metal', demands: 'bone',   yield: 29,  pressure: 200 },
  { n: 9, han: '渡劫頂', name: 'Tribulation Peak',  phase: 'water', demands: 'intent', yield: 47,  pressure: 355 },
];
