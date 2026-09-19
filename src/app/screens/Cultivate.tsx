import { LAYERS_PER_REALM } from '../../sim/balance.ts';
import { currentWarden, effectiveBeastPower, odds } from '../../sim/combat.ts';
import {
  UPGRADES, UPGRADE_INFO, atCeiling, breakThrough, buy, canBreakThrough, canBuy,
  canCross, crossTribulation, power, tribulationReadiness, upgradeCost, type State,
} from '../../sim/state.ts';
import { num } from '../../sim/format.ts';
import { progress, rate } from '../../sim/time.ts';
import { realm as realmOf } from '../../data/realms.ts';
import { portrait, seal } from '../../art/aura.ts';
import { icon } from '../../art/icon.ts';
import { Svg } from '../ui/Svg.tsx';
import { CULTIVATE } from '../copy.ts';

export function Cultivate({ state, pulse, set, onFight }: {
  state: State;
  pulse: number;
  set: (s: State) => void;
  onFight: () => void;
}) {
  const r = realmOf(state.realm);
  const top = state.realm === 9;
  const w = currentWarden(state);
  // At the top the Dragon is always there. What the bar reads is not qi but how close
  // your power is to its — because qi is not what you wait for up there.
  const dragon = effectiveBeastPower(state, w);
  const full = top ? true : atCeiling(state);
  const ready = canBreakThrough(state);
  const crossing = canCross(state);
  const filled = top ? tribulationReadiness(state, dragon) : progress(state);
  const day = Math.floor((state.at - state.startedAt) / 86_400) + 1;

  return (
    <>
      <div className="row">
        <span className="faint" style={{ fontSize: 12, letterSpacing: '.14em', textTransform: 'uppercase' }}>
          修 Cultivate · day {day}
        </span>
        <span className="faint mono" style={{ fontSize: 12 }}>力 {num(power(state))}</span>
      </div>

      <div className="row" style={{ alignItems: 'baseline', marginTop: 4 }}>
        <h1 className="cjk" style={{ margin: 0, fontSize: 30, fontWeight: 400, color: r.colour }}>{r.han}</h1>
        <span className="faint mono" style={{ fontSize: 13 }}>
          {top
            ? <>劫 {state.tribulation} · {CULTIVATE.marks(state.tribulation)}</>
            : <>layer {Math.min(state.layer + 1, LAYERS_PER_REALM)} / {LAYERS_PER_REALM}</>}
        </span>
      </div>
      <p className="faint" style={{ margin: '1px 0 8px', fontSize: 13 }}>{r.name}</p>

      <div className="portrait">
        <Svg html={portrait({ realm: state.realm, pulse })} />
      </div>

      <div className="qi">
        <div className="n mono" style={{ color: r.colour }}>{num(state.qi)}</div>
        <div className="r mono">+{num(rate(state))} qi / s</div>
      </div>

      <div className="bar" style={{ margin: '14px 0 6px' }}>
        <i style={{ width: `${filled * 100}%`, background: r.colour }} />
      </div>
      <div className="row" style={{ fontSize: 12 }}>
        <span className="faint">
          {top ? CULTIVATE.toward(num(dragon)) : r.gains}
        </span>
        <span className="mono" style={{ color: 'var(--gold)' }}>材 {num(state.materials)}</span>
      </div>

      {full && !state.wardenFell && (
        <>
          <h2 className="heading">
            {top ? `${CULTIVATE.tribulationHead} ${state.tribulation + 1}` : CULTIVATE.wardenHead}
          </h2>
          <div className="card">
            <div className="row">
              <span className="seal" style={{ width: 52, height: 52, flex: 'none' }}>
                <Svg html={seal(w.icon, r.colour, true)} />
              </span>
              <span style={{ flex: 1 }}>
                <b className="cjk" style={{ fontSize: 17, color: r.colour, display: 'block' }}>{w.han}</b>
                <i className="faint" style={{ fontStyle: 'normal', fontSize: 12 }}>{w.name}</i>
              </span>
              <span className="tech mono" style={{ fontSize: 17, textAlign: 'right' }}>
                {Math.round(odds(state, w) * 100)}%
                <em className="faint" style={{ display: 'block', fontStyle: 'normal', fontSize: 9.5, letterSpacing: '.12em', textTransform: 'uppercase', fontFamily: 'Archivo' }}>odds</em>
              </span>
            </div>
            <p className="faint" style={{ margin: '11px 0 12px', fontSize: 12.5 }}>
              {top ? CULTIVATE.tribulation : CULTIVATE.warden}
            </p>
            <button className="act" data-tone="magenta" onClick={onFight}>
              戰 <span>Fight</span>
            </button>
          </div>
        </>
      )}

      {ready && (
        <div style={{ marginTop: 16 }}>
          <button className="act" onClick={() => set(breakThrough(state))}>
            突破 <span>Break through</span>
          </button>
        </div>
      )}

      {crossing && (
        <div style={{ marginTop: 16 }}>
          <button className="act" onClick={() => set(crossTribulation(state))}>
            渡劫 <span>Cross the tribulation</span>
          </button>
        </div>
      )}

      {top && (
        <div className="card" style={{ marginTop: 16, borderColor: r.colour }}>
          <b className="cjk" style={{ color: r.colour }}>雷印</b>
          <p className="faint" style={{ margin: '4px 0 0', fontSize: 13 }}>
            {CULTIVATE.ceiling(state.tribulation)}
          </p>
        </div>
      )}

      <h2 className="heading">{CULTIVATE.spend}</h2>
      <div className="upgrades">
        {UPGRADES.map((u) => {
          const i = UPGRADE_INFO[u];
          const cost = upgradeCost(state, u);
          return (
            <button key={u} className="upg" disabled={!canBuy(state, u)} onClick={() => set(buy(state, u))}>
              <span className="ic"><Svg html={icon(i.icon, 22)} /></span>
              <span>
                <b>{i.han} <span className="mono faint" style={{ fontSize: 11 }}>{state.levels[u]}</span></b>
                <i>{i.effect}</i>
              </span>
              <span className="price">
                <b>{num(cost)}</b>
                <i className="faint" style={{ fontStyle: 'normal', fontSize: 10, display: 'block' }}>
                  {i.currency === 'qi' ? 'qi' : '材'}
                </i>
              </span>
            </button>
          );
        })}
      </div>
    </>
  );
}
