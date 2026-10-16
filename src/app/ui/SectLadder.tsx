import { useEffect, useState } from 'react';
import { RANKS } from '../copy.ts';
import { RUNGS, TOP_RUNG } from '../../sim/rung.ts';
import * as cloud from '../../net/cloud.ts';
import { RungSeal, rungColour } from './RungSeal.tsx';

/**
 * 位階 The Sect's Ladder: the nine ranks, what reaches each, and how many hold each (rungs() on
 * the server, counts only), with the player's own rank lit.
 *
 * It is a view swapped in place of the boards, exactly as 題名崖 the Cliff is, never an overlay:
 * an overlay would sit inside the sheet's animated cards, and a transform left behind by a
 * filled animation traps anything fixed inside it (CLAUDE.md). Its classes are its own, under
 * .help.ranks .rsteps, and none of them is named for a ladder: that word already meant two
 * different things in this repository once.
 *
 * The top rank is drawn at the top, the way a ladder is climbed.
 */
export function SectLadder({ rung, onBack }: { rung: number | null; onBack: () => void }) {
  const [counts, setCounts] = useState<readonly number[] | null | undefined>(undefined);
  useEffect(() => {
    let live = true;
    cloud.rungs().then((c) => { if (live) setCounts(c); }).catch(() => { if (live) setCounts(null); });
    return () => { live = false; };
  }, []);
  const order = Array.from({ length: TOP_RUNG + 1 }, (_, i) => TOP_RUNG - i);
  return (
    <div className="rsteps">
      <button type="button" className="rstepsback" onClick={onBack}>‹ {RANKS.sect.back}</button>
      <div className="rstepshead">
        <b className="cjk">{RANKS.sect.ladderHan}</b>
        <span><em>{RANKS.sect.ladderName}</em><small>{RANKS.sect.ladderWhat}</small></span>
      </div>
      <ol className="rstepslist">
        {order.map((i) => (
          <li key={i} data-me={rung === i || undefined} data-ahead={rung !== null && i > rung ? 'true' : undefined}
            style={{ ['--rc' as string]: rungColour(i) }}>
            <RungSeal rung={i} className="rstepseal" />
            <span className="rstepw">
              <b>{RANKS.sect.names[i]} <span className="cjk">{RUNGS[i].han}</span>
                {rung === i && <em> · {RANKS.sect.you}</em>}</b>
              <small>{RANKS.sect.reach[i]}</small>
            </span>
            <i className="rstepn">{counts ? RANKS.sect.holding(counts[i] ?? 0) : ''}</i>
          </li>
        ))}
      </ol>
      {counts === null && <p className="rnote small">{RANKS.sect.countsOff}</p>}
    </div>
  );
}
