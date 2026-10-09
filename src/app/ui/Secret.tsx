import { kitFor } from '../../sim/crafts.ts';
import { ITEM_BY_KEY, REALM_KEY } from '../../data/crafts.ts';
import {
  ROOM_INFO, doorIn, doorsAt, giftOf, incenseLeft, isGate, leave, roomsFor, canUseKey,
  shareAt, springNow, type BoxHolds, type Gift,
} from '../../sim/secret.ts';
import { effectiveBeastPower, odds } from '../../sim/combat.ts';
import { rate } from '../../sim/time.ts';
import { INCENSE_BONUS, KEY_SPRING, SPRING_FILL, SPRING_HOLD } from '../../sim/balance.ts';
import { duration, num } from '../../sim/format.ts';
import { icon } from '../../art/icon.ts';
import { chamber } from '../../art/secret.ts';
import { gearTile } from '../../art/gear.ts';
import { RARITY_INFO, TEMPLATE_BY_KEY, type Rarity } from '../../data/gear.ts';
import { Svg } from './Svg.tsx';
import { Term } from './Term.tsx';
import { SECRET } from '../copy.ts';
import type { State } from '../../sim/state.ts';
import { isBlessed, blessedStep, weekLeft } from '../../sim/week.ts';
import { WeekTag } from './Week.tsx';
import { WEEK } from '../copy.ts';
import type { RoomKind } from '../../data/secret.ts';

const pct = (x: number) => `${Math.round(x * 100)}%`;

/** 匣 Herbs and ore in a line: 星蕨 Starfall Fern ×600 · 落星鐵 Fallen Star Iron ×514. */
export function boxLine(held: Readonly<Record<string, number>>): string {
  return Object.entries(held).map(([k, n]) => {
    const it = ITEM_BY_KEY[k];
    return it ? `${it.han} ${it.name} ×${num(n)}` : `${k} ×${num(n)}`;
  }).join(' · ');
}

function boxHeld(box: BoxHolds | null): Record<string, number> {
  const out: Record<string, number> = {};
  for (const got of [box?.herb, box?.ore]) if (got) out[got[0]] = got[1];
  return out;
}

/** What a door's gold line says it gives, in the player's own units. */
function giftLine(state: State, kind: RoomKind, gift: Gift): string | null {
  switch (kind) {
    case 'spring': return SECRET.drink(num(gift.qi), duration(gift.worth));
    case 'incense': return SECRET.burn(pct(INCENSE_BONUS), duration(gift.burn), num(gift.burn * INCENSE_BONUS * rate(state)));
    case 'shrine': return SECRET.shrineGives(gift.dao);
    case 'brazier': return SECRET.brazierGives;
    case 'box': return boxLine(boxHeld(gift.box)) || SECRET.boxEmpty;
    case 'trail': return SECRET.trailSays;
    default: return null;
  }
}

/**
 * 秘境 The rooms, and the ways on at each of them.
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
 * 泉 香 Since 2026-10-04 a reward room is a decision rather than a pair of caches: its
 * share of the spring drunk now, burned as incense for more later, or spent on the third
 * door. The spring line above the doors says what the share is, in minutes of the
 * player's own gathering, so all three doors are priced in the same unit.
 *
 * 關 Every other room is a gate: one guardian, and there is no way past. The path drawn
 * at the top says which rooms those are before the first door is opened, so a
 * cultivator can see what they are walking into.
 *
 * 圖 And a door is a picture of where it goes. 藝 art/secret.ts draws the room behind
 * each one, in the colour of the realm you are standing in and as deep as the room you
 * are standing at.
 *
 * 記 The running total sits under them for the same reason: a run that paid four times
 * over reads as a run that paid nothing when every payment lands in a bar that was
 * already moving.
 */
export function Secret({ state, onOpen, onLeave }: {
  state: State;
  /** 門 The door by what it is and the room it is in, never by its place in the row. */
  onOpen: (door: { step: number; kind: RoomKind }) => void;
  onLeave: () => void;
}) {
  const step = state.runStep;
  const doors = doorsAt(state, step);
  const took = state.lastRun;
  // 深 The path drawn is the path this cultivator walks. It grows at the seventh realm.
  const rooms = roomsFor(state.realm);
  const gate = isGate(step);
  // 泉 What the spring holds for the rooms ahead, and this room's share, as gathering.
  const held = Math.max(0, state.spring ?? 0);
  const share = shareAt(state, step);
  const blessed = isBlessed(state, step) ? 2 : 1;
  const burnerFull = !gate && share > 0 && !doors.some((d) => d.kind === 'incense');

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
            data-gate={isGate(i) || undefined}
            /* 期 The week's blessed room, marked on the path before it is reached. A
               walker looks at the path to decide whether the next gate is worth trying,
               and a doubled room three steps on is the whole of that decision. */
            data-week={isBlessed(state, i) || undefined}>
            <Svg html={icon(isGate(i) ? ROOM_INFO.beast.icon : 'wax-seal', 18)} />
            {i < rooms - 1 && <i className="link" />}
          </span>
        ))}
      </div>
      {/* 譯 期 under a seal on the path is the week's mark, and it stood there alone. The
          line under the path names it: which room, and that it pays double. */}
      {Array.from({ length: rooms }, (_, i) => i).some((i) => isBlessed(state, i)) && (
        <p className="pathweek"><Term han="期" /> {WEEK.blessed(blessedStep(state) + 1, rooms)}</p>
      )}

      {/* 泉 The spring, once per room: what it holds and what this room's share is. */}
      {!gate && (
        <div className="springline">
          <p>
            <Term han="泉" />{' '}
            {held <= 0 ? SECRET.springEmpty
              : step === 0
                ? SECRET.springFirst(duration(held), held >= SPRING_HOLD - 1, duration(held * SPRING_FILL),
                  duration(share * SPRING_FILL * blessed))
                : SECRET.springLeft(duration(held * SPRING_FILL), duration(share * SPRING_FILL * blessed))}
          </p>
          <span className="springbar" aria-hidden="true"><i style={{ width: `${Math.min(100, (held / SPRING_HOLD) * 100)}%` }} /></span>
        </div>
      )}

      <div className="ways">
        {doors.map((room) => {
          const gift = giftOf(state, room, step);
          const info = ROOM_INFO[room.kind];
          const chance = gift.fight ? Math.round(odds(state, gift.fight, undefined, kitFor(state, gift.fight, 'vault').kit) * 100) : 0;
          const line = giftLine(state, room.kind, gift);
          const tag = SECRET.tags[room.kind];
          return (
            <button key={room.kind} className="way" data-fight={!!gift.fight || undefined}
              data-kind={room.kind} onClick={() => onOpen({ step, kind: room.kind })}>
              <Svg className="vault" html={chamber({ kind: room.kind, step, realm: state.realm })} />
              <span className="body">
                <b>
                  <span className="cjk">{info.han}</span> {gift.fight ? gift.fight.name : info.name}
                  {tag && <span className="waytag">{tag}</span>}
                </b>
                <i>{gift.fight
                  ? SECRET.beast(num(effectiveBeastPower(state, gift.fight)), chance, gift.fight.realm > state.realm)
                  : info.says}</i>
                {line && <em className="mono">{line}</em>}
                {/* 期 And on the door itself, where the doubled number is already being
                    quoted: giftOf applies the blessing, so the line above is the truth
                    and this says why it is larger than it was last week. Only on a door
                    whose number the blessing doubles: the share drunk or burned, and a
                    shrine's 道. Gear, a box and a trail have nothing to double. */}
                {isBlessed(state, step) && (room.kind === 'spring' || room.kind === 'incense' || gift.dao > 0)
                  && <WeekTag left={weekLeft(state)} />}
              </span>
            </button>
          );
        })}
      </div>
      {burnerFull && <p className="faint burnerfull">{SECRET.burnerFull(duration(incenseLeft(state)))}</p>}

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
  if (took.burn) bits.push(`香 ${duration(took.burn)}`);
  if (took.dao) bits.push(`+${took.dao} 道`);
  if (took.items.length) bits.push(SECRET.tallyGear(took.items.length));
  if (took.box && Object.keys(took.box).length) bits.push(`匣 ${Object.values(took.box).reduce((a, b) => a + b, 0)}`);
  if (took.trail) bits.push('跡');
  return bits.length ? bits.join(' · ') : SECRET.nothing;
}

/**
 * 出 The end of a run, and the only screen in the game that adds a session up.
 *
 * It is a record and not a reward: every number on it was paid into the save the moment
 * it was taken, room by room, and the sheet says so. That is the difference between
 * this and the loot screen it looks like, and it matters because the law the whole
 * system rests on is that losing costs nothing. A tally that reads like a payout would
 * quietly teach the opposite. 室 Each line says which rooms it came from, because a run
 * is now three decisions a room and the end is where they are added up.
 */
export function Tally({ state, onClose }: { state: State; onClose: () => void }) {
  const took = state.lastRun;
  const rooms = roomsFor(state.realm);
  const whole = took.rooms >= rooms;
  const left = doorIn(state);
  const where = (kind: RoomKind) => SECRET.roomsList((took.picks ?? []).filter((p) => p.kind === kind).map((p) => p.step));
  const drank = (took.picks ?? []).some((p) => p.kind === 'spring');
  const box = took.box ?? {};
  const boxes = Object.entries(box);
  const nothing = took.qi === 0 && took.dao === 0 && took.items.length === 0 && !took.burn && boxes.length === 0 && !took.trail;

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

        {nothing ? (
          <p className="faint none">{SECRET.tallyNone}</p>
        ) : (
          <div className="rows">
            {took.qi > 0 && (
              <p className="gain"><b className="mono">+{num(took.qi)}</b> <i>{drank ? SECRET.tallyDrunk(where('spring')) : SECRET.tallyQi}</i></p>
            )}
            {(took.burn ?? 0) > 0 && (
              <p className="gain" data-kind="incense"><b className="mono">+{pct(INCENSE_BONUS)}</b> <i>{SECRET.tallyBurn(duration(took.burn ?? 0), where('incense'))}</i></p>
            )}
            {took.dao > 0 && (
              <p className="gain"><b className="mono">+{took.dao}</b> <i>{SECRET.tallyDao}</i></p>
            )}
            {boxes.length > 0 && (
              <p className="gain" data-kind="box"><b className="mono">{'×'}{num(boxes[0][1])}</b> <i>{SECRET.tallyBox(
                boxes.map(([k, n], i) => `${i ? `and ×${num(n)} ` : ''}${ITEM_BY_KEY[k]?.han ?? ''} ${ITEM_BY_KEY[k]?.name ?? k}`).join(' '),
                where('box'))}</i></p>
            )}
            {took.trail && (
              <p className="gain" data-kind="trail"><b className="mono cjk">跡</b> <i>{SECRET.tallyTrail}</i></p>
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
export function Door({ state, onEnter, onKey }: { state: State; onEnter: () => void; onKey?: () => void }) {
  const left = doorIn(state);
  const rooms = roomsFor(state.realm);
  // 鑰 A Realm Key opens a shut door, once a day. Shown only while it would do something,
  // or to say why one held cannot be used until tomorrow.
  const keys = state.crafts?.pouch[REALM_KEY] ?? 0;
  const usable = canUseKey(state);
  const spring = springNow(state);
  return (
    <>
    <button className="door open" disabled={left > 0} onClick={onEnter}>
      <span className="s"><Svg html={icon('crystal-shrine', 26)} /></span>
      <span className="body">
        <b><span className="cjk">秘境</span> {SECRET.head}</b>
        <i>{left > 0 ? SECRET.shut(duration(left)) : SECRET.ready(rooms)}</i>
        {/* 泉 What the spring holds, so a door opened early says what it is opened to. */}
        <i className="doorspring">泉 {SECRET.springDoor(duration(spring * SPRING_FILL), spring >= SPRING_HOLD - 1)}</i>
        {/* 期 Which room the week has blessed, said on the card outside the door. It is
            what makes the week worth checking on a day the walker was not going to go. */}
        <u className="mono">{WEEK.blessed(blessedStep(state) + 1, rooms)}</u>
      </span>
      {left === 0 && <em className="cjk">›</em>}
    </button>
    {left > 0 && keys > 0 && (usable && onKey
      ? <button className="doorkey" onClick={onKey}><b className="cjk">鑰</b> {SECRET.useKey(keys, duration(Math.max(spring, KEY_SPRING) * SPRING_FILL))}</button>
      : <p className="faint doorkeynote"><b className="cjk">鑰</b> {SECRET.keyTomorrow}</p>)}
    </>
  );
}

export { leave };
