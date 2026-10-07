import { describe, expect, it } from 'vitest';
import { XP_TABLE, hundredKey, metalKey, partKey, type HundredRank } from '../../data/crafts.ts';
import { AFFIXES, GEAR, SLOTS, TEMPLATE_BY_KEY, baseValue, type Item, type Slot } from '../../data/gear.ts';
import { commonsOf, wardenOf } from '../../data/bestiary.ts';
import {
  CODEX_CAP, CRAFT_KIT, HUNDRED_BAND, HUNDRED_HEAVEN_MADE, LUCK_ROLL_TOP, SECONDARY_SHARE, VARIANCE,
} from '../balance.ts';
import {
  bandTop, codexRank, codexValue, hundredFits, hundredWorn, lineValue, orderNeeds, pieceOf, spiritOf, validOrder,
  type Order,
} from '../hundred.ts';
import { blocked, carry, kitFor, secondsOf, setOrder, work } from '../crafts.ts';
import { RECIPE_BY_KEY } from '../../data/crafts.ts';
import { effectiveBeastPower, lootFrom } from '../combat.ts';
import { fateFull } from '../fate.ts';
import { validate, type State } from '../state.ts';
import { verify } from '../verify.ts';

const T0 = 1_700_000_000;
const DAY = 86_400;
const HOUR = 3600;
const lvl = (l: number) => XP_TABLE[l] + Math.floor((XP_TABLE[l + 1] - XP_TABLE[l]) * 0.4);

/** A fifth-realm crafter who knows every beast up to its realm: an honest save, read back through validate(). */
function crafter(over: Record<string, unknown> = {}, crafts: Record<string, unknown> = {}): State {
  const killed: Record<string, number> = {};
  for (let r = 1; r <= 5; r++) { for (const b of commonsOf(r)) killed[b.key] = 40; killed[wardenOf(r).key] = 1; }
  return validate({
    v: 1, at: T0, startedAt: T0 - 60 * DAY, realm: 5, layer: 4, qi: 1e6, materials: 1e6, wardenFell: false,
    levels: { technique: 20, method: 20, pills: 20, cores: 10 }, killed, worn: {}, chest: [],
    self: null, stance: null, sequence: [], tribulation: 0, tribulationAt: 0, tower: 20,
    brewed: { body: 0, bane: 0, fortune: 0 }, awakened: [], seen: ['whom'],
    ...over,
    crafts: {
      xp: { herb: lvl(60), vein: lvl(58), render: lvl(60), forge: lvl(75), alchemy: lvl(50), sigil: 0, array: 0 },
      task: null, since: T0, made: {}, tools: {}, arrays: [], cut: {}, carry: { elixir: null, sigil: null }, seek: 0,
      pouch: { metal5: 40, [partKey('lizard')]: 200, [partKey('turtle')]: 10, cinnabar: 200, ginseng: 200, jade: 100, stone: 100 },
      ...crafts,
    },
  }, T0);
}

const ORDER: Order = { template: 'sword5', rarity: 'mystic', main: 3, lines: [{ affix: 'sunder', n: 2 }, { affix: 'rate', n: 1 }] };

/** Six pieces of a realm's set at a rank, power first. */
function six(realm: number, rarity: HundredRank): Partial<Record<Slot, Item>> {
  return Object.fromEntries(SLOTS.map((slot) => {
    const shapes = GEAR.filter((g) => g.realm === realm && g.slot === slot);
    const tpl = shapes.find((g) => g.affix === 'power') ?? shapes[0];
    const lines = (['power', 'sunder', 'rate', 'capacity', 'refine'] as const).filter((a) => a !== tpl.affix)
      .slice(0, { mystic: 2, earth: 3, heaven: 4 }[rarity]);
    return [slot, pieceOf({ template: tpl.key, rarity, main: 3, lines: lines.map((affix) => ({ affix, n: 3 as const })) }, `h-${slot}`)!];
  }));
}
const madeAll = (realm: number, rarity: HundredRank) =>
  Object.fromEntries(SLOTS.map((slot) => [hundredKey(realm, slot, rarity), 1]));

describe('百煉 a Hundredfold piece', () => {
  it('puts every line where its portions say: the bottom, middle or top of the band a drop rolls in', () => {
    const tpl = TEMPLATE_BY_KEY.sword5;
    for (const n of [1, 2, 3] as const) {
      expect(lineValue(tpl, 'heaven', 'power', n, true)).toBeCloseTo(baseValue(tpl, 'heaven', 'power') * HUNDRED_BAND[n - 1], 0);
      expect(lineValue(tpl, 'heaven', 'sunder', n, false))
        .toBeCloseTo(baseValue(tpl, 'heaven', 'sunder') * SECONDARY_SHARE * HUNDRED_BAND[n - 1], 0);
    }
    const p = pieceOf(ORDER, 'x')!;
    expect(p.rolls.map((r) => r.affix)).toEqual(['power', 'sunder', 'rate']);
    expect(p.from).toBe('forge');
    expect(p.hundred).toBe(true);
  });

  it('律 is never better on any line than the best a drop of its shape and rank can roll, so the qi rate cannot climb past gear', () => {
    let lines = 0;
    for (const tpl of GEAR) for (const rank of ['mystic', 'earth', 'heaven'] as const) for (const a of AFFIXES) {
      const drop = baseValue(tpl, rank, a) * (a === tpl.affix ? 1 : SECONDARY_SHARE) * (1 + VARIANCE + LUCK_ROLL_TOP);
      expect(bandTop(tpl, rank, a, a === tpl.affix)).toBeLessThanOrEqual(Math.max(drop, 1) + 1e-9);
      lines++;
    }
    expect(lines).toBeGreaterThan(10_000);
  });

  it('is forged from an order: three hours, what the crucible asked for spent, the crucible emptied, the count kept', () => {
    const s = crafter();
    const set = setOrder(s, ORDER, T0);
    expect(set.crafts.task).toBe(hundredKey(5, 'weapon', 'mystic'));
    const needs = orderNeeds(ORDER);
    expect(needs).toContainEqual([metalKey(5), 6]);
    expect(needs).toContainEqual([partKey('lizard'), 2 + 2 * 15]);
    expect(needs).toContainEqual(['ginseng', 15]);
    const done = work(set, T0 + 4 * HOUR);
    const piece = done.chest.find((x) => x.hundred);
    expect(piece?.rolls).toEqual(pieceOf(ORDER, 'x')!.rolls);
    expect(done.crafts.made[hundredKey(5, 'weapon', 'mystic')]).toBe(1);
    expect(done.crafts.order).toBeUndefined();
    for (const [k, n] of needs) expect(done.crafts.pouch[k] ?? 0).toBe((s.crafts.pouch[k] ?? 0) - n);
    // 守 And the save round-trips unchanged: the mark is backed, the lines are in the band.
    const back = validate(JSON.parse(JSON.stringify(done)), done.at);
    expect(back.chest.find((x) => x.hundred)).toEqual(piece);
    expect(back.crafts.made).toEqual(done.crafts.made);
  });

  it('asks five pieces of its set before Heaven, and the level, and its elite known', () => {
    const heaven: Order = { ...ORDER, rarity: 'heaven', lines: [{ affix: 'sunder', n: 3 }, { affix: 'rate', n: 3 }, { affix: 'capacity', n: 1 }, { affix: 'refine', n: 1 }] };
    const s = crafter({}, { xp: { herb: lvl(60), vein: lvl(58), render: lvl(60), forge: lvl(80), alchemy: 0, sigil: 0, array: 0 } });
    const r = RECIPE_BY_KEY[hundredKey(5, 'weapon', 'heaven')];
    expect(blocked({ ...s, crafts: { ...s.crafts, order: heaven } }, r)).toBe('level');
    const five = { ...s, crafts: { ...s.crafts, order: heaven, made: Object.fromEntries(SLOTS.slice(0, HUNDRED_HEAVEN_MADE).map((x) => [hundredKey(5, x, 'mystic'), 1])) } };
    expect(blocked(five, r)).toBeNull();
    // 霸 Without the elite known the set waits for it, as Rendering does, and a count made
    // without it is not kept.
    const unknown = crafter({ killed: { ...s.killed, lizard: 3 } });
    const waiting = setOrder(unknown, ORDER, T0);
    expect(blocked(waiting, RECIPE_BY_KEY[hundredKey(5, 'weapon', 'mystic')])).toBe('remains');
    expect(work(waiting, T0 + 8 * HOUR).chest.some((x) => x.hundred)).toBe(false);
    const claimed = validate(JSON.parse(JSON.stringify({ ...unknown, crafts: { ...unknown.crafts, made: madeAll(5, 'mystic') } })), T0);
    expect(codexRank(claimed.crafts.made, 5)).toBe(0);
  });

  it('refuses an order the crucible could not hold', () => {
    expect(validOrder({ ...ORDER, lines: [{ affix: 'power', n: 3 }, { affix: 'rate', n: 1 }] }, 5)).toBeNull();
    expect(validOrder({ ...ORDER, lines: [{ affix: 'sunder', n: 4 }, { affix: 'rate', n: 1 }] }, 5)).toBeNull();
    expect(validOrder({ ...ORDER, lines: [{ affix: 'sunder', n: 3 }] }, 5)).toBeNull();
    expect(validOrder({ ...ORDER, template: 'sword7' }, 5)).toBeNull();
    expect(validOrder(ORDER, 5)).toEqual(ORDER);
  });
});

describe('譜 the codex, read off the pieces made', () => {
  it('is finished at the lowest rank its six places reach, and worth its step, its rank, and double worn whole, never past its cap', () => {
    const s = crafter();
    expect(codexRank(s.crafts.made, 2)).toBe(0);
    const mystic = { ...s, crafts: { ...s.crafts, made: madeAll(2, 'mystic') } };
    expect(codexRank(mystic.crafts.made, 2)).toBe(1);
    expect(codexValue(mystic, 'elite')).toBeCloseTo(0.08);
    const heaven = { ...s, crafts: { ...s.crafts, made: { ...madeAll(2, 'mystic'), ...madeAll(2, 'heaven') } } };
    expect(codexRank(heaven.crafts.made, 2)).toBe(3);
    expect(codexValue(heaven, 'elite')).toBeCloseTo(0.16);
    const whole = { ...heaven, worn: six(2, 'heaven') };
    expect(codexValue(whole, 'elite')).toBeCloseTo(CODEX_CAP.elite);
    expect(spiritOf(whole.worn)).toBe(2);
    expect(spiritOf(six(2, 'earth'))).toBeNull();
  });

  it('reaches each system it names, and only that one', () => {
    const s = crafter();
    const with_ = (realm: number, rarity: HundredRank = 'heaven') =>
      ({ ...s, crafts: { ...s.crafts, made: { ...madeAll(realm, 'mystic'), ...madeAll(realm, rarity) } } });
    const elite = commonsOf(5)[2];
    expect(effectiveBeastPower(with_(2), elite) / effectiveBeastPower(s, elite)).toBeCloseTo(0.84);
    expect(effectiveBeastPower(with_(2), commonsOf(5)[0])).toBe(effectiveBeastPower(s, commonsOf(5)[0]));
    expect(lootFrom(with_(1), commonsOf(5)[0])).toBeGreaterThan(lootFrom(s, commonsOf(5)[0]));
    expect(effectiveBeastPower(with_(8), commonsOf(5)[0], 1000)).toBeCloseTo(900);
    expect(effectiveBeastPower(with_(9), { ...commonsOf(5)[0], challenger: 0 }, 1000)).toBeCloseTo(900);
    expect(kitFor(with_(3), commonsOf(6)[0], 'vault').kit.foe).toBeCloseTo(0.84);
    const r = RECIPE_BY_KEY['forge:metal5'];
    expect(secondsOf(with_(5), r) / secondsOf(s, r)).toBeCloseTo(0.9);
    expect(fateFull(with_(6))).toBeLessThan(fateFull(s));
  });

  it('百 at two pieces worn makes what is carried a quarter stronger, at four breaks a day more, and Thunderscript half a day a rank', () => {
    const s = carry({ ...crafter(), gateAt: T0 - DAY, layer: 8, crafts: { ...crafter().crafts, pouch: { 'might5@0': 2 } } }, 'elixir', 'might5@0');
    const w = wardenOf(5);
    const bare = kitFor(s, w, 'warden').kit;
    expect(bare.strike).toBeCloseTo(1 + CRAFT_KIT.might);
    const two = { ...s, worn: Object.fromEntries(Object.entries(six(5, 'mystic')).slice(0, 2)) };
    expect(hundredWorn(two.worn)).toBe(2);
    expect(kitFor(two, w, 'warden').kit.strike).toBeCloseTo(1 + CRAFT_KIT.might * 1.25);
    expect(kitFor(two, w, 'warden').kit.breach).toBeCloseTo(bare.breach ?? 0);
    const four = { ...s, worn: Object.fromEntries(Object.entries(six(5, 'mystic')).slice(0, 4)) };
    expect(kitFor(four, w, 'warden').kit.breach).toBeCloseTo((bare.breach ?? 0) + 1);
  });
});

describe('驗 the server reads the Hundredfold things', () => {
  const s = crafter();
  const done = work(setOrder(s, ORDER, T0), T0 + 4 * HOUR);
  const after = { ...done, at: T0 + 4 * HOUR };

  it('an honest pair passes: a piece forged in the hours that passed', () => {
    expect(hundredFits(after)).toBe(true);
    const v = verify(s, after, 4 * HOUR);
    expect(v.why).not.toContain('gear');
    expect(v.strike).toBe(false);
  });

  it('refuses a forged piece with a line above its band', () => {
    const piece = after.chest.find((x) => x.hundred)!;
    const edited = { ...piece, rolls: piece.rolls.map((r, i) => (i === 0 ? { ...r, value: r.value * 1.5 } : r)) };
    const cheat = { ...after, chest: after.chest.map((x) => (x === piece ? edited : x)) };
    expect(hundredFits(cheat)).toBe(false);
    const v = verify(s, cheat, 4 * HOUR);
    expect(v.why).toContain('gear');
    expect(v.strike).toBe(true);
    // validate() holds the same line to the top of its band on the way in.
    const back = validate(JSON.parse(JSON.stringify(cheat)), cheat.at);
    const kept = back.chest.find((x) => x.hundred)!;
    expect(kept.rolls[0].value).toBeLessThanOrEqual(bandTop(TEMPLATE_BY_KEY.sword5, 'mystic', 'power', true));
  });

  it('refuses a codex that was never earned: a set finished at Heaven with no forge for it, or no elite known', () => {
    const claimed = { ...after, crafts: { ...after.crafts, made: { ...after.crafts.made, ...madeAll(6, 'mystic'), ...madeAll(6, 'heaven') } } };
    expect(hundredFits(claimed)).toBe(false);
    expect(verify(s, claimed, 4 * HOUR).why).toContain('gear');
    expect(codexRank(validate(JSON.parse(JSON.stringify(claimed)), claimed.at).crafts.made, 6)).toBe(0);
    const heavenFirst = { ...after, crafts: { ...after.crafts, made: { ...after.crafts.made, ...madeAll(1, 'heaven') } } };
    expect(hundredFits(heavenFirst)).toBe(false);
    expect(codexRank(validate(JSON.parse(JSON.stringify(heavenFirst)), heavenFirst.at).crafts.made, 1)).toBe(0);
  });

  it('refuses a mark nothing made, and a line whose material was out of reach', () => {
    const stray = { ...pieceOf({ ...ORDER, template: 'robe5' }, 'stray')!, rolls: pieceOf({ ...ORDER, template: 'robe5', lines: [{ affix: 'sunder', n: 2 }, { affix: 'power', n: 1 }] }, 'stray')!.rolls };
    const unbacked = { ...after, chest: [...after.chest, stray] };
    expect(hundredFits(unbacked)).toBe(false);
    expect(validate(JSON.parse(JSON.stringify(unbacked)), unbacked.at).chest.find((x) => x.id === 'stray')?.hundred).toBeUndefined();
    const gold = pieceOf({ ...ORDER, lines: [{ affix: 'find', n: 1 }, { affix: 'rate', n: 1 }] }, 'gold')!;
    const reached = { ...after, chest: [...after.chest.filter((x) => !x.hundred), gold] };
    expect(hundredFits(reached)).toBe(false);
  });
});
