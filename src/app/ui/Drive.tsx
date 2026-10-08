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
import { icon } from '../../art/icon.ts';
import { Svg } from './Svg.tsx';
import { rate, type State } from '../../sim/state.ts';
import { DRIVE, HUNT, PILE, QOL } from '../copy.ts';
import { DrivePile } from './DrivePile.tsx';
import { RealmTag } from './RealmTag.tsx';
import { settleDefault, type Choice, type Plan } from '../../sim/pile.ts';

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
export function Drive({ state, beast, seed, onTake, onSettle, onGame, onClose }: {
  state: State;
  beast: Beast;
  /** The app's seed, so the drops are the drops those fights would have rolled. */
  seed: number;
  /** The drive happened: the app takes its state and puts what fell on the table (sim/pile.ts holdDrops). */
  onTake: (result: Result) => void;
  /** 圍 The player's answer to what fell: keep these, melt the rest. */
  onSettle: (choice: Choice) => void;
  /** 圍 Or the game's own answer, which is what a drive always did. */
  onGame: () => void;
  onClose: () => void;
}) {
  const [done, setDone] = useState<Result | null>(null);
  /** 圍 What the player answered, once they have, for the line that replaces the window. */
  const [answered, setAnswered] = useState<{ plan: Plan | null } | null>(null);
  /** 再 The size of the last drive, so Drive again repeats it ('max' is worked out again). */
  const [last, setLast] = useState<number | 'max'>(10);
  const r = realmOf(beast.realm);
  const per = lootTaken(state, lootFrom(state, beast));
  // 盡 The last row: as many as the qi in hand pays for, up to DRIVE_MOST.
  const most = driveMax(state, beast);
  const go = (size: number | 'max') => {
    // 圍 Pieces still waiting from an earlier drive are answered the game's way first.
    const base = settleDefault(state);
    const n = size === 'max' ? driveMax(base, beast) : size;
    if (n <= 0 || !canAffordDrive(base, beast, n)) return;
    const result = drive(base, beast, n, seed);
    setLast(size);
    setDone(result);
    setAnswered(null);
    onTake(result);
  };
  // 圍 The window is open while the save holds pieces nobody has answered for.
  const waiting = state.pile.length > 0;
  const againN = last === 'max' ? most : last;

  if (done) {
    return (
      <div className="drivesheet">
        <div className="head">
          <Plate kind="beast" subject={plateOf(beast)} icon={beast.icon} colour={r.colour}
            tier={2} size={46} alt={beast.name} />
          <span>
            <b className="cjk" style={{ color: r.colour }}>{beast.han}<RealmTag realm={beast.realm} /></b>
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

        {/* 圍 Everything that fell, with the choice of what to keep. The best piece is marked to start
            with: it is what the game would have kept. */}
        {waiting && (
          <DrivePile state={state}
            onAnswer={(choice, p) => { setAnswered({ plan: p }); onSettle(choice); }}
            onGame={() => { setAnswered({ plan: null }); onGame(); }} />
        )}
        {!waiting && answered && (
          <p className="mark pileline">
            <b className="cjk">圍</b>
            <span>
              <em>{answered.plan ? PILE.answered(answered.plan.kept.length, answered.plan.melted.length + answered.plan.bag.length) : PILE.decided}</em>
              {answered.plan && (answered.plan.qi > 0 || answered.plan.materials > 0) && (
                <i>{PILE.melts(answered.plan.melted.length + answered.plan.bag.length,
                  answered.plan.qi > 0 ? num(answered.plan.qi) : '', answered.plan.materials > 0 ? num(answered.plan.materials) : '')}</i>
              )}
            </span>
          </p>
        )}

        {/* 再 The same drive again, at today's price, without walking back through the sizes. */}
        <div className="driveagain">
          <button className="act" data-qol="drive-again"
            disabled={waiting || againN <= 0 || !canAffordDrive(settleDefault(state), beast, againN)}
            onClick={() => go(last)}>
            再 <span>{QOL.drive.again}</span>
          </button>
          {againN > 0 && <p className="faint">{waiting ? PILE.drivePending : QOL.drive.againSays(againN, num(driveCost(state, againN, beast)))}</p>}
          <button className="act ghost" data-qol="drive-back" onClick={onClose}>續 <span>{waiting ? PILE.later : DRIVE.back}</span></button>
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
          <b className="cjk" style={{ color: r.colour }}>{beast.han}<RealmTag realm={beast.realm} /></b>
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

/**
 * 圍 The same window on its own, for pieces that are still waiting when the drive's sheet is
 * not open: the game was shut when the drive ended, or the sheet was put away. The pieces are
 * in the save, so this needs nothing but the save.
 */
export function PileSheet({ state, onSettle, onGame, onClose }: {
  state: State;
  onSettle: (choice: Choice) => void;
  onGame: () => void;
  onClose: () => void;
}) {
  return (
    <div className="drivesheet" data-qol="pile-sheet">
      <div className="head">
        <b className="cjk" style={{ fontSize: 30, color: 'var(--gold)' }}>圍</b>
        <span>
          <b>{PILE.head(state.pile.length)}</b>
          <i>{PILE.waitingSays}</i>
        </span>
      </div>
      <DrivePile state={state} onAnswer={(choice) => onSettle(choice)} onGame={onGame} onLater={onClose} />
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
