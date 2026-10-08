import type { Item } from '../data/gear.ts';
import { DRIVE_PILE } from './balance.ts';
import type { State } from './state.ts';

/**
 * 圍 The drive's pile, written small.
 *
 * rekaris asked (2026-10-08) for every piece a drive drops to be on the table, and a drive
 * of two thousand kills can leave three thousand of them. Written as the chest writes its
 * pieces (every key spelled out, every line an object) that is about 650 KB of save, four
 * times over in the cloud copy. Written as a row it is about 60% of that, and the row is
 * only ever what a drive can make: nothing here can be derived again, so nothing is dropped.
 *
 *   [stem, template, rarity, [affix, value, affix, value, ...], from?, fullId?]
 *
 * The stem is the id without its trailing "-template" (every id a drive makes ends so), and
 * a piece whose id does not end so carries the whole id in the last place. A piece that is
 * anything beyond what a drive drops (a lock, a Hundredfold mark, a leftover refine) is
 * kept as the object it was, in the same array, so no piece is ever lost to the shape.
 * The save reads both forms, and a save from before this was written reads exactly as it
 * did: the pile of an old save is an array of objects.
 *
 * Reading is the dangerous direction. A row from a hand-edited save is any array at all, so
 * unpackRow builds only the loose object validate() then judges like any other piece: it
 * trusts no length, no type, and no key it has not looked at.
 */
export type PackedRow = readonly [string, string, string, readonly (string | number)[], (string | null)?, string?];

const SIMPLE = new Set(['id', 'template', 'rarity', 'rolls', 'from']);

function packable(it: Item): boolean {
  for (const k of Object.keys(it)) if (!SIMPLE.has(k)) return false;
  return it.rolls.every((r) => Object.keys(r).length === 2);
}

export function packItem(it: Item): PackedRow | Item {
  if (!packable(it)) return it;
  const tail = `-${it.template}`;
  const stemmed = it.id.endsWith(tail) && it.id.length > tail.length;
  const flat: (string | number)[] = [];
  for (const r of it.rolls) flat.push(r.affix, r.value);
  const row: [string, string, string, (string | number)[], (string | null)?, string?] = [
    stemmed ? it.id.slice(0, -tail.length) : '', it.template, it.rarity, flat,
  ];
  if (it.from !== undefined || !stemmed) row[4] = it.from ?? null;
  if (!stemmed) row[5] = it.id;
  return row;
}

/** What goes to the phone's storage and to the cloud: the same pile, as rows. */
export function packPile(pile: readonly Item[]): (PackedRow | Item)[] {
  return pile.map(packItem);
}

/** A row read back as the loose object validate() judges. Anything that is not a row passes through. */
export function unpackRow(raw: unknown): unknown {
  if (!Array.isArray(raw)) return raw;
  const [stem, template, rarity, flat, from, full] = raw as unknown[];
  const rolls: { affix: unknown; value: unknown }[] = [];
  if (Array.isArray(flat)) {
    // A pair is an affix and a value; more than a piece could ever carry is not read.
    for (let i = 0; i + 1 < flat.length && rolls.length < 16; i += 2) rolls.push({ affix: flat[i], value: flat[i + 1] });
  }
  const id = typeof full === 'string' ? full : typeof stem === 'string' && typeof template === 'string' ? `${stem}-${template}` : undefined;
  return { id, template, rarity, rolls, ...(typeof from === 'string' ? { from } : {}) };
}

/**
 * The rows or pieces a save names, at most a pile's worth read. A hostile array of millions
 * is cut before anything looks at it: the cap is on what is read, not only on what is kept.
 */
export function unpackPile(raw: unknown): unknown[] {
  if (!Array.isArray(raw)) return [];
  const out: unknown[] = [];
  const most = DRIVE_PILE * 2;
  for (let i = 0; i < raw.length && i < most; i++) out.push(unpackRow(raw[i]));
  return out;
}

/** The state as it is written out: everything as it was, the pile as rows. */
export function withPackedPile(s: State): State {
  return s.pile.length === 0 ? s : { ...s, pile: packPile(s.pile) as unknown as Item[] };
}
