import { describe, expect, it } from 'vitest';
import {
  FOCUS_HOLD, FOCUS_MAX, FOCUS_RAMP, LAYERS, LAYER_BONUS, QI_ROOF_TOP, UNCAPPED_RATE_CEILING, focusAt,
  gearQiRate, qiRoof, uncappedRate,
} from '../balance.ts';
import { rateMultiplier } from '../dao.ts';
import { bodyTotals } from '../schools.ts';
import { layersOpened, newState, rate, type State } from '../state.ts';
import { advance } from '../time.ts';
import { HABITS, play } from '../../../tools/habits.ts';
import { clearFloor, floorQi, towerRate } from '../trials.ts';
import { TOWER_QI_BELOW, TOWER_QI_HOURS, TOWER_QI_LEAST } from '../balance.ts';
import { pillsTaken } from '../furnace.ts';
import { num } from '../format.ts';
import { playAll } from '../../../tools/habits.ts';

/**
 * 勤 Five cultivators, one game.
 *
 * This is the file that answers the only question a player actually asks about an idle
 * game: **what does being there buy me?** Before it existed the answer was "almost
 * nothing, and if you use the furnace, less than nothing", measured, somebody playing
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
  /**
   * By name, never by position. These were destructured positionally until a new
   * cultivator was added to the harness, at which point `active` silently became
   * somebody else and the assertions went on passing about the wrong person.
   */
  const who = (name: string) => runs.find((r) => r.habit.name === name)!;

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

    const waiter = who('never fights');
    const barely = who('barely fights');
    const once = who('once a day');
    const casual = who('casual');
    const active = who('active');
    const hourly = who('every hour');

    /**
     * 牆 The wall, built the second time and measured both ways.
     *
     * The first attempt at it was a single dial: 守貢 WARDEN_TRIBUTE, and the sweep
     * killed it: at 0.8 the waiter finished in 142 days and at 0.7 they never finished
     * at all. There is no setting in between, because a core's price climbs by a third
     * each level and a tribute is flat. Bruno asked for a wall that *slows* and does not
     * stop, and a lever with no middle cannot be one.
     *
     * So the middle was built instead: 凝丹 a core can always be forced out of raw qi,
     * at CORE_QI_RUNGS rungs of the climb a level. Nobody is ever stopped, and the
     * exchange rate is a smooth dial, measured across it, the waiter lands on day 171,
     * 188, 217, 253, 316, 392 while every cultivator who fights stays exactly where
     * they were, to the day.
     *
     * These two lines are the whole promise, and they are opposite ends of it:
     * the waiter still finishes, and the waiter pays dearly for it.
     */
    expect(waiter.arrival[8]).toBeDefined();
    expect(waiter.arrival[8]).toBeGreaterThan(once.arrival[8] * 1.5);

    /**
     * 狩 And what the wall actually asks for, which is the part that has to stay small.
     * `barely fights` is the waiter's day exactly: one visit, no tower, no gear, no
     * furnace: plus two beasts before putting the phone down. Two beasts a day is
     * worth about seven weeks of the climb, and that is the whole lesson the wall is
     * there to teach.
     */
    expect(barely.arrival[8]).toBeLessThan(waiter.arrival[8] * 0.85);
    expect(barely.arrival[8]).toBeGreaterThan(once.arrival[8]);

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

    // 囊 Starting qi is set to zero here on purpose: what is being measured is what the
    // *hour* pays, and the opening purse would sit on both sides of the ratio.
    const s: State = { ...newState(T0), realm: 4, layer: 3, qi: 0 };
    const away = advance(s, T0 + 3600);
    const there = advance(s, T0 + 3600, false, FOCUS_MAX);
    const absurd = advance(s, T0 + 3600, false, -5);
    expect(there.qi).toBeCloseTo(away.qi * FOCUS_MAX, 4);
    expect(absurd.qi).toBeCloseTo(away.qi, 6);
    console.log(`  an hour away pays ${num(away.qi)} qi · the same hour watched pays ` +
      `${num(there.qi)} · ${FOCUS_MAX}x, and never less than 1x\n`);
  });

  it('pays a tower floor in hours of gathering, once and never again', () => {
    const s: State = { ...newState(T0), realm: 5, layer: 4, tower: 44, materials: 0 };
    const won = clearFloor(s, 45);
    const hours = (won.qi - s.qi) / rate(s) / 3600;
    console.log(`  tower floor 45 pays ${num(won.qi - s.qi)} qi: ${hours.toFixed(1)} hours of ` +
      `this cultivator's own gathering, and ${num(won.materials)} 材`);
    expect(hours).toBeCloseTo(TOWER_QI_HOURS, 4);
    expect(won.materials).toBeGreaterThan(0);
    // The same floor a second time pays nothing: there is no floor to farm.
    expect(clearFloor(won, 45)).toBe(won);
    expect(clearFloor(won, 44)).toBe(won);
  });

  /**
   * 吸 And it pays for the fight, not for the sweep.
   *
   * 塔 opens at the fifth realm, so a cultivator arriving there has a back catalogue of
   * forty-odd trivial floors waiting. Paid flat, that first sitting was worth **ten days
   * and eighteen hours** of gathering, measured, which made the fifth realm the
   * shortest in the whole run. A reward for opening a system is right; a reward that
   * rewrites the curve is not. So the six hours are paid on your realm's warden floor,
   * every floor below it pays a fifth less, and every floor above it a little less again,
   * down to half (2026-10-04: a geared cultivator beats thirty floors above the warden the
   * day the tower opens, and at six hours each that was half the fifth realm's qi).
   */
  it('pays a floor by where it stands against your realm, and the first floors nothing', () => {
    const mighty: State = {
      ...newState(T0), realm: 9, layer: 8, tower: 0,
      levels: { technique: 54, method: 54, pills: 54, cores: 54 },
    };
    const trivial = floorQi(mighty, 1);
    const real = floorQi(mighty, 81);
    const full = towerRate(mighty) * 3600 * TOWER_QI_HOURS;
    console.log(`  the same cultivator is paid ${num(real)} qi for the ninth realm's warden floor ` +
      `and ${num(trivial)} for the first floor in the tower\n`);

    expect(real).toBeCloseTo(full, 4);
    expect(floorQi(mighty, 200) / (full * TOWER_QI_LEAST)).toBeCloseTo(1, 9);
    expect(floorQi(mighty, 80)).toBeCloseTo(full * TOWER_QI_BELOW, 4);
    expect(trivial).toBeLessThan(real / 1000);
    // The fifth realm's warden floor is worth the whole six hours, and the floors above it
    // less, never under half.
    const fifth = { ...newState(T0), realm: 5, layer: 4 };
    const six = towerRate(fifth) * 3600 * TOWER_QI_HOURS;
    expect(floorQi(fifth, 45)).toBeCloseTo(six, 4);
    expect(floorQi(fifth, 60)).toBeLessThan(six);
    expect(floorQi(fifth, 60)).toBeGreaterThanOrEqual(six * TOWER_QI_LEAST);
  });

  /**
   * 頂 The guard the gear had no version of, and it was the widest hole in the game.
   *
   * The harness never equipped a single piece until now. With the drops picked up and
   * worn, the 氣 axis (a qi-rate multiplier with no cap, earned by hunting) took the
   * active cultivator from day 89 to day 38 and the hourly one to day 20, against a
   * promise of ninety. The law was already written and nothing enforced it: everything
   * that multiplies gathering is behind the realm cap.
   */
  it('lets no amount of gear or tree push the rate past its ceiling', () => {
    const rows = runs.map((r) => {
      const worn = bodyTotals(r.state).rate / 100;
      const tree = rateMultiplier(r.state.unlocked);
      const rung = layersOpened(r.state);
      return { name: r.habit.name, worn, tree, rung, kept: gearQiRate(worn, tree, rung) };
    });
    console.log(`\n  頂 what the uncapped sources ask for, and what they are given `
      + `(ceiling x${UNCAPPED_RATE_CEILING}):\n`
      + rows.map((r) => `    ${r.name.padEnd(13)} 器 氣 +${(r.worn * 100).toFixed(0)}%  道 x${r.tree.toFixed(2)}`
        + `  rung ${r.rung}  roof x${qiRoof(r.rung).toFixed(3)}  keeps x${r.kept.toFixed(3)}`).join('\n') + '\n');

    // A harness that reached nothing passes: every cultivator is in it.
    expect(rows.length).toBe(HABITS.length);
    expect(rows.length).toBeGreaterThanOrEqual(9);
    for (const r of rows) {
      expect(r.kept).toBeLessThan(qiRoof(r.rung));
      expect(r.kept).toBeLessThan(UNCAPPED_RATE_CEILING);
      // And it is a bend, not a wall: more is always worth a little more.
      expect(gearQiRate(r.worn * 1.5 + 0.01, r.tree, r.rung)).toBeGreaterThan(r.kept);
    }
    // Absurd gear cannot break it either, on the last rung with the whole tree.
    expect(gearQiRate(1000, 1.3, LAYERS - 1)).toBeLessThan(QI_ROOF_TOP);
    expect(UNCAPPED_RATE_CEILING).toBe(QI_ROOF_TOP);
    // Nothing worn is the tree alone, exactly as it was before the knee climbed, so the
    // cultivators who wear nothing never moved.
    for (const tree of [1, 1.1, 1.25]) for (const rung of [0, 40, 80]) {
      expect(gearQiRate(0, tree, rung)).toBe(uncappedRate(tree));
    }
    expect(uncappedRate(1)).toBe(1);
  });

  /**
   * 氣膝 The qi knee climbs a ninth of a realm at every rung, and the roof with it. A bend
   * that slid further than the rung's own x1.02 would make the qi rate fall when a layer
   * opens, which is the one moment that is meant to be a reward. Measured before it was
   * built (tools/qicurve.ts): the worst rung rises +1.6%. This walks all eighty, worn 0 to
   * +3000% and trees x1.0 to x1.3, and holds the worst to +1.5%.
   */
  it('raises the qi rate on every rung, whatever is worn', () => {
    let worst = Infinity;
    let checked = 0;
    for (let n = 0; n < LAYERS - 1; n++) {
      for (let w = 0; w <= 3000; w += 10) {
        for (const tree of [1, 1.05, 1.1, 1.15, 1.2, 1.25, 1.3]) {
          const g = w / 100;
          const up = LAYER_BONUS * gearQiRate(g, tree, n + 1) / gearQiRate(g, tree, n);
          worst = Math.min(worst, up);
          checked++;
        }
      }
    }
    console.log(`\n  氣膝 the worst rung, of ${checked}: the qi rate x${worst.toFixed(4)}\n`);
    expect(checked).toBe(80 * 301 * 7);
    expect(worst).toBeGreaterThan(1.015);
  });

  /**
   * 氣膝 And what it was for: a qi roll keeps mattering past the third realm. Before the
   * knee climbed, a tenth more of what a ninth-realm body wears moved its rate by under a
   * tenth of a per cent. Read off every gear habit by name, at the end of the run.
   */
  it('keeps a tenth more qi worth half a per cent at the ninth realm', () => {
    const geared = runs.filter((r) => r.habit.gear);
    expect(geared.length).toBeGreaterThanOrEqual(7);
    const rows = geared.map((r) => {
      const worn = bodyTotals(r.state).rate / 100;
      const tree = rateMultiplier(r.state.unlocked);
      const rung = layersOpened(r.state);
      return { name: r.habit.name, realm: r.state.realm, worn,
        more: gearQiRate(worn * 1.1, tree, rung) / gearQiRate(worn, tree, rung) };
    });
    console.log('\n  氣膝 a tenth more of what is worn, at the end:\n' + rows.map((r) =>
      `    ${r.name.padEnd(13)} realm ${r.realm}  氣 +${(r.worn * 100).toFixed(0)}%  `
      + `+${((r.more - 1) * 100).toFixed(2)}% of the rate`).join('\n') + '\n');
    for (const r of rows) {
      expect(r.realm).toBe(9);
      expect(r.more).toBeGreaterThan(1.005);
    }
  });

  it('gives the furnace and the tower to a fighter, and barely either to a waiter', () => {
    const waiter = who('never fights');
    const active = who('active');
    // A cultivator who never opens 狩 Hunt never climbs a tower floor and never brews a
    // pill: both of those eat material by the sackful, and four wardens a realm do not
    // pay by the sackful.
    expect(waiter.state.tower).toBe(0);
    expect(pillsTaken(waiter.state.brewed)).toBe(0);
    expect(active.state.tower).toBeGreaterThan(50);

    // 妖丹 cores are part of the difference again, and only part of it. 守貢 the
    // tribute stopped a warden from funding the next warden, so a waiter now falls
    // behind on cores as well, but the gap that actually shows is everything else
    // material buys: the tower, the furnace, the gear, none of which a waiter ever
    // touches. It separates them by more than an order of magnitude of power.
    expect(active.power).toBeGreaterThan(waiter.power * 5);
  });
});

/**
 * 器 What the gear is worth, which nothing in this repository had ever measured.
 *
 * The harness equips what it finds. See takeDrop in tools/habits.ts, so the answer is
 * the same climb run twice. It is worth putting a floor under: a silent break in drops,
 * the chest or the set bonuses would otherwise cost days off every curve on the page and
 * show up as nothing at all.
 */
describe('器 what the gear is worth', () => {
  // Four whole climbs. It is the slowest test in the suite and it earns its seconds.
  it('takes real days off the climb, and is printed so it cannot drift', { timeout: 120_000 }, () => {
    const rows = (['active', 'once a day'] as const).map((name) => {
      const h = HABITS.find((x) => x.name === name)!;
      const worn = play(h);
      const bare = play({ ...h, gear: false });
      return { name, worn, bare };
    });
    console.log('\n  器 the same cultivator, with and without what falls:');
    for (const r of rows) {
      console.log(`    ${r.name.padEnd(12)} day ${r.worn.days.toFixed(0).padStart(3)} wearing it` +
        ` · day ${r.bare.days.toFixed(0).padStart(3)} wearing none` +
        ` · ${(r.worn.power / r.bare.power).toFixed(1)}x the power`);
    }
    console.log('');
    for (const r of rows) {
      expect(r.worn.days).toBeLessThan(r.bare.days);
      expect(r.worn.power).toBeGreaterThan(r.bare.power * 2);
    }
  });
});
