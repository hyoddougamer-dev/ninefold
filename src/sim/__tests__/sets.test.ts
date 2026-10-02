import { describe, expect, it } from 'vitest';
import {
  AFFIX_INFO, GEAR, REALM_SETS, SET_STEPS, SLOTS, TEMPLATE_BY_KEY,
  activeSets, baseValue, gearTotals, realmSet, setTotals, setsWorn, wornTotals,
  type Affix, type Item, type Rarity, type Slot, type Worn,
} from '../../data/gear.ts';
import { realm as realmOf } from '../../data/realms.ts';

/** A plain piece of a given realm in a given slot: whichever shape comes first. */
const piece = (realm: number, slot: Slot, rarity: Rarity = 'common'): Item => {
  const tpl = GEAR.find((g) => g.realm === realm && g.slot === slot)!;
  return {
    id: `${tpl.key}-${rarity}`,
    template: tpl.key,
    rarity,
    rolls: [{ affix: tpl.affix, value: baseValue(tpl, rarity, tpl.affix) }],
  };
};

/** n slots' worth of one realm, and the rest left bare. */
const dressed = (realm: number, n: number): Worn =>
  Object.fromEntries(SLOTS.slice(0, n).map((s) => [s, piece(realm, s)]));

describe('系 the lineages', () => {
  it('gives every realm a name of its own, and puts it on every piece', () => {
    expect(REALM_SETS.length).toBe(9);
    expect(new Set(REALM_SETS.map((x) => x.han)).size).toBe(9);
    expect(new Set(REALM_SETS.map((x) => x.name)).size).toBe(9);
    // The glyph on the tile is the set's first character, so those must differ too.
    expect(new Set(REALM_SETS.map((x) => x.han.slice(0, 1))).size).toBe(9);

    for (const g of GEAR) {
      const rs = realmSet(g.realm);
      expect(g.han.startsWith(rs.han)).toBe(true);
      expect(g.name.startsWith(rs.word)).toBe(true);
    }
    // No piece is named for a material and a rank any more.
    expect(TEMPLATE_BY_KEY.scythe9.name).toBe('Ascendant Scythe');
    expect(TEMPLATE_BY_KEY.crescent6.han).toBe('落星鉤');
  });

  it('counts a set by realm, not by shape: any piece of it counts', () => {
    const mixed: Worn = {
      weapon: piece(5, 'weapon'), robe: piece(5, 'robe'), crown: piece(2, 'crown'),
    };
    expect(setsWorn(mixed).get(5)).toBe(2);
    expect(setsWorn(mixed).get(2)).toBe(1);
    expect(setsWorn({}).size).toBe(0);
  });

  it('pays at two, four and six, and the steps stack', () => {
    const rs = realmSet(7);
    expect(rs.steps.map((x) => x.pieces)).toEqual([...SET_STEPS]);

    expect(activeSets(dressed(7, 1))[0].steps).toHaveLength(0);
    expect(activeSets(dressed(7, 3))[0].steps).toHaveLength(1);
    expect(activeSets(dressed(7, 5))[0].steps).toHaveLength(2);
    expect(activeSets(dressed(7, 6))[0].steps).toHaveLength(3);

    // What the screen shows as "n more pieces" has to count down honestly.
    expect(activeSets(dressed(7, 3))[0].next).toEqual({ step: rs.steps[1], needs: 1 });
    expect(activeSets(dressed(7, 6))[0].next).toBeUndefined();

    // Six of one realm pays every step; three of it pays only the first.
    const full = setTotals(dressed(7, 6));
    const third = setTotals(dressed(7, 3));
    for (const axis of rs.axes) expect(full[axis]).toBeGreaterThan(third[axis]);
  });

  it('adds the set on top of the pieces, and never instead of them', () => {
    const worn = dressed(6, 6);
    const own = gearTotals(worn);
    const both = wornTotals(worn);
    for (const axis of realmSet(6).axes) {
      expect(both[axis]).toBeCloseTo(own[axis] + setTotals(worn)[axis], 6);
      expect(both[axis]).toBeGreaterThan(own[axis]);
    }
  });

  it('never lets an earlier lineage outpay a later one', () => {
    /**
     * Raw numbers from different axes cannot be added: a point of 破 Sunder is worth
     * several of 力 Power, which is exactly what each axis's `scale` says. So the
     * comparison is made in scale-free units: what the set is worth, not what it reads.
     */
    const weight = (s: typeof REALM_SETS[number]) => s.steps.reduce((t, step) =>
      t + Object.entries(step.effects).reduce(
        (x, [a, v]) => x + (v ?? 0) / AFFIX_INFO[a as Affix].scale, 0), 0);

    for (let realm = 2; realm <= 9; realm++) {
      expect(weight(REALM_SETS[realm - 1])).toBeGreaterThan(weight(REALM_SETS[realm - 2]));
    }
    // And a set spread over three axes is not three times a set with one.
    expect(weight(REALM_SETS[8]) / weight(REALM_SETS[0])).toBeLessThan(10);
  });

  it('prints the nine lineages and what a full set is worth', () => {
    const rows = REALM_SETS.map((rs) => {
      const full = setTotals(dressed(rs.realm, 6));
      const gains = rs.axes.map((a) =>
        `${AFFIX_INFO[a].han} +${full[a]}${AFFIX_INFO[a].unit === '%' ? '%' : ''}`).join('  ');
      return `  ${rs.realm}  ${rs.han} ${rs.name.padEnd(15)} ${realmOf(rs.realm).name.padEnd(16)} ${gains}`;
    });
    console.log(`\n  系 the nine lineages, all six pieces worn:\n${rows.join('\n')}\n`);

    // A full late set has to be worth a real decision against wearing whatever is best.
    const ascendant = setTotals(dressed(9, 6));
    expect(ascendant.power + ascendant.rate).toBeGreaterThan(20);
  });
});
