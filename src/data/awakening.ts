/**
 * 悟道 The three cards at a breakthrough, and the one you keep.
 *
 * Bruno, after a morning of the early game getting faster: *"sem sistemas de conteúdo,
 * sinto que é tudo muito superficial e vazio."* He was right, and the shape of the
 * problem is that everything the game asks of a player is a number going up. 材 buys
 * 妖丹 and 煉器, qi buys the ladder, and nobody's cultivator is different from anybody
 * else's.
 *
 * 道 The tree is the nearest thing the game already has and it is not the same, because
 * its points accumulate: given enough days everybody owns most of it, so it ends up a
 * checklist rather than a build. A card taken at a breakthrough is **two doors closed**.
 * Eight breakthroughs, eight choices, twenty-four cards, and no two climbs alike.
 *
 * 律 What a card may do, and what it may never do.
 *
 * The standing law is that nothing uncapped may ever raise the qi rate, so no card
 * touches gathering. They pay material, drops, chest room, melting, refining and 道
 * points, which are all things the tree and the gear already pay, so each one has
 * exactly one place to plug into and the measuring harnesses can see all of them.
 *
 * 力 And no card pays power, which the first version of this table did.
 *
 * Measured, five power cards compounded to 3.5x and the pure idler reached the ninth
 * realm on day 121 instead of 171, while every cultivator who actually plays moved by
 * less than a day: they are gated by qi and the idler is gated by power. The repo's own
 * wall rule caught it, which is what it is for. Halving the numbers did not fix it
 * either, because the shape was wrong and not the size.
 *
 * So every card pays for **being there**. Material needs kills, drops need kills,
 * melting needs drops, refining needs material. A cultivator who never opens the app
 * gets nothing from any of them, which is the same deal the rest of the game offers.
 */

/** What a card does. One effect each, so a card fits on a card. */
export type Effect =
  /** 材 More material off every beast, as a fraction. */
  | { kind: 'material'; percent: number }
  /** 器 A better chance that a common drops anything at all. */
  | { kind: 'drop'; percent: number }
  /** 階 The rare end of the drop table, weighted up. */
  | { kind: 'luck'; weight: number }
  /** 拆 More qi out of melting. */
  | { kind: 'salvage'; percent: number }
  /** 煉器 Refine levels cost less material. */
  | { kind: 'refine'; percent: number }
  /** 藏 More room in the chest. */
  | { kind: 'chest'; slots: number }
  /** 道 Points, handed over once and for good. */
  | { kind: 'dao'; points: number }
  /** 丹 Every pill asks less 材 material. See HEAVEN_CARDS for why the endgame needed it. */
  | { kind: 'pill'; percent: number }
  /** 塔 A floor of the Endless Tower pays more 材 material. */
  | { kind: 'tower'; percent: number };

export interface Card {
  /** Stored in the save, so it never changes once it has shipped. */
  readonly key: string;
  readonly han: string;
  readonly name: string;
  readonly icon: string;
  readonly effect: Effect;
  /** The one line the card says for itself. */
  readonly says: string;
}

/**
 * The trios, in the order they are offered.
 *
 * Index 0 is the choice made on reaching the second realm, index 7 on reaching the
 * ninth. Every trio holds three different kinds of effect on purpose: a choice between
 * +25% and +30% of the same thing is arithmetic, not a decision.
 *
 * 譯 None of these characters is a 道 node's, checked by hand and by a test, because a
 * player meeting 明心 on a card and 明心 on the tree would reasonably think they were
 * the same thing.
 */
export const AWAKENINGS: readonly (readonly Card[])[] = [
  [
    { key: 'feast', han: '血食', name: 'Blood Feast', icon: 'boar-tusks',
      effect: { kind: 'material', percent: 0.25 },
      says: 'Every beast gives a quarter more 材 material, for the rest of the climb.' },
    { key: 'pack', han: '負笈', name: 'The Pack', icon: 'wing-cloak',
      effect: { kind: 'chest', slots: 6 },
      says: 'Six more places in the chest. Fewer pieces thrown away unlooked at.' },
    { key: 'insight', han: '頓悟', name: 'Sudden Insight', icon: 'meditation',
      effect: { kind: 'dao', points: 2 },
      says: 'Two 道 points, now. The tree is where a climb becomes a build.' },
  ],
  [
    { key: 'wolf', han: '貪狼', name: 'Greedy Wolf', icon: 'wolf-head',
      effect: { kind: 'salvage', percent: 0.50 },
      says: 'Melting gives half as much qi again. What you throw away pays better.' },
    { key: 'heat', han: '火候', name: 'Heat Control', icon: 'cauldron',
      effect: { kind: 'refine', percent: 0.20 },
      says: '煉器 Refining costs a fifth less, at every level, for ever.' },
    { key: 'everywhere', han: '遍野', name: 'Everywhere', icon: 'sparkles',
      effect: { kind: 'drop', percent: 0.10 },
      says: 'Beasts drop something far more often.' },
  ],
  [
    { key: 'slaughter', han: '屠戮', name: 'Slaughter', icon: 'crescent-blade',
      effect: { kind: 'material', percent: 0.30 },
      says: 'Beasts give a third more 材 material.' },
    { key: 'luckystar', han: '福星', name: 'Lucky Star', icon: 'polar-star',
      effect: { kind: 'luck', weight: 1.4 },
      says: 'What falls comes off the rare end of the table far more often.' },
    { key: 'sleeves', han: '廣袖', name: 'Wide Sleeves', icon: 'cloak',
      effect: { kind: 'chest', slots: 8 },
      says: 'Eight more places in the chest.' },
  ],
  [
    { key: 'platform', han: '靈臺', name: 'Spirit Platform', icon: 'crystal-shrine',
      effect: { kind: 'dao', points: 3 },
      says: 'Three 道 points, now.' },
    { key: 'discern', han: '洞察', name: 'Insight', icon: 'crystal-ball',
      effect: { kind: 'drop', percent: 0.12 },
      says: 'Beasts drop something more often again.' },
    { key: 'stonegold', han: '點石', name: 'Stone to Gold', icon: 'topaz',
      effect: { kind: 'salvage', percent: 0.70 },
      says: 'Melting gives seven tenths more qi.' },
  ],
  [
    { key: 'hoard', han: '聚寶', name: 'Treasure Gathering', icon: 'gold-nuggets',
      effect: { kind: 'material', percent: 0.40 },
      says: 'Beasts give two fifths more 材 material.' },
    { key: 'kindling', han: '薪火', name: 'Kindling', icon: 'fire-ring',
      effect: { kind: 'refine', percent: 0.25 },
      says: '煉器 Refining costs a quarter less at every level.' },
    { key: 'heavencraft', han: '天工', name: "Heaven's Craft", icon: 'gem-pendant',
      effect: { kind: 'luck', weight: 1.6 },
      says: 'What falls comes off the rare end of the table more often still.' },
  ],
  [
    { key: 'dew', han: '承露', name: 'Catching Dew', icon: 'round-potion',
      effect: { kind: 'dao', points: 4 },
      says: 'Four 道 points, now.' },
    { key: 'tenthousand', han: '萬藏', name: 'Ten Thousand Stores', icon: 'pagoda',
      effect: { kind: 'chest', slots: 12 },
      says: 'Twelve more places in the chest.' },
    { key: 'wildfire', han: '燎原', name: 'Wildfire', icon: 'dragon-breath',
      effect: { kind: 'salvage', percent: 0.90 },
      says: 'Melting gives nine tenths more qi.' },
  ],
  [
    { key: 'taotie', han: '饕餮', name: 'Taotie', icon: 'dragon-head',
      effect: { kind: 'material', percent: 0.50 },
      says: 'Beasts give half as much 材 material again.' },
    { key: 'seeclear', han: '明察', name: 'Clear Seeing', icon: 'owl',
      effect: { kind: 'drop', percent: 0.15 },
      says: 'Beasts drop something more often still.' },
    { key: 'furnacefire', han: '爐火', name: 'Furnace Fire', icon: 'incense',
      effect: { kind: 'refine', percent: 0.30 },
      says: '煉器 Refining costs three tenths less at every level.' },
  ],
  [
    { key: 'onethought', han: '一念', name: 'One Thought', icon: 'yin-yang',
      effect: { kind: 'dao', points: 5 },
      says: 'Five 道 points, now. The last of them.' },
    { key: 'heavenward', han: '通天', name: 'Reaching Heaven', icon: 'polar-star',
      effect: { kind: 'luck', weight: 2.0 },
      says: 'The rare end of the table, as far up as it goes.' },
    { key: 'whale', han: '鯨吞', name: 'The Whale Swallows', icon: 'giant-squid',
      effect: { kind: 'material', percent: 0.60 },
      says: 'Beasts give three fifths more 材 material.' },
  ],
];


/**
 * 境外 And nine more, one at each heaven.
 *
 * 量 The measurement that asked for these. 忙 The harness counts what a cultivator has
 * to decide, and the endgame had nothing in that column at all: the ninth realm is
 * reached around day 47, the nine heavens run from about day 50 to day 138, and every
 * one of those crossings was the same crossing at a bigger number. Forty of them. The
 * realms hand over eight permanent choices between them and the heavens handed over
 * none, so the half of the game that lasts longest was the half with no build in it.
 *
 * 同 They are the same mechanism, not a second one. `owed` simply counts heavens as well
 * as realms, the trios continue in one list, and 悟道 the same screen asks the same
 * question. Nothing in sim/awaken.ts knows that a heaven is different from a realm.
 *
 * 律 What they are allowed to pay, which took one more look than the realm cards did.
 *
 * The realm cards pay material, drops, luck, melting, refining, chest room and 道 points.
 * Two of those are dead by the first heaven: the tree is finished and the chest is large.
 * What is alive at the top is 爐 the furnace and 塔 the tower, so two new kinds name them:
 * a pill costs less 材 material, and a floor of the tower pays more of it.
 *
 * 力 Neither pays power, which is still the line that may not be crossed. A pill is
 * cheaper, not stronger, and a floor pays more material, not more of anything else. Both
 * are the exact shape 煉器 refining already has: a discount on a thing a player has to go
 * and do. A cultivator who never opens the app brews nothing and climbs nothing, so every
 * one of these nine is worth zero to them, which is the deal the rest of the game offers.
 *
 * 量 And what they are worth, measured, because it is not what a realm card is worth and
 * saying otherwise would be the page lying. Forty crossings played out on each lean:
 *
 *     lean       days   refine levels   力
 *     none        144        532        1.66e29
 *     丹 pill     149        541        1.69e29
 *     塔 tower    134        539        1.69e29
 *     材 material 146        547        1.81e29
 *     煉器 refine 139        559        1.89e29
 *
 * A seventh of the power between the widest two, and a day count that wanders about a
 * tenth either way on the loop's own thresholds rather than on the cards. That is the
 * answer and it is the right one, because 雷池 the pool is the endgame's clock and the
 * pool is written in days of your own gathering: **nothing a card pays can make a
 * crossing come sooner, by construction.** A heaven card is not a speed-up and must not
 * be sold as one. It is what your cultivator turns out to be over the eleven weeks the
 * heavens last, and `tribulation.test.ts` plays every lean out so that a card table which
 * ever does run away says so out loud.
 *
 * 飽 Writing them also named something no harness had ever looked at. The endgame loop
 * gathered, climbed and brewed and **never once refined**, so 材 material only went up
 * and ended at 2.2e29 with nowhere to go, and every card here read as worth nothing
 * because in that harness it was. 示 The advice line has always sent a capped cultivator
 * to 煉器, and a real one arrives at the heavens refining every slot. With that one step
 * added, a piece comes out at refine level 90, the Dragon at its old footing was a
 * walkover in 28 crossings of 40, and TRIBULATION_FOOTING had to be re-measured from
 * 1.45 to 1.59. The same fault 爐 the furnace had, in the same harness: a spending policy
 * nobody wrote down, quietly deciding the answer.
 */
export const HEAVEN_CARDS: readonly (readonly Card[])[] = [
  [
    { key: 'formula', han: '丹方', name: 'The Pill Method', icon: 'tied-scroll',
      effect: { kind: 'pill', percent: 0.08 },
      says: 'Every pill asks a little less 材 material, at every price.' },
    { key: 'longstair', han: '登樓', name: 'The Long Stair', icon: 'crenel-crown',
      effect: { kind: 'tower', percent: 0.12 },
      says: 'A floor of 塔 the tower pays more 材 material than it did.' },
    { key: 'maw', han: '巨口', name: 'The Maw', icon: 'sea-serpent',
      effect: { kind: 'material', percent: 0.25 },
      says: 'Beasts give a quarter more 材 material again.' },
  ],
  [
    { key: 'ninerungs', han: '九級', name: 'Nine Rungs', icon: 'ancient-sword',
      effect: { kind: 'tower', percent: 0.15 },
      says: 'A floor of 塔 the tower pays better still.' },
    { key: 'auspice', han: '祥瑞', name: 'Auspice', icon: 'star-medal',
      effect: { kind: 'luck', weight: 2.2 },
      says: 'The rare end of the drop table, weighted far up.' },
    { key: 'ashes', han: '餘燼', name: 'Embers', icon: 'fire-gem',
      effect: { kind: 'salvage', percent: 0.60 },
      says: 'Melting pays three fifths more qi.' },
  ],
  [
    { key: 'quickfire', han: '武火', name: 'Fierce Fire', icon: 'energy-breath',
      effect: { kind: 'pill', percent: 0.10 },
      says: 'The furnace wastes less. Pills cost a tenth less 材 material.' },
    { key: 'graveyard', han: '荒塚', name: 'The Old Graves', icon: 'skeleton',
      effect: { kind: 'material', percent: 0.30 },
      says: 'Beasts give a third more 材 material.' },
    { key: 'coldforge', han: '冷鍛', name: 'Cold Forging', icon: 'frozen-ring',
      effect: { kind: 'refine', percent: 0.25 },
      says: '煉器 Refining costs a quarter less at every level.' },
  ],
  [
    { key: 'sealbreaker', han: '破封', name: 'Seal Breaking', icon: 'hook-swords',
      effect: { kind: 'tower', percent: 0.18 },
      says: 'A floor of 塔 the tower pays nearly a fifth more 材 material.' },
    { key: 'shedding', han: '蛻殼', name: 'The Shed Shell', icon: 'scarab-beetle',
      effect: { kind: 'drop', percent: 0.15 },
      says: 'Beasts drop something a great deal more often.' },
    { key: 'starfall', han: '隕星', name: 'Falling Star', icon: 'ringed-planet',
      effect: { kind: 'luck', weight: 2.6 },
      says: 'The rare end of the table again, further up.' },
  ],
  [
    { key: 'slowfire', han: '文火', name: 'Gentle Fire', icon: 'incense',
      effect: { kind: 'pill', percent: 0.12 },
      says: 'A slower fire and a smaller bill. Pills cost less 材 material still.' },
    { key: 'lastdrop', han: '瀝盡', name: 'The Last Drop', icon: 'round-potion',
      effect: { kind: 'salvage', percent: 0.75 },
      says: 'Melting pays three quarters more qi.' },
    { key: 'godmaw', han: '神餐', name: "The God's Meal", icon: 'minotaur',
      effect: { kind: 'material', percent: 0.35 },
      says: 'Beasts give a third more 材 material again.' },
  ],
  [
    { key: 'skystair', han: '天梯', name: 'The Sky Stair', icon: 'lightning-helix',
      effect: { kind: 'tower', percent: 0.21 },
      says: 'A floor of 塔 the tower pays a fifth more 材 material again.' },
    { key: 'tempering', han: '百鍊', name: 'A Hundred Temperings', icon: 'katana',
      effect: { kind: 'refine', percent: 0.30 },
      says: '煉器 Refining costs three tenths less at every level.' },
    { key: 'storehouse', han: '府庫', name: 'The Storehouse', icon: 'chest-armor',
      effect: { kind: 'chest', slots: 16 },
      says: 'Sixteen more places in the chest.' },
  ],
  [
    { key: 'ninereturns', han: '九轉', name: 'Nine Revolutions', icon: 'swirl-ring',
      effect: { kind: 'pill', percent: 0.14 },
      says: 'The old nine-turn recipe. Pills cost less 材 material yet.' },
    { key: 'heavenshare', han: '天祿', name: "Heaven's Stipend", icon: 'laurels',
      effect: { kind: 'material', percent: 0.40 },
      says: 'Beasts give two fifths more 材 material.' },
    { key: 'purelight', han: '毫光', name: 'Fine Light', icon: 'beams-aura',
      effect: { kind: 'luck', weight: 3.0 },
      says: 'The rare end of the table, higher than the ninth realm ever went.' },
  ],
  [
    { key: 'topless', han: '無頂', name: 'No Summit', icon: 'galaxy',
      effect: { kind: 'tower', percent: 0.24 },
      says: 'A floor of 塔 the tower pays a quarter more 材 material.' },
    { key: 'meltmountain', han: '銷山', name: 'Melting the Mountain', icon: 'rolling-energy',
      effect: { kind: 'salvage', percent: 0.90 },
      says: 'Melting pays nine tenths more qi.' },
    { key: 'spiritforge', han: '靈淬', name: 'Spirit Quenching', icon: 'emerald',
      effect: { kind: 'refine', percent: 0.35 },
      says: '煉器 Refining costs a third less at every level.' },
  ],
  [
    // 名 Not 樸 "The Uncarved Block": 鴻蒙 the ninth heaven is already called The
    // Uncarved, and a card and the place it is handed out in sharing a name is the
    // screen saying one word about two things.
    { key: 'uncarved', han: '無漏', name: 'Nothing Leaks', icon: 'cosmic-egg',
      effect: { kind: 'pill', percent: 0.16 },
      says: 'Nothing is wasted any more. Pills cost the least they ever will.' },
    { key: 'allunder', han: '普天', name: 'All Under Heaven', icon: 'orb-wand',
      effect: { kind: 'material', percent: 0.50 },
      says: 'Beasts give half as much 材 material again.' },
    { key: 'endlessstair', han: '步虛', name: 'Pacing the Void', icon: 'crystal-cluster',
      effect: { kind: 'tower', percent: 0.27 },
      says: 'A floor of 塔 the tower pays more than a quarter again.' },
  ],
];

/** Every trio that will ever be offered: the eight realms, then the nine heavens. */
export const TRIOS: readonly (readonly Card[])[] = [...AWAKENINGS, ...HEAVEN_CARDS];

/** Every card that exists, flat. */
export const ALL_CARDS: readonly Card[] = TRIOS.flat();

const BY_KEY: Readonly<Record<string, Card>> =
  Object.fromEntries(ALL_CARDS.map((c) => [c.key, c]));

export function cardOf(key: string): Card | undefined {
  return BY_KEY[key];
}
