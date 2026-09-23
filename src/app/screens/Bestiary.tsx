import { BEASTS } from '../../data/bestiary.ts';
import { REALMS, realm as realmOf } from '../../data/realms.ts';
import type { State } from '../../sim/state.ts';
import { AUTHORS } from '../../art/icons.generated.ts';
import { Plate } from '../ui/Plate.tsx';
import { MARK_INFO, knownIn, marksOf } from '../../sim/record.ts';
import { isOpen } from '../../sim/unlocks.ts';
import { POINTS_PER_BESTIARY } from '../../sim/dao.ts';
import { BESTIARY } from '../copy.ts';

/**
 * 錄 The bestiary.
 *
 * Thirty-six cards that fill in. It is the collection screen and, into the bargain, the
 * cheapest answer there is to "what is new this week": a seal lighting up costs nothing
 * to produce.
 *
 * It folds out at the bottom of 狩 Hunt rather than holding a tab of its own. A record
 * of what you have killed belongs next to the killing, and five tabs is already as many
 * as a thumb can find.
 */
export function Bestiary({ state }: { state: State }) {
  const filled = (realm: number) => knownIn(state.killed, realm);
  return (
    <>
      {REALMS.map((r) => {
        const ofRealm = BEASTS.filter((b) => b.realm === r.n);
        const reached = state.realm >= r.n;
        return (
          <div key={r.n}>
            <h2 className="heading" style={{ color: reached ? r.colour : undefined, opacity: reached ? 1 : 0.5 }}>
              <span className="cjk" style={{ fontSize: 14 }}>{r.han}</span>
              <span style={{ marginLeft: 8 }}>{r.name}</span>
              {/* 圖鑑 A realm is *finished* when all four of its beasts are 熟 Known, and
                  that pays a 道 point. Without this line the reward is invisible, and an
                  invisible reward is worse than none: it asks for the one thing hunting
                  never asked for, which is going back, and nothing would say so. */}
              {isOpen(state.realm, 'bestiary') && reached && (
                <span className="filled" data-done={filled(r.n).done === filled(r.n).of}>
                  熟 {filled(r.n).done}/{filled(r.n).of}
                  <em>{BESTIARY.pays(POINTS_PER_BESTIARY)}</em>
                </span>
              )}
            </h2>
            <div className="grid3">
              {ofRealm.map((b) => {
                const kills = state.killed[b.key] ?? 0;
                const found = kills > 0;
                const marks = marksOf(kills);
                return (
                  <div key={b.key} className="card3" data-seen={found}>
                    <Plate kind="beast" subject={b.key} icon={b.icon} colour={realmOf(b.realm).colour}
                      tier={b.warden ? 2 : 1} size={46} alt={b.name} />
                    <b style={{ color: found ? r.colour : 'var(--faint)' }}>{found ? b.han : '？'}</b>
                    <i>{found ? `${kills} killed` : b.warden ? 'warden' : '—'}</i>
                    <span className="marks">
                      {MARK_INFO.map((m, i) => (
                        <em key={m.han} className="cjk" data-on={i < marks}>{m.han}</em>
                      ))}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      <h2 className="heading">{BESTIARY.credits}</h2>
      <p className="faint" style={{ fontSize: 12.5, margin: 0 }}>
        {BESTIARY.icons(AUTHORS.join(', '))}
      </p>
    </>
  );
}
