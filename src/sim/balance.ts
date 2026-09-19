/**
 * The balance table, and the only one. No number that shapes the curve lives outside
 * this file, and the test suite prints them all on every run — so changing one is
 * never silent.
 */

/** Qi per second in the first realm, with no multipliers at all. */
export const BASE_RATE = 1.0;

/** Nine layers per realm. A layer is not a currency: it is a reading of the bar. */
export const LAYERS_PER_REALM = 9;

/** Each opened layer multiplies the rate. 1.02^81 = 4.97x at the top of the ladder. */
export const LAYER_BONUS = 1.02;

/**
 * Qi to leave each realm. The ninth has no exit — it is the ceiling of v1.
 *
 * These numbers were not chosen by eye. They come from a target schedule whose realm-to
 * -realm ratio *shrinks* toward the top (1.9 down to 1.4). A constant ratio always
 * leaves ~41% of a playthrough in the last gap however large the curve is — and 41% of
 * three months is a whole month with nothing new in it, which is exactly how the
 * earlier version died.
 *
 * `curve.test.ts` prints the arrival days and fails if any gap exceeds MAX_GAP.
 */
export const REALM_COST: readonly number[] = [
  100_000,      // 1 -> 2
  228_000,      // 2 -> 3
  488_000,      // 3 -> 4
  993_000,      // 4 -> 5
  1_900_000,    // 5 -> 6
  3_404_000,    // 6 -> 7
  5_899_000,    // 7 -> 8
  9_869_000,    // 8 -> 9
  Infinity,     // 9, the ceiling
];

/** No gap between realms may carry more than this share of the whole run. */
export const MAX_GAP = 0.35;

/** The agreed target: three months to the ninth realm, opening the app once a day. */
export const TARGET_DAYS = 90;
export const TOLERANCE_DAYS = 8;
