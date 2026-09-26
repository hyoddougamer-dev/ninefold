import { useState } from 'react';
import {
  AFFIX_INFO, RARITIES, RARITY_INFO, SET_STEPS, SLOTS, SLOT_INFO,
  activeSets, primaryOf, templateOf, wornRarity, wornTotals,
  type Affix, type Item, type Rarity, type Slot,
} from '../../data/gear.ts';
import { FUSE_COUNT, chestLimit, fusable } from '../../sim/chest.ts';
import { canRefine, refinePrice } from '../../sim/trials.ts';
import { isOpen } from '../../sim/unlocks.ts';
import { REFINE_GAIN, REFINE_LIMIT, clampRefine } from '../../sim/refine.ts';
import { num } from '../../sim/format.ts';
import { affinity } from '../../sim/dao.ts';
import type { State } from '../../sim/state.ts';
import { realm as realmOf } from '../../data/realms.ts';
import { portraitLayers } from '../../art/aura.ts';
import { gearTile, wornRim } from '../../art/gear.ts';
import { Svg } from '../ui/Svg.tsx';
import { Term } from '../ui/Term.tsx';
import { CULTIVATE, GEAR } from '../copy.ts';
import { gearLift, swing } from '../../sim/inspect.ts';
import { salvageWorth, salvageable } from '../../sim/salvage.ts';
import { salvageBonus } from '../../sim/awaken.ts';
import { buysWith } from '../../sim/time.ts';

/**
 * 器 The gear screen: the ring.
 *
 * The six slots orbit the cultivator, which is the layout Bruno chose and the one the
 * art was already heading toward: by the sixth realm the aura itself has an orbit ring,
 * so the gear turning on the same circle costs nothing to justify.
 *
 * An empty slot is drawn dashed and faint on purpose: you have to see that it is empty
 * as fast as you see what is full.
 */
export function Gear({ state, pulse, upTo, onUpTo, onInspect, onFuse, onRefine, onSalvageAll }: {
  state: State;
  pulse: number;
  /** 拆 The rank the bulk melt reaches up to. Held by the app so it survives a tab. */
  upTo: Rarity;
  onUpTo: (r: Rarity) => void;
  /** 拆 Melt everything at or below a rank. */
  onSalvageAll: (upTo: Rarity) => void;
  /** 鑑 Open a piece. Wearing it is a button on the sheet, not a blind tap on a tile. */
  onInspect: (item: Item, wearing: boolean) => void;
  onFuse: (template: string, rarity: string) => void;
  /** 煉器 Refining the piece in a slot. Paid in 材 material and never in qi. */
  onRefine: (slot: Slot) => void;
}) {
  const totals = wornTotals(state.worn, (slot) => affinity(state.unlocked, slot));
  const sets = activeSets(state.worn);
  const best = wornRarity(state.worn);
  // 煉 Fusing opens with 妖丹 at the third realm, when there is junk enough to melt.
  const groups = isOpen(state.realm, 'fuse') ? fusable(state.chest) : [];
  const limit = chestLimit(state.unlocked, totals.capacity, state.awakened);
  const S = 200;
  // 總 What everything worn does, from the sim: the body against itself with nothing on.
  const lift = gearLift(state);
  const worn = SLOTS.some((slot) => state.worn[slot]);
  // 篩 The chest's filter lives here: it is a way of looking, not a fact about the save.
  const [only, setOnly] = useState<'all' | 'better' | Slot>('all');
  // 拆 What the melt would take, so the button can say so before it is pressed.
  const melting = salvageable(state.chest, upTo);
  // 實 With the cards' bonus, because that is what salvage() pays. Without it the button
  // quoted less than landed, up to nine tenths less with every melt card taken.
  const meltWorth = salvageWorth(melting, salvageBonus(state.awakened));
  const opening = buysWith(state, meltWorth);

  return (
    <>
      {/* 桌 On a wide screen the figure stays on the left and the chest scrolls on the
          right. On a phone both wrappers are display: contents and change nothing. */}
      <div className="g-hero">
      <div className="row">
        <span className="faint" style={{ fontSize: 12, letterSpacing: '.14em', textTransform: 'uppercase' }}>
          器 Gear
        </span>
      </div>

      {/* 總 Two numbers that are true, where seven that were sums used to be. Chosen on
          the 器 mockup. The 氣 chip read +333.9% on a body whose gear lifted qi by a
          fifth, because the lines were added before the ceiling bent them. */}
      {worn ? (
        <div className="lift">
          <div className="lp">
            <span className="lghost cjk" aria-hidden="true">力</span>
            <b className="mono"><small>×</small>{lift.power >= 10 ? Math.round(lift.power) : lift.power.toFixed(1)}</b>
            <span className="ll"><span className="cjk">力</span> {GEAR.powerFrom}</span>
            <span className="ls">{GEAR.powerSays(lift.power)}</span>
          </div>
          <div className="lq">
            <span className="lghost cjk" aria-hidden="true">氣</span>
            <b className="mono"><small>×</small>{lift.rate.toFixed(2)}</b>
            <span className="ll"><span className="cjk">氣</span> {GEAR.qiFrom}</span>
            <span className="ls">{GEAR.qiSays}</span>
          </div>
        </div>
      ) : (
        <p className="faint" style={{ fontSize: 13, margin: '4px 0 0' }}>{GEAR.nothingWorn}</p>
      )}

      {worn && (
        <details className="othereff">
          <summary>{GEAR.otherEffects}</summary>
          <div className="oe">
            {(['luck', 'find', 'sunder', 'capacity', 'refine'] as const).filter((a) => totals[a] > 0).map((a) => (
              <div key={a}>
                <span className="cjk"><Term han={AFFIX_INFO[a].han} sense="axis" plain /></span>
                <span>{GEAR.other[a]}</span>
                <em className="mono">
                  {a === 'luck' || a === 'find' ? `×${(1 + totals[a] / 100).toFixed(2)}`
                    : a === 'sunder' ? `−${Math.round(totals[a] * 10) / 10}%`
                      : AFFIX_INFO[a].unit === '%' ? `+${Math.round(totals[a] * 10) / 10}%` : `+${Math.floor(totals[a])}`}
                </em>
              </div>
            ))}
          </div>
        </details>
      )}

      <div className="wheel">
        <div className="wring" />
        {/* 層 The portrait is a stack of HTML-wrapped layers now, so it cannot sit
            inside an <svg> the way the one-piece picture did: a <span> in SVG draws
            nothing, and the ring had an empty middle. The rim goes over it on its own. */}
        <div className="wcore">
          <Svg className="wface" html={portraitLayers({ realm: state.realm, pulse, who: state.self })} />
          <svg className="wrim" viewBox={`0 0 ${S} ${S}`} aria-hidden="true">
            <g dangerouslySetInnerHTML={{ __html: wornRim(best, S) }} />
          </svg>
        </div>
        {SLOTS.map((slot, i) => {
          const a = (i / SLOTS.length) * Math.PI * 2 - Math.PI / 2;
          const x = 50 + Math.cos(a) * 38;
          const y = 50 + Math.sin(a) * 38;
          const item = state.worn[slot];
          return (
            <button
              key={slot}
              className="orb"
              style={{ left: `${x}%`, top: `${y}%` }}
              onClick={() => item && onInspect(item, true)}
              aria-label={item ? `${templateOf(item).name}` : `${SLOT_INFO[slot].name}, empty`}
            >
              <Svg html={gearTile(item, { size: 54, slot, spin: pulse })} />
            </button>
          );
        })}
      </div>

      {best && (
        <p className="faint" style={{ fontSize: 12.5, textAlign: 'center', margin: 0 }}>
          {GEAR.bestLead} <span className="cjk" style={{ color: RARITY_INFO[best].colour }}>
            <Term han={RARITY_INFO[best].han} plain /></span> {RARITY_INFO[best].name} {GEAR.bestTail}
        </p>
      )}
      </div>

      <div className="g-side">
      {/* 煉器 Where material goes. Everything else it buys is capped; this is not. */}
      {isOpen(state.realm, 'refine') && SLOTS.some((slot) => state.worn[slot]) && (
        <>
          <div className="row" style={{ marginTop: 18 }}>
            <h2 className="heading" style={{ margin: 0 }}>{GEAR.refineHead}</h2>
            <span className="mono" style={{ fontSize: 13, color: 'var(--gold)' }}>材 {num(state.materials)}</span>
          </div>
          <p className="faint" style={{ fontSize: 12.5, margin: '4px 0 8px' }}>{GEAR.refine}</p>
          <div className="stack">
            {SLOTS.filter((slot) => state.worn[slot]).map((slot) => {
              const item = state.worn[slot]!;
              const level = clampRefine(item.refine);
              const price = refinePrice(state, slot) ?? 0;
              const maxed = level >= REFINE_LIMIT;
              return (
                <button
                  key={slot}
                  className="refine"
                  disabled={maxed || !canRefine(state, slot)}
                  onClick={() => onRefine(slot)}
                >
                  <span className="tile"><Svg html={gearTile(item, { size: 40, slot })} /></span>
                  <span className="rname">
                    <b className="cjk" style={{ color: RARITY_INFO[item.rarity].colour }}>
                      {templateOf(item).han}
                    </b>
                    <i>{templateOf(item).name}</i>
                    <em>{GEAR.refineAt(level, Math.round(((1 + REFINE_GAIN) ** level - 1) * 100))}</em>
                  </span>
                  <span className="price">
                    {/* 價 A price, not a gain. It read "+12 material", which is what a
                        reward looks like on every other screen of the game. */}
                    <b className={maxed ? 'cjk' : undefined}>{maxed ? '滿' : num(price)}</b>
                    <i className="tag">{maxed ? CULTIVATE.fullWord : CULTIVATE.materialWord}</i>
                  </span>
                </button>
              );
            })}
          </div>
        </>
      )}

      {/* 系 What lineage you are wearing. A set is the realm, so any shape of it counts. */}
      {sets.length > 0 && (
        <>
          <h2 className="heading">系 Sets</h2>
          <p className="faint" style={{ fontSize: 12.5, margin: '0 0 8px' }}>{GEAR.sets}</p>
          <div className="stack">
            {sets.map(({ set, worn, next }) => {
              const hue = realmOf(set.realm).colour;
              return (
                <div key={set.realm} className="setrow" style={{ ['--hue' as string]: hue }}>
                  <span className="pips" aria-label={`${worn} of ${SLOTS.length} worn`}>
                    {SLOTS.map((_, i) => <i key={i} className={i < worn ? 'on' : ''} />)}
                  </span>
                  <span className="sname">
                    <b className="cjk">{set.han}</b> <em>{set.name}</em>
                    <i>{set.lore}</i>
                    {/* 譯 The axes this set pays on, named once, right above the rows
                        that use them. The rows read 運 +2.1% 拾 +0.7% and there was
                        nowhere on the screen saying what 運 or 拾 were: measured by
                        npm run han, four of the thirteen bare characters in the whole
                        game were these. Naming every axis on every row would be nine
                        words per step; naming them once above is the same fact and
                        leaves the rows readable. */}
                    <span className="axes">
                      {[...new Set(set.steps.flatMap((x) => Object.keys(x.effects)))].map((a) => (
                        <em key={a}>
                          <Term han={AFFIX_INFO[a as Affix].han} sense="axis" plain />
                          {' '}{AFFIX_INFO[a as Affix].label}
                        </em>
                      ))}
                    </span>
                  </span>
                  <span className="steps mono">
                    {SET_STEPS.map((n) => {
                      const step = set.steps.find((x) => x.pieces === n)!;
                      const live = worn >= n;
                      return (
                        <span key={n} className={live ? 'step on' : 'step'}>
                          <b>{n}</b>
                          {Object.entries(step.effects).map(([a, v]) => (
                            <em key={a}>
                              <span className="cjk">{AFFIX_INFO[a as Affix].han}</span>
                              {AFFIX_INFO[a as Affix].unit === '%' ? `+${v}%` : `+${v}`}
                            </em>
                          ))}
                        </span>
                      );
                    })}
                  </span>
                  {next && (
                    <span className="need faint">
                      {GEAR.setNeed(next.needs)}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {groups.length > 0 && (
        <>
          <h2 className="heading">{GEAR.fuse}</h2>
          <div className="stack">
            {groups.map((g) => {
              const tpl = templateOf({ id: '', template: g.template, rarity: g.rarity, rolls: [] });
              const rar = RARITY_INFO[g.rarity];
              return (
                /* 煉 The same row 狩 uses (a seal, a name, a figure on the right) shared
                   on purpose rather than by accident, and carrying its own name so that
                   restyling one screen cannot silently restyle the other. */
                <button key={`${g.template}-${g.rarity}`} className="beast fuserow"
                  onClick={() => onFuse(g.template, g.rarity)}>
                  <span className="seal" style={{ width: 44, height: 44 }}>
                    <Svg html={gearTile({ id: 'x', template: g.template, rarity: g.rarity, rolls: [] }, { size: 44 })} />
                  </span>
                  <span className="bname">
                    <b style={{ color: rar.colour }}>{tpl.han}</b>
                    <i>{tpl.name} · {g.count} in the chest</i>
                  </span>
                  <span className="odds" style={{ color: 'var(--jade)' }}>
                    {FUSE_COUNT}→1<em>fuse</em>
                  </span>
                </button>
              );
            })}
          </div>
        </>
      )}

      <h2 className="heading">
        藏 Chest
        <span className="mono" style={{
          float: 'right',
          color: state.chest.length >= limit ? 'var(--cinnabar)' : 'var(--faint)',
        }}>
          {state.chest.length} / {limit}
        </span>
      </h2>

      {/* 拆 Melting the junk. The rank chips are the whole control: whatever is lit,
          everything at or below it goes, and the button says how many and for how much
          before it is pressed. A bulk action that does not state its own size is a trap,
          and this one cannot be undone. */}
      {state.chest.length > 0 && (
        <div className="melting">
          <div className="ranks">
            {RARITIES.map((r) => (
              <button key={r} data-on={r === upTo} className="rk"
                      style={{ ['--hue' as string]: RARITY_INFO[r].colour }}
                      onClick={() => onUpTo(r)}
                      aria-label={`${RARITY_INFO[r].name} and below`}>
                <b className="cjk">{RARITY_INFO[r].han}</b>
              </button>
            ))}
            <span className="upto">{GEAR.upTo(RARITY_INFO[upTo].name)}</span>
          </div>
          <button className="melt wide" disabled={melting.length === 0}
                  onClick={() => onSalvageAll(upTo)}>
            <b className="cjk">拆</b>
            <i>{GEAR.salvage(melting.length)}
              {/* 買 Where the qi goes the instant it lands. The ladder buys a rung the
                  moment it can afford one, so a melt worth more than the rung you are
                  standing on makes the big number fall, and the button says so first. */}
              <span className="goes">{opening.rungs > 0 ? GEAR.opens(opening.rungs) : GEAR.banks}</span>
            </i>
            <em className="mono">{num(meltWorth)}<span>qi</span></em>
          </button>
        </div>
      )}

      {state.chest.length === 0 ? (
        <p className="faint" style={{ fontSize: 13, margin: 0 }}>{GEAR.empty}</p>
      ) : (() => {
        // 鑑 "Better" is what the sim says happens to 力 and 氣 when you put it on.
        // It used to be the sum of the raw roll values, which answers nothing: a
        // 藏 chest-slots roll and a 力 power roll are not the same kind of number,
        // so four small lines could out-triangle a piece that doubles your power.
        const read = state.chest.map((item) => ({ item, move: swing(state, item) }));
        // 序 Upgrades first, the biggest first; then the rarest. A chest of forty is
        // read from the top, so the top is where the news goes.
        read.sort((a, b) => (Number(b.move.better) - Number(a.move.better))
          || (a.move.better ? b.move.power - a.move.power : 0)
          || (RARITIES.indexOf(b.item.rarity) - RARITIES.indexOf(a.item.rarity))
          || (templateOf(b.item).realm - templateOf(a.item).realm));
        const ups = read.filter((r) => r.move.better).length;
        const pick = only === 'better' ? read.filter((r) => r.move.better)
          : only === 'all' ? read : read.filter((r) => templateOf(r.item).slot === only);
        const bySlot = (slot: Slot) => read.filter((r) => templateOf(r.item).slot === slot).length;
        return (
          <>
            <div className="chestfilter" role="group" aria-label={GEAR.all}>
              <button type="button" aria-pressed={only === 'all'} onClick={() => setOnly('all')}>
                {GEAR.all} <i className="mono">{read.length}</i>
              </button>
              {ups > 0 && (
                <button type="button" className="ups" aria-pressed={only === 'better'} onClick={() => setOnly('better')}>
                  ▲ {GEAR.betterOnly} <i className="mono">{ups}</i>
                </button>
              )}
              {SLOTS.filter((slot) => bySlot(slot) > 0).map((slot) => (
                <button key={slot} type="button" aria-pressed={only === slot} onClick={() => setOnly(slot)}>
                  <span className="cjk">{SLOT_INFO[slot].han}</span> {SLOT_INFO[slot].name} <i className="mono">{bySlot(slot)}</i>
                </button>
              ))}
            </div>
            <div className="chest">
              {pick.map(({ item, move }, index) => {
                const tpl = templateOf(item);
                const primary = primaryOf(item);
                return (
                  <button key={item.id} className="chestit" data-better={move.better}
                          onClick={() => onInspect(item, false)}
                          data-coach={index === 0 ? 'chest-first' : undefined}
                          // 譯 The tile carries no number now, so the screen reader is told
                          // what the eye is shown: the name, the rank, and whether it is better.
                          aria-label={`${tpl.name}, ${RARITY_INFO[item.rarity].name}${primary
                            ? `, ${AFFIX_INFO[primary.affix].label} ${Math.round(primary.value * 10) / 10}` : ''}${move.better ? `, ${GEAR.better}` : ''}`}>
                    <Svg html={gearTile(item, { size: 56, spin: pulse })} />
                    {move.better && <span className="upmark" aria-hidden="true">▲</span>}
                  </button>
                );
              })}
            </div>
            {ups > 0 && <p className="faint chestlegend"><b>▲</b> {GEAR.legend}</p>}
          </>
        );
      })()}

      <p className="faint" style={{ fontSize: 12, marginTop: 12, lineHeight: 1.7 }}>
        <Term han="拆" /> {GEAR.melting}<br />
        {GEAR.howTo}<br />
        {GEAR.drops(state.realm)}
      </p>
      </div>
    </>
  );
}
