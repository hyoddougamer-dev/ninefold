/**
 * A tabela de balanceamento, e a única. Nenhum número que molda a curva vive fora
 * daqui, e a suíte de testes imprime todos a cada execução — então mudar um nunca é
 * silencioso.
 */

/** Qi por segundo no primeiro reino, sem nenhum multiplicador. */
export const BASE_RATE = 1.0;

/** Nove camadas por reino. Uma camada não é moeda: é uma leitura da barra. */
export const LAYERS_PER_REALM = 9;

/** Cada camada aberta multiplica a taxa. 1.02^81 = 4,97× no fim da escada. */
export const LAYER_BONUS = 1.02;

/**
 * Qi para sair de cada reino. O nono não tem saída — é o teto da v1.
 *
 * Estes números não foram escolhidos no olho. Saem de um calendário-alvo cuja razão
 * entre reinos *encolhe* no topo (1,9 → 1,4). Uma razão constante deixa sempre ~41% da
 * partida no último vão, por maior que seja a curva — e 41% de três meses é um mês
 * inteiro sem nada novo, que foi exatamente como a versão anterior morreu.
 *
 * `curva.test.ts` imprime os dias de chegada e falha se algum vão passar de MAX_VAO.
 */
export const REALM_COST: readonly number[] = [
  100_000,      // 1 → 2
  228_000,      // 2 → 3
  488_000,      // 3 → 4
  993_000,      // 4 → 5
  1_900_000,    // 5 → 6
  3_404_000,    // 6 → 7
  5_899_000,    // 7 → 8
  9_869_000,    // 8 → 9
  Infinity,     // 9, o teto
];

/** Nenhum vão entre reinos pode carregar mais que esta fatia da partida inteira. */
export const MAX_VAO = 0.35;

/** Alvo combinado com o Bruno: três meses até o nono reino, jogando uma vez por dia. */
export const ALVO_DIAS = 90;
export const TOLERANCIA_DIAS = 8;
