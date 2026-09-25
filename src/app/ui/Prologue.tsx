import { useState } from 'react';
import { PROLOGUE } from '../copy.ts';

/**
 * 序 The prologue: the game's name, then the whole climb in three pictures.
 *
 * It replaces the help sheet as the first thing a new save opens on. It asks nothing
 * and keeps nothing: finishing it hands over to 相 who is climbing, which is the one
 * question, and then to the game, where 引 the guide teaches by making the player do.
 * A save that has begun never sees it again, because it opens on the same test that
 * opened the help sheet (save.ts untouched).
 */
export function Prologue({ sky, onDone }: { sky: string | null; onDone: () => void }) {
  const [page, setPage] = useState(0);
  const pages = 2;
  return (
    <div className="prologue" data-page={page}>
      {sky && <div className="psky" aria-hidden="true" style={{ backgroundImage: `url(${sky})` }} />}
      {page === 0 ? (
        <div className="ptitle" key="title">
          <h1 className="cjk">九境</h1>
          <p className="pname">{PROLOGUE.name}</p>
          <p className="pline">{PROLOGUE.line}</p>
        </div>
      ) : (
        <div className="phow" key="how">
          <p className="pover">{PROLOGUE.howOver}</p>
          <h2>{PROLOGUE.howTitle}</h2>
          <ol>
            {PROLOGUE.rows.map(([han, title, line]) => (
              <li key={han}>
                <span className="pseal cjk">{han}</span>
                <span><b>{title}</b><i>{line}</i></span>
              </li>
            ))}
          </ol>
        </div>
      )}
      <div className="pfoot">
        <span className="pdots" role="img" aria-label={PROLOGUE.page(page + 1, pages)}>
          {Array.from({ length: pages }, (_, i) => <i key={i} data-on={i === page} />)}
        </span>
        <button className="act" onClick={() => (page + 1 < pages ? setPage(page + 1) : onDone())}>
          {page === 0 ? <>始 <span>{PROLOGUE.begin}</span></> : <>進 <span>{PROLOGUE.next}</span></>}
        </button>
      </div>
    </div>
  );
}
