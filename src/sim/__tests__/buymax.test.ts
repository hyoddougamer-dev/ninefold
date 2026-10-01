import { describe, expect, it } from 'vitest';
import { buy, buyMax, canBuy, capOf, newState, upgradeCost, UPGRADES } from '../state.ts';

/** 盡 Buying the most you can afford is exactly tapping the box until it greys out. */
describe('盡 buy max', () => {
  const rich = { ...newState(0), realm: 3, qi: 1e9, materials: 1e9 };

  it('buys what one tap at a time would have bought, at the same total price', () => {
    for (const u of UPGRADES) {
      let tapped = rich;
      let paid = 0;
      while (canBuy(tapped, u)) { paid += upgradeCost(tapped, u); tapped = buy(tapped, u); }
      const max = buyMax(rich, u);
      expect(max.state.levels[u]).toBe(tapped.levels[u]);
      expect(max.cost).toBe(paid);
      expect(max.state.qi).toBe(tapped.qi);
      expect(max.state.materials).toBe(tapped.materials);
    }
  });

  it('stops at the realm’s ceiling, never past it', () => {
    const max = buyMax(rich, 'technique');
    expect(max.state.levels.technique).toBe(capOf(rich, 'technique'));
  });

  it('buys nothing and changes nothing when nothing can be paid for', () => {
    const poor = { ...rich, qi: 0, materials: 0 };
    const max = buyMax(poor, 'technique');
    expect(max.n).toBe(0);
    expect(max.state).toBe(poor);
  });
});
