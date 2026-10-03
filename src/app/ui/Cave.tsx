import { useState } from 'react';
import { Emblem } from './Emblem.tsx';
import {
  BEDS, canPlant, emptyCount, grown, harvestValue, herbOf, isRipe, leftOn, plantable, seedCost,
  type Herb,
} from '../../sim/cave.ts';
import { duration, num } from '../../sim/format.ts';
import { icon } from '../../art/icon.ts';
import { Svg } from './Svg.tsx';
import { Term } from './Term.tsx';
import { CAVE, QOL, WEEK, UNIT } from '../copy.ts';
import type { State } from '../../sim/state.ts';
import { isSeason, seasonOf, weekLeft } from '../../sim/week.ts';
import { WeekTag } from './Week.tsx';

/**
 * 洞天 Three beds, and the only thing in the game that grows while the app is shut.
 *
 * Bruno's fourth proposal: *"um sítio que é teu."* The only thing that happened while
 * you were away was a bar filling, and a bar is not a place.
 *
 * 圓 The ring is the growing and there is no second copy of it anywhere: the fill is
 * `grown()` and the line underneath is `leftOn()`, both read from the instant in the
 * state minus the instant the bed was planted. A bed cannot be drawn as one thing and
 * harvest as another.
 *
 * 取 A ripe bed says take it and nothing else. An empty one opens the list. A growing
 * one says when, and it is the only card on this screen with no button on it at all,
 * because there is genuinely nothing to do to it and pretending otherwise would be the
 * kind of button that teaches a player to stop reading.
 */
export function Cave({ state, onPlant, onHarvest, onTakeAll, onPlantAll }: {
  state: State;
  onPlant: (which: number, key: string) => void;
  onHarvest: (which: number) => void;
  /** 收 Take every ripe bed, and sow each again when `again` (see harvestAndReplant). */
  onTakeAll?: (again: boolean) => void;
  /** 種 One herb in every empty bed. */
  onPlantAll?: (key: string) => void;
}) {
  /**
   * Which bed has its herb list open, if any, or 'all' when the herb chosen goes into every
   * empty bed. It is a screen's worth of state, not a save's.
   */
  const [picking, setPicking] = useState<number | 'all' | null>(null);
  const herbs = plantable(state);
  const season = (() => { const h = seasonOf(state); return h && herbs.includes(h) ? h : null; })();
  // 收 What every ripe bed pays together, said on the button that takes them.
  const ripe = Array.from({ length: BEDS }, (_, i) => state.beds[i]).filter((b) => b && isRipe(state, b));
  const ripeQi = ripe.reduce((t, b) => t + harvestValue(state, herbOf(b!.herb!)!, b!.at), 0);
  const empty = emptyCount(state);
  // A list opened for one bed that has since been planted closes; 'all' closes once none is empty.
  const open = picking === 'all' ? (empty > 0 ? 'all' : null)
    : picking !== null && !state.beds[picking]?.herb ? picking : null;

  return (
    <>
      <h2 className="heading">{CAVE.head}</h2>
      <p className="faint cavesay">{CAVE.says}</p>
      {/* 期 Which herb the week favours, said where the beds are. It was only a chip that
          read "3d left" inside the seed list, which says when and not what, and the
          sentence that says what had been written and never put on a screen. */}
      {season && (
        <p className="faint cavesay cavesea">
          <Term han="期" /> {WEEK.season(`${season.han} ${season.name}`)} {WEEK.left(duration(weekLeft(state)))}.
        </p>
      )}
      {/* 收 The whole cave in one tap, above the beds so it is never a scroll away: nine
          taps and four scrolls at the fifth realm, measured, become one. Even one ripe bed
          is three taps to take and sow again. The single-bed buttons stay as they were.
          The data-qol name is for the tests to find it by. */}
      {onTakeAll && ripe.length >= 1 && (
        <div className="cavebulk">
          <button className="act" data-qol="cave-replant" onClick={() => onTakeAll(true)}>
            收 <span>{QOL.cave.takeReplant}</span>
          </button>
          <div className="cbrow">
            <b className="mono">{QOL.cave.ripe(ripe.length, num(ripeQi))}</b>
            <button className="act ghost" data-qol="cave-take" onClick={() => onTakeAll(false)}>
              收 <span>{QOL.cave.takeAll}</span>
            </button>
          </div>
          <p className="faint cbsay">{QOL.cave.replantSays}</p>
        </div>
      )}
      {onPlantAll && empty >= 2 && (
        <div className="cavebulk">
          <button className="act ghost" aria-expanded={open === 'all'}
            onClick={() => setPicking(open === 'all' ? null : 'all')}>
            種 <span>{open === 'all' ? CAVE.close : QOL.cave.plantEmpty(empty)}</span>
          </button>
        </div>
      )}
      <div className="cave">
        {Array.from({ length: BEDS }, (_, i) => {
          const bed = state.beds[i];
          const herb: Herb | undefined = bed?.herb ? herbOf(bed.herb) : undefined;
          const ripe = bed ? isRipe(state, bed) : false;
          const at = bed ? grown(state, bed) : 0;
          return (
            <div key={i} className="bed" data-ripe={ripe || undefined}
              data-empty={!herb || undefined}>
              <span className="ring" style={{ ['--a' as string]: `${Math.round(at * 360)}deg` }}>
                <i />
                <em>{herb
                  ? <Emblem family="herb" subject={herb.key} icon={herb.icon} size={26} alt={herb.name} />
                  : <Svg html={icon('incense', 26)} />}</em>
              </span>
              <b className="cjk">{herb ? herb.han : '空'}</b>
              <i>{herb ? herb.name : CAVE.empty}</i>
              {ripe && (
                <button className="act small" onClick={() => onHarvest(i)}>
                  {CAVE.take(num(harvestValue(state, herb!, bed!.at)))}
                </button>
              )}
              {herb && !ripe && (
                <>
                  {/* 明 What it will be worth, while it is still growing. A bed that
                      says only when it is ripe is a bed you cannot compare. */}
                  <span className="worth">{CAVE.worth(num(harvestValue(state, herb, bed!.at)))}</span>
                  <span className="when">{CAVE.ripeIn(duration(leftOn(state, bed!)))}</span>
                </>
              )}
              {!herb && (
                <button className="act small ghost"
                  onClick={() => setPicking(open === i ? null : i)}>
                  {open === i ? CAVE.close : CAVE.plant}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {open !== null && (
        <div className="seeds">
          {open === 'all' && <p className="faint cavesay">{QOL.cave.pickForAll(empty)}</p>}
          {herbs.map((h) => (
            <button key={h.key} className="seed"
              disabled={open === 'all'
                ? !state.beds.some((b, i) => !b?.herb && canPlant(state, i, h.key))
                : !canPlant(state, open, h.key)}
              onClick={() => {
                if (open === 'all') onPlantAll?.(h.key); else onPlant(open, h.key);
                setPicking(null);
              }}>
              <span className="s"><Emblem family="herb" subject={h.key} icon={h.icon} size={24} alt={h.name} /></span>
              <span className="nm">
                <b className="cjk">{h.han}</b> <em>{h.name}</em>
                <i>{h.says}</i>
                {/* 期 The herb in season, on the row where the choice is made. The
                    multiplier is already inside the two numbers below it, so the chip
                    is saying why they moved rather than adding a number of its own. */}
                {isSeason(state, h) && <WeekTag left={weekLeft(state)} />}
                {/* 換 The whole exchange on one line: material in, qi out, and the rate,
                    which is the only number that settles a short herb against a long
                    one. It was not on the screen at all until Bruno asked what kind of
                    gains the cave even pays. */}
                <u>{CAVE.yields(num(harvestValue(state, h)))}
                  {' · '}{CAVE.perHour(num(Math.round(harvestValue(state, h) / h.hours)))}</u>
              </span>
              <span className="price">
                <b>材 {num(seedCost(state, h))} {UNIT.material}</b>
                <i>{CAVE.after(h.hours)}</i>
              </span>
            </button>
          ))}
          <p className="faint cavelaw"><Term han="洞天" /> {CAVE.law}</p>
          <p className="faint cavelaw">{CAVE.settles}</p>
        </div>
      )}
    </>
  );
}
