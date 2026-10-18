/**
 * 珍 The trophies: one very rare thing each common beast can leave, and 冊 the book they fill.
 *
 * Every common has one. A warden is fought once and the Dragon is a crossing, so neither is
 * in the book: a page that asked for a second warden would be a page nobody could finish.
 * Each realm's three trophies are its page, and a page held whole gives a title and a little
 * power for good (PAGE_POWER).
 *
 * What a trophy *is* follows the beast, as the gear it leaves does: a pelt from what has
 * fur, a core from what has qi in it, and now and then a creature born wrong (a golden
 * toad among the marsh frogs), which is the rarest thing a marsh can show you.
 */
export interface Trophy {
  /** The beast that leaves it, by key. */
  readonly beast: string;
  readonly han: string;
  readonly name: string;
  /** pelt, core, horn and so on: what it is, in one plain word for the card. */
  readonly kind: string;
}

const t = (beast: string, han: string, name: string, kind: string): Trophy => ({ beast, han, name, kind });

export const TROPHIES: readonly Trophy[] = [
  // 1 練氣
  t('rat', '白鼠', 'White Rat Pelt', 'pelt'),
  t('hound', '銀犬', 'Silver Hound Pelt', 'pelt'),
  t('frog', '金蟾', 'Golden Toad', 'variant'),
  // 2 築基
  t('serpent', '蛇膽', 'Jade Serpent Gall', 'core'),
  t('mantis', '鐮臂', 'Mantis Sickle-Arm', 'limb'),
  t('bat', '血晶', 'Blood Crystal', 'core'),
  // 3 金丹
  t('beetle', '金甲', 'Gilded Carapace', 'shell'),
  t('owl', '夜瞳', 'Night Pupil', 'eye'),
  t('raven', '三足', 'Three-Legged Raven', 'variant'),
  // 4 元嬰
  t('boar', '鐵牙', 'Iron Tusk', 'tusk'),
  t('wolf', '霜皮', 'Frost Wolf Pelt', 'pelt'),
  t('vulture', '鷲骨', 'Ridge Vulture Skull', 'skull'),
  // 5 化神
  t('crab', '玉螯', 'Jade Claw', 'claw'),
  t('jellyfish', '水魄', 'Water Soul', 'core'),
  t('lizard', '岩心', 'Stone Heart', 'core'),
  // 6 煉虛
  t('centipede', '百足', 'Hundred-Leg Core', 'core'),
  t('scorpion', '蠍針', 'Scorpion Stinger', 'sting'),
  t('worm', '屍珠', 'Corpse Pearl', 'pearl'),
  // 7 合體
  t('ogre', '魔角', 'Demon Horn', 'horn'),
  t('goblin', '鬼面', 'Ghost Mask', 'mask'),
  t('wraith', '陰燈', 'Yin Lantern', 'lantern'),
  // 8 大乘
  t('skeleton', '將印', "General's Seal", 'seal'),
  t('gargoyle', '石翼', 'Stone Wing', 'wing'),
  t('minotaur', '鼻環', "Bull King's Nose Ring", 'ring'),
  // 9 渡劫
  t('harpy', '彩羽', 'Rainbow Plume', 'plume'),
  t('unicorn', '麟角', 'Qilin Horn', 'horn'),
  t('squid', '墨珠', 'Ink Pearl', 'pearl'),
];

export const TROPHY_BY_BEAST: Readonly<Record<string, Trophy>> =
  Object.fromEntries(TROPHIES.map((x) => [x.beast, x]));

/**
 * 冊 What each realm's page calls the cultivator who holds it whole, and what the whole
 * book calls them. A title is worn on the page and the bestiary heading; it changes no number
 * of its own, the page's power does that.
 */
export const PAGE_TITLES: readonly { readonly han: string; readonly name: string }[] = [
  { han: '獵戶', name: 'Trapper' },
  { han: '捕蛇', name: 'Snake Catcher' },
  { han: '羽客', name: 'Feather Keeper' },
  { han: '獸蹤', name: 'Beast Tracker' },
  { han: '潮客', name: 'Tide Walker' },
  { han: '守墓', name: 'Grave Keeper' },
  { han: '斬魔', name: 'Demon Cutter' },
  { han: '破將', name: 'General Breaker' },
  { han: '天獵', name: "Heaven's Hunter" },
];
export const BOOK_TITLE = { han: '百獸主', name: 'Lord of the Hundred Beasts' } as const;
