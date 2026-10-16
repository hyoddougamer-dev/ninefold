import { RUNG_AT } from './balance.ts';

/**
 * 位 The sect rank, from Outer Disciple 外門弟子 to Ancestor 老祖 (docs/SEASON-RANKS.md, section 3).
 *
 * Derived, never stored: the score is the account's verified `climb + marks` on the server
 * (standings, written only by the sync after verify(), both only rising), and the rank is how
 * many thresholds of RUNG_AT it has passed. The server says it (rung_of() in SQL); the game only
 * names it. Nothing here touches the game's state: no rank is in a save, in validate() or in
 * verify(), and none feeds a number.
 *
 * The English names are player copy and live in src/app/copy.ts (RANKS.sect.names); these are
 * the characters, the one character on the seal, and the realm whose colour the seal wears.
 */
export interface Rung {
  /** The rank's full name in characters. */
  readonly han: string;
  /** The one character carved on its seal. */
  readonly seal: string;
  /** The realm whose colour the seal wears: the realm it lands on, realm 9's for the mark ranks. */
  readonly realm: number;
}

export const RUNGS: readonly Rung[] = [
  { han: '外門弟子', seal: '外', realm: 1 },
  { han: '內門弟子', seal: '內', realm: 2 },
  { han: '核心弟子', seal: '核', realm: 4 },
  { han: '真傳弟子', seal: '真', realm: 6 },
  { han: '護法', seal: '護', realm: 8 },
  { han: '長老', seal: '長', realm: 9 },
  { han: '峰主', seal: '峰', realm: 9 },
  { han: '太上長老', seal: '太', realm: 9 },
  { han: '老祖', seal: '祖', realm: 9 },
];

/** The highest rank, Ancestor. */
export const TOP_RUNG = RUNGS.length - 1;

/** Where the summit is in the climb: realm 9, layer 8. Past it, only marks raise the score. */
export const SUMMIT = 80;

/** The score the ranks are read from: the verified climb (0 to 80) and the thunder marks. */
export function scoreOf(climb: number, marks: number): number {
  return Math.max(0, Math.floor(climb || 0)) + Math.max(0, Math.floor(marks || 0));
}

/** The rank for a score: 0 Outer Disciple to 8 Ancestor. The same rule as rung_of() in SQL. */
export function rungOf(score: number): number {
  let r = 0;
  for (let i = 1; i < RUNG_AT.length; i++) if ((score || 0) >= RUNG_AT[i]) r = i;
  return r;
}

/** A rank as the server sends it: a whole number from 0 to 8, or null for anything else. */
export function rungFrom(raw: unknown): number | null {
  const n = typeof raw === 'string' ? Number(raw) : raw;
  return typeof n === 'number' && Number.isInteger(n) && n >= 0 && n <= TOP_RUNG ? n : null;
}

/**
 * What the next rank is and what reaches it: the layers still to climb and the marks still to
 * carry. Null at Ancestor, the last rank until new content extends the climb.
 */
export function nextRung(climb: number, marks: number): { rung: number; layers: number; marks: number } | null {
  const now = rungOf(scoreOf(climb, marks));
  if (now >= TOP_RUNG) return null;
  const at = RUNG_AT[now + 1];
  const c = Math.max(0, Math.floor(climb || 0));
  const m = Math.max(0, Math.floor(marks || 0));
  if (at <= SUMMIT) return { rung: now + 1, layers: Math.max(0, at - c - m), marks: 0 };
  return { rung: now + 1, layers: Math.max(0, SUMMIT - c), marks: Math.max(0, at - SUMMIT - m) };
}

/**
 * 題名崖 The Cliff gate a rank is reached through, if one is: Inner at gate 1 (into realm 2), Core
 * at 3, True at 5, Guardian at 7, Elder at 9 (the first tribulation). Outer Disciple and the mark
 * ranks past Elder have none.
 */
export function gateOfRung(rung: number): number | null {
  return rung >= 1 && rung <= 4 ? rung * 2 - 1 : rung === 5 ? 9 : null;
}
