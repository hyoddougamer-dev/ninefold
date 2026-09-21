import { describe, expect, it } from 'vitest';
import { BEASTS, commonsOf, wardenOf } from '../../data/bestiary.ts';
import { LAYERS_PER_REALM, levelCap } from '../balance.ts';
import { beastPower, fight, odds, referencePower } from '../combat.ts';
import { focusAt } from '../balance.ts';
import { buy, canBuy, newState, power, type State } from '../state.ts';
import { advance } from '../time.ts';
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
 * The player in the middle: at the realm's ceiling, two levels short of the cap on both
 * 劍訣 and 妖丹.
 *
 * Levels below the cap, not a share of qi earned. The cap is the honest yardstick now,
 * because it is the ceiling on what a cultivator of that realm can possibly hold, and
 * because every upgrade price rides the mountain rather than a ladder of its own.
 *
 * Cores are in here because a warden asks for them, and a warden asks for them because
 * they are the one upgrade qi cannot buy — see `waiter` below, which is the same
 * cultivator with everything except the fighting.
 */
function invested(realm: number, below = 2): State {
  const held = Math.max(0, levelCap(realm) - below);
  return {
    ...bare(realm),
    levels: { technique: held, method: 0, pills: 0, cores: held },
  };
}

/** The cultivator who only ever waited: every qi upgrade at the cap, and no cores. */
function waiter(realm: number): State {
  return {
    ...bare(realm),
    levels: {
      technique: levelCap(realm), method: levelCap(realm), pills: levelCap(realm), cores: 0,
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

  it('a warden is not beaten by qi alone — it is beaten by 妖丹 and a build', () => {
    const rows = [2, 4, 6, 8, 9].map((r) => {
      const g = wardenOf(r);
      return `  realm ${r}  ${g.han.padEnd(2)} warden` +
        `   nothing bought ${(100 * odds(bare(r), g)).toFixed(0).padStart(3)}%` +
        `   qi upgrades only ${(100 * odds(waiter(r), g)).toFixed(0).padStart(3)}%` +
        `   two short of both caps ${(100 * odds(invested(r), g)).toFixed(0).padStart(3)}%` +
        `   the same, built ${(100 * odds(built(r), g)).toFixed(0).padStart(3)}%`;
    });
    console.log(`\n${rows.join('\n')}\n`);

    for (const r of [2, 4, 6, 8]) {
      const g = wardenOf(r);
      // Buying nothing is never enough.
      expect(odds(bare(r), g)).toBeLessThan(0.15);
      // Having hunted is what opens it, and from there it is a fight you should win.
      expect(odds(invested(r), g)).toBeGreaterThan(0.5);
      // And the build is never a downgrade on top of it.
      expect(odds(built(r), g)).toBeGreaterThanOrEqual(odds(invested(r), g) - 0.05);
    }
  });

  /**
   * Where 勢 and 訣 are actually decided is the tower, not the wardens.
   *
   * A warden stands still: once the hunting is done it is a fight you should win, and
   * that is the right shape for a gate on the main climb. 無盡塔 keeps rising, so the
   * build is worth exactly as many more floors as it is worth, for ever.
   */
  it('is why the build exists: it is worth floors', async () => {
    const { floorBeast, floorPower } = await import('../tower.ts');
    const plain = invested(5);
    const withBuild = built(5);
    let a = 0;
    let b = 0;
    for (let f = 1; f <= 90; f++) {
      if (odds(plain, floorBeast(f), floorPower(f)) > 0.6) a = f;
      if (odds(withBuild, floorBeast(f), floorPower(f)) > 0.6) b = f;
    }
    console.log(`  a realm-5 cultivator reaches tower floor ${a}; with a stance and arts, floor ${b}\n`);
    expect(b).toBeGreaterThan(a);
  });

  /**
   * 初 The first realm is the one a player decides the game on, and for a long time it
   * had no fight in it at all — the first winnable beast arrived two hours in, and the
   * true odds before it were 0.0%, flat.
   */
  it('gives the first realm a fight inside the first sitting, and three after it', () => {
    /** Walk the first realm the way a player does, and note when each beast turns. */
    const won: Record<string, number> = {};
    let s: State = newState(T0);
    for (let t = 1; t <= 14 * 3600; t++) {
      s = advance(s, T0 + t, false, focusAt(t % 5400));
      for (const u of ['pills', 'method', 'technique'] as const) if (canBuy(s, u)) s = buy(s, u);
      if (t % 120) continue;
      for (const c of commonsOf(1)) if (won[c.key] === undefined && odds(s, c) >= 0.6) won[c.key] = t;
      if (s.realm > 1) break;
    }
    const [rat, hound, frog] = commonsOf(1).map((c) => won[c.key] ?? Infinity);
    console.log(`\n  初 the first realm's own ladder: ${commonsOf(1).map((c) =>
      `${c.han} 力 ${beastPower(c).toFixed(1)} at ${((won[c.key] ?? Infinity) / 60).toFixed(0)} min`).join(' · ')}\n`);

    // The first fight lands inside a first sitting, not two hours later.
    expect(rat).toBeLessThan(30 * 60);
    // And the other two are spread, so the realm keeps asking something new.
    expect(hound).toBeGreaterThan(rat * 2);
    expect(frog).toBeGreaterThan(hound * 1.5);
    expect(frog).toBeLessThan(6 * 3600);
    // The warden is untouched: it still stands at a filled realm cap.
    expect(beastPower(wardenOf(1))).toBeGreaterThan(beastPower(commonsOf(1)[2]) * 1.5);
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

  /**
   * The wall between playing and waiting, which is the whole reason a warden counts 妖丹.
   *
   * Nothing is taken from this cultivator for being away — their qi gathered at full rate
   * every second of it, and every upgrade qi can buy is at its cap. What they are short
   * of is not qi.
   */
  it('will not let a cultivator who never fights past the fourth realm', () => {
    const rows = [1, 2, 3, 4, 5, 9].map((r) => {
      const g = wardenOf(r);
      return `  realm ${r}  ${g.han.padEnd(2)}   every qi upgrade at the cap, no 妖丹: ` +
        `${(100 * odds(waiter(r), g)).toFixed(0).padStart(3)}%   with 妖丹 too: ` +
        `${(100 * odds(invested(r, 0), g)).toFixed(0).padStart(3)}%`;
    });
    console.log(`\n  妖丹 the wall — cores come from killing things, never from waiting:\n${rows.join('\n')}\n`);

    // The first two realms ask for nothing: a new cultivator meets a warden and learns
    // what one is before learning that a warden is not enough.
    for (const r of [1, 2]) expect(odds(waiter(r), wardenOf(r))).toBeGreaterThan(0.5);
    // From the third it tightens, and by the fourth it is shut.
    expect(odds(waiter(4), wardenOf(4))).toBeLessThan(0.2);
    for (const r of [5, 6, 7, 8, 9]) expect(odds(waiter(r), wardenOf(r))).toBeLessThan(0.1);
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
