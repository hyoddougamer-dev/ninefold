import { LAYERS, LAYERS_PER_REALM, realmCost } from './balance.ts';
import { layerCostFactor } from './dao.ts';
import { advance, gathering, ladderDone, layerCost } from './time.ts';
import { buyAll, type State } from './state.ts';

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
 * sitting ends after half an hour, so a countdown that rode it would promise a
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
  const per = gathering(s);
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

/**
 * 長 The same climb with the rate growing as it goes: every upgrade bought as soon as the qi
 * for it is there, looked at every few hours, nothing else. pace() holds the rate where it
 * stands, which is honest about the floor and wrong about the climb: the realm card told an
 * eighth-realm cultivator 27 days for a realm the harness walks in 16, because every level of
 * 功法 and 吐納 bought on the way makes the rest of it shorter (audit, 2026-10-16). Between the
 * two is the range the card says.
 *
 * It plays the real game (buyAll, the button's own loop, and advance) on a copy of the save,
 * so it moves with every number that moves the climb. Null when there is nothing left to
 * climb or it would not finish inside the horizon, and the card then says the one number.
 */
const GROW_LOOK = 6 * 3600;        // how often the imagined cultivator comes back and buys
const GROW_HORIZON = 120 * 86_400; // past this the estimate is not worth a line

export function paceGrowing(s: State): number | null {
  if (pace(s).realmLeft <= 0 || ladderDone(s)) return null;
  let state = s;
  for (let t = 0; t < GROW_HORIZON; t += GROW_LOOK) {
    state = buyAll(state).state;
    // 頂 In the ninth realm the summit rung costs for ever, so the realm never reads as left:
    // the climb is done when the ladder is.
    if (pace(state).realmLeft <= 0 || state.realm !== s.realm || ladderDone(state)) return t;
    state = advance(state, state.at + GROW_LOOK);
  }
  return null;
}
