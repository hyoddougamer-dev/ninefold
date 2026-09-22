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
     * 頂 The finding, and what is left of it. A realm's bar stops at its last rung and
     * qi banks there, and for somebody who opens the app once a day that used to be
     * three quarters of the first realm: the one realm where a player has not yet
     * decided to stay. It is about half of a realm that is itself half as long now.
     */
    expect(first(light).stuckHours / first(light).hours).toBeGreaterThan(0.3);
    expect(first(light).stuckHours / first(light).hours).toBeLessThan(0.6);
    // And it is a *habit* problem rather than a pricing one: showing up shortens it.
    expect(first(busy).stuckHours / first(busy).hours)
      .toBeLessThan(first(light).stuckHours / first(light).hours);

    /**
     * 費 The two halves of that wait have collapsed into one, which is the plainest way
     * to state what the 費 change did. There used to be two reasons to stand at a full
     * bar: a warden you could not beat, and a ninth rung you had to re-earn after
     * spending it. The second is gone: the warden *is* the ninth rung, so every hour
     * still spent waiting is spent waiting to be strong enough, which is a fight to
     * prepare for rather than a toll to re-pay.
     */
    for (const run of runs) {
      for (const row of run.rows) expect(row.stuckHours).toBeCloseTo(row.ceilingHours, 5);
    }

    /**
     * 守 And from the fourth realm up there is no wait at all for anybody, because a
     * warden no longer walks off when you spend the qi that beats it. See wardenStands.
     */
    for (const run of runs) {
      for (const row of run.rows.filter((r) => r.realm >= 4)) {
        expect(row.ceilingHours).toBe(0);
      }
    }

    /**
     * 梯 A layer still opens by itself the moment the qi reaches its price, so the ladder
     * takes the qi before a light visitor can reach it. That used to be a wide gap: 44%
     * of the first realm's qi into upgrades for somebody visiting six times a day
     * against 13% for somebody visiting once, and 銀 the carry closed most of it: qi
     * banked at a full bar is no longer burned on the way out, so the visitor who could
     * not intercept it gets it at the next breakthrough instead.
     *
     * That is worth knowing, because it means this is no longer one of the reasons
     * playing beats waiting. The reasons that are left are 材 material, 塔 the tower,
     * 爐 the furnace and 器 the gear: all of which need a tap, and the gap they hold
     * up on their own is asserted in players.test.ts, where it belongs.
     */
    for (const run of runs) {
      for (const row of run.rows) {
        expect(row.intoUpgrades).toBeGreaterThan(0.2);
        expect(row.intoUpgrades).toBeLessThan(0.8);
      }
    }

    // By the middle realms the wait at a full bar is a rounding error for everybody.
    for (const run of runs) {
      for (const row of run.rows.filter((r) => r.realm >= 5)) {
        expect(row.stuckHours / row.hours).toBeLessThan(0.15);
      }
    }
  }, 120_000);
});
