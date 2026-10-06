/**
 * 鬥感 How a fight feels across the nine realms, read off the harness's cultivators.
 *
 * Bruno, 2026-10-06: combat and crafting are the game's weakest parts for now, focus on
 * the nine realms. The testers said it plainly ("Autofight trivializes combat", "Enemies
 * in Hunt grow trivially easy", "everything falls in one blow"). This measures it: at the
 * day a cultivator enters each realm and the day they leave it, how many of the realm's
 * beasts they win for sure, how many fall in the first round, how long a fight lasts, and
 * the warden's odds the day they meet it.
 *
 *     npx tsx tools/combatfeel.ts [habit]
 */
import { HABITS, play } from './habits.ts';
import { effectiveBeastPower, fight, odds } from '../src/sim/combat.ts';
import { huntable, wardenOf } from '../src/data/bestiary.ts';
import { power, type State } from '../src/sim/state.ts';

const name = process.argv[2] ?? 'active';
const habit = HABITS.find((h) => h.name === name)!;
const snaps = new Map<string, { day: number; s: State }>();
let last = 0;
play(habit, 120, (day, s) => {
  const keyIn = `${s.realm}:in`;
  if (!snaps.has(keyIn)) snaps.set(keyIn, { day, s: structuredClone(s) });
  snaps.set(`${s.realm}:out`, { day, s: structuredClone(s) });
  last = day;
});

const row = (label: string, day: number, s: State) => {
  const beasts = huntable(s.realm);
  let sure = 0, oneBlow = 0, rounds = 0, n = 0;
  for (const b of beasts) {
    const o = odds(s, b);
    if (o >= 0.98) sure++;
    for (let k = 0; k < 20; k++) {
      const f = fight(s, b, 1000 + k * 7919);
      rounds += f.rounds.length; n++;
      if (f.won && f.rounds.length <= 1) oneBlow++;
    }
  }
  const w = wardenOf(s.realm);
  const top = Math.max(...beasts.map((b) => effectiveBeastPower(s, b)));
  console.log(`  ${label.padEnd(4)} realm ${s.realm}  day ${String(day.toFixed(1)).padStart(5)}  力 ${power(s).toExponential(2)}`
    + `  sure ${String(sure).padStart(2)}/${beasts.length}`
    + `  one blow ${String(Math.round(100 * oneBlow / n)).padStart(3)}%`
    + `  rounds ${(rounds / n).toFixed(1).padStart(4)}`
    + `  warden ${Math.round(100 * odds(s, w))}%`
    + `  you ÷ strongest ×${(power(s) / top).toFixed(1)}  ÷ warden ×${(power(s) / effectiveBeastPower(s, w)).toFixed(1)}`);
};
console.log(`鬥感 ${habit.name}, 20 fights a beast, ${last.toFixed(0)} days walked`);
for (let r = 1; r <= 9; r++) {
  for (const k of ['in', 'out']) {
    const x = snaps.get(`${r}:${k}`);
    if (x) row(k, x.day, x.s);
  }
}
