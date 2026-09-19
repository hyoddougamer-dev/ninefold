import { describe, expect, it } from 'vitest';
import {
  LAYERS, LAYERS_PER_REALM, MAX_MARK_DAYS, TRIBULATION_CHALLENGE, TRIBULATION_POWER,
  ladderAt,
} from '../balance.ts';
import { wardenOf } from '../../data/bestiary.ts';
import { effectiveBeastPower, odds } from '../combat.ts';
import {
  atTribulation, buy, canBuy, canCross, crossTribulation, markBonus, newState, power,
  tribulationPool, tribulationReadiness, tribulationScale, validate, type State,
} from '../state.ts';
import { rate } from '../time.ts';
import { LINES } from '../../data/alchemy.ts';
import { pillCost, pillsTaken } from '../furnace.ts';
import { brew, canBrew, clearFloor, standingFloor } from '../trials.ts';
import { floorBeast, floorPower, seals } from '../tower.ts';

const T0 = 1_700_000_000;
const DRAGON = wardenOf(9);

const ALL_WARDENS = {
  fox: 1, ape: 1, crane: 1, tiger: 1, turtle: 1, golem: 1, direwolf: 1, jiao: 1,
};

/** Everything the whole climb could have banked, spent the way a player would. */
function arrived(): State {
  let s: State = {
    ...newState(T0), realm: 9, layer: LAYERS_PER_REALM - 1,
    // A day's gathering in hand, not the whole mountain: this is somebody who has just
    // opened the last layer, not somebody handed the run's entire earnings at once.
    qi: ladderAt(LAYERS - 2) * 3, killed: ALL_WARDENS,
    stance: 'endure', sequence: ['crane', 'tiger', 'wolf'],
    // Somebody who climbed the mountain, and brewed and climbed the tower on the way —
    // which is what `curve.test.ts` measures a brewing cultivator arriving with. Starting
    // the endgame from an empty furnace is the one thing that makes it read as free: the
    // first pills would be the ones a first-realm cultivator buys, at first-realm prices.
    tower: 81, brewed: { body: 81, bane: 81, fortune: 81 },
  };
  for (let i = 0; i < 600; i++) {
    const u = (['technique', 'method', 'pills'] as const)[i % 3];
    if (!canBuy(s, u)) continue;
    s = buy(s, u);
  }
  return s;
}

/**
 * Plays the endgame loop as a person plays it: gather qi, climb the tower for materials,
 * brew what the furnace will sell, face the Dragon, cross.
 *
 * This is the only test that measures the endgame honestly, because the endgame is not
 * one system. The Dragon grows 1.6x a crossing; a mark pays 1.5x; the furnace is the
 * only thing at the top that qi still buys, and the tower is the only thing that feeds
 * the furnace. Take any one of the four away and the ladder becomes a wall — which is
 * exactly what it was before the tower and the furnace existed, measured here as a
 * cultivator who could not cross a single mark inside four hundred days.
 */
function play(marks: number) {
  let s = arrived();
  const days: number[] = [];
  const floors: number[] = [];

  for (let m = 0; m < marks; m++) {
    let waited = 0;
    for (let day = 0; day < 400; day++) {
      if (odds(s, DRAGON) > 0.55 && canCross({ ...s, wardenFell: true })) break;
      s = { ...s, qi: s.qi + rate(s) * 86_400 };
      waited += 1;

      // The tower, while the next floor is worth trying. Losing costs nothing, so the
      // only question is whether the build clears it.
      for (let i = 0; i < 200; i++) {
        const floor = standingFloor(s);
        if (odds(s, floorBeast(floor), floorPower(floor)) < 0.6) break;
        s = clearFloor(s, floor);
      }

      // Then the spending, in the order a person would: the capped upgrades first
      // because they are finite, then 煉體 while the Dragon is still out of reach, and
      // only what is left over the pool on the other two lines. Qi brewed is qi not
      // pooled, so a cultivator who brews everything never crosses anything.
      for (let i = 0; i < 4000; i++) {
        const u = (['technique', 'cores', 'method', 'pills'] as const).find((x) => canBuy(s, x));
        if (!u) break;
        s = buy(s, u);
      }
      const short = odds(s, DRAGON) <= 0.55;
      for (let i = 0; i < 4000; i++) {
        if (short) {
          if (!canBrew(s, 'body')) break;
          s = brew(s, 'body');
          continue;
        }
        const spare = s.qi - tribulationPool(s);
        const line = (['bane', 'fortune'] as const)
          .find((l) => canBrew(s, l) && pillCost(s.brewed, l).qi <= spare);
        if (!line) break;
        s = brew(s, line);
      }
    }
    days.push(waited);
    floors.push(s.tower);
    s = crossTribulation({ ...s, wardenFell: true }, effectiveBeastPower(s, DRAGON));
  }
  return { days, floors, end: s };
}

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

  it('reads the bar as power against the Dragon, not as qi', () => {
    const s = { ...newState(T0), realm: 9, tribulation: 0 };
    const d = effectiveBeastPower(s, DRAGON);
    expect(tribulationReadiness(s, d)).toBeLessThan(1);
    expect(tribulationReadiness({ ...s, levels: { ...s.levels, technique: 400 } }, d)).toBe(1);
  });

  it('plays, and never lets one mark become a wall', () => {
    const { days, floors, end } = play(40);
    let total = 0;
    const rows = days.map((d, i) => {
      total += d;
      return `  劫 ${String(i + 1).padStart(2)}   ${String(d).padStart(3)} days` +
        `   ${String(total).padStart(4)} days in all   tower floor ${String(floors[i]).padStart(3)}`;
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
  });
});
