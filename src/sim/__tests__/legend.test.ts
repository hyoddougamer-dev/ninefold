import { describe, expect, it } from 'vitest';
import {
  GATE_STRIKE_ELITE, GATE_STRIKE_SHARE, LAYERS_PER_REALM, LEGEND_DAYS, LEGEND_FIGHT_SHARE, LEGEND_LEVEL,
  LEGEND_MASTERED, LEGEND_POWER, LEGEND_SOUL_EVERY, LEGEND_SPEED, LEGEND_STRIKE_ELITE, LEGEND_STRIKE_GATE, CRAFT_WORK_HOURS,
} from '../balance.ts';
import {
  LEGENDS, RECIPES, RECIPE_BY_KEY, SKILL_KEYS, SOUL, XP_TABLE, legendKey, type SkillKey,
} from '../../data/crafts.ts';
import { BEASTS, isElite } from '../../data/bestiary.ts';
import { blocked, masteredIn, secondsOf, setTask, waitedAt, work, workSeconds, wallDays } from '../crafts.ts';
import {
  gateStrikeRoom, hardBeast, hardWin, legendLeft, legendMade, soulOn, strikeLegend, strikeRoom,
} from '../legend.ts';
import { gateWaited, newState, power, sealDays, sealLeft, breakThrough, type State } from '../state.ts';
import { bottleneck, gateRoom, takeKill } from '../combat.ts';
import { validate } from '../load.ts';
import { legendSeconds, sealSeconds, verify } from '../verify.ts';
import { HABITS, play } from '../../../tools/habits.ts';

/**
 * 傳說 擊 The legendary works and the hard wins.
 *
 * The promises, each held here: a work is a goal at the top of every craft that asks for the
 * craft mastered, heaps of material and souls only a fight leaves; it forges over days and
 * nothing of it is ever lost to an absence; a hard win strikes it shorter, never past
 * LEGEND_FIGHT_SHARE, and a loss strikes nothing; at a standing gate the same win counts as
 * time waited, up to GATE_STRIKE_SHARE; and the server reads an honest work, and an honest
 * gate struck short, as honest.
 */

const T0 = 1_700_000_000;
const DAY = 86_400;
const elite = (realm: number) => BEASTS.find((b) => isElite(b) && b.realm === realm)!;

/** A ninth-realm cultivator with every craft at `level` and `mastered` recipes of each with every mark. */
function master(level = 92, mastered = LEGEND_MASTERED): State {
  const s = newState(T0 - 200 * DAY);
  const made: Record<string, number> = {};
  for (const k of SKILL_KEYS) {
    const mine = RECIPES.filter((r) => r.skill === k && r.makes.kind === 'item' && r.level <= level && r.realm <= 9);
    for (const r of mine.slice(0, mastered)) made[r.key] = r.marks[r.marks.length - 1];
  }
  return {
    ...s, at: T0, realm: 9, layer: 0,
    killed: Object.fromEntries(BEASTS.map((b) => [b.key, b.warden ? 1 : 500])),
    crafts: {
      ...s.crafts, since: T0, made,
      xp: Object.fromEntries(SKILL_KEYS.map((k) => [k, XP_TABLE[level]])) as State['crafts']['xp'],
    },
  };
}

/** The same, holding everything a craft's work asks for. */
function ready(skill: SkillKey, level = 92): State {
  const s = master(level);
  const l = LEGENDS.find((x) => x.skill === skill)!;
  const pouch: Record<string, number> = {};
  let souls = 0;
  for (const [k, n] of l.needs) if (k === SOUL) souls = n; else if (k !== 'mat') pouch[k] = n;
  return { ...s, materials: 1e12, crafts: { ...s.crafts, pouch, souls } };
}

describe('傳說 the works', () => {
  it('stand at the top of every craft, ask for souls and the craft mastered, and pay no experience', () => {
    expect(LEGENDS.map((l) => l.skill).sort()).toEqual([...SKILL_KEYS].sort());
    for (const k of SKILL_KEYS) {
      const r = RECIPE_BY_KEY[legendKey(k)];
      expect(r.level).toBe(LEGEND_LEVEL[k]);
      expect(r.level).toBeLessThanOrEqual(99);
      expect(r.seconds).toBe(LEGEND_DAYS[k] * DAY);
      expect(r.xp).toBe(0);
      expect(r.needs.some(([key]) => key === SOUL)).toBe(true);
      // Every material is one the craft table makes, at a level the work's level reaches.
      for (const [key] of r.needs) {
        if (key === SOUL || key === 'mat') continue;
        const maker = RECIPES.find((x) => x.makes.kind === 'item' && x.makes.item === key);
        expect(maker, key).toBeTruthy();
      }
    }
  });

  it('asks for its mastered recipes, then its materials, and is begun with all of them at once', () => {
    const r = RECIPE_BY_KEY[legendKey('herb')];
    expect(blocked(master(92, LEGEND_MASTERED - 1), r)).toBe('mastery');
    expect(blocked(master(70), r)).toBe('level');
    expect(blocked(master(92), r)).toBe('needs');
    const s = ready('herb');
    expect(blocked(s, r)).toBeNull();
    const begun = setTask(s, r.key, T0);
    expect(begun.crafts.legend).toEqual({ key: r.key, done: 0, struck: 0 });
    expect(begun.crafts.task).toBe(r.key);
    expect(begun.crafts.souls).toBe(0);
    for (const [k] of r.needs) if (k !== SOUL && k !== 'mat') expect(begun.crafts.pouch[k] ?? 0).toBe(0);
    // A second work waits for the anvil.
    expect(blocked({ ...begun, crafts: { ...begun.crafts, pouch: ready('vein').crafts.pouch, souls: 99 } }, RECIPE_BY_KEY[legendKey('vein')])).toBe('anvil');
  });

  it('forges with the workshop’s hours, keeps every second through any absence, and is made', () => {
    const r = RECIPE_BY_KEY[legendKey('herb')];
    let s = setTask(ready('herb'), r.key, T0);
    // A week away: the workshop worked its hours after the visit and stood still, and kept them.
    s = work({ ...s, at: T0 + 7 * DAY }, T0 + 7 * DAY);
    expect(s.crafts.legend!.done).toBeCloseTo(workSeconds(s), 6);
    expect(s.crafts.task).toBe(r.key);
    // Making something else meanwhile leaves it on the anvil, untouched.
    const other = RECIPES.find((x) => x.skill === 'herb' && x.makes.kind === 'item' && x.level <= 50)!;
    const aside = setTask(s, other.key, T0 + 7 * DAY);
    expect(aside.crafts.legend!.done).toBe(s.crafts.legend!.done);
    // Visits every twelve hours: done after its days, to the visit.
    let t = T0 + 7 * DAY;
    s = setTask(aside, r.key, t);
    for (let i = 0; i < 40 && !legendMade(s.crafts.made, 'herb'); i++) { t += CRAFT_WORK_HOURS * 3600; s = work({ ...s, at: t }, t); }
    expect(legendMade(s.crafts.made, 'herb')).toBe(true);
    expect(s.crafts.legend).toBeNull();
    expect(s.crafts.task).toBeNull();
    // What it gives: power, and its craft faster.
    expect(power(s) / power({ ...s, crafts: { ...s.crafts, made: { ...s.crafts.made, [r.key]: 0 } } })).toBeCloseTo(1 + LEGEND_POWER, 9);
    const gather = RECIPES.find((x) => x.skill === 'herb' && x.makes.kind === 'item')!;
    expect(secondsOf(s, gather) / secondsOf({ ...s, crafts: { ...s.crafts, made: { ...s.crafts.made, [r.key]: 0 } } }, gather))
      .toBeCloseTo(1 - LEGEND_SPEED, 9);
    // Made once: never again.
    expect(blocked(ready('herb'), r) === null).toBe(true);
    expect(blocked({ ...ready('herb'), crafts: { ...ready('herb').crafts, made: s.crafts.made } }, r)).toBe('made');
  });
});

describe('擊 hard wins', () => {
  it('a win over the elite of the realm one stands in strikes the work, and nothing else does', () => {
    const r = RECIPE_BY_KEY[legendKey('vein')];
    const s = setTask(ready('vein'), r.key, T0);
    const won = takeKill(s, elite(9));
    expect(won.crafts.legend!.struck).toBe(LEGEND_STRIKE_ELITE);
    // An old realm's elite is not a hard win, nor a common.
    expect(hardBeast(s, elite(5))).toBe(false);
    expect(takeKill(s, elite(5)).crafts.legend!.struck).toBe(0);
    expect(takeKill(s, BEASTS.find((b) => b.realm === 9 && !b.warden && !isElite(b))!).crafts.legend!.struck).toBe(0);
    // A vault gate strikes it by its own amount.
    expect(hardWin(s, 'gate', 0).crafts.legend!.struck).toBe(LEGEND_STRIKE_GATE);
  });

  it('never strikes past LEGEND_FIGHT_SHARE of the forging, so a fighter still waits the rest', () => {
    const r = RECIPE_BY_KEY[legendKey('array')];
    let s = setTask(ready('array'), r.key, T0);
    for (let i = 0; i < 10_000; i++) s = strikeLegend(s, LEGEND_STRIKE_ELITE);
    expect(s.crafts.legend!.struck).toBeCloseTo(LEGEND_FIGHT_SHARE * r.seconds, 6);
    expect(strikeRoom(r.key)).toBeCloseTo(LEGEND_FIGHT_SHARE * r.seconds, 6);
    expect(legendLeft(s.crafts.legend!)).toBeCloseTo((1 - LEGEND_FIGHT_SHARE) * r.seconds, 6);
    expect(legendMade(s.crafts.made, 'array')).toBe(false);
  });

  it('leaves 精魄 a soul on one win in LEGEND_SOUL_EVERY, the same on every device', () => {
    let n = 0;
    for (let k = 1; k <= 50_000; k++) if (soulOn(T0, 'squid', k)) n++;
    expect(n / 50_000).toBeGreaterThan(0.8 / LEGEND_SOUL_EVERY);
    expect(n / 50_000).toBeLessThan(1.2 / LEGEND_SOUL_EVERY);
    expect(soulOn(T0, 'squid', 77)).toBe(soulOn(T0, 'squid', 77));
    // Through takeKill: the souls are exactly the kills soulOn names.
    let s = master();
    let want = 0;
    for (let i = 0; i < 300; i++) {
      if (soulOn(s.startedAt, 'squid', (s.killed.squid ?? 0) + 1)) want++;
      s = takeKill(s, elite(9));
    }
    expect(s.crafts.souls ?? 0).toBe(want);
  });

  it('at a standing gate, counts as time waited for the seal and the wall, up to GATE_STRIKE_SHARE', () => {
    const base = newState(T0 - 40 * DAY);
    const gate: State = { ...base, realm: 7, layer: LAYERS_PER_REALM - 1, at: T0, gateAt: T0, gateStruck: 0,
      killed: { ...base.killed, wraith: 50 } };
    expect(sealLeft(gate)).toBeCloseTo(sealDays(7), 9);
    const won = takeKill(gate, elite(7));
    expect(won.gateStruck).toBe(GATE_STRIKE_ELITE);
    expect(sealLeft(won)).toBeCloseTo(sealDays(7) - GATE_STRIKE_ELITE / DAY, 9);
    expect(bottleneck(won, BEASTS.find((b) => b.warden && b.realm === 7)!))
      .toBeLessThan(bottleneck(gate, BEASTS.find((b) => b.warden && b.realm === 7)!));
    // A gate in the secret realm strikes the work, and never the realm's gate: see hardWin.
    expect(hardWin(gate, 'gate', gateRoom(gate)).gateStruck).toBe(0);
    let s = gate;
    for (let i = 0; i < 2000; i++) s = takeKill(s, elite(7));
    const most = GATE_STRIKE_SHARE * Math.max(sealDays(7), wallDays(7)) * DAY;
    expect(s.gateStruck).toBeCloseTo(most, 6);
    expect(gateStrikeRoom(s, sealDays(7), wallDays(7))).toBeCloseTo(0, 6);
    // Each of the two takes at most its own share: the seal half of the seal, the wall half of the wall.
    expect(gateWaited(s, sealDays(7))).toBeCloseTo(GATE_STRIKE_SHARE * sealDays(7), 6);
    expect(gateWaited(s, wallDays(7))).toBeCloseTo(GATE_STRIKE_SHARE * wallDays(7), 6);
    expect(sealLeft(s)).toBeCloseTo((1 - GATE_STRIKE_SHARE) * sealDays(7), 6);
    expect(waitedAt(s, sealDays(7))).toBeCloseTo(gateWaited(s, sealDays(7)), 9);
    expect(waitedAt(s, wallDays(7))).toBeCloseTo(gateWaited(s, wallDays(7)), 9);
    // Waiting alone still opens it exactly when it always did.
    expect(sealLeft({ ...gate, at: T0 + sealDays(7) * DAY })).toBe(0);
    // No warden standing, nothing to count; and the count leaves with the gate.
    expect(gateRoom({ ...gate, layer: 3, gateAt: 0 })).toBe(0);
    expect(breakThrough({ ...s, wardenFell: true, killed: { ...s.killed, direwolf: 1 } }).gateStruck).toBe(0);
  });
});

describe('守 a save is input', () => {
  it('keeps a work, its strikes and its souls only within what could have been', () => {
    const r = RECIPE_BY_KEY[legendKey('herb')];
    const s = setTask(ready('herb'), r.key, T0);
    const honest = validate(JSON.parse(JSON.stringify({ ...s, crafts: { ...s.crafts, souls: 3,
      legend: { key: r.key, done: DAY, struck: 2 * 3600 } } })), T0);
    expect(honest.crafts.legend).toEqual({ key: r.key, done: DAY, struck: 2 * 3600 });
    expect(honest.crafts.souls).toBe(3);
    const greedy = validate(JSON.parse(JSON.stringify({ ...s, crafts: { ...s.crafts, souls: 1e9,
      legend: { key: r.key, done: 1e12, struck: 1e12 } } })), T0);
    expect(greedy.crafts.legend!.struck).toBeCloseTo(LEGEND_FIGHT_SHARE * r.seconds, 6);
    expect(greedy.crafts.legend!.done).toBeLessThanOrEqual(r.seconds);
    const elites = BEASTS.filter(isElite).reduce((n, b) => n + (s.killed[b.key] ?? 0), 0);
    expect(greedy.crafts.souls).toBe(elites);
    // A work made by a craft with too few mastered recipes was not made.
    const thin = master(92, 2);
    const forged = validate(JSON.parse(JSON.stringify({ ...thin, crafts: { ...thin.crafts, made: { ...thin.crafts.made, [r.key]: 5 } } })), T0);
    expect(forged.crafts.made[r.key]).toBeUndefined();
    const real = validate(JSON.parse(JSON.stringify({ ...s, crafts: { ...s.crafts, legend: null, made: { ...s.crafts.made, [r.key]: 5 } } })), T0);
    expect(real.crafts.made[r.key]).toBe(1);
    expect(masteredIn(real, 'herb')).toBeGreaterThanOrEqual(LEGEND_MASTERED);
  });

  it('caps the gate’s strikes and keeps them only at a gate', () => {
    const base = newState(T0 - 40 * DAY);
    const gate = { ...base, realm: 6, layer: LAYERS_PER_REALM - 1, at: T0, gateAt: T0 - DAY, gateStruck: 1e9 };
    const v = validate(JSON.parse(JSON.stringify(gate)), T0);
    expect(v.gateStruck).toBeCloseTo(GATE_STRIKE_SHARE * Math.max(sealDays(6), wallDays(6)) * DAY, 3);
    expect(validate(JSON.parse(JSON.stringify({ ...gate, layer: 2 })), T0).gateStruck).toBe(0);
    // A save from before the strikes has none, and reads as it always did.
    const { gateStruck: _drop, ...old } = gate;
    expect(validate(JSON.parse(JSON.stringify(old)), T0).gateStruck).toBeUndefined();
  });
});

describe('驗 the server', () => {
  it('reads a work forged honestly as honest, and one forged too fast as waiting', () => {
    const r = RECIPE_BY_KEY[legendKey('herb')];
    const before = setTask(ready('herb'), r.key, T0);
    // Made with the most fights could strike, and the rest in the workshop's own time.
    const work = (1 - LEGEND_FIGHT_SHARE) * r.seconds;
    const after: State = { ...before, at: T0 + work, crafts: { ...before.crafts, legend: null, task: null,
      made: { ...before.crafts.made, [r.key]: 1 } } };
    expect(legendSeconds(before, after)).toBeCloseTo(work, 3);
    expect(verify(before, after, work).why).not.toContain('too-fast');
    // The same work in an hour: too fast, which waits and is never a strike.
    const quick = verify(before, { ...after, at: T0 + 3600 }, 3600);
    expect(quick.why).toContain('too-fast');
    expect(quick.strike).toBe(false);
  });

  it('never holds the legend chaser back: every visit of a crafter who makes the works verifies', () => {
    // The crafter of tools/habits.ts chasing the works (tools/ascent.ts chase), walked to day
    // 135, offered to the server at every visit as verify.test does for every habit.
    const h = HABITS.find((x) => x.name === 'crafts it all')!;
    const shots: { day: number; s: State }[] = [];
    const run = play({ ...h, legends: true, on: true }, 135, (day, s) => shots.push({ day, s: structuredClone(s) }));
    // 底 A walk that made no work would pass this and measure nothing.
    expect(run.legend.made.filter(Number.isFinite).length).toBeGreaterThanOrEqual(2);
    let base = shots[0];
    const held: string[] = [];
    let lag = 0;
    for (const shot of shots.slice(1)) {
      const v = verify(base.s, shot.s, (shot.day - base.day) * DAY);
      if (v.strike) held.push(`day ${shot.day.toFixed(2)}: strike ${v.why.join(',')}`);
      if (v.suspect) held.push(`day ${shot.day.toFixed(2)}: suspect at pace ${v.pace.toFixed(2)}`);
      if (v.ok) base = shot;
      lag = Math.max(lag, (shot.day - base.day) * 24);
    }
    console.log(`    傳說 the chaser made ${run.legend.made.map((d) => (Number.isFinite(d) ? d.toFixed(0) : '-')).join(' ')}; ranking at most ${lag.toFixed(1)} h behind`);
    expect(held.slice(0, 5)).toEqual([]);
    expect(lag).toBeLessThanOrEqual(36);
  }, 600_000);

  it('allows a gate struck short by hard wins, from a save that counts them, and only then', () => {
    const base = newState(T0 - 60 * DAY);
    const before: State = { ...base, realm: 6, layer: LAYERS_PER_REALM - 1, at: T0, gateAt: T0, sealPaid: 0, sealFed: 0, gateStruck: 0 };
    const after: State = { ...before, realm: 7, layer: 0, gateAt: 0, gateStruck: 0 };
    const old = { ...after } as Partial<State>;
    delete old.gateStruck;
    const counted = sealSeconds(before, after);
    const uncounted = sealSeconds(before, old as State);
    expect(counted).toBeLessThan(uncounted);
    // The most hard wins may count of the seal, past the share qi already fills for nothing.
    expect(uncounted - counted).toBeCloseTo(Math.min(uncounted, GATE_STRIKE_SHARE * sealDays(6) * DAY), 3);
  });
});
