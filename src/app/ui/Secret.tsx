import {
  ROOMS, ROOM_INFO, doorsAt, giftOf, isGate, leave,
} from '../../sim/secret.ts';
import { beastPower, odds } from '../../sim/combat.ts';
import { duration, num } from '../../sim/format.ts';
import { icon } from '../../art/icon.ts';
import { Svg } from './Svg.tsx';
import { SECRET } from '../copy.ts';
import type { State } from '../../sim/state.ts';

/**
 * 秘境 The seven rooms, and the two ways on at each of them.
 *
 * Bruno's second proposal and the last of the four: everything else in this game is a
 * loop with no ending, which is why three minutes of it can feel like nothing happened.
 *
 * 銀 Nothing is carried, so nothing is at stake. Every room pays into the save the
 * moment it is opened, which is why the door that says "walk out" is not a warning and
 * why a beast that puts you down takes nothing with it. The screen says so in as many
 * words, because a player who thinks they are carrying a run's worth of loot will play
 * it as though they are.
 *
 * 關 Every other room is a pair of beasts, one realm above, and there is no way past
 * them. The path drawn at the top says which rooms those are before the first door is
 * opened, so a cultivator can see what they are walking into.
 */
export function Secret({ state, onOpen, onLeave }: {
  state: State;
  onOpen: (which: 0 | 1) => void;
  onLeave: () => void;
}) {
  const step = state.runStep;
  const doors = doorsAt(state, step);

  return (
    <div className="secret">
      <p className="over">{SECRET.over(step + 1, ROOMS)}</p>
      <h2 className="cjk">秘境</h2>

      {/* 路 The whole path, so the gates ahead are visible before they are walked. */}
      <div className="path">
        {Array.from({ length: ROOMS }, (_, i) => (
          <span key={i} className="room"
            data-done={i < step || undefined}
            data-here={i === step || undefined}
            data-gate={isGate(i) || undefined}>
            <Svg html={icon(isGate(i) ? ROOM_INFO.beast.icon : 'wax-seal', 18)} />
            {i < ROOMS - 1 && <i className="link" />}
          </span>
        ))}
      </div>

      <div className="doors">
        {doors.map((room, i) => {
          const which = i as 0 | 1;
          const gift = giftOf(state, room, step);
          const info = ROOM_INFO[room.kind];
          const chance = gift.fight ? Math.round(odds(state, gift.fight) * 100) : 0;
          const bits: string[] = [];
          if (gift.qi) bits.push(`+${num(gift.qi)} qi`);
          if (gift.materials) bits.push(`+材 ${num(gift.materials)}`);
          if (gift.dao) bits.push(`+${gift.dao} 道`);
          if (gift.item) bits.push(SECRET.apiece);
          return (
            <button key={which} className="door" data-fight={!!gift.fight || undefined}
              onClick={() => onOpen(which)}>
              <span className="s"><Svg html={icon(gift.fight ? info.icon : info.icon, 26)} /></span>
              <span className="body">
                <b><span className="cjk">{info.han}</span> {gift.fight ? gift.fight.name : info.name}</b>
                <i>{gift.fight
                  ? SECRET.beast(num(beastPower(gift.fight)), chance, gift.fight.realm > state.realm)
                  : info.says}</i>
                {bits.length > 0 && <em className="mono">{bits.join(' · ')}</em>}
              </span>
            </button>
          );
        })}
      </div>

      <p className="faint law">{SECRET.law}</p>
      <button className="later" onClick={onLeave}>{SECRET.out}</button>
    </div>
  );
}

/** 門 The card on 狩 that says whether the door is open, and opens it. */
export function Door({ state, onEnter }: { state: State; onEnter: () => void }) {
  const open = state.at - (state.runAt || state.startedAt);
  const left = Math.max(0, 8 * 3600 - open);
  return (
    <button className="door open" disabled={left > 0} onClick={onEnter}>
      <span className="s"><Svg html={icon('crystal-shrine', 26)} /></span>
      <span className="body">
        <b><span className="cjk">秘境</span> {SECRET.head}</b>
        <i>{left > 0 ? SECRET.shut(duration(left)) : SECRET.ready(ROOMS)}</i>
      </span>
      {left === 0 && <em className="cjk">›</em>}
    </button>
  );
}

export { leave };
