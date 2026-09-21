import { describe, expect, it } from 'vitest';
import { BEASTS, commonsOf, wardenOf } from '../../data/bestiary.ts';
import { LAYERS_PER_REALM, ladderAt, levelCap } from '../balance.ts';
import {
  beastPower, fight, odds, oddsRaw, referencePower, seenBounty, takeKill,
} from '../combat.ts';
import { focusAt } from '../balance.ts';
import { buy, canBuy, newState, power, type State } from '../state.ts';
import { num } from '../format.ts';
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

/**
 * 誠 Three unwinnable fights are not the same fight.
 *
 * The quoted odds have a floor under them so that a run of bad seeds does not read as
 * hopeless. The floor was flattening the whole of the first realm: a new cultivator
 * looking at the rat, the hound and the frog saw 2%, 2% and 2%, on the one screen whose
 * entire job is choosing which of them to work toward.
 *
 * So the screen asks for the unclamped reading, and when that is flat zero it stops
 * quoting a percentage and says how many times the cultivator's own power the beast is.
 * These check that the two readings stay different things.
 */
describe('誠 out of reach is not two per cent', () => {
  it('floors the quoted odds and does not floor the raw ones', () => {
    const s = newState(T0);
    const frog = commonsOf(1)[2];
    expect(odds(s, frog)).toBe(0.02);
    expect(oddsRaw(s, frog)).toBe(0);
  });

  it('tells the first realm’s three beasts apart while all three are unwinnable', () => {
    const s = newState(T0);
    const gaps = commonsOf(1).map((b) => beastPower(b) / power(s));

    // Every one of them is out of reach at minute zero: that is the ramp working.
    for (const b of commonsOf(1)) expect(oddsRaw(s, b)).toBe(0);
    // And the screen can still say which is closest, because these are three numbers.
    expect(new Set(gaps.map((g) => g.toFixed(1))).size).toBe(3);
    expect(gaps[0]).toBeLessThan(gaps[1]);
    expect(gaps[1]).toBeLessThan(gaps[2]);
    // eslint-disable-next-line no-console
    console.log(`\n  誠 the first realm at minute zero, as the screen now reads it:`);
    commonsOf(1).forEach((b, i) => {
      // eslint-disable-next-line no-console
      console.log(`    ${b.han} ${b.name.padEnd(14)} ×${gaps[i].toFixed(1)} needed`);
    });
  });

  it('goes back to quoting odds the moment the fight can be won', () => {
    let s = newState(T0);
    const rat = commonsOf(1)[0];
    // The twelve minutes the ramp is written for, bought rather than waited out.
    for (let i = 0; i < 4; i++) s = buy({ ...s, qi: 1e9 }, 'technique');
    expect(oddsRaw(s, rat)).toBeGreaterThan(0);
    expect(odds(s, rat)).toBeGreaterThan(0.02);
  });
});

/**
 * 見 What the first sight of a beast is worth, where it was asked for.
 *
 * Bruno: *"sinto que o combat nada faz nos primeiros realms."* The fix has to be loud
 * in the first realm and quiet by the ninth, or it is not a first-realm fix — it is a
 * rebalance of the whole climb by the back door, which is what a flat share measured
 * as: twenty-two days off a hundred-and-twelve-day game.
 *
 * So these state the shape as numbers, and print them, because a share of a rung means
 * nothing until you see it beside the rung.
 */
describe('見 the first sight of a beast', () => {
  it('is paid once and never again', () => {
    const rat = commonsOf(1)[0];
    const fresh = newState(T0);
    const first = takeKill(fresh, rat);
    expect(first.qi - fresh.qi).toBe(seenBounty(rat));
    const second = takeKill(first, rat);
    expect(second.qi - first.qi).toBe(0);
    // The count and the material keep coming; only the bounty stops.
    expect(second.killed[rat.key]).toBe(2);
    expect(second.materials).toBeGreaterThan(first.materials);
  });

  it('is loud in the first realm and quiet in the ninth', () => {
    const share = (b: ReturnType<typeof commonsOf>[number]) =>
      seenBounty(b) / ladderAt((b.realm - 1) * LAYERS_PER_REALM + 3);
    const rat = commonsOf(1)[0];
    const deep = commonsOf(9)[0];
    expect(share(rat)).toBeGreaterThan(0.3);
    expect(share(deep)).toBeLessThan(0.1);

    // eslint-disable-next-line no-console
    console.log('\n  見 what a first kill pays, as a share of the rung it lives beside:');
    for (const r of [1, 3, 5, 7, 9]) {
      const b = commonsOf(r)[0];
      const w = wardenOf(r);
      // eslint-disable-next-line no-console
      console.log(`    realm ${r}  ${b.han} ${num(seenBounty(b)).padStart(8)} qi `
        + `(${(share(b) * 100).toFixed(0)}% of a rung)   warden ${w.han} ${seenBounty(w) === 0 ? 'nothing' : num(seenBounty(w))}`);
    }
  });

  it('pays a warden nothing, because 突破 would throw it away', () => {
    // Breaking through sets the qi to nothing, and breaking through is what a player
    // does the moment the warden falls. A prize the next tap destroys is a trap.
    for (const r of [1, 5, 9]) expect(seenBounty(wardenOf(r))).toBe(0);
    const s = newState(T0);
    const after = takeKill(s, wardenOf(1));
    expect(after.qi).toBe(s.qi);
    expect(after.wardenFell).toBe(true);
    expect(after.materials).toBeGreaterThan(s.materials);
  });

  it('cannot be farmed: every beast in the game pays it exactly once', () => {
    // 36 beasts, 36 payments, for the life of a save. It is a fixed, finite sum — so it
    // is not a rate, and no amount of hunting can turn it into one.
    let s = newState(T0);
    const before = s.qi;
    for (const b of BEASTS) s = takeKill(s, b);
    const once = s.qi - before;
    for (let i = 0; i < 20; i++) for (const b of BEASTS) s = takeKill(s, b);
    expect(s.qi - before).toBe(once);
  });
});
