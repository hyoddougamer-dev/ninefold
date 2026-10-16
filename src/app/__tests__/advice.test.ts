import { describe, expect, it } from 'vitest';
import { advice } from '../advice.ts';
import { LAYERS_PER_REALM, focusAt, levelCap } from '../../sim/balance.ts';
import { breakThrough, buy, canBreakThrough, canFightWarden, canBuy, newState, wardenStands, type State, type Upgrade } from '../../sim/state.ts';
import { bottleneck, odds, takeKill, wallOf } from '../../sim/combat.ts';
import { huntable, wardenOf } from '../../data/bestiary.ts';
import { advance } from '../../sim/time.ts';
import { REALMS } from '../../data/realms.ts';
import { WEEK, quarryOf, weekOf } from '../../sim/week.ts';
import { skillOpen } from '../../sim/crafts.ts';
import { isOpen } from '../../sim/unlocks.ts';
import { spendablePoints } from '../../sim/points.ts';
import { ADVICE, CULTIVATE } from '../copy.ts';

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
    // 初 The first realm is the first sitting now (FIRST_REALM_PRICE): an hour holds all
    // of it, so it is read every thirty seconds rather than every five minutes, and the
    // walker plays it the way the sitting is played, a fight between readings.
    for (let t = 1; t <= 3600; t++) {
      s = advance(s, T0 + t, false, focusAt(t % 5400));
      for (const u of UPGRADES) if (canBuy(s, u)) s = buy(s, u);
      if (t % 30) continue;
      const tip = advice(s);
      expect(tip).not.toBeNull();
      seen.add(tip!.text);
      if (canFightWarden(s) && odds(s, wardenOf(1)) > 0.5) s = takeKill(s, wardenOf(1));
      if (canBreakThrough(s)) s = breakThrough(s);
      if (s.realm > 1) break;
      const b = [...huntable(s.realm, s.layer)].reverse().find((x) => odds(s, x) > 0.7);
      if (b) s = takeKill(s, b);
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
    const fixture = (at: number) => ({
      ...newState(at), realm: 3, layer: 5, qi: 3e5,
      levels: { technique: 8, method: 12, pills: 13, cores: 4 },
      killed: { rat: 120, hound: 40, frog: 12, serpent: 30, mantis: 11, bat: 13, fox: 1, ape: 1 },
      worn: { weapon: { id: 'w', template: 'sword3', rarity: 'earth', rolls: [{ affix: 'power', value: 22 }] } },
      unlocked: ['root', 'opening', 'edge', 'chain', 'breathing', 'clearmind', 'sunder', 'gleaning', 'keeneye'],
      stance: 'swift', sequence: ['crane'], awakened: ['feast', 'wolf'],
    }) as unknown as State;
    // 期 Which beast the week names is the calendar's business, not this test's: read the
    // same cultivator, begun the same way, on the first week whose quarry it plainly wins and
    // on the first it would lose.
    const weeks = [...Array(52).keys()].map((w) => fixture(T0 + w * WEEK));
    const winnable = (s: State) => odds(s, quarryOf(s)!);
    const base = weeks.find((s) => winnable(s) >= 0.5)!;
    const hard = weeks.find((s) => winnable(s) < 0.35)!;
    expect(base, 'a week whose quarry this cultivator wins').toBeDefined();
    expect(hard, 'a week whose quarry this cultivator loses').toBeDefined();
    // A quarry it would lose is never the line: a fight the reader loses is worse than none.
    expect(advice({ ...hard, materials: 40 })!.han).not.toBe('期');

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

/**
 * 妖 A warden that can be beaten is named, under only a card owed.
 *
 * Played as an hourly visitor (audit, 2026-10-16): layer 9 of 9 in the second realm, the
 * Stone Ape at 98%, and this line pointed at the points, then at ninety Blood Bats. The card
 * was two screens down on a phone, and the cultivator sat there seventeen hours on 4.4M qi.
 */
describe('妖 a warden that can be beaten is the line', () => {
  const atWarden = (over: Partial<State> = {}): State => ({
    ...newState(T0), realm: 2, layer: 8, qi: 2e5, materials: 30, startedAt: T0 - 33 * 3600,
    levels: { technique: 12, method: 12, pills: 12, cores: 12 },
    killed: { rat: 100, hound: 100, frog: 60, serpent: 40, mantis: 40, bat: 14, fox: 1 },
    worn: { weapon: { id: 'w', template: 'sword2', rarity: 'spirit', rolls: [{ affix: 'power', value: 22 }] } },
    stance: 'swift', awakened: ['feast'], unlocked: ['qi1'], ...over,
  } as unknown as State);

  it('names it, at its odds, and says beating it opens the breakthrough', () => {
    const s = atWarden();
    expect(odds(s, wardenOf(2))).toBeGreaterThanOrEqual(0.9);
    const tip = advice(s)!;
    expect(tip.han).toBe('妖');
    expect(tip.text).toMatch(/Stone Ape is \d+% to beat/);
    expect(tip.text).toMatch(/breakthrough/);
    expect(tip.text).not.toMatch(/—|–/);
  });

  it('takes the odds the card quotes when the screen hands them over', () => {
    expect(advice(atWarden(), 0.77)!.text).toMatch(/77% to beat/);
    // Below even it is not the line, whatever else is.
    expect(advice(atWarden(), 0.3)!.han).not.toBe('妖');
  });

  it('comes under a card owed, and over unspent points', () => {
    expect(advice(atWarden({ awakened: [] }))!.han).toBe('悟道');
    const rich = atWarden({ metPoints: 6 } as Partial<State>);
    expect(spendablePoints(rich)).toBeGreaterThan(0);
    expect(advice(rich)!.han).toBe('妖');
  });

  it('says nothing about a warden that has fallen or is not out yet', () => {
    expect(advice(atWarden({ wardenFell: true }))!.han).not.toBe('妖');
    expect(advice(atWarden({ layer: 6 }))!.han).not.toBe('妖');
  });
});

/**
 * 破境 At a gate of the third realm the card named an elixir, a sigil and 爐 pills, and the
 * realm has none of the three: Alchemy opens at the fifth, Sigil Writing at the sixth and the
 * furnace at the ninth (audit, 2026-10-16). It names what is open, and nothing else.
 */
describe('破境 the bottleneck names only what is open', () => {
  const gate = (realm: number): State => ({ ...newState(T0), realm, layer: 8, gateAt: T0 } as State);
  const openAt = (s: State) => ({
    elixir: skillOpen(s, 'alchemy'), sigil: skillOpen(s, 'sigil'), furnace: isOpen(s.realm, 'furnace'),
  });

  it('at a realm-3 gate: cores, gear and refining, and no elixir, sigil or pill', () => {
    const s = gate(3);
    expect(wardenStands(s)).toBe(true);
    expect(bottleneck(s, wardenOf(3)) * wallOf(3)).toBeGreaterThan(1.01);
    const line = CULTIVATE.breachNone(openAt(s));
    expect(line).not.toMatch(/elixir|sigil|爐|pill/i);
    expect(line).toMatch(/妖丹 Cores/);
    expect(line).toMatch(/煉器 refining/);
  });

  it('names the elixir once Alchemy is open, and the sigil only with Sigil Writing', () => {
    const five = CULTIVATE.breachNone(openAt(gate(5)));
    expect(five).toMatch(/An elixir from 丹 Alchemy/);
    expect(five).not.toMatch(/sigil|爐/i);
    const six = CULTIVATE.breachNone(openAt(gate(6)));
    expect(six).toMatch(/An elixir or a sigil/);
    expect(six).not.toMatch(/爐/);
  });

  it('tells a pouch to carry only what it holds', () => {
    expect(ADVICE.breach(1.5, ['elixir'])).toMatch(/Carry an elixir from 業 the workshop: it breaks up to 1\.5 days/);
    expect(ADVICE.breach(1.5, ['elixir'])).not.toMatch(/sigil/);
    expect(ADVICE.breach(2, ['elixir', 'sigil'])).toMatch(/an elixir and a sigil .*they break/);
    expect(CULTIVATE.breachHeld(2, ['sigil'])).toMatch(/carry a sigil from/);
  });
});
