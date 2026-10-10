import { describe, expect, it } from 'vitest';
import {
  GEAR, RARITY_INFO, SLOTS, baseValue, setBonus, valueOf,
  type Item, type Refined, type Slot, type Worn,
} from '../../data/gear.ts';
import {
  REFINE_GAIN, REFINE_LIMIT, clampRefine, refineCeiling, refineCost, refineFactor, refineSpent,
} from '../refine.ts';
import { canRefine, refine, refinePrice } from '../trials.ts';
import { equip } from '../chest.ts';
import { newState, power, rate, type State } from '../state.ts';
import { validate } from '../load.ts';
import { levelCap } from '../balance.ts';
import { floorLoot } from '../tower.ts';
import { itemWorth } from '../chest.ts';
import { num } from '../format.ts';
import { FLOOR_LOOT, FLOOR_LOOT_GROWTH } from '../balance.ts';
import { playEndgame } from '../../../tools/endgame.ts';

const T0 = 1_700_000_000;

const piece = (slot: Slot, realm: number, id = 'x'): Item => {
  const tpl = GEAR.filter((g) => g.slot === slot && g.realm === realm)[0];
  return {
    id: `${tpl.key}-${id}`, template: tpl.key, rarity: 'heaven',
    rolls: [{ affix: tpl.affix, value: baseValue(tpl, 'heaven', tpl.affix) }],
  };
};

/** A full 天 set, and every place on the body refined `level` times. */
const dressed: Worn = Object.fromEntries(SLOTS.map((s) => [s, piece(s, 9)])) as Worn;
const everywhere = (level: number): Refined => Object.fromEntries(SLOTS.map((s) => [s, level]));
const setAt = (level: number) => setBonus(dressed, () => 1, everywhere(level));

function atCap(realm: number, materials = 0): State {
  const cap = levelCap(realm);
  return {
    ...newState(T0), realm, layer: 8, materials,
    levels: { technique: cap, method: cap, pills: cap, cores: cap },
  };
}

describe('煉器 refining', () => {
  it('prints the price, and gives material somewhere to go at last', () => {
    // The fault it was built for: everything material could buy cost 93.6M, and the
    // tower alone paid 803M over its first ninety floors.
    let tower = 0;
    for (let f = 1; f <= 90; f++) tower += floorLoot(f);
    const rows = [0, 5, 10, 15, 20, 25, 30].map((n) =>
      `    level ${String(n).padStart(2)}   next ${num(refineCost(n)).padStart(8)} 材` +
      `   all of it ${num(refineSpent(n)).padStart(8)}   lines ×${refineFactor(n).toFixed(2)}`);
    console.log(`\n  煉器 one place, level by level:\n${rows.join('\n')}`);
    console.log(`  a full 天 set: 力 ×${setAt(0).power.toFixed(2)} unrefined, ` +
      `×${setAt(20).power.toFixed(2)} at 煉 20, ` +
      `×${setAt(30).power.toFixed(2)} at 煉 30`);
    console.log(`  the tower's first ninety floors pay ${num(tower)} 材, which reaches about ` +
      `煉 ${[...Array(40).keys()].filter((n) => refineSpent(n) * 6 <= tower).pop()} across six places\n`);

    // Bottomless, and always dearer than the last.
    for (let n = 1; n < 60; n++) expect(refineCost(n)).toBeGreaterThan(refineCost(n - 1));
    // A run's material roughly doubles what gear is worth. Not five times, not a tenth.
    const gain = setAt(22).power / setAt(0).power;
    expect(gain).toBeGreaterThan(1.5);
    expect(gain).toBeLessThan(2.5);
  });

  it('is read by every number that reads a roll', () => {
    const plain = piece('weapon', 9);
    // A refined place has to be worth more *everywhere at once*, or the level the player
    // paid for stops being the number the game uses.
    expect(refineFactor(0)).toBe(1);
    expect(refineFactor(10)).toBeCloseTo((1 + REFINE_GAIN) ** 10, 9);
    expect(valueOf(plain, plain.rolls[0].affix, 10))
      .toBeCloseTo(valueOf(plain, plain.rolls[0].affix) * refineFactor(10), 6);
    expect(setAt(10).power).toBeGreaterThan(setAt(0).power);
    expect(itemWorth(plain, 10)).toBeGreaterThan(itemWorth(plain));
  });

  it('is paid in material, never in qi, and refuses rather than half-applying', () => {
    const poor: State = { ...atCap(9, 0), worn: { weapon: piece('weapon', 9) } };
    expect(canRefine(poor, 'weapon')).toBe(false);
    expect(refine(poor, 'weapon')).toBe(poor);
    // An empty slot cannot be refined, and asking costs nothing.
    expect(refinePrice(poor, 'robe')).toBeNull();
    expect(refine(poor, 'robe')).toBe(poor);

    const rich = { ...poor, materials: 1e9 };
    const after = refine(rich, 'weapon');
    // 承 The place gains the level; the piece is the very same piece.
    expect(after.refined.weapon).toBe(1);
    expect(after.worn).toBe(rich.worn);
    expect(after.materials).toBe(rich.materials - refineCost(0));
    expect(power(after)).toBeGreaterThan(power(rich));
    // The rule the whole economy stands on.
    expect(rate(after)).toBe(rate(rich));
    expect(after.qi).toBe(rich.qi);
  });

  it('keeps the levels on the place on the body, never on the piece', () => {
    // 承 rekaris, on the Discord: a count shared by the whole body belongs in a record of
    // its own. A run's material poured into the weapon's place is in every sword worn
    // there, and nothing done to a sword moves it.
    const s: State = { ...atCap(9, 1e12), worn: { weapon: piece('weapon', 9) }, chest: [piece('weapon', 9, 'y')] };
    let held = s;
    for (let i = 0; i < 8; i++) held = refine(held, 'weapon');
    expect(held.refined).toEqual({ weapon: 8 });

    const on = equip(held.worn, held.chest, held.chest[0], 'weapon');
    const swapped: State = { ...held, worn: on.worn, chest: [...on.chest] };
    expect(swapped.worn.weapon?.id).toBe(piece('weapon', 9, 'y').id);
    expect(swapped.refined).toEqual({ weapon: 8 });
    expect(power(swapped)).toBe(power(held));
  });

  it('will not let a save claim a piece it never paid for', () => {
    expect(clampRefine(undefined)).toBe(0);
    expect(clampRefine(-4)).toBe(0);
    expect(clampRefine(7.9)).toBe(7);
    expect(clampRefine(1e9)).toBe(REFINE_LIMIT);

    const tpl = GEAR.filter((g) => g.slot === 'weapon' && g.realm === 9)[0];
    const sword = { id: 'w', template: tpl.key, rarity: 'heaven' as const,
      rolls: [{ affix: tpl.affix, value: baseValue(tpl, 'heaven', tpl.affix) }] };
    // Claimed both ways: the place's record, and an old save's level on the piece.
    const onPlace = { ...newState(T0), v: 1, realm: 9, worn: { weapon: sword }, refined: { weapon: 99999, robe: -3, ring: 'x' } };
    const onPiece = { ...newState(T0), v: 1, realm: 9, worn: { weapon: { ...sword, refine: 99999 } } };
    // 頂 Not to the arithmetic guard any more, but to what this save could have paid
    // for: a cultivator ten seconds old, with no tower, holds a place at a level in the
    // teens at most, not one worth a hundred thousand of itself.
    for (const forged of [onPlace, onPiece]) {
      const back = validate(forged, T0 + 10);
      expect(back.refined.weapon ?? 0).toBeLessThan(20);
      expect(back.refined.weapon ?? 0).toBeLessThan(REFINE_LIMIT);
      expect(Object.keys(back.refined)).toEqual(['weapon']);
      expect('refine' in back.worn.weapon!).toBe(false);
    }
    expect(RARITY_INFO.heaven.mult).toBeGreaterThan(0);
  });

  /**
   * 頂 The ceiling rides the tower, one level for every four floors, which is the same
   * four floors a level costs. So the deeper the save, the deeper a place may be.
   */
  it('lets the ceiling climb with the tower', () => {
    const at = (floor: number) =>
      refineCeiling(FLOOR_LOOT * FLOOR_LOOT_GROWTH ** Math.max(0, floor - 1) * 1e4);
    expect(at(343)).toBeGreaterThan(at(90));
    expect(at(3000)).toBeGreaterThan(at(343) + 600);
    expect(at(3000)).toBeLessThanOrEqual(REFINE_LIMIT);
    expect(refineCeiling(0)).toBe(0);
    expect(refineCeiling(Number.NaN)).toBe(0);
  });

  /**
   * 存 And a save that really did the refining keeps every level of it. This is the
   * whole risk of a derived ceiling: a number too tight deletes a real cultivator's
   * work on every load, which is what 氣查 the audit found three caps doing already.
   * Forty crossings on the lean that refines hardest, round-tripped.
   */
  it('never takes a level from a cultivator who really paid for it', () => {
    const g = playEndgame(40, 'refine');
    const back = validate(JSON.parse(JSON.stringify(g.end)), g.end.at);
    expect(back.refined).toEqual(g.end.refined);
    expect(Math.max(...SLOTS.map((x) => g.end.refined[x] ?? 0))).toBeGreaterThan(90);
  }, 60_000);
});
