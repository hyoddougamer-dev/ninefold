import { beforeEach, describe, expect, it } from 'vitest';
import { exportSave, importSave, keepSpare, load, save, saveFileName, wipe } from '../save.ts';
import { newState, type State } from '../state.ts';

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
