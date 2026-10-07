import { AFFIXES, SLOTS, TEMPLATE_BY_KEY, schoolOf, type Affix, type Item, type Slot } from '../data/gear.ts';
import { SCHOOLS, type School } from '../data/schools.ts';
import type { State } from './state.ts';

/**
 * 篩 存 The chest's saved filters, and 熔 the ones a full chest weighs first.
 *
 * rekaris, on the Discord: a full chest melts the piece it judges worst by its own measure,
 * and that may be the very piece he was hunting for. So a saved filter can be marked
 * **keep**: a full chest never melts a piece that matches a kept filter while a piece that
 * matches none could go instead. It melts the worst piece that matches none.
 *
 * 熔 And when every piece it could melt matches one, it still keeps the better of two
 * (rekaris again: a kept Heaven piece pushes out a kept Earth one, *"so the result is the
 * truly best stuff I might want"*). It used to melt the new drop then, however good. A
 * piece a kept filter shows is never pushed out by one no kept filter shows (chest.ts).
 *
 * The filters lived on the device until then, as a way of looking. A kept filter changes
 * what the game does with a drop, so it is a fact about the cultivator and the list moved
 * into the save: the full chest is in the sim, and the sim has to be able to read it.
 * Which filter is lit right now is still a way of looking, and stays on the device.
 */

/** 篩 The first row's choices: everything, ▲, 鎖 locked, or one place on the body. */
export type Place = 'all' | 'better' | 'locked' | Slot;
export const PLACES: readonly Place[] = ['all', 'better', 'locked', ...SLOTS];

/**
 * 存 How many filters a cultivator keeps. rekaris asked for more than three, and got eight;
 * then asked for as many as he liked (2026-10-06). A row of pills wraps, and a save carries
 * a few short strings per filter, so twenty-four costs nothing and is still a top.
 */
export const FILTER_LIMIT = 24;

/** 存 A saved chest filter: the three rows, a name, and whether a full chest must weigh what it shows first. */
export interface ChestFilter {
  readonly name: string;
  readonly slot: Place;
  readonly school: 'any' | School;
  readonly lines: readonly Affix[];
  /** 熔 A full chest melts a piece this filter shows only to make room for a better one it shows. */
  readonly keep?: true;
}

/** 名 A filter's name, cleaned once for the save and the screen: no control characters, 24 at most. */
export function cleanFilterName(raw: string): string {
  return raw.replace(/[\u0000-\u001f]/g, '').trim().slice(0, 24);
}

/**
 * 熔 Whether a filter can be kept. ▲ Better is read off a fight with what is worn now, so
 * it changes with every piece put on and no full chest could keep its word by it; and a
 * filter that names nothing at all would keep the whole chest, which is not a filter.
 */
export function keepable(f: Pick<ChestFilter, 'slot' | 'school' | 'lines'>): boolean {
  return f.slot !== 'better' && (f.slot !== 'all' || f.school !== 'any' || f.lines.length > 0);
}

/**
 * 篩 Whether a piece shows under a filter, read off the piece alone. ▲ Better reads a fight
 * and is the screen's to answer, so here it shows nothing (and is never kept, above).
 */
export function matchesFilter(f: Pick<ChestFilter, 'slot' | 'school' | 'lines'>, item: Item): boolean {
  const tpl = TEMPLATE_BY_KEY[item.template];
  if (!tpl) return false;
  if (f.slot === 'better') return false;
  if (f.slot === 'locked' ? !item.locked : f.slot !== 'all' && tpl.slot !== f.slot) return false;
  if (f.school !== 'any' && schoolOf(item) !== f.school) return false;
  return f.lines.every((a) => item.rolls.some((r) => r.affix === a));
}

/** 熔 Whether any kept filter shows this piece, so a full chest melts every other piece before it. */
export function keptByFilter(filters: readonly ChestFilter[], item: Item): boolean {
  return filters.some((f) => f.keep && matchesFilter(f, item));
}

/** 存 A save is input: at most FILTER_LIMIT filters, each with a real place, school and lines. */
export function validFilters(raw: unknown): readonly ChestFilter[] {
  if (!Array.isArray(raw)) return [];
  const out: ChestFilter[] = [];
  for (const r of raw.slice(0, FILTER_LIMIT)) {
    const o = (r ?? {}) as Record<string, unknown>;
    const name = typeof o.name === 'string' ? cleanFilterName(o.name) : '';
    const slot = PLACES.includes(o.slot as Place) ? (o.slot as Place) : null;
    const school = o.school === 'any' || SCHOOLS.includes(o.school as School) ? (o.school as 'any' | School) : null;
    const lines = Array.isArray(o.lines)
      ? [...new Set(o.lines.filter((a): a is Affix => AFFIXES.includes(a as Affix)))] : null;
    if (!name || !slot || !school || !lines) continue;
    const f: ChestFilter = { name, slot, school, lines };
    out.push(o.keep === true && keepable(f) ? { ...f, keep: true } : f);
  }
  return out;
}

/** 存 Keep the filter now lit under a name. Refused past FILTER_LIMIT, or for a filter that is already kept. */
export function saveFilter(s: State, f: Omit<ChestFilter, 'keep'>): State {
  if (s.filters.length >= FILTER_LIMIT) return s;
  const name = cleanFilterName(f.name);
  if (!name) return s;
  return { ...s, filters: [...s.filters, { name, slot: f.slot, school: f.school, lines: [...f.lines] }] };
}

/** 存 Forget filter `index`. Nothing in the chest moves; a full chest simply stops sparing what it showed. */
export function forgetFilter(s: State, index: number): State {
  if (index < 0 || index >= s.filters.length) return s;
  return { ...s, filters: s.filters.filter((_, i) => i !== index) };
}

/** 熔 Mark filter `index` as one a full chest must weigh first, or stop. A filter that cannot be kept is refused. */
export function keepFilter(s: State, index: number, on: boolean): State {
  const f = s.filters[index];
  if (!f || (on && !keepable(f)) || !!f.keep === on) return s;
  const filters = [...s.filters];
  const { keep: _was, ...rest } = f;
  filters[index] = on ? { ...rest, keep: true } : rest;
  return { ...s, filters };
}

/**
 * 存 The filters a device kept before they moved into the save, taken in once: each one the
 * save does not already hold, up to FILTER_LIMIT, so a second device adds what it had and
 * never doubles a filter. Validated like a save, and never kept: that is asked for anew.
 */
export function adoptFilters(s: State, fromDevice: unknown): State {
  const same = (a: ChestFilter, b: ChestFilter) => a.slot === b.slot && a.school === b.school
    && a.lines.length === b.lines.length && a.lines.every((x) => b.lines.includes(x));
  const filters = [...s.filters];
  for (const { keep: _no, ...f } of validFilters(fromDevice)) {
    if (filters.length >= FILTER_LIMIT) break;
    if (!filters.some((x) => same(x, f))) filters.push(f);
  }
  return filters.length > s.filters.length ? { ...s, filters } : s;
}
