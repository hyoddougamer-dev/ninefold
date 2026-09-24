import {
  ROOM_INFO, doorIn, doorsAt, giftOf, isGate, leave, roomsFor,
} from '../../sim/secret.ts';
import { beastPower, odds } from '../../sim/combat.ts';
import { duration, num } from '../../sim/format.ts';
import { icon } from '../../art/icon.ts';
import { chamber } from '../../art/secret.ts';
import { gearTile } from '../../art/gear.ts';
import { RARITY_INFO, TEMPLATE_BY_KEY, type Rarity } from '../../data/gear.ts';
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
 * 關 Every other room is a gate: one guardian, and there is no way past. The path drawn
 * at the top says which rooms those are before the first door is opened, so a
 * cultivator can see what they are walking into.
 *
 * 圖 And a door is a picture of where it goes. It was a line of text with a 26-pixel
 * icon beside it, which is what Bruno was describing when he said *"o jogo é puramente
 * quase só texto"*. 藝 art/secret.ts draws the room behind each one, in the colour of
 * the realm you are standing in and as deep as the room you are standing at.
 *
 * 記 The running total sits under them for the same reason: a run that paid four times
 * over reads as a run that paid nothing when every payment lands in a bar that was
 * already moving.
 */
export function Secret({ state, onOpen, onLeave }: {
  state: State;
  onOpen: (which: 0 | 1) => void;
  onLeave: () => void;
}) {
  const step = state.runStep;
  const doors = doorsAt(state, step);
  const took = state.lastRun;
  // 深 The path drawn is the path this cultivator walks. It grows at the seventh realm.
  const rooms = roomsFor(state.realm);

  return (
    <div className="secret">
      <p className="over">{SECRET.over(step + 1, rooms)}</p>
      <h2><span className="cjk">秘境</span> <em>{SECRET.head}</em></h2>

      {/* 路 The whole path, so the gates ahead are visible before they are walked. */}
      <div className="path">
        {Array.from({ length: rooms }, (_, i) => (
          <span key={i} className="room"
            data-done={i < step || undefined}
            data-here={i === step || undefined}
            data-gate={isGate(i) || undefined}>
            <Svg html={icon(isGate(i) ? ROOM_INFO.beast.icon : 'wax-seal', 18)} />
            {i < rooms - 1 && <i className="link" />}
          </span>
        ))}
      </div>

      <div className="ways">
        {doors.map((room, i) => {
          const which = i as 0 | 1;
          const gift = giftOf(state, room, step);
          const info = ROOM_INFO[room.kind];
          const chance = gift.fight ? Math.round(odds(state, gift.fight) * 100) : 0;
          const bits: string[] = [];
          if (gift.qi) bits.push(`+${num(gift.qi)} qi`);
          if (gift.dao) bits.push(`+${gift.dao} 道`);
          if (gift.item) bits.push(SECRET.apiece);
          return (
            <button key={which} className="way" data-fight={!!gift.fight || undefined}
              onClick={() => onOpen(which)}>
              <Svg className="vault" html={chamber({ kind: room.kind, step, realm: state.realm })} />
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

      {/* 記 What the rooms already walked handed over, counted while it is still being
          walked, because that is the question a gate asks. */}
      <p className="sofar">
        <span>{SECRET.sofar}</span>
        <b>{took.rooms === 0 ? SECRET.nothing : tallyLine(took)}</b>
      </p>

      <p className="faint law">{SECRET.law}</p>
      <button className="later" onClick={onLeave}>{SECRET.out}</button>
    </div>
  );
}

/** 記 The one-line version of a take, for while the run is still on. */
function tallyLine(took: State['lastRun']): string {
  const bits: string[] = [];
  if (took.qi) bits.push(`+${num(took.qi)} qi`);
  if (took.dao) bits.push(`+${took.dao} 道`);
  if (took.items.length) bits.push(SECRET.tallyGear(took.items.length));
  return bits.length ? bits.join(' · ') : SECRET.nothing;
}

/**
 * 出 The end of a run, and the only screen in the game that adds a session up.
 *
 * It is a record and not a reward: every number on it was paid into the save the moment
 * it was taken, room by room, and the sheet says so. That is the difference between
 * this and the loot screen it looks like, and it matters because the law the whole
 * system rests on is that losing costs nothing. A tally that reads like a payout would
 * quietly teach the opposite.
 */
export function Tally({ state, onClose }: { state: State; onClose: () => void }) {
  const took = state.lastRun;
  const rooms = roomsFor(state.realm);
  const whole = took.rooms >= rooms;
  const left = doorIn(state);

  return (
    <div className="runend" onClick={onClose}>
      <div className="endcard" onClick={(e) => e.stopPropagation()}>
        <Svg className="vault" html={chamber({ kind: 'out', step: took.rooms, realm: state.realm })} />
        <h2>{took.beaten ? SECRET.endBeaten : whole ? SECRET.endDone : SECRET.endWalked}</h2>
        <p className="faint">{took.beaten ? SECRET.endBeatenSays : SECRET.endSays}</p>

        <p className="rooms">
          <span>{SECRET.tallyRooms(took.rooms, rooms)}</span>
          {took.gates > 0 && <span>{SECRET.tallyGates(took.gates)}</span>}
        </p>

        {took.qi === 0 && took.dao === 0 && took.items.length === 0 ? (
          <p className="faint none">{SECRET.tallyNone}</p>
        ) : (
          <div className="rows">
            {took.qi > 0 && (
              <p className="gain"><b className="mono">+{num(took.qi)}</b> <i>{SECRET.tallyQi}</i></p>
            )}
            {took.dao > 0 && (
              <p className="gain"><b className="mono">+{took.dao}</b> <i>{SECRET.tallyDao}</i></p>
            )}
            {took.items.length > 0 && (
              <div className="got">
                {took.items.map((it, i) => (
                  <span key={`${it.template}${i}`} className="piece">
                    <Svg html={gearTile({ id: `t${i}`, template: it.template,
                      rarity: it.rarity as Rarity, rolls: [] }, { size: 44 })} />
                    <b>{TEMPLATE_BY_KEY[it.template]?.name ?? ''}</b>
                    <i>{RARITY_INFO[it.rarity as Rarity]?.name ?? ''}</i>
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {left > 0 && <p className="faint again">{SECRET.again(duration(left))}</p>}
        <button className="act" onClick={onClose}>{SECRET.back}</button>
      </div>
    </div>
  );
}

/** 門 The card on 狩 that says whether the door is open, and opens it. */
export function Door({ state, onEnter }: { state: State; onEnter: () => void }) {
  const left = doorIn(state);
  const rooms = roomsFor(state.realm);
  return (
    <button className="door open" disabled={left > 0} onClick={onEnter}>
      <span className="s"><Svg html={icon('crystal-shrine', 26)} /></span>
      <span className="body">
        <b><span className="cjk">秘境</span> {SECRET.head}</b>
        <i>{left > 0 ? SECRET.shut(duration(left)) : SECRET.ready(rooms)}</i>
      </span>
      {left === 0 && <em className="cjk">›</em>}
    </button>
  );
}

export { leave };
