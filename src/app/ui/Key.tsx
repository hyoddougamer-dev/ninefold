import { GROUPS, type Term } from '../glossary.ts';
import { KEY } from '../copy.ts';
import { icon } from '../../art/icon.ts';
import { Svg } from './Svg.tsx';

/**
 * 釋 The key: every character the game uses, on one page.
 *
 * The rows themselves live in ../glossary.ts, because 註 the tooltip reads the same
 * ones. A character tapped where it stands is answered from exactly the table this page
 * draws, and neither can drift from the other.
 */
function Group({ title, blurb, rows }: { title: string; blurb: string; rows: readonly Term[] }) {
  return (
    <section>
      <h3>{title}</h3>
      <p className="faint">{blurb}</p>
      <div className="keys">
        {rows.map((r) => (
          <span className="keyrow" key={r.han + r.name}>
            <b className="cjk" style={r.colour ? { color: r.colour } : undefined}>{r.han}</b>
            <span>
              <em>{r.name}</em>
              {r.note && <i>{r.note}</i>}
            </span>
            {r.art && <span className="art"><Svg html={icon(r.art, 26)} /></span>}
          </span>
        ))}
      </div>
    </section>
  );
}

export function Key({ onClose }: { onClose: () => void }) {
  return (
    <div className="help key">
      <h2>{KEY.title}</h2>
      <p className="faint" style={{ fontSize: 13.5, marginTop: 0 }}>{KEY.blurb}</p>
      {GROUPS.map((g) => <Group key={g.title} title={g.title} blurb={g.blurb} rows={g.rows} />)}
      <button className="act" style={{ marginTop: 4 }} onClick={onClose}>
        閉 <span>{KEY.close}</span>
      </button>
    </div>
  );
}
