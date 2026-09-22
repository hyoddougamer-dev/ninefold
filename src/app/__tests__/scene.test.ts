import { describe, expect, it } from 'vitest';
import { REALMS } from '../../data/realms.ts';
import { FLOOR, arenaScene } from '../../art/scene.ts';
import { blowLine, verdictLine } from '../ui/blows.ts';

describe('境 the place a fight happens in', () => {
  it('gives every realm its own sky, and always the same one', () => {
    const skies = REALMS.map((r) => arenaScene(r.n));
    expect(new Set(skies).size).toBe(REALMS.length);
    // Same realm, same scenery: a horizon that reshuffles is scenery you cannot learn.
    for (const r of REALMS) expect(arenaScene(r.n)).toBe(arenaScene(r.n));
  });

  it('leaves no gap between the near ridge and the floor', () => {
    /**
     * The bug this exists for: the near ridge stopped eight pixels short of the floor,
     * and the lit bottom of the sky gradient showed through as a bright bar painted
     * across the window. The ridge is placed at FLOOR minus its own height, so the two
     * meet exactly. This asserts the arithmetic, not the picture.
     */
    const svg = arenaScene(6);
    const near = svg.match(/points="([^"]+)" fill="[^"]+" transform="translate\(0 (\d+)\)"/g) ?? [];
    expect(near.length).toBe(2);
    const last = near[near.length - 1];
    const top = Number(last.match(/translate\(0 (\d+)\)/)![1]);
    const height = Math.max(...last.match(/points="([^"]+)"/)![1]
      .split(' ').map((p) => Number(p.split(',')[1])));
    expect(top + height).toBe(FLOOR);
  });

  it('never draws a mote below the skyline', () => {
    const svg = arenaScene(9);
    const ys = [...svg.matchAll(/<circle cx="[\d.]+" cy="([\d.]+)"/g)].map((m) => Number(m[1]));
    expect(ys.length).toBeGreaterThan(0);
    for (const y of ys) expect(y).toBeLessThan(FLOOR - 100);
  });

  it('has more qi in the air the higher the realm', () => {
    const count = (n: number) => (arenaScene(n).match(/<circle /g) ?? []).length;
    expect(count(9)).toBeGreaterThan(count(1));
  });
});

describe('話 what the blow is called', () => {
  it('never tells you your own footing went while you are the one swinging', () => {
    const mine = new Set<string>();
    const theirs = new Set<string>();
    for (let round = 0; round < 24; round++) {
      mine.add(blowLine('player', round).han);
      theirs.add(blowLine('beast', round).han);
    }
    // The two registers must not overlap at all: one pool cycled between strikers is
    // exactly the bug this separation exists to prevent.
    for (const han of mine) expect(theirs.has(han)).toBe(false);
    expect(mine.size).toBeGreaterThan(3);
    expect(theirs.size).toBeGreaterThan(3);
  });

  it('is fixed for a round, so a re-render cannot reshuffle it mid-blow', () => {
    expect(blowLine('player', 5)).toEqual(blowLine('player', 5));
    expect(blowLine('player', 5)).not.toEqual(blowLine('player', 6));
  });

  it('says something different for a warden than for a common beast', () => {
    expect(verdictLine(true, true).han).not.toBe(verdictLine(true, false).han);
    expect(verdictLine(false, true)).toEqual(verdictLine(false, false));
  });
});
