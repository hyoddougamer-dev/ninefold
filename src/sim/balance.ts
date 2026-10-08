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
 * on the screen cost 491, so for the first three minutes and forty-five seconds the
 * game says SPEND YOUR QI over three boxes that cannot be pressed. That is not a slow
 * opening, it is an opening with no decision in it, and an idle game's first minute is
 * the only one a player has not yet decided to give you.
 *
 * So the cultivator begins holding something. Not a head start: the purse is nothing
 * against a climb measured in quintillions, and it is gone by the first hour. What it
 * buys is the *question*, at second zero: the two cheaper upgrades are already lit, and
 * the bar is already nine tenths of the way up the first rung.
 *
 * That is the whole game in its first frame. Qi spent is qi that did not open a layer,
 * and qi banked is an upgrade not bought: the same trade the furnace and the thunder
 * pool ask about eighty rungs later. It is better met in the first minute, for a handful
 * of qi, than in the ninth realm for a fortnight of gathering.
 *
 * 初 It was 800 against a first rung of 900. The first realm's rungs are seven hundredths of
 * that now (FIRST_REALM_PRICE, below), so the purse is too: 56 against 63.
 *
 * It sits **below** LADDER_FIRST on purpose. A purse at or above the first rung would be
 * swallowed by the ladder on the first tick: the player would open the app, watch a
 * layer open by itself, and never see the choice. Below it, nothing moves until they
 * move it.
 */
export const OPENING_PURSE = 56;

export const LADDER_FIRST = 900;

/**
 * 初 What the first realm's nine rungs cost, as a share of where the mountain would have
 * put them. The first realm is the first sitting.
 *
 * A player on Reddit, 2026-09-30: *"Gave it a try, got bored after a few minutes ...
 * I didn't even make it to the point you mention in your post where you speak about
 * equipping stuff after tapping to kill the 20th rat in a row."* Measured by playing it
 * without stopping: the rat was the only beast for thirteen minutes (sixty-five of them),
 * Beast Cores the only thing bought, and half an hour in the cultivator stood on the
 * third layer of nine. Gear, the Path, the stances and the workshop all wait in the
 * second realm, which was seven or eight hours away. The only minutes a new player gives
 * a game were spent on one button.
 *
 * At seven hundredths, played on the real build from a brand new game (tools/sitting.mjs,
 * which buys what is lit and fights what the guide points at, ten seconds between taps):
 * the hound can be beaten at 1:20, the frog at 5:40, the fox falls at 11:50 and the second
 * realm, with its gear, its Path and its workshop, opens at twelve minutes. A twentieth
 * made it seven minutes, which is a realm gone before it is looked at; a tenth made it
 * nineteen and a half. The idle pace starts in the second realm, where there is enough to
 * choose between and a workshop to leave running overnight. Only these nine rungs move:
 * the second realm arrives at the same rate and costs exactly what it did, so the climb
 * is a few hours shorter in fifty-five days, and nobody past the first realm can tell.
 * The upgrades of the first realm ride the same rungs, so they are cheaper with it.
 */
export const FIRST_REALM_PRICE = 0.07;
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
  for (let n = 0; n < LAYERS_PER_REALM; n++) out[n] *= FIRST_REALM_PRICE;
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
/**
 * 自 A quarter, since 2026-10-02. rekaris, the morning after the auto-hunt: *"With Auto I
 * can get 200 kills in a few minutes, while Drive would cost me 3,5hr of cultivation."*
 * The drive is now the way to hunt while the game is shut, and it can be cheap because
 * what made kills dangerous was the qi from melting, which has its own ceiling now
 * (MELT_FILL). Measured: `drives it all` reaches the ninth realm on day 44.7 at a minute
 * a kill, 44.8 at half and 43.8 at a quarter; nobody else moves.
 */
export const DRIVE_MINUTES = 0.25;

/**
 * 舊 What a kill of a beast from an earlier realm costs in a drive, as a share of the
 * full price. The same quarter an old beast pays (OLD_BEAST_FLOOR, below): a drive of
 * two hundred rats costs fifty minutes, because it earns a quarter of what two hundred
 * of the hunter's own beasts would. It is what makes finishing 圖鑑 the bestiary and a
 * 緣 fate bar something a drive can do instead of four hundred taps.
 */
export const DRIVE_OLD = 0.25;

/**
 * 改 What changing a card already taken costs, in days of the cultivator's own gathering,
 * for each card taken after it and the card itself.
 *
 * rekaris, on the Discord: *"give the player the possibility to change any of their
 * 'permanent' choices at a very, very, very large cost."* Bruno chose to let any card be
 * traded for another of the three it was offered with, paid in qi, dearer the further
 * back it is. So the newest card costs half a day of qi, the one before it a day, and the
 * first card of a whole climb (seventeen back) eight and a half.
 *
 * Priced in the cultivator's own time, like the drive, so it costs the same share of a
 * climb at every stage of it. No card raises the qi rate, so a trade can only ever move
 * qi out of the bar and into a different kind of help: it can never pay for itself in qi.
 *
 * 測 Measured on 2026-10-02 with the active cultivator: taking every card of one kind
 * for a whole climb against another moves the ninth realm 1.4 days at most (salvage 43.8,
 * material 45.0, 道 45.2). A whole hand is worth less than three of the cheapest trades.
 * A cultivator built to trade every card to suit each realm, trading before buying
 * anything, afforded one trade in 120 days: the bar never holds half a day of qi unless
 * somebody saves for it on purpose.
 */
export const RETRADE_DAYS = 0.5;

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
/**
 * 拆 The melting allowance: how much qi melting can pay, in seconds of the cultivator's
 * own gathering.
 *
 * rekaris, on the Discord (2026-10-02), the morning after 自 the auto-hunt: *"With Auto I
 * can get 200 kills in a few minutes"*, and an hour later: *"Withered bone gear grants way
 * too much qi on meltdown ... gathering qi by melting down is the fastest way."* Both were
 * the same hole. A piece's melt is a share of its realm's first rung, so it never grew
 * with the hunter, but the *number* of pieces did: every kill can drop one, a full chest
 * melts what it cannot keep, and melting had no ceiling on how often. Measured with
 * tools/habits.ts: the active cultivator reaches the ninth realm on day 44; the same
 * cultivator running the auto-hunt ten minutes a visit reached it on day 12, and with
 * melting switched off, on day 42. The kills were never the problem; the qi was.
 *
 * So melting pays qi out of an allowance that fills with time, MELT_FILL seconds of
 * gathering for every second that passes, and holds at most MELT_CAP. It fills while the
 * game is shut, so somebody who comes back melts their chest at full value; it runs dry
 * for somebody melting thousands of pieces an hour. What melts past it is not thrown
 * away: it melts into 材 material instead (see meltMaterial), which buys power and never
 * qi. Nothing uncapped may raise the qi rate, and now nothing uncapped pays qi either.
 *
 * 拆 Half as much again since 2026-10-03. rekaris: *"running auto hunts almost doesn't
 * seem worth it - it is better to just let the game sleep until the allowance is full."*
 * Measured over a whole climb (realm-9 day; active, every hour, auto): at 0.25 it was
 * 43.8, 30.5, 38.3, auto 7.8 days behind the every-hour hand; at 0.375, 43.8, 30.2, 33.2,
 * three days behind; at 0.5, 31.5, a day and a half (a knife edge); from about 0.6 auto
 * is ahead of every hand, which auto.test refuses. Active never empties it either way.
 */
export const MELT_FILL = 0.375;
export const MELT_CAP = 6 * 3600;

/**
 * 材 How much material a piece melts into once the allowance is spent, as a multiple of
 * the table's piece (meltMaterial in sim/salvage.ts), which since this date also passes
 * through the seals, the record and the material cards, as every kill's material does.
 *
 * rekaris, on the Discord (2026-10-05): *"Realm 6, 40 centipede kills: 740k material; 40
 * kills worth of drops melted at allowance empty with Treasure Smith: 37k, a 5% gain."*
 * Measured with the habits (tools/meltshare.ts: 400 kills of the strongest safe beast at
 * each realm, every drop melted with the allowance empty), the melt was 6 to 8% of the
 * kills' material at the second realm and 0.3 to 1% at the ninth, because the kills
 * gathered the tower's seals and the record and the melt read the bare table. A raise by
 * one number would have been generous early and still nothing late, so the melt now rides
 * the same multipliers as the kills, and this number sets its share. At 3, measured the
 * same way, realms 3 to 9: 17 to 34% for the cultivators who take the melting cards (once
 * a day, active, every hour, crafts it all), 8 to 25% for those who take others (casual,
 * drives it all, walks 神); a noticeable second source that never outweighs the kills. The
 * habits melt once a visit and rarely empty the allowance, so the ninth realm did not
 * move for any of them (every hour 28.9, active 44.0, once a day 70.0, before and after).
 * 自 The auto-hunt, which does empty it: ninth realm 31.2 to 31.3 days, and its power at
 * the end ×1.24, the material going where material goes (煉器 refining), never into qi.
 */
export const MELT_MATERIAL = 3;

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
 * lasts FOCUS_HOLD and then it is over; to have another one, leave and come back, or press
 * 坐 Sit again, which is the same thing without the leaving (the app restarts the visit).
 *
 * So a visit is worth about an hour of extra gathering, however long the screen stays
 * on, and six visits a day is worth a few hours. The tower is what carries the real
 * difference between playing and waiting; this is what makes the minutes in front of it
 * feel like they counted.
 *
 * Half an hour since 2026-10-03; it was a quarter. Testers sit with the game open for
 * longer than that, and a sitting that ended halfway through read as a penalty. Measured:
 * a sitting that never ended while the screen was on took a tab left open sixteen hours a
 * day from day 63 to day 38 (33 on the Spirit branch) and set off the ranked server's
 * suspicion over a week, so it still ends. At thirty minutes nothing is flagged, every
 * habit in the harness lands where it did (none sits longer than fifteen), and a player
 * who sits an hour at a time reaches the ninth realm about two days sooner.
 */
export const FOCUS_MAX = 3;
export const FOCUS_RAMP = 180;
export const FOCUS_HOLD = 1800;

export function focusAt(secondsOpen: number, deeper = 0): number {
  if (!(secondsOpen > 0)) return 1;
  if (secondsOpen >= FOCUS_HOLD) return 1;
  const t = Math.min(1, secondsOpen / FOCUS_RAMP);
  // 道 神 the Spirit branch deepens the sitting rather than the rate. It rides the same
  // ramp and the same ending, so everything that made 入定 safe still holds.
  return 1 + (FOCUS_MAX + Math.max(0, deeper) - 1) * t;
}

/**
 * 吸 What a tower floor pays in qi: a fixed sum, read off the floor and nothing else.
 *
 * Floor f pays TOWER_QI_RUNG of the price of the rung a climber stands on when floor f
 * falls, and never less than TOWER_QI_LEAST of the first rung of the realm the tower opens
 * in. The rung is read off a straight line through the measured climb: the summit's rung
 * (the eightieth, the last that has a price) at floor TOWER_QI_SUMMIT, and one realm's nine
 * rungs lower for every TOWER_QI_REALM_FLOORS floors below it. Above the summit floor every
 * floor pays what the summit floor does.
 *
 *   rung(f) = 80 − 9 × (TOWER_QI_SUMMIT − f) / TOWER_QI_REALM_FLOORS, never under 0
 *   qi(f)   = max(TOWER_QI_LEAST × rung 36's price, TOWER_QI_RUNG × ladderBetween(rung(f)))
 *             and 天師 the Celestial Master × PAIR_TOWER_QI
 *
 * So floors 1 to 61 pay 8.90M each (a twentieth of the fifth realm's first rung), floor 62
 * is the first to pay more, floor 70 pays 68.9M, floor 81 832M, floor 100 38.1B, and floor
 * 121 and every floor above it 1.29T. A higher floor never pays less than a lower one, the
 * card can say the number before the fight, and it is the same number for everybody.
 *
 * 誤 Why it stopped being hours of your own gathering (rekaris and speculaether, Discord,
 * 2026-10-05; Bruno agreed the same day). A floor paid six hours of the rate with nothing
 * worn, full on your realm's warden floor, a fifth less for every floor under it and
 * tapering to three hours above it. So the pay read the climber: buying rate upgrades
 * before climbing paid more, a floor beaten a realm early paid a fifth of what it would
 * have paid later, and a floor beaten high paid half. A floor falls once, so every one of
 * those was a choice that could not be undone and that nobody could see the right answer
 * to: climb now for less, or wait a realm for more. With a fixed sum there is nothing to
 * wait for and nothing to buy first: the same floor pays the same qi whenever and by
 * whomever it falls, and the only way to more is up.
 *
 * Why the line. It is the active cultivator's own climb (tools/habits.ts), which stands on
 * floor 72 as rung 40 opens, 90 at 54, 101 at 63, 112 at 72 and 120 at 79: eleven floors to
 * a realm, and the summit near floor 121. A floor near where the climber stands therefore
 * pays about TOWER_QI_RUNG of their own next rung, in every realm alike, so the tower is
 * the same size of reward from the fifth realm to the ninth.
 *
 * Why the least (Bruno, 2026-10-05, the second of two proposals). On the line alone the
 * first sixty floors paid a fifth of a rung together, and opening the tower stopped being
 * an event. With every floor paying at least a twentieth of the fifth realm's first rung,
 * the floors a newcomer clears the day the tower opens pay about two to three rungs: the
 * first sixty floors 534M, sixty-six 629M, seventy 829M, against rungs of 178M, 238M and
 * 319M. Once a day (floors 40 to 50 on arrival) gets about two, the hourly cultivator
 * (61 to 70) about three. It used to be four to six, from one visit.
 *
 * Why it stops growing at the summit. Above the ladder the qi rate grows by a mark at a
 * time and the furnace sells power for qi at a price that holds (PILL_AHEAD). A floor that
 * paid more the higher it stood would buy the pills for the next floor once it paid about
 * seven pills' worth, and the tower would climb itself: at a sum growing like the Dragon
 * it did, measured, from floor 120 to 304 in ten crossings. Flat, the most a floor can pay
 * is under a sixtieth of the seven pills that lift a cultivator over it.
 *
 * Measured with tools/towerpay.ts (tools/habits.ts with every floor's pay traced to the
 * realm it fell in), before (hours of the bare rate, tapered) and now. The share is the
 * tower's part of all the qi gathered in that realm; the visit is the most one visit's
 * floors paid in the fifth realm, in rungs of the rung then standing (the harness climbs
 * at most forty floors a visit, so an arrival is two visits):
 *
 *   habit           ninth realm (day)   realm 5 share   biggest visit   realms 6 to 9 share
 *                   before   now        before   now    before   now    before    now
 *   once a day       69.0    70.0        13.0    7.6     1.20   2.00    3 to 6    2 to 5
 *   active           44.2    43.0        20.7   12.6     3.84   2.00    5 to 7    7 to 14
 *   every hour       28.4    27.2        23.6   18.1     6.22   2.00    6 to 7   10 to 16
 *   drives it all    45.3    42.3        25.9   12.5     5.74   2.00    5 to 6    6 to 13
 *   walks 神         42.8    46.3        21.8    6.4     4.39   2.13    6 to 9    2 to 4
 *   crafts it all    44.0    43.5        26.2   12.2     5.50   2.00    5 to 6    7 to 9
 *   runs auto        31.5    31.0        24.5   16.7     6.46   2.00    5 to 8    9 to 22
 *
 * No single visit anywhere pays more than 2.13 rungs. The cost is the spread: a fixed sum
 * per floor pays whoever climbs highest the most, so a build that trades power for
 * something else gets less from the tower than it did. The Spirit walker arrives two and
 * a half to three and a half days later (45.3 to 46.3 across every value tried), the
 * classes average 45.7 days against 44.5, and the slowest class (the Treasure Smith, day
 * 49.0) takes 1.14 times the plain cultivator's days against 1.08 (see classes.test.ts). The least is what keeps it to that: in the first proposal,
 * without it, the Spirit walker came three and a half days later and the classes at 46.2.
 *
 * It is a slope, not a knife edge: TOWER_QI_RUNG at 0.18 and 0.22 (a tenth either side)
 * puts the ninth realm at 70.0 and 72.0 (once a day), 43.7 and 42.7 (active), 27.3 and
 * 26.5, 44.7 and 43.2, 46.3 and 45.3, 43.2 and 43.7, and 31.0 and 31.2 (Auto), and
 * TOWER_QI_LEAST at 0.045 and 0.055 at 70.0 and 70.0, 44.0 and 42.8, 27.3 and 27.0, 43.0
 * and 43.5, 45.3 and 45.7, 43.2 and 43.5, and 28.0 and 31.3 (Auto's own runs wander that
 * much between neighbouring values). Eighty crossings take 582 days (549 before), 583 and
 * 567 a tenth either side, and 861 with every Dragon a tenth heavier (798), the slowest
 * crossing 13 days (12): it slows, it does not wall. The heavier run is where the old hours counted, because a sum read off the
 * floor does not grow with the marks the way the rate does.
 *
 * The rush (rekaris: few levels, strong gear, climb as far as possible at the fifth
 * realm). The hourly cultivator stands at the fifth realm's door strong enough for floor
 * 61, and those floors pay two rungs (8% of the realm). Twice its power reaches floor 64
 * (still two), ten times 73 (four rungs, 18% of the realm), thirty times 78 (six, two
 * fifths), and only a hundred times its power, floor 84, buys the whole realm at once. The
 * old rule paid the same cultivator five rungs on arrival without a step more power, and a
 * rusher who had bought no gathering next to nothing. And a rush only moves the qi
 * earlier: a climb is paid the sum of its floors, whoever climbs them and whenever.
 */
export const TOWER_QI_RUNG = 0.2;

/**
 * 塔 How much stronger each floor past the Dragon's (the eighty-first) stands than the
 * floor under it, on top of the curve every beast reads (floorPower in tower.ts), and how
 * much more material it pays for it (towerLoot).
 *
 * 誤 Why (rekaris, Discord, 2026-10-05: "The Tower difficulty needs to be higher"). A
 * floor pays a fixed sum that grows about a fifth a floor, as fast as the beast on it.
 * Past floor 95 the qi of one floor bought the power for the next, and the next, so a
 * strong save climbed for nothing: on his real save, from floor 108 to 119 and from the
 * eighth realm's fourth layer to the ninth's fourth, with no time passing (tools/freeclimb.ts).
 * It was the tower first and the Celestial Master second: without the Master's share the
 * same save still climbed three layers for nothing, and the harness's every-hour
 * cultivator three; with it, nine and seven.
 *
 * The harness never saw it, because it measured the days to the ninth realm, which a
 * loop at the top of the tower hardly moves, and because it spends its qi evenly where a
 * person puts a floor's pay straight into power. So the rule since: every change to the
 * tower is read on the real saves of the ranked server as well as on the harness, as the
 * most layers any save climbs with no time passing. Two is healthy.
 *
 *   past the Dragon     rekaris, no time   worst harness   ninth realm (active, day)
 *   ×1.00 (before)      +11 floors +9      +4 layers        43.0
 *   ×1.03               +2 floors  +2      +2               45.3
 *   ×1.04               none               +2               45.3
 *   ×1.05               none               +2               46.2
 *
 * It slows rather than walls, either side. Paying less instead (half of every floor past
 * the sixty-first) stopped the loop as well, but it made the Celestial Master the class
 * that takes the least qi out of the tower, the opposite of what it says. Harder floors
 * keep every floor's pay as it was and keep the Master the tower's qi class and the Sword
 * Immortal its fastest climber. Floors already won stay won, on the server too (verify's
 * `held`).
 */
export const TOWER_PAST_DRAGON = 1.04;

/**
 * 岔 How long after swapping one fork of the 道 Path for its twin before the next swap.
 *
 * speculaether (Discord, 2026-10-05): "Don't refund points: once bought, a path node is
 * yours forever. But, allow turning off a path node with a one-day cooldown." Each branch
 * has one fork at its fifth step: Heavy Plate or 捨甲 Forsake Armour, Spirit Travel or
 * 忘機 Forget the Mechanism, Heaven's Favour or 空囊 Empty Pouch. The keystone half of each
 * takes something away, and a keystone bought for one stretch of the climb could cripple
 * the next. So a bought fork can be traded for its twin, points kept, once a day: a
 * decision you live with for a day rather than a switch flipped for every fight.
 */
export const FORK_SWAP_GAP = 86_400;

/** 塔 What TOWER_PAST_DRAGON has added to a floor by this height: 1 up to the Dragon's floor. */
export function pastDragon(floor: number): number {
  return TOWER_PAST_DRAGON ** Math.max(0, floor - LAYERS);
}

/** 材 What a tower floor pays in material: the curve, and a floor past the Dragon's what it costs. */
export function towerLoot(floor: number): number {
  return floorPay(floor) * pastDragon(floor);
}
/** 吸 The floor that pays TOWER_QI_RUNG of the last rung, and the most any floor pays. See TOWER_QI_RUNG. */
export const TOWER_QI_SUMMIT = 121;
/** 吸 How many floors a climber rises while a realm's nine rungs open: eleven. See TOWER_QI_RUNG. */
export const TOWER_QI_REALM_FLOORS = 11;
/** 吸 The least any floor pays, as a share of the first rung of the realm the tower opens in. See TOWER_QI_RUNG. */
export const TOWER_QI_LEAST = 0.05;

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
 * 緩 The tree's own bend, and the start of every body's: 道 the tree on its own bends
 * toward this, and it is where gear starts from.
 *
 * A hard clamp would be the easy version and it is the wrong one: a cultivator at the
 * ceiling wearing 器 氣 +279% has two hundred and forty wasted points, and every 氣 roll
 * they find afterwards does nothing at all. A stat that silently stops working is worse
 * than a stat that was never there.
 *
 * So the gain bends instead. `c·x / (c + x)` gives back nearly all of a small bonus,
 * gives back less and less of a large one, and can never reach the ceiling however much
 * is piled on. Every roll is always worth something and nothing is ever worth too much.
 *
 * Until 2026-10-04 gear went into this same bend, multiplied with the tree, and that is
 * what made the qi line dead past the third realm: see QI_KNEE_FIRST. The tree alone
 * still bends here exactly as it did, so the cultivators who wear nothing never moved.
 */
export const TREE_BEND_ROOF = 1.35;

export function uncappedRate(raw: number): number {
  const c = TREE_BEND_ROOF - 1;
  const x = Math.max(0, raw - 1);
  return 1 + (c * x) / (c + x);
}

/**
 * 氣膝 The qi knee, and why it climbs.
 *
 * Gear's qi bent into the tree's own bend, roof x1.35 and knee +35%, and a realm-5 body
 * already wore +310%: one more typical qi line was worth +0.67% of the whole rate in the
 * third realm, +0.26% in the fifth and +0.09% in the ninth, a twentieth of what it was
 * in the second. Testers saw it and said so (2026-10-04): the qi line sits in a weird
 * place on its curve. No flat number can stay worth half a per cent in every realm
 * under a modest roof (at realm 9's +1054% that would need a roof of about x3.8), so the
 * goal is a roll the size the realm drops.
 *
 * So the gear's qi fills the room left above the tree with a bend of its own, whose knee
 * (the worn qi that fills half the room) climbs a ninth of a realm at every rung:
 *
 *   total = Te + (R(n) − Te) × g / (k(n) + g)
 *   Te    = uncappedRate(tree), exactly as before
 *   k(n)  = QI_KNEE_FIRST × QI_KNEE_GROWTH^(n / 9)
 *   R(n)  = QI_ROOF_FIRST + (QI_ROOF_TOP − QI_ROOF_FIRST) × n / 80
 *
 * g is the worn qi as a fraction and n the rungs opened. The growth 1.4 is measured, not
 * picked: the typical worn qi line grows from +15% in the third realm to +141% in the
 * ninth, about x1.45 a realm. One typical line of the realm is now worth +0.79% to +1.03%
 * of the rate in every realm from the third to the ninth, and a tenth more of what is
 * worn +0.58% to +0.71% from the second on (tools/qicurve.ts, every habit by name).
 *
 * Moved a ninth at a time and never in a step: a knee that jumped at the breakthrough
 * made the rate dip by up to half a per cent when 突破 was pressed. Moved every rung, the
 * bend slides less than the rung's own x1.02, so the rate rises on every rung for every
 * worn amount (the worst rung +1.6%, and players.test.ts walks all eighty).
 *
 * The roof rises with the climb, still capped, because with it held at x1.45 the typical
 * lift fell from the seventh realm on and the endgame took eleven days longer. Days barely
 * moved: every habit inside two days of before at the ninth realm (once a day +2, casual
 * +1.3, everybody else between −0.5 and +0.2), and the two that wear nothing not at all.
 * The neighbours (knee 0.28 and 0.34, roofs a hundredth either side) stay inside −1.7 to
 * +5 days, so it is a slope and not a knife edge. The price, said plainly: a body that is
 * well under the realm's knee (the casual one that never climbs) reads a little less
 * than before, because if a roll is worth something, not having it is worth something.
 */
export const QI_KNEE_FIRST = 0.31;
export const QI_KNEE_GROWTH = 1.4;
/** 氣頂 The roof on the first rung, rising evenly to QI_ROOF_TOP on the last. See QI_KNEE_FIRST. */
export const QI_ROOF_FIRST = 1.38;
/** 氣頂 The roof on the last rung: the hard ceiling on gear and the tree together. */
export const QI_ROOF_TOP = 1.52;

/**
 * 氣滿 How much higher the roof stands for a body wearing six Qi pieces (the Qi school at
 * its full), added to qiRoof. Still a roof, so the law holds: nothing uncapped raises the
 * qi rate past a ceiling.
 *
 * razielmorgenstern (Discord, 2026-10-04): "from my tests, i go to 1.18 from nearly any set
 * whatsoever. Is there any real advantage for the Qi school apart the four upgrades?" and
 * "Having a higher cap unlocked when you have a full set would be great". We said we would
 * measure it. The active cultivator dressed in the full Qi school, walked 400 days:
 *
 *   full-Qi lift     ninth realm   whole ladder
 *   none (before)    day 44.0      day 52.3
 *   +0.05            day 43.3      day 51.5
 *   +0.10            day 42.2      day 50.2
 *   +0.15            day 41.2      day 49.0
 *
 * A slope, not a knife edge. At +0.10 the full Qi school is the quickest way up the
 * ladder for a cultivator who only wants to sit and gather (the Sword Immortal, the
 * quickest otherwise, reaches the ninth realm on day 43.0), which is what the school is
 * for; the plain active cultivator, who wears no class, is on day 45.5 and does not move.
 */
export const QI_FULL_ROOF = 0.1;

/** 氣膝 The worn qi, as a fraction, that fills half the room on this rung. */
export function qiKnee(rung: number): number {
  const n = Math.min(LAYERS - 1, Math.max(0, rung));
  return QI_KNEE_FIRST * QI_KNEE_GROWTH ** (n / LAYERS_PER_REALM);
}

/** 氣頂 What gear and the tree together bend toward on this rung, and never reach. */
export function qiRoof(rung: number): number {
  const n = Math.min(LAYERS - 1, Math.max(0, rung));
  return QI_ROOF_FIRST + (QI_ROOF_TOP - QI_ROOF_FIRST) * n / (LAYERS - 1);
}

/**
 * 氣 Gear's qi and the tree together, on a rung: the one multiplier `rate()` takes from
 * everything uncapped. `worn` is the worn qi as a fraction (+310% is 3.1), `tree` the
 * tree's own multiplier. See QI_KNEE_FIRST for the shape and the measurement.
 */
export function gearQiRate(worn: number, tree: number, rung: number, lift = 0): number {
  const te = uncappedRate(tree);
  const g = Math.max(0, worn);
  return te + (qiRoof(rung) + lift - te) * g / (qiKnee(rung) + g);
}

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
 * move the qi rate past this, and `rate()` bends them toward it rather than trusting
 * anybody to remember.
 *
 * It was x1.35 from the start. Since the qi knee began to climb (2026-10-04) the roof
 * rises rung by rung, which is behind the realm cap like every rung, and this is the top
 * of it, on the last rung only and reached by nobody: x1.5198 at +10000% worn.
 *
 * 雷印 the thunder marks are deliberately outside it. They are the endgame's own ladder,
 * they are capped by the pool's two days apiece, and they are meant to multiply.
 */
export const UNCAPPED_RATE_CEILING = QI_ROOF_TOP;

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
 * 轉世 Rebirth: from the summit with a mark crossed, a cultivator may begin again, and how
 * far ahead they were decides what the new life carries. Bruno: *"from a certain realm
 * onward you can reset, but the benefit of the reset depends on how far ahead you are."*
 *
 * What carries is 宿慧 the Echo, a share added to the qi gathered (advance, never the tower,
 * the vault or any other lump). A life's Echo is ECHO_FIRST for its first mark and
 * ECHO_STEP more for every doubling after it (log2((1 + marks) / 2)), so one mark is worth
 * 5%, three 7.5%, seven 10%: further is always more, and every step costs twice the endgame
 * the last one did. One life gives ECHO_LIFE_MAX at most, and all of them together
 * ECHO_CEILING, which is the hard roof the economic law asks for: a stacked multiplier with
 * no roof was measured (a tester asked for 2x per life) and a 2x cut the climb by 45%.
 *
 * The first mark was a bare step (2.5%) until 2026-10-08. The poll and rekaris said a
 * rebirth was not worth taking the moment it opens, and measured they were right: the next
 * life reached the summit 1% to 10% sooner (casual 1%, active 4%). At 5% it is 3% to 9%,
 * and the ceiling is reached by every road in about the same calendar (273 days for the
 * active cultivator ending each life on its first mark, 250 on its third, 248 on its
 * seventh), so rushing the first Dragon is no longer a dead end and is still not the best
 * road. A floor alone (5% for one to three marks) made rushing the best road; a 5% step
 * reached the ceiling in two lives of seven marks. tools/rebirth.ts sections 1b and 2.
 *
 * See tools/rebirth.ts for the measurement and docs/DRAWER.md (轉世) for the numbers.
 */
/** 轉世 Marks a life must have crossed before it may end: the first Dragon. */
export const REBIRTH_MARKS = 1;
/** 宿慧 What a life that crossed its first mark leaves, the least any ended life leaves: 5%. */
export const ECHO_FIRST = 0.05;
/** 宿慧 What each doubling of a life's marks past the first adds to the qi gathered: 2.5%. */
export const ECHO_STEP = 0.025;
/** 宿慧 The most one life can add, the first mark and three doublings (15 marks): 12.5%. */
export const ECHO_LIFE_MAX = 0.125;
/** 宿慧 The most every life together can ever add to the qi gathered: 25%. */
export const ECHO_CEILING = 0.25;
/** 世 How many lives a save may remember. Nine, as the realms are. */
export const LIVES_MAX = 9;
/**
 * 業 The workshop through a rebirth. rekaris (Discord, 2026-10-08): the crafts are a thick
 * part of the time spent and running them all again sounds exhausting. A new life begins
 * each craft with this share of the experience the life it leaves had earned in it, never
 * more than that life had, floored to whole experience. Experience only: the pouch, the
 * material, the tools and the counts of what was made begin again, so nothing carried is a
 * thing a realm's gate has not opened, and no craft level feeds the qi rate directly (the
 * rate is read from upgrades, gear and the tree, never from a craft). The table is a
 * curve, so a share is a few levels, not a fraction of them: a quarter of the experience
 * is 14 levels fewer than the life had (7 levels per halving). tools/carry.ts and
 * docs/DRAWER.md (轉世) are where it is measured. 0 is the game as it was: nothing carried.
 *
 * Measured 2026-10-08 at a quarter: the slowest craft reaches level 60, 70 and 75 about 16 to
 * 18 days sooner and the median craft starts at level 60; the second life's summit moves 0.2
 * days on average (three gear seeds), the qi rate at the same day by 0 to 3%, and a share a
 * tenth either way (22.5%, 27.5%) moves the saving smoothly and walls nothing.
 */
export const CRAFT_CARRY = 0.25;

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
 * 期 And never less than this many hours of the realm's middle rate (REALM_MID_RUNG). The
 * share above follows the quarry's own realm, so late in the climb a realm-three owl paid
 * a few hundredths of a second (6.7e5 against 4.9e7 qi a second). Measured over three
 * seeds with a harness that takes the quarry when its odds are good (realm-9 day): once a
 * day 69.0 to 65.3, casual 69.6 to 67.4, active 44.1 to 43.5, every hour 29.8 to 29.4. The
 * light hands gain most, which is who a weekly reward is for. Once a week and a lump,
 * never a rate.
 *
 * 定 Until 2026-10-05 it was four hours of the cultivator's own gathering, gear and all, so
 * putting on qi gear for the kill paid more, and so did killing it late in a realm. It is a
 * fixed sum read off the realm now, as the Platform's is (PLATFORM_HOURS): two hours of the
 * realm's middle rate. Measured with tools/platformpay.ts over eight seeds, see there.
 */
export const QUARRY_HOURS = 2;

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

/**
 * 合 The first ten pair perks. The five the sixth school makes are below them.
 *
 * 量 rekaris, on the Discord (2026-10-04): *"A class should be the best at what it's
 * supposed to be doing, otherwise it's bloat."* Measured on the same body in every class,
 * four were not: six Sword pieces carry about x1.4 the power of any Sword pair, and one
 * tower floor asks only x1.22 of the one below, so a perk worth half a floor never showed.
 * Each was moved to the least that makes it first at its own claim, at realms 6 and 9,
 * earth and heaven alike:
 *
 *   劍仙 floors 0.90 to 0.65    ties or beats pure Sword's top floor in all six cells
 *   武神 wardens 0.88 to 0.70   the widest margin over a warden (x1.06 to x1.12 Sword's)
 *   鑄劍師 material 1.15 to 2   the most 材 over a whole run (x1.12 earth, x1.37 heaven)
 *   甲匠 chest 10 to 100        the most places, past a full Artificer's doubled lines
 *
 * None of the four is read by rate(): the economic law holds.
 */
export const PAIR_TOWER = 0.65;        // 劍仙 the tower's floors count this much of themselves
export const PAIR_DRIVE = 0.75;        // 俠客 what a drive costs
export const PAIR_WARDEN = 0.70;       // 武神 a warden counts this much of itself
export const PAIR_MATERIAL = 2.0;      // 鑄劍師 材 from kills and floors
export const PAIR_SPRING = 1.5;        // 尋仙 qi from a spring in the secret realm
export const PAIR_BOUNTY = 1.5;        // 金剛 見 first sights, 期 the week's quarry and 擂 the Platform (since 2026-10-05)
export const PAIR_PILLS = 0.85;        // 丹師 what a pill costs
export const PAIR_DROP = 0.08;         // 獵王 added to a beast's chance of leaving a piece
export const PAIR_MELT = 1.3;          // 寶匠 qi from melting
export const PAIR_CHEST = 100;         // 甲匠 places in the chest
/** 法 The five pairs the sixth school makes. */
export const PAIR_DRAGON = 0.98;       // 劍聖 the tribulation's Dragon counts this much of itself
export const PAIR_TOWER_QI = 2;        // 天師 qi from a tower floor
/*
 * 天師 Why the Celestial Master's number is two (2026-10-05: 1.25, then 2.5, then 2).
 *
 * A floor pays a fixed sum that climbs steeply with the floor, so a few floors more are
 * worth far more than a quarter on each: rekaris asked whether the strongest climber would
 * out-earn the Master, and it did. tools/celestial.ts, the active cultivator told to wear
 * each class, five rolls of the dice each, the tower's qi over the whole climb:
 *
 *                     tower qi   ninth realm   top floor that day
 *   劍仙 Sword Immortal  9.51e12    day 40.7         110
 *   劍修 pure Sword      8.73e12    day 43.5         110
 *   天師 at 1.25         5.25e12    day 45.4         104   (the least of the three)
 *   天師 at 2.0          9.30e12    day 44.6
 *   天師 at 2.5          1.07e13    day 42.8         105   (the most, by an eighth)
 *   天師 at 3.0          1.44e13    day 42.5               (half again: past its claim)
 *
 * At 2.5 the Master takes the most qi out of the tower and the Sword Immortal still climbs
 * it highest and soonest: each is the best at what it says. A floor's pay is a lump, never
 * a rate, so the economic law holds; the server credits it only to a save that wears the
 * Master or keeps him as a loadout (verify.ts wearsMaster).
 *
 * 誤 Two since the same evening. The tower paid for its own next floor past floor 95, and
 * the Master's share tripled it: on rekaris's real save nine layers with no time passing,
 * three without the Master (see TOWER_PAST_DRAGON). With the floors past the Dragon's
 * standing harder, read with tools/freeclimb.ts on the ranked server's saves and on the
 * harness, and with tools/celestial.ts:
 *
 *                 most layers for nothing   tower qi (Master / Immortal)   ninth realm
 *   天師 at 2.5   3 (every hour)            —                              —
 *   天師 at 2.25  3 (every hour)            3.77e12 / 3.28e12              day 45.1
 *   天師 at 2.0   2                         3.73e12 / 3.28e12              day 45.3
 *
 * At 2 no save climbs more than two layers for nothing, and the Master still takes the
 * most qi out of the tower, by a seventh.
 */
export const PAIR_MEET = 1.5;          // 卜師 what a meeting on the road pays
export const PAIR_MEND = 0.04;         // 羅漢 health recovered every round, of the whole
export const PAIR_HERBS = 1.3;         // 陣師 what a ripe bed pays

/**
 * 劍聖 Why the Sword Saint's number is so small, and why it is the strongest perk there is.
 *
 * It was PAIR_FORM, "your form never rolls below its middle", and no value of it made the
 * class the best at anything: form is a fifth of one factor, and 鏡 Mirror rarely reads it
 * against anything stronger. Bruno chose what the class is for (2026-10-04): the Dragon.
 *
 * The Dragon is anchored. Every crossing stands the next one TRIBULATION_FOOTING above the
 * Dragon the cultivator met at even odds (evenDragon), so whatever a body is worth cancels
 * out of both sides, and six Sword pieces cross no sooner than any other body. A perk that
 * multiplied power would cancel the same way. This one is read on the Dragon's side, after
 * the anchor, and evenDragon reads the Dragon the Saint actually met, so it is counted
 * again at every crossing: it works like a lower footing for one class. That is why a
 * small number is a large effect. Measured on the active cultivator told to become each
 * class (tools/classes.ts), days to forty crossings:
 *
 *     pure Sword 244   丹師 Alchemist 224 (the fastest of the rest)
 *     劍聖 at 1.00 240   0.99 212   0.98 191   0.97 163   0.96 152   0.94 and below 138
 *
 * Below 0.97 the Saint walks over the Dragon a third of the time or more and crosses as
 * fast as the pool fills, which is a race, not a ladder. At 0.98 it leads every class by
 * a fifth (eighty crossings: 454 days against pure Sword's 551) and walks over 8 of 40
 * against 3 to 5. Stood a tenth heavier (playEndgame's `heavier`), it slows to 11 days a
 * mark and walls nothing.
 *
 * It never touches the qi rate, and the server reads it: verify.ts anchorFloor allows the
 * anchor a Saint leaves, and the new-mark check fights the Dragon in every body the save
 * holds.
 */

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

/**
 * 中 Where a realm's middle stands, for the sums read off a realm rather than off the
 * cultivator (擂 the Platform's challengers and 期 the week's quarry): REALM_MID_RUNG rungs
 * into the realm, and REALM_MID_SHORT levels of 功法 and 吐納 under the realm's cap.
 * rekaris's reference (2026-10-05): 33 levels on the fifth rung of the sixth realm.
 */
export const REALM_MID_RUNG = (LAYERS_PER_REALM - 1) / 2;
export const REALM_MID_SHORT = LEVELS_PER_REALM / 2;

/**
 * 中 The realm's middle rate: the bare gathering on its middle rung with both qi upgrades
 * REALM_MID_SHORT under the cap. No gear, no tree, no marks, no class: a number read off
 * the realm alone, so whatever pays a multiple of it pays the same to everyone in the realm.
 * It is never a rate anybody gathers at, only a measure, so it cannot raise the qi rate.
 */
export function midRate(realm: number): number {
  const r = Math.max(1, Math.min(9, Math.round(realm)));
  const growth = UPGRADE_NUMBERS.method.gain * UPGRADE_NUMBERS.pills.gain;
  return BASE_RATE * LAYER_BONUS ** ((r - 1) * LAYERS_PER_REALM + REALM_MID_RUNG)
    * growth ** (r * LEVELS_PER_REALM - REALM_MID_SHORT);
}

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
 * 壁 The walls of the nine realms: how far above the bare reference each realm's warden
 * and its last beast stand, as a multiple of it. Index 0 is the first realm.
 *
 * The reference counts the levels a realm sells and nothing else, and for a long time that
 * was the whole of a cultivator's power. It stopped being so: 道 the Path multiplies power
 * by up to three, worn gear and refining by two to seventeen, and 妖丹 cores bought past
 * the cap by up to fourteen more. Measured on 2026-10-06 (tools/walls.ts), every cultivator
 * who wears gear met each warden from the fourth realm at 98%, two to eleven hundred times
 * stronger, and won every beast in a realm with the first blow from the fifth. Combat asked
 * for nothing for fifty days, and so nothing that serves it (the furnace's pills, the
 * workshop's elixirs and sigils, refining, the arts) had anything to do.
 *
 * So the warden of each realm, and its last beast, stand where a cultivator who wears that
 * realm's gear and the Path stands at the gate, a little above: a wall, not a door. What
 * gets a cultivator over it is everything the game already sells for it, and nothing new:
 * cores condensed out of qi, the furnace's pills, an elixir and a sigil from the workshop,
 * refining, the stance and the arts. Somebody who only waits still gets over, later, by
 * the first two, which cost nothing but qi. Losing still costs nothing.
 *
 * The ninth realm's warden is the Dragon, which keeps its own anchor (tribulationPower), so
 * its entry here is 1 and nothing reads it.
 */
export const REALM_WALL: readonly number[] = [1, 1, 4, 10, 18, 28, 44, 72, 1];

/**
 * 瓶頸 How much of a warden's wall falls away with each day a cultivator stands at the gate.
 *
 * A wall nobody could get over by waiting would break the one promise the game makes, that
 * the time is never wasted. So the warden is a bottleneck in the old sense: the longer the
 * cultivator sits against it, the thinner it gets, a share of what is left each day, until
 * it stands where wardens stood before the walls. A build gets over it the day it arrives;
 * waiting gets over it too, later.
 */
export const BOTTLENECK_LOOSEN = 0.3;

/**
 * 封 How many days the gate of each realm stays sealed after its warden comes out, whatever
 * the cultivator's power. Index 0 is the first realm; only the fifth to the eighth have one.
 *
 * Bruno, 2026-10-06, announced to the players as a proposal and built the day after: the
 * walls asked something of a build, and a build carried every active cultivator through
 * them the day they arrived, so the workshop was still worth a day or two of the climb and
 * nobody needed it. The seal is the part of the gate power cannot open. Waiting it out
 * always works (nothing is ever taken from somebody for being away), and 破境丹 a
 * Breakthrough Pill carried into the gate breaks it outright, and CRAFT_KIT.pill of the
 * wall's days with it (since 2026-10-07; it counted as two days of both before).
 *
 * Measured with tools/seal.ts (2026-10-07), every habit with the workshop and without:
 * the day the ninth realm opens, before the seal and after it.
 *
 *   habit            workshop ignored       workshop used
 *   once a day       70.0  →  77.0  (+7)    72.0  →  72.0
 *   casual           64.7  →  66.3  (+1.6)  61.7  →  61.7
 *   active           45.8  →  49.3  (+3.5)  44.3  →  45.8
 *   every hour       29.0  →  32.0  (+3)    28.8  →  28.8
 *   barely fights   101.0  → 101.0          99.0  →  96.0
 *   never fights    121.0  → 121.0   (every gate already holds them 8 to 12 days)
 *
 * Whoever uses the workshop climbs at the pace they did, within a day and a half; whoever
 * fights and skips it waits out every seal, three to seven days in all; the casual
 * cultivator, who banks the waiting qi into levels, loses less than two.
 * The seal grows with the realm because a realm takes longer to climb the higher it is,
 * so the same share of a realm is more days at the eighth than at the fifth.
 *
 * 破境丹 Measured again on 2026-10-07 with the pill breaking the seal outright and half of
 * the wall's days (tools/seal.ts): every habit that fights and uses the workshop already
 * crossed every gate the day it opened, and still does (once a day 69.0, casual 61.7,
 * active 46.0, every hour 29.0); the one it moves is the crafter whose build lags the wall,
 * `barely fights`, from 97 to 93, its days at gates 5 to 8 from 4, 4, 5, 7 to 2, 2, 2, 3.
 * Whoever skips the workshop is where they were (once a day 76, casual 66, active 49.7,
 * every hour 32.1), and the pure waiter never waits on a seal (121, unchanged).
 */
export const SEAL_DAYS: readonly number[] = [0, 0, 0, 0, 1, 1.25, 1.5, 2, 0];

/**
 * 封 The seal as a bar (rekaris, Discord, 2026-10-08): it fills with time by itself, qi can
 * fill part of it again and again, and Breakthrough Pills fill the rest. Waiting alone
 * still fills the whole bar in SEAL_DAYS, and nothing here lengthens any seal.
 *
 * - SEAL_PAY_SHARE: the most of a gate's bar qi can ever fill, 40%. A sink with a ceiling,
 *   so the gate stays a gate: the cheapest honest way through still stands shut for the rest.
 * - SEAL_PAY_STEP: how much of the bar one tap fills, a tenth, so four taps reach the cap.
 * - SEAL_PAY_MINUTES: the price, in minutes of the cultivator's own gathering (standing
 *   rate, no 入定, no incense) for every hour of the bar a tap fills. It grows with the
 *   cultivator, so it is never a flat sum a late realm shrugs off, and it is paid out of
 *   qi, never into it: nothing about the bar can raise the rate.
 * - SEAL_PILL_SHARE: the most a lesser pill (made for a realm below the gate) can fill,
 *   also 40%. The pill made for the gate's own realm still breaks the whole bar at once.
 *
 * Together qi and lesser pills leave 20% of the bar to time, so a gate is never opened
 * by spending alone: 5 to 10 hours always have to pass.
 *
 * Measured on 2026-10-08 with tools/seal.ts, the day the ninth realm opens. `waits` is the
 * seal as it was (the numbers above, unchanged); `pays` puts qi into the bar before the
 * tree takes it, as often as the cap allows, at the real price (x1) and at a price half
 * as high (x0.5) and twice as high (x2), to push the number off its value. A cultivator
 * holding the gate's own pill carries it and pays nothing.
 *
 *   habit            waits    pays x1   x0.5    x2     with the workshop (any price)
 *   never fights     121.0    116.0     121.0   116.0  (no workshop)
 *   barely fights    101.0    101.0     101.0   101.0  93.0
 *   once a day        76.0     74.0      76.0    76.0  69.0
 *   casual            66.0     67.0      66.7    67.3  61.7
 *   active            49.7     47.8      47.3    48.0  46.0
 *   every hour        32.1     31.0      31.0    30.9  29.0
 *
 * Paying shortens an active climb by 1 to 2 days of 50, which is what a sink at this price
 * can honestly buy: a cultivator who spends the qi on the tree instead gets it back as
 * rate, so the casual one, who banks into levels, is a day slower for paying. The workshop
 * stays the way through (46.0 against 47.8 for the best payer), no price moves any habit
 * by more than a day and a half either side, and what each gate stood shut for stays at
 * 60% of its seal or more for everybody who carries no pill, so the gate is still a gate.
 */
export const SEAL_PAY_SHARE = 0.4;
export const SEAL_PAY_STEP = 0.1;
export const SEAL_PAY_MINUTES = 30;
export const SEAL_PILL_SHARE = 0.4;

/**
 * 精 Where each realm's last beast stands, as a multiple of the bare reference: the realm's
 * elite. It gates nothing, so it is set for the strongest builds rather than for everyone,
 * measured off the active and hourly cultivators at that realm's gate (tools/walls.ts), and
 * it never loosens. It is the hunt for whoever has built for it, paid ELITE_LOOT.
 */
export const ELITE_WALL: readonly number[] = [1, 3, 12, 30, 54, 84, 132, 216, 350];

/**
 * 精 What the last beast of a realm pays, against an ordinary one of its depth. It is the
 * hardest thing in the realm short of the gate, so it is the best place in the realm to
 * hunt, for whoever has built for it; the first beast of a realm stays the safe one.
 */
export const ELITE_LOOT = 3;

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

/**
 * 階 Luck lifts the top of the table more than the middle.
 *
 * It used to lift 玄 Mystic, 地 Earth and 天 Heaven by the same factor, and that has a
 * ceiling built in: once most drops are Mystic, more luck mostly makes *more Mystic*. The
 * cards said so the day they started saying what they do in numbers (sim/cardworth.ts):
 * 通天 Reaching Heaven, the ninth realm's luck card, moved a cultivator's Earth-or-better
 * share from 33% to 35%. Nobody takes that over three fifths more material.
 *
 * So Earth is lifted by the luck to the power 1 + LUCK_EARTH_GRADE and Heaven by 1 +
 * LUCK_HEAVEN_GRADE. Measured with the habits and the endgame (2 October): the climb
 * moves by under a day on every habit, the endgame by none, and Reaching Heaven is worth
 * +5.7 points of Earth-or-better and +3.0 of Heaven instead of +2.1 and +0.6.
 *
 * 頂 And the grading stops. The equal lift stopped itself (the shares flatten as luck
 * grows) and a graded one would not: luck has no cap, and at L = 20 a steeper grade put
 * half of all drops at Heaven. Only luck up to LUCK_GRADE_CAP is graded; past it, luck
 * lifts all three alike again, as it always did.
 */
export const LUCK_EARTH_GRADE = 0.25;
export const LUCK_HEAVEN_GRADE = 0.5;
export const LUCK_GRADE_CAP = 10;

/**
 * 造化 Once Creation makes every kill drop, chance to drop has nothing left to do, so it
 * becomes the chance of a *second* piece from the same kill, never more than
 * SECOND_DROP_CAP. rekaris, on the Discord (2026-10-03): the first answer turned it into
 * luck (+0.1 for ten points), and he found it underwhelming, rightly: every habit ends
 * the climb wearing six 天 Heaven pieces, so luck, which only picks the rank, stops
 * mattering, while more pieces feed 煉 fusion, which is where quality is made.
 * Measured on fortune-branch copies of the habits (realm-9 day; pieces found; Heaven
 * found), luck against second piece: active 41.7 / 41.7, 1776 / 2157, 200 / 206; every
 * hour 28.1 / 27.5, 6364 / 7865, 710 / 815; casual 66.7 / 66.7, 707 / 857, 72 / 95; auto
 * 35.0 / 33.3, still days behind every hour. Melting past the allowance turns the extra
 * pieces into material, never qi. The highest chance any habit reaches is about 0.32,
 * so the cap is a rail, not a lever.
 */
export const SECOND_DROP_CAP = 0.5;

/**
 * 溢 What luck does to a roll, once it has done what it can to the rank. Every habit ends
 * the climb wearing 天 Heaven (rekaris, 2026-10-03: luck "is somewhat underwhelming"),
 * and luck only ever picked the rank, so it stopped mattering exactly when it was
 * highest. Now it also lifts the band every drop rolls in by LUCK_ROLL_BEND · ln(luck),
 * never more than LUCK_ROLL_TOP: the best drop goes from 1 + VARIANCE to 1.35 of its
 * base, still under FUSE_TOP, and fusion carries the lift because it keeps an average.
 * Measured over five seeds (realm-9 day; worn primary roll against base): active 44.5 to
 * 44.4, 1.06 to 1.10; active on the fortune branch 41.3 to 41.9, 1.18 to 1.40; every
 * hour 29.8 to 29.6; auto 33.1 to 33.8. Doubled, the climb moves by 1.2 days at most,
 * and the endgame by five days in 553. It slopes rather than walls.
 */
export const LUCK_ROLL_BEND = 0.12;
export const LUCK_ROLL_TOP = 0.2;

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

/**
 * 精 絕 Two marks past 通, for one beast at a time. rekaris, on the Discord: with the
 * auto-hunt and a cheaper drive, a hundred kills is a few minutes, so the record stopped
 * too early. Each deep mark pays that beast alone: DEEP_MATERIAL more of its 材 material
 * and DEEP_DROP more chance that it leaves a piece. Never qi: nothing uncapped may raise
 * the qi rate, and kills are uncapped.
 *
 * Measured (2 October, the auto-hunt cultivator, five seeds): the climb does not move
 * (realm nine on day 36.0 before, 36.1 after), and the material hunted by day sixty rises
 * by about a quarter. By day sixty ten to thirteen beasts pass 1,000 and one passes 5,000,
 * so a third mark at 25,000 was out of reach and is left out.
 */
export const DEEP_MARKS: readonly number[] = [1000, 5000];
/**
 * 精 And every deep mark also adds this much 材 material from every beast, since
 * 2026-10-03. rekaris: *"the latest two milestones provide local bonuses, while the first
 * three are global. This means there is little reason to go back to the earlier beasts
 * and finish them."* Measured over a whole climb: only the auto-hunter earns deep marks
 * before the ninth realm (eleven by day 45), and its ninth realm moves from day 38.3 to
 * 38.2; nobody else moves. Material, never qi.
 *
 * Doubled to 1% on 2026-10-03: at half a percent a deep mark took 253 to 272 thousand
 * kills of the best beast to pay back the time spent on an old one, which nobody would
 * ever see. At 1% that is 126 to 140 thousand (the auto-hunt kills about 720 a day), a
 * collector's bonus that is felt. The pace does not move. At 2% the record's ceiling
 * passes what record.test allows (2.8 against 2.5; the most it allows is about 1.44%),
 * so 1% is where it stays. All fifty-four earned would be +54%.
 */
export const DEEP_EVERYWHERE = 0.01;
export const DEEP_MATERIAL = 0.10;
export const DEEP_DROP = 0.02;

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

/**
 * 盡 The most one "as many as your qi pays for" drive takes. It is not a price and moves
 * no curve: the price per kill is the same at any size, and a drive of this many is a
 * handful of taps of the 200 row. It is the arithmetic guard, because a drive rolls
 * every kill's drop one by one, and a summit cultivator's qi would pay for millions.
 */
export const DRIVE_MOST = 2000;

/**
 * 圍 How many pieces a drive lays out for the player to choose from: all of them. It was the
 * best sixty (2026-10-06) and rekaris asked on 2026-10-08 why only sixty, when the filters
 * are there and the drive is capped at DRIVE_MOST kills: the sixty "best" might not be the
 * sixty the player would keep. A kill leaves one piece at most, and a second with 造化
 * Creation at most SECOND_DROP_CAP of the time, so no drive can roll more than this. It
 * bounds the save too (validate reads no more than this), so it moves no curve, and it is
 * written as rows (sim/pilepack.ts) so the largest pile stays a modest save.
 */
export const DRIVE_PILE = Math.floor(DRIVE_MOST * (1 + SECOND_DROP_CAP));

/**
 * 圍 How many tiles the drive's window draws at once. The window holds every piece and the
 * filters, Select all and Clear act on all of them; only the drawing is by the page, because
 * three thousand painted tiles is a slow screen on a phone and sixty is not.
 */
export const PILE_PAGE = 60;

/**
 * 圍 How long a drive's pieces wait for an answer, in seconds. A player who never opens
 * the window, or whose drive finished while the game was shut, gets the game's own answer
 * once this has gone by: the best piece into the chest, the rest left. A day, so that
 * coming back the next morning still finds the window open.
 */
export const PILE_HOLD = 86_400;

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
 * They are the deepest rooms in the game, so 深 springShare gives them the most, and the
 * gate ramp already runs out of your own realm and into the one above: the deeper gates
 * are the strongest things the realm above has. A cultivator who opens the door at the
 * seventh realm and walks all eleven has done something a sixth-realm cultivator could
 * not.
 */
export const DEEP_ROOMS = 11;

/** How long after a run before the door opens again, in seconds. */
export const DOOR_GAP = 8 * 3600;

/**
 * 泉 What the vault's spring gathers, as a share of standing gathering, for every second its
 * door stands shut: four minutes an hour. It replaced SPRING_MINUTES and ROOM_DEPTH on
 * 2026-10-04, when a spring was a fixed four to fourteen minutes in one room and the run,
 * once the shrine's 道 was spent, was two doors that both said "qi".
 *
 * Measured with tools/habits.ts, the whole vault (drunk and burned, see INCENSE_WORTH) is
 * 5 to 9% of a run for a daily walker, about the cave's share, which was the target; the
 * old spring and the shrine's overflow were 1 to 4%. One run a day and three a day draw on
 * the same spring, so the door gap, 鑰 the Realm Key and 秘門 the Hidden Door Array no
 * longer multiply the qi: they bring the 道, the gear, the boxes and the trails sooner.
 * At three minutes an hour the climb would be close to where it was before.
 */
export const SPRING_FILL = 4 / 60;
/** 泉 The most shut time the spring holds: a day. It waits full, it never empties itself. */
export const SPRING_HOLD = 24 * 3600;
/**
 * 深 The share of the spring reward room k of n holds (k from 0): deeper is more. In seven
 * rooms the four reward rooms take 10, 20, 30 and 40%; in eleven, six rooms share it.
 */
export const springShare = (k: number, n: number): number => (k + 1) / ((n * (n + 1)) / 2);
/**
 * 香 What burning a room's share as incense adds to standing gathering while it burns, and
 * what a stick is worth against drinking the same share: half as much again, slowly. It is
 * added to the standing rate only (never multiplied by 入定 sitting), one burner holds at
 * most INCENSE_HOLD of burning, and every stick is bounded by the spring, which is bounded
 * by time, so it can never be stacked into a standing raise: at most about eleven hours of
 * +30% a day if every room is burned.
 */
export const INCENSE_BONUS = 0.3;
export const INCENSE_WORTH = 1.5;
/** 香 The most burning time that can stand queued behind the burner. */
export const INCENSE_HOLD = 24 * 3600;
/**
 * 匣 Hours of the paths and of the veins a craftsman's box holds, for every reward room
 * deeper than the first: the realm's herbs and ore at the craft's own pace, with no
 * experience. Herbs and ore take only time, so the box hands a non-hunter nothing a hunter
 * is walled behind: no beast part, no 材.
 */
export const BOX_HOURS = 1;
/** 跡 The share of its health the next 擂台 challenger has already lost when a trail was taken. */
export const TRAIL_WOUND = 0.1;

/**
 * 擂台 The Platform: three challengers a period, measured against the cultivator's own 力.
 *
 * A period is a week of the 期 calendar, and a breakthrough starts a new one. Each
 * challenger stands at its edge of the cultivator's own power and is thinned like a beast
 * (破甲 sunder, 破煞 bane, the tree's weakness, the classes), so the build is what wins,
 * not 力. The dice are set for the period, so pressing again with nothing changed loses
 * again: measured with the design harness, the third challenger falls in 15 to 60% of
 * weeks for somebody who builds, not "eventually, by tapping". With a free reroll every
 * builder took all three every week, which is why the dice are set.
 *
 * A win pays hours of gathering without gear (towerRate), so clothes cannot move the pay
 * and the card can say it before the fight: about 3 to 6% of a run for anybody who
 * builds, under the tower.
 */
export const PLATFORM_EDGE = [1.3, 1.8, 2.5] as const;
/**
 * 擂 How much each challenger's edge grows with every realm past the Platform's first:
 * edge × (1 + PLATFORM_EDGE_GROWTH × (realm − PLATFORM_REALM)), read by platformEdge in
 * sim/platform.ts, so ×1.0 at the fourth realm and ×1.2 at the ninth.
 *
 * The edge is a share of the cultivator's own 力, and the cheaper a body's power is to
 * raise, the smaller the challenger it brings: measured on 2026-10-07 (tools/platformedge.ts)
 * the third challenger fell in none of the weeks spent in realms 4 to 6 and in 22 to 88%
 * of those in realms 7 to 9, so the same fight got easier the higher the climb went. An
 * earlier analysis proposed 0.04: the third challenger in about 10% of weeks with nothing
 * carried and 20% for the Vajra, the second in 81 to 83%, the ninth realm 0.7 days later.
 * Measured with it (tools/platformedge.ts, the share of Platform periods each challenger
 * fell, and the ninth realm's day), the flat edge against the grown one:
 *
 *   habit            realm 9         2nd           3rd          3rd in realms 7 to 9
 *   once a day       77.0 → 76.0     88% → 82%     24% →  0%    44% →  0%
 *   casual           66.3 → 66.0     82% → 53%     12% →  0%    22% →  0%
 *   active           49.3 → 49.7     86% → 86%     29% →  7%    50% → 13%
 *   every hour       32.0 → 32.1     91% → 91%     45% → 27%    83% → 50%
 *   crafts it all    45.8 → 46.0     86% → 86%     29% →  0%    50% →  0%
 *   active Vajra     47.5 → 46.7     86% → 77%     50% → 23%    88% → 43%
 *
 * The third challenger is the hard one again late in the climb as it is early, the most
 * active build takes it in about a quarter of its weeks and the Vajra, whose class is
 * the Platform's, twice as often as the plain active one. The climb does not move: the
 * Platform pays qi beside it, never the ladder itself.
 */
export const PLATFORM_EDGE_GROWTH = 0.04;
/**
 * 擂 What each challenger pays, once a period: this many hours of the realm's middle rate
 * (REALM_MID_RUNG), a fixed sum read off the realm and the same for everyone in it.
 *
 * 定 Until 2026-10-05 it was 2, 4 and 6 hours of the cultivator's own bare rate (towerRate:
 * levels, layers, the tree, the marks), so the same challenger in the same realm paid
 * several times more to whoever bought rate first and fought late in the realm (x7.7 from
 * the first rung with the last realm's caps to the last rung with this one's). rekaris
 * asked for a fixed pay read off the realm, as the tower's floors now pay. Halved with it,
 * because the middle of the realm stands above where most bouts were fought.
 *
 * Measured with tools/platformpay.ts over eight seeds (991, 7, 13, 29, 41, 57, 83, 101),
 * this and QUARRY_HOURS together: the ninth realm's day, and the share of all qi each paid.
 *
 *                    day 9 before  after     Platform before  after    quarry before  after
 *   barely fights        92.8      93.0           1.0%        0.9%         2.4%       1.8%
 *   once a day           71.3      70.0           5.4%        5.0%         2.1%       1.3%
 *   casual               63.0      62.1           4.6%        2.6%         1.9%       0.8%
 *   active               43.4      43.4           2.9%        2.8%         1.0%       0.5%
 *   every hour           27.1      27.8           3.1%        2.1%         1.0%       0.3%
 *   drives it all        44.2      44.5           3.1%        2.9%         1.0%       0.5%
 *   walks 神             46.3      46.0           5.8%        3.3%         2.1%       0.8%
 *   crafts it all        43.6      43.8           2.6%        2.7%         0.9%       0.5%
 *   runs auto            29.0      30.4           3.9%        2.4%         1.4%       0.4%
 *
 * The Platform alone moved no habit by more than 0.7 of a day; the quarry's two hours
 * moved them from 1.3 sooner (once a day) to 1.4 later (runs auto). Every challenger and
 * every quarry now pays exactly its reference, and waiting inside a realm buys x1.00.
 */
export const PLATFORM_HOURS = [1, 2, 3] as const;
/** 擂 What an unanswered temper adds to the challenger. */
export const TEMPER_EDGE = 1.3;
/** 擂 The realm the Platform opens in (and its line in sim/unlocks.ts SYSTEMS). */
export const PLATFORM_REALM = 4;

/** 龕 A shrine pays this many 道 points, and the deep one in the last room of a path pays more. */
export const SHRINE_POINTS = 1;
export const SHRINE_DEEP_POINTS = 2;
/**
 * 龕 But only this many 道 points from shrines for each realm reached; past it a shrine
 * pays like a spring. Measured (2026-10-03): with no cap, shrines paid 816 of the 902
 * points an active cultivator earned over a climb, against a tree that can take 61, so
 * the whole tree, capstones and all, was bought by day 5 (day 3 for the hourly hand) and
 * 道 was dead money for the rest of the game. At three a realm a whole climb's shrines pay
 * 27, the tree fills around day 12 (active) to day 27 (once a day), and the ninth realm
 * does not slow for anybody, because a capped shrine still pays.
 */
export const SHRINE_DAO_PER_REALM = 3;

/**
 * 極 The realm the last node of each branch waits for: 萬劍 Ten Thousand Swords, 化境
 * Transcendence and 造化 Creation. Measured the same day: all three were bought on the
 * second day, the tree finished before it had been read. Gated at the sixth, they arrive
 * between day 8 (the hourly hand) and day 24 (once a day), and the ninth realm moves by
 * under a day for every habit. A capstone already taken is kept: this only decides when
 * one can be bought. It is a rule of the tree rather than a system of its own, because
 * the realm it waits for already opens two things and the ladder hands over two at most.
 *
 * Moved to the fifth on 2026-10-03, when testers said the sixth kept the tree's best
 * nodes out of reach for too much of the climb. Measured over a whole climb (capstone day,
 * then the ninth realm): active 11.7 and 41.5 at the sixth against 8.2 and 42.3 at the
 * fifth; once a day 21 and 63 against 14 and 64; every hour 7.8 and 28 against 5.3 and
 * 28.4; never fights 37 against 19. The ninth realm moves by under a day for everybody,
 * points never hold the branch back (it is affordable from day one to nine), and the
 * capstone waits through 17 to 22% of the climb instead of 28 to 33%.
 */
export const CAPSTONE_REALM = 5;

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
 * (weeks 10 and 13: a heaven came every ten or eleven days then, and a week is seven;
 * measured again on 2026-10-03 the first nine heavens take 141 days, about 15.7 each). It is
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
 * and familiarity take up to two thirds off that at the end (two fifths from the tool and
 * the deepest array, the rest from the marks and a craft mastered; three quarters in
 * Forging, whose 160 recipes master furthest); the realm gate adds much of it back,
 * because the best recipes wait for the realm their material comes from.
 */
export const CRAFT_HOURS_TO_CAP = 1550;

/** 時 Seconds one action takes, before tools and arrays, per craft. */
export const CRAFT_SECONDS: Readonly<Record<string, number>> = {
  herb: 6, vein: 7, render: 5, alchemy: 8, forge: 12, sigil: 8, array: 40,
};

/**
 * 丹符 How many times heavier a pill or a sigil is than the recipe it was: its own time at
 * the furnace or the desk and every herb, ore and part it asks for, multiplied together,
 * so the share of a make spent gathering stays what it was.
 *
 * rekaris, on the Discord (2026-10-05): *"If pills and sigils are as cheap as they are,
 * there is no reason not to have them for every single fight. Increase their requirements
 * manifold, so each pill and sigil requires considerable time (at least an hour a piece)
 * and is a proper investment. This would also require increasing the experience the
 * recipe grants, otherwise leveling it will take months."* A Mending pill was 8 seconds at
 * the furnace, two herbs and a part: 25 seconds of work. At 180 it is 24 minutes at the
 * furnace, 360 herbs and 180 parts: 75 minutes with no tool, 52 to 71 with the tools a
 * cultivator can have forged by the pill's realm. A sigil is 63 to 135, 60 to 99 tooled
 * (tools/kitwork.ts reads every recipe; 150 left the late pills at 44 minutes tooled,
 * under the hour asked for). The experience follows the seconds (data/crafts.ts solves
 * it from CRAFT_HOURS_TO_CAP), so a make pays 180 times what it did and the hours to 99
 * are the hours they were. The familiarity marks count a heavy make as 180 light ones
 * (Recipe.marks), so a mark still takes the hours it did, and the third mark takes 180
 * off the first thing rather than one.
 *
 * Measured over a whole climb with the crafter (2026-10-05, `crafts it all`, day 50):
 * pills and sigils made 134,102 before and 1,047 after; Alchemy 67 to 70 and Sigil
 * Writing 57 to 61, the seven crafts added up 467 to 461, as the herbs they now eat level
 * the gathering. The ninth realm on day 44.0 before and after; every other habit unmoved,
 * since only it crafts.
 */
export const CRAFT_KIT_WORK = 180;

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

/**
 * 開 The level of a first craft that opens the late craft it feeds before that craft's
 * realm does: Alchemy at Herb Gathering 40, Sigil Writing at Vein Delving 40, Arrays at
 * Forging 40 (sim/crafts.ts, FEEDER). Each recipe still waits for its own realm, so an
 * early craft opens with its first recipes and nothing a realm has not reached.
 *
 * rekaris and others on the Discord: a crafter who loved the workshop waited a fortnight
 * to a month for the craft they wanted. Measured over a whole climb (feeder at 40 against
 * the realm gate, in days): active 3.8, 3.7 and 4.3 against 8.3, 11.2 and 20.5; once a
 * day 14, 5 and 9 against 14, 20 and 33. The climb is identical either way, because the
 * kit only goes into a warden, a demon or a vault gate.
 */
export const CRAFT_FEED_LEVEL = 40;

/** 具 How much faster each step of a craft's tool makes it: six metals, 5% each. */
export const CRAFT_TOOL_STEP = 0.05;
export const CRAFT_TOOL_STEPS = 6;

/**
 * 熟 Familiarity: how many times a recipe has to be made for each of its five marks. The
 * first comes in an afternoon, the last in weeks of making the one thing.
 */
export const CRAFT_MARKS = [25, 100, 300, 800, 2000] as const;
/**
 * 熟 What the marks give. The first: this much faster. The second: this chance a make
 * comes out twice, for a recipe that makes a thing for the pouch; gear, a tool and an
 * array are made once, so for them the second mark is CRAFT_MARK_SUB faster instead.
 * The third (one less of the first thing it needs), the fourth (better odds of a high
 * rank) and the fifth (never Common) stay where they do something. Where one would do
 * nothing, because the recipe needs only one of its first thing or makes nothing with a
 * rank, it gives CRAFT_MARK_SUB more chance of two for a recipe that doubles and
 * CRAFT_MARK_SUB faster for the rest, so every mark on every recipe gives something.
 *
 * rekaris, on the Discord (2026-10-03): the marks were too small to notice, and three of
 * them did nothing for most recipes. Doubled from 5% and filled in on 2026-10-03.
 * Measured over a whole climb with the crafter (its whole ladder against the same
 * cultivator without the workshop): active 49.5 against 50.7, once a day 78 against 79,
 * where they were 49.5 against 51.5 and 78 against 77. The workshop stays a road beside
 * the climb and never up it.
 */
export const CRAFT_MARK_FASTER = 0.10;
export const CRAFT_MARK_TWICE = 0.10;
export const CRAFT_MARK_SUB = 0.10;

/**
 * 熟 Mastery of a whole craft: every recipe of it made CRAFT_MARKS' last count of times
 * (all five marks) makes that whole craft faster. A reason to finish recipes that are not
 * the best one any more. Never qi. Measured over a whole climb, counted per craft: the
 * strong crafter masters its first herb recipe on its first day and ends the climb with 2
 * to 16 recipes a craft; once a day ends with 0 to 7. Counted across all seven crafts
 * instead, fifteen recipes came by day 5.5, which made it a flat bonus rather than
 * something a craft earns.
 *
 * 無頂 It used to stop dead at fifteen recipes and 15%. rekaris, on the Discord
 * (2026-10-05): *"slapping on a hard limit is a needless frustration"*. So there is no
 * stop: the first CRAFT_MASTERY_BAND recipes give CRAFT_MASTERY_SPEED each, as they always
 * did, and every band of that many after it gives each recipe half what the band before
 * did. Every recipe mastered always adds something, and the sum can never pass twice the
 * first band, CRAFT_MASTERY_BOUND: 30%. A plain half a percent each after fifteen would
 * have been 87% in Forging, which has 160 recipes. What each craft can reach with every
 * recipe it has: Herb Gathering, Vein Delving 11%, Sigil Writing and Arrays 9%, Alchemy
 * 22.5%, Rendering 24%, Forging 30% less a hair. `XP_PER_SECOND_MAX` in sim/crafts.ts is
 * read at each craft's own most, so 驗 the server always allows for it.
 */
export const CRAFT_MASTERY_SPEED = 0.01;
export const CRAFT_MASTERY_BAND = 15;
export const CRAFT_MASTERY_BOUND = 2 * CRAFT_MASTERY_BAND * CRAFT_MASTERY_SPEED;

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
 * 陣 How many times heavier an array is than the recipe it was: its seconds on the cave
 * floor and every metal, stone and part it asks for, multiplied together, the way a pill
 * and a sigil were made heavy (CRAFT_KIT_WORK).
 *
 * speculaether, on the Discord (2026-10-05): *"Making multiple arrays is needed to level up
 * array-making but doesn't do anything"*, and rekaris agreed. An array was 40 seconds on
 * the floor and two to five minutes with its metals and stone: levelling the craft meant
 * cutting thousands of copies that did nothing. At 30 the first array, Dew-Catching, is
 * 55 minutes with no tool and 52 with the tools of its realm, and the last, Heaven-Earth,
 * 145 and 102 (77 on average, tooled): the late ones ask for more metal, stone and parts,
 * and do more. 25 would have left the first two under fifty minutes.
 * tools/kitwork.ts reads every one (arrayWork). The experience follows the seconds, as it
 * does for a pill (data/crafts.ts solves it from CRAFT_HOURS_TO_CAP), so the hours to 99
 * are the hours they were, and the marks count a heavy make as 30 light ones.
 */
export const CRAFT_ARRAY_WORK = 30;

/**
 * 深 Depth: what a second copy of an array is for. Every CRAFT_ARRAY_DEPTH_EVERY copies of
 * the same array ever cut deepen it one step, up to CRAFT_ARRAY_DEPTH_STEPS, and at full
 * depth its effect is CRAFT_ARRAY_DEPTH_TOP times what it was: Dew-Catching 10% faster
 * becomes 15%, the Hidden Door half an hour sooner becomes 45 minutes, the Guardian's 5%
 * becomes 7.5%. Each step is a tenth of the effect, so the first copies after the first
 * count as much as the last.
 *
 * Capped, like everything an array does: the deepest Fire-Taming is a fifth faster at the
 * furnace and the anvil, never more, and nothing an array does touches the qi rate. Fifty
 * copies at an hour or more each is weeks of a workshop's evenings, so depth is the long
 * goal of the craft rather than a thing it gets on the way. 驗 the server reads the
 * deepest step wherever it reads an array (the vault door, the Guardian, the experience a
 * second), since a save names its own copies and the deepest is the most it can be.
 */
export const CRAFT_ARRAY_DEPTH_EVERY = 10;
export const CRAFT_ARRAY_DEPTH_STEPS = 5;
export const CRAFT_ARRAY_DEPTH_TOP = 1.5;

/**
 * 戰 What a carried elixir or sigil does in a fight. They are carried into the next
 * fight that is a warden, a heart demon or a beast of the vault, and spent only if it is
 * won: a lost fight keeps them, because a lost fight costs nothing.
 *
 * 劫 The Dragon, since 2026-10-08, but only at DRAGON_KIT_SHARE of itself (below). It is
 * anchored to the power that faced it, so anything that carried a cultivator over it would
 * be a lever on the endgame, and the share is how large a lever the endgame can bear.
 *
 * 塔 The tower, since 2026-10-05, when the climber chooses it on the floor's card. rekaris:
 * *"Pills and Sigils provide combat edge that has no use right now. All combat challenges
 * are trivial except the tower, where these cannot be used."* It was shut because a floor
 * pays qi, and it opened once a pill cost an hour (CRAFT_KIT_WORK): a floor falls once, so
 * what a kit buys there is a few floors sooner, each paid for with an hour at the furnace.
 * Measured with tools/towerkit.ts, every climbing habit every three days, the highest floor
 * at the harness's odds of 0.65 with nothing carried against the best pairing the realm
 * allows: up to 4 or 5 floors more at Common rank and 5 or 6 at Heaven, 1.9 to 2.2 on
 * average, about 4% of the floor reached. Before the ninth realm it is a floor or two
 * (縛 Binding, 力 Might, 五雷 Five Thunders), and the most is 九轉 the Nine-Turn Pill at the
 * ninth with a Heaven Seal Sigil: four or five floors. No pairing is a win past the build,
 * so nothing is left out. `crafts it all`, which takes them up only for a floor that will
 * not fall without them, reaches the ninth realm on day 44.0 either way.
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
  // 破境 Days of a warden's bottleneck each thing carried breaks (see BOTTLENECK_LOOSEN):
  // an elixir and a sigil at Heaven rank break 3.5 days, which takes a fresh wall to a
  // third of itself. This is what a crafter makes the walls with, rather than waits.
  breach: 1,
  // 破境丹 The share of its gate's whole 瓶頸 bottleneck a Breakthrough Pill made for the
  // realm breaks at Common rank, in days: half of the days a fresh wall takes to loosen (4
  // of 8 at the fifth realm, 6 of 12 at the eighth). A finer rank breaks more, leaving
  // (1 − pill) to the power of its CRAFT_QUALITY_MULT: 50% at Common, 70% at Heaven. It
  // also breaks the gate's 封 seal outright (see SEAL_DAYS).
  //
  // rekaris, 2026-10-07, in the workshop thread: "every system that makes you wait must have
  // a tool that removes the wait", and the elixir and the sigil took 2 of the 12 days of the
  // eighth realm's wall. The pill used to count as two days (3.5 at Heaven) of the seal and
  // of the wall, which read as "a day shorter" rather than a pill that breaks a gate. Read
  // off the whole wall, it scales with the realm, and since nobody waits at a gate longer
  // than its whole wall, it takes at least half of anybody's wait there (sealgate.test).
  pill: 0.5,
} as const;

/**
 * 劫 What a carried elixir and sigil are worth against the Dragon of the tribulation, as a
 * share of what they do everywhere else. rekaris (Discord, 2026-10-07): "every tool given
 * to the player should be used in any place where it makes sense, unless it breaks or
 * trivializes it. ... you could make the pills less effective against the dragon, but still
 * a significant boost to one's fight."
 *
 * Every effect is thinned toward nothing by this share (thinKit in sim/crafts.ts): a strike
 * of 1.53 counts as 1 + 0.53 · share, a blow taken at 0.74 as 1 - 0.26 · share, mending and
 * reflection are multiplied by it, a Binding Sigil turns aside that share of the first blow,
 * and a Nine-Turn Pill mends that share of the way back to full. No Guardian Array (it is not
 * carried), and no 破境 breach or Breakthrough Pill, which are the gate's. The Dragon's
 * even-odds reading (evenDragon) stays bare, so a kit is a head start at every crossing and
 * never ratchets the anchor, and the server reads the same kit (bestKit 'dragon').
 *
 * 1 BECAUSE THE TOOLS SHOULD COUNT (Bruno, 2026-10-08, on rekaris's case: building tools
 * only to be told they cannot be used is not fun, and no Dragon re-set keeps the others
 * whole). Measured with tools/endgame.ts (kitClock: the cultivator made a crafter at the
 * top, Alchemy and Sigil Writing at 99 and the best of every elixir and sigil in the pouch
 * at Heaven rank, played twice), days to forty crossings and how much sooner the kit makes
 * them, by the share of the kit that counts:
 *
 *     share     0     .003   .005   .01    .015   .02    .03    .1     .3     1
 *     active    231   223    218    217    206    190    172    153    128    118
 *     sooner    -     3.5%   5.6%   6.1%   10.8%  17.7%  25.5%  34%    45%    49%
 *
 * At 1 the crafter is on the floor the thunder pool sets (about three days a mark, 118 days
 * to forty, 200 to eighty instead of 503), and nobody else moves: a cultivator who never
 * opened the workshop carries nothing and reads 0 at every share. The Dragon itself is left
 * as it was, because every re-set that held the crafter where he was made the others 40% to
 * 85% slower (docs/DRAWER.md, 丹 Elixirs and sigils at the Dragon). The wall past eighty
 * crossings is the same for everyone; the crafter only reaches it sooner. Set it lower to
 * give the tools less of a say, and nothing else has to change.
 */
export const DRAGON_KIT_SHARE = 1;

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

/* ── 百煉 The Hundredfold sets and 譜 the codex ─────────────────────────────── */

/**
 * 百煉 A Hundredfold piece: one of its realm's set, made only at the forge, whose every line
 * is chosen by what goes into the crucible (sim/hundred.ts). Designed and measured on
 * 2026-10-06 and put to the testers before it was built: a goal for the long road, never
 * a shortcut. Every number below is read by tools/hundredfold.ts, which plays the crafter
 * on past the summit and prints the day each set is finished at each rank.
 *
 * 時 A piece is twenty minutes at the anvil before tools, arrays and familiarity.
 *
 * It was three hours until 2026-10-07. rekaris, in the workshop thread: no system should
 * make a player wait without a tool that removes the wait, and a piece should take about
 * five minutes. Bruno: remove the forced waiting, keep the progression in materials and in
 * Forging levels, so a set is a goal gathered for and not a timer watched.
 *
 * Measured with tools/hundredfold.ts, the day each set is first finished at Heaven, forge
 * first / crafts kept level:
 *
 *   set            three hours        twenty minutes
 *   凡鐵 Mortal Iron   15.5 / 15.8        15.5 / 11.7
 *   古銅 Elder Bronze  19.8 / 21.0        23.2 / 37.7
 *   霜銀 Frostsilver   25.8 / 26.7        49.8 / 60.0
 *   碧玉 Jadewater     39.3 / 43.5        67.3 / 101.8
 *   落星 Fallen Star  114.2 / 158.5      115.2 / 176.5
 *
 * Slower, not faster: a three-hour piece was the forge's best experience, so the forge
 * reached level 60 on day 17 and now reaches it on day 44, and the Forging level a rank asks
 * is what holds a set back. It lands where the announcement put the long road (Jadewater
 * around day 84, Fallen Star around 170). The materials were measured too and left as they
 * were: five times the ingots and parts moved no set by a day for the crafter who levels
 * the forge first, and at half as much again the crafter who keeps every craft level no
 * longer finished Fallen Star at Heaven within six months.
 */
export const HUNDRED_SECONDS = 20 * 60;

/**
 * 級 The Forging level each rank asks for, above the first level of its realm's metal
 * (tierLevel in data/crafts.ts): Mystic 8 above it, Earth 16, Heaven 28. Never past 98
 * for Earth and 99 for Heaven, so the last two sets ask for the craft's very top.
 * Heaven also asks HUNDRED_HEAVEN_MADE pieces of the same set already made.
 */
export const HUNDRED_LEVEL = { mystic: 8, earth: 16, heaven: 28 } as const;
export const HUNDRED_LEVEL_TOP = { mystic: 97, earth: 98, heaven: 99 } as const;
export const HUNDRED_HEAVEN_MADE = 5;

/**
 * 爐 What one piece costs before the crucible: two of its realm's ingots for each portion of
 * the main line, two parts of the realm's 霸 elite (so the elite has to have fallen ten
 * times for Rendering to know it) and one of its warden. In the first realm, which has no
 * elite, the warden gives all three.
 */
export const HUNDRED_INGOTS = 2;
export const HUNDRED_ELITE_PARTS = 2;
export const HUNDRED_WARDEN_PARTS = 1;

/**
 * 爐 A portion of a crucible material is this many of it for each realm of the set: three
 * in the first realm, twenty-seven in the ninth. One, two or three portions put the line
 * at the bottom, the middle or the top of the band a drop rolls in (1 ± VARIANCE), and
 * never past it: a forged line is never better than the best line a drop could roll,
 * which is what keeps the economic law (see HUNDRED_BAND).
 */
export const HUNDRED_PORTION = 3;

/**
 * 律 Where one, two and three portions put a line, as a share of its base: the bottom, the
 * middle and the top of the band every drop rolls in. The top is 1 + VARIANCE, under the
 * best a lucky drop reaches (LUCK_ROLL_TOP) and under FUSE_TOP. A forged 氣 line is read
 * through the same gear bend (gearQiRate) as any other, so a forged set can never raise
 * the qi rate past what a dropped one could.
 */
export const HUNDRED_BAND: readonly [number, number, number] = [1 - VARIANCE, 1, 1 + VARIANCE];

/**
 * 百煉 The Hundredfold steps, for Hundredfold pieces of one set worn together: at two,
 * every elixir and sigil carried does HUNDRED_KIT more (a quarter); at four, each thing
 * carried into a warden breaks HUNDRED_BREACH day more of its 瓶頸 bottleneck; at six, the
 * set's codex bonus counts CODEX_WORN times.
 */
export const HUNDRED_KIT = 0.25;
export const HUNDRED_BREACH = 1;
export const HUNDRED_STEPS = [2, 4, 6] as const;

/**
 * 譜 The codex: finish a set once, all six places made at a rank, and it leaves a bonus for
 * good, each set on a different part of the game so no set is ever spare. CODEX_STEP is
 * the bonus at Mystic; Earth is CODEX_RANK[1] times it and Heaven CODEX_RANK[2]; the whole
 * set worn doubles it again (CODEX_WORN). None of them touches the qi rate.
 *
 *   hunt      凡鐵 more material from every kill
 *   elite     枯骨 elites stand weaker
 *   vault     古銅 the vault's gates stand weaker
 *   demon     霜銀 the heart demon stands weaker
 *   work      碧玉 the workshop works faster
 *   bond      落星 more bond for every win
 *   gates     雷紋 days more of a bottleneck each thing carried breaks
 *   tower     龍骸 tower floors stand weaker
 *   platform  仙蛻 Platform challengers stand weaker
 */
export const CODEX_STEP = {
  hunt: 0.05, elite: 0.08, vault: 0.08, demon: 0.05, work: 0.05,
  bond: 0.10, gates: 0.5, tower: 0.05, platform: 0.05,
} as const;
export const CODEX_RANK: readonly [number, number, number] = [1, 1.5, 2];
export const CODEX_WORN = 2;

/**
 * 頂 The most each codex bonus can ever be, whatever the rank and whatever is worn. Where
 * nothing is a fight (material, the workshop, the bond, the bottleneck days) it is the full
 * Heaven worn whole. A bonus that thins a fight stops at half again its Heaven value: the
 * odds of a fight are steep near even, and measured with tools/hundredfold.ts (2026-10-07)
 * the doubled 32% turned an elite at 32% odds into 98% and the heart demon of a body with
 * no arts from 29% into 98%. At 24% and 15%, read on every second day of six months of the
 * set-chaser, the most a codex moved a fight was an elite won one time in three made 93%
 * (Withered Bone at Heaven, 16%) and a floor at 51% made 93% (Dragonwake at its cap); no
 * fight lost three times in four was ever made a likely win, and the endgame clock moved
 * 1% (tools/hundredfold.ts).
 */
export const CODEX_CAP = {
  hunt: 0.2, elite: 0.24, vault: 0.24, demon: 0.15, work: 0.2,
  bond: 0.4, gates: 2, tower: 0.15, platform: 0.15,
} as const;
