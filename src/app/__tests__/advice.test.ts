import { describe, expect, it } from 'vitest';
import { advice } from '../advice.ts';
import { LAYERS_PER_REALM, focusAt, levelCap } from '../../sim/balance.ts';
import { buy, canBuy, newState, type State, type Upgrade } from '../../sim/state.ts';
import { advance } from '../../sim/time.ts';
import { REALMS } from '../../data/realms.ts';

/**
 * 示 The line that says what to do next, and the promise that it is always saying
 * something.
 *
 * It began as a wall-explainer: from the third realm a warden will not fall without
 * 妖丹 cores, and a player who never opened 狩 Hunt met that wall with nothing to read.
 * It answered *what is blocking you* and returned silence the rest of the time.
 *
 * The rest of the time is most of the game. A player climbing quietly through the
 * middle of a realm, neither stuck nor finished, got a blank space where the only
 * sentence on the screen lives, and an idle game with nothing on the screen and nothing
 * to read is an idle game you close.
 *
 * So the promise this file keeps is simple and absolute: **never null**. Either
 * something is blocking you, or something is worth doing, or something is within reach
 * and named with the power it wants, or the next thing the mountain will hand you is
 * named with the realm that hands it over.
 */

const T0 = 1_700_000_000;
const UPGRADES: readonly Upgrade[] = ['technique', 'method', 'pills', 'cores'];

describe('示 the line that is never empty', () => {
  it('says something at the very first frame of a new game', () => {
    const tip = advice(newState(T0));
    expect(tip).not.toBeNull();
    expect(tip!.text.length).toBeGreaterThan(20);
  });

  /**
   * The states below are not hand-picked: they are every realm, every layer, and four
   * different amounts of investment. If any single one of them has nothing to say, the
   * player standing there has nothing to read.
   */
  it('says something at every realm, every layer, however much has been bought', () => {
    let quiet = 0;
    let checked = 0;
    for (const r of REALMS) {
      for (let layer = 0; layer < LAYERS_PER_REALM; layer++) {
        for (const share of [0, 0.3, 0.7, 1]) {
          const cap = levelCap(r.n);
          const levels = Math.round(cap * share);
          const s: State = {
            ...newState(T0), realm: r.n, layer,
            qi: 0, materials: 0,
            levels: { technique: levels, method: levels, pills: levels, cores: levels },
          };
          checked++;
          if (advice(s) === null) quiet++;
        }
      }
    }
    console.log(`\n  示 checked ${checked} places on the mountain; ${quiet} of them had nothing to say\n`);
    expect(quiet).toBe(0);
  });

  /** And the same walking it, which is the way a player actually meets these states. */
  it('says something at every step of a real first realm', () => {
    let s: State = newState(T0);
    const seen = new Set<string>();
    for (let t = 1; t <= 14 * 3600; t++) {
      s = advance(s, T0 + t, false, focusAt(t % 5400));
      for (const u of UPGRADES) if (canBuy(s, u)) s = buy(s, u);
      if (t % 300) continue;
      const tip = advice(s);
      expect(tip).not.toBeNull();
      seen.add(tip!.text);
      if (s.realm > 1) break;
    }
    /**
     * And it is not one sentence on a loop. It is checked on the *text* rather than the
     * han. Across the first realm the symbol is mostly 狩, and that is correct, because
     * hunting is what the first realm is. What has to move is what it says about it, which beast
     * and at what odds.
     */
    console.log(`\n  示 across the first realm it said ${seen.size} different things:`);
    for (const line of seen) console.log(`     ${line}`);
    console.log('');
    expect(seen.size).toBeGreaterThan(3);
  });
});
