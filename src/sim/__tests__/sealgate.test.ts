import { describe, expect, it } from 'vitest';
import { HABITS, play } from '../../../tools/habits.ts';
import { sealRow } from '../../../tools/seal.ts';
import {
  LAYERS_PER_REALM, SEAL_DAYS, CRAFT_KIT, CRAFT_QUALITY_MULT,
} from '../balance.ts';
import { canFightWarden, newState, sealDays, sealLeft, sealed, validate, type State } from '../state.ts';
import { carry, carrySlot, kitFor, pillHeld, pillShare, spendKit, unsealCarried, wallDays, wallDaysLeft, bestUnseal } from '../crafts.ts';
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
