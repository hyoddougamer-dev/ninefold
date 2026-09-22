import {
  ART_BY_KEY, ARTS, SEQUENCE_SLOTS, STANCE_BY_KEY, WARDEN_ART,
  stancesFor, type Art, type Stance,
} from '../data/arts.ts';

/**
 * What a cultivator may use, and what they have chosen.
 *
 * Neither ownership is stored. The stances you may stand in follow from the realm you
 * reached; the arts you hold follow from the wardens you have put down. Both are
 * already in the save, so a save cannot claim an art it never earned. There is nothing
 * to forge.
 */

export interface Loadout {
  readonly realm: number;
  readonly killed: Readonly<Record<string, number>>;
  readonly stance: string | null;
  readonly sequence: readonly string[];
}

/** The arts held: one for every warden that has fallen, in realm order. */
export function artsHeld(killed: Readonly<Record<string, number>>): readonly Art[] {
  return ARTS.filter((a) =>
    Object.entries(WARDEN_ART).some(([warden, art]) => art === a.key && (killed[warden] ?? 0) > 0));
}

export function stanceOf(l: Loadout): Stance | null {
  if (!l.stance) return null;
  const s = STANCE_BY_KEY[l.stance];
  return s && s.realm <= l.realm ? s : null;
}

/**
 * The sequence as it will actually run: always SEQUENCE_SLOTS long, with an empty slot
 * wherever the player has not put an art they actually hold.
 *
 * **The length is fixed on purpose.** The first version returned only the arts placed,
 * so a one-art sequence fired that art every single round while a three-art sequence
 * fired each one every third round, which made a full sequence *worse* than a single
 * art. Measured, a lone 虎嘯 was worth 1.43× power and three arts together 1.33×. The
 * rotation is three rounds long whatever you put in it; an empty slot is a wasted round,
 * and filling it is always an improvement.
 *
 * A save is input. Left unfiltered, a hand-edited save could put 龍威 in slot one at
 * realm 1 and walk over every warden in the game.
 */
export function sequenceOf(l: Loadout): readonly (Art | null)[] {
  const held = new Set(artsHeld(l.killed).map((a) => a.key));
  const seen = new Set<string>();
  const out: (Art | null)[] = [];
  for (const key of l.sequence) {
    if (out.length === SEQUENCE_SLOTS) break;
    if (!held.has(key) || seen.has(key)) continue;
    seen.add(key);
    out.push(ART_BY_KEY[key]);
  }
  while (out.length < SEQUENCE_SLOTS) out.push(null);
  return out;
}

/** The same cleaning, as the save wants it back: keys, not objects. */
export function validateSequence(raw: unknown, killed: Readonly<Record<string, number>>): string[] {
  const list = Array.isArray(raw) ? raw.filter((x): x is string => typeof x === 'string') : [];
  return sequenceOf({ realm: 9, killed, stance: null, sequence: list })
    .filter((a): a is Art => a !== null).map((a) => a.key);
}

export function validateStance(raw: unknown, realm: number): string | null {
  if (typeof raw !== 'string') return null;
  const s = STANCE_BY_KEY[raw];
  return s && s.realm <= realm ? s.key : null;
}

/** Every stance this cultivator could stand in, for the screen that lists them. */
export function stanceChoices(realm: number): readonly Stance[] {
  return stancesFor(realm);
}
