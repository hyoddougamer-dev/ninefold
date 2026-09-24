import { LAYERS, LAYERS_PER_REALM, realmCost } from './balance.ts';
import { layerCostFactor } from './dao.ts';
import { layerCost, rate } from './time.ts';
import { type State } from './state.ts';

/**
 * 階 What the climb asks for from here, and how long that is.
 *
 * Bruno: *"é necessário os players perceberem quanto qi é necessário por layer/realm
 * aprox. para que percebam a demora de evolução."* He is right, and the game was
 * hiding the one number that makes an idle game legible. The bar filled, the rate was
 * on the screen, and the **price** of what the bar was filling was nowhere at all. A
 * player could not tell whether the next rung was ten minutes or two days away, so the
 * whole shape of the climb had to be guessed at.
 *
 * 時 Every time here is read off the **standing** rate, never off 入定 the sitting. The
 * sitting ends after a quarter of an hour, so a countdown that rode it would promise a
 * day that arrives in three. A player who sits gets there sooner than the screen said,
 * which is the only direction this is allowed to be wrong in. 待 the price countdowns
 * already follow that rule and this is the same rule.
 *
 * 誤 And nothing here invents a price. A rung is `layerCost`, the same function the
 * ladder itself climbs by, so it already carries 道 the tree's discount. A realm is its
 * nine rungs. If the ladder moves, this moves with it.
 */
export interface Pace {
  /** What the rung being climbed asks for, and what is still owed on it. */
  readonly rung: number;
  readonly rungLeft: number;
  readonly rungSeconds: number;
  /** The nine rungs of the realm being climbed, and what is left of them. */
  readonly realm: number;
  readonly realmLeft: number;
  readonly realmSeconds: number;
  /** The realm above, and how many of this one it is worth. Null at the summit. */
  readonly next: number | null;
  readonly times: number | null;
}

/** The seconds a pile of qi takes at the rate you are standing at. */
const seconds = (qi: number, per: number) => (per > 0 ? Math.max(0, qi) / per : Infinity);

export function pace(s: State): Pace {
  const per = rate(s);
  const factor = layerCostFactor(s.unlocked);
  const rung = layerCost(s.realm, s.layer, s.unlocked);
  const realm = realmCost(s.realm) * factor;

  // 殘 What the realm still owes: the rungs above the one being climbed, plus what is
  // left of that one. Counted from the ladder rather than from the bar, so a realm
  // entered with qi already in hand reads as the shorter climb it actually is.
  let left = Math.max(0, rung - s.qi);
  for (let l = s.layer + 1; l < LAYERS_PER_REALM; l++) {
    const c = layerCost(s.realm, l, s.unlocked);
    if (Number.isFinite(c)) left += c;
  }

  const realms = LAYERS / LAYERS_PER_REALM;
  const next = s.realm < realms ? realmCost(s.realm + 1) * factor : null;
  return {
    rung: Number.isFinite(rung) ? rung : 0,
    rungLeft: Number.isFinite(rung) ? Math.max(0, rung - s.qi) : 0,
    rungSeconds: Number.isFinite(rung) ? seconds(rung - s.qi, per) : 0,
    realm,
    realmLeft: left,
    realmSeconds: seconds(left, per),
    next,
    times: next === null ? null : next / realm,
  };
}
