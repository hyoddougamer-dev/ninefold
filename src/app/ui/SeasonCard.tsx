import { useState } from 'react';
import { SEASON } from '../copy.ts';
import { closedTestFileName, type ClosedTest } from '../../sim/save.ts';

/**
 * 舊 Take the closed-test copy out: to the clipboard, or as a file.
 *
 * The same two ways out as 存 the save panel, in the same order and for the same reason:
 * copying works everywhere, and a download is the one that fails silently inside an app
 * shell. When the clipboard is refused the text is shown instead, so there is always a way.
 */
function useTakeOut(old: ClosedTest) {
  const [said, setSaid] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [byHand, setByHand] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(old.text);
      setSaid(SEASON.copied);
    } catch {
      setByHand(true);
      setSaid(SEASON.copyByHand);
    }
    setError(null);
  };
  const file = () => {
    try {
      const url = URL.createObjectURL(new Blob([old.text], { type: 'text/plain' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = closedTestFileName(old);
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setSaid(SEASON.saved);
      setError(null);
    } catch {
      setError(SEASON.noFile);
    }
  };
  return { said, error, byHand, copy, file };
}

/** 舊 The closed-test cultivator in one line, with its two ways out. Shared by the card and Menu, Save. */
function Kept({ old, note }: { old: ClosedTest; note: string }) {
  const { said, error, byHand, copy, file } = useTakeOut(old);
  return (
    <div className="s0old">
      <i><span className="cjk">舊</span> {SEASON.oldHead}</i>
      <b>{SEASON.old(old.realm, old.layer, old.marks, old.rebirths)}</b>
      <p>{note}</p>
      <div className="s0take">
        <button className="act ghost" onClick={copy}>複 <span>{SEASON.copy}</span></button>
        <button className="act ghost" onClick={file}>下 <span>{SEASON.file}</span></button>
      </div>
      {byHand && (
        <textarea className="s0text" readOnly value={old.text} rows={4} spellCheck={false}
          onFocus={(e) => e.currentTarget.select()} />
      )}
      {said && <p className="s0said">{said}</p>}
      {error && <p className="s0bad">{error}</p>}
    </div>
  );
}

/**
 * 印 The seal, drawn in code so its carving is always exactly 九境 and never a character an
 * image tool invented (brief, section 2). Cinnabar is the game's own --cinnabar and the
 * only red; the splash is soot-black ink and gold leaf, never red drops.
 */
function SealPrint() {
  // Fixed, so the splash is the same on every phone and every screenshot.
  const ink: [number, number, number][] = [[18, 148, 3.4], [12, 132, 1.6], [196, 118, 2.8], [206, 140, 1.4], [40, 170, 2.2],
    [180, 168, 3], [30, 112, 1.2], [214, 104, 1.8], [100, 186, 1.6], [150, 184, 2.4], [6, 160, 1.1], [222, 160, 1.3]];
  const gold: [number, number, number][] = [[24, 124, 2.2], [204, 128, 2.4], [52, 182, 1.8], [168, 178, 2], [212, 92, 1.6],
    [10, 98, 1.4], [120, 192, 1.5], [226, 176, 1.2]];
  return (
    <svg className="s0print" viewBox="0 0 232 200" aria-hidden="true" focusable="false">
      <defs>
        <filter id="s0ink" x="-8%" y="-8%" width="116%" height="116%">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="4" result="grain" />
          <feDisplacementMap in="SourceGraphic" in2="grain" scale="3" xChannelSelector="R" yChannelSelector="G" result="ragged" />
          <feTurbulence type="fractalNoise" baseFrequency="0.13" numOctaves="3" seed="11" result="cloud" />
          <feColorMatrix in="cloud" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -16 10.6" result="voids" />
          <feComposite in="ragged" in2="voids" operator="in" />
        </filter>
      </defs>
      {/* The fall: two ghost outlines and thin dry streaks above the print. */}
      <g className="s0ghost" fill="none" stroke="#D2604E">
        <rect x="74" y="-6" width="84" height="84" rx="3" transform="rotate(-3 116 36)" opacity=".1" />
        <rect x="72" y="14" width="88" height="88" rx="3" transform="rotate(-5 116 58)" opacity=".18" />
      </g>
      <g stroke="#D2604E" strokeLinecap="round" opacity=".35">
        <line x1="84" y1="10" x2="82" y2="44" strokeWidth=".8" />
        <line x1="150" y1="4" x2="151" y2="38" strokeWidth=".6" />
        <line x1="120" y1="0" x2="119" y2="26" strokeWidth=".5" />
      </g>
      {ink.map(([x, y, r], i) => <circle key={`i${i}`} cx={x} cy={y} r={r} fill="#0D0B08" />)}
      {gold.map(([x, y, r], i) => (
        <rect key={`g${i}`} x={x - r} y={y - r} width={r * 2} height={r * 1.4} fill="#D4AF56" opacity=".9"
          transform={`rotate(${(i * 37) % 90} ${x} ${y})`} />
      ))}
      <g className="s0stamp" filter="url(#s0ink)">
        <g transform="rotate(-6 116 120)">
          <rect x="68" y="72" width="96" height="96" rx="4" fill="#D2604E" />
          <rect x="75" y="79" width="82" height="82" rx="2" fill="none" stroke="#E8D9B8" strokeWidth="2.4" />
          <text x="116" y="117" textAnchor="middle" fill="#E8D9B8" fontFamily="'Noto Serif SC', serif" fontWeight="600" fontSize="38">九</text>
          <text x="116" y="154" textAnchor="middle" fill="#E8D9B8" fontFamily="'Noto Serif SC', serif" fontWeight="600" fontSize="38">境</text>
        </g>
      </g>
    </svg>
  );
}

/**
 * 季 落印 The Seal Falls: the first open after Season 0 began.
 *
 * A full-screen card of its own (never a `.notice`, which blocks pointer events), shown
 * once on a device that retired a closed-test save, before the prologue. It shows the old
 * cultivator in one line and the two ways to take it out, then hands over to the
 * beginning a new player gets. When the copy could not be kept, it has no way on: the
 * game has changed nothing and waits until the copy is safe (see save.ts, frozen).
 */
export function SeasonCard({ old, sky, onBegin }: {
  old: ClosedTest;
  sky: string | null;
  onBegin: () => void;
}) {
  return (
    <div className="season0" role="dialog" aria-modal="true" aria-labelledby="s0title">
      <div className="s0art">
        {sky && <div className="s0sky" aria-hidden="true" style={{ backgroundImage: `url(${sky})` }} />}
        <SealPrint />
        <p className="s0mark"><b>{SEASON.sealName}</b><span>{SEASON.sealSeason}</span></p>
      </div>
      <div className="s0body">
        <p className="s0over">{SEASON.over}</p>
        <h2 id="s0title">{SEASON.name} <span className="cjk">{SEASON.han}</span></h2>
        <p className="s0line">{SEASON.line}</p>
        <p className="s0says">{SEASON.says}</p>
        <Kept old={old} note={old.kept ? SEASON.kept : SEASON.notKeptYet} />
        <div className="s0acts">
          {old.kept ? (
            <>
              <button className="act" onClick={onBegin}>始 <span>{SEASON.begin}</span></button>
              <p className="s0later">{SEASON.later}</p>
            </>
          ) : (
            <>
              <p className="s0bad">{SEASON.notKept}</p>
              <button className="act" onClick={() => location.reload()}>再 <span>{SEASON.retry}</span></button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/** 舊 Menu, Save, Closed test: the same line and the same two buttons, for as long as the copy is kept. */
export function ClosedTestRow({ old }: { old: ClosedTest }) {
  return (
    <section className="s0kept">
      <h3><span className="cjk">舊</span> {SEASON.panelHead}</h3>
      <Kept old={old} note={SEASON.panelNote} />
    </section>
  );
}
