import { BASE_RATE, LAYERS_PER_REALM, LAYER_BONUS, REALM_COST } from './balance.ts';
import { bonusTaxa, type Estado } from './estado.ts';

/** Quantas camadas foram abertas no total, somando todos os reinos. 0..81. */
export function camadasAbertas(e: Estado): number {
  return (e.reino - 1) * LAYERS_PER_REALM + e.camada;
}

/** Qi por segundo, agora. É a única fonte da taxa; nada mais a calcula. */
export function taxa(e: Estado): number {
  return BASE_RATE * LAYER_BONUS ** camadasAbertas(e) * bonusTaxa(e);
}

export function custoCamada(reino: number): number {
  return REALM_COST[reino - 1] / LAYERS_PER_REALM;
}

/** 0..1 ao longo da camada atual. */
export function progresso(e: Estado): number {
  const c = custoCamada(e.reino);
  return Number.isFinite(c) ? Math.min(1, e.qi / c) : 0;
}

/**
 * O único jeito de o tempo andar.
 *
 * Anda camada a camada em vez de aplicar uma taxa única ao vão inteiro, porque a taxa
 * *muda* toda vez que uma camada abre. Aplicar uma taxa só a uma ausência de vinte horas
 * pagaria a menos, em silêncio — e um idle é jogado fechado, então isto não é detalhe:
 * é a diferença entre o jogo pagar as horas que o jogador não viu ou mentir sobre elas.
 *
 * No teto do reino as camadas param de abrir e o qi passa a acumular no banco, porque
 * é a guardiã que destranca o próximo reino, não o relógio. `auto` ignora esse portão,
 * e existe só para a simulação de balanceamento traçar a curva teórica.
 */
export function avancar(e: Estado, agora: number, auto = false): Estado {
  let dt = agora - e.em;
  if (!Number.isFinite(agora) || dt <= 0) return { ...e, em: Math.max(e.em, agora) };

  let { reino, camada, qi, guardiaCaiu } = e;

  for (let guarda = 0; guarda <= LAYERS_PER_REALM * 9 + 1; guarda++) {
    const r = taxa({ ...e, reino, camada });
    const custo = custoCamada(reino);
    const noTeto = camada >= LAYERS_PER_REALM - 1;

    // No teto sem a guardiã derrubada, o qi vai para o banco e o tempo acaba aqui.
    if (noTeto && !(auto || guardiaCaiu)) {
      const falta = custo - qi;
      const segundos = falta / r;
      if (!Number.isFinite(segundos) || segundos > dt) { qi += r * dt; break; }
      qi = custo + r * (dt - segundos);
      break;
    }

    const falta = custo - qi;
    const segundos = falta / r;
    if (!Number.isFinite(segundos) || segundos > dt) { qi += r * dt; break; }

    qi = 0;
    dt -= segundos;
    if (++camada >= LAYERS_PER_REALM) {
      camada = 0;
      reino += 1;
      guardiaCaiu = false;
    }
  }

  return { ...e, em: agora, reino, camada, qi, guardiaCaiu };
}
