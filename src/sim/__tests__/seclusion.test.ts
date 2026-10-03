import { describe, expect, it } from 'vitest';
import { newState, power, validate, type State } from '../state.ts';
import { oddsRaw } from '../combat.ts';
import { freePoints } from '../points.ts';
import { verify } from '../verify.ts';
import { opensAt } from '../unlocks.ts';
import {
  canSeclude, conquer, conquerTwice, demonDue, demonLeft, demonOf, demonPower, demonsFor, repel, seclude,
} from '../seclusion.ts';
import {
  DEMONS, DEMON_DAO, DEMON_EDGE, DEMON_RETURN, SECLUSION,
} from '../balance.ts';

/**
 * 閉關 A door shut for a night, and 心魔 the heart demon behind it: the cultivator's own
 * power without anything they know, so the build wins it and power alone cannot.
 */
const T0 = 1_700_000_000;
const DAY = 86_400;

/** A sixth-realm cultivator a month in, with the stance and the arts of the realms reached. */
function sixth(built: boolean): State {
  const s: State = { ...newState(T0), realm: 6, layer: 8, qi: 0, at: T0 + 30 * DAY,
    levels: { technique: 30, method: 30, pills: 30, cores: 20 } };
  if (!built) return s;
  return { ...s, stance: 'steady', sequence: ['fox', 'ape', 'crane', 'tiger', 'turtle', 'puppet'],
    killed: { fox: 1, ape: 1, crane: 1, tiger: 1, turtle: 1, puppet: 1 } };
}
const later = (s: State, secs: number): State => ({ ...s, at: s.at + secs });

describe('閉關 seclusion and 心魔 the heart demon', () => {
  it('shuts the door from the fourth realm, and the demon comes eight hours later', () => {
    const below = { ...sixth(true), realm: opensAt('seclusion') - 1 };
    expect(canSeclude(below)).toBe(false);
    expect(seclude(below)).toBe(below);

    const s = seclude(sixth(true));
    expect(s.secludedAt).toBe(s.at);
    expect(canSeclude(s)).toBe(false);        // once shut, shut
    expect(demonLeft(s)).toBe(SECLUSION);
    expect(demonDue(later(s, SECLUSION - 1))).toBe(false);
    expect(demonDue(later(s, SECLUSION))).toBe(true);
    // 無失 Nothing else about the save moves while the door is shut.
    const { secludedAt: _a, ...rest } = s;
    const { secludedAt: _b, ...was } = sixth(true);
    expect(rest).toEqual(was);
  });

  it('is the cultivator\'s own power, and nothing thins it', () => {
    const s = sixth(true);
    expect(demonPower(s)).toBeCloseTo(power(s) * DEMON_EDGE, 6);
    expect(demonPower({ ...s, demons: 3 })).toBe(demonPower(s));
    const d = demonOf(s);
    expect(d.leaves).toEqual([]);
    expect(d.realm).toBe(s.realm);
  });

  it('is quick for a build and slow for power alone, and a wall for nobody', () => {
    const built = sixth(true), bare = sixth(false);
    const withIt = oddsRaw(built, demonOf(built), demonPower(built));
    const without = oddsRaw(bare, demonOf(bare), demonPower(bare));
    console.log(`\n  心魔 at ${DEMON_EDGE}× your power: ${Math.round(withIt * 100)}% with a stance and arts,`
      + ` ${Math.round(without * 100)}% without\n`);
    expect(withIt).toBeGreaterThan(0.6);
    expect(without).toBeLessThan(withIt / 2);
    // 刃 Not a knife edge: with nothing set at all it still falls, and a tenth heavier
    // it still falls to the build.
    expect(without).toBeGreaterThan(0);
    expect(oddsRaw(built, demonOf(built), demonPower(built) * 1.1)).toBeGreaterThan(0.3);
  });

  it('pays a 道 point on a win, and a loss sends it back for an hour and takes nothing', () => {
    const due = later(seclude(sixth(true)), SECLUSION);
    const won = conquer(due);
    expect(won.demons).toBe(1);
    expect(freePoints(won) - freePoints(due)).toBe(DEMON_DAO);
    // 關 The realm has demons left, so the door shuts again at once, by itself.
    expect(won.secludedAt).toBe(won.at);
    expect(demonLeft(won)).toBe(SECLUSION);
    expect(demonDue(later(won, SECLUSION))).toBe(true);

    const lost = repel(due);
    expect({ ...lost, secludedAt: 0 }).toEqual({ ...due, secludedAt: 0 });
    expect(demonDue(lost)).toBe(false);
    expect(demonLeft(lost)).toBe(DEMON_RETURN);
    expect(demonDue(later(lost, DEMON_RETURN))).toBe(true);
    // Neither can be taken when no demon is waiting.
    const early = seclude(sixth(true));
    expect(conquer(early)).toBe(early);
    expect(repel(early)).toBe(early);
  });

  it('shuts the door again by itself only while the realm still has a demon left', () => {
    // The realm's last demon: the door stays open, and nothing can shut it until the next realm.
    const last = later(seclude({ ...sixth(true), demons: demonsFor(6) - 1 }), SECLUSION);
    const done = conquer(last);
    expect(done.demons).toBe(demonsFor(6));
    expect(done.secludedAt).toBe(0);
    expect(canSeclude(done)).toBe(false);
    // 鎖魂 Counting twice past the last one leaves it open too; one short shuts it.
    const two = later(seclude({ ...sixth(true), demons: demonsFor(6) - 3 }), SECLUSION);
    expect(conquerTwice(two).secludedAt).toBe(two.at);
    expect(conquerTwice(last).secludedAt).toBe(0);
    // 榜 And the ranked server takes a night of it: shut, fallen, shut again, fallen.
    let s = seclude({ ...sixth(true), demons: 0 });
    const before = s;
    for (let n = 0; n < 3; n++) { s = later(s, SECLUSION); s = conquer(s); }
    expect(s.demons).toBe(3);
    expect(verify(before, s, s.at - before.at).why).not.toContain('too-fast');
  });

  it('lets out two a realm from the fourth, nine in a life', () => {
    expect(demonsFor(3)).toBe(0);
    expect(demonsFor(4)).toBe(2);
    expect(demonsFor(6)).toBe(6);
    expect(demonsFor(9)).toBe(DEMONS);
    const full = { ...sixth(true), demons: demonsFor(6) };
    expect(canSeclude(full)).toBe(false);
    expect(canSeclude({ ...full, realm: 7 })).toBe(true);
  });

  it('a save cannot claim demons it had no nights or no realm for', () => {
    const now = T0 + 30 * DAY;
    const forged = validate({ ...sixth(true), demons: 9, secludedAt: now + 100 }, now);
    expect(forged.demons).toBe(demonsFor(6));
    expect(forged.secludedAt).toBe(0);
    const young = validate({ ...sixth(true), startedAt: now - 2 * SECLUSION, demons: 6 }, now);
    expect(young.demons).toBe(2);
    const low = validate({ ...sixth(true), realm: 3, demons: 2, secludedAt: now - 10 }, now);
    expect(low.demons).toBe(0);
    expect(low.secludedAt).toBe(0);
    const honest = validate({ ...sixth(true), demons: 4, secludedAt: now - 10 }, now);
    expect(honest.demons).toBe(4);
    expect(honest.secludedAt).toBe(now - 10);
  });

  it('the server waits on demons faster than the nights, and notices one taken back', () => {
    const a = { ...sixth(true), demons: 1 };
    const rushed = { ...a, demons: 4, at: a.at + 3600 };
    expect(verify(a, rushed, 3600).why).toContain('too-fast');
    const slow = { ...a, demons: 3, at: a.at + 2 * SECLUSION };
    expect(verify(a, slow, 2 * SECLUSION).why).not.toContain('too-fast');
    const back = { ...a, demons: 0, at: a.at + 3600 };
    expect(verify(a, back, 3600).why).toContain('went-down');
  });
});
