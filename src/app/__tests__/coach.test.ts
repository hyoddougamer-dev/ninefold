import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { STEPS, guide } from '../guide.ts';
import { LAYERS_PER_REALM } from '../../sim/balance.ts';
import { UPGRADES, buy, newState, type State } from '../../sim/state.ts';
import { wardenOf } from '../../data/bestiary.ts';

/**
 * 指 An arrow that points at nothing is worse than no arrow.
 *
 * The pointing finger joins two halves that live in different files: 引 the guide names
 * a target, and a screen marks an element `data-coach="…"`. Nothing in the type system
 * connects them, so a rename on either side would quietly leave a step with no ring on
 * it, and it would only ever be noticed by a new player, who is exactly the person the
 * guide exists for and the last person who will report it.
 *
 * So this reads the marks straight out of the source and checks that every name the
 * guide can ever emit is one of them. It is a grep with an opinion, and it costs a
 * millisecond.
 */

const SRC = new URL('../../', import.meta.url).pathname;

function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return name === '__tests__' ? [] : sources(path);
    return /\.tsx?$/.test(name) ? [path] : [];
  });
}

/**
 * Every name any `data-coach` in the app can take.
 *
 * The attribute is written three ways and all three have to be read: a plain string, a
 * ternary that marks one row of a list and leaves the rest bare, and one template that
 * is built from the upgrade key. So it takes the attribute and the expression after it,
 * pulls every quoted word out of that, and expands the one template by hand.
 */
function marked(): Set<string> {
  const found = new Set<string>();
  for (const path of sources(SRC)) {
    const text = readFileSync(path, 'utf8');
    for (const m of text.matchAll(/data-coach=("[^"]*"|\{[^}]*\})/g)) {
      const expr = m[1]!;
      if (/`upg-\$\{u/.test(expr)) {
        for (const u of UPGRADES) found.add(`upg-${u}`);
        continue;
      }
      for (const q of expr.matchAll(/['"`]([A-Za-z][\w-]*)['"`]/g)) found.add(q[1]!);
    }
  }
  return found;
}

const T0 = 1_700_000_000;

/** The four places along the first realm where the last step points somewhere new. */
function states(): State[] {
  const fresh = newState(T0);
  const bought = buy({ ...fresh, qi: 1e6 }, 'technique');
  const full: State = { ...bought, layer: LAYERS_PER_REALM - 1, qi: 1e12 };
  const beaten: State = { ...full, wardenFell: true, killed: { [wardenOf(1).key]: 1 } };
  return [fresh, bought, full, beaten];
}

describe('指 the pointing finger', () => {
  it('every target a step can name is marked on a real element', () => {
    const real = marked();
    expect(real.size).toBeGreaterThan(0);

    const named = new Set<string>();
    for (const step of STEPS) {
      for (const s of states()) {
        for (const at of [step.at?.(s), step.waiting?.at?.(s)]) if (at) named.add(at);
      }
    }
    expect(named.size).toBeGreaterThan(0);

    const missing = [...named].filter((n) => !real.has(n));
    expect(missing, `no element carries data-coach for: ${missing.join(', ')}`).toEqual([]);
  });

  /**
   * 時 The point of the whole readiness idea, as an assertion.
   *
   * Bruno's report was that the card got stuck asking for something impossible. So:
   * wherever a cultivator stands in the first realm, the guide either asks for
   * something that can be done, or says it is waiting and hands over something else.
   * It is never a ring on a thing that cannot be pressed.
   */
  it('never asks for a step the player cannot do yet', () => {
    for (const s of states()) {
      const g = guide(s);
      if (!g) continue;
      if (!g.ready) {
        expect(g.step.waiting, `step ${g.step.key} waits with nothing to say`).toBeTruthy();
        expect(g.text).toBe(g.step.waiting!.text);
      }
      // Whatever it points at, it is a real mark on a real element.
      if (g.at) expect(marked().has(g.at)).toBe(true);
    }
  });

  it('points at the warden only once the warden is standing there', () => {
    const [, bought, full, beaten] = states();
    // Mid-realm the last step is not even the current one, and when it is reached by
    // the ceiling rule it waits rather than pointing at a fight that does not exist.
    const climb = STEPS[STEPS.length - 1];
    expect(climb.ready!(bought)).toBe(false);
    expect(climb.ready!(full)).toBe(true);
    expect(climb.at!(full)).toBe('fight-warden');
    expect(climb.at!(beaten)).toBe('breakthrough');
    // While it waits it offers a box to buy instead, never the absent warden.
    expect(climb.waiting!.at!(bought)).not.toBe('fight-warden');
  });

  it('goes away when put away, and comes back when the key is removed', () => {
    const s = states()[0];
    expect(guide(s)).not.toBeNull();
    const shut = { ...s, seen: [...s.seen, 'guide'] };
    expect(guide(shut)).toBeNull();
    expect(guide({ ...shut, seen: shut.seen.filter((k) => k !== 'guide') })).not.toBeNull();
  });
});
