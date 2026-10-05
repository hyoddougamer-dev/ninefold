/**
 * 同步 The ranked sync, as a pure function of what the database holds and what the phone
 * sent. index.ts is the Deno shell that reads and writes Supabase around it; this file
 * never touches a network, so the tests run it with an in-memory store.
 *
 * One call does four things:
 *   1. keeps the phone's save as the player's cloud copy, whatever it says;
 *   2. verifies it against the last save that verified, on the server's clock
 *      (sim/verify.ts), or against a fresh start for a first sync;
 *   3. if it verified, moves the standings; if it was impossible, counts a strike;
 *      if it was faster than anybody honest, marks the player for review;
 *   4. answers with where the player now stands, and why, in words the game can show.
 */
import { validate, layersOpened, type State } from '../../../src/sim/state.ts';
import { verify, firstSync, type Verdict } from '../../../src/sim/verify.ts';
import { WEEK, weekOf } from '../../../src/sim/week.ts';
import { callingKey } from '../../../src/sim/schools.ts';
import { cleanName } from '../../../src/net/names.ts';

/** 限 One sync every this many seconds per player. The phone syncs every few minutes. */
export const MIN_GAP = 20;
/**
 * 罰 Impossibilities before a player is kept off the boards for review. Never a ban: Bruno,
 * 2026-10-05, "sem banir ninguém diretamente". The account goes on syncing, its saves are
 * kept as its cloud copy, and the panel's 疑 Batota tab says what each refused sync tried;
 * a person decides. A ban the database already holds still stands (profile.banned).
 */
export const STRIKES_TO_REVIEW = 3;
/** 罰 What mark() is told the ban line is: never reached. */
const NEVER = 2_000_000_000;
/**
 * 新 A run of its own (another startedAt) that verifies more than this many layers past the
 * account's last verified save is kept for review. An honest wiped phone starts behind; one
 * this far ahead was most likely the old save with a new start date, measured as a first
 * sync (the audit of 2026-10-05 had a casual account pass as the hourly cultivator).
 */
export const NEW_RUN_LEAP = 9;

/** A verified save held back as the start of a longer window. */
export interface Anchor { state: unknown; at: number }

export interface Saved {
  latest: unknown;
  verified: unknown | null;
  verifiedAt: number | null; // seconds
  lastSync: number;          // seconds
  /**
   * 窗 The last save verified a day or two ago, and a week or two ago. Every sync is also
   * checked against these, so a cheater who syncs every five minutes cannot collect a
   * burst allowance on each one: over a whole day the allowance is spent once.
   */
  day?: Anchor | null;
  week?: Anchor | null;
}
export interface Standing {
  climb: number; marks: number; tower: number;
  climbedAt: number; towerAt: number;
  week: number; weekFrom: number;
  /** 職 The class the verified save wears, as sim/schools.ts callingKey says it. */
  calling?: string | null;
}
export interface Profile { name: string; strikes: number; suspect: boolean; banned: boolean }

export interface Store {
  /**
   * 限 Take this player's turn, atomically: 0 if it is theirs (and it is now taken), or
   * the seconds left to wait. Done in one statement in the database, because two syncs
   * sent at once used to both read the old time and both go through.
   */
  claim(id: string, now: number, gap: number): Promise<number>;
  profile(id: string): Promise<Profile | null>;
  /**
   * 罰 The strikes and ban a deleted account on this player's email left behind, or null.
   * See 20260928000000_barred.sql.
   */
  barred(id: string): Promise<{ strikes: number; banned: boolean; suspect?: boolean } | null>;
  saved(id: string): Promise<Saved | null>;
  standing(id: string): Promise<Standing | null>;
  /** Create the profile; throws if the name is taken. */
  writeProfile(id: string, p: Profile): Promise<void>;
  /** 罰 Add a strike and a flag in one statement, and return the profile as it now is. */
  mark(id: string, strike: boolean, suspect: boolean, ban: number): Promise<Profile>;
  writeSaved(id: string, s: Saved): Promise<void>;
  writeStanding(id: string, s: Standing): Promise<void>;
  log(id: string, v: Verdict | null, now: number): Promise<void>;
  closeWeek(week: number): Promise<void>;
  lastClosed(): Promise<number>;
}

export type Reply =
  | { status: 429; body: { error: 'too-soon'; wait: number } }
  | { status: 400; body: { error: 'bad-save' | 'no-name' } }
  | { status: 403; body: { error: 'banned' } }
  | { status: 200; body: {
      ranked: boolean;
      /**
       * 'verified', 'waiting' (too fast for now), 'refused' (impossible), 'behind' (older
       * copy). Which check it was stays in sync_log: naming it here told anybody probing
       * the server exactly which number to edit next.
       */
      state: 'verified' | 'waiting' | 'refused' | 'behind';
      suspect: boolean;
      standing: Standing | null;
      /** Hours the ranking is behind the phone, when it is. */
      behindHours: number;
    } };

/**
 * A fallback name until the player picks one: 修士 and eight letters of their id. Four
 * letters were sixteen bits, and two players sharing them (about one in three hundred
 * signs-ups) hit the unique index and could never sync again.
 */
export function defaultName(id: string): string {
  return `修士 ${id.replace(/-/g, '').slice(0, 8).toUpperCase()}`;
}

export { TITLES, cleanName } from '../../../src/net/names.ts';

/**
 * 週 Where this week's gain is counted from, the first time a save verifies in it.
 *
 * It was where the last verified save stood, so a player who stayed away from the server
 * for three weeks and synced on a Monday morning had three weeks of climbing count as this
 * week's, and topped 期榜 the week board with it. The gain since the last verified save is
 * shared out by time: only the part of it made since the week began counts as this week's.
 */
export function weekStart(old: Standing | null, total: number, lastAt: number | null, now: number): number {
  if (!old) return total;
  const had = old.climb + old.marks;
  if (lastAt === null || total <= had || now <= lastAt) return had;
  const began = weekOf(now) * WEEK - 3 * 86_400;
  const share = Math.max(0, Math.min(1, (now - Math.max(began, lastAt)) / (now - lastAt)));
  return Math.round(total - (total - had) * share);
}

/** 窗 How old an anchor may grow before it is moved up to the present. */
export const DAY_WINDOW = 2 * 86_400;
export const WEEK_WINDOW = 14 * 86_400;

export async function sync(
  store: Store, id: string, raw: unknown, now: number, name?: string, joinedAt = now,
): Promise<Reply> {
  const wait = await store.claim(id, now, MIN_GAP);
  if (wait > 0) return { status: 429, body: { error: 'too-soon', wait: Math.ceil(wait) } };
  const saved = await store.saved(id);

  let after: State;
  try {
    // A save is input. validate() caps every field, and it is the server's clock it is
    // capped against: a save stamped in the future is brought back to now.
    after = validate(raw, now);
  } catch {
    return { status: 400, body: { error: 'bad-save' } };
  }
  after = { ...after, at: Math.min(after.at, now) };

  let profile = await store.profile(id);
  if (!profile) {
    // 罰 A new account starts clean, unless its email carried strikes out of a deleted one.
    const was = await store.barred(id);
    const fresh = { strikes: was?.strikes ?? 0, suspect: was?.suspect ?? false, banned: was?.banned ?? false };
    const wanted = cleanName(name);
    try {
      profile = { name: wanted ?? defaultName(id), ...fresh };
      await store.writeProfile(id, profile);
    } catch {
      // Taken: the default name is the account's own and cannot be.
      profile = { name: defaultName(id), ...fresh };
      await store.writeProfile(id, profile);
    }
  }
  if (profile.banned) return { status: 403, body: { error: 'banned' } };

  // 閉 A new week closes the old one's board the first time anybody syncs in it.
  const week = weekOf(now);
  if ((await store.lastClosed()) < week - 1) await store.closeWeek(week - 1);

  // 驗 Against the last save that verified, or a fresh start. A save of another run (a
  // wiped phone, a second device, the local copy kept over the cloud's) that has got
  // further is a run of its own, measured from its start like a first sync; one that has
  // not is behind, and neither is ever a strike.
  const ahead = (x: State) => layersOpened(x) + x.tribulation;
  let before: State;
  let seconds: number;
  let first = false;
  let newRun = false;
  const prev = saved?.verified && saved.verifiedAt !== null ? validate(saved.verified, now) : null;
  if (prev && saved?.verifiedAt != null && (prev.startedAt === after.startedAt || ahead(after) <= ahead(prev))) {
    before = prev;
    seconds = now - saved.verifiedAt;
  } else {
    ({ before, seconds, first } = firstSync(after, now, joinedAt));
    newRun = prev !== null;
  }
  let v = verify(before, after, seconds, first);

  // 窗 And against the day and the week behind it, where there is one from this run.
  let suspect = v.suspect;
  if (v.ok && !newRun) {
    for (const w of [saved?.day, saved?.week]) {
      if (!w) continue;
      const from = validate(w.state, now);
      if (from.startedAt !== after.startedAt) continue;
      const wv = verify(from, after, now - w.at);
      suspect = suspect || wv.suspect;
      if (!wv.ok && wv.why.includes('too-fast')) v = { ...v, ok: false, why: [...v.why, 'too-fast'], used: Math.max(v.used, wv.used) };
    }
  }
  // 新 A new run far past the last verified save: ranked like any, but kept for review and
  // given no week-board credit for the leap (below), with 'newrun' in the log for the panel.
  if (v.ok && newRun && prev && ahead(after) > ahead(prev) + NEW_RUN_LEAP) {
    suspect = true;
    v = { ...v, why: [...v.why, 'newrun'] };
  }
  v = { ...v, suspect };
  await store.log(id, v, now);

  // 存 The cloud copy only ever moves forward. A new device's empty save, or an older
  // copy restored on purpose, must never overwrite a cultivator further along: that is
  // the copy another device would sign in to find.
  let kept: State | null = null;
  try { kept = saved ? validate(saved.latest, now) : null; } catch { kept = null; }
  const roll = (a: Anchor | null | undefined, span: number): Anchor | null =>
    (v.ok && (newRun || !a || now - a.at > span) ? { state: after, at: now } : a ?? null);
  const next: Saved = {
    latest: kept && ahead(kept) > ahead(after) ? saved!.latest : after,
    verified: v.ok ? after : saved?.verified ?? null,
    verifiedAt: v.ok ? now : saved?.verifiedAt ?? null,
    lastSync: now,
    day: roll(saved?.day, DAY_WINDOW),
    week: roll(saved?.week, WEEK_WINDOW),
  };
  await store.writeSaved(id, next);

  // 罰 Strikes are counted; at STRIKES_TO_REVIEW the player is kept off the boards for
  // review rather than banned.
  if (v.strike || v.suspect) {
    const review = v.strike && profile.strikes + 1 >= STRIKES_TO_REVIEW;
    profile = await store.mark(id, v.strike, v.suspect || review, NEVER);
  }

  let standing = await store.standing(id);
  if (v.ok) {
    const climb = layersOpened(after);
    const marks = after.tribulation;
    const old = standing;
    const rose = !old || climb > old.climb || marks > old.marks;
    const fresh = !old || old.week !== week;
    standing = {
      climb: Math.max(climb, old?.climb ?? 0),
      marks: Math.max(marks, old?.marks ?? 0),
      tower: Math.max(after.tower, old?.tower ?? 0),
      climbedAt: rose ? now : old!.climbedAt,
      towerAt: !old || after.tower > old.tower ? now : old.towerAt,
      week,
      // 新 A new run's leap is not this week's gain: the week counts from where it arrived.
      weekFrom: newRun ? climb + marks
        : fresh ? weekStart(old, climb + marks, saved?.verifiedAt ?? null, now) : old!.weekFrom,
      calling: callingKey(after),
    };
    await store.writeStanding(id, standing);
  }

  const state = v.ok ? 'verified'
    : v.strike ? 'refused'
    : v.why.includes('went-down') ? 'behind'
    : 'waiting';
  const behindHours = v.ok ? 0 : Math.max(0, (after.at - (next.verifiedAt ?? after.at)) / 3600);
  return {
    status: 200,
    body: { ranked: v.ok, state, suspect: profile.suspect, standing, behindHours },
  };
}
