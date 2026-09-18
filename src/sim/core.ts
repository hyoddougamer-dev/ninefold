import {
  BASE_RATE, CHANNEL_COST, CHANNEL_COUNT, CHANNEL_RATE_BONUS, LAYERS_PER_REALM,
  LAYER_RATE_BONUS, REALM_COST, ROAD_MOTION_RATE, ROAD_STILLNESS_RATE,
} from './balance';
import type { State } from './types';

/** How many layers this state has opened in total, across every realm. 0..81. */
export function layersOpened(s: State): number {
  return (s.realm - 1) * LAYERS_PER_REALM + s.layer;
}

/** Qi one layer of the current realm costs. A layer is a reading of the bar. */
export function layerCost(realm: number): number {
  return REALM_COST[realm - 1] / LAYERS_PER_REALM;
}

/** Qi per second, right now. The single source of the rate; nothing else computes it. */
export function rate(s: State): number {
  const road = s.road === 'stillness' ? ROAD_STILLNESS_RATE : ROAD_MOTION_RATE;
  return (
    BASE_RATE *
    LAYER_RATE_BONUS ** layersOpened(s) *
    CHANNEL_RATE_BONUS ** s.channels *
    road
  );
}

/** 0..1 along the current layer. At realm 9 this is the bar that never completes. */
export function layerProgress(s: State): number {
  const c = layerCost(s.realm);
  return Number.isFinite(c) ? Math.min(1, s.qi / c) : 0;
}

/** 0..1 along the current realm, counting opened layers and the one in progress. */
export function realmProgress(s: State): number {
  return (s.layer + layerProgress(s)) / LAYERS_PER_REALM;
}

export function canOpenChannel(s: State): boolean {
  return s.channels < CHANNEL_COUNT && s.insight >= CHANNEL_COST[s.channels];
}

export function nextChannelCost(s: State): number | null {
  return s.channels < CHANNEL_COUNT ? CHANNEL_COST[s.channels] : null;
}

export function openChannel(s: State): State {
  if (!canOpenChannel(s)) return s;
  return { ...s, insight: s.insight - CHANNEL_COST[s.channels], channels: s.channels + 1 };
}

/** UTC day index. Derived from the clock so two devices agree without asking a server. */
export function dayIndex(epochSeconds: number): number {
  return Math.floor(epochSeconds / 86_400);
}
