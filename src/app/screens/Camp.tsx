import { BANDS, STAT_HAN, STAT_NAME } from '../../data/mountain.ts';
import { PHASE_LIGHT } from '../../art/palette.ts';
import { cultivator } from '../../art/cultivator.ts';
import { mountain } from '../../art/mountain.ts';
import { fmt, fmtHours, footing } from '../../sim/camp.ts';
import { SERVER, YOU } from '../mock.ts';
import { Svg } from '../ui/Svg.tsx';

/** How long a player expects to be away. The footing readout is judged against it. */
const A_NIGHT = 12;

/**
 * 營 The camp — the home screen, and the whole game in one view.
 *
 * Everything here exists to make one question answerable at a glance: *can I close the
 * app right now and still be standing here when I come back?* The yield says what the
 * altitude pays, the pressure says what it charges, and the footing bar says how long
 * the bet lasts. Nothing else belongs on this screen.
 */
export function Camp() {
  const here = footing(YOU.band, YOU.stats);
  const above = YOU.band < BANDS.length ? footing(YOU.band + 1, YOU.stats) : null;
  const below = YOU.band > 1 ? footing(YOU.band - 1, YOU.stats) : null;
  const band = here.band;
  const light = PHASE_LIGHT[band.phase];

  const safe = here.hours >= A_NIGHT * 2;
  const tight = !safe && here.hours >= A_NIGHT;
  const tone = safe ? 'var(--jade)' : tight ? 'var(--gold)' : 'var(--cinnabar)';
  const strain = Math.max(0, Math.min(1, (A_NIGHT * 2 - here.hours) / (A_NIGHT * 2)));

  // The backdrop is the real mountain, scrolled to the altitude the player is standing at.
  const bh = 150;
  const crestY = 120 + (BANDS.length - YOU.band) * bh;

  const climbable = above && YOU.band + 1 <= SERVER.frontier;

  return (
    <>
      <p className="eyebrow">營 Camp · day {YOU.day}</p>
      <div className="row" style={{ alignItems: 'baseline' }}>
        <h1 className="han" style={{ color: light }}>{band.han}</h1>
        <span className="muted num" style={{ fontSize: 13 }}>{band.n} / {BANDS.length}</span>
      </div>
      <p className="muted" style={{ margin: '2px 0 14px', fontSize: 13 }}>{band.name}</p>

      <div className="scene">
        <div className="scene-bg" style={{ top: 96 - crestY }}>
          <Svg markup={mountain({ frontier: SERVER.frontier, bandHeight: bh, width: 448 })} />
        </div>
        <div className="scene-fig">
          <Svg markup={cultivator({ band: YOU.band, size: 190, strain })} />
        </div>
      </div>

      <div className="card" style={{ marginTop: 14 }}>
        <div className="row">
          <span><span className="han" style={{ color: light }}>産</span> <span className="muted">yield</span></span>
          <span className="num"><b style={{ color: 'var(--gold)' }}>{fmt(here.rate)}</b> <span className="muted">qi / h</span> · ×{band.yield}</span>
        </div>
        <div className="row" style={{ marginTop: 9 }}>
          <span><span className="han" style={{ color: 'var(--cinnabar)' }}>壓</span> <span className="muted">pressure</span></span>
          <span className="num">
            {band.pressure} / h <span className="muted">against</span>{' '}
            <span className="han" style={{ color: light }}>{here.demanded ? STAT_HAN[here.demanded] : '—'}</span>{' '}
            {here.demanded ? STAT_NAME[here.demanded] : ''} {here.have}
          </span>
        </div>

        <div className="meter" style={{ margin: '14px 0 8px' }}>
          <i style={{ width: `${Math.min(100, (here.hours / 72) * 100)}%`, background: tone }} />
        </div>
        <div className="row">
          <span style={{ color: tone }}>footing holds <b className="num">{fmtHours(here.hours)}</b></span>
          <span className="pill" style={{ color: tone, borderColor: tone }}>
            {safe ? 'hold' : tight ? 'one night' : 'falling'}
          </span>
        </div>
        <p className="muted" style={{ fontSize: 12.5, margin: '10px 0 0' }}>
          {safe
            ? `You can close the app and come back tomorrow. Stay past ${fmtHours(here.hours)} and ${band.han} puts you back down to ${BANDS[YOU.band - 2]?.han ?? band.han}.`
            : tight
              ? `Enough for tonight, not for two. Raise ${here.demanded ? STAT_NAME[here.demanded] : 'your footing'} or camp lower before the weekend.`
              : `You are over your footing. Come back within ${fmtHours(here.hours)} or the cliff takes you down a band.`}
        </p>
      </div>

      <div className="row" style={{ marginTop: 14 }}>
        <span className="muted">banked</span>
        <span className="num" style={{ color: 'var(--gold)', fontSize: 17 }}>{fmt(YOU.qi)} qi</span>
      </div>

      <h2>Move</h2>
      <div className="row" style={{ gap: 10 }}>
        <button className="act" disabled={!below}>
          <b className="han">下</b>{below ? below.band.han : '—'}
        </button>
        <button className="act" data-kind="up" disabled={!climbable}>
          <b className="han">上</b>{above ? above.band.han : '—'}
        </button>
      </div>
      {above && (
        <p className="muted" style={{ fontSize: 12.5, marginTop: 9 }}>
          {climbable ? (
            <>
              <span className="han">{above.band.han}</span> pays ×{above.band.yield} and demands{' '}
              <span className="han">{above.demanded ? STAT_HAN[above.demanded] : ''}</span>{' '}
              {above.demanded ? STAT_NAME[above.demanded] : ''} — your footing there holds{' '}
              <b style={{ color: above.hours >= A_NIGHT ? 'var(--gold)' : 'var(--cinnabar)' }}>
                {fmtHours(above.hours)}
              </b>.
            </>
          ) : (
            <>Sealed. The server has opened as far as <span className="han">{BANDS[SERVER.frontier - 1].han}</span>.</>
          )}
        </p>
      )}
    </>
  );
}
