import { describe, expect, it } from 'vitest';
import { DEEP_ROOMS, DOOR_GAP, OPENS_AT, ROOMS, RUN_DAO_CEILING } from '../../data/secret.ts';
import { MEET_POINT_CEILING } from '../../data/meetings.ts';
import {
  beastAt, canEnter, doorIn, doorsAt, enter, giftOf, inside, isGate, leave, open,
} from '../secret.ts';
import { depthScale, roomsFor } from '../../data/secret.ts';
import { newState, validate, type State } from '../state.ts';

const T0 = 1_700_000_000;

const walker = (over: Partial<State> = {}): State => ({
  ...newState(T0), realm: 5, layer: 8, qi: 1e9, materials: 1e6,
  levels: { technique: 30, method: 30, pills: 30, cores: 30 },
  at: T0 + 10 * DOOR_GAP, startedAt: T0, runAt: T0, ...over,
} as State);

/**
 * 秘境 Seven rooms, and the one decision the whole thing is built on.
 *
 * Everything a room pays is banked the moment it is taken. That is what makes losing
 * cost nothing, what keeps a run's worth of loot out of the save, and what lets a
 * cultivator close the app in room four and come back to room four.
 */
describe('秘境 the secret realm', () => {
  it('is shut before the third realm, and opens on a clock that waits', () => {
    expect(canEnter(walker({ realm: OPENS_AT - 1 }))).toBe(false);
    const fresh = walker({ at: T0 + 60 });
    expect(canEnter(fresh)).toBe(false);
    expect(doorIn(fresh)).toBeGreaterThan(0);
    const later = walker({ at: T0 + DOOR_GAP });
    expect(canEnter(later)).toBe(true);
    expect(doorIn(later)).toBe(0);
    // 待 And it waits for ever rather than closing again.
    expect(canEnter(walker({ at: T0 + 400 * DOOR_GAP }))).toBe(true);
  });

  it('makes every other room a single gate, and never a gate first', () => {
    const s = enter(walker());
    expect(isGate(0)).toBe(false);
    for (let step = 0; step < ROOMS; step++) {
      const doors = doorsAt(s, step);
      expect(doors.length).toBe(isGate(step) ? 1 : 2);
      if (isGate(step)) expect(doors[0].kind).toBe('beast');
      // 擇 Two doors are always two different things, or it is not a choice.
      else expect(doors[0].kind).not.toBe(doors[1].kind);
    }
  });

  /** 換 Material comes off beasts and from nowhere else, which is what the wall is. */
  it('never pays 材 material, at any room or any depth', () => {
    const s = enter(walker());
    for (let step = 0; step < ROOMS; step++) {
      for (const room of doorsAt(s, step)) {
        expect(giftOf(s, room, step).materials, `${room.kind} at ${step}`).toBe(0);
      }
    }
  });

  /** 關 A gate that pays for its own key is not a gate. The repo's rule, applied here. */
  it('pays nothing at all for beating a gate', () => {
    let s = enter(walker());
    s = { ...s, runStep: 1 };                       // standing at the first gate
    expect(doorsAt(s, 1)[0].kind).toBe('beast');
    const before = { qi: s.qi, materials: s.materials, chest: s.chest.length,
      killed: { ...s.killed } };
    const after = open(s, 0, 12345);
    if (inside(after)) {                            // it was won
      expect(after.qi).toBe(before.qi);
      expect(after.materials).toBe(before.materials);
      expect(after.chest.length).toBe(before.chest);
      expect(after.killed).toEqual(before.killed);  // not a mark on 錄 the record
      expect(after.runStep).toBe(2);
    }
  });

  it('banks a room the moment it is opened, so losing takes nothing back', () => {
    let s = enter(walker());
    // Walk the first room, whatever it holds, and keep what it paid.
    const paid = open(s, 0, 7);
    expect(paid.qi + paid.metPoints * 1e9).toBeGreaterThanOrEqual(s.qi);
    // 失 A lost gate walks out, and everything already banked is still there.
    const weak = { ...enter(walker({ levels: { technique: 0, method: 0, pills: 0, cores: 0 } })),
      runStep: 1, qi: 12_345 } as State;
    const out = open(weak, 0, 3);
    if (!inside(out)) {
      expect(out.qi).toBe(weak.qi);
      expect(out.runStep).toBe(-1);
      expect(out.runs).toBe(weak.runs + 1);
    }
  });

  /**
   * 記 The tally is a record and not loot in flight, and the difference is testable:
   * the qi on it has already been paid into the save, so the two move together and a
   * run that ends badly keeps both.
   */
  it('counts what the run gave, and counts nothing it did not pay', () => {
    let s = enter(walker());
    expect(s.lastRun.rooms).toBe(0);
    expect(s.lastRun.qi).toBe(0);

    const before = { qi: s.qi, dao: s.metPoints, chest: s.chest.length };
    for (let i = 0; i < ROOMS && inside(s); i++) s = open(s, 0, 1000 + i * 17);

    // Every number on the tally is exactly what the save gained, to the qi.
    expect(s.lastRun.qi).toBe(s.qi - before.qi);
    expect(s.lastRun.dao).toBe(s.metPoints - before.dao);
    expect(s.lastRun.items.length).toBe(s.chest.length - before.chest);
    expect(s.lastRun.rooms).toBeGreaterThan(0);
    expect(s.lastRun.rooms).toBeLessThanOrEqual(ROOMS);
    // 關 A gate opened is a guardian put down, and there are three of them in seven.
    expect(s.lastRun.gates).toBeLessThanOrEqual(3);
  });

  it('says a guardian ended it, and keeps the rooms walked before it', () => {
    const weak = enter(walker({ levels: { technique: 0, method: 0, pills: 0, cores: 0 } }));
    let s: State = weak;
    for (let i = 0; i < ROOMS && inside(s); i++) s = open(s, 0, 4242 + i);
    if (s.lastRun.beaten) {
      expect(inside(s)).toBe(false);
      expect(s.qi).toBeGreaterThanOrEqual(weak.qi);
      expect(s.lastRun.qi).toBe(s.qi - weak.qi);
    }
  });

  /** A save is input: a forged tally cannot invent a piece of gear or a realm's qi. */
  it('rebuilds the tally from a save rather than trusting it', () => {
    const forged = validate({
      ...walker(), realm: 5,
      lastRun: { qi: -5, dao: 999, rooms: 40, gates: 99, beaten: 'yes',
        items: [{ template: 'nosuchthing', rarity: 'divine' }, { template: 'sword3', rarity: 'earth' }] },
    }, T0 + 10 * DOOR_GAP);
    expect(forged.lastRun.qi).toBe(0);
    // 深 The tally's own caps are the deepest path in the game, because a tally is a
    // record of a run that has already ended and the realm may have moved since.
    expect(forged.lastRun.dao).toBeLessThanOrEqual(DEEP_ROOMS * 2);
    expect(forged.lastRun.rooms).toBe(DEEP_ROOMS);
    expect(forged.lastRun.beaten).toBe(false);
    expect(forged.lastRun.items).toEqual([{ template: 'sword3', rarity: 'earth' }]);
  });

  it('walks out from anywhere and starts the clock, whichever way it ended', () => {
    const s = { ...enter(walker()), runStep: 3 } as State;
    const out = leave(s);
    expect(inside(out)).toBe(false);
    expect(out.runAt).toBe(s.at);
    expect(out.runs).toBe(s.runs + 1);
    expect(canEnter(out)).toBe(false);              // the wait is the same either way
  });

  it('draws the same path for the same save, and a new one for the next run', () => {
    const a = walker(), b = walker();
    for (let step = 0; step < ROOMS; step++) {
      expect(doorsAt(a, step).map((d) => d.kind)).toEqual(doorsAt(b, step).map((d) => d.kind));
    }
    const next = { ...a, runs: a.runs + 1 };
    const same = [0, 2, 4, 6].every((step) =>
      doorsAt(a, step)[0].kind === doorsAt(next, step)[0].kind);
    expect(same, 'the next run should not be the same path').toBe(false);
  });

  it('ramps the three gates out of your realm and into the one above', () => {
    const s = walker();
    expect(beastAt(s, 1).realm).toBe(s.realm);
    expect(beastAt(s, 3).realm).toBe(s.realm + 1);
    expect(beastAt(s, 5).realm).toBe(s.realm + 1);
  });

  it('refuses a save standing in a room its realm has never seen', () => {
    const early = validate({ ...newState(T0), realm: 2, runStep: 4 }, T0);
    expect(early.runStep).toBe(-1);
    const wild = validate({ ...newState(T0), realm: 5, runStep: 99, runs: -3 }, T0);
    expect(wild.runStep).toBeLessThanOrEqual(ROOMS - 1);
    expect(wild.runs).toBe(0);
  });
});

/**
 * 深 秘境深處 The deeper vault, which is what the seventh realm hands over.
 *
 * 隙 It exists because of a measurement rather than a wish: every system in the game
 * was open inside three weeks, and for the twenty-five days after that nothing new
 * arrived at all. The cheapest honest answer was a second gear on a system that
 * already had one.
 */
describe('深 the deeper vault', () => {
  it('walks seven rooms below the seventh realm and eleven from it', () => {
    expect(roomsFor(6)).toBe(ROOMS);
    expect(roomsFor(7)).toBe(DEEP_ROOMS);
    expect(roomsFor(9)).toBe(DEEP_ROOMS);
  });

  it('puts two more guardians on the longer path, because a gate is every other room', () => {
    const gates = (n: number) => [...Array(n).keys()].filter(isGate).length;
    expect(gates(ROOMS)).toBe(3);
    expect(gates(DEEP_ROOMS)).toBe(5);
  });

  it('keeps a deep walker inside past the seventh room, and a shallow one out', () => {
    const deep = { ...enter(walker({ realm: 7 })), runStep: 8 } as State;
    expect(inside(deep)).toBe(true);
    const shallow = { ...enter(walker({ realm: 5 })), runStep: 8 } as State;
    expect(inside(shallow)).toBe(false);
  });

  it('pays the deepest room the most, because that is what a run is for', () => {
    // 深 depthScale already rises with the step, so four more rooms are four richer
    // ones rather than four more of the same.
    expect(depthScale(DEEP_ROOMS - 1)).toBeGreaterThan(depthScale(ROOMS - 1));
  });

  it('refuses a fifth-realm save that claims to be standing in a deep room', () => {
    const forged = validate({ ...newState(T0), realm: 5, runStep: 9 }, T0 + 10 * DOOR_GAP);
    expect(forged.runStep).toBeLessThanOrEqual(ROOMS - 1);
  });

  /**
   * 道 The shrines pay into the same bank 緣 the meetings do, and `validate` capped that
   * bank at what the meetings alone could ever hand over: nine. So from about the fourth
   * walk on, every 道 point a shrine had ever paid was deleted on the next load, silently,
   * for ever. A save carrying forty came back holding nine.
   */
  it('keeps the 道 the shrines paid, rather than clipping it to the meetings’ own nine', () => {
    const now = T0 + 90 * 86400;
    const walked = validate({ ...newState(T0), at: now, realm: 7, metPoints: 40 }, now);
    expect(walked.metPoints).toBe(40);
    // 頂 And it is still a ceiling: it rides how many walks the wall clock could allow,
    // so a one-day-old save cannot come back holding a tree's worth of them.
    const forged = validate(
      { ...newState(now - 86400), at: now, realm: 7, metPoints: 4000 }, now,
    );
    expect(forged.metPoints).toBeLessThan(MEET_POINT_CEILING + 4 * RUN_DAO_CEILING);
  });
});
