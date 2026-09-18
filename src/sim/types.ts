import type { TIERS } from './balance';

export type Path = 'sword' | 'blade' | 'bow';
export type Road = 'stillness' | 'motion';
export type Tier = (typeof TIERS)[number];

/** Everything the game is. Plain data, JSON-safe, no nodes and no functions. */
export interface State {
  readonly v: 1;
  /** Epoch seconds the run began. */
  startedAt: number;
  /** Epoch seconds this state is correct as of. Time only moves through advance(). */
  at: number;

  realm: number;        // 1..9
  layer: number;        // 0..8, layers opened inside the current realm
  qi: number;           // banked toward the next layer
  qiEverGathered: number;

  path: Path;
  road: Road;

  insight: number;
  coin: number;
  channels: number;                        // 0..CHANNEL_COUNT
  materials: Record<Tier, number>;
  kills: Record<string, number>;           // beast key -> count, the bestiary

  /** UTC day index the hunt counter belongs to, and how many hunts it has seen. */
  huntDay: number;
  huntCount: number;
}

/** What a hunt produced. Returned alongside the new state so the UI can show it. */
export interface HuntResult {
  readonly beast: string;
  readonly tier: Tier;
  readonly materials: number;
  readonly insight: number;
  readonly coin: number;
  /** The haul multiplier this hunt landed on — what the player is trading away. */
  readonly haul: number;
  readonly cost: number;
  readonly firstKill: boolean;
}

export type Failure =
  | { ok: false; reason: 'not-on-motion' }
  | { ok: false; reason: 'ground-locked' }
  | { ok: false; reason: 'insufficient-qi'; need: number; have: number }
  | { ok: false; reason: 'no-such-ground' };

export type Outcome<T> = { ok: true; state: State; value: T } | Failure;
