import type { Card } from '../data/awakening.ts';
import { RARITIES, type Rarity } from '../data/gear.ts';
import { commonsOf } from '../data/bestiary.ts';
import { chestLimit } from './chest.ts';
import { dropChance, rarityWeights } from './drops.ts';
import { fortuneOf } from './fortune.ts';
import { bodyTotals, gearLuck } from './schools.ts';
import { valid } from './awaken.ts';
import type { State } from './state.ts';

/**
 * 悟道 What a card would do for this cultivator, in numbers they can check.
 *
 * rekaris, on the Discord: *"Whats this supposed to do? Is it cryptic on purpose?"*
 * about 福星 Lucky Star, whose card said only that what falls "comes off the rare end of
 * the table far more often". It was not meant to be cryptic, and it was: the card weighs
 * the table, and nobody reads a weight. What a player can read is a share of their own
 * drops, now and with the card, so that is what the card says.
 *
 * Read off the first common of the cultivator's realm and the whole of their fortune
 * (the tree, pills, gear, cards already held), so it is the same sum the kill uses.
 */
export type Worth =
  /** 階 The share of drops at `from` or better: 玄 Mystic, or higher once most are. */
  | { readonly kind: 'luck'; readonly from: Rarity; readonly before: number; readonly after: number }
  /** 器 The chance a kill drops a piece at all. */
  | { readonly kind: 'drop'; readonly before: number; readonly after: number }
  /** 藏 Places in the chest. */
  | { readonly kind: 'chest'; readonly before: number; readonly after: number }
  /** Everything else is already a plain percentage or count, and says so itself. */
  | { readonly kind: 'flat' };

/** The share of a beast's drops at a rank or better, for a given weight. */
export function rareShare(realm: number, luck: number, from: Rarity = 'mystic'): number {
  const beast = commonsOf(Math.max(1, Math.min(9, realm)))[0];
  if (!beast) return 0;
  const w = rarityWeights(beast, luck);
  const top = RARITIES.slice(RARITIES.indexOf(from));
  const total = RARITIES.reduce((sum, r) => sum + w[r], 0);
  return total > 0 ? top.reduce((sum, r) => sum + w[r], 0) / total : 0;
}

/**
 * Which rank to count from. By the ninth realm most drops are 玄 Mystic already, and
 * "83% now, 88% with this" undersells a card that nearly doubles 天 Heaven pieces; the
 * card counts from the lowest rank most of your drops are still below.
 */
function countFrom(realm: number, luck: number): Rarity {
  for (const r of ['mystic', 'earth'] as const) if (rareShare(realm, luck, r) < 0.5) return r;
  return 'heaven';
}

export function cardWorth(s: State, card: Card): Worth {
  const e = card.effect;
  const f = fortuneOf(s);
  if (e.kind === 'luck') {
    const luck = f.luck ?? 1;
    // A card's weight is added before the body's own luck multiplies the lot.
    const from = countFrom(s.realm, luck);
    return {
      kind: 'luck', from,
      before: rareShare(s.realm, luck, from),
      after: rareShare(s.realm, luck + e.weight * gearLuck(s), from),
    };
  }
  if (e.kind === 'drop') {
    const beast = commonsOf(Math.max(1, Math.min(9, s.realm)))[0];
    if (!beast) return { kind: 'flat' };
    const always = f.always ?? false;
    return {
      kind: 'drop',
      before: dropChance(beast, f.chance ?? 0, always),
      after: dropChance(beast, (f.chance ?? 0) + e.percent, always),
    };
  }
  if (e.kind === 'chest') {
    const room = bodyTotals(s).capacity;
    return {
      kind: 'chest',
      before: chestLimit(s.unlocked, room, s.awakened),
      after: chestLimit(s.unlocked, room, [...valid(s.awakened), card.key]),
    };
  }
  return { kind: 'flat' };
}
