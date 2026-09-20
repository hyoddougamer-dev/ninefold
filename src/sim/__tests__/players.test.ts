import { describe, expect, it } from 'vitest';
import { FOCUS_HOLD, FOCUS_MAX, FOCUS_RAMP, focusAt } from '../balance.ts';
import { newState, power, rate, type State } from '../state.ts';
import { advance } from '../time.ts';
import { clearFloor, floorQi } from '../trials.ts';
import { floorPower } from '../tower.ts';
import { TOWER_QI_HOURS } from '../balance.ts';
import { pillsTaken } from '../furnace.ts';
import { num } from '../format.ts';
import { playAll } from '../../../tools/habits.ts';

/**
 * 勤 Five cultivators, one game.
 *
 * This is the file that answers the only question a player actually asks about an idle
 * game: **what does being there buy me?** Before it existed the answer was "almost
 * nothing, and if you use the furnace, less than nothing" — measured, somebody playing
 * six times a day reached the ninth realm *later* than somebody opening the app once.
 *
 * Three things make the difference now, and all three are additive: 妖丹 cores, which a
 * warden demands and only a kill provides; 入定 the depth that gathering reaches while
 * the app is actually open; and 無盡塔 the tower, whose floors pay hours of gathering
 * and pay them once.
 *
 * Nothing anywhere pays *less* for being away. That is the other half of the promise and
 * it is checked at the bottom of this file. The harness itself lives in tools/habits.ts,
 * because 九境's bible prints this same table and a measurement shown twice has to be
 * made once.
 */

const T0 = 1_700_000_000;

describe('勤 what being there buys you', () => {
  const runs = playAll();

  it('prints the five cultivators, and keeps them in order', () => {
    const rows = runs.map((run) => {
      const { habit: h, arrival, state, fights, reached, done, days } = run;
      const at9 = arrival[8];
      return `  ${h.name.padEnd(12)} ${String(h.checks).padStart(2)}x a day, ` +
        `${String(h.minutes).padStart(2)} min open, ${String(h.hunts).padStart(1)} kills a visit` +
        `   realm 9 ${(at9 === undefined ? `never (stuck at ${reached})` : `on day ${at9.toFixed(0)}`).padStart(22)}` +
        `   whole ladder ${(done ? `day ${days.toFixed(0)}` : '—').padStart(7)}` +
        `   力 ${num(run.power).padStart(7)}   tower ${String(state.tower).padStart(3)}` +
        `   ${String(fights).padStart(5)} fights`;
    });
    console.log(`\n  勤 five cultivators, one game:\n${rows.join('\n')}\n`);

    const [waiter, once, casual, active, hourly] = runs;

    // A cultivator who never fights anything never leaves the low realms, whatever they
    // gather. Their qi is not the problem; 妖丹 cores are, and those only fall off beasts.
    expect(waiter.arrival[8]).toBeUndefined();
    expect(waiter.reached).toBeLessThanOrEqual(4);

    // And everybody who does fight gets there, sooner the more they play.
    for (const r of [once, casual, active, hourly]) expect(r.arrival[8]).toBeDefined();
    expect(active.arrival[8]).toBeLessThan(casual.arrival[8]);
    expect(hourly.arrival[8]).toBeLessThan(active.arrival[8]);
    // But not so much sooner that the game belongs to whoever has the most free time.
    expect(hourly.arrival[8]).toBeGreaterThan(casual.arrival[8] / 3);
  });

  it('never pays less for being away', () => {
    // 入定 is a bonus and is written as one: the multiplier starts at 1 and climbs. No
    // call of advance() can pay below the rate the game promises, whatever is passed in.
    expect(focusAt(0)).toBe(1);
    expect(focusAt(-9999)).toBe(1);
    expect(focusAt(FOCUS_RAMP)).toBe(FOCUS_MAX);
    // And it ends. A multiplier that simply held would be farmed by leaving the phone
    // on a charger, and the game would be trivialised without a decision being made.
    expect(focusAt(FOCUS_HOLD - 1)).toBe(FOCUS_MAX);
    expect(focusAt(FOCUS_HOLD)).toBe(1);
    expect(focusAt(FOCUS_HOLD * 100)).toBe(1);

    const s: State = { ...newState(T0), realm: 4, layer: 3 };
    const away = advance(s, T0 + 3600);
    const there = advance(s, T0 + 3600, false, FOCUS_MAX);
    const absurd = advance(s, T0 + 3600, false, -5);
    expect(there.qi).toBeCloseTo(away.qi * FOCUS_MAX, 4);
    expect(absurd.qi).toBeCloseTo(away.qi, 6);
    console.log(`  an hour away pays ${num(away.qi)} qi · the same hour watched pays ` +
      `${num(there.qi)} · ${FOCUS_MAX}x, and never less than 1x\n`);
  });

  it('pays a tower floor in hours of gathering, once and never again', () => {
    const s: State = { ...newState(T0), realm: 5, layer: 4, tower: 30, materials: 0 };
    const won = clearFloor(s, 31);
    const hours = (won.qi - s.qi) / rate(s) / 3600;
    console.log(`  tower floor 31 pays ${num(won.qi - s.qi)} qi — ${hours.toFixed(1)} hours of ` +
      `this cultivator's own gathering — and ${num(won.materials)} 材`);
    expect(hours).toBeGreaterThan(1);
    expect(won.materials).toBeGreaterThan(0);
    // The same floor a second time pays nothing: there is no floor to farm.
    expect(clearFloor(won, 31)).toBe(won);
    expect(clearFloor(won, 30)).toBe(won);
  });

  /**
   * 吸 And it pays for the fight, not for the sweep.
   *
   * 塔 opens at the fifth realm, so a cultivator arriving there has a back catalogue of
   * forty-odd trivial floors waiting. Paid flat, that first sitting was worth **ten days
   * and eighteen hours** of gathering — measured — which made the fifth realm the
   * shortest in the whole run, shorter than the fourth. A reward for opening a system is
   * right; a reward that rewrites the curve is not.
   */
  it('pays a floor for how much of a fight it was', () => {
    const mighty: State = {
      ...newState(T0), realm: 9, layer: 8, tower: 0,
      levels: { technique: 54, method: 54, pills: 54, cores: 54 },
    };
    const trivial = floorQi(mighty, 1);
    const real = floorQi(mighty, 80);
    const full = rate(mighty) * 3600 * TOWER_QI_HOURS;
    console.log(`  the same cultivator is paid ${num(real)} qi for a floor at their own power ` +
      `and ${num(trivial)} for the first floor in the tower\n`);

    expect(real).toBeCloseTo(full * Math.min(1, floorPower(80) / power(mighty)), 4);
    expect(trivial).toBeLessThan(real / 1000);
    // A floor at or above your power is always worth the whole six hours.
    expect(floorQi({ ...newState(T0), realm: 5, layer: 4 }, 60)).toBeCloseTo(
      rate({ ...newState(T0), realm: 5, layer: 4 }) * 3600 * TOWER_QI_HOURS, 4);
  });

  it('gives the furnace and the tower to a fighter, and neither to a waiter', () => {
    const [waiter, , , active] = runs;
    expect(waiter.state.tower).toBe(0);
    expect(pillsTaken(waiter.state.brewed)).toBe(0);
    expect(waiter.state.levels.cores).toBe(0);
    expect(active.state.tower).toBeGreaterThan(50);
    expect(active.state.levels.cores).toBeGreaterThan(0);
  });
});
