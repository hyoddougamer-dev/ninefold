import { describe, expect, it } from 'vitest';
import { NODES, PATHS, PATH_INFO, TOTAL_COST, nodesOf } from '../../data/techniques.ts';
import { SLOTS } from '../../data/gear.ts';
import {
  affinity, canUnlock, daoEarned, daoFree, daoSpent, extraChestSlots,
  powerMultiplier, rateMultiplier, validateUnlocked,
} from '../dao.ts';
import { newState, power, rateBonus, type State } from '../state.ts';

/** Everything a whole run can earn: 73 layers and nine wardens. */
const FULL_RUN = daoEarned(73, 9);

describe('道 the tree', () => {
  it('cannot be finished, and prints by how much', () => {
    console.log(`\n  a whole run earns ${FULL_RUN} 道 · the tree costs ${TOTAL_COST} ` +
      `· one branch costs ${nodesOf('sword').reduce((s, n) => s + n.cost, 0)}\n`);
    expect(FULL_RUN).toBeLessThan(TOTAL_COST);
    // But it must be enough for one full branch and a real dip into a second.
    const branch = nodesOf('sword').reduce((s, n) => s + n.cost, 0);
    expect(FULL_RUN).toBeGreaterThan(branch);
    expect(FULL_RUN - branch).toBeGreaterThanOrEqual(8);
  });

  it('gives every path the same price and the same shape', () => {
    expect(NODES.length).toBe(24);
    for (const path of PATHS) {
      const nodes = nodesOf(path);
      expect(nodes.length).toBe(8);
      expect(nodes.map((n) => n.tier)).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
      expect(nodes.reduce((s, n) => s + n.cost, 0)).toBe(20);
    }
    expect(new Set(NODES.map((n) => n.key)).size).toBe(NODES.length);
  });

  it('will not sell a node whose requirement is missing', () => {
    expect(canUnlock('opening', [], 99)).toBe(true);
    expect(canUnlock('edge', [], 99)).toBe(false);          // needs 起手 above it
    expect(canUnlock('edge', ['opening'], 99)).toBe(true);
    expect(canUnlock('opening', ['opening'], 99)).toBe(false); // already taken
    expect(canUnlock('opening', [], 0)).toBe(false);        // no points
  });

  it('counts points spent and left over', () => {
    const taken = ['opening', 'edge', 'chain'];
    expect(daoSpent(taken)).toBe(1 + 1 + 2);
    expect(daoFree(73, 9, taken)).toBe(FULL_RUN - 4);
  });

  it('prints what a finished branch is worth', () => {
    const rows = PATHS.map((path) => {
      const keys = nodesOf(path).map((n) => n.key);
      const slots = SLOTS.map((s) => `${s} ×${affinity(keys, s).toFixed(2)}`)
        .filter((x) => !x.endsWith('×1.00'));
      return `  ${PATH_INFO[path].han} ${PATH_INFO[path].name.padEnd(11)} ` +
        `力 ×${powerMultiplier(keys).toFixed(2)}  氣 ×${rateMultiplier(keys).toFixed(2)}` +
        `  chest +${extraChestSlots(keys)}` +
        (slots.length ? `  · ${slots.join(', ')}` : '');
    });
    console.log(`\n  a branch taken to the end:\n${rows.join('\n')}\n`);

    expect(powerMultiplier(nodesOf('sword').map((n) => n.key))).toBeGreaterThan(2);
    expect(rateMultiplier(nodesOf('spirit').map((n) => n.key))).toBeGreaterThan(2);
    expect(extraChestSlots(nodesOf('fortune').map((n) => n.key))).toBe(20);
  });

  it('nothing is locked away — every path can wear every slot', () => {
    for (const path of PATHS) {
      const keys = nodesOf(path).map((n) => n.key);
      for (const slot of SLOTS) expect(affinity(keys, slot)).toBeGreaterThanOrEqual(1);
    }
  });

  it('moves the cultivator', () => {
    const bare = newState(0);
    const swordsman: State = { ...bare, unlocked: nodesOf('sword').map((n) => n.key) };
    const monk: State = { ...bare, unlocked: nodesOf('spirit').map((n) => n.key) };
    expect(power(swordsman)).toBeGreaterThan(power(bare) * 2);
    expect(rateBonus(monk)).toBeGreaterThan(rateBonus(bare) * 2);
    expect(power(monk)).toBeCloseTo(power(bare), 6);   // 神 buys no power at all
  });

  it('a save cannot hold a node without the ones above it', () => {
    expect(validateUnlocked(['tenthousand'])).toEqual([]);
    expect(validateUnlocked(['opening', 'chain'])).toEqual(['opening']);   // 鋒 is missing
    expect(validateUnlocked(['opening', 'edge', 'breathing']))
      .toEqual(['opening', 'edge', 'breathing']);
    expect(validateUnlocked(['opening', 'opening'])).toEqual(['opening']);
    expect(validateUnlocked(['nonsense', 42, null])).toEqual([]);
  });
});
