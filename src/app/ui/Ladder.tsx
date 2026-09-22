import type { CSSProperties } from 'react';
import { LAYERS_PER_REALM } from '../../sim/balance.ts';
import { currentWarden } from '../../sim/combat.ts';
import { progress } from '../../sim/time.ts';
import { canFightWarden, type State } from '../../sim/state.ts';
import { REALMS, realm as realmOf } from '../../data/realms.ts';
import { icon } from '../../art/icon.ts';
import { Svg } from './Svg.tsx';
import { Term } from './Term.tsx';
import { LADDER } from '../copy.ts';

/**
 * 梯 The climb, drawn.
 *
 * Bruno, after a night of reading the game: *"Continuo sem perceber muito bem como
 * funciona o filling dos realms/layers."* He is right, and the reason is that the screen
 * only ever stated it. "layer 3 / 9" and "realm 1 of 9" are two numbers a player has to
 * hold in their head and multiply, and nothing on the screen ever showed that one is
 * *inside* the other.
 *
 * So the two numbers become one object with the shape of the thing they describe:
 *
 *   境 nine realms across the top, the ones behind you solid, the one you are in ringed
 *   層 nine rungs below, the ones you filled solid, the one you are on filling live
 *   妖 the warden at the end of the rungs, lit only when it is actually standing there
 *
 * Everything in it is read from the save on every render. There is no second copy of
 * where the player is, so it cannot drift from the bar above it. It *is* the bar above
 * it, with the eight rungs on either side put back.
 *
 * One sentence underneath says the rule out loud, because a picture can show that a
 * thing is nested and cannot say what fills it.
 */
export function Ladder({ state }: { state: State }) {
  const r = realmOf(state.realm);
  const w = currentWarden(state);
  // s.layer counts layers *opened*, 0..8, so the rung being worked on is s.layer itself.
  const opened = state.layer;
  // 費 The ninth rung is the warden's. It fills as you gather toward it, and the warden
  // falling is what completes it. See canBreakThrough. Before that change the qi on
  // this rung was the breakthrough's toll and was burned on the way out; now it carries,
  // so what this rung really shows is the head start you are building for the next realm.
  const here = state.wardenFell ? 1 : progress(state);
  // 守 Lit once the last rung is reached, and it stays lit. See wardenStands.
  const wardenUp = canFightWarden(state);

  return (
    <div className="ladder" data-coach="ladder">
      {/* 讀 Each row says what it is, on the row. Two lines of dashes with nothing
          naming them is a diagram of something, and the player has to guess what. */}
      <div className="lrow">
        <span className="lab mono">
          <Term han="境" /> {LADDER.realms(state.realm, REALMS.length)}
        </span>
        <span className="realms">
          {REALMS.map((x, i) => (
            <span key={x.han} className="dot" data-done={i + 1 < state.realm}
              data-here={i + 1 === state.realm}
              style={{ '--c': x.colour } as CSSProperties} />
          ))}
        </span>
      </div>

      <div className="lrow">
        <span className="lab mono">
          <Term han="層" /> {LADDER.layers(Math.min(opened + 1, LAYERS_PER_REALM), LAYERS_PER_REALM)}
        </span>
        <span className="rungs">
          {Array.from({ length: LAYERS_PER_REALM }, (_, i) => (
            <span key={i} className="rung" data-here={i === opened}>
              <i style={{
                width: i < opened ? '100%' : i === opened ? `${Math.min(1, here) * 100}%` : '0%',
                background: r.colour,
              }} />
            </span>
          ))}
        </span>
        <span className="warden" data-up={wardenUp} data-fell={state.wardenFell}
          style={{ color: wardenUp ? r.colour : undefined }}>
          <Svg html={icon(w.icon, 17)} />
        </span>
      </div>

      <p className="faint">{LADDER.rule(r.han, r.name)} {LADDER.ruleAfter}</p>
    </div>
  );
}
