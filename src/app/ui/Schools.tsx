import { useMemo, useState } from 'react';
import { AFFIX_INFO, SLOTS, SLOT_INFO, callingOf, shapesOf, templateOf, type Item, type Slot } from '../../data/gear.ts';
import { PAIRS, SCHOOLS, SCHOOL_INFO, type School } from '../../data/schools.ts';
import type { State } from '../../sim/state.ts';
import { gearTile } from '../../art/gear.ts';
import { CLASS } from '../copy.ts';
import { pairSays, schoolSays } from '../classes.ts';
import { Svg } from './Svg.tsx';

/**
 * 譜 Which piece is which school, on one page.
 *
 * Raziel Morgenstern, on the Discord (2026-10-02): *"is this possible to have a list of
 * which gear is what school? ... I have no idea which name is what class, apart from
 * learning it by heart."* A school goes with the shape of a piece and never its metal, so
 * the whole answer is fifty-four shapes under six seals. They are drawn in the metal of
 * the realm the cultivator stands in, so the page looks like what they are finding, and
 * a shape they are wearing says so.
 *
 * 篩 Two lines of filters on top, a school and a place on the body, because the question
 * a player brings is usually one of them: "which rings are Fortune?"
 *
 * Every sentence is schoolSays and pairSays, read off balance.ts: the same words the
 * ribbon, the key and tools/schools-chart.ts use, so none of them can drift.
 */

export function Schools({ state, onClose }: { state: State; onClose: () => void }) {
  const realm = Math.min(9, Math.max(1, state.realm));
  const worn = useMemo(() => new Set(SLOTS.map((s) => state.worn[s])
    .filter((x): x is Item => !!x).map((x) => templateOf(x).archetype)), [state.worn]);
  const counts = callingOf(state.worn).counts;
  const [only, setOnly] = useState<School | 'any'>('any');
  const [place, setPlace] = useState<Slot | 'any'>('any');
  const shown = only === 'any' ? SCHOOLS : SCHOOLS.filter((sc) => sc === only);

  return (
    <div className="help schoolbook">
      <h2><span className="cjk">譜</span> {CLASS.book.title}</h2>
      <p className="faint sb-blurb">{CLASS.book.blurb}</p>

      <div className="sb-filter" role="group" aria-label={CLASS.book.schoolsFilter}>
        <button type="button" aria-pressed={only === 'any'} onClick={() => setOnly('any')}>{CLASS.book.anySchool}</button>
        {SCHOOLS.map((sc) => (
          <button key={sc} type="button" aria-pressed={only === sc} onClick={() => setOnly(sc)}
            style={{ ['--c' as string]: SCHOOL_INFO[sc].colour }}>
            <span className="cjk" aria-hidden="true">{SCHOOL_INFO[sc].seal}</span> {SCHOOL_INFO[sc].short}
          </button>
        ))}
      </div>
      <div className="sb-filter" role="group" aria-label={CLASS.book.placesFilter}>
        <button type="button" aria-pressed={place === 'any'} onClick={() => setPlace('any')}>{CLASS.book.anyPlace}</button>
        {SLOTS.map((slot) => (
          // The place's own character is left off: 劍 Weapon beside 劍 Sword reads as one thing.
          <button key={slot} type="button" aria-pressed={place === slot} onClick={() => setPlace(slot)}>
            {SLOT_INFO[slot].name}
          </button>
        ))}
      </div>

      {shown.map((sc) => {
        const s = SCHOOL_INFO[sc];
        const list = shapesOf(sc).filter((a) => place === 'any' || a.slot === place);
        const missing = SLOTS.filter((slot) => (place === 'any' || slot === place) && !list.some((a) => a.slot === slot));
        const lines = s.axes.map((a) => `${AFFIX_INFO[a].han} ${AFFIX_INFO[a].label}`).join(' or ');
        return (
          <section key={sc} className="sb-school" style={{ ['--c' as string]: s.colour }}>
            <header>
              <span className="sb-seal cjk" aria-hidden="true">{s.seal}</span>
              <div>
                <b><span className="cjk">{s.han}</span> {s.name}</b>
                <i>{CLASS.book.leads(lines)} · {CLASS.book.wearing(counts[sc])}</i>
              </div>
            </header>
            <p className="sb-says">{schoolSays(sc)}</p>
            <div className="sb-shapes">
              {list.map((a) => (
                <figure key={a.key} data-worn={worn.has(a.key) || undefined}>
                  <Svg html={gearTile({ id: a.key, template: `${a.key}${realm}`, rarity: 'spirit',
                    rolls: [{ affix: a.affix, value: 1 }] } as Item, { size: 50 })} />
                  <figcaption>{a.name}<small>{worn.has(a.key) ? CLASS.book.worn : SLOT_INFO[a.slot].name}</small></figcaption>
                </figure>
              ))}
              {missing.map((slot) => (
                <figure key={slot} className="sb-none">
                  <span className="sb-gap" aria-hidden="true" />
                  <figcaption>{CLASS.book.none(SLOT_INFO[slot].name)}<small>{SLOT_INFO[slot].name}</small></figcaption>
                </figure>
              ))}
            </div>
          </section>
        );
      })}

      <section className="sb-pairs">
        <h3>{CLASS.book.pairsHead}</h3>
        <p className="faint">{CLASS.book.pairsBlurb}</p>
        {PAIRS.filter((p) => only === 'any' || p.a === only || p.b === only).map((p) => (
          <div key={p.key} className="sb-pair"
            style={{ ['--a' as string]: SCHOOL_INFO[p.a].colour, ['--b' as string]: SCHOOL_INFO[p.b].colour }}>
            <b><span className="cjk">{p.han}</span> {p.name}</b>
            <i><span className="cjk sb-a">{SCHOOL_INFO[p.a].seal}</span> {SCHOOL_INFO[p.a].short} and{' '}
              <span className="cjk sb-b">{SCHOOL_INFO[p.b].seal}</span> {SCHOOL_INFO[p.b].short}. {pairSays(p.key)}</i>
          </div>
        ))}
      </section>

      <button className="act" style={{ marginTop: 4 }} onClick={onClose}>
        閉 <span>{CLASS.book.close}</span>
      </button>
    </div>
  );
}
