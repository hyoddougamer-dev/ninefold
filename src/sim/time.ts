import { LAYERS, LAYERS_PER_REALM, ladderAt } from './balance.ts';
import { layersOpened, rate, type State } from './state.ts';
import { layerCostFactor } from './dao.ts';

// 氣 The rate and the layer count live in state.ts, because the tribulation's pool is
// measured in days of gathering and so has to read the rate from inside the state.
export { layersOpened, rate };

/**
 * What the layer under a cultivator's feet costs.
 *
 * Every rung of the eighty-one has its own price, and each is dearer than the last. The
 * eighty-second does not exist: the ladder ends at the top of the ninth realm, qi banks
 * there for ever, and 渡劫 is what happens next.
 */
export function layerCost(realm: number, layer: number, unlocked: readonly string[] = []): number {
  const n = (realm - 1) * LAYERS_PER_REALM + layer;
  // The summit. There is no rung above the ninth layer of the ninth realm, so its price
  // is infinite and qi banks there for ever — which is where 渡劫 begins.
  if (n >= LAYERS - 1) return Infinity;
  return ladderAt(n) * layerCostFactor(unlocked);
}

/** 0..1 along the current layer. Once the ladder runs out it reads full and stays there. */
export function progress(s: State): number {
  const c = layerCost(s.realm, s.layer, s.unlocked);
  return Number.isFinite(c) ? Math.min(1, s.qi / c) : 1;
}

/** True once the last rung is open and there is nothing left to climb. */
export function ladderDone(s: State): boolean {
  return layersOpened(s) >= LAYERS - 1;
}

/**
 * The only way time moves.
 *
 * It walks layer by layer rather than applying one rate across the whole gap, because
 * the rate *changes* every time a layer opens. Applying a single rate to a twenty-hour
 * absence would underpay it in silence — and an idle game is played closed, so this is
 * not a detail: it is the difference between paying the hours the player did not watch
 * and lying about them.
 *
 * At a realm's ceiling the layers stop opening and qi banks instead. Time never climbs
 * a realm: beating the warden only unlocks the breakthrough, and pressing 突破 is what
 * takes it. The first version let a fallen warden open the gate here, so the realm
 * advanced on the next tick — the player never saw the button, and never saw the one
 * moment the game stops for.
 *
 * `auto` ignores the gate entirely and exists only so the balance simulation can trace
 * the theoretical curve. `focus` is 入定 — what the app being open is worth — and it is
 * never below 1, so no call of this function can ever pay less than the promised rate.
 */
export function advance(s: State, now: number, auto = false, focus = 1): State {
  let dt = now - s.at;
  if (!Number.isFinite(now) || dt <= 0) return { ...s, at: Math.max(s.at, now) };

  let { realm, layer, qi, wardenFell } = s;

  for (let guard = 0; guard <= LAYERS + 1; guard++) {
    const r = rate({ ...s, realm, layer }) * Math.max(1, focus);
    const cost = layerCost(realm, layer, s.unlocked);
    const ceiling = layer >= LAYERS_PER_REALM - 1;

    // At the ceiling, qi banks and time ends here. Only 突破 leaves a realm.
    if (ceiling && !auto) {
      const remaining = cost - qi;
      const seconds = remaining / r;
      if (!Number.isFinite(seconds) || seconds > dt) { qi += r * dt; break; }
      qi = cost + r * (dt - seconds);
      break;
    }

    const remaining = cost - qi;
    const seconds = remaining / r;
    if (!Number.isFinite(seconds) || seconds > dt) { qi += r * dt; break; }

    qi = 0;
    dt -= seconds;
    if (++layer >= LAYERS_PER_REALM) {
      layer = 0;
      realm += 1;
      wardenFell = false;
    }
  }

  return { ...s, at: now, realm, layer, qi, wardenFell };
}
