import { describe, expect, it } from 'vitest';
import { DEEDS, TRACKS, closest, doneBy, tally } from '../deeds.ts';
import { newState, validate, type State } from '../state.ts';
import { BEASTS } from '../../data/bestiary.ts';
import { ALL_NODES, NODES } from '../../data/techniques.ts';
import { canUnlock, daoEarned, daoSpent } from '../dao.ts';
import { LAYERS } from '../balance.ts';
import { GEAR, SLOTS, type GearTemplate } from '../../data/gear.ts';
import { LAYERS_PER_REALM } from '../balance.ts';
import { playEndgame } from '../../../tools/endgame.ts';

const T0 = 1_700_000_000;

/**
 * 道 A legal, affordable tree: the keystones first, then whatever the points still reach.
 *
 * The first version of this fixture simply claimed every node, and `validate` threw the
 * whole tree away: 27 nodes cost 70 道 and a finished run earns 44, so the save was
 * claiming points that were never earned. That is the validator doing exactly its job,
 * and it is why the fixture has to buy the tree rather than assert it.
 */
function spentTree(): string[] {
  const purse = daoEarned(LAYERS - 1, 9);
  // The nodes a keystone closes off are left out entirely: taken in tier order a greedy
  // pass reaches the cheap side of every fork first and shuts the keystone out.
  const shut = new Set(NODES.filter((n) => n.keystone).map((n) => n.excludes));
  // Tier by tier across all three branches, keystones first inside a tier: a greedy pass
  // that goes branch by branch spends the purse on tier-four luxuries and cannot afford
  // the third keystone, which a real cultivator can.
  const want = ALL_NODES.filter((n) => !shut.has(n.key))
    .sort((a, b) => a.tier - b.tier || Number(!!b.keystone) - Number(!!a.keystone));
  const taken: string[] = [];
  for (let pass = 0; pass < ALL_NODES.length; pass++) {
    for (const n of want) {
      if (canUnlock(n.key, taken, purse - daoSpent(taken))) taken.push(n.key);
    }
  }
  return taken;
}

/** A cultivator who has done everything the game has, built by hand from the top. */
function finished(): State {
  const best = GEAR.filter((t: GearTemplate) => t.realm === 9);
  const worn = Object.fromEntries(SLOTS.map((slot, i) => [slot, {
    id: `x${i}`,
    template: best.find((t: GearTemplate) => t.slot === slot)!.key,
    rarity: 'heaven' as const,
    rolls: [{ affix: 'power' as const, value: 40 }],
    refine: 20,
  }]));
  return {
    ...newState(T0),
    at: T0 + 400 * 86_400,
    realm: 9,
    layer: LAYERS_PER_REALM - 1,
    tower: 200,
    tribulation: 40,
    brewed: { body: 200, bane: 200, fortune: 200 },
    killed: Object.fromEntries(BEASTS.map((b) => [b.key, 500])),
    unlocked: spentTree(),
    worn: worn as State['worn'],
  };
}

describe('碑 the deeds', () => {
  it('is a list of things done, and every one of them is reachable', () => {
    const done = finished();
    const missed = DEEDS.filter((d) => !doneBy(done, d));
    if (missed.length) {
      console.log(`\n  unreachable: ${missed.map((d) => `${d.han} ${d.at(done)}/${d.want}`).join(', ')}\n`);
    }
    expect(missed).toEqual([]);
    expect(tally(done)).toEqual({ done: DEEDS.length, all: DEEDS.length });
  });

  it('holds none of them at the first minute, and every track has some', () => {
    const fresh = newState(T0);
    expect(tally(fresh).done).toBe(0);
    for (const t of TRACKS) {
      expect(DEEDS.filter((d) => d.track === t.key).length).toBeGreaterThan(0);
    }
    // And there is always a nearest one to point at, from the very first minute.
    expect(closest(fresh)).not.toBeNull();
  });

  /**
   * 律 The one rule the stele has to keep. A deed that paid anything would be the one
   * uncapped thing in the game that a forged save could claim, and 九境 is meant to go
   * online, where that stops being only your own problem.
   */
  it('pays nothing, and is derived rather than stored', () => {
    for (const d of DEEDS) {
      // No deed carries a payout of any kind: the shape of the record forbids it.
      expect(Object.keys(d).sort()).toEqual(['at', 'han', 'key', 'line', 'name', 'track', 'want']);
      expect(d.want).toBeGreaterThan(0);
    }
    // Nothing in the save says a deed is held. A save that claims the climb without the
    // numbers behind it claims nothing, because the numbers are what is read.
    const forged = validate({ ...finished(), seen: DEEDS.map((d) => `deed:${d.key}`) }, T0);
    const bare = validate({ ...newState(T0), seen: DEEDS.map((d) => `deed:${d.key}`) }, T0);
    expect(tally(forged).done).toBe(DEEDS.length);
    expect(tally(bare).done).toBe(0);
  });

  it('prints what a real cultivator holds at the top of the climb', () => {
    const end = playEndgame(12).end;
    const held = tally(end);
    const rows = TRACKS.map((t) => {
      const on = DEEDS.filter((d) => d.track === t.key);
      return `    ${t.han} ${t.name.padEnd(16)} ${on.filter((d) => doneBy(end, d)).length} / ${on.length}`;
    });
    console.log(`\n  碑 after twelve crossings: ${held.done} of ${held.all} deeds\n${rows.join('\n')}\n`
      + '  (狩 器 道 read zero because the harness plays the curve, not the build:\n'
      + '   it never equips a drop or spends a 道 point. The game does.)\n');
    // What the harness does play, it finishes: every realm, and the whole furnace.
    for (const key of ['climb', 'furnace'] as const) {
      const on = DEEDS.filter((d) => d.track === key);
      expect(on.filter((d) => doneBy(end, d))).toHaveLength(on.length);
    }
    // And it is nowhere near everything, which is the point of a stele.
    expect(held.done).toBeLessThan(held.all);
  }, 30_000);
});
