import { describe, expect, it } from 'vitest';
import { BEASTS, huntable, wardenOf } from '../../data/bestiary.ts';
import { HERBS } from '../../data/herbs.ts';
import { roomsFor } from '../../data/secret.ts';
import { BLESSED_ROOM, QUARRY_LOOT, SEASON_HARVEST } from '../balance.ts';
import { newState, validate, type State } from '../state.ts';
import {
  WEEK, blessedStep, isBlessed, isQuarry, isSeason, quarryOf, quarryOwed, seasonOf,
  weekLeft, weekOf,
} from '../week.ts';
import { lootFrom, takeKill } from '../combat.ts';
import { harvestValue } from '../cave.ts';
import { giftOf } from '../secret.ts';
import { rate } from '../time.ts';
import { num } from '../format.ts';

const MONDAY = Date.UTC(2026, 8, 21) / 1000;   // 2026-09-21, a Monday, 00:00 UTC

function at(realm: number, when: number, layer = 8): State {
  return { ...newState(when - 90 * 86400), at: when, realm, layer, wardenFell: false };
}

describe('期 the week', () => {
  it('turns at midnight on Monday, everywhere at once', () => {
    expect(weekOf(MONDAY)).toBe(weekOf(MONDAY + 6 * 86400 + 86399));
    expect(weekOf(MONDAY + 7 * 86400)).toBe(weekOf(MONDAY) + 1);
    expect(weekOf(MONDAY - 1)).toBe(weekOf(MONDAY) - 1);
    // 待 And the countdown reads the whole week at the top of one, never zero.
    expect(weekLeft(at(4, MONDAY))).toBe(WEEK);
    expect(weekLeft(at(4, MONDAY + WEEK - 60))).toBe(60);
  });

  it('never names a beast the cultivator cannot reach', () => {
    for (let r = 1; r <= 9; r++) {
      for (let layer = 0; layer < 9; layer++) {
        for (let w = 0; w < 60; w++) {
          const s = at(r, MONDAY + w * WEEK, layer);
          const q = quarryOf(s);
          expect(q).not.toBeNull();
          expect(huntable(r, layer).map((b) => b.key)).toContain(q!.key);
          expect(q!.warden).toBeUndefined();
        }
      }
    }
  });

  it('moves, and comes to every beast a realm can reach', () => {
    const seen = new Set<string>();
    for (let w = 0; w < 400; w++) seen.add(quarryOf(at(9, MONDAY + w * WEEK))!.key);
    expect(seen.size).toBe(huntable(9, 8).length);
    console.log(`\n  ${seen.size} of ${BEASTS.filter((b) => !b.warden).length} commons ` +
      'come round as the quarry at the ninth realm\n');
    const rows: string[] = [];
    for (let w = 0; w < 6; w++) {
      const s = at(5, MONDAY + w * WEEK);
      rows.push(`    week ${w}  ${quarryOf(s)!.han} ${quarryOf(s)!.name.padEnd(16)}`
        + `${seasonOf(s)!.han} ${seasonOf(s)!.name.padEnd(18)}room ${blessedStep(s) + 1}`);
    }
    console.log(`  what a fifth-realm cultivator's six weeks look like:\n${rows.join('\n')}\n`);
  });

  it('pays the quarry double material, and nothing else double', () => {
    const s = at(5, MONDAY);
    const q = quarryOf(s)!;
    for (const b of huntable(5, 8)) {
      const plain = { ...s, at: s.at, realm: 5 };
      const mine = lootFrom(plain, b);
      const others = huntable(5, 8).filter((x) => x.key !== q.key);
      if (b.key === q.key) {
        expect(mine).toBe(lootFrom({ ...plain, at: MONDAY }, b));
        // 倍 Exactly the multiplier, read against the same beast on a week it is not named.
        const off = [...Array(20).keys()].map((w) => MONDAY + (w + 1) * WEEK)
          .find((t) => !isQuarry({ ...plain, at: t }, b))!;
        expect(mine / lootFrom({ ...plain, at: off }, b)).toBeCloseTo(QUARRY_LOOT, 6);
      }
      expect(others.every((x) => !isQuarry(plain, x))).toBe(true);
    }
  });

  it('never makes a warden the quarry, however the week falls', () => {
    for (let r = 1; r <= 9; r++) {
      for (let w = 0; w < 120; w++) {
        expect(isQuarry(at(r, MONDAY + w * WEEK), wardenOf(r))).toBe(false);
      }
    }
  });

  it('pays the qi once a week and not twice', () => {
    let s = at(5, MONDAY);
    const q = quarryOf(s)!;
    expect(quarryOwed(s)).toBe(true);
    const before = s.qi;
    s = takeKill(s, q);
    const first = s.qi - before;
    expect(first).toBeGreaterThan(0);
    expect(quarryOwed(s)).toBe(false);
    // 再 The second kill of the same week pays material and no qi at all.
    const again = takeKill(s, q);
    expect(again.qi).toBe(s.qi);
    // 週 And the next week owes it again.
    const next = { ...again, at: MONDAY + WEEK };
    expect(quarryOwed(next)).toBe(isQuarry(next, quarryOf(next)!));
    expect(quarryOwed(next)).toBe(true);
  });

  it('cannot be paid twice by winding the clock back', () => {
    let s = at(5, MONDAY + 50 * WEEK);
    s = takeKill(s, quarryOf(s)!);
    const back = { ...s, at: MONDAY };
    expect(back.quarryWeek).toBeGreaterThan(weekOf(back.at));
    expect(quarryOwed(back)).toBe(false);
  });

  it('survives a save it was not in, and caps a forged one', () => {
    const now = MONDAY + 30 * WEEK;
    const old = validate({ ...newState(now - 86400 * 30), at: now }, now);
    expect(old.quarryWeek).toBe(-1);
    expect(quarryOwed(old)).toBe(true);
    const forged = validate({ ...old, quarryWeek: 9e9 }, now);
    expect(forged.quarryWeek).toBe(weekOf(now));
  });

  it('puts a herb in season this realm can plant, and pays it half again', () => {
    for (let r = 1; r <= 9; r++) {
      for (let w = 0; w < 60; w++) {
        const s = at(r, MONDAY + w * WEEK);
        const h = seasonOf(s);
        if (r < 2) { expect(h).toBeNull(); continue; }
        expect(h!.realm).toBeLessThanOrEqual(r);
      }
    }
    const s = at(5, MONDAY);
    const h = seasonOf(s)!;
    const plain = HERBS.find((x) => !isSeason(s, x))!;
    expect(harvestValue(s, h) / (h.paysMinutes * rate(s) * 60)).toBeCloseTo(SEASON_HARVEST, 2);
    expect(harvestValue(s, plain) / (plain.paysMinutes * rate(s) * 60)).toBeCloseTo(1, 2);
  });

  it('blesses a reward room and never a gate', () => {
    for (let r = 5; r <= 9; r++) {
      for (let w = 0; w < 200; w++) {
        const step = blessedStep(at(r, MONDAY + w * WEEK));
        expect(step % 2).toBe(0);
        expect(step).toBeLessThan(roomsFor(r));
      }
    }
  });

  it('doubles what the blessed room gives, and says so before the door opens', () => {
    const s = at(7, MONDAY);
    const step = blessedStep(s);
    const plain = [0, 2, 4, 6, 8, 10].find((x) => !isBlessed(s, x))!;
    const spring = giftOf(s, { kind: 'spring' }, step).qi;
    const same = giftOf(s, { kind: 'spring' }, plain).qi;
    // 深 Depth scales a spring too, so the same room is read again on a week that does
    // not bless it, rather than read against a different room.
    const off = [...Array(40).keys()].map((w) => ({ ...s, at: s.at + (w + 1) * WEEK }))
      .find((x) => !isBlessed(x, step))!;
    const scale = giftOf(off, { kind: 'spring' }, step).qi;
    expect(spring / scale).toBeCloseTo(BLESSED_ROOM, 2);
    expect(same).toBeGreaterThan(0);
    console.log(`\n  room ${step + 1} blessed: ${num(spring)} qi against ${num(scale)} ` +
      'on a week it is not\n');
  });

  it('is invisible to a cultivator who never turns up', () => {
    // 律 Every one of the three is a multiplier on a payment somebody has to go and take:
    // a kill, a bed, a door. None of them touches the rate, so a save that is only ever
    // shut gathers exactly what it gathered before the week existed.
    const s = at(5, MONDAY);
    for (let w = 0; w < 20; w++) {
      expect(rate({ ...s, at: MONDAY + w * WEEK })).toBe(rate(s));
    }
  });
});
