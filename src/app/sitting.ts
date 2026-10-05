import { FOCUS_HOLD, focusAt } from '../sim/balance.ts';

/**
 * 入定 One sitting: when it began, and how much of it the game spent hidden.
 *
 * rekaris, on the Discord: *"When changing tabs or application, the game goes offline."*
 * A hidden tab ended the sitting on the spot, so a player who looked at another window for
 * a minute came back to ×1 and a ramp starting from nothing. Now a sitting that is already
 * running goes on behind a hidden tab until its own end, FOCUS_HOLD after it began, and the
 * time it ran hidden is paid when the game comes back. It is paid at the depth it had when
 * the tab was hidden: it does not start and it does not deepen while nobody is looking, so
 * the most a hidden tab can be worth is the rest of a sitting that had already begun.
 *
 * 驗 The ranked server already allows every second of every save at FOCUS_MAX (verify.ts),
 * so nothing here can be paid past what it accepts.
 *
 * Immutable on purpose: a state updater that runs later reads the sitting it was handed,
 * never one a visibility change has moved on since.
 */
export interface Sitting {
  /** The instant it began. It ends FOCUS_HOLD after this, hidden or not. */
  readonly since: number;
  /** Seconds it spent hidden, closed. They count toward its end and never toward its ramp. */
  readonly hidden: number;
  /** The instant the game was hidden, while it is. */
  readonly hiddenAt: number | null;
}

export function begin(t: number): Sitting {
  return { since: t, hidden: 0, hiddenAt: null };
}

/** The instant the sitting ends, wherever the game is. */
export function endOf(s: Sitting): number {
  return s.since + FOCUS_HOLD;
}

export function isOver(s: Sitting, t: number): boolean {
  return t - s.since >= FOCUS_HOLD;
}

/** Seconds of ramp the sitting has had by `t`: the time it was on screen. */
function rampOf(s: Sitting, t: number): number {
  const hiddenNow = s.hiddenAt !== null ? Math.max(0, t - s.hiddenAt) : 0;
  return Math.max(0, t - s.since - s.hidden - hiddenNow);
}

/** How deep the sitting is at `t`: ×1 before it begins, after it ends, and with none. */
export function focusOf(s: Sitting | null, t: number, deeper = 0): number {
  if (!s || t < s.since || isOver(s, t)) return 1;
  return focusAt(rampOf(s, t), deeper);
}

/** The game goes off screen. The sitting goes on, held at the depth it has. */
export function hide(s: Sitting, t: number): Sitting {
  return s.hiddenAt !== null ? s : { ...s, hiddenAt: t };
}

/** The game comes back on screen. The ramp picks up where it was held. */
export function show(s: Sitting, t: number): Sitting {
  if (s.hiddenAt === null) return s;
  return { ...s, hidden: s.hidden + Math.max(0, t - s.hiddenAt), hiddenAt: null };
}

/**
 * The stretches the clock pays from `from` to `to`, each at one depth: the sitting's depth
 * at `from` until it ends, and ×1 after. The clock ticks five times a second on screen and
 * the stretch is a fifth of a second; a hidden tab may not tick for half an hour, and the
 * stretch it comes back to has to be paid at the sitting's depth up to its end and not a
 * second past it.
 */
export function spans(s: Sitting | null, from: number, to: number, deeper = 0): readonly { until: number; focus: number }[] {
  const deep = focusOf(s, from, deeper);
  if (!s || deep <= 1 || to <= from) return [{ until: to, focus: deep }];
  const end = endOf(s);
  return end < to ? [{ until: end, focus: deep }, { until: to, focus: 1 }] : [{ until: to, focus: deep }];
}
