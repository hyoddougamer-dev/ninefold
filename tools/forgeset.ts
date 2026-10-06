/**
 * 譜 What a forged set chosen line by line would be worth, before anything is built.
 *
 * Bruno, 2026-10-06, on the workshop: the sets it makes should be whole, their lines
 * chosen by what goes into the crucible, and hard to make. Before proposing numbers this
 * measures the ceiling: the active cultivator at each realm's arrival, wearing what the
 * harness actually picked up, against the same body in six forged pieces of its realm
 * at a given rank, every secondary line chosen to raise power most and rolled at the top
 * of its band (what three portions of a material would buy).
 *
 *     npx tsx tools/forgeset.ts            active
 *     npx tsx tools/forgeset.ts casual
 */
import { HABITS, play } from './habits.ts';
import {
  AFFIXES, GEAR, RARITIES, SLOTS, baseValue, roundValue,
  type Affix, type Item, type Rarity, type Slot,
} from '../src/data/gear.ts';
import { SECONDARIES, SECONDARY_SHARE, VARIANCE } from '../src/sim/balance.ts';
import { power, type State } from '../src/sim/state.ts';
import { rate } from '../src/sim/time.ts';

const who = process.argv[2] ?? 'active';
const h = HABITS.find((x) => x.name === who)!;
const at: Record<number, State> = {};
play(h, 400, (_day, s) => { if (!at[s.realm]) at[s.realm] = s; });

/** The best piece for one place: every shape of that place, every choice of lines, greedily. */
function forge(s: State, slot: Slot, rarity: Rarity, top: number): Item {
  let best: Item | null = null;
  let bestP = -1;
  for (const t of GEAR.filter((g) => g.slot === slot && g.realm === s.realm)) {
    const rolls = [{ affix: t.affix, value: roundValue(t.affix, baseValue(t, rarity, t.affix) * top) }];
    const pool: Affix[] = AFFIXES.filter((a) => a !== t.affix && a !== 'capacity');
    for (let i = 0; i < SECONDARIES[rarity]; i++) {
      let pick: Affix | null = null; let pickP = -1;
      for (const a of pool) {
        const trial = [...rolls, { affix: a, value: roundValue(a, baseValue(t, rarity, a) * SECONDARY_SHARE * top) }];
        const p = power({ ...s, worn: { ...s.worn, [slot]: { id: 'x', template: t.key, rarity, rolls: trial, from: 'forge' } } });
        if (p > pickP) { pickP = p; pick = a; }
      }
      if (!pick) break;
      pool.splice(pool.indexOf(pick), 1);
      rolls.push({ affix: pick, value: roundValue(pick, baseValue(t, rarity, pick) * SECONDARY_SHARE * top) });
    }
    const item: Item = { id: `f-${t.key}`, template: t.key, rarity, rolls, from: 'forge' };
    const p = power({ ...s, worn: { ...s.worn, [slot]: item } });
    if (p > bestP) { bestP = p; best = item; }
  }
  return best!;
}

function dressed(s: State, rarity: Rarity, top: number): State {
  let x = s;
  for (const slot of SLOTS) x = { ...x, worn: { ...x.worn, [slot]: forge(x, slot, rarity, top) } };
  return x;
}

console.log(`\n${who}: power and qi a second at each realm's arrival, worn as found against a forged set`);
console.log('realm   as found          earth, top of band      heaven, top of band     heaven, middle of band');
for (const r of [3, 5, 7, 9]) {
  const s = at[r];
  if (!s) continue;
  const p0 = power(s); const q0 = rate(s);
  const cols = [
    dressed(s, 'earth', 1 + VARIANCE),
    dressed(s, 'heaven', 1 + VARIANCE),
    dressed(s, 'heaven', 1),
  ].map((x) => `×${(power(x) / p0).toFixed(2)} 力  ×${(rate(x) / q0).toFixed(2)} 氣`);
  const worn = SLOTS.map((k) => (s.worn[k] ? RARITIES.indexOf(s.worn[k]!.rarity) : -1)).join('');
  console.log(`  ${r}     ranks ${worn.padEnd(8)}  ${cols.map((c) => c.padEnd(22)).join('  ')}`);
}
