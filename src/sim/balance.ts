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

/**
 * 渡劫 The tribulation, and what happens after the top.
 *
 * Realm 9 was a dead end: its layers never open, so the bar read zero for ever and the
 * qi piled up with nowhere to go. An idle game may not end, and that is what ending
 * looks like.
 *
 * So the ninth realm keeps its name. 渡劫 means *crossing the tribulation*, and that is
 * now what you do: face the 龍 Dragon again at a power that rises every time, and take a
 * 雷印 thunder mark for crossing.
 *
 * **It is gated by power, not by qi.** The first design put a qi bar in front of it and
 * the bar was meaningless: measured, a cultivator at the top gathers some seven hundred
 * million qi a day against a whole climb that cost twenty-three million, and the rate
 * compounds with every upgrade bought while any fixed ladder of costs does not. Qi is
 * effectively unlimited up there. What is *not* unlimited is power, because each level
 * of 劍訣 costs 1.16x the last — so the real wait is the wait to afford the next few
 * levels, which is exactly the wait an idle game is made of.
 */

/**
 * What the next crossing asks for, as a share of the power you had when you took the
 * last mark.
 *
 * It is anchored to *you*, not to a fixed ladder, and that is deliberate. A fixed ladder
 * cannot hold: measured, a cultivator standing at the top with nothing left to spend qi
 * on reaches a qi rate of 10^28 a day within a fortnight, because the rate upgrades feed
 * the qi that buys the rate upgrades and their cost curve is too shallow to stop it.
 * That is a real fault in the economy and it wants its own pass — see the note in
 * `tribulation.test.ts`. Anchoring the Dragon to the player's own power means the
 * endgame is correct either way: before the economy is fixed the marks come quickly,
 * and after it they pace themselves, with nothing here to change.
 */
export const TRIBULATION_CHALLENGE = 1.6;

/** What the Dragon gains each time it comes back, before the anchor is taken into account. */
export const TRIBULATION_POWER = 1.7;
/** What one 雷印 mark is worth, to power and to qi alike. */
export const TRIBULATION_GAIN = 0.1;
/** No single mark may take longer than this, or the endgame is a wall, not a ladder. */
export const MAX_MARK_DAYS = 14;
