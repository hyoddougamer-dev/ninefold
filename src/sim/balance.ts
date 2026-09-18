/**
 * The one balance table. GDD §11 rule 4: every number that shapes the curve lives
 * here, the test suite prints them on every run, and changing one is never silent.
 *
 * Nothing in this file may import anything. It is data.
 */

/** Base gathering, qi per second, at realm 1 layer 0 with no channels. */
export const BASE_RATE = 1.0;

/**
 * Qi to leave each realm. Realm 9 is the ceiling in v1 and never completes.
 *
 * These were not chosen by feel. They are derived from a target arrival schedule
 * whose realm-to-realm ratio *shrinks* toward the top (1.9 → 1.4), because a constant
 * ratio always puts ~41% of a playthrough in the last gap no matter how large the
 * curve is — which is Finding 1. `schedule.test.ts` prints the resulting days and
 * fails if any single gap exceeds MAX_GAP_SHARE of the run.
 */
export const REALM_COST: readonly number[] = [
  46_000,      // 1 → 2
  106_000,     // 2 → 3
  228_000,     // 3 → 4
  463_000,     // 4 → 5
  886_000,     // 5 → 6
  1_589_000,   // 6 → 7
  2_754_000,   // 7 → 8
  4_617_000,   // 8 → 9
  Infinity,    // 9 has no exit
];

/** No single realm gap may hold more than this share of an idle-only run. */
export const MAX_GAP_SHARE = 0.35;

/** Layers per realm. A layer is a reading of the bar, not a second currency. */
export const LAYERS_PER_REALM = 9;

/** Each opened layer multiplies gathering by this, compounding. 1.02^81 = 4.97x. */
export const LAYER_RATE_BONUS = 1.02;

/** Haul decay: hunt n of a day returns 1 / (1 + (n-1)/K). Never zero, never refused. */
export const HAUL_DECAY_K = 5;

/** A hunt costs this many seconds of your own current rate. Half an hour. */
export const HUNT_COST_SECONDS = 1800;

/** The trail on every ground turns over this often, on a schedule read from the clock. */
export const TRAIL_PERIOD_SECONDS = 6 * 3600;

/** Twelve channels, each a compounding multiplier on gathering. 1.08^12 = 2.52x. */
export const CHANNEL_COUNT = 12;
export const CHANNEL_RATE_BONUS = 1.08;

/** Insight to open channel i (0-based). Escalating; all twelve is a months-long project. */
export const CHANNEL_COST: readonly number[] = [
  40, 110, 260, 560, 1_150, 2_300, 4_500, 8_700, 16_500, 31_000, 58_000, 108_000,
];

/** The five-step material ladder. Index is tier; the frame carries it, not the object. */
export const TIERS = ['common', 'spirit', 'mystic', 'earth', 'heaven'] as const;

/** A save older than this many seconds is still paid in full — absence is never lost. */
export const MAX_OFFLINE_SECONDS = Infinity;

/**
 * 二道 The two roads. Stillness is the x1.00 the whole cost table above is derived
 * against, so an idle-only player on Stillness hits the printed schedule exactly.
 * Motion pays for access to hunting out of the gathering rate.
 *
 * OPEN, like HAUL_DECAY_K: this number wants a real simulator, not a model.
 */
export const ROAD_STILLNESS_RATE = 1.0;
export const ROAD_MOTION_RATE = 0.85;

/**
 * 三道 The three paths. Each must be legible in silhouette AND in the curve, or it
 * is a stat block with a colour swap. `hunt.test.ts` prints all three advantage
 * tables so a path that collapses into another cannot ship unnoticed.
 */
export interface PathTuning {
  /** Decay constant for this path's haul curve. Higher = flatter = better when deep. */
  readonly k: number;
  /** Multiplier on the first `burstHunts` hauls of a day. */
  readonly burst: number;
  readonly burstHunts: number;
  /** Multiplier on the qi a hunt costs. */
  readonly costScale: number;
  /** How many realms early this path may enter a ground that is not yet open. */
  readonly reach: number;
}

export const PATH_TUNING: Readonly<Record<'sword' | 'blade' | 'bow', PathTuning>> = {
  // 劍 steady: the flattest haul curve, best at high hunt counts.
  sword: { k: 7, burst: 1.0, burstHunts: 0, costScale: 1.0, reach: 0 },
  // 刀 burst: the first three hunts of a day return more, then falls off hard.
  blade: { k: 3.5, burst: 1.35, burstHunts: 3, costScale: 1.0, reach: 0 },
  // 弓 reach: hunts the next ground one realm early, at a qi penalty.
  bow: { k: HAUL_DECAY_K, burst: 1.0, burstHunts: 0, costScale: 1.25, reach: 1 },
};
