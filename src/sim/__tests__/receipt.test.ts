import { describe, expect, it } from 'vitest';
import { answer, answerWithReceipt } from '../meet.ts';
import { newState, type State } from '../state.ts';

/**
 * 據 rekaris (2026-10-03): "I've seen a crow, gave it material and I probably got
 * something? Well, I don't know what." The answer now comes with what it gave.
 */
const T0 = 1_700_000_000;
const at = (over: Partial<State>): State => ({ ...newState(T0), ...over } as State);

describe('據 a meeting says what came of it', () => {
  const s = at({ realm: 3, layer: 4, materials: 1000 });

  it('is the same state as answer(), with a receipt beside it', () => {
    const r = answerWithReceipt(s, 'crow', 0, 77);
    expect(JSON.stringify(r.state)).toBe(JSON.stringify(answer(s, 'crow', 0, 77)));
    expect(r.receipt?.costMaterials).toBeGreaterThan(0);
    expect(r.receipt?.then).toMatch(/drops what it was carrying/);
    expect(r.receipt?.found?.item).toBeTruthy();
    expect(r.state.chest.some((x) => x.id === r.receipt?.found?.item?.id)).toBe(true);
  });

  it('says so when walking on gives nothing, and gives no receipt for a meeting already met', () => {
    const r = answerWithReceipt(s, 'crow', 1, 77);
    expect(r.receipt?.found).toBeNull();
    expect(r.receipt?.qi).toBe(0);
    expect(answerWithReceipt(r.state, 'crow', 0, 77).receipt).toBeNull();
  });
});
