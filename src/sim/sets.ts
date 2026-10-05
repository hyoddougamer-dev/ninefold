import { SLOTS, templateOf, type Item, type Slot, type Worn } from '../data/gear.ts';
import { equip } from './chest.ts';
import { SET_LIMIT, TASKS, cleanSetName, type GearSet, type State, type Task } from './state.ts';

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

/** 套 The loadouts that name a piece, by name. A piece any of them names stays locked. */
export function loadoutsOf(s: Pick<State, 'sets'>, id: string): readonly string[] {
  return s.sets.filter((set) => Object.values(set.ids).includes(id)).map((set) => set.name);
}

/**
 * 鎖 Lock or unlock a piece, wherever it is: in the chest or on the body.
 *
 * 套 A piece a loadout names cannot be unlocked: the unlock was the one door left open,
 * and through it a loadout's sword went out with the commons on the next bulk melt. It
 * has to come out of the loadout first (save the loadout again without it, or forget it).
 */
export function setLocked(s: State, id: string, on: boolean): State {
  if (!on && loadoutsOf(s, id).length > 0) return s;
  const flip = (x: Item): Item => {
    if (x.id !== id) return x;
    if (on) return { ...x, locked: true };
    const { locked: _was, ...rest } = x;
    return rest;
  };
  // 算 worn is a cache key for the fight odds and the class: copied only when a worn piece
  // is the one changing, so locking a chest piece does not redo every fight on the screen.
  const onBody = SLOTS.some((slot) => s.worn[slot]?.id === id);
  const worn = onBody ? { ...s.worn } : s.worn;
  if (onBody) for (const slot of SLOTS) if (worn[slot]) worn[slot] = flip(worn[slot]!);
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
  const clean = cleanSetName(name) || `Set ${index + 1}`;
  const sets: GearSet[] = [...s.sets];
  if (index > sets.length) return s;            // sets are kept in order, with no holes
  sets[index] = { name: clean, ids };
  let out: State = { ...s, sets };
  for (const id of Object.values(ids)) out = setLocked(out, id!, true);
  return out;
}

/**
 * 名 Rename set `index`, and nothing else: its pieces stay as they are. rekaris, on the
 * Discord: *"being able to rename the loadout would be a nice addition."* The same rule as
 * a saved name: no control characters, 24 at most, and an empty name keeps the old one.
 */
export function renameSet(s: State, index: number, name: string): State {
  const set = s.sets[index];
  if (!set) return s;
  const clean = cleanSetName(name);
  if (!clean || clean === set.name) return s;
  const sets = [...s.sets];
  sets[index] = { ...set, name: clean };
  return { ...s, sets };
}

/**
 * 套 Forget set `index`. Its pieces stay where they are, still locked. A task it was given
 * goes back to what is worn, and the tasks of the sets after it follow them down a place.
 */
export function clearSet(s: State, index: number): State {
  if (index < 0 || index >= s.sets.length) return s;
  const tasks: Partial<Record<Task, number>> = {};
  for (const t of TASKS) {
    const i = s.tasks[t];
    if (i === undefined || i === index) continue;
    tasks[t] = i > index ? i - 1 : i;
  }
  return { ...s, sets: s.sets.filter((_, i) => i !== index), tasks };
}

/**
 * 套 Give task `task` to set `index`, or back to what is worn with null. speculaether, on
 * the Discord: *"equipment is overloaded"*, one outfit for fusing, one for melting, one
 * for qi, swapped by hand each time. rekaris answered that slots kept for one job would
 * take the choice away, so nothing is kept for a job: any loadout can be given one.
 */
export function assignTask(s: State, task: Task, index: number | null): State {
  if (!TASKS.includes(task)) return s;
  if (index !== null && !s.sets[index]) return s;
  if ((s.tasks[task] ?? null) === index) return s;
  const tasks = { ...s.tasks };
  if (index === null) delete tasks[task];
  else tasks[task] = index;
  return { ...s, tasks };
}

/** 套 The tasks set `index` has been given, in the order of TASKS. */
export function tasksOf(s: Pick<State, 'tasks'>, index: number): readonly Task[] {
  return TASKS.filter((t) => s.tasks[t] === index);
}

/** 套 The bodies a task reads, kept per loadout, chest and body: all three are replaced, never changed. */
const BODIES = new WeakMap<object, WeakMap<object, WeakMap<object, Map<number, Worn>>>>();

/**
 * 套 The body a task reads its numbers off: the loadout given to it, as wearSet would put
 * it on over what is worn now, or what is worn when it has none. Nothing is put on: what
 * is worn stays worn, and only the task's numbers come from the other body. A place the
 * loadout leaves empty, or whose piece is gone, reads what is worn there, as wearing the
 * loadout would. 驗 It is one of bodiesHeld's bodies by construction, so the server has
 * already allowed for every number it can give.
 */
export function taskBody(
  s: Pick<State, 'worn' | 'unlocked' | 'sets' | 'chest' | 'tasks'>, task: Task,
): Pick<State, 'worn' | 'unlocked'> {
  const index = s.tasks?.[task];
  if (index === undefined || !s.sets?.[index]) return s;
  let byChest = BODIES.get(s.sets);
  if (!byChest) { byChest = new WeakMap(); BODIES.set(s.sets, byChest); }
  let byWorn = byChest.get(s.chest);
  if (!byWorn) { byWorn = new WeakMap(); byChest.set(s.chest, byWorn); }
  let byIndex = byWorn.get(s.worn);
  if (!byIndex) { byIndex = new Map(); byWorn.set(s.worn, byIndex); }
  let worn = byIndex.get(index);
  if (!worn) {
    worn = wearSet(s as State, index).state.worn;
    byIndex.set(index, worn);
  }
  return { worn, unlocked: s.unlocked };
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
  return wearPieces(s, set.ids);
}

/**
 * 套 Put these pieces on, one place each, by id: the path a loadout takes and 較 the class
 * comparison's tap takes too (sim/compare.ts), so a body put on from either is the same
 * body, refining and all.
 */
export function wearPieces(s: State, ids: Readonly<Partial<Record<Slot, string>>>): PutOn {
  let worn = s.worn;
  let chest: readonly Item[] = s.chest;
  let missing = 0;
  for (const slot of SLOTS) {
    const id = ids[slot];
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
