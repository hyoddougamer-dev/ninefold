import { useEffect, useMemo, useState } from 'react';
import {
  ITEM_BY_KEY, RECIPES, RECIPE_BY_KEY, SKILLS, SKILL_BY_KEY, XP_TABLE, arrayDoes, rankOf, splitKey,
  type Recipe, type SkillKey,
} from '../../data/crafts.ts';
import { BEASTS, plateOf } from '../../data/bestiary.ts';
import { AFFIX_INFO, RARITIES, RARITY_INFO, SLOT_INFO, TEMPLATE_BY_KEY } from '../../data/gear.ts';
import { SCHOOL_INFO, schoolOfAxis } from '../../data/schools.ts';
import { schoolSays } from '../classes.ts';
import { realm as realmOf } from '../../data/realms.ts';
import {
  FEEDER, arraySlots, blocked, carrySlot, cutOf, depthOf, depthStrength, doubles, furnaceDiscount, held, levelIn, markApplies,
  marksOf, masteryOf, needsOf, placed, progressOf, qualityFor, knownAt, known, secondsOf, skillOpen, toNextDepth, totalLevel,
  workSeconds, xpOf,
} from '../../sim/crafts.ts';
import {
  CRAFT_ARRAY_DEPTH_EVERY, CRAFT_ARRAY_DEPTH_STEPS, CRAFT_ARRAY_DEPTH_TOP, CRAFT_FEED_LEVEL, CRAFT_TOOL_STEP,
  CRAFT_ARRAY_SLOTS, CRAFT_SEEK_MAX,
} from '../../sim/balance.ts';
import { TOOL_METALS } from '../../data/crafts.ts';
import { REALM_SETS } from '../../data/gear.ts';
import { duration, num } from '../../sim/format.ts';
import type { State } from '../../sim/state.ts';
import { icon } from '../../art/icon.ts';
import { Emblem } from '../ui/Emblem.tsx';
import { Term } from '../ui/Term.tsx';
import { Plate } from '../ui/Plate.tsx';
import { Svg } from '../ui/Svg.tsx';
import { CRAFTS, WORKSHOP_FIX } from '../copy.ts';
import { keep, oneOf, recall, useRemembered } from '../prefs.ts';
import { pictureOf } from '../../data/pictures.ts';
import { Hundred } from '../ui/Hundred.tsx';
import type { Order } from '../../sim/hundred.ts';

/** 開 The craft whose level opens this one before its realm, and at what level, if any. */
const feederOf = (skill: SkillKey) => {
  const f = FEEDER[skill];
  return f ? { name: SKILL_BY_KEY[f].name, level: CRAFT_FEED_LEVEL } : undefined;
};

/** 具 The painted tool of a craft, named by the tool: sickle, pick, knife, furnace. */
const toolArt = (skill: SkillKey) => `tool-${SKILL_BY_KEY[skill].tool.name.toLowerCase()}`;

/**
 * 篩 What a search looks through: the recipe's own name, and the words a player would
 * reach for to find it, which are what goes in and, for gear, the slot and the beast whose
 * shape it takes. "crab" and "robe" used to find nothing in the forge while a crab-shaped
 * robe sat in the list.
 */
const HAY = new Map<string, string>();
function hay(r: Recipe): string {
  let h = HAY.get(r.key);
  if (h === undefined) {
    const words = [r.name, r.han, r.group, ...r.needs.map(([k]) => ITEM_BY_KEY[k]?.name ?? '')];
    if (r.makes.kind === 'gear') {
      const { template, beast } = r.makes;
      words.push(TEMPLATE_BY_KEY[template]?.slot ?? '', BEASTS.find((b) => b.key === beast)?.name ?? '');
    }
    h = words.join(' ').toLowerCase();
    HAY.set(r.key, h);
  }
  return h;
}

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
export function Crafts({ state, onTask: setTaskTo, onCarry, onUse, onPlace, onGo, onOrder }: {
  state: State;
  onTask: (key: string | null) => void;
  /** 百煉 Fill the crucible and set the forge going on it, or empty it. */
  onOrder?: (o: Order | null) => void;
  /** 業 Leave for another screen: the hunt for what the workshop waits on, the chest for room. */
  onGo?: (where: 'hunt' | 'gear') => void;
  onCarry: (hand: 'elixir' | 'sigil', key: string | null) => void;
  onUse: (key: string) => void;
  onPlace: (key: string, on: boolean) => void;
}) {
  // 業 Every task set here is remembered on this device, for 再 Make it again.
  const onTask = (key: string | null) => { if (key) rememberTask(key); setTaskTo(key); };
  const running = state.crafts.task ? RECIPE_BY_KEY[state.crafts.task] : null;
  const first = SKILLS.find((k) => skillOpen(state, k.key))?.key ?? 'herb';
  // 記 Remembered on the device: the craft last looked at, if it is open, before the running one.
  const [skill, setSkillRaw] = useState<SkillKey>(() => {
    const kept = recall<string>('crafts.skill', '', (x): x is string => typeof x === 'string');
    const k = SKILLS.find((x) => x.key === kept)?.key;
    return k && skillOpen(state, k) ? k : running?.skill ?? first;
  });
  const setSkill = (k: SkillKey) => { setSkillRaw(k); keep('crafts.skill', k); };
  const [group, setGroup] = useState<string | null>(null);
  const [looking, setLooking] = useState<string | null>(null);
  const [view, setView] = useState<'work' | 'pouch'>('work');
  const [find, setFind] = useState('');
  const [filter, setFilter] = useRemembered<'all' | 'ready' | 'next'>('crafts.filter', 'all', oneOf(['all', 'ready', 'next'] as const));
  const [tier, setTier] = useRemembered<number | 'near'>('crafts.tier', 'near',
    (x): x is number | 'near' => x === 'near' || (typeof x === 'number' && Number.isInteger(x) && x >= 1 && x <= 9));
  const kinds = Object.keys(state.crafts.pouch).filter((k) => ITEM_BY_KEY[splitKey(k).key]).length;
  /**
   * 往 Take the player to the recipe that makes a thing, from the note on its icon. It is
   * searched for by name so it is in the list whatever list was open, then scrolled to and
   * lit for a moment.
   */
  const [lit, setLit] = useState<string | null>(null);
  const goTo = (key: string) => {
    const r = RECIPE_BY_KEY[key];
    if (!r) return;
    setView('work'); setSkill(r.skill); setGroup(r.group); setFilter('all'); setFind(r.name); setLit(r.key);
    // 鑄 The realm row starts again at Now, or a Go to a piece of this realm could land on
    // a list still showing realm 2 with the lit row filtered out of it.
    setTier('near');
  };
  useEffect(() => {
    if (!lit) return;
    const el = document.querySelector(`[data-recipe="${lit}"]`);
    el?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    const id = window.setTimeout(() => setLit(null), 1600);
    return () => window.clearTimeout(id);
  }, [lit]);

  const open = skillOpen(state, skill);
  const level = levelIn(state, skill);
  const info = SKILL_BY_KEY[skill];
  const rank = rankOf(skill, level);
  const mine = useMemo(() => RECIPES.filter((r) => r.skill === skill), [skill]);
  const groups = useMemo(() => [...new Set(mine.map((r) => r.group))], [mine]);
  const shown = group && groups.includes(group) ? group : defaultGroup(state, skill, groups);
  // 篩 A search looks through the whole craft, whatever list is open; otherwise the open
  // list. Gear is the realm you are in and the one before it, unless a realm is picked
  // in the row above the list. rekaris, on the Discord (2026-10-02): *"I see no reason
  // why I should not be able to craft lower-tier stuff."* The sim never refused it; only
  // this list did. A search reaches every realm already open.
  const needle = find.trim().toLowerCase();
  // 百煉 The Hundredfold pieces are made from the crucible, never from a row of the list.
  const all = mine.filter((r) => r.makes.kind !== 'hundred' && (needle
      ? hay(r).includes(needle)
      : (groups.length < 2 || r.group === shown))
    && (r.makes.kind !== 'gear' || (needle ? r.realm <= state.realm
      : tier === 'near' ? r.realm <= state.realm && r.realm >= state.realm - 1
      : r.realm === tier)));
  const isLocked = (r: Recipe) => { const b = blocked(state, r); return b === 'level' || b === 'realm'; };
  const ready = all.filter((r) => blocked(state, r) === null);
  const locked = all.filter(isLocked);
  const counts = { all: all.length, ready: ready.length, next: locked.length };
  // 列 Everything that can be made, and the next few that cannot yet, so the list says
  // what is coming without turning into a wall of grey. The chips narrow it further.
  // 覽 A craft not open yet shows every recipe it has, greyed and with no Start, so a climb
  // can be planned around it. rekaris: *"being able to see what Alchemy does even before
  // unlocking it would allow the player to plan."*
  const list = !open ? all
    : filter === 'ready' ? ready
    : filter === 'next' ? locked.slice(0, 6)
    : all.filter((r) => !isLocked(r) || locked.indexOf(r) < 3);
  const later = !open ? 0 : filter === 'all' ? locked.length - Math.min(3, locked.length)
    : filter === 'next' ? Math.max(0, locked.length - 6) : 0;

  const xp = state.crafts.xp[skill] ?? 0;
  const next = Math.min(99, level + 1);
  const tool = state.crafts.tools[skill] ?? 0;

  return (
    <div className="crafts" data-view={view}>
      <div className="w-main">
      {/* 總 One line: where you are, and the one number the whole workshop adds up to,
          which answers a tap with what it is (Bruno, testing: "total quê?"). */}
      <div className="row ctop">
        <h2 className="heading" style={{ margin: 0, flex: 1 }}>{CRAFTS.head}</h2>
        <span className="ctotal"><Term han="總" plain /> <span className="ct-long">{CRAFTS.totalLabel}</span>
          <span className="ct-short">{CRAFTS.totalShort}</span>{' '}
          <b className="mono">{totalLevel(state)}</b><i className="mono">/693</i></span>
      </div>
      <Task state={state} r={running} onStop={() => onTask(null)}
        onSet={(key) => onTask(key)} onGo={onGo} onFind={goTo} />

      {/* 版 On a phone the workshop and the pouch are two views of one screen, so neither
          sits under a long list of the other. A wide screen shows both at once. */}
      <div className="cswitch" role="tablist">
        <button role="tab" aria-selected={view === 'work'} onClick={() => setView('work')}>
          <b className="cjk">業</b> {CRAFTS.viewWork}</button>
        <button role="tab" aria-selected={view === 'pouch'} onClick={() => setView('pouch')}>
          <b className="cjk">儲</b> {CRAFTS.viewPouch(kinds)}</button>
      </div>

      <div className="w-work">
      <div className="cskills">
        {SKILLS.map((k) => {
          const on = skillOpen(state, k.key);
          const l = levelIn(state, k.key);
          const x = state.crafts.xp[k.key] ?? 0;
          const fill = l >= 99 ? 1 : (x - XP_TABLE[l]) / (XP_TABLE[l + 1] - XP_TABLE[l]);
          return (
            <button key={k.key} className="cskill" data-on={k.key === skill} data-shut={!on}
              data-run={running?.skill === k.key}
              onClick={() => { setSkill(k.key); setGroup(null); setLooking(null); setFind(''); setFilter('all'); setTier('near'); }}>
              <Seal skill={k.key} han={k.seal} />
              <span className="cs-name">{k.name}</span>
              <span className="cs-sub">
                {/* 作 The craft that is working says so in place of its rank, which the panel
                    below shows anyway: a marker tacked on after the rank was the first thing
                    an ellipsis cut. */}
                {on ? <><em className="mono">{l}</em> {running?.skill === k.key
                  ? <span className="cs-working">{CRAFTS.tileWorking}</span>
                  : <span className="cs-rank">{rankOf(k.key, l).name}</span>}</> : CRAFTS.opens(k.realm, feederOf(k.key))}
              </span>
              {on && <i className="cs-bar"><i style={{ width: `${Math.round(fill * 100)}%` }} /></i>}
            </button>
          );
        })}
      </div>

      <div className="card cpanel">
        <div className="cphead">
          <Scene skill={skill} />
          <div style={{ minWidth: 0 }}>
            <div className="row">
              <span>
                <b className="cjk" style={{ fontSize: 18, color: 'var(--gold)' }}><Term han={info.han} plain /></b>{' '}
                <b style={{ fontSize: 16 }}>{info.name}</b>
              </span>
            </div>
            <p className="faint" style={{ margin: '4px 0 0', fontSize: 12.5 }}>{info.does}</p>
        {!open && <p className="faint" style={{ margin: '8px 0 0', fontSize: 12.5 }}>
          {CRAFTS.opensLong(info.seal, info.name, info.realm, feederOf(skill))}</p>}
        {open && (
          <>
            <p className="crank"><span className="cjk"><Term han={rank.han} plain /></span> {rank.name}
              <span className="mono clevel">{CRAFTS.level(level)}</span></p>
            <i className="cxp"><i style={{ width: `${Math.round((level >= 99 ? 1 : (xp - XP_TABLE[level]) / (XP_TABLE[next] - XP_TABLE[level])) * 100)}%` }} /></i>
            <p className="faint mono" style={{ margin: '4px 0 0', fontSize: 11.5 }}>
              {level >= 99 ? CRAFTS.xpTop(num(Math.floor(xp))) : CRAFTS.xpTo(num(Math.floor(xp)), num(Math.ceil(XP_TABLE[next] - xp)), next)}
            </p>
            <p className="faint" style={{ margin: '6px 0 0', fontSize: 12 }}>
              <span className="ctool"><Emblem family="craft" subject={toolArt(skill)} icon={info.tool.icon} size={20} alt={info.tool.name} /></span>
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
        </div>
      </div>

      {open && skill === 'array' && <Floor state={state} onPlace={onPlace} />}

      {groups.length > 1 && (
        <div className="cgroups" role="tablist">
          {groups.map((g) => (
            <button key={g} role="tab" aria-selected={g === shown} onClick={() => setGroup(g)}>{g}</button>
          ))}
        </div>
      )}
      {mine.length > 10 && !(skill === 'forge' && shown === 'Hundredfold') && (
        <div className="cfilter">
          <input type="search" value={find} placeholder={CRAFTS.findHint} aria-label={CRAFTS.findHint}
            onChange={(e) => setFind(e.target.value)} />
          {open && <div className="cf-chips" role="tablist">
            {(['all', 'ready', 'next'] as const).map((f) => (
              <button key={f} role="tab" aria-selected={filter === f} onClick={() => setFilter(f)}>
                {CRAFTS.filters[f]} <i className="mono">{counts[f]}</i></button>
            ))}
          </div>}
        </div>
      )}
      {open && shown === 'Gear' && !find && (
        <div className="cf-chips ctier" role="tablist" aria-label={CRAFTS.tiers}>
          <button role="tab" aria-selected={tier === 'near'} onClick={() => setTier('near')}>{CRAFTS.tierNow}</button>
          {Array.from({ length: Math.min(9, state.realm) }, (_, i) => i + 1).map((n) => (
            <button key={n} role="tab" aria-selected={tier === n} onClick={() => setTier(n)}
              title={realmOf(n).name} style={{ color: realmOf(n).colour }}>
              <span className="cjk" aria-hidden="true">{realmOf(n).han}</span> {n}</button>
          ))}
        </div>
      )}
      {open && shown === 'Gear' && !find && <p className="faint" style={{ margin: '0 0 8px', fontSize: 12 }}>
        {tier === 'near' ? CRAFTS.gearShown(state.realm) : CRAFTS.gearOf(tier)} {CRAFTS.forgedRule}</p>}

      {!open && <p className="faint cpreview" style={{ margin: '0 0 8px', fontSize: 12 }}>{CRAFTS.preview(info.name)}</p>}
      {open && skill === 'forge' && shown === 'Hundredfold' && !needle && onOrder
        ? <Hundred state={state} onOrder={onOrder} />
        : (
      <div className="crecipes" data-preview={!open || undefined}>
        {list.length === 0 && <p className="faint" style={{ margin: 0, fontSize: 12.5 }}>
          {needle ? CRAFTS.nothingFound(find.trim()) : filter === 'all' ? CRAFTS.nothingYet : CRAFTS.nothingShown}</p>}
        {list.map((r) => (
          <Row key={r.key} state={state} r={r} on={state.crafts.task === r.key} lit={lit === r.key}
            onStart={() => onTask(state.crafts.task === r.key ? null : r.key)} onGo={goTo} />
        ))}
        {later > 0 && <p className="faint" style={{ margin: '2px 0 0', fontSize: 12 }}>{CRAFTS.later(later)}</p>}
      </div>
        )}
      </div>
      </div>

      <div className="w-side">
        <Carry state={state} onCarry={onCarry} />
        <h2 className="heading">{CRAFTS.pouch}</h2>
        <Pouch state={state} looking={looking} setLooking={setLooking}
          onCarry={onCarry} onUse={onUse} onPlace={onPlace} />
      </div>
    </div>
  );
}

/** 印 A craft's painted seal, or its character while the painting is not there. */
function Seal({ skill, han }: { skill: SkillKey; han: string }) {
  const painted = pictureOf('emblem', `craft-seal-${skill}`);
  return <b className="cjk" data-painted={!!painted}>{painted ? <img src={painted} alt="" width={34} height={34} /> : han}</b>;
}

/**
 * 坊 The craft at work, painted across the top of its panel. Forging and Alchemy share
 * the workshop's own scene: the sheet has six panels and the hearth is theirs.
 */
function Scene({ skill }: { skill: SkillKey }) {
  const painted = pictureOf('meet', `craft-${skill}`) ?? pictureOf('meet', 'craft-workshop');
  if (!painted) return null;
  return <div className="cscene"><img src={painted} alt="" loading="lazy" decoding="async" /></div>;
}

/**
 * Which list a craft opens on: the one the workshop is making from, if it is this craft,
 * or else the one with the newest thing this cultivator can make.
 */
function defaultGroup(s: State, skill: SkillKey, groups: readonly string[]): string {
  if (groups.length < 2) return groups[0] ?? '';
  const running = s.crafts.task ? RECIPE_BY_KEY[s.crafts.task] : undefined;
  if (running?.skill === skill && groups.includes(running.group)) return running.group;
  const can = RECIPES.filter((r) => r.skill === skill && levelIn(s, skill) >= r.level && s.realm >= r.realm)
    .sort((a, b) => a.level - b.level);
  if (skill === 'render') return `Realm ${Math.min(s.realm, 9)}`;
  if (skill === 'forge') return can.some((r) => r.makes.kind === 'gear') ? 'Gear' : 'Smelting';
  return can.at(-1)?.group ?? groups[0];
}

/* ── 業 A workshop standing still, and the one tap that sets it going (2026-10-03) ── */

/** 業 The last tasks set on this device, newest first. A convenience of this phone, not the save. */
const LAST_TASKS = 'ninefold.lastTasks';
function lastTasks(): readonly string[] {
  try {
    const v: unknown = JSON.parse(localStorage.getItem(LAST_TASKS) ?? '[]');
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string').slice(0, 3) : [];
  } catch { return []; }
}
function rememberTask(key: string): void {
  try { localStorage.setItem(LAST_TASKS, JSON.stringify([key, ...lastTasks().filter((k) => k !== key)].slice(0, 3))); } catch { /* a private window keeps nothing */ }
}

/**
 * 業 What sets a standing workshop going again, if anything can from here.
 *
 * The audit found a crafter's workshop waiting all night for ore at two stages of the climb,
 * the one stall in the game that costs real progress (8 to 12 hours of crafting), said in
 * grey on a screen nobody had opened. So it is said in the open, with a button: gather
 * what is missing, go and hunt for it, make room in the chest, or make the last thing again.
 */
interface Fix { readonly han: string; readonly label: string; readonly note?: string; readonly run: () => void }

function fixFor(state: State, r: Recipe | null, act: {
  onSet: (key: string) => void; onGo?: (where: 'hunt' | 'gear') => void; onFind: (key: string) => void;
}): Fix | null {
  if (!r) {
    const runs = (x: Recipe | undefined): x is Recipe => !!x && blocked(state, x) === null;
    const again = lastTasks().map((k) => RECIPE_BY_KEY[k]).find(runs)
      ?? RECIPES.filter((x) => (state.crafts.made[x.key] ?? 0) > 0 && runs(x))
        .sort((a, b) => (state.crafts.made[b.key] ?? 0) - (state.crafts.made[a.key] ?? 0))[0];
    return again ? { han: '再', label: WORKSHOP_FIX.again(again.name), run: () => act.onSet(again.key) } : null;
  }
  const why = blocked(state, r);
  if (why === 'chest') return act.onGo ? { han: '器', label: WORKSHOP_FIX.room, run: () => act.onGo!('gear') } : null;
  if (why === 'remains' && r.remains) {
    const beast = BEASTS.find((b) => b.key === r.remains)?.name ?? r.remains;
    return act.onGo ? { han: '狩', label: WORKSHOP_FIX.huntBeast(beast), run: () => act.onGo!('hunt') } : null;
  }
  if (why !== 'needs') return null;
  const missing = needsOf(state, r).find(([k, n]) => held(state, k) < n)?.[0];
  if (!missing) return null;
  if (missing === 'mat') return act.onGo ? { han: '狩', label: WORKSHOP_FIX.hunt, run: () => act.onGo!('hunt') } : null;
  const maker = MAKER.get(splitKey(missing).key);
  if (!maker) return null;
  if (blocked(state, maker) === null) {
    const name = ITEM_BY_KEY[splitKey(missing).key]?.name ?? maker.name;
    return { han: '採', label: WORKSHOP_FIX.gather(name), note: WORKSHOP_FIX.gatherNote(r.name), run: () => act.onSet(maker.key) };
  }
  return { han: '往', label: WORKSHOP_FIX.goTo(maker.name), run: () => act.onFind(maker.key) };
}

/** 作 The task in hand: what, how far, how long it keeps going, and why it is waiting. */
function Task({ state, r, onStop, onSet, onGo, onFind }: {
  state: State; r: Recipe | null; onStop: () => void;
  onSet: (key: string) => void; onGo?: (where: 'hunt' | 'gear') => void; onFind: (key: string) => void;
}) {
  const fix = fixFor(state, r, { onSet, onGo, onFind });
  if (!r) {
    return (
      <div className="card ctask" data-idle="true">
        <div className="row" style={{ gap: 12, justifyContent: 'flex-start' }}>
          <span className="cic" style={{ width: 40, height: 40 }}><Emblem family="craft" subject="order" icon="scroll-unfurled" size={30} alt="" /></span>
          <p className="ct-still" style={{ margin: 0, fontSize: 13, flex: 1 }}>{CRAFTS.idle}</p>
        </div>
        {fix && <button className="act small ct-fix" onClick={fix.run}>{fix.han} <span>{fix.label}</span></button>}
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
    <div className="card ctask" data-wait={wait !== null || undefined}>
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
      {/* 業 A wait is said in the open, not in grey, with the tap that ends it. */}
      <p className={wait ? 'ct-still' : 'faint'} style={{ margin: '6px 0 0', fontSize: 12 }}>
        {wait ?? `${CRAFTS.away(Math.round(workSeconds(state) / 3600))} · ${CRAFTS.makes(state.crafts.made[r.key] ?? 0)}`}
      </p>
      {wait && fix && (
        <>
          <button className="act small ct-fix" onClick={fix.run}>{fix.han} <span>{fix.label}</span></button>
          {fix.note && <p className="faint" style={{ margin: '6px 0 0', fontSize: 11.5 }}>{fix.note}</p>}
        </>
      )}
    </div>
  );
}

const fmtXp = (x: number) => (x >= 100 ? num(Math.round(x)) : x.toFixed(1).replace(/\.0$/, ''));

/** The thing a recipe makes, drawn: its item, its tool, or the shape of its gear. */
function Out({ r, size }: { r: Recipe; size: number }) {
  if (r.makes.kind === 'item') return <Thing k={r.makes.item} size={size} />;
  if (r.makes.kind === 'tool') {
    const t = SKILL_BY_KEY[r.makes.skill].tool;
    return <span className="cic" style={{ width: size, height: size, color: realmOf(r.realm).colour }}>
      <Emblem family="craft" subject={toolArt(r.makes.skill)} icon={t.icon} size={Math.round(size * 0.72)} alt={t.name} /></span>;
  }
  // 百煉 A Hundredfold piece: its place, in its realm's colour, until the crucible names the shape.
  if (r.makes.kind === 'hundred') {
    return <span className="cic cr-gearic" style={{ width: size, height: size, color: realmOf(r.realm).colour }}>
      <Svg html={icon(SLOT_INFO[r.makes.slot].empty, Math.round(size * 0.62))} /></span>;
  }
  const tpl = TEMPLATE_BY_KEY[r.makes.template];
  const picture = <span className="cic cr-gearic" style={{ width: size, height: size, color: realmOf(r.realm).colour }}>
    <Svg html={icon(tpl?.icon ?? 'ancient-sword', Math.round(size * 0.62))} />
    {tpl && <span className="cr-school cjk" aria-hidden="true"
      style={{ color: SCHOOL_INFO[schoolOfAxis(tpl.affix)].colour }}>{SCHOOL_INFO[schoolOfAxis(tpl.affix)].seal}</span>}
  </span>;
  if (!tpl) return picture;
  // 職 The school, top left, as the tiles in 器 carry it, so a forged piece can be held up
  // against a hunted one at a glance. A forged piece leads with its shape's own line, so
  // the shape's school is the piece's. The picture is the note: tap it for the name.
  const sc = schoolOfAxis(tpl.affix);
  const line = AFFIX_INFO[tpl.affix];
  return (
    <Term han={SCHOOL_INFO[sc].seal} bare
      entry={{ han: SCHOOL_INFO[sc].seal, name: CRAFTS.schoolName(SCHOOL_INFO[sc].short),
        note: CRAFTS.schoolNote(SCHOOL_INFO[sc].short, line.han, line.label, schoolSays(sc)) }}>
      {picture}
    </Term>
  );
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
        // 畫 A painting keeps its paper round the object, so it is given the cell the way a
        // beast's plate is; a drawn icon has no paper and keeps its margin.
        ? <Emblem family={it.paint.family} subject={it.paint.subject} icon={it.icon} alt={it.name}
            size={Math.round(size * (pictureOf('emblem', `${it.paint.family}-${it.paint.subject}`) ? 0.9 : 0.66))} />
        : <Svg html={icon(it.icon, Math.round(size * 0.66))} />}
    </span>
  );
}

/**
 * 物 What a thing in a recipe is, and where it comes from, on its own icon.
 *
 * rekaris, on the Discord: *"The icons for materials required to craft something are very
 * small and it is hard/impossible to tell what that thing is ... clicking it would
 * automatically move you to the crafting that drops this item."* So the icon is a note,
 * opened by a tap or a resting pointer, naming the thing in English beside its character,
 * saying which craft makes it, and carrying a button that goes there.
 */
const MAKER = new Map<string, Recipe>();
for (const r of RECIPES) if (r.makes.kind === 'item' && !MAKER.has(r.makes.item)) MAKER.set(r.makes.item, r);

function Named({ k, onGo }: { k: string; onGo: (key: string) => void }) {
  const { key, quality } = splitKey(k);
  const it = ITEM_BY_KEY[key];
  if (!it) return null;
  const from = MAKER.get(key);
  const skill = from ? SKILL_BY_KEY[from.skill] : null;
  const name = quality !== null ? `${RARITY_INFO[RARITIES[quality]].name} ${it.name}` : it.name;
  return (
    <Term han={it.han} bare
      entry={{ han: it.han, name, note: from && skill ? CRAFTS.madeBy(skill.han, skill.name, from.name) : it.does }}
      go={from ? { label: CRAFTS.goMake(from.name), onGo: () => onGo(from.key) } : undefined}>
      <Thing k={k} size={20} />
    </Term>
  );
}

/** A recipe: what it makes, what it needs against what is held, how long, what it pays. */
function Row({ state, r, on, lit, onStart, onGo }: {
  state: State; r: Recipe; on: boolean; lit: boolean; onStart: () => void; onGo: (key: string) => void;
}) {
  const why = blocked(state, r);
  const lock = why === 'level' ? CRAFTS.why.level(r.level) : why === 'realm' ? CRAFTS.why.realm(r.realm)
    : why === 'tool' ? CRAFTS.why.tool
    // 覽 A craft not open yet: the realm the recipe waits for, if that is further still.
    : why === 'shut' ? (r.realm > state.realm ? CRAFTS.why.realm(r.realm) : CRAFTS.why.shut) : null;
  const q = r.graded && !lock ? qualityFor(state, r) : null;
  const marks = marksOf(state, r);
  return (
    <div className="crow" data-on={on} data-lock={lock !== null} data-recipe={r.key} data-lit={lit || undefined}>
      <Out r={r} size={40} />
      <span className="cr-body">
        <b><span className="cjk">{r.han}</span> {r.name}</b>
        <i className="cr-meta mono">
          Lv {r.level} · {duration(secondsOf(state, r))} · +{fmtXp(xpOf(state, r))} xp
          {(state.crafts.made[r.key] ?? 0) > 0 && <> · <Term han="習" bare
            entry={{ han: '習', name: 'Familiarity', note: CRAFTS.familiarNote(state.crafts.made[r.key] ?? 0, !!r.graded,
              markApplies(r, 3) ? r.weight : 0, doubles(r), SKILL_BY_KEY[r.skill].name, masteryOf(state, r.skill), r.marks) }}>
            <span className="cr-fam">{CRAFTS.familiar(marks)}</span></Term></>}
        </i>
        {(r.needs.length > 0 || (r.remains && !known(state, r.remains))) && (
          <span className="cr-needs">
            {r.remains && !known(state, r.remains) && (
              <span data-short>{CRAFTS.remains(state.killed[r.remains] ?? 0, knownAt(r.remains))}</span>
            )}
            {needsOf(state, r).map(([k, n]) => (
              <span key={k} data-short={held(state, k) < n}>
                {k === 'mat' ? <b className="cjk"><Term han="材" plain /></b> : <Named k={k} onGo={onGo} />}
                {num(held(state, k))}<em>/{num(n)}</em>
              </span>
            ))}
          </span>
        )}
        {r.does && <i className="cr-does">{r.does}</i>}
        {r.makes.kind === 'item' && ITEM_BY_KEY[r.makes.item]?.kind === 'array'
          ? <Depth state={state} k={r.makes.item} />
          : r.makes.kind === 'item' && ITEM_BY_KEY[r.makes.item]?.does && !r.does && (
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

/**
 * 深 An array's line: what it does at the depth it is cut to, in numbers, and the depth,
 * with how many copies to the next step. speculaether, on the Discord (2026-10-05): a
 * second copy of an array did nothing. It deepens the array now (CRAFT_ARRAY_DEPTH_EVERY).
 */
function Depth({ state, k }: { state: State; k: string }) {
  const key = k.slice('array:'.length);
  const depth = depthOf(state, key);
  const pips = '\u25cf'.repeat(depth) + '\u25cb'.repeat(CRAFT_ARRAY_DEPTH_STEPS - depth);
  return (
    <>
      <i className="cr-does" data-array-does={key}>{arrayDoes(key, depthStrength(depth))}</i>
      <i className="cr-depth" data-depth={depth}>
        <Term han="深" bare entry={{ han: '深', name: 'Depth',
          note: CRAFTS.arrayDepthNote(CRAFT_ARRAY_DEPTH_EVERY, CRAFT_ARRAY_DEPTH_STEPS, CRAFT_ARRAY_DEPTH_TOP, cutOf(state, key)) }}>
          <span><span className="cr-pips" aria-hidden="true">{pips}</span> {CRAFTS.arrayDepth(depth, CRAFT_ARRAY_DEPTH_STEPS, toNextDepth(state, key))}</span>
        </Term>
      </i>
    </>
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
          <div key={k} className="row cf-row" style={{ marginTop: 8, gap: 10 }}>
            <Thing k={k} size={32} />
            <span className="cf-body">
              <b><span className="cjk">{it.han}</span> {it.name}</b>
              <Depth state={state} k={k} />
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
          <b>{it ? `${q !== null ? `${RARITY_INFO[RARITIES[q]].han} ${RARITY_INFO[RARITIES[q]].name} ` : ''}${it.name} ×${state.crafts.pouch[k!] ?? 0}` : CRAFTS.carryNone}</b>
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
  const carried = new Set([state.crafts.carry.elixir, state.crafts.carry.sigil].filter(Boolean));
  // 類 One shelf per kind, so a pouch of forty things reads as seven short rows, and the
  // detail opens under the shelf it was tapped on instead of at the foot of all of them.
  const shelves = KIND_ORDER.map((kind) => ({ kind, keys: keys.filter((k) => ITEM_BY_KEY[splitKey(k).key].kind === kind) }))
    .filter((x) => x.keys.length > 0);
  return (
    <>
      <p className="faint" style={{ margin: '0 0 6px', fontSize: 12 }}>{CRAFTS.kinds(keys.length)} · {CRAFTS.pouchTap}</p>
      {shelves.map(({ kind, keys: here }) => (
        <div key={kind} className="cshelf">
          <p className="cshelf-h"><b className="cjk">{CRAFTS.kindHan[kind]}</b> {CRAFTS.kindName[kind]}</p>
          <div className="cpouch">
            {here.map((k) => {
              const it = ITEM_BY_KEY[splitKey(k).key];
              const q = splitKey(k).quality;
              const tip = `${it.name}${q !== null ? ` · ${RARITY_INFO[RARITIES[q]].name}` : ''} · ×${num(state.crafts.pouch[k])}`;
              return (
                <button key={k} className="cpc" data-on={k === look} data-carried={carried.has(k)}
                  onClick={() => setLooking(k === look ? null : k)} aria-label={tip} title={tip}>
                  <Thing k={k} size={44} />
                  <b className="mono">{num(state.crafts.pouch[k])}</b>
                  <span className="cpc-tip" aria-hidden="true">{it.name}</span>
                </button>
              );
            })}
          </div>
          {look && here.includes(look) && (
            <Look state={state} look={look} onClose={() => setLooking(null)} onCarry={onCarry} onUse={onUse} onPlace={onPlace} />
          )}
        </div>
      ))}
    </>
  );
}

/** 看 One thing in the pouch, opened: what it is, what it does, and what can be done with it. */
function Look({ state, look, onClose, onCarry, onUse, onPlace }: {
  state: State;
  look: string;
  onClose: () => void;
  onCarry: (hand: 'elixir' | 'sigil', key: string | null) => void;
  onUse: (key: string) => void;
  onPlace: (key: string, on: boolean) => void;
}) {
  const it = ITEM_BY_KEY[splitKey(look).key];
  const q = splitKey(look).quality;
  const hand = carrySlot(look);
  const seeking = splitKey(look).key === 'sigil:seeking' || splitKey(look).key === 'seekincense';
  const arrayKey = look.slice('array:'.length);
  return (
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
      {it.kind === 'array'
        ? <div className="cf-body" style={{ margin: '8px 0 0' }}><Depth state={state} k={look} /></div>
        : it.does && <p className="faint" style={{ margin: '8px 0 0', fontSize: 12.5 }}>{it.does}</p>}
      <div className="row" style={{ marginTop: 10, gap: 8, justifyContent: 'flex-end' }}>
        {hand && state.crafts.carry[hand] !== look && (
          <button className="act small" onClick={() => onCarry(hand, look)}>{CRAFTS.carry}</button>
        )}
        {hand && state.crafts.carry[hand] === look && (
          <button className="act small" onClick={() => onCarry(hand, null)}>{CRAFTS.uncarry}</button>
        )}
        {seeking && (
          <button className="act small" disabled={state.crafts.seek >= CRAFT_SEEK_MAX} onClick={() => onUse(look)}>{CRAFTS.use}</button>
        )}
        {it.kind === 'array' && skillOpen(state, 'array') && (
          <button className="act small"
            disabled={!placed(state, arrayKey) && state.crafts.arrays.length >= arraySlots(levelIn(state, 'array'))}
            onClick={() => onPlace(arrayKey, !placed(state, arrayKey))}>
            {placed(state, arrayKey) ? CRAFTS.lift : CRAFTS.place}
          </button>
        )}
        <button className="act small ghost" onClick={onClose}>{CRAFTS.close}</button>
      </div>
    </div>
  );
}
