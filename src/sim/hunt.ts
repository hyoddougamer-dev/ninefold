import type { Beast } from '../data/bestiary.ts';
import { DRIVE_QI, ladderBetween } from './balance.ts';
import { layersOpened } from './time.ts';
import { lootFrom } from './combat.ts';
import { MARKS, marksOf } from './record.ts';
import { lootTaken } from './trials.ts';
import { isOpen } from './unlocks.ts';
import type { State } from './state.ts';
import { rollDrop } from './drops.ts';
import { itemWorth } from './chest.ts';
import type { Item } from '../data/gear.ts';
import type { Fortune } from './drops.ts';

/**
 * 圍 The drive: one tap, many kills, paid for in qi.
 *
 * Bruno: *"os players clicarem 100000 vezes no mesmo mob para combater é
 * contraprodutivo, e o hunting também deve ter gastos para o fluxo de qi ser sempre
 * gasto de alguma forma."* Both halves of that are the same mechanic, and the numbers
 * agreed with him before a line of it was written:
 *
 *   通 Mastered is a hundred kills of one animal, thirty-six animals, **3,600 fights**.
 *   The most played cultivator we model, at three hundred and eighty-five fights a
 *   day, reaches eight of thirty-six. 圖鑑 the bestiary asks four hundred kills of a realm.
 *   The record was not hard. It was arithmetically out of reach, and the only strategy
 *   it ever rewarded was tapping.
 *
 * So a beast you have 熟 Known, at ten kills, which is ten real fights you actually
 * won, can be *driven*: ten, fifty or two hundred at once, resolved in a single screen. The
 * fights are not simulated, because there is nothing left to find out: you have beaten
 * this animal ten times and your power only ever goes up.
 *
 * What it costs is qi, and that is the second half of what Bruno asked for. Until now
 * the two currencies never met: qi came from time and went into the ladder, 材 came
 * from kills and went into 妖丹, and nothing in the first six realms converted one into
 * the other. A drive is that exchange. It is also the only sink that exists for the qi
 * a cultivator banks while sitting at a realm's ceiling waiting for a warden.
 *
 * Three rules keep it honest:
 *
 *   1. **The single fight stays free, always.** Losing costs nothing is the promise the
 *      whole game is built on, and a drive is not a fight. It is fifty fights you have
 *      already proved you win, bought in one go. Nothing here can be lost.
 *   2. **It pays exactly what the taps would have paid.** Same material, same counts,
 *      same drop rolls. The qi buys your time, not an advantage. A player who wants to
 *      tap two hundred times gets the same result and may.
 *   3. **It is pure and seeded**, like everything else in `sim/`, so the drops it rolls
 *      are the drops those fights would have rolled.
 */

/** The sizes offered. One is always free and always there; these are the bought ones. */
export const DRIVE_SIZES = [10, 50, 200] as const;

/**
 * A beast can be driven once you have its 熟 Known mark: ten fights you won.
 *
 * 守 Never a warden. A warden is fought once and opens a realm; there is no second one
 * to drive, and the first is the whole point of the realm. The hunt screen would never
 * offer it either, but a guard that lives only in a screen is a guard that a second
 * screen will one day forget.
 */
export function canDrive(s: State, b: Beast): boolean {
  if (b.warden) return false;
  return isOpen(s.realm, 'hunt') && (s.killed[b.key] ?? 0) >= MARKS[1];
}

/**
 * What a drive costs in qi.
 *
 * Priced off the rung the hunter is standing on rather than the beast, because what is
 * being bought is the cultivator's own time: driving a rat and driving a dragon are the
 * same hour of your life. It is flat per kill, so the arithmetic is one multiplication
 * a player can do in their head.
 *
 * 梯 The rung has to be the *current* one, and the harness proved it. Priced off the
 * first rung of the realm instead, a drive stayed cheap while the rungs around it grew
 * geometrically, so a cultivator sitting at a realm's ceiling could drive essentially
 * for free, and the measuring cultivator who tried it bought a million fights, never
 * climbed past the third realm, and ended weaker than one who never hunted at all.
 * Riding the current rung keeps "a drive of fifty costs about a layer" true everywhere
 * on the mountain, which is the only sentence about the price a player has to hold.
 */
export function driveCost(s: State, n: number): number {
  return Math.ceil(n * DRIVE_QI * ladderBetween(layersOpened(s)));
}

export function canAffordDrive(s: State, b: Beast, n: number): boolean {
  return canDrive(s, b) && s.qi >= driveCost(s, n);
}

export interface Drive {
  readonly state: State;
  /** 材 taken, after the record and the tower seals. */
  readonly material: number;
  readonly qiSpent: number;
  readonly kills: number;
  /** How many drops fell, and the best of them: the rest are not worth a chest slot. */
  readonly dropsRolled: number;
  readonly best: Item | null;
  /** Marks crossed by the drive, by index into MARK_INFO. */
  readonly earned: readonly number[];
}

/**
 * Resolve a drive. Pure: the same state, beast, size and seed always give the same
 * result, and nothing here reads a clock or an unseeded random.
 *
 * The chest is deliberately *not* touched. Two hundred kills can roll forty pieces and
 * pouring forty pieces into a chest that holds a dozen turns a reward into a sorting
 * job. The drive keeps the best one and says how many fell; the caller decides whether
 * it fits. The rest are left on the mountain, which is also what a hunter would do.
 */
export function drive(s: State, b: Beast, n: number, seed: number, fortune: Fortune = {}): Drive {
  const kills = Math.max(1, Math.floor(n));
  const qiSpent = driveCost(s, kills);
  /**
   * 守 A drive is paid for before it happens, and this is where that is enforced rather
   * than only on the button.
   *
   * It used to subtract the price with `Math.max(0, …)` around it, which does not refuse
   * a drive that cannot be paid for: it takes **everything the cultivator has** and runs
   * the drive anyway. The screen gates it, so nobody has met it, and a price that can
   * empty a pocket has no business being one call away from a tap. Found by 氣查 the
   * audit of the qi.
   */
  if (!canAffordDrive(s, b, kills)) {
    return { state: s, material: 0, qiSpent: 0, kills: 0, dropsRolled: 0, best: null, earned: [] };
  }
  const before = s.killed[b.key] ?? 0;

  let material = 0;
  let dropsRolled = 0;
  let best: Item | null = null;
  for (let i = 0; i < kills; i++) {
    material += lootTaken(s, lootFrom(s, b));
    const item = rollDrop(b, s.realm, (seed + i * 2654435761) >>> 0, fortune, s.layer);
    if (!item) continue;
    dropsRolled++;
    if (!best || itemWorth(item) > itemWorth(best)) best = item;
  }

  const after = before + kills;
  const earned: number[] = [];
  for (let m = marksOf(before); m < marksOf(after); m++) earned.push(m);

  return {
    state: {
      ...s,
      qi: s.qi - qiSpent,
      materials: s.materials + material,
      killed: { ...s.killed, [b.key]: after },
    },
    material, qiSpent, kills, dropsRolled, best, earned,
  };
}
