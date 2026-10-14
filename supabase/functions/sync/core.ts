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
 *
 * 季 From SEASON_START (sim/season.ts) it also keeps the season's door: a save that is not a
 * season save, or that says it began before the season did, is turned away with 409 and
 * nothing is written, and everything the database still holds from before the switch (the
 * verified copy, the anchors, the cloud copy, the standing) reads as absent. Before the
 * switch none of that applies, and the sync is the one the closed test always had.
 */
import { validate } from '../../../src/sim/load.ts';
import { layersOpened, type State } from '../../../src/sim/state.ts';
import { verify, firstSync, type Verdict } from '../../../src/sim/verify.ts';
import { progressOf } from '../../../src/sim/echo.ts';
import { withPackedPile } from '../../../src/sim/pilepack.ts';
import { WEEK, weekOf } from '../../../src/sim/week.ts';
import { callingKey } from '../../../src/sim/schools.ts';
import { cleanName } from '../../../src/net/names.ts';
import { SEASON, SEASON_START } from '../../../src/sim/season.ts';

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
/**
 * 罰 A refused save offered again inside this many seconds of the last sync, and no further
 * along than the copy the server holds, is the same offence and is not struck again. The
 * game offers a refused save every half minute until it moves on: a tester whose very first
 * save was refused (2026-10-07) was struck three times in 51 seconds and sent to review.
 */
export const REPEAT_WINDOW = 6 * 3600;

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
  /**
   * 輪迴 The lives the verified save has lived through. Never fewer than the copy held: a
   * cultivator who has reborn stays off Heaven, whichever device the next save comes from.
   */
  lives?: number;
  /**
   * 輪迴 The record of the life being lived, for the Samsara board: the layers it opened and
   * its marks, and when they last rose. A rebirth sets it back to where the new life stands.
   */
  samsaraClimb?: number; samsaraMarks?: number; samsaraAt?: number;
  /**
   * 季 When the row was last written (the database's updated_at). A standing last written
   * before the season began is the closed test's, and the season reads it as absent.
   */
  updatedAt?: number;
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
  /**
   * 季 A save from the wrong side of the switch: after it, a closed-test save or one that
   * says it began before the season; before it, a season save (a device clock running
   * ahead). Nothing is written and nothing is struck. The game says the closed test has
   * ended and asks the player to check the device's date (RANKS.status.season).
   */
  | { status: 409; body: { error: 'season' } }
  | { status: 200; body: {
      ranked: boolean;
      /**
       * 'verified', 'waiting' (too fast for now), 'refused' (impossible), 'behind' (older
       * copy). Which check it was stays in sync_log: naming it here told anybody probing
       * the server exactly which number to edit next.
       */
      state: 'verified' | 'waiting' | 'refused' | 'behind';
      suspect: boolean;
      standing: Omit<Standing, 'updatedAt'> | null;
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

/** What the reply shows of a standing: everything but when the row was written. */
function shown(s: Standing | null): Omit<Standing, 'updatedAt'> | null {
  if (!s) return null;
  const { updatedAt: _, ...rest } = s;
  return rest;
}

/** 窗 How old an anchor may grow before it is moved up to the present. */
export const DAY_WINDOW = 2 * 86_400;
export const WEEK_WINDOW = 14 * 86_400;

/**
 * 試 Testing, Bruno 2026-10-11: "deixar tudo sincronizar... não vale a pena bans". While this
 * is on, a save the rules refuse (too fast, impossible) is accepted as the verified save all
 * the same, and moves the boards. The verdict is still logged as it was, so the panel's 疑
 * Batota tab shows what each sync tried; no strike is counted and nobody is kept off the
 * boards. A save that went down is still only behind, as it always was. sync() itself runs
 * the rules by default (accept: false), so the tests never see this switch; the server
 * passes it in, and tools/ranked.ts reads it to know what the live server should answer.
 *
 * 季 It was a constant, true, with "set it to false before the first season that counts".
 * It is now a time, decision D7 of docs/SEASON0-PLAN.md: on until SEASON_START and off from
 * its first second, so the closed test's last days stay as lenient as Bruno set them and the
 * season is strict without another push. It has to go off with the season: `startedAt` is
 * the player's own input, and while a refused verdict still ranks, a closed-test save
 * relabelled with the season and a start date of SEASON_START would rank at once.
 */
export const acceptsEverything = (now: number): boolean => now < SEASON_START;

/**
 * 季 What a pull hands a new device: the cloud copy, unless the season has begun and the copy
 * is not a season save. The closed-test cultivator a device kept is the device's to keep
 * (the retired copy, sim/save.ts); the cloud does not hand it back as if it were playable.
 */
export function pullable(latest: unknown, now: number, seasonStart = SEASON_START): unknown {
  if (latest === null || latest === undefined) return null;
  if (now < seasonStart) return latest;
  const o = latest as { season?: unknown; startedAt?: unknown };
  return o.season === SEASON && typeof o.startedAt === 'number' && o.startedAt >= seasonStart ? latest : null;
}

/**
 * 季 What the database holds for a player, as the season sees it. Before the switch, all of
 * it. After it, only what was written since: a row last synced before the switch is the
 * closed test's and absent as a whole, and in a row synced since, a verified copy or an
 * anchor from before it (kept because the first season syncs did not verify yet) is absent.
 * Without this, the closed-test verified copy would be the `prev` every season save is
 * measured against, and a deeper closed-test cloud copy would be kept over every season one.
 */
function ofSeason(saved: Saved | null, live: boolean, start: number): Saved | null {
  if (!saved || !live) return saved;
  if (saved.lastSync < start) return null;
  const old = saved.verifiedAt === null || saved.verifiedAt < start;
  const anchor = (a: Anchor | null | undefined) => (a && a.at >= start ? a : null);
  return {
    ...saved,
    verified: old ? null : saved.verified,
    verifiedAt: old ? null : saved.verifiedAt,
    day: anchor(saved.day),
    week: anchor(saved.week),
  };
}

export async function sync(
  store: Store, id: string, raw: unknown, now: number, name?: string, joinedAt = now,
  rules: { accept: boolean; seasonStart?: number } = { accept: false },
): Promise<Reply> {
  const wait = await store.claim(id, now, MIN_GAP);
  if (wait > 0) return { status: 429, body: { error: 'too-soon', wait: Math.ceil(wait) } };
  // 季 The switch. `seasonStart` is SEASON_START; a test may name another instant to measure
  // the closed test's rules on fixtures dated past the real one.
  const start = rules.seasonStart ?? SEASON_START;
  const live = now >= start;
  const saved = ofSeason(await store.saved(id), live, start);
  const standingNow = async (): Promise<Standing | null> => {
    const s = await store.standing(id);
    return live && s && (s.updatedAt ?? 0) < start ? null : s;
  };

  let after: State;
  try {
    // A save is input. validate() caps every field, and it is the server's clock it is
    // capped against: a save stamped in the future is brought back to now.
    after = validate(raw, now);
  } catch {
    return { status: 400, body: { error: 'bad-save' } };
  }
  after = { ...after, at: Math.min(after.at, now) };

  // 季 The season's door, before anything is read or written for the player. After the
  // switch only a season save begun inside the season comes in: the start date is checked
  // here and not only measured, so an old run whose start date was edited back to before the
  // season is not weighed at all, and one edited forward to the season's first second is
  // measured from it and waits (firstSync). Before the switch a season save is turned away,
  // since it can only come from a device whose clock runs ahead.
  const seasonal = after.season === SEASON;
  if (live ? !seasonal || after.startedAt < start : seasonal) {
    return { status: 409, body: { error: 'season' } };
  }

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
  // 轉世 Lives first: a reborn cultivator in the first realm is ahead of the life it left,
  // or the cloud copy would keep the old life and the next device would sign in to it.
  const ahead = (x: State) => progressOf(x);
  let before: State;
  let seconds: number;
  let first = false;
  let newRun = false;
  const prev = saved?.verified && saved.verifiedAt !== null ? validate(saved.verified, now) : null;
  if (prev && saved?.verifiedAt != null && (prev.startedAt === after.startedAt || ahead(after) <= ahead(prev))) {
    before = prev;
    seconds = now - saved.verifiedAt;
  } else {
    ({ before, seconds, first } = firstSync(after, now, joinedAt, start));
    newRun = prev !== null;
  }
  // 塔 The floors this account already holds on the board were checked when they were won.
  const held = (await standingNow())?.tower ?? 0;
  let v = verify(before, after, seconds, first, held);

  // 窗 And against the day and the week behind it, where there is one from this run.
  let suspect = v.suspect;
  if (v.ok && !newRun) {
    for (const w of [saved?.day, saved?.week]) {
      if (!w) continue;
      const from = validate(w.state, now);
      if (from.startedAt !== after.startedAt) continue;
      const wv = verify(from, after, now - w.at, false, held);
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
  // 試 While testing, a refused save that did not go down is counted as verified (see acceptsEverything).
  const accepted = rules.accept && !v.ok && !v.why.includes('went-down');
  const counted: Verdict = accepted ? { ...v, ok: true, strike: false, suspect: false } : v;

  // 存 The cloud copy only ever moves forward. A new device's empty save, or an older
  // copy restored on purpose, must never overwrite a cultivator further along: that is
  // the copy another device would sign in to find.
  let kept: State | null = null;
  try { kept = saved ? validate(saved.latest, now) : null; } catch { kept = null; }
  // 季 A cloud copy from before the season is not this season's cultivator, however deep.
  if (live && kept && (kept.season !== SEASON || kept.startedAt < start)) kept = null;
  // 圍 A drive's pile is a drive's, not the run's: the cloud copy keeps it (as rows, so the
  // largest pile of three thousand is a modest row), and the three reference saves that only
  // ever measure the next one against the last keep none. One pile in the database, not four.
  const bare = { ...after, pile: [], pileAt: 0 } as State;
  const roll = (a: Anchor | null | undefined, span: number): Anchor | null =>
    (counted.ok && (newRun || !a || now - a.at > span) ? { state: bare, at: now } : a ?? null);
  const next: Saved = {
    latest: kept && ahead(kept) > ahead(after) ? saved!.latest : withPackedPile(after),
    verified: counted.ok ? bare : saved?.verified ?? null,
    verifiedAt: counted.ok ? now : saved?.verifiedAt ?? null,
    lastSync: now,
    day: roll(saved?.day, DAY_WINDOW),
    week: roll(saved?.week, WEEK_WINDOW),
  };
  await store.writeSaved(id, next);

  // 罰 Strikes are counted; at STRIKES_TO_REVIEW the player is kept off the boards for
  // review rather than banned. The same refused save offered again (the last sync did not
  // verify either, this one is no further along than the copy kept, and it came within
  // REPEAT_WINDOW) is logged as refused but not struck or flagged again. The trade-off: a
  // cheater who repeats one edited save collects one strike instead of many, but it is
  // refused every time and never ranked, and any save that has moved on is struck as before.
  const repeat = counted.strike && saved !== null && saved.verifiedAt !== saved.lastSync && kept !== null
    && ahead(kept) >= ahead(after) && now - saved.lastSync <= REPEAT_WINDOW;
  if ((counted.strike || counted.suspect) && !repeat) {
    const review = counted.strike && profile.strikes + 1 >= STRIKES_TO_REVIEW;
    profile = await store.mark(id, counted.strike, counted.suspect || review, NEVER);
  }

  let standing = await standingNow();
  if (counted.ok) {
    const climb = layersOpened(after);
    const marks = after.tribulation;
    const old = standing;
    const rose = !old || climb > old.climb || marks > old.marks;
    const fresh = !old || old.week !== week;
    // 輪迴 The lives this save has lived through. Sticky: a cultivator who has reborn stays
    // reborn, so a new run that began with fewer lives cannot rejoin the Heaven List.
    const livesNow = after.lives?.length ?? 0;
    const lives = Math.max(livesNow, old?.lives ?? 0);
    // 輪迴 The Samsara record is the life being lived. Within one life it only rises, as the
    // Heaven record does; a rebirth verified since the copy was written, or another run, starts
    // it again from where this save stands. The Heaven values are left as they always were.
    const sameLife = !!old && !newRun && livesNow === (old.lives ?? 0);
    const samsaraRose = !sameLife || climb > (old?.samsaraClimb ?? 0) || marks > (old?.samsaraMarks ?? 0);
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
      lives,
      samsaraClimb: sameLife ? Math.max(climb, old?.samsaraClimb ?? 0) : climb,
      samsaraMarks: sameLife ? Math.max(marks, old?.samsaraMarks ?? 0) : marks,
      samsaraAt: samsaraRose ? now : (old?.samsaraAt ?? now),
      updatedAt: now,
    };
    await store.writeStanding(id, standing);
  }

  const state = counted.ok ? 'verified'
    : counted.strike ? 'refused'
    : counted.why.includes('went-down') ? 'behind'
    : 'waiting';
  const behindHours = counted.ok ? 0 : Math.max(0, (after.at - (next.verifiedAt ?? after.at)) / 3600);
  return {
    status: 200,
    body: { ranked: counted.ok, state, suspect: profile.suspect, standing: shown(standing), behindHours },
  };
}
