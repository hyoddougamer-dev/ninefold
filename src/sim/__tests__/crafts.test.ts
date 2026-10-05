import { describe, expect, it } from 'vitest';
import {
  ITEMS, ITEM_BY_KEY, PARTS, RECIPES, RECIPE_BY_KEY, SKILLS, SKILL_KEYS, XP_TABLE, levelOf, partKey,
  FORGED, splitKey, type SkillKey,
} from '../../data/crafts.ts';
import { BEASTS, commonsOf, wardenOf } from '../../data/bestiary.ts';
import { TEMPLATE_BY_KEY } from '../../data/gear.ts';
import {
  CRAFT_RENDER_KNOWN, CRAFT_HOURS_TO_CAP, CRAFT_LONG_WATCH_HOURS, CRAFT_WORK_HOURS, LAYERS_PER_REALM,
  CRAFT_FEED_LEVEL, CRAFT_MARKS, CRAFT_MARK_FASTER, CRAFT_MARK_SUB, CRAFT_MARK_TWICE, CRAFT_MASTERY_CAP,
  CRAFT_MASTERY_SPEED, CRAFT_KIT, CRAFT_KIT_WORK, CRAFT_QUALITY_MULT, CRAFT_SECONDS,
} from '../balance.ts';
import {
  NO_CRAFTS, arraySlots, blocked, carry, demonsLeft, kitFor, kitWhere, placeArray, qualityOdds, knownAt,
  secondsOf, setTask, spendKit, takeSeeking, tookPart, validCrafts, work, XP_PER_SECOND_MAX, bestKit,
  markApplies, marksOf, masteryOf, needsOf, skillOpen, subsOf, twiceOf, recipesOf,
  type Crafts,
} from '../crafts.ts';
import { newState, rate, validate, type State } from '../state.ts';
import { oddsRaw } from '../combat.ts';
import { fusable } from '../chest.ts';
import { salvage } from '../salvage.ts';
import { lifted, limitFor } from '../stash.ts';
import { verify } from '../verify.ts';
import { floorBeast, floorPower } from '../tower.ts';
import { demonOf, demonPower, demonsFor } from '../seclusion.ts';
import { isOpen } from '../unlocks.ts';
import { kitWork } from '../../../tools/kitwork.ts';

const T0 = 1_700_000_000;
const HOUR = 3600;

/** A cultivator of a realm with the workshop's levels set and a stocked pouch. */
function crafter(realm: number, levels: Partial<Record<SkillKey, number>> = {}, over: Partial<Crafts> = {}, s: Partial<State> = {}): State {
  const base = newState(T0);
  const xp = { ...NO_CRAFTS.xp };
  for (const [k, l] of Object.entries(levels)) xp[k as SkillKey] = XP_TABLE[l as number];
  return {
    ...base, realm, layer: 4, startedAt: T0 - 200 * 86_400, materials: 1e9, qi: 1e6, ...s,
    crafts: { ...NO_CRAFTS, since: T0, ...over, xp: { ...xp, ...(over.xp ?? {}) } },
  };
}

describe('業 the tables', () => {
  it('is RuneScape’s experience table', () => {
    expect(XP_TABLE[2]).toBe(83);
    expect(XP_TABLE[92]).toBe(6_517_253);
    expect(XP_TABLE[99]).toBe(13_034_431);
    expect(levelOf(0)).toBe(1);
    expect(levelOf(XP_TABLE[50])).toBe(50);
    expect(levelOf(1e12)).toBe(99);
  });

  it('builds every recipe out of things the game has, and every need out of something made', () => {
    const made = new Set(RECIPES.flatMap((r) => (r.makes.kind === 'item' ? [r.makes.item] : [])));
    for (const r of RECIPES) {
      expect(r.level).toBeGreaterThanOrEqual(1);
      expect(r.level).toBeLessThanOrEqual(99);
      expect(r.realm).toBeGreaterThanOrEqual(1);
      expect(r.realm).toBeLessThanOrEqual(9);
      expect(r.xp).toBeGreaterThan(0);
      expect(r.seconds).toBeGreaterThan(0);
      for (const [k, n] of r.needs) {
        expect(n).toBeGreaterThan(0);
        if (k !== 'mat') expect(made.has(k), `${r.key} needs ${k}, which nothing makes`).toBe(true);
      }
      if (r.makes.kind === 'gear') expect(TEMPLATE_BY_KEY[r.makes.template], r.key).toBeDefined();
      if (r.remains) expect(BEASTS.some((b) => b.key === r.remains)).toBe(true);
    }
    // 解 Every one of the 36 beasts leaves a part, and every part is something.
    for (const b of BEASTS) {
      expect(PARTS[b.key], b.key).toBeDefined();
      expect(ITEM_BY_KEY[partKey(b.key)]).toBeDefined();
    }
    // A need never asks for a realm the recipe itself does not reach.
    for (const r of RECIPES) for (const [k] of r.needs) {
      if (k === 'mat') continue;
      const maker = RECIPES.find((x) => x.makes.kind === 'item' && x.makes.item === k)!;
      expect(maker.realm, `${r.key} needs ${k} from realm ${maker.realm}`).toBeLessThanOrEqual(Math.max(r.realm, maker.realm));
    }
    console.log(`\n  業 ${SKILLS.length} crafts · ${RECIPES.length} recipes · ${ITEMS.length} materials and made things\n` +
      SKILLS.map((s) => `    ${s.seal} ${s.name.padEnd(15)} opens at realm ${s.realm} · ${RECIPES.filter((r) => r.skill === s.key).length} recipes`).join('\n') + '\n');
  });

  it('prints the curve: about CRAFT_HOURS_TO_CAP hours from 1 to 99 at the best recipe of each level', () => {
    const rows: string[] = [];
    for (const k of SKILL_KEYS) {
      const mine = RECIPES.filter((r) => r.skill === k && r.group !== 'Tools');
      let h = 0;
      const at: Record<number, number> = {};
      for (let l = 1; l < 99; l++) {
        const best = mine.filter((r) => r.level <= l).reduce((a, r) => (r.xp / r.seconds > a.xp / a.seconds ? r : a));
        h += (XP_TABLE[l + 1] - XP_TABLE[l]) / (3600 * best.xp / best.seconds);
        at[l + 1] = h;
      }
      rows.push(`    ${k.padEnd(8)} 10: ${at[10].toFixed(1).padStart(5)} h   50: ${at[50].toFixed(0).padStart(4)} h   ` +
        `70: ${at[70].toFixed(0).padStart(4)} h   92: ${at[92].toFixed(0).padStart(5)} h   99: ${at[99].toFixed(0).padStart(5)} h ` +
        `(${(at[99] / 16 / 30).toFixed(1)} months at 16 h a day)`);
      expect(at[99]).toBeGreaterThan(CRAFT_HOURS_TO_CAP * 0.97);
      expect(at[99]).toBeLessThan(CRAFT_HOURS_TO_CAP * 1.03);
      expect(at[10]).toBeLessThan(3);
    }
    console.log(`\n  經 hours of work to each level, one craft at a time, no tool, no array:\n${rows.join('\n')}\n`);
  });
});

describe('開 the workshop opens with the climb', () => {
  it('sets nothing before its realm, and each late craft only at its own', () => {
    const one = crafter(1);
    expect(setTask(one, 'herb:moss', T0).crafts.task).toBeNull();
    const two = crafter(2);
    expect(setTask(two, 'herb:moss', T0).crafts.task).toBe('herb:moss');
    expect(setTask(crafter(4, { alchemy: 50 }), 'alchemy:mend1', T0).crafts.task).toBeNull();
    expect(isOpen(5, 'alchemy')).toBe(true);
    expect(setTask(crafter(5, { alchemy: 1 }, { pouch: { moss: 4, [partKey('rat')]: 2 } }), 'alchemy:mend1', T0).crafts.task).toBe('alchemy:mend1');
    // 級 And a recipe waits for its realm, whatever the level.
    expect(blocked(crafter(3, { herb: 99 }), RECIPE_BY_KEY['herb:lotus'])).toBe('realm');
  });

  it('opens a late craft early at its feeder\'s CRAFT_FEED_LEVEL, and keeps every recipe at its realm', () => {
    const feeds = [['alchemy', 'herb'], ['sigil', 'vein'], ['array', 'forge']] as const;
    for (const [late, feeder] of feeds) {
      expect(skillOpen(crafter(2, { [feeder]: CRAFT_FEED_LEVEL - 1 }), late), late).toBe(false);
      expect(skillOpen(crafter(2, { [feeder]: CRAFT_FEED_LEVEL }), late), late).toBe(true);
      // Every recipe it has still waits for its own realm.
      const s = crafter(2, { [feeder]: CRAFT_FEED_LEVEL, [late]: 99 });
      for (const r of recipesOf(late)) if (r.realm > 2) expect(blocked(s, r), r.key).toBe('realm');
    }
    const early = crafter(2, { herb: CRAFT_FEED_LEVEL, alchemy: 1 }, { pouch: { moss: 4, [partKey('rat')]: 2 } });
    expect(setTask(early, 'alchemy:mend1', T0).crafts.task).toBe('alchemy:mend1');
  });

  it('never lets validate() zero an honest early alchemist, and never opens one that is not', () => {
    const save = { xp: { herb: XP_TABLE[CRAFT_FEED_LEVEL], alchemy: XP_TABLE[12] }, made: { 'alchemy:mend1': 30 } };
    const back = validCrafts(save, { realm: 2, killed: {}, startedAt: T0 }, T0 + 1e9);
    expect(back.xp.alchemy).toBe(XP_TABLE[12]);
    expect(back.made['alchemy:mend1']).toBe(30);
    const short = validCrafts({ ...save, xp: { ...save.xp, herb: XP_TABLE[CRAFT_FEED_LEVEL - 1] } }, { realm: 2, killed: {}, startedAt: T0 }, T0 + 1e9);
    expect(short.xp.alchemy).toBe(0);
    expect(short.made['alchemy:mend1']).toBeUndefined();
  });
});

/**
 * 丹符 rekaris (2026-10-05): a pill and a sigil cost next to nothing, so there was no reason
 * not to carry one into every fight. They are CRAFT_KIT_WORK times heavier now, and the
 * experience and the marks follow, so levelling takes the hours it did.
 */
describe('丹符 a pill and a sigil are an hour of work', () => {
  const kit = RECIPES.filter((r) => r.skill === 'alchemy' || r.skill === 'sigil');

  it('multiplies the time and every need of every pill and sigil, and nothing else', () => {
    expect(kit.length).toBeGreaterThanOrEqual(39);
    for (const r of kit) {
      expect(r.weight, r.key).toBe(CRAFT_KIT_WORK);
      expect(r.seconds % CRAFT_KIT_WORK, r.key).toBe(0);
      expect(r.seconds / CRAFT_KIT_WORK, r.key).toBeGreaterThanOrEqual(CRAFT_SECONDS[r.skill]);
      for (const [k, n] of r.needs) expect(n % CRAFT_KIT_WORK, `${r.key} ${k}`).toBe(0);
    }
    for (const r of RECIPES.filter((x) => x.skill !== 'alchemy' && x.skill !== 'sigil')) expect(r.weight, r.key).toBe(1);
  });

  it('takes about an hour a make with the tools of its realm, and never under fifty minutes', () => {
    const rows = kitWork();
    for (const w of rows) {
      expect(w.tooled, w.key).toBeGreaterThanOrEqual(50);
      expect(w.bare, w.key).toBeLessThanOrEqual(150);
    }
    const pills = rows.filter((w) => /^alchemy:(mend|guard|might)\d$/.test(w.key));
    const mean = pills.reduce((a, w) => a + w.tooled, 0) / pills.length;
    console.log(`    a line pill: ${pills[0].bare.toFixed(0)} min with no tool, ${mean.toFixed(0)} on average with its realm's tools`);
    expect(mean).toBeGreaterThan(55);
    expect(mean).toBeLessThan(75);
  });

  it('pays experience in proportion to its time, heavy or light, so the hours to 99 do not move', () => {
    // Every alchemy recipe pays the same experience a second at the same level, heavy or light.
    const per = (r: (typeof RECIPES)[number]) => r.xp / r.seconds / (1 + r.level / 8);
    const forge = RECIPES.filter((r) => r.skill === 'alchemy');
    for (const r of forge) expect(per(r) / per(forge[0]), r.key).toBeCloseTo(1, 2);
  });

  it('earns its marks in the hours a light recipe does, and its third mark takes a heavy make off', () => {
    const r = RECIPE_BY_KEY['alchemy:might5'];
    for (let i = 0; i < r.marks.length; i++) {
      expect(r.marks[i] * CRAFT_KIT_WORK).toBeGreaterThanOrEqual(CRAFT_MARKS[i]);
      expect((r.marks[i] - 1) * CRAFT_KIT_WORK).toBeLessThan(CRAFT_MARKS[i]);
    }
    const s = crafter(9, { alchemy: 99 }, { made: { [r.key]: r.marks[2] } });
    expect(marksOf(s, r)).toBeGreaterThanOrEqual(3);
    expect(needsOf(s, r)[0][1]).toBe(r.needs[0][1] - CRAFT_KIT_WORK);
  });

  it('says its numbers: every pill and sigil that changes a fight names them, read off CRAFT_KIT', () => {
    const pct = (x: number) => `${Number((x * 100).toFixed(1))}%`;
    const top = CRAFT_QUALITY_MULT[CRAFT_QUALITY_MULT.length - 1];
    expect(ITEM_BY_KEY.might5.does).toContain(pct(CRAFT_KIT.might));
    expect(ITEM_BY_KEY.might5.does).toContain(pct(CRAFT_KIT.might * top));
    expect(ITEM_BY_KEY.mend3.does).toContain(pct(CRAFT_KIT.mend));
    expect(ITEM_BY_KEY.guard9.does).toContain(pct(CRAFT_KIT.guard));
    expect(ITEM_BY_KEY.calmheart.does).toContain(pct(CRAFT_KIT.calmHeart));
    expect(ITEM_BY_KEY['sigil:warding'].does).toContain(pct(CRAFT_KIT.warding));
    expect(ITEM_BY_KEY['sigil:thunder'].does).toContain(pct(CRAFT_KIT.thunder));
    expect(ITEM_BY_KEY['sigil:fivethunder'].does).toContain(pct(CRAFT_KIT.fiveThunders));
    expect(ITEM_BY_KEY['sigil:mirror'].does).toContain(pct(CRAFT_KIT.mirror));
    expect(ITEM_BY_KEY['sigil:purity'].does).toContain(pct(CRAFT_KIT.purity));
    expect(ITEM_BY_KEY['sigil:heavenseal'].does).toContain(pct(CRAFT_KIT.warding));
    // And the fade for a fight above the realm it was made for.
    expect(ITEM_BY_KEY.might5.does).toContain(`×${CRAFT_KIT.fade}`);
    for (const it of ITEMS.filter((x) => x.kind === 'elixir' || x.kind === 'sigil')) expect(it.does, it.key).toBeTruthy();
  });

  it('never trims a pouch of old, light pills for being honest', () => {
    const mend = RECIPE_BY_KEY['alchemy:mend1'];
    // Forty old pills, each paid a 180th of what a make pays now.
    const xp = 40 * mend.xp / mend.weight + XP_TABLE[1];
    const back = validCrafts({ xp: { herb: XP_TABLE[CRAFT_FEED_LEVEL], alchemy: Math.max(xp, XP_TABLE[1]) }, pouch: { 'mend1@0': 40 }, made: { [mend.key]: 40 } },
      { realm: 5, killed: {}, startedAt: T0 }, T0 + 1e9);
    expect(back.pouch['mend1@0']).toBe(40);
    expect(back.made[mend.key]).toBe(40);
  });
});

describe('習 familiarity', () => {
  const made = (r: string, n: number) => crafter(9, { herb: 99, vein: 99, render: 99, forge: 99, alchemy: 99, sigil: 99, array: 99 }, { made: { [r]: n } });

  it('gives something at every mark on every recipe', () => {
    for (const r of RECIPES) {
      // 丹符 A pill or a sigil reaches its marks sooner (Recipe.marks), each a heavy make.
      for (let i = 2; i <= r.marks.length; i++) {
        const before = made(r.key, r.marks[i - 2]);
        const after = made(r.key, r.marks[i - 1]);
        if (r.marks[i - 2] === r.marks[i - 1]) {
          // Two marks earned by one make: both give, side by side.
          expect(marksOf(after, r), `${r.key} mark ${i}`).toBeGreaterThanOrEqual(i);
          continue;
        }
        const gained = markApplies(r, i)
          || subsOf(after, r).fast > subsOf(before, r).fast || twiceOf(after, r) > twiceOf(before, r);
        expect(gained, `${r.key} mark ${i}`).toBe(true);
      }
    }
  });

  it('makes a thing for the pouch twice, and gear, a tool or an array faster instead', () => {
    const herb = RECIPE_BY_KEY['herb:moss'];
    expect(twiceOf(made('herb:moss', CRAFT_MARKS[1]), herb)).toBeCloseTo(CRAFT_MARK_TWICE, 9);
    // Moss needs nothing and has no rank: its last three marks are each another chance of two.
    expect(twiceOf(made('herb:moss', CRAFT_MARKS[4]), herb)).toBeCloseTo(CRAFT_MARK_TWICE + 3 * CRAFT_MARK_SUB, 9);
    const gear = RECIPE_BY_KEY['forge:gear:hound:saber'];
    const g0 = secondsOf(made(gear.key, CRAFT_MARKS[0]), gear);
    expect(twiceOf(made(gear.key, CRAFT_MARKS[1]), gear)).toBe(0);
    expect(secondsOf(made(gear.key, CRAFT_MARKS[1]), gear)).toBeCloseTo(g0 * (1 - CRAFT_MARK_SUB), 6);
    const arr = RECIPES.find((r) => r.skill === 'array')!;
    expect(twiceOf(made(arr.key, CRAFT_MARKS[4]), arr)).toBe(0);
  });

  it('makes a whole craft faster for every recipe of it mastered, up to CRAFT_MASTERY_CAP', () => {
    const herbs = recipesOf('herb');
    const all = (n: number) => crafter(9, { herb: 99 }, { made: Object.fromEntries(herbs.slice(0, n).map((r) => [r.key, CRAFT_MARKS[4]])) });
    expect(masteryOf(all(0), 'herb')).toBe(0);
    expect(masteryOf(all(3), 'herb')).toBeCloseTo(3 * CRAFT_MASTERY_SPEED, 9);
    expect(masteryOf(all(3), 'vein')).toBe(0);
    const forge = recipesOf('forge');
    const smith = crafter(9, { forge: 99 }, { made: Object.fromEntries(forge.map((r) => [r.key, CRAFT_MARKS[4]])) });
    expect(masteryOf(smith, 'forge')).toBe(CRAFT_MASTERY_CAP);
  });
});

describe('時 work is read off the clock, not ticked', () => {
  it('gives the same pouch settled every minute or once', () => {
    const s0 = setTask(crafter(4, { vein: 40, forge: 40 }), 'vein:frostsilver', T0);
    const once = work(s0, T0 + 3 * HOUR);
    let often = s0;
    for (let t = T0; t <= T0 + 3 * HOUR; t += 60) often = work(often, t);
    expect(often.crafts.pouch).toEqual(once.crafts.pouch);
    expect(often.crafts.xp.vein).toBeCloseTo(once.crafts.xp.vein, 6);
    // Familiarity speeds it up as it goes, so it is at least the plain rate and not much more:
    // ore doubles, so only its first mark is speed (the others stand in as a chance of two).
    const plain = Math.floor(3 * HOUR / secondsOf(s0, RECIPE_BY_KEY['vein:frostsilver']));
    expect(once.crafts.made['vein:frostsilver']).toBeGreaterThanOrEqual(plain);
    expect(once.crafts.made['vein:frostsilver']).toBeLessThan(plain / (1 - CRAFT_MARK_FASTER) * 1.01);
  });

  it('works CRAFT_WORK_HOURS after the last visit and then stands still, losing nothing', () => {
    const s0 = setTask(crafter(2, { herb: 20 }), 'herb:orchid', T0);
    const away = work(s0, T0 + 30 * HOUR);
    const limit = work(s0, T0 + CRAFT_WORK_HOURS * HOUR);
    expect(away.crafts.made).toEqual(limit.crafts.made);
    expect(away.crafts.pouch).toEqual(limit.crafts.pouch);
    expect(away.crafts.since).toBe(T0 + 30 * HOUR);
    // 眠 The rest of the absence is not owed, and it is not held against the next visit.
    const t = secondsOf(away, RECIPE_BY_KEY['herb:orchid']);
    const next = work(away, T0 + 31 * HOUR);
    expect(next.crafts.made['herb:orchid'] - away.crafts.made['herb:orchid']).toBe(Math.floor(HOUR / t));
  });

  it('keeps going four hours longer with the Long-Watch Array', () => {
    const s0 = setTask(crafter(8, { herb: 20, array: 70 }, { pouch: { 'array:longwatch': 1 } }), 'herb:orchid', T0);
    const s1 = placeArray(s0, 'longwatch', true);
    expect(work(s1, T0 + 30 * HOUR).crafts.made)
      .toEqual(work(s1, T0 + (CRAFT_WORK_HOURS + CRAFT_LONG_WATCH_HOURS) * HOUR).crafts.made);
    expect(work(s1, T0 + 30 * HOUR).crafts.made['herb:orchid'])
      .toBeGreaterThan(work(s0, T0 + 30 * HOUR).crafts.made['herb:orchid']);
  });

  it('never touches the qi, and nothing it makes raises the rate', () => {
    const s0 = crafter(9, { herb: 99, vein: 99, render: 99, forge: 99, alchemy: 99, sigil: 99, array: 99 },
      { tools: { herb: 6, vein: 6, render: 6, forge: 6, alchemy: 6, sigil: 6, array: 6 },
        pouch: Object.fromEntries(ITEMS.filter((x) => x.kind === 'array').map((x) => [x.key, 1])) });
    let s = s0;
    for (const a of ['dew', 'earthvein', 'keenedge', 'firetame', 'heavenearth']) s = placeArray(s, a, true);
    s = work(setTask(s, 'vein:gold', T0), T0 + 12 * HOUR);
    expect(s.qi).toBe(s0.qi);
    expect(rate(s)).toBe(rate(s0));
  });
});

describe('解 rendering knows the beasts the hunt has taught it', () => {
  it('waits for the tenth kill, is not paid for the wait, and then runs like a herb path', () => {
    const s0 = setTask(crafter(2, { render: 10 }, {}, { killed: { rat: 9 } }), 'render:rat', T0);
    expect(blocked(s0, RECIPE_BY_KEY['render:rat'])).toBe('remains');
    const s1 = work(s0, T0 + HOUR);
    expect(s1.crafts.pouch[partKey('rat')] ?? 0).toBe(0);
    expect(s1.crafts.since).toBe(T0 + HOUR);
    // The tenth rat falls: from then on an hour of rendering is an hour's worth of parts.
    const s2 = work({ ...s1, killed: { rat: 10 } }, T0 + 2 * HOUR);
    const each = secondsOf(s2, RECIPE_BY_KEY['render:rat']);
    expect(s2.crafts.pouch[partKey('rat')]).toBeGreaterThanOrEqual(Math.floor(HOUR / each));
    expect(s2.killed.rat).toBe(10);
  });

  it('knows a warden from one kill, because a warden falls once a realm', () => {
    expect(knownAt('fox')).toBe(1);
    expect(knownAt('rat')).toBe(CRAFT_RENDER_KNOWN);
    const s = crafter(3, { render: 30 }, {}, { killed: { fox: 1 } });
    expect(blocked(s, RECIPE_BY_KEY['render:fox'])).toBe(null);
  });
});

describe('鑄 the forge', () => {
  it('makes the chosen shape, which never fuses and melts back into metal rather than qi', () => {
    const r = RECIPE_BY_KEY['forge:gear:hound:saber'];
    const s0 = crafter(2, { forge: 20 }, { pouch: { metal1: 30, [partKey('hound')]: 20 } });
    const s1 = work(setTask(s0, r.key, T0), T0 + 10 * r.seconds + 1);
    expect(s1.chest.length).toBe(10);
    for (const it of s1.chest) {
      expect(it.template).toBe('saber1');
      expect(it.from).toBe('forge');
    }
    expect(fusable(s1.chest)).toEqual([]);
    const melted = salvage(s1, s1.chest.map((x) => x.id));
    expect(melted.qi).toBe(s1.qi);
    expect(melted.crafts.pouch.metal1).toBe((s1.crafts.pouch.metal1 ?? 0) + 20);
  });

  it('stops at a full chest instead of melting what it just made', () => {
    const s0 = crafter(2, { forge: 20 }, { pouch: { metal1: 300, [partKey('hound')]: 200 } });
    const s1 = work(setTask(s0, 'forge:gear:hound:saber', T0), T0 + 12 * HOUR);
    expect(s1.chest.length).toBe(limitFor(s1));
    expect(blocked(s1, RECIPE_BY_KEY['forge:gear:hound:saber'])).toBe('chest');
  });

  it('makes a tool once, and it makes the craft faster', () => {
    const s0 = crafter(2, { forge: 5, herb: 1 }, { pouch: { metal1: 10 } });
    const before = secondsOf(s0, RECIPE_BY_KEY['herb:moss']);
    const s1 = work(setTask(s0, 'forge:tool:herb:1', T0), T0 + HOUR);
    expect(s1.crafts.tools.herb).toBe(1);
    expect(secondsOf(s1, RECIPE_BY_KEY['herb:moss'])).toBeCloseTo(before * 0.95, 6);
    expect(blocked(s1, RECIPE_BY_KEY['forge:tool:herb:1'])).toBe('tool');
  });
});

describe('品 quality', () => {
  it('sums to one, rises with the level above the recipe, and the fifth mark ends Common', () => {
    for (const above of [0, 10, 40, 98]) for (const marks of [0, 3, 5]) {
      const p = qualityOdds(above, marks);
      expect(p.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 9);
    }
    expect(qualityOdds(0, 0)[0]).toBeGreaterThan(0.9);
    expect(qualityOdds(40, 5)[4]).toBeGreaterThan(qualityOdds(10, 0)[4]);
    expect(qualityOdds(0, 5)[0]).toBe(0);
  });
});

describe('戰 what is carried into a fight', () => {
  const hard = (realm: number) => crafter(realm, { alchemy: 99, sigil: 99 }, {
    pouch: { [`might${realm}@4`]: 3, 'sigil:thunder@4': 3, 'sigil:warding@2': 1 },
  });

  it('goes into a warden and helps, and only a win spends it', () => {
    let s = carry(carry(hard(6), 'elixir', 'might6@4'), 'sigil', 'sigil:thunder@4');
    const w = wardenOf(6);
    const k = kitFor(s, w, kitWhere(s, w));
    expect(k.spends).toBe(true);
    // Heaven Might made for the realm, and a Thunder Sigil three realms under it, faded.
    expect(k.kit.strike).toBeCloseTo((1 + 0.12 * 1.75) * (1 + 0.15 * 1.75 * 0.5 ** 3), 6);
    expect(oddsRaw(s, w, undefined, k.kit)).toBeGreaterThanOrEqual(oddsRaw(s, w));
    s = spendKit(s, k.used);
    expect(s.crafts.pouch['might6@4']).toBe(2);
    expect(s.crafts.pouch['sigil:thunder@4']).toBe(2);
  });

  it('spends only the hand that took part: a demon sigil beside an elixir stays for the demon', () => {
    const h = hard(6);
    let s: State = { ...h, crafts: { ...h.crafts, pouch: { ...h.crafts.pouch, 'sigil:purity@4': 3 } } };
    s = carry(carry(s, 'elixir', 'might6@4'), 'sigil', 'sigil:purity@4');
    const w = wardenOf(6);
    const k = kitFor(s, w, kitWhere(s, w));
    expect(k.used).toEqual({ elixir: 'might6@4', sigil: null });
    s = spendKit(s, k.used);
    expect(s.crafts.pouch['might6@4']).toBe(2);
    expect(s.crafts.pouch['sigil:purity@4']).toBe(3);
    expect(s.crafts.carry.sigil).toBe('sigil:purity@4');
    // At the demon it is the one that works.
    const d = kitFor(s, demonOf(s), 'demon');
    expect(d.used.sigil).toBe('sigil:purity@4');
  });

  it('never goes into the Dragon or a common beast, and goes up the tower (since 2026-10-05)', () => {
    const s = carry(hard(9), 'elixir', 'might9@4');
    expect(kitWhere(s, wardenOf(9))).toBeNull();
    expect(kitWhere(s, commonsOf(9)[0])).toBeNull();
    expect(kitWhere(s, demonOf(s), demonPower(s))).toBe('demon');
    // 塔 A floor is a hard fight: the might pill strikes harder there, read in the climber's
    // realm, so floor 400 (which stands past every realm) does not fade it to nothing.
    const f = 400;
    expect(kitWhere(s, floorBeast(f), floorPower(f))).toBe('tower');
    const up = kitFor(s, floorBeast(f), 'tower');
    expect(up.spends).toBe(true);
    expect(up.kit.strike).toBeCloseTo(1 + CRAFT_KIT.might * CRAFT_QUALITY_MULT[4], 9);
    // A floor's shape can be a first-realm beast; the tier still reads the climber's realm.
    expect(kitFor(s, commonsOf(1)[0], 'tower').kit.strike).toBeCloseTo(up.kit.strike, 9);
  });

  it('fades against a realm above what it was made for', () => {
    const s = carry(crafter(7, { alchemy: 99 }, { pouch: { 'might3@0': 1, 'might7@0': 1 } }), 'elixir', 'might3@0');
    const low = kitFor(s, wardenOf(7), 'warden').kit.strike;
    const fit = kitFor(carry(s, 'elixir', 'might7@0'), wardenOf(7), 'warden').kit.strike;
    expect(fit).toBeGreaterThan(low);
    expect(low).toBeCloseTo(1 + 0.12 * 0.5 ** 4, 6);
  });

  it('turns a Seeking Sigil into a sure drop, never more than the limit', () => {
    let s = crafter(6, {}, { pouch: { 'sigil:seeking': 50 } });
    for (let i = 0; i < 40; i++) s = takeSeeking(s, 'sigil:seeking');
    expect(s.crafts.seek).toBe(20);
    expect(s.crafts.pouch['sigil:seeking']).toBe(30);
  });
});

describe('陣 arrays', () => {
  it('only as many as the floor holds, only held ones, and lifting one out is free', () => {
    const pouch = Object.fromEntries(ITEMS.filter((x) => x.kind === 'array').map((x) => [x.key, 1]));
    let s = crafter(8, { array: 49 }, { pouch });
    for (const a of ['dew', 'earthvein', 'keenedge', 'firetame']) s = placeArray(s, a, true);
    expect(s.crafts.arrays.length).toBe(arraySlots(49));
    expect(arraySlots(50)).toBe(4);
    expect(arraySlots(99)).toBe(5);
    s = placeArray(s, 'dew', false);
    expect(s.crafts.pouch['array:dew']).toBe(1);
  });
});

describe('查 what the review found', () => {
  it('counts the demons left the same way seclusion does, in every realm', () => {
    for (let realm = 1; realm <= 9; realm++) for (let demons = 0; demons <= 9; demons++) {
      expect(demonsLeft({ realm, demons })).toBe(demonsFor(realm) - demons);
    }
  });

  it('keeps a Soul-Lock Sigil for a demon that can count twice, not the last one of a realm', () => {
    const h = crafter(8, { sigil: 99 }, { pouch: { 'sigil:soullock@2': 2 } });
    const base = carry(h, 'sigil', 'sigil:soullock@2');
    const two = { ...base, demons: demonsFor(8) - 2 };
    const last = { ...base, demons: demonsFor(8) - 1 };
    expect(kitFor(two, demonOf(two), 'demon').used.sigil).toBe('sigil:soullock@2');
    expect(kitFor(last, demonOf(last), 'demon').used.sigil).toBe(null);
  });

  it('holds familiarity and sure drops to what the craft levels could have made', () => {
    const back = validCrafts({
      xp: { herb: XP_TABLE[5] }, made: { 'herb:moss': 5000 }, seek: 20,
    }, { realm: 3, killed: {}, startedAt: T0 }, T0 + 1e9);
    expect(back.made['herb:moss']).toBeLessThanOrEqual(Math.ceil(XP_TABLE[5] / RECIPE_BY_KEY['herb:moss'].xp));
    expect(back.seek).toBe(0);
    const writer = validCrafts({ xp: { sigil: XP_TABLE[20] }, seek: 20 }, { realm: 6, killed: {}, startedAt: T0 }, T0 + 1e9);
    expect(writer.seek).toBe(20);
    // A count is held only for a recipe the level and realm could make at all: a forged
    // save at herb 45 claiming Lingzhi (level 95) keeps none of it, and its own moss.
    const high = validCrafts({
      xp: { herb: XP_TABLE[45] }, made: { 'herb:moss': 30, 'herb:lingzhi': 2000 },
    }, { realm: 9, killed: {}, startedAt: T0 }, T0 + 1e9);
    expect(RECIPE_BY_KEY['herb:lingzhi'].level).toBeGreaterThan(45);
    expect(high.made['herb:lingzhi']).toBeUndefined();
    expect(high.made['herb:moss']).toBe(30);
  });

  it('spends a Nine-Turn Pill only on the win it brought back, and keeps it on any other', () => {
    const used = { elixir: 'nineturn@3', sigil: 'sigil:thunder@2' };
    expect(tookPart(used, false)).toEqual({ elixir: null, sigil: 'sigil:thunder@2' });
    expect(tookPart(used, true)).toEqual(used);
    // Every other elixir works in every round, so it took part whether or not it was close.
    expect(tookPart({ elixir: 'might6@2', sigil: null }, false)).toEqual({ elixir: 'might6@2', sigil: null });
  });

  it('never lifts a forged piece a rank with 空囊, so the odds on the recipe hold', () => {
    const s = { ...crafter(3, {}), unlocked: ['root', 'emptypouch'] };
    const piece = { id: 'f', template: 'sword3', rarity: 'common' as const, rolls: [], from: FORGED };
    expect(lifted(s, piece).rarity).toBe('common');
  });
});

describe('守 a save is input', () => {
  it('round-trips an honest workshop unchanged', () => {
    const s0 = setTask(crafter(5, { herb: 40, vein: 38, render: 30, forge: 35, alchemy: 12 },
      { pouch: { moss: 30, 'mend2@1': 3, metal3: 4 }, made: { 'herb:moss': 40 } },
      { killed: { rat: 50, hound: 20 } }), 'herb:lotus', T0);
    const s1 = work(s0, T0 + 2 * HOUR);
    const back = validate(JSON.parse(JSON.stringify(s1)), T0 + 2 * HOUR);
    expect(back.crafts).toEqual(s1.crafts);
  });

  it('caps what a forged save claims', () => {
    const now = T0 + HOUR;
    const forged = validCrafts({
      xp: { herb: 13_034_431, vein: -5, forge: 'lots' },
      pouch: { moss: 1e15, nothing: 4, 'might2@9': 3, 'might2@1': 2, moss2: 1, 'moss@1': 2 },
      tools: { herb: 6 },
      arrays: ['array:dew', 'array:dew', 'array:nothing'],
      carry: { elixir: 'might2@3', sigil: 'moss' },
      seek: 999,
      task: 'array:heavenearth',
    }, { realm: 3, killed: { rat: 10 }, startedAt: T0 }, now);
    expect(forged.xp.herb).toBeLessThanOrEqual(HOUR * XP_PER_SECOND_MAX.herb * 1.05);
    expect(forged.xp.vein).toBe(0);
    // Moss pays its experience per make: no more moss than the (already capped) herb
    // experience could have paid for, twice over for the doubling marks.
    expect(forged.pouch.moss).toBeGreaterThan(0);
    expect(forged.pouch.moss).toBeLessThanOrEqual(Math.ceil(forged.xp.herb / RECIPE_BY_KEY['herb:moss'].xp) * 2 + 1);
    expect(forged.pouch).not.toHaveProperty('nothing');
    expect(forged.pouch).not.toHaveProperty('might2@9');
    expect(forged.pouch).not.toHaveProperty('moss@1');
    expect(forged.tools.herb).toBe(0);
    expect(forged.arrays).toEqual([]);
    expect(forged.carry).toEqual({ elixir: null, sigil: null });
    expect(forged.seek).toBe(0);   // no Sigil Writing and no Alchemy: nothing it holds could have left a sure drop
    expect(forged.task).toBeNull();
  });

  it('holds every key a real pouch can hold', () => {
    const maxed = Object.fromEntries(SKILL_KEYS.map((k) => [k, XP_TABLE[99]]));
    for (const it of ITEMS) {
      const k = it.graded ? `${it.key}@2` : it.key;
      expect(splitKey(k).key).toBe(it.key);
      const back = validCrafts({ pouch: { [k]: 3 }, xp: maxed }, { realm: 9, killed: {}, startedAt: T0 }, T0 + 1e9);
      expect(back.pouch[k], k).toBe(3);
    }
  });

  it('keeps nothing the craft levels could not have made, and no more than the experience paid for', () => {
    const back = validCrafts({
      xp: { alchemy: XP_TABLE[12], herb: XP_TABLE[99] },
      pouch: { 'might9@4': 50, 'mend1@4': 1e6, 'sigil:heavenseal@4': 9, 'array:heavenearth': 1, moss: 1e8 },
    }, { realm: 9, killed: {}, startedAt: T0 }, T0 + 1e9);
    expect(back.pouch).not.toHaveProperty('might9@4');
    expect(back.pouch).not.toHaveProperty('sigil:heavenseal@4');
    expect(back.pouch).not.toHaveProperty('array:heavenearth');
    // 丹符 Read at the experience a make paid before pills went heavy (CRAFT_KIT_WORK), so an
    // honest pouch of the old, light pills is never trimmed.
    const mend = RECIPE_BY_KEY['alchemy:mend1'];
    expect(back.pouch['mend1@4']).toBeLessThanOrEqual(Math.ceil(XP_TABLE[12] / (mend.xp / mend.weight)) * 2 + 1);
    expect(back.pouch['mend1@4']).toBeLessThan(1e6);
    // A craft at 99 stops earning and keeps making, so its pouch is not held to the experience.
    expect(back.pouch.moss).toBe(1e8);
  });
});

describe('驗 the server', () => {
  it('lets an honest crafter through and holds one who gained faster than the clock', () => {
    const before = crafter(4, { herb: 30 });
    const honest = work(setTask(before, 'herb:lotus', before.at), before.at + 6 * HOUR);
    const v = verify({ ...before, at: T0 }, { ...honest, at: T0 + 6 * HOUR }, 6 * HOUR);
    expect(v.why).not.toContain('too-fast');
    const cheat = { ...honest, at: T0 + 6 * HOUR, crafts: { ...honest.crafts, xp: { ...honest.crafts.xp, herb: XP_TABLE[99] } } };
    expect(verify({ ...before, at: T0 }, cheat, 6 * HOUR).why).toContain('too-fast');
  });

  it('reads the strongest kit a crafter could carry, so a warden beaten with one is not a strike', () => {
    const s = crafter(6, { alchemy: 99, sigil: 99 });
    const w = wardenOf(6);
    const k = bestKit({ ...s, layer: LAYERS_PER_REALM - 1 }, w, 'warden');
    expect(k.strike).toBeGreaterThan(1.3);
    expect(k.taken).toBeLessThan(0.8);
  });
});
