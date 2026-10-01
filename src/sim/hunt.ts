import type { Beast } from '../data/bestiary.ts';
import { DRIVE_MINUTES, DRIVE_OLD, DRIVE_SIZES } from './balance.ts';
import { lootFrom, quarryPaid } from './combat.ts';
import { isQuarry, quarryOwed, weekOf } from './week.ts';
import { MARKS, marksOf } from './record.ts';
import { lootTaken } from './trials.ts';
import { isOpen } from './unlocks.ts';
import { rate, type State } from './state.ts';
import { dropFor, noteFate } from './fate.ts';
import { itemWorth } from './chest.ts';
import type { Item } from '../data/gear.ts';
import type { Fortune } from './drops.ts';
import { classDrive } from './schools.ts';
import { BOON_TOKEN } from './balance.ts';
import { hasBoon } from '../data/meetings.ts';

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
export { DRIVE_SIZES };

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
 * What a drive costs in qi: DRIVE_MINUTES of the hunter's own gathering per kill.
 *
 * Priced in time because what is being bought is the cultivator's own time, and a
 * minute is a minute in every realm. It is flat per kill, so the screen can say "fifty
 * minutes of your qi" and mean it. A beast from an earlier realm costs DRIVE_OLD of
 * that, because it pays the same quarter (see balance.ts).
 *
 * 梯 The rate has to be the cultivator's *own*, now, and not a fixed number. The first
 * price of all was a share of the realm's first rung, which stayed still while the
 * climb around it grew, and the measuring cultivator who found that bought a million
 * fights and never climbed. Gathering grows with the climb, so a minute of it stays a
 * minute of it all the way up.
 *
 * 誤 The price before this one rode the current rung (2% of it a kill), which kept "a
 * drive of fifty costs a layer" true and made a late drive cost a day. See DRIVE_MINUTES.
 */
export function driveCost(s: State, n: number, b?: Beast): number {
  const old = b && b.realm < s.realm ? DRIVE_OLD : 1;
  // 俠客 The Wanderer drives for less.
  // 商印 The merchant's token from the road: a better price, for good.
  return Math.ceil(n * DRIVE_MINUTES * 60 * rate(s) * old * classDrive(s)
    * (hasBoon(s, 'token') ? BOON_TOKEN : 1));
}

/**
 * 守 The least any drive of n kills can honestly cost: every kill an old beast. The
 * server reads this and never driveCost, because it sees how many kills were made and
 * not which beasts they were, and a check that assumed the dearer price would refuse
 * an honest cultivator who drove rats.
 */
export function driveFloor(s: State, n: number): number {
  return Math.ceil(n * DRIVE_MINUTES * 60 * rate(s) * DRIVE_OLD * classDrive(s)
    * (hasBoon(s, 'token') ? BOON_TOKEN : 1));
}

export function canAffordDrive(s: State, b: Beast, n: number): boolean {
  return canDrive(s, b) && s.qi >= driveCost(s, n, b);
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
  const qiSpent = driveCost(s, kills, b);
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
  // 緣 The bar fills kill by kill inside a drive exactly as it would tapped, so a drive
  // of twenty crosses two full bars and both of their certain pieces are rolled.
  let bond: State = s;
  for (let i = 0; i < kills; i++) {
    // 錄 Read at the count this kill is made at, not the count the drive began at. A
    // drive of two hundred that crosses 通 at the hundredth kill pays the mastered rate
    // for the other hundred, because tapping them would have.
    const now = { ...s, killed: { ...s.killed, [b.key]: before + i } };
    material += lootTaken(now, lootFrom(now, b));
    const item = dropFor(bond, b, (seed + i * 2654435761) >>> 0, fortune, s.layer);
    bond = noteFate(bond, b, item);
    if (!item) continue;
    dropsRolled++;
    if (!best || itemWorth(item) > itemWorth(best)) best = item;
  }

  const after = before + kills;
  const earned: number[] = [];
  for (let m = marksOf(before); m < marksOf(after); m++) earned.push(m);
  // 期 And the week's first kill of its quarry pays its qi here too. A drive that was
  // the week's first contact with the quarry used to swallow it: tapped, that first
  // kill pays; driven, it paid nothing and the week still said it was owed.
  const week = isQuarry(s, b) && quarryOwed(s);

  return {
    state: {
      ...s,
      qi: s.qi - qiSpent + (week ? quarryPaid(s, b) : 0),
      materials: s.materials + material,
      killed: { ...s.killed, [b.key]: after },
      fate: bond.fate,
      quarryWeek: week ? weekOf(s.at) : s.quarryWeek,
    },
    material, qiSpent, kills, dropsRolled, best, earned,
  };
}
