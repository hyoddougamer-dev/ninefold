import {
  AFFIX_INFO, RARITIES, RARITY_INFO, SLOT_INFO, realmSet, refinedBy, templateOf,
  type Affix, type Item,
} from '../../data/gear.ts';
import { compare, linesOf, sizeOf, swing, verdictOf, wornSwing, type Swing } from '../../sim/inspect.ts';
import { REFINE_PER_LEVEL } from '../../data/gear.ts';
import { realm as realmOf } from '../../data/realms.ts';
import { gearTile } from '../../art/gear.ts';
import { Svg } from './Svg.tsx';
import type { State } from '../../sim/state.ts';
import { ITEM } from '../copy.ts';
import { salvageValue } from '../../sim/salvage.ts';
import { salvageBonus } from '../../sim/awaken.ts';
import { num } from '../../sim/format.ts';

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
 *   判 the answer, in a word: an upgrade, a trade, the same, or weaker, and how much
 *      power and qi move, also in words. Bruno picked this on the 器 mockup, because
 *      the sheet used to open on five rows of percentages and the 氣 row read 41.3%
 *      for a piece that moved the qi rate by 0.2%
 *   著 the button that acts on it
 *   細 and, folded, everything the answer was worked out from: the rank on the
 *      five-step ladder, every line against what is worn, and why 氣 reads bigger
 *      than it does
 *
 * Nothing here computes anything. The swing comes from `power()` and `rate()` with the
 * piece put on in a copy of the save, which is the same pair of functions the entire
 * game is built on, so the sheet and the game can never disagree.
 */
export function ItemSheet({ state, item, wearing, onWear, onTakeOff, onSalvage, onClose }: {
  state: State;
  item: Item;
  /** True when this is the piece already on the body, rather than one in the chest. */
  wearing: boolean;
  onWear: () => void;
  onTakeOff: () => void;
  /** 拆 Melt it down for qi. */
  onSalvage: () => void;
  onClose: () => void;
}) {
  const tpl = templateOf(item);
  const rar = RARITY_INFO[item.rarity];
  const slot = SLOT_INFO[tpl.slot];
  const worn = state.worn[tpl.slot];
  const against = wearing ? undefined : worn;
  const lines = compare(item, against);
  // 判 A chest piece is read against what is worn; a worn piece against the same place
  // left empty, which is what it is doing for you right now.
  const move: Swing = wearing ? wornSwing(state, item) : swing(state, item);
  const verdict = verdictOf(move);
  const refine = Math.floor(item.refine ?? 0);

  const show = (a: Affix, v: number) =>
    (AFFIX_INFO[a].unit === '%' ? `${Math.round(v * 10) / 10}%` : `${Math.floor(v)}`);
  const row = (han: string, label: string, x: number) => {
    const size = sizeOf(x);
    const dir = size === 'none' ? 'same' : x > 1 ? 'up' : 'down';
    return (
      <div className="vrow" data-dir={dir}>
        <span className="cjk">{han}</span>
        <span className="vlab">{label}</span>
        <b>{dir === 'up' ? '▲ ' : dir === 'down' ? '▼ ' : ''}{ITEM.size[size]}</b>
        <em className="mono">{ITEM.times(x)}</em>
      </div>
    );
  };

  return (
    <div className="itemsheet">
      <div className="head">
        <span className="tile"><Svg html={gearTile(item, { size: 76 })} /></span>
        <span className="who">
          <b className="cjk" style={{ color: rar.colour }}>{tpl.han}</b>
          <i>{tpl.name}</i>
          <em>
            <span className="iseal cjk" style={{ ['--c' as string]: rar.colour }}>{rar.han}</span>
            {rar.name}
            <span className="dot">·</span>
            <span className="cjk">{slot.han}</span> {slot.name}
          </em>
          <em style={{ color: realmOf(tpl.realm).colour }}>{ITEM.fromSet(realmSet(tpl.realm).name, tpl.realm)}</em>
        </span>
      </div>

      {/* 判 The answer first, in words. The numbers ride beside it, small. */}
      <div className="verdict" data-k={wearing ? 'worn' : verdict}>
        <h4>
          {!wearing && <span className="vg">{{ up: '▲', trade: '◆', same: '=', down: '▼' }[verdict]}</span>}
          {wearing ? ITEM.verdict.worn : ITEM.verdict[verdict]}
        </h4>
        <div className="vrows">
          {row('力', ITEM.power, move.power)}
          {row('氣', ITEM.qi, move.rate)}
        </div>
        <p>{wearing ? ITEM.wornSays : ITEM.versus(verdict, worn ? templateOf(worn).name : null)}</p>
      </div>

      <div className="acts">
        {wearing ? (
          <button className="act ghost" onClick={onTakeOff}>脫 <span>{ITEM.takeOff}</span></button>
        ) : (
          <button className={verdict === 'up' || verdict === 'trade' ? 'act' : 'act ghost'} onClick={onWear}>
            著 <span>{verdict === 'up' || verdict === 'trade' ? (worn ? ITEM.swap : ITEM.wear) : ITEM.anyway}</span>
          </button>
        )}
        <button className="act ghost" onClick={onClose}>退 <span>{ITEM.close}</span></button>
      </div>

      {/* 細 Everything the answer was worked out from, for anyone who wants to check it. */}
      <details className="idetail">
        <summary>{ITEM.detail}</summary>

        {/* 階 The rank ladder, drawn. The frame and the glow were carrying this alone. */}
        <h3>{ITEM.rankOf}</h3>
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
                  {/* 頂 The one line that reads bigger than it is, said where it is read. */}
                  {d.affix === 'rate' && d.theirs > 0 && <i className="cap">{ITEM.qiCeiling}</i>}
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
      </details>

      {/* 拆 Melting the piece, on the one screen where a player is actually looking at
          it and can see what they would be giving up. It is never offered for the piece
          on the body: taking it off first is one tap and is the honest order. */}
      {!wearing && (
        <button className="melt" onClick={onSalvage}>
          <b className="cjk">拆</b>
          <i>{ITEM.salvage}</i>
          <em className="mono">{num(salvageValue(item, salvageBonus(state.awakened)))}<span>qi</span></em>
        </button>
      )}
    </div>
  );
}
