import { useState } from 'react';
import {
  BEDS, canPlant, grown, harvestValue, herbOf, isRipe, leftOn, plantable, seedCost,
  type Herb,
} from '../../sim/cave.ts';
import { duration, num } from '../../sim/format.ts';
import { icon } from '../../art/icon.ts';
import { Svg } from './Svg.tsx';
import { Term } from './Term.tsx';
import { CAVE } from '../copy.ts';
import type { State } from '../../sim/state.ts';

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
export function Cave({ state, onPlant, onHarvest }: {
  state: State;
  onPlant: (which: number, key: string) => void;
  onHarvest: (which: number) => void;
}) {
  /** Which bed has its herb list open, if any. It is a screen's worth of state, not a save's. */
  const [picking, setPicking] = useState<number | null>(null);
  const herbs = plantable(state);

  return (
    <>
      <h2 className="heading">{CAVE.head}</h2>
      <p className="faint cavesay">{CAVE.says}</p>
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
                <em><Svg html={icon(herb?.icon ?? 'incense', 26)} /></em>
              </span>
              <b className="cjk">{herb ? herb.han : '空'}</b>
              <i>{herb ? herb.name : CAVE.empty}</i>
              {ripe && (
                <button className="act small" onClick={() => onHarvest(i)}>
                  {CAVE.take(num(harvestValue(state, herb!)))}
                </button>
              )}
              {herb && !ripe && (
                <>
                  {/* 明 What it will be worth, while it is still growing. A bed that
                      says only when it is ripe is a bed you cannot compare. */}
                  <span className="worth">{CAVE.worth(num(harvestValue(state, herb)))}</span>
                  <span className="when">{CAVE.ripeIn(duration(leftOn(state, bed!)))}</span>
                </>
              )}
              {!herb && (
                <button className="act small ghost"
                  onClick={() => setPicking(picking === i ? null : i)}>
                  {picking === i ? CAVE.close : CAVE.plant}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {picking !== null && (
        <div className="seeds">
          {herbs.map((h) => (
            <button key={h.key} className="seed" disabled={!canPlant(state, picking, h.key)}
              onClick={() => { onPlant(picking, h.key); setPicking(null); }}>
              <span className="s"><Svg html={icon(h.icon, 24)} /></span>
              <span className="nm">
                <b className="cjk">{h.han}</b> <em>{h.name}</em>
                <i>{h.says}</i>
                {/* 換 The whole exchange on one line: material in, qi out, and the rate,
                    which is the only number that settles a short herb against a long
                    one. It was not on the screen at all until Bruno asked what kind of
                    gains the cave even pays. */}
                <u>{CAVE.yields(num(harvestValue(state, h)))}
                  {' · '}{CAVE.perHour(num(Math.round(harvestValue(state, h) / h.hours)))}</u>
              </span>
              <span className="price">
                <b>材 {num(seedCost(state, h))}</b>
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
