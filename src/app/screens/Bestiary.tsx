import { BEASTS } from '../../data/bestiary.ts';
import { REALMS, realm as realmOf } from '../../data/realms.ts';
import type { State } from '../../sim/state.ts';
import { seal } from '../../art/aura.ts';
import { AUTHORS } from '../../art/icons.generated.ts';
import { Svg } from '../ui/Svg.tsx';

/**
 * 錄 The bestiary.
 *
 * Thirty-six cards that fill in. It is the collection screen and, into the bargain, the
 * cheapest answer there is to "what is new this week": a seal lighting up costs nothing
 * to produce.
 */
export function Bestiary({ state }: { state: State }) {
  const seen = BEASTS.filter((b) => (state.killed[b.key] ?? 0) > 0).length;

  return (
    <>
      <div className="row">
        <span className="faint" style={{ fontSize: 12, letterSpacing: '.14em', textTransform: 'uppercase' }}>
          錄 Bestiary
        </span>
        <span className="mono" style={{ fontSize: 13 }}>
          <span style={{ color: 'var(--cyan)' }}>{seen}</span>
          <span className="faint"> / {BEASTS.length}</span>
        </span>
      </div>

      {REALMS.map((r) => {
        const ofRealm = BEASTS.filter((b) => b.realm === r.n);
        const reached = state.realm >= r.n;
        return (
          <div key={r.n}>
            <h2 className="heading" style={{ color: reached ? r.colour : undefined, opacity: reached ? 1 : 0.5 }}>
              <span className="cjk" style={{ fontSize: 14 }}>{r.han}</span>
              <span style={{ marginLeft: 8 }}>{r.name}</span>
            </h2>
            <div className="grid3">
              {ofRealm.map((b) => {
                const found = (state.killed[b.key] ?? 0) > 0;
                return (
                  <div key={b.key} className="card3" data-seen={found}>
                    <span className="seal"><Svg html={seal(b.icon, realmOf(b.realm).colour, !!b.warden)} /></span>
                    <b style={{ color: found ? r.colour : 'var(--faint)' }}>{found ? b.han : '？'}</b>
                    <i>{found ? `${state.killed[b.key]} killed` : b.warden ? 'warden' : '—'}</i>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      <h2 className="heading">Art credits</h2>
      <p className="faint" style={{ fontSize: 12.5, margin: 0 }}>
        Icons from game-icons.net, Creative Commons BY 3.0. Authors: {AUTHORS.join(', ')}.
      </p>
    </>
  );
}
