import { describe, expect, it } from 'vitest';
import { compare, ifBare, ifWorn, linesOf, swing } from '../inspect.ts';
import { RARITIES, SECONDARIES, templateOf, type Item, type Rarity } from '../../data/gear.ts';
import { newState, power, type State } from '../state.ts';
import { rate } from '../time.ts';

const T0 = 1_700_000_000;

const piece = (id: string, template: string, rarity: Rarity,
  rolls: { affix: string; value: number }[], refine?: number): Item =>
  ({ id, template, rarity, rolls: rolls as Item['rolls'], ...(refine ? { refine } : {}) });

const hero = (worn: Partial<Record<string, Item>> = {}): State =>
  ({ ...newState(T0), realm: 5, layer: 4, worn: worn as State['worn'] });

/**
 * 鑑 Reading a piece, and the lie the old comparison told.
 *
 * The chest used to mark a piece "better" with a ▲ computed from **the sum of the raw
 * roll values**. A 藏 chest-slots roll and a 力 power roll are not the same kind of
 * number, and adding them answers nothing — so four small lines could out-triangle a
 * piece that doubles your power, and the arrow pointed at the wrong item.
 *
 * The comparison now puts the piece on in a copy of the save and asks `power()` and
 * `rate()` what happened. These are the tests that keep it honest.
 */
describe('鑑 what a piece would do', () => {
  it('says nothing changed when the piece is the one already worn', () => {
    const sword = piece('a', 'sword5', 'spirit', [{ affix: 'power', value: 12 }]);
    const s = hero({ weapon: sword });
    const m = swing(s, sword);
    expect(m.power).toBeCloseTo(1, 9);
    expect(m.rate).toBeCloseTo(1, 9);
    expect(m.better).toBe(false);
  });

  /**
   * The bug the old heuristic had, written down as a test.
   *
   * A piece with four small lines on axes that do nothing for power or rate adds up to
   * more raw roll value than a piece with one enormous power line. The sum said the
   * first was better. The game says the second is.
   */
  it('is not fooled by a pile of small lines on axes that do nothing', () => {
    const s = hero({});
    const fat = piece('fat', 'sword5', 'heaven', [{ affix: 'power', value: 34 }]);
    const wide = piece('wide', 'sword5', 'heaven', [
      { affix: 'capacity', value: 3 }, { affix: 'find', value: 9 },
      { affix: 'luck', value: 12 }, { affix: 'refine', value: 14 },
    ]);
    const rawFat = fat.rolls.reduce((t, r) => t + r.value, 0);
    const rawWide = wide.rolls.reduce((t, r) => t + r.value, 0);
    expect(rawWide).toBeGreaterThan(rawFat);              // the old measure preferred this
    expect(swing(s, fat).power).toBeGreaterThan(swing(s, wide).power);
    expect(swing(s, fat).better).toBe(true);
  });

  it('calls a straight downgrade a downgrade', () => {
    const good = piece('g', 'sword5', 'heaven', [{ affix: 'power', value: 30 }]);
    const poor = piece('p', 'sword5', 'common', [{ affix: 'power', value: 4 }]);
    const s = hero({ weapon: good });
    expect(swing(s, poor).power).toBeLessThan(1);
    expect(swing(s, poor).better).toBe(false);
  });

  it('counts 煉 refining, because the player paid for it', () => {
    const plain = piece('a', 'sword5', 'spirit', [{ affix: 'power', value: 12 }]);
    const honed = piece('b', 'sword5', 'spirit', [{ affix: 'power', value: 12 }], 10);
    const s = hero({});
    expect(swing(s, honed).power).toBeGreaterThan(swing(s, plain).power);
    expect(compare(honed)[0].theirs).toBeGreaterThan(compare(plain)[0].theirs);
  });

  /**
   * 比 Both sides of the trade, always. A comparison that only listed the winner's
   * lines would hide half of every swap — losing 破 sunder is as much a fact as
   * gaining 力 power.
   */
  it('lists every axis either piece touches, and only those', () => {
    const worn = piece('w', 'sword5', 'spirit', [
      { affix: 'power', value: 12 }, { affix: 'sunder', value: 2 }]);
    const held = piece('h', 'sword5', 'earth', [
      { affix: 'power', value: 20 }, { affix: 'rate', value: 8 }]);
    const rows = compare(held, worn);
    const axes = rows.map((r) => r.affix).sort();
    expect(axes).toEqual(['power', 'rate', 'sunder']);
    expect(rows.find((r) => r.affix === 'sunder')!.theirs).toBe(0);
    expect(rows.find((r) => r.affix === 'sunder')!.mine).toBe(2);
    expect(rows.find((r) => r.affix === 'rate')!.mine).toBe(0);
  });

  it('puts the piece on and takes it off without touching anything else', () => {
    const sword = piece('a', 'sword5', 'spirit', [{ affix: 'power', value: 12 }]);
    const s = hero({});
    const on = ifWorn(s, sword);
    expect(on.worn.weapon).toBe(sword);
    expect(on.qi).toBe(s.qi);
    expect(on.chest).toBe(s.chest);
    expect(ifBare(on, sword).worn.weapon).toBeUndefined();
    // And it goes in the slot the template names, not the one the caller guesses.
    expect(templateOf(sword).slot).toBe('weapon');
  });

  it('knows how many lines a rank carries', () => {
    for (const r of RARITIES) expect(linesOf(r)).toBe(1 + SECONDARIES[r]);
    expect(linesOf('common')).toBe(1);
    expect(linesOf('heaven')).toBe(5);
  });

  it('agrees with the sim it is describing', () => {
    // The whole point: no second opinion. The swing is power() and rate(), nothing else.
    const s = hero({});
    const it = piece('x', 'robe5', 'earth', [{ affix: 'rate', value: 18 }]);
    const m = swing(s, it);
    expect(m.power).toBeCloseTo(power(ifWorn(s, it)) / power(s), 9);
    expect(m.rate).toBeCloseTo(rate(ifWorn(s, it)) / rate(s), 9);
  });
});
