import { describe, expect, it } from 'vitest';
import { allowedShare, walkAll } from '../../../tools/idle.ts';

/**
 * 閒 What a realm lets you buy, and how long it leaves you with nothing to press.
 *
 * The harness lives in tools/idle.ts and is read by the bible too. This file is where
 * the two claims it settles are kept from quietly stopping being true.
 */
describe('閒 where a realm\'s qi goes', () => {
  it('lets every realm buy about the same share of its own ladder', () => {
    const rows = Array.from({ length: 9 }, (_, i) => {
      const r = i + 1;
      return `    realm ${r}   ${(allowedShare(r) * 100).toFixed(0)}% of its own ladder`;
    });
    console.log(`\n  分 the eighteen qi levels a realm allows, against the realm:\n${
      rows.join('\n')}\n`);

    /**
     * The claim this kills: "the first realms have nothing to spend qi on." They have
     * exactly as much as the ninth does. If this ever drifts, the early game really has
     * gone thin and the fix is here rather than in a new system.
     */
    const shares = Array.from({ length: 9 }, (_, i) => allowedShare(i + 1));
    const spread = Math.max(...shares) - Math.min(...shares);
    expect(spread).toBeLessThan(0.1);
    for (const share of shares) expect(share).toBeGreaterThan(1);
  }, 30_000);

  it('leaves the lightest cultivator standing at a ceiling for most of the first realm', () => {
    const runs = walkAll();
    for (const run of runs) {
      const rows = run.rows.map((r) =>
        `    realm ${r.realm}  ${r.hours.toFixed(0).padStart(5)}h` +
        `   ${(r.intoUpgrades * 100).toFixed(0).padStart(3)}% of its qi into upgrades` +
        `   bar full ${(r.stuckHours / r.hours * 100).toFixed(0).padStart(3)}%` +
        `   of that, warden still standing ${
          (r.ceilingHours / r.hours * 100).toFixed(0).padStart(3)}%`);
      console.log(`\n  閒 ${run.name}, ${run.checks}x a day:\n${rows.join('\n')}`);
    }
    console.log('');

    const light = runs.find((r) => r.name === 'once a day')!;
    const busy = runs.find((r) => r.name === 'active')!;
    const first = (run: typeof light) => run.rows.find((r) => r.realm === 1)!;

    /**
     * 頂 The finding. A realm's bar stops at its ninth rung and qi banks there until 突破
     * takes it, and for somebody who opens the app once a day that is three quarters of
     * the first realm — the one realm where a player has not yet decided to stay.
     */
    expect(first(light).stuckHours / first(light).hours).toBeGreaterThan(0.5);
    // And it is a *habit* problem rather than a pricing one: showing up shortens it.
    expect(first(busy).stuckHours / first(busy).hours)
      .toBeLessThan(first(light).stuckHours / first(light).hours);

    /**
     * 守 And the half of it that was genuinely dead — bar full, warden standing there
     * out of reach — is the half that the warden's own gate was causing. It used to be
     * 74% of the first realm and 20-41% of the next three; it is a quarter of the first
     * realm now and **nothing at all** from the fourth up, because a warden no longer
     * walks off when you spend the qi that beats it. See wardenStands.
     */
    expect(first(light).ceilingHours / first(light).hours).toBeLessThan(0.35);
    for (const run of runs) {
      for (const row of run.rows.filter((r) => r.realm >= 4)) {
        expect(row.ceilingHours).toBe(0);
      }
    }

    /**
     * 梯 And the mechanism, stated as a number: a layer opens by itself the moment the qi
     * reaches its price, so the ladder takes the qi before a light visitor can reach it.
     * Visiting six times a day rather than once roughly triples the share they get to
     * spend on upgrades in the first realm.
     */
    expect(first(busy).intoUpgrades).toBeGreaterThan(first(light).intoUpgrades * 2);

    // By the middle realms the wait at a full bar is a rounding error for everybody.
    for (const run of runs) {
      for (const row of run.rows.filter((r) => r.realm >= 5)) {
        expect(row.stuckHours / row.hours).toBeLessThan(0.15);
      }
    }
  }, 120_000);
});
