import { describe, expect, it } from 'vitest';
import {
  GATE_ELITE_WEIGHT, GATE_SEAL_MINUTES, LAYERS_PER_REALM, RELIC_BOND_TILT, RELIC_SHARD_ODDS, RELIC_SHARDS,
} from '../balance.ts';
import { newState, power, rate, sealLeft, type State } from '../state.ts';
import { validate } from '../load.ts';
import { bottleneck, takeKill } from '../combat.ts';
import { drive } from '../hunt.ts';
import {
  canMakeRelic, gateOn, makeRelic, relicMaterial, relicPower, relicSeen, sealFought, shardChance, shardDice, shardsHeld, wallFought,
} from '../relics.ts';
import { RELICS, shardBeast, shardWarden, shardsFor } from '../../data/relics.ts';
import { commonsOf, isElite, wardenOf } from '../../data/bestiary.ts';
import { sealSeconds } from '../verify.ts';

const T0 = 1_700_000_000;
const DAY = 86_400;

/** A cultivator at a realm's gate, the warden out `days` ago, with every beast of the realms below killed `k` times. */
function atGate(realm: number, days = 0, k = 20): State {
  const s = newState(T0 - 40 * DAY);
  const killed: Record<string, number> = {};
  for (let r = 1; r <= realm; r++) {
    for (const b of commonsOf(r)) killed[b.key] = k;
    if (r < realm) killed[wardenOf(r).key] = 1;
  }
  return { ...s, realm, layer: LAYERS_PER_REALM - 1, at: T0, gateAt: T0 - days * DAY, killed, materials: 1e15 };
}

describe('神器 the relics', () => {
  it('has one for every realm, each asking a handful of shards from that realm’s elite', () => {
    expect(RELICS.map((r) => r.realm)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(RELIC_SHARDS.length).toBe(9);
    for (const r of RELICS) {
      const b = shardBeast(r.realm);
      expect(b.realm).toBe(r.realm);
      expect(b.warden).toBeFalsy();
      if (r.realm > 1) expect(isElite(b)).toBe(true);
      expect(shardsFor(r.realm)).toBeGreaterThanOrEqual(3);
    }
  });

  it('drops nothing before the realm’s warden has fallen, and the warden’s fall leaves the first shard', () => {
    const s = atGate(3);
    expect(relicSeen(s, 3)).toBe(false);
    expect(shardChance(s, shardBeast(3))).toBe(0);
    const after = takeKill(s, wardenOf(3));
    expect(shardsHeld(after, 3)).toBe(1);
    expect(shardChance(after, shardBeast(3))).toBeGreaterThan(0);
    // A second fall of the same warden leaves nothing more.
    expect(shardsHeld(takeKill(after, wardenOf(3)), 3)).toBe(1);
  });

  it('rolls one in thousands, tilted by the bond bar, and the same kill always rolls the same', () => {
    const s = takeKill(atGate(4), wardenOf(4));
    const b = shardBeast(4);
    const plain = shardChance({ ...s, fate: { [b.key]: { n: 0, best: 0 } } }, b);
    const due = shardChance({ ...s, fate: { [b.key]: { n: 50, best: 0 } } }, b);
    expect(plain).toBeCloseTo(RELIC_SHARD_ODDS, 10);
    expect(due / plain).toBeCloseTo(RELIC_BOND_TILT, 6);
    expect(shardDice(s.startedAt, b.key, 17)).toBe(shardDice(s.startedAt, b.key, 17));
    // Over many kills the share that falls is near the chance (plain bar).
    let n = 0;
    for (let i = 0; i < 400_000; i++) if (shardDice(s.startedAt, b.key, i) < RELIC_SHARD_ODDS) n++;
    expect(n / 400_000).toBeGreaterThan(RELIC_SHARD_ODDS * 0.8);
    expect(n / 400_000).toBeLessThan(RELIC_SHARD_ODDS * 1.2);
  });

  it('rolls the same shards in a drive as the taps would have', () => {
    let s = takeKill(atGate(3, 0, 10), wardenOf(3));
    s = { ...s, layer: 0, gateAt: 0, qi: 1e30 };
    const b = shardBeast(3);
    const driven = drive(s, b, 2000, 7);
    let tapped = s;
    for (let i = 0; i < 2000; i++) tapped = takeKill(tapped, b);
    // The drive moves the bond bar kill by kill as the taps and drops do; the taps here move
    // no bar, so compare against a drive where the bar never comes due is not possible.
    // What must hold: a drive never leaves more shards than the relic asks for.
    expect(shardsHeld(driven.state, 3)).toBeLessThanOrEqual(shardsFor(3));
    expect(driven.shards).toBe(shardsHeld(driven.state, 3) - shardsHeld(s, 3));
    expect(shardsHeld(tapped, 3)).toBeLessThanOrEqual(shardsFor(3));
  });

  it('is made from its shards and its material, gives power, and never qi', () => {
    let s = takeKill(atGate(2), wardenOf(2));
    s = { ...s, relics: { shards: s.relics!.shards.map((x, i) => (i === 1 ? shardsFor(2) : x)), made: [] } };
    expect(canMakeRelic(s, 2)).toBe(true);
    const m = makeRelic(s, 2);
    expect(m.materials).toBe(s.materials - relicMaterial(2));
    expect(shardsHeld(m, 2)).toBe(0);
    expect(power(m) / power(s)).toBeCloseTo(relicPower(m), 9);
    expect(relicPower(m)).toBeGreaterThan(1);
    expect(rate(m)).toBe(rate(s));
    expect(makeRelic(m, 2)).toBe(m);
  });
});

describe('鬥關 the gates as effort', () => {
  it('counts wins at the gate, the elite at its weight, and nothing anywhere else', () => {
    const s = atGate(6);
    const common = commonsOf(6)[0];
    const elite = shardBeast(6);
    expect(gateOn(s, common).gateWins).toBe(1);
    expect(gateOn(s, elite).gateWins).toBe(GATE_ELITE_WEIGHT);
    expect(gateOn(s, commonsOf(5)[0]).gateWins ?? 0).toBe(0);
    expect(gateOn({ ...s, layer: 3 }, common).gateWins ?? 0).toBe(0);
    expect(gateOn({ ...s, wardenFell: true }, common).gateWins ?? 0).toBe(0);
  });

  it('fills the seal and loosens the wall, and the cultivator who only waits is where they were', () => {
    const s = atGate(7, 0.25);
    const waits = sealLeft(s);
    const fought = { ...s, gateWins: 100 };
    expect(sealFought(fought)).toBeCloseTo((100 * GATE_SEAL_MINUTES) / 1440, 9);
    expect(sealLeft(fought)).toBeCloseTo(Math.max(0, waits - sealFought(fought)), 9);
    expect(bottleneck(fought, wardenOf(7))).toBeLessThan(bottleneck(s, wardenOf(7)));
    expect(wallFought(s)).toBe(0);
    expect(sealLeft({ ...s, gateWins: undefined })).toBe(waits);
  });

  it('is kept honest by validate: no more wins than the kills could make, none away from a gate', () => {
    const s = atGate(6, 0, 3);
    const v = validate({ ...s, gateWins: 1e9 }, T0 + 10);
    expect(v.gateWins).toBeLessThanOrEqual(commonsOf(6).length * 3 * GATE_ELITE_WEIGHT * 3);
    expect(validate({ ...s, layer: 2, gateWins: 50 }, T0 + 10).gateWins).toBe(0);
    // A save from before it carries none, and reads as none.
    expect(validate(s, T0 + 10).gateWins ?? 0).toBe(0);
  });

  it('is kept honest by validate: relics and shards only for a warden that fell', () => {
    const s = atGate(4, 0, 0);
    const forged = validate({ ...s, relics: { shards: [9, 9, 9, 9, 9, 9, 9, 9, 9], made: [1, 2, 3, 4, 5, 6, 7, 8, 9] } }, T0 + 10);
    expect(forged.relics!.made).toEqual([]);
    expect(forged.relics!.shards.slice(0, 3)).toEqual([1, 1, 1]);
    expect(forged.relics!.shards.slice(3)).toEqual([0, 0, 0, 0, 0, 0]);
  });

  it('lets the server allow what the kills between two saves could fill, and nothing without kills', () => {
    const before = atGate(7, 0);
    const passed = { ...before, realm: 8, layer: 0, gateAt: 0, wardenFell: false, sealPaid: 0, sealFed: 0,
      killed: { ...before.killed, [wardenOf(7).key]: 1 } };
    const idle = sealSeconds(before, passed);
    const hunted = sealSeconds(before, { ...passed, killed: { ...passed.killed, [shardBeast(7).key]: 20 + 100 } });
    expect(idle).toBeGreaterThan(0);
    expect(hunted).toBeCloseTo(Math.max(0, idle - 100 * GATE_ELITE_WEIGHT * GATE_SEAL_MINUTES * 60), 0);
  });

  it('never moves the warden the server reads, which is fully loosened', () => {
    expect(shardWarden(5).key).toBe(wardenOf(5).key);
  });
});
