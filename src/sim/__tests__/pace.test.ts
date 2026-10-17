import { describe, expect, it } from 'vitest';
import { pace, paceGrowing } from '../pace.ts';
import { newState, type State } from '../state.ts';
import { LAYERS, LAYERS_PER_REALM } from '../balance.ts';
import { SEASON_START } from '../season.ts';

/**
 * 長 The realm card's range: the climb at the rate held where it stands, and the same climb with
 * every upgrade bought as it comes. The second is a reading of the real game (buyAll and
 * advance on a copy), so all this holds it to is its shape.
 */
const at = SEASON_START + 40 * 86_400;
const mid = (realm: number, lv: number): State => ({
  ...newState(at), realm, layer: 0, qi: 0,
  levels: { technique: lv, method: lv, pills: lv, cores: lv },
});

describe('長 paceGrowing', () => {
  it('is never longer than the climb at the rate held, and shorter when there is room to buy', () => {
    for (const [realm, lv] of [[3, 8], [5, 20], [7, 34]] as const) {
      const s = mid(realm, lv);
      const held = pace(s).realmSeconds;
      const grown = paceGrowing(s);
      expect(grown, `realm ${realm}`).not.toBeNull();
      expect(grown!).toBeGreaterThan(0);
      expect(grown!, `realm ${realm}`).toBeLessThan(held * 0.9);
    }
  });

  it('changes nothing in the save it reads', () => {
    const s = mid(4, 14);
    const copy = structuredClone(s);
    paceGrowing(s);
    expect(s).toEqual(copy);
  });

  it('has nothing to say when the ladder is climbed', () => {
    const top = { ...mid(9, 50), layer: LAYERS_PER_REALM - 1, qi: 1e300 };
    expect(top.realm * LAYERS_PER_REALM).toBe(LAYERS);
    expect(paceGrowing(top)).toBeNull();
  });
});
