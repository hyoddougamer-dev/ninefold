import { newState, type State } from './state.ts';
import { validate } from './load.ts';
import { OPENING_PURSE } from './balance.ts';
import { advance, layerCost } from './time.ts';
import { held, needsOf, settle, workSeconds, workshopOpen, type Stood } from './crafts.ts';
import { RECIPE_BY_KEY, levelOf } from '../data/crafts.ts';
import { LAYERS_PER_REALM } from './balance.ts';
import { isSealed, open, seal } from './seal.ts';
import { progressOf } from './echo.ts';
import { withPackedPile } from './pilepack.ts';
import { retires } from './season.ts';

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
 * 舊 The closed-test cultivator, sealed and kept.
 *
 * When Season 0 begins, a save on this device that is not a season save is moved here,
 * as the very text it was stored as, and a fresh cultivator begins. Nothing ever deletes
 * this key: not the season and not 滅 Erase, and a second retirement only ever replaces it
 * with a copy further along (see retire). The player can take it out as a copy at any
 * time (Menu, Save, Closed test). It is never played or ranked again.
 *
 * A device that never held one (a new phone, a cleared browser) can be handed it by the
 * account instead (keepFromAccount): the copy the server kept is written here the same way,
 * sealed, and only ever into an empty key.
 */
export const CLOSED_TEST = 'ninefold.save.closedtest';
/**
 * 雲 Set to 'account' when the copy under CLOSED_TEST came back from the account rather than
 * from this device's own save, so the screen can say where it is kept. A retirement that
 * writes a copy from this device takes it away again.
 */
const CLOSED_TEST_FROM = 'ninefold.save.closedtest.from';
/** 季 Set once the season's card has been read on this device. Erase leaves it, as it leaves the copy. */
const SEASON_CARD = 'ninefold.season.card';

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
  /** 業 What the workshop did while the app was shut, or null if it was standing still. */
  readonly crafts: Away | null;
  /**
   * 舊 The closed-test cultivator this load retired, or null when it retired nothing.
   * When `kept` is false the copy could not be written and nothing was removed: the
   * game holds still (see `frozen`) until the player has taken it out by hand.
   */
  readonly retired: ClosedTest | null;
}

/** 舊 The closed-test cultivator in one line, and the copy of it a player can take out. */
export interface ClosedTest {
  readonly realm: number;
  /** The layer being worked on, as the climb bar says it: one more than the layers opened. */
  readonly layer: number;
  readonly marks: number;
  readonly rebirths: number;
  /** The copy, in the same text as the save export. */
  readonly text: string;
  /** Whether it is safely kept on this device. */
  readonly kept: boolean;
  /** 雲 Where it came from: this device's own save, or the copy the account kept. */
  readonly where: 'device' | 'account';
}

/**
 * 業 The workshop's absence, for the card that welcomes a cultivator back.
 *
 * It used to be there only when something was made, so the night the workshop waited for
 * ore, or had no task at all, said nothing; and a thirty-hour absence read "made 12,126"
 * with no word that it had rested for the last eighteen of them. Now it says why it
 * stood still and for how long, whenever it did. Nothing in it is ever a loss: what was
 * made stays made, and a rest is what the twelve-hour window always was.
 */
export interface Away {
  /** The recipe that was set, or null when the workshop had no task. */
  readonly task: string | null;
  readonly made: number;
  readonly xp: number;
  readonly from: number;
  readonly to: number;
  /** 停 Why it stood still before the player came back, or null if it never did. */
  readonly stood: Stood | null;
  /** 時 How long it stood still, in seconds, up to the moment the app opened. */
  readonly still: number;
  /** 待 The first thing it was waiting for, when it waited for something: a pouch key or 'mat'. */
  readonly missing: string | null;
  /** 眠 The hours it works after a visit, for the line that says it rested. */
  readonly hours: number;
}

/** 業 Any absence shorter than this is a glance away, and a rest that short says nothing. */
const STILL_WORTH_SAYING = 60;

/**
 * 封 Set once this phone has written a sealed save. From then on a plain save in storage
 * can only have been put there by hand, and so can a seal that no longer matches.
 */
const SEALED = 'ninefold.sealed';
/** 改 Remembered once seen, until a wipe: the rankings screen says so (see wasEdited). */
const EDITED = 'ninefold.edited';

function noteEdited(): void {
  try { localStorage.setItem(EDITED, '1'); } catch { /* nothing to do */ }
}

/** 改 Whether a save on this phone was ever changed outside the game. It still plays. */
export function wasEdited(): boolean {
  try { return localStorage.getItem(EDITED) === '1'; } catch { return false; }
}

/**
 * `note` is false for 舊 the closed-test copy: it is kept as the text it was stored as, which
 * may be a plain save from before the seal, and that says nothing about the season save
 * this phone seals now.
 */
function read(key: string, note = true): unknown {
  try {
    const stored = localStorage.getItem(key);
    if (!stored) return null;
    if (isSealed(stored)) {
      const { json, intact } = open(stored);
      if (json === null) return null;
      // Nothing is taken away for touching a save: it loads and plays as it is. The
      // phone remembers it was touched, and the server was never going to believe it.
      if (!intact && note) noteEdited();
      return JSON.parse(json);
    }
    // A plain save is how every save was written before the seal, and it is read as it
    // always was. Once this phone has sealed one, a plain one was put there by hand.
    if (note && localStorage.getItem(SEALED) === '1') noteEdited();
    return JSON.parse(stored);
  } catch {
    return null;   // storage blocked, private window, corrupt JSON: all the same here
  }
}

/**
 * 承 The save as it leaves this game: each worn piece also carries its place's refining
 * levels, as a piece did before they moved to State.refined (2026-10-06). A tab still
 * running the old game, or the ranked server before its own deploy, reads levels off the
 * worn pieces and nowhere else; without this it would read every place as unrefined, and
 * a tab that wrote back would lose them. The new game never reads them off the piece
 * except to migrate, where the place keeps the higher of the two, so they change nothing.
 */
export function outbound(s: State): State {
  const worn = Object.fromEntries(Object.entries(s.worn).map(([slot, it]) => {
    const level = s.refined[slot as keyof typeof s.refined] ?? 0;
    return [slot, it && level > 0 ? { ...it, refine: level } : it];
  }));
  // 圍 The drive's pile goes out as rows (pilepack.ts): up to three thousand pieces, written small.
  return withPackedPile({ ...s, worn } as State);
}

/** The text a key holds, exactly as stored, or null. */
function textOf(key: string): string | null {
  try { return localStorage.getItem(key); } catch { return null; }
}

/**
 * 凍 Set when a closed-test save could not be moved to its own key: the season save may
 * not be written, or it would land over the only copy. Nothing on this page writes the
 * save again; the next load tries the move once more.
 */
let frozen = false;

/** 舊 The line and the copy for a closed-test cultivator, read through validate like any save. */
function describe(raw: unknown, now: number, kept: boolean, where: ClosedTest['where'] = 'device'): ClosedTest {
  const s = validate(raw, now);
  return {
    realm: s.realm, layer: Math.min(s.layer + 1, LAYERS_PER_REALM),
    marks: s.tribulation, rebirths: s.lives.length,
    text: exportSave(s), kept, where,
  };
}

/**
 * 印 Move every copy on this device that is not a season save to CLOSED_TEST, and say
 * which keys may now be emptied. Returns null when the move could not be made.
 *
 * Of the copies found and the one already kept, the deepest is kept (`progressOf`); on a
 * tie the one already kept stays, so a second retirement never writes over the first
 * with anything that is not further along. The one way that happens is an old tab, still
 * on the closed-test build, that played on past the switch and wrote its save back. The
 * copy is written as the text it was stored as, byte for byte, read back, and only once it
 * reads back the same may the retired keys be emptied.
 */
function retire(keys: readonly string[], now: number): { kept: string; raw: unknown } | null {
  const archived = textOf(CLOSED_TEST);
  const archivedRaw = archived ? read(CLOSED_TEST, false) : null;
  let best: { text: string; raw: unknown; depth: number } | null = archivedRaw
    ? { text: archived!, raw: archivedRaw, depth: depth(validate(archivedRaw, now)) } : null;
  // 雲 A copy the account handed back gives way to this device's own on a tie: the account
  // still holds its copy, and this device's may be the only one there is.
  const fromAccount = archivedRaw !== null && whereKept() === 'account';
  for (const key of keys) {
    const text = textOf(key);
    const raw = read(key);
    if (!text || !raw) continue;
    const d = depth(validate(raw, now));
    if (!best || d > best.depth || (fromAccount && best.text === archived && d === best.depth)) best = { text, raw, depth: d };
  }
  if (!best) return null;
  if (best.text !== archived) {
    try {
      localStorage.setItem(CLOSED_TEST, best.text);
      if (localStorage.getItem(CLOSED_TEST) !== best.text) return null;
      // 雲 The copy is now this device's own, whatever it replaced.
      localStorage.removeItem(CLOSED_TEST_FROM);
    } catch {
      return null;   // storage full or blocked: nothing is removed
    }
  }
  return { kept: best.text, raw: best.raw };
}

function write(key: string, s: State): void {
  localStorage.setItem(key, seal(JSON.stringify(outbound(s))));
  localStorage.setItem(SEALED, '1');
}

/**
 * How far up a state is, so two of them can be compared without trusting either.
 * 轉世 Lives first: a reborn cultivator's spare copy is the life it left, deeper on the
 * ladder, and read by the ladder alone the spare would undo the rebirth on the next load.
 */
function depth(s: State): number {
  return progressOf(s);
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
  let spare = read(BACKUP);

  /**
   * 季 After the switch, a copy that is not a season save is retired before anything
   * else is read: kept whole under CLOSED_TEST, then emptied from the main key and the
   * spare. The deeper-wins rule below would otherwise bring the closed-test spare back
   * over the new season save on every load.
   */
  let retired: ClosedTest | null = null;
  const old = [[KEY, raw], [BACKUP, spare]].filter(([, r]) => r && retires(r, now)).map(([k]) => k as string);
  if (old.length > 0) {
    const kept = retire(old, now);
    if (!kept) {
      // Nothing is removed after a failed write, and no season save may start over it.
      frozen = true;
      const from = raw && retires(raw, now) ? raw : spare;
      return { ...fresh(now), retired: describe(from, now, false) };
    }
    try { for (const k of old) localStorage.removeItem(k); } catch { /* the next load retires it again */ }
    retired = describe(kept.raw, now, true, whereKept());
    if (old.includes(KEY)) raw = null;
    if (old.includes(BACKUP)) spare = null;
  }

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
  const advanced = advance(before, now);
  const settled = settle(advanced, now);
  const after = settled.state;
  const task = before.crafts.task;
  const r = task ? RECIPE_BY_KEY[task] : undefined;
  const made = r ? (after.crafts.made[r.key] ?? 0) - (before.crafts.made[r.key] ?? 0) : 0;
  const still = settled.stood && settled.stoodFrom !== null
    ? Math.max(0, now - Math.max(settled.stoodFrom, before.at)) : 0;
  // 待 What it was waiting for, read off the state it stopped in.
  const missing = r && settled.stood === 'needs'
    ? needsOf(after, r).find(([k, n]) => held(after, k) < n)?.[0] ?? null : null;
  const said = made > 0 || (settled.stood !== null && still >= STILL_WORTH_SAYING);

  const layersOf = (s: State) => (s.realm - 1) * 9 + s.layer;

  const climbed = rungsBetween(before, after);
  return {
    retired,
    state: after,
    secondsAway,
    qiEarned: Math.max(0, after.qi - before.qi + climbed),
    qiClimbed: climbed,
    layersOpened: Math.max(0, layersOf(after) - layersOf(before)),
    realmsClimbed: Math.max(0, after.realm - before.realm),
    // 業 Said whenever the workshop is open and either made something or stood still,
    // including the nights it made nothing at all.
    crafts: workshopOpen(before) && said ? {
      task: r ? r.key : null, made,
      xp: r ? (after.crafts.xp[r.skill] ?? 0) - (before.crafts.xp[r.skill] ?? 0) : 0,
      from: r ? levelOf(before.crafts.xp[r.skill] ?? 0) : 0,
      to: r ? levelOf(after.crafts.xp[r.skill] ?? 0) : 0,
      stood: settled.stood, still, missing,
      hours: Math.round(workSeconds(advanced) / 3600),
    } : null,
  };
}

/** A cultivator who has not begun, with nothing to report: what a retirement that could not be kept hands back. */
function fresh(now: number): Omit<Return, 'retired'> {
  return { state: newState(now), secondsAway: 0, qiEarned: 0, qiClimbed: 0, layersOpened: 0, realmsClimbed: 0, crafts: null };
}

/**
 * 舊 The closed-test cultivator kept on this device, or null if there is none. Read for the
 * season's card and for Menu, Save; validate still reads every closed-test save.
 */
export function closedTest(now: number): ClosedTest | null {
  const raw = read(CLOSED_TEST, false);
  return raw ? describe(raw, now, true, whereKept()) : null;
}

/** 舊 Whether this device holds a closed-test copy at all, read without opening it. */
export function holdsClosedTest(): boolean {
  return textOf(CLOSED_TEST) !== null;
}

/** 雲 Where the copy under CLOSED_TEST came from, as CLOSED_TEST_FROM says. */
function whereKept(): ClosedTest['where'] {
  return textOf(CLOSED_TEST_FROM) === 'account' ? 'account' : 'device';
}

/**
 * 雲 Keep the closed-test copy the account handed back (closed_test_mine() on the server), as
 * a retired save is kept: under CLOSED_TEST, sealed, in the same shape the game writes. Only
 * into an empty key: a copy this device already holds is never written over, from here or
 * from anywhere. And only a closed-test save after the switch: before it there is nothing to
 * keep, and a season save is not a closed-test copy whatever the server says. Returns the
 * copy as kept, or null when nothing was written.
 */
export function keepFromAccount(save: unknown, now: number): ClosedTest | null {
  if (!save || typeof save !== 'object' || Array.isArray(save) || Object.keys(save).length === 0
    || !retires(save, now)) return null;
  if (textOf(CLOSED_TEST) !== null) return null;
  // 印 This device still holds a closed-test cultivator of its own that has not been retired
  // yet (a page left open across the switch, or a move that could not be written): the next
  // load retires that one, and the account's copy may never stand in its way.
  if ([KEY, BACKUP].some((k) => { const r = read(k, false); return r !== null && retires(r, now); })) return null;
  const text = seal(JSON.stringify(save));
  try {
    localStorage.setItem(CLOSED_TEST, text);
    if (localStorage.getItem(CLOSED_TEST) !== text) return null;
  } catch {
    return null;   // storage full or blocked: the account still holds it, and the next ask tries again
  }
  try { localStorage.setItem(CLOSED_TEST_FROM, 'account'); } catch { /* it reads as this device's, which it now also is */ }
  return describe(save, now, true, 'account');
}

/** 季 Whether the season's card still has to be shown on this device. */
export function seasonCardDue(): boolean {
  try { return localStorage.getItem(SEASON_CARD) === null; } catch { return true; }
}

/** 季 The card was read: it is not shown again on this device, even after 滅 Erase. */
export function seasonCardRead(): void {
  try { localStorage.setItem(SEASON_CARD, '1'); } catch { /* it shows once more, which is harmless */ }
}

/**
 * 滅 Set by wipe(), and never unset: the page is about to reload.
 *
 * 誤 Bruno: *"quando faço erase a save para começar do 0 não funciona."* The app writes
 * its save on pagehide and on every hide of the tab, which is what keeps a closed phone
 * from losing the last minute. So wipe() cleared the storage, the reload fired pagehide,
 * and the page wrote the whole state straight back. After a wipe nothing may be written
 * by this page again; the next page load starts from nothing, which is the point.
 */
let wiped = false;

export function save(s: State): void {
  if (wiped || frozen) return;
  try {
    write(KEY, s);
  } catch {
    // Without storage the game is still playable this session. Not worth failing over.
  }
}

/** Kept apart from `save`: the spare is written once, on a load that came back whole. */
export function keepSpare(s: State): void {
  if (wiped || frozen) return;
  try {
    write(BACKUP, s);
  } catch { /* same */ }
}

/**
 * 凍 Whether this page is holding still behind a closed-test copy it could not keep. The
 * cultivator on screen is then a placeholder that is never saved, so it is not synced either.
 */
export function holding(): boolean { return frozen; }

/** Only the tests call this: a page that wiped reloads, and a test file does not. */
export function rearm(): void { wiped = false; frozen = false; }

/** 滅 Erase. It never touches 舊 the closed-test copy (CLOSED_TEST) or the season's card. */
export function wipe(): void {
  wiped = true;
  try {
    localStorage.removeItem(KEY);
    localStorage.removeItem(BACKUP);
    localStorage.removeItem(SEALED);
    localStorage.removeItem(EDITED);
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
  return seal(JSON.stringify({ game: 'ninefold', exported: Math.round(Date.now() / 1000), state: outbound(s) }));
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
  // 轉世 A reborn cultivator stands where a new one does, and has done more than anybody.
  return s.realm === 1 && s.layer === 0 && (s.lives?.length ?? 0) === 0
    && s.qi <= OPENING_PURSE
    && s.tower === 0 && s.tribulation === 0
    && Object.values(s.levels).every((n) => n === 0)
    && Object.keys(s.killed).length === 0
    && Object.keys(s.worn).length === 0
    && s.chest.length === 0
    && s.unlocked.length === 0;
}

/** 季 Why a closed-test copy is refused after the switch, in words the player can act on. */
export const CLOSED_TEST_REFUSED = 'That save is from the closed test. It is kept as it was, but it cannot be played in Season 0.';

export function importSave(text: string, now: number): Imported {
  let parsed: unknown;
  try {
    // 封 A sealed copy, or a plain one: every copy taken before the seal is plain, and so
    // is the cloud's own copy. A broken seal is still a save; the server judges it.
    const opened = isSealed(text) ? open(text).json : text.trim();
    if (opened === null) throw new Error('unsealable');
    parsed = JSON.parse(opened);
  } catch {
    return { state: null, error: 'That is not a save. Paste the whole text, exactly as it was copied.' };
  }
  const o = (parsed ?? {}) as Record<string, unknown>;
  // A bare state is accepted too: someone will paste the inner half and be right to.
  const body = o.game === 'ninefold' ? o.state : o.v === 1 ? o : null;
  if (!body) return { state: null, error: 'That is a file, but not a Ninefold save.' };
  // 季 A closed-test save is kept as it was, but it cannot be played as a season save.
  if (retires(body, now)) return { state: null, error: CLOSED_TEST_REFUSED };

  const state = validate(body, now);
  if (untouched(state)) {
    return { state: null, error: 'That save is empty. Nothing was changed.' };
  }
  return { state, error: null };
}

/** A name a person can find again, with the day and where they had got to. */
export function saveFileName(s: State): string {
  const day = new Date().toISOString().slice(0, 10);
  return `ninefold-realm${s.realm}-${day}.txt`;
}

/** 舊 The closed-test copy's file: ninefold-closedtest-realm9-2026-10-26.txt. */
export function closedTestFileName(c: Pick<ClosedTest, 'realm'>): string {
  const day = new Date().toISOString().slice(0, 10);
  return `ninefold-closedtest-realm${c.realm}-${day}.txt`;
}
