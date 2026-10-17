import { canUnlock, capstonesOpen, daoEarned, daoFree } from './dao.ts';
import { ALL_NODES } from '../data/techniques.ts';
import { isOpen } from './unlocks.ts';
import { daoPoints } from './awaken.ts';
import { layersOpened } from './time.ts';
import { filledRealms, type State } from './state.ts';
import { WARDENS } from '../data/bestiary.ts';
import { DEMON_DAO } from './balance.ts';

/**
 * 點 The 道 points a cultivator has earned and not yet spent.
 *
 * It lives here because two things have to agree about it and one of them was silent.
 * 道 the tab bar has worn the count for a while, and 示 the line of advice never
 * mentioned it: measured, on **100% of visits where a cultivator held unspent points**,
 * the advice pointed somewhere else, every time at 狩 the hunt, while the player carried
 * up to twelve points. Bruno was carrying eleven and being told to go and tap a bat.
 *
 * `daoFree` takes the four numbers rather than the State, on purpose, so that state.ts
 * can read dao.ts without the two importing each other. That is the right shape for
 * dao.ts and the wrong shape for a caller, so the assembly happens once, here.
 */
function wardensDown(s: State): number {
  return Object.entries(s.killed)
    .filter(([k, n]) => n > 0 && WARDENS.some((w) => w.key === k)).length;
}

/** 心魔 What the heart demons put down have handed over. See sim/seclusion.ts. */
function demonPoints(s: State): number {
  return Math.max(0, s.demons) * DEMON_DAO;
}

/** Every point this cultivator has ever earned, cards included. */
export function earnedPoints(s: State): number {
  // 緣 A point given by somebody on the road is earned exactly like any other, so it is
  // added here and nowhere else. See sim/meet.ts.
  return daoEarned(layersOpened(s), wardensDown(s), filledRealms(s),
    daoPoints(s.awakened) + Math.max(0, s.metPoints) + demonPoints(s));
}

/** What is earned and not spent: on nodes, and 改 on card trades (daoPaid). */
export function freePoints(s: State): number {
  return daoFree(layersOpened(s), wardensDown(s), s.unlocked, filledRealms(s),
    daoPoints(s.awakened) + Math.max(0, s.metPoints) + demonPoints(s)) - Math.max(0, s.daoPaid ?? 0);
}

/**
 * 道 Points earned, not spent, and a node actually within reach to spend them on.
 *
 * Both halves matter. Points with nothing reachable to buy is not a thing to do, and
 * telling a player to go and spend what they cannot spend is worse than silence. 示 the
 * advice line has read this for a long time; 點 the badge on the 道 tab read the bare
 * count instead, and a cultivator with the whole open tree bought wore 32 on it at the
 * eighth realm and 53 at the top, every visit, for points nothing would take. It lives
 * here so the two of them, and 待 the list of what is waiting, read one number.
 */
export function spendablePoints(s: State): number {
  if (!isOpen(s.realm, 'tree')) return 0;
  const free = freePoints(s);
  if (free <= 0) return 0;
  const keystones = isOpen(s.realm, 'keystones');
  const capstones = capstonesOpen(s.realm);
  return ALL_NODES.some((n) => canUnlock(n.key, s.unlocked, free, keystones, capstones)) ? free : 0;
}

/**
 * 蓄 The nodes still within reach at any price, under this realm's gates or with every
 * gate open (`gated = false`, what is left of the tree for good).
 */
function reachable(s: State, gated: boolean) {
  const keystones = !gated || isOpen(s.realm, 'keystones');
  const capstones = !gated || capstonesOpen(s.realm);
  return ALL_NODES.filter((n) => canUnlock(n.key, s.unlocked, Infinity, keystones, capstones));
}

/**
 * 滿 Nothing left in the tree to buy, at any price.
 *
 * The other half of `spendablePoints` being zero. A cultivator who buys every node they
 * can fills the tree around the sixth realm, and from there every point the road pays
 * (a 悟道 card, a finished realm of the Bestiary, a heart demon) only adds to a pile
 * nothing will take. Saying so where the point is offered is the honest thing: measured
 * at the eighth realm, the 道 half of the screen wore a gold 28 that only ever climbed.
 *
 * `gated` (the default) reads the tree as this realm lets it be bought: full means every
 * node open to you is yours, while a keystone or a capstone may still be on its way.
 * Ungated, it means the tree is finished for good, which is what a card has to say.
 */
export function treeFull(s: State, gated = true): boolean {
  return isOpen(s.realm, 'tree') && reachable(s, gated).length === 0;
}

/**
 * 蓄 What the next node costs, when the points held fall short of every node in reach:
 * the cultivator is saving, not sitting on points with nothing to do. Null when a node is
 * affordable now, when the tree is full, or when nothing is held to save.
 */
export function savingFor(s: State): number | null {
  if (!isOpen(s.realm, 'tree')) return null;
  const free = freePoints(s);
  if (free <= 0) return null;
  const costs = reachable(s, true).map((n) => n.cost);
  if (costs.length === 0) return null;
  const next = Math.min(...costs);
  return free < next ? next : null;
}
