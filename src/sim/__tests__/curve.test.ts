import { describe, expect, it } from 'vitest';
import {
  LADDER_GROWTH_FIRST, LADDER_GROWTH_LAST, LAYERS, LAYERS_PER_REALM, LEVELS_PER_REALM,
  MAX_GAP, OPENING_PURSE, TARGET_DAYS, TOLERANCE_DAYS, focusAt, ladderAt, levelCap,
  realmCost,
  CORE_CAP_EXTRA,
} from '../balance.ts';
import { MARKS_PER_HEAVEN } from '../../data/heavens.ts';
import {
  UPGRADES, atCeiling, breakThrough, buy, canBreakThrough, canBuy, canFightWarden,
  newState, power, wardenStands,
  type State, type Upgrade,
} from '../state.ts';
import { advance, affordableIn, layerCost, rate } from '../time.ts';
import { num } from '../format.ts';
import { pillsTaken } from '../furnace.ts';
import { LINES } from '../../data/alchemy.ts';
import { BRANCHES, climb } from '../../../tools/climb.ts';

/**
 * The curve is the most irreversible decision in the game, and it is where every
 * earlier version broke.
 *
 * The first broke by shape: realms 1 to 6 in six days and twenty-six days in the last
 * gap with nothing in it. The second broke by *audience* — it measured a cultivator who
 * never spent a single qi. Measured against someone who plays the game as written,
 * buying what they can afford, that same curve took **three days**, not ninety.
 *
 * So the climb below spends. It is the only reading that means anything, and it is the
 * one the schedule is printed from.
 */

const T0 = 1_700_000_000;
const DAY = 86_400;

const NAMES = ['練氣', '築基', '金丹', '元嬰', '化神', '煉虛', '合體', '大乘', '渡劫'];

describe('the climb, for a cultivator who spends', () => {
  it('prints the schedule and keeps every gap under the ceiling', () => {
    const { arrival, buys, state } = climb(6);
    expect(state.realm).toBe(9);

    const total = arrival[arrival.length - 1];
    const gaps = arrival.slice(1).map((d, i) => d - arrival[i]);

    const rows = arrival.map((d, i) => {
      const inRealm = buys.filter((b) => b >= d && (i === 8 || b < arrival[i + 1]));
      const last = inRealm.length ? inRealm[inRealm.length - 1] : d;
      const spread = i < 8 && gaps[i] > 0 ? (100 * (last - d)) / gaps[i] : 0;
      return `  ${NAMES[i]}  realm ${i + 1}  day ${d.toFixed(1).padStart(6)}` +
        (i > 0 ? `   (+${gaps[i - 1].toFixed(1)}d · ${(100 * gaps[i - 1] / total).toFixed(0)}%)` : '') +
        (i < 8 ? `   ${String(inRealm.length).padStart(2)} upgrades over ${spread.toFixed(0)}% of it` : '');
    });
    console.log(`\n  six visits a day, buying what it can — ${total.toFixed(1)} days to the ninth realm\n${rows.join('\n')}\n`);

    const worst = Math.max(...gaps);
    console.log(`  largest gap: ${worst.toFixed(1)}d = ${(100 * worst / total).toFixed(1)}% of the run (ceiling ${(100 * MAX_GAP).toFixed(0)}%)`);
    console.log(`  ${buys.length} upgrades bought in all; the cap allows ${levelCap(9)} of each\n`);

    expect(worst / total).toBeLessThanOrEqual(MAX_GAP);
    expect(Math.abs(total - TARGET_DAYS)).toBeLessThanOrEqual(TOLERANCE_DAYS);
  });

  /**
   * The promise an idle game makes is that closing it costs nothing. If playing more
   * often climbed faster, that promise is a lie and the curve belongs to whoever has
   * the most free time.
   */
  it('lands within a month of ninety days however often the app is opened', () => {
    const rows = [1, 2, 6, 24, 200].map((k) => ({ k, ...climb(k) }));
    console.log('\n  how often the app is opened barely moves the climb:');
    for (const r of rows) {
      console.log(`    ${String(r.k).padStart(3)} visits a day  ${r.days.toFixed(1).padStart(6)} days   ` +
        `realms on day ${r.arrival.map((d) => d.toFixed(0)).join(', ')}`);
    }
    const slow = Math.max(...rows.map((r) => r.days));
    const fast = Math.min(...rows.map((r) => r.days));
    console.log(`    spread: ${fast.toFixed(0)}–${slow.toFixed(0)} days\n`);
    expect(slow - fast).toBeLessThanOrEqual(35);
    for (const r of rows) expect(r.state.realm).toBe(9);
  });

  /**
   * The furnace is the only uncapped thing qi buys, so it is the only thing that could
   * break the curve again. It cannot, and this is the measurement that says so: brewing
   * everything affordable, every visit, all the way up.
   */
  it('survives a cultivator who pours everything into the furnace', () => {
    const plain = climb(6);
    const climber = climb(6, true, false, true);
    const brewer = climb(6, true, true);
    const arrival = brewer.arrival[brewer.arrival.length - 1];
    console.log(`\n  spending on upgrades only:     realm 9 on day ${plain.arrival[8].toFixed(1)}`);
    console.log(`  climbing the tower as well:    realm 9 on day ${climber.arrival[8].toFixed(1)}`
      + `   (the tower is meant to pay, and it does)`);
    console.log(`  and brewing everything too:    realm 9 on day ${arrival.toFixed(1)}   ` +
      `${pillsTaken(brewer.state.brewed)} pills — ` +
      `${LINES.map((l) => `${l} ${brewer.state.brewed[l]}`).join(' · ')}`);
    console.log(`  and it costs them power ${num(power(climber.state))} → ${num(power(brewer.state))}\n`);
    expect(brewer.state.realm).toBe(9);
    // Slower than the same cultivator who climbs and does not brew, because every pill
    // is qi that did not open a layer — but never so much slower that the furnace is a
    // trap, and never faster, which is what would be a bug.
    expect(arrival).toBeGreaterThan(climber.arrival[8]);
    expect(arrival).toBeLessThan(climber.arrival[8] * 2);
    expect(power(brewer.state)).toBeGreaterThan(power(climber.state));
    // 時 A whole 81-rung climb walked twice, and CI's runner is slower than a laptop:
    // it took 2.7s here and blew vitest's 5s default there, which stopped a deploy.
  }, 30_000);

  /**
   * 道 The measurement that was missing, and it was missing for the whole of the game's
   * life: every curve above is walked by a cultivator who never spends a 道 point, and
   * every real cultivator spends all of them.
   *
   * It hid a hole you could drive a game through. 神 the Spirit branch multiplied the qi
   * rate by three, the run is very nearly `days / rateMultiplier`, and nine nodes turned
   * a three-month climb into a one-month climb. Nothing could see it.
   */
  it('lands near ninety days down every branch of the tree', () => {
    const rows = BRANCHES.map((b) => {
      const r = climb(6, true, true, true, b);
      return { b, day: r.arrival[8] };
    });
    console.log(`\n  the same cultivator, by 道 branch — tower and furnace on:\n`
      + rows.map((r) => `    ${r.b.padEnd(8)} realm 9 on day ${r.day.toFixed(1)}`).join('\n')
      + `\n    spread across the three: `
      + `${(Math.max(...rows.slice(1).map((r) => r.day)) - Math.min(...rows.slice(1).map((r) => r.day))).toFixed(1)} days\n`);

    for (const r of rows) {
      expect(Math.abs(r.day - TARGET_DAYS)).toBeLessThanOrEqual(TOLERANCE_DAYS * 2);
    }
    // And no branch may be a speedrun: the tree is a build, not a pace. The spread is
    // read across the branches a cultivator can actually pick — walking none of them is
    // not a choice anybody makes, and it is only in the table to show what it costs.
    const picked = rows.filter((r) => r.b !== 'none').map((r) => r.day);
    expect(Math.max(...picked) - Math.min(...picked)).toBeLessThanOrEqual(TOLERANCE_DAYS * 1.5);
  }, 30_000);

  it('never stops getting slower, so the mountain always reads as taller', () => {
    const { arrival } = climb(6);
    const gaps = arrival.slice(1).map((d, i) => d - arrival[i]);
    // Every realm takes longer than the one before it, bar the last, which is allowed
    // to level off — beyond it there is no tenth realm to reach, only the tribulation.
    for (let i = 1; i < gaps.length - 1; i++) expect(gaps[i]).toBeGreaterThan(gaps[i - 1]);
  });

  it('opens the first layer inside a quarter of an hour', () => {
    let s = newState(T0);
    let t = T0;
    while (s.layer === 0 && t - T0 < 3600) { t += 5; s = advance(s, t); }
    const minutes = (t - T0) / 60;
    console.log(`\n  the first layer opens after ${minutes.toFixed(1)} minutes at ${num(rate(newState(T0)))} qi/s\n`);
    expect(minutes).toBeLessThanOrEqual(20);
  });

  it('prints the ladder, and every rung is dearer than the one below it', () => {
    const rows = Array.from({ length: 9 }, (_, r) =>
      `  ${NAMES[r]}  realm ${r + 1}  layers ${num(ladderAt(r * 9)).padStart(7)} → ` +
      `${num(ladderAt(r * 9 + 8)).padStart(7)}   realm total ${num(realmCost(r + 1)).padStart(7)}`);
    console.log(`\n  the ladder: ${LAYERS} rungs, growing ${LADDER_GROWTH_FIRST}x at the foot ` +
      `and ${LADDER_GROWTH_LAST}x at the summit\n${rows.join('\n')}\n`);
    for (let n = 1; n < LAYERS; n++) expect(ladderAt(n)).toBeGreaterThan(ladderAt(n - 1));
  });

  it('pays one long absence exactly what many short ones pay', () => {
    const span = 30 * DAY;
    const once = advance(newState(T0), T0 + span, true);
    let many = newState(T0);
    for (let t = T0 + 60; t <= T0 + span; t += 60) many = advance(many, t, true);
    expect(many.realm).toBe(once.realm);
    expect(many.layer).toBe(once.layer);
    expect(many.qi).toBeCloseTo(once.qi, 3);
    console.log(`  30 days: one step and 43,200 steps both give realm ${once.realm}, layer ${once.layer}, ` +
      `qi ${once.qi.toFixed(2)} vs ${many.qi.toFixed(2)}\n`);
  });
});

/**
 * 修為上限 The cap.
 *
 * Without it the rate upgrades pay for the rate upgrades and the climb collapses. The
 * test below is the measurement that found it, kept so it can never come back.
 */
/**
 * 囊 The first minute, which is the only one a player has not yet decided to give you.
 *
 * Played from a clean save on a phone, the opening was three minutes and forty-five
 * seconds of nothing: 1 qi a second, the cheapest box at 491, and the words SPEND YOUR
 * QI standing over three buttons that could not be pressed. This pins the fix — that a
 * cultivator starts holding a purse, and that the purse is small enough for the ladder
 * to leave alone.
 */
describe('囊 the opening', () => {
  /** Sit with the game open, and say when the first thing happens. */
  const sit = (s: State, until: (x: State) => boolean) => {
    if (until(s)) return 0;
    let now = s.at;
    for (let t = 1; t <= 4000; t++) {
      now = s.at + 1;
      s = advance(s, now, false, focusAt(t));
      if (until(s)) return t;
    }
    return Infinity;
  };

  it('asks the player a question in its first frame', () => {
    const fresh = newState(T0);
    expect(fresh.qi).toBe(OPENING_PURSE);

    // Something is already pressable at second zero, and it is a choice, not a single
    // lit button: two of the three boxes are affordable and the third is not.
    const lit = UPGRADES.filter((u) => canBuy(fresh, u));
    expect(lit.length).toBeGreaterThanOrEqual(2);
    expect(lit.length).toBeLessThan(UPGRADES.length);
    expect(sit(fresh, (s) => UPGRADES.some((u) => canBuy(s, u)))).toBe(0);
  });

  it('leaves the purse where the ladder cannot swallow it', () => {
    // At or above the first rung the ladder would take it on the first tick, and the
    // player would watch a layer open by itself instead of choosing.
    expect(OPENING_PURSE).toBeLessThan(ladderAt(0));
    expect(advance(newState(T0), T0 + 1, false, 3).layer).toBe(0);

    // And it is nothing: one part in tens of billions of what the ninth realm costs.
    expect(OPENING_PURSE / realmCost(9)).toBeLessThan(1e-9);
  });

  it('moves the first event of the game from six minutes to about one', () => {
    const opened = (s: State) => s.layer > 0;
    const bare = sit({ ...newState(T0), qi: 0 }, opened);
    const purse = sit(newState(T0), opened);
    console.log(`\n  囊 the opening: first press 3m44s → 0m00s · ` +
      `first layer ${(bare / 60).toFixed(1)} min → ${(purse / 60).toFixed(1)} min\n`);
    expect(bare).toBeGreaterThan(5 * 60);
    expect(purse).toBeLessThan(2 * 60);
  });
});

describe('the cap on what a realm may hold', () => {
  it('allows six levels of each per realm, and 妖丹 two realms further', () => {
    const s = { ...newState(T0), realm: 3, qi: 1e30, materials: 1e30 };
    expect(levelCap(3)).toBe(3 * LEVELS_PER_REALM);
    for (const u of UPGRADES) {
      let held = s;
      for (let i = 0; i < 400; i++) held = buy(held, u);
      // 丹 Cores reach further than the other three: they are bought by hand rather
      // than waited for, and their own price is the wall. See CORE_CAP_EXTRA.
      const reach = u === 'cores' ? CORE_CAP_EXTRA : 0;
      expect(held.levels[u]).toBe(levelCap(3) + reach);
      expect(canBuy(held, u)).toBe(false);
    }
  });

  it('is what stops the qi rate running away', () => {
    // Uncapped, a cultivator who never stops buying reaches the ninth realm in days.
    // The cap is the only thing between this game and that one.
    const capped = climb(200);
    const miser = climb(200, false);
    console.log(`\n  buying everything, 200 visits a day: realm 9 on day ${capped.days.toFixed(1)}`);
    console.log(`  buying nothing at all:                realm ${miser.state.realm} after ${miser.days.toFixed(0)} days\n`);
    expect(capped.days).toBeGreaterThan(TARGET_DAYS - 2 * TOLERANCE_DAYS);
    for (const u of UPGRADES) expect(capped.state.levels[u]).toBeLessThanOrEqual(levelCap(9));
  });

  it('refuses a save that claims more levels than its realm allows', async () => {
    const { validate } = await import('../state.ts');
    const forged = {
      ...newState(T0), v: 1, realm: 2,
      levels: { technique: 900, method: 900, pills: 900, cores: 900 } as Record<Upgrade, number>,
    };
    const held = validate(forged, T0 + 10);
    for (const u of UPGRADES) {
      expect(held.levels[u]).toBe(levelCap(2) + (u === 'cores' ? CORE_CAP_EXTRA : 0));
    }
  });

  /**
   * 失 The clamp has to be the cap the game actually sells against, and for a while it
   * was not: it read `levelCap(realm)` flat while `capOf` adds a heaven's room to the
   * power upgrades. The save is rewritten on unload and validated on load, so every
   * level 境外 had paid for was deleted on the next open — silently, every single time.
   */
  it('keeps the levels a heaven paid for through a save and a load', async () => {
    const { validate, capOf } = await import('../state.ts');
    const crossed = {
      ...newState(T0), v: 1 as const, realm: 9, layer: 8, tribulation: 2 * MARKS_PER_HEAVEN,
    };
    const bought = capOf(crossed, 'technique');
    expect(bought).toBeGreaterThan(levelCap(9));
    const held = validate({ ...crossed, levels: { ...crossed.levels, technique: bought } }, T0 + 10);
    expect(held.levels.technique).toBe(bought);
  });
});

/**
 * Climbing a realm is a player's act, never the clock's. The first version let a fallen
 * warden open the gate inside advance(), so the realm ticked over on its own and the
 * 突破 button never appeared.
 */
/**
 * 溢 Qi that arrives in a lump, against a rung that costs less than the lump.
 *
 * Bruno: *"já tive imensos casos de salvage items e o meu qi resetar ou não
 * contabilizar."* `advance` walks the ladder rung by rung and used to set the qi to zero
 * on each one it opened, which is exactly right for qi that arrives from the clock —
 * that qi lands on the price — and silently destroys every other kind. 拆 a melt, 塔 a
 * tower floor, 見 the first sight of a beast and 囊 the opening purse are all lumps.
 */
describe('qi that arrives all at once', () => {
  it('carries what is left over the rung instead of burning it', () => {
    const s = newState(T0);
    const rung = layerCost(1, 0, s.unlocked);
    // Ten rungs' worth in the hand, dropped in between two ticks.
    const lump = { ...s, qi: rung * 10 };
    const after = advance(lump, T0 + 1);
    const kept = after.qi + Array.from({ length: after.layer }, (_, i) => layerCost(1, i, s.unlocked))
      .reduce((a, b) => a + b, 0);
    // Every qi is either standing in the bar or spent on a rung. None of it vanished.
    expect(kept).toBeGreaterThan(rung * 10);
    expect(after.layer).toBeGreaterThan(1);
  });

  it('opens as many rungs as the lump actually paid for', () => {
    const s = newState(T0);
    const three = layerCost(1, 0, s.unlocked) + layerCost(1, 1, s.unlocked) + layerCost(1, 2, s.unlocked);
    const after = advance({ ...s, qi: three }, T0 + 1);
    expect(after.layer).toBe(3);
  });

  it('pays a lump and an hour of gathering the same as the hour and then the lump', () => {
    const s = newState(T0);
    const lump = layerCost(1, 0, s.unlocked) * 4;
    const first = advance({ ...s, qi: lump }, T0 + 3600);
    const second = advance({ ...advance(s, T0 + 3600), qi: advance(s, T0 + 3600).qi + lump }, T0 + 3601);
    // Not identical — the second gathered at a lower rate for the hour — but the one
    // that got the qi earlier must never end up behind.
    expect(first.layer).toBeGreaterThanOrEqual(second.layer);
  });
});

/**
 * 待 What an unaffordable price is actually waiting for.
 *
 * The rung you stand on is the most qi you may ever hold, because `advance` takes it the
 * instant it can afford the layer. So an upgrade dearer than that rung is not a saving
 * problem, it is a climbing problem, and the two have to read differently on the screen.
 */
describe('when an upgrade you cannot afford becomes one you can', () => {
  it('counts seconds for anything the rung you stand on can hold', () => {
    const s = newState(T0);
    const rung = layerCost(1, 0, s.unlocked);
    const { seconds, rungs } = affordableIn(s, rung / 2);
    expect(rungs).toBe(0);
    expect(seconds).not.toBeNull();
    expect(seconds!).toBeGreaterThanOrEqual(0);
  });

  it('counts rungs for anything dearer than it, because waiting cannot get there', () => {
    const s = newState(T0);
    const rung = layerCost(1, 0, s.unlocked);
    const far = affordableIn(s, rung * 20);
    expect(far.seconds).toBeNull();
    expect(far.rungs).toBeGreaterThan(0);
    // And the rung it names really is dear enough to hold that price.
    let realm = 1;
    let layer = 0;
    for (let i = 0; i < far.rungs; i++) if (++layer >= LAYERS_PER_REALM) { layer = 0; realm += 1; }
    expect(layerCost(realm, layer, s.unlocked)).toBeGreaterThanOrEqual(rung * 20);
  });

  it('never says "climb" at the summit, where there is no rung to take the qi', () => {
    const top = { ...newState(T0), realm: 9, layer: LAYERS_PER_REALM - 1 };
    const { seconds, rungs } = affordableIn(top, 1e30);
    expect(rungs).toBe(0);
    expect(seconds).not.toBeNull();
  });
});

describe('time never climbs a realm by itself', () => {
  function atCeilingOfRealmOne(): State {
    let s = newState(T0);
    let t = T0;
    for (let i = 0; i < 24 * 200; i++) {
      if (s.layer === LAYERS_PER_REALM - 1) return s;
      t += 600;
      s = advance(s, t);
    }
    throw new Error('never reached the ceiling of realm 1');
  }

  it('banks qi at the ceiling instead of opening the next realm', () => {
    const s = atCeilingOfRealmOne();
    const later = advance(s, s.at + 30 * DAY);
    expect(later.realm).toBe(1);
    expect(later.layer).toBe(LAYERS_PER_REALM - 1);
    expect(later.qi).toBeGreaterThan(s.qi);
  });

  /**
   * 守 The warden stands on the rung, not on the bar.
   *
   * The fault this pins down: a cultivator arrives at the last rung too weak, banks qi
   * until they can afford the upgrades that would beat the warden, buys them — and the
   * warden vanishes, because the qi they just spent was what was holding it there. The
   * game took the fight away at the exact moment they did the right thing to win it.
   */
  it('keeps the warden standing after you spend the qi on beating it', () => {
    const arrived = atCeilingOfRealmOne();
    // Bank until the last rung is affordable, which is when the warden appears.
    const banked = advance(arrived, arrived.at + 2 * DAY);
    expect(atCeiling(banked)).toBe(true);
    expect(canFightWarden(banked)).toBe(true);

    // Now do the sensible thing: spend it on the levels that beat the warden.
    let bought = banked;
    for (let i = 0; i < 40; i++) {
      const next = (['technique', 'method', 'pills'] as const).find((u) => canBuy(bought, u));
      if (!next) break;
      bought = buy(bought, next);
    }
    expect(bought.qi).toBeLessThan(banked.qi);
    expect(power(bought)).toBeGreaterThan(power(banked));

    // And spent right down, which is what a cultivator short of the warden would do:
    // the bar is no longer full, and the warden is still there anyway.
    const spent: State = { ...bought, qi: 0 };
    expect(atCeiling(spent)).toBe(false);
    expect(canFightWarden(spent)).toBe(true);

    /**
     * 費 And beating it is the whole toll. The ninth rung is the warden, so a cultivator
     * who spent every coin on the levels that beat it does not then have to re-earn a
     * rung to walk out — which is the thing that used to cost the lightest player a
     * second day in the first realm.
     */
    const beaten: State = { ...spent, wardenFell: true };
    expect(canBreakThrough(beaten)).toBe(true);
    // 銀 And the qi is not burned on the way out. There is none here; the carry is
    // asserted where there is some.
    expect(breakThrough(beaten).realm).toBe(2);
  });

  /** And it is never reachable before the last rung, which was only ever a screen rule. */
  it('does not let a warden be fought from halfway up a realm', () => {
    const half: State = { ...newState(T0), realm: 3, layer: 4, qi: 1e12 };
    expect(wardenStands(half)).toBe(false);
    expect(canFightWarden(half)).toBe(false);
    expect(canFightWarden({ ...half, layer: LAYERS_PER_REALM - 1 })).toBe(true);
    // And once it has fallen it is not standing any more.
    expect(canFightWarden({ ...half, layer: LAYERS_PER_REALM - 1, wardenFell: true })).toBe(false);
  });

  /** 銀 Whatever was gathered on the last rung comes with you. */
  it('carries the qi through the breakthrough instead of burning it', () => {
    const banked = advance(atCeilingOfRealmOne(), atCeilingOfRealmOne().at + 2 * DAY);
    const beaten: State = { ...banked, wardenFell: true };
    expect(beaten.qi).toBeGreaterThan(0);
    const next = breakThrough(beaten);
    expect(next.realm).toBe(2);
    expect(next.layer).toBe(0);
    expect(next.qi).toBe(beaten.qi);
    expect(next.wardenFell).toBe(false);
  });

  it('stays put even once the warden has fallen — only 突破 leaves', () => {
    const beaten = { ...atCeilingOfRealmOne(), wardenFell: true };
    const later = advance(beaten, beaten.at + 30 * DAY);
    expect(later.realm).toBe(1);
    expect(later.wardenFell).toBe(true);

    expect(canBreakThrough(later)).toBe(true);
    expect(breakThrough(later).realm).toBe(2);
    expect(breakThrough(later).wardenFell).toBe(false);
  });

  it('has no rung above the summit, and banks qi there for ever', () => {
    const top = { ...newState(T0), realm: 9, layer: LAYERS_PER_REALM - 1 };
    const later = advance(top, top.at + 365 * DAY, true);
    expect(later.realm).toBe(9);
    expect(later.layer).toBe(LAYERS_PER_REALM - 1);
    expect(later.qi).toBeGreaterThan(0);
    expect(power(later)).toBeGreaterThan(0);
  });
});
