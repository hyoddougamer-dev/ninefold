import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BEASTS, type Beast } from '../data/bestiary.ts';
import { realm as realmOf } from '../data/realms.ts';
import { beastPower, currentWarden, fight, loot, type Outcome } from '../sim/combat.ts';
import { newState, power, type State } from '../sim/state.ts';
import { duration, num } from '../sim/format.ts';
import { load, save } from '../sim/save.ts';
import { advance } from '../sim/time.ts';
import { portrait, seal } from '../art/aura.ts';
import { Bestiary } from './screens/Bestiary.tsx';
import { Hunt } from './screens/Hunt.tsx';
import { Cultivate } from './screens/Cultivate.tsx';
import { Svg } from './ui/Svg.tsx';

const TABS = [
  { key: 'cultivate', han: '修', label: 'Cultivate' },
  { key: 'hunt', han: '狩', label: 'Hunt' },
  { key: 'bestiary', han: '錄', label: 'Bestiary' },
] as const;

type TabKey = (typeof TABS)[number]['key'];

const now = () => Date.now() / 1000;

interface Fight {
  readonly beast: Beast;
  readonly outcome: Outcome;
  readonly round: number;
  readonly over: boolean;
}

interface Homecoming {
  readonly seconds: number;
  readonly qi: number;
  readonly layers: number;
  readonly realms: number;
}

export function App() {
  const [tab, setTab] = useState<TabKey>('cultivate');
  const [state, setState] = useState<State>(() => newState(now()));
  const [battle, setBattle] = useState<Fight | null>(null);
  const [home, setHome] = useState<Homecoming | null>(null);
  const [pulse, setPulse] = useState(0);
  const [ready, setReady] = useState(false);
  const loaded = useRef(false);

  // 歸 The return. An idle game is played closed, so opening the app is first of all
  // receiving the hours that passed — and the player wants to see that before anything.
  useEffect(() => {
    if (loaded.current) return;
    loaded.current = true;
    const r = load(now());
    setState(r.state);
    setReady(true);
    if (r.secondsAway > 120) {
      setHome({
        seconds: r.secondsAway, qi: r.qiEarned,
        layers: r.layersOpened, realms: r.realmsClimbed,
      });
    }
  }, []);

  // The clock. Time moves by timestamp, never by frame: this interval only asks what
  // time it is, and `advance` does the rest — so dropped frames lose no progress.
  useEffect(() => {
    if (!ready) return;
    const id = setInterval(() => {
      setState((s) => advance(s, now()));
      setPulse((p) => (p + 0.02) % 1);
    }, 200);
    return () => clearInterval(id);
  }, [ready]);

  /**
   * Save, but never before loading.
   *
   * `ready` is not caution: without it this effect runs once with the empty initial
   * state and its cleanup writes that emptiness over the loaded save, wiping the run of
   * anyone who opens the app. It happened, and that is how it was found.
   */
  useEffect(() => {
    if (!ready) return;
    const id = setInterval(() => save(state), 4000);
    const onLeave = () => save(state);
    document.addEventListener('visibilitychange', onLeave);
    window.addEventListener('pagehide', onLeave);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onLeave);
      window.removeEventListener('pagehide', onLeave);
      save(state);
    };
  }, [state, ready]);

  const startFight = useCallback((beast: Beast) => {
    setBattle((current) => {
      if (current) return current;   // one fight at a time
      return {
        beast,
        outcome: fight(state, beast, Math.floor(now() * 1000) >>> 0),
        round: 0,
        over: false,
      };
    });
  }, [state]);

  // The rounds are already computed; this only draws them, one at a time.
  useEffect(() => {
    if (!battle || battle.over) return;
    const id = setTimeout(() => {
      setBattle((b) => {
        if (!b) return b;
        const next = b.round + 1;
        return next >= b.outcome.rounds.length
          ? { ...b, round: b.outcome.rounds.length - 1, over: true }
          : { ...b, round: next };
      });
    }, 260);
    return () => clearTimeout(id);
  }, [battle]);

  const closeFight = useCallback(() => {
    if (!battle) return;
    const { beast, outcome } = battle;
    if (outcome.won) {
      setState((s) => ({
        ...s,
        wardenFell: beast.warden ? true : s.wardenFell,
        materials: s.materials + (beast.warden ? loot(beast) * 4 : loot(beast)),
        killed: { ...s.killed, [beast.key]: (s.killed[beast.key] ?? 0) + 1 },
      }));
    }
    setBattle(null);
  }, [battle]);

  const r = realmOf(state.realm);
  const round = battle?.outcome.rounds[battle.round];
  const byKey = useMemo(
    () => Object.fromEntries(BEASTS.map((b) => [b.key, b])) as Record<string, Beast>,
    [],
  );

  return (
    <div className="app">
      <div className="sheet" key={tab}>
        {tab === 'cultivate' && (
          <Cultivate
            state={state}
            pulse={pulse}
            set={setState}
            onFight={() => startFight(currentWarden(state))}
          />
        )}
        {tab === 'hunt' && <Hunt state={state} onFight={(key) => startFight(byKey[key])} />}
        {tab === 'bestiary' && <Bestiary state={state} />}
      </div>

      <nav className="tabs">
        {TABS.map((t) => (
          <button key={t.key} data-on={tab === t.key} onClick={() => setTab(t.key)}>
            <span className="g cjk">{t.han}</span>
            <span className="l">{t.label}</span>
          </button>
        ))}
      </nav>

      {battle && round && (
        <div className="arena">
          <div className="side">
            <div className="fig">
              <Svg html={portrait({ realm: state.realm, pulse, focus: true })} />
            </div>
            <div className="row" style={{ fontSize: 12.5 }}>
              <span className="cjk" style={{ color: r.colour }}>{r.han}</span>
              <span className="mono faint">力 {num(battle.outcome.playerPower)}</span>
            </div>
            <div className="hp">
              <i style={{ width: `${round.playerHealth * 100}%`, background: 'var(--cyan)' }} />
            </div>
          </div>

          <div className="versus">{battle.over ? '' : `round ${battle.round + 1}`}</div>

          <div className="side">
            <div className="fig">
              <span><Svg html={seal(battle.beast.icon, realmOf(battle.beast.realm).colour, !!battle.beast.warden)} /></span>
            </div>
            <div className="row" style={{ fontSize: 12.5 }}>
              <span className="cjk" style={{ color: realmOf(battle.beast.realm).colour }}>{battle.beast.han}</span>
              <span className="mono faint">力 {num(beastPower(battle.beast))}</span>
            </div>
            <div className="hp">
              <i style={{ width: `${round.beastHealth * 100}%`, background: 'var(--magenta)' }} />
            </div>
          </div>

          {battle.over && (
            <div className="verdict">
              <span className="han" style={{ color: battle.outcome.won ? 'var(--cyan)' : 'var(--magenta)' }}>
                {battle.outcome.won ? '勝' : '敗'}
              </span>
              <p>
                {battle.outcome.won
                  ? battle.beast.warden
                    ? 'The warden has fallen. The breakthrough is open.'
                    : `+${num(loot(battle.beast))} material.`
                  : 'Nothing was lost. Come back with more power.'}
              </p>
              <button className="act" style={{ marginTop: 16 }} onClick={closeFight}>
                {battle.outcome.won ? '收' : '退'}{' '}
                <span>{battle.outcome.won ? 'Collect' : 'Withdraw'}</span>
              </button>
            </div>
          )}
        </div>
      )}

      {home && (
        <div className="back">
          <Svg html={portrait({ realm: state.realm, pulse })} style={{ display: 'block', width: 150, height: 150 }} />
          <h2 style={{ color: r.colour }}>歸</h2>
          <p className="faint" style={{ margin: 0, fontSize: 14 }}>
            You were away {duration(home.seconds)}.
          </p>
          <dl>
            <dt>qi gathered</dt>
            <dd style={{ color: r.colour }}>{num(home.qi)}</dd>
            {home.layers > 0 && (<><dt>layers opened</dt><dd>{home.layers}</dd></>)}
            {home.realms > 0 && (<><dt>realms climbed</dt><dd style={{ color: 'var(--magenta)' }}>{home.realms}</dd></>)}
            <dt>power now</dt>
            <dd>{num(power(state))}</dd>
          </dl>
          <button className="act" style={{ maxWidth: 240 }} onClick={() => setHome(null)}>
            續 <span>Continue</span>
          </button>
        </div>
      )}
    </div>
  );
}
