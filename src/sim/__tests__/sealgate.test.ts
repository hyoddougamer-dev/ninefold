import { describe, expect, it } from 'vitest';
import { HABITS, play } from '../../../tools/habits.ts';
import { sealRow } from '../../../tools/seal.ts';
import {
  LAYERS_PER_REALM, SEAL_DAYS, CRAFT_KIT, CRAFT_QUALITY_MULT, SEAL_PAY_MINUTES, SEAL_PAY_SHARE, SEAL_PAY_STEP, SEAL_PILL_SHARE,
} from '../balance.ts';
import {
  breakThrough, canFightWarden, canPaySeal, feedDays, feedSeal, gathering, newState, paySeal, sealDays, sealFeedRoom,
  sealFilled, sealLeft, sealPayRoom, sealPrice, sealStep, sealed, validate, type State,
} from '../state.ts';
import { advance } from '../time.ts';
import {
  carry, carrySlot, feedShare, kitFor, pillHeld, pillShare, spendKit, unsealCarried, wallDays, wallDaysLeft, bestFeed, bestUnseal,
} from '../crafts.ts';
import { XP_TABLE, breakthroughKey, RECIPE_BY_KEY, ITEM_BY_KEY } from '../../data/crafts.ts';
import { wardenOf } from '../../data/bestiary.ts';
import { bottleneck } from '../combat.ts';
import { SEAL_STRICT_FROM, sealSeconds, verify } from '../verify.ts';

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

  it('breaks the seal outright and takes at least half of what is left of the wall, at every rank and every sealed realm', () => {
    for (const realm of [5, 6, 7, 8]) {
      for (const days of [0, 0.5, 3]) {
        const s = atGate(realm, days, 60);
        const w = wardenOf(realm);
        const left = wallDaysLeft(s, w);
        for (let q = 0; q < CRAFT_QUALITY_MULT.length; q++) {
          const p = withPill(s, realm, q);
          const k = kitFor(p, w, 'warden').kit;
          // The seal breaks at once, at any rank, with the realm's own pill.
          expect(canFightWarden(p), `realm ${realm} rank ${q}`).toBe(true);
          if (days < sealDays(realm)) expect(unsealCarried(p)).toBe(sealDays(realm));
          // At least half of the days the wall still had, and so the wall at most its square root.
          expect(k.thin).toBeGreaterThanOrEqual(0.5 - 1e-9);
          expect(k.breach).toBeGreaterThanOrEqual(left * 0.5 - 1e-9);
          expect(wallDaysLeft(p, w, k.breach)).toBeLessThanOrEqual(left * 0.5 + 1e-9);
          // And the wall stands as if those days had been waited.
          expect(bottleneck(p, w, k.breach)).toBeCloseTo(bottleneck({ ...p, gateAt: p.gateAt - (k.breach ?? 0) * DAY }, w), 9);
        }
      }
    }
    // Half at Common, seven tenths at Heaven.
    expect(pillShare(0, 1)).toBeCloseTo(CRAFT_KIT.pill, 9);
    expect(pillShare(0, 1)).toBeCloseTo(0.5, 9);
    expect(pillShare(4, 1)).toBeCloseTo(1 - 0.5 ** 1.75, 9);
  });

  it('breaks half of the eighth realm\'s twelve days at Common, on top of the elixir and the sigil', () => {
    const s = atGate(8, 0, 70);
    const w = wardenOf(8);
    // rekaris: "they save 2 of 12 days". Twelve is the fresh eighth wall.
    expect(wallDays(8)).toBeCloseTo(Math.log(72) / -Math.log(0.7), 9);
    expect(Math.round(wallDays(8))).toBe(12);
    expect(wallDaysLeft(s, w)).toBeCloseTo(wallDays(8), 9);
    const kit = { ...s, crafts: { ...s.crafts, pouch: { ...s.crafts.pouch, 'might8@0': 1, 'sigil:warding@0': 1 } } };
    const two = carry(carry(kit, 'elixir', 'might8@0'), 'sigil', 'sigil:warding@0');
    const b2 = kitFor(two, w, 'warden').kit.breach ?? 0;
    expect(b2).toBeGreaterThanOrEqual(CRAFT_KIT.breach);
    const three = withPill(two, 8, 0);
    const b3 = kitFor(three, w, 'warden').kit.breach ?? 0;
    expect(b3 - b2).toBeCloseTo(wallDays(8) / 2, 9);
    // Of the twelve days, the three hands leave fewer than half.
    expect(wallDaysLeft(three, w, b3)).toBeLessThan(wallDays(8) / 2);
  });

  it('takes at least half of anybody\'s wait at the gate: any day of the wall, any rank, every sealed realm', () => {
    let read = 0;
    for (const realm of [5, 6, 7, 8]) {
      const w = wardenOf(realm);
      for (let t = 0; t < wallDays(realm); t += 0.25) {
        const s = atGate(realm, t, 60);
        for (let q = 0; q < CRAFT_QUALITY_MULT.length; q++) {
          // Somebody whose build wins once the wall has `need` days left waits (left - need) days.
          for (const need of [0, 1, 3]) {
            const wait = Math.max(0, wallDaysLeft(s, w) - need);
            const p = withPill(s, realm, q);
            const after = Math.max(0, wallDaysLeft(p, w, kitFor(p, w, 'warden').kit.breach) - need);
            expect(after, `realm ${realm} day ${t} rank ${q} need ${need}`).toBeLessThanOrEqual(wait / 2 + 1e-9);
            read++;
          }
        }
      }
    }
    expect(read).toBeGreaterThan(500);
  });

  it('made for the realm below, it thins the wall at its faded share and leaves the seal; nothing anywhere but the realm\'s own warden', () => {
    const s = withPill(atGate(6, 0, 60), 5, 0);
    expect(unsealCarried(s)).toBe(0);
    expect(kitFor(s, wardenOf(6), 'warden').kit.thin).toBeCloseTo(CRAFT_KIT.pill * CRAFT_KIT.fade, 9);
    expect(canFightWarden(s)).toBe(false);
    for (const where of ['demon', 'vault', 'platform', 'tower'] as const) {
      const c = kitFor(s, wardenOf(6), where);
      expect(c.used.pill ?? null, where).toBeNull();
      expect(c.kit.unseal ?? 0, where).toBe(0);
    }
  });

  it('is never spent at a gate where it has nothing left to do', () => {
    // A gate met long ago: the seal served and the wall loosened all the way.
    const s = withPill({ ...atGate(6, 0, 60), gateAt: 1 }, 6, 2);
    const c = kitFor(s, wardenOf(6), 'warden');
    expect(c.used.pill ?? null).toBeNull();
    expect(c.kit.thin ?? 0).toBe(0);
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
    expect(pillHeld(held)).toBeCloseTo(pillShare(3, 1) * wallDays(8), 9);
    expect(pillHeld(held)).toBeGreaterThan(wallDays(8) / 2);
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

  it('reads the pill as the whole seal only where the Alchemy reached the realm\'s own pill', () => {
    const at7 = atGate(7, 0, 45);
    // Alchemy 45 makes the sixth realm's pill (level 45) and the fifth's, never the seventh's (51).
    expect(bestUnseal(at7, 5)).toBe(sealDays(5));
    expect(bestUnseal(at7, 6)).toBe(sealDays(6));
    expect(bestUnseal(at7, 7)).toBe(0);
    expect(bestUnseal(atGate(7, 0, 44), 6)).toBe(0);
    // Never a gate the save has not reached.
    expect(bestUnseal(atGate(5, 0, 99), 6)).toBe(0);
  });

  it('refuses a sealed gate crossed with a pill that was never made, and only waits', () => {
    const { before, after } = crafted;
    // The same crossing, but this save's Alchemy never made anything: no pill could exist.
    // Read after SEAL_STRICT_FROM: before it the game had no seal (see the next test).
    // A save from before the bar (no fields) is read as it always was: only waiting, no allowance.
    const strip = (s: State): State => {
      const { sealPaid: _p, sealFed: _f, ...rest } = s;
      return late({ ...rest, crafts: { ...s.crafts, xp: { ...s.crafts.xp, alchemy: 0 } } });
    };
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

  it('charges nothing for a gate crossed before the seal existed: the old game had none', () => {
    const { before, after } = crafted;
    const strip = (s: State): State => ({ ...s, crafts: { ...s.crafts, xp: { ...s.crafts.xp, alchemy: 0 } } });
    const b = strip(before), a = strip(after);
    expect(b.at).toBeLessThan(SEAL_STRICT_FROM);
    expect(sealSeconds(b, a)).toBeGreaterThan(0);
    const v = verify(b, a, a.at - b.at);
    expect(v.why).not.toContain('too-fast');
    expect(v.ok).toBe(true);
  });
});

describe('封 the bar: time by itself, qi paid in, pills eaten', () => {
  it('leaves every seal exactly as long as it was: waiting alone still opens each gate in SEAL_DAYS', () => {
    expect([...SEAL_DAYS]).toEqual([0, 0, 0, 0, 1, 1.25, 1.5, 2, 0]);
    for (const r of [5, 6, 7, 8]) {
      expect(sealLeft(atGate(r, sealDays(r) - 0.01))).toBeGreaterThan(0);
      expect(sealed(atGate(r, sealDays(r) + 1e-6))).toBe(false);
      // The bar's own fields add nothing to a gate that was waited out.
      expect(sealLeft({ ...atGate(r, 0), sealPaid: 0, sealFed: 0 })).toBeCloseTo(sealDays(r), 9);
    }
  });

  it('a tap costs minutes of the cultivator\'s own gathering, per hour of the bar it fills', () => {
    for (const r of [5, 6, 7, 8]) {
      const s = atGate(r, 0);
      const hours = sealStep(s) * 24;
      expect(sealStep(s)).toBeCloseTo(sealDays(r) * SEAL_PAY_STEP, 9);
      expect(sealPrice(s)).toBeCloseTo(hours * SEAL_PAY_MINUTES * 60 * gathering(s), 6);
    }
    // A stronger cultivator pays more for the same tap: it is priced in their own gathering.
    const weak = atGate(6, 0), strong = { ...weak, levels: { ...weak.levels, method: 40 } };
    expect(gathering(strong)).toBeGreaterThan(gathering(weak));
    expect(sealPrice(strong)).toBeGreaterThan(sealPrice(weak));
  });

  it('qi is a sink with a ceiling: four taps at most, SEAL_PAY_SHARE of the bar, then it refuses', () => {
    for (const r of [5, 6, 7, 8]) {
      let s: State = { ...atGate(r, 0), qi: 1e17 };
      const g = gathering(s);
      let spent = 0, taps = 0;
      while (canPaySeal(s) && taps < 50) {
        const next = paySeal(s);
        expect(next.qi).toBeLessThan(s.qi);
        spent += sealPrice(s);
        expect(gathering(next)).toBe(g);
        s = next; taps++;
      }
      expect(taps).toBe(Math.round(SEAL_PAY_SHARE / SEAL_PAY_STEP));
      expect(s.sealPaid! / 86_400).toBeCloseTo(sealDays(r) * SEAL_PAY_SHARE, 6);
      expect(sealPayRoom(s)).toBe(0);
      // A tap past the ceiling is the same state, whatever is in the purse.
      expect(paySeal(s)).toBe(s);
      // The whole of what qi can ever pay at this gate, in minutes of gathering.
      expect(spent / (sealDays(r) * SEAL_PAY_SHARE * 24 * SEAL_PAY_MINUTES * 60 * g)).toBeCloseTo(1, 6);
      // And the gate is still shut: qi alone never opens it.
      expect(sealed(s)).toBe(true);
      expect(sealLeft(s)).toBeCloseTo(sealDays(r) * (1 - SEAL_PAY_SHARE), 6);
    }
  });

  it('refuses without the qi, takes nothing, and never works at an open gate or below the fifth realm', () => {
    const s = { ...atGate(6, 0), qi: 0 };
    expect(canPaySeal(s)).toBe(false);
    expect(paySeal(s)).toBe(s);
    const open = { ...atGate(6, 2), qi: 1e17 };
    expect(canPaySeal(open)).toBe(false);
    expect(paySeal(open)).toBe(open);
    expect(canPaySeal({ ...atGate(4, 0), qi: 1e17 })).toBe(false);
    expect(canPaySeal({ ...atGate(5, 0), qi: 1e17, wardenFell: true })).toBe(false);
  });

  it('a last tap fills only what the bar has left, and costs only that much', () => {
    const s = { ...atGate(5, 0.97), qi: 1e9 };
    const left = sealLeft(s);
    expect(sealStep(s)).toBeCloseTo(left, 9);
    const paid = paySeal(s);
    expect(sealed(paid)).toBe(false);
    expect(s.qi - paid.qi).toBeGreaterThan(sealPrice(s) * 0.999);
    expect(s.qi - paid.qi).toBeLessThan(sealPrice(s) * 1.001);
    expect(sealPrice(s)).toBeLessThan(sealDays(5) * SEAL_PAY_STEP * 24 * SEAL_PAY_MINUTES * 60 * gathering(s));
  });

  it('time keeps filling the bar beside what was paid, so paying and waiting add up', () => {
    let s: State = { ...atGate(7, 0), qi: 1e17 };
    s = paySeal(paySeal(s));
    const left0 = sealLeft(s);
    expect(left0).toBeCloseTo(sealDays(7) * (1 - 2 * SEAL_PAY_STEP), 9);
    const later = advance(s, s.at + 0.5 * DAY);
    expect(sealLeft(later)).toBeCloseTo(left0 - 0.5, 6);
    expect(later.sealPaid).toBe(s.sealPaid);
  });

  it('the pill made for the gate\'s own realm still clears the whole bar at once, paid or not', () => {
    for (const r of [5, 6, 7, 8]) {
      const half = paySeal({ ...atGate(r, 0, 99), qi: 1e17 });
      expect(canFightWarden(half)).toBe(false);
      const p = withPill(half, r, 0);
      expect(unsealCarried(p)).toBeGreaterThan(0);
      expect(canFightWarden(p)).toBe(true);
    }
    // A bar already full spends nothing of the pill on the seal: it only thins the wall.
    const full = { ...atGate(5, 0.1, 99), sealPaid: 0.4 * DAY, sealFed: 0.4 * DAY };
    const served = advance(full, full.at + 0.3 * DAY);
    expect(sealLeft(served)).toBe(0);
    expect(unsealCarried(withPill(served, 5, 0))).toBe(0);
  });

  it('a pill made for a realm below is eaten for part of the bar, repeatedly, up to its ceiling', () => {
    const key = `${breakthroughKey(5)}@0`;
    const base = atGate(6, 0, 60);
    const s0: State = { ...base, crafts: { ...base.crafts, pouch: { [key]: 9 } } };
    // Carried at the sixth gate it does nothing to the seal (it is not the realm's own).
    expect(unsealCarried(carry(s0, 'pill', key))).toBe(0);
    const share = feedShare(key, 6);
    expect(share).toBeCloseTo(pillShare(0, CRAFT_KIT.fade), 9);
    expect(feedDays(s0, key)).toBeCloseTo(share * sealDays(6), 9);
    let s = s0, eaten = 0;
    while (sealFeedRoom(s) > 0 && eaten < 20) {
      const next = feedSeal(s, key);
      expect(next).not.toBe(s);
      expect(next.crafts.pouch[key]).toBe((s.crafts.pouch[key] ?? 0) - 1);
      s = next; eaten++;
    }
    expect(eaten).toBe(Math.ceil(SEAL_PILL_SHARE / share));
    expect(s.sealFed! / 86_400).toBeCloseTo(sealDays(6) * SEAL_PILL_SHARE, 6);
    expect(feedSeal(s, key)).toBe(s);
    expect(sealed(s)).toBe(true);
    // Qi and lesser pills together never open a gate: a fifth of the bar is always time.
    let b: State = { ...s, qi: 1e17 };
    while (canPaySeal(b)) b = paySeal(b);
    expect(sealLeft(b)).toBeCloseTo(sealDays(6) * (1 - SEAL_PAY_SHARE - SEAL_PILL_SHARE), 6);
    expect(sealFilled(b)).toBeCloseTo(sealDays(6) * (SEAL_PAY_SHARE + SEAL_PILL_SHARE), 6);
  });

  it('cannot eat the realm\'s own pill or a higher one, and the fifth gate has no lesser pill at all', () => {
    const own = `${breakthroughKey(6)}@4`;
    const base = atGate(6, 0, 60);
    const s = { ...base, crafts: { ...base.crafts, pouch: { [own]: 2 } } };
    expect(feedShare(own, 6)).toBe(0);
    expect(feedSeal(s, own)).toBe(s);
    expect(feedShare(`${breakthroughKey(7)}@4`, 6)).toBe(0);
    for (const t of [5, 6, 7, 8]) expect(feedShare(`${breakthroughKey(t)}@4`, 5)).toBe(0);
    // Not a pill at all, and a pill never held.
    expect(feedSeal(s, 'might5@0')).toBe(s);
    expect(feedSeal(s, `${breakthroughKey(5)}@0`)).toBe(s);
  });

  it('eating the carried pill empties the hand', () => {
    const key = `${breakthroughKey(5)}@2`;
    const base = atGate(7, 0, 60);
    const s = carry({ ...base, crafts: { ...base.crafts, pouch: { [key]: 1 } } }, 'pill', key);
    expect(s.crafts.carry.pill).toBe(key);
    const eaten = feedSeal(s, key);
    expect(eaten.crafts.pouch[key] ?? 0).toBe(0);
    expect(eaten.crafts.carry.pill).toBeNull();
  });

  it('the bar belongs to one gate: leaving it, or the gate shutting behind, clears it', () => {
    const paid = paySeal({ ...atGate(5, 0), qi: 1e17 });
    expect(paid.sealPaid).toBeGreaterThan(0);
    const fell = { ...paid, wardenFell: true };
    const next = breakThrough(fell);
    expect(next.sealPaid).toBe(0);
    expect(next.sealFed).toBe(0);
    // advance() at a rung below the ceiling carries no bar either.
    expect(advance({ ...paid, qi: 0, layer: 3, gateAt: 0 }, paid.at + 10).sealPaid).toBe(0);
  });

  it('a save is input: the fills are capped, kept to a sealed gate, and a save without them loads as it was', () => {
    const s = atGate(8, 0.2);
    const edit = (o: Record<string, unknown>, at = s) => validate(JSON.parse(JSON.stringify({ ...at, ...o })), at.at);
    const cap = sealDays(8) * 86_400;
    expect(edit({ sealPaid: 1e12, sealFed: 1e12 }).sealPaid).toBeCloseTo(cap * SEAL_PAY_SHARE, 6);
    const both = edit({ sealPaid: 1e12, sealFed: 1e12 });
    expect(both.sealFed! + both.sealPaid!).toBeLessThanOrEqual(cap + 1e-6);
    expect(both.sealFed!).toBeCloseTo(cap * SEAL_PILL_SHARE, 6);
    expect(edit({ sealPaid: -5, sealFed: NaN }).sealPaid).toBe(0);
    expect(edit({ sealPaid: -5, sealFed: NaN }).sealFed).toBe(0);
    // Off the gate, or at a realm with no seal, nothing stands.
    expect(edit({ sealPaid: 5000 }, { ...s, layer: 3 }).sealPaid).toBe(0);
    expect(edit({ sealPaid: 5000 }, atGate(4, 0)).sealPaid).toBe(0);
    expect(edit({ sealPaid: 5000 }, { ...atGate(9, 0), layer: LAYERS_PER_REALM - 1 }).sealPaid).toBe(0);
    // An honest value survives the round trip.
    const honest = paySeal({ ...s, qi: 1e17 });
    expect(validate(JSON.parse(JSON.stringify(honest)), honest.at).sealPaid).toBeCloseTo(honest.sealPaid!, 6);
    // A save from before the bar has no fields, keeps having none, and its seal is what it was.
    const { sealPaid: _p, sealFed: _f, ...old } = s;
    const loaded = validate(JSON.parse(JSON.stringify(old)), s.at);
    expect(loaded.sealPaid).toBeUndefined();
    expect(loaded.sealFed).toBeUndefined();
    expect(sealLeft(loaded)).toBeCloseTo(sealLeft(s), 9);
    expect(newState(T0).sealPaid).toBe(0);
  });
});

describe('驗 the server and the bar', () => {
  let plainCrossing: { before: State; after: State };
  {
    let b: State | undefined, a: State | undefined;
    play({ ...HABITS.find((h) => h.name === 'active')!, crafts: false }, 30, (_d, s) => {
      if (s.realm === 5 && s.layer < LAYERS_PER_REALM - 1) b = structuredClone(s);
      if (!a && s.realm === 6) a = structuredClone(s);
    });
    plainCrossing = { before: b!, after: a! };
  }

  /** A cultivator at the gate of `from`, and the same one a step into the next realm. */
  function pair(from: number, alch: number, bar = true): { before: State; after: State } {
    const strip = (s: State): State => {
      if (bar) return s;
      const { sealPaid: _p, sealFed: _f, ...rest } = s;
      return rest;
    };
    const before = strip(late(atGate(from, 0, alch)));
    const after = strip({ ...before, realm: from + 1, layer: 0, gateAt: 0, at: before.at + 100, wardenFell: false });
    return { before, after };
  }

  it('allows qi\'s share of the bar: a gate crossed in the rest of its time is honest, sooner is not', () => {
    for (const r of [5, 6, 7, 8]) {
      const { before, after } = pair(r, 1);
      expect(bestUnseal(after, r)).toBe(0);
      expect(sealSeconds(before, after)).toBeCloseTo(sealDays(r) * (1 - SEAL_PAY_SHARE) * DAY, 6);
      // The line the server draws: owed seconds against the time between, with its slack.
      expect(sealSeconds(before, after)).toBeLessThan(sealDays(r) * DAY);
    }
  });

  it('allows lesser pills on top, only where the Alchemy reached one, and never the whole bar', () => {
    // Alchemy 40 makes the fifth realm's pill; at the sixth gate it can be eaten.
    const lvl5 = RECIPE_BY_KEY[`alchemy:${breakthroughKey(5)}`].level;
    const { before, after } = pair(6, lvl5);
    expect(bestFeed(after, 6)).toBeCloseTo(sealDays(6) * SEAL_PILL_SHARE, 9);
    expect(sealSeconds(before, after)).toBeCloseTo(sealDays(6) * (1 - SEAL_PAY_SHARE - SEAL_PILL_SHARE) * DAY, 6);
    expect(sealSeconds(before, after)).toBeGreaterThan(0);
    // Below the level of the lowest pill, nothing is eaten; at the fifth gate, there is no lesser pill.
    expect(bestFeed(pair(6, lvl5 - 1).after, 6)).toBe(0);
    expect(bestFeed(pair(5, 99).after, 5)).toBe(0);
  });

  it('the realm\'s own pill still breaks the whole bar for the server, as before', () => {
    const lvl = RECIPE_BY_KEY[`alchemy:${breakthroughKey(6)}`].level;
    const { before, after } = pair(6, lvl);
    expect(bestUnseal(after, 6)).toBe(sealDays(6));
    expect(sealSeconds(before, after)).toBe(0);
  });

  it('counts what the earlier save had already put in, and allows only the rest of the cap', () => {
    const { before, after } = pair(7, 1);
    const paid = { ...before, sealPaid: SEAL_PAY_SHARE * sealDays(7) * DAY };
    // Everything qi can fill is in already: what is owed is the rest of the bar, no less.
    expect(sealSeconds(paid, after)).toBeCloseTo(sealDays(7) * (1 - SEAL_PAY_SHARE) * DAY, 6);
    // Half a cap in, the other half still allowed: the same sum.
    const half = { ...before, sealPaid: SEAL_PAY_SHARE * sealDays(7) * DAY / 2 };
    expect(sealSeconds(half, after)).toBeCloseTo(sealDays(7) * (1 - SEAL_PAY_SHARE) * DAY, 6);
    // A hand-edited claim of more than the cap is clamped by validate, so it buys nothing.
    const greedy = validate(JSON.parse(JSON.stringify({ ...before, sealPaid: 1e12 })), before.at);
    expect(sealSeconds(greedy, after)).toBeCloseTo(sealDays(7) * (1 - SEAL_PAY_SHARE) * DAY, 6);
  });

  it('reads a pair from before the bar exactly as it always was', () => {
    for (const r of [5, 6, 7, 8]) {
      const { before, after } = pair(r, 1, false);
      expect(after.sealPaid).toBeUndefined();
      expect(sealSeconds(before, after)).toBeCloseTo(sealDays(r) * DAY, 6);
    }
  });

  it('a real crossing played with the bar owes less than the same one read as it was before', () => {
    const { before, after } = plainCrossing;
    const { sealPaid: _p, sealFed: _f, ...oldAfter } = after;
    expect(after.sealPaid).toBeDefined();
    const bar = sealSeconds(before, after), was = sealSeconds(before, oldAfter as State);
    expect(was - bar).toBeGreaterThan(0);
    expect(was - bar).toBeLessThanOrEqual(SEAL_PAY_SHARE * sealDays(5) * DAY + 1);
    // An honest wait is never suspect, with the bar or without it.
    const dt = after.at - before.at;
    expect(verify(late(before), late(after), dt).why).not.toContain('too-fast');
  });
});

/** 封 A save moved, whole, to just after the seal began to be read (at, the start and the gate together). */
function late(s: State): State {
  const off = SEAL_STRICT_FROM + 30 * DAY - T0;
  return { ...s, at: s.at + off, startedAt: s.startedAt + off, gateAt: s.gateAt > 1 ? s.gateAt + off : s.gateAt };
}

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

describe('量 what paying into the bar changes (tools/seal.ts)', () => {
  const row = (name: string, paysSeal: number | undefined, crafts = false) =>
    sealRow({ ...HABITS.find((h) => h.name === name)!, crafts, paysSeal });

  it('paying slows no one and walls no one: the active cultivator pays at the real price, half and double', () => {
    const waits = row('active', undefined);
    const real = row('active', 1), cheap = row('active', 0.5), dear = row('active', 2);
    const f = (r: typeof real) => r.realm9?.toFixed(1);
    console.log(`    active: realm 9 on day ${f(waits)} waiting, ${f(real)} paying, ${f(cheap)} at half the price, ${f(dear)} at twice it`);
    for (const r of [waits, real, cheap, dear]) expect(r.realm9).toBeDefined();
    // Paying is a gain, but a small one: a day or two of fifty, never a shortcut past the gate.
    expect(real.realm9!).toBeLessThanOrEqual(waits.realm9!);
    expect(waits.realm9! - real.realm9!).toBeLessThan(4);
    // Off its value either way, it moves by a day and a half at the most: not a knife edge.
    expect(Math.abs(cheap.realm9! - real.realm9!)).toBeLessThanOrEqual(1.5);
    expect(Math.abs(dear.realm9! - real.realm9!)).toBeLessThanOrEqual(1.5);
    // And the gate is still a gate: it stood shut for 60% of its days or more, at every price.
    for (const r of [real, cheap, dear]) {
      r.sealed.forEach((d, i) => expect(d, `gate ${i + 5}`).toBeGreaterThanOrEqual(SEAL_DAYS[i + 4] * (1 - SEAL_PAY_SHARE) - 0.15));
    }
  }, 240_000);

  it('whoever carries the gate\'s own pill is where they were: the workshop is still the way through', () => {
    const waits = row('active', undefined, true), pays = row('active', 1, true);
    const plain = row('active', 1);
    console.log(`    active with the workshop: day ${waits.realm9?.toFixed(1)} waiting, ${pays.realm9?.toFixed(1)} paying; without it, paying: ${plain.realm9?.toFixed(1)}`);
    expect(pays.realm9).toBe(waits.realm9);
    expect(waits.realm9!).toBeLessThan(plain.realm9!);
    expect(pays.sealed.reduce((a, b) => a + b, 0)).toBe(0);
  }, 240_000);
});
