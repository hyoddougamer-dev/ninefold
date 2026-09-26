import { describe, expect, it } from 'vitest';
import { BEASTS } from '../../data/bestiary.ts';
import { RARITIES } from '../../data/gear.ts';
import { FATE_FLOOR, FATE_FULL, FATE_TOP_COMMON } from '../balance.ts';
import { dropFor, fateDue, fateOf, fatePromise, noteFate } from '../fate.ts';
import { drive } from '../hunt.ts';
import { newState, validate, type State } from '../state.ts';

const T0 = 1_700_000_000;
const at = (realm: number, fate: State['fate'] = {}): State =>
  ({ ...newState(T0), realm, layer: 9, fate, qi: 1e30 });
const boar = BEASTS.find((b) => b.key === 'boar')!;
const tiger = BEASTS.find((b) => b.key === 'tiger')!;

/**
 * 緣 Bad luck has an end. Bruno: *"deve ser lógico, não 100% rng."*
 */
describe('緣 the bond with a beast', () => {
  it('fills by one a win, and the win that fills it always leaves a piece at the promise', () => {
    let s = at(4);
    for (let i = 0; i < FATE_FULL - 1; i++) s = noteFate(s, boar, null);
    expect(fateOf(s, 'boar').n).toBe(FATE_FULL - 1);
    expect(fateDue(s, boar)).toBe(true);
    for (let seed = 1; seed < 60; seed++) {
      const it = dropFor(s, boar, seed);
      expect(it).not.toBeNull();
      expect(RARITIES.indexOf(it!.rarity)).toBeGreaterThanOrEqual(FATE_FLOOR);
    }
    const after = noteFate(s, boar, dropFor(s, boar, 7));
    expect(fateOf(after, 'boar').n).toBe(0);
  });

  it('promises a rank above the best the beast has left, up to Earth for a common and Heaven for a warden', () => {
    expect(fatePromise(at(4, { boar: { n: 0, best: -1 } }), boar)).toBe(FATE_FLOOR);
    expect(fatePromise(at(4, { boar: { n: 0, best: 2 } }), boar)).toBe(3);
    expect(fatePromise(at(4, { boar: { n: 0, best: 4 } }), boar)).toBe(FATE_TOP_COMMON);
    expect(fatePromise(at(4, { tiger: { n: 0, best: 3 } }), tiger)).toBe(4);
  });

  it('moves nothing before gear opens', () => {
    const s = at(1);
    expect(dropFor(s, BEASTS[0], 1)).toBeNull();
    expect(noteFate(s, BEASTS[0], null)).toBe(s);
  });

  it('fills inside a drive exactly as it would tapped', () => {
    // 熟 Driving wants the Known mark: ten wins over the beast already.
    const s = { ...at(4), killed: { boar: 10 } };
    const d = drive(s, boar, 25, 11);
    expect(d.kills).toBe(25);
    expect(fateOf(d.state, 'boar').n).toBe(25 % FATE_FULL);
  });

  it('survives a save, and a forged one cannot claim a full bar or a beast that does not exist', () => {
    const s = at(4, { boar: { n: 4, best: 2 } });
    const back = validate(JSON.parse(JSON.stringify(s)), T0 + 10);
    expect(back.fate.boar).toEqual({ n: 4, best: 2 });
    const forged = validate({ ...JSON.parse(JSON.stringify(s)), fate: { boar: { n: 99, best: 9 }, dragonking: { n: 3, best: 1 } } }, T0 + 10);
    expect(forged.fate.boar).toEqual({ n: FATE_FULL - 1, best: RARITIES.length - 1 });
    expect(forged.fate.dragonking).toBeUndefined();
  });
});
