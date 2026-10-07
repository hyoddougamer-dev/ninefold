import { describe, expect, it } from 'vitest';
import {
  AFFIX_INFO, FUSED, GEAR, RARITIES, TEMPLATE_BY_KEY, baseValue, type Item, type Rarity,
} from '../../data/gear.ts';
import { fuse, fusedTop, fusesInto, qualityOf } from '../chest.ts';
import { FUSE_TOP } from '../balance.ts';
import { newState, validate } from '../state.ts';

/**
 * 頂 A fusion stops at ×1.5, and the sheet says so. The first line used to be rounded after
 * the cap, so a flat line with a small base read above it: a 藏 Spirit Stone line of base 1
 * fused at the cap rounded to 2 and read ×2.00. Rounded down to fusedTop, it never does.
 */

/** Three pieces of a shape and rank, their first line at `q` of its base, rounded as a drop is. */
function three(template: string, rarity: Rarity, q: number): Item[] {
  const tpl = TEMPLATE_BY_KEY[template];
  const base = baseValue(tpl, rarity, tpl.affix);
  const v = AFFIX_INFO[tpl.affix].unit === 'flat' ? Math.max(1, Math.round(base * q)) : Math.round(base * q * 10) / 10;
  return [0, 1, 2].map((n) => ({ id: `${template}-${rarity}-${n}`, template, rarity, rolls: [{ affix: tpl.affix, value: v }], from: 'rat' }));
}

describe('頂 a fusion never reads above its cap', () => {
  it('every shape at every rank, fused at the cap, shows ×1.50 or less, and loads unchanged', () => {
    let read = 0;
    for (const tpl of GEAR) {
      for (const rarity of RARITIES) {
        // A quality far past the cap (Deft Hands and a 煉 body ask for more), so the cap is what is read.
        const made = fuse(three(tpl.key, rarity, 1.35), tpl.key, rarity, 3).made;
        expect(made, `${tpl.key} ${rarity}`).not.toBeNull();
        expect(qualityOf(made!), `${tpl.key} ${rarity}: ${made!.rolls[0].value}`).toBeLessThanOrEqual(FUSE_TOP + 1e-9);
        expect(made!.rolls[0].value).toBe(fusedTop(tpl, made!.rarity, tpl.affix));
        // validate() never rewrites a piece a fusion made.
        const s = { ...newState(1000), chest: [made!] };
        const back = validate(JSON.parse(JSON.stringify(s)), 1000);
        expect(back.chest[0].rolls, `${tpl.key} ${rarity}`).toEqual(made!.rolls);
        read++;
      }
    }
    // 底 A harness that reached nothing passes: every shape at every rank was read.
    expect(read).toBe(GEAR.length * RARITIES.length);
    expect(read).toBeGreaterThan(2000);
  });

  it('a 藏 line of base 1 fuses to 1, not 2: ×1.00 rather than ×2.00', () => {
    const pairs = GEAR.filter((g) => g.affix === 'capacity').flatMap((g) => RARITIES.map((r) => ({ g, r })))
      .filter(({ g, r }) => { const up = fusesInto(r); return !!up && baseValue(g, up, 'capacity') === 1; });
    expect(pairs.length).toBeGreaterThan(0);
    for (const { g, r } of pairs) {
      const made = fuse(three(g.key, r, 1.5), g.key, r, 1).made!;
      expect(made.rolls[0].value).toBe(1);
      expect(qualityOf(made)).toBe(1);
    }
  });

  it('a piece fused before the fix, above the cap, is kept as it was: nothing is taken away', () => {
    const g = GEAR.find((x) => x.affix === 'capacity' && baseValue(x, 'spirit', 'capacity') === 1)!;
    expect(g).toBeDefined();
    const old: Item = { id: 'old-two', template: g.key, rarity: 'spirit', rolls: [{ affix: 'capacity', value: 2 }], from: FUSED };
    const back = validate(JSON.parse(JSON.stringify({ ...newState(1000), chest: [old] })), 1000);
    expect(back.chest[0].rolls[0].value).toBe(2);
  });

  it('a percentage line rounds down to a tenth at the cap', () => {
    const g = GEAR.find((x) => x.affix === 'power' && (baseValue(x, 'mystic', 'power') * FUSE_TOP * 10) % 1 > 0.5)
      ?? GEAR.find((x) => x.affix === 'power')!;
    const made = fuse(three(g.key, 'spirit', 1.35), g.key, 'spirit', 3).made!;
    expect(made.rolls[0].value).toBeLessThanOrEqual(baseValue(g, made.rarity, 'power') * FUSE_TOP + 1e-9);
  });
});
