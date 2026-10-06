/**
 * 壁 The walls of the nine realms, measured: for every way of playing, how strong the
 * cultivator stands against each realm's warden the moment it can first be fought, how
 * long they wait at the gate, and the day each realm is reached.
 *
 * Bruno, 2026-10-06: combat and crafting are the weak half of the climb, and the answer
 * is walls the players get over with what the game already has (cores, the furnace's
 * pills, the workshop's kit, refining and the forge), not new systems. This is what the
 * walls are calibrated against, and what tells whether an idle player still gets through.
 *
 *     npx tsx tools/walls.ts            every habit
 *     npx tsx tools/walls.ts active     one
 *     npx tsx tools/walls.ts active crafts   the same cultivator with the workshop, and
 *                                          the days of bottleneck its kit broke (破境)
 */
import { HABITS, play } from './habits.ts';
import { odds, effectiveBeastPower } from '../src/sim/combat.ts';
import { wardenOf } from '../src/data/bestiary.ts';
import { canFightWarden, power } from '../src/sim/state.ts';
import { kitFor } from '../src/sim/crafts.ts';
import { carryBest } from './crafter.ts';

const only = process.argv[2];
const crafts = process.argv[3] === 'crafts';
for (const base of HABITS.filter((x) => !only || x.name === only)) {
  const h = crafts ? { ...base, crafts: true } : base;
  const first: Record<number, { day: number; ratio: number; odds: number }> = {};
  const broke: string[] = [];
  const r = play(h, 400, (day, s) => {
    if (s.realm < 9 && canFightWarden(s) && !first[s.realm]) {
      const w = wardenOf(s.realm);
      first[s.realm] = { day, ratio: power(s) / effectiveBeastPower(s, w), odds: odds(s, w) };
      if (crafts) broke.push(`${s.realm}:${(kitFor(carryBest(s, w, 'warden'), w, 'warden').kit.breach ?? 0).toFixed(1)}`);
    }
  });
  const gates = Array.from({ length: 8 }, (_, i) => {
    const f = first[i + 1];
    const wait = f && r.arrival[i + 1] !== undefined ? r.arrival[i + 1] - f.day : NaN;
    return f ? `${(i + 1)}:×${f.ratio < 10 ? f.ratio.toFixed(1) : Math.round(f.ratio)}/${Math.round(f.odds * 100)}%/${Number.isFinite(wait) ? wait.toFixed(1) : '-'}d` : `${i + 1}:-`;
  });
  console.log(`${h.name.padEnd(15)} realm 9 on day ${r.arrival[8] !== undefined ? r.arrival[8].toFixed(1).padStart(5) : '  -  '}   ${gates.join('  ')}`);
  if (crafts) console.log(`${''.padEnd(15)} days of bottleneck the kit broke at each gate: ${broke.join('  ')}`);
}
