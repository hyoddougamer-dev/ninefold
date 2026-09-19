import { describe, expect, it } from 'vitest';
import { ARTS, SEQUENCE_SLOTS, STANCES, WARDEN_ART } from '../../data/arts.ts';
import { WARDENS, wardenOf } from '../../data/bestiary.ts';
import { beastPower, odds } from '../combat.ts';
import { artsHeld, sequenceOf, stanceOf, validateSequence, validateStance } from '../arts.ts';
import { newState, power, validate, type State } from '../state.ts';

const REALM = 6;
const KILLED_ALL = Object.fromEntries(Object.keys(WARDEN_ART).map((k) => [k, 1]));

/** A cultivator of a given power, so only the build varies between measurements. */
function at(pow: number, stance: string | null, sequence: string[]): State {
  const ladder = (REALM - 1) * 9 + 9;
  return {
    ...newState(0),
    realm: REALM,
    layer: 8,
    levels: { technique: Math.log(pow / ladder) / Math.log(1.18), method: 0, pills: 0, cores: 0 },
    killed: KILLED_ALL,
    stance,
    sequence,
  };
}

/** The share of the warden's power at which the fight is a coin flip. Lower is stronger. */
function evenAt(stance: string | null, sequence: string[]): number {
  const bp = beastPower(wardenOf(REALM));
  let lo = 0.1;
  let hi = 6;
  for (let i = 0; i < 22; i++) {
    const mid = (lo + hi) / 2;
    if (odds(at(bp * mid, stance, sequence), wardenOf(REALM)) < 0.5) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

describe('勢 and 訣', () => {
  it('gives one stance and one art to every realm, and no two alike', () => {
    expect(STANCES.length).toBe(9);
    expect(ARTS.length).toBe(9);
    expect(new Set(STANCES.map((s) => s.realm)).size).toBe(9);
    expect(new Set(ARTS.map((a) => a.realm)).size).toBe(9);
    expect(new Set(STANCES.map((s) => s.han)).size).toBe(9);
    expect(new Set(ARTS.map((a) => a.han)).size).toBe(9);
    // Every warden hands over exactly one art, and every art has a warden.
    expect(Object.keys(WARDEN_ART).length).toBe(WARDENS.length);
    for (const w of WARDENS) expect(WARDEN_ART[w.key]).toBeDefined();
    expect(new Set(Object.values(WARDEN_ART)).size).toBe(ARTS.length);
  });

  it('holds an art only once its warden has fallen', () => {
    expect(artsHeld({})).toHaveLength(0);
    expect(artsHeld({ fox: 1 }).map((a) => a.key)).toEqual(['fox']);
    expect(artsHeld({ fox: 1, dragon: 2 }).map((a) => a.key)).toEqual(['fox', 'dragon']);
    // A beast that is not a warden gives nothing, and a zero is not a kill.
    expect(artsHeld({ rat: 9, fox: 0 })).toHaveLength(0);
  });

  it('will not let a save claim what it never earned', () => {
    // 龍威 at realm 1, in a save that never met a warden, walks over the whole game.
    const forged = validate({
      ...newState(0), v: 1, realm: 1, stance: 'mirror', sequence: ['dragon', 'wolf'],
    }, 0);
    expect(forged.stance).toBeNull();
    expect(forged.sequence).toEqual([]);

    expect(validateStance('mirror', 9)).toBe('mirror');
    expect(validateStance('mirror', 8)).toBeNull();     // its realm is not reached
    expect(validateStance('nonsense', 9)).toBeNull();
    expect(validateStance(42, 9)).toBeNull();

    expect(validateSequence(['tiger', 'tiger', 'ape'], KILLED_ALL)).toEqual(['tiger', 'ape']);
    expect(validateSequence(['a', 'b', 'c', 'd', 'tiger'], KILLED_ALL)).toEqual(['tiger']);
    expect(validateSequence(['tiger'], {})).toEqual([]);
    expect(validateSequence('tiger', KILLED_ALL)).toEqual([]);
  });

  it('runs a rotation of fixed length, so filling it is always worth more', () => {
    const run = (keys: string[]) =>
      sequenceOf({ realm: 9, killed: KILLED_ALL, stance: null, sequence: keys });

    expect(run([])).toHaveLength(SEQUENCE_SLOTS);
    expect(run(['tiger'])).toHaveLength(SEQUENCE_SLOTS);
    expect(run(['tiger'])[0]?.key).toBe('tiger');
    expect(run(['tiger'])[1]).toBeNull();
    expect(run(['a', 'tiger', 'ape'])[0]?.key).toBe('tiger');   // unknown keys fall out

    /**
     * The bug this exists for: the rotation used to be as long as the arts placed, so a
     * lone 虎嘯 fired every round and three arts fired every third. A single art measured
     * 1.43× power and a full sequence only 1.33× — a full sequence was a downgrade.
     */
    const one = evenAt(null, ['tiger']);
    const two = evenAt(null, ['tiger', 'ape']);
    const three = evenAt(null, ['tiger', 'ape', 'wolf']);
    console.log(`\n  訣 even at: one art ${one.toFixed(2)}× · two ${two.toFixed(2)}× ` +
      `· three ${three.toFixed(2)}× of the warden's power\n`);
    expect(two).toBeLessThan(one);
    expect(three).toBeLessThan(two);
  });

  it('prints what each stance is worth, and keeps them all in a band', () => {
    const bare = evenAt(null, []);
    const rows = STANCES.filter((s) => s.realm <= REALM).map((s) => {
      const worth = bare / evenAt(s.key, []);
      return { s, worth };
    });
    console.log(`\n  勢 against the ${wardenOf(REALM).han} warden, worth in power:\n` +
      rows.map(({ s, worth }) => `    ${s.han} ${s.name.padEnd(10)} ×${worth.toFixed(2)}`).join('\n') + '\n');

    // No stance may be a trap, and none may be the obvious answer to everything.
    for (const { worth } of rows) {
      expect(worth).toBeGreaterThan(0.9);
      expect(worth).toBeLessThan(1.6);
    }
  });

  it('is worth about a realm of upgrades, and no more', () => {
    const bare = evenAt(null, []);
    const full = evenAt('endure', ['crane', 'tiger', 'wolf']);
    const worth = bare / full;
    console.log(`\n  a whole build — 續 with 鶴唳 虎嘯 狼噬 — is worth ×${worth.toFixed(2)} power\n`);
    // Enough that it decides a warden fight, not so much that upgrades stop mattering.
    expect(worth).toBeGreaterThan(1.3);
    expect(worth).toBeLessThan(2.6);
  });

  it('moves the fight without touching what the screen calls your power', () => {
    const bp = beastPower(wardenOf(REALM));
    const plain = at(bp, null, []);
    const armed = at(bp, 'endure', ['crane', 'tiger', 'wolf']);
    // 力 is what you spent qi on. A stance is not power, and must not pretend to be.
    expect(power(armed)).toBeCloseTo(power(plain), 6);
    expect(odds(armed, wardenOf(REALM))).toBeGreaterThan(odds(plain, wardenOf(REALM)));
    expect(stanceOf(armed)?.key).toBe('endure');
  });
});
