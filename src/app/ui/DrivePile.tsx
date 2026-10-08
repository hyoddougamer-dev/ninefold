import { useMemo, useState } from 'react';
import { AFFIXES, AFFIX_INFO, RARITY_INFO, SLOTS, SLOT_INFO, schoolOf, templateOf, type Affix, type Item, type Slot } from '../../data/gear.ts';
import { SCHOOLS, SCHOOL_INFO, type School } from '../../data/schools.ts';
import { gearTile } from '../../art/gear.ts';
import { qualityOf } from '../../sim/chest.ts';
import { matchesFilter, type Place } from '../../sim/filters.ts';
import { swing, upOf } from '../../sim/inspect.ts';
import { num } from '../../sim/format.ts';
import { plan, type Choice, type Plan } from '../../sim/pile.ts';
import { salvageable } from '../../sim/salvage.ts';
import { RARITIES } from '../../data/gear.ts';
import type { State } from '../../sim/state.ts';
import { fightDeps } from '../memo.ts';
import { GEAR, PILE, QOL } from '../copy.ts';
import { Svg } from './Svg.tsx';

/**
 * 圍 The window a drive opens: everything that fell, with filters like the chest's, a mark on
 * what to keep, and the rest melted. See sim/pile.ts for what each answer does.
 *
 * It reads the pieces from the save (state.pile), not from the drive that made them, so the
 * same window opens on a drive just taken and on one left unanswered when the game was shut.
 * It answers by handing a Choice up; nothing is changed in here.
 *
 * Every class is scoped under `.dwin`: the chest has tiles and filters of its own and the two
 * screens must never share a rule (CLAUDE.md).
 */
export function DrivePile({ state, unlisted = 0, onAnswer, onGame, onLater }: {
  state: State;
  /** How many pieces fell beyond the ones listed, which were left where they fell. */
  unlisted?: number;
  onAnswer: (choice: Choice, p: Plan) => void;
  onGame: () => void;
  /** Left out where the sheet around it already has a way to close that says the same. */
  onLater?: () => void;
}) {
  const pile = state.pile;
  // The game's own pick starts marked, so the window opens on what doing nothing would keep.
  const [marked, setMarked] = useState<ReadonlySet<string>>(() => new Set(pile.slice(0, 1).map((x) => x.id)));
  const [bag, setBag] = useState(false);
  const [place, setPlace] = useState<Place>('all');
  const [school, setSchool] = useState<'any' | School>('any');
  const [lines, setLines] = useState<readonly Affix[]>([]);

  // ▲ Better than what is worn, read once per piece until something a fight reads moves.
  const better = useMemo(() => new Set(pile.filter((it) => upOf(state, it, swing(state, it))).map((it) => it.id)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pile, ...fightDeps(state)]);

  const shown = pile.filter((it) => (place === 'better' ? better.has(it.id)
    : place === 'all' || place === 'locked' ? true : templateOf(it).slot === place)
    && matchesFilter({ slot: 'all', school, lines }, it));
  const bySlot = (slot: Slot) => pile.filter((x) => templateOf(x).slot === slot).length;
  const bySchool = (sc: School) => pile.filter((x) => schoolOf(x) === sc).length;
  const offered = AFFIXES.filter((a) => lines.includes(a) || pile.some((x) => x.rolls.some((r) => r.affix === a)));

  const choice: Choice = { keep: [...marked], meltBag: bag };
  // Both readings, whether or not the bag is switched on, so the switch can say what it would add.
  const without = plan(state, { keep: [...marked], meltBag: false });
  const withBag = plan(state, { keep: [...marked], meltBag: true });
  const p = bag ? withBag : without;
  const bagPieces = useMemo(() => salvageable(state.chest, RARITIES[RARITIES.length - 1]),
    [state.chest]);

  const toggle = (id: string) => setMarked((m) => {
    const next = new Set(m);
    if (!next.delete(id)) next.add(id);
    return next;
  });
  const markShown = (on: boolean) => setMarked((m) => {
    const next = new Set(m);
    for (const it of shown) { if (on) next.add(it.id); else next.delete(it.id); }
    return next;
  });
  const toggleLine = (a: Affix) => setLines(lines.includes(a) ? lines.filter((x) => x !== a) : [...lines, a]);
  const kept = p.kept.length;
  const over = Math.max(0, kept - p.room);
  const qi = p.qi > 0 ? num(p.qi) : '';
  const mats = p.materials > 0 ? num(p.materials) : '';

  return (
    <div className="dwin" data-qol="drive-pile">
      <h2 className="heading"><span className="cjk">圍</span> {PILE.head(pile.length)}</h2>
      <p className="faint dw-says">{PILE.says}</p>
      {unlisted > 0 && <p className="faint dw-says">{PILE.unlisted(unlisted)}</p>}

      {/* 篩 The chest's three rows, over what fell. */}
      <div className="dw-filter" role="group" aria-label={GEAR.all}>
        <button type="button" aria-pressed={place === 'all'} onClick={() => setPlace('all')}>
          {GEAR.all} <i className="mono">{pile.length}</i>
        </button>
        {better.size > 0 && (
          <button type="button" className="ups" aria-pressed={place === 'better'} onClick={() => setPlace('better')}>
            ▲ {GEAR.betterOnly} <i className="mono">{better.size}</i>
          </button>
        )}
        {SLOTS.filter((slot) => bySlot(slot) > 0).map((slot) => (
          <button key={slot} type="button" aria-pressed={place === slot} onClick={() => setPlace(slot)}>
            <span className="cjk">{SLOT_INFO[slot].han}</span> {SLOT_INFO[slot].name} <i className="mono">{bySlot(slot)}</i>
          </button>
        ))}
      </div>
      <div className="dw-filter" role="group" aria-label={GEAR.anySchool}>
        <button type="button" aria-pressed={school === 'any'} onClick={() => setSchool('any')}>{GEAR.anySchool}</button>
        {SCHOOLS.filter((sc) => bySchool(sc) > 0).map((sc) => (
          <button key={sc} type="button" aria-pressed={school === sc} onClick={() => setSchool(sc)}
            style={{ ['--hue' as string]: SCHOOL_INFO[sc].colour }}>
            <span className="cjk">{SCHOOL_INFO[sc].seal}</span> {SCHOOL_INFO[sc].short} <i className="mono">{bySchool(sc)}</i>
          </button>
        ))}
      </div>
      <div className="dw-filter" role="group" aria-label={QOL.gear.lines}>
        <button type="button" aria-pressed={lines.length === 0} onClick={() => setLines([])}>{QOL.gear.anyLine}</button>
        {offered.map((a) => (
          <button key={a} type="button" aria-pressed={lines.includes(a)} onClick={() => toggleLine(a)}>
            <span className="cjk">{AFFIX_INFO[a].han}</span> {AFFIX_INFO[a].label}
          </button>
        ))}
      </div>

      <div className="dw-bulk">
        <button type="button" className="act small" data-qol="pile-all" onClick={() => markShown(true)}>{PILE.all}</button>
        <button type="button" className="act small ghost" data-qol="pile-none" onClick={() => markShown(false)}>{PILE.none}</button>
        <i className="faint mono">{PILE.allShown(shown.length)}</i>
      </div>

      {shown.length === 0 && <p className="faint dw-says">{QOL.gear.none}</p>}
      <div className="dw-grid">
        {shown.map((it) => <Tile key={it.id} item={it} on={marked.has(it.id)} up={better.has(it.id)} onTap={toggle} />)}
      </div>

      <div className="dw-sum" data-over={over > 0 || undefined}>
        <b>{PILE.keeping(kept, pile.length)}</b>
        <span className="mono">{PILE.room(p.room)}</span>
        <p className="faint">
          {p.melted.length + p.bag.length > 0 ? PILE.melts(p.melted.length + p.bag.length, qi, mats) : PILE.meltsNone}
          {mats && ` ${PILE.past}`}
        </p>
        {over > 0 && <p className="dw-warn" role="alert">{PILE.tooMany(over, p.room)}</p>}
      </div>

      {/* 拆 The way out of a full chest: melt the bag from here, so it never locks the window. */}
      <button type="button" className="dw-bag" role="switch" aria-checked={bag} data-on={bag || undefined}
        data-qol="pile-bag" disabled={bagPieces.length === 0} onClick={() => setBag(!bag)}>
        <b className="cjk">拆</b>
        <span>
          <em>{PILE.bag}</em>
          <i>{bagPieces.length === 0 ? PILE.bagNone : PILE.bagSays(bagPieces.length)}</i>
        </span>
        <span className="dw-knob" aria-hidden="true" />
      </button>

      <div className="dw-act">
        <button type="button" className="act" data-qol="pile-keep" disabled={over > 0}
          onClick={() => onAnswer(choice, p)}>
          {PILE.keep(kept)}
        </button>
        <button type="button" className="act ghost" data-qol="pile-game" onClick={onGame}>
          {PILE.game}
          <i className="faint">{PILE.gameSays}</i>
        </button>
        {onLater && (
          <button type="button" className="act ghost" data-qol="pile-later" onClick={onLater}>
            {PILE.later}
            <i className="faint">{PILE.laterSays}</i>
          </button>
        )}
      </div>
    </div>
  );
}

/** One piece: a tap marks it to keep, another lets it go. Unmarked pieces sit dimmer, because they melt. */
function Tile({ item, on, up, onTap }: { item: Item; on: boolean; up: boolean; onTap: (id: string) => void }) {
  const tpl = templateOf(item);
  const q = qualityOf(item);
  return (
    <button type="button" className="dw-tile" aria-pressed={on} data-on={on || undefined}
      aria-label={PILE.aria.tile(tpl.name, RARITY_INFO[item.rarity].name, on)}
      title={`${tpl.name} · ${RARITY_INFO[item.rarity].name} · ×${q.toFixed(2)}`}
      onClick={() => onTap(item.id)}>
      <Svg html={gearTile(item, { size: 56, quality: q })} />
      {up && <span className="dw-up" aria-hidden="true">▲</span>}
      <span className="dw-tick" aria-hidden="true">{on ? '✓' : ''}</span>
    </button>
  );
}
