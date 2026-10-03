import { describe, expect, it } from 'vitest';
import { BEDS, HERBS } from '../../data/herbs.ts';
import { BEASTS, commonsOf } from '../../data/bestiary.ts';
import { templateOf, valueOf, type Item, type Rarity } from '../../data/gear.ts';
import {
  againFor, emptyCount, harvest, harvestAll, harvestAndReplant, plant, plantAll, seedCost,
} from '../cave.ts';
import { compare, levelsCarried, marksUp, swing, verdictByLines, verdictOf, wearBetter } from '../inspect.ts';
import { fusable } from '../chest.ts';
import { fuseAllIn, fuseIn } from '../stash.ts';
import { canAffordDrive, drive, driveCost, driveMax } from '../hunt.ts';
import { DRIVE_MOST } from '../balance.ts';
import { MARKS } from '../record.ts';
import { UPGRADES, buy, buyAll, canBuy, newState, onScreen, power, upgradeCost, type State } from '../state.ts';
import { brew, brewMax, canBrew } from '../trials.ts';
import { seasonOf } from '../week.ts';
import { FORGED } from '../../data/crafts.ts';

/**
 * 便 The quality-of-life batch: every bulk button is the single tap in a loop, so none
 * of them can pay a number the single taps would not have paid.
 */
const T0 = 1_700_000_000;
const HOUR = 3600;

const piece = (id: string, template: string, rarity: Rarity,
  rolls: { affix: string; value: number }[], extra: Partial<Item> = {}): Item =>
  ({ id, template, rarity, rolls: rolls as Item['rolls'], ...extra });

const hero = (over: Partial<State> = {}): State =>
  ({ ...newState(T0), realm: 5, layer: 4, ...over } as State);

describe('洞天 收 take all and plant again', () => {
  const digger = (over: Partial<State> = {}): State => ({
    ...newState(T0), realm: 3, layer: 4, qi: 0, materials: 100_000, at: T0, startedAt: T0 - 30 * 86_400, ...over,
  } as State);

  it('takes every ripe bed and sows each with the herb that was in it', () => {
    let s = digger();
    s = plant(s, 0, 'moss');
    s = plant(s, 1, 'dragonblood');
    s = { ...s, at: s.at + 13 * HOUR };
    const one = harvestAll(s);
    const again = harvestAndReplant(s);
    // Pays exactly what taking them by hand pays.
    expect(again.qi).toBe(one.qi);
    expect(again.reaped).toBe(one.reaped);
    expect(again.beds[0]).toEqual({ herb: 'moss', at: s.at });
    expect(again.beds[1]).toEqual({ herb: 'dragonblood', at: s.at });
    // The empty bed stays empty: nothing is planted that nobody chose.
    expect(again.beds[2].herb).toBeNull();
    expect(again.materials).toBe(s.materials - seedCost(s, HERBS[0]) - seedCost(s, HERBS[2]));
  });

  it('leaves a growing bed alone', () => {
    let s = digger();
    s = plant(s, 0, 'moss');
    s = plant(s, 1, 'dragonblood');
    s = { ...s, at: s.at + 3 * HOUR };       // moss ripe, dragonblood not
    const again = harvestAndReplant(s);
    expect(again.beds[0]).toEqual({ herb: 'moss', at: s.at });
    expect(again.beds[1]).toEqual(s.beds[1]);
  });

  it('falls back to the herb in season only when the same seed cannot be paid for', () => {
    let s = digger();
    s = plant(s, 0, 'dragonblood');
    s = { ...s, at: s.at + 13 * HOUR };
    const season = seasonOf(s)!;
    const taken = harvest(s, 0);
    expect(againFor(taken, 0, 'dragonblood')).toBe('dragonblood');
    // Too poor for the same seed: the season's herb if that one is cheaper and affordable.
    const poor = { ...taken, materials: seedCost(taken, season) };
    const fallback = againFor(poor, 0, 'dragonblood');
    if (seedCost(taken, season) < seedCost(taken, HERBS[2])) expect(fallback).toBe(season.key);
    // Too poor for either: empty, and the harvest still lands.
    const broke = { ...s, materials: 0 };
    const out = harvestAndReplant(broke);
    expect(out.beds[0].herb).toBeNull();
    expect(out.qi).toBe(harvestAll(broke).qi);
  });

  it('plants one herb in every empty bed, as far as the material goes', () => {
    const s = digger();
    expect(emptyCount(s)).toBe(BEDS);
    const all = plantAll(s, 'orchid');
    expect(all.beds.every((b) => b.herb === 'orchid')).toBe(true);
    expect(emptyCount(all)).toBe(0);
    const two = plantAll({ ...s, materials: seedCost(s, HERBS[1]) * 2 }, 'orchid');
    expect(two.beds.filter((b) => b.herb === 'orchid').length).toBe(2);
    expect(two.materials).toBe(0);
  });
});

describe('承 a piece is compared as it would be once worn', () => {
  // rekaris, on the Discord: the worn piece's refining made it read as better than a
  // strict upgrade, because the upgrade was read bare.
  const wornSword = piece('w', 'sword5', 'common', [{ affix: 'power', value: 8 }], { refine: 10 });
  const better = piece('c', 'sword5', 'mystic', [{ affix: 'power', value: 10 }]);
  const wornLaurel = piece('wl', 'laurel5', 'common', [{ affix: 'luck', value: 4 }], { refine: 10 });
  const luckier = piece('cl', 'laurel5', 'earth', [{ affix: 'luck', value: 6 }]);

  it('reads the candidate with the slot\'s levels on every line', () => {
    const rows = compare(better, wornSword);
    const p = rows.find((r) => r.affix === 'power')!;
    // Bare, 10 against a refined 8 read as a loss. Worn, it carries the ten levels.
    expect(p.theirs).toBeCloseTo(valueOf({ ...better, refine: 10 }, 'power'), 9);
    expect(p.theirs).toBeGreaterThan(p.mine);
    expect(levelsCarried(better, wornSword)).toBe(10);
    expect(levelsCarried(wornSword, better)).toBe(0);
  });

  it('marks the strict upgrade ▲, and the sheet calls it an upgrade', () => {
    const s = hero({ worn: { weapon: wornSword } });
    expect(marksUp(s, better)).toBe(true);
    expect(verdictByLines(verdictOf(swing(s, better)), compare(better, wornSword))).toBe('up');
    // A luck crown moves neither power nor qi, so its lines decide, and they read it worn.
    const c = hero({ worn: { crown: wornLaurel } });
    expect(verdictByLines(verdictOf(swing(c, luckier)), compare(luckier, wornLaurel))).toBe('up');
    // And a weaker piece is still weaker with the levels on it.
    const weak = piece('x', 'laurel5', 'common', [{ affix: 'luck', value: 2 }]);
    expect(verdictByLines(verdictOf(swing(c, weak)), compare(weak, wornLaurel))).toBe('down');
  });
});

describe('▲ 著 wear all upgrades', () => {
  const worn = piece('w', 'sword5', 'common', [{ affix: 'power', value: 8 }], { refine: 4 });
  const up1 = piece('a', 'sword5', 'spirit', [{ affix: 'power', value: 12 }]);
  const up2 = piece('b', 'sword5', 'heaven', [{ affix: 'power', value: 30 }]);
  const boots = piece('k', 'greaves5', 'earth', [{ affix: 'power', value: 18 }]);

  it('puts on the best ▲ for each place, levels traded, and stops when nothing is ▲', () => {
    const s = hero({ worn: { weapon: worn }, chest: [up1, up2, boots] });
    const r = wearBetter(s);
    expect(r.worn).toBe(2);
    expect(r.state.worn.weapon?.id).toBe('b');
    expect(r.state.worn.weapon?.refine).toBe(4);          // 承 the slot's levels came along
    expect(r.state.worn.boots?.id).toBe('k');
    expect(r.state.chest.map((x) => x.id).sort()).toEqual(['a', 'w']);
    expect(r.state.chest.find((x) => x.id === 'w')?.refine).toBeUndefined();
    expect(r.state.chest.some((x) => marksUp(r.state, x))).toBe(false);
    expect(power(r.state)).toBeGreaterThan(power(s));
    // Nothing else in the save moves.
    expect(r.state.qi).toBe(s.qi);
    expect(r.state.chest.length + Object.keys(r.state.worn).length)
      .toBe(s.chest.length + Object.keys(s.worn).length);
  });

  it('never wears a locked piece or one a loadout names', () => {
    const locked = { ...up2, locked: true as const };
    const s = hero({ worn: { weapon: worn }, chest: [locked, boots],
      sets: [{ name: 'Tower', ids: { boots: 'k' } }] });
    const r = wearBetter(s);
    expect(r.worn).toBe(0);
    expect(r.state).toBe(s);
  });
});

describe('煉 fuse all groups', () => {
  const c = (i: number, t = 'sword5', r: Rarity = 'common') => piece(`p${t}${r}${i}`, t, r, [{ affix: 'power', value: 4 }]);

  it('is the single fuse in a loop, and climbs a rank when three new ones meet', () => {
    // Nine commons fuse into three spirits, which fuse into one mystic.
    const s = hero({ chest: Array.from({ length: 9 }, (_, i) => c(i)) });
    const r = fuseAllIn(s);
    expect(fusable(r.state.chest)).toHaveLength(0);
    expect(r.state.chest).toHaveLength(1);
    expect(r.state.chest[0].rarity).toBe('mystic');
    expect(r.made.map((x) => x.id)).toEqual([r.state.chest[0].id]);
    // And by hand, one group at a time, the same chest.
    let byHand = s;
    for (let i = 0; i < 10; i++) {
      const g = fusable(byHand.chest)[0];
      if (!g) break;
      byHand = fuseIn(byHand, g.template, g.rarity).state;
    }
    expect(byHand.chest).toEqual(r.state.chest);
  });

  it('never melts a locked or forged piece', () => {
    const s = hero({ chest: [c(1), c(2), { ...c(3), locked: true }, { ...c(4), from: FORGED }] });
    expect(fuseAllIn(s).state).toBe(s);
  });
});

describe('圍 drive as many as the qi pays for', () => {
  const rat = commonsOf(3)[0];
  const hunter = (qi: number): State => ({
    ...newState(T0), realm: 3, qi, killed: Object.fromEntries(BEASTS.map((b) => [b.key, MARKS[1]])),
  });

  it('is the most kills the qi in hand can pay for', () => {
    const per = driveCost(hunter(0), 1, rat);
    const s = hunter(per * 37.5);
    const n = driveMax(s, rat);
    expect(canAffordDrive(s, rat, n)).toBe(true);
    expect(canAffordDrive(s, rat, n + 1)).toBe(false);
    expect(n).toBeGreaterThanOrEqual(36);
    // Each kill costs what it costs in any drive.
    expect(drive(s, rat, n, 7).qiSpent).toBe(driveCost(s, n, rat));
  });

  it('is nothing for a beast not yet Known or a pocket that cannot pay for one', () => {
    expect(driveMax(hunter(0), rat)).toBe(0);
    expect(driveMax({ ...hunter(1e12), killed: {} }, rat)).toBe(0);
  });

  it('never rolls more than DRIVE_MOST kills in one go', () => {
    expect(driveMax(hunter(1e40), rat)).toBe(DRIVE_MOST);
  });
});

describe('盡 buy all, and brew ×Max', () => {
  it('buys the cheapest affordable level first until nothing more can be bought', () => {
    const s: State = { ...newState(T0), realm: 3, layer: 2, qi: 5e7, materials: 5e5 };
    let byHand = s;
    for (let g = 0; g < 1000; g++) {
      const can = UPGRADES.filter((u) => onScreen(byHand, u) && canBuy(byHand, u));
      if (!can.length) break;
      can.sort((a, b) => upgradeCost(byHand, a) - upgradeCost(byHand, b));
      byHand = buy(byHand, can[0]);
    }
    const r = buyAll(s);
    expect(r.state).toEqual(byHand);
    expect(r.n).toBeGreaterThan(0);
    expect(UPGRADES.some((u) => onScreen(r.state, u) && canBuy(r.state, u))).toBe(false);
  });

  it('brews as many pills as tapping would, at the same prices', () => {
    const s: State = { ...newState(T0), realm: 9, layer: 4, qi: 1e15, materials: 1e12 };
    let byHand = s;
    let n = 0;
    while (canBrew(byHand, 'body') && n < 10_000) { byHand = brew(byHand, 'body'); n++; }
    const r = brewMax(s, 'body');
    expect(r.state).toEqual(byHand);
    expect(r.n).toBe(n);
    expect(r.n).toBeGreaterThan(1);
    expect(r.qi).toBe(s.qi - byHand.qi);
    expect(brewMax({ ...s, qi: 0 }, 'body').n).toBe(0);
  });
});

// Keep the imports honest: a template that does not exist would make every test above vacuous.
it('uses real templates', () => {
  for (const t of ['sword5', 'laurel5', 'greaves5']) expect(templateOf({ id: '', template: t, rarity: 'common', rolls: [] }).key).toBe(t);
});
