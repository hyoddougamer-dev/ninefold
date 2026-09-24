import { huntable, type Beast } from '../data/bestiary.ts';
import { HERBS, type Herb } from '../data/herbs.ts';
import { roomsFor } from '../data/secret.ts';
import type { State } from './state.ts';

/**
 * 期 The week, and the three things it moves.
 *
 * Everything else in this game arrives once. A beast walks out, a system opens, a card
 * is taken, and from then on that thing is part of the furniture. 忙 The harness counted
 * them: forty-odd arrivals, the last of them around the seventh week, and after it the
 * game is the same game every day for the rest of the climb.
 *
 * This is the one part that never runs out, because a week always has a next one. It
 * hands over no new content: it points at content that is already there and says *that
 * one, this week*. A quarry worth killing twice over, a herb worth planting, a room of
 * the vault worth walking to.
 *
 * 純 It is a pure function of the week number and the save, and the week number is read
 * off `s.at`, which `validate` has already capped at the real clock. So there is no
 * server, nothing to sync, nothing to cheat by moving a phone's clock forward, and two
 * cultivators who open the app on the same Tuesday are looking at the same week.
 *
 * See QUARRY_LOOT in balance.ts for why none of the three may touch the qi rate.
 */

const DAY = 86_400;

/** How long a week is, in seconds. */
export const WEEK = 7 * DAY;

/**
 * 週 Which week an instant falls in, counting from the first Monday of the epoch.
 *
 * The epoch itself is a Thursday, so three days are added to put the turn of the week on
 * a Monday at midnight UTC. Every save on earth turns over at the same second, which is
 * what makes a week something two players can talk about.
 */
export function weekOf(at: number): number {
  return Math.max(0, Math.floor((at + 3 * DAY) / WEEK));
}

/** Seconds until the week turns. Never zero: a week that just turned has a whole one left. */
export function weekLeft(s: State): number {
  return (weekOf(s.at) + 1) * WEEK - 3 * DAY - s.at;
}

function hash(n: number): number {
  let x = (n ^ 0x2545f491) >>> 0;
  x = Math.imul(x ^ (x >>> 16), 0x85ebca6b) >>> 0;
  x = Math.imul(x ^ (x >>> 13), 0xc2b2ae35) >>> 0;
  return (x ^ (x >>> 16)) >>> 0;
}

/**
 * 獸 The week's quarry, drawn from the beasts this cultivator can actually reach.
 *
 * It would have been tidier to draw one of the twenty-seven commons and be done, and
 * that was the first version. It is wrong: six weeks in eight it names a beast three
 * realms above the player, the mark does nothing, and a rotation that does nothing most
 * weeks is worse than no rotation, because the player learns to stop looking.
 *
 * So it is drawn from 狩 what has walked out. A first-realm cultivator has three to draw
 * from and a ninth-realm one has twenty-seven, which is the rotation getting richer as
 * the game does. The draw moves when the realm does, and that is on purpose: a new realm
 * is allowed to hand over a new quarry.
 */
export function quarryOf(s: State): Beast | null {
  const pool = huntable(s.realm, s.layer);
  if (!pool.length) return null;
  return pool[hash(weekOf(s.at) * 2_654_435_761) % pool.length] ?? null;
}

/** Is this the beast the week is pointing at? */
export function isQuarry(s: State, b: Beast): boolean {
  if (b.warden) return false;
  const q = quarryOf(s);
  return q ? q.key === b.key : false;
}

/**
 * 首 Is the once-a-week qi still owed?
 *
 * One field on the save holds the week the bounty was last taken in, which is the whole
 * of what a rotation has to remember. A week index is not an instant and cannot be
 * rolled forward by a clock: taking it in week 3000 and then moving the phone back to
 * week 2999 leaves it taken, which is the right way round for a cheat to fail.
 */
export function quarryOwed(s: State): boolean {
  return quarryOf(s) !== null && s.quarryWeek < weekOf(s.at);
}

/**
 * 草 The herb in season, drawn from what this realm can plant.
 *
 * Realm-gated for the same reason the quarry is: naming 龍血草 at the second realm, where
 * it cannot be planted, is a week the cave does not get.
 */
export function seasonOf(s: State): Herb | null {
  const pool = HERBS.filter((h) => h.realm <= s.realm);
  if (!pool.length) return null;
  return pool[hash(weekOf(s.at) * 40_503 + 7) % pool.length] ?? null;
}

export function isSeason(s: State, h: Herb): boolean {
  const k = seasonOf(s);
  return k ? k.key === h.key : false;
}

/**
 * 室 The room of 秘境 the vault that pays double this week.
 *
 * Only a reward room can be blessed: 關 a gate pays nothing at all by design, and
 * doubling nothing would be a mark on the screen that means nothing behind it. The
 * reward rooms are the even steps, so the draw is over those.
 *
 * 深 It moves with the vault: the seventh realm's deeper vault has more rooms and so
 * more places for the week to point at.
 */
export function blessedStep(s: State): number {
  const rooms = roomsFor(s.realm);
  const spots = Math.max(1, Math.ceil(rooms / 2));
  return 2 * (hash(weekOf(s.at) * 92_837_111 + 13) % spots);
}

export function isBlessed(s: State, step: number): boolean {
  return step === blessedStep(s);
}
