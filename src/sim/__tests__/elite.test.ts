import { describe, expect, it } from 'vitest';
import { BEASTS, commonsOf, isElite } from '../../data/bestiary.ts';
import {
  RECIPES, RECIPE_BY_KEY, XP_CAP, breakthroughKey, elixirKey, partKey, sigilKey,
} from '../../data/crafts.ts';
import {
  ELITE_ESSENCE, ELITE_PARTS, ELITE_RISEN_FROM, ESSENCE_NEED, GATE_EDGE,
} from '../balance.ts';
import { beastPower, effectiveBeastPower, fight, odds, takeKill } from '../combat.ts';
import { blocked, held, kitWhere, work, setTask } from '../crafts.ts';
import { canDrive, drive } from '../hunt.ts';
import { MARKS } from '../record.ts';
import { newState, power, type State } from '../state.ts';
import { validate } from '../load.ts';
import { verify } from '../verify.ts';
import { dayOf, eliteEdge, eliteHeld, eliteSeed, essenceKey, essenceOf, loseElite, risenElite } from '../risen.ts';
import { eliteFight, eliteOdds, eliteOf, risenNow } from '../elite.ts';
import { gateKit, gateLift, gateOdds, gateRisen, isGate } from '../secret.ts';
import { roomsFor } from '../../data/secret.ts';
import { SKILL_KEYS } from '../../data/crafts.ts';
import { NO_KIT } from '../kit.ts';

const T0 = 1_760_000_000;
const DAY = 86_400;

/** A cultivator standing at the end of a realm, with the elite out and everything before it Known. */
function at(realm: number, extra: Partial<State> = {}): State {
  const s = newState(T0);
  return {
    ...s, realm, layer: 8, at: T0 + realm * 10 * DAY,
    stance: null, sequence: [],
    killed: Object.fromEntries(BEASTS.filter((b) => b.realm < realm && !b.warden).map((b) => [b.key, MARKS[1]])),
    ...extra,
  };
}

/** The workshop at 99 in everything, so only the blood can stand in a recipe's way. */
function crafter(s: State): State {
  return { ...s, crafts: { ...s.crafts, xp: Object.fromEntries(SKILL_KEYS.map((k) => [k, XP_CAP])) as State['crafts']['xp'] } };
}

describe('升 the risen elite', () => {
  it('rises only in the realm the cultivator stands in, from ELITE_RISEN_FROM', () => {
    for (let realm = 2; realm <= 9; realm++) {
      const elite = eliteOf(realm)!;
      expect(isElite(elite)).toBe(true);
      expect(risenElite(at(realm), elite)).toBe(realm >= ELITE_RISEN_FROM);
      // Left behind, it is back at its wall.
      if (realm < 9) expect(risenElite(at(realm + 1), elite)).toBe(false);
      // Never a common that is not the elite.
      expect(risenElite(at(realm), commonsOf(realm)[0])).toBe(false);
    }
  });

  it('stands on the cultivator’s own power at its edge, and goes back to its wall when left', () => {
    for (let realm = ELITE_RISEN_FROM; realm <= 9; realm++) {
      const s = at(realm);
      const b = eliteOf(realm)!;
      expect(effectiveBeastPower(s, b) / power(s)).toBeCloseTo(eliteEdge(realm), 6);
      if (realm < 9) {
        const past = at(realm + 1);
        expect(effectiveBeastPower(past, b)).toBeCloseTo(beastPower(b), 0);
      }
    }
  });

  it('is never driven while risen, and drives like any beast once left and Known', () => {
    const b = eliteOf(6)!;
    const known = (s: State) => ({ ...s, qi: 1e40, killed: { ...s.killed, [b.key]: MARKS[1] } });
    expect(canDrive(known(at(6)), b)).toBe(false);
    expect(canDrive(known(at(7)), b)).toBe(true);
    expect(risenNow(at(6))?.key).toBe(b.key);
    expect(risenNow(at(6, { layer: b.layer - 1 }))).toBeNull();
  });

  it('meets the same fight all day, and a new one on a new day, after a win, or with a new kit', () => {
    const s = at(7, { stance: 'fierce' });
    const b = eliteOf(7)!;
    expect(eliteSeed(s, b)).toBe(eliteSeed({ ...s, at: s.at + 3600 }, b));
    expect(dayOf(s.at)).toBe(dayOf(s.at + 60));
    expect(eliteSeed(s, b)).not.toBe(eliteSeed({ ...s, at: s.at + DAY }, b));
    expect(eliteSeed(s, b)).not.toBe(eliteSeed({ ...s, killed: { ...s.killed, [b.key]: 1 } }, b));
    // The same body and kit, the same day: the same fight, blow for blow.
    expect(eliteFight(s, b)).toEqual(eliteFight({ ...s, at: s.at + 7200 }, b));
    // The dice are the day's; a different kit is a different fight on them.
    const a = fight(s, b, eliteSeed(s, b));
    const k = fight(s, b, eliteSeed(s, b), undefined, { ...NO_KIT, strike: 1.5 });
    expect(k.rounds).not.toEqual(a.rounds);
  });

  it('holds a loss for the UTC day: no stance, arts or kit buys another roll, and the next day frees it', () => {
    const s = at(7, { stance: 'fierce' });
    const b = eliteOf(7)!;
    expect(eliteHeld(s, b)).toBe(false);
    const lost = loseElite(s, b);
    expect(eliteHeld(lost, b)).toBe(true);
    expect(risenNow(lost)).toBeNull();
    // Nothing the hand can change frees it the same day.
    const turned: State = { ...lost, stance: 'calm', sequence: ['a', 'b', 'c'] };
    expect(eliteHeld(turned, b)).toBe(true);
    // The next UTC day it is back; another realm's elite was never held.
    const next = (dayOf(s.at) + 1) * DAY;
    expect(eliteHeld({ ...lost, at: next }, b)).toBe(false);
    expect(risenNow({ ...lost, at: next })).toBe(b);
    expect(eliteHeld({ ...lost, realm: 8 }, eliteOf(8)!)).toBe(false);
    // A common, or an elite left behind, is never held.
    expect(loseElite(s, commonsOf(7)[0])).toBe(s);
    // validate() keeps today's hold, drops a past day's and refuses a day not yet come.
    const v = (x: unknown, now: number) => validate(JSON.parse(JSON.stringify(x)), now).eliteLost;
    expect(v(lost, s.at + 60)).toEqual({ 7: dayOf(s.at) });
    expect(v(lost, next + 60)).toEqual({});
    expect(v({ ...s, eliteLost: { 7: dayOf(s.at) + 5, 3: dayOf(s.at), 8: 'x' } }, s.at + 60)).toEqual({});
  });

  it('takes what is carried, as a hard fight does, and quotes both figures', () => {
    const s = at(8);
    const b = eliteOf(8)!;
    expect(kitWhere(s, b)).toBe('elite');
    expect(kitWhere(at(9), b)).toBeNull();
    const o = eliteOdds(s, b);
    expect(o.carries).toBe(false);
    expect(o.carried).toBe(o.bare);
    expect(o.bare).toBe(odds(s, b));
  });
});

describe('精血 Essence Blood', () => {
  it('is left by every elite felled from ELITE_RISEN_FROM, and a risen one leaves its part', () => {
    for (let realm = 2; realm <= 9; realm++) {
      const b = eliteOf(realm)!;
      const s = crafter(at(realm));
      const after = takeKill(s, b);
      expect(essenceOf(after, realm)).toBe(realm >= ELITE_RISEN_FROM ? ELITE_ESSENCE : 0);
      const part = partKey(b.key);
      expect(after.crafts.pouch[part] ?? 0).toBe(realm >= ELITE_RISEN_FROM ? ELITE_PARTS : 0);
      // A common leaves no blood.
      expect(essenceOf(takeKill(s, commonsOf(realm)[0]), realm)).toBe(0);
    }
  });

  it('is left by a drive as the taps would have left it', () => {
    const b = eliteOf(5)!;
    const s = { ...at(7), qi: 1e40, killed: { ...at(7).killed, [b.key]: MARKS[1] } };
    const d = drive(s, b, 50, 7);
    expect(essenceOf(d.state, 5)).toBe(50 * ELITE_ESSENCE);
  });

  it('is asked by a realm’s elixirs and sigils from ELITE_RISEN_FROM, and by a Breakthrough Pill from the realm below', () => {
    const blood = (k: string) => RECIPE_BY_KEY[k].needs.find(([n]) => n.startsWith('essence:'));
    expect(blood(`alchemy:${elixirKey('might', 4)}`)).toBeUndefined();
    expect(blood(`alchemy:${elixirKey('might', 5)}`)).toEqual([essenceKey(5), ESSENCE_NEED]);
    expect(blood(`alchemy:${elixirKey('guard', 9)}`)).toEqual([essenceKey(9), ESSENCE_NEED]);
    // 破境丹 The realm below's blood, which its old elite, Known, is driven for: none at the fifth.
    expect(blood(`alchemy:${breakthroughKey(5)}`)).toBeUndefined();
    expect(blood(`alchemy:${breakthroughKey(6)}`)).toEqual([essenceKey(5), ESSENCE_NEED]);
    expect(blood(`alchemy:${breakthroughKey(8)}`)).toEqual([essenceKey(7), ESSENCE_NEED]);
    expect(blood(`sigil:mirror`)).toEqual([essenceKey(5), ESSENCE_NEED]);
    expect(blood(`sigil:binding`)).toBeUndefined();
    // Only alchemy and sigils, never the knife, the forge or an array.
    for (const r of RECIPES) {
      if (r.needs.some(([n]) => n.startsWith('essence:'))) expect(['alchemy', 'sigil']).toContain(r.skill);
    }
    void sigilKey;
  });

  it('stops a make it is short for, and one is spent by each make', () => {
    const r = RECIPE_BY_KEY[`alchemy:${elixirKey('might', 5)}`];
    const pouch = Object.fromEntries(r.needs.filter(([k]) => !k.startsWith('essence:')).map(([k, n]) => [k, n * 3]));
    const base = crafter(at(5));
    const s: State = { ...base, crafts: { ...base.crafts, pouch } };
    expect(blocked(s, r)).toBe('needs');
    const fed = { ...s, essence: { 5: 2 } };
    expect(blocked(fed, r)).toBeNull();
    const made = work(setTask(fed, r.key, fed.at), fed.at + 86_400);
    expect(made.crafts.made[r.key]).toBe(2);
    expect(held(made, essenceKey(5))).toBe(0);
  });

  it('is held by validate() to what the elite’s kills could have left', () => {
    const b = eliteOf(6)!;
    const s = { ...at(6), killed: { ...at(6).killed, [b.key]: 3 }, essence: { 6: 999, 4: 5, 9: 2 } };
    const v = validate(JSON.parse(JSON.stringify(s)), s.at + 60);
    expect(v.essence).toEqual({ 6: 3 * ELITE_ESSENCE });
  });

  it('asks nothing of the server: a save holding blood verifies as one without it', () => {
    const b = eliteOf(6)!;
    const before = validate(JSON.parse(JSON.stringify({ ...at(6), killed: { ...at(6).killed, [b.key]: 2 } })), at(6).at);
    const after = { ...before, at: before.at + 3600, essence: { 6: 4 } };
    const plain = { ...after, essence: {} };
    expect(verify(before, after, 3600).why).toEqual(verify(before, plain, 3600).why);
  });
});

describe('關 the vault’s risen last gate', () => {
  it('lifts only the last gate, from ELITE_RISEN_FROM, and never below the walker’s fight', () => {
    for (let realm = 3; realm <= 9; realm++) {
      const s = at(realm);
      const rooms = roomsFor(realm);
      const gates = [...Array(rooms).keys()].filter(isGate);
      const last = gates[gates.length - 1];
      for (const step of gates) {
        expect(gateRisen(s, step)).toBe(realm >= ELITE_RISEN_FROM && step === last);
      }
    }
    const s = at(7, { stance: 'fierce' });
    const rooms = roomsFor(7);
    const last = rooms % 2 === 0 ? rooms - 1 : rooms - 2;
    const b = commonsOf(8)[1];
    expect(gateLift(s, last, b)).toBeGreaterThanOrEqual(1);
    expect(effectiveBeastPower(s, b) * gateLift(s, last, b)).toBeGreaterThanOrEqual(effectiveBeastPower(s, b));
    expect(gateKit(s, last, b).kit.foe ?? 1).toBeCloseTo(gateLift(s, last, b), 6);
    expect(gateOdds(s, last, b)).toBe(odds(s, b, undefined, gateKit(s, last, b).kit));
    expect(GATE_EDGE[6]).toBeGreaterThan(0);
  });
});
