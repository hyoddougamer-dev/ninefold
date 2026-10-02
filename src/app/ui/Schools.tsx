import { useMemo } from 'react';
import { AFFIX_INFO, ARCHETYPES, SLOTS, SLOT_INFO, callingOf, templateOf, type Item } from '../../data/gear.ts';
import { PAIRS, SCHOOLS, SCHOOL_INFO, schoolOfAxis, type School } from '../../data/schools.ts';
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
 * Every sentence is schoolSays and pairSays, read off balance.ts: the same words the
 * ribbon, the key and tools/schools-chart.ts use, so none of them can drift.
 */
const shapesOf = (sc: School) => SLOTS.flatMap((slot) =>
  ARCHETYPES.filter((a) => a.slot === slot && schoolOfAxis(a.affix) === sc));

export function Schools({ state, onClose }: { state: State; onClose: () => void }) {
  const realm = Math.min(9, Math.max(1, state.realm));
  const worn = useMemo(() => new Set(SLOTS.map((s) => state.worn[s])
    .filter((x): x is Item => !!x).map((x) => templateOf(x).archetype)), [state.worn]);
  const counts = callingOf(state.worn).counts;

  return (
    <div className="help schoolbook">
      <h2><span className="cjk">譜</span> {CLASS.book.title}</h2>
      <p className="faint sb-blurb">{CLASS.book.blurb}</p>

      {SCHOOLS.map((sc) => {
        const s = SCHOOL_INFO[sc];
        const list = shapesOf(sc);
        const missing = SLOTS.filter((slot) => !list.some((a) => a.slot === slot));
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
        {PAIRS.map((p) => (
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
