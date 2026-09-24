/**
 * 境外 Beyond the realms.
 *
 * The climb ends at the ninth realm, and for a long time so did the game. 劫 the
 * tribulation ran on for ever afterwards: a pool that refills in two days, a Dragon
 * that comes back heavier, a mark that multiplies everything. It was a fine engine
 * with nothing in it. Measured: the last new thing in 九境 arrived on day 60, the summit
 * on day 72, and every crossing after that was the same Dragon at a bigger number.
 *
 * Bruno asked for three months of content at launch so that expansions could be planned
 * calmly rather than in a panic. Three months is thirteen weeks; the game ran out of new
 * things in nine, and the endgame was a pace rather than a calendar.
 *
 * So the ladder continues. Every MARKS_PER_HEAVEN crossings you step into a heaven, and
 * a heaven is exactly what a realm is: a name, a colour, a thing that stands at the end
 * of it, and **something it opens**.
 *
 * What it opens is the same thing every realm has always opened: **room**. Six more
 * levels of every capped upgrade, which is `levelCap` continued past the ninth realm by
 * its own rule rather than by a second one.
 *
 * 律 And it cannot break the economic law, which is worth writing out because it looks
 * as though it should. Two of the four upgrades multiply the qi rate, so more room means
 * a faster rate, but 雷池 the thunder pool is *measured in days of your own gathering*,
 * so it grows at exactly the same speed. A heaven that doubles the rate doubles the pool
 * with it and the crossing still takes MARK_DAYS. The clock is safe because the clock
 * was never written in qi.
 *
 * The Dragons are named because the alternative was measured and it is grim: forty
 * crossings against one animal called 龍, distinguishable only by the figure beside it.
 */
export interface Heaven {
  /** 1-based. Heaven 1 is entered on the first crossing. */
  readonly n: number;
  readonly han: string;
  readonly name: string;
  /** Walks on past the ninth realm's imperial violet, into gold and then to bone. */
  readonly colour: string;
  /** What stands at the end of this heaven: 漢字, name, and the icon it is drawn with. */
  readonly dragon: { readonly han: string; readonly name: string; readonly icon: string };
  /**
   * One line, for the card that says what you just walked into.
   *
   * Flavour only. What a heaven *opens* is the same for all nine, so saying it nine
   * times is the stutter the copy rules forbid. The screen says it once, beside the
   * name, out of LEVELS_PER_HEAVEN.
   */
  readonly gains: string;
}

/**
 * 印 How many 雷印 marks one heaven is worth.
 *
 * Three, measured against the endgame harness: a crossing settles at about MARK_DAYS
 * plus the gathering either side of it, so three of them is a little over a week. Nine
 * heavens is then roughly eleven weeks of named arrivals on top of a climb that ends in
 * nine, which is the thirteen weeks that were asked for, with the climb and the
 * endgame overlapping rather than queueing.
 */
export const MARKS_PER_HEAVEN = 3;

export const HEAVENS: readonly Heaven[] = [
  { n: 1, han: '真仙', name: 'True Immortal', colour: '#A077B8',
    dragon: { han: '蒼龍', name: 'Azure Dragon', icon: 'dragon-head' },
    gains: 'The first name above the ninth realm. Nobody who knew you is still alive.' },
  { n: 2, han: '金仙', name: 'Golden Immortal', colour: '#AE83AD',
    dragon: { han: '金龍', name: 'Golden Dragon', icon: 'dragon-spiral' },
    gains: 'Your qi runs gold, and it no longer leaves you when you spend it.' },
  { n: 3, han: '太乙', name: 'Supreme Unity', colour: '#BA909F',
    dragon: { han: '九嬰', name: 'Nine-Headed Hydra', icon: 'hydra' },
    gains: 'One body, nine heads. Cutting one off has never once helped.' },
  { n: 4, han: '大羅', name: 'Grand Veil', colour: '#C59D8C',
    dragon: { han: '雙龍', name: 'Twin Dragons', icon: 'double-dragon' },
    gains: 'Two of them now, and they come together. Neither is the real one.' },
  { n: 5, han: '准聖', name: 'Quasi-Sage', colour: '#CEAA77',
    dragon: { han: '應龍', name: 'Winged Dragon', icon: 'wyvern' },
    gains: 'It stopped touching the ground somewhere below you, and never came back down.' },
  { n: 6, han: '聖人', name: 'Sage', colour: '#D4AF56',
    dragon: { han: '燭龍', name: 'Torch Dragon', icon: 'dragon-breath' },
    gains: 'The one whose eyes opening is daylight, and whose breath is the winter.' },
  { n: 7, han: '道祖', name: 'Dao Ancestor', colour: '#DEC282',
    dragon: { han: '星君', name: 'Star Lord', icon: 'polar-star' },
    gains: 'You are older now than most of what you fight, and it shows in the fighting.' },
  { n: 8, han: '混元', name: 'Primordial Unity', colour: '#E9D8B4',
    dragon: { han: '混沌', name: 'Chaos', icon: 'cosmic-egg' },
    gains: 'It has no face. It has never needed one.' },
  { n: 9, han: '鴻蒙', name: 'The Uncarved', colour: '#F5F0E4',
    dragon: { han: '鴻蒙', name: 'The Uncarved', icon: 'galaxy' },
    gains: 'The block before anyone took a knife to it. There is no tenth name.' },
];

/**
 * How many heavens the marks have opened. 0 before the first crossing.
 *
 * Heaven h is entered on mark `MARKS_PER_HEAVEN * (h - 1) + 1`, so the first crossing
 * of all opens 真仙, so the endgame's very first act is an arrival, not three more days
 * of the same thing.
 */
export function heavensOpened(marks: number): number {
  const n = Math.max(0, Math.floor(marks));
  return Math.min(HEAVENS.length, Math.ceil(n / MARKS_PER_HEAVEN));
}

/** The heaven a cultivator stands in, or null while they are still in the ninth realm. */
export function heavenAt(marks: number): Heaven | null {
  const n = heavensOpened(marks);
  return n === 0 ? null : HEAVENS[n - 1];
}

/** The next heaven, or null once 鴻蒙 has been reached. */
export function nextHeaven(marks: number): Heaven | null {
  return HEAVENS[heavensOpened(marks)] ?? null;
}

/** How many more crossings until the next heaven, or null once 鴻蒙 is reached. */
export function marksToNext(marks: number): number | null {
  if (!nextHeaven(marks)) return null;
  const n = Math.max(0, Math.floor(marks));
  return MARKS_PER_HEAVEN * heavensOpened(n) + 1 - n;
}
