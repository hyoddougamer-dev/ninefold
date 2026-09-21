import {
  ALL_NODES, NODES, NODE_BY_KEY, ROOT, linksOf, nodesOf,
  type Effect, type Node,
} from '../data/techniques.ts';
import type { Slot } from '../data/gear.ts';

/**
 * 道 The points the tree is bought with, and what a bought tree does.
 *
 * Points come from the climb itself — one for every three layers opened, two for every
 * warden that falls. A whole run earns about forty-two against the sixty the tree
 * costs, so nobody finishes it. That gap is the feature: a tree you can complete is a
 * checklist, and a checklist is not a build.
 *
 * Every accessor here takes the unlocked list rather than the State, so this module can
 * be read by state.ts without the two importing each other.
 */

export const LAYERS_PER_POINT = 3;
export const POINTS_PER_WARDEN = 2;
/**
 * 圖鑑 And what a realm's whole bestiary is worth, from the sixth realm.
 *
 * Four hundred fights for one point. It is deliberately the slowest 道 in the game and
 * the only one that cannot be climbed toward — the ladder pays the other two just for
 * going up, and this one is paid only for going back.
 */
export const POINTS_PER_BESTIARY = 1;

export function daoEarned(
  layersOpened: number, wardensKilled: number, realmsKnown = 0,
): number {
  return Math.floor(layersOpened / LAYERS_PER_POINT)
    + POINTS_PER_WARDEN * wardensKilled
    + POINTS_PER_BESTIARY * realmsKnown;
}

export function daoSpent(unlocked: readonly string[]): number {
  return unlocked.reduce((sum, key) => sum + (NODE_BY_KEY[key]?.cost ?? 0), 0);
}

export function daoFree(
  layersOpened: number, wardensKilled: number, unlocked: readonly string[],
  realmsKnown = 0,
): number {
  return daoEarned(layersOpened, wardensKilled, realmsKnown) - daoSpent(unlocked);
}

/**
 * A node is reachable from anything it is linked to. The tree is a graph, not three
 * queues: that is what lets a cultivator climb 劍, cross a bridge into 神 and come back
 * down 運 — and it is why mixing costs nothing but the points to walk there.
 */
export function requirements(node: Node): readonly Node[] {
  if (node.key === ROOT.key) return [];
  return linksOf(node.key).map((k) => NODE_BY_KEY[k]).filter(Boolean);
}

/** The node this one would put out of reach, if it has a twin. */
export function excludedBy(node: Node): Node | null {
  return node.excludes ? NODE_BY_KEY[node.excludes] ?? null : null;
}

export function canUnlock(
  key: string, unlocked: readonly string[], free: number, keystones = true,
): boolean {
  const node = NODE_BY_KEY[key];
  if (!node || unlocked.includes(key)) return false;
  // 樞 The three that take something away arrive at their own realm. See unlocks.ts —
  // the tree is the second realm's gift and the decisions are the fourth's.
  if (node.keystone && !keystones) return false;
  const twin = excludedBy(node);
  if (twin && unlocked.includes(twin.key)) return false;      // the fork was already taken
  const needs = requirements(node);
  if (needs.length > 0 && !needs.some((x) => unlocked.includes(x.key))) return false;
  return free >= node.cost;
}

// ── what a bought tree does ──────────────────────────────────────────────────

function effects(unlocked: readonly string[]): readonly Effect[] {
  return unlocked.flatMap((k) => NODE_BY_KEY[k]?.effects ?? []);
}

function sum(unlocked: readonly string[], kind: Effect['kind'], field: 'percent' | 'slots'): number {
  let total = 0;
  for (const e of effects(unlocked)) {
    if (e.kind !== kind) continue;
    const value = (e as Partial<Record<typeof field, number>>)[field];
    if (typeof value === 'number') total += value;
  }
  return total;
}

/** Multiplier on combat power from 劍 nodes, after any keystone's price. */
export function powerMultiplier(unlocked: readonly string[]): number {
  const gain = 1 + sum(unlocked, 'power', 'percent') / 100;
  return gain * (1 - sum(unlocked, 'powerCut', 'percent') / 100);
}

/** Multiplier on the qi rate from 神 nodes, after any keystone's price. */
export function rateMultiplier(unlocked: readonly string[]): number {
  const gain = 1 + sum(unlocked, 'rate', 'percent') / 100;
  return gain * (1 - sum(unlocked, 'rateCut', 'percent') / 100);
}

/**
 * 入定 How much deeper 神 the Spirit branch sits you, on top of FOCUS_MAX.
 *
 * It is the branch's weight, and the reason it no longer sells the qi rate: this pays
 * only while the phone is open, so it can never divide the length of a run the way a
 * rate multiplier does. See balance.ts for the thirty-day game that taught us the
 * difference.
 */
export function focusBonus(unlocked: readonly string[]): number {
  return effects(unlocked).reduce((sum, e) => (e.kind === 'focus' ? sum + e.depth : sum), 0);
}

/**
 * 親 Affinity: how much more a slot's gear counts.
 *
 * This is what a path does *instead of* locking gear away. Nothing becomes unwearable;
 * some things simply become better in your hands.
 */
export function affinity(unlocked: readonly string[], slot: Slot): number {
  let bonus = 0;
  for (const e of effects(unlocked)) {
    // 捨甲 Forsake Armour silences a slot outright — its price, and the reason it pays.
    if (e.kind === 'affinityOff' && e.slots.includes(slot)) return 0;
    if (e.kind === 'affinity' && e.slots.includes(slot)) bonus += e.percent;
  }
  return 1 + bonus / 100;
}

/** How much weaker beasts read, from 破甲 Sunder. */
export function beastWeakness(unlocked: readonly string[]): number {
  return 1 - sum(unlocked, 'beastWeakness', 'percent') / 100;
}

/** How much less a layer costs, from 神遊 Spirit Travel. */
export function layerCostFactor(unlocked: readonly string[]): number {
  return 1 - sum(unlocked, 'layerCost', 'percent') / 100;
}

/** Percentage points added to a beast's drop chance, from 運 nodes. */
export function dropChanceBonus(unlocked: readonly string[]): number {
  return sum(unlocked, 'dropChance', 'percent') / 100;
}

/** How much the rare end of the table is weighted up. */
export function rarityLuck(unlocked: readonly string[]): number {
  return 1 + sum(unlocked, 'rarityLuck', 'percent') / 100;
}

export function extraChestSlots(unlocked: readonly string[]): number {
  return sum(unlocked, 'chestSlots', 'slots');
}

/** 空囊 Empty Pouch caps the chest outright, whatever else has been bought. */
export function chestCap(unlocked: readonly string[]): number | null {
  const caps = effects(unlocked).filter((e) => e.kind === 'chestCap');
  return caps.length ? Math.min(...caps.map((e) => (e as { slots: number }).slots)) : null;
}

/** 空囊 also lifts every drop a rank. */
export function dropsRankUp(unlocked: readonly string[]): boolean {
  return effects(unlocked).some((e) => e.kind === 'rankUp');
}

export function fuseQuality(unlocked: readonly string[]): number {
  return 1 + sum(unlocked, 'fuseQuality', 'percent') / 100;
}

export function alwaysDrops(unlocked: readonly string[]): boolean {
  return effects(unlocked).some((e) => e.kind === 'alwaysDrop');
}

/** Only keys that exist, no duplicates, and no node whose requirement is missing. */
export function validateUnlocked(raw: unknown): string[] {
  const list = Array.isArray(raw) ? raw : [];
  const seen = new Set<string>();
  for (const key of list) {
    if (typeof key !== 'string' || !NODE_BY_KEY[key] || seen.has(key)) continue;
    seen.add(key);
  }
  // Grow outward from the root and keep only what is actually connected, so an edited
  // save cannot hold 萬劍 with nothing leading to it, and cannot hold both sides of a
  // fork — the twin is dropped the moment one side is kept.
  const kept: string[] = [];
  const held = new Set<string>();
  const shut = new Set<string>();
  if (!seen.has(ROOT.key)) return kept;
  kept.push(ROOT.key);
  held.add(ROOT.key);

  for (let grew = true; grew;) {
    grew = false;
    for (const node of ALL_NODES) {
      if (held.has(node.key) || shut.has(node.key) || !seen.has(node.key)) continue;
      if (!linksOf(node.key).some((k) => held.has(k))) continue;
      kept.push(node.key);
      held.add(node.key);
      if (node.excludes) shut.add(node.excludes);
      grew = true;
    }
  }
  return kept;
}

export { NODES, NODE_BY_KEY, nodesOf };
