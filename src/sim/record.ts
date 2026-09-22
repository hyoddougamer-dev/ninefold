import { BEASTS, type Beast } from '../data/bestiary.ts';

/**
 * 錄 The record.
 *
 * 狩 Hunt had a real problem. By the fifth realm it was fifteen buttons all reading 98%
 * and only the last one was worth pressing. Every beast below your realm was dead
 * content: fixed power, less material, nothing to find. Thirty-six animals were drawn
 * and twenty-seven of them stopped existing the moment you climbed past them.
 *
 * So the kills already in the save mean something now. Every beast carries three marks,
 * and the marks pay:
 *
 *   見 **Seen** at one kill. The record fills in. Worth nothing but the page.
 *   熟 **Known** at ten. 材 material from everything goes up.
 *   通 **Mastered** at a hundred. Your 力 power goes up.
 *
 * Neither of those is the qi rate, which is the rule the whole economy stands on. And
 * neither can be hurried by waiting: a mark is a hundred taps or it is nothing.
 *
 * The numbers are small on purpose. All thirty-six mastered is +72% material and +72%
 * power: worth having, never worth grinding for in one sitting, and reached by somebody
 * who has been hunting for months rather than by somebody who farmed the first rat.
 */

/** Kills that earn each mark. */
export const MARKS: readonly number[] = [1, 10, 100];

export const MARK_INFO: readonly { han: string; name: string; pays: string }[] = [
  { han: '見', name: 'Seen', pays: 'the record fills in' },
  { han: '熟', name: 'Known', pays: '+2% 材 material' },
  { han: '通', name: 'Mastered', pays: '+2% power' },
];

/** What one 熟 mark adds to everything that drops material. */
export const KNOWN_MATERIAL = 0.02;
/** What one 通 mark adds to power. */
export const MASTERED_POWER = 0.02;

export type Killed = Readonly<Record<string, number>>;

/** How many marks a beast has earned: 0 to 3. */
export function marksOf(kills: number): number {
  let n = 0;
  for (const at of MARKS) if (kills >= at) n++;
  return n;
}

/** The next mark this beast is working toward, or null once it is mastered. */
export function nextMark(kills: number): { at: number; index: number } | null {
  const i = marksOf(kills);
  return i >= MARKS.length ? null : { at: MARKS[i], index: i };
}

function countAt(killed: Killed, mark: number): number {
  let n = 0;
  for (const b of BEASTS) if ((killed[b.key] ?? 0) >= mark) n++;
  return n;
}

/** How many beasts are 見 seen, 熟 known and 通 mastered. */
export function recordTally(killed: Killed): readonly number[] {
  return MARKS.map((at) => countAt(killed, at));
}

/** 熟 What the record is worth to every drop of 材 material. */
export function recordMaterial(killed: Killed): number {
  return 1 + KNOWN_MATERIAL * countAt(killed, MARKS[1]);
}

/** 通 What the record is worth to 力 power. */
export function recordPower(killed: Killed): number {
  return 1 + MASTERED_POWER * countAt(killed, MARKS[2]);
}

/**
 * 圖鑑 A realm whose every beast is 熟 Known: ten kills of each of its four.
 *
 * The bar was set at 通 Mastered first, a hundred kills of each, and measuring it killed
 * the idea: across five cultivators and ten thousand fights, **not one realm was ever
 * finished**, and not one at ten kills either. The reason is the useful part. A player
 * hunts the strongest beast they can beat, because that is the one that pays, so a
 * realm's weakest animal is killed once for its 見 mark and then never again. There has
 * never been a reason to go back for it.
 *
 * That is the hole this fills. Ten kills of each of four is forty fights against animals
 * you outclass, so it costs a couple of minutes and no risk at all; what it asks for is
 * the one thing hunting never asked for, which is *finishing* a realm instead of moving
 * on from it. The harness still measures every curve without it, so the point it pays
 * can only ever be a bonus on top of a run that was already balanced.
 */
export function realmsKnown(killed: Killed): number {
  const realms = new Set(BEASTS.map((b) => b.realm));
  let n = 0;
  for (const r of realms) if (knownIn(killed, r).done === knownIn(killed, r).of) n++;
  return n;
}

/** A realm's four, and how many of them are 熟 Known. */
export function knownIn(killed: Killed, realm: number): { done: number; of: number } {
  const of = BEASTS.filter((b) => b.realm === realm);
  return { done: of.filter((b) => (killed[b.key] ?? 0) >= MARKS[1]).length, of: of.length };
}

/** Everything the record could ever be worth, for the screen that has to promise it. */
export function recordCeiling(): { material: number; power: number } {
  return {
    material: 1 + KNOWN_MATERIAL * BEASTS.length,
    power: 1 + MASTERED_POWER * BEASTS.length,
  };
}

/** Is this beast worth hunting at all: is there a mark left in it? */
export function hasMarkLeft(killed: Killed, b: Beast): boolean {
  return nextMark(killed[b.key] ?? 0) !== null;
}
