import { useState } from 'react';
import { CRAFT_CARRY, ECHO_CEILING, ECHO_LIFE_MAX, ECHO_ROOF, LIVES_MAX, REBIRTH_MARKS } from '../../sim/balance.ts';
import { SKILL_KEYS, levelOf } from '../../data/crafts.ts';
import { carriedXp } from '../../sim/crafts.ts';
import { echoOf, lifeEcho } from '../../sim/echo.ts';
import { canReincarnate, depthOf, echoAfter, lifeOf, lifeTitle } from '../../sim/rebirth.ts';
import { codexToKeep } from '../../sim/hundred.ts';
import { layersOpened, type State } from '../../sim/state.ts';
import { LAYERS } from '../../sim/balance.ts';
import { heavenAt } from '../../data/heavens.ts';
import { realm as realmOf } from '../../data/realms.ts';
import { seal } from '../../art/aura.ts';
import { REBIRTH } from '../copy.ts';
import { Svg } from './Svg.tsx';

/** 宿慧 A share as the screen says it: +5%, +7.5%. */
export const echoPct = (x: number) => `+${Number((x * 100).toFixed(1))}%`;

/**
 * 宿慧 The Echo as the screen says it where the tail can show: one decimal always once it is
 * past the ceiling (+31.0%, +31.3%), because there a life adds tenths of a point and a
 * rounded "+31%" before and after would say the life added nothing. Under it, as echoPct.
 */
export const echoExact = (x: number) => (x > ECHO_CEILING + 1e-9 ? `+${(x * 100).toFixed(1)}%` : echoPct(x));

/**
 * 宿慧 What a life adds to the Echo, as the screen says it: a tenth of a point is one decimal,
 * and under one point two, because past the ceiling a life adds hundredths and "+0%" would
 * say it adds nothing.
 */
export const echoAdd = (x: number) => `+${Number((x * 100).toFixed(x < 0.01 ? 2 : 1))}%`;

/** 世 How many lives the Echo card lists before it counts the rest. */
const PAST_SHOWN = 9;

/** 世 The title, with the count of the life beside it once the last name (十世) is behind. */
const titleLine = (t: { han: string; name: string; life: number }) => (
  <><span className="cjk">{t.han}</span> {t.name}{t.life > 10 && <> · {REBIRTH.lifeCount(t.life)}</>}</>
);

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
  // 尾 Past the ceiling a life adds a small step, not what it is worth: the page says both.
  const adds = after - now;
  const tailed = open && adds < leaves - 1e-9 && after < ECHO_ROOF - 1e-9;
  const title = lifeTitle(state);
  const heaven = state.realm === 9 ? heavenAt(state.tribulation) : null;
  const top = state.realm === 9 && layersOpened(state) >= LAYERS - 1;
  // 倍 The marks at which the next step of Echo comes: every doubling.
  const nextMarks = 2 * (marks + 1) - 1;
  // 譜 The sets the codex holds now, this life's and the lives before: what a new life keeps.
  const sets = codexToKeep(state).filter((r) => r > 0).length;
  // 業 Where the crafts would begin: CRAFT_CARRY of each one's experience, as levels. In the
  // born page that is the state itself, which has already been given them.
  const levels = SKILL_KEYS.map((k) => levelOf((born ? state.crafts.xp : carriedXp(state.crafts.xp))[k]));
  const lo = Math.min(...levels), hi = Math.max(...levels);
  const workshop = CRAFT_CARRY > 0 && hi > 1;

  if (born) {
    return (
      <div className="help rebirthsheet" data-born="true">
        <span className="rb-seal"><Svg html={seal('cosmic-egg', SEAL_COLOUR, true)} /></span>
        <h2><span className="cjk">轉世</span> {REBIRTH.bornHead(life)}</h2>
        {title && (
          <p className="rb-title"><i>{REBIRTH.wear}</i><b>{titleLine(title)}</b></p>
        )}
        <p className="rb-says">{REBIRTH.born(echoExact(now))}</p>
        <div className="rb-meter" aria-hidden="true">
          <span className="rb-now" style={{ transform: `scaleX(${now / ECHO_ROOF})` }} />
          <span className="rb-tick" style={{ left: `${ECHO_CEILING / ECHO_ROOF * 100}%` }} />
        </div>
        <p className="rb-note"><b className="cjk">宿慧</b> {REBIRTH.echoNow(echoExact(now), echoPct(ECHO_ROOF))}</p>
        {sets > 0 && <p className="rb-note"><b className="cjk">譜</b> {REBIRTH.bornCodex(sets)}</p>}
        {workshop && <p className="rb-note"><b className="cjk">業</b> {REBIRTH.bornWorkshop(lo, hi)}</p>}
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
        {!open && <p className="rb-shut">{life > LIVES_MAX ? REBIRTH.full(LIVES_MAX) : REBIRTH.locked(REBIRTH_MARKS)}</p>}
      </section>

      {open && (
        <section className="rb-card" data-tone="gold">
          <i className="rb-head">{REBIRTH.leaveHead}</i>
          <b className="rb-big rb-gold">{echoAdd(tailed || after >= ECHO_ROOF - 1e-9 ? adds : leaves)}</b>
          <p>{REBIRTH.leaves(echoAdd(tailed || after >= ECHO_ROOF - 1e-9 ? adds : leaves))}</p>
          {tailed || after >= ECHO_ROOF - 1e-9
            ? <p className="rb-faint">{REBIRTH.leavesTail(echoPct(leaves), echoPct(ECHO_CEILING))}</p>
            : <p className="rb-faint">{leaves >= ECHO_LIFE_MAX ? REBIRTH.lifeTop
              : REBIRTH.nextStep(nextMarks, echoPct(lifeEcho(nextMarks)))}</p>}
        </section>
      )}

      <section className="rb-card">
        <i className="rb-head"><span className="cjk">宿慧</span> {REBIRTH.echoHead}</i>
        <div className="rb-meter" role="img" aria-label={REBIRTH.echoNow(echoExact(now), echoPct(ECHO_ROOF))}>
          {open && <span className="rb-after" style={{ transform: `scaleX(${after / ECHO_ROOF})` }} />}
          <span className="rb-now" style={{ transform: `scaleX(${now / ECHO_ROOF})` }} />
          <span className="rb-tick" style={{ left: `${ECHO_CEILING / ECHO_ROOF * 100}%` }} />
        </div>
        <p>{REBIRTH.echoNow(echoExact(now), echoPct(ECHO_ROOF))}</p>
        {open && (after >= ECHO_ROOF - 1e-9 && now >= ECHO_ROOF - 1e-9
          ? <p className="rb-faint">{REBIRTH.echoCapped}</p>
          : <p className="rb-gold">{REBIRTH.echoAfter(echoExact(after))}</p>)}
        {(now >= ECHO_CEILING - 1e-9 || (open && after > ECHO_CEILING)) && (
          <p className="rb-faint">{REBIRTH.echoTail(echoPct(ECHO_CEILING), echoPct(ECHO_ROOF))}</p>
        )}
        {state.lives.length > 0 && (
          <ul className="rb-past" aria-label={REBIRTH.pastHead}>
            {state.lives.length > PAST_SHOWN && <li>{REBIRTH.pastMore(state.lives.length - PAST_SHOWN)}</li>}
            {state.lives.slice(-PAST_SHOWN).map((l, i, shown) => {
              const n = state.lives.length - shown.length + i + 1;
              return <li key={`${n}-${l.at}`}>{REBIRTH.past(n, l.marks, echoPct(lifeEcho(l.marks)))}</li>;
            })}
          </ul>
        )}
      </section>

      <section className="rb-two">
        <div className="rb-card">
          <i className="rb-head">{REBIRTH.carriesHead}</i>
          <ul className="rb-carry">
            {REBIRTH.carries.flatMap(([han, name, says]) => {
              const row = (
                <li key={han}><b className="cjk">{han}</b><span><b>{name}</b> {says}
                  {han === '譜' && sets > 0 && <em className="rb-sets"> {REBIRTH.codexSets(sets)}</em>}</span></li>
              );
              if (han !== '譜' || CRAFT_CARRY <= 0) return [row];
              // 業 The workshop's share, beside the codex it shares a screen with.
              const [wHan, wName, wSays] = REBIRTH.carriesWorkshop;
              return [row, (
                <li key={wHan}><b className="cjk">{wHan}</b><span><b>{wName}</b> {wSays(`${Math.round(CRAFT_CARRY * 100)}%`)}
                  {hi > 1 && <em className="rb-sets"> {REBIRTH.workshopLevels(lo, hi)}</em>}</span></li>
              )];
            })}
          </ul>
        </div>
        <div className="rb-card">
          <i className="rb-head">{REBIRTH.resetsHead}</i>
          <p>{CRAFT_CARRY > 0 ? REBIRTH.resets : REBIRTH.resetsAll}</p>
        </div>
      </section>

      <p className="rb-faint rb-stay">{REBIRTH.staying}</p>

      {open && (
        <div className="rb-confirm" data-sure={sure || undefined}>
          {/* 宿慧 The exact Echo the next life begins with, said before either tap: the same
              echoAfter the rebirth itself writes, so what is promised is what is carried. */}
          <p className="rb-gold rb-promise" data-echo={after}>
            {REBIRTH.promise(life + 1, echoExact(after), echoAdd(after - now))}
            {after >= ECHO_ROOF - 1e-9 && after - now < leaves - 1e-9 && <> {REBIRTH.promiseCapped(echoPct(ECHO_ROOF))}</>}
          </p>
          <p className="rb-faint rb-standing">{REBIRTH.promiseFrom(echoExact(now), echoExact(after), echoPct(ECHO_ROOF))}</p>
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
