import { describe, expect, it } from 'vitest';
import { SYSTEMS, isOpen, opensAt, opensIn, systemInfo, type System } from '../unlocks.ts';
import { ARTS, STANCES } from '../../data/arts.ts';
import { REALMS, realm as realmOf } from '../../data/realms.ts';
import { CORES_FREE_REALMS } from '../combat.ts';
import { newState, type State } from '../state.ts';
import { canBrew, canRefine, clearFloor, lootTaken, towerOpen } from '../trials.ts';
import { rollDrop } from '../drops.ts';
import { commonsOf, wardenOf } from '../../data/bestiary.ts';
import { recordMaterial } from '../record.ts';

const T0 = 1_700_000_000;
const at = (realm: number, over: Partial<State> = {}): State =>
  ({ ...newState(T0), realm, layer: 8, ...over });

describe('開 what each realm opens', () => {
  it('prints the ladder, and gives every realm something', () => {
    const rows = REALMS.map((r) => {
      const stance = STANCES.find((s) => s.realm === r.n)!;
      const art = ARTS.find((a) => a.realm === r.n)!;
      const systems = opensIn(r.n).map((s) => `${s.han} ${s.name}`).join(' · ');
      return `  ${r.han}  realm ${r.n}   ${stance.han} ${stance.name.padEnd(10)}` +
        `${art.han} ${art.name.padEnd(14)}${systems || '—'}`;
    });
    console.log(`\n  開 九境 is purely vertical: nothing ever resets, so every realm has to\n` +
      `  hand over something that was not there before.\n\n${rows.join('\n')}\n`);

    // Nine realms, nine stances, nine arts, and never a realm that gives none of them.
    for (const r of REALMS) {
      expect(STANCES.some((s) => s.realm === r.n)).toBe(true);
      expect(ARTS.some((a) => a.realm === r.n)).toBe(true);
    }
    // Every system opens somewhere on the ladder, and the first realm holds exactly the
    // three that make one loop: 狩 something to kill, 妖丹 something the kill buys, 錄
    // the count that makes the tenth kill worth more than the first. The first realm
    // used to hand over nothing for thirteen hours, and then hand over hunting whose
    // two rewards were both locked a fortnight away. Everything else still waits, so
    // the first realm is one screen and one list, not a spreadsheet.
    const FIRST = ['hunt', 'cores', 'record'];
    for (const s of SYSTEMS) {
      expect(s.realm).toBeGreaterThanOrEqual(FIRST.includes(s.key) ? 1 : 2);
      expect(s.realm).toBeLessThanOrEqual(9);
      expect(s.gives.length).toBeGreaterThan(30);
    }
    expect(opensIn(1).map((x) => x.key).sort()).toEqual([...FIRST].sort());
    // And from the third realm it is one thing at a time, so nothing arrives in a heap.
    for (let r = 3; r <= 9; r++) expect(opensIn(r).length).toBeLessThanOrEqual(2);
  });

  it('shuts every gate below its realm, and opens it for good above', () => {
    for (const s of SYSTEMS) {
      expect(isOpen(s.realm - 1, s.key)).toBe(false);
      expect(isOpen(s.realm, s.key)).toBe(true);
      expect(isOpen(9, s.key)).toBe(true);
      expect(systemInfo(s.key)).toBe(s);
    }
  });

  it('is enforced by the simulation, not only by the screen', () => {
    const shut: [System, (s: State) => boolean][] = [
      ['gear', (s) => rollDrop(wardenOf(s.realm), s.realm, 7) !== null],
      ['tower', (s) => towerOpen(s)],
      ['furnace', (s) => canBrew({ ...s, qi: 1e18, materials: 1e18 }, 'body')],
      ['refine', (s) => canRefine(s, 'weapon')],
    ];
    for (const [key, works] of shut) {
      const below = at(opensAt(key) - 1, { qi: 1e18, materials: 1e18 });
      const above = at(opensAt(key), { qi: 1e18, materials: 1e18 });
      expect(works(below)).toBe(false);
      // Only the realm changed between these two.
      if (key !== 'refine') expect(works(above)).toBe(true);
    }
    // A floor cannot be taken before the tower stands.
    const early = at(opensAt('tower') - 1);
    expect(clearFloor(early, 1)).toBe(early);
  });

  it('lets a late system arrive full rather than arriving empty', () => {
    // 錄 the record is counted from the first kill and paid from the sixth realm, so the
    // realm that opens it hands over everything hunted before it — not a blank page.
    const killed = Object.fromEntries(commonsOf(1).map((b) => [b.key, 50]));
    const before = at(opensAt('record') - 1, { killed });
    const after = at(opensAt('record'), { killed });
    expect(recordMaterial(killed)).toBeGreaterThan(1);
    expect(lootTaken(before, 1000)).toBeLessThan(lootTaken(after, 1000));
  });

  it('agrees with the wall the wardens already put up', () => {
    // 妖丹 may never be *required* before it is *available*, or a cultivator meets a
    // warden they cannot beat with an upgrade they cannot buy. Earlier than required is
    // the right way round, and it is where it sits now: on sale from the first realm,
    // demanded from the third, so the hunting has somewhere to go long before the wall.
    expect(opensAt('cores')).toBeLessThanOrEqual(CORES_FREE_REALMS + 1);
    console.log(`  妖丹 is on sale from ${realmOf(opensAt('cores')).han} ` +
      `${realmOf(opensAt('cores')).name} and demanded from ` +
      `${realmOf(CORES_FREE_REALMS + 1).han} ${realmOf(CORES_FREE_REALMS + 1).name}\n`);
  });
});
