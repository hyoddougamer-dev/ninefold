import { FORK_SWAP_GAP } from './balance.ts';
import { NODE_BY_KEY } from './dao.ts';
import { capRefuses } from './stash.ts';
import type { Node } from '../data/techniques.ts';
import type { State } from './state.ts';

/**
 * 岔 Swapping a fork of the 道 Path for its twin (speculaether, Discord, 2026-10-05).
 *
 * Each branch forks once, at its fifth step, into a node and a keystone that excludes it.
 * A cultivator holding one side may trade it for the other once every FORK_SWAP_GAP. The
 * points stay spent, because the two cost the same, and the rest of the tree is untouched,
 * because the two sit on the same step with the same links.
 */

/** The other side of a fork, or null for a node that is not one. */
export function forkTwin(key: string): Node | null {
  const node = NODE_BY_KEY[key];
  return node?.excludes ? NODE_BY_KEY[node.excludes] ?? null : null;
}

/** Seconds before the next swap is allowed: 0 when it is. */
export function forkWait(s: Pick<State, 'forkAt'>, now: number): number {
  if (!s.forkAt) return 0;
  return Math.max(0, s.forkAt + FORK_SWAP_GAP - now);
}

/**
 * Whether this held node can be swapped for its twin now, and if not, why: `wait` for the
 * day, `shut` while the keystones are not open yet, `full` while the chest holds more than
 * 空囊 Empty Pouch would let it, `no` for a node that is not a held fork.
 */
export function swapStatus(s: State, key: string, now: number, keystones: boolean): 'ok' | 'wait' | 'shut' | 'full' | 'no' {
  const twin = forkTwin(key);
  if (!twin || !s.unlocked.includes(key) || s.unlocked.includes(twin.key)) return 'no';
  if (twin.keystone && !keystones) return 'shut';
  if (forkWait(s, now) > 0) return 'wait';
  if (capRefuses({ ...s, unlocked: s.unlocked.filter((k) => k !== key) }, twin.key) !== null) return 'full';
  return 'ok';
}

/** The swap itself: the twin takes the node's place, and the day starts. */
export function swapFork(s: State, key: string, now: number, keystones: boolean): State {
  if (swapStatus(s, key, now, keystones) !== 'ok') return s;
  const twin = forkTwin(key)!;
  return { ...s, unlocked: s.unlocked.map((k) => (k === key ? twin.key : k)), forkAt: now };
}

/**
 * Every tree a save could have stood on between two syncs: its own, and its own with any
 * fork it holds swapped for the twin. The server reads the kindest of them, because a
 * swap made and undone inside one window leaves no trace in either save.
 */
export function forkTrees(unlocked: readonly string[]): readonly (readonly string[])[] {
  const out: (readonly string[])[] = [unlocked];
  for (const key of unlocked) {
    const twin = forkTwin(key);
    if (twin && !unlocked.includes(twin.key)) out.push(unlocked.map((k) => (k === key ? twin.key : k)));
  }
  return out;
}
