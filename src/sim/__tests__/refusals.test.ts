import { describe, expect, it } from 'vitest';
import { type Item } from '../../data/gear.ts';
import { DOOR_GAP } from '../../data/secret.ts';
import { INCENSE_HOLD } from '../balance.ts';
import { NO_CRAFTS, carry, spendKit, spendOnWin, type Used } from '../crafts.ts';
import { canUnlock } from '../dao.ts';
import { beatChallenger } from '../platform.ts';
import { freePoints } from '../points.ts';
import { doorsAt, enter, open, openByKind } from '../secret.ts';
import { newState, type State } from '../state.ts';
import { capRefuses, limitFor } from '../stash.ts';
import { clearFloor, standingFloor } from '../trials.ts';

const T0 = 1_700_000_000;

/**
 * 拒 A refused thing takes nothing. Three places the audit of 2026-10-05 found where the
 * sim said no and the player still paid, or got something other than what was tapped.
 */
describe('拒 a refusal costs nothing', () => {
  /** 業 A carried pill goes with a reward that landed, and stays when the sim refused it. */
  describe('業 the kit a won fight spends', () => {
    const used: Used = { elixir: 'might6@4', sigil: null };
    const hand = (over: Partial<State> = {}): State => carry({
      ...newState(T0), realm: 6, layer: 4, at: T0 + 30 * 86_400, ...over,
      crafts: { ...NO_CRAFTS, since: T0, pouch: { 'might6@4': 3 } },
    } as State, 'elixir', 'might6@4');

    it('stays in the pouch when the Platform refuses the challenger (the week turned)', () => {
      const s = hand();
      expect(s.crafts.carry.elixir).toBe('might6@4');
      // A tier that is not the one standing is refused, exactly as a week turning does.
      const after = beatChallenger(s, 2);
      expect(after).toBe(s);
      // The old composition spent the pill on a reward that never landed.
      expect(spendKit(after, used).crafts.pouch['might6@4']).toBe(2);
      expect(spendOnWin(s, after, used).crafts.pouch['might6@4']).toBe(3);
    });

    it('stays when a floor is refused, and goes when the floor counts', () => {
      const s = hand({ tower: 0 });
      const floor = standingFloor(s);
      const refused = clearFloor(s, floor + 3);
      expect(refused).toBe(s);
      expect(spendOnWin(s, refused, used).crafts.pouch['might6@4']).toBe(3);
      const climbed = clearFloor(s, floor);
      expect(climbed).not.toBe(s);
      const paid = spendOnWin(s, climbed, used);
      expect(paid.crafts.pouch['might6@4']).toBe(2);
      expect(paid.tower).toBe(floor);
    });
  });

  /** 門 The door tapped is the door opened, or none at all. */
  describe('門 a vault door is chosen by what it is', () => {
    const walker = (): State => enter({
      ...newState(T0), realm: 5, layer: 8, qi: 1e9, materials: 1e6,
      levels: { technique: 30, method: 30, pills: 30, cores: 30 },
      at: T0 + 10 * DOOR_GAP, startedAt: T0, runAt: T0, springAt: T0, spring: 0,
    } as State);

    /** A reward room offering incense in the middle and a third door after it. */
    const threeDoors = (): { s: State; step: number; third: string } => {
      for (let runs = 0; runs < 40; runs++) {
        const base = { ...walker(), runs };
        for (const step of [0, 2, 4, 6]) {
          const s = { ...base, runStep: step };
          const kinds = doorsAt(s, step).map((d) => d.kind);
          if (kinds.length === 3 && kinds[1] === 'incense') return { s, step, third: kinds[2] };
        }
      }
      throw new Error('no reward room with three doors found');
    };

    it('refuses incense that stopped fitting, rather than opening the door that slid into its place', () => {
      const { s, step, third } = threeDoors();
      // The burner fills between the frame and the tap: incense is no longer offered.
      const later: State = { ...s, incenseUntil: s.at + INCENSE_HOLD };
      expect(doorsAt(later, step).map((d) => d.kind)).toEqual(['spring', third]);
      // By position, the tap on the middle door opened the third one instead.
      expect(open(later, 1, 7).lastRun.picks?.at(-1)?.kind).toBe(third);
      // By kind, it is refused and nothing moves.
      expect(openByKind(later, { step, kind: 'incense' }, 7)).toBe(later);
      // And the third door, moved one place along, is still the one opened.
      expect(openByKind(later, { step, kind: third as never }, 7).lastRun.picks?.at(-1)?.kind).toBe(third);
    });

    it('refuses a tap meant for a room the walker has already left', () => {
      const { s, step } = threeDoors();
      expect(openByKind(s, { step: step + 2, kind: 'spring' }, 7)).toBe(s);
      expect(openByKind(s, { step, kind: 'spring' }, 7).runStep).toBe(step + 1);
    });
  });

  /** 空囊 Empty Pouch caps the chest at twelve, so it waits for a chest of twelve. */
  describe('空囊 a node that caps the chest', () => {
    const piece = (id: string): Item => ({ id, template: 'sword2', rarity: 'common', rolls: [{ affix: 'power', value: 5 }] });
    const path = ['root', 'gleaning', 'keeneye', 'pouch', 'defthands', 'goodluck'];
    const at = (n: number): State => ({
      ...newState(T0 - 30 * 86_400), at: T0, realm: 5, metPoints: 100, unlocked: path,
      chest: Array.from({ length: n }, (_, i) => piece(`p${i}`)),
    } as State);

    it('is refused over a chest fuller than its cap, and says how full', () => {
      const s = at(20);
      expect(canUnlock('emptypouch', s.unlocked, freePoints(s))).toBe(true);
      expect(limitFor(s)).toBeGreaterThan(12);
      expect(capRefuses(s, 'emptypouch')).toBe(12);
    });

    it('is allowed once the chest fits, and never refuses a node that adds room', () => {
      expect(capRefuses(at(12), 'emptypouch')).toBeNull();
      expect(capRefuses(at(20), 'treasury')).toBeNull();
      expect(capRefuses(at(20), 'favour')).toBeNull();
    });
  });
});
