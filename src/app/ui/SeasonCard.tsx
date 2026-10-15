import { SEASON } from '../copy.ts';
import { realm as realmOf } from '../../data/realms.ts';
import type { Farewell } from '../../sim/save.ts';
import { ForerunnerSeal } from './Forerunner.tsx';

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
 * 季 開山 The Founding: the first open after Season 0 began, on a device that held a
 * closed-test cultivator.
 *
 * A full-screen card of its own (never a `.notice`, which blocks pointer events), shown
 * before the prologue until 始 Begin is pressed. It says the old cultivator's farewell in one
 * line, the season's law, and the Cliff, and hands over to the beginning a new player gets.
 * There is nothing to take out: the save was read for its four numbers and removed.
 *
 * Its last line is the one thing the device cannot know by itself. Signed in, it is the
 * server's answer (my_standing().forerunner): the Forerunner line when it says yes, nothing
 * when it says no or has not answered. Signed out, it points to signing in, and never says the
 * server did not see this player, because from here nobody can tell.
 */
export function SeasonCard({ farewell, sky, forerunner, signedOut, onBegin }: {
  farewell: Farewell;
  sky: string | null;
  /** The server's answer for the signed-in account, or null when there is none (yet). */
  forerunner: boolean | null;
  /** Nobody is signed in on this device. */
  signedOut: boolean;
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
        <p className="s0bye">{SEASON.farewell(realmOf(farewell.realm).name, farewell.realm, farewell.layer)}</p>
        <ul className="s0law">
          {SEASON.law.map((l) => (
            <li key={l.han}><b className="cjk" aria-hidden="true">{l.han}</b><span>{l.text}</span></li>
          ))}
        </ul>
        <p className="s0cliff">{SEASON.cliff}</p>
        {forerunner === true ? (
          <div className="s0fore"><ForerunnerSeal className="s0seal" /><p>{SEASON.forerunner}</p></div>
        ) : signedOut ? (
          <p className="s0signed">{SEASON.signedOut}</p>
        ) : null}
        <div className="s0acts">
          <button className="act" onClick={onBegin}>始 <span>{SEASON.begin}</span></button>
        </div>
      </div>
    </div>
  );
}
