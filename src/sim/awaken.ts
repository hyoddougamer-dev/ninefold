import { AWAKENINGS, ALL_CARDS, cardOf, type Card } from '../data/awakening.ts';

/**
 * 悟道 What a breakthrough owes you, and what the cards you took are worth.
 *
 * Everything here reads `awakened`, the list of card keys in the order they were taken,
 * and nothing else. That is deliberate and it is the same shape `unlocked` has: a save
 * is input, so the list is the only thing stored and every fact about it is derived.
 *
 * 欠 The offer is derived too, rather than fired.
 *
 * Reaching the second realm owes you a choice, and the ninth owes you the eighth. So
 * what is owed is `realm - 1`, and what is taken is the length of the list, and the
 * difference is the offer. Nothing has to remember to raise it, it survives a reload
 * because it was never an event, and a save hand-edited to skip one simply gets asked
 * again. The whole mechanism is one subtraction.
 */

/** How many choices this realm owes, taken or not. Reaching realm 2 owes the first. */
export function owed(realm: number): number {
  return Math.max(0, Math.min(AWAKENINGS.length, realm - 1));
}

/**
 * The three cards waiting to be chosen from, or null when nothing is owed.
 *
 * 序 The trio is picked by how many have been taken rather than by the realm, so a
 * cultivator who somehow arrives at the fifth realm owing three choices is offered them
 * one at a time, in order, and never skips a card.
 */
export function due(realm: number, awakened: readonly string[]): readonly Card[] | null {
  const taken = valid(awakened).length;
  return taken < owed(realm) ? AWAKENINGS[taken] : null;
}

/**
 * The list, with anything that is not a real card taken in a real order thrown away.
 *
 * A save is input: a forged list could otherwise claim every card in the game, or claim
 * the ninth realm's card in the second. So each entry has to be a card that exists, from
 * the trio that entry's turn actually offers, and appear once.
 */
export function valid(raw: readonly string[]): readonly string[] {
  const out: string[] = [];
  for (const key of raw) {
    if (out.length >= AWAKENINGS.length) break;
    const card = cardOf(key);
    if (!card) continue;
    if (!AWAKENINGS[out.length].some((c) => c.key === card.key)) continue;
    out.push(card.key);
  }
  return out;
}

/** The cards actually held, as cards. */
export function held(awakened: readonly string[]): readonly Card[] {
  return valid(awakened).map((k) => cardOf(k)!);
}

/** Take one of the three on offer. Anything else is refused and changes nothing. */
export function take(realm: number, awakened: readonly string[], key: string): readonly string[] {
  const trio = due(realm, awakened);
  if (!trio || !trio.some((c) => c.key === key)) return valid(awakened);
  return [...valid(awakened), key];
}

/** Add up one kind of effect across everything taken. */
function sum(awakened: readonly string[], kind: string, field: string): number {
  let total = 0;
  for (const card of held(awakened)) {
    const e = card.effect as unknown as Record<string, unknown>;
    if (e.kind === kind && typeof e[field] === 'number') total += e[field] as number;
  }
  return total;
}

/** 材 What a beast gives, multiplied. */
export function materialBonus(awakened: readonly string[]): number {
  return 1 + sum(awakened, 'material', 'percent');
}

/** 器 Points added to a common's drop chance, in the same units 運 the tree uses. */
export function dropBonus(awakened: readonly string[]): number {
  return sum(awakened, 'drop', 'percent');
}

/** 階 How much the rare end of the table is weighted up, on top of the tree's. */
export function luckBonus(awakened: readonly string[]): number {
  return sum(awakened, 'luck', 'weight');
}

/** 拆 What melting pays, multiplied. */
export function salvageBonus(awakened: readonly string[]): number {
  return 1 + sum(awakened, 'salvage', 'percent');
}

/**
 * 煉器 What a refine level costs, multiplied.
 *
 * Clamped at a tenth of the price however many discounts are taken, because refining is
 * the one material sink with no ceiling and a free one would be a different game.
 */
export function refineFactor(awakened: readonly string[]): number {
  return Math.max(0.1, 1 - sum(awakened, 'refine', 'percent'));
}

/** 藏 Places added to the chest. */
export function chestSlots(awakened: readonly string[]): number {
  return sum(awakened, 'chest', 'slots');
}

/** 道 Points handed over by cards, which are earned exactly like any other. */
export function daoPoints(awakened: readonly string[]): number {
  return sum(awakened, 'dao', 'points');
}

/** Every card, for the key and the bible. */
export { ALL_CARDS, AWAKENINGS, cardOf, type Card };
