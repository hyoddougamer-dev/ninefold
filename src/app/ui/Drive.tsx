import { useState } from 'react';
import type { Beast } from '../../data/bestiary.ts';
import { realm as realmOf } from '../../data/realms.ts';
import { DRIVE_SIZES, canAffordDrive, drive, driveCost, type Drive as Result } from '../../sim/hunt.ts';
import { lootFrom } from '../../sim/combat.ts';
import { lootTaken } from '../../sim/trials.ts';
import { MARK_INFO } from '../../sim/record.ts';
import { num } from '../../sim/format.ts';
import { RARITY_INFO, templateOf } from '../../data/gear.ts';
import { gearTile } from '../../art/gear.ts';
import { seal } from '../../art/aura.ts';
import { icon } from '../../art/icon.ts';
import { Svg } from './Svg.tsx';
import type { State } from '../../sim/state.ts';
import { DRIVE } from '../copy.ts';

/**
 * 圍 The drive, on the screen.
 *
 * Two faces of one sheet. Before: three sizes with their price in qi and what they will
 * pay in 材, so the choice is made with the numbers in view. After: what actually
 * happened, which is the same shape as the arena's verdict because it is the same kind
 * of moment: the kills are done and this is what they left.
 *
 * The prices are not hidden behind a confirmation. A drive costs qi and cannot be
 * undone, so the button that spends it is the button that says the number.
 */
export function Drive({ state, beast, seed, onTake, onClose }: {
  state: State;
  beast: Beast;
  /** The app's seed, so the drops are the drops those fights would have rolled. */
  seed: number;
  onTake: (result: Result) => void;
  onClose: () => void;
}) {
  const [done, setDone] = useState<Result | null>(null);
  const r = realmOf(beast.realm);
  const per = lootTaken(state, lootFrom(state, beast));

  if (done) {
    return (
      <div className="drivesheet">
        <div className="head">
          <span className="seal"><Svg html={seal(beast.icon, r.colour, true)} /></span>
          <span>
            <b className="cjk" style={{ color: r.colour }}>{beast.han}</b>
            <i>{DRIVE.took(done.kills)}</i>
          </span>
        </div>

        <div className="tally">
          <span><b className="mono" style={{ color: 'var(--gold)' }}>{num(done.material)}</b><i>材 taken</i></span>
          <span><b className="mono">{num(done.qiSpent)}</b><i>qi spent</i></span>
          <span><b className="mono">{done.dropsRolled}</b><i>{DRIVE.fell}</i></span>
        </div>

        {done.earned.map((m) => (
          <p key={m} className="mark">
            <b className="cjk">{MARK_INFO[m].han}</b>
            <span>
              <em>{MARK_INFO[m].name}</em>
              <i>{DRIVE.earned(beast.han, MARK_INFO[m].pays)}</i>
            </span>
          </p>
        ))}

        {done.best && (
          <div className="spoil">
            <Svg html={gearTile(done.best, { size: 58 })} />
            <span>
              <b className="cjk" style={{ color: RARITY_INFO[done.best.rarity].colour }}>
                {templateOf(done.best).han}
              </b>
              <i>{templateOf(done.best).name} · {DRIVE.bestOf(done.dropsRolled)}</i>
            </span>
          </div>
        )}

        <button className="act" onClick={onClose}>續 <span>{DRIVE.back}</span></button>
      </div>
    );
  }

  return (
    <div className="drivesheet">
      <div className="head">
        <span className="seal"><Svg html={seal(beast.icon, r.colour, true)} /></span>
        <span>
          <b className="cjk" style={{ color: r.colour }}>{beast.han}</b>
          <i>{beast.name} · {DRIVE.pays(num(per))}</i>
        </span>
      </div>
      <p className="faint blurb">{DRIVE.what}</p>

      <div className="sizes">
        {DRIVE_SIZES.map((n) => {
          const cost = driveCost(state, n);
          const can = canAffordDrive(state, beast, n);
          return (
            <button key={n} className="size" disabled={!can}
              onClick={() => {
                const result = drive(state, beast, n, seed);
                setDone(result);
                onTake(result);
              }}>
              <span className="n mono">{n}</span>
              <span className="what">
                <b>{DRIVE.kills(n)}</b>
                <i>{DRIVE.willPay(num(per * n))}</i>
              </span>
              <span className="price mono">
                {num(cost)}<em>qi</em>
              </span>
            </button>
          );
        })}
      </div>

      <p className="faint blurb">{DRIVE.free}</p>
      <button className="act ghost" onClick={onClose}>退 <span>{DRIVE.never}</span></button>
    </div>
  );
}

/** The little 圍 button that opens it, on a beast's row. */
export function DriveTag({ onOpen }: { onOpen: () => void }) {
  return (
    <span className="drivetag" role="button" tabIndex={0}
      onClick={(e) => { e.stopPropagation(); onOpen(); }}
      onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); onOpen(); } }}>
      <Svg html={icon('barbed-spear', 15)} />
    </span>
  );
}
