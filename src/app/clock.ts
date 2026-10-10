import { advance } from '../sim/time.ts';
import { work } from '../sim/crafts.ts';
import type { State } from '../sim/state.ts';
import { spans, type Sitting } from './sitting.ts';
import { clockUntil } from './guide.ts';

/** The wall clock, in seconds: the one place the app reads the time for the game. */
export const now = () => Date.now() / 1000;

/**
 * 入定 Run the clock from the save's own instant to `t`, at the depth the sitting gives each
 * stretch of it (sitting.ts spans), and settle the workshop to the same instant.
 */
export function payTo(s: State, t: number, sit: Sitting | null, deeper: number): State {
  let next = s;
  for (const span of spans(sit, s.at, t, deeper)) {
    // 囊 A fresh cultivator's first rung waits for the first purchase; the time it
    // waits is owed, not lost, and arrives on the tick after. See clockUntil.
    next = advance(next, clockUntil(next, span.until, span.focus), false, span.focus);
  }
  return work(next, t);
}
