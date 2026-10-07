/**
 * 業 The crafts: seven of them, levels 1 to 99, every material out of the game's own tables.
 *
 * Bruno: *"quero algo mais complexo com materials diferentes, opções de craft e ranks de
 * craft que façam sentido dentro do conteúdo que temos, género Melvor Idle ou RuneScape."*
 * So nothing here is invented beside the game: the herbs are the cave's and the road's,
 * the ores are the nine metals the gear sets are made of, every one of the 36 beasts
 * leaves one part of itself under the knife, and the gear a forge makes is the exact
 * shape that beast already drops, in the metal of its realm.
 *
 * 三 Three crafts gather and four make. The gathering ones take only time, and 解 Rendering
 * asks the hunt for one thing: to know the beast. Ten of a common fallen (one warden) and
 * its kind's pelts, fangs and scales are worked for as long as the workshop runs, so the
 * thousand rats killed before the workshop opened have taught it the rat the day it does.
 * A system arriving late arrives full. See CRAFT_RENDER_KNOWN for why it is not one body
 * per kill.
 *
 * 經 The experience table is RuneScape's, and every recipe's experience is worked out
 * here from one number, CRAFT_HOURS_TO_CAP, so the months to 99 are a sentence in
 * balance.ts rather than a property of 265 hand-typed rows.
 *
 * 級 Every recipe asks for two things: the craft's level, and the realm its material
 * comes from. Eleven levels is one realm's worth of material, so each rank of a craft
 * arrives beside a step of the climb, and no craft can run ahead of the mountain.
 */
import { BEASTS, type Beast } from './bestiary.ts';
import { ARCHETYPES, RARITY_INFO, REALM_SETS } from './gear.ts';
import {
  CRAFT_ARRAY_DOOR, CRAFT_ARRAY_GUARD, CRAFT_ARRAY_QUALITY, CRAFT_ARRAY_SPEED, CRAFT_ARRAY_TWICE, CRAFT_ARRAY_WORK, CRAFT_ARRAY_XP,
  CRAFT_HOURS_TO_CAP, CRAFT_KIT, CRAFT_KIT_WORK, CRAFT_LONG_WATCH_HOURS, CRAFT_MARKS, CRAFT_QUALITY, CRAFT_QUALITY_MULT, CRAFT_SECONDS,
  CRAFT_TOOL_STEPS,
} from '../sim/balance.ts';
import { opensAt, type System } from '../sim/unlocks.ts';

export type SkillKey = 'herb' | 'vein' | 'render' | 'forge' | 'alchemy' | 'sigil' | 'array';
export const SKILL_KEYS: readonly SkillKey[] = ['herb', 'vein', 'render', 'forge', 'alchemy', 'sigil', 'array'];

export interface Skill {
  readonly key: SkillKey;
  /** The seal: one character, which is also the craft's icon until it is painted. */
  readonly seal: string;
  readonly han: string;
  readonly name: string;
  readonly gathers: boolean;
  /** The realm the craft opens at, read off the system that opens it (sim/unlocks.ts). */
  readonly realm: number;
  readonly opens: System;
  readonly tool: { readonly han: string; readonly name: string; readonly icon: string };
  /** What the ninety-ninth level is called, on the craft and beside a name on the boards. */
  readonly cap: { readonly han: string; readonly name: string };
  /** One sentence, for the screen and the guide. */
  readonly does: string;
  /** Where it is done, as the screen names it. */
  readonly where: string;
  readonly icon: string;
}

/**
 * 開 When each craft opens. The workshop's first four together at the second realm,
 * because they are one loop (gather, render, forge the gear that opens beside them), and
 * then one at a time where the climb has room, so no realm hands over a heap:
 *
 *   2  採藥 採礦 解獸 鑄器   with 器 gear and 洞天 the cave
 *   5  丹 Alchemy          with the tower
 *   6  符 Sigil Writing    with 圖鑑 the bestiary
 *   7  陣 Arrays           with 秘境深 the deeper vault, whose door it brings sooner
 */
export const SKILLS: readonly Skill[] = [
  { key: 'herb', seal: '藥', han: '採藥', name: 'Herb Gathering', gathers: true, realm: opensAt('crafts'), opens: 'crafts',
    tool: { han: '鐮', name: 'Sickle', icon: 'sickle' }, cap: { han: '藥王', name: 'Herb King' },
    does: 'Walk the mountain paths of every realm you have reached and bring back what grows there.',
    where: 'the mountain paths', icon: 'spiral-bloom' },
  { key: 'vein', seal: '礦', han: '採礦', name: 'Vein Delving', gathers: true, realm: opensAt('crafts'), opens: 'crafts',
    tool: { han: '鎬', name: 'Pick', icon: 'quake-stomp' }, cap: { han: '山主', name: 'Lord of the Mountain' },
    does: 'Cut ore from the veins: the same nine metals every set of gear is made of.',
    where: 'the veins', icon: 'rune-stone' },
  { key: 'render', seal: '解', han: '解獸', name: 'Rendering', gathers: true, realm: opensAt('crafts'), opens: 'crafts',
    tool: { han: '刀', name: 'Knife', icon: 'machete' }, cap: { han: '庖丁', name: 'Cook Ding' },
    does: 'Kill ten of a beast (one, for a warden) and you know what its kind leave behind. Here that becomes one part of it: a pelt, a fang, a scale, its blood.',
    where: 'the grounds of the hunt', icon: 'machete' },
  { key: 'forge', seal: '鑄', han: '鑄器', name: 'Forging', gathers: false, realm: opensAt('crafts'), opens: 'crafts',
    tool: { han: '錘', name: 'Hammer', icon: 'stamper' }, cap: { han: '器聖', name: 'Forge Saint' },
    does: 'Smelt the nine metals, then forge the piece you choose, in the shape a beast teaches. It makes every craft’s tool as well.',
    where: 'the anvil', icon: 'stamper' },
  { key: 'alchemy', seal: '丹', han: '煉丹', name: 'Alchemy', gathers: false, realm: opensAt('alchemy'), opens: 'alchemy',
    tool: { han: '爐', name: 'Furnace', icon: 'cauldron' }, cap: { han: '丹聖', name: 'Pill Saint' },
    does: 'Elixirs to carry into a hard fight: to mend, to take less, to strike harder. Each level also makes the pill furnace cheaper.',
    where: 'the small furnace', icon: 'cauldron' },
  { key: 'sigil', seal: '符', han: '製符', name: 'Sigil Writing', gathers: false, realm: opensAt('sigils'), opens: 'sigils',
    tool: { han: '筆', name: 'Brush', icon: 'spear-feather' }, cap: { han: '符聖', name: 'Sigil Saint' },
    does: 'Paper, cinnabar and a beast’s ink: one-use sigils for a hard fight, and one that makes a beast leave a piece.',
    where: 'the writing desk', icon: 'scroll-unfurled' },
  { key: 'array', seal: '陣', han: '佈陣', name: 'Arrays', gathers: false, realm: opensAt('arrays'), opens: 'arrays',
    tool: { han: '盤', name: 'Compass', icon: 'star-cycle' }, cap: { han: '陣聖', name: 'Array Saint' },
    does: 'Arrays cut into the cave floor. Few places, and each one works for as long as it stays there: faster crafts, a sooner door, lighter blows.',
    where: 'the cave floor', icon: 'star-cycle' },
];
export const SKILL_BY_KEY: Readonly<Record<SkillKey, Skill>> =
  Object.fromEntries(SKILLS.map((s) => [s.key, s])) as Record<SkillKey, Skill>;

/**
 * 階 The ranks, one every ten levels, and the ninety-ninth named for the craft. A rank is
 * a word and nothing else; what a level opens is the recipes.
 */
export const RANKS: readonly { readonly at: number; readonly han: string; readonly name: string }[] = [
  { at: 1, han: '初學', name: 'Novice' }, { at: 10, han: '學徒', name: 'Apprentice' },
  { at: 20, han: '匠人', name: 'Journeyman' }, { at: 30, han: '熟手', name: 'Adept' },
  { at: 40, han: '巧匠', name: 'Artisan' }, { at: 50, han: '名匠', name: 'Renowned Hand' },
  { at: 60, han: '大匠', name: 'Master Hand' }, { at: 70, han: '宗匠', name: 'Great Master' },
  { at: 80, han: '國手', name: 'Peerless Hand' }, { at: 90, han: '宗師', name: 'Grandmaster' },
];
export function rankOf(skill: SkillKey, level: number): { han: string; name: string } {
  if (level >= 99) return SKILL_BY_KEY[skill].cap;
  let r = RANKS[0];
  for (const x of RANKS) if (x.at <= level) r = x;
  return r;
}

/**
 * 經 The experience each level needs, RuneScape's own table: 83 for the second level,
 * 13,034,431 for the ninety-ninth, and level 92 at half of that.
 */
export const XP_TABLE: readonly number[] = (() => {
  const out = [0, 0];
  let points = 0;
  for (let l = 1; l < 99; l++) {
    points += Math.floor(l + 300 * 2 ** (l / 7));
    out[l + 1] = Math.floor(points / 4);
  }
  return out;
})();
export const XP_CAP = XP_TABLE[99];
export const LEVEL_CAP = 99;

export function levelOf(xp: number): number {
  let l = 1;
  while (l < LEVEL_CAP && xp >= XP_TABLE[l + 1]) l++;
  return l;
}

/* ── 物 Materials ─────────────────────────────────────────────────────────── */

export type ItemKind = 'herb' | 'ore' | 'part' | 'metal' | 'elixir' | 'sigil' | 'array' | 'key';

export interface CraftItem {
  readonly key: string;
  readonly han: string;
  readonly name: string;
  readonly kind: ItemKind;
  /** The realm it belongs to, which is its colour on the screen. */
  readonly realm: number;
  readonly icon: string;
  /** A painted emblem, when there is one: `emblem/<family>-<key>`, see ui/Emblem.tsx. */
  readonly paint?: { readonly family: 'herb' | 'craft'; readonly subject: string };
  /** A beast's own painting, for its part. */
  readonly beast?: string;
  /** Whether it comes in five qualities. */
  readonly graded?: boolean;
  /** What it does, for the things that do something. */
  readonly does?: string;
}

const items: CraftItem[] = [];
const item = (x: CraftItem) => { items.push(x); return x; };

/** 級 The first level of a realm's material: realm 1 at 1, realm 9 at 89. */
export const tierLevel = (realm: number) => (realm - 1) * 11 + 1;

/** 藥 What grows on the paths, in the order the realms reach it. */
const HERBS: readonly [string, string, string, number, number, string, string?][] = [
  ['moss', '青苔', 'Spirit Moss', 1, 1, 'spiral-bloom', 'moss'],
  ['bark', '楮皮', 'Mulberry Bark', 6, 1, 'olive'],
  ['orchid', '月華蘭', 'Moonlight Orchid', 12, 2, 'crystal-cluster', 'orchid'],
  ['dragonblood', '龍血草', 'Dragonblood Grass', 23, 3, 'fire-gem', 'dragonblood'],
  ['lotus', '雪蓮', 'Snow Lotus', 34, 4, 'tension-snowflake'],
  ['ginseng', '玉參', 'Jade Ginseng', 45, 5, 'spiral-bloom'],
  ['fern', '星蕨', 'Starfall Fern', 56, 6, 'polar-star'],
  ['vine', '雷藤', 'Thunder Vine', 67, 7, 'lightning-helix'],
  ['beard', '龍鬚', 'Dragon’s Beard', 78, 8, 'dragon-spiral'],
  ['peach', '蟠桃花', 'Peach of Ages Blossom', 89, 9, 'laurels'],
  ['lingzhi', '九葉芝', 'Nine-Leaf Lingzhi', 95, 9, 'cosmic-egg'],
];
/** 礦 What the veins give: the metals of the nine sets, cinnabar for sigils, stone for arrays. */
const ORES: readonly [string, string, string, number, number, string][] = [
  ['iron', '凡鐵礦', 'Mortal Iron Ore', 1, 1, 'rune-stone'],
  ['cinnabar', '硃砂', 'Cinnabar', 6, 1, 'fire-gem'],
  ['stone', '靈石', 'Spirit Stone', 12, 2, 'crystal-cluster'],
  ['bronze', '古銅礦', 'Elder Bronze Ore', 23, 3, 'gold-nuggets'],
  ['frostsilver', '霜銀礦', 'Frostsilver Ore', 34, 4, 'frozen-orb'],
  ['jade', '碧玉', 'Jadewater Jade', 45, 5, 'emerald'],
  ['starfall', '落星鐵', 'Fallen Star Iron', 56, 6, 'floating-crystal'],
  ['thunderore', '雷紋石', 'Thunderscript Ore', 67, 7, 'rune-stone'],
  ['voidcrystal', '玄晶', 'Void Crystal', 78, 8, 'crystal-shine'],
  ['gold', '仙金', 'Immortal Gold', 89, 9, 'gold-nuggets'],
  ['tribstone', '劫石', 'Tribulation Stone', 95, 9, 'unstable-orb'],
];
for (const [key, han, name, , realm, icon, painted] of HERBS) {
  item({ key, han, name, kind: 'herb', realm, icon,
    paint: painted ? { family: 'herb', subject: painted } : { family: 'craft', subject: `herb-${key}` } });
}
for (const [key, han, name, , realm, icon] of ORES) {
  item({ key, han, name, kind: 'ore', realm, icon, paint: { family: 'craft', subject: `ore-${key}` } });
}

/** 解 What each beast leaves under the knife. One part, named for what it is. */
export const PARTS: Readonly<Record<string, readonly [string, string]>> = {
  rat: ['鼠皮', 'Rat Pelt'], hound: ['犬牙', 'Hound Fang'], frog: ['蛙毒', 'Frog Venom'], fox: ['狐尾', 'Fox Tail'],
  serpent: ['蛇鱗', 'Serpent Scale'], mantis: ['螳刃', 'Mantis Blade'], bat: ['蝠血', 'Bat Blood'], ape: ['猿心', 'Stone Ape Heart'],
  beetle: ['鐵殼', 'Iron Shell'], owl: ['梟羽', 'Owl Feather'], raven: ['鴉墨', 'Raven Ink'], crane: ['鶴頂', 'Crane Crest'],
  boar: ['彘牙', 'Boar Tusk'], wolf: ['狼皮', 'Wolf Pelt'], vulture: ['鷲爪', 'Vulture Talon'], tiger: ['虎骨', 'Thunder Tiger Bone'],
  crab: ['蟹殼', 'Crab Shell'], jellyfish: ['水絲', 'Jellyfish Silk'], lizard: ['蜥皮', 'Lizard Hide'], turtle: ['龜甲', 'Turtle Plastron'],
  centipede: ['蜈毒', 'Centipede Venom'], scorpion: ['蠍尾', 'Scorpion Stinger'], worm: ['屍蠟', 'Corpse Wax'], golem: ['傀核', 'Puppet Core'],
  ogre: ['魔筋', 'Ogre Sinew'], goblin: ['鬼面', 'Ghost Mask Shard'], wraith: ['陰魄', 'Yin Essence'], direwolf: ['魔牙', 'Demon Wolf Fang'],
  skeleton: ['將骨', 'General’s Bone'], gargoyle: ['石心', 'Gargoyle Heart'], minotaur: ['牛角', 'Bull Demon Horn'], jiao: ['蛟鱗', 'Jiao Scale'],
  harpy: ['羽翎', 'Harpy Plume'], unicorn: ['獨角', 'Unicorn Horn'], squid: ['墨囊', 'Abyss Ink'], dragon: ['龍血', 'Dragon Blood'],
};
export const partKey = (beast: string) => `part:${beast}`;
for (const b of BEASTS) {
  const p = PARTS[b.key];
  if (!p) continue;
  item({ key: partKey(b.key), han: p[0], name: p[1], kind: 'part', realm: b.realm, icon: b.icon, beast: b.key });
}

/* ── 方 Recipes ──────────────────────────────────────────────────────────── */

export type Makes =
  | { readonly kind: 'item'; readonly item: string }
  | { readonly kind: 'tool'; readonly skill: SkillKey; readonly step: number }
  | { readonly kind: 'gear'; readonly template: string; readonly beast: string };

export interface Recipe {
  readonly key: string;
  readonly skill: SkillKey;
  /** Which list it sits in on the screen. */
  readonly group: string;
  readonly han: string;
  readonly name: string;
  /** The craft level it asks for. */
  readonly level: number;
  /** The realm its material comes from, which the cultivator has to have reached. */
  readonly realm: number;
  /** Seconds, before tools, arrays and familiarity. */
  readonly seconds: number;
  readonly xp: number;
  readonly needs: readonly (readonly [string, number])[];
  /** 解 Rendering needs this beast known: enough of it killed. See CRAFT_RENDER_KNOWN. */
  readonly remains?: string;
  readonly makes: Makes;
  readonly graded: boolean;
  readonly does?: string;
  /**
   * 百形 A shape no beast of its realm leaves, which the warden's lesson opens: the forge
   * makes it once that realm's warden has fallen (see `remains`). Gear only.
   */
  readonly anyShape?: boolean;
  /**
   * 丹符 How many light makes one make of this recipe is: CRAFT_KIT_WORK for a pill or a
   * sigil, CRAFT_ARRAY_WORK for an array, 1 for everything else. Its time and every need
   * are already multiplied by it; the marks and the third mark's saving read it (see `marks`).
   */
  readonly weight: number;
  /** 熟 How many makes each of the five familiarity marks asks for: CRAFT_MARKS over the weight. */
  readonly marks: readonly number[];
}

type Draft = Omit<Recipe, 'xp' | 'weight' | 'marks'> & { readonly weight?: number };
const draft: Draft[] = [];
const recipe = (r: Draft) => draft.push(r);

/**
 * 丹符 A pill or a sigil made CRAFT_KIT_WORK times heavier (陣 an array CRAFT_ARRAY_WORK):
 * its seconds and every need multiplied together, so the share of the work spent
 * gathering is what it was.
 */
const heavy = (r: Draft, weight: number = CRAFT_KIT_WORK): Draft => ({
  ...r, weight, seconds: r.seconds * weight,
  needs: r.needs.map(([k, n]) => [k, n * weight] as const),
});

for (const [key, han, name, level, realm] of HERBS) {
  recipe({ key: `herb:${key}`, skill: 'herb', group: 'Paths', han, name, level, realm,
    seconds: CRAFT_SECONDS.herb, needs: [], makes: { kind: 'item', item: key }, graded: false });
}
for (const [key, han, name, level, realm] of ORES) {
  recipe({ key: `vein:${key}`, skill: 'vein', group: 'Veins', han, name, level, realm,
    seconds: CRAFT_SECONDS.vein, needs: [], makes: { kind: 'item', item: key }, graded: false });
}

const commonsIn = (realm: number) => BEASTS.filter((b) => b.realm === realm && !b.warden);
/** 0, 1 or 2 for a realm's commons in their order, 3 for its warden. */
const nthOf = (b: Beast) => (b.warden ? 3 : commonsIn(b.realm).findIndex((x) => x.key === b.key));
/** Inside a realm's eleven levels: a common at 0, 3 and 6, the warden at 9. */
const RENDER_STEP = [0, 3, 6, 9];
for (const b of BEASTS) {
  const p = PARTS[b.key];
  if (!p) continue;
  recipe({ key: `render:${b.key}`, skill: 'render', group: `Realm ${b.realm}`, han: p[0], name: p[1],
    // 初 The first realm's three commons are all level 1, so whichever beast the hunt
    // began on is the one that teaches the knife. With only the rat at level 1, a
    // cultivator who had moved on to hounds before the tenth rat could never start.
    level: tierLevel(b.realm) + (b.realm === 1 && !b.warden ? 0 : RENDER_STEP[nthOf(b)]), realm: b.realm,
    // 守 A warden's parts are rarer things, and slower to take apart.
    seconds: CRAFT_SECONDS.render * (b.warden ? 2 : 1), needs: [], remains: b.key,
    makes: { kind: 'item', item: partKey(b.key) }, graded: false });
}

/**
 * 鑄 The nine metals, one per gear set. Most are two of their own ore; the two sets the
 * game says are not dug (枯骨 cut from the first realm's beasts, 龍骸 from a dragon's
 * kin) take a part, and the last two take a part on top, because those metals are rare.
 */
const SMELT: readonly (readonly (readonly [string, number])[])[] = [
  [['iron', 2]],
  [['iron', 1], [partKey('hound'), 2]],
  [['bronze', 2]],
  [['frostsilver', 2]],
  [['jade', 2]],
  [['starfall', 2]],
  [['thunderore', 2], ['cinnabar', 1]],
  [['voidcrystal', 2], [partKey('skeleton'), 1]],
  [['gold', 2], [partKey('harpy'), 1]],
];
export const metalKey = (realm: number) => `metal${realm}`;
/** 源 What a forged piece says it came from. It is also what keeps it out of fusion and the melt. */
export const FORGED = 'forge';
REALM_SETS.forEach((set, i) => {
  const realm = i + 1;
  const plate = realm === 2 || realm === 8;
  const name = `${set.name} ${plate ? 'Plate' : realm === 9 ? 'Sheet' : 'Ingot'}`;
  item({ key: metalKey(realm), han: set.han, name, kind: 'metal', realm, icon: 'ring-mould',
    paint: { family: 'craft', subject: `metal-${realm}` } });
  recipe({ key: `forge:${metalKey(realm)}`, skill: 'forge', group: 'Smelting', han: set.han, name,
    level: tierLevel(realm), realm, seconds: CRAFT_SECONDS.forge / 2, needs: SMELT[i],
    makes: { kind: 'item', item: metalKey(realm) }, graded: false });
});

/** 具 The six metals a tool comes in, by realm: each step is CRAFT_TOOL_STEP faster. */
export const TOOL_METALS: readonly number[] = [1, 3, 4, 6, 7, 9];
if (TOOL_METALS.length !== CRAFT_TOOL_STEPS) throw new Error('a tool step with no metal');
TOOL_METALS.forEach((realm, i) => {
  const step = i + 1;
  const set = REALM_SETS[realm - 1];
  for (const s of SKILLS) {
    recipe({ key: `forge:tool:${s.key}:${step}`, skill: 'forge', group: 'Tools', han: s.tool.han,
      name: `${set.word} ${s.tool.name}`, level: tierLevel(realm) + 2, realm,
      seconds: CRAFT_SECONDS.forge, needs: [[metalKey(realm), 3 + i], ['mat', 20 * realm]],
      makes: { kind: 'tool', skill: s.key, step }, graded: false,
      does: `${s.name} ${Math.round(step * 5)}% faster, for good.` });
  }
});

/**
 * 鑰 The Realm Key. rekaris, on the Discord, asked to force the way into 秘境 the secret
 * realm rather than wait out its door. Paid straight in material that would be a road
 * from material to qi with no end, so it is a thing the forge makes, and the door takes
 * one a day at most (see useKey in sim/secret.ts). Measured with the habits (2 October):
 * a key every day moves the ninth realm by 0.2 to 2 days, and most for the cultivator
 * who visits once a day, who is the one it is for.
 */
export const REALM_KEY = 'realmkey';
item({ key: REALM_KEY, han: '鑰', name: 'Realm Key', kind: 'key', realm: 3, icon: 'wax-seal',
  does: 'Opens 秘境 the secret realm now instead of waiting. The door takes one a day.' });
recipe({ key: `forge:${REALM_KEY}`, skill: 'forge', group: 'Tools', han: '鑰', name: 'Realm Key',
  level: tierLevel(3), realm: 3, seconds: CRAFT_SECONDS.forge, needs: [[metalKey(3), 2], ['mat', 90]],
  makes: { kind: 'item', item: REALM_KEY }, graded: false,
  does: 'Opens 秘境 the secret realm now. The door takes one a day.' });

/**
 * 器 Gear: every beast teaches the three shapes it already drops, in its realm's metal.
 * The piece is the one you chose; only its rank is rolled, from the forge's quality.
 */
const ARCH = Object.fromEntries(ARCHETYPES.map((a) => [a.key, a]));
const GEAR_STEP = [0, 2, 4, 7];
const gearRecipe = (b: Beast, shape: string, anyShape = false) => {
  const a = ARCH[shape];
  if (!a) return;
  const set = REALM_SETS[b.realm - 1];
  recipe({ key: `forge:gear:${b.key}:${shape}`, skill: 'forge', group: 'Gear', han: a.han,
    name: `${set.word} ${a.name}`, level: tierLevel(b.realm) + GEAR_STEP[nthOf(b)], realm: b.realm,
    seconds: CRAFT_SECONDS.forge * 1.5,
    needs: [[metalKey(b.realm), 3], [partKey(b.key), 2], ['mat', 25 * b.realm]],
    makes: { kind: 'gear', template: `${shape}${b.realm}`, beast: b.key }, graded: true,
    ...(anyShape ? { anyShape: true, remains: b.key } : {}) });
};
for (const b of BEASTS) for (const shape of b.leaves) gearRecipe(b, shape);

/**
 * 百形 Every shape of a realm, once its warden has fallen.
 *
 * Each beast teaches the three shapes it leaves, so a realm's four beasts teach twelve of
 * the fifty-four, and which twelve was never chosen for the six schools: measured on
 * 2026-10-06, the fifth realm's own beasts reach four places of 法 Arts at most, and the
 * ninth realm has no 體 Body shape at all, so a pure set of one school out of one realm was
 * impossible whatever a cultivator did. So the warden teaches the rest: once it has fallen,
 * the forge makes any shape of the realm in the realm's metal, at the warden's own price
 * (its level, two of its parts, three ingots and the material). The drop tables do not
 * change; a forged piece still cannot be fused and melts back into its metal, never qi.
 */
for (let realm = 1; realm <= 9; realm++) {
  const warden = BEASTS.find((b) => b.warden && b.realm === realm);
  if (!warden) continue;
  const taught = new Set(BEASTS.filter((b) => b.realm === realm).flatMap((b) => b.leaves));
  for (const a of ARCHETYPES) if (!taught.has(a.key)) gearRecipe(warden, a.key, true);
}

/**
 * 丹 Elixirs: three lines of nine, one herb and one beast of that realm each. The tier is
 * the realm the elixir is made for (see CRAFT_KIT.fade).
 */
const TIER_HERB = ['moss', 'orchid', 'dragonblood', 'lotus', 'ginseng', 'fern', 'vine', 'beard', 'peach'];
export const ELIXIR_LINES = [
  { key: 'mend', han: '回', name: 'Mending', icon: 'round-potion', step: 0, nth: 0,
    names: [['回春散', 'Spring-Return Powder'], ['續骨膏', 'Bone-Setting Salve'], ['生肌丹', 'Flesh-Knitting Pill'],
            ['雪蓮露', 'Snow Lotus Dew'], ['玉髓丹', 'Jade Marrow Pill'], ['星輝丹', 'Starlight Pill'],
            ['雷愈丹', 'Thunder-Mending Pill'], ['龍涎丹', 'Dragon-Spittle Pill'], ['蟠桃丹', 'Peach of Ages Pill']] },
  { key: 'guard', han: '護', name: 'Guarding', icon: 'covered-jar', step: 3, nth: 1,
    names: [['鐵皮散', 'Iron-Skin Powder'], ['石膚膏', 'Stone-Hide Salve'], ['銅筋丹', 'Bronze Sinew Pill'],
            ['霜甲丹', 'Frost Shell Pill'], ['玄龜丹', 'Black Turtle Pill'], ['星罩丹', 'Star-Veil Pill'],
            ['雷盾丹', 'Thunder Ward Pill'], ['龍鱗丹', 'Dragonscale Pill'], ['金身丹', 'Golden Body Pill']] },
  { key: 'might', han: '力', name: 'Might', icon: 'fire-bowl', step: 6, nth: 2,
    names: [['壯力散', 'Strength Powder'], ['蝠血酒', 'Bat-Blood Wine'], ['鴉血丹', 'Raven-Blood Pill'],
            ['虎魄丹', 'Tiger Soul Pill'], ['碧濤丹', 'Jade Tide Pill'], ['蠍尾丹', 'Scorpion-Tail Pill'],
            ['魔血丹', 'Demon-Blood Pill'], ['牛魔丹', 'Bull Demon Pill'], ['龍血丹', 'Dragon-Blood Pill']] },
] as const;
export type ElixirLine = (typeof ELIXIR_LINES)[number]['key'];
export const elixirKey = (line: ElixirLine, tier: number) => `${line}${tier}`;

/**
 * 數 What a pill or a sigil does, with its numbers. rekaris, on the Discord (2026-10-05):
 * *"None of them list any actual number and percentages."* Every number here is read off
 * CRAFT_KIT, CRAFT_QUALITY_MULT and the rank names, never typed, so a change to the
 * balance is a change to the sentence.
 */
const pct = (x: number) => `${Number((x * 100).toFixed(1))}%`;
const TOP_MULT = CRAFT_QUALITY_MULT[CRAFT_QUALITY_MULT.length - 1];
/** "(21% at Heaven rank)": the same effect at the best rank a make can roll. */
const atTop = (x: number) => `(${pct(x * TOP_MULT)} at ${RARITY_INFO.heaven.name} rank)`;
/** What a thing made for one realm is worth in a fight above it. See fade() in sim/crafts.ts. */
const madeFor = (realm: number) => `Made for realm ${realm}; ×${CRAFT_KIT.fade} for each realm a fight stands above it.${breaks}`;
/** 破境 What every carried thing also does at the warden: see Kit.breach. */
const breaks = ` At your realm’s warden it also breaks ${CRAFT_KIT.breach} day of its 瓶頸 bottleneck (${Number((CRAFT_KIT.breach * TOP_MULT).toFixed(2))} at ${RARITY_INFO.heaven.name} rank).`;
const ELIXIR_DOES: Record<ElixirLine, string> = {
  mend: `Mends ${pct(CRAFT_KIT.mend)} of your health every round of one hard fight ${atTop(CRAFT_KIT.mend)}.`,
  guard: `You take ${pct(CRAFT_KIT.guard)} less in one hard fight ${atTop(CRAFT_KIT.guard)}.`,
  might: `You strike ${pct(CRAFT_KIT.might)} harder in one hard fight ${atTop(CRAFT_KIT.might)}.`,
};
for (const line of ELIXIR_LINES) {
  for (let tier = 1; tier <= 9; tier++) {
    const [han, name] = line.names[tier - 1];
    const beast = commonsIn(tier)[line.nth];
    const key = elixirKey(line.key, tier);
    item({ key, han, name, kind: 'elixir', realm: tier, icon: line.icon, graded: true,
      paint: { family: 'craft', subject: `elixir-${line.key}-${Math.ceil(tier / 3)}` },
      does: `${ELIXIR_DOES[line.key]} ${madeFor(tier)}` });
    recipe(heavy({ key: `alchemy:${key}`, skill: 'alchemy', group: line.name, han, name,
      level: tierLevel(tier) + line.step, realm: tier, seconds: CRAFT_SECONDS.alchemy,
      needs: [[TIER_HERB[tier - 1], 2], [partKey(beast.key), 1]],
      makes: { kind: 'item', item: key }, graded: true }));
  }
}

/** 丹 The three that are not a line. */
const SPECIALS: readonly [string, string, string, number, number, (readonly [string, number])[], string, string][] = [
  ['seekincense', '尋寶香', 'Treasure-Seeking Incense', 18, 2, [['orchid', 2], [partKey('bat'), 1]],
    'Burn it, and the next beast you beat by hand on the hunt that would have left nothing leaves a piece.', 'incense'],
  ['calmheart', '靜心丹', 'Calm Heart Pill', 40, 5, [['ginseng', 2], [partKey('turtle'), 1]],
    `Carried into seclusion: your heart demon stands ${pct(CRAFT_KIT.calmHeart)} weaker ${atTop(CRAFT_KIT.calmHeart)}.`, 'meditation'],
  ['nineturn', '九轉還丹', 'Nine-Turn Pill', 97, 9, [['lingzhi', 2], [partKey('dragon'), 1], ['tribstone', 1]],
    'Once in one hard fight, a blow that would put you down mends you to full instead. A win that never needed it keeps it.', 'dragon-orb'],
];
for (const [key, han, name, level, realm, needs, does, icon] of SPECIALS) {
  item({ key, han, name, kind: 'elixir', realm, icon, graded: key !== 'seekincense', does,
    paint: { family: 'craft', subject: `elixir-${key}` } });
  recipe(heavy({ key: `alchemy:${key}`, skill: 'alchemy', group: 'Special', han, name, level, realm,
    seconds: key === 'nineturn' ? CRAFT_SECONDS.alchemy * 2.5 : CRAFT_SECONDS.alchemy, needs,
    makes: { kind: 'item', item: key }, graded: key !== 'seekincense' }));
}

/**
 * 破境丹 The Breakthrough Pills: one for each sealed gate (SEAL_DAYS, the fifth realm to the
 * eighth), carried in their own hand into the realm's warden. Each counts as
 * CRAFT_KIT.unseal days of the seal and of the bottleneck, by rank, so the seal breaks at
 * once and the wall stands as if those days had been waited.
 *
 * 時 They have to be in the pouch the day the gate seals, so they are made from what a
 * cultivator already has there: the herb of the realm below and cinnabar, both gathered a
 * realm earlier, and an Alchemy level the crafters of tools/habits.ts reach before each of
 * those gates (measured 2026-10-07: the hourly crafter, the one whose crafts lag furthest
 * behind the climb, stands at Alchemy 46, 55, 59 and 62 at the four gates). Each level is
 * one an Alchemy recipe already asks for, so the experience every recipe pays, which is
 * solved from the levels (see RECIPES below), is what it was.
 */
export const BREAKTHROUGH_TIERS: readonly number[] = [5, 6, 7, 8];
export const breakthroughKey = (tier: number) => `breakthrough${tier}`;
const BREAKTHROUGH_LEVEL: Readonly<Record<number, number>> = { 5: 40, 6: 45, 7: 51, 8: 56 };
const unsealTop = Number((CRAFT_KIT.unseal * TOP_MULT).toFixed(2));
for (const tier of BREAKTHROUGH_TIERS) {
  const set = REALM_SETS[tier - 1];
  const key = breakthroughKey(tier);
  const han = `${set.han}破境丹`;
  const name = `${set.word} Breakthrough Pill`;
  item({ key, han, name, kind: 'elixir', realm: tier, icon: 'beams-aura', graded: true,
    does: `Carried into your realm’s warden, it counts as ${CRAFT_KIT.unseal} days of the gate’s 封 seal and of its 瓶頸 bottleneck `
      + `(${unsealTop} at ${RARITY_INFO.heaven.name} rank). The seal breaks at once and the wall stands lower. `
      + `Made for realm ${tier}; ×${CRAFT_KIT.fade} for each realm a gate stands above it. A win spends it, a loss keeps it.` });
  recipe(heavy({ key: `alchemy:${key}`, skill: 'alchemy', group: 'Breakthrough', han, name,
    level: BREAKTHROUGH_LEVEL[tier], realm: tier, seconds: CRAFT_SECONDS.alchemy,
    needs: [[TIER_HERB[tier - 2], 2], ['cinnabar', 1]],
    makes: { kind: 'item', item: key }, graded: true }));
}

/** 符 Sigils: paper, cinnabar and a beast's ink. The last word of each is what it does. */
export const SIGILS: readonly [string, string, string, number, number, (readonly [string, number])[], string, string][] = [
  ['warding', '護身符', 'Warding Sigil', 1, 1, [],
    `You take ${pct(CRAFT_KIT.warding)} less in one hard fight ${atTop(CRAFT_KIT.warding)}. ${madeFor(1)}`, 'wax-seal'],
  ['seeking', '尋物符', 'Seeking Sigil', 12, 2, [[partKey('fox'), 1]], 'Use it, and the next beast you beat by hand on the hunt that would have left nothing leaves a piece.', 'scroll-unfurled'],
  ['thunder', '雷符', 'Thunder Sigil', 23, 3, [[partKey('raven'), 1]],
    `You strike ${pct(CRAFT_KIT.thunder)} harder in one hard fight ${atTop(CRAFT_KIT.thunder)}. ${madeFor(3)}`, 'lightning-helix'],
  ['binding', '縛妖符', 'Binding Sigil', 34, 4, [[partKey('vulture'), 1]], `The beast loses its first blow in one hard fight, at any rank and any realm.${breaks}`, 'tied-scroll'],
  ['mirror', '照妖符', 'Mirror Sigil', 45, 5, [[partKey('crab'), 1]],
    `${pct(CRAFT_KIT.mirror)} of every blow you take in one hard fight goes back to the beast ${atTop(CRAFT_KIT.mirror)}. ${madeFor(5)}`, 'crystal-ball'],
  ['purity', '清心符', 'Purity Sigil', 56, 6, [['jade', 1], [partKey('jellyfish'), 1]],
    `Your heart demon stands ${pct(CRAFT_KIT.purity)} weaker ${atTop(CRAFT_KIT.purity)}.`, 'yin-yang'],
  ['fivethunder', '五雷符', 'Five Thunders Sigil', 67, 7, [[partKey('tiger'), 1], ['thunderore', 1]],
    `You strike ${pct(CRAFT_KIT.fiveThunders)} harder in one hard fight ${atTop(CRAFT_KIT.fiveThunders)}. ${madeFor(7)}`, 'lightning-helix'],
  ['soullock', '鎖魂符', 'Soul-Lock Sigil', 78, 8, [[partKey('wraith'), 2]], 'If your heart demon falls while you carry it, it counts twice.', 'skull-signet'],
  ['heavenseal', '天罡符', 'Heaven Seal Sigil', 89, 9, [[partKey('harpy'), 1], ['gold', 1]],
    `Warding and Thunder at once: you take ${pct(CRAFT_KIT.warding)} less and strike ${pct(CRAFT_KIT.thunder)} harder in one hard fight (${pct(CRAFT_KIT.warding * TOP_MULT)} and ${pct(CRAFT_KIT.thunder * TOP_MULT)} at ${RARITY_INFO.heaven.name} rank).${breaks}`, 'winged-scepter'],
];
export const sigilKey = (k: string) => `sigil:${k}`;
for (const [key, han, name, level, realm, extra, does, icon] of SIGILS) {
  const k = sigilKey(key);
  const graded = key !== 'seeking';
  item({ key: k, han, name, kind: 'sigil', realm, icon, graded, does, paint: { family: 'craft', subject: `sigil-${key}` } });
  recipe(heavy({ key: `sigil:${key}`, skill: 'sigil', group: 'Sigils', han, name, level, realm, seconds: CRAFT_SECONDS.sigil,
    needs: [['bark', 1 + Math.floor(realm / 4)], ['cinnabar', 1], ...extra], makes: { kind: 'item', item: k }, graded }));
}

/**
 * 陣 Arrays: placed in the cave floor while there is room, and deepened by cutting the same
 * one again (CRAFT_ARRAY_DEPTH_EVERY). What each does is read off balance.ts at a strength,
 * 1 for a first copy and up to CRAFT_ARRAY_DEPTH_TOP at full depth, so the line on the
 * screen and the number the game uses are one number.
 */
export const ARRAYS: readonly [string, string, string, number, number, (readonly [string, number])[], string][] = [
  ['dew', '聚露陣', 'Dew-Catching Array', 1, 2, [[metalKey(1), 2], ['moss', 5]], 'spiral-bloom'],
  ['earthvein', '地脈陣', 'Earth-Vein Array', 12, 2, [[metalKey(2), 2], ['stone', 5]], 'quake-stomp'],
  ['keenedge', '利刃陣', 'Keen-Edge Array', 23, 3, [[metalKey(3), 3], ['stone', 5], [partKey('mantis'), 2]], 'crescent-blade'],
  ['firetame', '馴火陣', 'Fire-Taming Array', 34, 4, [[metalKey(4), 3], ['stone', 8], [partKey('tiger'), 1]], 'flame-spin'],
  ['guardian', '護法陣', 'Guardian Array', 45, 5, [[metalKey(5), 4], ['stone', 8], [partKey('turtle'), 2]], 'pagoda'],
  ['hiddendoor', '秘門陣', 'Hidden Door Array', 56, 6, [[metalKey(6), 4], ['stone', 10], [partKey('golem'), 1]], 'vortex'],
  ['longwatch', '長守陣', 'Long-Watch Array', 67, 7, [[metalKey(7), 4], ['stone', 12], [partKey('wraith'), 2]], 'ouroboros'],
  ['ninepalace', '九宮陣', 'Nine Palaces Array', 78, 8, [[metalKey(8), 4], ['stone', 15], [partKey('gargoyle'), 2]], 'star-cycle'],
  ['heavenearth', '天地陣', 'Heaven-Earth Array', 89, 9, [[metalKey(9), 4], ['stone', 20], [partKey('unicorn'), 2]], 'galaxy'],
];
export const arrayKey = (k: string) => `array:${k}`;

/** 陣 A number as the screen writes it: 7.5, never 7.500000001. */
const trim = (x: number) => `${Number(x.toFixed(1))}`;
/**
 * 陣 What an array does at a strength (1 for a first copy, CRAFT_ARRAY_DEPTH_TOP at full
 * depth), in numbers: the line its item carries and the line the cave floor shows.
 */
export function arrayDoes(key: string, strength = 1): string {
  const pc = (x: number) => `${trim(x * strength * 100)}%`;
  switch (key) {
    case 'dew': return `Herb Gathering ${pc(CRAFT_ARRAY_SPEED)} faster.`;
    case 'earthvein': return `Vein Delving ${pc(CRAFT_ARRAY_SPEED)} faster.`;
    case 'keenedge': return `Rendering: ${pc(CRAFT_ARRAY_TWICE)} of parts come out twice.`;
    case 'firetame': return `Forging and Alchemy ${pc(CRAFT_ARRAY_SPEED)} faster.`;
    case 'guardian': return `You take ${pc(CRAFT_ARRAY_GUARD)} less from wardens and heart demons.`;
    case 'hiddendoor': return `The vault door opens ${trim(CRAFT_ARRAY_DOOR * strength / 60)} minutes sooner.`;
    case 'longwatch': return `The workshop keeps working ${trim(CRAFT_LONG_WATCH_HOURS * strength)} hours longer while you are away.`;
    case 'ninepalace': {
      const marks = trim(CRAFT_ARRAY_QUALITY * strength / CRAFT_QUALITY.mark);
      return `Every craft rolls its quality as if it had ${marks} more familiarity mark${marks === '1' ? '' : 's'}.`;
    }
    case 'heavenearth': return `Every craft earns ${pc(CRAFT_ARRAY_XP)} more experience.`;
    default: return '';
  }
}

for (const [key, han, name, level, realm, needs, icon] of ARRAYS) {
  const k = arrayKey(key);
  item({ key: k, han, name, kind: 'array', realm, icon, does: arrayDoes(key), paint: { family: 'craft', subject: `array-${key}` } });
  recipe(heavy({ key: `array:${key}`, skill: 'array', group: 'Arrays', han, name, level, realm,
    seconds: CRAFT_SECONDS.array, needs, makes: { kind: 'item', item: k }, graded: false }, CRAFT_ARRAY_WORK));
}

/**
 * 經 Experience, from one number.
 *
 * A recipe pays in proportion to its time and grows with its level, and each craft's
 * scale is solved so that the best recipe at every level, in turn, takes exactly
 * CRAFT_HOURS_TO_CAP hours from 1 to 99. Tools are left out of the solving: they are a
 * thing a forge makes, not a thing a level is.
 */
const growth = (level: number) => 1 + level / 8;
export const RECIPES: readonly Recipe[] = (() => {
  const scale: Record<string, number> = {};
  for (const s of SKILLS) {
    const mine = draft.filter((r) => r.skill === s.key && r.group !== 'Tools');
    let hours = 0;
    for (let l = 1; l < LEVEL_CAP; l++) {
      const best = Math.max(...mine.filter((r) => r.level <= l).map((r) => r.level));
      hours += (XP_TABLE[l + 1] - XP_TABLE[l]) / (3600 * growth(best));
    }
    scale[s.key] = hours / CRAFT_HOURS_TO_CAP;
  }
  // Rounded to a tenth: a whole number is too coarse at the first levels, where a
  // recipe pays one or two.
  return draft.map((r) => {
    const weight = r.weight ?? 1;
    return { ...r, weight, marks: CRAFT_MARKS.map((m) => Math.max(1, Math.ceil(m / weight))),
      xp: Math.max(0.1, Math.round(scale[r.skill] * r.seconds * growth(r.level) * 10) / 10) };
  });
})();
export const RECIPE_BY_KEY: Readonly<Record<string, Recipe>> = Object.fromEntries(RECIPES.map((r) => [r.key, r]));

/** 物 Every material and made thing, by key. Remains and tools are not in the pouch. */
export const ITEMS: readonly CraftItem[] = items;
export const ITEM_BY_KEY: Readonly<Record<string, CraftItem>> = Object.fromEntries(items.map((x) => [x.key, x]));

/**
 * 品 A graded thing in the pouch is its key and its rank: `thunder@2` is a Mystic Thunder
 * Sigil. Anything else is its key alone.
 */
export function pouchKey(key: string, quality?: number): string {
  return quality === undefined ? key : `${key}@${quality}`;
}
export function splitKey(k: string): { key: string; quality: number | null } {
  const at = k.lastIndexOf('@');
  if (at < 0) return { key: k, quality: null };
  const q = Number(k.slice(at + 1));
  return { key: k.slice(0, at), quality: Number.isInteger(q) && q >= 0 && q <= 4 ? q : null };
}
