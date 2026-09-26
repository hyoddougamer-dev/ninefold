import { LAYERS_PER_REALM } from '../../sim/balance.ts';
import { plateOf } from '../../data/bestiary.ts';
import { Plate } from './Plate.tsx';
import { pictureOf } from '../../data/pictures.ts';
import { currentWarden } from '../../sim/combat.ts';
import { type State } from '../../sim/state.ts';
import { REALMS, realm as realmOf } from '../../data/realms.ts';
import { opensIn } from '../../sim/unlocks.ts';
import { portraitLayers } from '../../art/aura.ts';
import { Svg } from './Svg.tsx';
import { REALMCARD } from '../copy.ts';
import { arriving } from '../../sim/arriving.ts';
import { pace } from '../../sim/pace.ts';
import { duration, num } from '../../sim/format.ts';

/**
 * 境 What a realm is, on one page.
 *
 * Bruno: *"Devia existir uma tooltip ou ?, a explicar o realm de forma simples e
 * estética. Sinto que está tudo muito perdido."*
 *
 * The game had the answer scattered across five places: the aura in the portrait, the
 * rungs on the ladder, the warden in a card that only appears at the very end, the
 * locked tabs saying which realm opens them, and the 開 table nobody ever sees. A
 * player standing in the third realm could not find out what the third realm *is*.
 *
 * So: tap the realm's name and this says it, in the order the questions actually get
 * asked. Where am I, what is a realm, what stands at the end of this one, what did it
 * hand me, and what is the next one worth climbing for. Nothing here is a new fact,
 * every line is read from the same tables the game plays by, so it cannot drift.
 *
 * The last block is the point of the whole page. A purely vertical game has to keep
 * saying what the climb is *for*, and the honest answer is always the same shape: the
 * next realm opens something you do not have.
 */
export function RealmCard({ state, onClose }: { state: State; onClose: () => void }) {
  const r = realmOf(state.realm);
  const w = currentWarden(state);
  const opened = opensIn(state.realm);
  const next = state.realm < REALMS.length ? realmOf(state.realm + 1) : null;
  const coming = next ? opensIn(next.n) : [];
  const sky = pictureOf('realm', String(state.realm));
  const soon = arriving(state.realm, state.layer);
  const p = pace(state);

  return (
    <div className="realmcard">
      {/* 境 The realm's own painting, behind the figure it is about. This is what the
          nine landscapes were painted for: mountains across the middle and an empty
          bottom, so the name can sit on it. A realm with no file keeps the bare
          portrait, which is what every realm looked like before. */}
      <div className="crown">
        {sky && <img className="sky" src={sky} alt="" aria-hidden="true" />}
        <Svg html={portraitLayers({ realm: state.realm, pulse: 0, who: state.self })} />
      </div>

      <h2 className="cjk" style={{ color: r.colour }}>{r.han}</h2>
      <p className="sub">
        {r.name} <span className="mono">· {REALMCARD.of(state.realm, REALMS.length)}</span>
      </p>
      <p className="faint lead">{REALMCARD.what(LAYERS_PER_REALM)}</p>

      <h3>{REALMCARD.hereHead}</h3>
      <div className="facts">
        <span><b className="mono">{Math.min(state.layer + 1, LAYERS_PER_REALM)}/{LAYERS_PER_REALM}</b><i>{REALMCARD.layers}</i></span>
        <span><b className="mono">{Math.floor((state.at - state.startedAt) / 86_400) + 1}</b><i>{REALMCARD.day}</i></span>
        <span><b className="cjk" style={{ color: r.colour }}>{r.han}</b><i>{REALMCARD.of(state.realm, REALMS.length)}</i></span>
      </div>
      <p className="faint">{r.gains}</p>

      <h3>{REALMCARD.wardenHead}</h3>
      <div className="row">
        <Plate kind="beast" subject={plateOf(w)} icon={w.icon} colour={r.colour}
          tier={2} size={46} alt={w.name} />
        <span style={{ flex: 1, minWidth: 0 }}>
          <b className="cjk" style={{ color: r.colour, display: 'block', fontSize: 16 }}>{w.han}</b>
          <i className="faint" style={{ fontStyle: 'normal', fontSize: 12.5 }}>{w.name}</i>
        </span>
      </div>
      <p className="faint">{REALMCARD.warden}</p>

      {opened.length > 0 && (
        <>
          <h3>{REALMCARD.gaveHead}</h3>
          <ul className="gives">
            {opened.map((sys) => (
              <li key={sys.key}>
                <b className="cjk">{sys.han}</b>
                <span><em>{sys.name}</em><i>{sys.gives}</i></span>
              </li>
            ))}
          </ul>
        </>
      )}

      {/* 來 What this realm still owes you, and the layer that brings it.
          A realm used to hand over everything in its first minute and then run for
          twelve days on one beast every five. Its commons, its stance and its lineage
          are spread across the layers now, and a thing that waits has to be shown
          waiting or it is a surprise rather than an arrival. */}
      {soon.length > 0 && (
        <>
          <h3>{REALMCARD.comingHead}</h3>
          <ul className="soon">
            {soon.map((a) => (
              <li key={`${a.kind}-${a.key}`} data-kind={a.kind}>
                <b className="cjk" style={{ color: r.colour }}>{a.han}</b>
                <span><em>{a.name}</em><i>{REALMCARD.comingKind[a.kind]}</i></span>
                <u className="mono">{REALMCARD.comingAt(a.layer + 1)}</u>
              </li>
            ))}
          </ul>
        </>
      )}

      {/* 階 And what the climb actually asks for, which is the number Bruno went looking
          for: how much qi a layer is, how much the whole realm is, and how long that is
          at the rate this cultivator gathers at. */}
      <h3>{REALMCARD.paceHead}</h3>
      <div className="facts pace2">
        <span>
          <b className="mono">{num(p.rung)}</b>
          <i>{REALMCARD.paceRung}</i>
        </span>
        <span>
          <b className="mono">{num(p.realm)}</b>
          <i>{REALMCARD.paceRealm}</i>
        </span>
      </div>
      <p className="faint">{REALMCARD.paceAt(duration(p.realmSeconds))}</p>
      {next && p.times !== null && (
        <p className="faint">{REALMCARD.paceNext(next.han, next.name, p.times.toFixed(0))}</p>
      )}
      <p className="faint small">{REALMCARD.paceNote}</p>

      {next && (
        <>
          <h3>{REALMCARD.nextHead}</h3>
          <div className="nextup" style={{ borderColor: next.colour }}>
            <b className="cjk" style={{ color: next.colour }}>{next.han}</b>
            <i>{next.name}</i>
            <p className="faint">
              {coming.length > 0
                ? REALMCARD.opens(coming.map((sys) => `${sys.han} ${sys.name}`).join(', '))
                : REALMCARD.opensNothing}
            </p>
            <p className="faint">{next.gains}</p>
          </div>
        </>
      )}

      <button className="act" style={{ marginTop: 18 }} onClick={onClose}>
        續 <span>{REALMCARD.back}</span>
      </button>
    </div>
  );
}
