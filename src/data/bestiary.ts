import { LAYERS_PER_REALM } from '../sim/balance.ts';

/**
 * 妖 The bestiary.
 *
 * Thirty-six beasts: three common and one warden per realm. The ladder runs from
 * vermin in the first realm to demons and a dragon in the ninth: the variety is what
 * makes free hunting worth opening the app for, and a three-month climb needs that.
 *
 * Every beast is one row in this table. The icon is a filename from game-icons.net;
 * nothing here is hand-drawn.
 */
export interface Beast {
  readonly key: string;
  readonly han: string;
  readonly name: string;
  /** 1..9: the realm it appears in. */
  readonly realm: number;
  /**
   * 層 Which layer of that realm it walks out of. 0 means the breakthrough itself.
   *
   * Measured, this is the difference between a realm that keeps giving and a realm that
   * is a bar: the eighth realm lasts sixteen days for an active cultivator and used to
   * hand over its three beasts, its stance, its art and its whole gear lineage in the
   * first minute of them. Nothing new for the remaining fifteen.
   *
   * A realm is heavily back-loaded: its last rung alone is a fifth to a third of its
   * whole length, so the three layers are not evenly spaced. Taken from the ladder:
   *
   *     layer   0     4     7
   *     realm 1 opens 14%   47% of the way through
   *     realm 9 opens 27%   63%
   *
   * Which puts a new animal in front of the player at the breakthrough, again about a
   * quarter of the way in, and again around two thirds, and leaves the last stretch
   * before the warden as the stretch before the warden, which is its own event.
   *
   * 初 The first realm is the exception and keeps all three from the first second. Its
   * beasts are already spaced by *difficulty* rather than by layer: the rat is winnable
   * from the first second, the hound at about 45 minutes, the frog at 3.5 hours (see
   * FIRST_STEPS), and a
   * layer gate on top of that would hide a beast the player could already have beaten.
   * There is also nothing else in the first realm to look at.
   */
  readonly layer: number;
  readonly icon: string;
  /** Wardens bar the breakthrough; commons are free hunting. */
  readonly warden?: true;
  /**
   * 牌 The key this creature's painting is filed under, when it is not its own.
   *
   * 境外 A heaven's Dragon is built by `currentWarden` out of the ninth realm's dragon
   * with a different name and a different character on it, and it keeps that dragon's
   * `key` on purpose, because the key is what the kill record is counted by. Which meant
   * all nine of them showed the same painting: forty crossings against one picture, which
   * is the exact thing the named Dragons were introduced to stop.
   */
  readonly plate?: string;
  /**
   * 物 The three shapes of gear this beast leaves, by archetype key.
   *
   * Bruno: *"está tudo muito random ... deve ser lógico, não 100% rng."* Any beast used to
   * drop any of the fifty-four shapes, so there was no reason to hunt one beast over
   * another for a piece and no way to go looking for a sword. Now each beast leaves what
   * it is: a plated centipede leaves armour and boots, a grave worm what the dead were
   * buried with. Each realm's four beasts cover all six places on the body between them,
   * and every shape is left by somebody: `drops.test.ts` holds both.
   */
  readonly leaves: readonly string[];
}

/** 層 Where in a realm its three commons walk out. See Beast.layer for the measurement. */
export const COMMON_LAYERS = [0, 4, 7] as const;

const b = (key: string, han: string, name: string, realm: number, icon: string,
           nth: 0 | 1 | 2, leaves: readonly string[]): Beast =>
  ({ key, han, name, realm, layer: realm === 1 ? 0 : COMMON_LAYERS[nth], icon, leaves });

/** A warden stands at the ceiling, which is the last layer and never anywhere else. */
const w = (key: string, han: string, name: string, realm: number, icon: string,
           leaves: readonly string[]): Beast =>
  ({ key, han, name, realm, layer: LAYERS_PER_REALM - 1, icon, warden: true, leaves });

export const BEASTS: readonly Beast[] = [
  // 1 練氣: animals. Nothing supernatural yet.
  b('rat',       '山鼠', 'Mountain Rat',   1, 'rat', 0, ['band', 'sandals', 'plainring']),
  b('hound',     '野犬', 'Wild Hound',     1, 'hound', 1, ['saber', 'vest', 'leather']),
  b('frog',      '澤蛙', 'Marsh Frog',     1, 'frog', 2, ['beads', 'topaz', 'laurel']),
  w('fox',       '妖狐', 'Spirit Fox',     1, 'fox-head', ['fan', 'robe', 'charm']),

  // 2 築基: the first things with qi inside them.
  b('serpent',   '青蛇', 'Green Serpent',  2, 'snake', 0, ['spear', 'cloak', 'emerald']),
  b('mantis',    '螳螂', 'Praying Mantis', 2, 'praying-mantis', 1, ['crescent', 'walkers', 'pin']),
  b('bat',       '血蝠', 'Blood Bat',      2, 'bat', 2, ['wings', 'amethyst', 'bonecharm']),
  w('ape',       '石猿', 'Stone Ape',      2, 'monkey', ['horned', 'furboots', 'pendant']),

  // 3 金丹: wings and carapaces.
  b('beetle',    '鐵甲', 'Iron Beetle',    3, 'scarab-beetle', 0, ['lamellar', 'ironboots', 'visor']),
  b('owl',       '夜梟', 'Night Owl',      3, 'owl', 1, ['scroll', 'ritual', 'spiralring']),
  b('raven',     '血鴉', 'Blood Raven',    3, 'raven', 2, ['scythe', 'mantle', 'flamering']),
  w('crane',     '仙鶴', 'Immortal Crane', 3, 'heron', ['sword', 'bare', 'medal']),

  // 4 元嬰: properly large beasts.
  b('boar',      '鐵根彘', 'Ironroot Boar', 4, 'boar-tusks', 0, ['plate', 'greaves', 'bonecharm']),
  b('wolf',      '灰狼', 'Grey Wolf',      4, 'wolf-head', 1, ['hooks', 'furboots', 'frostring']),
  b('vulture',   '山鷲', 'Ridge Vulture',  4, 'vulture', 2, ['pauldrons', 'bonecrown', 'amethyst']),
  w('tiger',     '雷虎', 'Thunder Tiger',  4, 'tiger-head', ['trident', 'diadem', 'pendant']),

  // 5 化神: spirits of water and clay.
  b('crab',      '巨蟹', 'Giant Crab',     5, 'crab', 0, ['crescent', 'lamellar', 'greaves']),
  b('jellyfish', '水母', 'Jellyfish',      5, 'jellyfish', 1, ['kimono', 'spiralring', 'beads']),
  b('lizard',    '岩蜥', 'Rock Lizard',    5, 'gecko', 2, ['tabi', 'topaz', 'pin']),
  w('turtle',    '玄武', 'Black Turtle',   5, 'turtle', ['staff', 'ritual', 'wand']),

  // 6 煉虛: what crawls where qi rots.
  b('centipede', '蜈蚣', 'Iron Centipede', 6, 'centipede', 0, ['lamellar', 'ironboots', 'hooks']),
  b('scorpion',  '毒蠍', 'Venom Scorpion', 6, 'scorpion', 1, ['scythe', 'crescent', 'emerald']),
  b('worm',      '屍蟲', 'Corpse Worm',    6, 'earth-worm', 2, ['bonecharm', 'censer', 'scroll']),
  w('golem',     '石傀', 'Stone Puppet',   6, 'golem-head', ['visor', 'plate', 'horned']),

  // 7 合體: the demonic arrives.
  b('ogre',      '魔猿', 'Demon Ogre',     7, 'ogre', 0, ['spear', 'vest', 'powerring']),
  b('goblin',    '鬼面', 'Ghost Face',     7, 'goblin-head', 1, ['horned', 'charm', 'walkers']),
  b('wraith',    '陰魂', 'Yin Wraith',     7, 'floating-ghost', 2, ['cloak', 'censer', 'frostring']),
  w('direwolf',  '魔狼', 'Demon Wolf',     7, 'direwolf', ['saber', 'windfoot', 'bonecrown']),

  // 8 大乘: the greater demons.
  b('skeleton',  '骨將', 'Bone General',   8, 'skeleton', 0, ['sword', 'pauldrons', 'bonecharm']),
  b('gargoyle',  '石鬼', 'Gargoyle',       8, 'gargoyle', 1, ['visor', 'orb', 'ironboots']),
  b('minotaur',  '牛魔', 'Bull Demon',     8, 'minotaur', 2, ['trident', 'greaves', 'flamering']),
  w('jiao',      '蛟',   'Serpent Dragon', 8, 'sea-serpent', ['dragonhead', 'mantle', 'pendant']),

  // 9 渡劫: what only exists near heaven.
  b('harpy',     '羽妖', 'Harpy',          9, 'harpy', 0, ['wings', 'windfoot', 'fan']),
  b('unicorn',   '獨角', 'Unicorn',        9, 'unicorn', 1, ['diadem', 'starring', 'wand']),
  b('squid',     '巨章', 'Colossal Squid', 9, 'giant-squid', 2, ['kimono', 'spiralring', 'orb']),
  w('dragon',    '龍',   'Dragon',         9, 'spiked-dragon-head', ['spear', 'dragonhead', 'pendant']),
];

export const WARDENS: readonly Beast[] =
  BEASTS.filter((x) => x.warden).sort((a, c) => a.realm - c.realm);

export function commonsOf(realm: number): readonly Beast[] {
  return BEASTS.filter((x) => !x.warden && x.realm === realm);
}

/**
 * 出 Has this beast walked out yet?
 *
 * A beast from a realm already left is always out: going back is the whole of 錄 the
 * record and 圖鑑 the bestiary. Only the realm you are standing in gates on the layer.
 */
export function beastOut(b: Beast, realm: number, layer: number): boolean {
  if (b.realm < realm) return true;
  if (b.realm > realm) return false;
  return layer >= b.layer;
}

export function wardenOf(realm: number): Beast {
  return WARDENS[Math.max(0, Math.min(WARDENS.length - 1, realm - 1))];
}

/** Every common beast that has walked out, for a cultivator standing here. */
export function huntable(realm: number, layer = LAYERS_PER_REALM - 1): readonly Beast[] {
  return BEASTS.filter((x) => !x.warden && beastOut(x, realm, layer));
}

/** The commons of this realm still to come, in the order they arrive. */
export function comingIn(realm: number, layer: number): readonly Beast[] {
  return commonsOf(realm).filter((x) => x.layer > layer).sort((a, c) => a.layer - c.layer);
}

/** 牌 Which painting to look for, which is the creature's own key unless it says otherwise. */
export const plateOf = (b: Beast) => b.plate ?? b.key;

/**
 * 境外 The keys the nine heavens' Dragons file their paintings under.
 *
 * They are not in BEASTS and must not be: nothing hunts them, nothing counts them, and a
 * bestiary with forty entries in it would be a lie. They exist so 畫 the picture list can
 * hold a painting for each of them.
 */
export const HEAVEN_PLATES: readonly string[] =
  Array.from({ length: 9 }, (_, i) => `heaven-${i + 1}`);
