import { NODES, NODE_BY_KEY, nodesOf, type Effect, type Node, type Path } from '../data/techniques.ts';
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

export function daoEarned(layersOpened: number, wardensKilled: number): number {
  return Math.floor(layersOpened / LAYERS_PER_POINT) + POINTS_PER_WARDEN * wardensKilled;
}

export function daoSpent(unlocked: readonly string[]): number {
  return unlocked.reduce((sum, key) => sum + (NODE_BY_KEY[key]?.cost ?? 0), 0);
}

export function daoFree(layersOpened: number, wardensKilled: number, unlocked: readonly string[]): number {
  return daoEarned(layersOpened, wardensKilled) - daoSpent(unlocked);
}

/** A node needs the one above it in its own branch. The first of a branch needs nothing. */
export function requirement(node: Node): Node | null {
  if (node.tier === 0) return null;
  return nodesOf(node.path).find((x) => x.tier === node.tier - 1) ?? null;
}

export function canUnlock(
  key: string, unlocked: readonly string[], free: number,
): boolean {
  const node = NODE_BY_KEY[key];
  if (!node || unlocked.includes(key)) return false;
  const needs = requirement(node);
  if (needs && !unlocked.includes(needs.key)) return false;
  return free >= node.cost;
}

/** The next node available on a branch, or null when the branch is finished. */
export function nextOn(path: Path, unlocked: readonly string[]): Node | null {
  return nodesOf(path).find((x) => !unlocked.includes(x.key)) ?? null;
}

// ── what a bought tree does ──────────────────────────────────────────────────

function effects(unlocked: readonly string[]): readonly Effect[] {
  return unlocked.map((k) => NODE_BY_KEY[k]).filter(Boolean).map((x) => x.effect);
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

/** Multiplier on combat power from 劍 nodes. */
export function powerMultiplier(unlocked: readonly string[]): number {
  return 1 + sum(unlocked, 'power', 'percent') / 100;
}

/** Multiplier on the qi rate from 神 nodes. */
export function rateMultiplier(unlocked: readonly string[]): number {
  return 1 + sum(unlocked, 'rate', 'percent') / 100;
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
  // Walk each branch in order and stop at the first gap, so an edited save cannot hold
  // 萬劍 without everything above it.
  const kept: string[] = [];
  for (const path of ['sword', 'spirit', 'fortune'] as const) {
    for (const node of nodesOf(path)) {
      if (!seen.has(node.key)) break;
      kept.push(node.key);
    }
  }
  return kept;
}

export { NODES, NODE_BY_KEY, nodesOf };
