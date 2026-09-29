import { BESTIARY, CREDITS } from '../copy.ts';
import { AUTHORS } from '../../art/icons.generated.ts';

/**
 * 謝 Credits, from the ≡ menu. The icon line is the same one the Bestiary shows, read
 * from the same list of authors, because CC BY 3.0 asks for their names wherever the
 * icons are used.
 */
export function Credits({ onClose }: { onClose: () => void }) {
  return (
    <div className="help credits">
      <h2>{CREDITS.title}</h2>
      <p className="faint" style={{ fontSize: 14, marginTop: 0 }}>{CREDITS.lead}</p>
      <ol>
        {CREDITS.rows.map(([han, what, who]) => (
          <li key={what}>
            <span className="cjk">{han}</span>
            <span><b>{what}</b><i>{who}</i></span>
          </li>
        ))}
        <li>
          <span className="cjk">圖</span>
          <span><b>{CREDITS.iconsHead}</b><i>{BESTIARY.icons(AUTHORS.join(', '))}</i></span>
        </li>
        <li>
          <span className="cjk">感</span>
          <span><b>{CREDITS.thanksHead}</b><i>{CREDITS.thanks}</i></span>
        </li>
      </ol>
      <button className="act" style={{ marginTop: 'auto' }} onClick={onClose}>
        歸 <span>{CREDITS.back}</span>
      </button>
    </div>
  );
}
