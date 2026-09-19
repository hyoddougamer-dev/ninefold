import { describe, expect, it } from 'vitest';
import { commonsOf, wardenOf } from '../../data/bestiary.ts';
import {
  RARITIES, RARITY_INFO, SLOTS, basePercent, setBonus, templateOf, wornRarity,
  type Item, type Worn,
} from '../../data/gear.ts';
import { dropChance, rarityOdds, rollDrop } from '../drops.ts';

describe('落 drops', () => {
  it('prints the rarity table for a common and for a warden', () => {
    const rows: string[] = [];
    for (const r of [1, 5, 9]) {
      for (const b of [commonsOf(r)[0], wardenOf(r)]) {
        const odds = rarityOdds(b);
        rows.push(`  realm ${r} ${b.warden ? 'warden ' : 'common '} ${b.han.padEnd(4)} ` +
          RARITIES.map((x) => `${RARITY_INFO[x].han} ${(100 * odds[x]).toFixed(1)}%`).join('  '));
      }
    }
    console.log(`\n${rows.join('\n')}\n`);

    // A warden is always better odds at the top rank than its realm's commons.
    for (const r of [1, 5, 9]) {
      expect(rarityOdds(wardenOf(r)).heaven).toBeGreaterThan(rarityOdds(commonsOf(r)[0]).heaven);
    }
  });

  it('a warden always drops, a common only sometimes', () => {
    expect(dropChance(wardenOf(4))).toBe(1);
    expect(dropChance(commonsOf(4)[0])).toBeLessThan(0.5);

    let drops = 0;
    for (let i = 0; i < 2000; i++) if (rollDrop(commonsOf(4)[0], 4, i)) drops++;
    const rate = drops / 2000;
    expect(rate).toBeGreaterThan(0.13);
    expect(rate).toBeLessThan(0.24);
    console.log(`  2,000 kills of a realm-4 common dropped ${drops} items (${(100 * rate).toFixed(1)}%)\n`);

    for (let i = 0; i < 200; i++) expect(rollDrop(wardenOf(4), 4, i)).not.toBeNull();
  });

  it('the same kill always gives the same item — a reload cannot re-roll it', () => {
    const b = wardenOf(6);
    const a = rollDrop(b, 6, 12345);
    const c = rollDrop(b, 6, 12345);
    expect(a).toEqual(c);
  });

  it('never drops gear from above the cultivator', () => {
    for (let i = 0; i < 400; i++) {
      const it = rollDrop(wardenOf(9), 3, i);
      if (it) expect(templateOf(it).realm).toBeLessThanOrEqual(3);
    }
  });

  it('prints what a full set is worth at each rank', () => {
    const rows = RARITIES.map((rarity) => {
      const worn: Worn = {};
      for (const slot of SLOTS) {
        // The best template for that slot, so the figure is the set's ceiling.
        const tpl = [...templatesFor(slot)].sort((a, b) => b.realm - a.realm)[0];
        if (!tpl) continue;
        worn[slot] = {
          id: `${slot}`, template: tpl.key, rarity,
          percent: Math.round(basePercent(tpl, rarity) * 10) / 10,
        } satisfies Item;
      }
      const bonus = setBonus(worn);
      expect(wornRarity(worn)).toBe(rarity);
      return `  ${RARITY_INFO[rarity].han} ${RARITY_INFO[rarity].name.padEnd(7)} ` +
        `力 x${bonus.power.toFixed(2)}   氣 x${bonus.rate.toFixed(2)}`;
    });
    console.log(`\n  a full set of the best items in each slot:\n${rows.join('\n')}\n`);

    // Every rank must be worth strictly more than the one below it.
    const powers = RARITIES.map((rarity) => {
      const worn: Worn = {};
      for (const slot of SLOTS) {
        const tpl = [...templatesFor(slot)].sort((a, b) => b.realm - a.realm)[0];
        if (tpl) worn[slot] = { id: slot, template: tpl.key, rarity, percent: basePercent(tpl, rarity) };
      }
      return setBonus(worn).power + setBonus(worn).rate;
    });
    for (let i = 1; i < powers.length; i++) expect(powers[i]).toBeGreaterThan(powers[i - 1]);
  });

  it('an empty body has no aura and no bonus', () => {
    expect(wornRarity({})).toBeNull();
    expect(setBonus({})).toEqual({ power: 1, rate: 1 });
  });
});

function templatesFor(slot: string) {
  // Imported lazily to keep the table above readable.
  return GEAR_FOR_SLOT[slot] ?? [];
}

import { GEAR } from '../../data/gear.ts';
const GEAR_FOR_SLOT: Record<string, typeof GEAR[number][]> = {};
for (const g of GEAR) (GEAR_FOR_SLOT[g.slot] ??= []).push(g);
