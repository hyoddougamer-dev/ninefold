import { RANKS } from '../copy.ts';
import { REALMS } from '../../data/realms.ts';
import { RUNGS } from '../../sim/rung.ts';
import { Term } from './Term.tsx';

/** 色 The colour a rank's seal wears: the realm it lands on (realm 9's for the mark ranks). */
export function rungColour(rung: number): string {
  const realm = RUNGS[rung]?.realm ?? 1;
  return REALMS.find((r) => r.n === realm)?.colour ?? REALMS[0].colour;
}

/**
 * 位 A sect rank's seal: its one character in a small stamped square, in the colour of the realm
 * it lands on (docs/SEASON-RANKS.md, section 7). It answers a tap with its 註 note, through the
 * portal Term draws every note through, and its English name is its label, so the seal is never
 * the only place the rank is named (譯): every screen that wears it writes the English beside it.
 *
 * Like the 先行 seal, each screen passes its own class and styles it under its own scope: one
 * component, never one shared class (CLAUDE.md). `go` puts a way to the ladder inside the note.
 */
export function RungSeal({ rung, className, go }: {
  rung: number;
  className: string;
  go?: { readonly label: string; readonly onGo: () => void };
}) {
  const r = RUNGS[rung];
  if (!r) return null;
  const name = RANKS.sect.names[rung];
  return (
    <Term han={r.han} bare go={go}
      entry={{ han: r.han, name, note: RANKS.sect.note(RANKS.sect.when[rung]) }}>
      <span className={className} role="img" aria-label={name} data-rung={rung}
        style={{ ['--rc' as string]: rungColour(rung) }}>{r.seal}</span>
    </Term>
  );
}
