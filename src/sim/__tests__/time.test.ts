import { describe, expect, it } from 'vitest';
import { advance } from '../time';
import { newState } from '../save';
import { rate } from '../core';

/**
 * GDD §11 rule 2. An idle game is played closed: the app is in the background for
 * twenty-three hours of every twenty-four. One long absence must pay exactly what many
 * short ones pay, or the game lies about the hours the player did not watch.
 */
describe('time is a timestamp, never a frame', () => {
  const T0 = 1_700_000_000;

  it('pays one 30-day absence exactly what 43,200 one-minute ticks pay', () => {
    const span = 30 * 86_400;

    const once = advance(newState(T0), T0 + span);

    let many = newState(T0);
    for (let t = T0 + 60; t <= T0 + span; t += 60) many = advance(many, t);

    expect(many.realm).toBe(once.realm);
    expect(many.layer).toBe(once.layer);
    expect(many.qi).toBeCloseTo(once.qi, 3);
    console.log(`\n  30 days, one step vs 43,200 steps: realm ${once.realm} layer ${once.layer}, ` +
      `qi ${once.qi.toFixed(2)} vs ${many.qi.toFixed(2)}\n`);
  });

  it('crosses many layer boundaries inside a single call without underpaying', () => {
    // A single rate applied across the gap would miss every compounding step in it.
    const s = advance(newState(T0), T0 + 10 * 86_400);
    const naive = rate(newState(T0)) * 10 * 86_400;
    expect(s.qiEverGathered).toBeGreaterThan(naive);
  });

  it('does not move backwards, and a clock that jumps back mints nothing', () => {
    const s = advance(newState(T0), T0 + 3600);
    const back = advance(s, T0 + 60);
    expect(back.qi).toBe(s.qi);
    expect(back.at).toBe(s.at);
  });

  it('the road changes the rate and nothing else about how time is paid', () => {
    const still = advance({ ...newState(T0), road: 'stillness' }, T0 + 86_400);
    const moving = advance({ ...newState(T0), road: 'motion' }, T0 + 86_400);
    expect(moving.qiEverGathered).toBeLessThan(still.qiEverGathered);
  });
});
