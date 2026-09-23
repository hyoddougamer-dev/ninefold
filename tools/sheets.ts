/**
 * 張 The contact sheets: the whole bestiary in four generations, not fifty-four.
 *
 * Bruno: *"não consigo gerar tantas imagens com os créditos gratuitos do gpt. consegues
 * dar-me um prompt por batches e depois recortar as imagens e fazer a tua magia?"*
 *
 * So the unit of work stops being one creature and becomes one sheet. An image model
 * gives back one square picture per credit, and a square picture can hold twelve
 * creatures as easily as one, because 牌 the plate shows a creature at about 120 pixels
 * and a cell of a 1024 sheet is 256. The detail was never going to survive the frame.
 *
 * Four prompts cover everything the game can paint:
 *
 *     獸甲  realms 1 to 3    12 creatures   4 by 3
 *     獸乙  realms 4 to 6    12 creatures   4 by 3
 *     獸丙  realms 7 to 9    12 creatures   4 by 3
 *     境    the nine realms   9 landscapes  3 by 3
 *
 * 界 The ruled grid is the point. A classical album leaf is ruled into panels anyway, so
 * asking for the rules costs nothing in style and buys 刀 the cutter a line to find. It
 * reads the rules rather than trusting the model to divide 1024 by four.
 *
 * This file is the one place a sheet is described. `npm run sheets` writes sheets.html
 * from it, and `npm run slice` cuts by it, so the picture of the grid Bruno is given and
 * the grid the cutter expects can never drift apart.
 */
import { writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { BEASTS, commonsOf, wardenOf } from '../src/data/bestiary.ts';
import { REALMS } from '../src/data/realms.ts';
import { MEETINGS } from '../src/data/meetings.ts';
import { HEAVENS } from '../src/data/heavens.ts';
import { ARTS } from '../src/data/arts.ts';
import { ALL_CARDS } from '../src/data/awakening.ts';
import { HERBS } from '../src/data/herbs.ts';
import { PILL_LINES } from '../src/data/alchemy.ts';
import { ROOM_INFO } from '../src/data/secret.ts';
import { FAMILIES, paintedIn } from './artgaps.ts';
import { ICONS } from '../src/art/icons.generated.ts';
import { mix } from '../src/art/aura.ts';
import { MATERIALS, enso, inkOf } from './ink.ts';

/** One cell of a sheet: what goes in it, and what the cut file is called. */
export interface Cell {
  readonly key: string;
  readonly han: string;
  readonly name: string;
  /** The sentence that describes this subject inside the sheet prompt. */
  readonly subject: string;
}

export interface Sheet {
  readonly key: string;
  readonly han: string;
  readonly title: string;
  readonly kind: 'beast' | 'realm' | 'self' | 'meet' | 'heaven' | 'emblem';
  readonly cols: number;
  readonly rows: number;
  /** Reading order: left to right, then down. */
  readonly cells: readonly Cell[];
  readonly realms: readonly number[];
}

const warden = (n: number) =>
  `${wardenOf(n).name.toLowerCase()}, the guardian of its realm, huge and still, seen from slightly below`;
const common = (b: { name: string }) => `${b.name.toLowerCase()}, alert, caught in the instant before it moves`;

/**
 * 方 Nine panels, three by three, because the panel has to be square.
 *
 * 誤 The first layout asked for twelve panels in four columns by three rows, which on a
 * square page makes every panel half as tall again as it is wide. 牌 the plate is a
 * circle, so a square has to be cut out of that panel and a quarter of its height thrown
 * away, and on the sheet that came back it was the owl's head, the raven's head and the
 * crane's whole neck that went. No amount of cleverness in 刀 the cutter fixes a panel
 * that is the wrong shape. Three by three makes it square, and the circle then crops a
 * picture drawn for it.
 *
 * 組 Which also gives a better set. The nine wardens are one sheet on their own, and a
 * warden is the fight a whole realm is remembered for, so that is the sheet to do first.
 * The twenty-seven commons are three more, three realms to a sheet and a row each, so a
 * row is one realm and one pigment.
 */
function wardenSheet(): Sheet {
  const cells = REALMS.map((_, i) => {
    const w = wardenOf(i + 1);
    return { key: w.key, han: w.han, name: w.name, subject: warden(i + 1) };
  });
  return { key: 'wardens', han: '獸王', title: 'The nine wardens', kind: 'beast', cols: 3, rows: 3, cells, realms: [1, 2, 3, 4, 5, 6, 7, 8, 9] };
}

function commonSheet(key: string, han: string, title: string, realms: number[]): Sheet {
  const cells: Cell[] = [];
  for (const n of realms) {
    for (const b of commonsOf(n)) cells.push({ key: b.key, han: b.han, name: b.name, subject: common(b) });
  }
  return { key, han, title, kind: 'beast', cols: 3, rows: realms.length, cells, realms };
}

/**
 * 修 The cultivator, once per realm, once per figure.
 *
 * 誤 The first version of this brief had the cultivator *ageing* up the ladder, from a
 * young person in hemp to somebody ancient. Bruno: *"não acho certo o cultivador ficar
 * velho apenas porque sim."* He is right, and it is worse than arbitrary: it is
 * backwards. In this genre cultivation is the thing that **stops** you ageing. A Golden
 * Core cultivator holds the face they had when they formed it, for centuries.
 *
 * 遠 So the ladder is not age. It is distance from mortal. The first three realms are a
 * person: rough cloth, then plain robes, then robes that were made for them. Somewhere
 * around 金丹 the ageing stops and the face never changes again. From there what changes
 * is presence: the stillness gets deeper, the brush gets thinner, the edges stop being
 * certain, and by 渡劫 there is more robe than person and the paper is nearly winning.
 * That is a better ladder to look at than wrinkles, and it ends where ink painting is
 * strongest, which is at the edge of not being there.
 *
 * 光 The aura is not asked for and must not be. It grows with the climb, breathes on a
 * pulse the code owns and is read off the save, so it stays drawn and the painting
 * stands inside it. Nine separately generated glows would not be a ladder.
 *
 * 相 And there are two of these, because the game asks who is climbing and never answers
 * for the player. See src/data/figures.ts.
 */
const SELF = [
  'newly begun, in rough undyed hemp, plainly a villager who has decided something. Ordinary face, ordinary hands',
  'the same person in plain disciple robes, worn but cared for, sitting properly for the first time',
  'the same person in layered robes that were made for them, with a sash. From here their face will not change again',
  'the same person, unchanged in the face, in a fine robe with long sleeves folded over the knees. Perfectly still',
  'the same face, in a heavy robe with quiet embroidery, hair pinned with a plain jade clasp. Too still to read',
  'the same face, in a long robe with wide sleeves that hangs as though there were a wind that is not there',
  'the same face, in an austere robe, the outline of the shoulders no longer quite certain against the paper',
  'the same face, in robes that seem larger than the person in them, painted with a thinner brush, more presence than body',
  'barely a figure at all: the robe, the seated shape, the suggestion of a face, half of it left as bare paper',
];

/** 相 The two figures the sheet can be drawn for, and how each is asked for. */
const WHO = [
  ['self-woman', '女修', 'The cultivator, a woman', 'a woman'],
  ['self-man', '男修', 'The cultivator, a man', 'a man'],
] as const;

function selfSheet(key: string, han: string, title: string, who: string): Sheet {
  return {
    key,
    han,
    title,
    kind: 'self',
    cols: 3,
    rows: 3,
    realms: [1, 2, 3, 4, 5, 6, 7, 8, 9],
    cells: REALMS.map((r, i) => ({
      key: `${key.slice(5)}-${i + 1}`,
      han: r.han,
      name: r.name,
      subject: i === 0 ? `${who}, ${SELF[0]}` : SELF[i],
    })),
  };
}

/**
 * 緣 The ten encounters, as ten scenes.
 *
 * 圖 They are the cards the game raises on its own screen while you are sitting there,
 * and they each carry an icon standing in for a picture: a raven pictogram for a crow
 * that has followed you a mile, a cauldron for an abandoned furnace. Painted, they are
 * the moment an idle game actually stops for.
 *
 * 橫 Landscape panels, not square: every one of them is a thing lying in a road or a
 * person standing in one, and a scene wants width. Four across and three down gives ten
 * panels of that shape with two to spare, and the prompt asks for the last two to be left
 * as bare paper rather than filled with something nobody asked for.
 *
 * 人 Nobody in these is the cultivator. They are the people the road puts in front of
 * them, so nothing here has to match 相 the figure the player chose.
 */
const MEET_SCENE: Record<string, string> = {
  oldman: 'an old man sitting at the side of a mountain road with a bundle beside him, seen from a little way off',
  brokensword: 'a sword snapped just above the guard, lying in the dirt of a road, nobody in the picture',
  beggar: 'a small child with an empty bowl sitting at the foot of a neglected roadside shrine',
  merchant: 'a covered handcart halted on an empty road, its owner standing beside it',
  drunk: 'a dishevelled man slumped asleep against a tree with a gourd fallen beside him',
  crow: 'a single crow on a bare branch, something small held in its beak, the road below empty',
  stele: 'a stone tablet broken in half standing in long grass, the carving on it worn away',
  furnace: 'a big iron furnace abandoned in an empty courtyard, cold, its mouth dark',
  swordsman: 'a swordsman standing in the middle of a road with his blade still sheathed, waiting',
  pool: 'a still, clear pool of water among rocks with nothing living in it and mist above it',
};

function meetSheet(): Sheet {
  return {
    key: 'meetings',
    han: '緣',
    title: 'The ten encounters',
    kind: 'meet',
    cols: 4,
    rows: 3,
    realms: MEETINGS.map((m) => m.realm),
    cells: MEETINGS.map((m) => ({
      key: m.key,
      han: m.han,
      name: m.name,
      subject: MEET_SCENE[m.key] ?? m.name.toLowerCase(),
    })),
  };
}

/**
 * 境外 The nine Dragons of the heavens.
 *
 * 龍 Above the ninth realm the climb does not stop, it changes animal: every third
 * crossing puts a new Dragon in front of the cultivator, and they are named because the
 * alternative was measured and it is grim, forty crossings against one beast called 龍.
 *
 * 誤 Painted, they were about to repeat the same mistake in a new way. `currentWarden`
 * builds a heaven's Dragon out of the ninth realm's dragon with a different name on it
 * and keeps its key, because the key is what the kill record counts by, so all nine of
 * them were showing the ninth realm's painting. They file under their own keys now.
 *
 * 白 And they leave the pigment ladder. The realms end at imperial violet and the
 * heavens climb from there through gold leaf to bone white, so these nine go the other
 * way from everything else in the game: paler, thinner, less there, until the last one
 * is almost the paper it is painted on.
 */
const HEAVEN_SCENE = [
  'an azure dragon coiled in cloud, seen from the front, its head lowered towards the viewer',
  'a golden dragon, heavier and older than the first, scales catching what light there is',
  'a nine-headed hydra, the necks rising together out of one body',
  'two dragons twined round each other, coming as one thing',
  'a winged dragon in the air, nothing beneath it, its feet long since off the ground',
  'a torch dragon whose open eyes are daylight, a lantern in its throat',
  'a star lord: a robed figure with a dragon\'s head, older than most of what it fights',
  'primordial chaos: a vast coiled thing with no face and no need of one',
  'the uncarved block: a shape that is barely a dragon at all, half of it left as bare paper',
];

function heavenSheet(): Sheet {
  return {
    key: 'heavens',
    han: '境外',
    title: 'The nine Dragons of the heavens',
    kind: 'beast',
    cols: 3,
    rows: 3,
    realms: [9, 9, 9],
    cells: HEAVENS.map((h, i) => ({
      key: `heaven-${h.n}`,
      han: h.dragon.han,
      name: h.dragon.name,
      subject: HEAVEN_SCENE[i],
    })),
  };
}

/**
 * 境外 The nine heavens as places.
 *
 * 棄 They had a slot and no screen: nine backdrops declared in 畫 the picture list that
 * nothing was looking at, found by 缺 the audit rather than by anybody noticing. 鬥 the
 * arena reads them now, so a fight above the ninth realm happens in the heaven it is
 * being fought in rather than in the ninth realm again.
 *
 * 高 They are not landscapes the way a realm is. A realm is mountains and mist seen from
 * a height; a heaven is what is left when the mountains are below the weather.
 */
const SKY_SCENE = [
  'cloud from above, with the tops of the highest peaks breaking through it far below',
  'a sea of cloud lit from underneath, nothing solid anywhere in the picture',
  'the last mountain, alone, with nothing around it in any direction',
  'a vast empty sky with a single distant gate standing in it on nothing',
  'stars coming through a thinning sky, the ground long gone',
  'an enormous slow sun low over an unbroken plain of cloud',
  'the night side: constellations, and the curve of something very large below them',
  'almost nothing: a wash of pale mist with one faint horizon in it',
  'bare paper with the ghost of a horizon, as close to empty as a painting gets',
];

function skySheet(): Sheet {
  return {
    key: 'skies',
    han: '天',
    title: 'The nine heavens, as places',
    kind: 'heaven',
    cols: 3,
    rows: 3,
    realms: [9, 9, 9],
    cells: HEAVENS.map((h, i) => ({
      key: String(h.n),
      han: h.han,
      name: h.name,
      subject: SKY_SCENE[i],
    })),
  };
}

/**
 * 符 The emblem sheets: everything the game still draws as a symbol.
 *
 * 缺 the audit lists them by family and this is what it costs to close it. They are shown
 * at 20 to 30 pixels in a row, so they are not scenes: each one is a single object, an
 * emblem, painted as a thing a brush could put on paper in ten strokes. A scene at 24
 * pixels is a smudge.
 *
 * 紙 They keep their paper, like 緣 the encounters and unlike a creature, because they sit
 * in a card rather than standing in a place.
 */
const EMBLEM: Record<string, readonly [string, string][]> = {
  // 訣 The nine arts: each one is a creature's move, so each one is that creature's mark.
  arts: [
    ['art-fox', 'a fox\'s shadow thrown long across the ground, the fox itself out of frame'],
    ['art-ape', 'a long ape arm reaching down out of the top of the panel'],
    ['art-crane', 'a crane with its head thrown back, calling'],
    ['art-tiger', "a tiger's open mouth, roaring, seen close"],
    ['art-turtle', 'a turtle drawn into its shell, perfectly still'],
    ['art-puppet', 'a wooden puppet hanging from crossed control strings'],
    ['art-wolf', "a wolf's head low and biting, teeth closed on nothing"],
    ['art-serpent', 'a serpent rising out of water, half of it still under'],
    ['art-dragon', "a dragon's head in cloud, only the head showing"],
  ],
  // 悟道 The cards taken at a breakthrough. Each is a fortune, so each is its own omen.
  'awaken-a': [
    ['card-feast', 'a stone offering bowl filled to the brim with dark blood'],
    ['card-pack', 'a scholar\'s travelling case, its lid open and full'],
    ['card-insight', 'a single lit candle in a dark window, the moment it catches'],
    ['card-wolf', 'a wolf sitting beside a heap of coins, guarding them'],
    ['card-heat', 'a bellows and a pair of iron tongs laid crossed on a forge'],
    ['card-everywhere', 'a wide plain with tracks of many animals crossing it'],
    ['card-slaughter', 'a butcher\'s cleaver standing in a block, alone'],
    ['card-luckystar', 'one bright star low over a roof line'],
    ['card-sleeves', 'a pair of very wide empty sleeves, hanging'],
    ['card-platform', 'a small stone terrace with nothing on it, swept clean'],
    ['card-discern', 'a single wide-open eye, painted like a seal'],
    ['card-stonegold', 'a plain rock with one corner turned to gold'],
  ],
  'awaken-b': [
    ['card-hoard', 'a heaped pile of spirit stones spilling out of a jar'],
    ['card-kindling', 'a bundle of dry sticks with one end just catching'],
    ['card-heavencraft', 'a carpenter\'s square and a plumb line, laid together'],
    ['card-dew', 'a shallow bronze dish holding a night\'s worth of dew'],
    ['card-tenthousand', 'a wall of small storehouse drawers, all of them shut'],
    ['card-wildfire', 'a grass fire running along a ridge line at night'],
    ['card-taotie', 'the taotie mask from an old bronze vessel, front on'],
    ['card-seeclear', 'still water in a stone basin with the moon in it'],
    ['card-furnacefire', 'an open furnace mouth with the fire high in it'],
    ['card-onethought', 'a single ink dot on an otherwise empty page'],
    ['card-heavenward', 'a stone stair going up into cloud and not coming back'],
    ['card-whale', 'an enormous whale mouth breaking water, swallowing'],
  ],
  // 草 丹 秘境 Three families too small for a sheet each, so they share one.
  sundries: [
    ['herb-moss', 'a patch of pale spirit moss on wet stone'],
    ['herb-orchid', 'a single white orchid open at night'],
    ['herb-dragonblood', 'a low red-stemmed grass with dark sap at the break'],
    ['pill-body', 'three dark pills in a shallow dish, heavy and plain'],
    ['pill-bane', 'three pale pills in a shallow dish, faintly smoking'],
    ['pill-fortune', 'three golden pills in a shallow dish'],
    ['room-beast', 'two eyes in a dark doorway and nothing else visible'],
    ['room-spring', 'a small clear spring welling up in a stone floor'],
    ['room-shrine', 'a small niche shrine with a cold incense cup in it'],
    ['room-brazier', 'a low bronze brazier with a little ash still in it'],
  ],
};

interface EmblemSheet {
  readonly key: keyof typeof EMBLEM;
  readonly han: string;
  readonly title: string;
  readonly cols: number;
  readonly rows: number;
  /** What each one is, for the panel list: an art, a stance, a card, a herb. */
  readonly what: string;
  readonly names: ReadonlyMap<string, readonly [string, string]>;
}

/**
 * 名 Every emblem key is prefixed by its family, because they collide: 狼噬 Wolf Bite is
 * an art and 貪狼 Greedy Wolf is an awakening card, and both are keyed `wolf`.
 */
const nameMap = (prefix: string, xs: readonly { key: string; han: string; name: string }[]) =>
  new Map(xs.map((x) => [`${prefix}-${x.key}`, [x.han, x.name] as const]));

const EMBLEM_SHEETS: readonly EmblemSheet[] = [
  { key: 'arts', han: '訣', title: 'The nine arts', cols: 3, rows: 3,
    what: 'an art', names: nameMap('art', ARTS) },
  { key: 'awaken-a', han: '悟甲', title: 'Awakening cards, the first twelve', cols: 4, rows: 3,
    what: 'a card', names: nameMap('card', ALL_CARDS) },
  { key: 'awaken-b', han: '悟乙', title: 'Awakening cards, the last twelve', cols: 4, rows: 3,
    what: 'a card', names: nameMap('card', ALL_CARDS) },
  { key: 'sundries', han: '雜', title: 'Herbs, pills and the rooms of the vault', cols: 4, rows: 3,
    what: 'a thing', names: new Map([
      ...HERBS.map((h) => [`herb-${h.key}`, [h.han, h.name] as const] as const),
      ...Object.entries(PILL_LINES).map(([k, v]) => [`pill-${k}`, [v.han, v.name] as const] as const),
      ...Object.entries(ROOM_INFO).map(([k, v]) => [`room-${k}`, [v.han, v.name] as const] as const),
    ]) },
];

function emblemSheet(e: EmblemSheet): Sheet {
  return {
    key: e.key,
    han: e.han,
    title: e.title,
    kind: 'emblem',
    cols: e.cols,
    rows: e.rows,
    realms: [1, 1, 1],
    cells: EMBLEM[e.key].map(([key, subject]) => {
      const named = e.names.get(key);
      return { key, han: named?.[0] ?? key, name: named?.[1] ?? key, subject };
    }),
  };
}

export const SHEETS: readonly Sheet[] = [
  wardenSheet(),
  ...WHO.map(([key, han, title, who]) => selfSheet(key, han, title, who)),
  meetSheet(),
  heavenSheet(),
  skySheet(),
  ...EMBLEM_SHEETS.map(emblemSheet),
  commonSheet('beasts-a', '獸甲', 'The commons of the first three realms', [1, 2, 3]),
  commonSheet('beasts-b', '獸乙', 'The commons of the middle three realms', [4, 5, 6]),
  commonSheet('beasts-c', '獸丙', 'The commons of the last three realms', [7, 8, 9]),
  {
    key: 'realms',
    han: '境',
    title: 'The nine realms',
    kind: 'realm',
    cols: 3,
    rows: 3,
    realms: [1, 2, 3, 4, 5, 6, 7, 8, 9],
    cells: REALMS.map((r, i) => ({
      key: String(i + 1),
      han: r.han,
      name: r.name,
      subject: `an empty landscape for the realm called ${r.name}, mountains fading into mist, one cliff near the front, no people and no buildings`,
    })),
  },
];

export const sheetOf = (key: string) => SHEETS.find((s) => s.key === key);

/** 甲乙丙 The cell a person points at, named the way the sheet prompt names it. */
export const cellLabel = (s: Sheet, i: number) => `row ${Math.floor(i / s.cols) + 1}, column ${(i % s.cols) + 1}`;

/** 境外 What the nine heavens are painted in: out of violet, through gold, to bone. */
const HEAVEN_PIGMENT = ['imperial violet', 'dusk violet', 'faded plum', 'old rose',
  'pale amber', 'gold leaf', 'pale gold', 'bone white', 'almost nothing but paper'];

/**
 * 詞 The prompt for one sheet.
 *
 * Everything the cutter depends on is stated twice, because a model that drops the rules
 * or lets a tail cross into the next panel costs a credit Bruno does not have: the ruled
 * grid, the identical ground in every panel, and the subject kept inside its own panel.
 */
export function sheetPrompt(s: Sheet): string {
  const shape = s.kind === 'emblem'
    ? 'Each panel holds one object on bare paper, centred, and nothing else: no scene, no ground, no background. These are shown very small, so each one is a single thing drawn in as few strokes as it takes, the way a brush would put an emblem on a page.'
    : s.kind === 'meet'
    ? 'Each panel holds one small scene, wider than it is tall, seen from a few paces away with plenty of bare paper around it. No frame inside the panel, nothing behind the subject but the road, the ground or the mist it is standing in.'
    : s.kind === 'beast'
    ? 'Each panel holds one creature, centred, facing the viewer, head and body, filling most of its own panel.'
    : s.kind === 'self'
    ? 'Each panel holds one seated figure, seen from the front, sitting cross-legged in meditation, centred, the whole figure inside its own panel with bare paper above the head and below the knees. It is the same person in all nine and they do not age: what changes is their standing and how solidly they are there, from an ordinary villager in panel one to something barely painted in panel nine. No aura, no glow, no halo and no light around them: that part is drawn by the game and must not be in the painting. Nothing behind them but bare paper.'
    : s.kind === 'heaven'
    ? 'Each panel holds one sky seen from above the weather, with no ground in it at all and a great deal of empty paper. These are not landscapes: there are no mountains in the foreground and nothing to stand on.'
    : 'Each panel holds one landscape seen from a great height, its mountains across the middle of the panel and the bottom of the panel almost empty.';
  const list = s.cells
    .map((c, i) => {
      const n = s.kind === 'beast' || s.kind === 'meet' ? s.realms[Math.floor(i / s.cols)] : i + 1;
      const pig = s.key === 'heavens' || s.key === 'skies' ? HEAVEN_PIGMENT[i]
        : inkOf(s.kind === 'meet' ? s.realms[i] : n).stuff;
      const whose = s.kind === 'emblem' ? 'Its one pigment is'
        : s.kind === 'self' ? 'The one pigment on the robe is'
        : s.kind === 'meet' ? 'The one pigment in the scene is'
        : 'Its one pigment is';
      return `  Row ${Math.floor(i / s.cols) + 1}, panel ${(i % s.cols) + 1}: ${c.subject}. ${whose} ${pig}.`;
    })
    .join('\n');
  const album = s.kind === 'emblem' ? 'album of emblems'
    : s.kind === 'self' ? 'album of portraits'
    : s.kind === 'meet' ? 'album of scenes from a traveller\'s notebook'
    : 'bestiary album';
  const panels = s.cols * s.rows;
  const spare = panels - s.cells.length;
  return `One single square image: a page from an old Chinese ${album}, ruled
into a grid of ${s.cols} columns by ${s.rows} rows, ${panels} panels in all.

Draw the grid: thin dry ink rules, edge to edge, dividing the page into
${panels} equal rectangular panels with a narrow margin of bare paper
around the outside. Every panel has exactly the same aged paper ground as
every other one. ${shape} Nothing crosses a rule: no tail, no wing and no
mist leaves the panel it belongs to.

The panels, in reading order:

${list}
${spare > 0
  ? `\nThe last ${spare === 1 ? 'panel' : `${spare} panels`} of the grid ${spare === 1 ? 'is' : 'are'} left as bare paper,
ruled like the others with nothing drawn inside.\n`
  : ''}
${MATERIALS}

Again, and this matters more than anything else in this prompt: ${panels}
panels, ${s.cols} across and ${s.rows} down, thin ink rules between them, the same paper
in every panel, and no letters or characters anywhere on the page.`;
}

/** 符 Which pictogram each emblem stands in for, for 樣 the fabricated leaf. */
const EMBLEM_ICON = new Map<string, string>([
  ...ARTS.map((a) => [`art-${a.key}`, a.icon] as const),
  ...ALL_CARDS.map((c) => [`card-${c.key}`, c.icon] as const),
  ...HERBS.map((h) => [`herb-${h.key}`, h.icon] as const),
  ...Object.entries(PILL_LINES).map(([k, v]) => [`pill-${k}`, v.icon] as const),
  ...Object.entries(ROOM_INFO).map(([k, v]) => [`room-${k}`, v.icon] as const),
]);

/* ── 樣 the demonstration leaf ───────────────────────────────────────────── */

/**
 * 假 A fabricated sheet, so the cutter is proved before a credit is spent.
 *
 * This draws what the prompt above asks for, using the game's own icons inked onto
 * paper, at exactly the size a model returns. Shot with Playwright it becomes a real
 * 1024 by 1024 PNG that 刀 the cutter has never seen, and cutting it correctly is the
 * only evidence worth having that the chain works.
 *
 * 參 It is also the reference picture: it can be handed to the model alongside the
 * prompt, which is worth more than another paragraph of English.
 */
function demoLeaf(s: Sheet): string {
  const paper = '#E8DCC6';
  const rule = '#4A4038';
  const blanks = Array.from({ length: s.cols * s.rows - s.cells.length },
    () => '<div class="pn"></div>').join('');
  const panels = s.cells
    .map((c, i) => {
      const n = s.kind === 'beast' ? s.realms[Math.floor(i / s.cols)] : i + 1;
      const seed = (i * 37) % 11;
      const wobble = 0.86 + (seed % 5) * 0.045;
      // 修 A self sheet has no beast to look up: the stand-in is the game's own seated
      // figure, which is the pictogram the painting is there to replace.
      const body = s.kind === 'emblem'
        ? ICONS[EMBLEM_ICON.get(c.key) ?? ''] ?? ''
        : s.kind === 'self'
        ? ICONS.meditation ?? ''
        : s.kind === 'meet'
          ? ICONS[MEETINGS.find((m) => m.key === c.key)?.icon ?? ''] ?? ''
          : ICONS[BEASTS.find((b) => b.key === c.key)?.icon ?? ''] ?? '';
      const tone = mix(inkOf(n).colour, '#221C16', 0.55);
      // 圖 The icon library is drawn in a 512 box, so a panel is that box wobbled a
      // little about its own centre: a model never places two creatures identically and
      // 刀 the cutter must not be tuned to a grid where they all sit on the same pixel.
      const off = (256 * (1 - wobble)).toFixed(1);
      return `<div class="pn">
        <svg viewBox="0 0 512 512" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
          <g filter="url(#wet)" transform="translate(${off} ${off}) scale(${wobble.toFixed(3)})"
             fill="${tone}" opacity=".93">${body}</g>
        </svg>
      </div>`;
    })
    .join('');
  return `<meta charset="utf-8">
<title>九境 Ninefold · 樣 a fabricated contact sheet</title>
<style>
  html,body { margin:0; background:#555; }
  #leaf { width:1024px; height:1024px; background:${paper}; position:relative;
          padding:26px; box-sizing:border-box; }
  #leaf .grid { width:100%; height:100%; display:grid; box-sizing:border-box;
                grid-template-columns:repeat(${s.cols},1fr); grid-template-rows:repeat(${s.rows},1fr);
                border:1.5px solid ${rule}; }
  #leaf .pn { border-right:1.5px solid ${rule}; border-bottom:1.5px solid ${rule};
              display:grid; place-items:center; overflow:hidden; }
  #leaf .pn:nth-child(${s.cols}n) { border-right:0; }
  #leaf .pn:nth-last-child(-n+${s.cols}) { border-bottom:0; }
  #leaf .pn svg { width:88%; height:88%; display:block; }
</style>
<div id="leaf">
  <svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>
    <filter id="wet" x="-25%" y="-25%" width="150%" height="150%">
      <feTurbulence type="fractalNoise" baseFrequency=".004 .009" numOctaves="4" seed="7" result="t"/>
      <feDisplacementMap in="SourceGraphic" in2="t" scale="34" xChannelSelector="R" yChannelSelector="G"/>
      <feGaussianBlur stdDeviation="1.6"/>
    </filter>
  </defs></svg>
  <div class="grid">${panels}${blanks}</div>
</div>`;
}

/**
 * 證 The cut panels, in the frame they will actually be seen in.
 *
 * 刀 the cutter writes files. Files are not evidence: a panel that is two per cent late
 * looks fine as a file and wrong inside 圓相 the ensō, where the circle crops it. So the
 * proof is the panels in the ring, at the size the game shows them.
 */
export function cutStrip(s: Sheet): string {
  const cells = s.cells
    .map((c, i) => {
      const n = s.kind === 'beast' ? s.realms[Math.floor(i / s.cols)] : i + 1;
      const pig = inkOf(n);
      const tier = s.kind === 'beast' && c.key === wardenOf(n).key ? 2 : 0;
      return `<figure class="ct">
        <span class="ctp">
          <img src="public/art/${s.kind === 'beast' ? 'cut' : s.kind}/${c.key}.webp" alt="">
          <span class="ctr">${enso(pig.colour, tier, 132, i + 1)}</span>
        </span>
        <figcaption><b class="cjk">${c.han}</b><i>${c.name}</i></figcaption>
      </figure>`;
    })
    .join('');
  return `<meta charset="utf-8">
<title>九境 Ninefold · 證 the cut panels</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:wght@400;500&family=Noto+Serif+SC:wght@400&display=swap">
<style>
  html,body { margin:0; background:#0E0D12; color:#DCD2C2;
              font:13px Archivo, ui-sans-serif, system-ui, sans-serif; }
  #cuts { width:1024px; padding:22px; box-sizing:border-box; display:grid;
          grid-template-columns:repeat(${s.cols},1fr); gap:16px 10px; }
  #cuts .ct { margin:0; text-align:center; }
  #cuts .ctp { position:relative; display:inline-grid; place-items:center;
               width:132px; height:132px; }
  /* 紙 The paper disc the game's own 牌 plate puts behind a creature. Without it this
     page lied: every cut-out looked like it had dark wedges in its corners, which was
     the page's background showing through, not anything wrong with the cut. */
  #cuts .ctp::before { content:''; position:absolute; inset:5%; border-radius:50%;
                       background:#E4D8C0; opacity:.86; }
  #cuts .ctp img { position:absolute; inset:16%; width:68%; height:68%; display:block;
                   object-fit:contain; }
  #cuts .ctr { position:absolute; inset:0; }
  #cuts .ctr svg { width:100%; height:100%; display:block; }
  #cuts figcaption { margin-top:7px; }
  #cuts b { display:block; font-family:'Noto Serif SC',serif; font-weight:400;
            font-size:15px; color:#EDE3D2; }
  #cuts i { font-style:normal; color:#8C8478; font-size:11.5px; }
  .cjk { font-family:'Noto Serif SC',serif; }
</style>
<div id="cuts">${cells}</div>`;
}

/* ── 頁 the page Bruno reads ─────────────────────────────────────────────── */

const gridMap = (s: Sheet) => `<div class="shgrid" style="grid-template-columns:repeat(${s.cols},1fr)">
  ${s.cells
    .map((c, i) => `<div class="shcell"><b>${i + 1}</b><span class="cjk">${c.han}</span>
      <i>${c.name}</i><code>${s.kind}/${c.key}.webp</code></div>`)
    .join('')}
</div>`;

const page = `<meta charset="utf-8">
<title>九境 Ninefold · 張 The contact sheets</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600&family=Noto+Serif+SC:wght@400;600&family=Rajdhani:wght@600;700&display=swap">
<style>
  :root { --ground:#0E0D12; --panel:#17151C; --panel2:#131117; --line:#2E2A33;
          --paper:#EDE3D2; --text:#DCD2C2; --faint:#8C8478; --gold:#C8A951;
          --cinnabar:#B4332C; color-scheme:dark; }
  * { box-sizing:border-box; }
  body { margin:0; background:var(--ground); color:var(--text);
         font:17px/1.7 Archivo, ui-sans-serif, system-ui, sans-serif; }
  .sheet { max-width:900px; margin:0 auto; padding:34px 18px 90px; }
  .cjk { font-family:'Noto Serif SC',serif; }
  h1 { font-family:'Noto Serif SC',serif; font-size:clamp(40px,12vw,60px); font-weight:400;
       color:var(--gold); line-height:1; margin:0; }
  h2 { font-family:Rajdhani,sans-serif; font-size:26px; margin:0; display:flex; gap:11px;
       align-items:baseline; color:var(--paper); }
  h2 .h { font-family:'Noto Serif SC',serif; font-weight:400; font-size:30px; color:var(--gold); }
  h3 { font-family:Rajdhani,sans-serif; font-size:13px; color:var(--faint); margin:0;
       letter-spacing:.12em; text-transform:uppercase; }
  p { margin:0; }
  .lead { font-size:19px; margin-top:14px; color:var(--faint); }
  .sec { margin-top:40px; border-top:1px solid var(--line); padding-top:22px;
         display:flex; flex-direction:column; gap:14px; }
  .t { color:var(--faint); max-width:64ch; }
  .t b { color:var(--paper); font-weight:600; }
  .rule { border-left:3px solid var(--gold); background:var(--panel2);
          border-radius:0 10px 10px 0; padding:13px 16px; color:var(--faint); }
  .rule b { color:var(--gold); }
  pre { background:var(--panel2); border:1px solid var(--line); border-radius:4px;
        padding:14px; overflow-x:auto; font-family:'Roboto Mono',monospace; font-size:12px;
        line-height:1.7; color:var(--text); white-space:pre-wrap; margin:0;
        -webkit-user-select:all; user-select:all; }
  code { font-family:'Roboto Mono',monospace; font-size:12px; color:var(--gold); }
  table { border-collapse:collapse; width:100%; font-size:14px; }
  th { text-align:left; font-family:Rajdhani,sans-serif; font-size:12px; color:var(--faint);
       letter-spacing:.1em; text-transform:uppercase; padding:0 8px 6px; font-weight:700; }
  td { border-top:1px solid var(--line); padding:8px; color:var(--faint); vertical-align:top; }
  td b { color:var(--paper); font-weight:600; }
  a { color:var(--gold); }
  .shgrid { display:grid; gap:6px; }
  .shcell { background:var(--panel2); border:1px solid var(--line); border-radius:3px;
            padding:8px 9px; font-size:12px; color:var(--faint); position:relative; }
  .shcell b { position:absolute; right:7px; top:5px; font-size:10px; color:var(--gold);
              font-family:Rajdhani,sans-serif; }
  .shcell .cjk { display:block; font-size:16px; color:var(--paper); }
  .shcell i { display:block; font-style:normal; font-size:12px; margin-bottom:3px; }
  .shcell code { font-size:10px; opacity:.75; }
  .shot { display:block; width:100%; border:1px solid var(--line); border-radius:4px; }
  .steps td:first-child { color:var(--gold); font-family:Rajdhani,sans-serif;
                          font-weight:700; width:34px; }
</style>

<div class="sheet">
  <header>
    <h1>張</h1>
    <p class="lead"><b style="color:var(--paper)">Six generations, not fifty-four.</b>
      A free account hands out credits, and one credit is one square picture. So the unit
      of work stops being one creature and becomes one ruled page holding nine of them.
      The cutting is mine.</p>
    <p class="t" style="margin-top:12px">Bruno: <i>"não consigo gerar tantas imagens com
      os créditos gratuitos do gpt. consegues dar-me um prompt por batches e depois
      recortar as imagens e fazer a tua magia?"</i></p>
  </header>

  <section class="sec">
    <h2><span class="h">數</span> What a credit buys</h2>
    <p class="t">A creature is shown at about 120 pixels inside 牌 the plate. A panel of a
      1024 sheet is 256. <b>The detail was never going to survive the frame</b>, so
      nothing is lost by drawing nine at a time.</p>
    <p class="t"><b>Eight sheets are done</b>: 36 creatures, 9 places, the cultivator
      twice and the ten encounters, 73 paintings. <b>Seven more close the game.</b> 缺 the
      table below is what is left, read out of the game's own tables rather than guessed
      at, and every row of it now has a prompt further down.</p>
    <table>
      <tr><th>Sheet</th><th>Holds</th><th>Grid</th><th>Save it as</th></tr>
      ${SHEETS.map((s) => `<tr><td><b class="cjk">${s.han}</b> ${s.title}</td>
        <td>${s.cells.length} panels</td><td>${s.cols} by ${s.rows}</td>
        <td><code>ink-sheets/${s.key}.png</code></td></tr>`).join('')}
    </table>
    <div class="rule"><b>境外 The nine Dragons are the one to do next.</b> Above the ninth
      realm the climb does not stop, it changes animal, and they are named because the
      alternative was measured and it is grim: forty crossings against one beast called
      龍. They were about to repeat that in a new way, because all nine were showing the
      ninth realm's painting: a heaven's Dragon is built out of that dragon and keeps its
      key, which is what the kill record counts by. They file under their own keys now.</div>
    <div class="rule"><b>And 修 the cultivator's aura is deliberately not in his sheet.</b>
      The aura grows with the climb, it breathes on a pulse the code owns and it is read
      off the save, so it stays drawn and the painting stands inside it. Asking a model for
      a glow nine times would give nine different glows and the ladder would stop reading
      as a ladder.</div>
  </section>

  <section class="sec">
    <h2><span class="h">缺</span> What is still a pictogram</h2>
    <p class="t">Read from the game's own tables by <code>npm run artgaps</code>, so a
      family that gains a member is counted the next time it runs. <b>A tick is a family
      the game no longer draws as a symbol.</b></p>
    <table>
      <tr><th></th><th>What</th><th>Painted</th><th>Where it is seen</th><th>What it would take</th></tr>
      ${FAMILIES.map((f) => {
        const have = paintedIn(f);
        const done = !!f.kind && have >= f.count;
        return `<tr><td>${done ? '✓' : ''}</td>
          <td><b class="cjk">${f.han}</b> ${f.name}</td>
          <td><code>${have} of ${f.count}</code></td>
          <td>${f.seen}</td>
          <td>${done ? 'done' : f.sheet ?? 'the prompt above'}</td></tr>`;
      }).join('')}
    </table>
    <div class="rule"><b>器 The gear is the one that should stay drawn.</b> There are 486
      templates and they are built by the game out of a shape, a realm and a rarity, so
      they already read at a glance and no two are the same. A sheet could not cover them
      and would make them worse.</div>
  </section>

  <section class="sec">
    <h2><span class="h">用</span> What you do, and what I do</h2>
    <table class="steps">
      <tr><td>1</td><td>Open the image model. Paste <b>one</b> sheet prompt below. There
        is no opener to paste first: each sheet prompt carries the whole style itself, so
        a fresh chat is fine and a lost session costs nothing.</td></tr>
      <tr><td>2</td><td>If it offers, attach 樣 the demonstration leaf further down as a
        reference picture. It shows the ruled grid better than the English does.</td></tr>
      <tr><td>3</td><td>Save the square image it returns. Do not crop it, do not
        straighten it and do not cut anything out: <b>the whole page, exactly as it came
        back.</b> Name it after the sheet.</td></tr>
      <tr><td>4</td><td>Send me the file, or drop it in <code>ink-sheets/</code>.</td></tr>
      <tr><td>5</td><td>I run <code>npm run slice</code>. It measures where the rules
        actually fell, cuts the nine panels, finds the subject in each one, squares it,
        keys the paper off a second copy and writes both into the game. Then
        <code>npm run pictures</code>, and they are in.</td></tr>
      <tr><td>6</td><td>I send back 證 the proof: the sheet with every cut drawn on it,
        and the nine panels in the game's own frame. A bad panel is redone alone, and one
        panel costs one credit.</td></tr>
    </table>
    <div class="rule"><b>A wrong sheet is not a wasted credit either.</b> If the model
      gives eleven panels, or lets a tail cross a rule, tell me which panel and I cut
      around it. The cutter takes the grid it is told and the sheets are described in one
      file, so a sheet that came back as three by four instead of four by three is one
      line to change.</div>
  </section>

  ${SHEETS.map((s) => `<section class="sec">
    <h2><span class="h cjk">${s.han}</span> ${s.title}</h2>
    <p class="t">${s.cells.length} panels, ${s.cols} across and ${s.rows} down. Saved as
      <code>ink-sheets/${s.key}.png</code>.</p>
    ${gridMap(s)}
    <h3>詞 The prompt</h3>
    <pre>${sheetPrompt(s)}</pre>
  </section>`).join('')}

  <section class="sec">
    <h2><span class="h">真</span> The first real sheet</h2>
    <p class="t">獸甲 came back on the first try, twelve panels in the right order, and it
      is the picture that settled the direction: <b>this is what the game should look
      like.</b> It also found the one thing that was wrong with the plan.</p>
    <img class="shot" src="sheet-beasts-a-proof.png" alt="The generated sheet with the measured cuts drawn on it">
    <p class="t">The red lines are where 刀 the cutter decided the rules were, measured
      off the picture rather than assumed. It got them wrong by ten pixels on the first
      pass, because it was looking for a column that was <i>uniform</i> top to bottom, and
      on a real sheet bare paper is uniform and a rule is one pixel wide. A rule is
      <b>dark, edge to edge</b>. Measured that way the rule column reads 80 against 160
      for its neighbours, and the cuts above land on it.</p>
    <img class="shot" src="sheet-beasts-a-panels.png" alt="The twelve panels after cutting, in the game's frame">
    <div class="rule"><b>And the panels are the wrong shape.</b> Twelve panels on a square
      page means four columns by three rows, so every panel is half as tall again as it is
      wide. 牌 the plate is a circle, so a square has to come out of that panel and a
      quarter of its height is thrown away. Above, that quarter was the owl's head, the
      raven's head and the crane's whole neck. No cleverness in the cutter fixes a panel
      that is the wrong shape, so the grid is now <b>three by three</b> and the panels are
      square. The sheets above are the new ones.</div>
  </section>

  <section class="sec">
    <h2><span class="h">樣</span> The demonstration leaf</h2>
    <p class="t">This is not a painting: it is the game's own icons inked onto paper and
      ruled into the same grid, drawn at exactly the size a model returns. <b>It exists so
      the cutter can be tested without spending a credit</b>, and it is the picture to
      attach to the prompt if the model takes one.</p>
    <img class="shot" src="ink-sheets/demo.png" alt="A ruled album leaf of nine inked creatures on paper">
    <img class="shot" src="sheet-demo-panels.png" alt="The nine panels of the fabricated leaf after cutting">
  </section>

  <footer class="sec" style="color:var(--faint);font-size:13.5px">
    <p>Written by <code>npm run sheets</code>. The grids, the file names and the prompts
      all come from the game's own tables, so the page cannot describe a sheet the cutter
      does not expect. Icons from game-icons.net under CC BY 3.0.</p>
  </footer>
</div>
`;

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  writeFileSync('sheets.html', page);
  writeFileSync('sheet-demo.html', demoLeaf(sheetOf(process.argv[2] ?? '') ?? sheetOf('beasts-c')!));
  console.log(`sheets.html · ${SHEETS.length} prompts · ${SHEETS.reduce((n, s) => n + s.cells.length, 0)} panels`);
  console.log('sheet-demo.html · the fabricated leaf for beasts-c');
}
