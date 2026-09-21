import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { STEPS } from '../guide.ts';
import { LAYERS_PER_REALM } from '../../sim/balance.ts';
import { UPGRADES, buy, newState, type State } from '../../sim/state.ts';
import { wardenOf } from '../../data/bestiary.ts';

/**
 * 指 An arrow that points at nothing is worse than no arrow.
 *
 * The pointing finger joins two halves that live in different files: 引 the guide names
 * a target, and a screen marks an element `data-coach="…"`. Nothing in the type system
 * connects them, so a rename on either side would quietly leave a step with no ring on
 * it — and it would only ever be noticed by a new player, who is exactly the person the
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
        const at = step.at?.(s);
        if (at) named.add(at);
      }
    }
    expect(named.size).toBeGreaterThan(0);

    const missing = [...named].filter((n) => !real.has(n));
    expect(missing, `no element carries data-coach for: ${missing.join(', ')}`).toEqual([]);
  });

  /**
   * The last step is the only one that moves. It waits on three different buttons over
   * the life of one realm, and a player stuck on any of the three should see a ring.
   */
  it('the last step always points somewhere, wherever the realm is', () => {
    const climb = STEPS[STEPS.length - 1];
    for (const s of states()) {
      expect(climb.at?.(s), `nothing to point at from layer ${s.layer}`).toBeTruthy();
    }
  });

  it('points at the ladder while there are rungs left, and at a button once there are not', () => {
    const [, bought, full, beaten] = states();
    const climb = STEPS[STEPS.length - 1];
    expect(climb.at!(bought)).toBe('ladder');
    expect(climb.at!(full)).toBe('fight-warden');
    expect(climb.at!(beaten)).toBe('breakthrough');
  });
});
