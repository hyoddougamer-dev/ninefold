import { BEASTS, type Beast } from '../data/bestiary.ts';
import { MARKS } from './balance.ts';
import type { State } from './state.ts';

/**
 * 靈獸 The spirit companion: one beast this cultivator has 通 mastered, bonded, fighting
 * beside them.
 *
 * 通 It asks for mastery, a hundred wins over that one beast, because a companion is the
 * record's promise kept: you have fought this animal so many times that it follows you.
 * A warden is never one. It is fought once, and it is not an animal anybody tames.
 *
 * 換 It is free to change, as often as a player likes. The strength it brings is read off
 * how close the beast stands to the cultivator (combat.ts, companionShare), so the rat
 * that was a real ally in the first realm is a pet by the fourth, and changing companion
 * is the decision rather than a cost. Nothing is ever lost by it.
 *
 * Nothing here reads a clock or a die: the bond is a key in the save, and whether it is
 * allowed is read off the kills every time.
 */

const BY_KEY: Readonly<Record<string, Beast>> = Object.fromEntries(BEASTS.map((b) => [b.key, b]));

/** 通 Whether this beast can be bonded by a cultivator with these kills. */
export function canBond(killed: Readonly<Record<string, number>>, key: string): boolean {
  const b = BY_KEY[key];
  return !!b && !b.warden && (killed[key] ?? 0) >= MARKS[MARKS.length - 1];
}

/** A save is input: a companion it could not have bonded is no companion. */
export function validCompanion(raw: unknown, killed: Readonly<Record<string, number>>): string | null {
  return typeof raw === 'string' && canBond(killed, raw) ? raw : null;
}

/** 靈獸 The beast fighting beside this cultivator, or none. */
export function companionOf(s: Pick<State, 'companion' | 'killed'>): Beast | null {
  return s.companion && canBond(s.killed, s.companion) ? BY_KEY[s.companion] : null;
}

/** Every beast this cultivator could bond now, newest realm first. */
export function bondable(s: Pick<State, 'killed'>): readonly Beast[] {
  return BEASTS.filter((b) => canBond(s.killed, b.key)).sort((a, b) => b.realm - a.realm || (b.layer ?? 0) - (a.layer ?? 0));
}

/** 結 Bond a beast, or part with the one you have (null). Anything not allowed changes nothing. */
export function bond(s: State, key: string | null): State {
  if (key === null) return s.companion === null ? s : { ...s, companion: null };
  if (!canBond(s.killed, key) || s.companion === key) return s;
  return { ...s, companion: key };
}
