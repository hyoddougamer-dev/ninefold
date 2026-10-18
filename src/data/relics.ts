/**
 * 神器 The relics: one for each realm, made from a handful of shards and an enormous heap of
 * 材 material. The table is here; the rules that read it are in sim/relics.ts and every
 * number is in sim/balance.ts (RELIC_*).
 *
 * Bruno, 2026-10-18: *"content and loops so the player always has something to do: crafts
 * almost unreachable that take enormous amounts of materials, or very rare drop items."*
 * A relic is both. Its shards fall from the realm's own 精 elite, one kill in thousands, and
 * from its warden once; its material is thousands of that elite's kills. So the chase for a
 * realm's relic starts the day its warden falls and goes on long after the realm is left,
 * which is what the hunt of an old realm was missing: a reason to go back.
 *
 * 禮 What each gives: power, always, and three kinds of one thing more.
 *   power  nothing more: the largest share of power.
 *   gate   鬥關 every win at a sealed gate counts twice (see GATE_SEAL_MINUTES).
 *   seek   尋 every relic shard is RELIC_SHARD_GIFT likelier, for every relic still to make.
 * Never qi rate.
 */
import { commonsOf, wardenOf, type Beast } from './bestiary.ts';
import { RELIC_POWER, RELIC_SHARDS } from '../sim/balance.ts';

export type RelicGift = 'power' | 'gate' | 'seek';

export interface Relic {
  /** The realm it belongs to, 1 to 9, which is also its key. */
  readonly realm: number;
  readonly han: string;
  readonly name: string;
  readonly icon: string;
  readonly gift: RelicGift;
  /** What the shards are called, one word: "a shard of the Fox-Fire Pearl". */
  readonly shard: { readonly han: string; readonly name: string };
  /** One sentence, for the sheet: where it comes from. */
  readonly lore: string;
}

export const RELICS: readonly Relic[] = [
  { realm: 1, han: '狐火珠', name: 'Fox-Fire Pearl', icon: 'dragon-orb', gift: 'gate',
    shard: { han: '珠片', name: 'Pearl Shard' },
    lore: 'The Spirit Fox kept a light in its mouth. The marsh frogs swallowed what it dropped.' },
  { realm: 2, han: '石猿棍', name: 'Stone Ape Staff', icon: 'bo', gift: 'power',
    shard: { han: '棍節', name: 'Staff Segment' },
    lore: 'Broken across a mountain long ago. The blood bats nest in its pieces.' },
  { realm: 3, han: '鶴羽扇', name: 'Crane-Feather Fan', icon: 'handheld-fan', gift: 'seek',
    shard: { han: '扇骨', name: 'Fan Rib' },
    lore: 'One sweep of it shows where anything lost has gone. The ravens took the ribs.' },
  { realm: 4, han: '雷虎符', name: 'Thunder Tiger Tally', icon: 'wax-seal', gift: 'power',
    shard: { han: '符角', name: 'Tally Corner' },
    lore: 'Half of an old general’s tally. The vultures pick its bronze from the ridges.' },
  { realm: 5, han: '玄武盾', name: 'Black Tortoise Shield', icon: 'cracked-shield', gift: 'gate',
    shard: { han: '甲片', name: 'Shell Plate' },
    lore: 'No gate it is set against stays shut for long. The lizards wear its plates.' },
  { realm: 6, han: '傀王心', name: 'Puppet King’s Heart', icon: 'heart-armor', gift: 'power',
    shard: { han: '心紋', name: 'Heart Seam' },
    lore: 'The core every stone puppet was copied from. The corpse worms carry its seams.' },
  { realm: 7, han: '天狼弓', name: 'Heavenwolf Bow', icon: 'crescent-blade', gift: 'seek',
    shard: { han: '弓弦', name: 'Bowstring Thread' },
    lore: 'It never misses what it is looking for. The yin wraiths are woven from its string.' },
  { realm: 8, han: '蛟龍鞭', name: 'Jiao Dragon Whip', icon: 'sea-serpent', gift: 'power',
    shard: { han: '鞭鱗', name: 'Whip Scale' },
    lore: 'It drove the rivers once. The bull demons grind its scales into their horns.' },
  { realm: 9, han: '渡劫鐘', name: 'Tribulation Bell', icon: 'pagoda', gift: 'power',
    shard: { han: '鐘銘', name: 'Bell Inscription' },
    lore: 'Rung once at every crossing since the first. The squid hold its words in their ink.' },
];

export function relicOf(realm: number): Relic {
  return RELICS[Math.max(1, Math.min(9, realm)) - 1];
}

/**
 * 精 The beast whose kills leave a realm's shards: its elite, the last common, which is the
 * hardest thing in the realm short of the gate. The first realm has no elite and reads its
 * last common all the same (the Marsh Frog).
 */
export function shardBeast(realm: number): Beast {
  const c = commonsOf(Math.max(1, Math.min(9, realm)));
  return c[c.length - 1];
}

/** 守 The warden whose fall leaves the first shard. */
export function shardWarden(realm: number): Beast {
  return wardenOf(realm);
}

/** How many shards the relic of this realm asks for. */
export function shardsFor(realm: number): number {
  return RELIC_SHARDS[Math.max(1, Math.min(9, realm)) - 1];
}

/** What the relic of this realm adds to power, as a share. */
export function relicPowerOf(realm: number): number {
  return RELIC_POWER[Math.max(1, Math.min(9, realm)) - 1];
}
