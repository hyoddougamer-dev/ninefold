import type { Beast } from '../data/bestiary.ts';
import { DEMONS, DEMONS_PER_REALM, DEMON_EDGE, DEMON_RETURN, SECLUSION } from './balance.ts';
import { isOpen, opensAt } from './unlocks.ts';
import { power, type State } from './state.ts';

/**
 * 閉關 Seclusion, and 心魔 the heart demon waiting behind it.
 *
 * 關 A cultivator shuts the door. Eight hours later the demon comes, and the demon is
 * them: the same 力 and a fifth more, standing across the arena in their own shape, darkened. What it does
 * not have is anything they *know*: no stance, no arts, no class. So it is
 * the one fight in the game where power alone is not enough to be quick, because power
 * is the one thing the demon has as much of. See DEMON_EDGE for what each build meets.
 *
 * 無失 Nothing is paused while the door is shut and nothing is lost by losing: the demon
 * draws back into the cultivator and comes again in an hour (DEMON_RETURN). The hour is
 * what makes the odds mean something; with a retry on the spot every demon would fall
 * to whoever tapped enough times. Winning hands over a 道 point, and there are nine
 * demons in a life, so the reward is finite and never touches the qi rate.
 *
 * Two numbers are the whole memory: the instant the door was shut (0 for open) and how
 * many demons have fallen. Everything else is derived from them and from `at`.
 */

/** The key the arena and the harnesses know the demon by. It is never a kill. */
export const DEMON_KEY = 'heartdemon';

/** 心魔 How many demons this realm has let out so far: two a realm from the fourth, nine at most. */
export function demonsFor(realm: number): number {
  return Math.min(DEMONS, Math.max(0, (realm - opensAt('seclusion') + 1) * DEMONS_PER_REALM));
}

/** Whether this cultivator can shut the door now. */
export function canSeclude(s: State): boolean {
  return isOpen(s.realm, 'seclusion') && s.secludedAt === 0 && s.demons < demonsFor(s.realm);
}

/** 關 Shut the door. Anything not allowed changes nothing. */
export function seclude(s: State): State {
  return canSeclude(s) ? { ...s, secludedAt: s.at } : s;
}

/** Whether the door is shut, demon waiting or not. */
export function secluded(s: State): boolean {
  return s.secludedAt > 0;
}

/** Seconds until the demon comes: 0 once it is waiting. */
export function demonLeft(s: State): number {
  return s.secludedAt > 0 ? Math.max(0, s.secludedAt + SECLUSION - s.at) : 0;
}

/** 心魔 Whether the demon is waiting to be fought. */
export function demonDue(s: State): boolean {
  return s.secludedAt > 0 && s.at >= s.secludedAt + SECLUSION && s.demons < demonsFor(s.realm);
}

/** 力 What the demon stands at: this cultivator's own power, and a little more. */
export function demonPower(s: State): number {
  return power(s) * DEMON_EDGE;
}

/**
 * 心魔 The demon, as a beast the arena can draw. Its realm is the cultivator's own, and it
 * leaves nothing: it is not an animal, and nothing of it is ever worn.
 */
export function demonOf(s: State): Beast {
  return { key: DEMON_KEY, han: '心魔', name: 'Heart Demon', realm: s.realm, layer: 0,
           icon: 'meditation', leaves: [] };
}

/**
 * 關 The door after a demon falls: shut again at once while the realm still has a demon
 * left in it, open when it has none.
 *
 * It used to open every time, and shutting it again was a tap on 修 that nothing asked
 * for. Forgetting it cost a whole eight-hour window for nothing, and the harnesses shut it
 * on every visit anyway, so the curves were already measuring the door that shuts itself.
 * It shuts at the instant the demon fell, which is the earliest a hand could have shut it,
 * so the ranked server's one demon a night still holds.
 */
function afterDemon(s: State, demons: number): State {
  return { ...s, demons, secludedAt: demons < demonsFor(s.realm) ? s.at : 0 };
}

/** 破 The demon fell: the count goes up, and the door shuts again if a demon is left. */
export function conquer(s: State): State {
  return demonDue(s) ? afterDemon(s, s.demons + 1) : s;
}

/**
 * 鎖魂 The demon fell with a Soul-Lock Sigil carried: it counts twice, never past the
 * realm's own number of them. The sigil is spent by the caller, like any carried thing.
 */
export function conquerTwice(s: State): State {
  return demonDue(s) ? afterDemon(s, Math.min(demonsFor(s.realm), s.demons + 2)) : s;
}

/** 退 The demon won: it draws back, and comes again in DEMON_RETURN. Nothing else changes. */
export function repel(s: State): State {
  return demonDue(s) ? { ...s, secludedAt: s.at - SECLUSION + DEMON_RETURN } : s;
}
