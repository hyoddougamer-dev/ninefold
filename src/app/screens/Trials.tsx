import { useMemo } from 'react';
import { LINES, PILL_LINES } from '../../data/alchemy.ts';
import { fightDeps } from '../memo.ts';
import { Emblem } from '../ui/Emblem.tsx';
import { plateOf } from '../../data/bestiary.ts';
import { realm as realmOf } from '../../data/realms.ts';
import { effectiveBeastPower, oddsRaw } from '../../sim/combat.ts';
import { power, type State } from '../../sim/state.ts';
import { duration, num } from '../../sim/format.ts';
import { FLOORS_PER_REALM, ODDS_CEILING, ODDS_FLOOR, TOWER_QI_HOURS } from '../../sim/balance.ts';
import { SEAL_LOOT, floorBeast, floorPower, seals } from '../../sim/tower.ts';
import { floorMaterial, floorQi, furnaceMenu, standingFloor, towerOpen } from '../../sim/trials.ts';
import { isOpen, opensAt } from '../../sim/unlocks.ts';
import { pillsTaken } from '../../sim/furnace.ts';
import { furnace, tower } from '../../art/trials.ts';
import { Plate } from '../ui/Plate.tsx';
import { Svg } from '../ui/Svg.tsx';
import { Term } from '../ui/Term.tsx';
import { CULTIVATE, HUNT, TRIALS, UNIT } from '../copy.ts';
import { useBuyMax } from '../prefs.ts';
import { brewMax } from '../../sim/trials.ts';

/**
 * 塔 and 爐: the two halves of what qi buys once a realm is full.
 *
 * They share a screen because they share a loop. The tower pays 材 material and nothing
 * else; the furnace eats 材 material and qi together and pays power. Neither of them
 * touches the qi rate, which is the rule the whole economy stands on, and the screen
 * says so at the bottom rather than leaving the player to work it out.
 */
export function Trials({ state, onFloor, onBrew }: {
  state: State;
  onFloor: (floor: number) => void;
  /** 爐 One pill, or with ×Max as many as can be paid for (the same ×1/Max as 修). */
  onBrew: (line: (typeof LINES)[number], max?: boolean) => void;
}) {
  const [many, pickMany] = useBuyMax();
  void towerOpen;
  const floor = standingFloor(state);
  const beast = floorBeast(floor);
  const standing = floorPower(floor);
  // What it brings once 破煞 and 破甲 are counted, which is the number the fight uses.
  const brings = effectiveBeastPower(state, beast, standing);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const raw = useMemo(() => oddsRaw(state, beast, standing), [floor, ...fightDeps(state)]);
  // 誠 Out of reach is not two per cent, here as on 狩 the hunt. The floor under the quoted
  // odds put "2% odds" on a floor whose beast stood 375,000 times stronger; a floor that
  // wins none of its sampled fights says how far off it is instead.
  const chance = Math.max(ODDS_FLOOR, Math.min(ODDS_CEILING, raw));
  const gap = brings / Math.max(1e-9, power(state));
  const tone = raw <= 0 ? 'var(--faint)'
    : chance > 0.66 ? 'var(--jade)' : chance > 0.33 ? 'var(--gold)' : 'var(--cinnabar)';
  const r = realmOf(Math.max(1, Math.min(9, Math.ceil(floor / FLOORS_PER_REALM))));
  const menu = furnaceMenu(state);
  const held = seals(state.tower);
  const lit = isOpen(state.realm, 'furnace');

  return (
    <>
      <div className="row">
        <span className="faint" style={{ fontSize: 12, letterSpacing: '.14em', textTransform: 'uppercase' }}>
          塔 Trials
        </span>
        <span className="mono" style={{ fontSize: 13, color: 'var(--gold)' }}><Term han="材" plain /> {num(state.materials)}</span>
      </div>
      <p className="faint" style={{ margin: '6px 0 0', fontSize: 13 }}>
        <Term han="力" /> {num(power(state))} power
      </p>

      <h2 className="heading">{TRIALS.towerHead}</h2>
      {/* 塔 The tower drawn as far up as it has been climbed: one tier to a 塔印 seal,
          so the silhouette is the progress and not an illustration beside it. */}
      {/* 並 On a wide screen the drawing and the floor stand side by side: stacked, the
          drawing alone filled the first screen of a 1366x768 laptop and the 登 Climb
          button was below the fold. On a phone this is a plain block and nothing moves. */}
      <div className="towerduo">
      <span className="place" data-tall="true">
        <Svg html={tower(state.tower)} />
      </span>
      <div className="card" style={{ borderColor: r.colour }}>
        <div className="row">
          <Plate kind="beast" subject={plateOf(beast)} icon={beast.icon} colour={r.colour}
            tier={floor % 9 === 0 ? 2 : 1} size={52} alt={beast.name} />
          <span style={{ flex: 1 }}>
            <b className="cjk" style={{ fontSize: 17, color: r.colour, display: 'block' }}>
              {TRIALS.floor(floor)}
            </b>
            <i className="faint" style={{ fontStyle: 'normal', fontSize: 12 }}>
              {beast.han} {beast.name}{' '}
              <span className="flpow"><span className="dot">· </span><Term han="力" /> {num(brings)}</span>
            </i>
          </span>
          <span className="tech mono" style={{ fontSize: 17, textAlign: 'right', color: tone }}>
            {raw > 0 ? `${Math.round(chance * 100)}%` : `×${gap < 10 ? gap.toFixed(1) : num(gap)}`}
            <em className="faint tag">{raw > 0 ? HUNT.odds : HUNT.toReach}</em>
          </span>
        </div>
        <div className="row" style={{ marginTop: 10, fontSize: 12.5 }}>
          <span className="faint">{TRIALS.best(state.tower)}</span>
          <span className="mono" style={{ color: 'var(--gold)' }}>
            {TRIALS.pays(
              num(floorMaterial(state, floor)),
              num(floorQi(state, floor)),
            )}
          </span>
        </div>
        <p className="faint" style={{ margin: '6px 0 0', fontSize: 12.5 }}>
          {TRIALS.hours(duration(TOWER_QI_HOURS * 3600))}
        </p>
        <p className="faint" style={{ margin: '8px 0 12px', fontSize: 12.5 }}>{TRIALS.tower}</p>
        <button className="act" data-tone="cinnabar" onClick={() => onFloor(floor)}>
          登 <span>{TRIALS.climb}</span>
        </button>
      </div>
      </div>

      <div className="row" style={{ marginTop: 10, fontSize: 12.5 }}>
        <span className="faint">{TRIALS.sealWorth(`${Math.round(SEAL_LOOT * 100)}%`)}</span>
        <span className="mono" style={{ color: 'var(--gold)', whiteSpace: 'nowrap', flex: 'none' }}>{TRIALS.seals(held)}</span>
      </div>

      {/* 盡 The same ×1 or Max as 修 the upgrades, remembered with it: one choice, two places. */}
      <div className="spendrow furnacerow">
        <h2 className="heading">{TRIALS.furnaceHead}</h2>
        {lit && (
          <div className="buymode" role="group" aria-label={CULTIVATE.buyMode}>
            <button data-on={!many} onClick={() => pickMany(false)}>{CULTIVATE.buyOne}</button>
            <button data-on={many} onClick={() => pickMany(true)}>{CULTIVATE.buyMax}</button>
          </div>
        )}
      </div>
      {!lit && (
        <p className="faint" style={{ margin: '0 0 8px', fontSize: 12.5 }}>
          {TRIALS.furnaceShut(realmOf(opensAt('furnace')).han, realmOf(opensAt('furnace')).name)}
        </p>
      )}
      {lit && (
        <>
          {/* 爐 The fire reads what has been brewed, so a furnace lit an hour ago is a
              candle and one that has taken four hundred pills is a forge. */}
          <span className="place" data-tall="false">
            <Svg html={furnace(state.realm, pillsTaken(state.brewed))} />
          </span>
          <div className="row" style={{ marginBottom: 8 }}>
            <span className="faint" style={{ fontSize: 12.5 }}>{TRIALS.furnace}</span>
          </div>
        </>
      )}

      {lit && <div className="stack">
        {menu.map(({ line, pill, cost, held: taken, affordable }) => {
          const info = PILL_LINES[line];
          const short = state.materials < cost.materials;
          // 缺 The qi half was never marked. At the summit every pill sat greyed out
          // with both prices in the same gold, and nothing said which one was missing.
          const shortQi = state.qi < cost.qi;
          // 盡 In Max mode the pill shows what one tap will brew, and for how much.
          const lot = many && affordable ? brewMax(state, line) : null;
          const lotQi = lot && lot.n > 1 ? lot.qi : cost.qi;
          const lotMat = lot && lot.n > 1 ? lot.materials : cost.materials;
          return (
            <button key={line} className="pill" disabled={!affordable} onClick={() => onBrew(line, many)}>
              <span className="ic"><Emblem family="pill" subject={line} icon={info.icon} size={24} alt={info.name} /></span>
              <span className="pname">
                <b className="cjk">{pill.han}</b>
                <i>{pill.name}</i>
                <em>{info.effect} · {TRIALS.held(taken)}</em>
              </span>
              <span className="price">
                {lot && lot.n > 1 && <i className="lot">{CULTIVATE.lot(lot.n)}</i>}
                <b style={shortQi ? { color: 'var(--cinnabar)' } : undefined}>{num(lotQi)}</b>
                <i className="faint tag">qi</i>
                <b style={{ color: short ? 'var(--cinnabar)' : 'var(--gold)' }}>{num(lotMat)}</b>
                <i className="faint tag">材 {UNIT.material}</i>
              </span>
            </button>
          );
        })}
      </div>}

      {lit && menu.some((m) => state.materials < m.cost.materials) && (
        <p className="faint" style={{ margin: '10px 0 0', fontSize: 12.5 }}>{TRIALS.needMaterial}</p>
      )}
      {lit && menu.some((m) => state.qi < m.cost.qi) && (
        <p className="faint" style={{ margin: '10px 0 0', fontSize: 12.5 }}>{TRIALS.needQi}</p>
      )}

      {lit && (
        <p className="faint" style={{ margin: '14px 0 0', fontSize: 12 }}>
          {pillsTaken(state.brewed) > 0 && <>{TRIALS.held(pillsTaken(state.brewed))} in all. </>}
          {TRIALS.rule}
        </p>
      )}
    </>
  );
}
