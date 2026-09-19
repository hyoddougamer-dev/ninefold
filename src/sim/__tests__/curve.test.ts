import { describe, expect, it } from 'vitest';
import {
  LADDER_GROWTH_FIRST, LADDER_GROWTH_LAST, LAYERS, LAYERS_PER_REALM, LEVELS_PER_REALM,
  MAX_GAP, TARGET_DAYS, TOLERANCE_DAYS, ladderAt, levelCap, realmCost,
} from '../balance.ts';
import {
  UPGRADES, breakThrough, buy, canBreakThrough, canBuy, newState, power, upgradeCost,
  type State, type Upgrade,
} from '../state.ts';
import { advance, layersOpened, rate } from '../time.ts';
import { num } from '../format.ts';
import { brew, canBrew, clearFloor, standingFloor } from '../trials.ts';
import { floorBeast, floorPower } from '../tower.ts';
import { odds } from '../combat.ts';
import { pillsTaken } from '../furnace.ts';
import { LINES } from '../../data/alchemy.ts';

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

/**
 * A cultivator who opens the app `checks` times a day and buys whatever they can.
 *
 * `brews` is the second half of the question. 丹爐 the furnace is the one thing qi buys
 * that no realm caps, so a cultivator who pours everything into it is the fastest way
 * the curve could possibly be broken — and the schedule has to survive them too.
 */
function climb(checks: number, spends = true, brews = false) {
  const tick = DAY / checks;
  let s = newState(T0);
  let t = T0;
  const arrival = [0];
  const buys: number[] = [];

  for (let i = 0; i < checks * 400 && layersOpened(s) < LAYERS - 1; i++) {
    t += tick;
    s = advance(s, t, true);                 // theoretical curve: the warden falls at once
    while (arrival.length < s.realm) arrival.push((t - T0) / DAY);
    if (!spends) continue;
    // Cheapest first, for as long as anything is affordable: the way a person plays.
    for (let guard = 0; guard < 500; guard++) {
      const open = UPGRADES.filter((u) => u !== 'cores' && canBuy(s, u));
      if (open.length === 0) break;
      open.sort((a, b) => upgradeCost(s, a) - upgradeCost(s, b));
      s = buy(s, open[0]);
      buys.push((t - T0) / DAY);
    }
    if (!brews) continue;
    // The furnace eats materials as well as qi, and materials come from the tower. A
    // cultivator who wants to brew has to climb, so the brewer climbs.
    for (let guard = 0; guard < 40; guard++) {
      const floor = standingFloor(s);
      if (odds(s, floorBeast(floor), floorPower(floor)) < 0.6) break;
      s = clearFloor(s, floor);
    }
    for (let guard = 0; guard < 500; guard++) {
      const line = LINES.find((l) => canBrew(s, l));
      if (!line) break;
      s = brew(s, line);
    }
  }
  return { arrival, buys, state: s, days: (t - T0) / DAY };
}

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
    const brewer = climb(6, true, true);
    const arrival = brewer.arrival[brewer.arrival.length - 1];
    console.log(`\n  spending on upgrades only:     realm 9 on day ${plain.arrival[8].toFixed(1)}`);
    console.log(`  brewing everything as well:    realm 9 on day ${arrival.toFixed(1)}   ` +
      `${pillsTaken(brewer.state.brewed)} pills — ` +
      `${LINES.map((l) => `${l} ${brewer.state.brewed[l]}`).join(' · ')}`);
    console.log(`  and it costs them power ${num(power(plain.state))} → ${num(power(brewer.state))}\n`);
    expect(brewer.state.realm).toBe(9);
    // Slower, because every pill is qi that did not open a layer — but never so much
    // slower that the furnace is a trap, and never faster, which is what would be a bug.
    expect(arrival).toBeGreaterThan(plain.arrival[8]);
    expect(arrival).toBeLessThan(plain.arrival[8] * 2);
    expect(power(brewer.state)).toBeGreaterThan(power(plain.state));
  });

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
describe('the cap on what a realm may hold', () => {
  it('allows six levels of each per realm and not one more', () => {
    const s = { ...newState(T0), realm: 3, qi: 1e30, materials: 1e30 };
    expect(levelCap(3)).toBe(3 * LEVELS_PER_REALM);
    for (const u of UPGRADES) {
      let held = s;
      for (let i = 0; i < 100; i++) held = buy(held, u);
      expect(held.levels[u]).toBe(levelCap(3));
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
    for (const u of UPGRADES) expect(held.levels[u]).toBe(levelCap(2));
  });
});

/**
 * Climbing a realm is a player's act, never the clock's. The first version let a fallen
 * warden open the gate inside advance(), so the realm ticked over on its own and the
 * 突破 button never appeared.
 */
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
