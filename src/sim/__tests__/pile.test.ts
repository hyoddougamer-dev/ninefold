import { describe, expect, it } from 'vitest';
import { BEASTS, commonsOf } from '../../data/bestiary.ts';
import { RARITIES, type Item } from '../../data/gear.ts';
import { HABITS, play } from '../../../tools/habits.ts';
import { DRIVE_MOST, DRIVE_PILE, MELT_CAP, PILE_HOLD, SECOND_DROP_CAP } from '../balance.ts';
import { outbound } from '../save.ts';
import { seal } from '../seal.ts';
import { packItem, packPile, unpackPile } from '../pilepack.ts';
import { drive } from '../hunt.ts';
import { MARKS } from '../record.ts';
import { advance } from '../time.ts';
import { newState, rate, type State } from '../state.ts';
import { validate } from '../load.ts';
import { holdDrops, pileStale, plan, settle, settleDefault, settleStale } from '../pile.ts';
import { limitFor, stash } from '../stash.ts';
import { melt, salvageValue } from '../salvage.ts';
import { verify } from '../verify.ts';
import { itemWorth } from '../chest.ts';
import { FORGED } from '../../data/crafts.ts';

/**
 * 圍 The drive's window (rekaris and razielmorgenstern, on the Discord, 2026-10-06): everything
 * that dropped, a mark on what to keep, the rest melted.
 *
 * What it has to keep true: doing nothing is what the game always did, the window never
 * pays more than melting anywhere pays, a choice that does not fit is refused rather than
 * trimmed, a full chest cannot lock it, and the save that holds the pieces is a save the
 * server reads like any other.
 */

const T0 = 1_700_000_000;

/** A rich cultivator of a given realm who has already earned 熟 on everything. */
function hunter(realm: number, extra: Partial<State> = {}): State {
  return {
    ...newState(T0), realm, qi: 1e12,
    killed: Object.fromEntries(BEASTS.map((b) => [b.key, MARKS[1]])),
    ...extra,
  };
}

/** A drive that drops plenty: the weakest common of the cultivator's own realm. */
function driven(s: State, n = 200, seed = 77) {
  const beast = commonsOf(s.realm)[0];
  return drive(s, beast, n, seed);
}

/** Pieces of a realm, made up, for a chest that has to be full. */
function junk(n: number, tag = 'j'): Item[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `${tag}-${i}`, template: 'sword3', rarity: 'common' as const, rolls: [{ affix: 'power' as const, value: 3 }],
  }));
}

describe('圍 what a drive lays out', () => {
  it('lists everything that fell, best first, and leaves the state alone', () => {
    const s = hunter(4);
    const d = driven(s, 1000);
    // rekaris, 2026-10-08: "Why only the best 60?" Every piece is listed now.
    expect(d.dropsRolled).toBeGreaterThan(60);
    expect(d.drops.length).toBe(d.dropsRolled);
    const worth = d.drops.map((x) => itemWorth(x));
    expect(worth).toEqual([...worth].sort((a, b) => b - a));
    // The harness (tools/) reads drive().state and never the pile, so the curves cannot move.
    expect(d.state.pile).toEqual([]);
    expect(d.state.pileAt).toBe(0);
    expect(d.state.chest).toEqual(s.chest);
  });

  it('lists all of the biggest drive there is, even with Creation making a second piece likely', () => {
    // The worst case a drive can roll: DRIVE_MOST kills, every one a piece (Creation), and the
    // second piece as likely as it can ever be made.
    expect(DRIVE_PILE).toBe(Math.floor(DRIVE_MOST * (1 + SECOND_DROP_CAP)));
    const s = hunter(6);
    const d = drive(s, commonsOf(6)[0], DRIVE_MOST, 9, { always: true, chance: 1 });
    expect(d.kills).toBe(DRIVE_MOST);
    expect(d.dropsRolled).toBeGreaterThan(DRIVE_MOST);
    expect(d.dropsRolled).toBeLessThanOrEqual(DRIVE_PILE);
    expect(d.drops.length).toBe(d.dropsRolled);
    expect(new Set(d.drops.map((x) => x.id)).size).toBe(d.drops.length);
  });

  it('is the same pile for the same drive', () => {
    const a = driven(hunter(4), 200, 5);
    const b = driven(hunter(4), 200, 5);
    expect(a.drops.map((x) => x.id)).toEqual(b.drops.map((x) => x.id));
  });

  it('puts nothing on the table when nothing fell (the first realm drops no gear)', () => {
    const d = driven(hunter(1), 50);
    expect(d.drops).toEqual([]);
    expect(holdDrops(d.state, d).pile).toEqual([]);
  });
});

describe('圍 doing nothing is what the game always did', () => {
  it('the game’s own answer is exactly the old stash of the best piece, chest full or not', () => {
    for (const fill of [0, 5, 400]) {
      const s = hunter(4, { chest: junk(fill) });
      const d = driven(s);
      const before = stash(d.state, d.best).state;
      const after = settleDefault(holdDrops(d.state, d));
      expect(after.chest.map((x) => x.id)).toEqual(before.chest.map((x) => x.id));
      expect(after.qi).toBeCloseTo(before.qi, 6);
      expect(after.materials).toBeCloseTo(before.materials, 6);
      expect(after.melt).toBeCloseTo(before.melt, 6);
      expect(after.pile).toEqual([]);
      expect(after.pileAt).toBe(0);
    }
  });

  it('waits in the save, nothing lost, and is answered for the player after PILE_HOLD', () => {
    const s = hunter(4);
    const held = holdDrops(driven(s).state, driven(s));
    expect(held.pile.length).toBeGreaterThan(0);
    expect(held.chest.length).toBe(0);
    expect(pileStale(held)).toBe(false);
    // An hour, and the window is still open on the same pieces.
    const hour = advance(held, held.at + 3600);
    expect(settleStale(hour)).toBe(hour);
    expect(hour.pile).toEqual(held.pile);
    // A day later nobody has answered, and the game answers as it always did.
    const late = advance(held, held.at + PILE_HOLD + 1);
    expect(pileStale(late)).toBe(true);
    const done = settleStale(late);
    expect(done.pile).toEqual([]);
    expect(done.chest.map((x) => x.id)).toEqual([held.pile[0].id]);
  });

  it('a second drive answers the first for the player, the game’s way, and then lays out its own', () => {
    const s = hunter(4);
    const first = driven(s, 200, 1);
    const held = holdDrops(first.state, first);
    const second = driven(held, 200, 2);
    const both = holdDrops(second.state, second);
    expect(both.chest.map((x) => x.id)).toEqual([first.drops[0].id]);
    expect(both.pile.map((x) => x.id)).toEqual(second.drops.map((x) => x.id));
  });
});

describe('圍 the choice', () => {
  const s0 = hunter(4);
  const d0 = driven(s0);
  const held = holdDrops(d0.state, d0);
  const ids = (xs: readonly Item[]) => xs.map((x) => x.id);

  it('keeps what is marked, melts the rest, and empties the table', () => {
    const keep = ids(held.pile.slice(0, 3));
    const out = settle(held, { keep });
    expect(ids(out.chest)).toEqual(keep);
    expect(out.pile).toEqual([]);
    expect(out.pileAt).toBe(0);
    expect(out.qi).toBeGreaterThan(held.qi);
  });

  it('is refused, the same state back, when what is kept would not fit', () => {
    const full = { ...held, chest: junk(limitFor(held)) };
    const keep = ids(held.pile.slice(0, 2));
    expect(plan(full, { keep }).fits).toBe(false);
    expect(settle(full, { keep })).toBe(full);
    // Nothing marked always fits: everything melts and the chest is untouched.
    const none = settle(full, { keep: [] });
    expect(none.chest.length).toBe(full.chest.length);
    expect(none.pile).toEqual([]);
  });

  it('melting the bag from the same window makes room, so a full chest never locks it', () => {
    const full = { ...held, chest: junk(limitFor(held)) };
    const keep = ids(held.pile.slice(0, 4));
    const p = plan(full, { keep, meltBag: true });
    expect(p.fits).toBe(true);
    const out = settle(full, { keep, meltBag: true });
    expect(ids(out.chest)).toEqual(keep);
    expect(out.pile).toEqual([]);
  });

  it('never melts a locked piece, not even when the whole bag is melted', () => {
    const chest = junk(limitFor(held)).map((x, i) => (i < 3 ? { ...x, locked: true as const } : x));
    const full = { ...held, chest };
    const out = settle(full, { keep: [], meltBag: true });
    expect(out.chest.length).toBe(3);
    expect(out.chest.every((x) => x.locked)).toBe(true);
  });

  it('names nothing that is not on the table: a stale id is ignored, not trusted', () => {
    const out = settle(held, { keep: ['nope', held.pile[0].id] });
    expect(ids(out.chest)).toEqual([held.pile[0].id]);
  });
});

describe('圍 and it is no new door into qi', () => {
  it('pays out of the same melting allowance as any melt, and never past it', () => {
    const s0 = hunter(6);
    const d = driven(s0, 400);
    for (const allowance of [MELT_CAP, MELT_CAP / 100, 0]) {
      const held = holdDrops({ ...d.state, melt: allowance }, d);
      const keep = held.pile.slice(0, 2).map((x) => x.id);
      const out = settle(held, { keep });
      const gained = out.qi - held.qi;
      // The qi can never be more than the allowance held, in seconds of the gathering.
      expect(gained).toBeLessThanOrEqual(allowance * rate(held) * (1 + 1e-9) + 1e-3);
      // And the allowance is drawn down by exactly what was paid.
      expect(held.melt - out.melt).toBeCloseTo(gained / rate(held), 3);
    }
  });

  it('is exactly what melting those pieces anywhere else pays', () => {
    const d = driven(hunter(5), 300);
    const held = holdDrops(d.state, d);
    const keep = held.pile.slice(0, 1).map((x) => x.id);
    const rest = held.pile.filter((x) => !keep.includes(x.id));
    const direct = melt(held, rest);
    const out = settle(held, { keep });
    expect(out.qi).toBeCloseTo(direct.state.qi, 6);
    expect(out.materials).toBeCloseTo(direct.state.materials, 6);
  });

  it('a forged piece melts back into its metal and never into qi', () => {
    const forged: Item = { ...junk(1)[0], id: 'f', from: FORGED };
    expect(salvageValue(forged)).toBe(0);
  });

  it('with the allowance spent, a whole drive pays no qi at all, only 材 material', () => {
    const d = driven(hunter(6), 400);
    const held = holdDrops({ ...d.state, melt: 0 }, d);
    const out = settle(held, { keep: [] });
    expect(out.qi).toBe(held.qi);
    expect(out.materials).toBeGreaterThan(held.materials);
  });

  it('adds 材 material beside the drive’s own, a measured share and no more', () => {
    // 量 A measurement, printed: the material the unmarked pieces melt into against the material
    // the 200 kills paid, for a sixth-realm hunter with the allowance spent (the worst case).
    const d = driven(hunter(6), 200);
    const held = holdDrops({ ...d.state, melt: 0 }, d);
    const out = settle(held, { keep: [] });
    const spill = out.materials - held.materials;
    // eslint-disable-next-line no-console
    console.log(`\n  圍 200 kills, realm 6: ${Math.round(d.material)} 材 from the kills, `
      + `+${Math.round(spill)} 材 if all ${d.drops.length} listed pieces melt past the allowance `
      + `(${(spill / d.material * 100).toFixed(0)}%)`);
    expect(spill).toBeGreaterThan(0);
    expect(spill / d.material).toBeLessThan(0.25);
  });
});

describe('圍 the save', () => {
  const d = driven(hunter(4), 200);
  const held = holdDrops(d.state, d);

  it('round-trips through validate, pieces and instant', () => {
    const back = validate(JSON.parse(JSON.stringify(held)), held.at);
    expect(back.pile.map((x) => x.id)).toEqual(held.pile.map((x) => x.id));
    expect(back.pile[0]).toEqual(held.pile[0]);
    expect(back.pileAt).toBe(held.pileAt);
  });

  it('caps the pile at DRIVE_PILE, however many pieces a hand-edited save names', () => {
    const many = Array.from({ length: 5000 }, (_, i) => ({ ...junk(1)[0], id: `x${i}` }));
    const back = validate({ ...JSON.parse(JSON.stringify(held)), pile: many }, held.at);
    expect(back.pile.length).toBe(DRIVE_PILE);
    // And a hostile array of rows or junk is cut before it is read, not only after.
    const junkRows = Array.from({ length: 200_000 }, () => 'nope');
    expect(validate({ ...JSON.parse(JSON.stringify(held)), pile: junkRows }, held.at).pile).toEqual([]);
    expect(unpackPile(junkRows).length).toBeLessThanOrEqual(DRIVE_PILE * 2);
  });

  it('still loads a pile from before the window listed everything: sixty objects, as they were', () => {
    const sixty = Array.from({ length: 60 }, (_, i) => ({ ...junk(1)[0], id: `old${i}-sword3` }));
    const back = validate({ ...JSON.parse(JSON.stringify(held)), pile: sixty }, held.at);
    expect(back.pile.map((x) => x.id)).toEqual(sixty.map((x) => x.id));
    expect(back.pileAt).toBe(held.pileAt);
  });

  it('drops pieces that do not exist, from realms not reached, or with impossible lines', () => {
    const raw = JSON.parse(JSON.stringify({ ...held, realm: 4, pile: [] }));
    const real = junk(1)[0];
    raw.pile = [
      { ...real, id: 'ok' },
      { ...real, id: 'ghost', template: 'not-a-template' },
      { ...real, id: 'far', template: 'sword9' },
      { ...real, id: 'huge', rolls: [{ affix: 'power', value: 1e12 }] },
      'a string', null, 12,
    ];
    const back = validate(raw, held.at);
    expect(back.pile.map((x) => x.id)).toEqual(['ok', 'huge']);
    // The roll is held to what its rank could ever roll.
    expect(back.pile[1].rolls[0].value).toBeLessThan(1e6);
  });

  it('gives a piece that shares a name with one in the chest a name of its own, and keeps both', () => {
    const raw = JSON.parse(JSON.stringify(held));
    raw.chest = [{ ...raw.pile[0] }];
    const back = validate(raw, held.at);
    const all = [...back.chest, ...back.pile].map((x) => x.id);
    expect(new Set(all).size).toBe(all.length);
  });

  it('has no instant without pieces, and none in the future', () => {
    const none = validate({ ...JSON.parse(JSON.stringify(held)), pile: [], pileAt: 12345 }, held.at);
    expect(none.pileAt).toBe(0);
    const future = validate({ ...JSON.parse(JSON.stringify(held)), pileAt: held.at + 1e9 }, held.at);
    expect(future.pileAt).toBeLessThanOrEqual(held.at);
    // A save from before the window has neither field.
    const old = JSON.parse(JSON.stringify(held));
    delete old.pile; delete old.pileAt;
    expect(validate(old, held.at).pile).toEqual([]);
  });

  it('comes back from a closed game the way it left, and a full day later is answered', () => {
    const wrapped = JSON.parse(JSON.stringify(held));
    const next = validate(wrapped, held.at + 600);
    expect(next.pile.length).toBe(held.pile.length);
    const late = advance(validate(wrapped, held.at + PILE_HOLD + 5), held.at + PILE_HOLD + 5);
    expect(pileStale(late)).toBe(true);
    expect(settleStale(late).pile).toEqual([]);
  });

  it('every rarity in a pile is a rarity', () => {
    expect(held.pile.every((x) => RARITIES.includes(x.rarity))).toBe(true);
  });
});

describe('圍 the server', () => {
  it('reads a save with pieces on the table like any other, and an answered one too', () => {
    // A real cultivator, walked to the middle game, then a drive taken at their last visit.
    const shots: State[] = [];
    play(HABITS.find((h) => h.name === 'active')!, 20, (day, s) => { if (day >= 14 && shots.length < 2) shots.push(structuredClone(s)); });
    const [a, b] = shots;
    expect(a).toBeDefined();
    const dt = b.at - a.at;
    const baseline = verify(a, b, dt);
    expect(baseline.ok).toBe(true);

    const beast = commonsOf(b.realm)[0];
    const asKnown = { ...b, killed: { ...b.killed, [beast.key]: Math.max(b.killed[beast.key] ?? 0, MARKS[1]) } };
    const d = drive(asKnown, beast, 10, 3);
    const onTable = holdDrops(d.state, d);
    // The pieces on the table, kills and all, change nothing the pair was already allowed.
    expect(verify(a, { ...onTable, qi: b.qi, materials: b.materials }, dt).why.filter((w) => w === 'gear')).toEqual([]);
    expect(verify(a, onTable, dt + 3600).ok).toBe(true);
    // Answered, either way.
    const kept = settle(onTable, { keep: onTable.pile.slice(0, 1).map((x) => x.id) });
    expect(verify(a, kept, dt + 3600).ok).toBe(true);
    expect(verify(a, settleDefault(onTable), dt + 3600).ok).toBe(true);
  }, 120_000);

  it('refuses a piece on the table from a realm the save has not reached, as it does in the chest', () => {
    const s = hunter(2);
    const far: Item = { ...junk(1)[0], id: 'far', template: 'sword9' };
    const v = verify(s, { ...s, pile: [far], pileAt: s.at }, 60);
    expect(v.why).toContain('gear');
  });
});

describe('圍 the pile written small', () => {
  const s0 = hunter(6);
  const big = drive(s0, commonsOf(6)[0], DRIVE_MOST, 9, { always: true, chance: 1 });
  const held = holdDrops(big.state, big);
  const wire = () => JSON.parse(JSON.stringify(outbound(held)));

  it('writes rows and reads them back as the very same pieces', () => {
    const raw = wire();
    expect(Array.isArray(raw.pile[0])).toBe(true);
    const back = validate(raw, held.at);
    expect(back.pile).toEqual(held.pile);
    expect(back.pileAt).toBe(held.pileAt);
  });

  it('is a modest save at the biggest a pile can be (measured, printed)', () => {
    const plain = JSON.stringify(held).length;
    const packed = JSON.stringify(outbound(held)).length;
    const sealed = seal(JSON.stringify(outbound(held))).length;
    // eslint-disable-next-line no-console
    console.log(`\n  圍 ${held.pile.length} pieces: save ${Math.round(plain / 1024)} KB as objects, `
      + `${Math.round(packed / 1024)} KB as rows (${Math.round(packed / plain * 100)}%), `
      + `${Math.round(sealed / 1024)} KB sealed, and the phone keeps two copies of it`);
    expect(held.pile.length).toBeGreaterThan(DRIVE_MOST);
    // The rows must stay well under half of the objects, and the sealed save (written twice,
    // main and backup) under a fifth of the five million characters a phone's storage allows.
    expect(packed).toBeLessThan(plain * 0.5);
    expect(sealed * 2).toBeLessThan(1_000_000);
  });

  it('keeps a piece that is more than a drive drops as the object it was', () => {
    const odd: Item = { ...junk(1)[0], id: 'odd', locked: true };
    expect(Array.isArray(packItem(odd))).toBe(false);
    const plainId: Item = { ...junk(1)[0], id: 'no-suffix-here' };
    const row = packItem(plainId);
    expect(Array.isArray(row)).toBe(true);
    const raw = JSON.parse(JSON.stringify({ ...held, pile: packPile([odd, plainId]) }));
    const back = validate(raw, held.at);
    expect(back.pile.map((x) => x.id)).toEqual(['odd', 'no-suffix-here']);
    expect(back.pile[0].locked).toBe(true);
  });

  it('judges a row like any other piece: unknown, too far, twins, and impossible lines', () => {
    const raw = JSON.parse(JSON.stringify({ ...held, realm: 4, pile: [] }));
    raw.pile = [
      ['a', 'sword3', 'rare', ['power', 3]],
      ['a', 'sword3', 'rare', ['power', 3]],                 // the same name again
      ['b', 'not-a-template', 'rare', ['power', 3]],
      ['c', 'sword9', 'rare', ['power', 3]],                 // a realm not reached
      ['d', 'sword3', 'rare', ['power', 1e12, 'power', 5, 'nonsense', 4]],
      [], [null], ['e'], [1, 2, 3, 4], 'row', 7,
    ];
    const back = validate(raw, held.at);
    const ids = back.pile.map((x) => x.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.filter((x) => x.startsWith('a-')).length).toBe(2);
    expect(ids).toContain('d-sword3');
    expect(back.pile.every((x) => x.template === 'sword3')).toBe(true);
    const d = back.pile.find((x) => x.id === 'd-sword3')!;
    expect(d.rolls).toHaveLength(1);
    expect(d.rolls[0].value).toBeLessThan(1e6);
  });
});

describe('圍 the server reads the biggest pile without strain', () => {
  it('verifies a save with the largest pile at once, and still refuses a far piece in it', () => {
    const s0 = hunter(6);
    const big = drive(s0, commonsOf(6)[0], DRIVE_MOST, 9, { always: true, chance: 1 });
    const held = holdDrops(big.state, big);
    const before = validate(JSON.parse(JSON.stringify(s0)), s0.at);
    const sent = JSON.parse(JSON.stringify(outbound(held)));
    const t0 = performance.now();
    const after = validate(sent, held.at + 60);
    const v = verify(before, after, 60 + (held.at - before.at));
    const ms = performance.now() - t0;
    // eslint-disable-next-line no-console
    console.log(`\n  圍 validate + verify of a ${after.pile.length}-piece pile: ${ms.toFixed(0)} ms`);
    expect(after.pile.length).toBe(held.pile.length);
    expect(v.why.filter((w) => w === 'gear')).toEqual([]);
    expect(ms).toBeLessThan(1500);
    // One far piece among three thousand is still a piece the cultivator could not have.
    const far = { ...after, pile: [...after.pile, { ...junk(1)[0], id: 'far', template: 'sword9' }] };
    expect(verify(before, { ...far, realm: 2 }, 60).why).toContain('gear');
  });
});
