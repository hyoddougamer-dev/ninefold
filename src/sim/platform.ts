import {
  PLATFORM_EDGE, PLATFORM_HOURS, PLATFORM_REALM, TEMPER_EDGE, TRAIL_WOUND,
} from './balance.ts';
import { commonsOf, type Beast } from '../data/bestiary.ts';
import { TEMPERS, type Temper } from '../data/platform.ts';
import { power, type State } from './state.ts';
import { periodOf, weekOf } from './week.ts';
import { fight, odds, oddsRaw, type Outcome } from './combat.ts';
import { NO_KIT, type Kit } from './kit.ts';
import { sequenceOf, stanceChoices, stanceOf } from './arts.ts';
import { towerRate } from './trials.ts';

/**
 * 擂台 The Platform: three challengers a period, by hand.
 *
 * The tower is where 力 power pays qi. What the testers asked for was a fight where the
 * build matters and Auto cannot help: 心魔 the heart demon is that kind of fight, but it
 * pays 道 and only nine times in a life. The Platform is that kind of fight paying qi,
 * every week, capped.
 *
 * 律 The rules it keeps:
 *
 *   量 Each challenger is measured against the cultivator, at PLATFORM_EDGE of their own
 *     力, so power alone never moves the odds. It is thinned like any beast (破甲 sunder,
 *     破煞 bane, the tree's weakness, the classes), and the week's temper stands it
 *     TEMPER_EDGE higher unless a stance or an art answers it. The build is what wins.
 *   定 The dice are set for the period: one seed per period and challenger, so the same
 *     body meets the same fight. Losing costs nothing, and pressing again with nothing
 *     changed loses again, so the way past a loss is to change something.
 *   一 Each pays once a period, PLATFORM_HOURS of gathering with nothing worn (the
 *     tower's towerRate, so the card can say it before the fight and clothes cannot
 *     move it). No 材, no drop, no mark on 錄 the record: a challenger is not a hunt.
 *   手 Never on the hunt list, never Known, never driven, never on Auto.
 *
 * Pure, like everything in sim/: the save holds the period and the count, and everything
 * else is derived from them and `at`.
 */

export { PLATFORM_EDGE, PLATFORM_HOURS, PLATFORM_REALM, TEMPER_EDGE, TRAIL_WOUND };

/** The three challengers of a period, by position. */
export type Tier = 0 | 1 | 2;
export const TIERS: readonly Tier[] = [0, 1, 2];

function hash(n: number): number {
  let x = (n ^ 0x5bd1e995) >>> 0;
  x = Math.imul(x ^ (x >>> 16), 0x85ebca6b) >>> 0;
  x = Math.imul(x ^ (x >>> 13), 0xc2b2ae35) >>> 0;
  return (x ^ (x >>> 16)) >>> 0;
}

export function platformOpen(s: State): boolean {
  return s.realm >= PLATFORM_REALM;
}

/** 期 The period this instant and realm fall in: a week, and a new one at a breakthrough. */
export function periodNow(s: State): number {
  return periodOf(s.at, s.realm);
}

/** How many of this period's challengers have fallen. A period that has turned reads none. */
export function beatenNow(s: State): number {
  const p = s.platform ?? { period: -1, beaten: 0 };
  return p.period === periodNow(s) ? Math.max(0, Math.min(PLATFORM_EDGE.length, p.beaten)) : 0;
}

/** The challenger standing now, or null when all three are down this period. */
export function standingTier(s: State): Tier | null {
  if (!platformOpen(s)) return null;
  const n = beatenNow(s);
  return n < PLATFORM_EDGE.length ? (n as Tier) : null;
}

/** 性 The period's temper: one of four, drawn by the week, so everybody meets the same one. */
export function temperOf(s: State): Temper {
  return TEMPERS[hash(weekOf(s.at) * 7919 + 11) % TEMPERS.length];
}

/** Whether this body's stance or sequence answers the temper. */
export function answered(body: State, t: Temper = temperOf(body)): boolean {
  const stance = stanceOf(body);
  if (stance && t.stances.includes(stance.key)) return true;
  return sequenceOf(body).some((a) => !!a && t.arts.includes(a.key));
}

/** 答 What answers the temper in this body, the stance first, as the screen names it; or null. */
export function answerOf(body: State, t: Temper = temperOf(body)): { readonly han: string; readonly name: string } | null {
  const stance = stanceOf(body);
  if (stance && t.stances.includes(stance.key)) return stance;
  return sequenceOf(body).find((a) => !!a && t.arts.includes(a.key)) ?? null;
}

/** 守 The first stance this cultivator holds that answers the temper, if any. */
export function answerHeld(s: State, t: Temper = temperOf(s)): string | null {
  return stanceChoices(s.realm, s.layer).find((x) => t.stances.includes(x.key))?.key ?? null;
}

/**
 * 形 The shape a challenger wears: the first and second commons of the cultivator's realm,
 * and the third from the realm above (the summit has none above it, so its own last).
 */
export function challengerOf(s: State, tier: Tier): Beast {
  const realm = Math.max(1, Math.min(9, s.realm));
  const pool = tier === 2 ? commonsOf(Math.min(9, realm + 1)) : commonsOf(realm);
  const at = tier === 2 ? (realm >= 9 ? pool.length - 1 : 0) : tier;
  const shape = pool[Math.min(at, pool.length - 1)];
  return { ...shape, challenger: tier };
}

/** 量 What a challenger stands at against this body, before 破甲 and the rest thin it. */
export function challengerPower(body: State, tier: Tier, temper: Temper = temperOf(body)): number {
  return power(body) * PLATFORM_EDGE[tier] * (answered(body, temper) ? 1 : TEMPER_EDGE);
}

/** 定 The period's dice for one challenger. The same body meets the same fight all period. */
export function challengerSeed(s: State, tier: Tier): number {
  return hash((s.startedAt >>> 0) ^ Math.imul(periodNow(s), 2654435761) ^ (tier * 40503 + 17));
}

/** 跡 The kit a challenger is fought with: what is carried, and the trail if one was taken. */
export function challengerKit(s: State, kit: Kit = NO_KIT): Kit {
  return s.trail ? { ...kit, wound: TRAIL_WOUND } : kit;
}

/** 吸 What a challenger pays when it falls: hours of gathering with nothing worn. */
export function challengerPays(s: State, tier: Tier): number {
  return PLATFORM_HOURS[tier] * 3600 * towerRate(s);
}

/** 戰 The fight itself, on the period's dice. The arena plays this back; the harness reads it. */
export function challengeFight(s: State, tier: Tier, kit: Kit = NO_KIT): Outcome {
  return fight(s, challengerOf(s, tier), challengerSeed(s, tier), challengerPower(s, tier), challengerKit(s, kit));
}

/** 算 The odds the card quotes, read off the same fight on spread seeds. */
export function challengeOdds(s: State, tier: Tier, kit: Kit = NO_KIT, raw = false): number {
  const read = raw ? oddsRaw : odds;
  return read(s, challengerOf(s, tier), challengerPower(s, tier), challengerKit(s, kit));
}

/**
 * 勝 A challenger beaten: its hours paid, the period's count moved on, the trail spent.
 * Only the challenger standing can be beaten, and only once: anything else is refused.
 * A loss calls nothing, because a loss costs nothing.
 */
export function beatChallenger(s: State, tier: Tier): State {
  if (standingTier(s) !== tier) return s;
  return {
    ...s,
    qi: s.qi + challengerPays(s, tier),
    platform: { period: periodNow(s), beaten: tier + 1 },
    bouts: (s.bouts ?? 0) + 1,
    trail: false,
  };
}
