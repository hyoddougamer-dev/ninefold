import { describe, expect, it } from 'vitest';
import { AWAKENINGS, ALL_CARDS } from '../../data/awakening.ts';
import { ALL_NODES } from '../../data/techniques.ts';
import { due, held, owed, take, valid } from '../awaken.ts';
import { newState, power, validate, type State } from '../state.ts';
import { MEETINGS, validMet } from '../../data/meetings.ts';
import { answer, canAnswer, giftOf, meetingDue, priceOf, MEET_GAP } from '../meet.ts';
import { freePoints } from '../points.ts';

const T0 = 1_700_000_000;

/**
 * 悟道 Eight choices, twenty-four cards, and the promise that the offer cannot be lost.
 *
 * The whole mechanism is one subtraction: what is owed is the realm minus one, what is
 * taken is the length of the list. That is what makes it survive a reload, survive a
 * save edited by hand, and need nothing to remember to raise it.
 */
describe('悟道 the cards at a breakthrough', () => {
  it('offers one trio per breakthrough, in order, and stops', () => {
    expect(AWAKENINGS.length).toBe(8);
    for (const trio of AWAKENINGS) expect(trio.length).toBe(3);
    // Reaching the second realm owes the first choice; the first realm owes none.
    expect(owed(1)).toBe(0);
    expect(owed(2)).toBe(1);
    expect(owed(9)).toBe(8);
    // And no more than eight however far past the ninth a save claims to be.
    expect(owed(40)).toBe(8);
  });

  it('gives each trio three different kinds, so a choice is never arithmetic', () => {
    for (const trio of AWAKENINGS) {
      expect(new Set(trio.map((c) => c.effect.kind)).size).toBe(3);
    }
  });

  /**
   * 力 No card pays power, and that is a measurement rather than an oversight.
   *
   * The first table had five of them, compounding to 3.5x, and the pure idler reached
   * the ninth realm on day 121 instead of 171 while everybody who actually plays moved
   * by less than a day. Power is the axis the wall between idle and active is built on.
   */
  it('pays nothing that power is made of', () => {
    for (const c of ALL_CARDS) expect(c.effect.kind).not.toBe('power');
    const bare = { ...newState(T0), realm: 5, layer: 4 } as State;
    const decked = { ...bare, awakened: ['feast', 'wolf', 'slaughter', 'platform'] };
    expect(power(decked)).toBe(power(bare));
  });

  it('never names a character 道 the tree already uses', () => {
    for (const c of ALL_CARDS) {
      expect(ALL_NODES.some((n) => n.han === c.han),
        `${c.han} is a card and a node, and a player would read them as one thing`).toBe(false);
    }
  });

  it('takes only from the trio on offer, and only once each', () => {
    const first = AWAKENINGS[0][1].key;
    expect(take(2, [], first)).toEqual([first]);
    // A card from another trio is refused, and changes nothing.
    expect(take(2, [], AWAKENINGS[3][0].key)).toEqual([]);
    // A card that does not exist is refused.
    expect(take(2, [], 'no-such-card')).toEqual([]);
    // With one taken at realm 2, nothing more is owed until the third realm.
    expect(due(2, [first])).toBeNull();
    expect(due(3, [first])).toBe(AWAKENINGS[1]);
  });

  it('throws away a forged list rather than trusting it', () => {
    // Every card in the game, claimed at once.
    const greedy = ALL_CARDS.map((c) => c.key);
    expect(valid(greedy).length).toBeLessThanOrEqual(AWAKENINGS.length);
    // The ninth realm's card claimed as the first choice.
    expect(valid([AWAKENINGS[7][0].key])).toEqual([]);
    // And the same card twice.
    const k = AWAKENINGS[0][0].key;
    expect(valid([k, k])).toEqual([k]);
  });

  it('survives a save going out and coming back', () => {
    const s = { ...newState(T0), realm: 5, awakened: ['feast', 'wolf', 'slaughter'] } as State;
    const back = validate(JSON.parse(JSON.stringify(s)), T0);
    expect(back.awakened).toEqual(['feast', 'wolf', 'slaughter']);
    expect(held(back.awakened).map((c) => c.han)).toEqual(['血食', '貪狼', '屠戮']);
  });

  it('counts the points a card gives with every other point', () => {
    const bare = { ...newState(T0), realm: 3 } as State;
    const withCard = { ...bare, awakened: ['insight'] };
    expect(freePoints(withCard) - freePoints(bare)).toBe(2);
  });
});

/**
 * 緣 Somebody on the road, and the three promises the card makes.
 *
 * Nothing is taken that was not offered, nothing expires, and which meeting comes next
 * is a function of the save rather than of a die.
 */
describe('緣 somebody on the road', () => {
  const walker = (over: Partial<State> = {}): State => ({
    ...newState(T0), realm: 4, layer: 4, qi: 5e6, materials: 50_000,
    at: T0 + 10 * MEET_GAP, metAt: T0, ...over,
  } as State);

  it('is quiet in the first realm, and quiet again straight after a meeting', () => {
    expect(meetingDue(walker({ realm: 1 }))).toBeNull();
    const s = walker();
    const m = meetingDue(s)!;
    expect(m).toBeTruthy();
    const after = answer(s, m.key, 1, 7);
    expect(meetingDue(after)).toBeNull();          // the gap has not passed
    expect(meetingDue({ ...after, at: after.at + MEET_GAP })).toBeTruthy();
  });

  it('meets the same people in the same order for the same save', () => {
    const a = walker(), b = walker();
    expect(meetingDue(a)!.key).toBe(meetingDue(b)!.key);
    // And a different history meets somebody else, at least sometimes.
    const seen = new Set<string>();
    for (let i = 0; i < 40; i++) seen.add(meetingDue(walker({ startedAt: T0 + i * 811 }))!.key);
    expect(seen.size).toBeGreaterThan(1);
  });

  it('never meets anybody twice, and never anybody from a realm not reached', () => {
    let s = walker();
    for (let i = 0; i < MEETINGS.length + 4; i++) {
      const m = meetingDue(s);
      if (!m) break;
      expect(m.realm).toBeLessThanOrEqual(s.realm);
      expect(s.met).not.toContain(m.key);
      s = { ...answer(s, m.key, 0, i), at: s.at + MEET_GAP + 1 };
    }
    expect(new Set(s.met).size).toBe(s.met.length);
  });

  /** 取 The promise the whole card is built on. */
  it('never takes anything that was not offered on the button pressed', () => {
    let s = walker();
    const m = meetingDue(s)!;
    for (const [i, p] of m.picks.entries()) {
      const before = walker();
      const cost = priceOf(before, p);
      const after = answer(before, m.key, i as 0 | 1, 3);
      const gift = giftOf(before, p.outcome);
      expect(after.qi).toBe(before.qi - cost.qi + gift.qi);
      expect(after.materials).toBe(before.materials - cost.materials + gift.materials);
    }
    // And a pick that cannot be paid for changes nothing at all, rather than half of it.
    const poor = walker({ qi: 0, materials: 0 });
    const dear = meetingDue(poor)!.picks.find((p) => p.costQi || p.costMaterial);
    if (dear) {
      const which = meetingDue(poor)!.picks.indexOf(dear) as 0 | 1;
      expect(canAnswer(poor, dear)).toBe(false);
      expect(answer(poor, meetingDue(poor)!.key, which, 1)).toBe(poor);
    }
    s = answer(s, m.key, 1, 1);
    expect(s.met).toContain(m.key);
  });

  it('throws away a forged list of people met', () => {
    expect(validMet(['nobody', 'oldman', 'oldman'])).toEqual(['oldman']);
    expect(validMet('not a list')).toEqual([]);
    const s = validate({ ...newState(T0), met: ['oldman', 'oldman', 'nope'], metPoints: 1e9 }, T0);
    expect(s.met).toEqual(['oldman']);
    expect(s.metPoints).toBeLessThanOrEqual(9);
  });
});
