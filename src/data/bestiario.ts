/**
 * 妖 O bestiário.
 *
 * Trinta e seis bestas: três comuns e uma guardiã por reino. A escada vai de bicho de
 * mato no primeiro reino a demônio e dragão no nono — a variedade é o que faz a caça
 * livre valer a pena abrir o app, e os três meses de subida precisam disso.
 *
 * Cada besta é uma linha nesta tabela. O ícone é o nome do arquivo no acervo
 * game-icons.net; nada aqui é desenhado à mão.
 */
export interface Besta {
  readonly chave: string;
  readonly han: string;
  readonly nome: string;
  /** 1..9 — o reino em que ela aparece. */
  readonly reino: number;
  readonly icone: string;
  /** Guardiãs barram o rompimento; comuns são caça livre. */
  readonly guardia?: true;
}

const b = (chave: string, han: string, nome: string, reino: number, icone: string): Besta =>
  ({ chave, han, nome, reino, icone });

const g = (chave: string, han: string, nome: string, reino: number, icone: string): Besta =>
  ({ chave, han, nome, reino, icone, guardia: true });

export const BESTAS: readonly Besta[] = [
  // 1 練氣 — bicho de mato. Nada sobrenatural ainda.
  b('rato',      '山鼠', 'Rato da montanha',  1, 'rat'),
  b('cao',       '野犬', 'Cão selvagem',      1, 'hound'),
  b('sapo',      '澤蛙', 'Rã do brejo',       1, 'frog'),
  g('raposa',    '妖狐', 'Raposa espiritual', 1, 'fox-head'),

  // 2 築基 — as primeiras coisas com qi dentro.
  b('serpente',  '青蛇', 'Serpente verde',    2, 'snake'),
  b('louvadeus', '螳螂', 'Louva-a-deus',      2, 'praying-mantis'),
  b('morcego',   '血蝠', 'Morcego de sangue', 2, 'bat'),
  g('macaco',    '石猿', 'Macaco de pedra',   2, 'monkey'),

  // 3 金丹 — asas e carapaças.
  b('besouro',   '鐵甲', 'Besouro de ferro',  3, 'scarab-beetle'),
  b('coruja',    '夜梟', 'Coruja noturna',    3, 'owl'),
  b('corvo',     '血鴉', 'Corvo de sangue',   3, 'raven'),
  g('grou',      '仙鶴', 'Grou imortal',      3, 'crane'),

  // 4 元嬰 — feras grandes de verdade.
  b('javali',    '鐵根彘', 'Javali raiz-de-ferro', 4, 'boar-tusks'),
  b('lobo',      '灰狼', 'Lobo cinzento',     4, 'wolf-head'),
  b('abutre',    '山鷲', 'Abutre da serra',   4, 'vulture'),
  g('tigre',     '雷虎', 'Tigre do trovão',   4, 'tiger-head'),

  // 5 化神 — espíritos de água e barro.
  b('caranguejo','巨蟹', 'Caranguejo gigante', 5, 'crab'),
  b('medusa',    '水母', 'Água-viva',         5, 'jellyfish'),
  b('lagarto',   '岩蜥', 'Lagarto de rocha',  5, 'gecko'),
  g('tartaruga', '玄武', 'Tartaruga negra',   5, 'turtle'),

  // 6 煉虛 — o que rasteja onde o qi apodrece.
  b('centopeia', '蜈蚣', 'Centopeia de ferro', 6, 'centipede'),
  b('escorpiao', '毒蠍', 'Escorpião venenoso', 6, 'scorpion'),
  b('verme',     '屍蟲', 'Verme cadavérico',  6, 'earth-worm'),
  g('golem',     '石傀', 'Boneco de pedra',   6, 'golem-head'),

  // 7 合體 — o demoníaco entra.
  b('ogro',      '魔猿', 'Ogro demoníaco',    7, 'ogre'),
  b('duende',    '鬼面', 'Face de fantasma',  7, 'goblin-head'),
  b('espectro',  '陰魂', 'Espectro Yin',      7, 'floating-ghost'),
  g('lobomago',  '魔狼', 'Lobo demoníaco',    7, 'direwolf'),

  // 8 大乘 — os grandes demônios.
  b('esqueleto', '骨將', 'General de ossos',  8, 'skeleton'),
  b('gargula',   '石鬼', 'Gárgula',           8, 'gargoyle'),
  b('minotauro', '牛魔', 'Demônio-touro',     8, 'minotaur'),
  g('jiao',      '蛟',   'Dragão-serpente',   8, 'sea-serpent'),

  // 9 渡劫 — o que só existe perto do céu.
  b('harpia',    '羽妖', 'Harpia',            9, 'harpy'),
  b('unicornio', '獨角', 'Unicórnio',         9, 'unicorn'),
  b('lula',      '巨章', 'Lula colossal',     9, 'giant-squid'),
  g('dragao',    '龍',   'Dragão',            9, 'spiked-dragon-head'),
];

export const GUARDIAS: readonly Besta[] =
  BESTAS.filter((x) => x.guardia).sort((a, c) => a.reino - c.reino);

export function comunsDo(reino: number): readonly Besta[] {
  return BESTAS.filter((x) => !x.guardia && x.reino === reino);
}

export function guardiaDo(reino: number): Besta {
  return GUARDIAS[Math.max(0, Math.min(GUARDIAS.length - 1, reino - 1))];
}

/** Todas as bestas liberadas até o reino em que o cultivador está. */
export function cacaveis(reino: number): readonly Besta[] {
  return BESTAS.filter((x) => !x.guardia && x.reino <= reino);
}
