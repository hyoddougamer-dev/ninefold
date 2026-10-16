import { WARDENS } from '../data/bestiary.ts';
import { RUNGS, TOP_RUNG, gateOfRung, rungFrom } from '../sim/rung.ts';
import { RANKS } from './copy.ts';
import type { Notice } from './notices.ts';
import { isPlaceholder } from '../net/names.ts';

/**
 * 升 The one card a sect rank brings (docs/SEASON-RANKS.md, section 7), with the Cliff carving
 * that came in the same sync.
 *
 * Both facts are the server's (my_standing().rung and .carved), so this is a pure function of
 * what the server said and what the device has already shown. What has been shown is kept in
 * the save's `seen` as **one** key, `sect:<highest rank shown>:<gates shown as a bitmask>`, at
 * most `sect:8:511`, and never one key per rank or per gate: load.ts keeps at most 32 keys, and
 * a key past the 32nd is dropped, which would bring its card back on every visit.
 *
 * The rules:
 *   - no card for Outer Disciple, which every signed-in cultivator is from the first sync;
 *   - a rise and the carving through the gate that brought it are one card, never two in a row
 *     (a .notice card blocks pointer events);
 *   - a carving alone (gates 2, 4, 6 and 8, or a rise outside the first 81) is the Cliff's own
 *     line, RANKS.cliff.yours;
 *   - after a long absence, one card for the highest new rank and "through 3 more gates";
 *   - a cultivator still under a 修士 name is asked once more, in the same card, to choose one.
 */
export const SECT_KEY = 'sect:';

export interface Shown { readonly rung: number; readonly gates: number }

/** What the device has shown, read off `seen`. Nothing shown is rank 0 and no gates. */
export function shownOf(seen: readonly string[]): Shown {
  const k = seen.find((x) => x.startsWith(SECT_KEY));
  const m = k ? /^sect:(\d):(\d{1,3})$/.exec(k) : null;
  if (!m) return { rung: 0, gates: 0 };
  return { rung: Math.min(TOP_RUNG, Number(m[1])), gates: Number(m[2]) & 511 };
}

/** `seen` with the one sect key replaced: the old one out, the new one in, nothing else touched. */
export function withShown(seen: readonly string[], key: string): string[] {
  return [...seen.filter((x) => !x.startsWith(SECT_KEY)), key];
}

export interface SectWord {
  readonly rung?: unknown;
  readonly carved?: readonly { readonly gate: number; readonly rank: number }[] | null;
  readonly name?: string | null;
}

const bit = (gate: number) => 1 << (gate - 1);
const gateName = (gate: number) => RANKS.cliff.gateOf(WARDENS[gate - 1]?.name ?? '');

/** The card to show, or null, which is the usual answer. */
export function sectNotice(seen: readonly string[], word: SectWord | null): Notice | null {
  if (!word) return null;
  const was = shownOf(seen);
  const rung = rungFrom(word.rung);
  const carved = (word.carved ?? []).filter((c) => Number.isInteger(c?.gate) && c.gate >= 1 && c.gate <= 9
    && Number.isInteger(c?.rank) && c.rank >= 1 && c.rank <= 81);
  const fresh = carved.filter((c) => !(was.gates & bit(c.gate))).sort((a, b) => a.gate - b.gate);
  const risen = rung !== null && rung >= 1 && rung > was.rung ? rung : null;
  if (risen === null && fresh.length === 0) return null;

  const gates = carved.reduce((m, c) => m | bit(c.gate), was.gates);
  const key = `${SECT_KEY}${Math.max(was.rung, rung ?? 0)}:${gates}`;
  const unnamed = isPlaceholder(word.name);
  const tail = (lines: string[]) => [...lines, ...(unnamed ? [RANKS.sect.unnamed] : [])].join(' ');

  if (risen !== null) {
    const tied = fresh.find((c) => c.gate === gateOfRung(risen));
    const more = fresh.length - (tied ? 1 : 0);
    const lines = [RANKS.sect.checked[risen]];
    if (tied) lines.push(RANKS.sect.carved(tied.rank, gateName(tied.gate)));
    if (more > 0) lines.push(RANKS.sect.more(more));
    return {
      key, han: RUNGS[risen].seal, title: RANKS.sect.rise(RANKS.sect.names[risen], RUNGS[risen].han),
      text: tail(lines), when: () => true,
    };
  }
  // A carving alone: the furthest gate leads, and the others are counted.
  const lead = fresh[fresh.length - 1];
  const lines = [RANKS.cliff.yours(lead.rank, gateName(lead.gate))];
  if (fresh.length > 1) lines.push(RANKS.sect.more(fresh.length - 1));
  return { key, han: '崖', title: RANKS.sect.carvedTitle, text: tail(lines), when: () => true };
}
