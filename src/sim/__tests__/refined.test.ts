import { describe, expect, it } from 'vitest';
import { GEAR, SLOTS, baseValue, type Item, type Slot } from '../../data/gear.ts';
import { equip, unequip } from '../chest.ts';
import { wearBetter } from '../inspect.ts';
import { salvage, salvageUpTo } from '../salvage.ts';
import { saveSet, setLocked, wearSet } from '../sets.ts';
import { fuseAllIn } from '../stash.ts';
import { newState, power, validate, type State } from '../state.ts';
import { verify, GAME_EPOCH } from '../verify.ts';
import { HABITS, play } from '../../../tools/habits.ts';
import { sync, type Saved, type Store } from '../../../supabase/functions/sync/core.ts';

/**
 * 承 Refining belongs to the place on the body (State.refined), and nothing done to a
 * piece can reach it.
 *
 * rekaris, on the Discord: *"Why do you save refining count on the gear itself when its
 * actually shared for everything? It would be much less bug-prone if you had refining
 * levels linked to completely separate structure."* Both refining bugs had come from the
 * levels living on the piece: a refined piece taken off and melted took its levels with
 * it, and two fused pieces with one name traded levels by mistake.
 *
 * Three promises are held here: an old save loads with nothing lost, nothing done to a
 * piece moves a level, and the ranked server, which keeps the last save it verified in the
 * old shape, reads the new shape against it as the same cultivator.
 */
const T0 = 1_700_000_000;
const DAY = 86_400;

/** A plain piece of a place and realm, a 力 one where there is one: its own line at the rank's base. */
const piece = (id: string, slot: Slot, realm: number, rarity: Item['rarity'] = 'earth'): Item => {
  const tpl = GEAR.find((g) => g.slot === slot && g.realm === realm && g.affix === 'power')
    ?? GEAR.find((g) => g.slot === slot && g.realm === realm)!;
  return { id, template: tpl.key, rarity, rolls: [{ affix: tpl.affix, value: baseValue(tpl, rarity, tpl.affix) }] };
};

/** A save as the game wrote it before 2026-10-06: the levels on the worn pieces, no record. */
function oldShape(s: State): Record<string, unknown> {
  const o = structuredClone(s) as unknown as Record<string, unknown>;
  const worn = o.worn as Record<string, Record<string, unknown>>;
  for (const slot of SLOTS) if (worn[slot] && (s.refined[slot] ?? 0) > 0) worn[slot].refine = s.refined[slot];
  delete o.refined;
  return o;
}

describe('承 an old save loads with nothing lost', () => {
  // What an old save could honestly hold: a worn sword at 12; the sword it replaced, which
  // kept the lower count when the two traded; and boots taken off at 7 with nothing put on
  // in their place, which the old rule left holding every level.
  const old = {
    ...newState(T0), realm: 6, layer: 4, at: T0, startedAt: T0 - 60 * DAY, tower: 60,
    worn: {
      weapon: { ...piece('w', 'weapon', 5), refine: 12 },
      robe: piece('r', 'robe', 5),
    },
    chest: [
      { ...piece('was', 'weapon', 4), refine: 5 },
      { ...piece('b', 'boots', 5), refine: 7 },
      piece('junk', 'ring', 3, 'common'),
    ],
  };
  const v = validate(JSON.parse(JSON.stringify(old)), T0);

  it('gives each place the most any one of its pieces held, worn or in the chest', () => {
    expect(v.refined).toEqual({ weapon: 12, boots: 7 });
    // Every piece the old rule could have put on is matched: it took the higher of its own
    // count and the worn piece's, and the place has at least that.
    for (const raw of [...Object.values(old.worn), ...old.chest] as (Item & { refine?: number })[]) {
      const slot = GEAR.find((g) => g.key === raw.template)!.slot;
      expect(v.refined[slot] ?? 0).toBeGreaterThanOrEqual(raw.refine ?? 0);
    }
  });

  it('keeps every piece, and none of them holds a level any more', () => {
    expect(v.chest.map((x) => x.id)).toEqual(['was', 'b', 'junk']);
    for (const it of [...Object.values(v.worn), ...v.chest]) expect(it && 'refine' in it).toBe(false);
  });

  it('is as strong as it was, and the boots taken off at 7 go back on at 7', () => {
    // The worn body's own levels: the same sword at the same twelve.
    const byHand: State = { ...v, refined: { weapon: 12 } };
    expect(power(v)).toBe(power(byHand));
    const boots = equip(v.worn, v.chest, v.chest[1], 'boots');
    const dressed: State = { ...v, worn: boots.worn, chest: [...boots.chest] };
    expect(power(dressed)).toBeGreaterThan(power({ ...dressed, refined: { weapon: 12 } }));
  });

  it('loads the same again, so a save rewritten on unload loses nothing on the next load', () => {
    const again = validate(JSON.parse(JSON.stringify(v)), T0);
    expect(again.refined).toEqual(v.refined);
    expect(again.worn).toEqual(v.worn);
    expect(again.chest).toEqual(v.chest);
  });

  it('takes the higher when a record and a level on a piece disagree', () => {
    // A copy of the game from before the change, still open in another tab, writes the
    // levels back onto the pieces: whichever is higher wins, so neither copy loses.
    const mixed = { ...JSON.parse(JSON.stringify(v)), refined: { weapon: 9, ring: 3 } };
    mixed.worn.weapon.refine = 14;
    expect(validate(mixed, T0).refined).toEqual({ weapon: 14, ring: 3 });
  });
});

describe('承 nothing done to a piece moves a level', () => {
  const levels = { weapon: 9, ring: 4, boots: 3 } as const;
  const start: State = {
    ...newState(T0), realm: 6, layer: 4, at: T0, startedAt: T0 - 60 * DAY, tower: 60,
    worn: { weapon: piece('w', 'weapon', 5), ring: piece('r', 'ring', 5), robe: piece('o', 'robe', 5) },
    chest: [
      piece('w2', 'weapon', 6, 'heaven'), piece('k', 'boots', 5),
      piece('c1', 'robe', 4, 'common'), piece('c2', 'robe', 4, 'common'), piece('c3', 'robe', 4, 'common'),
    ],
    refined: levels,
  };

  it('taking off, putting on, melting, fusing, wearing all upgrades and a loadout', () => {
    const takeOff = (s: State, slot: Slot): State => {
      const t = unequip(s.worn, s.chest, slot);
      return { ...s, worn: t.worn, chest: [...t.chest] };
    };
    const steps: [string, (s: State) => State][] = [
      ['take the weapon off', (s) => takeOff(s, 'weapon')],
      ['put another on', (s) => {
        const on = equip(s.worn, s.chest, s.chest.find((x) => x.id === 'w2')!, 'weapon');
        return { ...s, worn: on.worn, chest: [...on.chest] };
      }],
      ['melt the one taken off', (s) => salvage(s, ['w'])],
      ['take the ring off and melt it', (s) => salvage(takeOff(s, 'ring'), ['r'])],
      ['fuse every group', (s) => fuseAllIn(s).state],
      ['wear all upgrades', (s) => wearBetter(s).state],
      ['save a loadout and put it on', (s) => wearSet(saveSet(s, 0, 'Fight'), 0).state],
      ['unlock and melt everything', (s) => salvageUpTo(s.chest.reduce((t, x) => setLocked(t, x.id, false), s), 'heaven')],
    ];
    let s = start;
    for (const [what, step] of steps) {
      s = step(s);
      expect(s.refined, what).toEqual(levels);
      // And the save written after it loads the same levels.
      expect(validate(JSON.parse(JSON.stringify(s)), T0).refined, `${what}, reloaded`).toEqual(levels);
    }
    // The ring's place is empty, and its four levels wait for the next ring.
    expect(s.worn.ring).toBeUndefined();
    expect(s.refined.ring).toBe(4);
  });
});

describe('驗 the ranked server reads the new shape against the old', () => {
  // The harness's active cultivator, who refines, moved so the save begins at the epoch.
  const shots: { day: number; s: State }[] = [];
  play(HABITS.find((h) => h.name === 'active')!, 24, (day, s) => shots.push({ day, s: structuredClone(s) }));
  const shift = GAME_EPOCH + 3600 - shots[0].s.startedAt;
  const walked = shots.map(({ day, s }) => ({ day, s: { ...s, startedAt: s.startedAt + shift, at: s.at + shift } }));

  it('refines in the walk, or this measures nothing', () => {
    expect(walked.length).toBeGreaterThan(60);
    const deepest = Math.max(...SLOTS.map((x) => walked[walked.length - 1].s.refined[x] ?? 0));
    expect(deepest).toBeGreaterThan(5);
  });

  it('loads an old-shaped save as the very same cultivator as the new-shaped one', () => {
    for (const { s } of walked) {
      const now = s.at + 30;
      expect(validate(oldShape(s), now)).toEqual(validate(JSON.parse(JSON.stringify(s)), now));
    }
  });

  it('gives the same verdict whichever shape the verified save is in', () => {
    let checked = 0;
    for (let i = 1; i < walked.length; i++) {
      const a = walked[i - 1], b = walked[i];
      const now = b.s.at + 30;
      const after = validate(JSON.parse(JSON.stringify(b.s)), now);
      const fromOld = verify(validate(oldShape(a.s), now), after, (b.day - a.day) * DAY);
      const fromNew = verify(validate(JSON.parse(JSON.stringify(a.s)), now), after, (b.day - a.day) * DAY);
      expect(fromOld).toEqual(fromNew);
      expect(fromOld.strike).toBe(false);
      checked++;
    }
    expect(checked).toBeGreaterThan(60);
  });

  it('syncs a cultivator who updates the game halfway through: never struck, never flagged', async () => {
    const saves = new Map<string, Saved>();
    let strikes = 0;
    let suspect = false;
    const store: Store = {
      async claim() { return 0; },
      async mark(_id, strike, sus) { strikes += strike ? 1 : 0; suspect ||= sus; return { name: 'x', strikes, suspect, banned: false }; },
      async profile() { return { name: 'x', strikes, suspect, banned: false }; },
      async barred() { return null; },
      async saved(id) { return saves.get(id) ?? null; },
      async standing() { return null; },
      async writeProfile() {},
      async writeSaved(id, s) { saves.set(id, structuredClone(s)); },
      async writeStanding() {},
      async log() {},
      async closeWeek() {},
      async lastClosed() { return 0; },
    };
    const half = Math.floor(walked.length / 2);
    let verified = 0;
    for (let i = 0; i < walked.length; i++) {
      const { s } = walked[i];
      // The first half is sent by the old game, the rest by the new one.
      const raw = i < half ? oldShape(s) : JSON.parse(JSON.stringify(s));
      const r = await sync(store, 'u', raw, s.at + 30, 'Tester', GAME_EPOCH);
      expect(r.status).toBe(200);
      if (r.status === 200 && r.body.state === 'verified') verified++;
    }
    expect(strikes).toBe(0);
    expect(suspect).toBe(false);
    expect(verified).toBeGreaterThan(walked.length / 2);
    // And the cloud copy holds the levels in the new shape.
    const kept = validate(saves.get('u')!.latest, walked[walked.length - 1].s.at + 60);
    expect(kept.refined).toEqual(walked[walked.length - 1].s.refined);
  });
});
