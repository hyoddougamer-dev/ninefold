import { describe, expect, it } from 'vitest';
import { STEPS, guide } from '../guide.ts';
import { buy, newState, type State } from '../../sim/state.ts';
import { MARKS } from '../../sim/record.ts';
import { icon } from '../../art/icon.ts';

/**
 * 引 The guide, and the three promises that come from storing nothing.
 *
 * The current step is the first one that is not true yet, computed from the save every
 * time. There is no cursor, so there is nothing to get stuck, nothing to migrate, and
 * nothing that can disagree with the game it is describing.
 */

const T0 = 1_700_000_000;

describe('引 the first session, one step at a time', () => {
  it('starts on the first step and shows how far along it is', () => {
    const g = guide(newState(T0));
    expect(g).not.toBeNull();
    expect(g!.n).toBe(1);
    expect(g!.of).toBe(STEPS.length);
    expect(g!.step.key).toBe('buy');
  });

  /**
   * The property that makes it safe to store nothing: every condition only ever goes
   * from false to true. If one of them could go back — a currency spent, a beast
   * forgotten — the guide would reopen behind the player, on a save that had finished
   * it weeks ago.
   */
  it('never goes backwards, because nothing it asks for can be undone', () => {
    const rich: State = { ...newState(T0), qi: 1e12, materials: 1e12 };
    const after = [
      buy(rich, 'technique'),                                     // a level bought
      { ...rich, killed: { rat: 1 } },                            // a beast killed
      { ...rich, levels: { ...rich.levels, cores: 1 } },          // a core bought
      { ...rich, killed: { rat: MARKS[1] } },                     // a mark earned
      { ...rich, realm: 2 },                                      // a realm climbed
    ];
    for (const [i, s] of after.entries()) {
      expect(STEPS[i].done(s)).toBe(true);
      // And spending everything afterwards does not un-do it.
      expect(STEPS[i].done({ ...s, qi: 0, materials: 0 })).toBe(true);
    }
  });

  it('walks the whole loop in order and then ends for good', () => {
    let s: State = { ...newState(T0), qi: 1e12, materials: 1e12 };
    const order: string[] = [];
    const doIt: ((x: State) => State)[] = [
      (x) => buy(x, 'technique'),
      (x) => ({ ...x, killed: { rat: 1 } }),
      (x) => ({ ...x, levels: { ...x.levels, cores: 1 } }),
      (x) => ({ ...x, killed: { rat: MARKS[1] } }),
      (x) => ({ ...x, realm: 2 }),
    ];
    for (const step of doIt) {
      const g = guide(s);
      expect(g).not.toBeNull();
      order.push(g!.step.key);
      s = step(s);
    }
    console.log(`\n  引 the first session, in order: ${order.join(' → ')} → done\n`);
    expect(order).toEqual(STEPS.map((x) => x.key));
    // And once the last one is done it is gone, and 示 the advice line takes over.
    expect(guide(s)).toBeNull();
  });

  it('is not there at all for a save that is already past it', () => {
    const veteran: State = {
      ...newState(T0), realm: 6, killed: { rat: 400 },
      levels: { technique: 20, method: 20, pills: 20, cores: 20 },
    };
    expect(guide(veteran)).toBeNull();
  });

  /** 尺 The bar the first hour is watched through, and it may not lie in either direction. */
  it('keeps the closing bar between nothing and done', () => {
    const fresh = newState(T0);
    for (const step of STEPS) {
      if (!step.toward) continue;
      expect(step.toward(fresh)).toBeGreaterThanOrEqual(0);
      // A step already finished may read past 1, so the screen clamps; what must never
      // happen is a bar that is full while the step is still asking.
      if (!step.done(fresh)) expect(step.toward(fresh)).toBeLessThan(1);
    }
  });

  it('draws the thing it is asking for', () => {
    for (const step of STEPS) {
      expect(step.art.length).toBeGreaterThan(2);
      expect(icon(step.art, 24)).toContain('<svg');
    }
  });

  it('says something worth reading at every step', () => {
    for (const step of STEPS) {
      expect(step.title.length).toBeGreaterThan(10);
      expect(step.text.length).toBeGreaterThan(60);
      // It is a tutorial for somebody who does not read Chinese: every step's title is
      // in English, and the characters live in the han beside it.
      expect(/[一-鿿]/.test(step.title)).toBe(false);
    }
  });
});
