import { describe, expect, it } from 'vitest';
import { HABITS, play } from '../../../tools/habits.ts';
import { validate } from '../load.ts';
import { codexRank, hundredFits } from '../hundred.ts';
import { verify } from '../verify.ts';

/**
 * 百煉 The set-chaser, played for a whole climb: the harness's crafter forging the Hundredfold
 * sets as the forge allows (tools/crafter.ts hundredPlan), written out and read back every
 * week, and offered to the server. tools/hundredfold.ts plays the six months after it.
 */
describe('百煉 a crafter who chases the sets, for a whole climb', () => {
  const base = HABITS.find((h) => h.name === 'crafts it all')!;
  const clipped: string[] = [];
  const refused: string[] = [];
  let weeks = 0;
  let last = -7;
  let prev: { day: number; s: ReturnType<typeof validate> } | null = null;
  const run = play({ ...base, name: 'sets, forge first', hundred: 'forge' }, 400, (day, s) => {
    if (day - last < 7) return;
    last = day;
    weeks++;
    const back = validate(JSON.parse(JSON.stringify(s)), s.at);
    if (JSON.stringify(back.crafts) !== JSON.stringify(s.crafts)
      || JSON.stringify(back.chest.filter((x) => x.hundred)) !== JSON.stringify(s.chest.filter((x) => x.hundred))
      || ['weapon', 'robe', 'crown', 'boots', 'talisman', 'ring'].some((k) =>
        JSON.stringify(back.worn[k as keyof typeof s.worn]) !== JSON.stringify(s.worn[k as keyof typeof s.worn]))) clipped.push(`day ${day.toFixed(1)}`);
    if (!hundredFits(s)) refused.push(`day ${day.toFixed(1)}: hundredFits`);
    if (prev) {
      const v = verify(prev.s, back, (day - prev.day) * 86_400);
      if (v.why.includes('gear')) refused.push(`day ${day.toFixed(1)}: ${v.why.join(',')}`);
    }
    prev = { day, s: back };
  });

  it('is never clipped by validate() and never refused by the server', () => {
    expect(weeks).toBeGreaterThanOrEqual(5);
    expect(clipped).toEqual([]);
    expect(refused).toEqual([]);
  });

  it('finishes its first sets on the way up, and reaches the ninth realm within two and a half days of the crafter without them', () => {
    const without = play(base);
    const sets = [1, 2, 3, 4, 5, 6, 7, 8, 9].map((r) => codexRank(run.state.crafts.made, r));
    console.log(`    sets, forge first  realm 9 day ${run.arrival[8].toFixed(1)} (without ${without.arrival[8].toFixed(1)})  codex ${sets.join(' ')}`);
    expect(sets.filter((x) => x > 0).length).toBeGreaterThanOrEqual(3);
    expect(Math.abs(run.arrival[8] - without.arrival[8])).toBeLessThanOrEqual(2.5);
  }, 120_000);
});
