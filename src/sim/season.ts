/**
 * 季 The season, and the instant it began.
 *
 * Season 0 is "The Founding 開山" (docs/SEASON0-THEME.md): everyone starts again from the
 * first realm, and the closed-test cultivator does not stay. The device reads it once for a
 * four-number farewell and removes it (save.ts, retire); the server keeps nothing readable of
 * it. It is a time, not a deploy: the game and the server both read SEASON_START and switch
 * on their own when it comes (docs/SEASON0-PLAN.md, section 1). Before it nothing at all
 * changes for anybody, apart from the last week's one notice (LAST_WEEK).
 *
 * It is defined here, not in verify.ts, because the game never imports the verifier: if
 * load.ts reached for it there, the whole verifier would end up in the bundle. verify.ts
 * re-exports it beside GAME_EPOCH.
 */

/**
 * 零 The season this build plays. **A string, never a number.** validate() reads numbers
 * through a fallback of 0, so a numeric marker would read every closed-test save, which
 * has no marker at all, as a season-0 save. A missing field must read as the closed test.
 */
export const SEASON = 's0';

/** The seasons a save may name. Anything else reads as no season (the closed test). */
const KNOWN: readonly string[] = [SEASON];

/**
 * 始 Monday 26 October 2026, 00:00 UTC, in **seconds** (the save stores seconds). The plan
 * once said 19 October; the brief moved it, and the SQL's season_start() mirrors this.
 */
export const SEASON_START = 1792972800;

/**
 * 終 Monday 19 October 2026, 00:00 UTC: the closed test's last week begins, and with it the
 * one notice that says when it ends (src/app/notices.ts). Seconds, like SEASON_START.
 */
export const LAST_WEEK = SEASON_START - 7 * 86_400;

/** The marker a cultivator begun at this instant carries: the season, or none before it. */
export function seasonAt(now: number): string | null {
  return now >= SEASON_START ? SEASON : null;
}

/**
 * The season a save belongs to, read off a raw save, an exported copy (`{ game, state }`)
 * or a validated State alike. A known string counts: a number or an unknown name is not
 * a marker.
 *
 * And a save with no marker that was begun at or after the switch (and not after `now`)
 * is a season save all the same: it can only be a season cultivator whose marker was
 * dropped, by a tab still on the closed-test build that read it or began it (滅 Start again
 * pressed there after the switch). Retired as the closed test, it would lose the season
 * play to a deeper closed-test copy. Nothing begun before the switch reads as the season
 * this way, so it never retires less than the marker alone did, and it is never the lock:
 * the server measures every first season sync from SEASON_START.
 */
export function seasonOf(raw: unknown, now = Infinity): string | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const body = o.game === 'ninefold' && o.state && typeof o.state === 'object'
    ? o.state as Record<string, unknown> : o;
  const s = body.season;
  if (typeof s === 'string' && KNOWN.includes(s)) return s;
  const t = body.startedAt;
  return typeof t === 'number' && t >= SEASON_START && t <= now ? SEASON : null;
}

/**
 * Whether a save is a true season save at this instant: it says so, it began inside the
 * season, and the season has begun. This is the server's test (it knows the real clock
 * and measures every first sync from SEASON_START).
 */
export function inSeason(s: { readonly season?: string | null; readonly startedAt: number }, now: number): boolean {
  return s.season === SEASON && s.startedAt >= SEASON_START && now >= SEASON_START;
}

/**
 * 印 Whether the device retires a save at this instant: the season has begun and the save
 * is not a season save (no marker, and not begun since the switch: seasonOf).
 *
 * It asks for the marker and not for `startedAt` as well, on purpose. Every honest closed-
 * test save lacks the marker, and so does a cultivator begun on the new build before the
 * switch, so the marker alone retires all of them. What the start date adds is a check
 * on a save edited by hand to claim the season, and on the device that is the seal's
 * job (it tells), never the lock: the server measures such a save from SEASON_START and
 * it waits. And the harnesses' fabricated cultivators carry months of history so that
 * the screens they open are full; held to the start date, every one of them would be
 * retired in the season's first months and measure a fresh cultivator instead.
 */
export function retires(raw: unknown, now: number): boolean {
  return now >= SEASON_START && seasonOf(raw, now) !== SEASON;
}
