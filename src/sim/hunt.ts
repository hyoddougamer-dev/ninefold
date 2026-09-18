import { HUNT_COST_SECONDS, PATH_TUNING, TIERS } from './balance';
import { dayIndex, rate } from './core';
import { GROUND_BY_KEY } from '../data/world';
import { groundOpen, trailFor } from './trail';
import type { HuntResult, Outcome, State, Tier } from './types';

/**
 * The haul curve. Hunt n of a day returns h(n); never zero, never refused.
 *
 *     h(n) = burst(n) / (1 + (n - 1) / k)
 *
 * The cap the earlier build used protected fairness by *blocking* the player, which
 * is the worst way to protect it. This says no to nobody — it just shows the player
 * exactly what they are trading. The wall is the curve, not a rule.
 */
export function haul(n: number, path: State['path']): number {
  const t = PATH_TUNING[path];
  const burst = n <= t.burstHunts ? t.burst : 1;
  return burst / (1 + (n - 1) / t.k);
}

/** A hunt costs half an hour of your *own* current rate, so it feels the same at realm 1 and 8. */
export function huntCost(s: State): number {
  return rate(s) * HUNT_COST_SECONDS * PATH_TUNING[s.path].costScale;
}

/** Hunts already taken in the UTC day `now` falls in. Rolls over on its own. */
export function huntsToday(s: State, now: number): number {
  return dayIndex(now) === s.huntDay ? s.huntCount : 0;
}

export function hunt(s: State, now: number, groundKey: string): Outcome<HuntResult> {
  const ground = GROUND_BY_KEY[groundKey];
  if (!ground) return { ok: false, reason: 'no-such-ground' };
  if (s.road !== 'motion') return { ok: false, reason: 'not-on-motion' };
  if (!groundOpen(ground, s)) return { ok: false, reason: 'ground-locked' };

  const cost = huntCost(s);
  if (s.qi < cost) return { ok: false, reason: 'insufficient-qi', need: cost, have: s.qi };

  const day = dayIndex(now);
  const n = (day === s.huntDay ? s.huntCount : 0) + 1;
  const entry = trailFor(ground, now, s);
  const h = haul(n, s.path) * entry.quality;
  const beast = entry.beast;

  const materials = Math.max(1, Math.round(beast.rank * 4 * h));
  const insight = Math.max(1, Math.round(beast.rank * 3 * h));
  const coin = beast.rank >= 4 ? Math.max(1, Math.round(beast.rank * h)) : 0;
  const tier: Tier = TIERS.includes(beast.tier) ? beast.tier : 'common';
  const firstKill = !s.kills[beast.key];

  const state: State = {
    ...s,
    qi: s.qi - cost,
    insight: s.insight + insight,
    coin: s.coin + coin,
    materials: { ...s.materials, [tier]: (s.materials[tier] ?? 0) + materials },
    kills: { ...s.kills, [beast.key]: (s.kills[beast.key] ?? 0) + 1 },
    huntDay: day,
    huntCount: n,
  };

  return {
    ok: true,
    state,
    value: { beast: beast.key, tier, materials, insight, coin, haul: h, cost, firstKill },
  };
}
