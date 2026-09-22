import { beforeEach, describe, expect, it } from 'vitest';
import { exportSave, importSave, keepSpare, load, save, saveFileName, wipe } from '../save.ts';
import { newState, power, validate, type State } from '../state.ts';
import { advance, rate } from '../time.ts';

const T0 = 1_700_000_000;

/** A localStorage that exists only for the length of a test. */
function memoryStorage() {
  const map = new Map<string, string>();
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => { map.set(k, v); },
    removeItem: (k: string) => { map.delete(k); },
    clear: () => map.clear(),
    key: (i: number) => [...map.keys()][i] ?? null,
    get length() { return map.size; },
  };
}

const deep = (realm: number, layer: number): State => ({
  ...newState(T0), realm, layer, qi: 500, materials: 40,
});

beforeEach(() => {
  (globalThis as { localStorage?: unknown }).localStorage = memoryStorage();
});

describe('存 the save', () => {
  it('comes back the way it went in', () => {
    const before = deep(5, 3);
    save(before);
    const after = load(T0).state;
    expect(after.realm).toBe(5);
    expect(after.layer).toBe(3);
    expect(after.materials).toBe(40);
  });

  it('falls back to the spare when the main copy is gone', () => {
    keepSpare(deep(6, 4));
    localStorage.removeItem('ninefold.save.v1');
    expect(load(T0).state.realm).toBe(6);
  });

  it('falls back to the spare when the main copy went backwards', () => {
    /**
     * The accident this exists for: something writes a fresh state over a real one —
     * the very bug that cost a session early on, when the save effect ran with the empty
     * initial state. The only way the main key can be *behind* the spare is that it was
     * written over, so the deeper of the two wins.
     */
    keepSpare(deep(7, 2));
    save(newState(T0));
    expect(load(T0).state.realm).toBe(7);
  });

  it('keeps the main copy when it is the one further along', () => {
    keepSpare(deep(3, 0));
    save(deep(8, 5));
    expect(load(T0).state.realm).toBe(8);
  });

  it('survives storage that is broken, blocked or full of nonsense', () => {
    localStorage.setItem('ninefold.save.v1', 'not json at all');
    expect(load(T0).state.realm).toBe(1);

    localStorage.setItem('ninefold.save.v1', '{"v":99}');
    expect(load(T0).state.realm).toBe(1);

    (globalThis as { localStorage?: unknown }).localStorage = {
      getItem() { throw new Error('blocked'); },
      setItem() { throw new Error('blocked'); },
      removeItem() { throw new Error('blocked'); },
    };
    expect(() => save(deep(4, 1))).not.toThrow();
    expect(() => keepSpare(deep(4, 1))).not.toThrow();
    expect(() => wipe()).not.toThrow();
    expect(load(T0).state.realm).toBe(1);
  });

  it('exports something a person can carry away and bring back', () => {
    const before = deep(6, 7);
    const text = exportSave(before);
    expect(JSON.parse(text).game).toBe('ninefold');

    const { state, error } = importSave(text, T0);
    expect(error).toBeNull();
    expect(state?.realm).toBe(6);
    expect(state?.layer).toBe(7);

    // Whitespace from a copy-paste, and the inner half alone, both have to work: a
    // player who pastes what looks like the save is not wrong.
    expect(importSave(`\n  ${text}  \n`, T0).state?.realm).toBe(6);
    expect(importSave(JSON.stringify(before), T0).state?.realm).toBe(6);
  });

  it('refuses what is not a save, and says why in words', () => {
    for (const bad of ['', 'hello', '{oops', '[]', '{"game":"something else"}']) {
      const { state, error } = importSave(bad, T0);
      expect(state).toBeNull();
      expect(error).toBeTruthy();
      expect(error).toMatch(/[a-z]{3} [a-z]{2}/);        // a sentence, not a code
    }
    // An empty save is refused too, or a mispaste silently wipes a real one.
    expect(importSave(exportSave(newState(T0)), T0).state).toBeNull();
  });

  it('will not let an imported save claim what it never earned', () => {
    const forged = { ...deep(1, 0), qi: 1e30, materials: 1e30, stance: 'mirror',
                     sequence: ['dragon'], levels: { technique: 1e9, method: 0, pills: 0, cores: 0 } };
    const { state } = importSave(JSON.stringify(forged), T0);
    // It loads — but through the same gate every save goes through.
    expect(state?.stance).toBeNull();
    expect(state?.sequence).toEqual([]);
    expect(state?.qi).toBeLessThan(1e30);
  });

  it('names the file after where you had got to', () => {
    expect(saveFileName(deep(7, 0))).toMatch(/^ninefold-realm7-\d{4}-\d{2}-\d{2}\.json$/);
  });

  it('erases the spare too, or starting again does not', () => {
    save(deep(5, 5));
    keepSpare(deep(5, 5));
    wipe();
    expect(load(T0).state.realm).toBe(1);
  });
});

/**
 * 亂 A save that has been mangled, and the promise that it can never take the app down.
 *
 * "A save is input" is the rule, and `validate()` is where it is kept. That rule had
 * nine hand-written cases and no adversary. This is the adversary: a real save, taken
 * apart ten thousand ways with a seeded generator — fields deleted, retyped, made
 * negative, made Infinity, made an object where a number was, nested twenty deep, filled
 * with keys that do not exist — and after every one of them the game must still open.
 *
 * Nothing here is random in the sense that matters: the seed is fixed, so a failure is
 * a failure anybody can reproduce by running the suite again.
 */
describe('亂 a save that has been mangled', () => {
  /** A tiny seeded generator, so a break is reproducible rather than a story. */
  function rng(seed: number) {
    let x = seed >>> 0;
    return () => { x ^= x << 13; x ^= x >>> 17; x ^= x << 5; return ((x >>> 0) % 100000) / 100000; };
  }

  const JUNK: readonly unknown[] = [
    undefined, null, NaN, Infinity, -Infinity, -1, 0, 1e308, '', 'x'.repeat(500),
    'NaN', '1e999', true, false, [], {}, [[[[[1]]]]], { a: { b: { c: {} } } },
    { __proto__: { evil: 1 } }, Number.MAX_SAFE_INTEGER, -Number.MAX_SAFE_INTEGER,
  ];

  function mangle(value: unknown, pick: () => number, depth = 0): unknown {
    if (depth > 3 || pick() < 0.35) return JUNK[Math.floor(pick() * JUNK.length)];
    if (Array.isArray(value)) {
      return value.map((v) => mangle(v, pick, depth + 1)).slice(0, Math.ceil(pick() * 5));
    }
    if (value && typeof value === 'object') {
      const out: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(value)) {
        if (pick() < 0.2) continue;                       // drop the field entirely
        out[pick() < 0.1 ? `${k}${Math.floor(pick() * 9)}` : k] = mangle(v, pick, depth + 1);
      }
      if (pick() < 0.2) out[`ghost${Math.floor(pick() * 99)}`] = mangle({}, pick, depth + 1);
      return out;
    }
    return mangle(null, pick, depth + 1);
  }

  it('never throws, and always comes back as a cultivator the game can draw', () => {
    const real = {
      ...newState(T0), v: 1, realm: 5, layer: 4, qi: 1e9, materials: 4000,
      levels: { technique: 20, method: 20, pills: 20, cores: 20 },
      killed: { rat: 40, fox: 1 }, tower: 20,
      chest: [{ id: 'a', template: 'sword5', rarity: 'spirit', rolls: [{ affix: 'power', value: 9 }] }],
      seen: ['guide'],
    };
    const pick = rng(20260922);
    let worst: unknown = null;
    for (let i = 0; i < 10_000; i++) {
      const broken = mangle(real, pick);
      let held;
      try {
        held = validate(broken, T0 + 5);
      } catch (e) {
        worst = broken;
        throw new Error(`validate threw on ${JSON.stringify(worst).slice(0, 300)} — ${String(e)}`);
      }
      // Whatever came back has to be a cultivator: somewhere on the mountain, holding
      // numbers, with a chest and a record the screens can render without checking.
      expect(Number.isFinite(held.qi)).toBe(true);
      expect(held.qi).toBeGreaterThanOrEqual(0);
      expect(Number.isFinite(held.materials)).toBe(true);
      expect(held.materials).toBeGreaterThanOrEqual(0);
      expect(held.realm).toBeGreaterThanOrEqual(1);
      expect(held.realm).toBeLessThanOrEqual(9);
      expect(held.layer).toBeGreaterThanOrEqual(0);
      expect(held.layer).toBeLessThan(9);
      expect(Array.isArray(held.chest)).toBe(true);
      expect(Array.isArray(held.unlocked)).toBe(true);
      for (const n of Object.values(held.levels)) {
        expect(Number.isFinite(n)).toBe(true);
        expect(n).toBeGreaterThanOrEqual(0);
      }
      for (const n of Object.values(held.killed)) {
        expect(Number.isFinite(n)).toBe(true);
        expect(n).toBeGreaterThan(0);
      }
      // And the clock has to be able to move it without exploding.
      const later = advance(held, T0 + 5 + 86_400);
      expect(Number.isFinite(later.qi)).toBe(true);
      expect(Number.isFinite(rate(later))).toBe(true);
      expect(Number.isFinite(power(later))).toBe(true);
    }
    console.log('\n  亂 ten thousand mangled saves; every one opened and every one ticked\n');
  }, 120_000);

  /**
   * 針 And the same junk, aimed rather than scattered.
   *
   * The scattered pass above missed a real break: `killed` left without a floor under
   * it, so a save could come back holding minus four rats. Ten thousand random draws
   * never produced that shape, because a generator that rewrites a whole object a third
   * of the time rarely lands one bad number inside a record and leaves the rest alone.
   *
   * So every field the save has, and every field inside its records, is set to every
   * piece of junk in turn. It is a few hundred cases instead of ten thousand and it
   * catches what the ten thousand did not, which is the usual way round.
   */
  it('holds every single field against every kind of junk, one at a time', () => {
    const real = {
      ...newState(T0), v: 1, realm: 5, layer: 4, qi: 1e9, materials: 4000,
      levels: { technique: 20, method: 20, pills: 20, cores: 20 },
      killed: { rat: 40, fox: 1 }, tower: 20, tribulation: 0, tribulationAt: 0,
      worn: { weapon: { id: 'w', template: 'sword5', rarity: 'earth', rolls: [{ affix: 'power', value: 9 }] } },
      chest: [{ id: 'a', template: 'sword5', rarity: 'spirit', rolls: [{ affix: 'power', value: 9 }] }],
      brewed: { body: 2, bane: 1, fortune: 0 }, seen: ['guide'], unlocked: ['root'],
    };
    const paths: string[][] = [];
    for (const k of Object.keys(real)) paths.push([k]);
    for (const outer of ['levels', 'killed', 'brewed', 'worn'] as const) {
      for (const k of Object.keys(real[outer])) paths.push([outer, k]);
    }
    paths.push(['chest', '0'], ['worn', 'weapon', 'rolls']);

    let tried = 0;
    for (const path of paths) {
      for (const junk of JUNK) {
        const copy = JSON.parse(JSON.stringify(real)) as Record<string, unknown>;
        let node: Record<string, unknown> = copy;
        for (const key of path.slice(0, -1)) node = node[key] as Record<string, unknown>;
        node[path[path.length - 1]] = junk;
        tried += 1;
        const where = `${path.join('.')} = ${String(junk)}`;

        const held = validate(copy, T0 + 5);
        expect(Number.isFinite(held.qi), where).toBe(true);
        expect(held.qi, where).toBeGreaterThanOrEqual(0);
        expect(Number.isFinite(held.materials), where).toBe(true);
        expect(held.materials, where).toBeGreaterThanOrEqual(0);
        expect(held.realm, where).toBeGreaterThanOrEqual(1);
        expect(held.realm, where).toBeLessThanOrEqual(9);
        expect(held.layer, where).toBeGreaterThanOrEqual(0);
        expect(held.layer, where).toBeLessThan(9);
        expect(Number.isFinite(held.tower), where).toBe(true);
        expect(held.tower, where).toBeGreaterThanOrEqual(0);
        expect(Array.isArray(held.chest), where).toBe(true);
        expect(Array.isArray(held.unlocked), where).toBe(true);
        expect(Array.isArray(held.seen), where).toBe(true);
        for (const n of Object.values(held.levels)) {
          expect(Number.isFinite(n), where).toBe(true);
          expect(n, where).toBeGreaterThanOrEqual(0);
        }
        for (const n of Object.values(held.killed)) {
          expect(Number.isFinite(n), where).toBe(true);
          expect(n, where).toBeGreaterThan(0);
        }
        for (const n of Object.values(held.brewed)) {
          expect(Number.isFinite(n), where).toBe(true);
          expect(n, where).toBeGreaterThanOrEqual(0);
        }
        const later = advance(held, T0 + 5 + 86_400);
        expect(Number.isFinite(later.qi), where).toBe(true);
        expect(Number.isFinite(rate(later)), where).toBe(true);
        expect(Number.isFinite(power(later)), where).toBe(true);
      }
    }
    console.log(`\n  \u91DD ${tried} aimed mutations, one field at a time; every one opened and ticked\n`);
  }, 120_000);
});
