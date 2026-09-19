import { describe, expect, it } from 'vitest';
import { ALVO_DIAS, MAX_VAO, REALM_COST, TOLERANCIA_DIAS } from '../balance.ts';
import { avancar } from '../tempo.ts';
import { novo } from '../estado.ts';

/**
 * A curva é a decisão mais irreversível do jogo, e é onde a versão anterior quebrou:
 * reinos 1 a 6 em seis dias, e vinte e seis dias no último vão sem nada dentro.
 *
 * Estes testes são a trava. Nenhuma mudança em REALM_COST pode trazer aquela forma de
 * volta sem falhar aqui, e o calendário é impresso a cada execução.
 */
describe('a subida, jogando uma vez por dia', () => {
  const T0 = 1_700_000_000;
  const PASSO = 3600;
  const DIA = 86_400;

  function subir() {
    let e = novo(T0);
    const chegada: number[] = [0];
    let t = T0;
    for (let i = 0; i < 24 * 500 && e.reino < 9; i++) {
      t += PASSO;
      e = avancar(e, t, true);   // curva teórica: a guardiã cai na hora
      while (chegada.length < e.reino) chegada.push((t - T0) / DIA);
    }
    return { chegada, estado: e };
  }

  it('imprime o calendário e mantém todo vão abaixo do teto', () => {
    const { chegada, estado } = subir();
    expect(estado.reino).toBe(9);

    const total = chegada[chegada.length - 1];
    const vaos = chegada.slice(1).map((d, i) => d - chegada[i]);
    const NOMES = ['練氣', '築基', '金丹', '元嬰', '化神', '煉虛', '合體', '大乘', '渡劫'];

    const linhas = chegada.map((d, i) =>
      `  ${NOMES[i]}  reino ${i + 1}  dia ${d.toFixed(1).padStart(6)}` +
      (i > 0 ? `   (+${vaos[i - 1].toFixed(1)}d · ${(100 * vaos[i - 1] / total).toFixed(0)}%)` : ''));
    console.log(`\n  uma vez por dia, sem multiplicadores — ${total.toFixed(1)} dias até o nono reino\n${linhas.join('\n')}\n`);

    const pior = Math.max(...vaos);
    console.log(`  maior vão: ${pior.toFixed(1)}d = ${(100 * pior / total).toFixed(1)}% da partida (teto ${(100 * MAX_VAO).toFixed(0)}%)`);
    console.log(`  no último reino, uma camada abre a cada ${(vaos[7] / 9).toFixed(1)} dias\n`);

    expect(pior / total).toBeLessThanOrEqual(MAX_VAO);
    expect(Math.abs(total - ALVO_DIAS)).toBeLessThanOrEqual(TOLERANCIA_DIAS);
  });

  it('nunca para de ficar mais lento, para a montanha sempre parecer mais alta', () => {
    const custos = REALM_COST.slice(0, 8);
    for (let i = 1; i < custos.length; i++) expect(custos[i]).toBeGreaterThan(custos[i - 1]);
  });

  it('o nono reino não tem saída', () => {
    expect(REALM_COST[8]).toBe(Infinity);
    const { estado } = subir();
    const depois = avancar(estado, estado.em + 365 * 86_400, true);
    expect(depois.reino).toBe(9);
    expect(depois.qi).toBeGreaterThan(estado.qi);
  });

  it('uma ausência longa paga exatamente o que muitas curtas pagam', () => {
    const vao = 30 * 86_400;
    const umaVez = avancar(novo(T0), T0 + vao, true);
    let muitas = novo(T0);
    for (let t = T0 + 60; t <= T0 + vao; t += 60) muitas = avancar(muitas, t, true);
    expect(muitas.reino).toBe(umaVez.reino);
    expect(muitas.camada).toBe(umaVez.camada);
    expect(muitas.qi).toBeCloseTo(umaVez.qi, 3);
    console.log(`  30 dias: um passo e 43.200 passos dão reino ${umaVez.reino}, camada ${umaVez.camada}, ` +
      `qi ${umaVez.qi.toFixed(2)} vs ${muitas.qi.toFixed(2)}\n`);
  });
});
