import { ART_BY_KEY, SEQUENCE_SLOTS, type Art } from '../../data/arts.ts';
import { Emblem } from './Emblem.tsx';
import { realm as realmOf } from '../../data/realms.ts';
import { artsHeld, stanceChoices } from '../../sim/arts.ts';
import type { State } from '../../sim/state.ts';
import { LOADOUT } from '../copy.ts';

/**
 * 勢訣 The stance and the sequence.
 *
 * Two questions, kept apart because they are different questions: the stance says what
 * kind of fighter you are, the sequence says how that fighter fights.
 *
 * The interaction is built for a thumb. Tap a stance to stand in it. Tap an art to add
 * it to the end of the sequence, which is how the order gets chosen, without dragging
 * anything. Tap a filled slot to take that art back out.
 */
export function Loadout({ state, onStance, onSequence }: {
  state: State;
  onStance: (key: string | null) => void;
  onSequence: (keys: string[]) => void;
}) {
  const stances = stanceChoices(state.realm, state.layer);
  const held = artsHeld(state.killed);
  const placed = state.sequence;
  const spare = held.filter((a) => !placed.includes(a.key));

  const add = (a: Art) => {
    if (placed.length >= SEQUENCE_SLOTS) return;
    onSequence([...placed, a.key]);
  };
  const drop = (key: string) => onSequence(placed.filter((k) => k !== key));

  return (
    <div className="loadout">
      <h2 className="heading">勢 Stance</h2>
      {stances.length === 0 ? (
        <p className="faint small">{LOADOUT.noStance}</p>
      ) : (
        <>
          <div className="chips">
            {stances.map((s) => (
              <button key={s.key} className="chip" data-on={state.stance === s.key}
                      style={{ ['--hue' as string]: realmOf(s.realm).colour }}
                      onClick={() => onStance(state.stance === s.key ? null : s.key)}>
                <b className="cjk">{s.han}</b>
                <i>{s.name}</i>
              </button>
            ))}
          </div>
          {state.stance && (
            <p className="stancetext">
              {stances.find((s) => s.key === state.stance)?.text}
              <em>{stances.find((s) => s.key === state.stance)?.wants}</em>
            </p>
          )}
          {!state.stance && <p className="faint small">{LOADOUT.pickStance}</p>}
        </>
      )}

      <h2 className="heading">
        訣 Sequence
        <span className="mono faint" style={{ float: 'right', fontSize: 12 }}>
          {held.length} / {9} held
        </span>
      </h2>

      {held.length === 0 ? (
        <p className="faint small">{LOADOUT.noArts}</p>
      ) : (
        <>
          <div className="seq">
            {Array.from({ length: SEQUENCE_SLOTS }, (_, i) => {
              const art = placed[i] ? ART_BY_KEY[placed[i]] : null;
              const hue = art ? realmOf(art.realm).colour : 'var(--line)';
              return (
                <button key={i} className="slot" data-filled={!!art}
                        style={{ ['--hue' as string]: hue }}
                        disabled={!art}
                        onClick={() => art && drop(art.key)}
                        aria-label={art ? `Remove ${art.name}` : `Slot ${i + 1}, empty`}>
                  <span className="n">{i + 1}</span>
                  {art ? (
                    <>
                      <span className="ic"><Emblem family="art" subject={art.key} icon={art.icon} size={22} alt={art.name} /></span>
                      <span className="nm"><b className="cjk">{art.han}</b><i>{art.text}</i></span>
                    </>
                  ) : (
                    <span className="nm"><i>{LOADOUT.emptySlot}</i></span>
                  )}
                </button>
              );
            })}
          </div>
          <p className="faint small">{LOADOUT.rotation}</p>

          {spare.length > 0 && (
            <div className="pool">
              {spare.map((a) => (
                <button key={a.key} className="pick" disabled={placed.length >= SEQUENCE_SLOTS}
                        style={{ ['--hue' as string]: realmOf(a.realm).colour }}
                        onClick={() => add(a)} title={a.text}>
                  <span className="ic"><Emblem family="art" subject={a.key} icon={a.icon} size={20} alt={a.name} /></span>
                  <b className="cjk">{a.han}</b>
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
