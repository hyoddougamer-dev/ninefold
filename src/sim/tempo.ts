import { BASE_RATE, LAYERS_PER_REALM, LAYER_BONUS, REALM_COST } from './balance.ts';

/** O estado inteiro do jogo, como dado puro. */
export interface Estado {
  /** Instante, em segundos de época, em que este estado é verdade. */
  em: number;
  reino: number;   // 1..9
  camada: number;  // 0..8
  qi: number;
  /** Multiplicador acumulado de técnica, método, pílulas e núcleos de fera. */
  bonus: number;
}

export function novo(agora: number): Estado {
  return { em: agora, reino: 1, camada: 0, qi: 0, bonus: 1 };
}

/** Quantas camadas foram abertas no total, somando todos os reinos. 0..81. */
export function camadasAbertas(e: Estado): number {
  return (e.reino - 1) * LAYERS_PER_REALM + e.camada;
}

/** Qi por segundo, agora. É a única fonte da taxa. */
export function taxa(e: Estado): number {
  return BASE_RATE * LAYER_BONUS ** camadasAbertas(e) * e.bonus;
}

export function custoCamada(reino: number): number {
  return REALM_COST[reino - 1] / LAYERS_PER_REALM;
}

/**
 * O único jeito de o tempo andar.
 *
 * Anda camada a camada em vez de aplicar uma taxa única ao vão inteiro, porque a taxa
 * *muda* toda vez que uma camada abre. Aplicar uma taxa só a uma ausência de vinte horas
 * pagaria a menos, em silêncio — e um idle é jogado fechado, então isso não é detalhe.
 */
export function avancar(e: Estado, agora: number): Estado {
  let dt = agora - e.em;
  if (!Number.isFinite(agora) || dt <= 0) return { ...e, em: Math.max(e.em, agora) };

  let { reino, camada, qi } = e;

  // Limitado: existem 81 camadas, e o custo do nono reino é Infinity.
  for (let guarda = 0; guarda <= LAYERS_PER_REALM * 9 + 1; guarda++) {
    const r = taxa({ ...e, reino, camada });
    const falta = custoCamada(reino) - qi;
    const segundos = falta / r;

    if (!Number.isFinite(segundos) || segundos > dt) {
      qi += r * dt;
      break;
    }
    qi = 0;
    dt -= segundos;
    if (++camada >= LAYERS_PER_REALM) {
      camada = 0;
      reino += 1;
    }
  }

  return { ...e, em: agora, reino, camada, qi };
}
