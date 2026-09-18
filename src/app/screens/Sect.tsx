import { BANDS } from '../../data/mountain.ts';
import { PHASE_LIGHT } from '../../art/palette.ts';
import { figureMark } from '../../art/cultivator.ts';
import { fmt } from '../../sim/camp.ts';
import { SECT, SERVER } from '../mock.ts';
import { Svg } from '../ui/Svg.tsx';

/**
 * 宗 The sect, and the seal.
 *
 * This is the online layer, and it is deliberately the least demanding one that still
 * changes the game: nothing here happens in real time, nothing here can be lost, and a
 * player who never speaks to anyone still receives the band the offering opens. The
 * risk with a shared frontier is that a solo player feels like a rounding error — so
 * what the offering buys is the same for everybody, and only the *credit* is ranked.
 */
export function Sect() {
  const next = BANDS[SERVER.frontier];
  const pct = Math.round(SERVER.offering * 100);

  return (
    <>
      <p className="eyebrow">宗 Sect</p>
      <div className="row" style={{ alignItems: 'baseline' }}>
        <h1 className="han">{SECT.han}</h1>
        <span className="muted num" style={{ fontSize: 13 }}>rank {SECT.rank} · {SECT.members} members</span>
      </div>
      <p className="muted" style={{ margin: '2px 0 18px', fontSize: 13 }}>{SECT.name}</p>

      <div className="card seal">
        <div className="row">
          <span className="han" style={{ fontSize: 30, color: 'var(--cinnabar)' }}>封</span>
          <span style={{ textAlign: 'right' }}>
            <span className="muted" style={{ fontSize: 11.5, letterSpacing: '.16em', textTransform: 'uppercase' }}>
              next band
            </span>
            <br />
            <span className="han" style={{ fontSize: 20, color: PHASE_LIGHT[next.phase] }}>{next.han}</span>
            <span className="muted" style={{ fontSize: 13 }}> {next.name}</span>
          </span>
        </div>

        <div className="meter" style={{ margin: '16px 0 9px', height: 7 }}>
          <i style={{ width: `${pct}%`, background: 'var(--gold)' }} />
        </div>
        <div className="row">
          <span className="num" style={{ color: 'var(--gold)' }}>{fmt(SERVER.offered)}</span>
          <span className="num muted">{fmt(SERVER.needed)} to break the seal</span>
        </div>
        <p className="muted" style={{ fontSize: 12.5, margin: '12px 0 0' }}>
          The offering is the whole server's, not this sect's. When it breaks,{' '}
          <span className="han" style={{ color: PHASE_LIGHT[next.phase] }}>{next.han}</span> opens for
          everyone climbing — including everyone who gave nothing.
        </p>
      </div>

      <div className="row" style={{ gap: 10, marginTop: 14 }}>
        <button className="act" data-kind="up"><b className="han">獻</b>Offer qi</button>
      </div>

      <h2>Who has given</h2>
      {SECT.contributors.map((c, i) => (
        <div key={c.name} className="row give" data-you={!!c.you}>
          <span className="num muted" style={{ width: 18, fontSize: 12.5 }}>{i + 1}</span>
          <Svg markup={figureMark(c.band, 26)} />
          <span style={{ flex: 1 }}>
            <span className="han">{c.name}</span>
            <span className="muted" style={{ fontSize: 12, marginLeft: 8 }}>
              <span className="han" style={{ color: PHASE_LIGHT[BANDS[c.band - 1].phase] }}>
                {BANDS[c.band - 1].han}
              </span>
            </span>
          </span>
          <span className="num" style={{ color: c.you ? 'var(--gold)' : 'var(--bone)', fontSize: 13.5 }}>
            {fmt(c.given)}
          </span>
        </div>
      ))}
      <p className="muted" style={{ fontSize: 12.5, marginTop: 14 }}>
        Nothing here is spent against another player. There is no arena, no raid timer and
        nobody to be online for — the sect is a place to put qi you were not going to
        spend on yourself.
      </p>
    </>
  );
}
