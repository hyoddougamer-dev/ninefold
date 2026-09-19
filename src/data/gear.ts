/**
 * 器 Gear.
 *
 * Six slots, five rarities, and items that drop from beasts. Gear is the visible reward
 * loop: the four upgrade boxes all say "a bigger number", and a drop says "a thing you
 * can see and wear".
 *
 * Every item is a row in a table, and its icon is a filename from game-icons.net.
 */

export type Slot = 'weapon' | 'robe' | 'crown' | 'boots' | 'talisman' | 'ring';

export const SLOTS: readonly Slot[] = ['weapon', 'robe', 'crown', 'boots', 'talisman', 'ring'];

export const SLOT_INFO: Record<Slot, { han: string; name: string; empty: string }> = {
  weapon:   { han: '劍', name: 'Weapon',   empty: 'ancient-sword' },
  robe:     { han: '袍', name: 'Robe',     empty: 'robe' },
  crown:    { han: '冠', name: 'Crown',    empty: 'jewel-crown' },
  boots:    { han: '靴', name: 'Boots',    empty: 'boots' },
  talisman: { han: '珮', name: 'Talisman', empty: 'gem-pendant' },
  ring:     { han: '戒', name: 'Ring',     empty: 'ring' },
};

/** 五階 The five-step rarity ladder. The frame carries it, never the object. */
export type Rarity = 'common' | 'spirit' | 'mystic' | 'earth' | 'heaven';

export const RARITIES: readonly Rarity[] = ['common', 'spirit', 'mystic', 'earth', 'heaven'];

export interface RarityInfo {
  readonly han: string;
  readonly name: string;
  readonly colour: string;
  /** Multiplies the item's percentage. */
  readonly mult: number;
  /**
   * 光 How loud the item is on screen: 0 plain, 4 a corona.
   *
   * Rank is carried by the frame and its light, never by the object — the same sword
   * at 凡 and at 天 is one drawing in two frames, which is what lets a chest be read at
   * a glance without reading a word.
   */
  readonly glow: 0 | 1 | 2 | 3 | 4;
}

export const RARITY_INFO: Record<Rarity, RarityInfo> = {
  common: { han: '凡', name: 'Common', colour: '#7A80B8', mult: 1,   glow: 0 },
  spirit: { han: '靈', name: 'Spirit', colour: '#5FDCFF', mult: 1.6, glow: 1 },
  mystic: { han: '玄', name: 'Mystic', colour: '#9B9BFF', mult: 2.5, glow: 2 },
  earth:  { han: '地', name: 'Earth',  colour: '#FFCE6B', mult: 4,   glow: 3 },
  heaven: { han: '天', name: 'Heaven', colour: '#FF5FC8', mult: 6.5, glow: 4 },
};

/** What a piece of gear does. Kept to two so a comparison fits on one line. */
export type Affix = 'power' | 'rate';

export const AFFIX_INFO: Record<Affix, { han: string; label: string }> = {
  power: { han: '力', label: 'power' },
  rate:  { han: '氣', label: 'qi / s' },
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

/** The rolled percentage of an item, before variance. */
export function basePercent(template: GearTemplate, rarity: Rarity): number {
  return (BASE_PERCENT + PERCENT_PER_REALM * template.realm) * RARITY_INFO[rarity].mult;
}

export interface GearTemplate {
  readonly key: string;
  readonly han: string;
  readonly name: string;
  readonly slot: Slot;
  readonly icon: string;
  /** Realm the item starts dropping in. */
  readonly realm: number;
  readonly affix: Affix;
}

const t = (key: string, han: string, name: string, slot: Slot, icon: string, realm: number, affix: Affix): GearTemplate =>
  ({ key, han, name, slot, icon, realm, affix });

export const GEAR: readonly GearTemplate[] = [
  // 劍 weapons — always power
  t('ironsword',  '鐵劍',   'Iron Sword',      'weapon', 'ancient-sword',   1, 'power'),
  t('moonblade',  '月刃',   'Moon Blade',      'weapon', 'crescent-blade',  3, 'power'),
  t('spiritspear','靈槍',   'Spirit Spear',    'weapon', 'barbed-spear',    5, 'power'),
  t('voidstaff',  '虛杖',   'Void Staff',      'weapon', 'wizard-staff',    7, 'rate'),

  // 袍 robes — mixed
  t('clothrobe',  '布袍',   'Cloth Robe',      'robe',   'robe',            1, 'rate'),
  t('greycloak',  '灰氅',   'Grey Cloak',      'robe',   'cloak',           3, 'power'),
  t('scalerobe',  '鱗甲',   'Scale Mail',      'robe',   'chest-armor',     5, 'power'),
  t('starrobe',   '星袍',   'Star Robe',       'robe',   'wing-cloak',      8, 'rate'),

  // 冠 crowns — mostly rate
  t('jadepin',    '玉簪',   'Jade Pin',        'crown',  'jewel-crown',     2, 'rate'),
  t('bonecrown',  '骨冠',   'Bone Crown',      'crown',  'crenel-crown',    6, 'power'),
  t('heavencrown','天冠',   'Heaven Crown',    'crown',  'imperial-crown',  8, 'rate'),

  // 靴 boots
  t('strawboots', '草鞋',   'Straw Sandals',   'boots',  'boots',           1, 'rate'),
  t('ironboots',  '鐵靴',   'Iron Boots',      'boots',  'steeltoe-boots',  4, 'power'),

  // 珮 talismans
  t('woodcharm',  '木符',   'Wood Charm',      'talisman', 'wax-seal',      2, 'rate'),
  t('prayerbeads','佛珠',   'Prayer Beads',    'talisman', 'prayer-beads',  4, 'rate'),
  t('gempendant', '寶珮',   'Gem Pendant',     'talisman', 'gem-pendant',   6, 'power'),

  // 戒 rings
  t('plainring',  '素戒',   'Plain Ring',      'ring',   'ring',            3, 'power'),
  t('stormring',  '雷戒',   'Storm Ring',      'ring',   'ringed-planet',   7, 'rate'),
];

export interface Item {
  /** Unique per item, so two Iron Swords are two things. */
  readonly id: string;
  readonly template: string;
  readonly rarity: Rarity;
  /** The rolled percentage. 12 means +12%. */
  readonly percent: number;
}

export const TEMPLATE_BY_KEY: Readonly<Record<string, GearTemplate>> =
  Object.fromEntries(GEAR.map((g) => [g.key, g]));

export function templateOf(item: Item): GearTemplate {
  return TEMPLATE_BY_KEY[item.template];
}

/** Gear that can drop in a realm: anything whose own realm has been reached. */
export function droppableIn(realm: number): readonly GearTemplate[] {
  return GEAR.filter((g) => g.realm <= realm);
}

export type Worn = Partial<Record<Slot, Item>>;

/** What a whole set is worth: one multiplier for power, one for the qi rate. */
export function setBonus(worn: Worn): { power: number; rate: number } {
  let power = 0;
  let rate = 0;
  for (const slot of SLOTS) {
    const it = worn[slot];
    if (!it) continue;
    if (templateOf(it).affix === 'power') power += it.percent;
    else rate += it.percent;
  }
  return { power: 1 + power / 100, rate: 1 + rate / 100 };
}

/**
 * 相 The worn aura: the highest rank anywhere on the body.
 *
 * It is what makes gear worth wearing beyond the numbers — a 天 Heaven piece shows on
 * the cultivator, so other people can see what you found without opening a menu.
 */
export function wornRarity(worn: Worn): Rarity | null {
  let best: Rarity | null = null;
  for (const slot of SLOTS) {
    const it = worn[slot];
    if (!it) continue;
    if (!best || RARITY_INFO[it.rarity].glow > RARITY_INFO[best].glow) best = it.rarity;
  }
  return best;
}
