import { BANDS } from '../../data/mountain.ts';
import { PHASE_LIGHT } from '../../art/palette.ts';
import { mountain, type Camp } from '../../art/mountain.ts';
import { fmt } from '../../sim/camp.ts';
import { SERVER, YOU } from '../mock.ts';
import { Svg } from '../ui/Svg.tsx';
import { seeded } from '../../art/rng.ts';

/** Scatter the server's population across the crests it actually occupies. */
function camps(): Camp[] {
  const rnd = seeded('server');
  const out: Camp[] = [];
  SERVER.population.forEach((n, i) => {
    const shown = Math.min(22, Math.round(Math.sqrt(n) / 2));
    for (let k = 0; k < shown; k++) out.push({ band: i + 1, at: 0.06 + rnd() * 0.88 });
  });
  out.push({ band: YOU.band, at: 0.5, you: true });
  return out;
}

/**
 * 山 The mountain — the whole server on one page.
 *
 * This screen has no controls on purpose. It is the picture the game is *about*: one
 * mountain, everyone on it, a seal across the top that nobody breaks alone.
 */
export function MountainScreen() {
  const total = SERVER.population.reduce((a, b) => a + b, 0);
  return (
    <>
      <p className="eyebrow">山 The mountain</p>
      <div className="row" style={{ alignItems: 'baseline' }}>
        <h1 className="han">九重山</h1>
        <span className="muted num" style={{ fontSize: 13 }}>{fmt(SERVER.climbers)} climbing</span>
      </div>
      <p className="muted" style={{ margin: '2px 0 14px', fontSize: 13 }}>
        One mountain. Everybody climbs it.
      </p>

      <div className="scroll">
        <Svg markup={mountain({
          frontier: SERVER.frontier,
          camps: camps(),
          offering: SERVER.offering,
          width: 448,
          bandHeight: 150,
        })} />
      </div>

      <h2>Where the server stands</h2>
      {[...BANDS].reverse().map((b) => {
        const n = SERVER.population[b.n - 1];
        const sealed = b.n > SERVER.frontier;
        const light = sealed ? 'var(--dim)' : PHASE_LIGHT[b.phase];
        return (
          <div key={b.n} style={{ margin: '0 0 11px', opacity: sealed ? 0.45 : 1 }}>
            <div className="row" style={{ marginBottom: 5 }}>
              <span style={{ fontSize: 13.5 }}>
                <span className="han" style={{ color: light, marginRight: 8 }}>{b.han}</span>
                <span className="muted">{b.name}</span>
              </span>
              <span className="num muted" style={{ fontSize: 12.5 }}>
                {sealed ? '封 sealed' : `${fmt(n)} · ×${b.yield}`}
              </span>
            </div>
            <div className="meter">
              <i style={{
                width: `${sealed ? 0 : Math.max(1.5, (n / total) * 100)}%`,
                background: b.n === YOU.band ? 'var(--gold)' : light,
              }} />
            </div>
          </div>
        );
      })}
    </>
  );
}
