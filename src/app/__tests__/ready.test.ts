import { describe, expect, it } from 'vitest';
import { ready, readyByTab, workshopWait, type Heavy } from '../ready.ts';
import { newState, type State } from '../../sim/state.ts';
import { freePoints, savingFor, spendablePoints, treeFull } from '../../sim/points.ts';
import { cardWorth } from '../../sim/cardworth.ts';
import { cardOf } from '../../data/awakening.ts';
import { AWAKEN, BESTIARY, DAO, SECLUSION } from '../copy.ts';
import { ALL_NODES } from '../../data/techniques.ts';
import { canUnlock, capstonesOpen } from '../../sim/dao.ts';
import { isOpen } from '../../sim/unlocks.ts';
import { NO_CRAFTS } from '../../sim/crafts.ts';
import { MELT_CAP } from '../../sim/balance.ts';
import { RARITIES } from '../../data/gear.ts';
import { quarryOf, quarryOwed } from '../../sim/week.ts';

const T0 = 1_700_000_000;
const DAY = 86_400;
const NONE: Heavy = { ups: 0, floor: 0, quarry: 0 };

/** A cultivator well into a realm, every card taken and nobody on the road. */
function at(realm: number, over: Partial<State> = {}): State {
  const s = newState(T0);
  return {
    ...s, realm, layer: 4, startedAt: T0 - 60 * DAY, metAt: T0, runAt: T0, melt: 0,
    awakened: [], ...over,
  };
}

/** Spend every point the tree will take, the way a player who keeps up does. */
function spentOut(s0: State): State {
  let s = s0;
  for (let guard = 0; guard < 400; guard++) {
    const free = freePoints(s);
    const n = ALL_NODES.find((x) => canUnlock(x.key, s.unlocked, free, isOpen(s.realm, 'keystones'), capstonesOpen(s.realm)));
    if (!n) break;
    s = { ...s, unlocked: [...s.unlocked, n.key] };
  }
  return s;
}

describe('道 the Path badge counts only points that can be spent', () => {
  it('reads the free points while a node is in reach', () => {
    const s = at(3, { metPoints: 3 });
    expect(freePoints(s)).toBeGreaterThan(0);
    expect(spendablePoints(s)).toBe(freePoints(s));
  });

  it('reads nothing on a tree with nothing left to take, however many are banked', () => {
    // The audit's cultivator wore 32 on the tab at the eighth realm and 53 at the top.
    const s = spentOut(at(9, { metPoints: 400 }));
    expect(freePoints(s)).toBeGreaterThan(0);
    expect(spendablePoints(s)).toBe(0);
    expect(ready(s, NONE).some((w) => w.key === 'points')).toBe(false);
  });
});

describe('道 points nothing will take say what they are for', () => {
  // 貪 A greedy cultivator: every node bought the moment it can be. No HABITS cultivator
  // plays this way, which is why the audit found a gold 28 at the eighth realm by hand.
  it('a full tree says it is full, and the 道 rewards say they are kept', () => {
    const s = spentOut(at(8, { metPoints: 40 }));
    expect(freePoints(s)).toBeGreaterThan(0);
    expect(spendablePoints(s)).toBe(0);
    expect(treeFull(s)).toBe(true);
    expect(treeFull(s, false)).toBe(true);
    expect(savingFor(s)).toBeNull();
    // 承露 Catching Dew and 一念 One Thought pay points a full tree can only keep.
    for (const key of ['dew', 'onethought']) {
      const card = cardOf(key)!;
      expect(cardWorth(s, card)).toEqual({ kind: 'dao', full: true });
      expect(AWAKEN.effect(card.effect, cardWorth(s, card))).toContain(DAO.kept(2));
    }
    expect(SECLUSION.pays(1, treeFull(s, false))).toContain(DAO.kept(1));
    expect(BESTIARY.pays(1, treeFull(s, false))).toContain(DAO.kept(1));
  });

  it('a tree with room says nothing of the kind', () => {
    const s = at(8, { metPoints: 40 });
    expect(treeFull(s, false)).toBe(false);
    expect(cardWorth(s, cardOf('dew')!)).toEqual({ kind: 'dao', full: false });
    expect(AWAKEN.effect(cardOf('dew')!.effect, cardWorth(s, cardOf('dew')!))).not.toContain('kept');
    expect(SECLUSION.pays(1)).toBe('+1 道 point');
  });

  it('points short of every node in reach are saving, not waiting', () => {
    const s = spentOut(at(6, { metPoints: 40 }));
    const free = freePoints(s);
    expect(free).toBeGreaterThan(0);
    expect(spendablePoints(s)).toBe(0);
    expect(treeFull(s)).toBe(false);
    expect(savingFor(s)).toBeGreaterThan(free);
    expect(DAO.saving(free, savingFor(s)!)).toBe(`Saving: ${free} of ${savingFor(s)} 道 for the next node.`);
  });

  it('a tree full for this realm is told apart from one full for good', () => {
    // 樞 At the third realm the keystones and capstones are still shut.
    const s = spentOut(at(3, { metPoints: 400 }));
    expect(treeFull(s)).toBe(true);
    expect(treeFull(s, false)).toBe(false);
    expect(cardWorth(s, cardOf('dew')!)).toEqual({ kind: 'dao', full: false });
  });

  it('a node in reach is never called saving', () => {
    const s = at(3, { metPoints: 3 });
    expect(spendablePoints(s)).toBeGreaterThan(0);
    expect(savingFor(s)).toBeNull();
    expect(DAO.purse(0, 3, false)).toContain('kept');
    expect(DAO.purse(0, 3)).toContain('to spend');
  });
});

describe('待 what is waiting', () => {
  it('is derived from the save alone, the same answer every time', () => {
    const s = at(3, { beds: [{ herb: 'moss', at: T0 - 3 * DAY }, { herb: null, at: 0 }, { herb: null, at: 0 }] });
    expect(ready(s, NONE)).toEqual(ready(s, NONE));
  });

  it('names ripe beds, an open vault and a workshop with no task, each on its own tab', () => {
    const s = at(3, {
      beds: [{ herb: 'moss', at: T0 - 3 * DAY }, { herb: 'moss', at: T0 - 3 * DAY }, { herb: null, at: 0 }],
      runAt: T0 - 30 * DAY,
      crafts: { ...NO_CRAFTS, since: T0 },
    });
    const keys = ready(s, NONE).map((w) => [w.key, w.tab]);
    expect(keys).toContainEqual(['beds', 'cultivate']);
    expect(keys).toContainEqual(['vault', 'hunt']);
    expect(keys).toContainEqual(['workshop', 'crafts']);
    expect(ready(s, NONE).find((w) => w.key === 'beds')!.long).toMatch(/2 cave beds are ripe/);
  });

  it('names what a waiting workshop is waiting for, in English', () => {
    const s = at(3, { crafts: { ...NO_CRAFTS, since: T0, task: 'forge:metal1' } });
    expect(workshopWait(s)).toBe('needs');
    expect(ready(s, NONE).find((w) => w.key === 'workshop')!.long).toMatch(/waiting for Mortal Iron Ore/);
  });

  it('says nothing about the workshop while it works', () => {
    const s = at(3, { crafts: { ...NO_CRAFTS, since: T0, task: 'vein:iron' } });
    expect(workshopWait(s)).toBeNull();
    expect(ready(s, NONE).some((w) => w.key === 'workshop')).toBe(false);
  });

  it('puts upgrades and a near-certain tower floor on their tabs only when the reads say so', () => {
    const s = at(5);
    expect(ready(s, NONE).some((w) => w.key === 'floor' || w.key === 'upgrades')).toBe(false);
    const by = readyByTab(ready(s, { ups: 3, floor: 0.9, quarry: 0 }));
    expect(by.trials?.map((w) => w.key)).toEqual(['floor']);
    expect(by.gear?.[0].long).toMatch(/3 pieces in your chest would be an upgrade/);
  });

  it('offers the melting allowance only when there is something to melt', () => {
    const piece = { id: 'p', template: 'sword2', rarity: RARITIES[0], rolls: [{ affix: 'power' as const, value: 3 }] };
    expect(ready(at(3, { melt: MELT_CAP }), NONE).some((w) => w.key === 'melt')).toBe(false);
    expect(ready(at(3, { melt: MELT_CAP, chest: [piece] }), NONE).some((w) => w.key === 'melt')).toBe(true);
    expect(ready(at(3, { melt: MELT_CAP, chest: [{ ...piece, locked: true }] }), NONE).some((w) => w.key === 'melt')).toBe(false);
  });

  it('never reads as a loss', () => {
    const s = at(3, {
      beds: [{ herb: 'moss', at: T0 - 3 * DAY }, { herb: null, at: 0 }, { herb: null, at: 0 }],
      runAt: T0 - 30 * DAY, crafts: { ...NO_CRAFTS, since: T0, task: 'forge:metal1' }, metPoints: 2,
    });
    for (const w of ready(s, { ups: 2, floor: 0.9, quarry: 0.9 })) {
      expect(`${w.short} ${w.long}`).not.toMatch(/\b(lost|wasted|missed|expired|spoil)/i);
      expect(w.long).not.toMatch(/—/);
    }
  });

  /**
   * 一 The 期 chip stood on the very first screen of a new cultivator, before the guide had said
   * a word about weeks, beside a card asking for a purchase (played 2026-10-16), and the quarry
   * it pointed at filled the first realm in seven seconds. The week names no quarry before the
   * second realm (QUARRY_FROM_REALM), so the chip waits for it too.
   */
  it('leaves the week\'s quarry off in the first realm', () => {
    const fresh = newState(T0);
    expect(quarryOf(fresh)).toBeNull();
    const heavy = { ...NONE, quarry: 0.9 };
    expect(ready(fresh, heavy).some((w) => w.key === 'quarry')).toBe(false);
    expect(ready({ ...fresh, seen: [...fresh.seen, 'guide'] }, heavy).some((w) => w.key === 'quarry')).toBe(false);
    const second = { ...fresh, realm: 2 };
    expect(quarryOf(second) && quarryOwed(second)).toBeTruthy();
    expect(ready(second, heavy).some((w) => w.key === 'quarry')).toBe(true);
  });
});
