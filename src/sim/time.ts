import { BASE_RATE, LAYERS_PER_REALM, LAYER_BONUS, REALM_COST } from './balance.ts';
import { rateBonus, type State } from './state.ts';
import { layerCostFactor } from './dao.ts';

/** How many layers have been opened in total, across every realm. 0..81. */
export function layersOpened(s: State): number {
  return (s.realm - 1) * LAYERS_PER_REALM + s.layer;
}

/** Qi per second, right now. The single source of the rate; nothing else computes it. */
export function rate(s: State): number {
  return BASE_RATE * LAYER_BONUS ** layersOpened(s) * rateBonus(s);
}

export function layerCost(realm: number, unlocked: readonly string[] = []): number {
  return (REALM_COST[realm - 1] / LAYERS_PER_REALM) * layerCostFactor(unlocked);
}

/**
 * 0..1 along the current layer.
 *
 * Realm 9 has no layers, so this reads zero there. The ninth realm's own bar is not qi
 * at all — it is `tribulationReadiness`, your power against the Dragon's — because at
 * the top qi is not the thing you wait for.
 */
export function progress(s: State): number {
  const c = layerCost(s.realm, s.unlocked);
  return Number.isFinite(c) ? Math.min(1, s.qi / c) : 0;
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
 * the theoretical curve.
 */
export function advance(s: State, now: number, auto = false): State {
  let dt = now - s.at;
  if (!Number.isFinite(now) || dt <= 0) return { ...s, at: Math.max(s.at, now) };

  let { realm, layer, qi, wardenFell } = s;

  for (let guard = 0; guard <= LAYERS_PER_REALM * 9 + 1; guard++) {
    const r = rate({ ...s, realm, layer });
    const cost = layerCost(realm, s.unlocked);
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
