import { describe, expect, it } from 'vitest';
import { MAX_GAP, REALM_COST, TARGET_DAYS, TOLERANCE_DAYS } from '../balance.ts';
import { newState } from '../state.ts';
import { advance } from '../time.ts';

/**
 * The curve is the most irreversible decision in the game, and it is where the earlier
 * version broke: realms 1 to 6 in six days, and twenty-six days in the last gap with
 * nothing in it.
 *
 * These tests are the latch. No change to REALM_COST can bring that shape back without
 * failing here, and the schedule is printed on every run.
 */
describe('the climb, opening the app once a day', () => {
  const T0 = 1_700_000_000;
  const STEP = 3600;
  const DAY = 86_400;

  function climb() {
    let s = newState(T0);
    const arrival: number[] = [0];
    let t = T0;
    for (let i = 0; i < 24 * 500 && s.realm < 9; i++) {
      t += STEP;
      s = advance(s, t, true);   // theoretical curve: the warden falls at once
      while (arrival.length < s.realm) arrival.push((t - T0) / DAY);
    }
    return { arrival, state: s };
  }

  it('prints the schedule and keeps every gap under the ceiling', () => {
    const { arrival, state } = climb();
    expect(state.realm).toBe(9);

    const total = arrival[arrival.length - 1];
    const gaps = arrival.slice(1).map((d, i) => d - arrival[i]);
    const NAMES = ['練氣', '築基', '金丹', '元嬰', '化神', '煉虛', '合體', '大乘', '渡劫'];

    const rows = arrival.map((d, i) =>
      `  ${NAMES[i]}  realm ${i + 1}  day ${d.toFixed(1).padStart(6)}` +
      (i > 0 ? `   (+${gaps[i - 1].toFixed(1)}d · ${(100 * gaps[i - 1] / total).toFixed(0)}%)` : ''));
    console.log(`\n  once a day, no multipliers — ${total.toFixed(1)} days to the ninth realm\n${rows.join('\n')}\n`);

    const worst = Math.max(...gaps);
    console.log(`  largest gap: ${worst.toFixed(1)}d = ${(100 * worst / total).toFixed(1)}% of the run (ceiling ${(100 * MAX_GAP).toFixed(0)}%)`);
    console.log(`  in the last realm a layer opens every ${(gaps[7] / 9).toFixed(1)} days\n`);

    expect(worst / total).toBeLessThanOrEqual(MAX_GAP);
    expect(Math.abs(total - TARGET_DAYS)).toBeLessThanOrEqual(TOLERANCE_DAYS);
  });

  it('never stops getting slower, so the mountain always reads as taller', () => {
    const costs = REALM_COST.slice(0, 8);
    for (let i = 1; i < costs.length; i++) expect(costs[i]).toBeGreaterThan(costs[i - 1]);
  });

  it('has no exit from the ninth realm', () => {
    expect(REALM_COST[8]).toBe(Infinity);
    const { state } = climb();
    const later = advance(state, state.at + 365 * 86_400, true);
    expect(later.realm).toBe(9);
    expect(later.qi).toBeGreaterThan(state.qi);
  });

  it('pays one long absence exactly what many short ones pay', () => {
    const span = 30 * 86_400;
    const once = advance(newState(T0), T0 + span, true);
    let many = newState(T0);
    for (let t = T0 + 60; t <= T0 + span; t += 60) many = advance(many, t, true);
    expect(many.realm).toBe(once.realm);
    expect(many.layer).toBe(once.layer);
    expect(many.qi).toBeCloseTo(once.qi, 3);
    console.log(`  30 days: one step and 43,200 steps both give realm ${once.realm}, layer ${once.layer}, ` +
      `qi ${once.qi.toFixed(2)} vs ${many.qi.toFixed(2)}\n`);
  });
});
