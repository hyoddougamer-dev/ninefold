import { useState } from 'react';
import { plateOf } from '../../data/bestiary.ts';
import { Plate } from './Plate.tsx';
import type { Beast } from '../../data/bestiary.ts';
import { realm as realmOf } from '../../data/realms.ts';
import { DRIVE_SIZES, canAffordDrive, drive, driveCost, driveMax, type Drive as Result } from '../../sim/hunt.ts';
import { DRIVE_MOST } from '../../sim/balance.ts';
import { lootFrom } from '../../sim/combat.ts';
import { lootTaken } from '../../sim/trials.ts';
import { MARK_INFO } from '../../sim/record.ts';
import { duration, num } from '../../sim/format.ts';
import { RARITY_INFO, SLOT_INFO, templateOf } from '../../data/gear.ts';
import { gearTile } from '../../art/gear.ts';
import { icon } from '../../art/icon.ts';
import { Svg } from './Svg.tsx';
import { rate, type State } from '../../sim/state.ts';
import { DRIVE, HUNT, QOL } from '../copy.ts';

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
  /** 再 The size of the last drive, so Drive again repeats it ('max' is worked out again). */
  const [last, setLast] = useState<number | 'max'>(10);
  const r = realmOf(beast.realm);
  const per = lootTaken(state, lootFrom(state, beast));
  // 盡 The last row: as many as the qi in hand pays for, up to DRIVE_MOST.
  const most = driveMax(state, beast);
  const go = (size: number | 'max') => {
    const n = size === 'max' ? driveMax(state, beast) : size;
    if (n <= 0 || !canAffordDrive(state, beast, n)) return;
    const result = drive(state, beast, n, seed);
    setLast(size);
    setDone(result);
    onTake(result);
  };
  const againN = last === 'max' ? most : last;

  if (done) {
    return (
      <div className="drivesheet">
        <div className="head">
          <Plate kind="beast" subject={plateOf(beast)} icon={beast.icon} colour={r.colour}
            tier={2} size={46} alt={beast.name} />
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
              <i>{QOL.slotted(templateOf(done.best).name, SLOT_INFO[templateOf(done.best).slot].name)} · {DRIVE.bestOf(done.dropsRolled)}</i>
            </span>
          </div>
        )}

        {/* 再 The same drive again, at today's price, without walking back through the sizes. */}
        <div className="driveagain">
          <button className="act" data-qol="drive-again" disabled={againN <= 0 || !canAffordDrive(state, beast, againN)}
            onClick={() => go(last)}>
            再 <span>{QOL.drive.again}</span>
          </button>
          {againN > 0 && <p className="faint">{QOL.drive.againSays(againN, num(driveCost(state, againN, beast)))}</p>}
          <button className="act ghost" onClick={onClose}>續 <span>{DRIVE.back}</span></button>
        </div>
      </div>
    );
  }

  return (
    <div className="drivesheet">
      <div className="head">
        <Plate kind="beast" subject={plateOf(beast)} icon={beast.icon} colour={r.colour}
          tier={2} size={46} alt={beast.name} />
        <span>
          <b className="cjk" style={{ color: r.colour }}>{beast.han}</b>
          <i>{beast.name} · {DRIVE.pays(num(per))}</i>
        </span>
      </div>
      <p className="faint blurb">{DRIVE.what}</p>
      <p className="faint blurb">{beast.realm < state.realm ? DRIVE.priceOld : DRIVE.price}</p>

      <div className="sizes">
        {DRIVE_SIZES.map((n) => {
          const cost = driveCost(state, n, beast);
          const can = canAffordDrive(state, beast, n);
          return (
            <button key={n} className="size" disabled={!can}
              onClick={() => go(n)}>
              <span className="n mono">{n}</span>
              <span className="what">
                <b>{DRIVE.kills(n)}</b>
                <i>{DRIVE.willPay(num(per * n))}</i>
              </span>
              <span className="price mono">
                {num(cost)}<em>{DRIVE.cost(duration(cost / rate(state)))}</em>
              </span>
            </button>
          );
        })}
        {/* 盡 As many as the qi in hand pays for. The price per kill is the same as above. */}
        <button className="size most" data-qol="drive-most" disabled={most <= 0} onClick={() => go('max')}>
          <span className="n mono">{most > 0 ? most : '0'}</span>
          <span className="what">
            <b>{QOL.drive.most}</b>
            <i>{most > 0 ? DRIVE.willPay(num(per * most)) : QOL.drive.mostCap(DRIVE_MOST)}</i>
          </span>
          <span className="price mono">
            {num(most > 0 ? driveCost(state, most, beast) : 0)}<em>{DRIVE.cost(duration((most > 0 ? driveCost(state, most, beast) : 0) / rate(state)))}</em>
          </span>
        </button>
      </div>

      <p className="faint blurb">{DRIVE.free}</p>
      <button className="act ghost" onClick={onClose}>退 <span>{DRIVE.never}</span></button>
    </div>
  );
}

/** The little 圍 button that opens it, on a beast's row. */
export function DriveTag({ onOpen }: { onOpen: () => void }) {
  return (
    <span className="drivetag" role="button" tabIndex={0} aria-label={`圍 ${HUNT.driveTag}`}
      onClick={(e) => { e.stopPropagation(); onOpen(); }}
      onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); onOpen(); } }}>
      <Svg html={icon('barbed-spear', 15)} />
      {/* 譯 An icon and nothing else was the one button on 狩 that did not say what it
          was. It is the second thing a row can do, so the word is small. */}
      <i>{HUNT.driveTag}</i>
    </span>
  );
}
