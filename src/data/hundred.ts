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
import { TIER_HERB, hundredElite, partKey } from './crafts.ts';

/**
 * 爐 The crucible: which material gives which line. Every line on a Hundredfold piece but
 * the main one is a material chosen here; the main line is the realm's own ingots.
 * Cinnabar for power, the realm's own herb for qi, starfall for rarer gear, Immortal Gold
 * for drop chance, the elite's parts for beasts weaker, jade for fusion, thunder ore for
 * the arts and Spirit Stone for the chest. A material from a later realm opens its line
 * when the veins reach it.
 */
export const CRUCIBLE: Readonly<Record<Affix, (realm: number) => string>> = {
  power: () => 'cinnabar',
  rate: (realm) => TIER_HERB[Math.max(1, Math.min(9, realm)) - 1],
  luck: () => 'starfall',
  find: () => 'gold',
  sunder: (realm) => partKey(hundredElite(realm).key),
  refine: () => 'jade',
  art: () => 'thunderore',
  capacity: () => 'stone',
};

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
