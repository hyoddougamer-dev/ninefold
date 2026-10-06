import { describe, expect, it } from 'vitest';
import { SLOTS, templateOf, type Affix, type Item, type Rarity, type Slot } from '../../data/gear.ts';
import { classBuilds, compareClasses, floorReach } from '../compare.ts';
import { callingKey } from '../schools.ts';
import { wearPieces } from '../sets.ts';
import { newState, power, rate, type State } from '../state.ts';
import { nextFloor } from '../tower.ts';

const T0 = 1_700_000_000;

/** A piece of a shape, leading with the shape's own line. */
const piece = (id: string, template: string, affix: Affix, value: number, rarity: Rarity = 'mystic'): Item =>
  ({ id, template, rarity, rolls: [{ affix, value }] });

/**
 * A fifth-realm chest with 劍 Sword pieces in every place, 氣 Qi pieces in every place and
 * 法 Arts pieces in three. It makes Sword and Qi at their full, and the Sword Immortal
 * (Sword and Qi), the Sword Saint (Sword and Arts) and the Celestial Master (Qi and Arts).
 * Nothing of 運 Fortune, 體 Body or 器 the Artificer, so none of their classes.
 */
function fixture(): State {
  const worn: Partial<Record<Slot, Item>> = {
    weapon: piece('w-sword', 'sword5', 'power', 14),
    robe: piece('w-robe', 'robe5', 'rate', 9),
  };
  const chest: Item[] = [
    piece('saber', 'saber5', 'power', 20, 'earth'),
    piece('spear', 'spear4', 'power', 11),
    piece('vest', 'vest5', 'power', 16),
    piece('visor', 'visor5', 'power', 15),
    piece('greaves', 'greaves5', 'power', 13),
    piece('pendant', 'pendant5', 'power', 12),
    piece('plainring', 'plainring5', 'power', 12),
    piece('fan', 'fan5', 'rate', 12),
    piece('wings', 'wings5', 'rate', 10, 'earth'),
    piece('band', 'band5', 'rate', 9),
    piece('tabi', 'tabi5', 'rate', 9),
    piece('charm', 'charm5', 'rate', 8),
    piece('topaz', 'topaz5', 'rate', 8),
    piece('staff', 'staff5', 'art', 8),
    piece('kimono', 'kimono5', 'art', 8),
    piece('beads', 'beads5', 'art', 7),
  ];
  // 承 The weapon's place is refined twelve times: whatever goes on there has the levels.
  return { ...newState(T0), realm: 5, layer: 4, worn, chest, tower: 8, refined: { weapon: 12 } };
}

describe('較 compare classes', () => {
  const s = fixture();
  const builds = classBuilds(s);
  const keys = builds.map((b) => b.key);

  it('builds every class the chest can make, and only those', () => {
    expect(keys.sort()).toEqual(['celestial', 'qi:2', 'swordimmortal', 'swordsaint', 'sword:2'].sort());
    for (const absent of ['fortune:2', 'body:2', 'artificer:2', 'arts:2', 'wanderer', 'wargod', 'armourer']) {
      expect(keys).not.toContain(absent);
    }
  });

  it('dresses each body as the class it is listed under', () => {
    for (const b of builds) expect(callingKey(b.state)).toBe(b.key);
  });

  it('never wears one piece twice, and loses no piece on the way', () => {
    const before = [...SLOTS.map((slot) => s.worn[slot]?.id), ...s.chest.map((x) => x.id)].filter(Boolean).sort();
    for (const b of builds) {
      const on = SLOTS.map((slot) => b.state.worn[slot]?.id).filter((x): x is string => !!x);
      expect(new Set(on).size).toBe(on.length);
      for (const id of on) expect(b.state.chest.some((x) => x.id === id)).toBe(false);
      const after = [...on, ...b.state.chest.map((x) => x.id)].sort();
      expect(after).toEqual(before);
      for (const slot of SLOTS) {
        const it = b.state.worn[slot];
        if (it) expect(templateOf(it).slot).toBe(slot);
      }
    }
  });

  it('keeps refining with the place on the body, as the gear screen does', () => {
    for (const b of builds) expect(b.state.refined).toEqual({ weapon: 12 });
    // The 劍 Sword body takes the stronger saber, and the saber has the place's levels.
    const sword = builds.find((b) => b.key === 'sword:2')!;
    expect(sword.ids.weapon).toBe('saber');
  });

  it('reads the real numbers of the body it builds', () => {
    for (const b of builds) {
      const again = wearPieces(s, b.ids).state;
      expect(b.power).toBe(power(again));
      expect(b.rate).toBe(rate(again));
      expect(again.worn).toEqual(b.state.worn);
    }
    const sword = builds.find((b) => b.key === 'sword:2')!;
    const qi = builds.find((b) => b.key === 'qi:2')!;
    expect(sword.power).toBeGreaterThan(qi.power);
    expect(qi.rate).toBeGreaterThan(sword.rate);
  });

  it('counts the tower up from the next floor, and is read once per body', () => {
    // 算 Built once per chest and worn body, and each body's floors read once.
    expect(classBuilds(s)).toBe(builds);
    const rows = compareClasses(s);
    expect(compareClasses(s).map((r) => r.floor)).toEqual(rows.map((r) => r.floor));
    for (const r of rows) {
      if (r.floor === null) continue;
      expect(r.floor).toBeGreaterThanOrEqual(nextFloor(s.tower));
      expect(r.floor).toBe(floorReach(r.state));
    }
    expect(rows.some((r) => r.floor !== null)).toBe(true);
  });

  it('builds nothing from an empty chest and a bare body', () => {
    expect(classBuilds({ ...newState(T0), realm: 5 })).toEqual([]);
  });

  it('opens fast enough for a phone on a full chest', () => {
    const many: Item[] = [];
    const shapes: [string, Affix][] = [['sword', 'power'], ['fan', 'rate'], ['staff', 'art'], ['scythe', 'luck'],
      ['hooks', 'sunder'], ['vest', 'power'], ['robe', 'rate'], ['kimono', 'art'], ['cloak', 'luck'], ['pauldrons', 'sunder'],
      ['mantle', 'capacity'], ['visor', 'power'], ['band', 'rate'], ['ritual', 'art'], ['laurel', 'luck'], ['horned', 'sunder'],
      ['bonecrown', 'refine'], ['greaves', 'power'], ['tabi', 'rate'], ['windfoot', 'art'], ['sandals', 'find'],
      ['ironboots', 'sunder'], ['furboots', 'capacity'], ['pendant', 'power'], ['charm', 'rate'], ['beads', 'art'],
      ['medal', 'luck'], ['bonecharm', 'sunder'], ['scroll', 'refine'], ['plainring', 'power'], ['topaz', 'rate'],
      ['flamering', 'art'], ['amethyst', 'luck'], ['frostring', 'sunder'], ['spiralring', 'refine']];
    shapes.forEach(([shape, affix], i) => {
      many.push(piece(`a${i}`, `${shape}5`, affix, 6 + (i % 5)));
      many.push(piece(`b${i}`, `${shape}4`, affix, 5 + (i % 3)));
    });
    const full = { ...fixture(), chest: many };
    const t = performance.now();
    const rows = compareClasses(full);
    const took = performance.now() - t;
    expect(rows.length).toBe(21);
    for (const r of rows) expect(callingKey(r.state)).toBe(r.key);
    expect(took).toBeLessThan(3000);
    console.log(`較 ${rows.length} classes from ${many.length} pieces in ${Math.round(took)} ms`);
  });
});
