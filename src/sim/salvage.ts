import {
  COMMON_DEPTH_FIRST, HUNT_SHARE, LAYERS_PER_REALM, floorPay, ladderAt, salvageShare,
} from './balance.ts';
import { RARITIES, RARITY_INFO, templateOf, type Item, type Rarity } from '../data/gear.ts';
import { salvageBonus } from './awaken.ts';
import { rate, type State } from './state.ts';
import { classMelt } from './schools.ts';
import { FORGED, metalKey } from '../data/crafts.ts';

/**
 * 拆 Breaking a piece down.
 *
 * One rule, stated once: a piece is worth a share of the first rung of the realm it was
 * made in, lifted by its rank. See salvageShare for why it reads the item's realm and
 * never the cultivator's, why the share falls as the realms rise, and why 煉器 refining
 * is left out of it.
 */
/**
 * 拆 What melting pays on this body: the cards that lift it, and 寶匠 the Treasure
 * Smith. One function, so the button, the sheet and the sim can never quote apart.
 */
export function meltFactor(s: Pick<State, 'awakened' | 'worn' | 'unlocked'>): number {
  return salvageBonus(s.awakened) * classMelt(s);
}

export function salvageValue(item: Item, factor = 1): number {
  // 業 A forged piece melts back into its metal and never into qi (see returnMetal), or
  // the forge would be a qi mill with a hammer on it.
  if (item.from === FORGED) return 0;
  // A save is input, and a hand-edited one can name a template that does not exist.
  // An unknown piece is worth the first realm's junk, never a crash.
  const realm = Math.max(1, Math.min(9, templateOf(item)?.realm ?? 1));
  const rung = ladderAt((realm - 1) * LAYERS_PER_REALM);
  return Math.max(1, Math.round(rung * salvageShare(realm) * RARITY_INFO[item.rarity].mult * factor));
}

/**
 * 材 What a piece melts into once the allowance is spent: the material the first common
 * beast of its realm leaves, by its rank. Read off the table and never off the record or
 * the tower, so it cannot compound with them. A forged piece still goes back to metal.
 */
export function meltMaterial(item: Item): number {
  if (item.from === FORGED) return 0;
  const realm = Math.max(1, Math.min(9, templateOf(item)?.realm ?? 1));
  const depth = (realm - 1) * LAYERS_PER_REALM + COMMON_DEPTH_FIRST;
  return Math.max(1, Math.round(floorPay(depth) * HUNT_SHARE * RARITY_INFO[item.rarity].mult));
}

/** What melting a pile pays: qi out of the allowance, and the rest as 材 material. */
export interface Melted {
  readonly state: State;
  readonly qi: number;
  readonly materials: number;
}

/**
 * 拆 Melt pieces against the allowance, in the order given. Each piece pays its qi while
 * the allowance holds it, and its material once it does not; a piece that only part fits
 * pays the part in qi and the rest in proportion. The chest is not touched here: callers
 * decide what leaves it. See MELT_FILL for why this exists.
 */
export function melt(s: State, pieces: readonly Item[]): Melted {
  const r = rate(s);
  const factor = meltFactor(s);
  let room = Math.max(0, s.melt ?? 0) * r;
  let qi = 0;
  let materials = 0;
  for (const p of pieces) {
    const worth = salvageValue(p, factor);
    if (worth <= 0) continue;
    const paid = Math.min(worth, room);
    room -= paid;
    qi += paid;
    // The cards and 寶匠 lift the spill as well, or a melting build would stop paying the
    // moment the allowance ran out (rekaris, 2026-10-02).
    if (paid < worth) materials += Math.round(meltMaterial(p) * factor * (1 - paid / worth));
  }
  const used = r > 0 ? qi / r : 0;
  return {
    state: { ...s, qi: s.qi + qi, materials: s.materials + materials, melt: Math.max(0, (s.melt ?? 0) - used) },
    qi: Math.round(qi),
    materials,
  };
}

/** What melting this pile would pay right now, without melting it: for the buttons. */
export function meltQuote(s: State, pieces: readonly Item[]): { qi: number; materials: number } {
  const m = melt(s, pieces);
  return { qi: m.qi, materials: m.materials };
}

/** Everything in the chest at or below a rank. What is worn is not in the chest. */
export function salvageable(chest: readonly Item[], upTo: Rarity): readonly Item[] {
  const top = RARITIES.indexOf(upTo);
  // 鎖 A locked piece is never in the pile, whatever rank the button reaches.
  return chest.filter((x) => RARITIES.indexOf(x.rarity) <= top && !x.locked);
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
  // 鎖 And a locked one is not melted by name either: it has to be unlocked first.
  const going = s.chest.filter((x) => wanted.has(x.id) && !x.locked);
  if (going.length === 0) return s;
  return returnMetal({
    ...melt(s, going).state,
    chest: s.chest.filter((x) => !wanted.has(x.id)),
  }, going);
}

/**
 * 業 What a forged piece melts into: two of its realm's metal, into the pouch. It is the
 * one thing the forge can take back, and it is never qi.
 */
export function returnMetal(s: State, pieces: readonly Item[]): State {
  const mine = pieces.filter((x) => x.from === FORGED);
  if (mine.length === 0 || !s.crafts) return s;
  const pouch = { ...s.crafts.pouch };
  for (const p of mine) {
    const k = metalKey(Math.max(1, Math.min(9, templateOf(p)?.realm ?? 1)));
    pouch[k] = (pouch[k] ?? 0) + 2;
  }
  return { ...s, crafts: { ...s.crafts, pouch } };
}

/** The bulk form: everything at or below a rank, in one go. */
export function salvageUpTo(s: State, upTo: Rarity): State {
  return salvage(s, salvageable(s.chest, upTo).map((x) => x.id));
}
