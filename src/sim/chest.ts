import {
  RARITIES, RARITY_INFO, TEMPLATE_BY_KEY, baseValue, refinedBy, roundValue, templateOf,
  type Affix, type Item, type Rarity, type Roll, type Slot, type Worn,
} from '../data/gear.ts';
import { SECONDARIES } from '../data/gear.ts';
import { chestCap, extraChestSlots } from './dao.ts';

/**
 * 藏 The chest, and 煉 the fusion.
 *
 * The chest is deliberately finite. Without a limit there is no decision in a drop:
 * everything is kept, nothing is ever weighed. With one, every 凡 Common that falls is
 * a small question: melt it, or make room for it?
 *
 * Fusion is the answer to that question, and it is why the limit is not just an
 * annoyance: three of the same piece at the same rank become one of the rank above.
 */

export const CHEST_LIMIT = 40;
export const FUSE_COUNT = 3;

export function chestFull(chest: readonly Item[], limit = CHEST_LIMIT): boolean {
  return chest.length >= limit;
}

/**
 * 值 How good a piece is, roughly, for deciding which of two to keep.
 *
 * Rank, realm and refining, not the roll values, because seven axes on different scales
 * cannot be added together into a number that means anything. This is only ever used to
 * answer "is the thing that just dropped better than the worst thing in the chest", and
 * for that it is right far more often than it is wrong.
 */
export function itemWorth(item: Item): number {
  return RARITY_INFO[item.rarity].mult * templateOf(item).realm * refinedBy(item);
}

export interface Kept {
  readonly chest: readonly Item[];
  /** What fell on the floor: the worst piece, the new one, or nothing. */
  readonly dropped: Item | null;
}

/**
 * Puts a piece in the chest, and when there is no room keeps the better of the two.
 *
 * It used to refuse, which meant a full chest silently ate every drop after the fortieth
 *, and a cultivator hunting properly fills forty slots in one visit. Losing the 天 that
 * just fell because forty 凡 got there first is the game wasting the player's time, and
 * the player cannot even see it happen. Now the worst piece goes instead, and the arena
 * says which.
 */
export function addToChest(
  chest: readonly Item[], item: Item, limit = CHEST_LIMIT,
): Kept {
  if (!chestFull(chest, limit)) return { chest: [...chest, item], dropped: null };

  let worstAt = 0;
  for (let i = 1; i < chest.length; i++) {
    if (itemWorth(chest[i]) < itemWorth(chest[worstAt])) worstAt = i;
  }
  const worst = chest[worstAt];
  if (!worst || itemWorth(item) <= itemWorth(worst)) return { chest, dropped: item };

  const next = chest.slice();
  next[worstAt] = item;
  return { chest: next, dropped: worst };
}

export function removeFromChest(chest: readonly Item[], id: string): readonly Item[] {
  return chest.filter((x) => x.id !== id);
}

/**
 * Equipping swaps: whatever was in the slot goes back to the chest, and since the new
 * item just left it, the count never rises, so equipping can never overflow.
 */
export function equip(worn: Worn, chest: readonly Item[], item: Item, slot: Slot): {
  worn: Worn; chest: readonly Item[];
} {
  const previous = worn[slot];
  const without = removeFromChest(chest, item.id);
  return {
    worn: { ...worn, [slot]: item },
    chest: previous ? [...without, previous] : without,
  };
}

export function unequip(worn: Worn, chest: readonly Item[], slot: Slot, limit = CHEST_LIMIT): {
  worn: Worn; chest: readonly Item[]; refused: boolean;
} {
  const item = worn[slot];
  if (!item) return { worn, chest, refused: false };
  if (chestFull(chest, limit)) return { worn, chest, refused: true };
  const next = { ...worn };
  delete next[slot];
  return { worn: next, chest: [...chest, item], refused: false };
}

export function nextRarity(rarity: Rarity): Rarity | null {
  const i = RARITIES.indexOf(rarity);
  return i >= 0 && i < RARITIES.length - 1 ? RARITIES[i + 1] : null;
}

/** Groups of three-or-more identical pieces (same template, same rank) in the chest. */
export function fusable(chest: readonly Item[]): readonly { template: string; rarity: Rarity; count: number }[] {
  const tally = new Map<string, number>();
  for (const it of chest) {
    const key = `${it.template}|${it.rarity}`;
    tally.set(key, (tally.get(key) ?? 0) + 1);
  }
  const out: { template: string; rarity: Rarity; count: number }[] = [];
  for (const [key, count] of tally) {
    const [template, rarity] = key.split('|') as [string, Rarity];
    if (count >= FUSE_COUNT && nextRarity(rarity)) out.push({ template, rarity, count });
  }
  return out.sort((a, b) => b.count - a.count);
}

/**
 * Three become one, a rank higher, and the roll quality survives the melt.
 *
 * The new piece keeps the average quality of what went in, measured against its own
 * rank's base. Three lucky 靈 make a better 玄 than three unlucky ones, so a good roll
 * is never wasted by fusing it.
 */
export function fuse(
  chest: readonly Item[], template: string, rarity: Rarity, quality = 1,
): { chest: readonly Item[]; made: Item | null } {
  const up = nextRarity(rarity);
  const tpl = TEMPLATE_BY_KEY[template];
  if (!up || !tpl) return { chest, made: null };

  const matching = chest.filter((x) => x.template === template && x.rarity === rarity);
  if (matching.length < FUSE_COUNT) return { chest, made: null };

  const eaten = matching.slice(0, FUSE_COUNT);
  const eatenIds = new Set(eaten.map((x) => x.id));

  // Quality carries across: the average of what went in, measured against its own rank's
  // base, so three lucky pieces make a better one than three unlucky ones.
  const base = baseValue(tpl, rarity, tpl.affix);
  const rolled = (base > 0
    ? eaten.reduce((sum, x) => sum + (x.rolls[0]?.value ?? 0), 0) / FUSE_COUNT / base
    : 1) * quality;                            // 巧手 Deft Hands lifts this

  // And so does the flavour: the new piece's extra lines are the ones that turned up
  // most often in the three that were melted, so a set of luck pieces fuses into a luck
  // piece rather than into a lottery.
  const tally = new Map<Affix, number>();
  for (const it of eaten) {
    for (const roll of it.rolls.slice(1)) tally.set(roll.affix, (tally.get(roll.affix) ?? 0) + 1);
  }
  const inherited = [...tally.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, SECONDARIES[up])
    .map(([affix]): Roll => ({
      affix,
      value: roundValue(affix, baseValue(tpl, up, affix) * 0.6 * rolled),
    }));

  const made: Item = {
    id: `fuse-${template}-${up}-${chest.length}-${Math.round(rolled * 1000)}`,
    template,
    rarity: up,
    rolls: [
      { affix: tpl.affix, value: roundValue(tpl.affix, baseValue(tpl, up, tpl.affix) * rolled) },
      ...inherited,
    ],
  };

  return { chest: [...chest.filter((x) => !eatenIds.has(x.id)), made], made };
}

/**
 * The chest's real size: the base, what 運 has added, what 藏 rolls on gear add, and any
 * keystone's cap, which overrides the lot.
 *
 * Gear slots arrive as a fraction because affinity multiplies them, so they are floored
 * here: half a place in a chest is not a place, and the screen must never promise one.
 */
export function chestLimit(unlocked: readonly string[], gearSlots = 0): number {
  const cap = chestCap(unlocked);
  return cap ?? CHEST_LIMIT + extraChestSlots(unlocked) + Math.floor(Math.max(0, gearSlots));
}
