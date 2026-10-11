import { describe, expect, it } from 'vitest';
import { RECIPES } from '../../data/crafts.ts';
import { makerOf } from '../crafts.ts';

/**
 * 往 The recipe a missing material sends a player to (rekaris, on the Discord: a Hundredfold
 * piece should name the craft that makes its ingot, as Crafts already does). makerOf is the one
 * place that answers it, so the Crafts list and the crucible cannot disagree.
 */
describe('往 the recipe that makes an item', () => {
  it('returns a recipe that makes exactly that item, and none for an item nothing makes', () => {
    for (const r of RECIPES) {
      if (r.makes.kind !== 'item') continue;
      const m = makerOf(r.makes.item);
      expect(m?.makes, r.key).toBeDefined();
      expect(m?.makes.kind === 'item' && m.makes.item, r.makes.item).toBe(r.makes.item);
    }
    expect(makerOf('no-such-item')).toBeUndefined();
  });

  it('names the craft for Fallen Star Iron, the Heaven ingot the crucible asks for', () => {
    const m = makerOf('starfall');
    expect(m).toBeDefined();
    expect(m?.name).toBeTruthy();
  });
});
