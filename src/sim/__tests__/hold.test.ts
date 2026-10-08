import { describe, expect, it } from 'vitest';
import { HABITS, HOLDER, play } from '../../../tools/habits.ts';
import { LAYERS_PER_REALM } from '../balance.ts';
import { advance, affordableIn, buysWith, canOpenLayer, layerCost, openLayer, setHold } from '../time.ts';
import { UPGRADES, buy, canBuy, newState, rate, validate, type State } from '../state.ts';
import { verify } from '../verify.ts';
import { bornFrom } from '../rebirth.ts';

/**
 * 留 Hold the layer (speculaether, on the Discord, 2026-10-06): the bar fills toward the
 * layer's price and, when full, the layer takes the qi, even when the player wanted it for
 * upgrades. Holding keeps the qi until a tap opens the layer.
 *
 * The promises: it is off for everyone until it is turned on, with it off nothing in the
 * game moves by a single qi, holding never makes more qi than not holding, and the server
 * accepts a save in either position.
 */

const T0 = 1_700_000_000;
const HOUR = 3600;
const DAY = 86_400;

/**
 * Somebody at the foot of the second realm with nothing bought, `seconds` of gathering in.
 * A rung there takes about six hours, so a few hours of holding fills one and a day fills several.
 */
function climber(seconds: number): State {
  return advance({ ...newState(T0), realm: 2, layer: 0, qi: 0 }, T0 + seconds);
}

/** Everything the cultivator has earned in the climb, in qi: what they hold and every layer they paid for. */
function wealth(s: State): number {
  let paid = 0;
  for (let n = 0; n < (s.realm - 1) * LAYERS_PER_REALM + s.layer; n++) {
    paid += layerCost(Math.floor(n / LAYERS_PER_REALM) + 1, n % LAYERS_PER_REALM, s.unlocked);
  }
  return s.qi + paid;
}

describe('留 hold the layer: off for everyone until it is turned on', () => {
  it('a new cultivator is not holding, and a save only holds when it says exactly true', () => {
    expect(newState(T0).hold).toBe(false);
    const base = { ...newState(T0) } as unknown as Record<string, unknown>;
    expect(validate({ ...base, hold: true }, T0 + 10).hold).toBe(true);
    for (const junk of [undefined, null, 1, 'true', 'yes', {}, [], 0]) {
      expect(validate({ ...base, hold: junk }, T0 + 10).hold).toBe(false);
    }
    // A save from before the toggle existed has no such key.
    delete base.hold;
    expect(validate(base, T0 + 10).hold).toBe(false);
  });

  it('is a way of playing, so a new life keeps it', () => {
    const s = setHold(climber(HOUR), true);
    expect(bornFrom(s, [], s.at).hold).toBe(true);
    expect(bornFrom({ ...s, hold: false }, [], s.at).hold).toBe(false);
  });

  it('with the toggle off, the harness cultivators climb exactly as they did before it existed', () => {
    // 量 Fingerprints taken on the commit before this change (npm run habits' players, 120 days):
    // the day each realm was reached, to the thousandth, and the fights fought. Off means off.
    const was: Record<string, { arrival: number[]; fights: number; power: number }> = {
      active: { arrival: [0, 0.5, 1.167, 3.5, 8.333, 14.667, 24.167, 36.5, 49.667], fights: 4070, power: 76075247000 },
      'drives it all': { arrival: [0, 0.5, 1.167, 3.5, 7.833, 13.833, 24.333, 36.667, 49.5], fights: 32353, power: 63184492000 },
    };
    for (const [name, want] of Object.entries(was)) {
      const run = play(HABITS.find((h) => h.name === name)!, 120);
      expect(run.state.hold).toBe(false);
      expect(run.arrival.map((d) => Math.round(d * 1000) / 1000)).toEqual(want.arrival);
      expect(run.fights).toBe(want.fights);
      expect(Number(run.power.toPrecision(8))).toBe(want.power);
    }
  }, 120_000);
});

describe('留 what holding does', () => {
  it('keeps a full bar full: the qi piles up past the price and the layer stays where it is', () => {
    const s0 = climber(2 * HOUR);
    const cost = layerCost(s0.realm, s0.layer, s0.unlocked);
    const free = advance(s0, s0.at + 14 * HOUR);
    const held = advance(setHold(s0, true), s0.at + 14 * HOUR);
    expect(free.layer + (free.realm - 1) * LAYERS_PER_REALM).toBeGreaterThan(s0.layer);
    expect(held.layer).toBe(s0.layer);
    expect(held.realm).toBe(s0.realm);
    expect(held.qi).toBeGreaterThan(cost);
    // And it is the bar at the rate of the rung it stands on, the whole way.
    expect(held.qi).toBeCloseTo(s0.qi + rate(s0) * 14 * HOUR, 3);
  });

  it('opens the layer when the player taps, one rung and at its price, and not before', () => {
    const s0 = setHold(climber(HOUR), true);
    const waiting = advance(s0, s0.at + 9 * HOUR);
    expect(canOpenLayer(waiting)).toBe(true);
    const cost = layerCost(waiting.realm, waiting.layer, waiting.unlocked);
    const next = openLayer(waiting);
    expect(next.layer).toBe(waiting.layer + 1);
    expect(next.qi).toBeCloseTo(waiting.qi - cost, 6);
    expect(next.hold).toBe(true);
    // Not enough qi: the same state back.
    const poor = { ...waiting, qi: cost - 1 };
    expect(canOpenLayer(poor)).toBe(false);
    expect(openLayer(poor)).toBe(poor);
    // Holding is still holding after the tap: the next rung waits too.
    const later = advance(next, next.at + 30 * HOUR);
    expect(later.layer).toBe(next.layer);
  });

  it('cannot open the warden or the summit: those are not layers', () => {
    const atGate = { ...climber(HOUR), layer: LAYERS_PER_REALM - 1, qi: 1e30, hold: true };
    expect(canOpenLayer(atGate)).toBe(false);
    expect(openLayer(atGate)).toBe(atGate);
    const top = { ...atGate, realm: 9 };
    expect(canOpenLayer(top)).toBe(false);
  });

  it('stands the warden at the gate from the tap that opens the last rung', () => {
    const s = { ...climber(HOUR), layer: LAYERS_PER_REALM - 2, qi: 1e30, hold: true, gateAt: 0 };
    const next = openLayer(s);
    expect(next.layer).toBe(LAYERS_PER_REALM - 1);
    expect(next.gateAt).toBe(s.at);
  });

  it('spends on upgrades what a full bar would have given to the layer', () => {
    // The whole point: a price dearer than the rung can be saved for while the layer is held.
    const s0 = climber(2 * HOUR);
    const rung = layerCost(s0.realm, s0.layer, s0.unlocked);
    const held = advance(setHold(s0, true), s0.at + 9 * HOUR);
    expect(held.qi).toBeGreaterThan(rung);
    const u = UPGRADES.find((x) => canBuy(held, x));
    expect(u).toBeDefined();
    const bought = buy(held, u!);
    expect(bought.levels[u!]).toBe(held.levels[u!] + 1);
    expect(bought.qi).toBeLessThan(held.qi);
  });

  it('is never worth more qi than not holding: the same hours, the same player, held or free', () => {
    // 量 Wealth is what is in hand plus every layer paid for. A held layer gathers at the rate of
    // its own rung, never above the one over it, so the free player is never behind.
    for (const hours of [1, 6, 30, 200]) {
      for (const lead of [0, HOUR, 9 * HOUR, 3 * DAY]) {
        const s0 = climber(lead);
        const free = advance(s0, s0.at + hours * HOUR);
        const held = advance(setHold(s0, true), s0.at + hours * HOUR);
        expect(wealth(held)).toBeLessThanOrEqual(wealth(free) * (1 + 1e-9));
      }
    }
  });

  it('and tapping every rung the moment it is full only ever catches up to the free player', () => {
    const s0 = climber(HOUR);
    const free = advance(s0, s0.at + 20 * HOUR);
    let held = advance(setHold(s0, true), s0.at + 20 * HOUR);
    for (let i = 0; i < 100 && canOpenLayer(held); i++) held = openLayer(held);
    expect(wealth(held)).toBeLessThanOrEqual(wealth(free) * (1 + 1e-9));
    expect(held.layer + (held.realm - 1) * LAYERS_PER_REALM)
      .toBeLessThanOrEqual(free.layer + (free.realm - 1) * LAYERS_PER_REALM);
  });

  it('adds nothing to the lumps either: a melt on a held bar stays where it landed', () => {
    const s = setHold({ ...climber(HOUR), qi: 5 }, true);
    expect(buysWith(s, 1e12)).toEqual({ rungs: 0, left: 1e12 + 5 });
    expect(buysWith({ ...s, hold: false }, 1e12).rungs).toBeGreaterThan(0);
    // A price over the rung is a wait, not a climb.
    expect(affordableIn(s, 1e12).rungs).toBe(0);
    expect(affordableIn(s, 1e12).seconds).toBeGreaterThan(0);
    expect(affordableIn({ ...s, hold: false }, 1e12).seconds).toBeNull();
  });
});

describe('留 the save and the server', () => {
  it('a held cultivator’s qi survives the way a save is read back, whatever it piled up', () => {
    const s0 = setHold(climber(HOUR), true);
    // A month of holding: the qi ceiling is read off the whole run's gathering, not the rung.
    const month = advance(s0, T0 + 30 * DAY);
    expect(month.qi).toBeGreaterThan(layerCost(month.realm, month.layer, month.unlocked) * 50);
    const back = validate(JSON.parse(JSON.stringify(month)), month.at);
    expect(back.hold).toBe(true);
    expect(back.qi).toBeCloseTo(month.qi, 3);
    expect(back.layer).toBe(month.layer);
  });

  it('the verifier accepts a save in either position, across a hold, and across the toggle', () => {
    const before = climber(HOUR);
    const dt = 8 * HOUR;
    // Held for the whole gap: qi in the bar, no layers opened.
    const held = advance(setHold(before, true), before.at + dt);
    expect(verify(before, held, dt).ok).toBe(true);
    // The same gap not held, for comparison.
    const free = advance(before, before.at + dt);
    expect(verify(before, free, dt).ok).toBe(true);
    // Held before, free after: the toggle alone moves nothing.
    expect(verify(held, { ...held, hold: false }, 0).ok).toBe(true);
    expect(verify({ ...held, hold: false }, held, 0).ok).toBe(true);
    // And the pair that straddles a tap: held, wait, tap, wait.
    const tapped = openLayer(held);
    const later = advance(tapped, tapped.at + dt);
    expect(verify(held, later, dt).ok).toBe(true);
    // Never an excuse for more: edited qi on a held save is still too fast.
    const edited = { ...held, qi: held.qi * 1e6 };
    expect(verify(before, edited, dt).ok).toBe(false);
  });

  it('a held bar left for days is a gap the server can pay, not a gain it has to doubt', () => {
    const before = setHold(climber(DAY), true);
    const after = advance(before, before.at + 5 * DAY);
    const v = verify(before, after, 5 * DAY);
    expect(v.ok).toBe(true);
    expect(v.suspect).toBe(false);
  });
});

describe('留 the most the toggle is worth, played by the cultivator who uses it best', () => {
  /**
   * 量 HOLDER is the active cultivator who holds the layer and opens one only when nothing the
   * realm sells for qi is left to buy: every qi upgrade is bought the moment it can be, before
   * a layer. Measured on the commit that added the toggle (120 days, tools/habits.ts):
   *
   *                       realm 2   3     4     5     6      7      8      9
   *     active            0.5      1.17  3.5   8.33  14.67  24.17  36.5   49.67
   *     holds the layer   0.33     1.33  3.5   7.33  13.33  22.83  33.83  45.33
   *
   * so the best use of the toggle brings the ninth realm about nine per cent sooner, because
   * a rate upgrade bought before a layer starts paying earlier. It makes no qi: at any one
   * moment a held cultivator is behind a free one (the test above). The ceiling below is what
   * keeps that nine per cent from growing without anyone noticing.
   */
  const active = HABITS.find((h) => h.name === 'active')!;
  const free = play(active, 120);
  const held = play(HOLDER, 120);

  it('holds from the first day, and still gets to the top', () => {
    expect(held.state.hold).toBe(true);
    expect(held.reached).toBe(9);
    expect(free.reached).toBe(9);
  }, 120_000);

  it('arrives at the ninth realm no sooner than 90% of the free cultivator’s days', () => {
    const f = free.arrival[8];
    const h = held.arrival[8];
    // eslint-disable-next-line no-console
    console.log(`\n  留 ninth realm: free ${f.toFixed(1)} days, holding ${h.toFixed(1)} days (${(h / f * 100).toFixed(1)}%)`);
    expect(h).toBeGreaterThan(f * 0.9);
    expect(h).toBeLessThanOrEqual(f);
  }, 120_000);

  it('is never held back, struck or flagged by the server on the way', () => {
    const shots: { day: number; s: State }[] = [];
    let last = -1;
    play(HOLDER, 60, (day, s) => {
      if (Math.floor(day) !== last) { last = Math.floor(day); shots.push({ day, s: structuredClone(s) }); }
    });
    let base = shots[0];
    let worstLag = 0;
    for (const shot of shots.slice(1)) {
      const v = verify(base.s, shot.s, (shot.day - base.day) * DAY);
      expect(v.strike, `day ${shot.day.toFixed(2)} ${v.why.join(',')}`).toBe(false);
      expect(v.suspect, `day ${shot.day.toFixed(2)} pace ${v.pace.toFixed(2)}`).toBe(false);
      if (v.ok) base = shot;
      worstLag = Math.max(worstLag, shot.day - base.day);
    }
    expect(worstLag).toBeLessThan(1.5);
  }, 120_000);
});
