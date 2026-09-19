import { useState } from 'react';
import { exportSave, importSave, saveFileName, wipe } from '../../sim/save.ts';
import { duration, num } from '../../sim/format.ts';
import type { State } from '../../sim/state.ts';
import { SAVE } from '../copy.ts';

/**
 * 存 The save, in the player's own hands.
 *
 * There is no account and no cloud. The save lives in one browser's storage on one
 * phone, which means clearing the browser's data, losing the phone or changing phones
 * costs three months. The game cannot fix that on its own — but it can make it one tap
 * to hold a copy, and one paste to get it back.
 *
 * Copy comes before Download on purpose. A download is the nicer flow and it is the one
 * that fails: inside an app shell, an embedded viewer, or a locked-down browser the
 * page is not allowed to hand you a file, and it fails *silently*. Copying to the
 * clipboard works everywhere, so it is the one offered first and the one described.
 */
export function SavePanel({ state, onRestore, onClose }: {
  state: State;
  onRestore: (s: State) => void;
  onClose: () => void;
}) {
  const [said, setSaid] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pasting, setPasting] = useState(false);
  const [text, setText] = useState('');
  const [confirming, setConfirming] = useState(false);

  const blob = exportSave(state);
  const played = duration(Math.max(0, state.at - state.startedAt));

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(blob);
      setSaid(SAVE.copied);
    } catch {
      // No clipboard permission: show it instead, so there is always a way through.
      setPasting(true);
      setText(blob);
      setSaid(SAVE.copyByHand);
    }
    setError(null);
  };

  const download = () => {
    try {
      const url = URL.createObjectURL(new Blob([blob], { type: 'application/json' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = saveFileName(state);
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setSaid(SAVE.downloaded);
    } catch {
      setError(SAVE.noDownload);
    }
  };

  const restore = () => {
    const { state: next, error: why } = importSave(text, state.at);
    if (!next) {
      setError(why);
      return;
    }
    onRestore(next);
    setSaid(SAVE.restored(next.realm));
    setError(null);
    setPasting(false);
    setText('');
  };

  return (
    <div className="help">
      <h2>存 {SAVE.title}</h2>

      <dl className="stat">
        <dt>{SAVE.played}</dt><dd>{played}</dd>
        <dt>{SAVE.reached}</dt><dd>realm {state.realm}, layer {Math.min(state.layer + 1, 9)}</dd>
        <dt>{SAVE.gear}</dt><dd>{num(state.chest.length)} in the chest</dd>
      </dl>

      <p className="says">{SAVE.why}</p>

      <div className="saverow">
        <button className="act" onClick={copy}>複 <span>{SAVE.copy}</span></button>
        <button className="act ghost" onClick={download}>下 <span>{SAVE.download}</span></button>
      </div>

      <button className="act ghost" onClick={() => { setPasting(!pasting); setText(''); setSaid(null); setError(null); }}>
        入 <span>{SAVE.restoreOpen}</span>
      </button>

      {pasting && (
        <>
          <textarea
            className="paste"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={SAVE.pastePlaceholder}
            spellCheck={false}
            rows={5}
          />
          <button className="act" disabled={text.trim().length < 20} onClick={restore}>
            復 <span>{SAVE.restore}</span>
          </button>
        </>
      )}

      {said && <p className="good">{said}</p>}
      {error && <p className="bad">{error}</p>}

      <p className="says small" style={{ marginTop: 'auto' }}>{SAVE.spare}</p>

      {!confirming ? (
        <button className="act danger" onClick={() => setConfirming(true)}>
          滅 <span>{SAVE.wipe}</span>
        </button>
      ) : (
        <>
          <p className="bad">{SAVE.wipeSure}</p>
          <div className="saverow">
            <button className="act danger" onClick={() => { wipe(); location.reload(); }}>
              滅 <span>{SAVE.wipeYes}</span>
            </button>
            <button className="act ghost" onClick={() => setConfirming(false)}>
              退 <span>{SAVE.wipeNo}</span>
            </button>
          </div>
        </>
      )}

      <button className="act" onClick={onClose}>閉 <span>{SAVE.close}</span></button>
    </div>
  );
}
