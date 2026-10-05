import { useMemo } from 'react';
import {
  AFFIX_INFO, FUSED, RARITIES, RARITY_INFO, SLOT_INFO, callingOf, realmSet, refinedBy, schoolOf, templateOf,
  type Affix, type Calling, type Item,
} from '../../data/gear.ts';
import { fightDeps } from '../memo.ts';
import { SCHOOL_INFO } from '../../data/schools.ts';
import {
  compare, ifBare, ifWorn, levelsCarried, linesOf, sizeOf, swing, verdictByLines, verdictOf, verdictWithFight, wornSwing, type Swing,
} from '../../sim/inspect.ts';
import { nearestTrial, trialOdds } from '../../sim/reach.ts';
import { BEASTS } from '../../data/bestiary.ts';
import { REFINE_PER_LEVEL } from '../../data/gear.ts';
import { realm as realmOf } from '../../data/realms.ts';
import { gearTile } from '../../art/gear.ts';
import { Svg } from './Svg.tsx';
import type { State } from '../../sim/state.ts';
import { CLASS, ITEM, QOL, UNIT } from '../copy.ts';
import { meltQuote } from '../../sim/salvage.ts';
import { num } from '../../sim/format.ts';
import { loadoutsOf } from '../../sim/sets.ts';
import { qualityOf } from '../../sim/chest.ts';
import { FUSE_TOP } from '../../sim/balance.ts';

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
export function ItemSheet({ state, item, wearing, onWear, onTakeOff, onSalvage, onLock, onClose }: {
  state: State;
  item: Item;
  /** True when this is the piece already on the body, rather than one in the chest. */
  wearing: boolean;
  onWear: () => void;
  onTakeOff: () => void;
  /** 拆 Melt it down for qi. */
  onSalvage: () => void;
  /** 鎖 Keep it, or stop keeping it. */
  onLock: (on: boolean) => void;
  onClose: () => void;
}) {
  const tpl = templateOf(item);
  const rar = RARITY_INFO[item.rarity];
  const slot = SLOT_INFO[tpl.slot];
  const worn = state.worn[tpl.slot];
  const against = wearing ? undefined : worn;
  // 承 Read as it would be once on: it takes the slot's refining levels (see compare).
  const lines = compare(item, against);
  const carried = levelsCarried(item, against);
  // 判 A chest piece is read against what is worn; a worn piece against the same place
  // left empty, which is what it is doing for you right now.
  const move: Swing = wearing ? wornSwing(state, item) : swing(state, item);
  const refine = Math.floor(item.refine ?? 0);
  // 套 The loadouts that name this piece: while any does, it cannot be unlocked.
  const held = loadoutsOf(state, item.id);
  // 算 The nearest fight is every beast's odds, so it is worked out when a fight could
  // have changed and not on every tick of the clock.
  const { trial, oddsBefore, oddsAfter } = useMemo(() => {
    const t = nearestTrial(state);
    return {
      trial: t,
      oddsBefore: t ? trialOdds(wearing ? ifBare(state, item) : state, t) : 0,
      oddsAfter: t ? trialOdds(wearing ? state : ifWorn(state, item), t) : 0,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item, wearing, ...fightDeps(state)]);
  const byNumbers = verdictByLines(verdictOf(move), lines);
  const verdict = trial ? verdictWithFight(byNumbers, oddsBefore, oddsAfter) : byNumbers;
  // Which of the two spoke, and which way: the sentence under the verdict says why.
  const fight = verdict === byNumbers ? null : oddsAfter > oddsBefore ? 'wins' : 'loses';
  const pct = (x: number) => `${Math.round(Math.max(0, Math.min(1, x)) * 100)}%`;
  // 質 A piece a fusion made says so, and how good it came out, where a found one says who left it.
  const leftBy = item.from === FUSED
    ? ITEM.fusedFrom(rar.name, qualityOf(item), FUSE_TOP, item.rarity === 'heaven')
    : ITEM.leftBy(item.from, BEASTS.find((b) => b.key === item.from)?.name ?? null);
  const says = item.rolls.map((r) => r.affix).filter((a) => a in ITEM.axisSays);
  // 職 The class now, and the class with this piece on: the same function both times.
  const school = schoolOf(item);
  const nameOf = (c: Calling) => (c.kind === 'pure' && c.school ? SCHOOL_INFO[c.school].name
    : c.kind === 'pair' && c.pair ? c.pair.name : null);
  const now = callingOf(state.worn);
  const then = wearing ? now : callingOf(ifWorn(state, item).worn);
  const was = nameOf(now);
  const will = nameOf(then);
  const step = now.kind === 'pure' && then.kind === 'pure' && now.school === then.school && now.school
    && now.tier !== then.tier ? SCHOOL_INFO[now.school].short : null;
  const shift = step ? (then.tier > now.tier ? CLASS.toItsFull(step) : CLASS.offItsFull(step))
    : was === will ? null
      : will && was ? CLASS.instead(will, was)
        : will ? CLASS.becomes(will) : was ? CLASS.loses(was) : null;

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
        {/* 列 Every line on the piece, up here beside power and qi, so nothing has to be
            opened or scrolled to. rekaris, on the Discord: *"I would find it better to be in
            the top with power and qi ... I play at 150% zoom."* Against what is worn, a line
            that rises is jade and one that falls is red, and a line the worn piece has and
            this one lacks is shown as +0 with a dashed edge (rekaris again: a piece with no
            drop chance otherwise looks strictly better). */}
        <div className="vlines">
          {lines.filter((d) => d.theirs > 0 || (against && d.mine > 0)).map((d) => (
            <span key={d.affix} className="vline" data-none={d.theirs <= 0 || undefined} data-up={(against && d.theirs > d.mine) || undefined} data-down={(against && d.theirs < d.mine) || undefined}>
              <b className="cjk">{AFFIX_INFO[d.affix].han}</b> {AFFIX_INFO[d.affix].label}{' '}
              <em className="mono">+{show(d.affix, d.theirs)}</em>
            </span>
          ))}
        </div>
        {carried > 0 && <p className="carried">{QOL.gear.carried(carried)}</p>}
        <p>{wearing ? ITEM.wornSays : ITEM.versus(verdict, worn ? templateOf(worn).name : null, move.costsClass, fight)}</p>
      </div>

      {/* 戰 The same piece as odds in the nearest fight that is not yet sure. */}
      {trial && (
        <div className="fightbox">
          <h5>{ITEM.fight}</h5>
          <p>{ITEM.fightAgainst(trial.beast.name, trial.floor)}</p>
          <div className="fodds">
            <b className="mono">{pct(oddsBefore)}</b><i>→</i><b className="mono" data-up={oddsAfter > oddsBefore}>{pct(oddsAfter)}</b>
            {wearing && <em>{ITEM.withWithout}</em>}
          </div>
          <span className="ftrack"><i style={{ width: pct(oddsAfter) }} className="after" /><i style={{ width: pct(oddsBefore) }} /></span>
        </div>
      )}

      {/* 源 Who left it, and the line its lineage has always had. */}
      <div className="origin">
        {leftBy && <b>{leftBy}</b>}
        <q>{realmSet(tpl.realm).lore}</q>
      </div>

      {/* 職 Which school the piece is, and whether putting it on changes the class. */}
      <div className="ischool" style={{ ['--c' as string]: SCHOOL_INFO[school].colour }}>
        <b><span className="cjk">{SCHOOL_INFO[school].seal}</span> {CLASS.pieceOf(SCHOOL_INFO[school].short)}</b>
        {shift && <span>{shift}</span>}
      </div>

      {/* 解 The lines that move a number, each in a sentence. */}
      {says.length > 0 && (
        <div className="says">
          {says.map((a) => (
            <div key={a}><span className="cjk">{AFFIX_INFO[a].han}</span><span>{ITEM.axisSays[a]}</span></div>
          ))}
        </div>
      )}

      <div className="acts">
        {wearing ? (
          <button className="act ghost" onClick={onTakeOff}>脫 <span>{ITEM.takeOff}</span></button>
        ) : (
          <button className={verdict === 'up' || verdict === 'trade' ? 'act' : 'act ghost'} onClick={onWear}>
            著 <span>{verdict === 'up' || verdict === 'trade' ? (worn ? ITEM.swap : ITEM.wear) : ITEM.anyway}</span>
          </button>
        )}
        {/* 鎖 Kept on purpose: no melt, no fusion, and a full chest leaves it alone. 套 A
            piece a loadout names stays locked, and the line under the buttons says why. */}
        <button className="act ghost lockbtn" data-on={item.locked ? 'true' : undefined} aria-pressed={!!item.locked}
          disabled={item.locked && held.length > 0}
          onClick={() => onLock(!item.locked)}>鎖 <span>{item.locked ? ITEM.unlock : ITEM.lock}</span></button>
        <button className="act ghost" onClick={onClose}>退 <span>{ITEM.close}</span></button>
      </div>
      {item.locked && <p className="faint lockedsays">{ITEM.lockedSays}</p>}
      {item.locked && held.length > 0 && <p className="faint lockedsays" data-qol="in-loadout">{ITEM.inLoadout(held)}</p>}

      {/* 細 Everything the answer was worked out from, for anyone who wants to check it.
          Open from the start where the screen has room for it. rekaris, on the Discord:
          *"It is very annoying to have to click each time I want to see the other stats
          ... there is plenty of space, at least on desktop."* */}
      <details className="idetail" open={roomy() || undefined}>
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
      {!wearing && !item.locked && refine > 0 && <p className="faint meltlevels">{ITEM.meltLevels(refine)}</p>}
      {!wearing && !item.locked && (
        <button className="melt" onClick={onSalvage}>
          <b className="cjk">拆</b>
          <i>{ITEM.salvage}</i>
          {(() => {
            // 拆 Quoted through the melting allowance, exactly as the melt will pay it.
            const q = meltQuote(state, [item]);
            return (
              <em className="mono">
                {q.qi > 0 && <>{num(q.qi)}<span>qi</span></>}
                {q.materials > 0 && <span className="mats">+{num(q.materials)} 材 {UNIT.material}</span>}
              </em>
            );
          })()}
        </button>
      )}
    </div>
  );
}

/** A screen wide enough to show every line of a piece without being asked. */
function roomy(): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    && window.matchMedia('(min-width: 900px)').matches;
}
