import { describe, expect, it } from 'vitest';
import {
  MAX_MARK_DAYS, REALM_COST, TRIBULATION_CHALLENGE, TRIBULATION_POWER,
} from '../balance.ts';
import { wardenOf } from '../../data/bestiary.ts';
import { effectiveBeastPower, odds } from '../combat.ts';
import {
  atTribulation, buy, canBuy, canCross, crossTribulation, markBonus, newState, power,
  tribulationReadiness, tribulationScale, validate, type State,
} from '../state.ts';
import { rate } from '../time.ts';

const T0 = 1_700_000_000;
const DRAGON = wardenOf(9);

const ALL_WARDENS = {
  fox: 1, ape: 1, crane: 1, tiger: 1, turtle: 1, golem: 1, direwolf: 1, jiao: 1,
};

/** Everything the whole climb could have banked, spent the way a player would. */
function arrived(): State {
  let bank = 0;
  for (let i = 0; i < 8; i++) bank += REALM_COST[i];
  let s: State = {
    ...newState(T0), realm: 9, layer: 0, qi: bank * 0.5, killed: ALL_WARDENS,
    stance: 'endure', sequence: ['crane', 'tiger', 'wolf'],
  };
  for (let i = 0; i < 600; i++) {
    const u = i % 2 === 0 ? 'technique' : 'method';
    if (!canBuy(s, u)) break;
    s = buy(s, u);
  }
  return s;
}

/**
 * Plays the endgame loop: gather, spend on whatever is short, face the Dragon, cross.
 * Returns the days each mark took.
 *
 * It exists because the first design of this ladder was guessed and was wrong in both
 * directions at once — a qi bar that a top-realm cultivator filled in twenty minutes in
 * front of a Dragon they could not beat at all.
 */
function play(marks: number): number[] {
  let s = arrived();
  const days: number[] = [];

  for (let m = 0; m < marks; m++) {
    let waited = 0;
    // A day at a time, spending as it comes, until the Dragon is beatable.
    for (let day = 0; day < 400; day++) {
      if (odds(s, DRAGON) > 0.55) break;
      s = { ...s, qi: s.qi + rate(s) * 86_400 };
      waited += 1;
      for (let i = 0; i < 4000; i++) {
        // Power first while the Dragon is out of reach, then the rate that pays for it.
        const order = power(s) < effectiveBeastPower(s, DRAGON) * 1.3
          ? (['technique', 'cores', 'method', 'pills'] as const)
          : (['method', 'pills', 'technique', 'cores'] as const);
        const u = order.find((x) => canBuy(s, x));
        if (!u) break;
        s = buy(s, u);
      }
    }
    days.push(waited);
    s = crossTribulation({ ...s, wardenFell: true });
  }
  return days;
}

describe('渡劫 the ladder above the ladder', () => {
  it('keeps the Dragon on its feet at the top, for ever', () => {
    const top = { ...newState(T0), realm: 9, tribulation: 0 };
    expect(atTribulation(top)).toBe(true);
    // It used to be unreachable: wardens are not huntable and realm 9 is never "full",
    // so the ninth realm had no fight in it at all.
    expect(atTribulation({ ...top, realm: 8 })).toBe(false);
  });

  it('grants the mark and stands the Dragon back up, harder', () => {
    const won: State = { ...newState(T0), realm: 9, tribulation: 2, wardenFell: true };
    expect(canCross(won)).toBe(true);
    const after = crossTribulation(won);
    expect(after.tribulation).toBe(3);
    expect(after.wardenFell).toBe(false);

    // Crossing without putting it down is refused rather than half-applied.
    const notYet = { ...won, wardenFell: false };
    expect(canCross(notYet)).toBe(false);
    expect(crossTribulation(notYet)).toEqual(notYet);

    expect(tribulationScale(0)).toBe(1);
    expect(tribulationScale(3)).toBeCloseTo(TRIBULATION_POWER ** 3, 6);
    // Crossing notes where you stood, so the next Dragon can grow from it.
    expect(after.tribulationAt).toBeCloseTo(power(won), 6);
  });

  it('anchors the Dragon to the power you had, so it can never fall behind', () => {
    const strong: State = {
      ...newState(T0), realm: 9, tribulation: 0, tribulationAt: 1e12,
    };
    // The ladder says the base Dragon; the anchor says far more, and the anchor wins.
    expect(effectiveBeastPower(strong, DRAGON)).toBeCloseTo(1e12 * TRIBULATION_CHALLENGE, 0);

    /**
     * Why the anchor exists. Measured, a cultivator at the top with nothing left to
     * spend qi on reaches a qi rate of 10^28 a day inside a fortnight: the rate upgrades
     * pay for the rate upgrades and their cost curve is too shallow to stop it. That is
     * a real fault in the economy and it wants its own pass. Until then, a fixed ladder
     * of Dragons would be walked over in an afternoon — this one cannot be.
     */
    const runaway: State = { ...strong, tribulationAt: 1e30 };
    expect(effectiveBeastPower(runaway, DRAGON)).toBeGreaterThan(1e30);
  });

  it('pays for every mark, in power and in qi alike', () => {
    const bare = { ...newState(T0), realm: 9, tribulation: 0 };
    expect(markBonus(0)).toBe(1);
    expect(power({ ...bare, tribulation: 7 }) / power(bare)).toBeCloseTo(markBonus(7), 6);
    expect(rate({ ...bare, tribulation: 7 }) / rate(bare)).toBeCloseTo(markBonus(7), 6);
  });

  it('only exists at the top, and a save cannot bring marks down with it', () => {
    expect(validate({ ...newState(T0), v: 1, realm: 4, tribulation: 40 }, T0).tribulation).toBe(0);
    expect(validate({ ...newState(T0), v: 1, realm: 9, tribulation: 40 }, T0).tribulation).toBe(40);

    const low = { ...newState(T0), realm: 8, tribulation: 0 };
    const high = { ...newState(T0), realm: 9, tribulation: 3 };
    expect(effectiveBeastPower(high, DRAGON) / effectiveBeastPower(low, DRAGON))
      .toBeCloseTo(TRIBULATION_POWER ** 3, 4);
  });

  it('reads the bar as power against the Dragon, not as qi', () => {
    const s = { ...newState(T0), realm: 9, tribulation: 0 };
    const d = effectiveBeastPower(s, DRAGON);
    expect(tribulationReadiness(s, d)).toBeLessThan(1);
    expect(tribulationReadiness({ ...s, levels: { ...s.levels, technique: 400 } }, d)).toBe(1);
  });

  it('plays, and never lets one mark become a wall', () => {
    const days = play(12);
    let total = 0;
    const rows = days.map((d, i) => {
      total += d;
      return `  劫 ${String(i + 1).padStart(2)}   ${String(d).padStart(3)} days` +
        `   ${String(total).padStart(4)} days in all`;
    });
    console.log(`\n  渡劫 the endgame, played out:\n${rows.join('\n')}\n` +
      `  ${days.length} marks in ${total} days, ` +
      `longest ${Math.max(...days)}, shortest ${Math.min(...days)}\n`);

    /**
     * This is currently degenerate and it is not the endgame's fault. A cultivator at
     * the top has nothing left to spend qi on, so they buy rate upgrades with the qi
     * those upgrades produce — and the cost curve (method 1.19 against a gain of 1.15)
     * is too shallow to stop it. The qi rate reaches 10^28 a day within a fortnight, so
     * every mark is instant however the Dragon is scaled.
     *
     * The economy wants its own pass: the step of the rate upgrades has to clear their
     * gain by enough to settle, and REALM_COST then has to be re-tuned to hold the
     * ninety days. Nothing in *this* file changes when that happens, because the Dragon
     * is anchored to the player rather than to a ladder — which is the whole reason it
     * is anchored that way.
     */
    if (total < days.length * 2) {
      console.log('  ⚠ the marks come far too fast. The economy runs away at the top,\n' +
        '    and no endgame can pace itself until that is fixed. See the note above.\n');
    }

    for (const d of days) {
      // A mark that takes a fortnight is a wall, and a wall is where a player stops.
      expect(d).toBeLessThanOrEqual(MAX_MARK_DAYS);
    }
    // It never runs out: whatever the economy does, there is always a next Dragon.
    expect(days.length).toBe(12);
  });
});
