import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { CRAFTS, HUNT, KEY, LADDER, REALMCARD, READY, SECRET, standing } from '../copy.ts';
import { GLOSS } from '../glossary.ts';
import { arriving } from '../../sim/arriving.ts';
import { fallsFromLayer } from '../../sim/drops.ts';
import { BREAKTHROUGH_LEVEL, CRAFT_FEED_LEVEL, LAYERS_PER_REALM } from '../../sim/balance.ts';
import { opensIn, systemInfo } from '../../sim/unlocks.ts';
import { REALMS } from '../../data/realms.ts';
import { TRIOS } from '../../data/awakening.ts';

/**
 * 明 The clarity package (2026-10-13): seven places where the game named one thing two ways,
 * or named it and never said what it was. Each test holds one of them to the table it reads.
 */
describe('明 the game says one thing one way', () => {
  /**
   * 層 The hunt's gate line said "falls from layer 5, you are on layer 4" while the climb bar
   * and 境 the realm card both said 6 and 5: the hunt was printing the save's count from zero.
   */
  it('the hunt gate line and the realm card name the same layer for the lineage', () => {
    let checked = 0;
    for (const r of REALMS.filter((x) => x.n > 1)) {
      for (let opened = 0; opened < LAYERS_PER_REALM; opened++) {
        const gate = fallsFromLayer(r.n, r.n, opened);
        const coming = arriving(r.n, opened).find((a) => a.kind === 'gear');
        // The two must agree on whether the lineage is still owed at all.
        expect(gate === null, `realm ${r.n}, ${opened} opened`).toBe(coming === undefined);
        if (gate === null || !coming) continue;
        const line = HUNT.fallsFrom(gate, r.n, opened);
        const card = REALMCARD.comingAt(coming.layer + 1);
        expect(line).toContain(`Falls from ${card} of realm ${r.n}.`);
        // And "you are on" is the climb bar's own number.
        expect(line).toContain(`You are on layer ${standing(opened)}.`);
        expect(LADDER.layers(standing(opened), LAYERS_PER_REALM)).toBe(`layer ${standing(opened)}/${LAYERS_PER_REALM}`);
        checked++;
      }
    }
    // A harness that reached nothing passes: there must be gated layers in every realm from the second.
    expect(checked).toBeGreaterThanOrEqual(REALMS.length - 1);
  });

  /** 釋 A tapped 秘境 or 洞天 answered with the realm that opens it and nothing about the place. */
  it('a system tapped anywhere says what it is before when it opens', () => {
    for (const han of ['秘境', '洞天']) {
      const note = GLOSS[han].note ?? '';
      const sys = ['secret', 'cave'].map((k) => systemInfo(k as 'secret' | 'cave')).find((s) => s.han === han)!;
      expect(note.startsWith(sys.gives), han).toBe(true);
      expect(note).toMatch(/Opens at /);
    }
  });

  it('every realm is a term, with its number and what it opens', () => {
    for (const r of REALMS) {
      const t = GLOSS[r.han];
      expect(t, r.han).toBeDefined();
      expect(t.name).toBe(r.name);
      expect(t.note).toContain(`Realm ${r.n} of ${REALMS.length}.`);
      for (const s of opensIn(r.n)) expect(t.note).toContain(s.name);
    }
    expect(GLOSS['合體'].note).toBe('Realm 7 of 9. Opens The Deeper Rooms and Arrays.');
    // A realm that opens nothing says so, rather than borrowing its aura line.
    for (const r of REALMS.filter((x) => opensIn(x.n).length === 0)) {
      expect(GLOSS[r.han].note).toBe(`Realm ${r.n} of ${REALMS.length}. Opens no new system.`);
    }
  });

  /**
   * 數 秘境 tapped anywhere now answers with the system's own line, which a player reads at
   * every realm, so it cannot name a room count: seven at the third realm, eleven from the seventh.
   */
  it('the secret realm’s line names no room count', () => {
    expect(GLOSS['秘境'].note).not.toMatch(/\b(seven|eleven) rooms\b/i);
    expect(systemInfo('secret').gives).not.toMatch(/\b(seven|eleven) rooms\b/i);
  });

  /** 秘 The system is the secret realm: its name, its heading and the Realm Key all say so. */
  it('never calls the secret realm a vault where a player reads it', () => {
    // Every line of copy.ts that is not a comment, with the `vault:` keys taken off: a key
    // is an id the save and the server know, never a word on the screen.
    const said = readFileSync(new URL('../copy.ts', import.meta.url), 'utf8').split('\n')
      .filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l))
      .map((l) => l.replace(/^\s*vault:/, ''))
      .filter((l) => /\bvault\b/i.test(l));
    expect(said).toEqual([]);
    expect(READY.vault.short).toBe('Secret realm open');
    expect(systemInfo('deep').name).toBe('The Deeper Rooms');
    for (const s of ['secret', 'deep', 'alchemy', 'arrays'] as const) expect(systemInfo(s).gives).not.toMatch(/vault/i);
    expect(SECRET.what.startsWith('A door at the top of 狩 Hunt that opens every few hours.')).toBe(true);
  });

  /** 燎 A melting card said "more qi", and once the allowance is spent it pays material. */
  it('every melting card says the allowance, the material and that they add', () => {
    const cards = TRIOS.flat().filter((c) => c.effect.kind === 'salvage');
    expect(cards.length).toBeGreaterThanOrEqual(6);
    for (const c of cards) {
      expect(c.says, c.name).toContain('while the melting allowance lasts');
      expect(c.says, c.name).toContain('材 material once it is spent');
      expect(c.says, c.name).toContain('The allowance itself does not grow');
      expect(c.says, c.name).toContain('melting cards add together');
    }
  });

  /** 丹 What Alchemy is for, before it opens, read off the recipes' own levels. */
  it('says what Alchemy is for on its tile and in its unlock line, from the table', () => {
    const first = Math.min(...Object.keys(BREAKTHROUGH_LEVEL).map(Number));
    expect(CRAFTS.alchemyPill).toContain(`needs Alchemy ${BREAKTHROUGH_LEVEL[first]}`);
    expect(CRAFTS.alchemyPill).toContain('realm 5 to realm 8');
    // The tile already names Herb Gathering in its 'opens at' line, so only the unlock line adds it.
    expect(CRAFTS.alchemyPill).not.toContain('Herb Gathering');
    expect(systemInfo('alchemy').gives).toContain(CRAFTS.alchemyPill);
    expect(systemInfo('alchemy').gives.endsWith(`Herb Gathering ${CRAFT_FEED_LEVEL} opens Alchemy early for a head start.`)).toBe(true);
    expect(CRAFTS.opensLong('丹', 'Alchemy', 5, { name: 'Herb Gathering', level: 40 }, CRAFTS.alchemyPill))
      .toContain(CRAFTS.alchemyPill);
    expect(KEY.system('x.', '金丹', 'Golden Core')).toBe('x. Opens at 金丹 Golden Core.');
  });
});
