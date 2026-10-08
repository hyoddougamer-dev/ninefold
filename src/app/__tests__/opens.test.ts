import { describe, expect, it } from 'vitest';
import { HUNDRED_RANKS, RECIPES, SKILL_BY_KEY, XP_TABLE, tierLevel } from '../../data/crafts.ts';
import { CRUCIBLE, CRUCIBLE_NATURAL } from '../../data/hundred.ts';
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

  it('every material of every set at every rank has a gate, and it is the recipe that gathers it', () => {
    for (let realm = 1; realm <= 9; realm++) {
      for (const rank of HUNDRED_RANKS) {
        for (const a of AFFIXES) {
          const key = CRUCIBLE[a](realm, rank);
          const r = recipeOf(key);
          expect(r, `${a} ${realm} ${rank}`).toBeTruthy();
          expect(materialGate(key)).toEqual({ skill: r.skill, level: r.level, realm: r.realm });
        }
      }
    }
  });

  it('the rarer gear line of a Mortal Iron piece at Heaven says Vein Delving, its level and its realm', () => {
    const key = CRUCIBLE.luck(1, 'heaven');
    const r = recipeOf(key);
    const g = materialGate(key)!;
    const said = HUNDRED.unreached(SKILL_BY_KEY[g.skill].name, g.level, g.realm);
    expect(said).toBe(`opens at ${SKILL_BY_KEY[r.skill].name} level ${r.level}, realm ${r.realm}`);
    expect(said).toContain('Vein Delving');
    expect(HUNDRED.why.material('Fallen Star Iron', 'Vein Delving', r.level, r.realm)).toContain(`level ${r.level}, realm ${r.realm}`);
  });

  it('a line opens exactly at its gate: one level short is shut, the level itself is open', () => {
    const key = CRUCIBLE.luck(6, 'heaven');
    const g = materialGate(key)!;
    const xp = XP_TABLE[g.level];
    const below = xp - 1;
    const at = (x: number, realm: number) => materialReached({ realm, crafts: { xp: { [g.skill]: x } } } as never, key);
    expect(at(xp, g.realm)).toBe(true);
    expect(at(below, g.realm)).toBe(false);
    expect(at(xp, g.realm - 1)).toBe(false);
  });

  /**
   * 爐 rekaris, 2026-10-08: the rarer gear line of a Mortal Iron piece asked for Fallen Star
   * Iron, Vein Delving 56 in the sixth realm, so a first-realm cultivator could not craft the
   * first-realm set. Mystic and Earth now ask for nothing their own realm cannot gather;
   * Heaven is still the rank that asks for the rare things.
   */
  it('a Mystic or Earth piece asks for no material from a later realm than its set\'s, nor a craft level past that realm\'s eleven', () => {
    for (let realm = 1; realm <= 9; realm++) {
      for (const rank of ['mystic', 'earth'] as const) {
        for (const a of AFFIXES) {
          const g = materialGate(CRUCIBLE[a](realm, rank))!;
          expect(g.realm, `${a} in set ${realm} at ${rank}`).toBeLessThanOrEqual(realm);
          expect(g.level, `${a} in set ${realm} at ${rank}`).toBeLessThanOrEqual(tierLevel(realm) + 10);
        }
      }
    }
  });

  it('Heaven asks for each line\'s own material, as it always did, and the ninth set is as it was at every rank', () => {
    for (let realm = 1; realm <= 9; realm++) {
      for (const a of AFFIXES) {
        expect(CRUCIBLE[a](realm, 'heaven'), `${a} ${realm}`).toBe(CRUCIBLE_NATURAL[a](realm));
        if (realm === 9 || a === 'rate' || a === 'sunder' || a === 'power') {
          for (const rank of HUNDRED_RANKS) expect(CRUCIBLE[a](realm, rank)).toBe(CRUCIBLE_NATURAL[a](realm));
        }
      }
    }
  });

  it('a cultivator of the set\'s realm with Vein Delving at that realm\'s first level reaches every mined line of it below Heaven', () => {
    for (let realm = 1; realm <= 9; realm++) {
      const s = { realm, crafts: { xp: { vein: XP_TABLE[Math.max(6, tierLevel(realm))] } } } as never;
      for (const rank of ['mystic', 'earth'] as const) {
        for (const a of AFFIXES) {
          const key = CRUCIBLE[a](realm, rank);
          if (materialGate(key)!.skill === 'vein') expect(materialReached(s, key), `${a} in set ${realm} at ${rank}`).toBe(true);
        }
      }
    }
  });

  it('the rule only loosens: whoever could reach a line\'s old material reaches the new one, at every rank', () => {
    for (let realm = 1; realm <= 9; realm++) {
      for (const rank of HUNDRED_RANKS) {
        for (const a of AFFIXES) {
          for (let at = 1; at <= 9; at++) {
            for (const level of [1, 6, 12, 23, 34, 45, 56, 67, 78, 89, 99]) {
              const xp = XP_TABLE[level];
              const s = { realm: at, crafts: { xp: { vein: xp, herb: xp, render: xp } } } as never;
              if (materialReached(s, CRUCIBLE_NATURAL[a](realm))) {
                expect(materialReached(s, CRUCIBLE[a](realm, rank)), `${a} set ${realm} ${rank} at realm ${at} level ${level}`).toBe(true);
              }
            }
          }
        }
      }
    }
  });

  it('the plan lists every line once, in the order they open', () => {
    for (let realm = 1; realm <= 9; realm++) {
      for (const rank of HUNDRED_RANKS) {
        const list = linesByOpening(realm, rank);
        expect(list.map((x) => x.affix).sort()).toEqual([...AFFIXES].sort());
        for (let i = 1; i < list.length; i++) {
          const [a, b] = [list[i - 1], list[i]];
          expect(a.realm < b.realm || (a.realm === b.realm && a.level <= b.level)).toBe(true);
        }
      }
    }
  });
});
