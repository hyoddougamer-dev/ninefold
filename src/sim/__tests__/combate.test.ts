import { describe, expect, it } from 'vitest';
import { BESTAS, comunsDo, guardiaDo } from '../../data/bestiario.ts';
import { chance, lutar, poderBesta, poderReferencia } from '../combate.ts';
import { comprar, novo, podeComprar, poder, type Estado } from '../estado.ts';
import { LAYERS_PER_REALM, REALM_COST } from '../balance.ts';
import { avancar } from '../tempo.ts';

const T0 = 1_700_000_000;

/**
 * Um cultivador no *topo* do reino pedido — todas as nove camadas abertas — sem ter
 * gastado nada em melhorias. O topo importa: é contra ele que poderReferencia mede, e
 * medir a base de um reino contra a referência do topo perde quase meia escada.
 */
function cru(reino: number): Estado {
  let e = novo(T0);
  let t = T0;
  // O nono reino não tem saída: suas camadas nunca abrem, então o topo dele é a chegada.
  // Esperar pela nona camada do nono reino é esperar para sempre.
  const alvo = reino === 9 ? 0 : LAYERS_PER_REALM - 1;
  for (let i = 0; i < 24 * 600; i++) {
    if (e.reino === reino && e.camada >= alvo) return e;
    t += 3600;
    e = avancar(e, t, true);
  }
  throw new Error(`não chegou ao reino ${reino}`);
}

/** O jogador do meio: chegou ao reino e pôs uma fatia do qi ganho em poder. */
function investido(reino: number, fatia = 0.35): Estado {
  let e = { ...cru(reino), qi: 0 };
  let banco = 0;
  for (let i = 0; i < reino; i++) {
    const c = REALM_COST[i];
    if (Number.isFinite(c)) banco += c;
  }
  e = { ...e, qi: banco * fatia };
  while (podeComprar(e, 'tecnica')) e = comprar(e, 'tecnica');
  return e;
}

describe('戰 as bestas', () => {
  it('imprime a tabela de poder e mantém a escada subindo', () => {
    const linhas = [1, 2, 3, 4, 5, 6, 7, 8, 9].map((r) => {
      const e = cru(r);
      const g = guardiaDo(r);
      const comuns = comunsDo(r);
      return `  reino ${r}  cultivador ${poder(e).toFixed(0).padStart(7)}` +
        `   comum ${poderBesta(comuns[0]).toFixed(0).padStart(7)}` +
        `   ${g.han} guardiã ${poderBesta(g).toFixed(0).padStart(8)}` +
        `   chance ${(100 * chance(e, g)).toFixed(0)}%`;
    });
    console.log(`\n${linhas.join('\n')}\n`);

    for (let r = 2; r <= 9; r++) {
      expect(poderBesta(guardiaDo(r))).toBeGreaterThan(poderBesta(guardiaDo(r - 1)));
    }
  });

  it('quem não gasta nada não passa da guardiã; quem gasta, passa', () => {
    for (const r of [2, 4, 6, 8]) {
      const g = guardiaDo(r);
      expect(chance(cru(r), g)).toBeLessThan(0.15);
    }

    const linhas = [2, 4, 6, 8, 9].map((r) => {
      const g = guardiaDo(r);
      const meio = investido(r);
      const farto = investido(r, 0.55);
      return `  reino ${r}  ${g.han} guardiã — sem gastar ${(100 * chance(cru(r), g)).toFixed(0)}%` +
        `   gastando 35% ${(100 * chance(meio, g)).toFixed(0)}%` +
        `   gastando 55% ${(100 * chance(farto, g)).toFixed(0)}%`;
    });
    console.log(`\n${linhas.join('\n')}\n`);

    // O jogador do meio tem de ter chance real, e o que investe mais tem de passar.
    for (const r of [2, 4, 6, 8]) {
      const g = guardiaDo(r);
      expect(chance(investido(r), g)).toBeGreaterThan(0.2);
      expect(chance(investido(r, 0.55), g)).toBeGreaterThan(0.55);
    }
  });

  it('as bestas comuns do reino são caça, não parede — e são três degraus, não três botões iguais', () => {
    for (const r of [1, 3, 5, 7, 9]) {
      const e = investido(r);
      const chances = comunsDo(r).map((c) => chance(e, c));
      for (const c of chances) expect(c).toBeGreaterThan(0.45);
      // A mais dura tem de ser sensivelmente mais dura que a mais fácil.
      expect(Math.max(...chances) - Math.min(...chances)).toBeGreaterThan(0.1);
    }
    const e = investido(5);
    console.log(`\n  reino 5, as três comuns: ${comunsDo(5).map((c) =>
      `${c.han} ${(100 * chance(e, c)).toFixed(0)}%`).join(' · ')}\n`);
  });

  it('a referência cresce a cada reino, e as bestas junto', () => {
    for (let r = 2; r <= 9; r++) {
      expect(poderReferencia(r)).toBeGreaterThan(poderReferencia(r - 1));
    }
  });

  it('o combate resolve, é determinístico, e nunca trava', () => {
    const e = cru(3);
    const b = comunsDo(3)[0];
    const a = lutar(e, b, 42);
    const c = lutar(e, b, 42);
    expect(a.rodadas.length).toBeGreaterThan(0);
    expect(a.rodadas.length).toBeLessThanOrEqual(24);
    expect(a.venceu).toBe(c.venceu);
    expect(a.rodadas.length).toBe(c.rodadas.length);
  });

  it('toda besta tem ícone, chave única e reino válido', () => {
    const chaves = new Set(BESTAS.map((b) => b.chave));
    expect(chaves.size).toBe(BESTAS.length);
    expect(BESTAS.length).toBe(36);
    for (const b of BESTAS) {
      expect(b.reino).toBeGreaterThanOrEqual(1);
      expect(b.reino).toBeLessThanOrEqual(9);
      expect(b.icone.length).toBeGreaterThan(0);
    }
    for (let r = 1; r <= 9; r++) expect(comunsDo(r).length).toBe(3);
  });
});
