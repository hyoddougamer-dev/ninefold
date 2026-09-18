import {
  BASE_RATE, CHANNEL_COUNT, CHANNEL_RATE_BONUS, LAYERS_PER_REALM, LAYER_RATE_BONUS, TIERS,
} from './balance';
import { BEAST_BY_KEY } from '../data/world';
import type { Path, Road, State, Tier } from './types';

/**
 * GDD §11 rule 3: **a save is input.** It is validated like any other input.
 *
 * The earlier build shipped without this and had a hole where a hand-edited heirloom
 * multiplied the qi rate by 196,502x and passed every check. Now that the game has an
 * online layer, that hole stops being a bug and becomes a broken economy, so this
 * module is also what the server runs before it accepts a submitted state — it imports
 * nothing but the balance table and is safe to run anywhere.
 */

const num = (x: unknown, fallback: number): number =>
  typeof x === 'number' && Number.isFinite(x) ? x : fallback;

const clamp = (x: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, x));

const PATHS: readonly Path[] = ['sword', 'blade', 'bow'];
const ROADS: readonly Road[] = ['stillness', 'motion'];

/** The fastest any state could possibly gather: every layer, every channel, no road penalty. */
export const MAX_POSSIBLE_RATE =
  BASE_RATE * LAYER_RATE_BONUS ** (LAYERS_PER_REALM * 9) * CHANNEL_RATE_BONUS ** CHANNEL_COUNT;

export function newState(now: number, path: Path = 'sword'): State {
  return {
    v: 1,
    startedAt: now,
    at: now,
    realm: 1,
    layer: 0,
    qi: 0,
    qiEverGathered: 0,
    path,
    road: 'stillness',
    insight: 0,
    coin: 0,
    channels: 0,
    materials: Object.fromEntries(TIERS.map((t) => [t, 0])) as Record<Tier, number>,
    kills: {},
    huntDay: 0,
    huntCount: 0,
  };
}

/**
 * Coerce anything into a legal State. Never throws, never trusts.
 *
 * The load-bearing check is the last one: qi is capped at what the *fastest conceivable*
 * cultivator could have gathered in the wall-clock time since the run started. A hand-
 * edited bank cannot survive it, and no honest save can ever hit it.
 */
export function validate(raw: unknown, now: number): State {
  const o = (raw ?? {}) as Record<string, unknown>;
  const fresh = newState(now);
  if (o.v !== 1) return fresh;

  const startedAt = clamp(num(o.startedAt, now), 0, now);
  const realm = clamp(Math.floor(num(o.realm, 1)), 1, 9);
  const layer = clamp(Math.floor(num(o.layer, 0)), 0, LAYERS_PER_REALM - 1);
  const channels = clamp(Math.floor(num(o.channels, 0)), 0, CHANNEL_COUNT);

  const rawMaterials = (o.materials ?? {}) as Record<string, unknown>;
  const materials = Object.fromEntries(
    TIERS.map((t) => [t, Math.max(0, Math.floor(num(rawMaterials[t], 0)))]),
  ) as Record<Tier, number>;

  const rawKills = (o.kills ?? {}) as Record<string, unknown>;
  const kills: Record<string, number> = {};
  for (const [k, v] of Object.entries(rawKills)) {
    if (!BEAST_BY_KEY[k]) continue;                  // a beast that does not exist is not a kill
    const n = Math.floor(num(v, 0));
    if (n > 0) kills[k] = n;
  }

  const path = PATHS.includes(o.path as Path) ? (o.path as Path) : 'sword';
  const road = ROADS.includes(o.road as Road) ? (o.road as Road) : 'stillness';

  // A save may claim any `at`, but never one in the future — that would mint qi on the
  // next advance() by making dt negative-then-positive across a clock edit.
  const at = clamp(num(o.at, now), startedAt, now);

  const elapsed = Math.max(0, now - startedAt);
  const qiCeiling = MAX_POSSIBLE_RATE * elapsed + 1;

  return {
    v: 1,
    startedAt,
    at,
    realm,
    layer,
    qi: clamp(num(o.qi, 0), 0, qiCeiling),
    qiEverGathered: clamp(num(o.qiEverGathered, 0), 0, qiCeiling),
    path,
    road,
    insight: Math.max(0, num(o.insight, 0)),
    coin: Math.max(0, num(o.coin, 0)),
    channels,
    materials,
    kills,
    huntDay: Math.max(0, Math.floor(num(o.huntDay, 0))),
    huntCount: Math.max(0, Math.floor(num(o.huntCount, 0))),
  };
}
