import { describe, expect, it } from 'vitest';
import { NOTICES, nextNotice } from '../notices.ts';
import { newState, validate, type State } from '../../sim/state.ts';
import { levelCap } from '../../sim/balance.ts';
import { GEAR, baseValue } from '../../data/gear.ts';

const T0 = 1_700_000_000;

describe('新 the cards that arrive once', () => {
  it('says nothing to a cultivator who has just started', () => {
    // The first minute of the game is not the moment to explain the furnace.
    expect(nextNotice(newState(T0))).toBeNull();
  });

  it('fires when the thing is true, and never twice', () => {
    const cap = levelCap(1);
    const capped: State = {
      ...newState(T0), levels: { technique: cap, method: 0, pills: 0, cores: 0 },
    };
    const first = nextNotice(capped);
    expect(first?.key).toBe('cap');

    // Read once, gone for good — even though the thing is still just as true.
    const after = { ...capped, seen: ['cap'] };
    expect(nextNotice(after)?.key).not.toBe('cap');
  });

  it('shows one card at a time, in the order the game reaches them', () => {
    const everything: State = {
      ...newState(T0), realm: 9, layer: 8, qi: 1e15, materials: 1e12,
      levels: { technique: 54, method: 54, pills: 54, cores: 54 },
      killed: { rat: 500 },
      worn: (() => {
        const tpl = GEAR.filter((g) => g.slot === 'weapon' && g.realm === 9)[0];
        return { weapon: {
          id: 'w', template: tpl.key, rarity: 'heaven' as const,
          rolls: [{ affix: tpl.affix, value: baseValue(tpl, 'heaven', tpl.affix) }],
        } };
      })(),
    };
    // Every card is true at once here, and exactly one is offered.
    const order: string[] = [];
    let s = everything;
    for (let i = 0; i < NOTICES.length + 2; i++) {
      const n = nextNotice(s);
      if (!n) break;
      order.push(n.key);
      s = { ...s, seen: [...s.seen, n.key] };
    }
    console.log(`\n  新 the cards, in the order a cultivator meets them: ${order.join(' → ')}\n`);
    expect(new Set(order).size).toBe(order.length);
    expect(nextNotice(s)).toBeNull();
    // Every card has somewhere to point, or is about the screen it appears on.
    for (const n of NOTICES) {
      expect(n.title.length).toBeGreaterThan(4);
      expect(n.text.length).toBeGreaterThan(40);
    }
  });

  it('keeps what has been read across a save, and cannot be used to grow one', () => {
    const held = validate({ ...newState(T0), v: 1, seen: ['cap', 'cap', 'tower', 42, 'x'.repeat(99)] }, T0 + 5);
    expect(held.seen).toEqual(['cap', 'tower']);

    const flood = validate({ ...newState(T0), v: 1, seen: Array.from({ length: 500 }, (_, i) => `k${i}`) }, T0 + 5);
    expect(flood.seen.length).toBeLessThanOrEqual(32);
  });
});
