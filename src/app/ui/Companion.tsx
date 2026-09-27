import { useState } from 'react';
import { plateOf } from '../../data/bestiary.ts';
import { realm as realmOf } from '../../data/realms.ts';
import { bondable, companionOf } from '../../sim/companion.ts';
import { companionShare } from '../../sim/combat.ts';
import { power, type State } from '../../sim/state.ts';
import { COMPANION } from '../copy.ts';
import { Plate } from './Plate.tsx';

/**
 * 靈獸 The companion, on 狩 the hunt: who fights beside you, and who could.
 *
 * It says what the companion is worth in the one unit a player can feel, a share of their
 * own blow, and it says it for every beast they could bond instead, so changing is a
 * choice read off the screen and never a guess. Before anything is mastered it says how
 * one is earned, because a system nobody can see coming is a system nobody works toward.
 */
export function Companion({ state, onBond }: { state: State; onBond: (key: string | null) => void }) {
  const [open, setOpen] = useState(false);
  const pp = power(state);
  const now = companionOf(state);
  const can = bondable(state);
  const pct = (key: string | null) => Math.round(companionShare({ ...state, companion: key }, pp) * 100);

  if (!now && can.length === 0) {
    return (
      <div className="compan" data-empty="true">
        <b className="cjk">靈獸</b>
        <span><em>{COMPANION.plain}</em><i>{COMPANION.earn}</i></span>
      </div>
    );
  }

  return (
    <div className="compan">
      <div className="crow">
        {now ? (
          <Plate kind="beast" subject={plateOf(now)} icon={now.icon} colour={realmOf(now.realm).colour}
            tier={1} size={46} alt={now.name} />
        ) : <b className="cjk">靈獸</b>}
        <span>
          <em>{now ? COMPANION.with(now.han, now.name) : COMPANION.plain}</em>
          <i>{now ? COMPANION.beside(pct(now.key)) : COMPANION.choose(can.length)}</i>
        </span>
        <button className="act ghost small" onClick={() => setOpen((x) => !x)}>
          結 <span>{open ? COMPANION.close : now ? COMPANION.change : COMPANION.pick}</span>
        </button>
      </div>
      {open && (
        <div className="cpick">
          {can.map((b) => (
            <button key={b.key} className="cone" data-on={b.key === now?.key}
              onClick={() => { onBond(b.key); setOpen(false); }}>
              <Plate kind="beast" subject={plateOf(b)} icon={b.icon} colour={realmOf(b.realm).colour}
                tier={1} size={34} alt={b.name} />
              <span><em>{b.han} {b.name}</em><i>{COMPANION.strikes(pct(b.key))}</i></span>
            </button>
          ))}
          {now && (
            <button className="act ghost small" onClick={() => { onBond(null); setOpen(false); }}>
              別 <span>{COMPANION.part}</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
