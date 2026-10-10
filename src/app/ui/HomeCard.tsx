import { RETURN, READY } from '../copy.ts';
import { duration, num } from '../../sim/format.ts';
import { power, type State } from '../../sim/state.ts';
import { portraitLayers } from '../../art/aura.ts';
import { workshopLines } from '../away.ts';
import { TABS } from '../tabs.ts';
import type { Waiting } from '../ready.ts';
import { CountUp } from './CountUp.tsx';
import { Svg } from './Svg.tsx';
import type { Away } from '../../sim/save.ts';

/** What the hours away gave, shown when the game is opened after a long while away. */
export interface HomeTally {
  readonly seconds: number;
  readonly qi: number;
  readonly climbed: number;
  readonly layers: number;
  readonly realms: number;
  readonly crafts: Away | null;
}

export function HomeCard({ state, pulse, home, waiting, goReady, colour, onContinue }: {
  state: State;
  pulse: number;
  home: HomeTally;
  waiting: readonly Waiting[];
  goReady: (w: Waiting) => void;
  colour: string;
  onContinue: () => void;
}) {
  const r = { colour };
  return (
    <div className="back">
      {/* 勁 The qi the hours gathered comes back in as light, and the numbers count up
          to what they are rather than simply being there. */}
      <Svg className="backfig" html={portraitLayers({ realm: state.realm, pulse, who: state.self })} style={{ display: 'block', width: 150, height: 150 }} />
      <h2 style={{ color: r.colour }}>歸</h2>
      <p className="faint" style={{ margin: 0, fontSize: 14 }}>
        {RETURN.away(duration(home.seconds))}
      </p>
      <dl>
        <dt>{RETURN.qi}</dt>
        <dd style={{ color: r.colour }}><CountUp to={home.qi} delay={250} /></dd>
        {home.layers > 0 && (<><dt>{RETURN.layers}</dt><dd><CountUp to={home.layers} ms={900} delay={450} /></dd></>)}
        {home.realms > 0 && (<><dt>{RETURN.realms}</dt><dd style={{ color: 'var(--cinnabar)' }}>{home.realms}</dd></>)}
        <dt>{RETURN.power}</dt>
        <dd>{num(power(state))}</dd>
      </dl>
      {/* 階 Said out loud, because the bar is lower than they left it and the qi
          that is missing from it is standing in the rungs above. */}
      {home.climbed > 0 && (
        <p className="faint" style={{ margin: '2px 0 0', fontSize: 12.5 }}>
          {RETURN.spent(num(home.climbed))}
        </p>
      )}
      {/* 業 What the workshop did while nobody was watching it, and why it stood still
          when it did, including the nights it made nothing at all. */}
      {home.crafts && workshopLines(home.crafts).length > 0 && (
        <p className="backcraft">
          <b className="cjk">業</b> {workshopLines(home.crafts).join(' ')}
        </p>
      )}
      {/* 待 What is waiting now, each row a way straight to it. */}
      {waiting.length > 0 && (
        <div className="backwait">
          <h3>{READY.head}</h3>
          {waiting.map((w) => {
            const t = TABS.find((x) => x.key === w.tab)!;
            return (
              <button key={w.key} type="button" className="backrow" onClick={() => goReady(w)}>
                <b className="cjk">{w.han}</b>
                <span>{w.long}</span>
                <em>{READY.onTab(t.han, t.label)}</em>
              </button>
            );
          })}
        </div>
      )}
      <button className="act" style={{ maxWidth: 240 }} onClick={onContinue}>
        續 <span>Continue</span>
      </button>
    </div>
  );
}
