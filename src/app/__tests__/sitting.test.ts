import { describe, expect, it } from 'vitest';
import { FOCUS_HOLD, FOCUS_MAX, FOCUS_RAMP, focusAt } from '../../sim/balance.ts';
import { begin, endOf, focusOf, hide, isOver, show, spans } from '../sitting.ts';

/**
 * 入定 隱 rekaris, on the Discord: *"When changing tabs or application, the game goes
 * offline."* A sitting already running goes on behind a hidden tab until its own end, held
 * at the depth it had, and the hidden stretch is paid when the game comes back.
 */
describe('入定 a sitting behind a hidden tab', () => {
  const T = 1_000_000;

  it('ramps on screen exactly as before', () => {
    const s = begin(T);
    for (const t of [0, 30, 90, FOCUS_RAMP, 600, FOCUS_HOLD - 1, FOCUS_HOLD, FOCUS_HOLD + 60]) {
      expect(focusOf(s, T + t)).toBe(focusAt(t));
    }
  });

  it('is held at its depth while hidden, neither deepening nor ending early', () => {
    const hidden = hide(begin(T), T + 60);
    const held = focusAt(60);
    expect(held).toBeGreaterThan(1);
    expect(held).toBeLessThan(FOCUS_MAX);
    expect(focusOf(hidden, T + 61)).toBe(held);
    expect(focusOf(hidden, T + 900)).toBe(held);
    expect(focusOf(hidden, T + FOCUS_HOLD - 1)).toBe(held);
    // It still ends where it always would have.
    expect(focusOf(hidden, T + FOCUS_HOLD)).toBe(1);
    expect(isOver(hidden, T + FOCUS_HOLD)).toBe(true);
  });

  it('picks the ramp up where it was held when the game comes back', () => {
    const back = show(hide(begin(T), T + 60), T + 600);
    expect(back.hidden).toBe(540);
    expect(focusOf(back, T + 600)).toBe(focusAt(60));
    expect(focusOf(back, T + 630)).toBe(focusAt(90));
    expect(endOf(back)).toBe(T + FOCUS_HOLD);
  });

  it('pays a long hidden stretch at its depth up to the end, and ×1 after it', () => {
    const hidden = hide(begin(T), T + FOCUS_RAMP);
    const out = spans(hidden, T + FOCUS_RAMP, T + 3 * FOCUS_HOLD);
    expect(out).toEqual([
      { until: T + FOCUS_HOLD, focus: FOCUS_MAX },
      { until: T + 3 * FOCUS_HOLD, focus: 1 },
    ]);
    // A stretch inside the sitting is one piece.
    expect(spans(hidden, T + FOCUS_RAMP, T + 900)).toEqual([{ until: T + 900, focus: FOCUS_MAX }]);
    // And nothing at all is a sitting: ×1, as being away always was.
    expect(spans(null, T, T + 9999)).toEqual([{ until: T + 9999, focus: 1 }]);
  });

  it('never starts while hidden: a sitting hidden at its first second is worth nothing extra', () => {
    const hidden = hide(begin(T), T);
    expect(focusOf(hidden, T + 1200)).toBe(1);
    expect(spans(hidden, T, T + 1200)).toEqual([{ until: T + 1200, focus: 1 }]);
  });

  it('hides and shows once, however many times the browser says so', () => {
    const h = hide(begin(T), T + 10);
    expect(hide(h, T + 20)).toBe(h);
    const s = show(h, T + 30);
    expect(show(s, T + 40)).toBe(s);
  });
});
