import { describe, expect, it } from 'vitest';
import { BEASTS, commonsOf, wardenOf } from '../../data/bestiary.ts';
import { LAYERS_PER_REALM, levelCap } from '../balance.ts';
import { beastPower, fight, odds, referencePower } from '../combat.ts';
import { newState, power, type State } from '../state.ts';
import { ARTS, STANCES } from '../../data/arts.ts';

const T0 = 1_700_000_000;

/**
 * A cultivator at the *top* of the given realm — all nine layers open — having spent
 * nothing on upgrades. The top matters: it is what referencePower measures against, and
 * measuring a realm's floor against the reference for its ceiling loses half a ladder.
 *
 * It is built rather than simulated. Simulating it means simulating a cultivator who
 * never spends, and one of those never reaches the fourth realm at all — which is the
 * whole finding that rebuilt the curve.
 */
function bare(realm: number): State {
  return { ...newState(T0), realm, layer: LAYERS_PER_REALM - 1 };
}

/**
 * The player in the middle: at the realm's ceiling, two levels of 劍訣 short of the cap.
 *
 * Levels below the cap, not a share of qi earned. The cap is the honest yardstick now,
 * because it is the ceiling on what a cultivator of that realm can possibly hold, and
 * because every upgrade price rides the mountain rather than a ladder of its own.
 */
function invested(realm: number, below = 2): State {
  return {
    ...bare(realm),
    levels: {
      technique: Math.max(0, levelCap(realm) - below), method: 0, pills: 0, cores: 0,
    },
  };
}

/**
 * The same cultivator, but actually built: standing in a stance and running a sequence.
 *
 * This is the honest picture of a player at a warden. `invested` alone is a cultivator
 * who bought 劍訣 and nothing else — no stance, no arts, no gear, no tree. Measuring the
 * warden against *that* is measuring it against a floor nobody stands on.
 */
function built(realm: number, below = 2): State {
  const s = invested(realm, below);
  const stance = [...STANCES].reverse().find((x) => x.realm <= realm)!;
  const arts = ARTS.filter((a) => a.realm <= realm).slice(-3);
  return {
    ...s,
    stance: stance.key,
    sequence: arts.map((a) => a.key),
    // The arts are held because their wardens fell, which is how the game grants them.
    killed: Object.fromEntries(arts.map((a) => [
      { 1: 'fox', 2: 'ape', 3: 'crane', 4: 'tiger', 5: 'turtle',
        6: 'golem', 7: 'direwolf', 8: 'jiao', 9: 'dragon' }[a.realm]!, 1,
    ])),
  };
}

describe('戰 the beasts', () => {
  it('prints the power table and keeps the ladder climbing', () => {
    const rows = [1, 2, 3, 4, 5, 6, 7, 8, 9].map((r) => {
      const s = bare(r);
      const g = wardenOf(r);
      return `  realm ${r}  cultivator ${power(s).toFixed(0).padStart(7)}` +
        `   common ${beastPower(commonsOf(r)[0]).toFixed(0).padStart(7)}` +
        `   ${g.han} warden ${beastPower(g).toFixed(0).padStart(8)}` +
        `   odds ${(100 * odds(s, g)).toFixed(0)}%`;
    });
    console.log(`\n${rows.join('\n')}\n`);

    for (let r = 2; r <= 9; r++) {
      expect(beastPower(wardenOf(r))).toBeGreaterThan(beastPower(wardenOf(r - 1)));
    }
  });

  it('a warden is not beaten by qi alone — it is beaten by a build', () => {
    const rows = [2, 4, 6, 8, 9].map((r) => {
      const g = wardenOf(r);
      return `  realm ${r}  ${g.han.padEnd(2)} warden` +
        `   no 劍訣 ${(100 * odds(bare(r), g)).toFixed(0).padStart(3)}%` +
        `   two short of the cap ${(100 * odds(invested(r), g)).toFixed(0).padStart(3)}%` +
        `   the same, built ${(100 * odds(built(r), g)).toFixed(0).padStart(3)}%` +
        `   at the cap ${(100 * odds(invested(r, 0), g)).toFixed(0).padStart(3)}%`;
    });
    console.log(`\n${rows.join('\n')}\n`);

    for (const r of [2, 4, 6, 8]) {
      const g = wardenOf(r);
      // Spending nothing is never enough.
      expect(odds(bare(r), g)).toBeLessThan(0.15);
      // The middling spender has a slim chance and usually has to come back.
      expect(odds(invested(r), g)).toBeLessThan(0.4);
      // The same cultivator with a stance and a sequence gets through. This is the whole
      // reason 勢 and 訣 exist: they are the difference between the wall and the door.
      expect(odds(built(r), g)).toBeGreaterThan(odds(invested(r), g) + 0.25);
      // And heavy spending still works on its own, for a player who would rather grind.
      expect(odds(invested(r, 0), g)).toBeGreaterThan(0.35);
    }
  });

  it('commons are hunting, not a wall — and three steps, not three identical buttons', () => {
    // The three commons of a realm are separated by *power*, which is the invariant. The
    // odds cannot show it because a middling cultivator beats all three comfortably —
    // that is what makes them hunting rather than a wall. The difference is felt as how
    // long the fight runs.
    for (const r of [1, 3, 5, 7, 9]) {
      const s = invested(r);
      for (const c of commonsOf(r)) expect(odds(s, c)).toBeGreaterThan(0.45);
      const powers = commonsOf(r).map((c) => beastPower(c));
      expect(Math.max(...powers) / Math.min(...powers)).toBeGreaterThan(1.5);
    }
    const s = invested(5);
    console.log(`\n  realm 5, the three commons: ${commonsOf(5).map((c) =>
      `${c.han} ${(100 * odds(s, c)).toFixed(0)}% in ${fight(s, c, 7).rounds.length} rounds`)
      .join(' · ')}\n`);
  });

  it('the reference grows every realm, and the beasts with it', () => {
    for (let r = 2; r <= 9; r++) {
      expect(referencePower(r)).toBeGreaterThan(referencePower(r - 1));
    }
  });

  it('a fight resolves, is deterministic, and never hangs', () => {
    const s = bare(3);
    const b = commonsOf(3)[0];
    const a = fight(s, b, 42);
    const c = fight(s, b, 42);
    expect(a.rounds.length).toBeGreaterThan(0);
    expect(a.rounds.length).toBeLessThanOrEqual(24);
    expect(a.won).toBe(c.won);
    expect(a.rounds.length).toBe(c.rounds.length);
  });

  it('every beast has an icon, a unique key and a real realm', () => {
    expect(new Set(BEASTS.map((b) => b.key)).size).toBe(BEASTS.length);
    expect(BEASTS.length).toBe(36);
    for (const b of BEASTS) {
      expect(b.realm).toBeGreaterThanOrEqual(1);
      expect(b.realm).toBeLessThanOrEqual(9);
      expect(b.icon.length).toBeGreaterThan(0);
    }
    for (let r = 1; r <= 9; r++) expect(commonsOf(r).length).toBe(3);
  });
});
