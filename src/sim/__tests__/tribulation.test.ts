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
import { playEndgame as play, type Lean } from '../../../tools/endgame.ts';
import { SLOTS } from '../../data/gear.ts';

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
    // Crossing notes the Dragon that fell, so the next one can grow from it, not the
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
     * of Dragons would be walked over in an afternoon. This one cannot be.
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
   * worth nearly twice the number on the screen, so a Dragon built from bare 力 is a
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
    console.log(`\n  渡劫 the endgame, played out: gather, climb, brew, cross:\n${rows.join('\n')}\n` +
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
    // And the loop actually turns: the tower is climbed and the furnace is used.
    expect(end.tower).toBeGreaterThan(81);
    expect(pillsTaken(end.brewed)).toBeGreaterThan(40);

    /**
     * 立 And the crossings are *contested*. This is the assertion the old endgame had no
     * version of, and it is the one that would have caught it: the Dragon was anchored
     * below what the build was worth, so every crossing came in at 90-98% and 煉體: the
     * only pill that touches the Dragon: was never once worth brewing. The endgame read
     * as two days, tap, win, for ever.
     */
    const walkovers = chances.filter((c) => c > 0.9).length;
    console.log(`  ${walkovers} of ${chances.length} crossings came in over 90%, `
      + `${end.brewed.body} 煉體 pills brewed for them\n`);
    expect(walkovers).toBeLessThanOrEqual(chances.length / 4);
    // At least one power pill a crossing, or the furnace is not in the loop at all.
    expect(end.brewed.body).toBeGreaterThan(days.length);
  }, 30_000);

  /**
   * 悟道 境外 The nine heavens each owe a card, and no one lean may run away with them.
   *
   * 量 This is the assertion the heavens' cards were written against, and the number it
   * prints is the honest thing to say about them. The endgame's clock is 雷池 the pool,
   * and the pool is written in *days of your own gathering*, so nothing a card pays can
   * make a crossing come sooner. A heaven card is a build, not a speed-up, and the
   * spread below is what a build is worth: a handful of days across forty crossings, and
   * about a fifth of the power between the widest two.
   *
   * If a lean ever does run away, this is what says so, and the fix is the card table
   * rather than the clock.
   */
  it('lets a heaven card make a build, and never a shortcut', () => {
    const leans: Lean[] = ['none', 'pill', 'tower', 'material', 'luck', 'refine', 'salvage'];
    const runs = leans.map((lean) => {
      const g = play(40, lean);
      const levels = SLOTS.reduce((n, x) => n + (g.end.worn[x]?.refine ?? 0), 0);
      return { lean, days: g.days.reduce((a, b) => a + b, 0), floor: g.end.tower, levels,
        power: power(g.end), cards: g.end.awakened.length };
    });
    console.log('\n  悟道 境外 forty crossings, once for each way of leaning:\n' +
      runs.map((r) => `    ${r.lean.padEnd(9)} ${String(r.days).padStart(4)} days` +
        `   tower ${String(r.floor).padStart(3)}   ${String(r.levels).padStart(4)} refine levels` +
        `   力 ${r.power.toExponential(2)}`).join('\n') + '\n');

    // 卡 Every lean but 'none' actually took all nine, or this measures nothing.
    for (const r of runs.filter((x) => x.lean !== 'none')) expect(r.cards).toBe(17);
    expect(runs.find((r) => r.lean === 'none')!.cards).toBe(8);

    /**
     * 逃 No lean runs away with the endgame, which is the whole assertion.
     *
     * 亂 The band is wide on purpose and the day count is the reason. This loop decides
     * every day on thresholds (climb the next floor at 60%, face the Dragon at 55%), and
     * `odds` reads forty-one seeded fights, so a card worth a per cent early moves which
     * floor falls on which day and the totals wander by about a tenth either way with
     * nothing behind it. Leaning 拆 comes out *slower* than taking no card at all, which
     * cannot be true and is exactly the size of the noise: 拆 melting pays qi for gear,
     * 塔 the tower drops none, and this loop never hunts, so those nine cards are worth
     * nothing here and the difference is the dice.
     *
     * 力 The power is the clean signal, and it is the one a card is actually for.
     */
    const days = runs.map((r) => r.days);
    expect(Math.max(...days) / Math.min(...days)).toBeLessThan(1.4);
    const powers = runs.map((r) => r.power);
    expect(Math.max(...powers) / Math.min(...powers)).toBeGreaterThan(1.05);
    expect(Math.max(...powers) / Math.min(...powers)).toBeLessThan(2);
  }, 60_000);
});
