import { describe, expect, it } from 'vitest';
import { BEDS, HERBS } from '../../data/herbs.ts';
import {
  canPlant, grown, harvest, harvestAll, harvestValue, isRipe, leftOn, plant, plantable,
  ripeCount, seedCost,
} from '../cave.ts';
import { newState, validate, type State } from '../state.ts';
import { duration } from '../format.ts';

const T0 = 1_700_000_000;
const HOUR = 3600;

/** A cultivator standing in a realm where the cave is open, with material to spend. */
const digger = (over: Partial<State> = {}): State => ({
  ...newState(T0), realm: 3, layer: 4, qi: 1000, materials: 100_000,
  at: T0, startedAt: T0 - 30 * 86_400, ...over,
} as State);

/**
 * 洞天 Three beds, and the two promises the whole thing rests on.
 *
 * A bed is a key and an instant, and everything else is derived from the two. That is
 * what makes a save shut for a week come back to three ripe beds rather than to three
 * beds that stopped, and it is what makes a ripe one wait for ever.
 */
describe('洞天 the cave', () => {
  it('ripens on the clock in the state, with nothing ticking', () => {
    const h = HERBS[0];
    let s = plant(digger(), 0, h.key);
    expect(s.beds[0].herb).toBe(h.key);
    expect(grown(s, s.beds[0])).toBe(0);

    // Halfway is halfway, and it is read rather than counted up to.
    const half = { ...s, at: T0 + (h.hours * HOUR) / 2 };
    expect(grown(half, half.beds[0])).toBeCloseTo(0.5, 5);
    expect(isRipe(half, half.beds[0])).toBe(false);

    const done = { ...s, at: T0 + h.hours * HOUR };
    expect(grown(done, done.beds[0])).toBe(1);
    expect(isRipe(done, done.beds[0])).toBe(true);
    expect(leftOn(done, done.beds[0])).toBe(0);
  });

  /** 待 The promise that makes a twelve-hour herb a decision instead of a risk. */
  it('never takes anything away for being late', () => {
    const h = HERBS[2];
    const s = plant(digger(), 1, h.key);
    const late = { ...s, at: T0 + 30 * 86_400 };          // a month later
    expect(isRipe(late, late.beds[1])).toBe(true);
    expect(grown(late, late.beds[1])).toBe(1);
    // And it is worth exactly what it was worth the moment it ripened.
    const onTime = { ...s, at: T0 + h.hours * HOUR };
    expect(harvestValue(late, h)).toBe(harvestValue(onTime, h));
  });

  it('charges the seed on planting and pays the qi on taking', () => {
    const h = HERBS[1];
    const before = digger();
    const cost = seedCost(before, h);
    const planted = plant(before, 0, h.key);
    expect(planted.materials).toBe(before.materials - cost);
    expect(planted.qi).toBe(before.qi);                    // planting pays nothing

    const ripe = { ...planted, at: T0 + h.hours * HOUR };
    const taken = harvest(ripe, 0);
    expect(taken.qi).toBe(ripe.qi + harvestValue(ripe, h));
    expect(taken.beds[0].herb).toBeNull();
    expect(taken.reaped).toBe(1);
  });

  it('refuses a bed in use, an unripe bed, a herb from a later realm and a seed unpaid for', () => {
    const h = HERBS[0];
    const s = plant(digger(), 0, h.key);
    expect(canPlant(s, 0, h.key)).toBe(false);             // that bed is in use
    expect(harvest(s, 0)).toBe(s);                         // and it is not ripe

    // 龍血草 is a third realm herb, so the second realm cannot plant it.
    const second = digger({ realm: 2 });
    expect(plantable(second).some((x) => x.key === 'dragonblood')).toBe(false);
    expect(canPlant(second, 0, 'dragonblood')).toBe(false);

    const broke = digger({ materials: 0 });
    expect(canPlant(broke, 0, h.key)).toBe(false);
    expect(plant(broke, 0, h.key)).toBe(broke);

    // And the cave is shut in the first realm.
    const first = digger({ realm: 1 });
    expect(canPlant(first, 0, h.key)).toBe(false);
    expect(ripeCount(first)).toBe(0);
  });

  it('takes every ripe bed at once and leaves the rest standing', () => {
    let s = digger();
    s = plant(s, 0, HERBS[0].key);                          // 2 hours
    s = plant(s, 1, HERBS[2].key);                          // 12 hours
    const after = { ...s, at: T0 + 3 * HOUR };
    expect(ripeCount(after)).toBe(1);
    const reaped = harvestAll(after);
    expect(reaped.beds[0].herb).toBeNull();
    expect(reaped.beds[1].herb).toBe(HERBS[2].key);
    expect(reaped.reaped).toBe(1);
  });

  it('rebuilds a forged set of beds rather than trusting it', () => {
    const s = validate({
      ...newState(T0), startedAt: T0 - 86_400, at: T0,
      beds: [
        { herb: 'no-such-herb', at: T0 },                   // nobody
        { herb: 'moss', at: T0 + 99 * 86_400 },             // planted tomorrow
        { herb: 'moss', at: 0 },                            // planted before they existed
        { herb: 'moss', at: T0 },                           // a fourth bed
      ],
    }, T0);
    expect(s.beds.length).toBe(BEDS);
    expect(s.beds[0].herb).toBeNull();
    expect(s.beds[1].at).toBeLessThanOrEqual(T0);
    expect(s.beds[2].at).toBeGreaterThanOrEqual(T0 - 86_400);
  });

  /**
   * 換 The claim the seed list now makes out loud, held to by a test.
   *
   * Bruno asked to understand what kind of gains the cave pays, and the answer the
   * screen gives is a rate: what a herb ripens into, and what that is an hour. The
   * design behind it is that the longer herb is the better rate and the shorter one
   * only wins if you really are coming back, so if that ever stops being true the
   * screen starts lying and this test is what catches it.
   */
  it('pays a better rate the longer the herb, which is what the seed list says', () => {
    const s = digger({ realm: 9 });
    const rates = HERBS.map((h) => ({
      hours: h.hours, perHour: harvestValue(s, h) / h.hours, cost: seedCost(s, h),
    }));
    const byTime = [...rates].sort((a, b) => a.hours - b.hours);
    for (let i = 1; i < byTime.length; i++) {
      expect(byTime[i].perHour).toBeGreaterThan(byTime[i - 1].perHour);
      expect(byTime[i].cost).toBeGreaterThan(byTime[i - 1].cost);
    }
  });

  /** 時 And the value is settled when it is taken, which is what the screen says. */
  it('pays at the rate you are on when you take it, never the one you planted at', () => {
    const early = digger({ realm: 3 });
    const late = digger({ realm: 6, levels: { technique: 20, method: 20, pills: 20, cores: 20 } });
    expect(harvestValue(late, HERBS[0])).toBeGreaterThan(harvestValue(early, HERBS[0]));
  });

  /**
   * 進 The formatter carried wrong and the cave is what landed on it: four hours less a
   * few seconds read as "3h 60min" on a real bed, and a day less a few minutes reads as
   * "1d 24h" the same way.
   */
  it('never says sixty minutes past an hour', () => {
    for (let s = 0; s <= 3 * 86_400; s += 7) {
      const out = duration(s);
      expect(out, `${s}s`).not.toMatch(/\b60min\b/);
      expect(out, `${s}s`).not.toMatch(/\b60 min\b/);
      expect(out, `${s}s`).not.toMatch(/\b24h\b/);
      expect(out, `${s}s`).not.toMatch(/\b60s\b/);
    }
  });
});
