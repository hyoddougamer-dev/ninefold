import { describe, expect, it } from 'vitest';
import {
  LAYERS_PER_REALM, SALVAGE_SHARE_FIRST, SALVAGE_SHARE_LAST, ladderAt, salvageShare,
} from '../balance.ts';
import { RARITIES, RARITY_INFO, type Item, type Rarity } from '../../data/gear.ts';
import { FUSE_COUNT, fuse } from '../chest.ts';
import { salvage, salvageUpTo, salvageValue, salvageWorth, salvageable } from '../salvage.ts';
import { newState, type State } from '../state.ts';
import { num } from '../format.ts';

const T0 = 1_700_000_000;

const piece = (id: string, realm: number, rarity: Rarity, refine = 0): Item => ({
  id, template: `sword${realm}`, rarity, refine,
  rolls: [{ affix: 'power', value: 10 }],
});

describe('拆 melting gear down', () => {
  it('prices a piece off its own realm and never off the cultivator standing there', () => {
    const early = piece('a', 2, 'common');
    // The same piece is worth the same number whoever is holding it, wherever they are.
    expect(salvageValue(early)).toBe(salvageValue({ ...early, id: 'b' }));

    const rows = RARITIES.map((r) => {
      const at2 = salvageValue(piece('x', 2, r));
      const at9 = salvageValue(piece('y', 9, r));
      return `    ${RARITY_INFO[r].han} ${RARITY_INFO[r].name.padEnd(7)} realm 2 ${
        num(at2).padStart(9)}    realm 9 ${num(at9).padStart(9)}`;
    });
    console.log(`\n  拆 what a melt pays — a share of the first rung of its own realm,\n`
      + `  falling from ${SALVAGE_SHARE_FIRST} at the first realm to ${SALVAGE_SHARE_LAST} at the ninth:\n`
      + `${rows.join('\n')}\n`);

    /**
     * 舊 The guard that makes this safe. A second-realm 凡 pays a second-realm sum for
     * ever, so farming weak beasts can never become a way of buying ninth-realm layers.
     */
    const junk = salvageValue(piece('j', 2, 'common'));
    const layer9 = ladderAt(8 * LAYERS_PER_REALM + 4);
    expect(junk / layer9).toBeLessThan(1e-6);
  });

  it('scales with the rank, and with the realm the piece was made in', () => {
    for (const r of RARITIES) {
      const value = salvageValue(piece('x', 5, r));
      const base = ladderAt(4 * LAYERS_PER_REALM) * salvageShare(5);
      expect(value).toBeCloseTo(base * RARITY_INFO[r].mult, -1);
    }
  });

  /**
   * 早 The tilt, which is the whole reason this pays anything worth noticing early. A
   * flat share moved nobody but the hourly cultivator; see salvageShare.
   */
  it('pays a real slice of a layer early and a rounding error late', () => {
    const rows: string[] = [];
    for (let r = 1; r <= 9; r++) {
      const pays = salvageValue(piece('x', r, 'common'));
      const layer = ladderAt((r - 1) * LAYERS_PER_REALM + 4);
      rows.push(`    realm ${r}   一凡 pays ${num(pays).padStart(9)}   ${
        (pays / layer * 100).toFixed(1).padStart(5)}% of a layer there`);
    }
    console.log(`\n  早 a 凡 Common against the layer being climbed when it drops:\n${
      rows.join('\n')}\n`);

    const early = salvageValue(piece('a', 2, 'common')) / ladderAt(1 * LAYERS_PER_REALM + 4);
    const late = salvageValue(piece('b', 9, 'common')) / ladderAt(8 * LAYERS_PER_REALM + 4);
    // It has to be worth pressing early, and it has to stop mattering by the ninth.
    expect(early).toBeGreaterThan(0.05);
    expect(late).toBeLessThan(early / 2);
    expect(salvageShare(1)).toBeGreaterThan(salvageShare(9));
  });

  /**
   * 煉 The pump that must not exist. Three 凡 fuse into one 靈; if the 靈 melted for more
   * than the three did, a cultivator could fuse and melt in a loop for free qi.
   */
  it('cannot be pumped against fusing', () => {
    const three = Array.from({ length: FUSE_COUNT }, (_, i) => piece(`f${i}`, 4, 'common'));
    const before = salvageWorth(three);
    const { made } = fuse(three, 'sword4', 'common');
    expect(made).not.toBeNull();
    const after = salvageValue(made!);
    console.log(`  煉 three 凡 melt for ${num(before)}; fused and melted they are worth ${
      num(after)} — fusing for qi is always a loss\n`);
    expect(after).toBeLessThan(before);
  });

  /**
   * 煉器 And the other pump: material must not become qi. A refined piece melts for
   * exactly what an unrefined one does, so the furnace has only the one door.
   */
  it('pays nothing for 煉器 refining', () => {
    expect(salvageValue(piece('r', 6, 'earth', 20))).toBe(salvageValue(piece('s', 6, 'earth', 0)));
  });

  it('melts a chosen rank and everything below it, and nothing above', () => {
    const chest: Item[] = [
      piece('c1', 3, 'common'), piece('c2', 3, 'common'),
      piece('s1', 3, 'spirit'), piece('m1', 3, 'mystic'), piece('h1', 3, 'heaven'),
    ];
    expect(salvageable(chest, 'common').map((x) => x.id)).toEqual(['c1', 'c2']);
    expect(salvageable(chest, 'spirit').map((x) => x.id)).toEqual(['c1', 'c2', 's1']);
    expect(salvageable(chest, 'heaven')).toHaveLength(5);

    const s: State = { ...newState(T0), realm: 3, chest, qi: 0 };
    const after = salvageUpTo(s, 'spirit');
    expect(after.chest.map((x) => x.id)).toEqual(['m1', 'h1']);
    expect(after.qi).toBe(salvageWorth([chest[0], chest[1], chest[2]]));
  });

  it('leaves what is worn alone, and shrugs at an id that is not there', () => {
    const worn = piece('w', 4, 'heaven');
    const s: State = { ...newState(T0), realm: 4, worn: { weapon: worn }, chest: [piece('c', 4, 'common')], qi: 0 };
    // 著 What is on the body is not in the chest, so a melt cannot reach it.
    const all = salvageUpTo(s, 'heaven');
    expect(all.worn.weapon).toEqual(worn);
    expect(all.chest).toHaveLength(0);

    expect(salvage(s, ['nothing-like-this'])).toBe(s);
    expect(salvage(s, [])).toBe(s);
  });
});
