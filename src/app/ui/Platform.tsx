import { useMemo } from 'react';
import { plateOf } from '../../data/bestiary.ts';
import { realm as realmOf } from '../../data/realms.ts';
import { ART_BY_KEY, STANCE_BY_KEY } from '../../data/arts.ts';
import { kitFor } from '../../sim/crafts.ts';
import { duration, num } from '../../sim/format.ts';
import {
  PLATFORM_EDGE, PLATFORM_HOURS, TIERS, answered, beatenNow, challengeOdds, challengerOf, challengerPays,
  challengerPower, standingTier, temperOf, type Tier,
} from '../../sim/platform.ts';
import { stanceChoices } from '../../sim/arts.ts';
import { effectiveBeastPower } from '../../sim/combat.ts';
import { TEMPER_EDGE } from '../../sim/balance.ts';
import { weekLeft } from '../../sim/week.ts';
import type { State } from '../../sim/state.ts';
import { fightDeps } from '../memo.ts';
import { PLATFORM } from '../copy.ts';
import { Plate } from './Plate.tsx';
import { Term } from './Term.tsx';

const HAN = ['一', '二', '三'] as const;
const pct = (x: number) => `${Math.round(x * 100)}%`;

/**
 * 擂台 The Platform, on 塔 Trials: the week's three challengers, its temper, and the one
 * challenger standing now with what it pays.
 *
 * 量 The card quotes the odds as the cultivator stands and, when a held stance would
 * answer the week's temper and do better, in that stance too, with a button that stands
 * in it. That is the whole decision this system exists to make: the dice are set for the
 * week, so a loss is answered by changing something, and the card names the obvious
 * thing to change before the fight rather than after it.
 *
 * 失 And it says, every time it is drawn, that a loss costs nothing and that the dice are
 * set: "it said 54% and I lost, and again loses again" is the fixed dice working, and the
 * screen has to have said so first.
 */
export function Platform({ state, onChallenge, onStance }: {
  state: State;
  onChallenge: (tier: Tier) => void;
  onStance: (key: string) => void;
}) {
  const temper = temperOf(state);
  const down = beatenNow(state);
  const up = standingTier(state);
  // 算 The odds of the one standing: as the cultivator stands, and in the best held stance
  // that answers the temper, when that is better. Read with what is carried, as the fight is.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const read = useMemo(() => {
    if (up === null) return null;
    const shape = challengerOf(state, up);
    const kitOf = (x: State) => kitFor(x, shape, 'platform').kit;
    const now = challengeOdds(state, up, kitOf(state));
    const raw = challengeOdds(state, up, kitOf(state), true);
    let best: { key: string; odds: number } | null = null;
    if (!answered(state, temper)) {
      for (const st of stanceChoices(state.realm, state.layer)) {
        if (!temper.stances.includes(st.key)) continue;
        const body = { ...state, stance: st.key };
        const o = challengeOdds(body, up, kitOf(body));
        if (!best || o > best.odds) best = { key: st.key, odds: o };
      }
    }
    return { now, raw, best: best && best.odds > now ? best : null };
  }, [up, temper.key, state.trail, ...fightDeps(state)]);

  const answers = [
    ...temper.stances.map((k) => STANCE_BY_KEY[k]).filter(Boolean).map((x) => `${x.han} ${x.name}`),
    ...temper.arts.map((k) => ART_BY_KEY[k]).filter(Boolean).map((x) => `${x.han} ${x.name}`),
  ];
  const list = answers.length > 1 ? `${answers.slice(0, -1).join(', ')} or ${answers[answers.length - 1]}` : answers[0] ?? '';
  const left = duration(weekLeft(state));
  const best = read?.best ? STANCE_BY_KEY[read.best.key] : null;

  return (
    <div className="card platcard" data-coach="platform">
      <p className="faint plperiod">{up === null ? PLATFORM.allDown(left) : PLATFORM.period(left)}</p>

      <div className="pltemper" data-answered={answered(state, temper) || undefined}>
        <b className="cjk">{temper.han}</b>
        <p>
          <strong>{temper.name}</strong>{' '}
          {PLATFORM.temper(PLATFORM.temperSays[temper.key] ?? '', String(TEMPER_EDGE))}{' '}
          <span className="plans">{answered(state, temper) ? PLATFORM.youAnswer : PLATFORM.answeredBy(list)}</span>
        </p>
      </div>

      {TIERS.map((tier) => {
        const shape = challengerOf(state, tier);
        const beaten = tier < down;
        const standing = tier === up;
        const r = realmOf(shape.realm);
        const pays = challengerPays(state, tier);
        const brings = standing ? effectiveBeastPower(state, shape, challengerPower(state, tier)) : 0;
        const stanceOdds = standing && read ? (read.best ? read.best.odds : read.now) : 0;
        const tone = stanceOdds > 0.66 ? 'var(--jade)' : stanceOdds > 0.33 ? 'var(--gold)' : 'var(--cinnabar)';
        return (
          <div key={tier} className="plrow" data-state={beaten ? 'beaten' : standing ? 'standing' : 'waits'}>
            <Plate kind="beast" subject={plateOf(shape)} icon={shape.icon} colour={r.colour} size={46} alt={shape.name} />
            <span className="plwho">
              <b><span className="cjk">{HAN[tier]} {shape.han}</span> {shape.name}</b>
              <i>
                {PLATFORM.edge(String(PLATFORM_EDGE[tier]))}
                {beaten ? <> {'·'} {PLATFORM.beaten}</>
                  : standing ? <> {'·'} <Term han="力" /> {num(brings)}{best ? <> {PLATFORM.inStance(`${best.han} ${best.name}`)}</> : null}</>
                    : <> {'·'} {PLATFORM.waits}</>}
              </i>
              {!beaten && <em className="mono">{PLATFORM.pays(PLATFORM_HOURS[tier], num(pays))}</em>}
            </span>
            <span className="plodds mono">
              {beaten ? <><b className="pltick">{'✓'}</b><i>{PLATFORM.paid(PLATFORM_HOURS[tier])}</i></>
                : standing && read ? <>
                  <b style={{ color: tone }}>{read.raw > 0 || best ? pct(stanceOdds) : '—'}</b>
                  <i>{best ? PLATFORM.inStance(`${best.han} ${best.name}`) : read.raw > 0 ? PLATFORM.odds : PLATFORM.toReach}</i>
                  {best && <i className="plnow">{PLATFORM.asYouStand(pct(read.now))}</i>}
                </>
                  : <><b>{'—'}</b><i>{PLATFORM.waitsShort}</i></>}
            </span>
          </div>
        );
      })}

      {state.trail && up !== null && <p className="pltrail">{PLATFORM.trail}</p>}

      {up !== null && (
        <div className="placts">
          {best && (
            <button className="act ghost plstance" onClick={() => onStance(best.key)}>
              {best.han} <span>{PLATFORM.standIn(best.name)}</span>
            </button>
          )}
          <button className="act plgo" data-tone="cinnabar" onClick={() => onChallenge(up)}>
            擂 <span>{PLATFORM.challenge}</span>
          </button>
        </div>
      )}
      <p className="faint pllaw">{PLATFORM.law}</p>
    </div>
  );
}
