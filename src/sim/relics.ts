/**
 * 神器 The relics, and 鬥關 the gates as effort. The table is data/relics.ts; every number is
 * in balance.ts (RELIC_*, GATE_*).
 *
 * Pure like the rest of sim/. A shard is rolled on a kill from the save's own facts (the
 * instant it was begun, the beast, and which kill of it this is), so the same kill always
 * leaves the same shard, a reload cannot re-roll it, and the app, the drive and every
 * harness see exactly the same shards because all three take a kill through takeKill or
 * drive, which call shardOn below.
 */
import { GATE_ELITE_WEIGHT, GATE_SEAL_MINUTES, GATE_WALL_MINUTES, RELIC_BOND_TILT, RELIC_DEEP_TILT, RELIC_MATERIAL_KILLS,
  RELIC_SHARD_GIFT, RELIC_SHARD_ODDS, LAYERS_PER_REALM } from './balance.ts';
import { RELICS, relicOf, relicPowerOf, shardBeast, shardWarden, shardsFor, type RelicGift } from '../data/relics.ts';
import { isElite, type Beast } from '../data/bestiary.ts';
import { deepOf } from './record.ts';
import { loot } from './combat.ts';
import { fateDue } from './fate.ts';
import type { State } from './state.ts';

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

/**
 * 神器 Whether the chase for a realm's relic has begun: its warden has fallen. Until then no
 * shard falls and the screen does not name it, so nothing is promised before it is seen.
 */
export function relicSeen(s: State, realm: number): boolean {
  return (s.killed[shardWarden(realm).key] ?? 0) >= 1;
}

/** 神器 Whether anything about the relics is worth a screen yet: the first warden has fallen. */
export function relicsOpen(s: State): boolean {
  return relicSeen(s, 1);
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

/**
 * 片 The chance this kill of this beast leaves a shard, read before the kill is counted:
 * RELIC_SHARD_ODDS, times RELIC_BOND_TILT on the win that fills the bond bar, more for each
 * of the beast's deep marks and for every seeking relic. 0 for any beast that is not its
 * realm's shard beast, before the realm's warden has fallen, once the relic is made, and
 * once the shards it asks for are all held.
 */
export function shardChance(s: State, b: Beast): number {
  const r = b.realm;
  if (b.warden || shardBeast(r).key !== b.key) return 0;
  if (!relicSeen(s, r) || made(s, r) || shardsHeld(s, r) >= shardsFor(r)) return 0;
  const kills = s.killed[b.key] ?? 0;
  return RELIC_SHARD_ODDS * (1 + RELIC_DEEP_TILT * deepOf(kills)) * (fateDue(s, b) ? RELIC_BOND_TILT : 1)
    * (1 + seekBonus(s));
}

/** The dice for kill number `n` of a beast in this save: the same kill, the same number. */
export function shardDice(startedAt: number, key: string, n: number): number {
  let h = (Math.floor(startedAt) ^ 0x9e3779b9) >>> 0;
  for (let i = 0; i < key.length; i++) h = Math.imul(h ^ key.charCodeAt(i), 2654435761) >>> 0;
  h = (h ^ Math.imul(n + 1, 0x85ebca6b)) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x85ebca6b) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35) >>> 0;
  h = (h ^ (h >>> 16)) >>> 0;
  return h / 4294967296;
}

/** 片 Whether this kill (read before it is counted) leaves a shard. */
export function shardFalls(s: State, b: Beast): boolean {
  const c = shardChance(s, b);
  return c > 0 && shardDice(s.startedAt, b.key, s.killed[b.key] ?? 0) < c;
}

function withShard(s: State, realm: number): State {
  const r = relicsOf(s);
  const shards = r.shards.slice();
  shards[realm - 1] = Math.min(shardsFor(realm), (shards[realm - 1] ?? 0) + 1);
  return { ...s, relics: { ...r, shards } };
}

/**
 * 片 The shards a kill leaves, read on the state before the kill is counted (`before`) and
 * written onto the state after it (`after`): a warden's first fall leaves the first shard of
 * its realm's relic, and a kill of the shard beast may leave one more.
 */
export function shardOn(before: State, after: State, b: Beast): State {
  if (b.warden && b.realm < 10 && (before.killed[b.key] ?? 0) === 0 && b.key === shardWarden(b.realm).key) {
    return made(after, b.realm) ? after : withShard(after, b.realm);
  }
  return shardFalls(before, b) ? withShard(after, b.realm) : after;
}

/** 材 The material a relic asks for: RELIC_MATERIAL_KILLS kills of its elite, at the elite's plain material. */
export function relicMaterial(realm: number): number {
  return RELIC_MATERIAL_KILLS * loot(shardBeast(realm));
}

export function canMakeRelic(s: State, realm: number): boolean {
  return relicSeen(s, realm) && !made(s, realm) && shardsHeld(s, realm) >= shardsFor(realm)
    && s.materials >= relicMaterial(realm);
}

/** 神器 Make a relic: the shards and the material are spent, and it is the cultivator's for good. */
export function makeRelic(s: State, realm: number): State {
  if (!canMakeRelic(s, realm)) return s;
  const r = relicsOf(s);
  const shards = r.shards.slice();
  shards[realm - 1] = 0;
  return {
    ...s,
    materials: s.materials - relicMaterial(realm),
    relics: { shards, made: [...r.made, realm].sort((a, c) => a - c) },
  };
}

/**
 * 鬥關 Whether a win over this beast is a blow against the gate: the warden of the realm
 * stands, has not fallen, and the beast is one of the realm's own commons. The ninth realm
 * has neither a seal nor a wall.
 */
export function atGateFor(s: State, b: Beast): boolean {
  return !b.warden && b.realm === s.realm && s.realm < 9 && !s.wardenFell
    && s.layer >= LAYERS_PER_REALM - 1 && s.gateAt > 0;
}

/** 鬥關 What one win over this beast counts at its gate: GATE_ELITE_WEIGHT for the elite, times the gate relics. */
export function gateWinWorth(s: State, b: Beast): number {
  return (isElite(b) ? GATE_ELITE_WEIGHT : 1) * gateWeight(s);
}

/** 鬥關 Note `n` wins over this beast at the gate, if they are at it. */
export function gateOn(s: State, b: Beast, n = 1): State {
  if (!atGateFor(s, b) || n <= 0) return s;
  return { ...s, gateWins: Math.max(0, s.gateWins ?? 0) + n * gateWinWorth(s, b) };
}

/** 鬥關 The days of the seal's bar the wins at this gate have filled. */
export function sealFought(s: State): number {
  return (Math.max(0, s.gateWins ?? 0) * GATE_SEAL_MINUTES) / 1440;
}

/** 鬥關 The days of the bottleneck's loosening the wins at this gate count for. */
export function wallFought(s: State): number {
  return (Math.max(0, s.gateWins ?? 0) * GATE_WALL_MINUTES) / 1440;
}
