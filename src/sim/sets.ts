import { SLOTS, templateOf, type Item, type Slot } from '../data/gear.ts';
import { equip } from './chest.ts';
import { SET_LIMIT, type GearSet, type State } from './state.ts';

/**
 * 鎖 套 Keeping pieces, and putting a whole body of them on at once.
 *
 * rekaris, on the Discord: *"If the goal with the classes is to be able to swap between
 * them by changing clothes, the current inventory leaves a lot to be desired."* A class is
 * read off what is worn, so changing class was six taps on six pieces, with a melt button
 * on every one of their sheets and a full chest melting whatever it judged worst.
 *
 * Nothing here changes a number. A lock only says which pieces the melt, the fusion and a
 * full chest must leave alone, and a set only remembers which piece went where.
 */

/** 鎖 Lock or unlock a piece, wherever it is: in the chest or on the body. */
export function setLocked(s: State, id: string, on: boolean): State {
  const flip = (x: Item): Item => {
    if (x.id !== id) return x;
    if (on) return { ...x, locked: true };
    const { locked: _was, ...rest } = x;
    return rest;
  };
  const worn = { ...s.worn };
  for (const slot of SLOTS) if (worn[slot]) worn[slot] = flip(worn[slot]!);
  return { ...s, worn, chest: s.chest.map(flip) };
}

/**
 * 套 Save what is worn now as set `index`, under `name`. Its pieces are locked on the way,
 * because a set whose pieces can be melted out from under it is not a set.
 */
export function saveSet(s: State, index: number, name: string): State {
  if (index < 0 || index >= SET_LIMIT) return s;
  const ids: Partial<Record<Slot, string>> = {};
  for (const slot of SLOTS) { const it = s.worn[slot]; if (it) ids[slot] = it.id; }
  if (Object.keys(ids).length === 0) return s;
  const clean = name.replace(/[\u0000-\u001f]/g, '').trim().slice(0, 24) || `Set ${index + 1}`;
  const sets: GearSet[] = [...s.sets];
  if (index > sets.length) return s;            // sets are kept in order, with no holes
  sets[index] = { name: clean, ids };
  let out: State = { ...s, sets };
  for (const id of Object.values(ids)) out = setLocked(out, id!, true);
  return out;
}

/** 套 Forget set `index`. Its pieces stay where they are, still locked. */
export function clearSet(s: State, index: number): State {
  if (index < 0 || index >= s.sets.length) return s;
  return { ...s, sets: s.sets.filter((_, i) => i !== index) };
}

export interface PutOn {
  readonly state: State;
  /** How many of the set's pieces are no longer anywhere: melted, fused or never kept. */
  readonly missing: number;
}

/**
 * 套 Put set `index` on. Each piece it names is taken from the chest and worn through
 * equip(), the same as a tap on its sheet, so 承 refining moves with the place on the body
 * exactly as it does by hand. A place the set leaves empty is left as it is, and so is a
 * place whose piece is gone: nothing is taken off into a chest that may have no room.
 */
export function wearSet(s: State, index: number): PutOn {
  const set = s.sets[index];
  if (!set) return { state: s, missing: 0 };
  let worn = s.worn;
  let chest: readonly Item[] = s.chest;
  let missing = 0;
  for (const slot of SLOTS) {
    const id = set.ids[slot];
    if (!id || worn[slot]?.id === id) continue;
    const item = chest.find((x) => x.id === id);
    if (!item || templateOf(item).slot !== slot) { missing += 1; continue; }
    const next = equip(worn, chest, item, slot);
    worn = next.worn;
    chest = next.chest;
  }
  return { state: { ...s, worn, chest: [...chest] }, missing };
}

/** 套 Whether set `index` is what is worn right now, piece for piece. */
export function isWorn(s: State, index: number): boolean {
  const set = s.sets[index];
  if (!set) return false;
  return SLOTS.every((slot) => !set.ids[slot] || s.worn[slot]?.id === set.ids[slot]);
}
