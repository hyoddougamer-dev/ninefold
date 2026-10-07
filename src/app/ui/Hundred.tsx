import { useMemo, useState } from 'react';
import {
  HUNDRED_RANKS, ITEM_BY_KEY, RECIPE_BY_KEY, hundredElite, hundredLevel, metalKey, type HundredRank,
} from '../../data/crafts.ts';
import {
  AFFIX_INFO, GEAR, RARITY_INFO, REALM_SETS, SLOTS, SLOT_INFO, TEMPLATE_BY_KEY, type Affix, type Slot,
} from '../../data/gear.ts';
import { SCHOOL_INFO, schoolOfAxis } from '../../data/schools.ts';
import { wardenOf } from '../../data/bestiary.ts';
import { realm as realmOf } from '../../data/realms.ts';
import { CODEX, CRUCIBLE } from '../../data/hundred.ts';
import {
  CODEX_CAP, CODEX_RANK, CODEX_WORN, HUNDRED_BREACH, HUNDRED_HEAVEN_MADE, HUNDRED_KIT, HUNDRED_STEPS, SECONDARIES,
} from '../../sim/balance.ts';
import {
  codexHeld, codexRank, codexValue, codexWorth, keptRank, lineAxes, lineValue, materialReached, orderNeeds, orderRecipe, pieceOf,
  piecesMade, placesMade, portionOf, setOpen, spiritOf, wornOfSet, type Order, type Portions,
} from '../../sim/hundred.ts';
import { blocked, held, levelIn, secondsOf } from '../../sim/crafts.ts';
import { swing } from '../../sim/inspect.ts';
import { duration, num } from '../../sim/format.ts';
import type { State } from '../../sim/state.ts';
import { gearTile } from '../../art/gear.ts';
import { spiritRim } from '../../art/spirit.ts';
import { Svg } from './Svg.tsx';
import { Term } from './Term.tsx';
import { HUNDRED } from '../copy.ts';

type Page = 'crucible' | 'sets' | 'codex';

/** 百 The rank's English name, the way every frame in the game says it. */
const rankName = (r: HundredRank) => RARITY_INFO[r].name;
const pct = (x: number) => Number((x * 100).toFixed(1));
const days = (x: number) => Number(x.toFixed(2));
/** 譜 What a codex bonus says at a value. */
const says = (key: (typeof CODEX)[number]['key'], v: number) =>
  key === 'gates' ? HUNDRED.codexSays.gates(days(v)) : HUNDRED.codexSays[key](pct(v));

/** 譜 A codex bonus as a bare number: a share, or days for the bottlenecks. */
const worth = (key: (typeof CODEX)[number]['key'], v: number) => (key === 'gates' ? `${days(v)}d` : `${pct(v)}%`);

/** The shapes of a set's place, power first, the way the crucible lists them. */
function shapesOf(realm: number, slot: Slot) {
  return GEAR.filter((g) => g.realm === realm && g.slot === slot);
}

/** 爐 A first order for a place: the shape that leads with power, every line it can have, two portions. */
function firstOrder(s: State, realm: number, slot: Slot, rarity: HundredRank, template?: string): Order {
  const shapes = shapesOf(realm, slot);
  const tpl = (template && TEMPLATE_BY_KEY[template]) || shapes.find((g) => g.affix === 'power') || shapes[0];
  const order: Affix[] = ['power', 'sunder', 'art', 'rate', 'luck', 'refine', 'find', 'capacity'];
  const can = order.filter((a) => lineAxes(tpl).includes(a));
  const reached = can.filter((a) => materialReached(s, CRUCIBLE[a](realm)));
  const picks = [...reached, ...can.filter((a) => !reached.includes(a))].slice(0, SECONDARIES[rarity]);
  return { template: tpl.key, rarity, main: 2, lines: picks.map((affix) => ({ affix, n: 2 as Portions })) };
}

/** The best rank the forge allows for a set right now, or Mystic while none is. */
function bestRank(s: State, realm: number): HundredRank {
  const lv = levelIn(s, 'forge');
  const ok = HUNDRED_RANKS.filter((r) => hundredLevel(realm, r) <= lv
    && (r !== 'heaven' || piecesMade(s.crafts.made, realm) >= HUNDRED_HEAVEN_MADE));
  return ok[ok.length - 1] ?? 'mystic';
}

/**
 * 百煉 The Hundredfold section of the forge: the crucible, the nine sets and 譜 the codex.
 *
 * Everything it shows is read off the sim: the line a number of portions makes is
 * lineValue, what it asks for is orderNeeds, and what wearing it would do is the same swing
 * the chest's ▲ reads. So the crucible quotes the piece the forge will make, to the decimal.
 */
export function Hundred({ state, onOrder }: { state: State; onOrder: (o: Order | null) => void }) {
  const [page, setPage] = useState<Page>('crucible');
  return (
    <div className="hundred">
      <p className="faint hu-intro">{HUNDRED.intro}</p>
      <div className="hu-tabs" role="tablist">
        {([['crucible', '爐'], ['sets', '系'], ['codex', '譜']] as const).map(([k, han]) => (
          <button key={k} role="tab" aria-selected={page === k} onClick={() => setPage(k)}>
            <b className="cjk">{han}</b> {HUNDRED.tabs[k]}</button>
        ))}
      </div>
      {page === 'crucible' && <Crucible state={state} onOrder={onOrder} />}
      {page === 'sets' && <Sets state={state} />}
      {page === 'codex' && <Codex state={state} />}
    </div>
  );
}

function Crucible({ state, onOrder }: { state: State; onOrder: (o: Order | null) => void }) {
  const running = state.crafts.order ?? null;
  const top = Math.min(9, state.realm);
  const [o, setO] = useState<Order>(() => running ?? firstOrder(state, top, 'weapon', bestRank(state, top)));
  const tpl = TEMPLATE_BY_KEY[o.template];
  const realm = tpl.realm;
  const slot = tpl.slot;
  const set = REALM_SETS[realm - 1];
  const colour = realmOf(realm).colour;
  const piece = useMemo(() => pieceOf(o, 'crucible')!, [o]);
  const move = useMemo(() => swing(state, piece), [state, piece]);
  const needs = orderNeeds(o);
  const r = orderRecipe(o)!;
  const inHand = running && JSON.stringify(running) === JSON.stringify(o) && state.crafts.task === r.key;
  const level = levelIn(state, 'forge');
  const made = piecesMade(state.crafts.made, realm);
  const unreached = o.lines.find((l) => !materialReached(state, CRUCIBLE[l.affix](realm)));
  const elite = hundredElite(realm);
  const why = level < hundredLevel(realm, o.rarity) ? HUNDRED.why.level(hundredLevel(realm, o.rarity))
    : o.rarity === 'heaven' && made < HUNDRED_HEAVEN_MADE ? HUNDRED.why.heaven(HUNDRED_HEAVEN_MADE, made)
    : !setOpen(state.killed, realm) ? HUNDRED.why.open(elite.name, wardenOf(realm).name)
    : unreached ? HUNDRED.why.material(ITEM_BY_KEY[CRUCIBLE[unreached.affix](realm)]?.name ?? '')
    : null;
  // 作 What the forge would say of it set going: only a wait for material is allowed past here.
  const probe: State = { ...state, crafts: { ...state.crafts, order: o } };
  const b = blocked(probe, r);
  const stop = why ?? (b === 'chest' ? HUNDRED.why.chest : null);

  const go = (realmTo: number, slotTo: Slot, rarity?: HundredRank, template?: string) =>
    setO(firstOrder(state, realmTo, slotTo, rarity ?? o.rarity, template));
  const line = (i: number, next: Partial<{ affix: Affix; n: Portions }>) =>
    setO({ ...o, lines: o.lines.map((l, j) => (j === i ? { ...l, ...next } : l)) });
  const used = new Set(o.lines.map((l) => l.affix));

  return (
    <div className="hu-crucible">
      <div className="hu-field">
        <span className="hu-label">{HUNDRED.realm}</span>
        <div className="hu-chips" role="tablist">
          {Array.from({ length: top }, (_, i) => i + 1).map((n) => (
            <button key={n} role="tab" aria-selected={n === realm} style={{ color: realmOf(n).colour }}
              title={REALM_SETS[n - 1].name} onClick={() => go(n, slot, bestRank(state, n))}>
              <span className="cjk">{REALM_SETS[n - 1].han}</span> {REALM_SETS[n - 1].name}
            </button>
          ))}
        </div>
      </div>
      <div className="hu-field">
        <span className="hu-label">{HUNDRED.place}</span>
        <div className="hu-chips" role="tablist">
          {SLOTS.map((x) => (
            <button key={x} role="tab" aria-selected={x === slot} onClick={() => go(realm, x)}>
              <span className="cjk">{SLOT_INFO[x].han}</span> {SLOT_INFO[x].name}
            </button>
          ))}
        </div>
      </div>
      <div className="hu-field">
        <span className="hu-label">{HUNDRED.shape}</span>
        <div className="hu-chips" role="tablist">
          {shapesOf(realm, slot).map((g) => {
            const sc = SCHOOL_INFO[schoolOfAxis(g.affix)];
            return (
              <button key={g.key} role="tab" aria-selected={g.key === o.template} onClick={() => go(realm, slot, o.rarity, g.key)}>
                <span className="cjk" style={{ color: sc.colour }}>{sc.seal}</span> {g.name.replace(`${set.word} `, '')}
                <i>{AFFIX_INFO[g.affix].han} {AFFIX_INFO[g.affix].label}</i>
              </button>
            );
          })}
        </div>
      </div>
      <div className="hu-field">
        <span className="hu-label">{HUNDRED.rank}</span>
        <div className="hu-chips" role="tablist">
          {HUNDRED_RANKS.map((k) => (
            <button key={k} role="tab" aria-selected={k === o.rarity} style={{ color: RARITY_INFO[k].colour }}
              onClick={() => go(realm, slot, k, o.template)}>
              <span className="cjk">{RARITY_INFO[k].han}</span> {rankName(k)} <i className="mono">Lv {hundredLevel(realm, k)}</i>
            </button>
          ))}
        </div>
      </div>

      <div className="card hu-lines">
        <Row label={<><span className="cjk" style={{ color: 'var(--gold)' }}>{AFFIX_INFO[tpl.affix].han}</span> {HUNDRED.main}</>}
          sub={HUNDRED.mainFrom(ITEM_BY_KEY[metalKey(realm)]?.name ?? '')}
          n={o.main} values={[1, 2, 3].map((n) => lineValue(tpl, o.rarity, tpl.affix, n as Portions, true))}
          affix={tpl.affix} onN={(n) => setO({ ...o, main: n })} />
        {o.lines.map((l, i) => {
          const mat = ITEM_BY_KEY[CRUCIBLE[l.affix](realm)];
          return (
            <Row key={i}
              label={<select aria-label={HUNDRED.line(i + 1)} value={l.affix}
                onChange={(e) => line(i, { affix: e.target.value as Affix })}>
                {lineAxes(tpl).filter((a) => a === l.affix || !used.has(a)).map((a) => (
                  <option key={a} value={a}>{AFFIX_INFO[a].han} {AFFIX_INFO[a].label}</option>
                ))}
              </select>}
              sub={<>{mat ? <><span className="cjk">{mat.han}</span> {mat.name}</> : null}
                {!materialReached(state, CRUCIBLE[l.affix](realm)) && <em className="hu-short"> · {HUNDRED.unreached}</em>}</>}
              n={l.n} values={[1, 2, 3].map((n) => lineValue(tpl, o.rarity, l.affix, n as Portions, false))}
              affix={l.affix} onN={(n) => line(i, { n })} />
          );
        })}
        <p className="faint hu-portion">{HUNDRED.portionNote(portionOf(realm))}</p>
      </div>

      <div className="card hu-out" style={{ ['--hue' as string]: colour }}>
        <span className="hu-label">{HUNDRED.out}</span>
        <div className="hu-piece">
          <Svg className="hu-tile" html={gearTile(piece, { size: 64 })} />
          <span className="hu-pbody">
            <b><span className="cjk" style={{ color: colour }}>{tpl.han}</span> Hundredfold {tpl.name}</b>
            <i style={{ color: RARITY_INFO[o.rarity].colour }}>{SLOT_INFO[slot].name} · {rankName(o.rarity)}</i>
            {piece.rolls.map((x, i) => (
              <span key={x.affix} className="hu-roll" data-main={i === 0 || undefined}>
                <span><Term han={AFFIX_INFO[x.affix].han} sense="axis" plain /> {AFFIX_INFO[x.affix].label}</span>
                <em className="mono">+{x.value}{AFFIX_INFO[x.affix].unit === '%' ? '%' : ''}</em>
              </span>
            ))}
          </span>
        </div>
        <p className="hu-versus mono">{(state.worn[slot] ? HUNDRED.versus : HUNDRED.versusEmpty)(move.power.toFixed(2), move.rate.toFixed(2))}</p>
        <span className="hu-label">{HUNDRED.needs}</span>
        <div className="hu-needs">
          {needs.map(([k, n]) => {
            const it = ITEM_BY_KEY[k];
            const have = held(state, k);
            return (
              <span key={k} data-short={have < n || undefined}>
                <span className="cjk">{it?.han}</span> {it?.name} <b className="mono">{num(have)}/{num(n)}</b>
              </span>
            );
          })}
          <span className="faint">{HUNDRED.takes(duration(secondsOf(probe, r)))}</span>
        </div>
        {inHand ? (
          <div className="row hu-go">
            <em className="hu-on">{HUNDRED.forging}</em>
            <button className="act small ghost" onClick={() => onOrder(null)}>{HUNDRED.empty}</button>
          </div>
        ) : (
          <div className="row hu-go">
            {stop ? <em className="hu-why">{stop}</em> : <span className="faint hu-held">{HUNDRED.heldBack}</span>}
            <button className="act small" disabled={stop !== null} onClick={() => onOrder(o)}>{HUNDRED.forge}</button>
          </div>
        )}
      </div>
    </div>
  );
}

/** 爐 One line of the crucible: what it is, where it comes from, and its three portions. */
function Row({ label, sub, n, values, affix, onN }: {
  label: React.ReactNode; sub: React.ReactNode; n: Portions; values: readonly number[]; affix: Affix;
  onN: (n: Portions) => void;
}) {
  const unit = AFFIX_INFO[affix].unit === '%' ? '%' : '';
  return (
    <div className="hu-row">
      <span className="hu-what"><span>{label}</span><i>{sub}</i></span>
      <span className="hu-por" role="radiogroup">
        {values.map((v, i) => (
          <button key={i} role="radio" aria-checked={n === i + 1} aria-label={HUNDRED.portions(i + 1)}
            onClick={() => onN((i + 1) as Portions)}>
            <b className="mono">{i + 1}</b><em className="mono">+{v}{unit}</em>
          </button>
        ))}
      </span>
    </div>
  );
}

/** 系 The nine sets: which of six places are made, and at what rank, and how far finished. */
function Sets({ state }: { state: State }) {
  return (
    <div className="hu-sets">
      <p className="faint hu-note">{HUNDRED.setsNote}</p>
      {REALM_SETS.map((set, i) => {
        const realm = i + 1;
        const made = placesMade(state.crafts.made, realm);
        const rank = codexRank(state.crafts.made, realm);
        // 承 A set a life before this one finished stays finished, at the best rank it reached.
        const kept = keptRank(state.codexKept, realm);
        const count = SLOTS.filter((x) => made[x] >= 0).length;
        const worn = wornOfSet(state.worn, realm).length;
        return (
          <div key={realm} className="hu-set" style={{ ['--hue' as string]: realmOf(realm).colour }}
            data-shut={realm > state.realm || undefined}>
            <span className="hu-seal cjk">{set.han}</span>
            <span className="hu-sbody">
              <b>{set.name} <i>{HUNDRED.levels(hundredLevel(realm, 'mystic'), hundredLevel(realm, 'earth'), hundredLevel(realm, 'heaven'))}</i></b>
              <span className="hu-places">
                {SLOTS.map((x) => {
                  const k = made[x] >= 0 ? HUNDRED_RANKS[made[x]] : null;
                  return (
                    <span key={x} className="hu-place" data-made={k ?? undefined}
                      style={k ? { borderColor: RARITY_INFO[k].colour, color: RARITY_INFO[k].colour } : undefined}
                      title={`${SLOT_INFO[x].name}: ${k ? HUNDRED.placeMade(rankName(k)) : HUNDRED.placeNot}`}>
                      <span className="cjk">{SLOT_INFO[x].han}</span><i>{SLOT_INFO[x].name}</i>
                      <em>{k ? rankName(k) : HUNDRED.placeNot}</em>
                    </span>
                  );
                })}
              </span>
              <i className="hu-state">
                {rank > 0 ? HUNDRED.finished(rankName(HUNDRED_RANKS[rank - 1])) : HUNDRED.unfinished(count)}
                {worn > 0 && <> · {HUNDRED.wornNow(worn)}</>}
              </i>
              {kept > rank && (
                <i className="hu-kept" data-kept={kept}>{HUNDRED.keptSet(rankName(HUNDRED_RANKS[kept - 1]))}</i>
              )}
            </span>
          </div>
        );
      })}
      <div className="card hu-steps">
        <b>{HUNDRED.steps}</b>
        <span><b className="mono">{HUNDRED_STEPS[0]}</b> {HUNDRED.step2(Math.round(HUNDRED_KIT * 100))}</span>
        <span><b className="mono">{HUNDRED_STEPS[1]}</b> {HUNDRED.step4(HUNDRED_BREACH)}</span>
        <span><b className="mono">{HUNDRED_STEPS[2]}</b> {HUNDRED.step6(CODEX_WORN)}</span>
      </div>
    </div>
  );
}

/** 譜 The codex: nine bonuses, earned or not, and what each is worth to this cultivator now. */
function Codex({ state }: { state: State }) {
  const awake = spiritOf(state.worn);
  return (
    <div className="hu-codex">
      <p className="faint hu-note">{HUNDRED.codexNote(CODEX_RANK[0], CODEX_RANK[1], CODEX_RANK[2], CODEX_WORN)}</p>
      {CODEX.map((c) => {
        const set = REALM_SETS[c.realm - 1];
        // 承 This life's pieces, or the best a life before finished the set at: the higher.
        const rank = codexHeld(state, c.realm);
        const past = keptRank(state.codexKept, c.realm) > codexRank(state.crafts.made, c.realm);
        const now = codexValue(state, c.key);
        return (
          <div key={c.key} className="hu-cx" data-earned={rank > 0 || undefined} style={{ ['--hue' as string]: realmOf(c.realm).colour }}>
            <span className="hu-seal cjk">{c.han}</span>
            <span className="hu-cbody">
              <b>{c.sys} <i>· <span className="cjk">{set.han}</span> {set.name}</i></b>
              <span className="hu-does">{says(c.key, now > 0 ? now : codexWorth(c.key, 1, false))}</span>
              <span className="hu-ranks">
                {([1, 2, 3] as const).map((k) => (
                  <span key={k} data-on={rank >= k || undefined} style={{ color: RARITY_INFO[HUNDRED_RANKS[k - 1]].colour }}>
                    {rankName(HUNDRED_RANKS[k - 1])} <em className="mono">{worth(c.key, codexWorth(c.key, k, false))}</em>
                  </span>
                ))}
                <span data-on={(rank > 0 && now >= CODEX_CAP[c.key] - 1e-9) || undefined}>
                  {HUNDRED.codexWhole} <em className="mono">{worth(c.key, CODEX_CAP[c.key])}</em></span>
              </span>
              <i className="hu-now">
                {rank > 0 ? <><b>{HUNDRED.codexNow(worth(c.key, now))}</b> · {HUNDRED.codexAt(rankName(HUNDRED_RANKS[rank - 1]))}</>
                  : HUNDRED.codexNone}
                {past && <> · <em className="hu-kept">{HUNDRED.keptNote}</em></>}
              </i>
            </span>
          </div>
        );
      })}
      <div className="card hu-spirit" data-awake={awake !== null || undefined}
        style={awake ? { ['--hue' as string]: realmOf(awake).colour } : undefined}>
        <span className="hu-sp-art">
          <svg viewBox="0 0 120 120" aria-hidden="true">
            <g dangerouslySetInnerHTML={{ __html: spiritRim(awake ? realmOf(awake).colour : '#3A3226', 120, awake !== null) }} />
          </svg>
          <span className="cjk">器靈</span>
        </span>
        <span className="hu-sp-body">
          <b>{HUNDRED.spiritHead}</b>
          <i>{awake ? HUNDRED.spiritAwake(REALM_SETS[awake - 1].name) : HUNDRED.spiritAsleep}</i>
          <span className="faint">{HUNDRED.spiritNote}</span>
        </span>
      </div>
    </div>
  );
}

/** For a recipe row elsewhere: the key the forge is making from, if it is a Hundredfold one. */
export const isHundred = (key: string | null) => !!key && RECIPE_BY_KEY[key]?.makes.kind === 'hundred';
