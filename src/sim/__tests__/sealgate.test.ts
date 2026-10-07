import { describe, expect, it } from 'vitest';
import { HABITS, play } from '../../../tools/habits.ts';
import { sealRow } from '../../../tools/seal.ts';
import {
  LAYERS_PER_REALM, SEAL_DAYS, CRAFT_KIT, CRAFT_QUALITY_MULT,
} from '../balance.ts';
import { canFightWarden, newState, sealDays, sealLeft, sealed, validate, type State } from '../state.ts';
import { carry, carrySlot, kitFor, spendKit, unsealCarried, unsealHeld, bestUnseal } from '../crafts.ts';
import { XP_TABLE, breakthroughKey, RECIPE_BY_KEY, ITEM_BY_KEY } from '../../data/crafts.ts';
import { wardenOf } from '../../data/bestiary.ts';
import { bottleneck } from '../combat.ts';
import { sealSeconds, verify } from '../verify.ts';

/**
 * 封 The seal at the gates of realms 5 to 8 and 破境丹 the Breakthrough Pill that breaks it.
 *
 * Three promises, each held here: waiting always opens a gate, so nobody who only waits is
 * ever walled; a pill made honestly is never read as a cheat by the server; and a save that
 * crossed a sealed gate sooner than the seal allows, with no pill its Alchemy could have
 * made, waits like a clock moved on.
 */

const T0 = 1_700_000_000;
const DAY = 86_400;

/** A cultivator at a realm's gate, the warden out `days` ago, Alchemy at `alch`. */
function atGate(realm: number, days: number, alch = 1): State {
  const s = newState(T0 - 40 * DAY);
  return {
    ...s, realm, layer: LAYERS_PER_REALM - 1, at: T0, gateAt: T0 - days * DAY,
    crafts: { ...s.crafts, xp: { ...s.crafts.xp, herb: XP_TABLE[45], alchemy: XP_TABLE[alch] } },
  };
}

/** The same, holding one Breakthrough Pill of `tier` at rank `q` and carrying it. */
function withPill(s: State, tier: number, q: number): State {
  const k = `${breakthroughKey(tier)}@${q}`;
  const held = { ...s, crafts: { ...s.crafts, pouch: { ...s.crafts.pouch, [k]: 1 } } };
  return carry(held, 'pill', k);
}

describe('封 the seal', () => {
  it('holds only the gates of realms 5 to 8, a day to two days', () => {
    expect(SEAL_DAYS.length).toBe(9);
    for (let r = 1; r <= 9; r++) {
      if (r >= 5 && r <= 8) {
        expect(sealDays(r)).toBeGreaterThanOrEqual(1);
        expect(sealDays(r)).toBeLessThanOrEqual(2);
      } else expect(sealDays(r)).toBe(0);
    }
  });

  it('shuts a fresh gate whatever the power, and waiting always opens it', () => {
    for (const r of [5, 6, 7, 8]) {
      const fresh = atGate(r, 0);
      expect(sealLeft(fresh)).toBeCloseTo(sealDays(r), 9);
      expect(sealed(fresh)).toBe(true);
      expect(canFightWarden(fresh)).toBe(false);
      // A god's power changes nothing: the seal is not a wall.
      const god = { ...fresh, levels: { technique: 999, method: 999, pills: 999, cores: 999 } };
      expect(canFightWarden(god)).toBe(false);
      const served = atGate(r, sealDays(r) + 1e-6);
      expect(sealed(served)).toBe(false);
      expect(canFightWarden(served)).toBe(true);
    }
    // No seal below the fifth realm, and a gate met long ago (gateAt 1) is open.
    expect(canFightWarden(atGate(4, 0))).toBe(true);
    expect(canFightWarden({ ...atGate(6, 0), gateAt: 1 })).toBe(true);
  });

  it('is never a reason to take anything away: the warden is out, only the fight waits', () => {
    const s = atGate(7, 0.5);
    expect(s.wardenFell).toBe(false);
    expect(sealLeft(s)).toBeCloseTo(1, 9);
  });
});

describe('破境丹 the Breakthrough Pill', () => {
  it('is an Alchemy recipe for each sealed realm, graded, in a hand of its own', () => {
    for (const tier of [5, 6, 7, 8]) {
      const r = RECIPE_BY_KEY[`alchemy:${breakthroughKey(tier)}`];
      expect(r, `tier ${tier}`).toBeDefined();
      expect(r.skill).toBe('alchemy');
      expect(r.realm).toBe(tier);
      expect(r.graded).toBe(true);
      expect(ITEM_BY_KEY[breakthroughKey(tier)].kind).toBe('elixir');
      expect(carrySlot(`${breakthroughKey(tier)}@2`)).toBe('pill');
    }
  });

  it('counts as two days at Common rank and 3.5 at Heaven, of the seal and of the wall', () => {
    const s = atGate(6, 0, 60);
    const common = withPill(s, 6, 0);
    const heaven = withPill(s, 6, 4);
    expect(unsealCarried(common)).toBeCloseTo(CRAFT_KIT.unseal, 9);
    expect(unsealCarried(heaven)).toBeCloseTo(CRAFT_KIT.unseal * CRAFT_QUALITY_MULT[4], 9);
    expect(unsealCarried(heaven)).toBeCloseTo(3.5, 9);
    // The seal breaks at once, at any rank, with the realm's own pill.
    expect(canFightWarden(common)).toBe(true);
    // And the wall stands as if those days had been waited.
    const w = wardenOf(6);
    const k = kitFor(heaven, w, 'warden').kit;
    expect(k.breach).toBeCloseTo(3.5, 9);
    expect(bottleneck(heaven, w, k.breach)).toBeCloseTo(bottleneck({ ...heaven, gateAt: heaven.gateAt - 3.5 * DAY }, w), 9);
  });

  it('is worth half a realm above its tier, and nothing anywhere but the realm\'s own warden', () => {
    const s = withPill(atGate(6, 0, 60), 5, 0);
    expect(unsealCarried(s)).toBeCloseTo(CRAFT_KIT.unseal * CRAFT_KIT.fade, 9);
    // Half a seal of 1.25 days still shut: a fifth-realm pill does not open the sixth at Common rank.
    expect(canFightWarden(s)).toBe(false);
    for (const where of ['demon', 'vault', 'platform', 'tower'] as const) {
      const c = kitFor(s, wardenOf(6), where);
      expect(c.used.pill ?? null, where).toBeNull();
      expect(c.kit.unseal ?? 0, where).toBe(0);
    }
  });

  it('a win spends it and a loss keeps it, as with the rest of the kit', () => {
    const s = withPill(atGate(5, 0, 50), 5, 2);
    const c = kitFor(s, wardenOf(5), 'warden');
    expect(c.spends).toBe(true);
    expect(c.used.pill).toBe(`${breakthroughKey(5)}@2`);
    const won = spendKit(s, c.used);
    expect(won.crafts.pouch[`${breakthroughKey(5)}@2`] ?? 0).toBe(0);
    expect(won.crafts.carry.pill).toBeNull();
    // A loss never calls spendKit: the pouch is what it was.
    expect(s.crafts.pouch[`${breakthroughKey(5)}@2`]).toBe(1);
  });

  it('the gate card can name what the pouch holds before it is carried', () => {
    const s = atGate(8, 0, 70);
    const k = `${breakthroughKey(8)}@3`;
    const held = { ...s, crafts: { ...s.crafts, pouch: { ...s.crafts.pouch, [k]: 2 } } };
    expect(unsealHeld(held)).toBeCloseTo(CRAFT_KIT.unseal * CRAFT_QUALITY_MULT[3], 9);
    expect(sealed(held)).toBe(true);
    expect(sealed(carry(held, 'pill', k))).toBe(false);
  });
});

describe('守 a save is input: the pill\'s hand', () => {
  // A real cultivator at the fifth realm's gate, from the harness, so everything else in the
  // save is honest and only the hand is in question.
  let gate: State | undefined;
  play({ ...HABITS.find((h) => h.name === 'active')!, crafts: true }, 400, (_d, s) => {
    if (!gate && s.realm === 5 && s.layer === LAYERS_PER_REALM - 1) gate = structuredClone(s);
  });

  it('reaches the gate it is measured at', () => {
    expect(gate).toBeDefined();
  });

  it('keeps an honest pill carried, and drops one that was never made', () => {
    const s = gate!;
    const k = `${breakthroughKey(5)}@1`;
    const honest = { ...s, crafts: { ...s.crafts, pouch: { ...s.crafts.pouch, [k]: 1 }, carry: { ...s.crafts.carry, pill: k } } };
    const back = validate(JSON.parse(JSON.stringify(honest)), s.at);
    expect(back.crafts.carry.pill).toBe(k);
    // A pill nobody could have made yet: the eighth realm's, at the fifth.
    const k8 = `${breakthroughKey(8)}@4`;
    const forged = { ...s, crafts: { ...s.crafts, pouch: { ...s.crafts.pouch, [k8]: 3 }, carry: { ...s.crafts.carry, pill: k8 } } };
    const out = validate(JSON.parse(JSON.stringify(forged)), s.at);
    expect(out.crafts.pouch[k8]).toBeUndefined();
    expect(out.crafts.carry.pill).toBeNull();
    // A pill in a hand that is not its own, and a sigil in the pill's hand.
    const swapped = { ...honest, crafts: { ...honest.crafts, carry: { elixir: k, sigil: null, pill: 'sigil:warding@1' } } };
    const sw = validate(JSON.parse(JSON.stringify(swapped)), s.at);
    expect(sw.crafts.carry.elixir).toBeNull();
    expect(sw.crafts.carry.pill).toBeNull();
    // And a save from before the seal, with no third hand at all, loads with it empty.
    const old = { ...s, crafts: { ...s.crafts, carry: { elixir: null, sigil: null } } };
    expect(validate(JSON.parse(JSON.stringify(old)), s.at).crafts.carry.pill).toBeNull();
  });
});

describe('驗 the server and the seal', () => {
  /** The visit before the fifth realm's gate and the first visit in the sixth, played. */
  function crossing(crafts: boolean): { before: State; after: State } {
    let before: State | undefined, after: State | undefined;
    // Thirty days is past the sixth realm for this cultivator either way.
    play({ ...HABITS.find((h) => h.name === 'active')!, crafts }, 30, (_d, s) => {
      if (s.realm === 5 && s.layer < LAYERS_PER_REALM - 1) before = structuredClone(s);
      if (!after && s.realm === 6) after = structuredClone(s);
    });
    return { before: before!, after: after! };
  }
  const crafted = crossing(true);
  const plain = crossing(false);

  it('an honest pill carried through a sealed gate is never suspect', () => {
    const { before, after } = crafted;
    const dt = after.at - before.at;
    // It went through faster than the seal: the pill is the only honest way that happens.
    expect(dt).toBeLessThan(sealDays(5) * DAY);
    expect(bestUnseal(after, 5)).toBeGreaterThanOrEqual(sealDays(5));
    expect(sealSeconds(before, after)).toBe(0);
    const v = verify(before, after, dt);
    expect(v.why).not.toContain('too-fast');
    expect(v.ok).toBe(true);
    expect(v.suspect).toBe(false);
    expect(v.strike).toBe(false);
  });

  it('an honest wait at a sealed gate is never suspect either', () => {
    const { before, after } = plain;
    const dt = after.at - before.at;
    expect(sealSeconds(before, after)).toBeGreaterThan(0);
    expect(sealSeconds(before, after)).toBeLessThanOrEqual(dt);
    const v = verify(before, after, dt);
    expect(v.ok).toBe(true);
    expect(v.suspect).toBe(false);
  });

  it('refuses a sealed gate crossed with a pill that was never made, and only waits', () => {
    const { before, after } = crafted;
    // The same crossing, but this save's Alchemy never made anything: no pill could exist.
    const strip = (s: State): State => ({ ...s, crafts: { ...s.crafts, xp: { ...s.crafts.xp, alchemy: 0 } } });
    const b = strip(before), a = strip(after);
    expect(bestUnseal(a, 5)).toBe(0);
    const dt = after.at - before.at;
    expect(sealSeconds(b, a)).toBeGreaterThan(dt * 1.15 + 3600);
    const v = verify(b, a, dt);
    expect(v.ok).toBe(false);
    expect(v.why).toContain('too-fast');
    // Waiting is the honest way through, so it is a wait and never a strike.
    expect(v.strike).toBe(false);
    // And once the seal's days have really passed, the same save is ranked.
    expect(verify(b, a, dt + sealDays(5) * DAY).why).not.toContain('too-fast');
  });
});

describe('量 what the seal costs each way of playing (tools/seal.ts)', () => {
  const row = (name: string, crafts: boolean) => sealRow({ ...HABITS.find((h) => h.name === name)!, crafts });

  it('the waiter loses nothing: every gate already holds them longer than its seal', () => {
    const r = row('never fights', false);
    console.log(`    never fights: realm 9 on day ${r.realm9?.toFixed(1)}, waited ${r.waited.map((x) => x.toFixed(1)).join(' ')} at gates 5..8`);
    expect(r.realm9).toBeDefined();
    r.waited.forEach((w, i) => expect(w, `gate ${i + 5}`).toBeGreaterThanOrEqual(SEAL_DAYS[i + 4]));
  }, 60_000);

  it('the workshop buys the seal back: the crafter never waits at a sealed gate, the one who skips it does', () => {
    for (const name of ['active', 'casual']) {
      const plain = row(name, false), crafted = row(name, true);
      console.log(`    ${name}: realm 9 on day ${plain.realm9?.toFixed(1)} without the workshop, ${crafted.realm9?.toFixed(1)} with it`);
      expect(plain.realm9).toBeDefined();
      expect(crafted.realm9).toBeDefined();
      expect(crafted.sealed.reduce((a, b) => a + b, 0), name).toBe(0);
      expect(plain.sealed.reduce((a, b) => a + b, 0), name).toBeGreaterThanOrEqual(3);
      expect(plain.realm9! - crafted.realm9!, name).toBeGreaterThan(1);
    }
  }, 120_000);
});
