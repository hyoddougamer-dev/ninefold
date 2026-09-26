import { FIGURES } from '../../data/figures.ts';
import { portraitLayers } from '../../art/aura.ts';
import { Svg } from './Svg.tsx';
import { FIGURE } from '../copy.ts';

/**
 * 相 The one question the game asks before the climb starts.
 *
 * Bruno: *"não acho certo o cultivador ... ser apenas male, tem que existir alguma lógica
 * ou escolha."*
 *
 * 擇 Three rules, so this never becomes a character creator:
 *
 *   1. **It changes no number.** Nothing in `sim/` reads the answer. It is a painting
 *      and a name, and 修 the harnesses cannot see it at all.
 *   2. **It is never answered by the game.** A save that has not been asked carries
 *      null and draws 影 the shape, which is nobody in particular, so there is no
 *      default sitting there being wrong.
 *   3. **It is never final.** The same sheet reopens from 助 the help sheet, and a
 *      change is one tap with nothing lost.
 *
 * Each choice is drawn with the game's own portrait at the realm the player is standing
 * in, so what is being chosen is the thing that will actually be on the screen.
 */
export function Figure({ realm, sky, chosen, onPick, onClose }: {
  realm: number;
  /** 畫 The realm's painting behind the question, as on the prologue before it. */
  sky?: string | null;
  chosen: string | null;
  onPick: (key: string) => void;
  onClose: () => void;
}) {
  return (
    <div className="whom">
      {sky && <div className="wsky" aria-hidden="true" style={{ backgroundImage: `url(${sky})` }} />}
      <p className="over">{FIGURE.over}</p>
      <h2 className="cjk">{FIGURE.title}</h2>
      <p className="sub">{FIGURE.sub}</p>
      <p className="lead">{FIGURE.lead}</p>

      <div className="picks">
        {FIGURES.map((f) => (
          <button key={f.key} className="pick" data-on={chosen === f.key}
            onClick={() => onPick(f.key)}>
            <span className="face"><Svg html={portraitLayers({ realm, pulse: 0, who: f.key })} /></span>
            <b className="cjk">{f.han}</b>
            <em>{f.name}</em>
          </button>
        ))}
      </div>

      <button className="later" onClick={onClose}>{FIGURE.later}</button>
    </div>
  );
}
