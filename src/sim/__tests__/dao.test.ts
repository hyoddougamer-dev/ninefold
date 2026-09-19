import { describe, expect, it } from 'vitest';
import { NODES, NODE_BY_KEY, PATHS, PATH_INFO, TOTAL_COST, nodesOf } from '../../data/techniques.ts';
import { SLOTS } from '../../data/gear.ts';
import {
  affinity, canUnlock, daoEarned, daoFree, daoSpent, extraChestSlots,
  powerMultiplier, rateMultiplier, validateUnlocked,
} from '../dao.ts';
import { newState, power, rateBonus, type State } from '../state.ts';

/** Everything a whole run can earn: 73 layers and nine wardens. */
const FULL_RUN = daoEarned(73, 9);

/**
 * A legal build down one branch: every tier, and exactly one side of the fork.
 *
 * Taking *all* the nodes of a path is not a build — a fork means one or the other — so
 * a test that does it is testing a state the game can never be in.
 */
function branch(path: Parameters<typeof nodesOf>[0], keystone = false): string[] {
  const byTier = new Map<number, typeof NODES[number][]>();
  for (const node of nodesOf(path)) {
    if (!byTier.has(node.tier)) byTier.set(node.tier, []);
    byTier.get(node.tier)!.push(node);
  }
  return [...byTier.entries()].sort((a, b) => a[0] - b[0]).map(([, nodes]) => {
    const pick = nodes.find((x) => (keystone ? x.keystone : !x.keystone)) ?? nodes[0];
    return pick.key;
  });
}

describe('道 the tree', () => {
  it('cannot be finished, and prints by how much', () => {
    console.log(`\n  a whole run earns ${FULL_RUN} 道 · the tree costs ${TOTAL_COST} ` +
      `· one branch costs ${nodesOf('sword').reduce((s, n) => s + n.cost, 0)}\n`);
    expect(FULL_RUN).toBeLessThan(TOTAL_COST);
    // But it must be enough for one full branch and a real dip into a second.
    const oneBranch = branch('sword').reduce((s, k) => s + NODE_BY_KEY[k].cost, 0);
    expect(FULL_RUN).toBeGreaterThan(oneBranch);
    expect(FULL_RUN - oneBranch).toBeGreaterThanOrEqual(8);
  });

  it('gives every path the same price and the same shape, fork included', () => {
    expect(NODES.length).toBe(27);                    // 24 steps plus one keystone each
    for (const path of PATHS) {
      const nodes = nodesOf(path);
      expect(nodes.length).toBe(9);
      // Eight tiers, with two nodes sharing tier 5 — the fork.
      expect(nodes.filter((n) => n.tier === 5)).toHaveLength(2);
      expect(nodes.filter((n) => n.keystone)).toHaveLength(1);
      // Either way down the branch costs the same.
      expect(branch(path).reduce((s, k) => s + NODE_BY_KEY[k].cost, 0)).toBe(20);
      expect(branch(path, true).reduce((s, k) => s + NODE_BY_KEY[k].cost, 0)).toBe(20);
    }
    expect(new Set(NODES.map((n) => n.key)).size).toBe(NODES.length);
  });

  it('will not sell both sides of a fork', () => {
    const upTo5 = branch('sword').slice(0, 5);
    expect(canUnlock('heavyplate', upTo5, 99)).toBe(true);
    expect(canUnlock('forsake', upTo5, 99)).toBe(true);
    expect(canUnlock('forsake', [...upTo5, 'heavyplate'], 99)).toBe(false);
    expect(canUnlock('heavyplate', [...upTo5, 'forsake'], 99)).toBe(false);
  });

  it('lets the branch continue past either side of the fork', () => {
    const viaStep = [...branch('sword').slice(0, 5), 'heavyplate'];
    const viaStone = [...branch('sword').slice(0, 5), 'forsake'];
    expect(canUnlock('formless', viaStep, 99)).toBe(true);
    expect(canUnlock('formless', viaStone, 99)).toBe(true);
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
      const keys = branch(path);
      const slots = SLOTS.map((s) => `${s} ×${affinity(keys, s).toFixed(2)}`)
        .filter((x) => !x.endsWith('×1.00'));
      return `  ${PATH_INFO[path].han} ${PATH_INFO[path].name.padEnd(11)} ` +
        `力 ×${powerMultiplier(keys).toFixed(2)}  氣 ×${rateMultiplier(keys).toFixed(2)}` +
        `  chest +${extraChestSlots(keys)}` +
        (slots.length ? `  · ${slots.join(', ')}` : '');
    });
    console.log(`\n  a branch taken to the end:\n${rows.join('\n')}\n`);

    expect(powerMultiplier(branch('sword'))).toBeGreaterThan(2);
    expect(rateMultiplier(branch('spirit'))).toBeGreaterThan(2);
    expect(extraChestSlots(branch('fortune'))).toBe(20);
  });

  it('nothing is locked away by default — only a keystone ever silences a slot', () => {
    for (const path of PATHS) {
      for (const slot of SLOTS) expect(affinity(branch(path), slot)).toBeGreaterThanOrEqual(1);
    }
    // 捨甲 Forsake Armour is the exception, and giving that up is exactly its price.
    const forsaken = branch('sword', true);
    expect(affinity(forsaken, 'robe')).toBe(0);
    expect(affinity(forsaken, 'weapon')).toBeGreaterThan(1);
  });

  it('prints what the keystones cost and buy', () => {
    const rows = PATHS.map((path) => {
      const step = branch(path);
      const stone = branch(path, true);
      const node = NODES.find((n) => n.path === path && n.keystone)!;
      return `  ${node.han} ${node.name.padEnd(21)} 力 ×${powerMultiplier(step).toFixed(2)}→` +
        `${powerMultiplier(stone).toFixed(2)}   氣 ×${rateMultiplier(step).toFixed(2)}→` +
        `${rateMultiplier(stone).toFixed(2)}`;
    });
    console.log(`\n  the same branch, standard side then keystone side:\n${rows.join('\n')}\n`);

    // Each keystone has to be a real trade, not a strictly better button.
    expect(powerMultiplier(branch('sword', true))).toBeGreaterThan(powerMultiplier(branch('sword')));
    expect(powerMultiplier(branch('spirit', true))).toBeLessThan(powerMultiplier(branch('spirit')));
  });

  it('moves the cultivator', () => {
    const bare = newState(0);
    const swordsman: State = { ...bare, unlocked: branch('sword') };
    const monk: State = { ...bare, unlocked: branch('spirit') };
    expect(power(swordsman)).toBeGreaterThan(power(bare) * 2);
    expect(rateBonus(monk)).toBeGreaterThan(rateBonus(bare) * 2);
    expect(power(monk)).toBeCloseTo(power(bare), 6);   // 神 buys no power at all
  });

  it('a save cannot hold a node without the ones above it', () => {
    expect(validateUnlocked(['tenthousand'])).toEqual([]);
    expect(validateUnlocked(['opening', 'chain'])).toEqual(['opening']);   // 鋒 is missing
    // Both sides of a fork in one save: only one survives.
    const both = validateUnlocked([...branch('sword').slice(0, 5), 'heavyplate', 'forsake']);
    expect(both).toContain('heavyplate');
    expect(both).not.toContain('forsake');
    expect(validateUnlocked(['opening', 'edge', 'breathing']))
      .toEqual(['opening', 'edge', 'breathing']);
    expect(validateUnlocked(['opening', 'opening'])).toEqual(['opening']);
    expect(validateUnlocked(['nonsense', 42, null])).toEqual([]);
  });
});
