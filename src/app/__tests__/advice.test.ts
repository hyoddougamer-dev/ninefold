import { describe, expect, it } from 'vitest';
import { advice } from '../advice.ts';
import { LAYERS_PER_REALM, focusAt, levelCap } from '../../sim/balance.ts';
import { buy, canBuy, newState, type State, type Upgrade } from '../../sim/state.ts';
import { advance } from '../../sim/time.ts';
import { REALMS } from '../../data/realms.ts';
import { weekOf } from '../../sim/week.ts';

/**
 * 示 The line that says what to do next, and the promise that it is always saying
 * something.
 *
 * It began as a wall-explainer: from the third realm a warden will not fall without
 * 妖丹 cores, and a player who never opened 狩 Hunt met that wall with nothing to read.
 * It answered *what is blocking you* and returned silence the rest of the time.
 *
 * The rest of the time is most of the game. A player climbing quietly through the
 * middle of a realm, neither stuck nor finished, got a blank space where the only
 * sentence on the screen lives, and an idle game with nothing on the screen and nothing
 * to read is an idle game you close.
 *
 * So the promise this file keeps is simple and absolute: **never null**. Either
 * something is blocking you, or something is worth doing, or something is within reach
 * and named with the power it wants, or the next thing the mountain will hand you is
 * named with the realm that hands it over.
 */

const T0 = 1_700_000_000;
const UPGRADES: readonly Upgrade[] = ['technique', 'method', 'pills', 'cores'];

describe('示 the line that is never empty', () => {
  it('says something at the very first frame of a new game', () => {
    const tip = advice(newState(T0));
    expect(tip).not.toBeNull();
    expect(tip!.text.length).toBeGreaterThan(20);
  });

  /**
   * The states below are not hand-picked: they are every realm, every layer, and four
   * different amounts of investment. If any single one of them has nothing to say, the
   * player standing there has nothing to read.
   */
  it('says something at every realm, every layer, however much has been bought', () => {
    let quiet = 0;
    let checked = 0;
    for (const r of REALMS) {
      for (let layer = 0; layer < LAYERS_PER_REALM; layer++) {
        for (const share of [0, 0.3, 0.7, 1]) {
          const cap = levelCap(r.n);
          const levels = Math.round(cap * share);
          const s: State = {
            ...newState(T0), realm: r.n, layer,
            qi: 0, materials: 0,
            levels: { technique: levels, method: levels, pills: levels, cores: levels },
          };
          checked++;
          if (advice(s) === null) quiet++;
        }
      }
    }
    console.log(`\n  示 checked ${checked} places on the mountain; ${quiet} of them had nothing to say\n`);
    expect(quiet).toBe(0);
  });

  /** And the same walking it, which is the way a player actually meets these states. */
  it('says something at every step of a real first realm', () => {
    let s: State = newState(T0);
    const seen = new Set<string>();
    for (let t = 1; t <= 14 * 3600; t++) {
      s = advance(s, T0 + t, false, focusAt(t % 5400));
      for (const u of UPGRADES) if (canBuy(s, u)) s = buy(s, u);
      if (t % 300) continue;
      const tip = advice(s);
      expect(tip).not.toBeNull();
      seen.add(tip!.text);
      if (s.realm > 1) break;
    }
    /**
     * And it is not one sentence on a loop. It is checked on the *text* rather than the
     * han. Across the first realm the symbol is mostly 狩, and that is correct, because
     * hunting is what the first realm is. What has to move is what it says about it, which beast
     * and at what odds.
     */
    console.log(`\n  示 across the first realm it said ${seen.size} different things:`);
    for (const line of seen) console.log(`     ${line}`);
    console.log('');
    expect(seen.size).toBeGreaterThan(3);
  });
});

/**
 * 道 A free upgrade you already own outranks everything, and for the whole life of this
 * function it outranked nothing.
 *
 * Measured with 早 tools/early.ts before the fix: on **100% of visits where a cultivator
 * held unspent 道 points**, this line pointed somewhere else, every single time at 狩
 * the hunt, while they carried as many as twelve of them. Bruno was carrying eleven and
 * reading "血蝠 is within reach at 98%. 7 more kills earns its 熟 mark."
 *
 * Points cost nothing, never expire and always help, so nothing can rank above them.
 */
describe('道 unspent points come before everything', () => {
  it('names them, with the count, and points at the tab', async () => {
    const { freePoints } = await import('../../sim/points.ts');
    // A third-realm cultivator who has never opened 道 the Path.
    const s = {
      ...newState(T0), realm: 3, layer: 5, qi: 3e5, materials: 2296,
      levels: { technique: 8, method: 12, pills: 13, cores: 4 },
      killed: { rat: 120, hound: 40, frog: 12, serpent: 30, mantis: 11, bat: 13, fox: 1, ape: 1 },
      unlocked: [], stance: 'swift', sequence: ['crane'],
      // 悟道 Its two cards taken, so the line being measured is the one about points.
      // A card owed outranks everything, which the test below is about.
      awakened: ['feast', 'wolf'],
    } as unknown as State;

    const free = freePoints(s);
    expect(free, 'this cultivator should be carrying points').toBeGreaterThan(0);
    const tip = advice(s);
    expect(tip!.han).toBe('道');
    expect(tip!.tab).toBe('dao');
    expect(tip!.text).toContain(String(free));
  });

  it('stops saying it the moment there is nothing reachable to spend them on', () => {
    // Nothing earned yet, so nothing to spend: the line has to move on rather than
    // send a player to a tab with an empty tree in it.
    const fresh = newState(T0);
    expect(advice(fresh)!.han).not.toBe('道');
  });

  /**
   * 煉器 And the other half: a system nothing ever points at is a system the player does
   * not know they have. Below 狩 the hunt this line never fired once in three realms,
   * because there is nearly always some beast with a mark left in it.
   */
  it('sends material to 煉器 refining once it buys real levels, and not before', () => {
    const base = {
      ...newState(T0), realm: 3, layer: 5, qi: 3e5,
      levels: { technique: 8, method: 12, pills: 13, cores: 4 },
      killed: { rat: 120, hound: 40, frog: 12, serpent: 30, mantis: 11, bat: 13, fox: 1, ape: 1 },
      worn: { weapon: { id: 'w', template: 'sword3', rarity: 'earth', rolls: [{ affix: 'power', value: 22 }] } },
      unlocked: ['root', 'opening', 'edge', 'chain', 'breathing', 'clearmind', 'sunder', 'gleaning', 'keeneye'],
      stance: 'swift', sequence: ['crane'], awakened: ['feast', 'wolf'],
    } as unknown as State;

    // 期 With the week's qi still owed, the hunt it sends them on is the week's own,
    // which is the same tab and a better beast. The generic line is what is left after.
    const week = advice({ ...base, materials: 40 })!;
    expect(week.han).toBe('期');
    expect(week.tab).toBe('hunt');
    // Too little to matter: the line leaves it alone and sends them hunting.
    const took = { ...base, materials: 40, quarryWeek: weekOf(base.at) } as State;
    expect(advice(took)!.han).toBe('狩');
    // Enough for real levels: it names the piece and how many.
    const rich = advice({ ...base, materials: 2296, quarryWeek: weekOf(base.at) } as State)!;
    expect(rich.han).toBe('煉器');
    expect(rich.tab).toBe('gear');
    expect(rich.text).toMatch(/\d+ levels/);
  });
});

/**
 * 悟道 A card owed comes before the points, and the points come before everything else.
 *
 * It is the one thing the climb will not hand over later: the offer waits for ever, but
 * nothing else in the game moves until it is taken.
 */
describe('悟道 a card owed comes first of all', () => {
  it('outranks even unspent 道 points', async () => {
    const { advice } = await import('../advice.ts');
    const s = {
      ...newState(T0), realm: 3, layer: 5, qi: 3e5, materials: 2296,
      levels: { technique: 8, method: 12, pills: 13, cores: 4 },
      killed: { rat: 120, hound: 40, frog: 12, serpent: 30, mantis: 11, bat: 13, fox: 1, ape: 1 },
      unlocked: [], stance: 'swift', sequence: ['crane'], awakened: [],
    } as unknown as State;
    expect(advice(s)!.han).toBe('悟道');
    // Take what is owed and the line moves on to the points.
    expect(advice({ ...s, awakened: ['feast', 'wolf'] })!.han).toBe('道');
  });
});
