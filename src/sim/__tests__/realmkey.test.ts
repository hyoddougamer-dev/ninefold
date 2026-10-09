import { describe, expect, it } from 'vitest';
import { REALM_KEY, RECIPE_BY_KEY } from '../../data/crafts.ts';
import { KEY_SPRING, SPRING_FILL } from '../balance.ts';
import { canEnter, canUseKey, doorGap, enter, keyDayOf, leave, springNow, useKey } from '../secret.ts';
import { newState, validate, type State } from '../state.ts';
import { verify } from '../verify.ts';

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

  /** 鑰 The day the last key turned only moves forward, so a second key a day cannot be had by winding it back. */
  it('reads a key day wound back as a save gone backwards, never as progress', () => {
    const before = { ...justOut(1), keyDay: 19_700 } as State;
    const after = { ...before, at: before.at + 600, keyDay: 0 } as State;
    expect(verify(before, after, 600).why).toContain('went-down');
    expect(verify(before, { ...after, keyDay: 19_700 }, 600).why).not.toContain('went-down');
  });
});

/** 泉 The key counts the wait as served, and so the spring: it opens on at least KEY_SPRING. */
describe('鑰 the key and the spring', () => {
  it('lifts a thin spring to the floor and leaves a fuller one alone', () => {
    const thin = { ...justOut(1), spring: 600, springAt: T0 + 10 * 86_400 };
    expect(springNow(useKey(thin))).toBe(KEY_SPRING);
    const rich = { ...justOut(1), spring: 20 * 3600, springAt: T0 + 10 * 86_400 };
    expect(springNow(useKey(rich))).toBe(20 * 3600);
    expect(springNow(enter(useKey(thin)))).toBe(KEY_SPRING);
  });

  it('is worth a door gap of fill, 32 minutes of gathering', () => {
    expect(KEY_SPRING * SPRING_FILL).toBe(32 * 60);
  });

  it('is allowed by the server, once a day and no more', () => {
    const a = justOut(3);
    const b = enter(useKey(a));
    const later = (s: State, at: number): State => ({ ...s, at, springAt: at, runAt: at });
    // A walker who leaves at once and is paired a day on: honest.
    const out = leave({ ...b, at: b.at + 600 });
    const next = later(out, a.at + 86_400);
    expect(verify(a, next, 86_400, false, 0).why).not.toContain('too-fast');
  });
});
