import { WARDENS } from '../data/bestiary.ts';
import { RANKS } from './copy.ts';
import type { Carved } from '../net/cloud.ts';

/**
 * 題名崖 The Cliff of Names, shaped for the screen (docs/SEASON0-THEME.md, 2c).
 *
 * The server hands back one flat list, cliff(): for each of the nine gates the first 81
 * through it, in the order it saw them, already without the banned, the held and staff. This
 * file only folds that list into nine columns and reads the foot of the Cliff off the same
 * rows, so nothing here can carve, reorder or rank anybody. A name is matched to "you" by the
 * name the boards show (set_name() keeps names unique), because cliff() never hands out an id.
 */

/** Nine gates: out of realms 1 to 8, each named for its warden, and the Dragon's tribulation. */
export const GATES = 9;
/** Each column holds 9 by 9. */
export const CARVED = 81;
/** How many names a column shows before "every name" is asked for. */
export const FIRST = 9;

export interface Column {
  readonly gate: number;
  /** The warden who guards it, from the bestiary, so a renamed beast is renamed here too. */
  readonly han: string;
  readonly name: string;
  /** In order, rank 1 first, never more than 81. */
  readonly rows: readonly Carved[];
  /** A first name is carved: the painting takes its colour. */
  readonly on: boolean;
  /** Your place on this column, or null. */
  readonly mine: number | null;
}

export function columns(rows: readonly Carved[], me: string | null): Column[] {
  return Array.from({ length: GATES }, (_, i) => {
    const gate = i + 1;
    const w = WARDENS[i];
    const here = rows
      .filter((r) => r.gate === gate && r.rank >= 1 && r.rank <= CARVED && r.name)
      .slice().sort((a, b) => a.rank - b.rank);
    const own = me ? here.find((r) => r.name === me) : undefined;
    return { gate, han: w.han, name: w.name, rows: here, on: here.length > 0, mine: own ? own.rank : null };
  });
}

/**
 * The names a column shows: the first nine, and your own place below them if it is further
 * down, so a player is never told they are carved without being shown where.
 */
export function shown(col: Column, all: boolean): readonly Carved[] {
  if (all || col.rows.length <= FIRST) return col.rows;
  const head = col.rows.slice(0, FIRST);
  const own = col.mine !== null && col.mine > FIRST ? col.rows.find((r) => r.rank === col.mine) : undefined;
  return own ? [...head, own] : head;
}

/**
 * 先行 Those who walked before: every Forerunner carved anywhere on the Cliff, once each, in
 * the order the server first saw them through a gate. Names only, never a number.
 */
export function walkedBefore(rows: readonly Carved[]): string[] {
  const first = new Map<string, number>();
  for (const r of rows) {
    if (!r.forerunner || !r.name) continue;
    const t = Date.parse(r.at);
    const was = first.get(r.name);
    if (was === undefined || t < was) first.set(r.name, Number.isFinite(t) ? t : Infinity);
  }
  return [...first.entries()].sort((a, b) => a[1] - b[1] || a[0].localeCompare(b[0])).map(([n]) => n);
}

/**
 * 先行 The foot of the Cliff: every Forerunner's name from forerunners() when the server gave it
 * (once each, in its own order), or, when it could not be read, those carved on the Cliff, and
 * `whole` says which, so the words under it never claim a list it is not.
 */
export function foot(walked: readonly string[] | null, rows: readonly Carved[] | null): { names: string[]; whole: boolean } {
  if (walked) return { names: [...new Set(walked.filter((n) => typeof n === 'string' && n.length > 0))], whole: true };
  return { names: rows ? walkedBefore(rows) : [], whole: false };
}

/** When the server saw you, in this device's own time: "26 Oct, 00:41". */
export function seenAt(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const two = (n: number) => String(n).padStart(2, '0');
  return RANKS.cliff.date(d.getDate(), RANKS.cliff.months[d.getMonth()], `${two(d.getHours())}:${two(d.getMinutes())}`);
}
