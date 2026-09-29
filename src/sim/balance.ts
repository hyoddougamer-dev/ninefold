/**
 * The balance table, and the only one. No number that shapes the curve lives outside
 * this file, and the test suite prints them all on every run, so changing one is
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
 * to rung: fast at the bottom, more gently at the top. Three numbers describe the
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
/**
 * 囊 What your master left you.
 *
 * Measured by playing it: a new cultivator gathers 1 qi a second and the cheapest thing
 * on the screen costs 491, so for the first three minutes and forty-five seconds the
 * game says SPEND YOUR QI over three boxes that cannot be pressed. That is not a slow
 * opening, it is an opening with no decision in it, and an idle game's first minute is
 * the only one a player has not yet decided to give you.
 *
 * So the cultivator begins holding something. Not a head start: 800 qi is nothing
 * against a climb measured in quintillions, and it is gone by the first hour. What it
 * buys is the *question*, at second zero: the two cheaper upgrades are already lit, and
 * the bar is already nine tenths of the way up the first rung.
 *
 * That is the whole game in its first frame. Qi spent is qi that did not open a layer,
 * and qi banked is an upgrade not bought: the same trade the furnace and the thunder
 * pool ask about eighty rungs later. It is better met in the first minute, for 800 qi,
 * than in the ninth realm for a fortnight of gathering.
 *
 * It sits **below** LADDER_FIRST on purpose. A purse at or above the first rung would be
 * swallowed by the ladder on the first tick: the player would open the app, watch a
 * layer open by itself, and never see the choice. Below it, nothing moves until they
 * move it.
 */
export const OPENING_PURSE = 800;

export const LADDER_FIRST = 900;
/** How much dearer each layer is than the last, at the foot of the mountain… */
export const LADDER_GROWTH_FIRST = 1.4660;
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
/**
 * 圍 What one kill of a drive costs, in minutes of the hunter's own gathering.
 *
 * One minute, so a drive of fifty costs fifty minutes of qi and a drive of two hundred
 * three hours and twenty, in every realm. What a drive buys is the cultivator's own
 * time, so it is priced in time, the same unit 緣 the road already charges in.
 *
 * 誤 It used to be two per cent of the rung the hunter stood on, so that "a drive of
 * fifty costs a layer". A layer is not a fixed amount of time, though: measured on the
 * active cultivator, fifty kills cost two hours of qi in the first realm and twenty-five
 * to thirty in the seventh to the ninth, a whole day of gathering to save a few minutes
 * of tapping. Raziel, on the testers' Discord: *"the Drive option in hunt is very
 * expensive in Qi."* He was right.
 *
 * 量 Measured before changing it (tools/habits.ts, with drives turned on for the active
 * and the once-a-day cultivators): the price barely moves the length of the game. The
 * climb is paid in qi, a drive turns qi into 材 material, and material buys power that
 * only matters at a warden. Across a rung's price, one minute, half a minute and a
 * quarter, the active climb finished within a day or three of fifty-five either way and
 * the ninth realm arrived on day 44 to 46 every time. What a cheaper drive changes is
 * comfort: a tenth to a third more kills and power for whoever drives, and nothing at
 * all for whoever does not. A quarter of a minute was nearly free and put half again
 * as many kills on the board, so it stops at one.
 */
export const DRIVE_MINUTES = 1;

/**
 * 舊 What a kill of a beast from an earlier realm costs in a drive, as a share of the
 * full price. The same quarter an old beast pays (OLD_BEAST_FLOOR, below): a drive of
 * two hundred rats costs fifty minutes, because it earns a quarter of what two hundred
 * of the hunter's own beasts would. It is what makes finishing 圖鑑 the bestiary and a
 * 緣 fate bar something a drive can do instead of four hundred taps.
 */
export const DRIVE_OLD = 0.25;

/**
 * 舊 What an old beast pays, as a share of what this realm's weakest pays.
 *
 * Measured, before this existed: the frog of the first realm paid **2 材** and the frog
 * of the ninth paid **900,095**. So going back to finish a beast you had left behind
 * was a hundred fights for a rounding error, and 圖鑑 the bestiary, which asks for four
 * beasts *mastered* in a realm, four hundred kills: was a chore nobody would ever have
 * a reason to do twice.
 *
 * A beast now pays at least this share of what the weakest common of the *hunter's* own
 * realm pays. A quarter, so that hunting at the top of your reach is still plainly the
 * better way to earn: a current beast pays four times this, and the hard one of the
 * realm more, but going back is no longer charity. The old animal is easier and safer
 * and pays a quarter; the new one is a fight and pays full.
 *
 * It is a floor, never a cap: a beast whose own depth pays more than the floor keeps
 * its own number, so nothing in the existing table moves.
 */
export const OLD_BEAST_FLOOR = 0.25;

/**
 * 見 What the first sight of a beast is worth, as a share of the rung it lives beside.
 *
 * Bruno, three realms in: *"sinto que o combat nada faz nos primeiros realms."* He was
 * right about the feeling and right about the cause. A kill paid 材 material, and
 * material bought 妖丹 cores at three material each: real, permanent, and completely
 * invisible next to a qi bar that is the only number the screen ever shows moving. The
 * player's whole attention is on qi, and combat never touched it.
 *
 * So the *first* kill of every beast pays qi. Not every kill: the first, once, for ever,
 * and it goes in the same 見 Seen mark that already exists and until now only filled in
 * a page. Thirty-six beasts in the game, thirty-six payments in a lifetime, so it
 * cannot be farmed, it cannot compound, and it is not a rate. It is the game paying for
 * the one thing it most wants a new cultivator to do: go and look at something new.
 *
 * Half a rung at the first realm, and divided by the realm after that. See seenBounty.
 * Flat, it took twenty-two days off a hundred-and-twelve-day climb, which answers a
 * complaint nobody made. Shrinking, it is loud where the complaint was and silent where
 * it was not.
 */
export const SEEN_BOUNTY = 0.5;

/**
 * 守貢 What a warden pays in 材 material, as a share of what its depth is worth.
 *
 * This is the wall, and it is a wall made of arithmetic rather than of a locked door.
 *
 * A warden's power already counts 妖丹 cores: `referenceAt` says so, so from the third
 * realm a warden cannot be walked past by somebody who has never killed anything. That
 * was the design. It did not hold, for one reason: **the warden itself paid a full
 * harvest**, so nine warden kills funded the cores for the next nine warden kills and the
 * gate financed itself. Measured, a cultivator who never tapped a beast reached the
 * ninth realm with 39 core levels against the 40 the last warden reads for: through by a
 * hair, on a loop that never asked them to play.
 *
 * Paying nothing would shut the door outright, and a shut door is not what was asked
 * for: *"não um muro que torne impossivel mas que dificulte players 100% idle e premeie
 * jogadores mais ativos."* So the warden pays a **tribute**: a fraction, enough that the
 * cores keep creeping forward and the climb never stops, far too little to keep pace with
 * a gate that steepens by six core levels a realm.
 *
 * What that buys, in one sentence each:
 *
 *   - The cultivator who never fights still finishes. They simply take much longer,
 *     because every warden now costs them a longer stretch of gathering.
 *   - Three rats close the gap in a minute. The wall is never a dead end; it is a
 *     signpost pointing at 狩 Hunt, and it can be answered the moment it is read.
 *   - Nothing is taken away for being away. The qi rate is untouched, offline is
 *     untouched, and a fight lost still costs nothing. What changed is the *price of a
 *     warden*, paid in the one currency that has always come from playing.
 */
export const WARDEN_TRIBUTE = 0.18;

/**
 * 凝丹 Condensing a core from raw qi, when there is no beast to take one from.
 *
 * WARDEN_TRIBUTE on its own is a cliff and not a wall. Measured across the whole range,
 * the cultivator who never taps a beast finishes in 142 days at a tribute of 0.8 and
 * **never finishes at all** at 0.7. There is no setting between "unchanged" and
 * "stopped for ever", because a core's price climbs by a third each level while a
 * warden's tribute is flat. A lever with no middle cannot do what was asked of it:
 * *"não um muro que torne impossivel mas que dificulte."*
 *
 * The middle has to be built, not tuned. So 妖丹 gets a second price, in qi:
 *
 *   - **Kill something, and a core is cheap.** 材 material off a beast, as it always was.
 *   - **Kill nothing, and a core is a stretch of the climb.** CORE_QI_RUNGS rungs of the
 *     ladder you are standing on, for one level: qi that would otherwise have opened
 *     layers.
 *
 * Which turns the cliff into a slope with a dial on it. Nobody is ever stopped: the
 * cultivator who will not fight can always pay in the only currency they have. They
 * simply pay a great deal more of it, and the difference between them and somebody who
 * hunts is the difference Bruno asked to see.
 *
 * It cannot break the economic law, and that is the reason it is priced in qi rather
 * than handed out: this **spends** qi. Nothing here raises the rate.
 */
export const CORE_QI_RUNGS = 6;

/**
 * 拆 What breaking a piece of gear down pays, as a share of the first rung of **its own
 * realm**: never of the realm the cultivator is standing in.
 *
 * Bruno asked for the early qi flow to be helped along a little, and offered the shape
 * himself: *"Salvage gear por exemplo, multiple salvage ou solo salvage, por algum qi."*
 *
 * The hole it fills is older and worse than a thin qi flow. A full chest does not refuse
 * a drop. It throws the worst piece on the floor to make room, so from the second
 * realm onward the game has been **deleting gear and paying nothing for it**, one piece
 * per drop for the rest of the run. Salvage is what that deletion should always have
 * been.
 *
 * 舊 Priced off the item's realm is the first half of the safety. A second-realm 凡 pays
 * a second-realm sum for ever, which is a real number at the second realm and less than
 * a millionth of a layer at the ninth, so this can never become a way of farming weak
 * beasts for qi, which is the shape every uncapped faucet in this game has taken when it
 * was allowed to read the *hunter's* depth instead.
 *
 * 早 And the tilt is the second half, which the measurement forced. A flat share was
 * swept across its whole range and it did **nothing at all** for the cultivators it was
 * asked to help: `once a day` and `casual` did not move by a single day at any setting,
 * because four kills a day is under one drop a day. What did move was the hourly
 * cultivator, who melts thousands: 52 days to 38 at the largest setting, which shortens
 * the run for the one player who already runs out of game first.
 *
 * So the share falls as the realms rise, geometrically, exactly as LADDER_GROWTH does:
 * generous where a piece of junk is a real fraction of a layer and where the player has
 * nothing else to spend, mean where volume could turn it into a second income.
 *
 * 煉 It cannot be pumped against fusing at any point on that curve: three 凡 melt for 3
 * units, and fused they make one 靈 that melts for 1.6. 煉器 refining is not counted at
 * all, or 材 material would have a second door out into qi.
 */
export const SALVAGE_SHARE_FIRST = 0.30;
export const SALVAGE_SHARE_LAST = 0.04;

/** The share for a piece made in this realm. */
export function salvageShare(realm: number): number {
  const r = Math.max(1, Math.min(9, Math.round(realm)));
  return SALVAGE_SHARE_FIRST
    * (SALVAGE_SHARE_LAST / SALVAGE_SHARE_FIRST) ** ((r - 1) / 8);
}


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
 * climbing at the rate the summit was climbing at: one rule, no second table, and a
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
 * spends reaches the ninth realm in *three days*, measured, not guessed, because the
 * rate upgrades pay for the rate upgrades and nothing anywhere says stop. With it the
 * climb stays inside one band however the game is played: 45 days for somebody who opens
 * the app every waking hour against 168 for somebody who never taps a beast, and 95 for
 * one visit a day. That band is what an idle game is supposed to promise, and it is
 * printed by `players.test.ts` on every run rather than remembered here. This sentence
 * has been wrong twice already because the numbers moved underneath it.
 *
 * It also says something true: a body only holds so much. To hold more, raise the realm.
 */
export const LEVELS_PER_REALM = 6;

export function levelCap(realm: number): number {
  return Math.max(1, Math.min(9, Math.round(realm))) * LEVELS_PER_REALM;
}

/**
 * 丹 How much further 妖丹 cores may go than the other three, in realms' worth of levels.
 *
 * Bruno, in the second realm: *"dei max em todos os monstros disponíveis e vou a meio do
 * realm, não existe bem gasto nem incentivo para mais nada."* Measured, he was describing
 * something worse than he thought. 材 material is the one currency the hunting pays, and
 * the cap is the only thing that can buy it, so once the cap is reached the hunting
 * earns a coin with nothing behind it. Across the early realms, for a cultivator who
 * actually taps:
 *
 *     realm 2   材 dead 75% of the realm   earned 3360, spent 266
 *     realm 3   材 dead 95%                earned 47970, spent 1590
 *     realm 4   材 dead 98%                earned 585500, spent 9611
 *
 * Eight per cent of what the hunting pays was ever spendable. That is the hole, and it
 * is not a content hole: it is a cap set for a currency that is not the one it needed to
 * hold back.
 *
 * The other three upgrades are bought with qi, and qi arrives at a rate the game
 * controls, so their cap is what stops a spender finishing the climb in three days. 妖丹
 * is bought with material, and material is earned *by hand*: it cannot be waited for, it
 * never raises the qi rate, and its own price already climbs 35% a level against a gain
 * of 8%. The price is the wall. The cap was a second wall in front of it, and it was the
 * one that bound.
 *
 * Two realms' worth of room is enough to hand the job back to the price: measured, the
 * dead stretch goes to **zero in every realm and for every habit**, and beyond two the
 * curve stops moving at all because the material, not the cap, is what runs out. What it
 * costs is one to three days off the climb of somebody who hunts, and *nothing at all*
 * for somebody who does not: 169 days for the cultivator who never fights either way.
 * Which is the wall the right way round.
 *
 * 定 And it is **flat rather than a multiplier**, which is the whole of what the first
 * attempt got wrong. Doubling the cap fixed the second realm and broke the ninth. Above
 * the fifth realm material is no longer earned by hand at all: 塔 the tower pays it in
 * bulk, so a doubled cap there is not a wall handed back to the price, it is no wall.
 * The endgame's own test caught it in one run: walkover crossings went from 5 of 40 to
 * **14 of 40**, against a rule of at most 10.
 *
 * Flat, the same levels are a doubling where the hole is and a fraction of a cap where
 * the tower is filling your pockets, which is the shape the measurement asked for,
 * rather than the shape that was easiest to write.
 *
 * 廣 And two realms' worth was not enough. At two it cleared the first three realms and
 * left the rest of the climb dead again for somebody who really taps: 22% of the
 * fourth, 41% of the fifth, 70% of the seventh. Swept: **three realms' worth takes it
 * to zero in every realm of the game**, four and five change nothing more, and the
 * endgame does not move at all: 5 of 40 walkover crossings at two, at three, and at
 * four. Three is simply the smallest number that finishes the job.
 */
export const CORE_CAP_EXTRA = 3 * LEVELS_PER_REALM;

/**
 * 境外 How much room one heaven opens, in levels of every capped upgrade.
 *
 * A realm's worth, because a heaven *is* a realm: the ladder above the ladder should
 * open the same thing the ladder opened, or it is a different game wearing the same
 * clothes.
 *
 * 立 And the reason HEAVEN_STEP exists beside it. The first version of this handed the
 * room over and nothing else, and the endgame's own test caught it within the hour:
 * **thirty of forty crossings came in over ninety per cent**, against a rule of no more
 * than a quarter. The arithmetic is plain once it is written down: six levels of 劍訣
 * and six of 妖丹 are worth 5.2x power, they cost nothing a cultivator at the summit
 * would notice, and the Dragon had no answer to them.
 *
 * So a heaven raises *both* sides. What it opens for you, it also gives to the thing
 * standing at the end of it, exactly and by construction, which means the fight is as
 * contested after the change as before it, and the heaven is what it was meant to be:
 * a name, an animal, and room. Not a gift of power wearing a name.
 */
export const LEVELS_PER_HEAVEN = LEVELS_PER_REALM;

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
 * 材 The curve itself: what the floor at this depth pays, before any rounding. The tower,
 * the hunt, the old-beast floor, refining and the save's material ceiling all read it
 * here, so none of them can drift from the others.
 */
export function floorPay(floor: number): number {
  return FLOOR_LOOT * FLOOR_LOOT_GROWTH ** (floor - 1);
}

/**
 * 入定 Deep meditation: what being *there* is worth.
 *
 * Bruno asked for a difference between somebody who plays and somebody who only waits,
 * and also asked that being away never cost anything. Those two are opposite ends of the
 * same lever if you pull it the usual way: an idle game normally pays less while the
 * app is shut. So this pulls it the other way: the rate with the phone closed is the
 * rate the game promises, and sitting with it open **adds** on top.
 *
 * It ramps rather than switching, so it pays for staying rather than for opening the app
 * and closing it again, and it **ends**, which is the part that matters. A multiplier
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

export function focusAt(secondsOpen: number, deeper = 0): number {
  if (!(secondsOpen > 0)) return 1;
  if (secondsOpen >= FOCUS_HOLD) return 1;
  const t = Math.min(1, secondsOpen / FOCUS_RAMP);
  // 道 神 the Spirit branch deepens the sitting rather than the rate. It rides the same
  // ramp and the same ending, so everything that made 入定 safe still holds.
  return 1 + (FOCUS_MAX + Math.max(0, deeper) - 1) * t;
}

/**
 * 吸 What a tower floor is worth in qi, in hours of your own gathering.
 *
 * The tower is the one place where fighting turns into *progress* rather than only into
 * power. A floor pays this once and never again. There is no floor to farm, so it can
 * be generous without ever becoming a loop that feeds itself.
 */
export const TOWER_QI_HOURS = 6;

/**
 * 道 Why 神 the Spirit branch stopped selling the qi rate.
 *
 * The tree's two big branches were written with the same numbers: 15, 20, 30, 45, 80:
 * one on power and one on the rate. It reads as fair and it is not, and the reason is
 * the only thing in this file worth learning twice:
 *
 *   **A multiplier on power is linear. A multiplier on the rate divides the whole game.**
 *
 * Power buys fights, and the climb is not gated by fights; it is gated by qi. Doubling
 * power shortens nothing. Doubling the rate halves every layer, every realm and the whole
 * run at once: the run length is very nearly `days / rateMultiplier`. Measured on the
 * shared harness, with the tower and the furnace:
 *
 *     no tree       day 84.2
 *     劍 the sword  day 81.7   (力 x3.00)
 *     運 fortune    day 77.0
 *     神 the spirit day 30.0   (氣 x3.00)
 *
 * Nine nodes turned a three-month game into a one-month game, and the curve never saw it
 * because the curve was measured on a cultivator who never spent a 道 point.
 *
 * Scaling the percentages down does not fix it, and that is the part worth writing down:
 * at a fifth of their old size the branch still landed on day 57, and at a *seventh* it
 * still landed on 61. Any rate multiplier at all divides the run, so a rate branch and a
 * ninety-day promise cannot both be true. The tuning knob was the wrong tool.
 *
 * So 神 keeps one rate node, 吐納 Breathing, which is its identity and small enough to
 * cost three days. Its four big nodes now deepen 入定 instead, which is still gathering,
 * still the branch's own idea, and **cannot divide the clock, because it only pays while
 * you are looking at the phone.** An idle game spends almost all of its life shut.
 */
export const TREE_FOCUS_SHARE = 0.5;

/**
 * 頂 And the ceiling that would have caught it. No branch of the tree, taken to its end,
 * may multiply the qi rate by more than this, because the run is very nearly
 * `days / rateMultiplier` and there is no other number in the game that can say no.
 */
export const TREE_RATE_CEILING = 1.25;

/**
 * 頂 The ceiling on everything uncapped, together.
 *
 * The tree was half of it. 器 gear was the other half, and worse: with the drops picked
 * up and worn, measured on the same harness,
 *
 *     once a day   day 85   器 氣 +136%
 *     casual       day 63   器 氣 +181%
 *     active       day 38   器 氣 +240%
 *     every hour   day 20   器 氣 +216%
 *
 * against a promise of ninety days. The 氣 axis on gear is a qi-rate multiplier with no
 * cap at all, driven by how much you hunt, which is precisely the "playing more finishes
 * sooner" trap the whole economy was built to avoid. The bible's own claim that playing
 * every waking hour is worth about twice a casual run, not twenty times, was false: it
 * was worth three times, and climbing.
 *
 * The law was already written and nothing enforced it: *everything that multiplies
 * gathering is behind the realm cap; everything uncapped buys power, fortune or knowledge
 * instead.* So this is the enforcement. Gear and the tree, multiplied together, may not
 * move the qi rate past this, and `rate()` clamps them rather than trusting anybody to
 * remember.
 *
 * 雷印 the thunder marks are deliberately outside it. They are the endgame's own ladder,
 * they are capped by the pool's two days apiece, and they are meant to multiply.
 */
export const UNCAPPED_RATE_CEILING = 1.35;

/**
 * 緩 And it is approached, never hit.
 *
 * A hard clamp would be the easy version and it is the wrong one: a cultivator at the
 * ceiling wearing 器 氣 +279% has two hundred and forty wasted points, and every 氣 roll
 * they find afterwards does nothing at all. A stat that silently stops working is worse
 * than a stat that was never there.
 *
 * So the gain bends instead. `c·x / (c + x)` gives back nearly all of a small bonus,
 * gives back less and less of a large one, and can never reach the ceiling however much
 * is piled on. Every roll is always worth something and nothing is ever worth too much.
 */
export function uncappedRate(raw: number): number {
  const c = UNCAPPED_RATE_CEILING - 1;
  const x = Math.max(0, raw - 1);
  return 1 + (c * x) / (c + x);
}

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
 * costs, so the real wait is the wait to afford the next few levels, which is exactly
 * the wait an idle game is made of.
 */

/**
 * What the next crossing asks for, as a share of the power you had at the last mark.
 *
 * It is solved against the furnace, not chosen. See TRIBULATION_GAIN below, which has
 * the arithmetic. Three pills a crossing is what it comes to.
 */
export const TRIBULATION_CHALLENGE = 1.89;

/** What the Dragon gains each time it comes back, before the anchor is taken into account. */
export const TRIBULATION_POWER = TRIBULATION_CHALLENGE;

/**
 * 立 Where the next Dragon plants its feet: this many times the Dragon the cultivator
 * would meet at even odds, read off the fight at the moment of the crossing.
 *
 * It used to be a multiple of 力, and 力 is not what fights. A stance bends every blow,
 * three arts bend three more, and a class, a fusion or the next system anybody adds
 * bends them again, none of it in `power()`. So the footing was a guess at the build,
 * re-measured every time the build changed: 1.2, then 1.45, 1.59, 1.58 and 1.585, each
 * one right for the harness of its day and wrong for any cultivator built differently.
 * `evenDragon` in combat.ts reads the whole fight instead, so a build is cancelled out of
 * both sides and the only question the next Dragon asks is the honest one: what have you
 * added since last time?
 *
 * 穩 And the old footing sat on a knife edge. 1.585 held eighty crossings with a longest
 * mark of 14 days, 1.59 ran them to 45, and 1.02 times the even Dragon walled by the
 * fiftieth. That was not the footing's fault: see PILL_AHEAD, which is what made it hold.
 * Measured with it, on the active cultivator who fuses:
 *
 *     1.00   3 days a mark for ever, but 12 of 40 walkovers
 *     1.03   5 to 7 days, 4 walkovers
 *     1.05   7 to 8 days, 3 walkovers, and still 7 to 8 at the 160th crossing
 *     1.07   8 days, 3 walkovers
 *     1.20   12 to 13 days, 2 walkovers
 *
 * A step either side moves the pace by a day and walls nothing, which is the point.
 */
export const TRIBULATION_FOOTING = 1.05;

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
 * as long as the third. Change any one of the four and this one has to be solved again:
 * `tribulation.test.ts` plays it out and prints the days.
 *
 * It is also why the marks are not larger. A bigger mark paces the same but inflates
 * faster, and an idle game that multiplies everything by five twice a day runs out of
 * double-precision inside a season.
 */
export const TRIBULATION_GAIN = 0.728;
/** No single mark may take longer than this, or the endgame is a wall, not a ladder. */
export const MAX_MARK_DAYS = 14;

/**
 * 丹 The pills a mark is paced for: the k in TRIBULATION_GAIN's arithmetic above.
 */
export const PILL_PACE = 3;

/**
 * 穩 How far ahead of that pace a pill's price keeps rising. Past it, the next pill costs
 * what the last one did.
 *
 * This is the one number that makes the endgame hold, and it was missing. The arithmetic
 * above balances on a point: three pills a crossing, bought with what a mark adds to the
 * qi rate. A cultivator one pill short each time buys four, the fourth raises every
 * price after it, their income does not follow, and the shortfall compounds into a wall.
 * It was measured: a Dragon 2% heavier than even walled the fiftieth crossing, and one
 * 10% heavier walled the tenth. No footing can fix that, because every player is short
 * by a different amount.
 *
 * With the price held once a cultivator is this far behind, being behind costs days in
 * a straight line instead of a curve: every short crossing asks for a few more pills at
 * the same price, and the pills bought stay bought. Measured on the same run:
 *
 *     20   4 days a mark, flat to the eightieth
 *     25   7 to 8 days, flat to the hundred and sixtieth
 *     30   15 to 18 days: past a fortnight
 *
 * It only ever lowers a price, never raises one, and it holds for the qi and the 材
 * material halves alike.
 */
export const PILL_AHEAD = 25;

/**
 * 期 The week, and what it moves.
 *
 * Measured, this repository's own 忙 harness said the plainest thing about a long idle
 * game: everything in it arrives once. Twenty systems, forty-odd arrivals, and after the
 * last one the game is the same game every day for ever. The bestiary is read, the tree
 * is spent, the vault walks the same rooms. Nothing is *different on Tuesday*.
 *
 * So one mark rides the calendar. It is derived from the week alone, with the save as
 * the only other input, which means there is no server to run, no clock to cheat (the
 * week is read off the same validated instant everything else is), and nothing to
 * remember between weeks except the single bounty below.
 *
 * 律 What it is allowed to be. It may never raise the qi rate, because nothing uncapped
 * may, and it is uncapped by construction: there is always another week. So every one of
 * the three is a multiplier on something already capped by hand. The quarry pays 材
 * material, which only falls off a beast somebody went and killed. The season pays a bed,
 * and there are three beds and they are planted with material. The blessed room is one
 * room of one run, and the door only opens once a day.
 *
 * A cultivator who never opens the app gets nothing from any of the three, in any week,
 * for ever. That is the point of it.
 */

/** 獸 What the week's quarry pays in 材 material, against its own usual number. */
export const QUARRY_LOOT = 2;

/**
 * 首 What the first kill of the week's quarry pays in qi, as a share of the rung beside
 * it. It rides the same ladder 見 the first-sight bounty does, for the same reason: a
 * share of a rung means something to somebody watching a bar, and a flat number does not.
 *
 * Once a week, so fifty-two of them a year against the thirty-six 見 pays in a lifetime.
 * It is a fifth of what a first sight is worth for that reason.
 */
export const QUARRY_BOUNTY = 0.1;

/**
 * 緣 The bond with one beast: how many wins fill it, and what a full one promises.
 *
 * Bruno chose it from the drop proposal: *"não 100% rng"*. Every win over a beast
 * fills its bar by one. When it is full, that win leaves a piece for certain, and at
 * least one rank above the best that beast has ever given, starting from 玄 Mystic.
 * The bar then starts again. Bad luck has an end, and the hunt row shows how far off.
 *
 * A common beast's promise stops at 地 Earth; a warden's reaches 天 Heaven, so the
 * rarest rank still comes from the fights that bar a realm.
 */
export const FATE_FULL = 10;
/** Index into RARITIES: the least a full bar promises, and the most a common's can. */
export const FATE_FLOOR = 2;
export const FATE_TOP_COMMON = 3;
export const FATE_TOP_WARDEN = 4;

/**
 * 職 The classes: how many pieces wake a school, and what each one does.
 *
 * Three pieces of one school wake it, five bring it to its full. Two schools at three
 * each are one of the fifteen named classes, which pays both schools' first step and a perk
 * of its own. Every perk below touches a system of its own, so no two classes are the
 * same class under different words, and none of them may raise the qi rate: that is the
 * economic law, so the Qi school pays in cheaper upgrades rather than in more qi.
 *
 * `classes.test.ts` plays every class through the climb and the long haul and prints
 * what each one is worth, so moving any of these is never quiet.
 */
export const SCHOOL_WAKES = 3;
export const SCHOOL_FULL = 5;

/** 劍 Power, at the first step and at the full. */
export const SWORD_POWER: readonly [number, number] = [1.10, 1.20];
/** 氣 What the four 修 upgrades cost. */
export const QI_UPGRADES: readonly [number, number] = [0.92, 0.85];
/** 運 How many wins fill a bond. The line amplification is CLASS_AMP. */
export const FORTUNE_BOND: readonly [number, number] = [9, 8];
/** 器 What a refine level costs. */
export const ARTIFICER_REFINE: readonly [number, number] = [0.88, 0.78];
/** 法 What an art strikes for, when it fires in the sequence. */
export const ARTS_STRIKE: readonly [number, number] = [1.15, 1.30];
/** 運 體 器 Their own lines count this much more on the body. */
export const CLASS_AMP: readonly [number, number] = [1.5, 2];

/** 合 The first ten pair perks. The five the sixth school makes are below them. */
export const PAIR_TOWER = 0.90;        // 劍仙 the tower's floors count this much of themselves
export const PAIR_DRIVE = 0.75;        // 俠客 what a drive costs
export const PAIR_WARDEN = 0.88;       // 武神 a warden counts this much of itself
export const PAIR_MATERIAL = 1.15;     // 鑄劍師 材 from kills and floors
export const PAIR_SPRING = 1.5;        // 尋仙 qi from a spring in the secret realm
export const PAIR_BOUNTY = 1.5;        // 金剛 見 first sights and 期 the week's quarry
export const PAIR_PILLS = 0.85;        // 丹師 what a pill costs
export const PAIR_DROP = 0.08;         // 獵王 added to a beast's chance of leaving a piece
export const PAIR_MELT = 1.3;          // 寶匠 qi from melting
export const PAIR_CHEST = 10;          // 甲匠 places in the chest
/** 法 The five pairs the sixth school makes. */
export const PAIR_FORM = 1;            // 劍聖 the lowest your form can roll, against its middle
export const PAIR_TOWER_QI = 1.25;     // 天師 qi from a tower floor
export const PAIR_MEET = 1.5;          // 卜師 what a meeting on the road pays
export const PAIR_MEND = 0.04;         // 羅漢 health recovered every round, of the whole
export const PAIR_HERBS = 1.3;         // 陣師 what a ripe bed pays

/**
 * 運拾破煉 The four lines that did nothing.
 *
 * Found while drawing the classes: of the seven lines a piece can carry, only 力, 氣
 * and 藏 were ever read. 運 rarer drops, 拾 drop chance, 破 beasts weaker and 煉 fusion
 * quality were printed on every sheet and read by nothing. They are read now, for
 * everyone, and each one bends, because refining multiplies every line by up to seventy
 * times at the top and a straight line would hand out a Heaven piece a kill.
 *
 *   運 luck      the rare end of the drop table, times 1 + LUCK_BEND · ln(1 + L)
 *   拾 find      a beast's chance of a drop, plus FIND_TOP · (1 − 1 / (1 + F))
 *   破 sunder    a beast counts 1 / (1 + SUNDER_BEND · ln(1 + S)) of itself
 *   煉 refine    fusion keeps 1 + FUSE_BEND · ln(1 + R) of its quality
 *
 * with each line's total as a fraction (+46.9% is 0.469). 破 has no hold on the Dragon
 * above the ninth realm, the same rule 破甲 on the tree keeps: it is lightning, not a
 * beast.
 */
export const LUCK_BEND = 0.5;
export const FIND_TOP = 0.25;
export const SUNDER_BEND = 0.15;
export const FUSE_BEND = 0.25;
/**
 * 法 The eighth line. An art that fires strikes 1 + ART_BEND · ln(1 + A) harder, and
 * 龜息 heals that much more. It only ever touches the round an art is on, so an empty
 * sequence gets nothing from it, and it never reaches power() or the qi rate.
 */
export const ART_BEND = 0.4;

/**
 * 融 The most a fused piece may be worth against its own rank's base.
 *
 * A fusion keeps the average quality of the three it ate, times what 巧手 and the 煉
 * line add. Fused again, it kept that quality *and* multiplied it again: four fusions
 * from 凡 to 天 with a good fusion line came out about seventy times a Heaven piece.
 * Found by 驗 the audit, as a number no drop can make. A fused piece is capped here, which
 * is still well above anything a drop can roll (1 + VARIANCE).
 */
export const FUSE_TOP = 1.5;

/** 草 What a bed of the herb in season pays, against its own usual harvest. */
export const SEASON_HARVEST = 1.5;

/** 室 What the blessed room of 秘境 the vault pays, against what that door usually gives. */
export const BLESSED_ROOM = 2;

/**
 * 集 The numbers below lived beside the systems that read them until an audit gathered
 * them here. Each keeps the comment it had where it used to live, and the system's own
 * file says how it uses them.
 */

/**
 * 修 The four upgrades, as numbers. `share` is what one level costs, as a share of the
 * rung it rides (妖丹 Beast Cores read it in material); `gain` is what one level multiplies
 * by. See UPGRADE_INFO in state.ts, which reads these and says them out loud.
 */
export const UPGRADE_NUMBERS = {
  technique: { share: 0.7, gain: 1.22 },   // 劍訣 power
  method: { share: 1.0, gain: 1.20 },      // 功法 qi per second
  pills: { share: 0.45, gain: 1.14 },      // 吐納 qi per second
  cores: { share: 3, gain: 1.08 },         // 妖丹 power, priced in material
} as const;

/** What 妖丹 costs in materials at a given level. Materials are earned by hand, not by
 *  waiting, so this is the one price that does not ride the mountain. */
export const CORE_STEP = 1.35;

/**
 * 基準 How many levels below a realm's cap the reference cultivator stands.
 *
 * Beasts have no curve of their own: they are tuned against *this*. The reference is a
 * cultivator standing at the realm's ceiling with 劍訣 *and* 妖丹 near the levels the
 * realm allows, not the one who spent nothing, not the one who optimised everything,
 * but the one in the middle. Gear, the tree, the arts and the furnace are the margin on
 * top, and they are what turns a coin flip into a win.
 *
 * The first version gave beasts an exponent of their own (1.42 per layer) and they ran
 * away from any possible player: at realm 4 the warden was worth twenty well-invested
 * cultivators. The second derived them from a share of all the qi ever earned, which
 * stopped being meaningful the moment upgrade prices started riding the mountain.
 * Deriving from the *cap* is the honest one: the cap is the ceiling on what a
 * cultivator of that realm can possibly hold, so the beasts follow it on their own and
 * nothing here needs touching when the curve moves.
 *
 * It sits a fixed *two levels* below the cap rather than a share of it. A share widens
 * as the cap does: at the ninth realm fifteen per cent of the cap is eight levels of
 * 劍訣, nearly five times the power, so the same warden would read as hopeless at 85%
 * of the cap and trivial at 100%. Two levels is two levels at every realm, so the last
 * stretch before a warden feels the same all the way up the mountain.
 *
 * **It counts 妖丹 cores, and that is the wall between playing and waiting.** Cores are
 * not bought with qi. They are bought with 材 material, and material only falls off
 * things you kill. So a warden cannot be walked past by somebody who has never opened
 * 狩 Hunt, however long they have been gathering.
 *
 * The wall arrives late on purpose. The first two realms ask for no cores at all, so a
 * new cultivator meets the 妖狐 and the 石猿 with qi alone and learns what a warden is
 * before learning that a warden is not enough. From the third realm the requirement
 * grows a realm at a time, measured, somebody who never fights anything stalls in the
 * fourth realm and stays there for ever.
 *
 * Nothing is taken from that cultivator for being away. The qi still gathers at full
 * rate with the phone closed, every second of it, because that is the promise the game
 * makes. What they are short of is not qi. It is a reason to have been there.
 */
export const REFERENCE_BELOW = 2;

/** How many realms are fought through before the wardens start asking for 妖丹 cores. */
export const CORES_FREE_REALMS = 2;

/**
 * The share of the reference each step of a realm occupies. The three commons of a
 * realm have to be an easy one, a middling one and a hard one: the first version
 * indexed by *realm* rather than by beast, and all three came out with the same power
 * and the same odds, which turns three distinct animals into three identical buttons.
 */
export const COMMON_STEPS: readonly number[] = [0.45, 0.62, 0.84];

/**
 * 初 And the first realm is spaced against the player, not against its own summit.
 *
 * Every realm is entered weak, measured, a cultivator arrives at 25%, 23%, 16%, 11%,
 * 7% of the realm they are entering. The first is 5%, and it is the same pattern, not an
 * exception. What makes it different is that it is the only realm with **nothing else in
 * it**: from the second there is gear to find, a stance to pick, a record filling, a
 * tower, a tree. In the first there is a bar and three boxes, and if the beasts are out
 * of reach as well then there is nothing at all.
 *
 * At the standard spacing the first fight a player can win arrives **two hours and six
 * minutes** in, and the true odds before it are not small. They are 0.0%, flat, for the
 * whole of it. Combat in the first realm was a step, not a ramp: nothing, nothing,
 * nothing, then 66% and trivial forty minutes later.
 *
 * So the first realm's three commons are placed where the player actually stands while
 * climbing it. Measured, at this spacing:
 *
 *     山鼠 the rat     力  0.7    98% from the first second
 *     野犬 the hound   力  4.0    at about 45 minutes
 *     澤蛙 the frog    力 14.0    at 3.5 hours
 *     妖狐 the fox     力 29.7    at the cap, as every warden is
 *
 * 初 The rat used to stand at 2.4, winnable at twelve minutes. Bruno, having watched
 * testers start: *"não conseguem fazer nada até terem power suficiente para os
 * primeiros monstros."* Twelve minutes is a long time to be told no by the only button
 * that is not a shop. A fresh cultivator stands at 力 1, so the rat is a won fight from
 * the first tap and its first sight pays the qi the first purchase is made with.
 *
 * 久 The frog is not moved, and that was measured rather than chosen. The endgame is
 * sensitive to it in steps: at 0.35 of the reference the eightieth crossing's longest
 * mark stretched from 10 days to 14, and at 0.40 to 0.62 to 27. At 0.70 it is exactly
 * what it was. The rat and the hound move nothing past the first realm.
 */
export const FIRST_STEPS: readonly number[] = [0.035, 0.20, 0.70];

/** The most rounds a fight may run, so a theoretical draw can never hang anything. */
export const ROUND_CAP = 24;

/**
 * 氣運 How the qi runs today: one roll for each side, before a blow is thrown.
 *
 * Blow-by-blow noise averages away. Ten blows of ±22% come out within 4% of the mean,
 * so whoever had more power won every single time and a fight was decided before it
 * started. The screen hid that behind a sigmoid over the power ratio, which cheerfully
 * promised 34% on fights the player would lose a hundred times out of a hundred.
 *
 * One roll per fight does not average away. It is what makes an underdog worth trying
 * and a favourite worth checking, and it is what the odds on screen are now counting.
 */
export const FORM = 0.2;

/** 血 A fighter's health, as a multiple of its power. The arena's bars read the same number. */
export const HEALTH_PER_POWER = 10;

/** 擊 Every blow rolls between BLOW_LOW and BLOW_LOW + BLOW_SPREAD of itself. */
export const BLOW_LOW = 0.82;
export const BLOW_SPREAD = 0.46;

/** 勢 What each stance does to a round, by the numbers. data/arts.ts says them out loud. */
export const STANCE_NUMBERS = {
  swiftStrikes: 2,       // 疾 strikes a round, and times the sequence runs
  swiftShare: 0.6,       // 疾 what each of those strikes is worth
  guardDealt: 0.75,      // 守 what your blows are worth
  guardTaken: 0.6,       // 守 what the beast's blows are worth
  fierceDealt: 1.5,      // 兇 what your blows are worth
  fierceTaken: 1.5,      // 兇 what the beast's blows are worth
  entangle: 0.92,        // 纏 what the beast keeps of its power, every round
  endure: 0.06,          // 續 health recovered every round, of the whole
  recklessMiss: 0.5,     // 險 the chance a blow does nothing
  recklessHit: 3,        // 險 what the rest are worth
} as const;

/** 訣 What each art does on the round it fires, by the numbers. data/arts.ts says them out loud. */
export const ART_NUMBERS = {
  ape: 1.6,              // 猿臂 the strike, multiplied
  crane: 0.9,            // 鶴唳 what the beast keeps of its power, for the rest of the fight
  tiger: 2,              // 虎嘯 the strike, multiplied: it lands twice
  turtle: 0.12,          // 龜息 health recovered, of the whole
  puppet: 0.25,          // 傀儡 the share of last round's blow dealt back
  wolf: 0.12,            // 狼噬 added to the strike for every round already fought
  serpentBelow: 0.5,     // 蛟騰 the health below which it wakes
  serpent: 3,            // 蛟騰 the strike, multiplied, once awake
  dragon: 1.35,          // 龍威 the strike, multiplied, and the beast's blow misses
} as const;

/**
 * 算 The floor and the ceiling on the odds a screen quotes. "0%" on a button invites
 * nobody to press it, and a run of good seeds should not read as a certainty.
 */
export const ODDS_FLOOR = 0.02;
export const ODDS_CEILING = 0.98;

/**
 * 深 Where a realm's commons stand on the material curve: the first at this many layers
 * into the realm, and each one after it this many further.
 */
export const COMMON_DEPTH_FIRST = 3;
export const COMMON_DEPTH_STEP = 2;

/** 守 What a warden's kill is worth against a common's HUNT_SHARE, at its own depth. */
export const WARDEN_LOOT = 4;

/** 層 Where in a realm its three commons walk out. See Beast.layer for the measurement. */
export const COMMON_LAYERS = [0, 4, 7] as const;

/**
 * 落 What a dead beast leaves behind: the chance a common drops anything at all.
 */
export const BASE_DROP_CHANCE = 0.18;

/** 守 How much harder a warden tilts the rarity weights toward the rare end. */
export const WARDEN_RARITY_TILT = 2.6;

/**
 * The rarity weights, before the tilt: `base + per · realm`, and 凡 Common *falls* by
 * `fall` a realm to its `floor`. They tilt upward with the realm, which is what makes the
 * nine warden fights worth looking forward to.
 */
export const RARITY_WEIGHT = {
  common: { base: 60, fall: 5, floor: 4 },
  spirit: { base: 25, per: 1 },
  mystic: { base: 10, per: 2 },
  earth: { base: 3, per: 1.2 },
  heaven: { base: 0.6, per: 0.45 },
} as const;

/** How much an item's rolled percentage may swing either side of its base. */
export const VARIANCE = 0.15;

/** A secondary line is worth this much of what the same rank's primary would be. */
export const SECONDARY_SHARE = 0.6;

/** 階 What each rank multiplies an item's percentage by. */
export const RARITY_MULT = {
  common: 1, spirit: 1.6, mystic: 2.5, earth: 4, heaven: 6.5,
} as const;

/** How many rolls a rank carries: one primary, plus these many secondaries. */
export const SECONDARIES: Readonly<Record<'common' | 'spirit' | 'mystic' | 'earth' | 'heaven', number>> = {
  common: 0, spirit: 1, mystic: 2, earth: 3, heaven: 4,
};

/**
 * Gear grants a **percentage**, never a flat amount.
 *
 * The first cut handed out flat numbers, and flat numbers die: by the fifth realm a
 * cultivator's power is in the hundreds of thousands, so a sword worth +4,200 is worth
 * nothing. A percentage composes with the ladder and with every upgrade, so a good
 * weapon found at realm 3 is still a good weapon at realm 9.
 */
export const BASE_PERCENT = 4;
export const PERCENT_PER_REALM = 1;

/** The three steps of every set, and how much harder each one hits. */
export const SET_STEPS: readonly number[] = [2, 4, 6];
export const SET_WEIGHT: readonly number[] = [1, 2, 4];

/**
 * 層 Where in its realm a lineage starts falling.
 *
 * 隙 The same argument the commons and 勢 the stance make: a realm used to hand over its
 * whole loot table in the first minute of twelve days. It also put a power spike exactly
 * where the climb means you to be weak, since a realm is entered at about a fifth of what
 * it will ask for. 龍骸 Dragonwake starts dropping halfway up the eighth realm now, and a
 * lineage starting to drop is an event rather than a footnote.
 *
 * 舊 Only the newest lineage waits. Everything below it falls from the first second, and a
 * beast of a realm already passed drops its own realm's gear exactly as it always did.
 */
export const LINEAGE_LAYER = 5;

/** 藏 Places in the chest before anything widens it. */
export const CHEST_LIMIT = 40;
/** 煉 How many of one piece at one rank fuse into one of the rank above. */
export const FUSE_COUNT = 3;

/**
 * 層 Where in its realm a stance walks out.
 *
 * 隙 Measured, a realm hands over everything it has in its first minute: the name, the
 * first common, the warden's art, the stance and a whole lineage of gear, and then runs
 * for twelve days with one beast every five. The commons were already spread across
 * layers 0, 4 and 7 for exactly this reason; the stance was not. It stands at the
 * second layer now, which is the first gap in a realm with nothing else in it.
 *
 * 取 Nothing is taken away by this. A stance held is held for ever, and the realm below
 * you gave you its own. What moves is when the *new* one arrives.
 */
export const STANCE_LAYER = 2;

/** How many arts fit in a sequence. Three is enough to order and few enough to hold. */
export const SEQUENCE_SLOTS = 3;

/**
 * 丹爐 The Furnace.
 *
 * A pill's price rides the mountain, exactly as an upgrade's does: a pill costs half of
 * what a layer of the climb costs, and past the summit it goes on rising at the rate the
 * summit was rising at.
 *
 * So it is never cheap and never a wall, and a cultivator at the top pays a layer of the
 * mountain for two, which is the only reason the endgame has a pace at all.
 */
export const PILL_SHARE = 0.5;

/**
 * 爐底 How many realms below the furnace's own the first pill is priced: one to count the
 * realms from zero, and one to stand **one realm behind** the cultivator. See PILL_RUNG in
 * furnace.ts for why one realm and not none or two.
 */
export const PILL_REALMS_BELOW = 2;

/** What the first pill of a line costs in materials, and what each one after adds. */
export const PILL_MATERIALS = 14;
/** One pill answers one tower floor, so its material price grows like a floor's pay. */
export const PILL_MATERIAL_STEP = LADDER_GROWTH_LAST;

/** What one pill of each line is worth. */
export const PILL_POWER = 0.03;       // 煉體 +3% power, multiplied
export const PILL_BANE = 0.985;       // 破煞 beasts at 98.5% per pill…
export const PILL_BANE_FLOOR = 0.4;   // …and never below this share of their power
export const PILL_FORTUNE = 0.04;     // 聚寶 +4% weight on the rare end of the table

/**
 * 煉 What one refine level adds to every line on a piece.
 */
export const REFINE_PER_LEVEL = 0.04;

/**
 * How many floors of the tower's own pay curve a refine level costs.
 *
 * The price rides the material curve exactly as an upgrade rides the mountain, so it
 * stays meaningful at every realm instead of being unaffordable at the first and free at
 * the ninth. Four floors a level puts a normal run at about level twenty on a piece and
 * a hard-tapping one at about thirty, which is the difference farming should make.
 */
export const REFINE_DEPTH = 4;

/** 無盡塔 Floors per realm, so floor 9 is the first realm's warden and floor 81 is the Dragon. */
export const FLOORS_PER_REALM = LAYERS_PER_REALM;

/** 塔印 What each tower seal adds to everything that drops materials. */
export const SEAL_LOOT = 0.15;

/** 錄 Kills that earn each mark: 見 Seen, 熟 Known, 通 Mastered. */
export const MARKS: readonly number[] = [1, 10, 100];
/** What one 熟 mark adds to everything that drops material. */
export const KNOWN_MATERIAL = 0.02;
/** What one 通 mark adds to power. */
export const MASTERED_POWER = 0.02;

/** 道 One point for every this many layers opened, and this many for every warden. */
export const LAYERS_PER_POINT = 3;
export const POINTS_PER_WARDEN = 2;
/**
 * 圖鑑 And what a realm's whole bestiary is worth, from the sixth realm.
 *
 * Four hundred fights for one point. It is deliberately the slowest 道 in the game and
 * the only one that cannot be climbed toward: the ladder pays the other two just for
 * going up, and this one is paid only for going back.
 */
export const POINTS_PER_BESTIARY = 1;

/**
 * 悟道 The least a refine level and a pill's material may cost, however many discount
 * cards are taken. Refining is the one material sink with no ceiling, and the furnace is
 * what the endgame is built on: a free one of either would be a different game.
 */
export const REFINE_DISCOUNT_FLOOR = 0.1;
export const PILL_DISCOUNT_FLOOR = 0.3;

/** 圍 The drive sizes offered. One is always free and always there; these are the bought ones. */
export const DRIVE_SIZES = [10, 50, 200] as const;

/** 緣 How long after one meeting before the next can arrive, in seconds. */
export const MEET_GAP = 3 * 3600;

/**
 * 心 How far the heart has to lean before the road notices. Every answer leans kind,
 * hard or neither, and past this many either way a cultivator walks a path: the monk
 * only finds the kind, the demonic cultivator only the hard. Three is two or three
 * meetings answered the same way, which is a habit rather than an accident.
 */
export const HEART_PATH = 3;

/**
 * 緣 The five things a meeting can leave that stay. Each is given once in a lifetime,
 * by one meeting, so every one of them is finite, and none of them touches the qi rate.
 * They are kept small on purpose: a boon is a keepsake that helps, not a build.
 */
/** 鴉 Two crows: added to a beast's chance of leaving a piece. */
export const BOON_FAMILIAR = 0.03;
/** 劍魂 A sword soul: power, multiplied. */
export const BOON_SWORDSOUL = 1.03;
/** 商印 The merchant's token: what a drive costs, multiplied. */
export const BOON_TOKEN = 0.9;
/** 蓮 A lotus seed: health mended every round of a fight, as a share of the whole. */
export const BOON_LOTUS = 0.02;
/** 血 A blood method: what a beast counts for, multiplied. Never the Dragon above the ninth realm. */
export const BOON_BLOOD = 0.96;

/**
 * 閉關 Seclusion: the door is shut for this long, and then 心魔 the heart demon comes.
 *
 * Eight hours is one night, or one working day: shut the door before bed and the demon is
 * waiting over breakfast. Nothing is paused or taken while the door is shut; the climb
 * goes on exactly as it would have. It is a clock on a fight, not a cost.
 */
export const SECLUSION = 8 * 3600;
/**
 * 心魔 The heart demon stands at this multiple of the cultivator's own 力, and nothing
 * thins it: no sunder, no bane, no blood method. It is what you are, without what you
 * know. So stance, arts and class win it and raw power alone struggles,
 * because power is the one thing it has as much of as you do.
 *
 * 量 Read off the fight, the share of demons that fall at each multiple:
 *
 *                                        ×1.0   ×1.1   ×1.2   ×1.3   ×1.6
 *     no stance, no arts                  63%    24%     7%     0%     0%
 *     a stance only                       83%    39%    17%     2%     0%
 *     a sixth-realm save, 穩 and two arts 100%   100%   100%    90%    24%
 *     the casual harness, fourth realm    95%    68%    29%    17%     0%
 *
 * 刃 It was 1.6 and rose 4% a demon, tuned against the harnesses, which set every art
 * they own. A real sixth-realm save with a stance and two arts then met its fourth demon
 * at 0%. At 1.2 and flat, nobody is walled: somebody with nothing set wins one time in
 * fourteen and it comes back every hour, somebody who has set a stance wins one time in
 * six, and a build walks through it. The build is what makes it quick, never what makes
 * it possible.
 */
export const DEMON_EDGE = 1.2;
/** 心魔 A demon that wins draws back into the cultivator and comes again after this long. */
export const DEMON_RETURN = 3600;
/** 道 What a demon conquered hands over. */
export const DEMON_DAO = 1;
/** 心魔 How many there are in a life. Finite on purpose: 道 is power, and power must end. */
export const DEMONS = 9;
/**
 * 心魔 And how many each realm from the fourth lets out. Measured with no limit, an
 * active cultivator put all nine down inside a week of the door opening, and the fifth
 * realm onward had nothing behind it. Two a realm spreads them over the fourth to the
 * eighth, so every realm up to the summit has its own: the active harness puts them down
 * on days 4, 5, 9, 9, 13, 13, 22, 22 and 34, and reaches the summit the same day either way.
 */
export const DEMONS_PER_REALM = 2;

/** 秘境 How many rooms a run is. Seven is short enough to finish in one sitting. */
export const ROOMS = 7;

/**
 * 深 秘境深處 The deeper vault, which is what the seventh realm hands over.
 *
 * 隙 Measured, every system in the game was open inside three weeks and nothing new
 * arrived for the twenty-five days after that. The cheapest honest answer is not a new
 * screen: it is a second gear on a system that already has one, because the screens,
 * the rooms, the gates and the tally all exist. The path simply goes further.
 *
 * 關 Four more rooms, and two more gates with them, since a gate is every other room.
 * They are the deepest rooms in the game, so 深 depthScale pays them the most, and the
 * gate ramp already runs out of your own realm and into the one above: the deeper gates
 * are the strongest things the realm above has. A cultivator who opens the door at the
 * seventh realm and walks all eleven has done something a sixth-realm cultivator could
 * not.
 */
export const DEEP_ROOMS = 11;

/** How long after a run before the door opens again, in seconds. */
export const DOOR_GAP = 8 * 3600;

/** 深 What each room deeper adds to what a room pays: the last is about three times the first. */
export const ROOM_DEPTH = 0.4;

/** 泉 A spring pays this many minutes of standing gathering, before depth. */
export const SPRING_MINUTES = 4;

/** 龕 A shrine pays this many 道 points, and the deep one in the last room of a path pays more. */
export const SHRINE_POINTS = 1;
export const SHRINE_DEEP_POINTS = 2;

/** 爐 What a brazier adds to the rare end of the drop table, on top of the cultivator's own. */
export const BRAZIER_LUCK = 1.5;

/** 洞天 How many beds the cave has. Three, and nothing in the game adds a fourth yet. */
export const BEDS = 3;

/**
 * 印 How many 雷印 marks one heaven is worth.
 *
 * Three, measured against the endgame harness: a crossing settles at about MARK_DAYS
 * plus the gathering either side of it, so three of them is a little over a week. Nine
 * heavens is then roughly eleven weeks of named arrivals on top of a climb that ends in
 * nine, which is the thirteen weeks that were asked for, with the climb and the
 * endgame overlapping rather than queueing.
 *
 * 二 Two was tried, to close the two weeks of the first thirteen that name nothing new
 * (weeks 10 and 13: a heaven comes every ten or eleven days and a week is seven). It is
 * a wall. Every heaven hands the Dragon the whole of its step at once, ×5.23, and two
 * crossings are not enough to fill the room the heaven opened, so the fifth heaven
 * arrives on day 149 instead of 103, one crossing takes 400 days, and the ninth heaven
 * is on day 981. Those two weeks are what 期 the week is for.
 */
export const MARKS_PER_HEAVEN = 3;

/* ── 業 The crafts ─────────────────────────────────────────────────────────────
 *
 * Bruno, after the proposal: *"adorei tudo nos crafts/lifeskills"*, and before it: *"algo
 * mais complexo com materials diferentes, opções de craft e ranks de craft que façam
 * sentido dentro do conteúdo que temos, género Melvor Idle ou RuneScape, sendo lv 1 o
 * mais básico e lvl 99 meses para fazer cap."* Seven crafts, levels 1 to 99 on the
 * RuneScape table, one task at a time, and the workshop keeps working while the app is
 * shut. Every number that shapes it is here; the tables are in data/crafts.ts.
 *
 * 律 What it may and may not touch. Nothing a craft makes raises the qi rate, and nothing
 * it makes can be melted into qi. It moves fights, drops, shapes and the other crafts,
 * and every one of those is capped by the level, which is capped at 99.
 */

/**
 * 時 How many hours of work take one craft from level 1 to 99, at the best recipe each
 * level allows and with no tool, no array and no familiarity.
 *
 * 1,550 hours is about three months of a workshop that runs sixteen hours a day, which is
 * a visit in the morning and one at night. RuneScape's table puts level 92 at half the
 * experience, so the last seven levels are as long as the first ninety-two. Tools, arrays
 * and familiarity take a fifth to a quarter off that at the end; the realm gate adds it
 * back, because the best recipes wait for the realm their material comes from.
 */
export const CRAFT_HOURS_TO_CAP = 1550;

/** 時 Seconds one action takes, before tools and arrays, per craft. */
export const CRAFT_SECONDS: Readonly<Record<string, number>> = {
  herb: 6, vein: 7, render: 5, alchemy: 8, forge: 12, sigil: 8, array: 40,
};

/**
 * 眠 How long the workshop keeps working after the last visit, in hours.
 *
 * Twelve, so a visit in the morning and one at night keep it busy all day, and a week away
 * comes back to twelve hours of work rather than to nothing. It is a clock on the work,
 * never a cost: nothing made is ever lost, and coming back late only means the workshop
 * stood still for the hours past twelve.
 */
export const CRAFT_WORK_HOURS = 12;
/** 長守 What the Long-Watch Array adds to that. */
export const CRAFT_LONG_WATCH_HOURS = 4;

/** 具 How much faster each step of a craft's tool makes it: six metals, 5% each. */
export const CRAFT_TOOL_STEP = 0.05;
export const CRAFT_TOOL_STEPS = 6;

/**
 * 熟 Familiarity: how many times a recipe has to be made for each of its five marks. The
 * first comes in an afternoon, the last in weeks of making the one thing.
 */
export const CRAFT_MARKS = [25, 100, 300, 800, 2000] as const;
/** 熟 The first mark: this much faster. The second: one make in this many comes out twice. */
export const CRAFT_MARK_FASTER = 0.05;
export const CRAFT_MARK_TWICE = 0.05;

/**
 * 品 Quality, the five ranks gear already has, rolled on everything a craft makes that
 * can be better or worse. `score` is the levels above the recipe plus six a mark of
 * familiarity; the weights below turn it into odds. At the recipe's own level a make is
 * Common nine times in ten; forty levels over with every mark, Heaven is one in fifty.
 */
export const CRAFT_QUALITY = {
  mark: 6,
  spiritBase: 8, spiritPer: 1.1,
  mysticFrom: 8, mysticBase: 2, mysticPer: 0.55,
  earthFrom: 20, earthPer: 0.28,
  heavenFrom: 35, heavenPer: 0.12,
} as const;
/** 品 What each rank multiplies a consumable's effect by, Common to Heaven. */
export const CRAFT_QUALITY_MULT = [1, 1.15, 1.3, 1.5, 1.75] as const;

/**
 * 陣 The arrays. Three places in the cave floor, a fourth at Arrays 50 and a fifth at 99.
 * What each one does is the number beside it.
 */
export const CRAFT_ARRAY_SLOTS = [[1, 3], [50, 4], [99, 5]] as const;
export const CRAFT_ARRAY_SPEED = 0.10;   // 聚露 地脈 馴火: that craft this much faster
export const CRAFT_ARRAY_TWICE = 0.10;   // 利刃: one part in ten comes out twice
export const CRAFT_ARRAY_GUARD = 0.05;   // 護法: this much less taken from wardens and demons
export const CRAFT_ARRAY_DOOR = 1800;    // 秘門: the vault door, this many seconds sooner
export const CRAFT_ARRAY_XP = 0.05;      // 天地: every craft earns this much more
export const CRAFT_ARRAY_QUALITY = 6;    // 九宮: this much on the quality score

/**
 * 戰 What a carried elixir or sigil does in a fight. They are carried into the next
 * fight that is a warden, a heart demon or a beast of the vault, and spent only if it is
 * won: a lost fight keeps them, because a lost fight costs nothing.
 *
 * 劫 Never the Dragon, and never a tower floor. The Dragon is anchored to the power that
 * faced it, and the tower pays qi by the floor, so anything that carried a cultivator up
 * either of them would be a lever on the endgame or on the qi. Both were measured before
 * this rule and both were the reason for it.
 *
 * 級 A tier-N elixir is made for realm-N fights. Carried into a harder realm it works at
 * half strength a realm, so the recipes have to keep climbing with the cultivator.
 */
export const CRAFT_KIT = {
  mend: 0.02,        // 回 health mended every round, as a share of the whole
  guard: 0.12,       // 護 less taken
  might: 0.12,       // 力 harder struck
  fade: 0.5,         // each realm the fight is above the elixir's tier
  warding: 0.15,     // 護身符
  thunder: 0.15,     // 雷符
  fiveThunders: 0.25,// 五雷符
  mirror: 0.10,      // 照妖符: this share of every blow taken goes back
  purity: 0.15,      // 清心符: the heart demon this much weaker
  calmHeart: 0.10,   // 靜心丹: the same, from the furnace side
} as const;

/** 尋 How many sure drops can be waiting at once, from Seeking Sigils and incense. */
export const CRAFT_SEEK_MAX = 20;

/**
 * 解 How many of a common beast have to fall before Rendering knows what its kind leave.
 *
 * Rendering used to take one body per kill, and the harness showed why that could never
 * work: an active cultivator kills about thirty-six beasts a day, and the craft asks for
 * over a million makes to reach 99. A warden was worse: it falls once, so its part could
 * be made once in a whole life. So a beast is learned instead of spent. Ten kills of a
 * common and one of a warden, and from then on its kind's pelts, fangs and scales are
 * worked like a herb path, for as long as the workshop runs.
 */
export const CRAFT_RENDER_KNOWN = 10;

/** 丹 What each Alchemy level takes off the furnace's material price: 0.2%, so 20% at 99. */
export const CRAFT_FURNACE_DISCOUNT = 0.002;
