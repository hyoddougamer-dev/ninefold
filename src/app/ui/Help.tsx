import { FIGURE, GUIDE, HELP, KEYS } from '../copy.ts';

/**
 * 引 How to play, in four promises.
 *
 * Every step is one bold line and one thin line under it, and none of them is an
 * instruction: 引 the guide teaches the doing, one step at a time, by making the player
 * do it. What is left here is only what cannot be shown. That leaving costs nothing,
 * that staying pays, that losing is free, and where to look a character up.
 */
export function Help({ onClose, onReopenGuide, onWhom }: {
  onClose: () => void;
  /** 相 Ask again who is climbing. Always there, because the answer is never final. */
  onWhom?: () => void;
  /** 引 Only there when the guide has been put away, which is the only time it means
   *  anything. A button offering to bring back something already on the screen is
   *  worse than no button. */
  onReopenGuide?: () => void;
}) {
  return (
    <div className="help howto">
      <h2>{HELP.title}</h2>
      <ol>
        {HELP.steps.map(([title, line], i) => (
          <li key={title}>
            <span className="cjk">{HELP.seals[i]}</span>
            <span><b>{title}</b><i>{line}</i></span>
          </li>
        ))}
      </ol>
      {[HELP.opens, HELP.hunt].filter(Boolean).map((line) => (
        <p key={line} className="faint" style={{ fontSize: 13.5, margin: 0 }}>{line}</p>
      ))}
      {/* 鍵 The keys, on a device that has them. The block is drawn always and shown only
          to a fine pointer (see .howto .hkeys), so a phone never reads a list of keys it
          does not have. */}
      <section className="hkeys" aria-label={KEYS.head}>
        <h3>{KEYS.head}</h3>
        <dl>
          {KEYS.rows.map(([k, says]) => (
            <div key={k + says}><dt><kbd>{k}</kbd></dt><dd>{says}</dd></div>
          ))}
        </dl>
      </section>
      {onReopenGuide && (
        <div className="card" style={{ marginTop: 4 }}>
          <p className="faint" style={{ margin: '0 0 10px', fontSize: 13 }}>{GUIDE.reopenNote}</p>
          <button className="act" onClick={onReopenGuide}>
            引 <span>{GUIDE.reopen}</span>
          </button>
        </div>
      )}
      {onWhom && (
        <button className="act" onClick={onWhom}>
          相 <span>{FIGURE.change}</span>
        </button>
      )}
      <button className="act" style={{ marginTop: 'auto' }} onClick={onClose}>
        始 <span>{HELP.begin}</span>
      </button>
    </div>
  );
}
