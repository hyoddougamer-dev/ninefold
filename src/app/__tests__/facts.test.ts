import { describe, expect, it } from 'vitest';
import {
  AWAKEN, DRIVE, GUIDE, HELP, KEY, LADDER, NOTICE, TRIALS,
} from '../copy.ts';
import {
  FOCUS_HOLD, FOCUS_MAX, LAYERS_PER_REALM, MARK_DAYS, OPENING_PURSE,
} from '../../sim/balance.ts';
import { UPGRADES, UPGRADE_INFO, newState, upgradeCost } from '../../sim/state.ts';
import { MARKS } from '../../sim/record.ts';
import { LAYERS_PER_POINT, POINTS_PER_WARDEN } from '../../sim/dao.ts';
import { FLOORS_PER_REALM } from '../../sim/tower.ts';
import { MEET_GAP } from '../../sim/meet.ts';
import { AWAKENINGS, HEAVEN_CARDS } from '../../data/awakening.ts';
import { commonsOf } from '../../data/bestiary.ts';
import { lootFrom } from '../../sim/combat.ts';
import { lootTaken } from '../../sim/trials.ts';

/**
 * 實 The numbers the prose says out loud.
 *
 * A sentence in copy.ts that names a number is a copy of a balance constant that nothing
 * will ever come back and correct. The audit that read every screen as a new player found
 * one that had gone wrong already ("Seven rooms", with eleven on the door) and a dozen that
 * were still right by luck. Each of these holds a line to the number it states, so the
 * day the number moves, the line fails here rather than on somebody's phone.
 */
describe('實 what the copy says is what the game does', () => {
  it('the first minute: the purse, the first core and what it costs', () => {
    expect(GUIDE.buy.text).toContain(`${OPENING_PURSE} qi`);
    const core = UPGRADE_INFO.cores;
    expect(GUIDE.core.text).toContain(`+${Math.round((core.gain - 1) * 100)}% power`);
    const s = newState(0);
    const first = upgradeCost(s, 'cores');
    expect(GUIDE.core.waiting).toContain(`costs ${first} 材`);
    // "Three rats pay for the first one."
    const rat = commonsOf(1).find((b) => b.key === 'rat')!;
    expect(Math.ceil(first / lootTaken(s, lootFrom(s, rat)))).toBe(3);
    expect(GUIDE.core.waiting).toContain('Three rats');
  });

  it('every upgrade says the percentage it pays', () => {
    for (const u of UPGRADES) {
      const i = UPGRADE_INFO[u];
      expect(i.effect).toContain(`+${Math.round((i.gain - 1) * 100)}%`);
    }
  });

  it('the marks: ten for 熟 and a hundred for 通', () => {
    expect(MARKS[1]).toBe(10);
    expect(MARKS[2]).toBe(100);
    expect(GUIDE.mark.title).toContain('ten times');
    expect(GUIDE.mark.text).toContain('Ten kills');
    expect(NOTICE.record.text).toContain('Ten kills');
    expect(NOTICE.record.text).toContain('a hundred is 通');
    expect(DRIVE.what).toContain('ten times');
  });

  it('入定 the sitting: three times, a quarter of an hour', () => {
    expect(FOCUS_MAX).toBe(3);
    expect(FOCUS_HOLD).toBe(15 * 60);
    expect(HELP.steps[1][1]).toContain('three times');
    expect(HELP.steps[1][1]).toContain('quarter of an hour');
    expect(KEY.sitting).toContain('three times');
    expect(KEY.sitting).toContain('quarter of an hour');
  });

  it('the ladder: nine layers, and the warden at the ninth', () => {
    expect(LAYERS_PER_REALM).toBe(9);
    expect(LADDER.rule('練氣', 'Qi Refining')).toContain('layer 9');
    expect(GUIDE.climb.waiting).toContain('Eight layers');
  });

  it('道 points: one for every three layers, two for every warden', () => {
    expect(LAYERS_PER_POINT).toBe(3);
    expect(POINTS_PER_WARDEN).toBe(2);
    expect(KEY.dao).toContain('One for every three layers');
    expect(KEY.dao).toContain('two for every warden');
  });

  it('塔 a seal for every nine floors', () => {
    expect(FLOORS_PER_REALM).toBe(9);
    expect(TRIALS.sealWorth('15%')).toContain('Every nine floors');
  });

  it('雷池 the pool holds two days', () => {
    expect(MARK_DAYS).toBe(2);
    expect(NOTICE.pool.text).toContain('two days');
  });

  it('悟道 seventeen choices across a climb', () => {
    expect(AWAKENINGS.length + HEAVEN_CARDS.length).toBe(17);
    expect(AWAKEN.what).toContain('Seventeen choices');
  });

  it('緣 somebody on the road every few hours', () => {
    expect(KEY.meeting).toContain('every few hours');
    expect(MEET_GAP).toBeGreaterThanOrEqual(2 * 3600);
    expect(MEET_GAP).toBeLessThanOrEqual(6 * 3600);
  });
});
