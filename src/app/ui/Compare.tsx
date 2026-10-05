import { useEffect, useState } from 'react';
import type { Slot } from '../../data/gear.ts';
import { PAIRS, SCHOOL_INFO } from '../../data/schools.ts';
import { buildFloor, classBuilds, knownFloor, wornBuild, type ClassBuild } from '../../sim/compare.ts';
import { num } from '../../sim/format.ts';
import type { State } from '../../sim/state.ts';
import { nextFloor } from '../../sim/tower.ts';
import { towerOpen } from '../../sim/trials.ts';
import { CLASS } from '../copy.ts';
import { pairSays, schoolSaysAt } from '../classes.ts';

/**
 * 較 Compare classes, from the class line on 器.
 *
 * rekaris, on the Discord: nobody can tell which class is stronger without building every
 * set by hand. So the sheet builds them (sim/compare.ts): for every class the pieces can
 * make, its strongest outfit, with 力 power, the highest 塔 floor it beats now and 氣 qi a
 * second, the best of each column in gold. A tap puts the outfit on, through the same
 * path a loadout takes.
 *
 * The floors are fights, a few thousand of them for the whole sheet, so they are read one
 * row at a time after the sheet is up, and a row says so while it waits.
 */

interface Row {
  readonly build: ClassBuild;
  readonly han: string;
  readonly name: string;
  readonly from: string;
  readonly says: string;
  readonly a: string;
  readonly b: string;
}

function rowOf(build: ClassBuild): Row {
  const pair = build.pair ? PAIRS.find((p) => p.key === build.pair) : undefined;
  if (pair) {
    const a = SCHOOL_INFO[pair.a], b = SCHOOL_INFO[pair.b];
    return { build, han: pair.han, name: pair.name, says: pairSays(pair.key), a: a.colour, b: b.colour,
      from: CLASS.compare.pairOf(`${a.seal} ${a.short}`, `${b.seal} ${b.short}`) };
  }
  if (build.school) {
    const sc = SCHOOL_INFO[build.school];
    const tier = build.key.endsWith(':2') ? 2 : 1;
    return { build, han: sc.han, name: sc.name, says: schoolSaysAt(build.school, tier), a: sc.colour, b: sc.colour,
      from: tier === 2 ? CLASS.compare.full(`${sc.seal} ${sc.short}`) : `${sc.seal} ${sc.short} ${CLASS.step(1)}` };
  }
  return { build, han: '職', name: CLASS.compare.noClass, says: CLASS.none, a: 'var(--line)', b: 'var(--line)', from: CLASS.head };
}

export function Compare({ state, onWear, onClose }: {
  state: State;
  /** Put these pieces on, one place each (sim/sets.ts wearPieces). */
  onWear: (ids: Readonly<Partial<Record<Slot, string>>>) => void;
  onClose: () => void;
}) {
  // 算 Both are cached on the chest and the worn body, so a tick of qi reads nothing again.
  const builds = classBuilds(state);
  const now = wornBuild(state);
  const tower = towerOpen(state);
  const next = nextFloor(state.tower);
  // 塔 One row's floors per frame, so the sheet is up before the fights are fought.
  const [, setRead] = useState(0);
  const all = builds.some((b) => b.worn) ? builds : [now, ...builds];
  const waiting = tower ? all.find((b) => knownFloor(b) === undefined) : undefined;
  useEffect(() => {
    if (!waiting) return;
    const t = window.setTimeout(() => { buildFloor(waiting); setRead((n) => n + 1); }, 16);
    return () => window.clearTimeout(t);
  }, [waiting]);

  const rows = [...builds].sort((x, y) => y.power - x.power).map(rowOf);
  const nowRow = builds.some((b) => b.worn) ? null : rowOf(now);
  const shown = nowRow ? [nowRow, ...rows] : rows;
  const floorOf = (b: ClassBuild) => (tower ? knownFloor(b) : null);
  const top = {
    power: Math.max(...shown.map((r) => r.build.power)),
    rate: Math.max(...shown.map((r) => r.build.rate)),
    floor: Math.max(-1, ...shown.map((r) => floorOf(r.build) ?? -1)),
  };
  const near = (x: number, best: number) => best > 0 && x >= best * (1 - 1e-9);

  const line = (r: Row, now: boolean) => {
    const f = floorOf(r.build);
    const cells = (
      <>
        <span className="cc-tag" aria-hidden="true" />
        <b className="cc-name"><span className="cjk">{r.han}</span> {r.name}</b>
        <span className="cc-num mono" data-best={near(r.build.power, top.power) || undefined}>{num(r.build.power)}</span>
        {tower && (
          <span className="cc-num mono" data-best={(f != null && f === top.floor) || undefined}
            data-none={f === null || undefined} data-wait={f === undefined || undefined}>
            {f === undefined ? CLASS.compare.reading : f === null ? CLASS.compare.noFloor : f}
          </span>
        )}
        <span className="cc-num mono" data-best={near(r.build.rate, top.rate) || undefined}>{num(r.build.rate)}</span>
        <span className="cc-from">{now ? CLASS.compare.now : r.from}{r.build.worn && !now && <em> · {CLASS.compare.worn}</em>}</span>
        <span className="cc-says">{r.says}</span>
      </>
    );
    const style = { ['--a' as string]: r.a, ['--b' as string]: r.b };
    if (now || r.build.worn) {
      return <div key={now ? 'now' : r.build.key} className="cc-row" data-now={now || undefined} data-worn style={style}>{cells}</div>;
    }
    return (
      <button key={r.build.key} type="button" className="cc-row" style={style}
        onClick={() => onWear(r.build.ids)} aria-label={CLASS.compare.wear(r.name)}>
        {cells}
      </button>
    );
  };

  return (
    <div className="help classcompare" data-tower={tower || undefined}>
      <h2><span className="cjk">較</span> {CLASS.compare.title}</h2>
      <p className="faint cc-blurb">{CLASS.compare.blurb}</p>
      {builds.length === 0 ? (
        <p className="cc-empty">{CLASS.compare.none}</p>
      ) : (
        <>
          <div className="cc-table">
            <div className="cc-head" aria-hidden="true">
              <span />
              <span>{CLASS.compare.head}</span>
              <span><span className="cjk">力</span> {CLASS.compare.power}</span>
              {tower && <span><span className="cjk">塔</span> {CLASS.compare.floor}</span>}
              <span><span className="cjk">氣</span> {CLASS.compare.qi}</span>
            </div>
            {nowRow && line(nowRow, true)}
            {rows.map((r) => line(r, false))}
          </div>
          <p className="faint cc-foot">
            {CLASS.compare.best} {tower ? CLASS.compare.floorSays(next) : CLASS.compare.shut}
          </p>
        </>
      )}
      <button className="act" style={{ marginTop: 4 }} onClick={onClose}>
        閉 <span>{CLASS.compare.close}</span>
      </button>
    </div>
  );
}
