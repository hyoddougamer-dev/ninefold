/**
 * 百煉 The Hundredfold sets and 譜 the codex, as tables: what each crucible material gives,
 * and what finishing each realm's set leaves for good. The rules that read them are in
 * sim/hundred.ts; every number is in sim/balance.ts.
 *
 * Bruno, 2026-10-06, on the workshop: the sets it makes should be whole, their lines chosen
 * by what goes into the crucible, and hard to make. Proposed to the testers on the Discord
 * with pictures on that day (tools/forge-sets-data.ts drew them from these same tables).
 */
import type { Affix } from './gear.ts';
import { ITEM_BY_KEY, TIER_HERB, hundredElite, partKey, type HundredRank } from './crafts.ts';

/**
 * 爐 What each line would ask for if the set's realm did not matter: cinnabar for power, the
 * realm's own herb for qi, starfall for rarer gear, Immortal Gold for drop chance, the elite's
 * parts for beasts weaker, jade for fusion, thunder ore for the arts and Spirit Stone for the
 * chest. Heaven still asks for these; Mystic and Earth ask for each only from the realm it
 * belongs to (CRUCIBLE below).
 */
export const CRUCIBLE_NATURAL: Readonly<Record<Affix, (realm: number) => string>> = {
  power: () => 'cinnabar',
  rate: (realm) => TIER_HERB[Math.max(1, Math.min(9, realm)) - 1],
  luck: () => 'starfall',
  find: () => 'gold',
  sunder: (realm) => partKey(hundredElite(realm).key),
  refine: () => 'jade',
  art: () => 'thunderore',
  capacity: () => 'stone',
};

/** 礦 The ore each realm's veins give, one a realm: the set's own, which stands in below. */
export const REALM_ORE: readonly string[] = ['iron', 'stone', 'bronze', 'frostsilver', 'jade', 'starfall', 'thunderore', 'voidcrystal', 'gold'];

/**
 * 爐 The crucible: which material gives which line, for a set of this realm at this rank.
 * Heaven asks for each line's own material, as the crucible always did: Fallen Star Iron for
 * rarer gear, Immortal Gold for drop chance, wherever the veins give them. Mystic and Earth
 * ask for nothing their own realm cannot gather: where a line's material belongs to a later
 * realm, the set's own ore stands in for it, so a first-realm cultivator can craft the
 * first-realm set and push with it, and the rare materials stay what Heaven is for.
 * rekaris, on the Discord (2026-10-08): *"A person in the mortal realm should be able to
 * craft the mortal iron items otherwise it's just 'collect the collection' rather than
 * 'craft your own to push'. Not necessarily at Heaven rank, but Mystic/Earth should be
 * doable without waiting days for crafts before pushing."*
 */
export const CRUCIBLE: Readonly<Record<Affix, (realm: number, rank: HundredRank) => string>> = Object.fromEntries(
  (Object.keys(CRUCIBLE_NATURAL) as Affix[]).map((affix) => [affix, (realm: number, rank: HundredRank) => {
    const key = CRUCIBLE_NATURAL[affix](realm);
    const own = Math.max(1, Math.min(9, realm));
    return rank === 'heaven' || (ITEM_BY_KEY[key]?.realm ?? 1) <= own ? key : REALM_ORE[own - 1];
  }]),
) as Record<Affix, (realm: number, rank: HundredRank) => string>;

/** 譜 The nine parts of the game a finished set reaches, one each, in realm order. */
export type CodexKey = 'hunt' | 'elite' | 'vault' | 'demon' | 'work' | 'bond' | 'gates' | 'tower' | 'platform';
export const CODEX_KEYS: readonly CodexKey[] = ['hunt', 'elite', 'vault', 'demon', 'work', 'bond', 'gates', 'tower', 'platform'];

export interface CodexEntry {
  readonly key: CodexKey;
  /** The realm whose set leaves it. */
  readonly realm: number;
  readonly han: string;
  /** The part of the game it reaches, as the page names it. */
  readonly sys: string;
  /** Whether more is better for the player (material, speed, bond) or less (a beast's power). */
  readonly kind: 'more' | 'less' | 'days';
}

export const CODEX: readonly CodexEntry[] = [
  { key: 'hunt', realm: 1, han: '狩', sys: 'Hunt', kind: 'more' },
  { key: 'elite', realm: 2, han: '霸', sys: 'Elites', kind: 'less' },
  { key: 'vault', realm: 3, han: '秘', sys: 'Vault gates', kind: 'less' },
  { key: 'demon', realm: 4, han: '心', sys: 'Heart demon', kind: 'less' },
  { key: 'work', realm: 5, han: '業', sys: 'Workshop', kind: 'more' },
  { key: 'bond', realm: 6, han: '緣', sys: 'Bonds', kind: 'more' },
  { key: 'gates', realm: 7, han: '瓶', sys: 'Bottlenecks', kind: 'days' },
  { key: 'tower', realm: 8, han: '塔', sys: 'Tower', kind: 'less' },
  { key: 'platform', realm: 9, han: '擂', sys: 'Platform', kind: 'less' },
];

export function codexOf(realm: number): CodexEntry {
  return CODEX[Math.max(1, Math.min(9, realm)) - 1];
}
