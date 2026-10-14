import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  CLOSED_TEST, CLOSED_TEST_REFUSED, closedTest, importSave, keepFromAccount, load, rearm, wipe,
} from '../save.ts';
import { bringBack } from '../../net/closedtest.ts';
import { SEASON, SEASON_START } from '../season.ts';
import { newState } from '../state.ts';
import { isSealed, open, seal } from '../seal.ts';

/**
 * 舊 The closed-test cultivator brought back from the account (Bruno, 2026-10-14, option 1).
 * The server half (closed_test_mine(), only the caller's own copy) is held by schema.test.ts;
 * this holds the game's half: when it asks, what it keeps, and that it never writes over a
 * copy this device already has.
 */

const DAY = 86_400;
const BEFORE = SEASON_START - 3 * DAY;
const AFTER = SEASON_START + 3600;

function memoryStorage() {
  const map = new Map<string, string>();
  return {
    map,
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => { map.set(k, v); },
    removeItem: (k: string) => { map.delete(k); },
    clear: () => map.clear(),
    key: (i: number) => [...map.keys()][i] ?? null,
    get length() { return map.size; },
  };
}

let store = memoryStorage();
beforeEach(() => {
  store = memoryStorage();
  (globalThis as { localStorage?: unknown }).localStorage = store;
  rearm();
});

/** A closed-test cultivator as the server keeps it: the save as the phone sent it, no season. */
function veteran(realm = 9, layer = 3): Record<string, unknown> {
  const s = { ...newState(BEFORE - 60 * DAY), at: BEFORE, realm, layer, qi: 1e6 } as Record<string, unknown>;
  delete s.season;
  return s;
}

const answer = (save: unknown) => vi.fn(async () => ({ save, at: '2026-10-25T21:00:00Z' }));

describe('舊 the closed-test copy, from the account', () => {
  it('asks nothing before the switch', async () => {
    const ask = answer(veteran());
    expect(await bringBack(BEFORE, true, ask)).toBeNull();
    expect(ask).not.toHaveBeenCalled();
    expect(store.map.size).toBe(0);
    // and keeps nothing, even if a copy were handed to it
    expect(keepFromAccount(veteran(), BEFORE)).toBeNull();
    expect(store.getItem(CLOSED_TEST)).toBeNull();
  });

  it('asks nothing while signed out', async () => {
    const ask = answer(veteran());
    expect(await bringBack(AFTER, false, ask)).toBeNull();
    expect(ask).not.toHaveBeenCalled();
    expect(store.map.size).toBe(0);
  });

  it('keeps it once, sealed, as a retired save is kept, and says it came from the account', async () => {
    const ask = answer(veteran(9, 3));
    const got = await bringBack(AFTER, true, ask);
    expect(ask).toHaveBeenCalledTimes(1);
    expect(got).toMatchObject({ realm: 9, layer: 4, kept: true, where: 'account' });
    const text = store.getItem(CLOSED_TEST)!;
    expect(isSealed(text)).toBe(true);
    expect(JSON.parse(open(text).json!)).toEqual(veteran(9, 3));
    // Read back as any kept copy is, for the card and Menu, Save.
    expect(closedTest(AFTER)).toMatchObject({ realm: 9, where: 'account' });
    // The copy a player takes out is the save export, refused as play like any closed-test copy.
    expect(importSave(got!.text, AFTER).error).toBe(CLOSED_TEST_REFUSED);
    // Asked again (Menu, Save opened), the device already holds it: nothing is asked or written.
    const again = answer(veteran(9, 8));
    expect(await bringBack(AFTER, true, again)).toBeNull();
    expect(again).not.toHaveBeenCalled();
    expect(store.getItem(CLOSED_TEST)).toBe(text);
  });

  it('never writes over a copy this device kept', async () => {
    const mine = seal(JSON.stringify(veteran(4, 1)));
    store.setItem(CLOSED_TEST, mine);
    const ask = answer(veteran(9, 8));
    expect(await bringBack(AFTER, true, ask)).toBeNull();
    expect(ask).not.toHaveBeenCalled();
    // Not even when handed one directly, and not even a deeper one.
    expect(keepFromAccount(veteran(9, 8), AFTER)).toBeNull();
    expect(store.getItem(CLOSED_TEST)).toBe(mine);
    expect(closedTest(AFTER)).toMatchObject({ realm: 4, where: 'device' });
  });

  it('keeps nothing when the account has none, cannot be reached, or hands back a season save', async () => {
    expect(await bringBack(AFTER, true, vi.fn(async () => null))).toBeNull();
    expect(await bringBack(AFTER, true, vi.fn(async () => { throw new Error('offline'); }))).toBeNull();
    const season = { ...newState(SEASON_START + 60), season: SEASON };
    expect(await bringBack(AFTER, true, answer(season))).toBeNull();
    expect(await bringBack(AFTER, true, answer('not a save'))).toBeNull();
    expect(store.getItem(CLOSED_TEST)).toBeNull();
  });

  it('a later retirement of a deeper save on this device takes over, and a shallower one leaves it', async () => {
    await bringBack(AFTER, true, answer(veteran(5, 2)));
    // A shallower closed-test save turns up on this device: the account's copy stays, and says so.
    store.setItem('ninefold.save.v1', seal(JSON.stringify(veteran(2, 0))));
    expect(load(AFTER).retired).toMatchObject({ realm: 5, where: 'account' });
    expect(closedTest(AFTER)).toMatchObject({ realm: 5, where: 'account' });
    // A deeper one: it is this device's own now.
    rearm();
    store.setItem('ninefold.save.v1', seal(JSON.stringify(veteran(8, 0))));
    expect(load(AFTER).retired).toMatchObject({ realm: 8, where: 'device' });
    expect(closedTest(AFTER)).toMatchObject({ realm: 8, where: 'device' });
  });

  it('滅 Erase leaves the copy the account handed back', async () => {
    await bringBack(AFTER, true, answer(veteran()));
    const text = store.getItem(CLOSED_TEST);
    wipe();
    expect(store.getItem(CLOSED_TEST)).toBe(text);
    expect(closedTest(AFTER)).toMatchObject({ where: 'account' });
  });
});
