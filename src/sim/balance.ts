/**
 * The balance table, and the only one. No number that shapes the curve lives outside
 * this file, and the test suite prints them all on every run — so changing one is
 * never silent.
 */

/** Qi per second in the first realm, with no multipliers at all. */
export const BASE_RATE = 1.0;

/** Nine layers per realm, nine realms: eighty-one rungs, and the ladder is continuous. */
export const LAYERS_PER_REALM = 9;
export const LAYERS = 81;

/** Each opened layer multiplies the rate. 1.02^81 = 4.97x at the top of the ladder. */
export const LAYER_BONUS = 1.02;

/**
 * 階 The ladder.
 *
 * Every one of the eighty-one layers has its own price, and the price grows from rung
 * to rung — fast at the bottom, more gently at the top. Three numbers describe the
 * whole mountain.
 *
 * The earlier version priced a realm as one lump and split it into nine equal layers.
 * That was the fault under everything else: inside a realm the rate multiplied while
 * the price stood still, so the first layer of a realm took hours and the ninth took
 * minutes, and every upgrade the realm allowed was affordable within the first hour.
 * The player bought everything at once and then waited days with nothing to press.
 *
 * A layer that costs more than the one below it is what spreads a realm out.
 */
export const LADDER_FIRST = 900;
/** How much dearer each layer is than the last, at the foot of the mountain… */
export const LADDER_GROWTH_FIRST = 1.4614;
/** …and at the summit. It never falls below the rate's own growth, so the climb never
 *  speeds up: every realm is longer than the one before it, all nine of them. */
export const LADDER_GROWTH_LAST = 1.20;

const LADDER: number[] = (() => {
  const out: number[] = [];
  let c = LADDER_FIRST;
  for (let n = 0; n < LAYERS + 1; n++) {
    out.push(c);
    c *= LADDER_GROWTH_FIRST * (LADDER_GROWTH_LAST / LADDER_GROWTH_FIRST) ** (n / (LAYERS - 1));
  }
  return out;
})();

/** What the nth layer costs, counting from zero across the whole climb. */
export function ladderAt(n: number): number {
  return LADDER[Math.max(0, Math.min(LAYERS, Math.round(n)))];
}

/**
 * The ladder read between its rungs, which is what upgrade prices ride.
 *
 * It interpolates in the log, because the ladder is geometric: halfway between two
 * rungs means the geometric mean, not the average.
 */
export function ladderBetween(x: number): number {
  const i = Math.max(0, Math.min(LAYERS - 1, Math.floor(x)));
  const f = Math.max(0, Math.min(1, x - i));
  return LADDER[i] ** (1 - f) * LADDER[i + 1] ** f;
}

/**
 * The ladder continued past its own top.
 *
 * The mountain ends at the eighty-first rung. The furnace does not, so its prices go on
 * climbing at the rate the summit was climbing at — one rule, no second table, and a
 * price that is never cheaper than the last layer of the game.
 */
export function ladderOpen(x: number): number {
  if (x <= LAYERS - 1) return ladderBetween(x);
  return LADDER[LAYERS] * LADDER_GROWTH_LAST ** (x - (LAYERS - 1));
}

/** What a whole realm costs, for anything that wants to speak in realms. */
export function realmCost(realm: number): number {
  const r = Math.max(1, Math.min(9, Math.round(realm)));
  let sum = 0;
  for (let i = 0; i < LAYERS_PER_REALM; i++) sum += ladderAt((r - 1) * LAYERS_PER_REALM + i);
  return sum;
}

/**
 * 修為上限 The cap: how many levels of one upgrade a realm allows.
 *
 * This is the wall the old economy had no version of. Without it a cultivator who
 * spends reaches the ninth realm in *three days* — measured, not guessed — because the
 * rate upgrades pay for the rate upgrades and nothing anywhere says stop. With it the
 * climb takes between 86 and 114 days whether the app is opened once a day or two
 * hundred times, which is what an idle game is supposed to promise.
 *
 * It also says something true: a body only holds so much. To hold more, raise the realm.
 */
export const LEVELS_PER_REALM = 6;

export function levelCap(realm: number): number {
  return Math.max(1, Math.min(9, Math.round(realm))) * LEVELS_PER_REALM;
}

/**
 * 材 What a fight pays.
 *
 * One curve for the whole material economy, so 無盡塔 the tower and 狩 free hunting can
 * never drift apart. A tower floor pays this once; a common beast pays HUNT_SHARE of
 * what the floor at its own depth would, and pays it every time it is killed.
 *
 * A twentieth is not an arbitrary fraction. Materials are the half of the furnace that
 * cannot be waited for, and if hunting paid a floor's worth there would be no reason to
 * climb; if it paid nothing, killing things would stop mattering the moment the tower
 * opened. Twenty kills to a floor keeps both worth doing.
 */
export const FLOOR_LOOT = 12;
export const FLOOR_LOOT_GROWTH = 1.2;
export const HUNT_SHARE = 1 / 20;

/**
 * 入定 Deep meditation: what being *there* is worth.
 *
 * Bruno asked for a difference between somebody who plays and somebody who only waits,
 * and also asked that being away never cost anything. Those two are opposite ends of the
 * same lever if you pull it the usual way — an idle game normally pays less while the
 * app is shut. So this pulls it the other way: the rate with the phone closed is the
 * rate the game promises, and sitting with it open **adds** on top.
 *
 * It ramps rather than switching, so it pays for staying rather than for opening the app
 * and closing it again — and it **ends**, which is the part that matters. A multiplier
 * that simply held would be farmed by leaving the phone face-up on a charger, and the
 * game would be trivialised by its owner without a single decision being made. A sitting
 * lasts FOCUS_HOLD and then it is over; to have another one, leave and come back.
 *
 * So a visit is worth about half an hour of extra gathering, however long the screen
 * stays on, and six visits a day is worth a few hours. The tower is what carries the
 * real difference between playing and waiting; this is what makes the minutes in front
 * of it feel like they counted.
 */
export const FOCUS_MAX = 3;
export const FOCUS_RAMP = 180;
export const FOCUS_HOLD = 900;

export function focusAt(secondsOpen: number): number {
  if (!(secondsOpen > 0)) return 1;
  if (secondsOpen >= FOCUS_HOLD) return 1;
  const t = Math.min(1, secondsOpen / FOCUS_RAMP);
  return 1 + (FOCUS_MAX - 1) * t;
}

/**
 * 吸 What a tower floor is worth in qi, in hours of your own gathering.
 *
 * The tower is the one place where fighting turns into *progress* rather than only into
 * power. A floor pays this once and never again — there is no floor to farm — so it can
 * be generous without ever becoming a loop that feeds itself.
 */
export const TOWER_QI_HOURS = 6;

/** No gap between realms may carry more than this share of the whole run. */
export const MAX_GAP = 0.35;

/** The agreed target: three months to the ninth realm, for a cultivator who spends. */
export const TARGET_DAYS = 90;
export const TOLERANCE_DAYS = 10;

/**
 * 渡劫 The tribulation, and what happens after the top.
 *
 * Realm 9 was a dead end: its layers never opened, so the bar read zero for ever and
 * the qi piled up with nowhere to go. An idle game may not end, and that is what ending
 * looks like.
 *
 * So the ninth realm keeps its name. 渡劫 means *crossing the tribulation*, and that is
 * now what you do once the ladder runs out: face the 龍 Dragon again at a power that
 * rises every time, and take a 雷印 thunder mark for crossing.
 *
 * **It is gated by power, not by qi.** Qi is effectively unlimited up there. What is not
 * unlimited is power, because every level of 劍訣 costs what a layer of the mountain
 * costs — so the real wait is the wait to afford the next few levels, which is exactly
 * the wait an idle game is made of.
 */

/**
 * What the next crossing asks for, as a share of the power you had at the last mark.
 *
 * It is solved against the furnace, not chosen — see TRIBULATION_GAIN below, which has
 * the arithmetic. Three pills a crossing is what it comes to.
 */
export const TRIBULATION_CHALLENGE = 1.89;

/** What the Dragon gains each time it comes back, before the anchor is taken into account. */
export const TRIBULATION_POWER = TRIBULATION_CHALLENGE;

/**
 * 立 Where the next Dragon plants its feet, as a multiple of the 力 the last one faced.
 *
 * 力 is not what fights. A stance bends every blow and three arts bend three more, and
 * `arts.test.ts` measures the lot at 1.82x — none of it in `power()`, because `power()`
 * is also the cultivator's health and doubling that would be a different game.
 *
 * The endgame was built without that in mind. The Dragon anchored to `power(s) / 1.2`,
 * which reads as *it never falls more than a fifth behind you*, and then the build
 * covered the difference for nothing: measured over twenty-four crossings the odds never
 * once fell below 90%, and 雷池 the pool was the only thing between a cultivator and the
 * next mark. Two days, tap, win, for ever. 煉體 the one pill that matters up there was
 * never worth brewing.
 *
 * The right footing is not 1.82 either, because a multiplier on blows is worth about its
 * *square root* in the power ratio — 力 is the sword and the shield at once, so losing a
 * third of it costs twice over. Played out, the band is narrow and measured:
 *
 *     1.20   odds 98% every crossing, two days, no decision
 *     1.35   two and three days, 63% and 98% alternating
 *     1.45   three days, 66-68%, six to eleven pills a crossing
 *     1.50   three days, 59-61%
 *     1.60   runs away: 6, 8, 11, 15, 22, 30, 43, 62 days
 *     1.70   a wall by the ninth mark, and never crossed again
 *
 * 1.45 is the middle of what holds. `tribulation.test.ts` plays forty crossings out and
 * prints them, so moving this is never quiet.
 */
export const TRIBULATION_FOOTING = 1.45;

/**
 * 雷池 How many days of gathering the thunder pool holds.
 *
 * The pool is the endgame's clock. See `tribulationPool` in state.ts for why an endgame
 * gated only by power has no clock at all.
 */
export const MARK_DAYS = 2;
/**
 * What one 雷印 mark is worth, to power and to qi alike.
 *
 * It is not a flavour number. The endgame is a race between the Dragon, which comes back
 * TRIBULATION_CHALLENGE times heavier every crossing, and the cultivator, who grows only
 * by what the furnace sells them. For the marks to keep a steady pace instead of slowing
 * into a wall, two things have to hold at once, where `s` is what a pill's price rises by
 * and `g` is what a pill is worth:
 *
 *     mark      = s^k          (income keeps up with the price of the next k pills)
 *     challenge = mark · (1+g)^k   (and those k pills close the gap the Dragon opened)
 *
 * With three pills a crossing, a price that rises 1.20x a pill and a pill worth 3%, that
 * gives a mark of 1.728x and a Dragon of 1.89x. The thirtieth crossing then takes about
 * as long as the third. Change any one of the four and this one has to be solved again —
 * `tribulation.test.ts` plays it out and prints the days.
 *
 * It is also why the marks are not larger. A bigger mark paces the same but inflates
 * faster, and an idle game that multiplies everything by five twice a day runs out of
 * double-precision inside a season.
 */
export const TRIBULATION_GAIN = 0.728;
/** No single mark may take longer than this, or the endgame is a wall, not a ladder. */
export const MAX_MARK_DAYS = 14;
