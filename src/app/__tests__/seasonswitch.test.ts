import { beforeEach, describe, expect, it } from 'vitest';
import { RELOADED, rearmSwitch, reloadIfRetired } from '../seasonSwitch.ts';
import { SEASON_START } from '../../sim/season.ts';
import { newState } from '../../sim/state.ts';

/**
 * 開山 A game left open across the switch reloads into the season card, once. The audit of
 * 16 October found such a tab playing its closed-test cultivator for ever, writing nothing and
 * told by Ranks to check a clock that was right. tools/shot-founding.mjs drives the built game
 * across the switch; this holds the rule itself.
 */

function memoryStorage(broken = false) {
  const map = new Map<string, string>();
  return {
    map,
    getItem: (k: string) => { if (broken) throw new Error('SecurityError'); return map.get(k) ?? null; },
    setItem: (k: string, v: string) => { if (broken) throw new Error('QuotaExceededError'); map.set(k, v); },
    removeItem: (k: string) => { map.delete(k); },
  };
}

const closedTest = () => {
  const s = { ...newState(SEASON_START - 30 * 86_400) } as Record<string, unknown>;
  delete s.season;
  return s;
};
const seasonal = () => newState(SEASON_START + 60);

let store = memoryStorage();
beforeEach(() => {
  store = memoryStorage();
  (globalThis as { sessionStorage?: unknown }).sessionStorage = store;
  rearmSwitch();
});

describe('開山 the switch reaches a game that is already open', () => {
  it('does nothing before the switch', () => {
    let reloads = 0;
    expect(reloadIfRetired(closedTest(), SEASON_START - 1, () => reloads++)).toBe(false);
    expect(reloads).toBe(0);
  });

  it('reloads a closed-test cultivator the second the season begins', () => {
    let reloads = 0;
    expect(reloadIfRetired(closedTest(), SEASON_START, () => reloads++)).toBe(true);
    expect(reloads).toBe(1);
    expect(store.map.get(RELOADED)).toBe(String(SEASON_START));
  });

  it('never reloads a season cultivator', () => {
    let reloads = 0;
    for (let t = 0; t < 10; t++) reloadIfRetired(seasonal(), SEASON_START + 3600 * t, () => reloads++);
    expect(reloads).toBe(0);
  });

  it('asks once a page: five ticks a second do not reload five times', () => {
    let reloads = 0;
    for (let i = 0; i < 50; i++) reloadIfRetired(closedTest(), SEASON_START + i / 5, () => reloads++);
    expect(reloads).toBe(1);
  });

  it('reloads once a tab: a reload that brought the old cultivator back does not loop', () => {
    let reloads = 0;
    reloadIfRetired(closedTest(), SEASON_START + 1, () => reloads++);
    // The reload is a new page: the module flag is gone, the tab's mark is not.
    rearmSwitch();
    expect(reloadIfRetired(closedTest(), SEASON_START + 3, () => reloads++)).toBe(false);
    expect(reloads).toBe(1);
  });

  it('a device that cannot keep the mark never reloads, rather than loop', () => {
    (globalThis as { sessionStorage?: unknown }).sessionStorage = memoryStorage(true);
    let reloads = 0;
    expect(reloadIfRetired(closedTest(), SEASON_START + 1, () => reloads++)).toBe(false);
    rearmSwitch();
    expect(reloadIfRetired(closedTest(), SEASON_START + 2, () => reloads++)).toBe(false);
    expect(reloads).toBe(0);
  });
});
