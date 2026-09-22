import { newState, validate, type State } from './state.ts';
import { OPENING_PURSE } from './balance.ts';
import { advance, layerCost } from './time.ts';
import { LAYERS_PER_REALM } from './balance.ts';

const KEY = 'ninefold.save.v1';
/**
 * 備 The spare copy.
 *
 * Written only on a *clean* load: a save that came back whole and validated. If the
 * main key is ever emptied or corrupted, this is the last state the game is sure about.
 * It costs one extra write per session and it is the difference between losing an hour
 * and losing three months.
 */
const BACKUP = 'ninefold.save.backup';

/**
 * The save, and the player's return.
 *
 * An idle game is played closed, so loading is not only reading: it is paying the hours
 * that passed while the app did not exist. `advance` does that from the stored stamp,
 * and the report handed back is what the screen uses to say *how much you earned while
 * you were away*: the first thing a player wants to know on opening.
 */
export interface Return {
  readonly state: State;
  readonly secondsAway: number;
  /**
   * 氣 What the hours away actually gathered, rungs included.
   *
   * It used to be `after.qi - before.qi`, floored at zero, and that is the number the
   * 歸 card put on the screen. A cultivator who left with a nearly full bar and came
   * back to four rungs opened came back to **less qi than they left with**, and the card
   * told them they had gathered nothing. Everything was working: the ladder takes the qi
   * the instant it can afford a rung, which is the deepest rule in the game. The report
   * of it was the lie, and it is the shape of the complaint that has come back three
   * times now: *"o meu qi resetar"*.
   */
  readonly qiEarned: number;
  /** 階 How much of that went straight into the climb rather than into the bar. */
  readonly qiClimbed: number;
  readonly layersOpened: number;
  readonly realmsClimbed: number;
}

function read(key: string): unknown {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;   // storage blocked, private window, corrupt JSON: all the same here
  }
}

/** How far up a state is, so two of them can be compared without trusting either. */
function depth(s: State): number {
  return (s.realm - 1) * 9 + s.layer;
}

/**
 * 階 What the rungs opened between two states cost, at the prices the ladder quotes.
 *
 * This is the missing half of the return: qi that is no longer in the bar is not qi that
 * went missing, it is qi standing in the layers it bought.
 */
function rungsBetween(before: State, after: State): number {
  let total = 0;
  let realm = before.realm;
  let layer = before.layer;
  for (let guard = 0; guard < 200; guard++) {
    if (realm > after.realm || (realm === after.realm && layer >= after.layer)) break;
    const cost = layerCost(realm, layer, before.unlocked);
    if (Number.isFinite(cost)) total += cost;
    if (++layer >= LAYERS_PER_REALM) { layer = 0; realm += 1; }
  }
  return total;
}

export function load(now: number): Return {
  let raw = read(KEY);
  const spare = read(BACKUP);

  /**
   * If the main save is gone but the spare is not, the spare is the save. And if both
   * are there, the one that got further wins: the only way the main key can be *behind*
   * the spare is that something wrote over it, which is exactly the accident this
   * guards against.
   */
  if (spare) {
    const backup = validate(spare, now);
    if (!raw) raw = spare;
    else if (depth(validate(raw, now)) < depth(backup)) raw = spare;
  }

  const before = raw ? validate(raw, now) : newState(now);
  const secondsAway = Math.max(0, now - before.at);
  const after = advance(before, now);

  const layersOf = (s: State) => (s.realm - 1) * 9 + s.layer;

  const climbed = rungsBetween(before, after);
  return {
    state: after,
    secondsAway,
    qiEarned: Math.max(0, after.qi - before.qi + climbed),
    qiClimbed: climbed,
    layersOpened: Math.max(0, layersOf(after) - layersOf(before)),
    realmsClimbed: Math.max(0, after.realm - before.realm),
  };
}

export function save(s: State): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    // Without storage the game is still playable this session. Not worth failing over.
  }
}

/** Kept apart from `save`: the spare is written once, on a load that came back whole. */
export function keepSpare(s: State): void {
  try {
    localStorage.setItem(BACKUP, JSON.stringify(s));
  } catch { /* same */ }
}

export function wipe(): void {
  try {
    localStorage.removeItem(KEY);
    localStorage.removeItem(BACKUP);
  } catch { /* same */ }
}

/**
 * 出 The save as text the player holds.
 *
 * Everything else here is insurance against the game's own accidents. This is insurance
 * against the *phone*: clearing the browser's data, losing the device, changing
 * phones. There is no account and no cloud, so the only copy that survives any of that
 * is one the player put somewhere themselves.
 */
export function exportSave(s: State): string {
  return JSON.stringify({ game: 'ninefold', exported: Math.round(Date.now() / 1000), state: s });
}

export interface Imported {
  readonly state: State | null;
  /** Why it was refused, in words the player can act on. */
  readonly error: string | null;
}

/**
 * 空 A cultivator who has not begun.
 *
 * This guards the paste box: if a mispaste validated into a fresh cultivator it would
 * silently wipe a real save, so a save that has done nothing is refused rather than
 * loaded. It cannot be "qi is zero" any more: 囊 the opening purse means a cultivator
 * starts holding something, so it asks the honest question instead: has this save
 * *done* anything at all? Bought a level, killed a beast, climbed a rung, worn a piece.
 *
 * It is exported because the app asks the same question for a different reason: 引 the
 * help is for somebody who has not begun, and it used to ask "is qi under five", which
 * the purse quietly made false. The help stopped appearing for new players and nothing
 * said so. One definition, asked in both places.
 */
export function untouched(s: State): boolean {
  return s.realm === 1 && s.layer === 0
    && s.qi <= OPENING_PURSE
    && s.tower === 0 && s.tribulation === 0
    && Object.values(s.levels).every((n) => n === 0)
    && Object.keys(s.killed).length === 0
    && Object.keys(s.worn).length === 0
    && s.chest.length === 0
    && s.unlocked.length === 0;
}

export function importSave(text: string, now: number): Imported {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text.trim());
  } catch {
    return { state: null, error: 'That is not a save. Paste the whole thing, from { to }.' };
  }
  const o = (parsed ?? {}) as Record<string, unknown>;
  // A bare state is accepted too: someone will paste the inner half and be right to.
  const body = o.game === 'ninefold' ? o.state : o.v === 1 ? o : null;
  if (!body) return { state: null, error: 'That is a file, but not a Ninefold save.' };

  const state = validate(body, now);
  if (untouched(state)) {
    return { state: null, error: 'That save is empty. Nothing was changed.' };
  }
  return { state, error: null };
}

/** A name a person can find again, with the day and where they had got to. */
export function saveFileName(s: State): string {
  const day = new Date().toISOString().slice(0, 10);
  return `ninefold-realm${s.realm}-${day}.json`;
}
