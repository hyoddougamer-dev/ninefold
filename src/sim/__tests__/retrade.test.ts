import { describe, expect, it } from 'vitest';
import { ALL_NODES } from '../../data/techniques.ts';
import { TRIOS } from '../awaken.ts';
import { RETRADE_DAYS } from '../balance.ts';
import { chestLimit } from '../chest.ts';
import { canUnlock } from '../dao.ts';
import { freePoints } from '../points.ts';
import { alternatives, retrade, retradeCost, retradeDays } from '../retrade.ts';
import { newState, rate, type State } from '../state.ts';
import { validate } from '../load.ts';

const T0 = 1_700_000_000;
const DAY = 86_400;
const hand = (...keys: string[]) => keys;
/** A fourth-realm cultivator holding the first card of each of its three trios. */
const body = (over: Partial<State> = {}): State => ({
  ...newState(T0), realm: 4, layer: 3, qi: 1e15,
  awakened: hand(TRIOS[0][0].key, TRIOS[1][0].key, TRIOS[2][0].key), ...over,
} as State);

/**
 * 改 rekaris, on the Discord: *"give the player the possibility to change any of their
 * 'permanent' choices at a very, very, very large cost."* Bruno chose to let any card be
 * traded for another of its three, paid in days of the cultivator's own qi, dearer the
 * further back it is. These hold the price, the swap, and every way it is refused.
 */
describe('改 trading a card already taken', () => {
  it('costs half a day of your own qi for the newest card, and more the further back', () => {
    const s = body();
    expect(retradeDays(s.awakened, 2)).toBe(RETRADE_DAYS);
    expect(retradeDays(s.awakened, 1)).toBe(2 * RETRADE_DAYS);
    expect(retradeDays(s.awakened, 0)).toBe(3 * RETRADE_DAYS);
    expect(retradeCost(s, 2)).toBe(Math.ceil(RETRADE_DAYS * DAY * rate(s)));
    expect(retradeDays(s.awakened, 3)).toBe(Infinity);
    expect(retradeDays(s.awakened, -1)).toBe(Infinity);
    expect(retradeDays(s.awakened, 0.5)).toBe(Infinity);
  });

  it('offers the other two cards of the same trio', () => {
    const alt = alternatives(body().awakened, 1).map((c) => c.key);
    expect(alt).toEqual(TRIOS[1].slice(1).map((c) => c.key));
  });

  it('swaps the one card in place, pays the qi, and leaves the rest alone', () => {
    const s = body();
    const to = TRIOS[1][2].key;
    const r = retrade(s, 1, to);
    expect(r.refused).toBeNull();
    expect(r.state.awakened).toEqual([s.awakened[0], to, s.awakened[2]]);
    expect(r.state.qi).toBe(s.qi - retradeCost(s, 1));
    // and the save reads back exactly as traded
    expect(validate(JSON.parse(JSON.stringify(r.state)), T0).awakened).toEqual(r.state.awakened);
  });

  it('refuses the card already held, a card from another trio, and a card that is not there', () => {
    const s = body();
    expect(retrade(s, 1, s.awakened[1]).refused).toBe('card');
    expect(retrade(s, 1, TRIOS[0][1].key).refused).toBe('card');
    expect(retrade(s, 1, 'nosuchcard').refused).toBe('card');
    expect(retrade(s, 5, TRIOS[1][1].key).refused).toBe('card');
    expect(retrade(s, 1, TRIOS[0][1].key).state).toBe(s);
  });

  it('refuses when the bar cannot pay, and takes nothing', () => {
    const s = body({ qi: 10 });
    const r = retrade(s, 2, TRIOS[2][1].key);
    expect(r.refused).toBe('qi');
    expect(r.state).toBe(s);
  });

  it('refuses to take back 道 points already spent in the tree', () => {
    const insight = TRIOS[0].find((c) => c.effect.kind === 'dao')!;
    let s = body({ awakened: hand(insight.key, TRIOS[1][0].key, TRIOS[2][0].key) });
    // Spend every point there is, the card's included.
    for (let pass = 0; pass < 40; pass++) {
      const node = ALL_NODES.find((n) => canUnlock(n.key, s.unlocked, freePoints(s)));
      if (!node) break;
      s = { ...s, unlocked: [...s.unlocked, node.key] };
    }
    expect(freePoints(s)).toBeLessThan((insight.effect as { points: number }).points);
    const other = TRIOS[0].find((c) => c.key !== insight.key)!;
    expect(retrade(s, 0, other.key).refused).toBe('dao');
  });

  it('refuses to take back chest places that are already full', () => {
    const pack = TRIOS[0].find((c) => c.effect.kind === 'chest')!;
    const s0 = body({ awakened: hand(pack.key, TRIOS[1][0].key, TRIOS[2][0].key) });
    const room = chestLimit(s0.unlocked, 0, s0.awakened);
    const chest = Array.from({ length: room }, (_, i) =>
      ({ id: `c${i}`, template: 'sword2', rarity: 'common' as const, rolls: [{ affix: 'power' as const, value: 1 }] }));
    const s = { ...s0, chest };
    const other = TRIOS[0].find((c) => c.key !== pack.key)!;
    expect(retrade(s, 0, other.key).refused).toBe('chest');
    // With room to spare it goes through.
    expect(retrade({ ...s, chest: chest.slice(0, 2) }, 0, other.key).refused).toBeNull();
  });
});
