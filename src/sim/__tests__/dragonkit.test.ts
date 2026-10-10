import { describe, expect, it } from 'vitest';
import { commonsOf, wardenOf } from '../../data/bestiary.ts';
import { CRAFT_KIT, CRAFT_QUALITY_MULT, DRAGON_KIT_SHARE, MAX_MARK_DAYS } from '../balance.ts';
import { beatable, oddsRaw } from '../combat.ts';
import { bestKit, carry, kitFor, kitWhere, spendKit, thinKit } from '../crafts.ts';
import { NO_KIT } from '../kit.ts';
import { type State } from '../state.ts';
import { validate } from '../load.ts';
import { anchorFloor, dragonBeaten, verify } from '../verify.ts';
import { HABITS, play } from '../../../tools/habits.ts';
import { KIT_CLOCK_BAND, arrivalOf, arrived, crafterOf, kitClock, playEndgame } from '../../../tools/endgame.ts';

/**
 * 劫 What a carried elixir and sigil are worth against the Dragon of the tribulation.
 *
 * rekaris (Discord, 2026-10-07): "every tool given to the player should be used in any
 * place where it makes sense, unless it breaks or trivializes it." The Dragon is the one fight
 * set from the player's own power, so a kit is a head start at every crossing, and the
 * endgame's whole clock is how much of one it takes. DRAGON_KIT_SHARE is chosen against that
 * clock (balance.ts has the table), and it is 0 because every share that matters takes far
 * more than KIT_CLOCK_BAND off it. These tests hold three things: the machinery is right at any
 * share it is given, the measurement that put the constant at 0 still reads the same, and the
 * server allows exactly what the game does.
 */

const DRAGON = wardenOf(9);
const total = (d: readonly number[]) => d.reduce((a, b) => a + b, 0);
/** Read by name: adding a cultivator to HABITS must never make this about somebody else. */
const arrivalOfHabit = (name: string): State => arrivalOf(play(HABITS.find((h) => h.name === name)!, 400).state);

/** A share worth feeling in a fight, and the largest one that keeps every habit inside the band. */
const FELT = 0.3;
const IN_BAND = 0.003;

const kitted = (s: State): State => carry(carry(s, 'elixir', 'might9@4'), 'sigil', 'sigil:heavenseal@4');

describe('劫 the kit at the Dragon, thinned toward nothing', () => {
  it('counts in full at the shipped share: what a warden gets is carried in and spent', () => {
    const s = kitted(crafterOf(arrived()));
    expect(DRAGON_KIT_SHARE).toBe(1);
    expect(kitWhere(s, DRAGON)).toBe('dragon');
    const k = kitFor(s, DRAGON, 'dragon');
    const warden = kitFor(s, DRAGON, 'warden').kit;
    expect(k.kit.strike).toBeCloseTo(warden.strike, 9);
    expect(k.kit.taken).toBeCloseTo(warden.taken, 9);
    expect(k.kit.mend).toBeCloseTo(warden.mend, 9);
    expect(k.spends).toBe(true);
    expect(spendKit(s, k.used)).not.toEqual(s);
    // The breach and the Breakthrough Pill are the gate's, never the Dragon's.
    expect(k.kit.breach ?? 0).toBe(0);
    expect(k.kit.unseal ?? 0).toBe(0);
    // A cultivator with an empty pouch carries nothing, at any share.
    expect(kitFor(crafterOf(arrived()), DRAGON, 'dragon', 0).kit).toEqual(NO_KIT);
  });

  it('goes into the Dragon and not into a common beast', () => {
    const s = kitted(crafterOf(arrived()));
    expect(kitWhere(s, DRAGON)).toBe('dragon');
    expect(kitWhere(s, commonsOf(9)[0])).toBeNull();
    // Below the summit the ninth realm's warden is not in play, and a lower warden is a warden.
    expect(kitWhere({ ...s, realm: 8 }, wardenOf(8))).toBe('warden');
  });

  it('counts every effect at the share, from 1 toward 0 and from 0 toward 1', () => {
    const s = kitted(crafterOf(arrived()));
    const full = kitFor(s, DRAGON, 'dragon', 1).kit;
    const k = kitFor(s, DRAGON, 'dragon', FELT).kit;
    // A Might Elixir and a Heaven Seal Sigil, made for the ninth realm, at Heaven rank.
    expect(full.strike).toBeCloseTo((1 + CRAFT_KIT.might * CRAFT_QUALITY_MULT[4]) * (1 + CRAFT_KIT.thunder * CRAFT_QUALITY_MULT[4]), 9);
    expect(full.taken).toBeCloseTo(1 - CRAFT_KIT.warding * CRAFT_QUALITY_MULT[4], 9);
    expect(k.strike).toBeCloseTo(1 + (full.strike - 1) * FELT, 9);
    expect(k.taken).toBeCloseTo(1 - (1 - full.taken) * FELT, 9);
    expect(kitFor(s, DRAGON, 'dragon', 0.0001).kit.strike).toBeCloseTo(1, 3);
    // At a whole share it is the kit a warden gets, and it is spent as a warden's is.
    const warden = kitFor(s, DRAGON, 'warden').kit;
    expect(full.strike).toBeCloseTo(warden.strike, 9);
    expect(full.taken).toBeCloseTo(warden.taken, 9);
    const used = kitFor(s, DRAGON, 'dragon', FELT);
    expect(used.spends).toBe(true);
    expect(used.used).toEqual({ elixir: 'might9@4', sigil: 'sigil:heavenseal@4', pill: null });
  });

  it('leaves the gate\'s things at the gate: no breach, no seal, no array', () => {
    const s = kitted(crafterOf(arrived()));
    const k = kitFor(s, DRAGON, 'dragon', 1).kit;
    expect(k.breach).toBe(0);
    expect(k.unseal).toBe(0);
    expect(k.thin).toBe(0);
    expect(k.demon).toBe(1);
    // The Guardian Array is cut into the floor, not carried; a warden has it, the Dragon does not.
    const arrayed: State = { ...s, crafts: { ...s.crafts, pouch: { ...s.crafts.pouch, 'array:guardian': 1 }, arrays: ['array:guardian'] } };
    expect(kitFor(arrayed, DRAGON, 'warden').kit.taken).toBeLessThan(kitFor(arrayed, DRAGON, 'dragon', 1).kit.taken);
  });

  it('thins the all-or-nothing effects by the same share', () => {
    const k = thinKit({ ...NO_KIT, strike: 1.5, taken: 0.6, mend: 0.04, reflect: 0.1, bind: true, revive: true }, 0.25);
    expect(k.strike).toBeCloseTo(1.125, 9);
    expect(k.taken).toBeCloseTo(0.9, 9);
    expect(k.mend).toBeCloseTo(0.01, 9);
    expect(k.reflect).toBeCloseTo(0.025, 9);
    // 縛 A Binding Sigil turns aside a quarter of the first blow, not all of it.
    expect(k.bind).toBe(false);
    expect(k.bound).toBe(0.25);
    // 九轉 And a Nine-Turn Pill mends a quarter of the way back, not the whole way.
    expect(k.revive).toBe(true);
    expect(k.reviveShare).toBe(0.25);
    expect(thinKit({ ...NO_KIT, bind: true, revive: true }, 0)).toMatchObject({ bound: 0, reviveShare: 0 });
  });

  it('never makes a fight worse the more of the kit counts, and a whole kit is a real edge', () => {
    // Six crossings in with nothing reaching the Dragon: a crafter whose build is on the edge of it.
    const s = kitted(playEndgame(6, 'pill', crafterOf(arrived()), 1, 'off').end);
    const odds = [0, 0.01, 0.1, 0.5, 1].map((share) => oddsRaw(s, DRAGON, undefined, kitFor(s, DRAGON, 'dragon', share).kit));
    for (let i = 1; i < odds.length; i++) expect(odds[i]).toBeGreaterThanOrEqual(odds[i - 1]);
    expect(odds[odds.length - 1]).toBeGreaterThan(odds[0]);
  });

  it('does not turn a sliver of a Nine-Turn Pill into a free round of blows', () => {
    // Any health left at all is another round of striking, so the pill mends a share of the way
    // back and never a floor of health: a hundredth of a pill is worth about a hundredth.
    const s = playEndgame(6, 'pill', crafterOf(arrived()), 1, 'off').end;
    const base = { ...NO_KIT, revive: true };
    const none = oddsRaw(s, DRAGON, undefined, NO_KIT);
    const sliver = oddsRaw(s, DRAGON, undefined, { ...base, reviveShare: 0.01 });
    const whole = oddsRaw(s, DRAGON, undefined, { ...base, reviveShare: 1 });
    expect(sliver - none).toBeLessThanOrEqual(0.1);
    expect(whole).toBeGreaterThanOrEqual(sliver);
  });
});

describe('劫 the endgame\'s clock, with and without the kit', () => {
  it('does not move a cultivator who never opened the workshop, at any share', () => {
    const s = arrived();
    const off = playEndgame(30, 'pill', s, 1, 'off');
    for (const share of ['game', FELT, 1] as const) {
      const on = playEndgame(30, 'pill', s, 1, share);
      expect(on.days).toEqual(off.days);
      expect(on.chances).toEqual(off.chances);
    }
  }, 300_000);

  it('is what the table in balance.ts says: a share nobody feels is inside the band, one worth feeling is far outside it', () => {
    const rows: string[] = [];
    for (const name of ['once a day', 'casual', 'active', 'walks 神']) {
      const start = arrivalOfHabit(name);
      const small = kitClock(start, 40, IN_BAND);
      expect(small.gain, `${name}: the kit helps`).toBeGreaterThanOrEqual(0);
      expect(small.gain, `${name}: a share of ${IN_BAND} is inside the band`).toBeLessThanOrEqual(KIT_CLOCK_BAND);
      for (const d of small.on.days) expect(d).toBeLessThanOrEqual(MAX_MARK_DAYS);
      const felt = kitClock(start, 40, FELT);
      rows.push(`    ${name.padEnd(12)} ${String(small.offDays).padStart(4)} days   ` +
        `${IN_BAND * 100}%: ${String(small.onDays).padStart(4)} (${(small.gain * 100).toFixed(1)}% sooner)   ` +
        `${FELT * 100}%: ${String(felt.onDays).padStart(4)} (${(felt.gain * 100).toFixed(1)}% sooner)`);
      // The reason the shipped share is 0: a kit worth feeling takes several times the band off.
      expect(felt.gain, `${name}: a share of ${FELT} trivialises the endgame`).toBeGreaterThan(KIT_CLOCK_BAND * 2);
    }
    console.log(`\n  劫 forty crossings, a crafter at Alchemy and Sigil Writing 99, the kit counting at the Dragon (band ${KIT_CLOCK_BAND * 100}%):\n${rows.join('\n')}\n`);
  }, 600_000);

  /**
   * 穩 The knife edge. A share that holds at one number and walls at the next is not a
   * balance. Push the largest share the band allows a tenth up, stand every Dragon a tenth
   * heavier, and do both: the clock must slow and keep moving, never wall and never collapse
   * to the pool's two days.
   */
  it('slows under a tenth more share and under a heavier Dragon, and never walls or collapses', () => {
    const start = arrivalOfHabit('active');
    const at = kitClock(start, 40, IN_BAND);
    const more = kitClock(start, 40, IN_BAND * 1.1);
    const heavy = kitClock(start, 40, IN_BAND, 1.1);
    console.log(`\n  穩 forty crossings, the active crafter: off ${at.offDays}, kit at ${IN_BAND * 100}% ${at.onDays}` +
      `, a tenth more share ${more.onDays}, every Dragon a tenth heavier ${heavy.onDays} (off ${heavy.offDays})\n`);
    // A tenth more share is a few days sooner at most, not a cliff.
    expect(more.onDays).toBeLessThanOrEqual(at.onDays + 2);
    expect(at.onDays - more.onDays).toBeLessThanOrEqual(at.offDays * 0.05);
    expect(more.gain).toBeLessThanOrEqual(KIT_CLOCK_BAND);
    // A heavier Dragon slows the crafter, and the kit still helps against it.
    expect(heavy.onDays).toBeGreaterThan(at.onDays);
    expect(heavy.onDays).toBeLessThanOrEqual(heavy.offDays);
    for (const d of heavy.on.days) expect(d).toBeLessThanOrEqual(MAX_MARK_DAYS);
    // Flat, not climbing.
    const last = total(heavy.on.days.slice(-10)), before = total(heavy.on.days.slice(-20, -10));
    expect(last).toBeLessThanOrEqual(before * 1.15);
  }, 600_000);

  it('holds for eighty crossings, a tenth heavier as well', () => {
    const start = arrivalOfHabit('active');
    const plain = kitClock(start, 80, IN_BAND);
    const heavy = kitClock(start, 80, IN_BAND, 1.1);
    console.log(`\n  久 eighty crossings, the active crafter at ${IN_BAND * 100}%: off ${plain.offDays}, kit ${plain.onDays}` +
      ` (${(plain.gain * 100).toFixed(1)}% sooner); a tenth heavier: off ${heavy.offDays}, kit ${heavy.onDays}\n`);
    expect(plain.gain).toBeLessThanOrEqual(KIT_CLOCK_BAND);
    expect(plain.gain).toBeGreaterThanOrEqual(0);
    expect(heavy.onDays).toBeGreaterThan(plain.onDays);
    for (const d of [...plain.on.days, ...heavy.on.days]) expect(d).toBeLessThanOrEqual(MAX_MARK_DAYS);
  }, 600_000);
});

describe('驗 the server allows what the game allows, and no more', () => {
  const top = playEndgame(3).end;
  const crafter = crafterOf(top);

  /** A crossing claimed against a Dragon of this anchor: the pair verify reads, a mark apart, with all the time in the world. */
  const claim = (at: number) => {
    const before: State = { ...crafter, tribulationAt: at };
    const later = before.at + 30 * 86_400;
    const after: State = { ...before, at: later, tribulation: before.tribulation + 1, tribulationAt: anchorFloor(before, before.tribulation + 1) * 1.01 };
    return { before, after: validate(after, later), seconds: later - before.at };
  };
  const faced = (at: number): State => ({ ...crafter, realm: 9, layer: 8, tribulation: crafter.tribulation, tribulationAt: at });
  /** The heaviest anchor a kit could still beat the Dragon at, by bisection on a log scale. */
  const heaviest = (share: number | null) => {
    let lo = Math.max(1, top.tribulationAt), hi = lo * 1e6;
    for (let i = 0; i < 40; i++) {
      const mid = Math.sqrt(lo * hi);
      const f = faced(mid);
      const kit = share === null ? NO_KIT : bestKit(f, DRAGON, 'dragon', share);
      if (beatable(f, DRAGON, undefined, kit)) lo = mid; else hi = mid;
    }
    return lo;
  };

  it('refuses a crossing only a full-strength kit could have won, and takes one the fractional kit could', () => {
    const whole = heaviest(1);
    const part = heaviest(FELT);
    const none = heaviest(null);
    console.log(`\n  驗 the heaviest anchor each reading beats: no kit ${none.toExponential(3)}, ${FELT * 100}% of a kit ${part.toExponential(3)}` +
      `, the whole kit ${whole.toExponential(3)}\n`);
    expect(part).toBeGreaterThanOrEqual(none);
    expect(whole).toBeGreaterThan(part * 1.05);

    // A Dragon between them: only a whole kit beats it, and a fractional one does not.
    const between = claim(Math.sqrt(whole * part));
    expect(dragonBeaten(between.before, between.after, 1)).toBe(true);
    expect(dragonBeaten(between.before, between.after, FELT)).toBe(false);
    // The shipped reading counts the whole kit, so it takes that one and refuses one past it.
    expect(verify(between.before, between.after, between.seconds).why).not.toContain('warden');
    const beyond = claim(whole * 1.1);
    const refused = verify(beyond.before, beyond.after, beyond.seconds);
    expect(refused.why).toContain('warden');
    expect(refused.strike).toBe(true);

    // One the fractional kit can beat is not struck for it.
    const fair = claim(part * 0.98);
    expect(dragonBeaten(fair.before, fair.after, FELT)).toBe(true);
  }, 300_000);

  it('still takes the crossings it always took, a cultivator with no workshop included', () => {
    const before = playEndgame(2).end;
    const after = playEndgame(3).end;
    const v = verify(before, after, 12 * 86_400);
    expect(v.why).not.toContain('warden');
    expect(v.why).not.toContain('anchor');
    // The ceiling of a save with nothing made is no kit at all, at any share.
    const bare = bestKit(top, DRAGON, 'dragon', 1);
    expect(bare.strike).toBe(1);
    expect(bare.taken).toBe(1);
    expect(bare.mend).toBe(0);
    expect(bare.revive).toBe(false);
  });
});
