import { LAYERS_PER_REALM, ladderAt, salvageShare } from './balance.ts';
import { RARITIES, RARITY_INFO, templateOf, type Item, type Rarity } from '../data/gear.ts';
import { salvageBonus } from './awaken.ts';
import type { State } from './state.ts';

/**
 * 拆 Breaking a piece down.
 *
 * One rule, stated once: a piece is worth a share of the first rung of the realm it was
 * made in, lifted by its rank. See salvageShare for why it reads the item's realm and
 * never the cultivator's, why the share falls as the realms rise, and why 煉器 refining
 * is left out of it.
 */
export function salvageValue(item: Item, factor = 1): number {
  // A save is input, and a hand-edited one can name a template that does not exist.
  // An unknown piece is worth the first realm's junk, never a crash.
  const realm = Math.max(1, Math.min(9, templateOf(item)?.realm ?? 1));
  const rung = ladderAt((realm - 1) * LAYERS_PER_REALM);
  return Math.max(1, Math.round(rung * salvageShare(realm) * RARITY_INFO[item.rarity].mult * factor));
}

/** Everything in the chest at or below a rank. What is worn is not in the chest. */
export function salvageable(chest: readonly Item[], upTo: Rarity): readonly Item[] {
  const top = RARITIES.indexOf(upTo);
  return chest.filter((x) => RARITIES.indexOf(x.rarity) <= top);
}

/**
 * What that pile is worth, in one number, for the button that says so.
 *
 * 悟道 The factor is 貪狼 and 點石, and it has to be handed in rather than read out of
 * a list here, because the screens that call this are looking at a pile and not at a
 * cultivator. `salvage` below passes it; so does the button.
 */
export function salvageWorth(items: readonly Item[], factor = 1): number {
  return items.reduce((sum, x) => sum + salvageValue(x, factor), 0);
}

/**
 * 拆 Melt a set of pieces. Ids that are not in the chest are ignored rather than
 * refused: a save is input, and a stale id is not a reason to lose the rest.
 */
export function salvage(s: State, ids: readonly string[]): State {
  const wanted = new Set(ids);
  const going = s.chest.filter((x) => wanted.has(x.id));
  if (going.length === 0) return s;
  return {
    ...s,
    qi: s.qi + salvageWorth(going, salvageBonus(s.awakened)),
    chest: s.chest.filter((x) => !wanted.has(x.id)),
  };
}

/** The bulk form: everything at or below a rank, in one go. */
export function salvageUpTo(s: State, upTo: Rarity): State {
  return salvage(s, salvageable(s.chest, upTo).map((x) => x.id));
}
