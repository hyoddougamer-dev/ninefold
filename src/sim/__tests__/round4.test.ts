import { describe, expect, it } from 'vitest';
import { commonsOf } from '../../data/bestiary.ts';
import { ALL_NODES } from '../../data/techniques.ts';
import { CAPSTONE_REALM, SECOND_DROP_CAP, SHRINE_DAO_PER_REALM } from '../balance.ts';
import { CAPSTONE_TIER, canUnlock, capstonesOpen } from '../dao.ts';
import { secondChance, secondDropFor } from '../fate.ts';
import { fortuneOf } from '../fortune.ts';
import { doorsAt, giftOf } from '../secret.ts';
import { newState, type State } from '../state.ts';
import { validate } from '../load.ts';

/**
 * 四 The testers' fourth round, held where the numbers are.
 *
 * rekaris (2026-10-03): drop chance after 造化 Creation was underwhelming as luck; and the
 * audit the same afternoon found the vault's shrines paying nine tenths of all 道, so the
 * tree was finished on day 2. These hold the answers.
 */
const T0 = 1_700_000_000;
const at = (over: Partial<State>): State => ({ ...newState(T0), ...over } as State);

describe('造化 a second piece once Creation makes the first certain', () => {
  const beast = commonsOf(4)[0];
  const creation = ALL_NODES.filter((n) => n.path === 'fortune').map((n) => n.key);

  it('is never rolled without Creation, nor on a warden', () => {
    const s = at({ realm: 4 });
    expect(secondChance(s, beast, fortuneOf(s))).toBe(0);
    let hits = 0;
    for (let seed = 1; seed < 400; seed++) if (secondDropFor(s, beast, seed, fortuneOf(s))) hits++;
    expect(hits).toBe(0);
  });

  it('turns the drop chance into a second piece, capped, and the same kill leaves the same pair', () => {
    const s = at({ realm: 4, unlocked: ['root', ...creation] });
    const f = fortuneOf(s);
    expect(f.always).toBe(true);
    const chance = secondChance(s, beast, f);
    expect(chance).toBeGreaterThan(0);
    expect(chance).toBeLessThanOrEqual(SECOND_DROP_CAP);
    expect(secondChance(s, beast, { ...f, chance: 9 })).toBe(SECOND_DROP_CAP);
    let hits = 0;
    const N = 4000;
    for (let seed = 1; seed <= N; seed++) {
      const a = secondDropFor(s, beast, seed, f);
      const b = secondDropFor(s, beast, seed, f);
      expect(JSON.stringify(a)).toBe(JSON.stringify(b));
      if (a) hits++;
    }
    // The dice land within a few points of the chance they were given.
    expect(Math.abs(hits / N - chance)).toBeLessThan(0.03);
  });

  it('no longer turns drop chance into luck', () => {
    const plain = at({ realm: 4, unlocked: ['root', ...creation.filter((k) => k !== 'creation')] });
    const full = at({ realm: 4, unlocked: ['root', ...creation] });
    expect(fortuneOf(full).luck).toBe(fortuneOf(plain).luck);
  });
});

describe('龕 the vault pays 道 up to its realm, and then offers the spring instead', () => {
  const shrine = { kind: 'shrine' } as const;

  it('pays points while the realm has some left, and never past it', () => {
    const s = at({ realm: 3, vaultDao: SHRINE_DAO_PER_REALM * 3 - 1 });
    const g = giftOf(s, shrine as never, 0);
    expect(g.dao).toBe(1);
    expect(g.qi).toBe(0);
  });

  it('stops offering a shrine once the realm has given its share, and the room still pays', () => {
    // 泉 Since 2026-10-04 every reward room offers its share of the spring, so a spent
    // shrine is simply not a door: no door ever promises 道 it cannot pay.
    const s = { ...at({ realm: 3, vaultDao: SHRINE_DAO_PER_REALM * 3 }), runStep: 0 };
    for (let n = 0; n < 12; n++) {
      const doors = doorsAt({ ...s, runs: n }, 0);
      expect(doors.some((d) => d.kind === 'shrine')).toBe(false);
      expect(doors[0].kind).toBe('spring');
    }
    expect(giftOf(s, shrine as never, 0).dao).toBe(0);
  });

  it('reads an old save with no count as none paid, and caps a forged count at the realm', () => {
    const raw = JSON.parse(JSON.stringify(at({ realm: 4 }))) as Record<string, unknown>;
    delete raw.vaultDao;
    expect(validate(raw, T0).vaultDao).toBe(0);
    expect(validate({ ...raw, vaultDao: 999 }, T0).vaultDao).toBe(SHRINE_DAO_PER_REALM * 4);
  });
});

describe('極 the last node of each branch waits for its realm', () => {
  const capstones = ALL_NODES.filter((n) => n.tier === CAPSTONE_TIER);

  it('is one per branch', () => {
    expect(capstones.map((n) => n.path).sort()).toEqual(['fortune', 'spirit', 'sword']);
  });

  it('cannot be bought below the realm, and can at it', () => {
    expect(capstonesOpen(CAPSTONE_REALM - 1)).toBe(false);
    expect(capstonesOpen(CAPSTONE_REALM)).toBe(true);
    for (const c of capstones) {
      const branch = ALL_NODES.filter((n) => n.path === c.path && n.tier < CAPSTONE_TIER).map((n) => n.key);
      const held = ['root', ...branch];
      const could = ALL_NODES.filter((n) => n.path === c.path && n.tier === CAPSTONE_TIER - 1).length > 0;
      if (!could) continue;
      expect(canUnlock(c.key, held, 99, true, false)).toBe(false);
      expect(canUnlock(c.key, held, 99, true, true)).toBe(canUnlock(c.key, held, 99));
    }
  });

  it('takes nothing away: a capstone bought early is still held after validate()', () => {
    const fortune = ALL_NODES.filter((n) => n.path === 'fortune' && !n.keystone).map((n) => n.key);
    const s = at({ realm: 3, unlocked: ['root', ...fortune] });
    expect(validate(JSON.parse(JSON.stringify(s)), T0).unlocked).toContain('creation');
  });
});

describe('溢 luck lifts the roll, not only the rank', () => {
  it('lifts nothing at luck 1, more with more, and never past its cap below FUSE_TOP', async () => {
    const { rollLift } = await import('../drops.ts');
    const { LUCK_ROLL_TOP, VARIANCE, FUSE_TOP } = await import('../balance.ts');
    expect(rollLift(1)).toBe(0);
    expect(rollLift(3)).toBeGreaterThan(rollLift(2));
    expect(rollLift(1e9)).toBe(LUCK_ROLL_TOP);
    expect(1 + VARIANCE + LUCK_ROLL_TOP).toBeLessThan(FUSE_TOP);
  });
});

describe('期 the week’s quarry pays a fixed sum read off the realm', () => {
  it('pays the greater of its own share and QUARRY_HOURS of the realm\'s middle rate', async () => {
    const { quarryPaid, quarryBounty } = await import('../combat.ts');
    const { QUARRY_HOURS, midRate } = await import('../balance.ts');
    const s = at({ realm: 6, layer: 4 });
    const old = commonsOf(1)[0];
    expect(quarryPaid(s, old)).toBe(Math.round(Math.max(quarryBounty(old), midRate(6) * 3600 * QUARRY_HOURS)));
  });

  /**
   * 定 It used to be hours of the killer's own gathering, gear and all (2026-10-05), so qi
   * gear put on for the kill, or a kill late in the realm, paid more. Neither does now.
   */
  it('pays the same whatever is worn and wherever in the realm the kill is made', async () => {
    const { quarryPaid } = await import('../combat.ts');
    const { rate } = await import('../state.ts');
    const q = commonsOf(6)[0];
    const early = at({ realm: 6, layer: 0 });
    const late = at({ realm: 6, layer: 8 });
    const dressed = { ...late, worn: { weapon: { id: 'w', template: 'sword5', rarity: 'heaven' as const,
      rolls: [{ affix: 'rate' as const, value: 40 }] } } } as State;
    expect(rate(dressed)).toBeGreaterThan(rate(early));
    expect(quarryPaid(late, q)).toBe(quarryPaid(early, q));
    expect(quarryPaid(dressed, q)).toBe(quarryPaid(early, q));
    expect(quarryPaid(at({ realm: 7, layer: 0 }), q)).toBeGreaterThan(quarryPaid(late, q));
  });

  /**
   * 驗 The server credits the quarry at QUARRY_HOURS of the realm's middle rate, never its
   * own share, so that share must never be the larger for anything the week can point at.
   */
  it('never lets the quarry\'s own share outgrow the realm\'s sum, so the server\'s credit is exact', async () => {
    const { quarryBounty } = await import('../combat.ts');
    const { QUARRY_HOURS, midRate } = await import('../balance.ts');
    const { huntable } = await import('../../data/bestiary.ts');
    for (let r = 1; r <= 9; r++) {
      for (const b of huntable(r, 8)) expect(quarryBounty(b), `${r} ${b.key}`).toBeLessThan(midRate(r) * 3600 * QUARRY_HOURS);
    }
  });
});

describe('盾 the server reads the 道 bank from what the shrines paid (audit, 2026-10-03)', () => {
  // A pair from after the cutoff: the same saves, moved in time together.
  const late = async () => {
    const { DAO_BANK_STRICT_FROM } = await import('../verify.ts');
    const { HABITS, play } = await import('../../../tools/habits.ts');
    const shots: State[] = [];
    play(HABITS.find((h) => h.name === 'active')!, 12, (_d, s) => shots.push(structuredClone(s)));
    const off = DAO_BANK_STRICT_FROM + 3600 - shots[0].startedAt;
    const move = (s: State): State => ({ ...s, at: s.at + off, startedAt: s.startedAt + off });
    return { shots, move };
  };

  it('holds a sync that banks more 道 than the road and the shrines paid', async () => {
    const { verify } = await import('../verify.ts');
    const { shots, move } = await late();
    const s = move(shots.find((x) => x.realm === 3)!);
    const forged = { ...s, metPoints: s.metPoints + 30, at: s.at + 20 };
    expect(verify(s, forged, 20).why).toContain('too-fast');
    // The same lump on a first sync is read as before: an old save may hold it honestly.
    expect(verify(s, forged, 20, true).why).not.toContain('too-fast');
  }, 120_000);

  it('holds a capstone that appears below its realm, and never an honest pair', async () => {
    const { verify } = await import('../verify.ts');
    const { shots, move } = await late();
    const s = move(shots.find((x) => x.realm === 4)!);
    const cap = ALL_NODES.find((n) => n.tier === CAPSTONE_TIER && n.path === 'fortune')!;
    const forged = { ...s, unlocked: [...s.unlocked, cap.key], at: s.at + 60 };
    expect(verify(s, forged, 60).why).toContain('too-fast');
    for (let i = 1; i < shots.length; i++) {
      const b = move(shots[i - 1]), a = move(shots[i]);
      expect(verify(b, a, a.at - b.at).why).not.toContain('too-fast');
    }
  }, 120_000);
});
