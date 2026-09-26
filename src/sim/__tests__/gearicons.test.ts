import { describe, expect, it } from 'vitest';
import { ARCHETYPES, GEAR } from '../../data/gear.ts';
import { ERA_ICONS } from '../../data/gearIcons.ts';
import { BEASTS } from '../../data/bestiary.ts';
import { ICONS } from '../../art/icons.generated.ts';
import { gearTile } from '../../art/gear.ts';

/**
 * 形 Every piece its own look. Bruno: *"cada item deve ter o seu icone e ser diferente"*.
 */
describe('形 every piece looks like itself', () => {
  it('draws every shape three ways, and no drawing twice', () => {
    const all = Object.values(ERA_ICONS).flat();
    expect(Object.keys(ERA_ICONS).sort()).toEqual(ARCHETYPES.map((a) => a.key).sort());
    expect(all).toHaveLength(162);
    expect(new Set(all).size).toBe(162);
    for (const n of all) expect(ICONS[n], n).toBeTruthy();
  });

  it('borrows no drawing from a beast', () => {
    const beasts = new Set(BEASTS.map((b) => b.icon));
    for (const n of Object.values(ERA_ICONS).flat()) expect(beasts.has(n), n).toBe(false);
  });

  it('never draws two of the 486 pieces the same', () => {
    const looks = new Set(GEAR.map((g) => gearTile({ id: 'x', template: g.key, rarity: 'mystic', rolls: [] }, { size: 56 })
      .replace(/aria-label="[^"]*"/, '')));
    expect(looks.size).toBe(GEAR.length);
  });
});
