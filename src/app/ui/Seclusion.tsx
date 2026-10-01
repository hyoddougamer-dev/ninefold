import { kitFor } from '../../sim/crafts.ts';
import { useMemo } from 'react';
import { portraitLayers } from '../../art/aura.ts';
import { odds as oddsOf } from '../../sim/combat.ts';
import { duration } from '../../sim/format.ts';
import {
  canSeclude, demonDue, demonLeft, demonOf, demonPower, secluded,
} from '../../sim/seclusion.ts';
import { DEMONS, DEMON_DAO, SECLUSION as SECLUDE_FOR } from '../../sim/balance.ts';
import { isOpen } from '../../sim/unlocks.ts';
import type { State } from '../../sim/state.ts';
import { fightDeps } from '../memo.ts';
import { SECLUSION } from '../copy.ts';
import { Svg } from './Svg.tsx';

/**
 * 閉關 The door, on 修 the cultivate screen, in the four states it is ever in: open, shut
 * and counting, a demon waiting, and every demon this realm lets out already down.
 *
 * 心魔 The figure on the card is the cultivator's own, darkened, because that is what the
 * demon is. It is the same drawing the arena stands on the far side of the fight.
 */
export function Seclusion({ state, onShut, onFace }: {
  state: State; onShut: () => void; onFace: () => void;
}) {
  const due = demonDue(state);
  const odds = useMemo(
    () => (due ? oddsOf(state, demonOf(state), demonPower(state), kitFor(state, demonOf(state), 'demon').kit) : 0),
    [due, ...fightDeps(state)],
  );
  if (!isOpen(state.realm, 'seclusion')) return null;

  const shut = secluded(state) && !due;
  const rest = !secluded(state) && !canSeclude(state);
  const left = demonLeft(state);

  return (
    <div className="seclude" data-due={due} data-shut={shut}>
      <div className="shead">
        <b className="cjk">閉關</b>
        <em>{SECLUSION.plain}</em>
        <span className="mono">{SECLUSION.tally(state.demons, DEMONS)}</span>
      </div>
      <div className="sbody">
        <span className="demon" data-due={due} aria-hidden="true">
          <Svg html={portraitLayers({ realm: state.realm, pulse: 0, who: state.self })} />
        </span>
        <span className="ssay">
          {due && <>
            <em>{SECLUSION.due}</em>
            <i>{SECLUSION.dueNote}</i>
            <u className="mono">{SECLUSION.odds(Math.round(odds * 100))} · {SECLUSION.pays(DEMON_DAO)}</u>
          </>}
          {shut && <>
            <em>{SECLUSION.waiting(duration(left))}</em>
            <i>{SECLUSION.shutNote}</i>
            <span className="sbar"><i style={{ width: `${(1 - left / SECLUDE_FOR) * 100}%` }} /></span>
          </>}
          {!secluded(state) && !rest && <i>{SECLUSION.open}</i>}
          {rest && <i>{state.demons >= DEMONS ? SECLUSION.done : SECLUSION.rest(state.realm + 1)}</i>}
        </span>
      </div>
      {due && (
        <button className="act danger" onClick={onFace}>
          鬥 <span>{SECLUSION.face}</span>
        </button>
      )}
      {!secluded(state) && !rest && (
        <button className="act ghost" onClick={onShut}>
          關 <span>{SECLUSION.shut}</span>
        </button>
      )}
    </div>
  );
}
