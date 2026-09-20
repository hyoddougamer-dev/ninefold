import { describe, expect, it } from 'vitest';
import {
  LAYERS_PER_REALM, MAX_MARK_DAYS, TRIBULATION_CHALLENGE, TRIBULATION_FOOTING,
  TRIBULATION_POWER,
} from '../balance.ts';
import { wardenOf } from '../../data/bestiary.ts';
import { effectiveBeastPower } from '../combat.ts';
import {
  atTribulation, canCross, crossTribulation, markBonus, newState, power,
  tribulationPool, tribulationScale, validate, type State,
} from '../state.ts';
import { rate } from '../time.ts';
import { LINES } from '../../data/alchemy.ts';
import { pillsTaken } from '../furnace.ts';
import { seals } from '../tower.ts';
import { playEndgame as play } from '../../../tools/endgame.ts';

const T0 = 1_700_000_000;
const DRAGON = wardenOf(9);

const ALL_WARDENS = {
  fox: 1, ape: 1, crane: 1, tiger: 1, turtle: 1, golem: 1, direwolf: 1, jiao: 1,
};

describe('渡劫 the ladder above the ladder', () => {
  it('keeps the Dragon on its feet at the top, for ever', () => {
    const top: State = { ...newState(T0), realm: 9, layer: LAYERS_PER_REALM - 1, tribulation: 0 };
    // An empty pool is no Dragon: the ninth realm is left the way every other realm is
    // left, by filling a bar first.
    expect(atTribulation(top)).toBe(false);
    expect(atTribulation({ ...top, qi: tribulationPool(top) })).toBe(true);
    // It used to be unreachable: wardens are not huntable and realm 9 was never "full",
    // so the ninth realm had no fight in it at all.
    expect(atTribulation({ ...top, qi: 1e30, realm: 8 })).toBe(false);
  });

  it('grants the mark and stands the Dragon back up, harder', () => {
    const base: State = { ...newState(T0), realm: 9, layer: LAYERS_PER_REALM - 1, tribulation: 2 };
    const won: State = { ...base, qi: tribulationPool(base), wardenFell: true };
    expect(canCross(won)).toBe(true);
    const beaten = effectiveBeastPower(won, DRAGON);
    const after = crossTribulation(won, beaten);
    expect(after.tribulation).toBe(3);
    expect(after.wardenFell).toBe(false);

    // Crossing without putting it down is refused rather than half-applied.
    const notYet = { ...won, wardenFell: false };
    expect(canCross(notYet)).toBe(false);
    expect(crossTribulation(notYet, beaten)).toEqual(notYet);

    expect(tribulationScale(0)).toBe(1);
    expect(tribulationScale(3)).toBeCloseTo(TRIBULATION_POWER ** 3, 6);
    // Crossing notes the Dragon that fell, so the next one can grow from it — not the
    // cultivator, whose build would otherwise be forgiven every single crossing.
    expect(after.tribulationAt).toBeCloseTo(beaten, 6);
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

  /**
   * 立 The footing. A crossing is settled in blows, and a stance with three arts on it is
   * worth nearly twice the number on the screen — so a Dragon built from bare 力 is a
   * Dragon the build beats for free, which is exactly what the endgame used to be.
   */
  it('builds the next Dragon from the power that actually faced the last one', () => {
    const s: State = {
      ...newState(T0), realm: 9, layer: LAYERS_PER_REALM - 1, killed: ALL_WARDENS,
      stance: 'endure', sequence: ['crane', 'tiger', 'wolf'],
      levels: { ...newState(T0).levels, technique: 54 },
    };
    const won = { ...s, qi: tribulationPool(s), wardenFell: true };
    const after = crossTribulation(won, effectiveBeastPower(won, DRAGON));
    expect(after.tribulationAt).toBeGreaterThanOrEqual(power(won) * TRIBULATION_FOOTING);
    // And the next one stands a whole challenge above that footing, not level with it.
    expect(effectiveBeastPower(after, DRAGON))
      .toBeCloseTo(after.tribulationAt * TRIBULATION_CHALLENGE, 4);
  });

  it('plays, and never lets one mark become a wall', () => {
    const { days, floors, chances, end } = play(40);
    let total = 0;
    const rows = days.map((d, i) => {
      total += d;
      return `  劫 ${String(i + 1).padStart(2)}   ${String(d).padStart(3)} days` +
        `   ${String(total).padStart(4)} days in all   tower floor ${String(floors[i]).padStart(3)}` +
        `   odds ${String(Math.round(chances[i] * 100)).padStart(3)}%`;
    });
    console.log(`\n  渡劫 the endgame, played out — gather, climb, brew, cross:\n${rows.join('\n')}\n` +
      `  ${days.length} marks in ${total} days, ` +
      `longest ${Math.max(...days)}, shortest ${Math.min(...days)}\n` +
      `  ended on tower floor ${end.tower} (${seals(end.tower)} seals) ` +
      `with ${pillsTaken(end.brewed)} pills brewed: ` +
      `${LINES.map((l) => `${l} ${end.brewed[l]}`).join(' · ')}\n`);

    for (const d of days) {
      // A mark that takes a fortnight is a wall, and a wall is where a player stops.
      expect(d).toBeLessThanOrEqual(MAX_MARK_DAYS);
    }
    // And a mark that takes no time at all is not a mark. The endgame has to be *paced*,
    // which is the half the earlier version could not do: with nothing to spend qi on,
    // every crossing was instant however the Dragon was scaled.
    expect(days.slice(-10).reduce((a, b) => a + b, 0)).toBeGreaterThanOrEqual(10);
    // It never runs out: whatever the economy does, there is always a next Dragon.
    expect(days.length).toBe(40);
    // And the loop actually turns — the tower is climbed and the furnace is used.
    expect(end.tower).toBeGreaterThan(81);
    expect(pillsTaken(end.brewed)).toBeGreaterThan(40);

    /**
     * 立 And the crossings are *contested*. This is the assertion the old endgame had no
     * version of, and it is the one that would have caught it: the Dragon was anchored
     * below what the build was worth, so every crossing came in at 90-98% and 煉體 — the
     * only pill that touches the Dragon — was never once worth brewing. The endgame read
     * as two days, tap, win, for ever.
     */
    const walkovers = chances.filter((c) => c > 0.9).length;
    console.log(`  ${walkovers} of ${chances.length} crossings came in over 90%, `
      + `${end.brewed.body} 煉體 pills brewed for them\n`);
    expect(walkovers).toBeLessThanOrEqual(chances.length / 4);
    // At least one power pill a crossing, or the furnace is not in the loop at all.
    expect(end.brewed.body).toBeGreaterThan(days.length);
  }, 30_000);
});
