import { newState, validate, type State } from './state.ts';
import { advance } from './time.ts';

const KEY = 'ninefold.save.v1';

/**
 * The save, and the player's return.
 *
 * An idle game is played closed, so loading is not only reading: it is paying the hours
 * that passed while the app did not exist. `advance` does that from the stored stamp,
 * and the report handed back is what the screen uses to say *how much you earned while
 * you were away* — the first thing a player wants to know on opening.
 */
export interface Return {
  readonly state: State;
  readonly secondsAway: number;
  readonly qiEarned: number;
  readonly layersOpened: number;
  readonly realmsClimbed: number;
}

export function load(now: number): Return {
  let raw: unknown = null;
  try {
    const stored = localStorage.getItem(KEY);
    raw = stored ? JSON.parse(stored) : null;
  } catch {
    raw = null;   // storage blocked, private window, corrupt JSON — all the same here
  }

  const before = raw ? validate(raw, now) : newState(now);
  const secondsAway = Math.max(0, now - before.at);
  const after = advance(before, now);

  const layersOf = (s: State) => (s.realm - 1) * 9 + s.layer;

  return {
    state: after,
    secondsAway,
    qiEarned: Math.max(0, after.qi - before.qi),
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

export function wipe(): void {
  try {
    localStorage.removeItem(KEY);
  } catch { /* same */ }
}
