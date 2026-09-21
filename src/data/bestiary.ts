import { LAYERS_PER_REALM } from '../sim/balance.ts';

/**
 * 妖 The bestiary.
 *
 * Thirty-six beasts: three common and one warden per realm. The ladder runs from
 * vermin in the first realm to demons and a dragon in the ninth — the variety is what
 * makes free hunting worth opening the app for, and a three-month climb needs that.
 *
 * Every beast is one row in this table. The icon is a filename from game-icons.net;
 * nothing here is hand-drawn.
 */
export interface Beast {
  readonly key: string;
  readonly han: string;
  readonly name: string;
  /** 1..9 — the realm it appears in. */
  readonly realm: number;
  /**
   * 層 Which layer of that realm it walks out of. 0 means the breakthrough itself.
   *
   * Measured, this is the difference between a realm that keeps giving and a realm that
   * is a bar: the eighth realm lasts sixteen days for an active cultivator and used to
   * hand over its three beasts, its stance, its art and its whole gear lineage in the
   * first minute of them. Nothing new for the remaining fifteen.
   *
   * A realm is heavily back-loaded — its last rung alone is a fifth to a third of its
   * whole length — so the three layers are not evenly spaced. Taken from the ladder:
   *
   *     layer   0     4     7
   *     realm 1 opens 14%   47% of the way through
   *     realm 9 opens 27%   63%
   *
   * Which puts a new animal in front of the player at the breakthrough, again about a
   * quarter of the way in, and again around two thirds — and leaves the last stretch
   * before the warden as the stretch before the warden, which is its own event.
   *
   * 初 The first realm is the exception and keeps all three from the first second. Its
   * beasts are already spaced by *difficulty* rather than by layer — the rat is winnable
   * at twelve minutes, the hound at 1.6 hours, the frog at 3.5 (see FIRST_STEPS) — and a
   * layer gate on top of that would hide a beast the player could already have beaten.
   * There is also nothing else in the first realm to look at.
   */
  readonly layer: number;
  readonly icon: string;
  /** Wardens bar the breakthrough; commons are free hunting. */
  readonly warden?: true;
}

/** 層 Where in a realm its three commons walk out. See Beast.layer for the measurement. */
export const COMMON_LAYERS = [0, 4, 7] as const;

const b = (key: string, han: string, name: string, realm: number, icon: string,
           nth: 0 | 1 | 2): Beast =>
  ({ key, han, name, realm, layer: realm === 1 ? 0 : COMMON_LAYERS[nth], icon });

/** A warden stands at the ceiling, which is the last layer and never anywhere else. */
const w = (key: string, han: string, name: string, realm: number, icon: string): Beast =>
  ({ key, han, name, realm, layer: LAYERS_PER_REALM - 1, icon, warden: true });

export const BEASTS: readonly Beast[] = [
  // 1 練氣 — animals. Nothing supernatural yet.
  b('rat',       '山鼠', 'Mountain Rat',   1, 'rat', 0),
  b('hound',     '野犬', 'Wild Hound',     1, 'hound', 1),
  b('frog',      '澤蛙', 'Marsh Frog',     1, 'frog', 2),
  w('fox',       '妖狐', 'Spirit Fox',     1, 'fox-head'),

  // 2 築基 — the first things with qi inside them.
  b('serpent',   '青蛇', 'Green Serpent',  2, 'snake', 0),
  b('mantis',    '螳螂', 'Praying Mantis', 2, 'praying-mantis', 1),
  b('bat',       '血蝠', 'Blood Bat',      2, 'bat', 2),
  w('ape',       '石猿', 'Stone Ape',      2, 'monkey'),

  // 3 金丹 — wings and carapaces.
  b('beetle',    '鐵甲', 'Iron Beetle',    3, 'scarab-beetle', 0),
  b('owl',       '夜梟', 'Night Owl',      3, 'owl', 1),
  b('raven',     '血鴉', 'Blood Raven',    3, 'raven', 2),
  w('crane',     '仙鶴', 'Immortal Crane', 3, 'heron'),

  // 4 元嬰 — properly large beasts.
  b('boar',      '鐵根彘', 'Ironroot Boar', 4, 'boar-tusks', 0),
  b('wolf',      '灰狼', 'Grey Wolf',      4, 'wolf-head', 1),
  b('vulture',   '山鷲', 'Ridge Vulture',  4, 'vulture', 2),
  w('tiger',     '雷虎', 'Thunder Tiger',  4, 'tiger-head'),

  // 5 化神 — spirits of water and clay.
  b('crab',      '巨蟹', 'Giant Crab',     5, 'crab', 0),
  b('jellyfish', '水母', 'Jellyfish',      5, 'jellyfish', 1),
  b('lizard',    '岩蜥', 'Rock Lizard',    5, 'gecko', 2),
  w('turtle',    '玄武', 'Black Turtle',   5, 'turtle'),

  // 6 煉虛 — what crawls where qi rots.
  b('centipede', '蜈蚣', 'Iron Centipede', 6, 'centipede', 0),
  b('scorpion',  '毒蠍', 'Venom Scorpion', 6, 'scorpion', 1),
  b('worm',      '屍蟲', 'Corpse Worm',    6, 'earth-worm', 2),
  w('golem',     '石傀', 'Stone Puppet',   6, 'golem-head'),

  // 7 合體 — the demonic arrives.
  b('ogre',      '魔猿', 'Demon Ogre',     7, 'ogre', 0),
  b('goblin',    '鬼面', 'Ghost Face',     7, 'goblin-head', 1),
  b('wraith',    '陰魂', 'Yin Wraith',     7, 'floating-ghost', 2),
  w('direwolf',  '魔狼', 'Demon Wolf',     7, 'direwolf'),

  // 8 大乘 — the greater demons.
  b('skeleton',  '骨將', 'Bone General',   8, 'skeleton', 0),
  b('gargoyle',  '石鬼', 'Gargoyle',       8, 'gargoyle', 1),
  b('minotaur',  '牛魔', 'Bull Demon',     8, 'minotaur', 2),
  w('jiao',      '蛟',   'Serpent Dragon', 8, 'sea-serpent'),

  // 9 渡劫 — what only exists near heaven.
  b('harpy',     '羽妖', 'Harpy',          9, 'harpy', 0),
  b('unicorn',   '獨角', 'Unicorn',        9, 'unicorn', 1),
  b('squid',     '巨章', 'Colossal Squid', 9, 'giant-squid', 2),
  w('dragon',    '龍',   'Dragon',         9, 'spiked-dragon-head'),
];

export const WARDENS: readonly Beast[] =
  BEASTS.filter((x) => x.warden).sort((a, c) => a.realm - c.realm);

export function commonsOf(realm: number): readonly Beast[] {
  return BEASTS.filter((x) => !x.warden && x.realm === realm);
}

/**
 * 出 Has this beast walked out yet?
 *
 * A beast from a realm already left is always out — going back is the whole of 錄 the
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
