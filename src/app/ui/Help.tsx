import { HELP } from '../copy.ts';

/**
 * 引 How to play, in four steps.
 *
 * Every step is one bold line and one thin line under it, and nothing on this screen
 * explains a mechanic the player is not about to touch. The words themselves live in
 * copy.ts, where they can be read all at once.
 */
export function Help({ onClose }: { onClose: () => void }) {
  return (
    <div className="help">
      <h2>{HELP.title}</h2>
      <ol>
        {HELP.steps.map(([title, line], i) => (
          <li key={title}>
            <span>{i + 1}</span>
            <span><b>{title}</b><i>{line}</i></span>
          </li>
        ))}
      </ol>
      <p className="faint" style={{ fontSize: 13.5, margin: 0 }}>{HELP.hunt}</p>
      <p className="faint" style={{ fontSize: 13.5, margin: 0 }}>{HELP.slow}</p>
      <button className="act" style={{ marginTop: 'auto' }} onClick={onClose}>
        始 <span>{HELP.begin}</span>
      </button>
    </div>
  );
}
