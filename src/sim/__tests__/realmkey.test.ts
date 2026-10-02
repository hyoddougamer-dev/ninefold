import { describe, expect, it } from 'vitest';
import { REALM_KEY, RECIPE_BY_KEY } from '../../data/crafts.ts';
import { canEnter, canUseKey, doorGap, enter, keyDayOf, leave, useKey } from '../secret.ts';
import { newState, validate, type State } from '../state.ts';

const T0 = 1_700_000_000;
/** A cultivator at the third realm who has just walked out of the vault. */
const justOut = (keys: number, at = T0 + 10 * 86_400): State => {
  const s: State = { ...newState(T0), realm: 3, layer: 4, at, runAt: at, runStep: -1 };
  return { ...s, crafts: { ...s.crafts, pouch: keys ? { [REALM_KEY]: keys } : {} } };
};

/**
 * 鑰 The Realm Key. rekaris asked to force the way into 秘境. A key the forge makes opens
 * the shut door, and the door takes one a day: the one-a-day is in the save, capped by
 * validate(), never left to how scarce the recipe is.
 */
describe('鑰 the Realm Key', () => {
  it('is made in the forge from the third realm', () => {
    const r = RECIPE_BY_KEY[`forge:${REALM_KEY}`];
    expect(r?.skill).toBe('forge');
    expect(r?.realm).toBe(3);
  });

  it('opens a shut door, spends the key, and lets the walk begin', () => {
    const s = justOut(2);
    expect(canEnter(s)).toBe(false);
    expect(canUseKey(s)).toBe(true);
    const k = useKey(s);
    expect(canEnter(k)).toBe(true);
    expect(k.crafts.pouch[REALM_KEY]).toBe(1);
    expect(k.keyDay).toBe(keyDayOf(s.at));
    expect(k.runAt).toBe(s.at - doorGap(s));
    expect(enter(k).runStep).toBe(0);
  });

  it('works once a day, however many are held', () => {
    let s = useKey(justOut(3));
    s = leave({ ...enter(s), runStep: 0 });
    expect(canEnter(s)).toBe(false);
    expect(canUseKey(s)).toBe(false);
    expect(useKey(s)).toBe(s);
    const tomorrow = { ...s, at: (keyDayOf(s.at) + 1) * 86_400 + 60, runAt: (keyDayOf(s.at) + 1) * 86_400 + 60 };
    expect(canUseKey(tomorrow)).toBe(true);
  });

  it('does nothing without a key, with the door open, or below the third realm', () => {
    expect(canUseKey(justOut(0))).toBe(false);
    const open = { ...justOut(1), runAt: 0 };
    expect(canUseKey(open)).toBe(false);
    expect(canUseKey({ ...justOut(1), realm: 2 })).toBe(false);
  });

  it('keeps its day through a save, never a day ahead of the clock', () => {
    const s = useKey(justOut(1));
    const back = validate(JSON.parse(JSON.stringify(s)), s.at + 60);
    expect(back.keyDay).toBe(s.keyDay);
    const forged = validate({ ...JSON.parse(JSON.stringify(s)), keyDay: 9e9 }, s.at + 60);
    expect(forged.keyDay).toBeLessThanOrEqual(keyDayOf(s.at + 60));
    const old = JSON.parse(JSON.stringify(s));
    delete old.keyDay;
    expect(validate(old, s.at + 60).keyDay).toBe(0);
  });
});
