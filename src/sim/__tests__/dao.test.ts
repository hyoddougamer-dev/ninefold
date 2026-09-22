import { describe, expect, it } from 'vitest';
import {
  ALL_NODES, NODES, NODE_BY_KEY, PATHS, PATH_INFO, ROOT, TOTAL_COST, linksOf, nodesOf,
} from '../../data/techniques.ts';
import { SLOTS } from '../../data/gear.ts';
import {
  affinity, canUnlock, daoEarned, daoFree, daoSpent, extraChestSlots, focusBonus,
  powerMultiplier, rateMultiplier, validateUnlocked,
} from '../dao.ts';
import { FOCUS_MAX, TREE_RATE_CEILING, focusAt } from '../balance.ts';
import { newState, power, rateBonus, type State } from '../state.ts';

/** Everything a whole run can earn: 73 layers and nine wardens. */
const FULL_RUN = daoEarned(73, 9);

/**
 * A legal build down one branch: every tier, and exactly one side of the fork.
 *
 * Taking *all* the nodes of a path is not a build: a fork means one or the other, so
 * a test that does it is testing a state the game can never be in.
 */
function branch(path: Parameters<typeof nodesOf>[0], keystone = false): string[] {
  // Every branch grows from the root, so a legal build always holds it.
  const byTier = new Map<number, typeof NODES[number][]>();
  for (const node of nodesOf(path)) {
    if (!byTier.has(node.tier)) byTier.set(node.tier, []);
    byTier.get(node.tier)!.push(node);
  }
  return [ROOT.key, ...[...byTier.entries()].sort((a, b) => a[0] - b[0]).map(([, nodes]) => {
    const pick = nodes.find((x) => (keystone ? x.keystone : !x.keystone)) ?? nodes[0];
    return pick.key;
  })];
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
    expect(ALL_NODES.length).toBe(28);                // and the root they all grow from
    for (const path of PATHS) {
      const nodes = nodesOf(path);
      expect(nodes.length).toBe(9);
      // Eight tiers, with two nodes sharing tier 5: the fork.
      expect(nodes.filter((n) => n.tier === 5)).toHaveLength(2);
      expect(nodes.filter((n) => n.keystone)).toHaveLength(1);
      // Either way down the branch costs the same: 20 for the eight steps, +1 for 起 the root.
      expect(branch(path).reduce((s, k) => s + NODE_BY_KEY[k].cost, 0)).toBe(21);
      expect(branch(path, true).reduce((s, k) => s + NODE_BY_KEY[k].cost, 0)).toBe(21);
    }
    expect(new Set(NODES.map((n) => n.key)).size).toBe(NODES.length);
  });

  it('will not sell both sides of a fork', () => {
    const upTo5 = branch('sword').slice(0, 6);
    expect(canUnlock('heavyplate', upTo5, 99)).toBe(true);
    expect(canUnlock('forsake', upTo5, 99)).toBe(true);
    expect(canUnlock('forsake', [...upTo5, 'heavyplate'], 99)).toBe(false);
    expect(canUnlock('heavyplate', [...upTo5, 'forsake'], 99)).toBe(false);
  });

  it('lets the branch continue past either side of the fork', () => {
    const viaStep = [...branch('sword').slice(0, 6), 'heavyplate'];
    const viaStone = [...branch('sword').slice(0, 6), 'forsake'];
    expect(canUnlock('formless', viaStep, 99)).toBe(true);
    expect(canUnlock('formless', viaStone, 99)).toBe(true);
  });

  it('will not sell a node with nothing leading to it', () => {
    expect(canUnlock(ROOT.key, [], 99)).toBe(true);
    expect(canUnlock('opening', [], 99)).toBe(false);          // the root comes first
    expect(canUnlock('opening', [ROOT.key], 99)).toBe(true);
    expect(canUnlock('edge', [ROOT.key], 99)).toBe(false);     // 起手 is still missing
    expect(canUnlock(ROOT.key, [ROOT.key], 99)).toBe(false);   // already taken
    expect(canUnlock(ROOT.key, [], 0)).toBe(false);            // no points
  });

  it('is one tree: the branches meet at the root and bridge to their neighbours', () => {
    expect([...linksOf(ROOT.key)].sort()).toEqual(['breathing', 'gleaning', 'opening']);

    // 神 sits in the middle, so it touches both others; 劍 and 運 never touch directly.
    const crosses = (a: string, b: string) => linksOf(a).includes(b);
    expect(crosses('chain', 'circulation')).toBe(true);       // 劍 ↔ 神 at tier 2
    expect(crosses('circulation', 'pouch')).toBe(true);       // 神 ↔ 運 at tier 2
    expect(crosses('chain', 'pouch')).toBe(false);

    // And a bridge is walkable: 劍 to tier 2, across, and on down 神.
    const mixed = [ROOT.key, 'opening', 'edge', 'chain'];
    expect(canUnlock('circulation', mixed, 99)).toBe(true);
    expect(canUnlock('focus', [...mixed, 'circulation'], 99)).toBe(true);
    console.log('\n  劍 → 鋒 → 連擊 → bridge → 周天 → 凝神: a mixed build, four points in\n');
  });

  it('counts points spent and left over', () => {
    const taken = [ROOT.key, 'opening', 'edge', 'chain'];
    expect(daoSpent(taken)).toBe(1 + 1 + 1 + 2);
    expect(daoFree(73, 9, taken)).toBe(FULL_RUN - 5);
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
    expect(extraChestSlots(branch('fortune'))).toBe(20);
    // 神 pays in 入定, not in the rate. That is the whole of what it is for now.
    expect(focusBonus(branch('spirit'))).toBeGreaterThan(0.5);
  });

  /**
   * 頂 The guard that was missing, and the reason the tree once cut the game to a third.
   *
   * 劍 and 神 were written with the same numbers, 15/20/30/45/80, one on power and one on
   * the rate. Power buys fights and the climb is not gated by fights; the rate divides
   * the whole run. Measured, 神 took the ninth realm on day 30 against the sword's 82,
   * and no test anywhere could see it, because no harness spent a 道 point.
   */
  it('lets no branch multiply the qi rate past its ceiling', () => {
    const rows = PATHS.flatMap((path) => [false, true].map((stone) => {
      const keys = branch(path, stone);
      return `  ${PATH_INFO[path].han} ${(stone ? 'keystone' : 'standard').padEnd(9)}` +
        ` 氣 ×${rateMultiplier(keys).toFixed(2)}   入定 +${focusBonus(keys).toFixed(2)}`;
    }));
    console.log(`\n  what a finished branch does to the clock (ceiling ×${TREE_RATE_CEILING}):\n${rows.join('\n')}\n`);

    for (const path of PATHS) {
      for (const stone of [false, true]) {
        expect(rateMultiplier(branch(path, stone))).toBeLessThanOrEqual(TREE_RATE_CEILING);
      }
    }
  });

  it('nothing is locked away by default: only a keystone ever silences a slot', () => {
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
    // 神 moves the sitting, not the rate: at the bottom of the ramp both are 1, and at
    // the top the monk sits deeper than anybody else can.
    const settled = 10 * 60;
    expect(focusAt(settled, focusBonus(monk.unlocked)))
      .toBeGreaterThan(focusAt(settled) + 0.5);
    expect(focusAt(0, focusBonus(monk.unlocked))).toBe(1);
    expect(focusAt(settled)).toBeCloseTo(FOCUS_MAX, 6);
    expect(rateBonus(monk)).toBeLessThanOrEqual(rateBonus(bare) * TREE_RATE_CEILING);
    // 起 the root hands everyone +10% of both, and nothing on 神 adds power beyond it.
    const rooted: State = { ...bare, unlocked: [ROOT.key] };
    expect(power(monk)).toBeCloseTo(power(rooted), 6);
  });

  it('a save cannot hold a node with nothing leading to it', () => {
    expect(validateUnlocked(['tenthousand'])).toEqual([]);
    expect(validateUnlocked(['opening'])).toEqual([]);                      // no root
    expect(validateUnlocked([ROOT.key, 'chain'])).toEqual([ROOT.key]);      // 起手 is missing
    expect(validateUnlocked([ROOT.key, 'opening', 'edge']))
      .toEqual([ROOT.key, 'opening', 'edge']);
    expect(validateUnlocked([ROOT.key, ROOT.key])).toEqual([ROOT.key]);
    expect(validateUnlocked(['nonsense', 42, null])).toEqual([]);

    // Both sides of a fork in one save: only one survives.
    const both = validateUnlocked([...branch('sword').slice(0, 6), 'heavyplate', 'forsake']);
    expect(both).toContain('heavyplate');
    expect(both).not.toContain('forsake');

    // A save that walked a bridge keeps the whole mixed shape.
    const mixed = [ROOT.key, 'opening', 'edge', 'chain', 'circulation', 'focus'];
    expect(validateUnlocked(mixed).sort()).toEqual([...mixed].sort());
  });
});
