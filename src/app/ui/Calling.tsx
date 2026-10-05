import { callingOf, type Worn } from '../../data/gear.ts';
import { SCHOOLS, SCHOOL_INFO } from '../../data/schools.ts';
import { SCHOOL_FULL, SCHOOL_WAKES } from '../../sim/balance.ts';
import { CLASS } from '../copy.ts';
import { pairSays, schoolSaysAt } from '../classes.ts';

/**
 * 職 The class the body is wearing, under the ring on 器.
 *
 * It says four things, in the order a player asks them: what am I, what does it give,
 * how far is each school, and what would the next piece do. The class is derived from
 * the worn set on every render, never stored: take a piece off and it is gone.
 */
export function Calling({ worn, onBook, onCompare }: { worn: Worn; onBook?: () => void; onCompare?: () => void }) {
  const c = callingOf(worn);
  const top = [...SCHOOLS].sort((a, b) => c.counts[b] - c.counts[a])[0];
  const pure = c.kind === 'pure' && c.school ? SCHOOL_INFO[c.school] : null;
  const pair = c.kind === 'pair' ? c.pair ?? null : null;
  const hue = pure ? pure.colour : pair ? SCHOOL_INFO[pair.a].colour : 'var(--line)';
  const hint = c.kind === 'none'
    ? CLASS.toWake(SCHOOL_WAKES - c.counts[top], SCHOOL_INFO[top].short)
    : c.kind === 'pure' && c.tier === 1 && c.school
      ? CLASS.toFull(SCHOOL_FULL - c.counts[c.school], SCHOOL_INFO[c.school].short)
      : pair ? CLASS.pairOf(SCHOOL_INFO[pair.a].short, SCHOOL_INFO[pair.b].short,
        `${schoolSaysAt(pair.a, 1)} ${schoolSaysAt(pair.b, 1)}`) : null;

  return (
    <div className="calling" data-kind={c.kind} style={{ ['--hue' as string]: hue }}>
      <span className="cseal cjk" aria-hidden="true">
        {pure ? pure.seal : pair ? pair.han : '職'}
      </span>
      <div className="cbody">
        {c.kind === 'none' ? (
          <b>{CLASS.head}<i>{CLASS.none}</i></b>
        ) : (
          <b>
            <span className="cjk">{pure ? pure.han : pair!.han}</span> {pure ? pure.name : pair!.name}
            {pure && <i>{CLASS.step(c.tier)}</i>}
          </b>
        )}
        {pure && c.school && <span className="cgives">{schoolSaysAt(c.school, c.tier)}</span>}
        {pair && <span className="cgives">{pairSays(pair.key)}</span>}
        <span className="cschools">
          {SCHOOLS.map((sc) => (
            <em key={sc} data-on={c.counts[sc] >= SCHOOL_WAKES} style={{ ['--c' as string]: SCHOOL_INFO[sc].colour }}>
              <span className="cjk">{SCHOOL_INFO[sc].seal}</span> {SCHOOL_INFO[sc].short} <b className="mono">{c.counts[sc]}</b>
            </em>
          ))}
        </span>
        {hint && <span className="cnext">{hint}</span>}
        {(onBook || onCompare) && (
          <span className="cbtns">
            {/* 較 Which class the pieces make strongest, built from the chest (ui/Compare.tsx). */}
            {onCompare && (
              <button className="ccompare" onClick={onCompare}>
                <span className="cjk" aria-hidden="true">較</span> {CLASS.compare.open}
              </button>
            )}
            {/* 譜 Which piece is which school, so nobody has to learn the names by heart. */}
            {onBook && (
              <button className="cbook" onClick={onBook}>
                <span className="cjk" aria-hidden="true">譜</span> {CLASS.book.open}
              </button>
            )}
          </span>
        )}
      </div>
    </div>
  );
}
