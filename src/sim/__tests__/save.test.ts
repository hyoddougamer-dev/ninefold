import { describe, expect, it } from 'vitest';
import { MAX_POSSIBLE_RATE, newState, validate } from '../save';
import { rate } from '../core';
import { advance } from '../time';

/**
 * GDD §11 rule 3. The earlier build had a hole where a hand-edited heirloom multiplied
 * the qi rate by 196,502x and passed every check. With a sect layer on top, that stops
 * being one player's cheat and becomes everyone's broken economy.
 */
describe('a save is input', () => {
  const T0 = 1_700_000_000;
  const NOW = T0 + 86_400;

  it('rejects the 196,502x heirloom', () => {
    const honest = advance(newState(T0), NOW);
    const cheated = { ...honest, qi: honest.qi * 196_502 };
    const checked = validate(cheated, NOW);
    expect(checked.qi).toBeLessThan(honest.qi * 196_502);
    expect(checked.qi).toBeLessThanOrEqual(MAX_POSSIBLE_RATE * (NOW - T0) + 1);
  });

  it('leaves an honest save untouched', () => {
    const honest = advance(newState(T0), NOW);
    expect(validate(honest, NOW)).toEqual(honest);
  });

  it('refuses a realm, a layer or a channel count that does not exist', () => {
    const s = validate({ ...newState(T0), realm: 99, layer: 400, channels: 9_000 }, NOW);
    expect(s.realm).toBe(9);
    expect(s.layer).toBe(8);
    expect(s.channels).toBe(12);
    expect(rate(s)).toBeLessThanOrEqual(MAX_POSSIBLE_RATE);
  });

  it('refuses a save timestamped in the future, which would mint qi on the next tick', () => {
    const s = validate({ ...newState(T0), at: NOW + 10 * 86_400 }, NOW);
    expect(s.at).toBeLessThanOrEqual(NOW);
  });

  it('drops kills for beasts that do not exist, and NaN for anything', () => {
    const s = validate(
      { ...newState(T0), kills: { hare: 3, notabeast: 9_999 }, insight: NaN, coin: -5 },
      NOW,
    );
    expect(s.kills).toEqual({ hare: 3 });
    expect(s.insight).toBe(0);
    expect(s.coin).toBe(0);
  });

  it('turns junk into a legal new run rather than throwing', () => {
    for (const junk of [null, undefined, 0, 'x', [], { v: 2 }]) {
      expect(() => validate(junk, NOW)).not.toThrow();
      expect(validate(junk, NOW).realm).toBe(1);
    }
  });
});
