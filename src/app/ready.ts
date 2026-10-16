import { currentWarden, odds } from '../sim/combat.ts';
import { canBreakThrough, canCross, canFightWarden, wardenStands, type State } from '../sim/state.ts';
import { ripeCount } from '../sim/cave.ts';
import { demonDue } from '../sim/seclusion.ts';
import { canEnter as canEnterSecret, inside as insideSecret } from '../sim/secret.ts';
import { meetingDue } from '../sim/meet.ts';
import { cardDue } from '../sim/awaken.ts';
import { spendablePoints } from '../sim/points.ts';
import { blocked, held, kitFor, needsOf, workshopOpen } from '../sim/crafts.ts';
import { quarryOf, quarryOwed, weekLeft } from '../sim/week.ts';
import { standingFloor, towerOpen } from '../sim/trials.ts';
import { floorBeast, floorPower } from '../sim/tower.ts';
import { limitFor } from '../sim/stash.ts';
import { marksUp } from '../sim/inspect.ts';
import { isOpen } from '../sim/unlocks.ts';
import { MELT_CAP } from '../sim/balance.ts';
import { FORGED, ITEM_BY_KEY, RECIPE_BY_KEY } from '../data/crafts.ts';
import { BEASTS } from '../data/bestiary.ts';
import { duration } from '../sim/format.ts';
import { READY } from './copy.ts';
import { WARDEN_EVEN } from './guide.ts';

/**
 * 待 What is waiting for the player, right now.
 *
 * Two audits played the game from the second realm to the top and counted the taps of
 * a check-in: thirty to fifty, most of them spent *finding* what was ready rather than
 * taking it. Three ripe beds every visit, an open vault door every visit, a workshop
 * that had waited all night for ore, and 歸 the return card mentioned none of them.
 *
 * This is the one list of those things. It is **derived, never stored**: everything
 * here is read off the save as it stands, so it cannot go stale, cannot be lost by a
 * reload, and costs a save nothing. The return card shows it, 修 shows it as a strip,
 * and the tab bar wears a dot for each tab that has something on it.
 *
 * 誠 Nothing on it is a loss. Every row is something to *take*, never something that
 * went wrong while the player was away, because nothing ever does.
 */

/** The six screens, by the key the tab bar knows them by. */
export type Place = 'cultivate' | 'hunt' | 'trials' | 'gear' | 'crafts' | 'dao';

export type WaitKey =
  | 'card' | 'breakthrough' | 'cross' | 'warden' | 'demon' | 'road' | 'beds' | 'vault' | 'points'
  | 'workshop' | 'quarry' | 'floor' | 'upgrades' | 'chestFull' | 'melt';

export interface Waiting {
  readonly key: WaitKey;
  /** The character the row wears. Its English is always in `short` and `long`. */
  readonly han: string;
  /** The tab it is taken on. */
  readonly tab: Place;
  /** A few words, for the strip on 修. */
  readonly short: string;
  /** The sentence, for the return card and the tab's own label. */
  readonly long: string;
}

/**
 * 算 The parts that need a fight read or every chest piece tried on.
 *
 * They are split out so the app can work them out once per change rather than five times
 * a second: the clock moves the qi on every tick and that changes none of them.
 */
export interface Heavy {
  /** ▲ Chest pieces that would be an upgrade, by the same measure the chest marks. */
  readonly ups: number;
  /** 塔 The odds on the next floor of the tower, or 0 before it opens. */
  readonly floor: number;
  /** 期 The odds on the week's quarry, or 0 when there is none. */
  readonly quarry: number;
  /**
   * 妖 The odds on the realm's warden with what is carried, as its card quotes them, or 0 while
   * no warden stands (and in the ninth realm, where 渡劫 the crossing has its own row). Read
   * whether or not the gate is sealed: the seal opens with the clock, and the row comes up the
   * moment it does without the fight being read again.
   */
  readonly warden: number;
}

/** 塔 The floor odds above which the next floor is a thing to do, not a gamble. The advice line's own. */
export const FLOOR_READY = 0.65;
/** 期 Below this the quarry is not offered: a row pointing at a fight the reader loses is worse than none. */
export const QUARRY_READY = 0.35;

export function heavyOf(s: State): Heavy {
  const ups = isOpen(s.realm, 'gear')
    ? s.chest.filter((item) => marksUp(s, item)).length
    : 0;
  const floor = towerOpen(s)
    ? odds(s, floorBeast(standingFloor(s)), floorPower(standingFloor(s))) : 0;
  const q = quarryOf(s);
  return { ups, floor, quarry: q ? odds(s, q) : 0, warden: wardenOdds(s) };
}

/** 妖 The warden's odds, the card's own reading: with the kit it would carry in. See Heavy.warden. */
export function wardenOdds(s: State): number {
  if (s.realm >= 9 || s.wardenFell || !wardenStands(s)) return 0;
  const w = currentWarden(s);
  return odds(s, w, undefined, kitFor(s, w, 'warden').kit);
}

/** 業 What the workshop is waiting on, or null when it is working (or not open). */
export function workshopWait(s: State): 'idle' | 'needs' | 'chest' | 'remains' | null {
  if (!workshopOpen(s)) return null;
  const r = s.crafts.task ? RECIPE_BY_KEY[s.crafts.task] : undefined;
  if (!r) return 'idle';
  const b = blocked(s, r);
  return b === 'needs' || b === 'chest' || b === 'remains' ? b : b === null ? null : 'idle';
}

/** 業 The name of the first thing a task is waiting for, in English. */
export function missingName(key: string): string {
  if (key === 'mat') return READY.material;
  const it = ITEM_BY_KEY[key.split('@')[0]];
  return it ? it.name : key;
}

export function ready(s: State, heavy: Heavy = heavyOf(s)): readonly Waiting[] {
  const out: Waiting[] = [];
  const add = (key: WaitKey, han: string, tab: Place, short: string, long: string) =>
    out.push({ key, han, tab, short, long });

  // 悟道 A card owed is the one thing that waits for nothing else.
  if (cardDue(s)) add('card', '悟道', 'cultivate', READY.card.short, READY.card.long);
  if (canBreakThrough(s)) add('breakthrough', '突破', 'cultivate', READY.breakthrough.short, READY.breakthrough.long);
  if (canCross(s)) add('cross', '渡劫', 'cultivate', READY.cross.short, READY.cross.long);
  // 妖 A warden that can be beaten, standing at the top of the realm. Played (2026-10-16): a
  // cultivator at layer 9 of 9 with the Stone Ape at 98% read "Melting pays qi" here, the
  // card two screens further down, and sat seventeen hours on 4.4M qi with nowhere to put it.
  if (canFightWarden(s) && s.realm < 9 && heavy.warden >= WARDEN_EVEN) {
    const w = currentWarden(s);
    add('warden', '妖', 'cultivate', READY.warden.short, READY.warden.long(w.han, w.name, Math.round(heavy.warden * 100)));
  }
  if (demonDue(s)) add('demon', '心魔', 'cultivate', READY.demon.short, READY.demon.long);
  const m = meetingDue(s);
  if (m) add('road', '緣', 'cultivate', READY.road.short, READY.road.long(m.name));
  const beds = ripeCount(s);
  if (beds > 0) add('beds', '洞天', 'cultivate', READY.beds.short(beds), READY.beds.long(beds));
  if (canEnterSecret(s) && !insideSecret(s)) add('vault', '秘境', 'hunt', READY.vault.short, READY.vault.long);
  const points = spendablePoints(s);
  if (points > 0) add('points', '道', 'dao', READY.points.short(points), READY.points.long(points));

  const q = quarryOf(s);
  // 一 Never in the first realm, where the guide's first chapter is walked: the week names
  // no quarry there (QUARRY_FROM_REALM).
  if (q && quarryOwed(s) && heavy.quarry >= QUARRY_READY) {
    add('quarry', '期', 'hunt', READY.quarry.short, READY.quarry.long(q.name, duration(weekLeft(s))));
  }
  if (towerOpen(s) && heavy.floor >= FLOOR_READY) {
    const f = standingFloor(s);
    add('floor', '塔', 'trials', READY.floor.short(f), READY.floor.long(f, Math.round(heavy.floor * 100)));
  }
  if (heavy.ups > 0) add('upgrades', '▲', 'gear', READY.upgrades.short(heavy.ups), READY.upgrades.long(heavy.ups));
  // 序 Below what is new or runs out (the week's quarry, a floor, a better piece) and above the
  // reminders that stand for days. A phone shows a chip and a half of the strip, and an idle
  // workshop stood in front of the quarry, which is gone on Monday (audit, 2026-10-16).
  const wait = workshopWait(s);
  if (wait) {
    const r = s.crafts.task ? RECIPE_BY_KEY[s.crafts.task] : undefined;
    const long = wait === 'idle' ? READY.workshop.idle
      : wait === 'chest' ? READY.workshop.chest
      : wait === 'remains' && r?.remains ? READY.workshop.remains(BEASTS.find((b) => b.key === r.remains)?.name ?? r.remains)
      : READY.workshop.needs(missingName(r ? needsOf(s, r).find(([k, n]) => held(s, k) < n)?.[0] ?? 'mat' : 'mat'));
    add('workshop', '業', 'crafts', wait === 'idle' ? READY.workshop.shortIdle : READY.workshop.shortWaits, long);
  }
  if (isOpen(s.realm, 'gear') && s.chest.length >= limitFor(s)) {
    add('chestFull', '藏', 'gear', READY.chestFull.short, READY.chestFull.long);
  }
  // 拆 Only when there is something it would pay for: a full allowance and an empty chest
  // is not a thing to do.
  if (isOpen(s.realm, 'gear') && (s.melt ?? 0) >= MELT_CAP - 1
    && s.chest.some((x) => !x.locked && x.from !== FORGED)) {
    add('melt', '拆', 'gear', READY.melt.short, READY.melt.long);
  }
  return out;
}

/** 點 The tabs with something on them, each with the sentences that say what. */
export function readyByTab(list: readonly Waiting[]): Partial<Record<Place, readonly Waiting[]>> {
  const by: Partial<Record<Place, Waiting[]>> = {};
  for (const w of list) (by[w.tab] ??= []).push(w);
  return by;
}
