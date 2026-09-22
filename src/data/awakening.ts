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
  | { kind: 'dao'; points: number };

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

/** Every card that exists, flat. */
export const ALL_CARDS: readonly Card[] = AWAKENINGS.flat();

const BY_KEY: Readonly<Record<string, Card>> =
  Object.fromEntries(ALL_CARDS.map((c) => [c.key, c]));

export function cardOf(key: string): Card | undefined {
  return BY_KEY[key];
}
