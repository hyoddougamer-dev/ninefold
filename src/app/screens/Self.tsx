import { BANDS, STAT_HAN, STAT_NAME, type Stat } from '../../data/mountain.ts';
import { PHASE_LIGHT } from '../../art/palette.ts';
import { figureMark } from '../../art/cultivator.ts';
import { footing, reachable } from '../../sim/camp.ts';
import { SERVER, YOU } from '../mock.ts';
import { Svg } from '../ui/Svg.tsx';

const GOVERNS: Record<Stat, string> = {
  body: 'endurance against cold and thin air',
  qi: 'how fast qi gathers, at every altitude',
  spirit: 'resistance to the storms above the frost line',
  bone: 'what holds under the weight of the mountain',
  intent: 'footing on ledges, and the edge against beasts',
};

const ORDER: readonly Stat[] = ['body', 'qi', 'spirit', 'bone', 'intent'];

/**
 * 身 Self — the build.
 *
 * A stat screen in an idle game usually says nothing: every point is good, so there is
 * no decision in it. Here each stat is named by the altitudes that demand it, so raising
 * one is visibly a choice about *which part of the mountain you intend to live on*.
 */
export function Self() {
  const overnight = reachable(YOU.stats, 12, SERVER.frontier);
  const weekend = reachable(YOU.stats, 60, SERVER.frontier);

  return (
    <>
      <p className="eyebrow">身 Self · day {YOU.day}</p>
      <div className="row" style={{ alignItems: 'baseline' }}>
        <h1 className="han">{YOU.name}</h1>
        <span className="pill" style={{ color: 'var(--gold)', borderColor: 'var(--gold)' }}>
          {YOU.unspent} unspent
        </span>
      </div>
      <p className="muted" style={{ margin: '2px 0 18px', fontSize: 13 }}>
        A build is not a number. It is which part of the mountain you can sleep on.
      </p>

      <div className="card">
        <div className="row">
          <span className="muted" style={{ fontSize: 13 }}>hold overnight (12 h)</span>
          <span><Svg markup={figureMark(overnight, 22)} /> <span className="han" style={{ color: PHASE_LIGHT[BANDS[overnight - 1].phase] }}>{BANDS[overnight - 1].han}</span></span>
        </div>
        <div className="row" style={{ marginTop: 10 }}>
          <span className="muted" style={{ fontSize: 13 }}>hold a weekend (60 h)</span>
          <span><Svg markup={figureMark(weekend, 22)} /> <span className="han" style={{ color: PHASE_LIGHT[BANDS[weekend - 1].phase] }}>{BANDS[weekend - 1].han}</span></span>
        </div>
      </div>

      <h2>The five</h2>
      {ORDER.map((s) => {
        const demanded = BANDS.filter((b) => b.demands === s);
        const top = demanded[demanded.length - 1];
        const light = top ? PHASE_LIGHT[top.phase] : 'var(--jade)';
        return (
          <div key={s} className="card" style={{ marginBottom: 10 }}>
            <div className="row">
              <span>
                <span className="han" style={{ fontSize: 22, color: light, marginRight: 10 }}>{STAT_HAN[s]}</span>
                {STAT_NAME[s]}
              </span>
              <span>
                <b className="num" style={{ fontSize: 19 }}>{YOU.stats[s]}</b>
                <button className="plus" disabled={YOU.unspent === 0}>+</button>
              </span>
            </div>
            <div className="meter" style={{ margin: '11px 0 9px' }}>
              <i style={{ width: `${Math.min(100, YOU.stats[s] * 3)}%`, background: light }} />
            </div>
            <p className="muted" style={{ fontSize: 12.5, margin: 0 }}>{GOVERNS[s]}</p>
            {demanded.length > 0 && (
              <p style={{ fontSize: 12, margin: '7px 0 0', color: 'var(--dim)' }}>
                demanded by{' '}
                {demanded.map((b, i) => (
                  <span key={b.n}>
                    {i > 0 && ' · '}
                    <span className="han" style={{ color: PHASE_LIGHT[b.phase] }}>{b.han}</span>
                    <span className="num"> {footing(b.n, YOU.stats).hours < 12 ? '✕' : ''}</span>
                  </span>
                ))}
              </p>
            )}
          </div>
        );
      })}

      <h2>器 Gear</h2>
      <div className="slots">
        {['刀 blade', '袍 robe', '珮 talisman'].map((x) => (
          <div key={x} className="slot"><span className="han">{x.split(' ')[0]}</span><span>{x.split(' ')[1]}</span></div>
        ))}
      </div>
      <p className="muted" style={{ fontSize: 12.5, marginTop: 10 }}>
        Gear moves the stat the altitude demands, which is the only reason to want it.
      </p>
    </>
  );
}
