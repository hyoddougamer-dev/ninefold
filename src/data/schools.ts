import type { Affix } from './gear.ts';

/**
 * 職 The five schools, and the ten classes two of them make together.
 *
 * Bruno: *"explorar o facto de existir classes especificas com base no equipamento"*,
 * and then, on how far to take it, *"avança com tudo a fundo"*. The answer he chose was
 * ArcheAge's idea at this game's size: no menu and no fixed pick. Every shape of gear
 * belongs to a school by the line it leads with, and wearing three pieces of one school
 * wakes it. Five pieces of one school is that school at its full; three and three of two
 * schools is one of ten named classes with a perk of its own.
 *
 * So a drop is also a question about who you are becoming, and changing class is
 * changing clothes, which costs nothing, as everything in this game costs nothing to
 * take back.
 *
 * The perks' sizes live in sim/balance.ts and what they do in sim/schools.ts. This file
 * is only the names. What each one says to the player is in app/copy.ts.
 */
export type School = 'sword' | 'qi' | 'fortune' | 'body' | 'artificer';

export const SCHOOLS: readonly School[] = ['sword', 'qi', 'fortune', 'body', 'artificer'];

export interface SchoolInfo {
  /** The one character on the seal. */
  readonly seal: string;
  /** What a cultivator of this school is called. */
  readonly han: string;
  readonly name: string;
  /** The school's own name, for the pips and the sheet: "a Sword piece". */
  readonly short: string;
  readonly colour: string;
  /** The lines a piece leads with to count toward this school. */
  readonly axes: readonly Affix[];
}

export const SCHOOL_INFO: Record<School, SchoolInfo> = {
  sword:     { seal: '劍', han: '劍修', name: 'Sword Cultivator', short: 'Sword', colour: '#D2604E', axes: ['power'] },
  qi:        { seal: '氣', han: '氣修', name: 'Qi Cultivator', short: 'Qi', colour: '#7FB495', axes: ['rate'] },
  fortune:   { seal: '運', han: '運修', name: 'Fortune Seeker', short: 'Fortune', colour: '#D4AF56', axes: ['luck', 'find'] },
  body:      { seal: '體', han: '體修', name: 'Body Cultivator', short: 'Body', colour: '#B2A566', axes: ['sunder'] },
  artificer: { seal: '器', han: '器修', name: 'Artificer', short: 'Artificer', colour: '#A077B8', axes: ['refine', 'capacity'] },
};

/** Which school a line belongs to. Every one of the seven belongs to exactly one. */
export function schoolOfAxis(a: Affix): School {
  return SCHOOLS.find((s) => SCHOOL_INFO[s].axes.includes(a)) ?? 'sword';
}

export type Pair =
  | 'swordimmortal' | 'wanderer' | 'wargod' | 'swordsmith' | 'seeker'
  | 'vajra' | 'alchemist' | 'huntking' | 'treasuresmith' | 'armourer';

export interface PairInfo {
  readonly key: Pair;
  readonly a: School;
  readonly b: School;
  readonly han: string;
  readonly name: string;
}

/**
 * 合 Ten classes, one for every two schools. Each has a perk no school has, on a system
 * of its own, so no two of them are the same class wearing different words.
 */
export const PAIRS: readonly PairInfo[] = [
  { key: 'swordimmortal', a: 'sword', b: 'qi', han: '劍仙', name: 'Sword Immortal' },
  { key: 'wanderer', a: 'sword', b: 'fortune', han: '俠客', name: 'Wanderer' },
  { key: 'wargod', a: 'sword', b: 'body', han: '武神', name: 'War God' },
  { key: 'swordsmith', a: 'sword', b: 'artificer', han: '鑄劍師', name: 'Swordsmith' },
  { key: 'seeker', a: 'qi', b: 'fortune', han: '尋仙', name: 'Immortal Seeker' },
  { key: 'vajra', a: 'qi', b: 'body', han: '金剛', name: 'Vajra' },
  { key: 'alchemist', a: 'qi', b: 'artificer', han: '丹師', name: 'Alchemist' },
  { key: 'huntking', a: 'fortune', b: 'body', han: '獵王', name: 'Hunt King' },
  { key: 'treasuresmith', a: 'fortune', b: 'artificer', han: '寶匠', name: 'Treasure Smith' },
  { key: 'armourer', a: 'body', b: 'artificer', han: '甲匠', name: 'Armourer' },
];

export function pairOf(x: School, y: School): PairInfo | undefined {
  return PAIRS.find((p) => (p.a === x && p.b === y) || (p.a === y && p.b === x));
}
