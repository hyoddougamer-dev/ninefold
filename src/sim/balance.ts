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
/**
 * 囊 What your master left you.
 *
 * Measured by playing it: a new cultivator gathers 1 qi a second and the cheapest thing
 * on the screen costs 491, so for the first three minutes and forty-five seconds the
 * game says SPEND YOUR QI over three boxes that cannot be pressed. That is not a slow
 * opening, it is an opening with no decision in it, and an idle game's first minute is
 * the only one a player has not yet decided to give you.
 *
 * So the cultivator begins holding something. Not a head start — 800 qi is nothing
 * against a climb measured in quintillions, and it is gone by the first hour. What it
 * buys is the *question*, at second zero: the two cheaper upgrades are already lit, and
 * the bar is already nine tenths of the way up the first rung.
 *
 * That is the whole game in its first frame. Qi spent is qi that did not open a layer,
 * and qi banked is an upgrade not bought — the same trade the furnace and the thunder
 * pool ask about eighty rungs later. It is better met in the first minute, for 800 qi,
 * than in the ninth realm for a fortnight of gathering.
 *
 * It sits **below** LADDER_FIRST on purpose. A purse at or above the first rung would be
 * swallowed by the ladder on the first tick — the player would open the app, watch a
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
 * 圍 What one kill of a drive costs, as a share of the first rung of the hunter's realm.
 *
 * Two per cent, so a drive of fifty costs about one rung and a drive of two hundred
 * costs four. A rung is the unit a player already feels — it is the thing the bar fills
 * with — so the price reads as "this drive costs me a layer", which is a decision
 * rather than a number.
 *
 * It is priced off the *hunter's* realm and not the beast's, because what a drive buys
 * is the cultivator's own time: two hundred rats and two hundred dragons are the same
 * afternoon. It is also why the price is flat per kill — a player should be able to do
 * the arithmetic without the screen doing it for them.
 */
export const DRIVE_QI = 0.02;

/**
 * 舊 What an old beast pays, as a share of what this realm's weakest pays.
 *
 * Measured, before this existed: the frog of the first realm paid **2 材** and the frog
 * of the ninth paid **900,095**. So going back to finish a beast you had left behind
 * was a hundred fights for a rounding error, and 圖鑑 the bestiary — which asks for four
 * beasts *mastered* in a realm, four hundred kills — was a chore nobody would ever have
 * a reason to do twice.
 *
 * A beast now pays at least this share of what the weakest common of the *hunter's* own
 * realm pays. A quarter, so that hunting at the top of your reach is still plainly the
 * better way to earn — a current beast pays four times this, and the hard one of the
 * realm more — but going back is no longer charity. The old animal is easier and safer
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
 * material bought 妖丹 cores at three material each — real, permanent, and completely
 * invisible next to a qi bar that is the only number the screen ever shows moving. The
 * player's whole attention is on qi, and combat never touched it.
 *
 * So the *first* kill of every beast pays qi. Not every kill: the first, once, for ever,
 * and it goes in the same 見 Seen mark that already exists and until now only filled in
 * a page. Thirty-six beasts in the game, thirty-six payments in a lifetime — so it
 * cannot be farmed, it cannot compound, and it is not a rate. It is the game paying for
 * the one thing it most wants a new cultivator to do: go and look at something new.
 *
 * Half a rung at the first realm, and divided by the realm after that — see seenBounty.
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
 * A warden's power already counts 妖丹 cores — `referenceAt` says so — so from the third
 * realm a warden cannot be walked past by somebody who has never killed anything. That
 * was the design. It did not hold, for one reason: **the warden itself paid a full
 * harvest**, so nine warden kills funded the cores for the next nine warden kills and the
 * gate financed itself. Measured, a cultivator who never tapped a beast reached the
 * ninth realm with 39 core levels against the 40 the last warden reads for — through by a
 * hair, on a loop that never asked them to play.
 *
 * Paying nothing would shut the door outright, and a shut door is not what was asked
 * for: *"não um muro que torne impossivel mas que dificulte players 100% idle e premeie
 * jogadores mais ativos."* So the warden pays a **tribute** — a fraction, enough that the
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
 * **never finishes at all** at 0.7 — there is no setting between "unchanged" and
 * "stopped for ever", because a core's price climbs by a third each level while a
 * warden's tribute is flat. A lever with no middle cannot do what was asked of it:
 * *"não um muro que torne impossivel mas que dificulte."*
 *
 * The middle has to be built, not tuned. So 妖丹 gets a second price, in qi:
 *
 *   - **Kill something, and a core is cheap.** 材 material off a beast, as it always was.
 *   - **Kill nothing, and a core is a stretch of the climb.** CORE_QI_RUNGS rungs of the
 *     ladder you are standing on, for one level — qi that would otherwise have opened
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
 * realm** — never of the realm the cultivator is standing in.
 *
 * Bruno asked for the early qi flow to be helped along a little, and offered the shape
 * himself: *"Salvage gear por exemplo, multiple salvage ou solo salvage, por algum qi."*
 *
 * The hole it fills is older and worse than a thin qi flow. A full chest does not refuse
 * a drop — it throws the worst piece on the floor to make room — so from the second
 * realm onward the game has been **deleting gear and paying nothing for it**, one piece
 * per drop for the rest of the run. Salvage is what that deletion should always have
 * been.
 *
 * 舊 Priced off the item's realm is the first half of the safety. A second-realm 凡 pays
 * a second-realm sum for ever, which is a real number at the second realm and less than
 * a millionth of a layer at the ninth — so this can never become a way of farming weak
 * beasts for qi, which is the shape every uncapped faucet in this game has taken when it
 * was allowed to read the *hunter's* depth instead.
 *
 * 早 And the tilt is the second half, which the measurement forced. A flat share was
 * swept across its whole range and it did **nothing at all** for the cultivators it was
 * asked to help: `once a day` and `casual` did not move by a single day at any setting,
 * because four kills a day is under one drop a day. What did move was the hourly
 * cultivator, who melts thousands — 52 days to 38 at the largest setting, which shortens
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
 * climb stays inside one band however the game is played: 45 days for somebody who opens
 * the app every waking hour against 168 for somebody who never taps a beast, and 95 for
 * one visit a day. That band is what an idle game is supposed to promise, and it is
 * printed by `players.test.ts` on every run rather than remembered here — this sentence
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
 * the cap is the only thing that can buy it — so once the cap is reached the hunting
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
 * for somebody who does not — 169 days for the cultivator who never fights either way.
 * Which is the wall the right way round.
 *
 * 定 And it is **flat rather than a multiplier**, which is the whole of what the first
 * attempt got wrong. Doubling the cap fixed the second realm and broke the ninth: above
 * the fifth realm material is no longer earned by hand at all — 塔 the tower pays it in
 * bulk — so a doubled cap there is not a wall handed back to the price, it is no wall.
 * The endgame's own test caught it in one run: walkover crossings went from 5 of 40 to
 * **14 of 40**, against a rule of at most 10.
 *
 * Flat, the same levels are a doubling where the hole is and a fraction of a cap where
 * the tower is filling your pockets — which is the shape the measurement asked for,
 * rather than the shape that was easiest to write.
 *
 * 廣 And two realms' worth was not enough. At two it cleared the first three realms and
 * left the rest of the climb dead again for somebody who really taps — 22% of the
 * fourth, 41% of the fifth, 70% of the seventh. Swept: **three realms' worth takes it
 * to zero in every realm of the game**, four and five change nothing more, and the
 * endgame does not move at all — 5 of 40 walkover crossings at two, at three, and at
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
 * than a quarter. The arithmetic is plain once it is written down — six levels of 劍訣
 * and six of 妖丹 are worth 5.2x power, they cost nothing a cultivator at the summit
 * would notice, and the Dragon had no answer to them.
 *
 * So a heaven raises *both* sides. What it opens for you, it also gives to the thing
 * standing at the end of it, exactly and by construction — which means the fight is as
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
 * power. A floor pays this once and never again — there is no floor to farm — so it can
 * be generous without ever becoming a loop that feeds itself.
 */
export const TOWER_QI_HOURS = 6;

/**
 * 道 Why 神 the Spirit branch stopped selling the qi rate.
 *
 * The tree's two big branches were written with the same numbers — 15, 20, 30, 45, 80 —
 * one on power and one on the rate. It reads as fair and it is not, and the reason is
 * the only thing in this file worth learning twice:
 *
 *   **A multiplier on power is linear. A multiplier on the rate divides the whole game.**
 *
 * Power buys fights, and the climb is not gated by fights; it is gated by qi. Doubling
 * power shortens nothing. Doubling the rate halves every layer, every realm and the whole
 * run at once — the run length is very nearly `days / rateMultiplier`. Measured on the
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
 * cost three days. Its four big nodes now deepen 入定 instead — which is still gathering,
 * still the branch's own idea, and **cannot divide the clock, because it only pays while
 * you are looking at the phone.** An idle game spends almost all of its life shut.
 */
export const TREE_FOCUS_SHARE = 0.5;

/**
 * 頂 And the ceiling that would have caught it. No branch of the tree, taken to its end,
 * may multiply the qi rate by more than this — because the run is very nearly
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
 * cap at all, driven by how much you hunt — which is precisely the "playing more finishes
 * sooner" trap the whole economy was built to avoid. The bible's own claim that playing
 * every waking hour is worth about twice a casual run, not twenty times, was false: it
 * was worth three times, and climbing.
 *
 * The law was already written and nothing enforced it: *everything that multiplies
 * gathering is behind the realm cap; everything uncapped buys power, fortune or knowledge
 * instead.* So this is the enforcement. Gear and the tree, multiplied together, may not
 * move the qi rate past this — and `rate()` clamps them rather than trusting anybody to
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
