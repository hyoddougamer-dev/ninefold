import { describe, expect, it } from 'vitest';
import { TRIOS, cardOf } from '../../data/awakening.ts';
import { cardWorth, rareShare } from '../cardworth.ts';
import { limitFor } from '../stash.ts';
import { fortuneOf } from '../fortune.ts';
import { newState, type State } from '../state.ts';

const T0 = 1_700_000_000;
const at = (realm: number, awakened: string[]): State => ({ ...newState(T0), realm, layer: 3, awakened });

/**
 * 數 rekaris, on the Discord, of 福星 Lucky Star: "Whats this supposed to do? Is it cryptic
 * on purpose?" Every card now says what it does in the player's own numbers. These hold
 * those numbers to the sim: the share is the one the kill rolls against.
 */
describe('悟道 what a card says it does', () => {
  it('Lucky Star quotes the share of rare drops now and with it, from the real fortune', () => {
    const s = at(4, ['feast', 'wolf']);
    const w = cardWorth(s, cardOf('luckystar')!);
    expect(w.kind).toBe('luck');
    if (w.kind !== 'luck') return;
    expect(w.before).toBeCloseTo(rareShare(4, fortuneOf(s).luck ?? 1, w.from), 9);
    expect(w.after).toBeGreaterThan(w.before);
    const taken = at(4, ['feast', 'wolf', 'luckystar']);
    expect(rareShare(4, fortuneOf(taken).luck ?? 1, w.from)).toBeCloseTo(w.after, 9);
  });

  it('a chest card quotes the chest as it will be', () => {
    const s = at(4, ['feast', 'wolf']);
    const w = cardWorth(s, cardOf('sleeves')!);
    expect(w).toEqual({ kind: 'chest', before: limitFor(s), after: limitFor(at(4, ['feast', 'wolf', 'sleeves'])) });
  });

  it('a drop card quotes the chance a kill drops', () => {
    const s = at(2, ['pack']);
    const w = cardWorth(s, cardOf('everywhere')!);
    expect(w.kind).toBe('drop');
    if (w.kind === 'drop') expect(w.after - w.before).toBeCloseTo(0.10, 9);
  });

  it('every card on offer has a line to say', () => {
    const s = at(9, []);
    for (const trio of TRIOS) for (const c of trio) expect(cardWorth(s, c).kind, c.key).toBeTruthy();
  });
});
