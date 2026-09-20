import { useMemo, useState } from 'react';
import { BEASTS, huntable } from '../../data/bestiary.ts';
import { realm as realmOf } from '../../data/realms.ts';
import { beastPower, loot, odds } from '../../sim/combat.ts';
import { power, type State } from '../../sim/state.ts';
import { lootTaken } from '../../sim/trials.ts';
import { MARK_INFO, marksOf, nextMark, recordMaterial, recordTally } from '../../sim/record.ts';
import { num } from '../../sim/format.ts';
import { seal } from '../../art/aura.ts';
import { Svg } from '../ui/Svg.tsx';
import { HUNT } from '../copy.ts';
import { Bestiary } from './Bestiary.tsx';

/**
 * 狩 Free hunting.
 *
 * Common beasts, hunted for material — it is what gives you something to do when the
 * app opens, and a three-month climb needs that. Entering costs nothing and losing
 * punishes nothing; what hunting buys is 材 material, which 妖丹 cores and 丹爐 the
 * furnace both eat.
 *
 * 錄 The bestiary lives at the bottom of this screen rather than on a tab of its own.
 * It is a record of what has been hunted, so it belongs next to the hunting — and the
 * tab it used to hold went to 塔 the tower, which is a place you go rather than a page
 * you read.
 */
export function Hunt({ state, onFight }: {
  state: State;
  onFight: (key: string) => void;
}) {
  const [record, setRecord] = useState(false);
  const seen = BEASTS.filter((b) => (state.killed[b.key] ?? 0) > 0).length;
  const tally = recordTally(state.killed);

  /**
   * 錄 The order is the point of this screen.
   *
   * It used to be every beast you had ever reached, newest first, and by the fifth realm
   * that was fifteen rows all reading 98% of which only the top one was worth pressing.
   * Now a beast with a mark still to earn comes first — newest realm first among those —
   * and the ones with nothing left in them sink to the bottom and go quiet.
   */
  const list = useMemo(() => {
    const all = [...huntable(state.realm)];
    return all.sort((a, b) => {
      const left = (x: typeof a) => (nextMark(state.killed[x.key] ?? 0) ? 0 : 1);
      // 弱 Weakest first inside a realm, not alphabetical. At the first realm the
      // alphabet put 澤蛙 the frog — the hardest of the three — at the top, so a new
      // cultivator's first sight of 狩 was the one beast furthest out of reach.
      return left(a) - left(b) || b.realm - a.realm || beastPower(a) - beastPower(b);
    });
  }, [state.realm, state.killed]);

  return (
    <>
      <div className="row">
        <span className="faint" style={{ fontSize: 12, letterSpacing: '.14em', textTransform: 'uppercase' }}>
          狩 Hunt
        </span>
        <span className="mono" style={{ fontSize: 13, color: 'var(--gold)' }}>材 {num(state.materials)}</span>
      </div>
      <p className="faint" style={{ margin: '6px 0 4px', fontSize: 13 }}>
        力 {num(power(state))} power. {HUNT.free}
      </p>

      <div className="tally">
        {MARK_INFO.map((m, i) => (
          <span key={m.han} data-on={tally[i] > 0}>
            <b className="cjk">{m.han}</b>
            <em className="mono">{tally[i]}<i>/{BEASTS.length}</i></em>
            <i>{m.name}</i>
          </span>
        ))}
        <span className="pay">
          <b className="mono">×{recordMaterial(state.killed).toFixed(2)}</b>
          <i>材 from the record</i>
        </span>
      </div>

      <h2 className="heading">{HUNT.reach(list.length)}</h2>
      <div className="stack">
        {list.map((b) => {
          const r = realmOf(b.realm);
          const c = odds(state, b);
          const tone = c > 0.66 ? 'var(--cyan)' : c > 0.33 ? 'var(--gold)' : 'var(--magenta)';
          const kills = state.killed[b.key] ?? 0;
          const marks = marksOf(kills);
          const next = nextMark(kills);
          return (
            <button key={b.key} className="beast" data-done={!next} onClick={() => onFight(b.key)}>
              <span className="seal"><Svg html={seal(b.icon, r.colour)} /></span>
              <span className="bname">
                <b style={{ color: r.colour }}>{b.han}</b>
                <i>
                  {b.name} · 力 {num(beastPower(b))} · 材 {num(lootTaken(state, loot(b)))}
                </i>
                <span className="marks">
                  {MARK_INFO.map((m, i) => (
                    <em key={m.han} className="cjk" data-on={i < marks}>{m.han}</em>
                  ))}
                  <i className="mono">
                    {next ? HUNT.toward(kills, next.at, MARK_INFO[next.index].han) : HUNT.mastered}
                  </i>
                </span>
              </span>
              <span className="odds" style={{ color: tone }}>
                {Math.round(c * 100)}%
                <em>odds</em>
              </span>
            </button>
          );
        })}
      </div>
      <p className="faint" style={{ margin: '10px 0 0', fontSize: 12.5 }}>{HUNT.record}</p>

      <button className="fold" data-open={record} onClick={() => setRecord((x) => !x)}>
        <span className="cjk">錄</span>
        <span>Bestiary</span>
        <span className="mono faint">{seen} / {BEASTS.length}</span>
      </button>
      {record && <Bestiary state={state} />}
    </>
  );
}
