import { useState } from 'react';
import { ECHO_CEILING, ECHO_LIFE_MAX, LIVES_MAX, REBIRTH_MARKS } from '../../sim/balance.ts';
import { echoOf, lifeEcho } from '../../sim/echo.ts';
import { canReincarnate, depthOf, echoAfter, lifeOf, lifeTitle } from '../../sim/rebirth.ts';
import { layersOpened, type State } from '../../sim/state.ts';
import { LAYERS } from '../../sim/balance.ts';
import { heavenAt } from '../../data/heavens.ts';
import { realm as realmOf } from '../../data/realms.ts';
import { seal } from '../../art/aura.ts';
import { REBIRTH } from '../copy.ts';
import { Svg } from './Svg.tsx';

/** 宿慧 A share as the screen says it: +5%, +7.5%. */
export const echoPct = (x: number) => `+${Number((x * 100).toFixed(1))}%`;

/** 轉世 The seal the page and the offer wear: an egg in a ring, in the summit's violet. */
const SEAL_COLOUR = '#B49AE0';

/**
 * 轉世 The page that says what a rebirth is, what this life would leave, and asks twice.
 *
 * Reached from the quiet card on 修 when a life may end, and from the Menu once it has
 * ever been possible. Everything on it is derived from the save (sim/rebirth.ts): the
 * depth, the Echo it would leave, the Echo held, the record. The confirm takes two taps,
 * as trading a card does (ui/Cards.tsx), because nothing can bring the old life back.
 * After it is done the same page says which life begins and the title it carries.
 */
export function Rebirth({ state, born, onReborn, onClose }: {
  state: State;
  /** 生 True once this visit has just begun a new life: the page says so. */
  born: boolean;
  onReborn: () => void;
  onClose: () => void;
}) {
  const [sure, setSure] = useState(false);
  const life = lifeOf(state);
  const now = echoOf(state.lives);
  const open = canReincarnate(state);
  const marks = depthOf(state);
  const leaves = lifeEcho(marks);
  const after = echoAfter(state);
  const title = lifeTitle(state);
  const heaven = state.realm === 9 ? heavenAt(state.tribulation) : null;
  const top = state.realm === 9 && layersOpened(state) >= LAYERS - 1;
  // 倍 The marks at which the next step of Echo comes: every doubling.
  const nextMarks = 2 * (marks + 1) - 1;

  if (born) {
    return (
      <div className="help rebirthsheet" data-born="true">
        <span className="rb-seal"><Svg html={seal('cosmic-egg', SEAL_COLOUR, true)} /></span>
        <h2><span className="cjk">轉世</span> {REBIRTH.bornHead(life)}</h2>
        {title && (
          <p className="rb-title"><i>{REBIRTH.wear}</i><b><span className="cjk">{title.han}</span> {title.name}</b></p>
        )}
        <p className="rb-says">{REBIRTH.born(echoPct(now))}</p>
        <div className="rb-meter" aria-hidden="true">
          <span className="rb-now" style={{ transform: `scaleX(${now / ECHO_CEILING})` }} />
        </div>
        <p className="rb-note"><b className="cjk">宿慧</b> {REBIRTH.echoNow(echoPct(now), echoPct(ECHO_CEILING))}</p>
        <button className="act" onClick={onClose}>續 <span>{REBIRTH.go}</span></button>
      </div>
    );
  }

  return (
    <div className="help rebirthsheet">
      <span className="rb-seal"><Svg html={seal('cosmic-egg', SEAL_COLOUR, open)} /></span>
      <h2><span className="cjk">轉世</span> {REBIRTH.title}</h2>
      <p className="rb-says">{REBIRTH.blurb}</p>

      <section className="rb-card">
        <i className="rb-head">{REBIRTH.nowHead}</i>
        <b className="rb-big">
          <span className="cjk">世</span> {REBIRTH.lifeN(life)}
          {title && <em> · <span className="cjk">{title.han}</span> {title.name}</em>}
        </b>
        <p>
          {top ? <><span className="cjk">印</span> {REBIRTH.depth(marks)}, {heaven ? REBIRTH.inHeaven(heaven.name) : REBIRTH.atSummit}</>
            : REBIRTH.climbing(realmOf(state.realm).name)}
        </p>
        {!open && <p className="rb-shut">{life > LIVES_MAX ? REBIRTH.full : REBIRTH.locked(REBIRTH_MARKS)}</p>}
      </section>

      {open && (
        <section className="rb-card" data-tone="gold">
          <i className="rb-head">{REBIRTH.leaveHead}</i>
          <b className="rb-big rb-gold">{echoPct(leaves)}</b>
          <p>{REBIRTH.leaves(echoPct(leaves))}</p>
          <p className="rb-faint">{leaves >= ECHO_LIFE_MAX ? REBIRTH.lifeTop
            : REBIRTH.nextStep(nextMarks, echoPct(lifeEcho(nextMarks)))}</p>
        </section>
      )}

      <section className="rb-card">
        <i className="rb-head"><span className="cjk">宿慧</span> {REBIRTH.echoHead}</i>
        <div className="rb-meter" role="img" aria-label={REBIRTH.echoNow(echoPct(now), echoPct(ECHO_CEILING))}>
          {open && <span className="rb-after" style={{ transform: `scaleX(${after / ECHO_CEILING})` }} />}
          <span className="rb-now" style={{ transform: `scaleX(${now / ECHO_CEILING})` }} />
        </div>
        <p>{REBIRTH.echoNow(echoPct(now), echoPct(ECHO_CEILING))}</p>
        {open && (after >= ECHO_CEILING && now >= ECHO_CEILING
          ? <p className="rb-faint">{REBIRTH.echoCapped}</p>
          : <p className="rb-gold">{REBIRTH.echoAfter(echoPct(after))}</p>)}
        {state.lives.length > 0 && (
          <ul className="rb-past" aria-label={REBIRTH.pastHead}>
            {state.lives.map((l, i) => (
              <li key={`${i}-${l.at}`}>{REBIRTH.past(i + 1, l.marks, echoPct(lifeEcho(l.marks)))}</li>
            ))}
          </ul>
        )}
      </section>

      <section className="rb-two">
        <div className="rb-card">
          <i className="rb-head">{REBIRTH.carriesHead}</i>
          <ul className="rb-carry">
            {REBIRTH.carries.map(([han, name, says]) => (
              <li key={han}><b className="cjk">{han}</b><span><b>{name}</b> {says}</span></li>
            ))}
          </ul>
        </div>
        <div className="rb-card">
          <i className="rb-head">{REBIRTH.resetsHead}</i>
          <p>{REBIRTH.resets}</p>
        </div>
      </section>

      <p className="rb-faint rb-stay">{REBIRTH.staying}</p>

      {open && (
        <div className="rb-confirm" data-sure={sure || undefined}>
          {sure && <p className="rb-warn">{REBIRTH.sureSays}</p>}
          <button className={sure ? 'act' : 'act ghost'} data-tone={sure ? 'cinnabar' : undefined}
            onClick={() => {
              if (!sure) { setSure(true); return; }
              setSure(false);
              onReborn();
            }}>
            轉 <span>{sure ? REBIRTH.sure : REBIRTH.begin}</span>
          </button>
          {sure && (
            <button className="act ghost" onClick={() => setSure(false)}>留 <span>{REBIRTH.cancel}</span></button>
          )}
        </div>
      )}
      <button className="act ghost" onClick={onClose}>閉 <span>{REBIRTH.close}</span></button>
    </div>
  );
}
