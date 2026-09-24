import { describe, expect, it } from 'vitest';
import { AWAKENINGS, ALL_CARDS, HEAVEN_CARDS, TRIOS } from '../../data/awakening.ts';
import { MARKS_PER_HEAVEN } from '../../data/heavens.ts';
import { ALL_NODES } from '../../data/techniques.ts';
import { cardDue, due, held, owed, pillFactor, take, towerBonus, valid } from '../awaken.ts';
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
    // And no more than eight from the realms however far past the ninth a save claims.
    expect(owed(40)).toBe(8);
  });

  /**
   * 境外 And nine more, one at each heaven.
   *
   * 量 忙 The harness counted what a cultivator has to decide and the endgame had nothing
   * in that column: forty crossings from about day 50 to day 138, all of them the same
   * crossing at a bigger number. The realms hand over eight permanent choices and the
   * heavens handed over none, so the half of the game that lasts longest had no build.
   */
  it('owes one more at every heaven, and never ahead of a realm that still owes one', () => {
    expect(HEAVEN_CARDS.length).toBe(9);
    expect(TRIOS.length).toBe(17);
    for (const trio of HEAVEN_CARDS) expect(trio.length).toBe(3);
    // 序 A heaven cannot jump the queue: the eight realm trios come first, in order, so
    // a cultivator who never took theirs is offered the realms' before the heavens'.
    expect(due(9, [], 3 * MARKS_PER_HEAVEN)).toBe(AWAKENINGS[0]);
    // 境 And a realm below the ninth owes nothing for a mark it could not have taken.
    expect(owed(4, 3 * MARKS_PER_HEAVEN)).toBe(3);
    const eight = AWAKENINGS.map((t) => t[0].key);
    expect(owed(9, 0)).toBe(8);
    // Standing in the ninth realm with every realm card taken, a crossing owes the ninth.
    expect(due(9, eight, 0)).toBeNull();
    expect(due(9, eight, 1)).toBe(HEAVEN_CARDS[0]);
    expect(due(9, eight, MARKS_PER_HEAVEN)).toBe(HEAVEN_CARDS[0]);
    expect(due(9, eight, MARKS_PER_HEAVEN + 1)).toBe(HEAVEN_CARDS[0]);
    // And it stops at the ninth heaven however many marks are taken after it.
    expect(owed(9, 300)).toBe(17);
  });

  it('reads the marks off the save, so no screen has to remember the heavens exist', () => {
    const eight = AWAKENINGS.map((t) => t[0].key);
    const s = { ...newState(T0), realm: 9, tribulation: 4, awakened: eight } as State;
    expect(cardDue(s)).toBe(HEAVEN_CARDS[0]);
    expect(cardDue({ ...s, tribulation: 0 })).toBeNull();
  });

  /**
   * 頂 A forged save cannot claim seventeen permanent cards on a cultivator who has
   * crossed nothing. `valid` checks the *order* of the list and nothing else, which was
   * already a hole for the realms and became a much bigger one once nine more trios
   * existed behind the marks.
   */
  it('caps a forged list at what the cultivator has actually been offered', () => {
    const every = ALL_CARDS.map((c) => c.key);
    const forged = validate({ ...newState(T0), realm: 2, awakened: every }, T0);
    expect(forged.awakened.length).toBe(1);
    const crossed = validate(
      { ...newState(T0), realm: 9, tribulation: 4, awakened: every }, T0,
    );
    expect(crossed.awakened.length).toBe(8 + 2);
  });

  it('pays the endgame in what the endgame is made of, and never in power', () => {
    for (const trio of HEAVEN_CARDS) expect(new Set(trio.map((c) => c.effect.kind)).size).toBe(3);
    /**
     * 序 A build has to be legal to be measured: `sum` reads `held`, which reads `valid`,
     * so a list of every 丹 card in the game is not a cultivator, it is a forged save
     * that reads as nothing at all. This leans one way at every one of the seventeen
     * turns, which is what a player leaning that way would actually end up holding.
     */
    const leaning = (kind: string) =>
      TRIOS.map((trio) => (trio.find((c) => c.effect.kind === kind) ?? trio[0]).key);
    const thrift = leaning('pill');
    expect(pillFactor(thrift)).toBeGreaterThan(0.3);
    expect(pillFactor(thrift)).toBeLessThan(1);
    expect(pillFactor([])).toBe(1);
    // 塔 And every tower card is a multiplier on a floor's own loot, never on the rate.
    const climb = leaning('tower');
    expect(towerBonus(climb)).toBeGreaterThan(1);
    expect(towerBonus([])).toBe(1);
    // 力 Neither of them is power, which is the line the realm cards already hold.
    const bare = { ...newState(T0), realm: 9, tribulation: 20 } as State;
    expect(power({ ...bare, awakened: thrift })).toBe(power(bare));
    expect(power({ ...bare, awakened: climb })).toBe(power(bare));
    console.log(`\n  境外 a cultivator leaning 丹 pays ` +
      `${(pillFactor(thrift) * 100).toFixed(0)}% of a pill's 材, and one leaning ` +
      `塔 takes ${towerBonus(climb).toFixed(2)}x off a floor\n`);
  });

  it('gives each trio three different kinds, so a choice is never arithmetic', () => {
    for (const trio of TRIOS) {
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
    expect(valid(greedy).length).toBeLessThanOrEqual(TRIOS.length);
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
