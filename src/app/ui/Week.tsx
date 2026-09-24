import { quarryOf, quarryOwed, weekLeft } from '../../sim/week.ts';
import { quarryBounty, lootFrom } from '../../sim/combat.ts';
import { lootTaken } from '../../sim/trials.ts';
import { realm as realmOf } from '../../data/realms.ts';
import { plateOf } from '../../data/bestiary.ts';
import { duration, num } from '../../sim/format.ts';
import { WEEK } from '../copy.ts';
import { Plate } from './Plate.tsx';
import { Term } from './Term.tsx';
import type { State } from '../../sim/state.ts';

/**
 * 期 The week's marks, drawn.
 *
 * The rotation itself is in sim/week.ts and is three pure functions. This is the two
 * shapes it is ever drawn as: a band at the top of 狩 the hunt naming the quarry, and a
 * chip that says *this is the one* wherever a list already holds the thing the week is
 * pointing at.
 *
 * 類 The chip is deliberately the same object on three screens, the way `.beast` is the
 * same row on two. It is the same claim in all three places (this one, this week, and
 * the week runs out) and a player who has learnt it on 狩 should not have to learn it
 * again in 洞天. Restyle `.wtag` and look at the hunt, the cave and the vault.
 */
export function WeekTag({ left }: { left?: number }) {
  return (
    <span className="wtag">
      <b className="cjk">{WEEK.tag}</b>
      {left !== undefined && <i className="mono">{WEEK.tagLeft(duration(left))}</i>}
    </span>
  );
}

/**
 * 本週之獸 The band at the top of the hunt.
 *
 * It is a button and it fights the beast, because the whole point of a mark on a
 * calendar is that the thing it points at is one tap away. A week whose quarry the
 * cultivator has to go and find in a list of twenty-five rows is a week most players
 * will not spend.
 */
export function QuarryBand({ state, onFight }: {
  state: State; onFight: (key: string) => void;
}) {
  const q = quarryOf(state);
  if (!q) return null;
  const r = realmOf(q.realm);
  const owed = quarryOwed(state);
  return (
    <button className="weekband" onClick={() => onFight(q.key)} style={{ ['--hue' as string]: r.colour }}>
      {/* 牌 The painting, at the size 狩 the hunt list below it uses, so the band reads
          as the top of that list rather than as a different kind of thing. */}
      <Plate kind="beast" subject={plateOf(q)} icon={q.icon} colour={r.colour}
        tier={1} size={46} alt={q.name} />
      <span className="wsay">
        <b>{WEEK.quarryHead}</b>
        <i>{WEEK.quarry(`${q.han} ${q.name}`)}</i>
        {/* 窄 What it pays, and how long is left, on one line under the sentence rather
            than in the chip on the right. At 320 the chip's countdown took ninety pixels
            off a row that already carries a painting, and the band ran to six lines. */}
        <u className="mono">
          <Term han="材" plain /> {num(lootTaken(state, lootFrom(state, q)))}
          {owed ? ` · ${WEEK.bounty(num(quarryBounty(q)))}` : ` · ${WEEK.bountyTaken}`}
          {` · ${WEEK.left(duration(weekLeft(state)))}`}
        </u>
      </span>
    </button>
  );
}
