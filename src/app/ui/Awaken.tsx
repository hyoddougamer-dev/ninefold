import { AWAKENINGS, cardDue, held } from '../../sim/awaken.ts';
import { Emblem } from './Emblem.tsx';
import { realm as realmOf } from '../../data/realms.ts';
import { heavenAt } from '../../data/heavens.ts';
import { AWAKEN } from '../copy.ts';
import type { State } from '../../sim/state.ts';

/**
 * 悟道 The three cards at a breakthrough, and the one you keep.
 *
 * Bruno: *"sem sistemas de conteúdo, sinto que é tudo muito superficial e vazio."* The
 * shape of that is that nothing in the game ever asked the player to give something up.
 * 道 The tree comes closest and its points accumulate, so given enough days everybody
 * owns most of it. A card taken here is two doors closed for good.
 *
 * 現 It is not fired, it is derived. What is owed is the realm minus one, what is taken
 * is the length of the list, and the difference is this screen. So it cannot be missed
 * by a reload, it cannot be lost by closing the app mid-choice, and a save that somehow
 * skipped one is simply asked again. See sim/awaken.ts.
 *
 * 閉 And it closes. Nothing in this game is unclosable, and this does not need to be:
 * the offer is derived, so walking away from it changes nothing and 修 the home screen
 * keeps a card up until it is taken.
 */
export function Awaken({ state, onTake, onClose }: {
  state: State;
  onTake: (key: string) => void;
  onClose: () => void;
}) {
  const trio = cardDue(state);
  if (!trio) return null;
  /**
   * 境外 Which place the card belongs to, which stops being a realm at the ninth.
   *
   * The nine heavens carry nine of the seventeen trios, and a cultivator taking one of
   * them has been out of the realms for weeks. The colour comes from the same place, so
   * the card walks up through the heavens' own gold the way every other screen does.
   */
  const heaven = held(state.awakened).length >= AWAKENINGS.length
    ? heavenAt(state.tribulation) : null;
  const r = heaven ?? realmOf(state.realm);

  return (
    <div className="awaken">
      <p className="over">{heaven ? AWAKEN.overHeaven : AWAKEN.over}</p>
      <h2 className="cjk" style={{ color: r.colour }}>悟道</h2>
      <p className="sub">{AWAKEN.sub(r.han, r.name)}</p>
      <p className="lead">{AWAKEN.lead}</p>

      <div className="cards">
        {trio.map((c) => (
          <button key={c.key} className="acard" onClick={() => onTake(c.key)}>
            <span className="s"><Emblem family="card" subject={c.key} icon={c.icon} size={30} alt={c.name} /></span>
            <span className="nm">
              <b className="cjk">{c.han}</b>
              <em>{c.name}</em>
            </span>
            <i>{c.says}</i>
            <span className="take">{AWAKEN.take}</span>
          </button>
        ))}
      </div>

      <button className="later" onClick={onClose}>{AWAKEN.later}</button>
    </div>
  );
}
