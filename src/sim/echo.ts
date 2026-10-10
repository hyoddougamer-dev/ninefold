/**
 * 宿慧 The Echo: what the lives before this one are worth, read off the record they left.
 *
 * Kept apart from rebirth.ts because state.ts reads it (the rate) and load.ts does (validate), and
 * rebirth.ts reads state.ts: this file knows nothing about a State, so the two cannot
 * import each other in a circle.
 *
 * The record is the only thing stored. Each entry is a life that ended: how many 雷印
 * marks it had crossed, and the instant it ended, in seconds. The Echo, the title and the
 * life being lived now are all derived from it, so a save cannot carry an Echo it did not
 * earn by claiming one: it can only claim lives, and validate() and the ranked server
 * (verify.ts) bound those.
 */
import { ECHO_CEILING, ECHO_FIRST, ECHO_LIFE_MAX, ECHO_ROOF, ECHO_STEP, ECHO_TAIL, LIVES_MAX, REBIRTH_MARKS } from './balance.ts';

/** 世 A life that ended: the marks it crossed and the instant it ended, in seconds. */
export interface Life {
  readonly marks: number;
  readonly at: number;
}

/** 印 The most marks validate() lets any save hold, and so the most a life can have ended on. */
export const MARKS_LIMIT = 300;

/**
 * 宿慧 What one life adds to the qi gathered, as a share: ECHO_FIRST for its first mark and
 * ECHO_STEP for every doubling of its marks after that, never more than ECHO_LIFE_MAX.
 * Concave on purpose: the further a life went, the more it leaves, and every step costs
 * twice the endgame the one before it did.
 */
export function lifeEcho(marks: number): number {
  if (!(marks >= REBIRTH_MARKS)) return 0;
  return Math.min(ECHO_LIFE_MAX, ECHO_FIRST + ECHO_STEP * Math.log2((1 + Math.floor(marks)) / 2));
}

/** 宿慧 What the lives add up to before any ceiling: the sum of lifeEcho over the record. */
export function echoSum(lives: readonly Life[] | undefined): number {
  return lives ? lives.reduce((n, l) => n + lifeEcho(l.marks), 0) : 0;
}

/**
 * 宿慧 The Echo a sum of lives gives. Exactly the sum up to ECHO_CEILING, so the first lives
 * are what they always were. Past it, the excess counted in full lives gives ECHO_TAIL for
 * every doubling (a logarithm, so it never quite stops), and ECHO_ROOF is the hard roof
 * over all of it, which nothing passes however long the record.
 */
export function echoFromSum(sum: number): number {
  if (!(sum > 0)) return 0;
  const base = Math.min(ECHO_CEILING, sum);
  const tail = sum > ECHO_CEILING ? ECHO_TAIL * Math.log2(1 + (sum - ECHO_CEILING) / ECHO_LIFE_MAX) : 0;
  return Math.min(ECHO_ROOF, base + tail);
}

/** 宿慧 Every life together, under ECHO_ROOF, which nothing passes. */
export function echoOf(lives: readonly Life[] | undefined): number {
  if (!lives || lives.length === 0) return 0;
  return echoFromSum(echoSum(lives));
}

/** 宿慧 The Echo as the multiplier on what is gathered: 1 for a first life. */
export function echoFactor(lives: readonly Life[] | undefined): number {
  return 1 + echoOf(lives);
}

/**
 * 世 The record, read as input like the rest of a save: at most LIVES_MAX entries, each
 * a whole number of marks between the first Dragon and the most any save may hold, and
 * each ending at an instant the cultivator has lived, never before the one before it.
 * An entry that is not a life (no marks, too few) is not a life and is dropped; one whose
 * instant is out of place is moved into place rather than dropped, because the record is
 * the one thing a reborn cultivator has left of the lives before, and nothing is taken.
 * How fast the marks could honestly have been crossed is the server's question
 * (verify.ts), which has a clock to answer it with.
 */
export function validLives(raw: unknown, startedAt: number, now: number): Life[] {
  if (!Array.isArray(raw)) return [];
  const out: Life[] = [];
  let last = startedAt;
  for (const r of raw.slice(0, LIVES_MAX)) {
    const o = (r ?? {}) as Record<string, unknown>;
    const m = typeof o.marks === 'number' && Number.isFinite(o.marks) ? Math.floor(o.marks) : 0;
    if (m < REBIRTH_MARKS) continue;
    const t = typeof o.at === 'number' && Number.isFinite(o.at) ? o.at : last;
    const at = Math.min(now, Math.max(last, t));
    out.push({ marks: Math.min(MARKS_LIMIT, m), at });
    last = at;
  }
  return out;
}

/**
 * 序 How far along a save is, lives first: a reborn cultivator in the first realm is
 * further along than the same cultivator at the summit of the life they left. Every place
 * that picks one save over another reads this (the spare copy, the cloud copy, the server's
 * last save), or a rebirth would be undone by the next load.
 */
export function progressOf(s: { lives?: readonly Life[]; realm: number; layer: number; tribulation: number }): number {
  return (s.lives?.length ?? 0) * 1000 + (s.realm - 1) * 9 + s.layer + s.tribulation;
}

/** 世 Whether `later` is `earlier` with lives added after it, and nothing in it changed. */
export function livesExtend(earlier: readonly Life[] | undefined, later: readonly Life[] | undefined): boolean {
  const a = earlier ?? [];
  const b = later ?? [];
  if (b.length < a.length) return false;
  return a.every((l, i) => b[i].marks === l.marks && Math.abs(b[i].at - l.at) < 1);
}
