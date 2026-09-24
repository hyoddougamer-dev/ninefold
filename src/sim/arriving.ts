import { LAYERS_PER_REALM } from './balance.ts';
import { STANCES, STANCE_LAYER } from '../data/arts.ts';
import { LINEAGE_LAYER, realmSet } from '../data/gear.ts';
import { comingIn, wardenOf } from '../data/bestiary.ts';
import { isOpen } from './unlocks.ts';

/**
 * 來 What the realm you are standing in has not handed over yet.
 *
 * 隙 Measured, a realm used to give everything it had in its first minute and then run
 * for twelve days on one beast every five: the name, the first common, the warden's
 * art, the stance and a whole lineage of gear, all at the breakthrough. The commons had
 * already been spread across layers 0, 4 and 7 for exactly that reason. 勢 the stance
 * and 器 the lineage are spread now too, which turns one lump into four arrivals.
 *
 * 見 And a thing that waits has to be *shown* waiting, or it is not an arrival, it is a
 * surprise. This is the list 境 the realm card draws, and it is the same argument a
 * locked tab already makes: you cannot look forward to a thing you have never seen.
 */
export interface Arriving {
  readonly key: string;
  readonly han: string;
  readonly name: string;
  /** What it is, so the card can draw the right thing beside it. */
  readonly kind: 'beast' | 'stance' | 'gear' | 'warden';
  /** The layer it walks out at, counted from zero. */
  readonly layer: number;
  /** The icon or painting subject, where it has one. */
  readonly subject?: string;
}

export function arriving(realm: number, layer: number): readonly Arriving[] {
  const out: Arriving[] = [];

  for (const b of comingIn(realm, layer)) {
    out.push({ key: b.key, han: b.han, name: b.name, kind: 'beast', layer: b.layer, subject: b.icon });
  }

  // 勢 The realm's own stance. The first realm's arrives with the realm, because 勢 the
  // whole system is not open until the second and holding it back twice says nothing.
  const stance = STANCES.find((s) => s.realm === realm);
  if (stance && realm > 1 && layer < STANCE_LAYER) {
    out.push({ key: stance.key, han: stance.han, name: stance.name, kind: 'stance', layer: STANCE_LAYER });
  }

  // 器 The lineage that starts falling part way up. Nothing falls at all in the first
  // realm, so the first realm never owes one.
  const set = realmSet(realm);
  if (isOpen(realm, 'gear') && realm > 1 && layer < LINEAGE_LAYER) {
    out.push({ key: `set${set.realm}`, han: set.han, name: set.name, kind: 'gear', layer: LINEAGE_LAYER });
  }

  const warden = wardenOf(realm);
  if (layer < LAYERS_PER_REALM - 1) {
    out.push({
      key: warden.key, han: warden.han, name: warden.name, kind: 'warden',
      layer: LAYERS_PER_REALM - 1, subject: warden.icon,
    });
  }

  return out.sort((a, b) => a.layer - b.layer);
}
