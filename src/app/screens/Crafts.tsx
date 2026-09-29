import { useMemo, useState } from 'react';
import {
  ITEM_BY_KEY, RECIPES, RECIPE_BY_KEY, SKILLS, SKILL_BY_KEY, XP_TABLE, rankOf, splitKey,
  type Recipe, type SkillKey,
} from '../../data/crafts.ts';
import { BEASTS, plateOf } from '../../data/bestiary.ts';
import { RARITIES, RARITY_INFO, TEMPLATE_BY_KEY } from '../../data/gear.ts';
import { realm as realmOf } from '../../data/realms.ts';
import {
  arraySlots, blocked, carrySlot, furnaceDiscount, held, levelIn, marksOf, needsOf, placed,
  progressOf, qualityFor, knownAt, known, secondsOf, skillOpen, totalLevel, workSeconds, xpOf,
} from '../../sim/crafts.ts';
import { CRAFT_TOOL_STEP, CRAFT_ARRAY_SLOTS } from '../../sim/balance.ts';
import { TOOL_METALS } from '../../data/crafts.ts';
import { REALM_SETS } from '../../data/gear.ts';
import { duration, num } from '../../sim/format.ts';
import type { State } from '../../sim/state.ts';
import { icon } from '../../art/icon.ts';
import { Emblem } from '../ui/Emblem.tsx';
import { Plate } from '../ui/Plate.tsx';
import { Svg } from '../ui/Svg.tsx';
import { CRAFTS } from '../copy.ts';

/**
 * 業 The workshop.
 *
 * Seven crafts in a grid, the one chosen underneath with every recipe it has, and the
 * task in hand at the top where it can always be seen. It is the only screen in the game
 * that is a list of things to make, so it is laid out like one: what it is, what it
 * needs (with what you hold beside it), how long, what it pays, and one button.
 *
 * 時 Nothing here keeps a clock. The bar on the task is read off the state's own instant,
 * like every other bar in the game, so the screen and the save can never disagree about
 * how far along the make is.
 */
export function Crafts({ state, onTask, onCarry, onUse, onPlace }: {
  state: State;
  onTask: (key: string | null) => void;
  onCarry: (hand: 'elixir' | 'sigil', key: string | null) => void;
  onUse: (key: string) => void;
  onPlace: (key: string, on: boolean) => void;
}) {
  const running = state.crafts.task ? RECIPE_BY_KEY[state.crafts.task] : null;
  const first = SKILLS.find((k) => skillOpen(state, k.key))?.key ?? 'herb';
  const [skill, setSkill] = useState<SkillKey>(running?.skill ?? first);
  const [group, setGroup] = useState<string | null>(null);
  const [looking, setLooking] = useState<string | null>(null);

  const open = skillOpen(state, skill);
  const level = levelIn(state, skill);
  const info = SKILL_BY_KEY[skill];
  const rank = rankOf(skill, level);
  const mine = useMemo(() => RECIPES.filter((r) => r.skill === skill), [skill]);
  const groups = useMemo(() => [...new Set(mine.map((r) => r.group))], [mine]);
  const shown = group && groups.includes(group) ? group : defaultGroup(state, skill, groups);
  const all = mine.filter((r) => (groups.length < 2 || r.group === shown)
    && (r.makes.kind !== 'gear' || (r.realm <= state.realm && r.realm >= state.realm - 1)));
  // 列 Everything that can be made, and the next few that cannot yet, so the list says
  // what is coming without turning into a wall of grey.
  const locked = all.filter((r) => { const b = blocked(state, r); return b === 'level' || b === 'realm'; });
  const list = all.filter((r) => !locked.includes(r) || locked.indexOf(r) < 3);
  const later = locked.length - Math.min(3, locked.length);

  const xp = state.crafts.xp[skill] ?? 0;
  const next = Math.min(99, level + 1);
  const tool = state.crafts.tools[skill] ?? 0;

  return (
    <div className="crafts">
      <div className="row">
        <span className="faint" style={{ fontSize: 12, letterSpacing: '.14em', textTransform: 'uppercase' }}>
          業 {CRAFTS.tab}
        </span>
        <span className="mono" style={{ fontSize: 13, color: 'var(--gold)' }}>{CRAFTS.total(totalLevel(state))}</span>
      </div>

      <h2 className="heading">{CRAFTS.head}</h2>
      <Task state={state} r={running} onStop={() => onTask(null)} />

      <div className="cskills">
        {SKILLS.map((k) => {
          const on = skillOpen(state, k.key);
          const l = levelIn(state, k.key);
          const x = state.crafts.xp[k.key] ?? 0;
          const fill = l >= 99 ? 1 : (x - XP_TABLE[l]) / (XP_TABLE[l + 1] - XP_TABLE[l]);
          return (
            <button key={k.key} className="cskill" data-on={k.key === skill} data-shut={!on}
              data-run={running?.skill === k.key}
              onClick={() => { setSkill(k.key); setGroup(null); setLooking(null); }}>
              <b className="cjk">{k.seal}</b>
              <span className="cs-name">{k.name}</span>
              <span className="cs-sub">
                {on ? <><em className="mono">{l}</em> <span className="cs-rank">{rankOf(k.key, l).name}</span></> : CRAFTS.opens(k.realm)}
              </span>
              {on && <i className="cs-bar"><i style={{ width: `${Math.round(fill * 100)}%` }} /></i>}
            </button>
          );
        })}
      </div>

      <div className="card cpanel">
        <div className="row">
          <span>
            <b className="cjk" style={{ fontSize: 18, color: 'var(--gold)' }}>{info.han}</b>{' '}
            <b style={{ fontSize: 16 }}>{info.name}</b>
          </span>
          {open && <span className="mono" style={{ color: 'var(--gold)' }}>{CRAFTS.level(level)}</span>}
        </div>
        <p className="faint" style={{ margin: '4px 0 0', fontSize: 12.5 }}>{info.does}</p>
        {!open && <p className="faint" style={{ margin: '8px 0 0', fontSize: 12.5 }}>
          {CRAFTS.opensLong(info.seal, info.name, info.realm)}</p>}
        {open && (
          <>
            <p className="crank"><span className="cjk">{rank.han}</span> {rank.name}</p>
            <i className="cxp"><i style={{ width: `${Math.round((level >= 99 ? 1 : (xp - XP_TABLE[level]) / (XP_TABLE[next] - XP_TABLE[level])) * 100)}%` }} /></i>
            <p className="faint mono" style={{ margin: '4px 0 0', fontSize: 11.5 }}>
              {level >= 99 ? CRAFTS.xpTop(num(Math.floor(xp))) : CRAFTS.xpTo(num(Math.floor(xp)), num(Math.ceil(XP_TABLE[next] - xp)), next)}
            </p>
            <p className="faint" style={{ margin: '6px 0 0', fontSize: 12 }}>
              <span className="cjk">{info.tool.han}</span>{' '}
              {tool > 0
                ? CRAFTS.tool(`${REALM_SETS[TOOL_METALS[tool - 1] - 1].word} ${info.tool.name}`, Math.round(tool * CRAFT_TOOL_STEP * 100))
                : CRAFTS.noTool(info.tool.name)}
            </p>
            {skill === 'alchemy' && (
              <p className="faint" style={{ margin: '4px 0 0', fontSize: 12 }}>
                {CRAFTS.furnace(Math.round((1 - furnaceDiscount(state)) * 1000) / 10)}
              </p>
            )}
          </>
        )}
      </div>

      {open && skill === 'array' && <Floor state={state} onPlace={onPlace} />}

      {open && groups.length > 1 && (
        <div className="cgroups" role="tablist">
          {groups.map((g) => (
            <button key={g} role="tab" aria-selected={g === shown} onClick={() => setGroup(g)}>{g}</button>
          ))}
        </div>
      )}
      {open && shown === 'Gear' && <p className="faint" style={{ margin: '0 0 8px', fontSize: 12 }}>{CRAFTS.gearShown(state.realm)} {CRAFTS.forgedRule}</p>}

      {open && (
        <div className="crecipes">
          {list.map((r) => (
            <Row key={r.key} state={state} r={r} on={state.crafts.task === r.key}
              onStart={() => onTask(state.crafts.task === r.key ? null : r.key)} />
          ))}
          {later > 0 && <p className="faint" style={{ margin: '2px 0 0', fontSize: 12 }}>{CRAFTS.later(later)}</p>}
        </div>
      )}

      <Carry state={state} onCarry={onCarry} />

      <h2 className="heading">{CRAFTS.pouch}</h2>
      <Pouch state={state} looking={looking} setLooking={setLooking}
        onCarry={onCarry} onUse={onUse} onPlace={onPlace} />
    </div>
  );
}

/** Which list a craft opens on: the one with the newest thing this cultivator can make. */
function defaultGroup(s: State, skill: SkillKey, groups: readonly string[]): string {
  if (groups.length < 2) return groups[0] ?? '';
  const can = RECIPES.filter((r) => r.skill === skill && levelIn(s, skill) >= r.level && s.realm >= r.realm);
  if (skill === 'render') return `Realm ${Math.min(s.realm, 9)}`;
  if (skill === 'forge') return can.some((r) => r.makes.kind === 'gear') ? 'Gear' : 'Smelting';
  return can.at(-1)?.group ?? groups[0];
}

/** 作 The task in hand: what, how far, how long it keeps going, and why it is waiting. */
function Task({ state, r, onStop }: { state: State; r: Recipe | null; onStop: () => void }) {
  if (!r) {
    return (
      <div className="card ctask" data-idle="true">
        <p className="faint" style={{ margin: 0, fontSize: 13 }}>{CRAFTS.idle}</p>
        <p className="faint" style={{ margin: '6px 0 0', fontSize: 12 }}>{CRAFTS.says}</p>
      </div>
    );
  }
  const why = blocked(state, r);
  const p = progressOf(state, state.at);
  const wait = why === 'remains' && r.remains ? CRAFTS.waitingRemains(state.killed[r.remains] ?? 0, knownAt(r.remains))
    : why === 'chest' ? CRAFTS.waitingChest
    : why === 'needs' ? CRAFTS.waitingNeeds(needsOf(state, r).filter(([k, n]) => held(state, k) < n)
      .map(([k]) => (k === 'mat' ? '材 material' : ITEM_BY_KEY[k]?.name ?? k)).join(', '))
    : null;
  return (
    <div className="card ctask">
      <div className="row">
        <Out r={r} size={40} />
        <span style={{ flex: 1, minWidth: 0 }}>
          <b style={{ display: 'block', fontSize: 14.5 }}>{CRAFTS.making(r.name)}</b>
          <i className="faint" style={{ fontStyle: 'normal', fontSize: 12 }}>
            {SKILL_BY_KEY[r.skill].name} · {CRAFTS.every(duration(secondsOf(state, r)), fmtXp(xpOf(state, r)))}
          </i>
        </span>
        <button className="act small" onClick={onStop}>{CRAFTS.stop}</button>
      </div>
      <i className="cprog" data-wait={wait !== null}><i style={{ width: `${Math.round(p * 100)}%` }} /></i>
      <p className="faint" style={{ margin: '6px 0 0', fontSize: 12 }}>
        {wait ?? `${CRAFTS.away(Math.round(workSeconds(state) / 3600))} · ${CRAFTS.makes(state.crafts.made[r.key] ?? 0)}`}
      </p>
    </div>
  );
}

const fmtXp = (x: number) => (x >= 100 ? num(Math.round(x)) : x.toFixed(1).replace(/\.0$/, ''));

/** The thing a recipe makes, drawn: its item, its tool, or the shape of its gear. */
function Out({ r, size }: { r: Recipe; size: number }) {
  if (r.makes.kind === 'item') return <Thing k={r.makes.item} size={size} />;
  if (r.makes.kind === 'tool') {
    return <span className="cic" style={{ width: size, height: size, color: realmOf(r.realm).colour }}>
      <Svg html={icon(SKILL_BY_KEY[r.makes.skill].tool.icon, Math.round(size * 0.62))} /></span>;
  }
  const tpl = TEMPLATE_BY_KEY[r.makes.template];
  return <span className="cic" style={{ width: size, height: size, color: realmOf(r.realm).colour }}>
    <Svg html={icon(tpl?.icon ?? 'ancient-sword', Math.round(size * 0.62))} /></span>;
}

/** One material or made thing: a beast's painting for its part, an emblem for the rest. */
function Thing({ k, size }: { k: string; size: number }) {
  const { key, quality } = splitKey(k);
  const it = ITEM_BY_KEY[key];
  if (!it) return null;
  const colour = realmOf(it.realm).colour;
  const ring = quality !== null ? RARITY_INFO[RARITIES[quality]].colour : undefined;
  if (it.beast) {
    const b = BEASTS.find((x) => x.key === it.beast)!;
    return <span className="cic" style={{ width: size, height: size, borderColor: ring }}>
      <Plate kind="beast" subject={plateOf(b)} icon={b.icon} colour={colour} tier={1} size={size - 4} alt={it.name} /></span>;
  }
  return (
    <span className="cic" style={{ width: size, height: size, color: colour, borderColor: ring }}>
      {it.paint
        ? <Emblem family={it.paint.family} subject={it.paint.subject} icon={it.icon} size={Math.round(size * 0.66)} alt={it.name} />
        : <Svg html={icon(it.icon, Math.round(size * 0.66))} />}
    </span>
  );
}

/** A recipe: what it makes, what it needs against what is held, how long, what it pays. */
function Row({ state, r, on, onStart }: { state: State; r: Recipe; on: boolean; onStart: () => void }) {
  const why = blocked(state, r);
  const lock = why === 'level' ? CRAFTS.why.level(r.level) : why === 'realm' ? CRAFTS.why.realm(r.realm)
    : why === 'tool' ? CRAFTS.why.tool : why === 'shut' ? CRAFTS.why.shut : null;
  const q = r.graded && !lock ? qualityFor(state, r) : null;
  const marks = marksOf(state, r);
  return (
    <div className="crow" data-on={on} data-lock={lock !== null}>
      <Out r={r} size={40} />
      <span className="cr-body">
        <b><span className="cjk">{r.han}</span> {r.name}</b>
        <i className="cr-meta mono">
          Lv {r.level} · {duration(secondsOf(state, r))} · +{fmtXp(xpOf(state, r))} xp
          {marks > 0 && <> · {CRAFTS.familiar(marks)}</>}
        </i>
        {(r.needs.length > 0 || (r.remains && !known(state, r.remains))) && (
          <span className="cr-needs">
            {r.remains && !known(state, r.remains) && (
              <span data-short>{CRAFTS.remains(state.killed[r.remains] ?? 0, knownAt(r.remains))}</span>
            )}
            {needsOf(state, r).map(([k, n]) => (
              <span key={k} data-short={held(state, k) < n}>
                {k === 'mat' ? <b className="cjk">材</b> : <Thing k={k} size={20} />}
                {num(held(state, k))}<em>/{num(n)}</em>
              </span>
            ))}
          </span>
        )}
        {r.does && <i className="cr-does">{r.does}</i>}
        {r.makes.kind === 'item' && ITEM_BY_KEY[r.makes.item]?.does && !r.does && (
          <i className="cr-does">{ITEM_BY_KEY[r.makes.item].does}</i>
        )}
        {q && (
          <span className="cr-q" title={CRAFTS.quality}>
            {q.map((p, i) => (p >= 0.005 ? (
              <i key={i} style={{ flex: p, background: RARITY_INFO[RARITIES[i]].colour }}
                title={`${RARITY_INFO[RARITIES[i]].name} ${Math.round(p * 100)}%`} />
            ) : null))}
          </span>
        )}
      </span>
      {lock
        ? <em className="cr-lock">{lock}</em>
        : <button className="act small" data-on={on} onClick={onStart}>{on ? CRAFTS.stop : CRAFTS.start}</button>}
    </div>
  );
}

/** 陣 The cave floor: the places it has, what is cut into them, and what could be. */
function Floor({ state, onPlace }: { state: State; onPlace: (key: string, on: boolean) => void }) {
  const slots = arraySlots(levelIn(state, 'array'));
  const owned = Object.keys(state.crafts.pouch).filter((k) => ITEM_BY_KEY[k]?.kind === 'array');
  const nextAt = CRAFT_ARRAY_SLOTS.find(([at]) => at > levelIn(state, 'array'))?.[0];
  return (
    <div className="card cfloor">
      <b style={{ fontSize: 13.5 }}>{CRAFTS.arraysHead(state.crafts.arrays.length, slots)}</b>
      {owned.length === 0 && <p className="faint" style={{ margin: '6px 0 0', fontSize: 12.5 }}>{CRAFTS.arraysNone}</p>}
      {owned.map((k) => {
        const it = ITEM_BY_KEY[k];
        const on = placed(state, k.slice('array:'.length));
        return (
          <div key={k} className="row" style={{ marginTop: 8, gap: 10 }}>
            <Thing k={k} size={32} />
            <span style={{ flex: 1, minWidth: 0, fontSize: 12.5 }}>
              <b><span className="cjk">{it.han}</span> {it.name}</b>
              <i className="faint" style={{ display: 'block', fontStyle: 'normal' }}>{it.does}</i>
            </span>
            <button className="act small" disabled={!on && state.crafts.arrays.length >= slots}
              onClick={() => onPlace(k.slice('array:'.length), !on)}>{on ? CRAFTS.lift : CRAFTS.place}</button>
          </div>
        );
      })}
      {nextAt && <p className="faint" style={{ margin: '8px 0 0', fontSize: 12 }}>{CRAFTS.arraysMore(nextAt)}</p>}
    </div>
  );
}

/** 攜 What is carried into the next hard fight, and the sure drops waiting on the hunt. */
function Carry({ state, onCarry }: { state: State; onCarry: (hand: 'elixir' | 'sigil', key: string | null) => void }) {
  if (!skillOpen(state, 'alchemy') && !skillOpen(state, 'sigil') && state.crafts.seek === 0) return null;
  const hand = (which: 'elixir' | 'sigil') => {
    const k = state.crafts.carry[which];
    const it = k ? ITEM_BY_KEY[splitKey(k).key] : null;
    const q = k ? splitKey(k).quality : null;
    return (
      <div className="row" style={{ marginTop: 8, gap: 10 }}>
        {k ? <Thing k={k} size={32} /> : <span className="cic" style={{ width: 32, height: 32 }} />}
        <span style={{ flex: 1, minWidth: 0, fontSize: 12.5 }}>
          <i className="faint" style={{ fontStyle: 'normal', display: 'block' }}>{which === 'elixir' ? CRAFTS.carryElixir : CRAFTS.carrySigil}</i>
          <b>{it ? `${q !== null ? RARITY_INFO[RARITIES[q]].han + ' ' : ''}${it.name} ×${state.crafts.pouch[k!] ?? 0}` : CRAFTS.carryNone}</b>
        </span>
        {k && <button className="act small ghost" onClick={() => onCarry(which, null)}>{CRAFTS.uncarry}</button>}
      </div>
    );
  };
  return (
    <div className="card ccarry">
      <b style={{ fontSize: 13.5 }}>{CRAFTS.carryHead}</b>
      <p className="faint" style={{ margin: '4px 0 0', fontSize: 12 }}>{CRAFTS.carrySays}</p>
      {skillOpen(state, 'alchemy') && hand('elixir')}
      {skillOpen(state, 'sigil') && hand('sigil')}
      {state.crafts.seek > 0 && <p style={{ margin: '8px 0 0', fontSize: 12.5, color: 'var(--gold)' }}>{CRAFTS.seek(state.crafts.seek)}</p>}
    </div>
  );
}

const KIND_ORDER = ['herb', 'ore', 'part', 'metal', 'elixir', 'sigil', 'array'];

/** 儲物袋 Everything held, and what can be done with the one being looked at. */
function Pouch({ state, looking, setLooking, onCarry, onUse, onPlace }: {
  state: State;
  looking: string | null;
  setLooking: (k: string | null) => void;
  onCarry: (hand: 'elixir' | 'sigil', key: string | null) => void;
  onUse: (key: string) => void;
  onPlace: (key: string, on: boolean) => void;
}) {
  const keys = Object.keys(state.crafts.pouch)
    .filter((k) => ITEM_BY_KEY[splitKey(k).key])
    .sort((a, b) => {
      const A = ITEM_BY_KEY[splitKey(a).key], B = ITEM_BY_KEY[splitKey(b).key];
      return KIND_ORDER.indexOf(A.kind) - KIND_ORDER.indexOf(B.kind) || A.realm - B.realm
        || (splitKey(b).quality ?? 0) - (splitKey(a).quality ?? 0);
    });
  if (keys.length === 0) return <p className="faint" style={{ fontSize: 12.5 }}>{CRAFTS.pouchEmpty}</p>;
  const look = looking && state.crafts.pouch[looking] ? looking : null;
  const it = look ? ITEM_BY_KEY[splitKey(look).key] : null;
  const q = look ? splitKey(look).quality : null;
  const hand = look ? carrySlot(look) : null;
  const seeking = look && (splitKey(look).key === 'sigil:seeking' || splitKey(look).key === 'seekincense');
  return (
    <>
      <p className="faint" style={{ margin: '0 0 8px', fontSize: 12 }}>{CRAFTS.kinds(keys.length)}</p>
      <div className="cpouch">
        {keys.map((k) => (
          <button key={k} className="cpc" data-on={k === look} onClick={() => setLooking(k === look ? null : k)}
            aria-label={ITEM_BY_KEY[splitKey(k).key].name}>
            <Thing k={k} size={44} />
            <b className="mono">{num(state.crafts.pouch[k])}</b>
          </button>
        ))}
      </div>
      {look && it && (
        <div className="card clook">
          <div className="row" style={{ gap: 10 }}>
            <Thing k={look} size={40} />
            <span style={{ flex: 1, minWidth: 0 }}>
              <b><span className="cjk">{it.han}</span> {it.name}</b>
              <i className="faint" style={{ display: 'block', fontStyle: 'normal', fontSize: 12 }}>
                {q !== null && <span style={{ color: RARITY_INFO[RARITIES[q]].colour }}>{RARITY_INFO[RARITIES[q]].han} {RARITY_INFO[RARITIES[q]].name} · </span>}
                {realmOf(it.realm).han} realm {it.realm} · ×{num(state.crafts.pouch[look])}
              </i>
            </span>
          </div>
          {it.does && <p className="faint" style={{ margin: '8px 0 0', fontSize: 12.5 }}>{it.does}</p>}
          <div className="row" style={{ marginTop: 10, gap: 8, justifyContent: 'flex-end' }}>
            {hand && state.crafts.carry[hand] !== look && (
              <button className="act small" onClick={() => onCarry(hand, look)}>{CRAFTS.carry}</button>
            )}
            {hand && state.crafts.carry[hand] === look && (
              <button className="act small" onClick={() => onCarry(hand, null)}>{CRAFTS.uncarry}</button>
            )}
            {seeking && <button className="act small" onClick={() => onUse(look)}>{CRAFTS.use}</button>}
            {it.kind === 'array' && skillOpen(state, 'array') && (
              <button className="act small" onClick={() => onPlace(look.slice('array:'.length), !placed(state, look.slice('array:'.length)))}>
                {placed(state, look.slice('array:'.length)) ? CRAFTS.lift : CRAFTS.place}
              </button>
            )}
            <button className="act small ghost" onClick={() => setLooking(null)}>{CRAFTS.close}</button>
          </div>
        </div>
      )}
    </>
  );
}
