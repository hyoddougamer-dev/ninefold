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

/**
 * What a piece of gear does.
 *
 * These are deliberately the *same seven axes the technique tree moves*. That is what
 * makes a build a build: a 運 Fortune node and a 運 roll on a ring pull the same lever,
 * so a player can reach the same place by two routes and choose which.
 *
 * Two affixes were not enough. With one stat per piece, a player walking the 神 Spirit
 * path found every weapon useless — the whole slot was dead to them. Now every piece
 * carries a primary and, from 靈 up, rolled secondaries, so any slot can serve any path.
 */
export type Affix = 'power' | 'rate' | 'luck' | 'find' | 'capacity' | 'sunder' | 'refine';

export const AFFIXES: readonly Affix[] =
  ['power', 'rate', 'luck', 'find', 'capacity', 'sunder', 'refine'];

export interface AffixInfo {
  readonly han: string;
  readonly label: string;
  /** How the number reads: a percentage, or a flat count. */
  readonly unit: '%' | 'flat';
  /** Scales the rolled value — a point of 破 Sunder is worth far more than one of 力. */
  readonly scale: number;
  /** How often it turns up as a secondary. */
  readonly weight: number;
}

export const AFFIX_INFO: Record<Affix, AffixInfo> = {
  power:    { han: '力', label: 'power',       unit: '%',    scale: 1,    weight: 26 },
  rate:     { han: '氣', label: 'qi per sec',  unit: '%',    scale: 1,    weight: 26 },
  luck:     { han: '運', label: 'rare drops',  unit: '%',    scale: 0.7,  weight: 14 },
  find:     { han: '拾', label: 'drop chance', unit: '%',    scale: 0.22, weight: 12 },
  capacity: { han: '藏', label: 'chest slots', unit: 'flat', scale: 0.08, weight: 8 },
  sunder:   { han: '破', label: 'beasts weaker', unit: '%',  scale: 0.18, weight: 8 },
  refine:   { han: '煉', label: 'fusion quality', unit: '%', scale: 0.3,  weight: 6 },
};

/** How many rolls a rank carries: one primary, plus these many secondaries. */
export const SECONDARIES: Record<Rarity, number> = {
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

/** The primary line's value before variance, in its own axis's units. */
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

/**
 * Fifty-four pieces: nine per slot, one per realm. Every realm brings one new piece in
 * every slot, so there is always something new to find and never a slot that goes
 * unanswered for twenty days.
 *
 * Variety is the point. The first table had eighteen pieces and four of them were
 * swords — a chest full of swords is a chest full of one idea. These are drawn from the
 * whole library: fans and bells, greaves and tabi, laurels and dragon heads.
 */
export const GEAR: readonly GearTemplate[] = [
  // 劍 weapons — the hand. Mostly power, with two that channel instead.
  t('ironsword', '鐵劍', 'Iron Sword', 'weapon', 'ancient-sword', 1, 'power'),
  t('woodsaber', '木刀', 'Wooden Saber', 'weapon', 'katana', 2, 'rate'),
  t('moonblade', '月刃', 'Moon Blade', 'weapon', 'crescent-blade', 3, 'power'),
  t('twinhooks', '雙鉤', 'Twin Hooks', 'weapon', 'hook-swords', 4, 'luck'),
  t('spiritspear', '靈槍', 'Spirit Spear', 'weapon', 'barbed-spear', 5, 'power'),
  t('jadefan', '玉扇', 'Jade Fan', 'weapon', 'handheld-fan', 6, 'rate'),
  t('voidstaff', '虛杖', 'Void Staff', 'weapon', 'wizard-staff', 7, 'sunder'),
  t('trident', '叉戟', 'Spirit Trident', 'weapon', 'trident', 8, 'power'),
  t('heavenscythe', '天鐮', 'Heaven Scythe', 'weapon', 'scythe', 9, 'rate'),

  // 袍 robes — the body. Cloth gathers qi, plate holds blows.
  t('clothrobe', '布袍', 'Cloth Robe', 'robe', 'robe', 1, 'rate'),
  t('leathervest', '皮甲', 'Leather Vest', 'robe', 'leather-vest', 2, 'power'),
  t('daoistrobe', '道衣', 'Daoist Kimono', 'robe', 'kimono', 3, 'rate'),
  t('greycloak', '灰氅', 'Grey Cloak', 'robe', 'cloak', 4, 'capacity'),
  t('lamellar', '鱗甲', 'Lamellar', 'robe', 'lamellar', 5, 'power'),
  t('breastplate', '胸鎧', 'Breastplate', 'robe', 'chest-armor', 6, 'rate'),
  t('pauldrons', '肩鎧', 'Pauldrons', 'robe', 'shoulder-armor', 7, 'power'),
  t('starrobe', '星袍', 'Star Robe', 'robe', 'wing-cloak', 8, 'sunder'),
  t('heavenmantle', '天衣', 'Heaven Mantle', 'robe', 'cape', 9, 'capacity'),

  // 冠 crowns — the head. Where the mind is sharpened, so mostly rate.
  t('clothband', '布巾', 'Cloth Band', 'crown', 'bandana', 1, 'rate'),
  t('laurels', '桂冠', 'Laurels', 'crown', 'laurels', 2, 'luck'),
  t('jadepin', '玉簪', 'Jade Pin', 'crown', 'jewel-crown', 3, 'rate'),
  t('hornedhelm', '角盔', 'Horned Helm', 'crown', 'horned-helm', 4, 'refine'),
  t('bonecrown', '骨冠', 'Bone Crown', 'crown', 'crenel-crown', 5, 'rate'),
  t('visoredhelm', '面甲', 'Visored Helm', 'crown', 'visored-helm', 6, 'power'),
  t('imperialcrown', '帝冠', 'Imperial Crown', 'crown', 'imperial-crown', 7, 'rate'),
  t('ritualcrown', '法冠', 'Ritual Crown', 'crown', 'pope-crown', 8, 'power'),
  t('dragonhead', '龍首', 'Dragon Head', 'crown', 'dragon-head', 9, 'luck'),

  // 靴 boots — the ground. Light feet gather, heavy feet hold.
  t('barefoot', '赤足', 'Barefoot', 'boots', 'barefoot', 1, 'rate'),
  t('strawsandals', '草鞋', 'Straw Sandals', 'boots', 'sandal', 2, 'find'),
  t('tabiboots', '布靴', 'Tabi Boots', 'boots', 'tabi-boot', 3, 'rate'),
  t('walkingboots', '行靴', 'Walking Boots', 'boots', 'walking-boot', 4, 'power'),
  t('leatherboots', '皮靴', 'Leather Boots', 'boots', 'leather-boot', 5, 'find'),
  t('greaves', '脛甲', 'Greaves', 'boots', 'greaves', 6, 'rate'),
  t('ironboots', '鐵靴', 'Iron Boots', 'boots', 'metal-boot', 7, 'power'),
  t('furboots', '裘靴', 'Fur Boots', 'boots', 'fur-boot', 8, 'capacity'),
  t('windfoot', '風足', 'Wind Foot', 'boots', 'wingfoot', 9, 'rate'),

  // 珮 talismans — the pocket. Almost all of them feed the gathering.
  t('woodcharm', '木符', 'Wood Charm', 'talisman', 'wax-seal', 1, 'rate'),
  t('bonependant', '骨佩', 'Bone Pendant', 'talisman', 'tribal-pendant', 2, 'luck'),
  t('prayerbeads', '佛珠', 'Prayer Beads', 'talisman', 'prayer-beads', 3, 'rate'),
  t('boundscroll', '卷軸', 'Bound Scroll', 'talisman', 'tied-scroll', 4, 'refine'),
  t('gempendant', '寶珮', 'Gem Pendant', 'talisman', 'gem-pendant', 5, 'luck'),
  t('starmedal', '星章', 'Star Medal', 'talisman', 'star-medal', 6, 'rate'),
  t('censer', '香爐', 'Censer', 'talisman', 'incense', 7, 'power'),
  t('crystalorb', '水晶', 'Crystal Orb', 'talisman', 'crystal-ball', 8, 'refine'),
  t('orbwand', '珠杖', 'Orb Wand', 'talisman', 'orb-wand', 9, 'rate'),

  // 戒 rings — the smallest thing, and the one that gets the loudest names.
  t('plainring', '素戒', 'Plain Ring', 'ring', 'ring', 1, 'power'),
  t('topazring', '黃玉', 'Topaz Ring', 'ring', 'topaz', 2, 'rate'),
  t('amethystring', '紫晶', 'Amethyst Ring', 'ring', 'amethyst', 3, 'luck'),
  t('emeraldring', '翠戒', 'Emerald Ring', 'ring', 'emerald', 4, 'power'),
  t('flamering', '炎戒', 'Flame Ring', 'ring', 'fire-ring', 5, 'rate'),
  t('frostring', '霜戒', 'Frost Ring', 'ring', 'frozen-ring', 6, 'find'),
  t('powerring', '力戒', 'Power Ring', 'ring', 'power-ring', 7, 'power'),
  t('spiralring', '渦戒', 'Spiral Ring', 'ring', 'swirl-ring', 8, 'sunder'),
  t('ringedstar', '星環', 'Ringed Star', 'ring', 'ringed-planet', 9, 'rate'),
];

/** One rolled line on a piece. 12 on a percentage affix means +12%. */
export interface Roll {
  readonly affix: Affix;
  readonly value: number;
}

export interface Item {
  /** Unique per item, so two Iron Swords are two things. */
  readonly id: string;
  readonly template: string;
  readonly rarity: Rarity;
  /** The first is the template's own line; the rest are rolled by rank. */
  readonly rolls: readonly Roll[];
}

/** What this piece gives on one axis, counting every line it carries. */
export function valueOf(item: Item, affix: Affix): number {
  let total = 0;
  for (const r of item.rolls) if (r.affix === affix) total += r.value;
  return total;
}

/** The line the piece is named by — what a one-line summary shows. */
export function primaryOf(item: Item): Roll | undefined {
  return item.rolls[0];
}

/** Rounded the way the screen shows it, so sorting and display never disagree. */
export function roundValue(affix: Affix, raw: number): number {
  return AFFIX_INFO[affix].unit === 'flat'
    ? Math.max(1, Math.round(raw))
    : Math.round(raw * 10) / 10;
}

/** The rolled value of a line before variance: rank and realm, through the axis's scale. */
export function baseValue(template: GearTemplate, rarity: Rarity, affix: Affix): number {
  const raw = (BASE_PERCENT + PERCENT_PER_REALM * template.realm)
    * RARITY_INFO[rarity].mult * AFFIX_INFO[affix].scale;
  return roundValue(affix, raw);
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

/**
 * What a whole set is worth: one multiplier for power, one for the qi rate.
 *
 * `affinityOf` is how the technique tree reaches gear without locking any of it away —
 * a path makes certain slots count for more, rather than making the rest unwearable.
 */
export type GearTotals = Record<Affix, number>;

/**
 * Everything the worn set adds, axis by axis, with affinity applied.
 *
 * `affinityOf` is how the technique tree reaches gear without locking any of it away —
 * a path makes certain slots count for more, rather than making the rest unwearable.
 */
export function gearTotals(
  worn: Worn,
  affinityOf: (slot: Slot) => number = () => 1,
): GearTotals {
  const totals = Object.fromEntries(AFFIXES.map((a) => [a, 0])) as GearTotals;
  for (const slot of SLOTS) {
    const it = worn[slot];
    if (!it) continue;
    const mult = affinityOf(slot);
    for (const roll of it.rolls) totals[roll.affix] += roll.value * mult;
  }
  return totals;
}

/** The two multipliers the rest of the sim asks for most often. */
export function setBonus(
  worn: Worn,
  affinityOf: (slot: Slot) => number = () => 1,
): { power: number; rate: number } {
  const t = gearTotals(worn, affinityOf);
  return { power: 1 + t.power / 100, rate: 1 + t.rate / 100 };
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
