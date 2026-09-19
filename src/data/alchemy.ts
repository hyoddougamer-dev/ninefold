/**
 * 丹 Alchemy.
 *
 * Qi has to have somewhere to go. Every other thing qi buys is capped by the realm —
 * that cap is what holds the whole curve up — so without one uncapped sink a cultivator
 * at the top gathers for ever and spends nothing, which is the state the ninth realm
 * used to be in.
 *
 * The furnace is that sink, and it is deliberately the *only* one. It obeys one rule,
 * and the rule is the reason the curve can never run away again:
 *
 *   **Nothing uncapped may ever raise the qi rate.**
 *
 * The furnace raises power, makes beasts read weaker, and sweetens what drops. Not one
 * of those feeds the qi that pays for it, so there is no loop to close and no runaway to
 * find. Rate upgrades stay behind the realm cap where they belong.
 */

export type Line = 'body' | 'bane' | 'fortune';

export const LINES: readonly Line[] = ['body', 'bane', 'fortune'];

export interface PillLine {
  readonly key: Line;
  readonly han: string;
  readonly name: string;
  readonly icon: string;
  /** What one pill does, in words a player can act on. */
  readonly effect: string;
  readonly lore: string;
}

export const PILL_LINES: Record<Line, PillLine> = {
  body: {
    key: 'body', han: '煉體', name: 'Body Tempering', icon: 'fire-gem',
    effect: '+2.5% power, for ever',
    lore: 'Cinnabar and beast marrow, drawn down to a bead. It burns going in and the ' +
      'body it leaves is not the body it found.',
  },
  bane: {
    key: 'bane', han: '破煞', name: 'Bane Breaking', icon: 'cracked-shield',
    effect: 'beasts read weaker',
    lore: 'Brewed from what the beasts themselves carried. What killed them thins their ' +
      'kin — never to nothing, but never back either.',
  },
  fortune: {
    key: 'fortune', han: '聚寶', name: 'Treasure Gathering', icon: 'gold-nuggets',
    effect: 'better gear falls',
    lore: 'The old alchemists swore fortune was a substance like any other, and could be ' +
      'boiled. Nobody has disproved them.',
  },
};

/**
 * 丹名 What the pill in the furnace is called.
 *
 * The recipe does not change — the cultivator does. The same furnace and the same fire
 * make a Qi-Knitting Pill for a first-realm body and a Tribulation Pill for one that has
 * stood under lightning, because a pill is named for what it is strong enough to change.
 */
export interface PillGrade {
  readonly han: string;
  readonly name: string;
}

export const PILL_GRADES: Record<Line, readonly PillGrade[]> = {
  body: [
    { han: '凝氣丹', name: 'Qi-Knitting Pill' },
    { han: '築基丹', name: 'Foundation Pill' },
    { han: '金髓丹', name: 'Golden Marrow Pill' },
    { han: '育嬰丹', name: 'Infant-Nursing Pill' },
    { han: '化神丹', name: 'Spirit-Shaping Pill' },
    { han: '虛靈丹', name: 'Hollow Spirit Pill' },
    { han: '合道丹', name: 'Way-Joining Pill' },
    { han: '大乘丹', name: 'Great Vehicle Pill' },
    { han: '渡劫丹', name: 'Tribulation Pill' },
  ],
  bane: [
    { han: '驅蟲散', name: 'Vermin-Driving Powder' },
    { han: '避獸香', name: 'Beast-Warding Incense' },
    { han: '斷牙丹', name: 'Tooth-Breaking Pill' },
    { han: '裂甲丹', name: 'Carapace-Splitting Pill' },
    { han: '鎮妖丹', name: 'Demon-Quelling Pill' },
    { han: '伏魔丹', name: 'Devil-Binding Pill' },
    { han: '誅邪丹', name: 'Evil-Slaying Pill' },
    { han: '滅煞丹', name: 'Bane-Ending Pill' },
    { han: '弒龍丹', name: 'Dragonslaying Pill' },
  ],
  fortune: [
    { han: '拾遺散', name: 'Gleaning Powder' },
    { han: '招財丹', name: 'Wealth-Calling Pill' },
    { han: '尋寶丹', name: 'Treasure-Seeking Pill' },
    { han: '開運丹', name: 'Fortune-Opening Pill' },
    { han: '聚靈丹', name: 'Spirit-Gathering Pill' },
    { han: '天工丹', name: "Heaven's Craft Pill" },
    { han: '造化丹', name: 'Creation Pill' },
    { han: '奪天丹', name: 'Heaven-Seizing Pill' },
    { han: '仙緣丹', name: 'Immortal Affinity Pill' },
  ],
};

/** The pill this cultivator's furnace makes, which is the one their realm can hold. */
export function pillOf(line: Line, realm: number): PillGrade {
  const grades = PILL_GRADES[line];
  return grades[Math.max(0, Math.min(grades.length - 1, Math.round(realm) - 1))];
}
