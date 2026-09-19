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
  readonly icon: string;
  /** Wardens bar the breakthrough; commons are free hunting. */
  readonly warden?: true;
}

const b = (key: string, han: string, name: string, realm: number, icon: string): Beast =>
  ({ key, han, name, realm, icon });

const w = (key: string, han: string, name: string, realm: number, icon: string): Beast =>
  ({ key, han, name, realm, icon, warden: true });

export const BEASTS: readonly Beast[] = [
  // 1 練氣 — animals. Nothing supernatural yet.
  b('rat',       '山鼠', 'Mountain Rat',   1, 'rat'),
  b('hound',     '野犬', 'Wild Hound',     1, 'hound'),
  b('frog',      '澤蛙', 'Marsh Frog',     1, 'frog'),
  w('fox',       '妖狐', 'Spirit Fox',     1, 'fox-head'),

  // 2 築基 — the first things with qi inside them.
  b('serpent',   '青蛇', 'Green Serpent',  2, 'snake'),
  b('mantis',    '螳螂', 'Praying Mantis', 2, 'praying-mantis'),
  b('bat',       '血蝠', 'Blood Bat',      2, 'bat'),
  w('ape',       '石猿', 'Stone Ape',      2, 'monkey'),

  // 3 金丹 — wings and carapaces.
  b('beetle',    '鐵甲', 'Iron Beetle',    3, 'scarab-beetle'),
  b('owl',       '夜梟', 'Night Owl',      3, 'owl'),
  b('raven',     '血鴉', 'Blood Raven',    3, 'raven'),
  w('crane',     '仙鶴', 'Immortal Crane', 3, 'crane'),

  // 4 元嬰 — properly large beasts.
  b('boar',      '鐵根彘', 'Ironroot Boar', 4, 'boar-tusks'),
  b('wolf',      '灰狼', 'Grey Wolf',      4, 'wolf-head'),
  b('vulture',   '山鷲', 'Ridge Vulture',  4, 'vulture'),
  w('tiger',     '雷虎', 'Thunder Tiger',  4, 'tiger-head'),

  // 5 化神 — spirits of water and clay.
  b('crab',      '巨蟹', 'Giant Crab',     5, 'crab'),
  b('jellyfish', '水母', 'Jellyfish',      5, 'jellyfish'),
  b('lizard',    '岩蜥', 'Rock Lizard',    5, 'gecko'),
  w('turtle',    '玄武', 'Black Turtle',   5, 'turtle'),

  // 6 煉虛 — what crawls where qi rots.
  b('centipede', '蜈蚣', 'Iron Centipede', 6, 'centipede'),
  b('scorpion',  '毒蠍', 'Venom Scorpion', 6, 'scorpion'),
  b('worm',      '屍蟲', 'Corpse Worm',    6, 'earth-worm'),
  w('golem',     '石傀', 'Stone Puppet',   6, 'golem-head'),

  // 7 合體 — the demonic arrives.
  b('ogre',      '魔猿', 'Demon Ogre',     7, 'ogre'),
  b('goblin',    '鬼面', 'Ghost Face',     7, 'goblin-head'),
  b('wraith',    '陰魂', 'Yin Wraith',     7, 'floating-ghost'),
  w('direwolf',  '魔狼', 'Demon Wolf',     7, 'direwolf'),

  // 8 大乘 — the greater demons.
  b('skeleton',  '骨將', 'Bone General',   8, 'skeleton'),
  b('gargoyle',  '石鬼', 'Gargoyle',       8, 'gargoyle'),
  b('minotaur',  '牛魔', 'Bull Demon',     8, 'minotaur'),
  w('jiao',      '蛟',   'Serpent Dragon', 8, 'sea-serpent'),

  // 9 渡劫 — what only exists near heaven.
  b('harpy',     '羽妖', 'Harpy',          9, 'harpy'),
  b('unicorn',   '獨角', 'Unicorn',        9, 'unicorn'),
  b('squid',     '巨章', 'Colossal Squid', 9, 'giant-squid'),
  w('dragon',    '龍',   'Dragon',         9, 'spiked-dragon-head'),
];

export const WARDENS: readonly Beast[] =
  BEASTS.filter((x) => x.warden).sort((a, c) => a.realm - c.realm);

export function commonsOf(realm: number): readonly Beast[] {
  return BEASTS.filter((x) => !x.warden && x.realm === realm);
}

export function wardenOf(realm: number): Beast {
  return WARDENS[Math.max(0, Math.min(WARDENS.length - 1, realm - 1))];
}

/** Every common beast unlocked up to the realm the cultivator stands in. */
export function huntable(realm: number): readonly Beast[] {
  return BEASTS.filter((x) => !x.warden && x.realm <= realm);
}
