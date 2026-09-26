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
import { weekOf } from '../../../src/sim/week.ts';

/** 限 One sync every this many seconds per player. The phone syncs every few minutes. */
export const MIN_GAP = 20;
/** 罰 Impossibilities before a player is kept off the boards for good. */
export const STRIKES_TO_BAN = 3;

export interface Saved {
  latest: unknown;
  verified: unknown | null;
  verifiedAt: number | null; // seconds
  lastSync: number;          // seconds
}
export interface Standing {
  climb: number; marks: number; tower: number;
  climbedAt: number; towerAt: number;
  week: number; weekFrom: number;
}
export interface Profile { name: string; strikes: number; suspect: boolean; banned: boolean }

export interface Store {
  profile(id: string): Promise<Profile | null>;
  saved(id: string): Promise<Saved | null>;
  standing(id: string): Promise<Standing | null>;
  writeProfile(id: string, p: Profile): Promise<void>;
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
      /** 'verified', 'waiting' (too fast for now), 'refused' (impossible), 'behind' (older copy) */
      state: 'verified' | 'waiting' | 'refused' | 'behind';
      why: readonly string[];
      suspect: boolean;
      standing: Standing | null;
      /** Hours the ranking is behind the phone, when it is. */
      behindHours: number;
    } };

/** A fallback name until the player picks one: 修士 and four letters of their id. */
export function defaultName(id: string): string {
  return `修士 ${id.replace(/-/g, '').slice(0, 4).toUpperCase()}`;
}

export async function sync(store: Store, id: string, raw: unknown, now: number, name?: string): Promise<Reply> {
  const saved = await store.saved(id);
  if (saved && now - saved.lastSync < MIN_GAP) {
    return { status: 429, body: { error: 'too-soon', wait: Math.ceil(MIN_GAP - (now - saved.lastSync)) } };
  }

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
    profile = { name: name && name.trim().length >= 2 ? name.trim().slice(0, 20) : defaultName(id), strikes: 0, suspect: false, banned: false };
    await store.writeProfile(id, profile);
  }
  if (profile.banned) return { status: 403, body: { error: 'banned' } };

  // 閉 A new week closes the old one's board the first time anybody syncs in it.
  const week = weekOf(now);
  if ((await store.lastClosed()) < week - 1) await store.closeWeek(week - 1);

  // 驗 Against the last save that verified, or a fresh start.
  let before: State;
  let seconds: number;
  if (saved?.verified && saved.verifiedAt !== null) {
    before = validate(saved.verified, now);
    seconds = now - saved.verifiedAt;
  } else {
    ({ before, seconds } = firstSync(after, now));
  }
  const v = verify(before, after, seconds);
  await store.log(id, v, now);

  // 存 The cloud copy only ever moves forward. A new device's empty save, or an older
  // copy restored on purpose, must never overwrite a cultivator further along: that is
  // the copy another device would sign in to find.
  const ahead = (x: State) => layersOpened(x) + x.tribulation;
  let kept: State | null = null;
  try { kept = saved ? validate(saved.latest, now) : null; } catch { kept = null; }
  const next: Saved = {
    latest: kept && ahead(kept) > ahead(after) ? saved!.latest : after,
    verified: v.ok ? after : saved?.verified ?? null,
    verifiedAt: v.ok ? now : saved?.verifiedAt ?? null,
    lastSync: now,
  };
  await store.writeSaved(id, next);

  if (v.strike || v.suspect) {
    profile = {
      ...profile,
      strikes: profile.strikes + (v.strike ? 1 : 0),
      suspect: profile.suspect || v.suspect,
    };
    profile = { ...profile, banned: profile.strikes >= STRIKES_TO_BAN };
    await store.writeProfile(id, profile);
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
      // The week is counted from where the last verified save stood when it began.
      weekFrom: fresh ? (old ? old.climb + old.marks : climb + marks) : old!.weekFrom,
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
    body: { ranked: v.ok, state, why: v.why, suspect: profile.suspect, standing, behindHours },
  };
}
