import { describe, expect, it } from 'vitest';
import { ALL_NODES } from '../../data/techniques.ts';
import { TRIOS } from '../awaken.ts';
import { RETRADE_DAO, RETRADE_DAYS } from '../balance.ts';
import { chestLimit } from '../chest.ts';
import { canUnlock, capstonesOpen } from '../dao.ts';
import { earnedPoints, freePoints, treeFull } from '../points.ts';
import { alternatives, paysInDao, retrade, retradeCost, retradeDao, retradeDays } from '../retrade.ts';
import { isOpen } from '../unlocks.ts';
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

/** Every node the tree will take, bought the way a cultivator who buys everything buys. */
function spentOut(s0: State): State {
  let s = s0;
  for (let guard = 0; guard < 400; guard++) {
    const free = freePoints(s);
    const n = ALL_NODES.find((x) => canUnlock(x.key, s.unlocked, free, isOpen(s.realm, 'keystones'), capstonesOpen(s.realm)));
    if (!n) break;
    s = { ...s, unlocked: [...s.unlocked, n.key] };
  }
  return s;
}

/**
 * 道 The release audit of 2026-10-16: from the sixth realm to the summit a finished tree held
 * 7 to 52 points that nothing would take. A trade can be paid in them instead of qi, and only
 * there, so a tree that still grows never spends its points on a card by mistake.
 */
describe('道 a finished tree can pay a trade in points', () => {
  // Read through validate() first, so the purse is one a load keeps as it is.
  const rich = () => spentOut(validate(JSON.parse(JSON.stringify(body({ realm: 8, metPoints: 60, qi: 0 }))), T0));

  it('prices one point for each card back, the step the qi price climbs by', () => {
    const s = body();
    expect(retradeDao(s.awakened, 2)).toBe(RETRADE_DAO);
    expect(retradeDao(s.awakened, 0)).toBe(3 * RETRADE_DAO);
    expect(retradeDao(s.awakened, 3)).toBe(Infinity);
  });

  it('pays from the purse, keeps the qi, and reads back the same after a load', () => {
    const s = rich();
    expect(treeFull(s, false)).toBe(true);
    expect(paysInDao(s)).toBe(true);
    const free = freePoints(s);
    // A card that pays no 道 of its own, so the purse moves by the price and nothing else.
    const to = TRIOS[0].find((c) => c.key !== s.awakened[0] && c.effect.kind !== 'dao')!.key;
    expect(TRIOS[0].find((c) => c.key === s.awakened[0])!.effect.kind).not.toBe('dao');
    const r = retrade(s, 0, to, 'dao');
    expect(r.refused).toBeNull();
    expect(r.state.awakened[0]).toBe(to);
    expect(r.state.qi).toBe(s.qi);
    expect(r.state.daoPaid).toBe(retradeDao(s.awakened, 0));
    expect(freePoints(r.state)).toBe(free - retradeDao(s.awakened, 0));
    const back = validate(JSON.parse(JSON.stringify(r.state)), T0);
    expect(back.daoPaid).toBe(r.state.daoPaid);
    expect(freePoints(back)).toBe(freePoints(r.state));
  });

  it('is refused to a tree that still has a node to buy, whatever the purse holds', () => {
    const s = body({ metPoints: 60 });
    expect(treeFull(s, false)).toBe(false);
    const r = retrade(s, 0, TRIOS[0][1].key, 'dao');
    expect(r.refused).toBe('points');
    expect(r.state).toBe(s);
  });

  it('is refused when the purse is short, and takes nothing', () => {
    const s0 = rich();
    const s = { ...s0, daoPaid: freePoints(s0) };
    expect(freePoints(s)).toBe(0);
    expect(retrade(s, 2, TRIOS[2][1].key, 'dao').refused).toBe('points');
  });

  it('never lets a forged count of paid points past what was earned', () => {
    const s = rich();
    const back = validate(JSON.parse(JSON.stringify({ ...s, daoPaid: 1e9 })), T0);
    expect(back.daoPaid).toBe(earnedPoints(back));
    expect(validate(JSON.parse(JSON.stringify({ ...s, daoPaid: -5 })), T0).daoPaid).toBe(0);
  });
});
