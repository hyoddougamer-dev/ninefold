import { describe, expect, it } from 'vitest';
import { NOTICES, nextNotice } from '../notices.ts';
import { newState, type State } from '../../sim/state.ts';
import { validate } from '../../sim/load.ts';
import { levelCap } from '../../sim/balance.ts';
import { GEAR, baseValue } from '../../data/gear.ts';
import { DISMISSED } from '../guide.ts';
import { WHOM } from '../../data/figures.ts';

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

    // Read once, gone for good, even though the thing is still just as true.
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

  it('has room in a save for every card the game can ever show', () => {
    // validate() keeps the first 32 read keys. If the game could write more than that, the
    // newest card would fall off every save on load and come back every time it opened.
    const every = new Set([...NOTICES.map((n) => n.key), DISMISSED, WHOM]);
    expect(every.size).toBeLessThanOrEqual(32);
    const full = validate({ ...newState(T0), v: 1, seen: [...every] }, T0 + 5);
    expect(full.seen).toEqual([...every]);
  });
});

describe('業 the workshop, arriving on saves that were made before it', () => {
  // A veteran from before the workshop: sixth realm, every older card read, a save with
  // no crafts in it at all, exactly as the live game writes one today.
  const older = NOTICES.filter((n) => n.key !== 'workshop').map((n) => n.key);
  const veteran = () => {
    const s = newState(T0) as unknown as Record<string, unknown>;
    const { crafts: _gone, ...rest } = s;
    return {
      ...rest, v: 1, realm: 6, layer: 3, qi: 123_456, materials: 7_890,
      levels: { technique: 36, method: 30, pills: 24, cores: 12 },
      killed: { rat: 90, hound: 40, fox: 1, ape: 1, crane: 1, tiger: 1, turtle: 1 },
      seen: [...older, DISMISSED, WHOM], tower: 44,
    };
  };

  it('loads with everything the player had, and an empty workshop', () => {
    const s = validate(veteran(), T0 + 60);
    expect(s.realm).toBe(6);
    expect(s.layer).toBe(3);
    expect(s.qi).toBe(123_456);
    expect(s.materials).toBe(7_890);
    expect(s.levels).toEqual({ technique: 36, method: 30, pills: 24, cores: 12 });
    expect(s.killed).toMatchObject({ rat: 90, hound: 40, fox: 1, tiger: 1 });
    expect(s.tower).toBe(44);
    expect(s.seen).toEqual([...older, DISMISSED, WHOM]);
    // Nothing made, nothing owed: the workshop starts from the moment it is opened.
    expect(s.crafts.task).toBeNull();
    expect(Object.keys(s.crafts.pouch)).toHaveLength(0);
    expect(Object.values(s.crafts.xp).every((x) => x === 0)).toBe(true);
  });

  it('tells a player already past the second realm, once, and points at the tab', () => {
    const s = validate(veteran(), T0 + 60);
    const card = nextNotice(s);
    expect(card?.key).toBe('workshop');
    expect(card?.tab).toBe('crafts');
    expect(nextNotice({ ...s, seen: [...s.seen, 'workshop'] })?.key).not.toBe('workshop');
  });

  it('says nothing to a player still in the first realm', () => {
    const s = validate({ ...veteran(), realm: 1, layer: 3 }, T0 + 60);
    expect(NOTICES.find((n) => n.key === 'workshop')!.when(s)).toBe(false);
  });
});
