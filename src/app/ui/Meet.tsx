import { canAnswer, giftOf, priceOf, type Meeting, type Pick, type Receipt } from '../../sim/meet.ts';
import { RARITY_INFO, SLOT_INFO, templateOf } from '../../data/gear.ts';
import { gearTile } from '../../art/gear.ts';
import { icon } from '../../art/icon.ts';
import { pictureOf } from '../../data/pictures.ts';
import { num } from '../../sim/format.ts';
import { Svg } from './Svg.tsx';
import { MEET, QOL, UNIT, meltPays } from '../copy.ts';
import { BOON_INFO, meetingOf } from '../../data/meetings.ts';
import type { State } from '../../sim/state.ts';

/**
 * 緣 Somebody on the road, and the two things you can say to them.
 *
 * Bruno: *"é tudo muito superficial e vazio."* Nine realms, thirty-six beasts and a
 * Dragon, and nothing in any of it had ever spoken. This is not economy: the amounts
 * are small and half the answers are nothing at all.
 *
 * 取 What a choice costs is written on the choice, always, and what it gives is written
 * beside it wherever the game can say it in a number. A card that hides either of those
 * is asking a player to guess, and a guess is not a decision. The one thing it will not
 * name in advance is a piece of gear, because naming it would be naming the roll.
 *
 * 待 It does not block and it does not expire. Walking on is free, and closing the app
 * with it open loses nothing: what is on offer is derived from the save.
 */
export function Meet({ state, meeting, onAnswer }: {
  state: State;
  meeting: Meeting;
  onAnswer: (which: 0 | 1) => void;
}) {
  const line = (p: Pick) => {
    const cost = priceOf(state, p);
    const gift = giftOf(state, p.outcome);
    const bits: string[] = [];
    if (cost.materials) bits.push(MEET.costs(`${num(cost.materials)} 材 ${UNIT.material}`));
    if (cost.qi) bits.push(MEET.costs(`${num(cost.qi)} qi`));
    if (gift.qi) bits.push(`+${num(gift.qi)} qi`);
    if (gift.materials) bits.push(`+材 ${num(gift.materials)}`);
    if (gift.dao) bits.push(`+${gift.dao} 道`);
    if (p.outcome.kind === 'item') bits.push(MEET.something);
    if (p.outcome.kind === 'boon') bits.push(MEET.stays(BOON_INFO[p.outcome.boon].what));
    if (p.outcome.kind === 'nothing') bits.push(MEET.nothing);
    return bits.join(' · ');
  };

  /**
   * 緣 The scene, where there is one.
   *
   * 圖 An encounter is the one moment an idle game stops for, and it was carrying a 30px
   * pictogram: a raven for a crow that has followed you a mile, a cauldron for an
   * abandoned furnace.
   *
   * 直 It stands beside the words rather than above them. The first try put it in a band
   * across the top, which was the wrong shape: four panels across a square page makes a
   * panel taller than it is wide, and the paintings are composed that way, with the
   * subject low and sky above it. A band cropped the crow off its branch entirely and
   * took the swordsman's head. So the picture keeps its own shape at the left, the name
   * and the line sit next to it, and 擇 the two choices run the full width underneath,
   * where they were before. With no painting the card is exactly what it was.
   */
  const scene = pictureOf('meet', meeting.key);
  // 歸 Somebody coming back says so, and says what they remember, because the whole point
  // of a return is that the road noticed. 心 And somebody drawn by the heart says that too.
  const first = meeting.after ? meetingOf(meeting.after.key) : undefined;
  const why = first && meeting.after
    ? MEET.remembers(first.name.replace(/^An? /, 'the '), first.picks[meeting.after.pick].label)
    : meeting.heart ? MEET.drawn(meeting.heart > 0 ? 'kind' : 'hard') : null;
  const picks = (
    <div className="picks">
      {meeting.picks.map((p, i) => (
        <button key={p.label} className="pick" disabled={!canAnswer(state, p)}
          onClick={() => onAnswer(i as 0 | 1)}>
          <b>{p.label}</b>
          <em>{line(p)}</em>
        </button>
      ))}
    </div>
  );

  return (
    <div className="meet" data-scene={!!scene}>
      {scene
        ? <img className="scenery" src={scene} alt="" aria-hidden="true" />
        : <span className="s"><Svg html={icon(meeting.icon, 30)} /></span>}
      <div className="body">
        <b><span className="cjk">緣</span> {meeting.name}</b>
        <i>{meeting.line}</i>
        {why && <em className="mback">{why}</em>}
        {!scene && picks}
      </div>
      {scene && picks}
    </div>
  );
}

/**
 * 據 What came of it: the same card, after the answer, until the player has read it.
 *
 * The answer is already in the save when this shows, so closing it, or closing the app,
 * loses nothing. It only says what happened: the meeting's own line, what was paid, and
 * what came of it, and for a piece, which piece and whether the chest kept it.
 */
export function MeetDone({ receipt, onClose, onSee }: {
  receipt: Receipt; onClose: () => void; onSee: () => void;
}) {
  const meeting = meetingOf(receipt.key);
  if (!meeting) return null;
  const pick = meeting.picks[receipt.which];
  const scene = pictureOf('meet', meeting.key);
  const paid: string[] = [];
  if (receipt.costMaterials) paid.push(`${num(receipt.costMaterials)} 材 ${UNIT.material}`);
  if (receipt.costQi) paid.push(`${num(receipt.costQi)} qi`);
  const gave: string[] = [];
  if (receipt.qi) gave.push(`+${num(receipt.qi)} qi`);
  if (receipt.materials) gave.push(`+材 ${num(receipt.materials)} ${UNIT.material}`);
  if (receipt.dao) gave.push(`+${receipt.dao} 道 Path`);
  if (receipt.boon) gave.push(MEET.stays(BOON_INFO[receipt.boon as keyof typeof BOON_INFO].what));
  const f = receipt.found;
  const item = f?.item ?? null;
  let pieceLine: string | null = null;
  if (item) {
    const t = templateOf(item);
    const name = QOL.slotted(t.name, SLOT_INFO[t.slot].name);
    const rank = RARITY_INFO[item.rarity].name;
    const pays = meltPays(num(f!.melted), num(f!.meltedMaterial), f!.melted > 0, f!.meltedMaterial > 0);
    pieceLine = !f!.dropped ? MEET.done.piece(name, rank)
      : f!.dropped.id === item.id ? MEET.done.pieceMelted(name, rank, pays)
      : MEET.done.pieceMadeRoom(name, rank, templateOf(f!.dropped).name, pays);
  }
  const kept = item && f && (!f.dropped || f.dropped.id !== item.id);
  return (
    <div className="meet meetdone" data-scene={!!scene}>
      {scene
        ? <img className="scenery" src={scene} alt="" aria-hidden="true" />
        : <span className="s"><Svg html={icon(meeting.icon, 30)} /></span>}
      <div className="body">
        <b><span className="cjk">緣</span> {meeting.name}</b>
        <i>{MEET.done.youChose(pick.label)} {receipt.then}</i>
        {paid.length > 0 && <em className="mpaid">{MEET.done.paid(paid.join(' and '))}</em>}
      </div>
      <div className="mgot">
        <span className="mhead">{MEET.done.head}</span>
        {gave.length > 0 && <p>{gave.join(' · ')}</p>}
        {item && pieceLine && (
          <div className="mpiece">
            <Svg html={gearTile(item, { size: 52 })} />
            <p style={{ color: RARITY_INFO[item.rarity].colour }}>{pieceLine}</p>
          </div>
        )}
        {gave.length === 0 && !item && <p>{MEET.nothing}</p>}
        <div className="mdone">
          {kept && <button type="button" className="act small" onClick={onSee}>{MEET.done.see}</button>}
          <button type="button" className="act small" onClick={onClose}>{MEET.done.ok}</button>
        </div>
      </div>
    </div>
  );
}
