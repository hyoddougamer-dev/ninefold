import type { Beast } from '../data/bestiary.ts';
import { commonsOf } from '../data/bestiary.ts';
import { fight, odds, oddsRaw, type Outcome } from './combat.ts';
import { kitFor, type Carried } from './crafts.ts';
import { NO_KIT, type Kit } from './kit.ts';
import { ELITE_RISEN_FROM } from './balance.ts';
import type { State } from './state.ts';
import { eliteHeld, eliteSeed, loseElite, risenElite } from './risen.ts';

/**
 * 升 The risen elite's fight: the day's dice (eliteSeed), what is carried (kitFor 'elite'),
 * and the odds the hunt row quotes, bare and with the kit. The rules are in sim/risen.ts.
 */

export { eliteHeld, eliteSeed, loseElite, risenElite };

/** 升 The elite of a realm: its last common. */
export function eliteOf(realm: number): Beast | undefined {
  const commons = commonsOf(Math.max(1, Math.min(9, realm)));
  return commons[commons.length - 1];
}

/**
 * 升 The risen elite this cultivator could meet now, if one has walked out: their realm's, from
 * ELITE_RISEN_FROM, and not while a loss holds it for the day (eliteHeld).
 */
export function risenNow(s: State): Beast | null {
  if (s.realm < ELITE_RISEN_FROM) return null;
  const b = eliteOf(s.realm);
  return b && s.layer >= b.layer && risenElite(s, b) && !eliteHeld(s, b) ? b : null;
}

/** 攜 What a risen elite is fought with: what is carried, as at any hard fight. */
export function eliteKit(s: State, b: Beast): Carried {
  return kitFor(s, b, 'elite');
}

/** 戰 The fight on the day's dice. The arena plays this; the harness reads it. */
export function eliteFight(s: State, b: Beast, kit: Kit = eliteKit(s, b).kit): Outcome {
  return fight(s, b, eliteSeed(s, b), undefined, kit);
}

/**
 * 算 The odds the row quotes: bare, and with what is carried now. Read off the same fights
 * the arena would play, on spread seeds, as every other row's are. `raw` leaves the floor
 * and the ceiling off.
 */
export function eliteOdds(s: State, b: Beast, raw = false): { readonly bare: number; readonly carried: number; readonly carries: boolean } {
  const read = raw ? oddsRaw : odds;
  const k = eliteKit(s, b);
  const bare = read(s, b, undefined, NO_KIT);
  return { bare, carried: k.spends ? read(s, b, undefined, k.kit) : bare, carries: k.spends };
}
