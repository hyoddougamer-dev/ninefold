import type { Tier } from '../sim/types';

export type Phase = 'wood' | 'fire' | 'earth' | 'metal' | 'water';

export interface Realm {
  readonly n: number;
  readonly han: string;
  readonly name: string;
  readonly phase: Phase;
  /** What arrives in the art at this realm. ART.md owns the drawing; this is the cue. */
  readonly adds: string;
}

export const REALMS: readonly Realm[] = [
  { n: 1, han: '練氣', name: 'Qi Refining',     phase: 'wood',  adds: '' },
  { n: 2, han: '築基', name: 'Foundation',      phase: 'wood',  adds: 'the second road opens' },
  { n: 3, han: '金丹', name: 'Golden Core',     phase: 'fire',  adds: '圓光 the halo; arts can be learned' },
  { n: 4, han: '元嬰', name: 'Nascent Soul',    phase: 'fire',  adds: '塵 motes; the second ground' },
  { n: 5, han: '化神', name: 'Spirit Severing', phase: 'earth', adds: '蓮 the lotus seat; channels open' },
  { n: 6, han: '煉虛', name: 'Void Refining',   phase: 'earth', adds: '環 the orbit ring; wardens become fightable' },
  { n: 7, han: '合體', name: 'Unity',           phase: 'metal', adds: 'the second halo, 柱 the column of light' },
  { n: 8, han: '大乘', name: 'Great Vehicle',   phase: 'metal', adds: '芒 radiating spokes; the Scar opens' },
  { n: 9, han: '渡劫', name: 'Tribulation',     phase: 'water', adds: '九雷 nine bolts; the ceiling' },
];

export interface Beast {
  readonly key: string;
  readonly han: string;
  readonly name: string;
  /** 1..5, the rank the seal frame carries. */
  readonly rank: number;
  readonly tier: Tier;
}

export interface Ground {
  readonly key: string;
  readonly han: string;
  readonly name: string;
  readonly phase: Phase;
  /** Realm at which this ground opens. 弓 bow reaches one realm early. */
  readonly opensAt: number;
  readonly beasts: readonly Beast[];
  readonly warden: Beast;
}

const b = (key: string, han: string, name: string, rank: number, tier: Tier): Beast =>
  ({ key, han, name, rank, tier });

export const GROUNDS: readonly Ground[] = [
  {
    key: 'ash', han: '灰坡', name: 'Ash Slopes', phase: 'wood', opensAt: 1,
    beasts: [
      b('hare',   '灰兔',   'Ash Hare',     1, 'common'),
      b('beetle', '鐵甲蟲', 'Iron Beetle',  1, 'common'),
      b('shrike', '棘伯勞', 'Thorn Shrike', 2, 'common'),
    ],
    warden: b('greyking', '灰王', 'The Grey King', 3, 'spirit'),
  },
  {
    key: 'marsh', han: '蘆沼', name: 'Reed Marsh', phase: 'wood', opensAt: 2,
    beasts: [
      b('serpent', '青蛇', 'Green Serpent', 2, 'common'),
      b('crane',   '仙鶴', 'Immortal Crane', 2, 'spirit'),
      b('toad',    '月蟾', 'Moon Toad',      3, 'spirit'),
    ],
    warden: b('marshlord', '沼君', 'The Marsh Lord', 3, 'spirit'),
  },
  {
    key: 'cinder', han: '燼林', name: 'Cinder Wood', phase: 'fire', opensAt: 4,
    beasts: [
      b('fox',  '九尾狐', 'Nine-Tailed Fox', 3, 'spirit'),
      b('ape',  '石猿',   'Stone Ape',       3, 'mystic'),
      b('moth', '燈蛾',   'Lantern Moth',    2, 'mystic'),
    ],
    warden: b('cindermother', '燼母', 'The Cinder Mother', 4, 'mystic'),
  },
  {
    key: 'ridge', han: '雷脊', name: 'Thunder Ridge', phase: 'earth', opensAt: 5,
    beasts: [
      b('tiger', '雷虎',   'Thunder Tiger', 4, 'mystic'),
      b('boar',  '鐵根彘', 'Ironroot Boar', 3, 'mystic'),
      b('lynx',  '霜猞',   'Frost Lynx',    4, 'earth'),
    ],
    warden: b('thundersovereign', '雷君', 'The Thunder Sovereign', 4, 'earth'),
  },
  {
    key: 'palace', han: '沉宮', name: 'Sunken Palace', phase: 'metal', opensAt: 7,
    beasts: [
      b('roc',    '天鵬',   'Heaven Roc',    4, 'earth'),
      b('turtle', '玄武龜', 'Dark Turtle',   4, 'earth'),
      b('drake',  '溺蛟',   'Drowning Drake', 5, 'earth'),
    ],
    warden: b('palaceguardian', '沉宮守', 'The Palace Guardian', 5, 'heaven'),
  },
  {
    // Finding 3: the longest stretch in the game gets the newest content, not the emptiest.
    key: 'scar', han: '天裂', name: 'The Scar', phase: 'water', opensAt: 8,
    beasts: [
      b('qilin',  '炎麒麟', 'Flame Qilin', 5, 'heaven'),
      b('wraith', '陰魂',   'Yin Wraith',  5, 'heaven'),
      b('hydra',  '九頭蟒', 'Nine-Head Hydra', 5, 'heaven'),
    ],
    warden: b('skysplitter', '裂天', 'Skysplitter', 5, 'heaven'),
  },
];

export const GROUND_BY_KEY: Readonly<Record<string, Ground>> =
  Object.fromEntries(GROUNDS.map((g) => [g.key, g]));

export const BEASTS: readonly Beast[] =
  GROUNDS.flatMap((g) => [...g.beasts, g.warden]);

export const BEAST_BY_KEY: Readonly<Record<string, Beast>> =
  Object.fromEntries(BEASTS.map((x) => [x.key, x]));
