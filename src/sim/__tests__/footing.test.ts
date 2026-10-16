import { describe, expect, it } from 'vitest';
import { ARCHETYPES, TEMPLATE_BY_KEY, callingOf, type Item, type Slot, type Worn } from '../../data/gear.ts';
import { SCHOOL_INFO, type School } from '../../data/schools.ts';
import { ARTS, STANCES } from '../../data/arts.ts';
import { wardenOf } from '../../data/bestiary.ts';
import { EVEN_ROOF, LAYERS_PER_REALM, TRIBULATION_FOOTING } from '../balance.ts';
import { evenDragon, fight } from '../combat.ts';
import { classArts, classMend } from '../schools.ts';
import { crossTribulation, heavenStep, newState, power, tribulationPool, type State } from '../state.ts';
import { heavensOpened } from '../../data/heavens.ts';

/**
 * 頂 The Dragon's footing against a combat bug.
 *
 * Every crossing stands the next Dragon a footing above the one this cultivator would meet
 * at even odds, and it never comes down. On 2026-10-05 a stance and two arts made a beast
 * miss every round, the even reading went to thousands of times 力, and an anchor was left
 * a hundred and twenty times too heavy: half a year of waiting for one mark. Two things
 * keep that from happening again, and this file holds both:
 *
 *   1. no stance and no sequence of arts leaves a beast hitting less than about half the
 *      rounds, on any body, so the reading stays honest;
 *   2. whatever a fight reads, the footing takes at most EVEN_ROOF times 力, and a fight
 *      that cannot be lost reads as nothing.
 */

const T0 = 1_700_000_000;
const DRAGON = wardenOf(9);
const SLOTS: Slot[] = ['weapon', 'robe', 'crown', 'boots', 'talisman', 'ring'];
const KILLED = { fox: 1, ape: 1, crane: 1, tiger: 1, turtle: 1, golem: 1, direwolf: 1, jiao: 1, dragon: 1 };

const can = (sc: School, slot: Slot) => ARCHETYPES.some((x) => x.slot === slot && SCHOOL_INFO[sc].axes.includes(x.affix));
const pieceOf = (school: School, slot: Slot): Item => {
  const a = ARCHETYPES.find((x) => x.slot === slot && SCHOOL_INFO[school].axes.includes(x.affix))!;
  const tpl = TEMPLATE_BY_KEY[`${a.key}6`];
  return { id: `${school}-${slot}`, template: tpl.key, rarity: 'earth', rolls: [{ affix: tpl.affix, value: 40 }] };
};
/** Up to `n` pieces of each school, in the places each can be worn, the first school first. */
const dress = (plan: [School, number][]): Worn => {
  const worn: Worn = {};
  for (const [sc, n] of plan) {
    let put = 0;
    for (const slot of SLOTS) if (put < n && !worn[slot] && can(sc, slot)) { worn[slot] = pieceOf(sc, slot); put++; }
  }
  return worn;
};

/** At the summit, every art held and every stance open: what a crossing reads off. */
const summit = (worn: Worn, lotus = false): State => {
  const s = newState(T0);
  return {
    ...s, realm: 9, layer: LAYERS_PER_REALM - 1, killed: KILLED, worn,
    levels: { ...s.levels, technique: 54 },
    ...(lotus ? { met: ['monk'], chose: { monk: 0 as const } } : {}),
  };
};

/** Every ordered sequence of up to three different arts, and the empty one. */
const SEQUENCES: string[][] = (() => {
  const keys = ARTS.map((a) => a.key);
  const out: string[][] = [[]];
  for (const a of keys) {
    out.push([a]);
    for (const b of keys) if (b !== a) {
      out.push([a, b]);
      for (const c of keys) if (c !== a && c !== b) out.push([a, b, c]);
    }
  }
  return out;
})();

/** The three bodies whose fights read most beyond 力: bare, the full Arts school, the Arhat with the lotus. */
const BODIES: [string, State][] = [
  ['bare', summit({})],
  ['arts', summit(dress([['arts', 5]]))],
  ['arhat', summit(dress([['body', 3], ['arts', 3]]), true)],
];

describe('頂 the Dragon footing cannot be ratcheted by a fight', () => {
  it('dresses the bodies it means to', () => {
    const [, arts] = BODIES.find(([n]) => n === 'arts')!;
    const [, arhat] = BODIES.find(([n]) => n === 'arhat')!;
    const c = callingOf(arts.worn);
    expect([c.kind, c.school, c.tier]).toEqual(['pure', 'arts', 2]);
    expect(callingOf(arhat.worn).pair?.key).toBe('arhat');
    expect(classArts(arts)).toBeGreaterThan(classArts(arhat));
    expect(classMend(arhat)).toBeGreaterThan(0);
  });

  it('never lets a stance and a sequence stop a beast landing its blows', { timeout: 60_000 }, () => {
    let worst = { share: 1, what: '' };
    let fights = 0, longestMiss = 0;
    for (const [name, body] of BODIES) {
      for (const st of STANCES) for (const seq of SEQUENCES) {
        const s = { ...body, stance: st.key, sequence: seq };
        // A beast three times as strong, so the fight runs long enough for a pattern to show.
        let landed = 0, rounds = 0;
        for (let seed = 1; seed <= 3; seed++) {
          const o = fight(s, DRAGON, seed * 7919, power(s) * 3);
          fights++;
          let run = 0;
          for (const r of o.rounds) {
            run = r.beastDamage > 0 ? 0 : run + 1;
            longestMiss = Math.max(longestMiss, run);
            rounds++;
            if (r.beastDamage > 0) landed++;
          }
        }
        const share = rounds ? landed / rounds : 0;
        if (rounds >= 6 && share < worst.share) worst = { share, what: `${name} ${st.key} ${seq.join('-') || '(none)'}` };
      }
    }
    console.log(`\n  頂 over ${fights} fights the beast never missed more than ${longestMiss} round running, `
      + `and landed in at least ${Math.round(worst.share * 100)}% of rounds (the least: ${worst.what})\n`);
    // The rule in combat.ts: a beast never misses two rounds running. It is what was broken.
    expect(longestMiss).toBeLessThanOrEqual(1);
    // So about half is the least a long enough fight can show.
    expect(worst.share).toBeGreaterThanOrEqual(0.4);
  });

  it('reads every honest build well under the roof, with room either side of it', { timeout: 180_000 }, () => {
    const rows: string[] = [];
    let most = 0;
    for (const [name, body] of BODIES) {
      let lo = Infinity, hi = 0, what = '';
      for (const st of STANCES) for (const seq of SEQUENCES) {
        const s = { ...body, stance: st.key, sequence: seq };
        const r = evenDragon(s) / power(s);
        lo = Math.min(lo, r);
        if (r > hi) { hi = r; what = `${st.key} ${seq.join('-') || '(none)'}`; }
      }
      most = Math.max(most, hi);
      rows.push(`    ${name.padEnd(6)} ${lo.toFixed(2)} to ${hi.toFixed(2)} times 力   (most: ${what})`);
    }
    console.log(`\n  頂 the even-odds Dragon, as a multiple of 力, over ${STANCES.length * SEQUENCES.length} builds a body:\n`
      + `${rows.join('\n')}\n    roof ${EVEN_ROOF}, the most any honest build reads ${most.toFixed(2)}\n`);
    // Pushed a tenth lower, the roof still clears every honest build: it is not a knife edge.
    expect(most).toBeLessThan(EVEN_ROOF * 0.9);
  });

  it('builds the next Dragon from at most EVEN_ROOF times 力, and nothing from a fight that cannot be lost', () => {
    const base: State = { ...BODIES[0][1], tribulation: 3, stance: 'swift', sequence: ['fox', 'crane', 'turtle'] };
    const won = { ...base, qi: tribulationPool(base), wardenFell: true };
    const p = power(won);
    const fell = 1;
    // What a heaven opened at this crossing multiplies the anchor by.
    const step = heavensOpened(4) > heavensOpened(3) ? heavenStep() : 1;
    // A fight that cannot be lost reads as nothing (evenDragon), and nothing leaves the
    // Dragon that fell, or the anchor if that is higher.
    expect(crossTribulation(won, fell, 0).tribulationAt).toBe(Math.max(won.tribulationAt, fell) * step);
    // A reading thousands of times 力, which is what the bug of 2026-10-05 left.
    const bugged = crossTribulation(won, fell, p * 2981);
    expect(bugged.tribulationAt / (p * EVEN_ROOF * TRIBULATION_FOOTING * step)).toBeCloseTo(1, 9);
    // An honest reading under the roof is taken whole.
    const honest = crossTribulation(won, fell, p * 2);
    expect(honest.tribulationAt / (p * 2 * TRIBULATION_FOOTING * step)).toBeCloseTo(1, 9);
    // And the anchor itself never comes down: the roof is on the reading, not on what is held.
    const heavy = { ...won, tribulationAt: p * 50 };
    expect(crossTribulation(heavy, fell, p * 2981).tribulationAt).toBe(heavy.tribulationAt * step);
  });
});
