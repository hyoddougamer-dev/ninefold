import { describe, expect, it } from 'vitest';
import { RECIPES, SKILL_BY_KEY, XP_TABLE } from '../../data/crafts.ts';
import { CRUCIBLE } from '../../data/hundred.ts';
import { AFFIXES } from '../../data/gear.ts';
import { materialGate, materialReached } from '../../sim/hundred.ts';
import { HUNDRED } from '../copy.ts';
import { linesByOpening } from '../ui/Hundred.tsx';

/**
 * 開 A crucible line not yet in reach says when it opens (rekaris, 2026-10-07: the 'rarer
 * gear' line of a Mortal Iron piece waits on Fallen Star Iron, and the screen only said
 * 'not within your reach yet'). The words are read off the recipe, never written in.
 */
describe('開 what a crucible line waits on', () => {
  const recipeOf = (key: string) => RECIPES.find((r) => r.makes.kind === 'item' && r.makes.item === key)!;

  it('every material of every set has a gate, and it is the recipe that gathers it', () => {
    for (let realm = 1; realm <= 9; realm++) {
      for (const a of AFFIXES) {
        const key = CRUCIBLE[a](realm);
        const r = recipeOf(key);
        expect(r, `${a} ${realm}`).toBeTruthy();
        expect(materialGate(key)).toEqual({ skill: r.skill, level: r.level, realm: r.realm });
      }
    }
  });

  it('the rarer gear line of the first set says Vein Delving, its level and its realm', () => {
    const key = CRUCIBLE.luck(1);
    const r = recipeOf(key);
    const g = materialGate(key)!;
    const said = HUNDRED.unreached(SKILL_BY_KEY[g.skill].name, g.level, g.realm);
    expect(said).toBe(`opens at ${SKILL_BY_KEY[r.skill].name} level ${r.level}, realm ${r.realm}`);
    expect(said).toContain('Vein Delving');
    expect(HUNDRED.why.material('Fallen Star Iron', 'Vein Delving', r.level, r.realm)).toContain(`level ${r.level}, realm ${r.realm}`);
  });

  it('a line opens exactly at its gate: one level short is shut, the level itself is open', () => {
    const key = CRUCIBLE.luck(1);
    const g = materialGate(key)!;
    const xp = XP_TABLE[g.level];
    const below = xp - 1;
    const at = (x: number, realm: number) => materialReached({ realm, crafts: { xp: { [g.skill]: x } } } as never, key);
    expect(at(xp, g.realm)).toBe(true);
    expect(at(below, g.realm)).toBe(false);
    expect(at(xp, g.realm - 1)).toBe(false);
  });

  it('the plan lists every line once, in the order they open', () => {
    for (let realm = 1; realm <= 9; realm++) {
      const list = linesByOpening(realm);
      expect(list.map((x) => x.affix).sort()).toEqual([...AFFIXES].sort());
      for (let i = 1; i < list.length; i++) {
        const [a, b] = [list[i - 1], list[i]];
        expect(a.realm < b.realm || (a.realm === b.realm && a.level <= b.level)).toBe(true);
      }
    }
  });
});
