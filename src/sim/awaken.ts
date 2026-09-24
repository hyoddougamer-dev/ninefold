import { AWAKENINGS, ALL_CARDS, HEAVEN_CARDS, TRIOS, cardOf, type Card } from '../data/awakening.ts';
import { heavensOpened } from '../data/heavens.ts';

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

/**
 * How many choices are owed, taken or not. Reaching realm 2 owes the first.
 *
 * 境外 And a heaven owes one as well, on exactly the same subtraction. The realms owe
 * `realm - 1`, which tops out at eight, and every heaven the marks have opened owes one
 * more, which tops out at nine. Seventeen choices over a climb, and the same sentence
 * covers both halves of it: *what is owed is where you have got to, what is taken is the
 * length of the list, and the difference is the offer.*
 *
 * The marks are optional so that every caller that only knows a realm still reads true:
 * below the ninth there are no marks to count and the answer has not changed.
 */
export function owed(realm: number, marks = 0): number {
  const realms = Math.max(0, Math.min(AWAKENINGS.length, realm - 1));
  // 序 A heaven cannot owe a card while a realm still does, because the trios are one
  // list in order: the realms' eight come first and nothing skips ahead of them.
  const heavens = realms < AWAKENINGS.length ? 0
    : Math.min(HEAVEN_CARDS.length, heavensOpened(marks));
  return realms + heavens;
}

/**
 * The three cards waiting to be chosen from, or null when nothing is owed.
 *
 * 序 The trio is picked by how many have been taken rather than by the realm, so a
 * cultivator who somehow arrives at the fifth realm owing three choices is offered them
 * one at a time, in order, and never skips a card.
 */
export function due(
  realm: number, awakened: readonly string[], marks = 0,
): readonly Card[] | null {
  const taken = valid(awakened).length;
  return taken < owed(realm, marks) ? TRIOS[taken] : null;
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
    if (out.length >= TRIOS.length) break;
    const card = cardOf(key);
    if (!card) continue;
    if (!TRIOS[out.length].some((c) => c.key === card.key)) continue;
    out.push(card.key);
  }
  return out;
}

/**
 * 卡 The trio this cultivator is owed, read straight off the save.
 *
 * 境外 It exists so that no caller has to remember that a heaven owes a card too. Every
 * screen and every harness asked `due(realm, awakened)` and would have gone on asking it
 * for ever, and the nine heavens' cards would simply never have been offered to anybody.
 */
export function cardDue(s: {
  realm: number; awakened: readonly string[]; tribulation: number;
}): readonly Card[] | null {
  return due(s.realm, s.awakened, s.tribulation);
}

/** The cards actually held, as cards. */
export function held(awakened: readonly string[]): readonly Card[] {
  return valid(awakened).map((k) => cardOf(k)!);
}

/** Take one of the three on offer. Anything else is refused and changes nothing. */
export function take(
  realm: number, awakened: readonly string[], key: string, marks = 0,
): readonly string[] {
  const trio = due(realm, awakened, marks);
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

/**
 * 丹 What a pill costs in 材 material, multiplied.
 *
 * Clamped the same way 煉器 refining is and for the same reason: the furnace is the one
 * thing the endgame is built on, and a free pill would be a different endgame. Every
 * heaven's thrift card taken together comes to three fifths off, so the clamp is a guard
 * rather than a ceiling anybody meets.
 */
export function pillFactor(awakened: readonly string[]): number {
  return Math.max(0.3, 1 - sum(awakened, 'pill', 'percent'));
}

/** 塔 What a floor of the Endless Tower pays in 材 material, multiplied. */
export function towerBonus(awakened: readonly string[]): number {
  return 1 + sum(awakened, 'tower', 'percent');
}

/** Every card, for the key and the bible. */
export { ALL_CARDS, AWAKENINGS, HEAVEN_CARDS, TRIOS, cardOf, type Card };
