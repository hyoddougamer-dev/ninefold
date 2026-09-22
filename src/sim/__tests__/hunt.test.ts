import { describe, expect, it } from 'vitest';
import { BEASTS, commonsOf, wardenOf } from '../../data/bestiary.ts';
import { DRIVE_SIZES, canAffordDrive, canDrive, drive, driveCost } from '../hunt.ts';
import { loot, lootFrom, takeKill } from '../combat.ts';
import { MARKS, marksOf } from '../record.ts';
import { newState, type State } from '../state.ts';
import { ladderBetween } from '../balance.ts';
import { layersOpened } from '../time.ts';
import { num } from '../format.ts';

const T0 = 1_700_000_000;

/** A cultivator of a given realm, rich, who has already earned 熟 on everything. */
function hunter(realm: number): State {
  return {
    ...newState(T0), realm, qi: 1e30,
    killed: Object.fromEntries(BEASTS.map((b) => [b.key, MARKS[1]])),
  };
}

/**
 * 舊 A beast pays what it is worth to the person killing it.
 *
 * Before this, the frog of the first realm paid 2 材 and the frog of the ninth paid
 * 900,095. Going back to finish a beast you had left behind was a hundred fights for a
 * rounding error, and 圖鑑 the bestiary: four beasts *mastered* in a realm, four
 * hundred kills: was a chore with no reason to do it.
 */
describe('舊 what an old beast is worth to someone who has moved on', () => {
  it('pays a floor set by the hunter, never less than its own table', () => {
    const rat = commonsOf(1)[0];
    for (const r of [1, 4, 9]) {
      expect(lootFrom(hunter(r), rat)).toBeGreaterThanOrEqual(loot(rat));
    }
    expect(lootFrom(hunter(9), rat)).toBeGreaterThan(lootFrom(hunter(4), rat));
  });

  it('keeps hunting at the top of your reach plainly better', () => {
    // A quarter, so the old animal is worth going back for and never worth staying for.
    for (const r of [4, 6, 9]) {
      const s = hunter(r);
      const old = lootFrom(s, commonsOf(1)[0]);
      const now = lootFrom(s, commonsOf(r)[0]);
      expect(old / now).toBeLessThan(0.3);
      expect(old / now).toBeGreaterThan(0.2);
    }
    // eslint-disable-next-line no-console
    console.log('\n  舊 what 山鼠 the first realm’s rat pays as you climb:');
    for (const r of [1, 2, 4, 6, 9]) {
      const s = hunter(r);
      // eslint-disable-next-line no-console
      console.log(`    at realm ${r}: ${num(lootFrom(s, commonsOf(1)[0])).padStart(7)} 材`
        + `   (this realm’s own weakest pays ${num(lootFrom(s, commonsOf(r)[0]))})`);
    }
  });
});

/**
 * 圍 The drive, and the three promises it has to keep.
 */
describe('圍 the drive', () => {
  it('is locked until you have beaten the beast ten times', () => {
    const rat = commonsOf(1)[0];
    let s: State = { ...newState(T0), qi: 1e12 };
    expect(canDrive(s, rat)).toBe(false);
    for (let i = 0; i < MARKS[1] - 1; i++) s = takeKill(s, rat);
    expect(canDrive(s, rat)).toBe(false);
    s = takeKill(s, rat);
    expect(canDrive(s, rat)).toBe(true);
  });

  /**
   * The promise that makes it fair: the qi buys the tapping and nothing else. A player
   * who wants to tap two hundred times gets the same material, the same counts, and may.
   */
  it('pays exactly what the taps would have paid', () => {
    const rat = commonsOf(1)[0];
    let byHand: State = hunter(3);
    const n = 50;
    const before = byHand.materials;
    for (let i = 0; i < n; i++) byHand = takeKill(byHand, rat);

    const driven = drive(hunter(3), rat, n, 99);
    expect(driven.material).toBe(byHand.materials - before);
    expect(driven.state.killed[rat.key]).toBe(byHand.killed[rat.key]);
  });

  /**
   * 守 A drive that cannot be paid for does nothing at all, and this test used to assert
   * the opposite.
   *
   * It read *"never goes below nothing"*, and what it was guarding was
   * `Math.max(0, qi - cost)`: a drive nobody could afford took **everything they had**
   * and ran anyway. The screen gates the button, so no player has met it, and a price
   * that can empty a pocket has no business being one tap away from an unguarded call.
   * Found by 氣查 the audit of the qi.
   */
  it('spends the qi it says it spends, and refuses outright when it cannot be paid', () => {
    const rat = commonsOf(1)[0];
    const s = hunter(2);
    const cost = driveCost(s, 200);
    const d = drive(s, rat, 200, 7);
    expect(d.qiSpent).toBe(cost);
    expect(d.state.qi).toBe(s.qi - cost);

    const poor = { ...s, qi: 1 };
    expect(canAffordDrive(poor, rat, 200)).toBe(false);
    const refused = drive(poor, rat, 200, 7);
    expect(refused.state.qi).toBe(1);                 // the qi is untouched
    expect(refused.kills).toBe(0);                    // and nothing happened
    expect(refused.state.killed[rat.key] ?? 0).toBe(poor.killed[rat.key] ?? 0);
  });

  /**
   * 梯 The price rides the rung you are standing on, not the realm's first.
   *
   * Priced off the realm's floor, a drive stayed cheap while the rungs around it grew
   * geometrically, so a cultivator at a ceiling could drive for nothing. The measuring
   * cultivator who tried it bought a million fights, never left the third realm, and
   * ended weaker than one who never hunted at all.
   */
  it('costs about a layer for fifty, wherever you are standing', () => {
    for (const r of [1, 5, 9]) {
      for (const layer of [0, 4, 8]) {
        const s = { ...hunter(r), layer };
        const rung = ladderBetween(layersOpened(s));
        expect(driveCost(s, 50) / rung).toBeGreaterThan(0.5);
        expect(driveCost(s, 50) / rung).toBeLessThan(2);
      }
    }
  });

  it('is pure: the same drive twice is the same drive', () => {
    const b = commonsOf(4)[1];
    const s = hunter(4);
    const a = drive(s, b, 50, 4242);
    const c = drive(s, b, 50, 4242);
    expect(c.material).toBe(a.material);
    expect(c.dropsRolled).toBe(a.dropsRolled);
    expect(c.best?.rarity).toBe(a.best?.rarity);
  });

  it('reports the marks it crossed, and crosses them', () => {
    const b = commonsOf(2)[0];
    let s = hunter(2);
    s = { ...s, killed: { ...s.killed, [b.key]: MARKS[1] } };
    const d = drive(s, b, 200, 11);
    expect(marksOf(d.state.killed[b.key])).toBe(marksOf(MARKS[1] + 200));
    expect(d.earned).toContain(2);   // 通 Mastered, crossed at a hundred
  });

  /**
   * 磨 The number Bruno was complaining about, before and after.
   */
  it('turns the record from three thousand taps into seventy', () => {
    const byHand = MARKS[2] * BEASTS.length;
    const biggest = DRIVE_SIZES[DRIVE_SIZES.length - 1];
    const perBeast = MARKS[1] + Math.ceil((MARKS[2] - MARKS[1]) / biggest);
    const driven = BEASTS.length * (1 + Math.ceil((MARKS[2] - MARKS[1]) / biggest));
    expect(byHand).toBe(3600);
    expect(driven).toBeLessThan(100);
    // eslint-disable-next-line no-console
    console.log(`\n  磨 the whole record, in taps:  by hand ${byHand}`
      + `  ·  with 圍 drives ${driven}`
      + `  (${MARKS[1]} real fights a beast to earn 熟, then ${perBeast - MARKS[1]} drive)`);
  });

  it('is never offered on a warden, however many times it has fallen', () => {
    // A warden is fought once and opens a realm: there is no second one to drive, and
    // the first is the whole point. The hunt screen would not offer it either, but a
    // guard that lives only in a screen is one a second screen will forget.
    for (const r of [1, 5, 9]) {
      const w = wardenOf(r);
      const s = { ...hunter(r), killed: { [w.key]: 999 } };
      expect(canDrive(s, w)).toBe(false);
      expect(canAffordDrive(s, w, 10)).toBe(false);
    }
  });
});
