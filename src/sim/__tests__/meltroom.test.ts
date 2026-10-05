import { describe, expect, it } from 'vitest';
import { MELT_CAP, MELT_FILL, MELT_MATERIAL, PAIR_MELT } from '../balance.ts';
import { ARCHETYPES, TEMPLATE_BY_KEY, type Item, type Worn } from '../../data/gear.ts';
import { SCHOOL_INFO, type School } from '../../data/schools.ts';
import { classMelt } from '../schools.ts';
import { melt, meltMaterial, meltSpill, salvage, salvageValue, meltFactor } from '../salvage.ts';
import { stash } from '../stash.ts';
import { newState, rate, validate, type State } from '../state.ts';
import { advance } from '../time.ts';

const T0 = 1_700_000_000;
const piece = (id: string, realm: number): Item => ({
  id, template: `sword${realm}`, rarity: 'spirit', refine: 0, rolls: [{ affix: 'power', value: 10 }],
});
const at = (realm: number, melt: number): State => ({ ...newState(T0), realm, layer: 3, melt });

/**
 * 拆 The melting allowance. rekaris, on the Discord: "gathering qi by melting down is the
 * fastest way". With the auto-hunt it was: the ninth realm on day 12 instead of 44. See
 * MELT_FILL for the measurement; these hold the rule that fixed it.
 */
describe('拆 the melting allowance', () => {
  it('pays a melt in full while the allowance holds it, and draws it down by the qi paid', () => {
    const s = at(2, MELT_CAP);
    const p = piece('a', 2);
    const worth = salvageValue(p, meltFactor(s));
    const m = melt(s, [p]);
    expect(m.qi).toBe(worth);
    expect(m.materials).toBe(0);
    expect(m.state.melt).toBeCloseTo(MELT_CAP - worth / rate(s), 6);
  });

  it('pays material, not qi, once the allowance is spent', () => {
    const s = at(2, 0);
    const p = piece('a', 2);
    const m = melt(s, [p]);
    expect(m.qi).toBe(0);
    expect(m.materials).toBe(Math.round(meltSpill(s, p)));
    expect(m.state.qi).toBe(s.qi);
    expect(m.state.materials).toBe(s.materials + Math.round(meltSpill(s, p)));
    // 材 MELT_MATERIAL of the table's piece, on a body with no seals, record or cards.
    expect(m.materials).toBe(Math.round(meltMaterial(p) * MELT_MATERIAL));
  });

  it('can never pay more qi than the allowance, however much is melted', () => {
    const s = at(2, 600);
    const pile = Array.from({ length: 500 }, (_, i) => piece(`p${i}`, 2));
    const m = melt(s, pile);
    expect(m.qi).toBeLessThanOrEqual(Math.ceil(600 * rate(s)));
    expect(m.state.melt).toBeGreaterThanOrEqual(0);
    expect(m.materials).toBeGreaterThan(0);
  });

  it('fills with time, open or shut, and never past its ceiling', () => {
    const s = at(2, 0);
    expect(advance(s, T0 + 3600).melt).toBeCloseTo(3600 * MELT_FILL, 6);
    expect(advance(s, T0 + 30 * 86_400).melt).toBe(MELT_CAP);
  });

  it('melts the same way through the chest button and a full chest', () => {
    const s = { ...at(2, 0), chest: [piece('c', 2)] };
    expect(salvage(s, ['c']).materials).toBe(s.materials + Math.round(meltSpill(s, piece('c', 2))));
    const full = { ...at(2, 0), chest: Array.from({ length: 40 }, (_, i) => ({ ...piece(`f${i}`, 2), rarity: 'common' as const })) };
    const st = stash(full, piece('new', 3));
    if (st.dropped) {
      expect(st.melted).toBe(0);
      expect(st.meltedMaterial).toBeGreaterThan(0);
    }
  });

  it('starts full on a save from before it existed, and a save cannot claim more', () => {
    const old = { ...newState(T0) } as Record<string, unknown>;
    delete old.melt;
    expect(validate(old, T0).melt).toBe(MELT_CAP);
    expect(validate({ ...newState(T0), melt: 1e12 }, T0).melt).toBe(MELT_CAP);
    expect(validate({ ...newState(T0), melt: -5 }, T0).melt).toBe(0);
  });
});

/**
 * 寶匠 rekaris, on the Discord: "what is the point of getting more qi from melting when
 * you've hit the allowance?" None, and that made the Treasure Smith a class that stopped
 * working at the cap. It now refills the allowance faster and lifts the material spill.
 */
describe('寶匠 the Treasure Smith past the allowance', () => {
  const smith = (): State => {
    const worn: Worn = {};
    const plan: [School, number][] = [['fortune', 3], ['artificer', 3]];
    for (const [school, n] of plan) {
      let left = n;
      for (const a of ARCHETYPES) {
        if (left === 0) break;
        if (worn[a.slot] || !SCHOOL_INFO[school].axes.includes(a.affix)) continue;
        const tpl = TEMPLATE_BY_KEY[`${a.key}6`];
        worn[a.slot] = { id: `${school}-${a.slot}`, template: tpl.key, rarity: 'earth', rolls: [{ affix: tpl.affix, value: 40 }] };
        left -= 1;
      }
    }
    return { ...at(2, 0), worn };
  };

  it('is a Treasure Smith', () => {
    expect(classMelt(smith())).toBe(PAIR_MELT);
  });

  it('refills the allowance faster', () => {
    const plain = advance(at(2, 0), T0 + 3600);
    const s = advance(smith(), T0 + 3600);
    expect(plain.melt).toBeCloseTo(3600 * MELT_FILL, 6);
    expect(s.melt).toBeCloseTo(3600 * MELT_FILL * PAIR_MELT, 6);
  });

  it('melts more material once the allowance is spent', () => {
    const p = piece('a', 2);
    expect(melt(smith(), [p]).materials).toBe(Math.round(meltSpill(smith(), p) * PAIR_MELT));
    expect(melt(at(2, 0), [p]).materials).toBe(Math.round(meltSpill(at(2, 0), p)));
  });

  it('still never fills past the cap', () => {
    const s = advance({ ...smith(), melt: MELT_CAP - 1 }, T0 + 86400 * 30);
    expect(s.melt).toBe(MELT_CAP);
  });
});
