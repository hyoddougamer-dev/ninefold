import { describe, expect, it } from 'vitest';
import { bond, bondable, canBond, companionOf } from '../companion.ts';
import { companionShare, fight, oddsRaw } from '../combat.ts';
import { newState, power, validate, type State } from '../state.ts';
import { BEASTS, commonsOf, wardenOf } from '../../data/bestiary.ts';
import { COMPANION_BLOW, COMPANION_FADE, MARKS } from '../balance.ts';

/** 靈獸 A beast mastered is a beast that follows you, and it fights beside you. */
const T0 = 1_700_000_000;
const MASTERED = MARKS[MARKS.length - 1];

function at(realm: number, killed: Record<string, number>, companion: string | null = null): State {
  return { ...newState(T0), realm, layer: 4, killed, companion, levels: { ...newState(T0).levels, technique: 9 * realm } };
}

describe('靈獸 the spirit companion', () => {
  const wolf = commonsOf(4)[1];

  it('follows only a cultivator who has mastered it, and never a warden', () => {
    expect(canBond({ [wolf.key]: MASTERED - 1 }, wolf.key)).toBe(false);
    expect(canBond({ [wolf.key]: MASTERED }, wolf.key)).toBe(true);
    const fox = wardenOf(1);
    expect(canBond({ [fox.key]: 1e6 }, fox.key)).toBe(false);
    const s = at(4, { [wolf.key]: MASTERED });
    expect(bondable(s).map((b) => b.key)).toEqual([wolf.key]);
    expect(bond(s, 'rat')).toBe(s);
    const with_ = bond(s, wolf.key);
    expect(companionOf(with_)?.key).toBe(wolf.key);
    expect(bond(with_, null).companion).toBeNull();
  });

  it('a save cannot claim a companion it did not earn', () => {
    expect(validate({ ...at(4, { [wolf.key]: 3 }), companion: wolf.key }, T0).companion).toBeNull();
    expect(validate({ ...at(4, { [wolf.key]: MASTERED }), companion: wolf.key }, T0).companion).toBe(wolf.key);
    expect(validate({ ...at(4, {}), companion: 'nobody' }, T0).companion).toBeNull();
  });

  it('strikes for a share of your blow that fades with every realm it is behind', () => {
    const s = at(4, { [wolf.key]: MASTERED }, wolf.key);
    expect(companionShare(s)).toBeCloseTo(COMPANION_BLOW, 9);
    expect(companionShare({ ...s, realm: 6 })).toBeCloseTo(COMPANION_BLOW * COMPANION_FADE ** 2, 9);
    expect(companionShare({ ...s, companion: null })).toBe(0);
  });

  it('changes nothing for somebody with no companion, and helps somebody with one', () => {
    const warden = wardenOf(4);
    const alone = at(4, { [wolf.key]: MASTERED });
    const withIt = { ...alone, companion: wolf.key };
    // No companion: the fight reads no extra die, so it is the fight it always was.
    const before = fight({ ...alone, companion: null } as State, warden, 7);
    const again = fight(alone, warden, 7);
    expect(again).toEqual(before);
    expect(before.rounds.every((r) => r.petDamage === 0)).toBe(true);
    // With one: every round it strikes, and the odds are never worse.
    const f = fight(withIt, warden, 7);
    expect(f.rounds.some((r) => r.petDamage > 0)).toBe(true);
    const stand = power(alone) * 1.2;
    expect(oddsRaw(withIt, warden, stand)).toBeGreaterThanOrEqual(oddsRaw(alone, warden, stand));
    console.log(`\n  靈獸 a realm-four companion against 1.2x your power: `
      + `${Math.round(oddsRaw(alone, warden, stand) * 100)}% alone, ${Math.round(oddsRaw(withIt, warden, stand) * 100)}% with it\n`);
    expect(BEASTS.filter((b) => b.warden).every((b) => !canBond({ [b.key]: 1e6 }, b.key))).toBe(true);
  });
});
