import { HELP } from '../copy.ts';

/**
 * 引 How to play, in four promises.
 *
 * Every step is one bold line and one thin line under it, and none of them is an
 * instruction: 引 the guide teaches the doing, one step at a time, by making the player
 * do it. What is left here is only what cannot be shown — that leaving costs nothing,
 * that staying pays, that losing is free, and where to look a character up.
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
      {[HELP.opens, HELP.hunt, HELP.slow].filter(Boolean).map((line) => (
        <p key={line} className="faint" style={{ fontSize: 13.5, margin: 0 }}>{line}</p>
      ))}
      <button className="act" style={{ marginTop: 'auto' }} onClick={onClose}>
        始 <span>{HELP.begin}</span>
      </button>
    </div>
  );
}
