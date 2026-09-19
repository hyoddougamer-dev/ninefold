import { useState } from 'react';
import { BEASTS, huntable } from '../../data/bestiary.ts';
import { realm as realmOf } from '../../data/realms.ts';
import { beastPower, loot, odds } from '../../sim/combat.ts';
import { power, type State } from '../../sim/state.ts';
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
  const list = [...huntable(state.realm)].reverse();
  const [record, setRecord] = useState(false);
  const seen = BEASTS.filter((b) => (state.killed[b.key] ?? 0) > 0).length;

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

      <h2 className="heading">{HUNT.reach(list.length)}</h2>
      <div className="stack">
        {list.map((b) => {
          const r = realmOf(b.realm);
          const c = odds(state, b);
          const tone = c > 0.66 ? 'var(--cyan)' : c > 0.33 ? 'var(--gold)' : 'var(--magenta)';
          const kills = state.killed[b.key] ?? 0;
          return (
            <button key={b.key} className="beast" onClick={() => onFight(b.key)}>
              <span className="seal"><Svg html={seal(b.icon, r.colour)} /></span>
              <span className="bname">
                <b style={{ color: r.colour }}>{b.han}</b>
                <i>
                  {b.name} · 力 {num(beastPower(b))} · 材 {loot(b)}
                  {kills > 0 && <> · <span className="mono">{kills} killed</span></>}
                </i>
              </span>
              <span className="odds" style={{ color: tone }}>
                {Math.round(c * 100)}%
                <em>odds</em>
              </span>
            </button>
          );
        })}
      </div>

      <button className="fold" data-open={record} onClick={() => setRecord((x) => !x)}>
        <span className="cjk">錄</span>
        <span>Bestiary</span>
        <span className="mono faint">{seen} / {BEASTS.length}</span>
      </button>
      {record && <Bestiary state={state} />}
    </>
  );
}
