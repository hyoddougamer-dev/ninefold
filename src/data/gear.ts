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
   * Rank is carried by the frame and its light, never by the object. The same sword
   * at 凡 and at 天 is one drawing in two frames, which is what lets a chest be read at
   * a glance without reading a word.
   */
  readonly glow: 0 | 1 | 2 | 3 | 4;
}

export const RARITY_INFO: Record<Rarity, RarityInfo> = {
  common: { han: '凡', name: 'Common', colour: '#9C907C', mult: 1,   glow: 0 },
  spirit: { han: '靈', name: 'Spirit', colour: '#7FB495', mult: 1.6, glow: 1 },
  mystic: { han: '玄', name: 'Mystic', colour: '#B2A566', mult: 2.5, glow: 2 },
  earth:  { han: '地', name: 'Earth',  colour: '#D4AF56', mult: 4,   glow: 3 },
  heaven: { han: '天', name: 'Heaven', colour: '#D2604E', mult: 6.5, glow: 4 },
};

/**
 * What a piece of gear does.
 *
 * These are deliberately the *same seven axes the technique tree moves*. That is what
 * makes a build a build: a 運 Fortune node and a 運 roll on a ring pull the same lever,
 * so a player can reach the same place by two routes and choose which.
 *
 * Two affixes were not enough. With one stat per piece, a player walking the 神 Spirit
 * path found every weapon useless, so the whole slot was dead to them. Now every piece
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
  /** Scales the rolled value: a point of 破 Sunder is worth far more than one of 力. */
  readonly scale: number;
  /** How often it turns up as a secondary. */
  readonly weight: number;
}

/**
 * 運 and 拾 both used to read as chance words, "rare drops" and "drop chance", and
 * nobody could tell which was which. They are two different questions: 拾 is whether
 * anything falls at all, 運 is how good it is when it does.
 */
export const AFFIX_INFO: Record<Affix, AffixInfo> = {
  power:    { han: '力', label: 'power',        unit: '%',    scale: 1,    weight: 26 },
  rate:     { han: '氣', label: 'qi per second', unit: '%',   scale: 1,    weight: 26 },
  luck:     { han: '運', label: 'rarer gear',   unit: '%',    scale: 0.7,  weight: 14 },
  find:     { han: '拾', label: 'drop chance',  unit: '%',    scale: 0.22, weight: 12 },
  capacity: { han: '藏', label: 'chest slots',  unit: 'flat', scale: 0.08, weight: 8 },
  sunder:   { han: '破', label: 'beasts weaker', unit: '%',   scale: 0.18, weight: 8 },
  refine:   { han: '煉', label: 'fusion quality', unit: '%',  scale: 0.3,  weight: 6 },
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

export interface GearTemplate {
  readonly key: string;
  readonly han: string;
  readonly name: string;
  readonly slot: Slot;
  readonly icon: string;
  /** The realm this version of the archetype belongs to. */
  readonly realm: number;
  readonly affix: Affix;
  /** Which shape it is, independent of realm. */
  readonly archetype: string;
}

/**
 * 型 An archetype: a shape of thing, with its own icon and its own axis.
 *
 * An archetype is *not* tied to a realm. The first table bound them together, one piece
 * per slot per realm, which meant a cultivator in the third realm had exactly one
 * weapon to find, and no choice at all. Now every archetype exists at every realm, so
 * the question at any point in the game is "which of the nine, and at what rank",
 * instead of "here is the one".
 */
export interface Archetype {
  readonly key: string;
  readonly han: string;
  readonly name: string;
  readonly slot: Slot;
  readonly icon: string;
  readonly affix: Affix;
}

const a = (key: string, han: string, name: string, slot: Slot, icon: string, affix: Affix): Archetype =>
  ({ key, han, name, slot, icon, affix });

/**
 * Nine archetypes per slot, spread across the axes so no slot serves one path only.
 * Every one of them is findable in every realm.
 */
export const ARCHETYPES: readonly Archetype[] = [
  // 劍 the hand
  a('sword',    '劍', 'Sword',      'weapon', 'ancient-sword',  'power'),
  a('saber',    '刀', 'Saber',      'weapon', 'katana',         'power'),
  a('crescent', '鉤', 'Crescent',   'weapon', 'crescent-blade', 'power'),
  a('hooks',    '雙鉤', 'Twin Hooks','weapon', 'hook-swords',   'sunder'),
  a('spear',    '槍', 'Spear',      'weapon', 'barbed-spear',   'power'),
  a('fan',      '扇', 'Fan',        'weapon', 'handheld-fan',   'rate'),
  a('staff',    '杖', 'Staff',      'weapon', 'wizard-staff',   'rate'),
  a('trident',  '戟', 'Trident',    'weapon', 'trident',        'power'),
  a('scythe',   '鐮', 'Scythe',     'weapon', 'scythe',         'luck'),

  // 袍 the body
  a('robe',     '袍', 'Robe',       'robe', 'robe',           'rate'),
  a('vest',     '甲', 'Vest',       'robe', 'leather-vest',   'power'),
  a('kimono',   '道衣', 'Kimono',   'robe', 'kimono',         'rate'),
  a('cloak',    '氅', 'Cloak',      'robe', 'cloak',          'luck'),
  a('lamellar', '鱗', 'Lamellar',   'robe', 'lamellar',       'power'),
  a('plate',    '鎧', 'Breastplate','robe', 'chest-armor',    'power'),
  a('pauldrons','肩', 'Pauldrons',  'robe', 'shoulder-armor', 'sunder'),
  a('wings',    '翼', 'Winged Robe','robe', 'wing-cloak',     'rate'),
  a('mantle',   '衣', 'Mantle',     'robe', 'cape',           'capacity'),

  // 冠 the head
  a('band',     '巾', 'Band',       'crown', 'bandana',       'rate'),
  a('laurel',   '桂', 'Laurel',     'crown', 'laurels',       'luck'),
  a('pin',      '簪', 'Hairpin',    'crown', 'jewel-crown',   'rate'),
  a('horned',   '角', 'Horned Helm','crown', 'horned-helm',   'power'),
  a('bonecrown','骨冠', 'Bone Crown','crown', 'crenel-crown', 'refine'),
  a('visor',    '面', 'Visor',      'crown', 'visored-helm',  'power'),
  a('diadem',   '帝冠', 'Diadem',   'crown', 'imperial-crown','rate'),
  a('ritual',   '法冠', 'Ritual Crown','crown','pope-crown',  'refine'),
  a('dragonhead','龍首','Dragon Head','crown','dragon-head',  'power'),

  // 靴 the feet
  a('bare',     '赤', 'Bare Feet',  'boots', 'barefoot',      'rate'),
  a('sandals',  '鞋', 'Sandals',    'boots', 'sandal',        'find'),
  a('tabi',     '布靴', 'Tabi',     'boots', 'tabi-boot',     'rate'),
  a('walkers',  '行靴', 'Walkers',  'boots', 'walking-boot',  'find'),
  a('leather',  '皮靴', 'Leather Boots','boots','leather-boot','power'),
  a('greaves',  '脛甲', 'Greaves',  'boots', 'greaves',       'power'),
  a('ironboots','鐵靴', 'Iron Boots','boots','metal-boot',    'sunder'),
  a('furboots', '裘靴', 'Fur Boots','boots', 'fur-boot',      'capacity'),
  a('windfoot', '風足', 'Wind Foot','boots', 'wingfoot',      'rate'),

  // 珮 the pocket
  a('charm',    '符', 'Charm',      'talisman', 'wax-seal',       'rate'),
  a('bonecharm','骨佩', 'Bone Charm','talisman','tribal-pendant', 'power'),
  a('beads',    '珠', 'Beads',      'talisman', 'prayer-beads',   'rate'),
  a('scroll',   '卷', 'Scroll',     'talisman', 'tied-scroll',    'refine'),
  a('pendant',  '珮', 'Pendant',    'talisman', 'gem-pendant',    'power'),
  a('medal',    '章', 'Medal',      'talisman', 'star-medal',     'luck'),
  a('censer',   '爐', 'Censer',     'talisman', 'incense',        'rate'),
  a('orb',      '球', 'Orb',        'talisman', 'crystal-ball',   'luck'),
  a('wand',     '珠杖', 'Orb Wand', 'talisman', 'orb-wand',       'capacity'),

  // 戒 the finger
  a('plainring','素戒', 'Plain Ring','ring', 'ring',          'power'),
  a('topaz',    '黃玉', 'Topaz',    'ring', 'topaz',          'rate'),
  a('amethyst', '紫晶', 'Amethyst', 'ring', 'amethyst',       'luck'),
  a('emerald',  '翠戒', 'Emerald',  'ring', 'emerald',        'find'),
  a('flamering','炎戒', 'Flame Ring','ring','fire-ring',      'power'),
  a('frostring','霜戒', 'Frost Ring','ring','frozen-ring',    'sunder'),
  a('powerring','力戒', 'Power Ring','ring','power-ring',     'power'),
  a('spiralring','渦戒','Spiral Ring','ring','swirl-ring',    'refine'),
  a('starring', '星環', 'Ringed Star','ring','ringed-planet', 'rate'),
];

/**
 * 系 The nine sets: one family of equipment per realm.
 *
 * "Iron Sword" and "Heaven Scythe" named a material and a rank, which is a spreadsheet
 * column, not a place in a world. A set instead is a *lineage*: 落星 Fallen Star is the
 * metal of a star that came down, 龍骸 Dragonwake is cut from what a dragon left behind,
 * 仙蛻 Ascendant Husk is the skin an immortal stepped out of. The name tells you where
 * it came from, and every piece of that realm carries it.
 *
 * And a set is not only a name: wearing several pieces of the same lineage pays. That
 * turns a chest of loose drops into a question. Six matched pieces of the fifth realm,
 * or six unmatched pieces of the seventh? That is the whole reason sets exist.
 */
export interface SetStep {
  /** How many pieces of the set must be worn for this step to count. */
  readonly pieces: number;
  readonly effects: Readonly<Partial<Record<Affix, number>>>;
}

export interface RealmSet {
  readonly realm: number;
  /** Two characters, and what a piece of this realm is called in Chinese. */
  readonly han: string;
  /** The set's own name, as the screen says it. */
  readonly name: string;
  /** What goes in front of an archetype in a piece's English name. */
  readonly word: string;
  /** One line: where the stuff comes from. */
  readonly lore: string;
  /** What the set is good at. Its steps all pull these levers. */
  readonly axes: readonly Affix[];
  readonly steps: readonly SetStep[];
}

/** The three steps of every set, and how much harder each one hits. */
export const SET_STEPS: readonly number[] = [2, 4, 6];
const SET_WEIGHT: readonly number[] = [1, 2, 4];

/**
 * A set's step values are derived, not typed out, so no set can quietly outclass another:
 * the realm sets the size, the axis's own scale converts it, and a set that spreads over
 * two axes gets half of each rather than twice as much.
 */
function setSteps(realm: number, axes: readonly Affix[]): readonly SetStep[] {
  return SET_STEPS.map((pieces, i) => ({
    pieces,
    effects: Object.fromEntries(axes.map((a) => [
      a,
      roundValue(a, (realm * SET_WEIGHT[i] * AFFIX_INFO[a].scale) / axes.length),
    ])) as Partial<Record<Affix, number>>,
  }));
}

const set = (
  realm: number, han: string, name: string, word: string,
  lore: string, axes: readonly Affix[],
): RealmSet => ({ realm, han, name, word, lore, axes, steps: setSteps(realm, axes) });

export const REALM_SETS: readonly RealmSet[] = [
  set(1, '凡鐵', 'Mortal Iron', 'Mortal Iron',
    'Village smithing. It holds an edge and nothing else.', ['power']),
  set(2, '枯骨', 'Withered Bone', 'Withered Bone',
    'Cut from what the beasts of the first realm left behind.', ['sunder']),
  set(3, '古銅', 'Elder Bronze', 'Elder Bronze',
    'Dug out of a sect that fell long before yours rose.', ['power', 'rate']),
  set(4, '霜銀', 'Frostsilver', 'Frostsilver',
    'Silver drawn from a river that never thaws.', ['rate']),
  set(5, '碧玉', 'Jadewater', 'Jadewater',
    'Jade soft enough to drink from, hard enough to turn a blade.', ['rate', 'refine']),
  set(6, '落星', 'Fallen Star', 'Starfall',
    'The metal of a star that came down and was still warm.', ['luck', 'find']),
  set(7, '雷紋', 'Thunderscript', 'Thunderscript',
    'Struck so often by lightning that the marks became writing.', ['power', 'sunder']),
  set(8, '龍骸', 'Dragonwake', 'Dragonwake',
    'Taken from a dragon that died of nothing but age.', ['power', 'find']),
  set(9, '仙蛻', 'Ascendant Husk', 'Ascendant',
    'The skin an immortal stepped out of on their way up.', ['power', 'rate', 'luck']),
];

export function realmSet(realm: number): RealmSet {
  return REALM_SETS[Math.max(0, Math.min(REALM_SETS.length - 1, realm - 1))];
}

/**
 * Every archetype at every realm: 54 shapes times nine realms, 486 pieces.
 *
 * They are generated rather than typed out, which is the point. A new archetype adds
 * nine pieces, and a tenth realm would add fifty-four, without a line of naming.
 */
export const GEAR: readonly GearTemplate[] = ARCHETYPES.flatMap((arch) =>
  REALM_SETS.map((rs): GearTemplate => ({
    key: `${arch.key}${rs.realm}`,
    han: `${rs.han}${arch.han}`,
    name: `${rs.word} ${arch.name}`,
    slot: arch.slot,
    icon: arch.icon,
    realm: rs.realm,
    affix: arch.affix,
    archetype: arch.key,
  })),
);

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
  /** 煉 How many times it has been refined. Every line on it is multiplied by this. */
  readonly refine?: number;
}

/**
 * 煉 What a piece's lines are multiplied by, from refining.
 *
 * It lives here rather than in sim/refine.ts so that nothing can read a roll without it:
 * a refined piece has to be worth more everywhere at once, in the totals, on the screen
 * and in the comparison that says one piece beats another, or the number they refined stops
 * being the number the game uses.
 */
export const REFINE_PER_LEVEL = 0.04;

export function refinedBy(item: Item): number {
  const n = item.refine;
  if (typeof n !== 'number' || !Number.isFinite(n) || n <= 0) return 1;
  return (1 + REFINE_PER_LEVEL) ** Math.floor(n);
}

/** What this piece gives on one axis, counting every line it carries, refining included. */
export function valueOf(item: Item, affix: Affix): number {
  let total = 0;
  for (const r of item.rolls) if (r.affix === affix) total += r.value;
  return total * refinedBy(item);
}

/** The line the piece is named by, which is what a one-line summary shows. */
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

export function archetypesOf(slot: Slot): readonly Archetype[] {
  return ARCHETYPES.filter((x) => x.slot === slot);
}

/** The same shape at every realm, for a catalogue row. */
export function ladderOf(archetype: string): readonly GearTemplate[] {
  return GEAR.filter((g) => g.archetype === archetype).sort((x, y) => x.realm - y.realm);
}

export type Worn = Partial<Record<Slot, Item>>;

/**
 * What a whole set is worth: one multiplier for power, one for the qi rate.
 *
 * `affinityOf` is how the technique tree reaches gear without locking any of it away.
 * a path makes certain slots count for more, rather than making the rest unwearable.
 */
export type GearTotals = Record<Affix, number>;

/**
 * Everything the worn set adds, axis by axis, with affinity applied.
 *
 * `affinityOf` is how the technique tree reaches gear without locking any of it away.
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
    const mult = affinityOf(slot) * refinedBy(it);
    for (const roll of it.rolls) totals[roll.affix] += roll.value * mult;
  }
  return totals;
}

/**
 * 系 What lineage is on the body, and how many pieces of it.
 *
 * Keyed by realm, because the set *is* the realm: any 落星 piece counts toward 落星,
 * whichever shape it happens to be. That is what makes a set reachable: six matched
 * pieces means six drops from one realm, not six drops of one sword.
 */
export function setsWorn(worn: Worn): Map<number, number> {
  const count = new Map<number, number>();
  for (const slot of SLOTS) {
    const it = worn[slot];
    if (!it) continue;
    const realm = templateOf(it).realm;
    count.set(realm, (count.get(realm) ?? 0) + 1);
  }
  return count;
}

export interface ActiveSet {
  readonly set: RealmSet;
  readonly worn: number;
  /** The steps this many pieces have reached. Steps stack: 4 pieces pays 2 and 4. */
  readonly steps: readonly SetStep[];
  /** The next step, and how many more pieces it wants. Absent once the set is full. */
  readonly next?: { readonly step: SetStep; readonly needs: number };
}

/** Every lineage on the body with at least one piece, deepest set first. */
export function activeSets(worn: Worn): readonly ActiveSet[] {
  const out: ActiveSet[] = [];
  for (const [realm, n] of setsWorn(worn)) {
    const rs = realmSet(realm);
    const steps = rs.steps.filter((x) => n >= x.pieces);
    const next = rs.steps.find((x) => n < x.pieces);
    out.push({ set: rs, worn: n, steps, ...(next ? { next: { step: next, needs: next.pieces - n } } : {}) });
  }
  return out.sort((a, b) => b.worn - a.worn || b.set.realm - a.set.realm);
}

/**
 * What the lineages add, on top of the pieces' own lines.
 *
 * Rounded per axis at the end: three steps of 4.9% add up to 14.700000000000001 in
 * binary floating point, and a number the player reads should never look like that.
 */
export function setTotals(worn: Worn): GearTotals {
  const totals = Object.fromEntries(AFFIXES.map((a) => [a, 0])) as GearTotals;
  for (const active of activeSets(worn)) {
    for (const step of active.steps) {
      for (const [affix, value] of Object.entries(step.effects)) {
        totals[affix as Affix] += value ?? 0;
      }
    }
  }
  for (const a of AFFIXES) if (totals[a]) totals[a] = roundValue(a, totals[a]);
  return totals;
}

/** The pieces' own lines plus whatever the lineages pay: what the player actually has. */
export function wornTotals(
  worn: Worn,
  affinityOf: (slot: Slot) => number = () => 1,
): GearTotals {
  const gear = gearTotals(worn, affinityOf);
  const sets = setTotals(worn);
  return Object.fromEntries(AFFIXES.map((a) => [a, gear[a] + sets[a]])) as GearTotals;
}

/** The two multipliers the rest of the sim asks for most often. */
export function setBonus(
  worn: Worn,
  affinityOf: (slot: Slot) => number = () => 1,
): { power: number; rate: number } {
  const t = wornTotals(worn, affinityOf);
  return { power: 1 + t.power / 100, rate: 1 + t.rate / 100 };
}

/**
 * 相 The worn aura: the highest rank anywhere on the body.
 *
 * It is what makes gear worth wearing beyond the numbers. A 天 Heaven piece shows on
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
