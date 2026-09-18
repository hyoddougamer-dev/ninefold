import { LAYERS_PER_REALM } from './balance';
import { layerCost, rate } from './core';
import type { State } from './types';

/**
 * The only way time moves. GDD §11 rule 2.
 *
 * It walks layer by layer rather than applying one rate across the whole gap, because
 * the rate *changes* every time a layer opens. Applying a single rate to a 20-hour
 * absence would silently underpay it, and one long absence must pay exactly what many
 * short ones pay — `time.test.ts` asserts that directly.
 */
export function advance(s: State, now: number): State {
  if (!Number.isFinite(now)) return s;
  let dt = now - s.at;
  if (dt <= 0) return { ...s, at: Math.max(s.at, now) };

  let { realm, layer, qi, qiEverGathered } = s;
  const head = { ...s };

  // Bounded: 81 layers exist, and realm 9's cost is Infinity, so this cannot spin.
  for (let guard = 0; guard <= LAYERS_PER_REALM * 9 + 1; guard++) {
    head.realm = realm;
    head.layer = layer;
    const r = rate(head);
    const cost = layerCost(realm);
    const remaining = cost - qi;
    const secondsToOpen = remaining / r;

    if (!Number.isFinite(secondsToOpen) || secondsToOpen > dt) {
      qi += r * dt;
      qiEverGathered += r * dt;
      dt = 0;
      break;
    }

    qi = 0;
    qiEverGathered += remaining;
    dt -= secondsToOpen;
    layer += 1;
    if (layer >= LAYERS_PER_REALM) {
      layer = 0;
      realm += 1;
    }
  }

  return { ...s, at: now, realm, layer, qi, qiEverGathered };
}
