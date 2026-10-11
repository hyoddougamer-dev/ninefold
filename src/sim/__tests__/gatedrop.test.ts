import { describe, expect, it } from 'vitest';
import { BEASTS, commonsOf } from '../../data/bestiary.ts';
import { LINEAGE_LAYER } from '../balance.ts';
import { fallsFromLayer, rollDrop } from '../drops.ts';

/**
 * 層 The hunt says which of a beast's pieces fall and which do not yet. The sentence it shows
 * is read off fallsFromLayer, and this file holds that sentence to the dice: a realm-6 beast
 * at layer 2 must never leave a realm-6 piece, and at LINEAGE_LAYER it may.
 *
 * On 2026-10-11 the hunt drew realm-6 pieces as LEAVES at layer 2, where none fall (4,000 seeds,
 * 737 drops, all from realms 1 to 5). A player who hunted 1,395 times found none and reported it.
 */
describe('層 the lineage gate the hunt shows', () => {
  it('says the own realm falls from LINEAGE_LAYER, and nothing else is gated', () => {
    expect(fallsFromLayer(6, 6, 2)).toBe(LINEAGE_LAYER);
    expect(fallsFromLayer(6, 6, LINEAGE_LAYER - 1)).toBe(LINEAGE_LAYER);
    expect(fallsFromLayer(6, 6, LINEAGE_LAYER)).toBeNull();
    expect(fallsFromLayer(7, 6, 2)).toBe(LINEAGE_LAYER);           // a beast above the cultivator is read at their realm
    expect(fallsFromLayer(5, 6, 2)).toBeNull();                    // a beast of an earlier realm drops its whole realm
    expect(fallsFromLayer(6, 7, 0)).toBeNull();                    // the cultivator has passed the realm
  });

  it('never leaves a piece of the realm it is still gated in, below the gate', () => {
    const beasts = BEASTS.filter((b) => b.realm === 6 && !b.warden);
    expect(beasts.length).toBeGreaterThan(0);
    const b = beasts[0];
    const gate = fallsFromLayer(b.realm, 6, 2);
    expect(gate).not.toBeNull();
    let drops = 0;
    let gated = 0;
    for (let seed = 1; seed <= 4000; seed++) {
      const item = rollDrop(b, 6, seed, { chance: 100, always: true }, 2);
      if (!item) continue;
      drops++;
      if (item.template.match(/\d+$/)?.[0] === '6') gated++;
    }
    expect(drops).toBeGreaterThan(100);
    expect(gated, 'realm-6 pieces dropped before the gate').toBe(0);
  });

  it('does leave realm-6 pieces once the cultivator is at the gate', () => {
    const b = commonsOf(6)[0];
    let own = 0;
    for (let seed = 1; seed <= 4000; seed++) {
      const item = rollDrop(b, 6, seed, { chance: 100, always: true }, LINEAGE_LAYER);
      if (item && item.template.match(/\d+$/)?.[0] === '6') own++;
    }
    expect(own, 'realm-6 pieces after the gate').toBeGreaterThan(0);
  });
});
