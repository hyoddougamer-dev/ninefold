/**
 * 季 The season, and the instant it began.
 *
 * Season 0 is "The Seal Falls 落印": the closed test is sealed and kept, and everyone
 * starts again from the first realm. It is a time, not a deploy: the game and the server
 * both read SEASON_START and switch on their own when it comes (docs/SEASON0-PLAN.md,
 * section 1). Before it nothing at all changes for anybody.
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

/** The marker a cultivator begun at this instant carries: the season, or none before it. */
export function seasonAt(now: number): string | null {
  return now >= SEASON_START ? SEASON : null;
}

/**
 * The season a save says it belongs to, read off a raw save, an exported copy
 * (`{ game, state }`) or a validated State alike. Only a known string counts: a number,
 * an unknown name or nothing at all is the closed test, which is null.
 */
export function seasonOf(raw: unknown): string | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const body = o.game === 'ninefold' && o.state && typeof o.state === 'object'
    ? o.state as Record<string, unknown> : o;
  const s = body.season;
  return typeof s === 'string' && KNOWN.includes(s) ? s : null;
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
 * does not carry its marker.
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
  return now >= SEASON_START && seasonOf(raw) !== SEASON;
}
