import { describe, expect, it } from 'vitest';
import { SECOND, STEPS, guide } from '../guide.ts';
import { buy, newState, type State } from '../../sim/state.ts';
import { MARKS } from '../../sim/record.ts';
import { LAYERS_PER_REALM } from '../../sim/balance.ts';
import { icon } from '../../art/icon.ts';
import { untouched } from '../../sim/save.ts';

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
    expect(g!.step.key).toBe('kill');
  });

  /**
   * The property that makes it safe to store nothing: every condition only ever goes
   * from false to true. If one of them could go back (a currency spent, a beast
   * forgotten) the guide would reopen behind the player, on a save that had finished
   * it weeks ago.
   */
  it('never goes backwards, because nothing it asks for can be undone', () => {
    const rich: State = { ...newState(T0), qi: 1e12, materials: 1e12 };
    const after = [
      { ...rich, killed: { rat: 1 } },                            // a beast killed
      buy(rich, 'technique'),                                     // a level bought
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
      (x) => ({ ...x, killed: { rat: 1 } }),
      (x) => buy(x, 'technique'),
      (x) => ({ ...x, levels: { ...x.levels, cores: 1 } }),
      (x) => ({ ...x, killed: { rat: MARKS[1] } }),
      (x) => ({ ...x, realm: 2 }),
      // 二 The second realm's three.
      (x) => ({ ...x, worn: { weapon: { id: 'w', template: 'sword2', rarity: 'common', rolls: [] } } } as State),
      (x) => ({ ...x, unlocked: ['root'] }),
      (x) => ({ ...x, stance: 'swift' }),
    ];
    for (const step of doIt) {
      const g = guide(s);
      expect(g).not.toBeNull();
      order.push(g!.step.key);
      s = step(s);
    }
    console.log(`\n  引 the first session, in order: ${order.join(' → ')} → done\n`);
    expect(order).toEqual([...STEPS, ...SECOND].map((x) => x.key));
    // And once the last one is done it is gone, and 示 the advice line takes over.
    expect(guide(s)).toBeNull();
  });

  /**
   * 急 The bug this exists to stop, found by playing the first realm end to end: the
   * guide sat on "kill the same beast ten times" while the cultivator stood at nine
   * layers of nine with a warden in front of them and a quarter of a million qi banked.
   * It held them there for nineteen hours of game time.
   */
  it('points at the warden the moment the realm is full, whatever step it was on', () => {
    const full: State = {
      ...newState(T0), layer: LAYERS_PER_REALM - 1, qi: 1e9,
      levels: { technique: 1, method: 0, pills: 0, cores: 1 },
      killed: { rat: 1 },
    };
    // Without the exception this is the fourth step, because ten kills are not in yet.
    expect(STEPS.findIndex((x) => !x.done(full))).toBe(3);
    const g = guide(full);
    expect(g!.step.key).toBe('climb');
    expect(g!.n).toBe(STEPS.length);

    // And nothing is skipped: put the warden down without climbing and it goes back.
    const beaten = { ...full, wardenFell: true };
    expect(guide(beaten)!.step.key).toBe('mark');
  });

  it('is not there at all for a save that is already past it', () => {
    const veteran: State = {
      ...newState(T0), realm: 6, killed: { rat: 400 },
      levels: { technique: 20, method: 20, pills: 20, cores: 20 },
      worn: { weapon: { id: 'w', template: 'sword5', rarity: 'mystic', rolls: [] } } as State['worn'],
      unlocked: ['root', 'edge'], stance: 'swift',
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

/**
 * 引 And the screen that opens before it.
 *
 * The help is for somebody who has not begun, and it decided that with "qi under five".
 * 囊 the opening purse starts a cultivator on 800, so the condition quietly went false
 * and the help stopped appearing for new players: the one audience it exists for.
 * Nothing failed, nothing logged, and it would have gone unnoticed indefinitely.
 */
describe('引 who the first screen is for', () => {
  it('counts a brand-new cultivator as new, purse and all', () => {
    const fresh = newState(T0);
    expect(fresh.qi).toBeGreaterThan(5);
    expect(untouched(fresh)).toBe(true);
  });

  it('counts anyone who has done anything at all as begun', () => {
    const fresh = newState(T0);
    const begun: State[] = [
      buy({ ...fresh, qi: 1e9 }, 'technique'),
      { ...fresh, killed: { rat: 1 } },
      { ...fresh, layer: 1 },
      { ...fresh, realm: 2 },
      { ...fresh, tower: 1 },
      { ...fresh, qi: fresh.qi + 1 },
    ];
    for (const s of begun) expect(untouched(s)).toBe(false);
  });
});
