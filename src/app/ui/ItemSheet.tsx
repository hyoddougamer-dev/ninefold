import {
  AFFIX_INFO, RARITIES, RARITY_INFO, SLOT_INFO, refinedBy, templateOf,
  type Affix, type Item,
} from '../../data/gear.ts';
import { compare, linesOf, swing } from '../../sim/inspect.ts';
import { REFINE_PER_LEVEL } from '../../data/gear.ts';
import { realm as realmOf } from '../../data/realms.ts';
import { gearTile } from '../../art/gear.ts';
import { Svg } from './Svg.tsx';
import type { State } from '../../sim/state.ts';
import { ITEM } from '../copy.ts';

/**
 * 鑑 What a piece is, and what it would do.
 *
 * Bruno: *"não existem tooltips, comparação entre equipado e a equipar, não se sabe ao
 * certo os stats de cada item, a rarity, borders etc."* Four complaints, one hole:
 * tapping a piece in the chest **wore it**, so there was never a moment in which a
 * player could look at it. The only thing the chest ever said about a piece was its
 * first line and a small ▲.
 *
 * So a tap opens this instead, and wearing it is a button on it. In order:
 *
 *   階 where its rank sits on the five-step ladder, drawn, with the rank named in
 *      English — the borders and the glow were carrying that on their own
 *   線 every line it has, with the character, the English label and the value, the
 *      first marked 主 because that is the one the chest tile shows
 *   比 the same lines against what you are wearing in that slot, both sides, so a
 *      trade that loses something says what it loses
 *   果 and the only verdict that cannot lie: what the sim says your 力 and your 氣
 *      would actually become
 *
 * Nothing here computes anything. The swing comes from `power()` and `rate()` with the
 * piece put on in a copy of the save, which is the same pair of functions the entire
 * game is built on, so the sheet and the game can never disagree.
 */
export function ItemSheet({ state, item, wearing, onWear, onTakeOff, onClose }: {
  state: State;
  item: Item;
  /** True when this is the piece already on the body, rather than one in the chest. */
  wearing: boolean;
  onWear: () => void;
  onTakeOff: () => void;
  onClose: () => void;
}) {
  const tpl = templateOf(item);
  const rar = RARITY_INFO[item.rarity];
  const slot = SLOT_INFO[tpl.slot];
  const worn = state.worn[tpl.slot];
  const against = wearing ? undefined : worn;
  const lines = compare(item, against);
  const move = wearing ? null : swing(state, item);
  const refine = Math.floor(item.refine ?? 0);

  const show = (a: Affix, v: number) =>
    (AFFIX_INFO[a].unit === '%' ? `${Math.round(v * 10) / 10}%` : `${Math.floor(v)}`);

  return (
    <div className="itemsheet">
      <div className="head">
        <span className="tile"><Svg html={gearTile(item, { size: 76 })} /></span>
        <span className="who">
          <b className="cjk" style={{ color: rar.colour }}>{tpl.han}</b>
          <i>{tpl.name}</i>
          <em>
            <span className="cjk">{slot.han}</span> {slot.name}
            <span className="dot">·</span>
            <span style={{ color: realmOf(tpl.realm).colour }}>{ITEM.fromRealm(tpl.realm)}</span>
          </em>
        </span>
      </div>

      {/* 階 The rank ladder, drawn. The frame and the glow were carrying this alone. */}
      <div className="ranks" aria-label={rar.name}>
        {RARITIES.map((r) => (
          <span key={r} className="rank" data-on={r === item.rarity}
            style={{ ['--c' as string]: RARITY_INFO[r].colour }}>
            <b className="cjk">{RARITY_INFO[r].han}</b>
          </span>
        ))}
        <span className="rankname" style={{ color: rar.colour }}>
          {rar.name}<i>{ITEM.lines(linesOf(item.rarity))}</i>
        </span>
      </div>

      {refine > 0 && (
        <p className="faint refined">
          {ITEM.refined(refine, Math.round((refinedBy(item) - 1) * 100), Math.round(REFINE_PER_LEVEL * 100))}
        </p>
      )}

      <h3>{against ? ITEM.against(templateOf(against).name) : ITEM.what}</h3>
      <div className="lines">
        {lines.map((d, i) => {
          const delta = d.theirs - d.mine;
          return (
            <div key={d.affix} className="line" data-up={delta > 0} data-down={delta < 0}>
              <b className="cjk">{AFFIX_INFO[d.affix].han}</b>
              <span className="lab">
                {AFFIX_INFO[d.affix].label}
                {i === 0 && !against && <em className="cjk">主</em>}
              </span>
              {against ? (
                <span className="vs mono">
                  <i>{d.mine > 0 ? show(d.affix, d.mine) : '—'}</i>
                  <em>→</em>
                  <b>{d.theirs > 0 ? show(d.affix, d.theirs) : '—'}</b>
                </span>
              ) : (
                <span className="vs mono"><b>+{show(d.affix, d.theirs)}</b></span>
              )}
            </div>
          );
        })}
      </div>

      {/* 果 The verdict, taken from the sim rather than from adding roll values up. */}
      {move && (
        <div className="verdictbox" data-better={move.better}>
          <span className="swing" data-sign={Math.sign(move.power - 1)}>
            <b className="cjk">力</b>
            <em className="mono">{ITEM.times(move.power)}</em>
            <i>power</i>
          </span>
          <span className="swing" data-sign={Math.sign(move.rate - 1)}>
            <b className="cjk">氣</b>
            <em className="mono">{ITEM.times(move.rate)}</em>
            <i>qi per second</i>
          </span>
        </div>
      )}

      <div className="acts">
        {wearing ? (
          <button className="act ghost" onClick={onTakeOff}>脫 <span>{ITEM.takeOff}</span></button>
        ) : (
          <button className="act" onClick={onWear}>
            著 <span>{worn ? ITEM.swap : ITEM.wear}</span>
          </button>
        )}
        <button className="act ghost" onClick={onClose}>退 <span>{ITEM.close}</span></button>
      </div>
    </div>
  );
}
