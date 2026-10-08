import { describe, expect, it } from 'vitest';
import { RECIPES } from '../../data/crafts.ts';
import { GEAR, SLOTS, TEMPLATE_BY_KEY } from '../../data/gear.ts';
import { byPlace, lookRuns } from '../screens/Crafts.tsx';
import { linesOfShapes } from '../ui/Hundred.tsx';

/**
 * 形 Shapes of one realm and place that lead with the same line are one piece in several
 * looks (rekaris, 2026-10-07: fifty-four rows a realm was clutter). The forge's gear list and
 * the crucible show them as one row with a switcher, and nothing under it changes: every
 * recipe keeps its key, so no save and no check on the server is touched.
 */
describe('形 one piece, several looks', () => {
  const gear = RECIPES.filter((r) => r.makes.kind === 'gear');
  const tplOf = (r: (typeof RECIPES)[number]) => TEMPLATE_BY_KEY[(r.makes as { template: string }).template];

  it('every gear recipe is in exactly one run, and a run is one realm, place and line', () => {
    for (let realm = 1; realm <= 9; realm++) {
      const list = gear.filter((r) => r.realm === realm).sort(byPlace);
      const runs = lookRuns(list, true);
      expect(runs.flat().map((r) => r.key)).toEqual(list.map((r) => r.key));
      for (const rs of runs) {
        expect(new Set(rs.map(tplOf).map((x) => `${x.realm}:${x.slot}:${x.affix}`)).size).toBe(1);
      }
      // No two runs of one place share a line: the grouping is whole.
      const seen = runs.map((rs) => `${tplOf(rs[0]).slot}:${tplOf(rs[0]).affix}`);
      expect(new Set(seen).size).toBe(seen.length);
      expect(runs.length, `realm ${realm}`).toBeLessThan(list.length);
    }
  });

  it('the five power weapons of a realm are one row', () => {
    const list = gear.filter((r) => r.realm === 1).sort(byPlace);
    const run = lookRuns(list, true).find((rs) => rs.some((r) => r.key.endsWith(':sword')))!;
    const shapes = run.map((r) => tplOf(r).archetype);
    for (const s of ['sword', 'saber', 'crescent', 'spear', 'trident']) expect(shapes).toContain(s);
  });

  it('outside the gear list, nothing is grouped', () => {
    const list = gear.filter((r) => r.realm === 1).sort(byPlace);
    expect(lookRuns(list, false).every((rs) => rs.length === 1)).toBe(true);
  });

  it('the crucible gathers every shape of a place once, by its line', () => {
    for (let realm = 1; realm <= 9; realm++) {
      for (const slot of SLOTS) {
        const lines = linesOfShapes(realm, slot);
        const all = GEAR.filter((g) => g.realm === realm && g.slot === slot);
        expect(lines.flatMap(([, gs]) => gs.map((g) => g.key)).sort()).toEqual(all.map((g) => g.key).sort());
        for (const [a, gs] of lines) expect(gs.every((g) => g.affix === a)).toBe(true);
      }
    }
    expect(linesOfShapes(1, 'weapon').length).toBe(5);
  });
});
