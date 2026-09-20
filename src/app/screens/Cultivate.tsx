import { FOCUS_MAX, LAYERS, LAYERS_PER_REALM, TRIBULATION_GAIN } from '../../sim/balance.ts';
import { currentWarden, effectiveBeastPower, odds } from '../../sim/combat.ts';
import {
  UPGRADES, UPGRADE_INFO, atCeiling, atTribulation, breakThrough, buy, canBreakThrough,
  canBuy, canCross, capOf, crossTribulation, power, tribulationPool, upgradeCost,
  type State,
} from '../../sim/state.ts';
import { duration, num } from '../../sim/format.ts';
import { ladderDone, layersOpened, progress, rate } from '../../sim/time.ts';
import { realm as realmOf } from '../../data/realms.ts';
import { portrait, seal } from '../../art/aura.ts';
import { pool as poolArt } from '../../art/trials.ts';
import { icon } from '../../art/icon.ts';
import { Svg } from '../ui/Svg.tsx';
import { CULTIVATE } from '../copy.ts';
import { advice } from '../advice.ts';
import { isOpen } from '../../sim/unlocks.ts';

export function Cultivate({ state, pulse, focus, set, onFight, onGo }: {
  state: State;
  pulse: number;
  /** 入定 How deep this visit has gone. 1 while away, up to FOCUS_MAX while watched. */
  focus: number;
  set: (s: State) => void;
  onFight: () => void;
  /** 示 Where the advice points, when it points anywhere. */
  onGo: (tab: 'hunt' | 'trials' | 'dao' | 'gear') => void;
}) {
  const r = realmOf(state.realm);
  const w = currentWarden(state);
  const dragon = effectiveBeastPower(state, w);
  // 雷池 Once the last rung is open there is no layer left to fill, so the bar becomes
  // the thunder pool: two days of your own gathering, and the gate on the Dragon.
  const top = ladderDone(state);
  const pool = tribulationPool(state);
  const full = top ? atTribulation(state) : atCeiling(state);
  const ready = canBreakThrough(state);
  const crossing = canCross(state);
  const filled = top ? Math.min(1, state.qi / pool) : progress(state);
  const left = top && !full ? (pool - state.qi) / (rate(state) * focus) : 0;
  const day = Math.floor((state.at - state.startedAt) / 86_400) + 1;
  const cap = capOf(state);
  const tip = advice(state);

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

      {/* 雷池 Once the ladder runs out the portrait gives the screen over to the pool:
          the basin fills with the qi, and the bolts only come down when it is full. It
          is the same bar, drawn as the place it actually is. */}
      <div className="portrait">
        {top
          ? <Svg html={poolArt(filled, state.tribulation, pulse)} />
          : <Svg html={portrait({ realm: state.realm, pulse })} />}
      </div>

      <div className="qi">
        <div className="n mono" style={{ color: r.colour }}>{num(state.qi)}</div>
        <div className="r mono">
          +{num(rate(state) * focus)} qi / s
          {focus > 1.15 && (
            <span className="deep" data-full={focus >= FOCUS_MAX - 0.001}>
              入定 ×{focus.toFixed(1)}
            </span>
          )}
        </div>
      </div>

      <div className="bar" style={{ margin: '14px 0 6px' }}>
        <i style={{ width: `${filled * 100}%`, background: r.colour }} />
      </div>
      <div className="row" style={{ fontSize: 12 }}>
        <span className="faint">
          {top
            ? (full ? CULTIVATE.toward(num(dragon)) : CULTIVATE.poolFilling(duration(left)))
            : r.gains}
        </span>
        <span className="mono" style={{ color: 'var(--gold)' }}>材 {num(state.materials)}</span>
      </div>

      {/* 雷池 The ninth realm still has nine layers to climb before the pool takes the bar.
          The breakthrough card names the pool, so this says how far off it is. */}
      {state.realm === 9 && !top && (
        <p className="faint" style={{ margin: '8px 0 0', fontSize: 12.5 }}>{CULTIVATE.lastLayers(LAYERS - 1 - layersOpened(state))}</p>
      )}

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
          <button className="act" onClick={() => set(crossTribulation(state, dragon))}>
            渡劫 <span>Cross the tribulation</span>
          </button>
        </div>
      )}

      {/* 示 sits above the 雷印 card, not below it. The card is five lines of reference
          and the tip is the only thing on the screen that says what to do, so at the top
          of the endgame it was the one line a player had to scroll to find. */}
      {tip && (
        <button className="tip" disabled={!tip.tab} onClick={() => tip.tab && onGo(tip.tab)}>
          <b className="cjk">{tip.han}</b>
          <i>{tip.text}</i>
          {tip.tab && <em className="cjk">›</em>}
        </button>
      )}

      {top && (
        <div className="card" style={{ marginTop: 16, borderColor: r.colour }}>
          <b className="cjk" style={{ color: r.colour }}>雷印</b>
          <p className="faint" style={{ margin: '4px 0 0', fontSize: 13 }}>
            {CULTIVATE.ceiling(state.tribulation, `${(1 + TRIBULATION_GAIN).toFixed(2)}x`)}
          </p>
        </div>
      )}

      {focus > 1.15 && (
        <p className="faint" style={{ margin: '8px 0 0', fontSize: 12.5 }}>
          {focus >= FOCUS_MAX - 0.001 ? CULTIVATE.deepFull : CULTIVATE.deep}
        </p>
      )}

      <h2 className="heading">{CULTIVATE.spend}</h2>
      {UPGRADES.every((u) => state.levels[u] >= cap
        || (u === 'cores' && !isOpen(state.realm, 'cores'))) && (
        <p className="faint" style={{ margin: '0 0 8px', fontSize: 12.5 }}>{CULTIVATE.capped}</p>
      )}
      <div className="upgrades">
        {/* 妖丹 is not shown before the realm that sells it: a box you cannot use is a
            question the first realm should not be asking. */}
        {UPGRADES.filter((u) => u !== 'cores' || isOpen(state.realm, 'cores')).map((u) => {
          const i = UPGRADE_INFO[u];
          const cost = upgradeCost(state, u);
          const held = state.levels[u];
          const maxed = held >= cap;
          return (
            <button key={u} className="upg" data-full={maxed}
              disabled={!canBuy(state, u)} onClick={() => set(buy(state, u))}>
              <span className="ic"><Svg html={icon(i.icon, 22)} /></span>
              <span>
                <b>{i.han} <span className="mono faint" style={{ fontSize: 11 }}>{CULTIVATE.cap(held, cap)}</span></b>
                <i>{i.effect}</i>
              </span>
              <span className="price">
                {maxed
                  ? <b className="cjk" style={{ color: 'var(--gold)' }}>滿</b>
                  : <>
                    <b>{num(cost)}</b>
                    <i className="faint" style={{ fontStyle: 'normal', fontSize: 10, display: 'block' }}>
                      {i.currency === 'qi' ? 'qi' : '材'}
                    </i>
                  </>}
              </span>
            </button>
          );
        })}
      </div>
    </>
  );
}
