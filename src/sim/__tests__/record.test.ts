import { describe, expect, it } from 'vitest';
import { BEASTS, commonsOf } from '../../data/bestiary.ts';
import {
  KNOWN_MATERIAL, MARKS, MARK_INFO, MASTERED_POWER, hasMarkLeft, marksOf, nextMark,
  recordCeiling, recordMaterial, recordPower, recordTally,
} from '../record.ts';
import { newState, power, rate, type State } from '../state.ts';
import { lootTaken } from '../trials.ts';
import { loot } from '../combat.ts';
import { num } from '../format.ts';

const T0 = 1_700_000_000;

const all = (kills: number) =>
  Object.fromEntries(BEASTS.map((b) => [b.key, kills])) as Record<string, number>;

describe('錄 the record', () => {
  it('prints what a finished record is worth, and keeps it modest', () => {
    const ceiling = recordCeiling();
    console.log(`\n  錄 ${BEASTS.length} beasts, ${MARKS.length} marks each:\n` +
      MARK_INFO.map((m, i) => `    ${m.han} ${m.name.padEnd(9)} at ${String(MARKS[i]).padStart(3)} kills — ${m.pays}`).join('\n') +
      `\n  a finished record: ×${ceiling.material.toFixed(2)} 材 and ×${ceiling.power.toFixed(2)} 力\n`);

    // Worth having, never worth more than the systems it sits beside. A full record is
    // about three levels of 劍訣 of power, earned over months of hunting.
    expect(ceiling.power).toBeGreaterThan(1.3);
    expect(ceiling.power).toBeLessThan(2.5);
    expect(ceiling.material).toBeGreaterThan(1.3);
    expect(ceiling.material).toBeLessThan(2.5);
  });

  it('counts marks the way the screen draws them', () => {
    expect(marksOf(0)).toBe(0);
    expect(marksOf(1)).toBe(1);
    expect(marksOf(9)).toBe(1);
    expect(marksOf(10)).toBe(2);
    expect(marksOf(99)).toBe(2);
    expect(marksOf(100)).toBe(3);
    expect(marksOf(1e9)).toBe(3);

    expect(nextMark(0)).toEqual({ at: 1, index: 0 });
    expect(nextMark(10)).toEqual({ at: 100, index: 2 });
    expect(nextMark(100)).toBeNull();
    expect(hasMarkLeft({ rat: 100 }, commonsOf(1)[0])).toBe(false);
    expect(hasMarkLeft({}, commonsOf(1)[0])).toBe(true);
  });

  it('tallies the whole bestiary, and pays only at the marks', () => {
    expect(recordTally({})).toEqual([0, 0, 0]);
    expect(recordTally(all(1))).toEqual([BEASTS.length, 0, 0]);
    expect(recordTally(all(10))).toEqual([BEASTS.length, BEASTS.length, 0]);
    expect(recordTally(all(100))).toEqual([BEASTS.length, BEASTS.length, BEASTS.length]);

    // 見 pays nothing: it is the page filling in, not a bonus.
    expect(recordMaterial(all(1))).toBe(1);
    expect(recordPower(all(1))).toBe(1);
    expect(recordPower(all(10))).toBe(1);
    expect(recordMaterial(all(10))).toBeCloseTo(1 + KNOWN_MATERIAL * BEASTS.length, 6);
    expect(recordPower(all(100))).toBeCloseTo(1 + MASTERED_POWER * BEASTS.length, 6);
  });

  it('pays in material and power, and never in qi per second', () => {
    const bare: State = { ...newState(T0), realm: 5, layer: 4 };
    const full: State = { ...bare, killed: all(100) };

    // The rule the whole economy stands on. A record is a hundred taps a beast, so if it
    // touched the rate it would be the one uncapped thing that pays for waiting.
    expect(rate(full)).toBe(rate(bare));
    expect(power(full)).toBeGreaterThan(power(bare));
    expect(lootTaken(full, 100)).toBeGreaterThan(lootTaken(bare, 100));

    const b = commonsOf(5)[2];
    console.log(`  ${b.han} pays ${num(lootTaken(bare, loot(b)))} 材 with no record, ` +
      `${num(lootTaken(full, loot(b)))} 材 with a finished one, ` +
      `and the qi rate is ${num(rate(bare))}/s either way\n`);
  });

  it('cannot be claimed by a save that never fought', async () => {
    const { validate } = await import('../state.ts');
    const forged = { ...newState(T0), v: 1, killed: { rat: 1e9, notabeast: 500 } };
    const held = validate(forged, T0 + 10);
    // A beast that does not exist is not a kill, and the ones that do are honoured —
    // there is nothing to cheat here that is not already a hundred taps.
    expect(held.killed.notabeast).toBeUndefined();
    expect(marksOf(held.killed.rat)).toBe(MARKS.length);
  });
});
