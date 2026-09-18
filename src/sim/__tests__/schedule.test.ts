import { describe, expect, it } from 'vitest';
import { MAX_GAP_SHARE, REALM_COST } from '../balance';
import { advance } from '../time';
import { newState } from '../save';

/**
 * Finding 1. The earlier build put realms 1-6 in six days and 8-9 in twenty-six: 57%
 * of a playthrough in one gap with nothing in it. This test is the guard that a change
 * to REALM_COST can never quietly reintroduce that shape.
 */
describe('the idle-only climb', () => {
  const T0 = 1_700_000_000;
  const STEP = 3600;
  const DAY = 86_400;

  function climb() {
    let s = newState(T0, 'sword'); // stillness, no channels, no hunting: the baseline
    const arrival: number[] = [0];
    let t = T0;
    for (let i = 0; i < 24 * 400 && s.realm < 9; i++) {
      t += STEP;
      s = advance(s, t);
      while (arrival.length < s.realm) arrival.push((t - T0) / DAY);
    }
    return { arrival, state: s };
  }

  it('prints the schedule and keeps every gap under the share', () => {
    const { arrival, state } = climb();
    expect(state.realm).toBe(9);

    const total = arrival[arrival.length - 1];
    const gaps = arrival.slice(1).map((d, i) => d - arrival[i]);

    const rows = arrival.map((d, i) => `  realm ${i + 1}  day ${d.toFixed(1).padStart(6)}` +
      (i > 0 ? `   (+${gaps[i - 1].toFixed(1)}d, ${(100 * gaps[i - 1] / total).toFixed(0)}%)` : ''));
    console.log(`\n  idle-only arrivals — ${total.toFixed(1)} days to the ninth realm\n${rows.join('\n')}\n`);

    const worst = Math.max(...gaps);
    console.log(`  largest gap: ${worst.toFixed(1)}d = ${(100 * worst / total).toFixed(1)}% ` +
      `of the run (ceiling ${(100 * MAX_GAP_SHARE).toFixed(0)}%)\n`);

    expect(worst / total).toBeLessThanOrEqual(MAX_GAP_SHARE);
  });

  it('never stops getting slower, so the mountain always reads as taller', () => {
    const gaps = REALM_COST.slice(0, 8);
    for (let i = 1; i < gaps.length; i++) expect(gaps[i]).toBeGreaterThan(gaps[i - 1]);
  });

  it('has no exit from the ninth realm', () => {
    expect(REALM_COST[8]).toBe(Infinity);
    const { state } = climb();
    const later = advance(state, state.at + 365 * 86_400);
    expect(later.realm).toBe(9);
    expect(later.qi).toBeGreaterThan(state.qi);
  });
});
