import { describe, expect, it } from 'vitest';
import { SKILL_KEYS, XP_CAP, XP_TABLE, levelOf, type SkillKey } from '../../data/crafts.ts';
import { CRAFT_CARRY } from '../balance.ts';
import { NO_CRAFTS, XP_PER_SECOND_MAX, carriedXp, levelIn, validCrafts } from '../crafts.ts';
import { bornFrom, reincarnate } from '../rebirth.ts';
import { newState, validate, type State } from '../state.ts';
import { verify } from '../verify.ts';
import { REBIRTH } from '../../app/copy.ts';

/**
 * 業 The workshop through a rebirth. rekaris (Discord, 2026-10-08): running the crafts all
 * again after a rebirth sounds exhausting. A new life begins each craft with CRAFT_CARRY of
 * the experience the life it left had earned in it, and nothing else of the workshop.
 *
 *   - the share is floored, never more than the life had, never past the cap;
 *   - only experience carries: the pouch, the counts, the tools, the arrays begin again;
 *   - a save is input: a closed craft holds the carried share and no more, a first life holds
 *     nothing in one, and a life from before the carry loads exactly as it was;
 *   - the server reads the new life from the experience it could honestly have been born
 *     with, and what is above that has to fit the time that passed.
 *
 * tools/carry.ts is where the share is measured against the climb and the rate.
 */
const T0 = 1_700_000_000;
const DAY = 86_400;

const xpOf = (levels: Partial<Record<SkillKey, number>>): Record<SkillKey, number> =>
  Object.fromEntries(SKILL_KEYS.map((k) => [k, XP_TABLE[levels[k] ?? 1]])) as Record<SkillKey, number>;

/** A summit cultivator with the third mark crossed and a workshop at work. */
const summit = (xp: Record<SkillKey, number>, over: Partial<State> = {}): State => {
  const s = newState(T0);
  return {
    ...s, at: T0 + 90 * DAY, realm: 9, layer: 8, tribulation: 3, qi: 1e9, self: 'woman', seen: ['whom'],
    crafts: { ...s.crafts, xp, pouch: { 'herb:grass': 40 } as never, made: { 'herb:grass': 12 }, tools: { ...NO_CRAFTS.tools, herb: 3 }, task: 'forge:sword' },
    ...over,
  };
};

const lifeXp = xpOf({ herb: 80, vein: 76, render: 70, forge: 74, alchemy: 72, sigil: 66, array: 60 });

describe('業 what a new life begins each craft with', () => {
  it('is the share of what the life had, floored, and never more', () => {
    const got = carriedXp(lifeXp, 0.25);
    for (const k of SKILL_KEYS) {
      expect(got[k]).toBe(Math.floor(lifeXp[k] * 0.25));
      expect(got[k]).toBeLessThan(lifeXp[k]);
      expect(Number.isInteger(got[k])).toBe(true);
    }
    expect(carriedXp(lifeXp, 0)).toEqual(carriedXp(undefined, 0.5));
    expect(carriedXp(lifeXp, 1)).toEqual(lifeXp);
    // A share past 1 or below 0 is the whole or none, never more than the life had.
    expect(carriedXp(lifeXp, 3)).toEqual(lifeXp);
    expect(carriedXp(lifeXp, -1)).toEqual(carriedXp(undefined));
    // And a save's experience is never read past the cap.
    expect(carriedXp({ ...lifeXp, herb: 1e12 }, 0.5).herb).toBe(Math.floor(XP_CAP / 2));
  });

  it('is a few levels, not a fraction of them: a quarter is fourteen levels fewer', () => {
    const quarter = carriedXp(xpOf({ herb: 90 }), 0.25).herb;
    expect(levelOf(quarter)).toBeGreaterThanOrEqual(90 - 15);
    expect(levelOf(quarter)).toBeLessThanOrEqual(90 - 13);
  });

  it('is on, at the share the measurement settled', () => {
    expect(CRAFT_CARRY).toBeGreaterThan(0);
    expect(CRAFT_CARRY).toBeLessThanOrEqual(0.5);
  });
});

describe('業 a rebirth carries the experience and nothing else of the workshop', () => {
  const old = summit(lifeXp);
  const born = reincarnate(old, old.at + 60);

  it('begins each craft at the share, below the life it left', () => {
    expect(born.realm).toBe(1);
    expect(born.crafts.xp).toEqual(carriedXp(lifeXp));
    for (const k of SKILL_KEYS) {
      expect(born.crafts.xp[k]).toBeLessThan(old.crafts.xp[k]);
      expect(levelIn(born, k)).toBeLessThan(levelIn(old, k));
    }
  });

  it('begins the pouch, the counts, the tools, the arrays and the task again', () => {
    expect(born.crafts.pouch).toEqual({});
    expect(born.crafts.made).toEqual({});
    expect(born.crafts.tools).toEqual(NO_CRAFTS.tools);
    expect(born.crafts.arrays).toEqual([]);
    expect(born.crafts.cut).toEqual({});
    expect(born.crafts.task).toBeNull();
    expect(born.crafts.carry).toEqual(NO_CRAFTS.carry);
    expect(born.materials).toBe(0);
  });

  it('compounds under a roof: the life after carries the share of a life that carried one', () => {
    let xp = lifeXp;
    // A life that earns nothing on top still carries less each time, never more.
    for (let i = 0; i < 4; i++) {
      const next = carriedXp(xp);
      for (const k of SKILL_KEYS) expect(next[k]).toBeLessThanOrEqual(xp[k]);
      xp = next;
    }
    // And one that earns the same again each life settles at 1 / (1 - share) of one life's.
    let held = 0;
    for (let i = 0; i < 40; i++) held = Math.floor((held + 1e6) * CRAFT_CARRY);
    expect(held).toBeLessThan(1e6 * CRAFT_CARRY / (1 - CRAFT_CARRY) + 1);
  });

  it('is the same function the server is reborn through', () => {
    expect(bornFrom(old, [{ marks: 3, at: old.at }], old.at).crafts.xp).toEqual(born.crafts.xp);
    // A first life's `prev` with no workshop at all (the harnesses build it) carries zeros.
    expect(bornFrom(newState(T0), [{ marks: 3, at: T0 }], T0).crafts.xp).toEqual(NO_CRAFTS.xp);
  });
});

describe('守 the save is input', () => {
  const now = T0 + 200 * DAY;
  const roof = Math.floor(XP_CAP * CRAFT_CARRY);

  it('keeps the carried experience of a closed craft, to the byte, through validate', () => {
    const old = summit(lifeXp);
    const born = reincarnate(old, now - 100);
    const back = validate(JSON.parse(JSON.stringify(born)), now);
    expect(back.realm).toBe(1);
    expect(back.crafts.xp).toEqual(born.crafts.xp);
    for (const k of SKILL_KEYS) expect(back.crafts.xp[k]).toBeGreaterThan(0);
  });

  it('holds a closed craft in a later life to the share of the cap and no more', () => {
    const forged = { ...xpOf({}), herb: XP_CAP, array: roof + 5 };
    const born = reincarnate(summit(lifeXp), now - 100);
    const back = validate({ ...JSON.parse(JSON.stringify(born)), crafts: { ...born.crafts, xp: forged } }, now);
    expect(back.crafts.xp.herb).toBe(roof);
    expect(back.crafts.xp.array).toBe(roof);
  });

  it('gives a first life nothing in a craft that is not open, as it always did', () => {
    const first = { ...newState(T0), at: now - 10, crafts: { ...NO_CRAFTS, xp: xpOf({ herb: 50, array: 50 }) } };
    expect(validate(JSON.parse(JSON.stringify(first)), now).crafts.xp).toEqual(NO_CRAFTS.xp);
  });

  it('loads a life that began before the carry exactly as it was', () => {
    const legacy = { ...newState(T0), at: now - 10, lives: [{ marks: 3, at: T0 + DAY }] };
    const back = validate(JSON.parse(JSON.stringify(legacy)), now);
    expect(back.crafts.xp).toEqual(NO_CRAFTS.xp);
    expect(back.lives).toEqual(legacy.lives);
    // And one that is deep in its workshop keeps every craft it earned.
    const deep = { ...legacy, realm: 9, crafts: { ...legacy.crafts, xp: lifeXp } };
    expect(validate(JSON.parse(JSON.stringify(deep)), now).crafts.xp).toEqual(lifeXp);
  });

  it('still bounds an open craft by the time the run has lived', () => {
    const at = { realm: 9, killed: {}, startedAt: T0 };
    const back = validCrafts({ xp: { herb: XP_CAP, forge: XP_CAP } }, at, T0 + 1000, 2);
    expect(back.xp.herb).toBeLessThanOrEqual(1000 * XP_PER_SECOND_MAX.herb * 1.05);
    expect(back.xp.forge).toBeLessThanOrEqual(1000 * XP_PER_SECOND_MAX.forge * 1.05);
  });
});

describe('驗 the server reads the carry from the time that passed', () => {
  const old = summit(lifeXp);
  const at = old.at + 300;
  const born = reincarnate(old, at);

  it('accepts the rebirth of a cultivator the server last saw at the end of the life', () => {
    const v = verify(old, born, 300);
    expect(v.why).toEqual([]);
    expect(v.strike).toBe(false);
  });

  it('accepts the share of a life that went on crafting after the last save, within the time', () => {
    // The server saw the life a day before it ended, and it crafted at the fastest all day.
    const day = DAY;
    const seen = summit(xpOf({}), { at: old.at - day });
    const grown = Object.fromEntries(SKILL_KEYS.map((k) => [k, Math.floor(day * XP_PER_SECOND_MAX[k])])) as Record<SkillKey, number>;
    const ended = summit(grown);
    const reborn = reincarnate(ended, ended.at + 300);
    expect(reborn.crafts.xp.herb).toBeGreaterThan(0);
    const v = verify(seen, reborn, day + 300);
    expect(v.why).not.toContain('too-fast');
    expect(v.strike).toBe(false);
  });

  it('waits for a carry the time could not have paid for, and does not strike', () => {
    const forged: State = { ...born, crafts: { ...born.crafts, xp: { ...born.crafts.xp, forge: XP_CAP, sigil: XP_CAP } } };
    const v = verify(old, forged, 300);
    expect(v.ok).toBe(false);
    expect(v.why).toContain('too-fast');
    expect(v.strike).toBe(false);
  });

  it('waits for experience written into the new life by hand, as in any life', () => {
    const edited: State = { ...born, crafts: { ...born.crafts, xp: { ...born.crafts.xp, herb: born.crafts.xp.herb + 5e6 } } };
    const v = verify(old, edited, 300);
    expect(v.why).toContain('too-fast');
    // Where the same experience is spread over the days it takes, it passes.
    const long = verify(old, edited, 300 + (5e6 / XP_PER_SECOND_MAX.herb) * 1.2);
    expect(long.why).not.toContain('too-fast');
  });

  it('reads a save with no carry at all as it always did', () => {
    const none = { ...born, crafts: { ...born.crafts, xp: { ...NO_CRAFTS.xp } } };
    expect(verify(old, none, 300).why).toEqual([]);
  });
});

describe('頁 the Rebirth page says what the workshop keeps', () => {
  it('names the share and where the crafts would begin, and what begins again', () => {
    const [han, name, says] = REBIRTH.carriesWorkshop;
    expect(han).toBe('業');
    expect(name).toBe('The workshop');
    expect(says(`${Math.round(CRAFT_CARRY * 100)}%`)).toContain(`${Math.round(CRAFT_CARRY * 100)}% of the experience`);
    expect(REBIRTH.workshopLevels(46, 66)).toBe('(yours begin at levels 46 to 66)');
    expect(REBIRTH.workshopLevels(55, 55)).toBe('(yours begin at level 55)');
    expect(REBIRTH.bornWorkshop(46, 66)).toContain('levels 46 to 66');
    // The page that keeps the experience must not also say the whole workshop begins again.
    expect(REBIRTH.resets).toContain('but not its codex or its experience');
    expect(REBIRTH.resets).not.toContain('the vault and the workshop, all but its codex');
  });

  it('reads the levels it promises off the same function the rebirth is written with', () => {
    const old = summit(lifeXp);
    const born = reincarnate(old, old.at + 60);
    const promised = SKILL_KEYS.map((k) => levelOf(carriedXp(old.crafts.xp)[k]));
    expect(SKILL_KEYS.map((k) => levelIn(born, k))).toEqual(promised);
  });
});
