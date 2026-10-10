import { describe, expect, it } from 'vitest';
import { newState, type State } from '../state.ts';
import { validate } from '../load.ts';
import { forkTwin, forkWait, swapFork, swapStatus } from '../fork.ts';
import { verify } from '../verify.ts';
import { FORK_SWAP_GAP } from '../balance.ts';

const T = 1_800_000_000;
/** A cultivator holding the spirit branch to its fork, on Spirit Travel. */
function holder(over: Partial<State> = {}): State {
  const s = newState(T);
  return { ...s, realm: 6, layer: 2, unlocked: ['root', 'breathing', 'clearmind', 'circulation', 'focus', 'inner', 'travel'], ...over };
}

describe('岔 a fork of the Path swaps for its twin once a day', () => {
  it('knows every fork and its twin, both ways', () => {
    expect(forkTwin('travel')?.key).toBe('forget');
    expect(forkTwin('forget')?.key).toBe('travel');
    expect(forkTwin('forsake')?.key).toBe('heavyplate');
    expect(forkTwin('emptypouch')?.key).toBe('favour');
    expect(forkTwin('breathing')).toBeNull();
  });

  it('swaps in place, keeps the points, and waits a day for the next', () => {
    const s = holder();
    expect(swapStatus(s, 'travel', T, true)).toBe('ok');
    const a = swapFork(s, 'travel', T, true);
    expect(a.unlocked).toContain('forget');
    expect(a.unlocked).not.toContain('travel');
    expect(a.unlocked.length).toBe(s.unlocked.length);
    expect(swapStatus(a, 'forget', T + 60, true)).toBe('wait');
    expect(forkWait(a, T + 60)).toBe(FORK_SWAP_GAP - 60);
    expect(swapFork(a, 'forget', T + 60, true)).toBe(a);
    const b = swapFork(a, 'forget', T + FORK_SWAP_GAP, true);
    expect(b.unlocked).toContain('travel');
  });

  it('never into a keystone before the keystones open, never a node that is not a held fork', () => {
    const s = holder();
    expect(swapStatus(s, 'travel', T, false)).toBe('shut');
    expect(swapStatus(s, 'breathing', T, true)).toBe('no');
    expect(swapStatus(s, 'forget', T, true)).toBe('no');
  });

  it('the swapped tree survives validate, and the swap time cannot be in the future', () => {
    const a = swapFork(holder(), 'travel', T, true);
    const back = validate(JSON.parse(JSON.stringify(a)), T + 10);
    expect(back.unlocked).toContain('forget');
    expect(back.forkAt).toBe(T);
    expect(validate({ ...JSON.parse(JSON.stringify(a)), forkAt: T + 99_999 }, T + 10).forkAt).toBe(T + 10);
  });

  it('the server prices layers on the cheaper side of a fork held at either end', () => {
    // Forget the Mechanism makes layers cheaper; a save back on Spirit Travel may have
    // opened them on Forget the day before, so the server must not read it as too fast.
    const before = holder({ qi: 0 });
    const after = { ...before, layer: 6, at: before.at + 3600 };
    const onTravel = verify(before, after, 3600);
    const onForget = verify(before, { ...after, unlocked: after.unlocked.map((k) => (k === 'travel' ? 'forget' : k)) }, 3600);
    expect(onTravel.pace).toBeCloseTo(onForget.pace, 6);
  });
});
