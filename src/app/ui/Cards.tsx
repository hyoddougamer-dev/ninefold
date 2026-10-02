import { useState } from 'react';
import { AWAKENINGS, held, type Card } from '../../sim/awaken.ts';
import { alternatives, retrade, retradeCost, retradeDays } from '../../sim/retrade.ts';
import { cardWorth } from '../../sim/cardworth.ts';
import { HEAVENS } from '../../data/heavens.ts';
import { realm as realmOf } from '../../data/realms.ts';
import { num } from '../../sim/format.ts';
import type { State } from '../../sim/state.ts';
import { icon } from '../../art/icon.ts';
import { AWAKEN } from '../copy.ts';
import { Svg } from './Svg.tsx';

/**
 * 改 Every 悟道 card taken, and a way to trade one for another of the three it came with.
 *
 * rekaris, on the Discord: *"I would much rather be able to change my past choices when
 * tweaking/changing builds rather than being locked into previous poor decision,
 * especially in long term idle."* Bruno chose to let any card be traded, paid in days of
 * the cultivator's own qi and dearer the further back it is (see sim/retrade.ts).
 *
 * Until this page the game never showed the cards held at all: a card was seen once, on
 * the day it was taken, and after that only in what it did.
 */
const days = (d: number) => (d === 0.5 ? 'half a day' : d === 1 ? 'a day' : `${d} days`);

/** Where card `i` was offered: a realm's breakthrough, or a heaven past the ninth. */
function whence(i: number): string {
  if (i < AWAKENINGS.length) { const r = realmOf(i + 2); return AWAKEN.hand.fromRealm(r.han, r.name); }
  const h = HEAVENS[i - AWAKENINGS.length];
  return h ? AWAKEN.hand.fromHeaven(h.han, h.name) : '';
}

export function Cards({ state, onTrade, onClose }: {
  state: State;
  onTrade: (index: number, key: string) => void;
  onClose: () => void;
}) {
  const cards = held(state.awakened);
  const [open, setOpen] = useState<number | null>(null);
  /** 確 The card a first tap asked for. Qi paid is gone, so the second tap is the one that pays. */
  const [sure, setSure] = useState<string | null>(null);

  /** What an alternative does, read as if it stood where card `i` stands. */
  const says = (i: number, c: Card) => AWAKEN.effect(c.effect, cardWorth(state, c, i));

  return (
    <div className="help cardbook">
      <h2><span className="cjk">悟道</span> {AWAKEN.hand.title}</h2>
      <p className="faint cb-blurb">{cards.length ? AWAKEN.hand.blurb : AWAKEN.hand.none}</p>

      {cards.map((c, i) => {
        const cost = retradeCost(state, i);
        const isOpen = open === i;
        return (
          <section key={`${i}${c.key}`} className="cb-card" data-open={isOpen || undefined}>
            <div className="cb-head">
              <span className="cb-icon"><Svg html={icon(c.icon, 30)} /></span>
              <div>
                <i>{whence(i)}</i>
                <b><span className="cjk">{c.han}</span> {c.name}</b>
                <p>{c.says}</p>
              </div>
              <button type="button" className="cb-change" aria-expanded={isOpen}
                onClick={() => { setOpen(isOpen ? null : i); setSure(null); }}>
                {isOpen ? AWAKEN.hand.keep : AWAKEN.hand.change}
              </button>
            </div>
            {isOpen && (
              <div className="cb-alts">
                <p className="cb-cost">{AWAKEN.hand.cost(days(retradeDays(state.awakened, i)), `${num(cost)} qi`)}</p>
                {alternatives(state.awakened, i).map((alt) => {
                  const refused = retrade(state, i, alt.key).refused;
                  return (
                    <div key={alt.key} className="cb-alt">
                      <span className="cb-icon"><Svg html={icon(alt.icon, 26)} /></span>
                      <div>
                        <b><span className="cjk">{alt.han}</span> {alt.name}</b>
                        <p>{says(i, alt)}</p>
                        {refused && <em>{AWAKEN.hand.why[refused]}</em>}
                      </div>
                      <button type="button" className={sure === alt.key ? 'act' : 'act ghost'} disabled={!!refused}
                        onClick={() => {
                          if (sure !== alt.key) { setSure(alt.key); return; }
                          onTrade(i, alt.key); setOpen(null); setSure(null);
                        }}>
                        {sure === alt.key ? AWAKEN.hand.sure(num(cost)) : AWAKEN.hand.trade}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        );
      })}

      <button className="act" style={{ marginTop: 4 }} onClick={onClose}>
        閉 <span>{AWAKEN.hand.close}</span>
      </button>
    </div>
  );
}

