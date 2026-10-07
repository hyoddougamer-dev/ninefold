import { describe, expect, it } from 'vitest';
import { RECIPES, RECIPE_BY_KEY, XP_TABLE, metalKey, partKey, tierLevel, type SkillKey } from '../../data/crafts.ts';
import { ARCHETYPES, TEMPLATE_BY_KEY, schoolOfShape } from '../../data/gear.ts';
import { SCHOOLS } from '../../data/schools.ts';
import { BEASTS } from '../../data/bestiary.ts';
import { NO_CRAFTS, blocked, setTask, work, type Crafts } from '../crafts.ts';
import { fusable } from '../chest.ts';
import { salvage } from '../salvage.ts';
import { newState, type State } from '../state.ts';
import { playShape } from '../../../tools/anyshape.ts';
import { SCHOOL_FULL } from '../balance.ts';

/**
 * 百形 Every shape of a realm at the forge, once its warden has fallen.
 *
 * Bruno, 2026-10-06: a pure set of one school out of one realm was impossible, because a
 * realm's beasts teach twelve of its fifty-four shapes. The warden now teaches the rest, at
 * its own price; the drop tables are what they were; a forged piece still never fuses.
 */

const T0 = 1_700_000_000;

function crafter(realm: number, levels: Partial<Record<SkillKey, number>> = {}, over: Partial<Crafts> = {}, s: Partial<State> = {}): State {
  const base = newState(T0);
  const xp = { ...NO_CRAFTS.xp };
  for (const [k, l] of Object.entries(levels)) xp[k as SkillKey] = XP_TABLE[l as number];
  return {
    ...base, realm, layer: 4, startedAt: T0 - 200 * 86_400, materials: 1e9, qi: 1e6, ...s,
    crafts: { ...NO_CRAFTS, since: T0, ...over, xp: { ...xp, ...(over.xp ?? {}) } },
  };
}

const wardenOf = (realm: number) => BEASTS.find((b) => b.warden && b.realm === realm)!;
const gearOf = (realm: number) => RECIPES.filter((r) => r.makes.kind === 'gear' && r.realm === realm);

describe('百形 the forge makes every shape of a realm', () => {
  it('every realm forges all fifty-four shapes, and a pure set of every school fits in one realm', () => {
    for (let realm = 1; realm <= 9; realm++) {
      const templates = new Set(gearOf(realm).map((r) => (r.makes as { template: string }).template));
      expect(templates.size, `realm ${realm}`).toBe(ARCHETYPES.length);
      for (const sc of SCHOOLS) {
        const places = new Set([...templates].filter((t) => schoolOfShape(TEMPLATE_BY_KEY[t].key.replace(/\d+$/, '')) === sc)
          .map((t) => TEMPLATE_BY_KEY[t].slot));
        expect(places.size, `realm ${realm} ${sc}`).toBeGreaterThanOrEqual(SCHOOL_FULL);
      }
    }
  });

  it('teaches only what no beast of the realm leaves, at the warden\'s own price', () => {
    let taught = 0;
    for (const r of RECIPES.filter((x) => x.anyShape)) {
      taught++;
      const w = wardenOf(r.realm);
      const shape = (r.makes as { template: string }).template.replace(/\d+$/, '');
      expect(BEASTS.filter((b) => b.realm === r.realm).some((b) => b.leaves.includes(shape)), r.key).toBe(false);
      expect(r.remains).toBe(w.key);
      expect(r.level).toBe(tierLevel(r.realm) + 7);
      expect(r.needs).toEqual([[metalKey(r.realm), 3], [partKey(w.key), 2], ['mat', 25 * r.realm]]);
      expect(r.graded).toBe(true);
    }
    // 底 Forty-odd a realm, nine realms.
    expect(taught).toBeGreaterThan(9 * 40);
  });

  it('leaves the drop tables as they were: every beast still teaches its own three shapes', () => {
    for (const b of BEASTS) {
      for (const shape of b.leaves) {
        if (!ARCHETYPES.some((a) => a.key === shape)) continue;
        expect(RECIPE_BY_KEY[`forge:gear:${b.key}:${shape}`]?.anyShape, `${b.key}:${shape}`).toBeUndefined();
      }
    }
  });

  it('waits for the warden, then forges a piece that never fuses and melts back to metal', () => {
    const r = RECIPES.find((x) => x.anyShape && x.realm === 3 && TEMPLATE_BY_KEY[(x.makes as { template: string }).template].slot === 'ring')!;
    const w = wardenOf(3);
    const pouch = { [metalKey(3)]: 60, [partKey(w.key)]: 40 };
    const before = crafter(3, { forge: 40 }, { pouch });
    expect(blocked(before, r)).toBe('remains');
    const s0 = { ...before, killed: { ...before.killed, [w.key]: 1 } };
    expect(blocked(s0, r)).toBe(null);
    const s1 = work(setTask(s0, r.key, T0), T0 + 3 * r.seconds + 1);
    expect(s1.chest.length).toBe(3);
    for (const it of s1.chest) {
      expect(it.template).toBe((r.makes as { template: string }).template);
      expect(it.from).toBe('forge');
    }
    expect(fusable(s1.chest)).toEqual([]);
    const melted = salvage(s1, s1.chest.map((x) => x.id));
    expect(melted.qi).toBe(s1.qi);
  });
});

describe('量 is it a shortcut (tools/anyshape.ts)', () => {
  // The plain crafter, and the two schools a realm's beasts left shortest: 法 Arts (four
  // places at the fifth realm) and 體 Body (none at the ninth).
  const plain = playShape(null, 'any');
  it.each(['arts', 'body'] as const)('%s: forging any shape neither shortens the climb by more than two days nor makes a power spike', (b) => {
    const before = playShape(b, 'taught');
    const after = playShape(b, 'any');
    console.log(`    ${b}: realm 9 on day ${before.realm9?.toFixed(1)} forging the taught shapes, ${after.realm9?.toFixed(1)} any shape; `
      + `power there ×${(before.power / plain.power).toFixed(2)} → ×${(after.power / plain.power).toFixed(2)} of the plain crafter`);
    expect(plain.realm9).toBeDefined();
    expect(before.realm9).toBeDefined();
    expect(after.realm9).toBeDefined();
    expect(after.realm9!).toBeGreaterThan(before.realm9! - 2);
    // A pure set is a class, not a ladder: never far past the cultivator who wears whatever is best.
    expect(after.power).toBeLessThan(plain.power * 1.6);
  }, 120_000);
});
