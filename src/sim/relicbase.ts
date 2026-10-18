/**
 * 神器 The part of the relics that state.ts reads (power, the seal's bar), kept apart from
 * sim/relics.ts so that it imports nothing but tables and numbers: state.ts sits under
 * combat.ts, which relics.ts reads, and a cycle there leaves a table half built.
 */
import { GATE_SEAL_MINUTES, GATE_WALL_MINUTES, RELIC_SHARD_GIFT } from './balance.ts';
import { RELICS, relicOf, relicPowerOf, type RelicGift } from '../data/relics.ts';

/** 神器 What a save holds of the relics: shards by realm (index 0 is the first), and the realms whose relic is made. */
export interface Relics {
  readonly shards: readonly number[];
  readonly made: readonly number[];
}

export const NO_RELICS: Relics = { shards: [0, 0, 0, 0, 0, 0, 0, 0, 0], made: [] };

export function relicsOf(s: { relics?: Relics }): Relics {
  return s.relics ?? NO_RELICS;
}

export function made(s: { relics?: Relics }, realm: number): boolean {
  return relicsOf(s).made.includes(realm);
}

export function shardsHeld(s: { relics?: Relics }, realm: number): number {
  return relicsOf(s).shards[realm - 1] ?? 0;
}

/** How many relics of a kind are made. */
function giftCount(s: { relics?: Relics }, gift: RelicGift): number {
  return relicsOf(s).made.filter((r) => relicOf(r).gift === gift).length;
}

/** What all the made relics add to power, multiplied. 1 with none. */
export function relicPower(s: { relics?: Relics }): number {
  let p = 1;
  for (const r of relicsOf(s).made) p *= 1 + relicPowerOf(r);
  return p;
}

/** 尋 What the seeking relics add to every shard chance, as a share. */
export function seekBonus(s: { relics?: Relics }): number {
  return RELIC_SHARD_GIFT * giftCount(s, 'seek');
}

/** 鬥關 What one win at a gate counts for, with the gate relics made: 1, 2 or 3. */
export function gateWeight(s: { relics?: Relics }): number {
  return 1 + giftCount(s, 'gate');
}

/** The most gateWeight can ever be: every gate relic made. 驗 the server reads it. */
export const GATE_WEIGHT_MOST = 1 + RELICS.filter((r) => r.gift === 'gate').length;

/** 鬥關 The days of the seal's bar the wins at this gate have filled. */
export function sealFought(s: { gateWins?: number }): number {
  return (Math.max(0, s.gateWins ?? 0) * GATE_SEAL_MINUTES) / 1440;
}

/** 鬥關 The days of the bottleneck's loosening the wins at this gate count for. */
export function wallFought(s: { gateWins?: number }): number {
  return (Math.max(0, s.gateWins ?? 0) * GATE_WALL_MINUTES) / 1440;
}
