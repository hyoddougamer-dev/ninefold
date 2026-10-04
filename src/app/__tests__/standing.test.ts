import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { LADDER, RANKS, standing } from '../copy.ts';
import { layersOpened, newState, type State } from '../../sim/state.ts';

/**
 * 層 Every place that says where a cultivator stands says the same layer. The climb bar
 * said the layer being worked on (opened + 1); the board, the cloud's question and the
 * panel said the count opened, one behind (the Discord, 2026-10-04).
 */
describe('層 one layer, everywhere', () => {
  const at = (realm: number, layer: number) => ({ ...newState(0), realm, layer }) as State;
  const bar = (s: State) => LADDER.layers(standing(s.layer), 9);

  it('the board and the cloud say what the climb bar says, at the edges of a realm', () => {
    for (const [realm, layer] of [[1, 0], [3, 4], [2, 8], [9, 8], [9, 0]]) {
      const s = at(realm, layer);
      const n = standing(layer);
      expect(bar(s)).toBe(`layer ${n}/9`);
      expect(RANKS.climbCell(layersOpened(s), 0)).toBe(`realm ${realm} · layer ${n}/9`);
      expect(RANKS.where(realm, layer)).toBe(`realm ${realm}, layer ${n}`);
    }
    // A fresh realm is its first layer, and the last before the warden is 9/9, never 0/9.
    expect(RANKS.climbCell(9, 0)).toBe('realm 2 · layer 1/9');
    expect(RANKS.climbCell(8, 0)).toBe('realm 1 · layer 9/9');
    expect(RANKS.climbCell(80, 0)).toBe('realm 9 · layer 9/9');
    expect(RANKS.climbCell(80, 3)).toBe('summit · 雷 3');
  });

  it('the panel counts the same way', () => {
    const html = readFileSync(new URL('../../../public/painel/index.html', import.meta.url), 'utf8');
    expect(html).toContain('camada ${Math.min(9, r.climb % 9 + 1)}/9');
    expect(html).not.toContain('${r.climb % 9}/9');
  });
});
