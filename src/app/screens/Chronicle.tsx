import { useState } from 'react';
import {
  DEEDS, TRACKS, closest, daysIn, deedsOn, doneBy, killCount, mastered, seenBeasts,
  tally, wardensFelled, bestRefine,
} from '../../sim/deeds.ts';
import { LAYERS, LAYERS_PER_REALM } from '../../sim/balance.ts';
import { power, type State } from '../../sim/state.ts';
import { rate } from '../../sim/time.ts';
import { seals } from '../../sim/tower.ts';
import { pillsTaken } from '../../sim/furnace.ts';
import { daoSpent } from '../../sim/dao.ts';
import { BEASTS } from '../../data/bestiary.ts';
import { realm as realmOf } from '../../data/realms.ts';
import { heavenAt } from '../../data/heavens.ts';
import { num } from '../../sim/format.ts';
import { portraitLayers } from '../../art/aura.ts';
import { Svg } from '../ui/Svg.tsx';
import { CHRONICLE, ROAD } from '../copy.ts';
import { BOON_INFO, MEETINGS, meetingOf } from '../../data/meetings.ts';
import { boons, heart, pathOf, stillToCome } from '../../sim/meet.ts';
import { HEART_PATH } from '../../sim/balance.ts';

/**
 * 碑 The stele: everything this cultivator has done, on one page.
 *
 * Two halves, and they answer two different questions. 錄 the numbers answer *how far
 * have I come*: the figures a player collects in their head anyway and the game had
 * nowhere to show. 碑 the deeds answer *what is left*, and every unfinished one is a
 * bar rather than a locked box, because "two floors away" is a reason to open the app
 * tonight and a padlock is not.
 *
 * Nothing on this page pays anything. See `sim/deeds.ts` for why that is the design and
 * not an omission.
 */
export function Chronicle({ state, pulse }: { state: State; pulse: number }) {
  const r = realmOf(state.realm);
  // 境外 Above the summit the cultivator stands in a heaven, and 修 Cultivate says so at the
  // top of its screen. The stele said "standing in Tribulation" beside it, which is the
  // ninth realm's name, so the two pages disagreed about where the player is.
  const heaven = heavenAt(state.tribulation);
  const held = tally(state);
  const next = closest(state);
  const rungs = (state.realm - 1) * LAYERS_PER_REALM + state.layer + 1;

  const figures: readonly { han: string; label: string; value: string }[] = [
    { han: '日', label: CHRONICLE.day, value: `${Math.floor(daysIn(state)) + 1}` },
    // 譯 The realm's characters stood alone here ("元嬰 4"); its English name leads now.
    { han: '境', label: CHRONICLE.realmNamed(r.name), value: `${state.realm} / 9` },
    { han: '階', label: CHRONICLE.rungs, value: `${Math.min(rungs, LAYERS)} / ${LAYERS}` },
    { han: '力', label: CHRONICLE.power, value: num(power(state)) },
    { han: '氣', label: CHRONICLE.rate, value: `${num(rate(state))} / s` },
    { han: '狩', label: CHRONICLE.kills, value: num(killCount(state)) },
    { han: '見', label: CHRONICLE.seen, value: `${seenBeasts(state)} / ${BEASTS.length}` },
    { han: '通', label: CHRONICLE.mastered, value: `${mastered(state)} / ${BEASTS.length}` },
    { han: '妖', label: CHRONICLE.wardens, value: `${wardensFelled(state)} / 9` },
    { han: '塔', label: CHRONICLE.floor, value: `${state.tower}` },
    { han: '塔印', label: CHRONICLE.seals, value: `${seals(state.tower)}` },
    { han: '丹', label: CHRONICLE.pills, value: num(pillsTaken(state.brewed)) },
    { han: '煉器', label: CHRONICLE.refine, value: `${bestRefine(state)}` },
    { han: '道', label: CHRONICLE.dao, value: `${daoSpent(state.unlocked)}` },
    { han: '雷印', label: CHRONICLE.marks, value: `${state.tribulation}` },
    { han: '緣', label: CHRONICLE.met, value: `${state.met.length} / ${MEETINGS.length}` },
  ];

  return (
    <>
      <div className="row">
        <span className="faint" style={{ fontSize: 12, letterSpacing: '.14em', textTransform: 'uppercase' }}>
          碑 {CHRONICLE.title}
        </span>
        <span className="mono faint" style={{ fontSize: 13 }}>
          {held.done} / {held.all}
        </span>
      </div>

      <div className="stele">
        <span className="who"><Svg html={portraitLayers({ realm: state.realm, pulse, who: state.self })} /></span>
        <span className="said">
          <b className="cjk" style={{ color: heaven?.colour ?? r.colour }}>{heaven?.han ?? r.han}</b>
          <i>{CHRONICLE.standing(Math.floor(daysIn(state)) + 1, heaven?.name ?? r.name)}</i>
          {next && (
            <em>
              {CHRONICLE.nearest(next.han, next.name)}
              <span className="mono"> {num(next.at(state))} / {num(next.want)}</span>
            </em>
          )}
        </span>
      </div>

      <h2 className="heading">{CHRONICLE.figures}</h2>
      <div className="figures">
        {figures.map((f) => (
          <span key={f.han + f.label} className="fig">
            <b className="cjk">{f.han}</b>
            <em className="mono">{f.value}</em>
            <i>{f.label}</i>
          </span>
        ))}
      </div>

      <Road state={state} />

      {TRACKS.map((t) => {
        const deeds = deedsOn(t.key);
        const done = deeds.filter((d) => doneBy(state, d)).length;
        return (
          <div key={t.key}>
            <h2 className="heading">
              {t.han} {t.name}
              <span className="mono faint" style={{ fontSize: 12, marginLeft: 'auto', fontWeight: 400 }}>
                {done} / {deeds.length}
              </span>
            </h2>
            <div className="deeds">
              {deeds.map((d) => {
                const at = d.at(state);
                const got = at >= d.want;
                return (
                  <div key={d.key} className="deed" data-got={got}>
                    <b className="cjk">{d.han}</b>
                    <span className="body">
                      <em>{d.name}</em>
                      <i>{d.line}</i>
                      {!got && (
                        <span className="bar">
                          <i style={{ width: `${Math.min(100, (at / d.want) * 100)}%`, background: r.colour }} />
                        </span>
                      )}
                    </span>
                    <span className="mono n">
                      {got ? <b className="cjk">成</b> : <>{num(at)}<i>/{num(d.want)}</i></>}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      <p className="faint" style={{ margin: '16px 0 0', fontSize: 12.5 }}>{CHRONICLE.rule}</p>
      <p className="faint" style={{ margin: '8px 0 0', fontSize: 12.5 }}>
        {CHRONICLE.counted(DEEDS.length)}
      </p>
    </>
  );
}

/**
 * 緣 The road, as this cultivator has walked it: where the heart leans, what stayed, and
 * everybody met with the answer they were given.
 *
 * 心 The scale runs from 狠 hard on the left to 仁 kind on the right, with the two marks
 * where a path begins. It is drawn and not numbered: the buttons never said which way
 * an answer leaned, and a number here would turn the road into a score to aim at.
 */
const ROAD_FIRST = 6;

function Road({ state }: { state: State }) {
  const h = heart(state);
  const path = pathOf(state);
  const span = HEART_PATH * 3;
  const at = (x: number) => `${50 + (Math.max(-span, Math.min(span, x)) / span) * 50}%`;
  const kept = [...boons(state)];
  const back = stillToCome(state);
  // 遇 The newest few, and the rest behind one tap: by the ninth heaven it is thirty.
  const [all, setAll] = useState(false);
  const shown = [...state.met].reverse().slice(0, all ? undefined : ROAD_FIRST);
  return (
    <div className="road">
      <h2 className="heading">{ROAD.head}</h2>
      <div className="rheart" data-path={path}>
        <b className="rlabel">{ROAD.heart}</b>
        <span className="rscale" aria-hidden="true">
          <i className="rgate" style={{ left: at(-HEART_PATH) }} />
          <i className="rgate" style={{ left: at(HEART_PATH) }} />
          <i className="rdot" style={{ left: at(h) }} />
        </span>
        <span className="rends"><em>{ROAD.hard}</em><em>{ROAD.kind}</em></span>
        <p>{ROAD.path[path]}</p>
      </div>

      <b className="rsub">{ROAD.boonsHead}</b>
      {kept.length === 0 ? <p className="rnone">{ROAD.noBoons}</p> : (
        <div className="rboons">
          {kept.map((k) => (
            <span key={k} className="rboon">
              <b className="cjk">{BOON_INFO[k].han}</b>
              <em>{BOON_INFO[k].name}</em>
              <i>{BOON_INFO[k].what}</i>
            </span>
          ))}
        </div>
      )}

      <b className="rsub">{ROAD.metHead(state.met.length, MEETINGS.length)}</b>
      {state.met.length === 0 ? <p className="rnone">{ROAD.none}</p> : (
        <ol className="rmet">
          {shown.map((k) => {
            const m = meetingOf(k);
            if (!m) return null;
            const c = state.chose[k];
            return (
              <li key={k}>
                <b className="cjk">{m.han}</b>
                <span>
                  <em>{m.name}</em>
                  <i>{c === undefined ? ROAD.older : ROAD.youChose(m.picks[c].label)}</i>
                </span>
              </li>
            );
          })}
        </ol>
      )}
      {state.met.length > ROAD_FIRST && (
        <button className="act ghost small rmore" onClick={() => setAll((x) => !x)}>
          遇 <span>{all ? ROAD.fewer : ROAD.all(state.met.length)}</span>
        </button>
      )}
      {back > 0 && <p className="rback">{ROAD.toCome(back)}</p>}
    </div>
  );
}
