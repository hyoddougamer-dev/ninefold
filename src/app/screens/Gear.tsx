import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { fightDeps, shelf } from '../memo.ts';
import {
  AFFIX_INFO, RARITIES, RARITY_INFO, SET_STEPS, SLOTS, SLOT_INFO,
  activeSets, callingOf, primaryOf, realmSet, schoolOf, templateOf, wornRarity, wornTotals,
  type Affix, type Item, type Rarity, type Slot,
} from '../../data/gear.ts';
import { SCHOOLS, SCHOOL_INFO, type School } from '../../data/schools.ts';
import { FUSE_COUNT, chestLimit, fusable, qualityOf } from '../../sim/chest.ts';
import { fuseQuote } from '../../sim/stash.ts';
import { AFFIXES } from '../../data/gear.ts';
import { canRefine, refinePrice } from '../../sim/trials.ts';
import { isOpen } from '../../sim/unlocks.ts';
import { REFINE_LIMIT, levelAt, refineFactor } from '../../sim/refine.ts';
import { num } from '../../sim/format.ts';
import { affinity } from '../../sim/dao.ts';
import type { State } from '../../sim/state.ts';
import { realm as realmOf } from '../../data/realms.ts';
import { portraitLayers } from '../../art/aura.ts';
import { gearTile, wornRim } from '../../art/gear.ts';
import { spiritRim } from '../../art/spirit.ts';
import { spiritOf } from '../../sim/hundred.ts';
import { HUNDRED } from '../copy.ts';
import { Svg } from '../ui/Svg.tsx';
import { Calling } from '../ui/Calling.tsx';
import { Term } from '../ui/Term.tsx';
import { CULTIVATE, GEAR, QOL, UNIT } from '../copy.ts';
import { keep, oneOf, recall, useRemembered } from '../prefs.ts';
import { gearLift, swing, upOf, wearBetter } from '../../sim/inspect.ts';
import { gearArt, gearFind, gearFuse, gearLuck, gearSunder } from '../../sim/schools.ts';
import { FIND_TOP } from '../../sim/balance.ts';
import { fortuneOf } from '../../sim/fortune.ts';
import { dropChance } from '../../sim/drops.ts';
import { BEASTS } from '../../data/bestiary.ts';
import { GLOSS } from '../glossary.ts';
import { meltQuote, salvageable } from '../../sim/salvage.ts';

import { buysWith } from '../../sim/time.ts';
import { isWorn, setKeeping, tasksOf } from '../../sim/sets.ts';
import { SET_LIMIT, TASKS, type Task } from '../../sim/state.ts';
import { FILTER_LIMIT, PLACES, keepable, type ChestFilter, type Place } from '../../sim/filters.ts';
import type { Swing } from '../../sim/inspect.ts';

/** 算 A chest piece and what putting it on would do, ▲ included. */
interface ChestRead {
  readonly item: Item;
  readonly move: Swing;
}

/**
 * 窗 How many tiles the chest draws at first, and how many more each time its foot is
 * reached. Twelve rows of five on a phone, more than a screen and a half.
 */
const CHEST_PAGE = 60;

/** 煉 How many fuse groups are drawn before a tap asks for more. */
const FUSE_PAGE = 12;

/** 架 What the chest reads, kept between visits to the screen (app/memo.ts shelf). */
const READINGS = shelf<WeakMap<Item, ChestRead>>();
const CHEST_READ = shelf<readonly ChestRead[]>();
const SORTED = shelf<readonly ChestRead[]>();
const TALLY = shelf<{ ups: number; locks: number; slots: Map<Slot, number>; schools: Map<School, number>; carried: Set<Affix> }>();
const WEAR_ALL = shelf<number>();

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
export function Gear({ state, pulse, upTo, onUpTo, onInspect, onFuse, onRefine, onSalvageAll, onSaveSet, onWearSet, onClearSet, onRenameSet, onBook, onCompare, onWearAll, onFuseAll,
  onAssignTask, onSaveFilter, onForgetFilter, onKeepFilter, onAdoptFilters }: {
  state: State;
  /** 套 Give a task to loadout `index`, or back to what is worn with null (sim/sets.ts assignTask). */
  onAssignTask?: (task: Task, index: number | null) => void;
  /** 存 Keep the filter now lit, forget one, or mark one Keep (sim/filters.ts). */
  onSaveFilter?: (f: Omit<ChestFilter, 'keep'>) => void;
  onForgetFilter?: (index: number) => void;
  onKeepFilter?: (index: number, on: boolean) => void;
  /** 存 The filters this device kept before they moved into the save, taken in once. */
  onAdoptFilters?: (fromDevice: unknown) => void;
  /** ▲ 著 Put on every ▲ piece (sim/inspect.ts wearBetter). */
  onWearAll?: () => void;
  /** 煉 Fuse every group of three, until none is left (sim/stash.ts fuseAllIn). */
  onFuseAll?: () => void;
  pulse: number;
  /** 拆 The rank the bulk melt reaches up to. Held by the app so it survives a tab. */
  upTo: Rarity;
  onUpTo: (r: Rarity) => void;
  /** 拆 Melt everything at or below a rank. */
  onSalvageAll: (upTo: Rarity) => void;
  /** 鑑 Open a piece. Wearing it is a button on the sheet, not a blind tap on a tile. */
  onInspect: (item: Item, wearing: boolean) => void;
  onFuse: (template: string, rarity: string) => void;
  /** 煉器 Refining a place on the body, through the piece worn there. Paid in 材 material and never in qi. */
  onRefine: (slot: Slot) => void;
  /** 套 Loadouts: remember what is worn, put a remembered body back on, forget one. */
  onSaveSet: (index: number, name: string) => void;
  onWearSet: (index: number) => void;
  onClearSet: (index: number) => void;
  /** 名 Give loadout `index` a name of the player's own. */
  onRenameSet: (index: number, name: string) => void;
  /** 譜 Open the page of which piece is which school. */
  onBook: () => void;
  /** 較 Open the comparison of every class the chest can make. */
  onCompare?: () => void;
}) {
  const totals = wornTotals(state.worn, (slot) => affinity(state.unlocked, slot), state.refined);
  /*
   * 算 Every chest piece put on in a copy of the save. rekaris, on the Discord (2026-10-06):
   * at 1,800 pieces this screen froze, and fusing down to 500 was the only way out. Each
   * piece's reading is kept with the piece until something a fight reads moves, so a drop,
   * a melt or a lock reads only what is new, and a tick of qi reads nothing at all. 架 On
   * a shelf (app/memo.ts), so a tab away and back reads nothing either.
   */
  const readings = READINGS(fightDeps(state), () => new WeakMap<Item, ChestRead>());
  const chestRead = CHEST_READ([state.chest, readings], () => state.chest.map((item) => {
    const known = readings.get(item);
    if (known) return known;
    const m = swing(state, item);
    // ▲ The strict rule (sim/inspect.ts upOf): no class lost and no line given up.
    const read: ChestRead = { item, move: { ...m, better: upOf(state, item, m) } };
    readings.set(item, read);
    return read;
  }));
  const sets = activeSets(state.worn);
  const best = wornRarity(state.worn);
  // 器靈 A Hundredfold set worn whole at Heaven: its spirit's light over the portrait. Looks only.
  const spirit = spiritOf(state.worn);
  // 煉 Fusing opens with 妖丹 at the third realm, when there is junk enough to melt.
  // 算 Counted when the chest moves, not on every tick: a big chest has a hundred groups.
  const groups = useMemo(() => (isOpen(state.realm, 'fuse') ? fusable(state.chest) : []),
    [state.realm, state.chest]);
  // 天 What each Heaven row will make, read off the body that fuses (sim/sets.ts taskBody).
  const quotes = useMemo(() => new Map(groups.filter((g) => g.rarity === 'heaven')
    .map((g) => [g.template, fuseQuote(state, g.template, g.rarity)])),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [groups, state.sets, state.tasks, ...fightDeps(state)]);
  /*
   * 窗 The groups that climb a rank, a page at a time: a chest of 1,800 made 142 of them,
   * 5,400 elements above the chest itself. 煉 Fuse all groups still takes every one.
   */
  const climbing = useMemo(() => groups.filter((g) => g.rarity !== 'heaven'), [groups]);
  const [fuseShown, setFuseShown] = useState(FUSE_PAGE);
  const fuseRow = (g: (typeof groups)[number]) => (
    <FuseRow key={`${g.template}-${g.rarity}`} template={g.template} rarity={g.rarity} count={g.count}
      quote={quotes.get(g.template)} onFuse={onFuse} />
  );
  const limit = chestLimit(state.unlocked, totals.capacity, state.awakened);
  const keeping = setKeeping(state, limit);
  const S = 200;
  // 總 What everything worn does, from the sim: the body against itself with nothing on.
  const lift = gearLift(state);
  /**
   * 拾 The drop-chance note ends on this body's own numbers: what its points do to the
   * beast it is most likely hunting, read from the same chance the sim rolls against.
   * With 造化 Creation every beast drops already, and the note's own last line says so.
   */
  const findNote = (() => {
    const row = GLOSS[`axis:${AFFIX_INFO.find.han}`];
    const f = fortuneOf(state);
    const beast = BEASTS.find((b) => b.realm === state.realm && !b.warden);
    if (!row || !beast || f.always) return undefined;
    const pct = (x: number) => `${Math.round(x * 1000) / 10}%`;
    const mine = gearFind(state);
    const rest = (f.chance ?? 0) - mine;
    return { ...row, note: `${row.note}\n${GEAR.findYours(String(Math.round(mine * 1000) / 10), beast.name,
      pct(dropChance(beast, rest)), pct(dropChance(beast, rest + mine)))}` };
  })();
  const worn = SLOTS.some((slot) => state.worn[slot]);
  // 篩 The chest's filter lives here: it is a way of looking, not a fact about the save.
  // 記 Remembered on the device, so a tab away and back, or a reload, keeps it.
  // 鎖 Locked is one of these too: only the pieces kept on purpose (rekaris, on the Discord).
  const [only, setOnly] = useRemembered<Place>('chest.slot', 'all', oneOf(PLACES));
  // 職 And by school, a second line under the first. rekaris, on the Discord: *"You already
  // have filters for gear slot, adding another line of filters for the class would be great."*
  const [kin, setKin] = useRemembered<'any' | School>('chest.school', 'any', oneOf(['any', ...SCHOOLS] as const));
  /**
   * 篩 And by lines, a third. rekaris, on the Discord: *"boots that are Artificer school and
   * have fusion%, drop% and drop rarity%."* A piece shows only if it carries every line
   * picked here, and the three rows together can be kept as a named filter (up to
   * FILTER_LIMIT: rekaris asked for more than the three it began with).
   */
  const [lines, setLines] = useRemembered<readonly Affix[]>('chest.lines', [], isAffixList);
  // 存 The kept filters are the cultivator's now, in the save, because 鎖 a kept one decides
  // what a full chest melts (sim/filters.ts). The ones this device kept before are taken in
  // once and the device's copy is let go.
  const presets = state.filters;
  useEffect(() => {
    const old = recall<unknown>('chest.presets', null, (x): x is unknown => Array.isArray(x));
    if (!old || !onAdoptFilters) return;
    onAdoptFilters(old);
    keep('chest.presets', null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  /** 存 The name being typed for a filter about to be kept, or null when not saving. */
  const [presetName, setPresetName] = useState<string | null>(null);
  // 鑑 "Better" is what the sim says happens to 力 and 氣 when you put it on.
  // It used to be the sum of the raw roll values, which answers nothing: a
  // 藏 chest-slots roll and a 力 power roll are not the same kind of number,
  // so four small lines could out-triangle a piece that doubles your power.
  // 職 A piece that costs the class is not marked ▲, because the sheet will not call it
  // an upgrade either.
  // 序 Upgrades first, the biggest first; then the rarest. A chest of forty is
  // read from the top, so the top is where the news goes.
  const read = SORTED([chestRead], () => [...chestRead].sort((a, b) => (Number(b.move.better) - Number(a.move.better))
    || (a.move.better ? b.move.power - a.move.power : 0)
    || (RARITIES.indexOf(b.item.rarity) - RARITIES.indexOf(a.item.rarity))
    || (templateOf(b.item).realm - templateOf(a.item).realm)));
  // 數 What the filter chips count, in one walk of the chest rather than one walk per chip.
  const tally = TALLY([read], () => {
    const slots = new Map<Slot, number>();
    const schools = new Map<School, number>();
    const carried = new Set<Affix>();
    let ups = 0;
    let locks = 0;
    for (const r of read) {
      if (r.move.better) ups++;
      if (r.item.locked) locks++;
      const slot = templateOf(r.item).slot;
      slots.set(slot, (slots.get(slot) ?? 0) + 1);
      const sc = schoolOf(r.item);
      schools.set(sc, (schools.get(sc) ?? 0) + 1);
      for (const roll of r.item.rolls) carried.add(roll.affix);
    }
    return { ups, locks, slots, schools, carried };
  });
  const { ups, locks } = tally;
  const bySchool = (sc: School) => tally.schools.get(sc) ?? 0;
  const bySlot = (slot: Slot) => tally.slots.get(slot) ?? 0;
  const school = kin !== 'any' && bySchool(kin) === 0 ? 'any' : kin;
  // 記 A remembered slot the chest no longer holds, or ▲ with nothing ▲, reads as All.
  const place: Place = only === 'better' ? (ups > 0 ? 'better' : 'all')
    : only === 'locked' ? (locks > 0 ? 'locked' : 'all')
      : only !== 'all' && bySlot(only) === 0 ? 'all' : only;
  const pick = useMemo(() => {
    const has = (item: Item, a: Affix) => item.rolls.some((r) => r.affix === a);
    return (place === 'better' ? read.filter((r) => r.move.better)
      : place === 'locked' ? read.filter((r) => r.item.locked)
        : place === 'all' ? read : read.filter((r) => templateOf(r.item).slot === place))
      .filter((r) => school === 'any' || schoolOf(r.item) === school)
      .filter((r) => lines.every((a) => has(r.item, a)));
  }, [read, place, school, lines]);
  /*
   * 窗 The chest draws CHEST_PAGE tiles and more as its foot comes near, never the whole
   * of a big one at once. 1,800 tiles were 72,000 elements on the page, and every tick of
   * the clock walked all of them. A new filter starts from the top again.
   */
  const view = `${place}|${school}|${lines.join(',')}`;
  const [drawn, setDrawn] = useState({ view, n: CHEST_PAGE });
  const shown = drawn.view === view ? drawn.n : CHEST_PAGE;
  const drawMore = useCallback(() => setDrawn((d) => ({ view, n: (d.view === view ? d.n : CHEST_PAGE) + CHEST_PAGE })), [view]);
  // 鑑 A tap opens the sheet. Held in a ref so a tile's props stay the same from tick to tick.
  const inspectRef = useRef(onInspect);
  useLayoutEffect(() => { inspectRef.current = onInspect; });
  const openPiece = useCallback((item: Item) => inspectRef.current(item, false), []);
  // ▲ What 著 Wear all upgrades would put on, worked out when the chest or a fight input moves.
  // With no ▲ in the chest it puts on nothing, which is known without asking: wearBetter
  // reads every piece once per swap, and on a big chest that is most of a second on a phone.
  const wearAll = WEAR_ALL([state.chest, state.sets, ups, ...fightDeps(state)],
    () => (ups > 0 ? wearBetter(state).worn : 0));
  /** 套 The tasks a loadout can be given here: melting always, fusing and refining once they open. */
  const openTasks = TASKS.filter((t) => t === 'melt' || isOpen(state.realm, t));
  /** 套 The loadout a task reads, by name, or null when it reads what is worn. */
  const taskSet = (t: Task) => {
    const i = state.tasks[t];
    return i === undefined ? null : state.sets[i]?.name ?? null;
  };
  /** 名 Which loadout is being renamed, if any. */
  const [naming, setNaming] = useState<number | null>(null);
  // 拆 What the melt would take, so the button can say so before it is pressed.
  const melting = useMemo(() => salvageable(state.chest, upTo), [state.chest, upTo]);
  // 實 With the cards' bonus, because that is what salvage() pays. Without it the button
  // quoted less than landed, up to nine tenths less with every melt card taken.
  // 拆 Through the melting allowance, the way salvage() pays it: qi first, material past it.
  const quote = meltQuote(state, melting);
  const meltWorth = quote.qi;
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
            {/* 數 Two places under ×2, as 氣 beside it has: "×1.2" sat next to "23%
                harder", and the two read as two different numbers. */}
            <b className="mono"><small>×</small>{lift.power >= 10 ? Math.round(lift.power)
              : lift.power >= 1.95 ? lift.power.toFixed(1) : lift.power.toFixed(2)}</b>
            <span className="ll"><span className="cjk"><Term han="力" sense="axis" plain /></span> {GEAR.powerFrom}</span>
            <span className="ls">{GEAR.powerSays(lift.power)}</span>
          </div>
          <div className="lq">
            <span className="lghost cjk" aria-hidden="true">氣</span>
            <b className="mono"><small>×</small>{lift.rate.toFixed(2)}</b>
            <span className="ll"><span className="cjk"><Term han="氣" sense="axis" plain /></span> {GEAR.qiFrom}</span>
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
            {/* 實 What each line actually does, read from the same bent functions the
                sim plays by. It used to print the raw sum as if it were the effect:
                運 +200% read ×3.00 on a body whose drops were ×1.55 rarer. */}
            {(['luck', 'find', 'sunder', 'art', 'capacity', 'refine'] as const).filter((a) => totals[a] > 0).map((a) => (
              <div key={a}>
                <span className="cjk"><Term han={AFFIX_INFO[a].han} sense="axis" plain
                  entry={a === 'find' ? findNote : undefined} /></span>
                <span>{GEAR.other[a]}</span>
                {a !== 'capacity' && <span className="oesum mono">{GEAR.sum(totals[a])}<i aria-hidden="true">→</i></span>}
                <em className="mono">
                  {a === 'luck' ? `×${gearLuck(state).toFixed(2)}`
                    : a === 'find' ? GEAR.points(gearFind(state) * 100)
                      : a === 'sunder' ? `−${Math.round((1 - gearSunder(state)) * 1000) / 10}%`
                        : a === 'art' ? `×${gearArt(state).toFixed(2)}`
                          : a === 'refine' ? `×${gearFuse(state).toFixed(2)}`
                            : `+${Math.floor(totals[a])}`}
                </em>
              </div>
            ))}
            <div key="total" className="oetotal">
              <span className="cjk"><Term han="運" sense="axis" plain /></span>
              <span>{GEAR.luckInAll}</span>
              <em className="mono">{`×${(fortuneOf(state).luck ?? 1).toFixed(2)}`}</em>
            </div>
          </div>
          <p className="oenote">{GEAR.bends(Math.round(FIND_TOP * 100))}</p>
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
          {spirit !== null && (
            <svg className="wspirit" viewBox={`0 0 ${S} ${S}`} aria-hidden="true">
              <g dangerouslySetInnerHTML={{ __html: spiritRim(realmOf(spirit).colour, S) }} />
            </svg>
          )}
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
              aria-label={item ? `${templateOf(item).name}, ×${qualityOf(item).toFixed(2)} ${GEAR.qualityNote}` : `${SLOT_INFO[slot].name}, empty`}
            >
              {/* 質 rekaris, on the Discord (2026-10-06): the number was on every tile in the
                  chest and on none of the ones worn. It is the same number, at the same foot. */}
              <Svg html={gearTile(item, { size: 54, slot, quality: item ? qualityOf(item) : undefined })} />
            </button>
          );
        })}
      </div>

      {/* 職 The class the body wears: read off it, never stored. */}
      <Calling worn={state.worn} onBook={onBook} onCompare={onCompare} />

      {spirit !== null && (
        <p className="wspirit-line" style={{ color: realmOf(spirit).colour }}>{HUNDRED.spiritLine(realmSet(spirit).name)}</p>
      )}
      {best && (
        <p className="faint" style={{ fontSize: 12.5, textAlign: 'center', margin: 0 }}>
          {GEAR.bestLead} <span className="cjk" style={{ color: RARITY_INFO[best].colour }}>
            <Term han={RARITY_INFO[best].han} plain /></span> {RARITY_INFO[best].name} {GEAR.bestTail}
        </p>
      )}
      </div>

      <div className="g-side">
      {/* 套 Loadouts. rekaris, on the Discord: *"Set up loadouts. Grouping up multiple pieces
          into a loadout and then having a single button to equip such loadout."* A class is
          read off what is worn, so this is how a cultivator changes class in one tap. */}
      {/* 套 Shown whenever there is a loadout to put on, even on a bare body: taking
          everything off to change class is exactly when one is wanted. */}
      {(SLOTS.some((slot) => state.worn[slot]) || state.sets.length > 0) && (
        <>
          <h2 className="heading">{GEAR.loadoutHead}</h2>
          <p className="faint" style={{ fontSize: 12.5, margin: '0 0 8px' }}>{GEAR.loadouts}</p>
          {/* 套 A loadout given a task: speculaether, on the Discord, kept one outfit to fuse
              in, one to melt in and one for qi, and changed between them by hand. */}
          {state.sets.length > 0 && onAssignTask && <p className="faint gtasksays">{GEAR.tasksSay}</p>}
          <div className="gsets">
            {state.sets.map((set, i) => {
              const on = isWorn(state, i);
              const n = Object.keys(set.ids).length;
              if (naming === i) {
                // 名 Enter or leaving the field keeps the name; Esc puts the old one back.
                const done = (keep: boolean, value: string) => { setNaming(null); if (keep) onRenameSet(i, value); };
                return (
                  <div key={i} className="gset" data-on={on}>
                    <input className="gs-name" autoFocus maxLength={24} defaultValue={set.name}
                      aria-label={GEAR.loadoutNameField}
                      onKeyDown={(e) => {
                        e.stopPropagation();
                        if (e.key === 'Enter') done(true, e.currentTarget.value);
                        if (e.key === 'Escape') done(false, '');
                      }}
                      onBlur={(e) => done(true, e.currentTarget.value)} />
                  </div>
                );
              }
              const given = tasksOf(state, i);
              return (
                <div key={i} className="gsetblock">
                <div className="gset" data-on={on}>
                  <button className="gs-wear" disabled={on} onClick={() => onWearSet(i)}
                    aria-label={on ? GEAR.loadoutOn(set.name) : GEAR.loadoutWear(set.name)}>
                    <b>{set.name}</b>
                    <i>{on ? GEAR.loadoutWorn : GEAR.loadoutPieces(n)}</i>
                  </button>
                  <button className="gs-rename" onClick={() => setNaming(i)}
                    aria-label={GEAR.loadoutRename(set.name)} title={GEAR.loadoutRename(set.name)}>✎</button>
                  <button className="gs-save" onClick={() => onSaveSet(i, set.name)}
                    aria-label={GEAR.loadoutResave(set.name)} title={GEAR.loadoutResave(set.name)}>{GEAR.loadoutSaveShort}</button>
                  <button className="gs-clear" onClick={() => onClearSet(i)}
                    aria-label={GEAR.loadoutForget(set.name)} title={GEAR.loadoutForget(set.name)}>×</button>
                </div>
                {/* 套 The tasks this loadout can be given: lit when it has one. A tap gives it the
                    task (from whichever loadout had it), a tap on a lit one gives it back to what
                    is worn. */}
                {onAssignTask && (
                  <div className="gstasks" role="group" aria-label={GEAR.tasksSay}>
                    {openTasks.map((t) => {
                      const mine = given.includes(t);
                      const label = mine ? GEAR.taskTake(set.name, GEAR.taskVerb[t]) : GEAR.taskGive(set.name, GEAR.taskVerb[t]);
                      return (
                        <button key={t} type="button" className="gst" aria-pressed={mine} title={label} aria-label={label}
                          onClick={() => onAssignTask(t, mine ? null : i)}>
                          {mine && <span className="gst-tick" aria-hidden="true">✓</span>}
                          <span className="cjk">{GEAR.taskHan[t]}</span> {GEAR.taskName[t]}
                        </button>
                      );
                    })}
                  </div>
                )}
                </div>
              );
            })}
            {state.sets.length < SET_LIMIT && SLOTS.some((slot) => state.worn[slot]) && (
              <button className="gs-new" onClick={() => onSaveSet(state.sets.length, loadoutName(state))}>
                <b className="cjk">套</b> {GEAR.loadoutSave}
              </button>
            )}
          </div>
          {/* 套 What the loadouts hold of the chest. Past the share the chest keeps for them the
              count stops and the line says so, since a locked chest has nowhere for a drop. */}
          {state.sets.length > 0 && (
            <p className="faint gkeeps" data-qol="kept-by-sets">
              {GEAR.keptBySets(keeping.counted, limit)}
              {keeping.named > keeping.counted && <span>{GEAR.keptCrowded(keeping.named - keeping.counted)}</span>}
            </p>
          )}
        </>
      )}

      {/* 煉器 Where material goes. Everything else it buys is capped; this is not. */}
      {isOpen(state.realm, 'refine') && SLOTS.some((slot) => state.worn[slot]) && (
        <>
          <div className="row" style={{ marginTop: 18 }}>
            <h2 className="heading" style={{ margin: 0 }}>{GEAR.refineHead}</h2>
            <span className="mono" style={{ fontSize: 13, color: 'var(--gold)' }}>材 {num(state.materials)} {UNIT.material}</span>
          </div>
          <p className="faint" style={{ fontSize: 12.5, margin: '4px 0 8px' }}>{GEAR.refine}</p>
          {taskSet('refine') && <p className="gtaskuse"><span className="cjk">套</span> {GEAR.taskRefine(taskSet('refine')!)}</p>}
          <div className="stack">
            {SLOTS.filter((slot) => state.worn[slot]).map((slot) => {
              const item = state.worn[slot]!;
              const level = levelAt(state.refined, slot);
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
                    <em>{GEAR.refineAt(level, Math.round((refineFactor(level) - 1) * 100))}</em>
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
          {taskSet('fuse') && <p className="gtaskuse"><span className="cjk">套</span> {GEAR.taskFuse(taskSet('fuse')!)}</p>}
          {/* 煉 Every group in one tap once there are two or more: the single rows stay. */}
          {onFuseAll && groups.length >= 2 && (
            <div className="gearbulk">
              <button className="act ghost" onClick={onFuseAll}>
                煉 <span>{QOL.gear.fuseAll}</span> <i className="mono">{groups.length}</i>
              </button>
              <p className="faint">{QOL.gear.fuseAllSays}</p>
            </div>
          )}
          <div className="stack">
            {climbing.slice(0, fuseShown).map(fuseRow)}
          </div>
          {climbing.length > fuseShown && (
            <ChestMore n={Math.min(FUSE_PAGE, climbing.length - fuseShown)} left={climbing.length - fuseShown}
              onMore={() => setFuseShown((n) => n + FUSE_PAGE)}
              label={QOL.gear.moreGroupsLabel(Math.min(FUSE_PAGE, climbing.length - fuseShown), climbing.length - fuseShown)} />
          )}
          {/* 天 Heaven into Heaven, after the groups that climb a rank, under one line that
              says what is different about them: only found pieces, and only once. */}
          {groups.some((g) => g.rarity === 'heaven') && (
            <>
              <p className="faint fusesame">{QOL.gear.heavenSays}</p>
              <div className="stack">
                {groups.filter((g) => g.rarity === 'heaven').map(fuseRow)}
              </div>
            </>
          )}
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
                {/* 譯 Every rank says its name, not only the lit one in the line beside. */}
                <small className="rk-name" aria-hidden="true">{RARITY_INFO[r].name}</small>
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
            <em className="mono">
              {meltWorth > 0 && <>{num(meltWorth)}<span>qi</span></>}
              {quote.materials > 0 && <span className="mats">+{num(quote.materials)} 材 {UNIT.material}</span>}
            </em>
          </button>
          {quote.materials > 0 && (
            <p className="faint allowance">{GEAR.allowance(num(meltWorth))}</p>
          )}
          {taskSet('melt') && <p className="gtaskuse"><span className="cjk">套</span> {GEAR.taskMelt(taskSet('melt')!)}</p>}
        </div>
      )}

      {state.chest.length === 0 ? (
        <p className="faint" style={{ fontSize: 13, margin: 0 }}>{GEAR.empty}</p>
      ) : (() => {
        // 篩 The lines worth offering: every line some piece in the chest carries, and any
        // line already picked, so a pick can always be taken back.
        const offered = AFFIXES.filter((a) => lines.includes(a) || tally.carried.has(a));
        const toggle = (a: Affix) => setLines(lines.includes(a) ? lines.filter((x) => x !== a) : [...lines, a]);
        const filtered = place !== 'all' || school !== 'any' || lines.length > 0;
        const apply = (p: ChestFilter) => { setOnly(p.slot); setKin(p.school); setLines(p.lines); };
        const isOn = (p: ChestFilter) => p.slot === place && p.school === school
          && p.lines.length === lines.length && p.lines.every((a) => lines.includes(a));
        // 存 Keeping is offered for a filter that is on and not kept already.
        const canKeep = filtered && !presets.some(isOn);
        return (
          <>
            {/* ▲ 著 Every upgrade on at once. rekaris, the audit: the chest is 2,090px down
                at the fifth realm and each ▲ was two taps, a sheet and a button. */}
            {onWearAll && wearAll > 0 && (
              <div className="gearbulk">
                <button className="act" data-qol="wear-all" onClick={onWearAll}>
                  <span className="up" aria-hidden="true">▲</span> 著 <span>{QOL.gear.wearAll}</span> <i className="mono">{wearAll}</i>
                </button>
                <p className="faint">{QOL.gear.wearAllSays}</p>
              </div>
            )}
            <div className="chestfilter" role="group" aria-label={GEAR.all}>
              <button type="button" aria-pressed={place === 'all'} onClick={() => setOnly('all')}>
                {GEAR.all} <i className="mono">{read.length}</i>
              </button>
              {ups > 0 && (
                <button type="button" className="ups" aria-pressed={place === 'better'} onClick={() => setOnly('better')}>
                  ▲ {GEAR.betterOnly} <i className="mono">{ups}</i>
                </button>
              )}
              {locks > 0 && (
                <button type="button" className="locks" aria-pressed={place === 'locked'} onClick={() => setOnly('locked')}>
                  <span className="cjk">鎖</span> {QOL.gear.lockedOnly} <i className="mono">{locks}</i>
                </button>
              )}
              {SLOTS.filter((slot) => bySlot(slot) > 0).map((slot) => (
                <button key={slot} type="button" aria-pressed={place === slot} onClick={() => setOnly(slot)}>
                  <span className="cjk">{SLOT_INFO[slot].han}</span> {SLOT_INFO[slot].name} <i className="mono">{bySlot(slot)}</i>
                </button>
              ))}
            </div>
            {/* 職 Always there when the chest holds anything. It used to wait for two schools,
                and a cultivator farming one school (rekaris, on the Discord, twice: "I still
                don't see them") never saw the row at all. */}
            {read.length > 0 && (
              <div className="chestfilter schools" role="group" aria-label={GEAR.anySchool}>
                <button type="button" aria-pressed={school === 'any'} onClick={() => setKin('any')}>{GEAR.anySchool}</button>
                {SCHOOLS.filter((sc) => bySchool(sc) > 0).map((sc) => (
                  <button key={sc} type="button" aria-pressed={school === sc} onClick={() => setKin(sc)}
                    style={{ ['--hue' as string]: SCHOOL_INFO[sc].colour }}>
                    <span className="cjk">{SCHOOL_INFO[sc].seal}</span> {SCHOOL_INFO[sc].short} <i className="mono">{bySchool(sc)}</i>
                  </button>
                ))}
              </div>
            )}
            {/* 篩 The third row: lines, several at once, and a piece must carry them all. */}
            {read.length > 0 && (
              <div className="chestfilter lines" role="group" aria-label={QOL.gear.lines}>
                <button type="button" aria-pressed={lines.length === 0} onClick={() => setLines([])}>{QOL.gear.anyLine}</button>
                {offered.map((a) => (
                  <button key={a} type="button" aria-pressed={lines.includes(a)} onClick={() => toggle(a)}>
                    <span className="cjk">{AFFIX_INFO[a].han}</span> {AFFIX_INFO[a].label}
                  </button>
                ))}
              </div>
            )}
            {lines.length > 1 && <p className="faint chestlegend">{QOL.gear.linesSays}</p>}
            {/* 存 The filters kept on this device, and the control that keeps one, together in one
                row right under the three rows they remember. They used to sit above the rows,
                under the Wear-all note, each pill drawn inside another pill, and the third ran off
                a 400px screen. Now the row wraps, so every one is in sight. */}
            {(presets.length > 0 || canKeep) && (presetName === null ? (
              <div className="gearpresets" role="group" aria-label={QOL.gear.savedHead}>
                {presets.map((p, i) => (
                  <span key={`${p.name}${i}`} className="gp" data-on={isOn(p) || undefined} data-kept={p.keep || undefined}>
                    <button type="button" className="gp-use" aria-pressed={isOn(p)} onClick={() => apply(p)}>
                      <span className="cjk">存</span> {p.name}
                    </button>
                    {/* 鎖 Keep: a full chest melts what this filter shows last (sim/filters.ts).
                        ▲ Better changes with every piece put on, so it is never offered. */}
                    {onKeepFilter && keepable(p) && (
                      <button type="button" className="gp-hold" aria-pressed={!!p.keep}
                        aria-label={p.keep ? QOL.gear.unkeepOne(p.name) : QOL.gear.keepOne(p.name)}
                        title={p.keep ? QOL.gear.unkeepOne(p.name) : QOL.gear.keepOne(p.name)}
                        onClick={() => onKeepFilter(i, !p.keep)}>
                        <span className="cjk">鎖</span> {p.keep ? QOL.gear.keptWord : QOL.gear.keepWord}
                      </button>
                    )}
                    <button type="button" className="gp-forget" aria-label={QOL.gear.forgetOne(p.name)}
                      onClick={() => onForgetFilter?.(i)}>✕</button>
                  </span>
                ))}
                {canKeep && (
                  <button type="button" className="gp-keep" disabled={presets.length >= FILTER_LIMIT}
                    onClick={() => setPresetName(QOL.gear.filterDefault(presets.length + 1))}>
                    <span className="cjk">存</span> {QOL.gear.saveFilter}
                  </button>
                )}
                {canKeep && presets.length >= FILTER_LIMIT && <i className="faint gp-full">{QOL.gear.filtersFull(FILTER_LIMIT)}</i>}
                {presets.length > 0 && onKeepFilter && (
                  <i className="faint gp-says">{presets.some((p) => p.keep) ? QOL.gear.keptSays : QOL.gear.keepWhy}</i>
                )}
              </div>
            ) : (
              <form className="keepname" onSubmit={(e) => {
                e.preventDefault();
                const name = presetName.trim().slice(0, 24) || QOL.gear.filterDefault(presets.length + 1);
                onSaveFilter?.({ name, slot: place, school, lines: [...lines] });
                setPresetName(null);
              }}>
                <input value={presetName} maxLength={24} aria-label={QOL.gear.filterName} autoFocus
                  onChange={(e) => setPresetName(e.target.value)} />
                <button className="act small" type="submit">{QOL.gear.keepIt}</button>
                <button className="act small ghost" type="button" onClick={() => setPresetName(null)}>{QOL.gear.cancel}</button>
              </form>
            ))}
            {pick.length === 0 && <p className="faint chestlegend">{QOL.gear.none}</p>}
            <div className="chest">
              {pick.slice(0, shown).map(({ item, move }, index) => (
                <ChestTile key={item.id} item={item} better={move.better} first={index === 0} onOpen={openPiece} />
              ))}
            </div>
            {pick.length > shown && (
              <ChestMore n={Math.min(CHEST_PAGE, pick.length - shown)} left={pick.length - shown} auto onMore={drawMore}
                label={QOL.gear.moreLabel(Math.min(CHEST_PAGE, pick.length - shown), pick.length - shown)} />
            )}
            {ups > 0 && <p className="faint chestlegend"><b>▲</b> {GEAR.legend}</p>}
            {pick.length > 0 && <p className="faint chestlegend quality"><b className="mono">×1.00</b> {GEAR.qualityLegend}</p>}
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

/**
 * 藏 One tile of the chest. Drawn again only when its piece or its ▲ changes: the clock
 * ticks five times a second, and a chest of 1,800 used to draw every picture on every tick.
 */
const ChestTile = memo(function ChestTile({ item, better, first, onOpen }: {
  item: Item;
  better: boolean;
  /** 導 The first tile is the one the coach points at. */
  first: boolean;
  onOpen: (item: Item) => void;
}) {
  const tpl = templateOf(item);
  const primary = primaryOf(item);
  // 質 rekaris, on the Discord: two pieces with the same lines, one better by a
  // number nothing showed. It is on every tile now, at the foot.
  const q = qualityOf(item);
  return (
    <button className="chestit" data-better={better}
            onClick={() => onOpen(item)}
            data-coach={first ? 'chest-first' : undefined}
            // 譯 The tile carries no number now, so the screen reader is told
            // what the eye is shown: the name, the rank, and whether it is better.
            aria-label={`${tpl.name}, ${RARITY_INFO[item.rarity].name}${primary
              ? `, ${AFFIX_INFO[primary.affix].label} ${Math.round(primary.value * 10) / 10}` : ''}, ×${q.toFixed(2)} ${GEAR.qualityNote}${better ? `, ${GEAR.better}` : ''}${item.locked ? `, ${GEAR.lockedWord}` : ''}`}>
      {/* 註 On a computer the pointer reads the tile out: name, rank, school and quality. */}
      <span title={`${tpl.name} · ${RARITY_INFO[item.rarity].name} · ${SCHOOL_INFO[schoolOf(item)].short} school · ×${q.toFixed(2)} ${GEAR.qualityNote}`}>
        <Svg html={gearTile(item, { size: 56, quality: q })} />
      </span>
      {better && <span className="upmark" aria-hidden="true">▲</span>}
      {item.locked && <span className="lockmark" aria-hidden="true">鎖</span>}
    </button>
  );
});

/**
 * 窗 The foot of a list drawn in part. The chest's draws the next tiles by itself as it
 * comes within a screen of sight (`auto`), and is a button as well, for a tap and for a
 * screen reader. The observer is made again after every page, so a foot still in sight
 * asks once more. The fuse list's waits for a tap: it sits above the chest, and growing
 * by itself would push the chest away from a thumb scrolling down to it.
 */
function ChestMore({ n, left, label, auto, onMore }: {
  n: number; left: number; label: string; auto?: boolean; onMore: () => void;
}) {
  const foot = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const el = foot.current;
    if (!auto || !el || typeof IntersectionObserver === 'undefined') return;
    const near = new IntersectionObserver((seen) => { if (seen.some((e) => e.isIntersecting)) onMore(); },
      { rootMargin: '0px 0px 800px 0px' });
    near.observe(el);
    return () => near.disconnect();
  }, [auto, onMore, left]);
  return (
    <button ref={foot} type="button" className="act ghost chestmore" onClick={onMore} aria-label={label}>
      <span className="cjk" aria-hidden="true">{auto ? '藏' : '煉'}</span> {QOL.gear.showMore(n)}
      <i className="mono" aria-hidden="true">{QOL.gear.moreLeft(left)}</i>
    </button>
  );
}

/*
 * 煉 The same row 狩 uses (a seal, a name, a figure on the right) shared on purpose
 * rather than by accident, and carrying its own name so that restyling one screen
 * cannot silently restyle the other. 天 A Heaven row says what it will make.
 * 算 Drawn again only when its group changes: a big chest has a hundred of them.
 */
const FuseRow = memo(function FuseRow({ template, rarity, count, quote, onFuse }: {
  template: string;
  rarity: Rarity;
  count: number;
  /** 天 What a Heaven row comes out at; undefined for a row that climbs a rank. */
  quote: number | undefined;
  onFuse: (template: string, rarity: string) => void;
}) {
  const tpl = templateOf({ id: '', template, rarity, rolls: [] });
  const rar = RARITY_INFO[rarity];
  const same = rarity === 'heaven';
  return (
    <button className="beast fuserow"
      data-same={same || undefined}
      onClick={() => onFuse(template, rarity)}>
      <span className="seal" style={{ width: 44, height: 44 }}>
        <Svg html={gearTile({ id: 'x', template, rarity, rolls: [] }, { size: 44 })} />
      </span>
      <span className="bname">
        <b style={{ color: rar.colour }}>{tpl.han}</b>
        <i>{same ? QOL.gear.heavenRow(tpl.name, count, quote ?? 1) : `${tpl.name} · ${count} in the chest`}</i>
      </span>
      <span className="odds" style={{ color: 'var(--jade)' }}>
        {FUSE_COUNT}→1<em>fuse</em>
      </span>
    </button>
  );
});

/** 套 A new loadout is named after the class it makes, which is the thing it is for. */
function loadoutName(state: State): string {
  const c = callingOf(state.worn);
  if (c.kind === 'pair' && c.pair) return c.pair.name;
  if (c.kind === 'pure' && c.school) return SCHOOL_INFO[c.school].short;
  return GEAR.loadoutDefault(state.sets.length + 1);
}

function isAffixList(x: unknown): x is readonly Affix[] {
  return Array.isArray(x) && x.length <= AFFIXES.length && x.every((a) => (AFFIXES as readonly unknown[]).includes(a));
}
