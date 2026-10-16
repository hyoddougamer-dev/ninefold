import { describe, expect, it } from 'vitest';
import { SECT_KEY, sectNotice, shownOf, withShown } from '../sect.ts';
import { validate } from '../../sim/load.ts';

/**
 * 升 The one card a sect rank brings, with the carving that came in the same sync (sect.ts).
 * What is held: one card per rise, never one for Outer Disciple, never two in a row for one
 * sync, and one key in `seen` however many ranks and gates it has shown, because load.ts keeps
 * at most 32 keys and a dropped key would bring its card back on every visit.
 */
const seenAfter = (seen: string[], word: Parameters<typeof sectNotice>[1]) => {
  const n = sectNotice(seen, word);
  return n ? withShown(seen, n.key) : seen;
};

describe('升 the sect rank card', () => {
  it('says nothing before the switch, for Outer Disciple, or for what was already shown', () => {
    expect(sectNotice([], null)).toBeNull();
    expect(sectNotice([], { rung: null, carved: null, name: 'Kestrel' })).toBeNull();
    expect(sectNotice([], { rung: 0, carved: [], name: 'Kestrel' })).toBeNull();
    expect(sectNotice(['sect:2:7'], { rung: 2, carved: [{ gate: 1, rank: 4 }, { gate: 2, rank: 9 }, { gate: 3, rank: 12 }] })).toBeNull();
  });

  it('brings a rise and the carving through its gate in one card', () => {
    const n = sectNotice(['sect:1:3'], { rung: 2, carved: [{ gate: 1, rank: 4 }, { gate: 2, rank: 9 }, { gate: 3, rank: 12 }], name: 'Kestrel' })!;
    expect(n.title).toBe('The sect raises you to Core Disciple 核心弟子');
    expect(n.han).toBe('核');
    expect(n.text).toBe("Your arrival in Nascent Soul is checked. Your name is carved 12th through the Immortal Crane's gate on 題名崖 the Cliff of Names.");
    expect(n.key).toBe('sect:2:7');
  });

  it('carries a carving alone in the Cliff\'s own words, and a rise past the first 81 alone', () => {
    const alone = sectNotice(['sect:1:1'], { rung: 1, carved: [{ gate: 1, rank: 4 }, { gate: 2, rank: 21 }] })!;
    expect(alone.title).toBe('題名崖 Your name is on the Cliff');
    expect(alone.text).toBe("You are carved 21st through the Stone Ape's gate.");
    const late = sectNotice([], { rung: 1, carved: [] })!;
    expect(late.text).toBe('Your arrival in Foundation is checked.');
  });

  it('after a long absence, one card for the highest new rank and a count of the other gates', () => {
    const n = sectNotice(['guide', 'whom'], {
      rung: 3, name: 'Kestrel',
      carved: [1, 2, 3, 4, 5].map((gate) => ({ gate, rank: 40 + gate })),
    })!;
    expect(n.title).toMatch(/True Disciple 真傳弟子$/);
    expect(n.text).toBe("Your arrival in Void Refining is checked. Your name is carved 45th through the Black Turtle's gate on 題名崖 the Cliff of Names. And through 4 more gates.");
    expect(n.key).toBe('sect:3:31');
  });

  it('asks a 修士 name once more, inside the same card', () => {
    const n = sectNotice([], { rung: 1, carved: [{ gate: 1, rank: 2 }], name: '修士 0B5E' })!;
    expect(n.text).toMatch(/Choose your own name in 榜 Ranks, and the Cliff carves it\.$/);
  });

  it('keeps one key in seen through the whole climb, so it never runs out of room', () => {
    let seen = ['guide', 'whom'];
    const carved: { gate: number; rank: number }[] = [];
    let cards = 0;
    for (let score = 0; score <= 100; score++) {
      const rung = [9, 27, 45, 63, 81, 85, 90, 100].filter((t) => score >= t).length;
      for (let g = 1; g <= 8; g++) if (score >= 9 * g && !carved.some((c) => c.gate === g)) carved.push({ gate: g, rank: 10 + g });
      if (score >= 81 && !carved.some((c) => c.gate === 9)) carved.push({ gate: 9, rank: 30 });
      const before = seen;
      seen = seenAfter(seen, { rung, carved: [...carved] });
      if (seen !== before) cards++;
      // Read twice, and the second read is silent.
      expect(sectNotice(seen, { rung, carved: [...carved] }), `score ${score}`).toBeNull();
    }
    expect(seen.filter((k) => k.startsWith(SECT_KEY))).toEqual(['sect:8:511']);
    // Eight rises; the even gates 2, 4, 6 and 8 come alone. Twelve cards over the whole climb.
    expect(cards).toBe(12);
    expect(shownOf(seen)).toEqual({ rung: 8, gates: 511 });
    // And the save keeps it: validate() holds the key within its length.
    expect(validate({ v: 1, season: 's0', at: 1_800_000_000, startedAt: 1_799_000_000, realm: 1, layer: 0, qi: 0, seen }, 1_800_000_000).seen).toContain('sect:8:511');
  });

  it('reads nonsense from the server or a forged key as nothing', () => {
    expect(sectNotice(['sect:x:y'], { rung: 'nine', carved: [{ gate: 12, rank: 1 }, { gate: 1, rank: 400 }] as never })).toBeNull();
    expect(shownOf(['sect:9:9999'])).toEqual({ rung: 0, gates: 0 });
    expect(shownOf(['sect:9:999'])).toEqual({ rung: 8, gates: 999 & 511 });
  });
});
