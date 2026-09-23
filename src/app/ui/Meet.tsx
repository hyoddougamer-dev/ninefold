import { canAnswer, giftOf, priceOf, type Meeting, type Pick } from '../../sim/meet.ts';
import { icon } from '../../art/icon.ts';
import { pictureOf } from '../../data/pictures.ts';
import { num } from '../../sim/format.ts';
import { Svg } from './Svg.tsx';
import { MEET } from '../copy.ts';
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
    if (cost.materials) bits.push(MEET.costs(`材 ${num(cost.materials)}`));
    if (cost.qi) bits.push(MEET.costs(`${num(cost.qi)} qi`));
    if (gift.qi) bits.push(`+${num(gift.qi)} qi`);
    if (gift.materials) bits.push(`+材 ${num(gift.materials)}`);
    if (gift.dao) bits.push(`+${gift.dao} 道`);
    if (p.outcome.kind === 'item') bits.push(MEET.something);
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
        {!scene && picks}
      </div>
      {scene && picks}
    </div>
  );
}
