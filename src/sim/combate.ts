import { comunsDo, type Besta, guardiaDo } from '../data/bestiario.ts';
import { LAYERS_PER_REALM, REALM_COST } from './balance.ts';
import { MELHORIA_INFO, poder, type Estado } from './estado.ts';

/**
 * 戰 Combate automático, que se assiste.
 *
 * Resolve sozinho em rodadas — a tela desenha as barras caindo — e o jogador não
 * escolhe nada. É o único momento do jogo que não é barra enchendo, e é o que dá
 * motivo para técnica, pílula, método e núcleo existirem.
 *
 * Perder não pune: nada se perde, e você volta quando tiver mais poder. Por isso o
 * resultado pode ser calculado inteiro de uma vez e só depois animado.
 */

/**
 * 基準 O poder de referência no topo de um reino.
 *
 * As bestas não têm uma curva própria: elas são caladas contra *esta*. A referência é o
 * poder de um cultivador que chegou ao topo do reino e pôs uma fatia fixa de todo o qi
 * que já ganhou em 劍訣 técnica — nem o jogador que não gastou nada, nem o que otimizou
 * tudo, mas o do meio.
 *
 * A primeira versão deu às bestas um expoente próprio (1,42 por camada) e elas
 * dispararam à frente de qualquer jogador possível: no reino 4 a guardiã valia vinte
 * vezes um cultivador bem investido. Derivar da curva em vez de inventar um número faz
 * o balanceamento seguir sozinho quando REALM_COST mudar.
 */
export const FATIA_EM_PODER = 0.35;

export function poderReferencia(reino: number): number {
  const r = Math.max(1, Math.min(9, reino));
  let qiTotal = 0;
  for (let i = 0; i < r; i++) {
    const c = REALM_COST[i];
    if (Number.isFinite(c)) qiTotal += c;
  }
  const { base, passo, ganho } = MELHORIA_INFO.tecnica;
  const gasto = qiTotal * FATIA_EM_PODER;
  // Soma geométrica invertida: quantos níveis esse gasto compra.
  const niveis = Math.log1p((gasto * (passo - 1)) / base) / Math.log(passo);
  const escada = (r - 1) * LAYERS_PER_REALM + LAYERS_PER_REALM;
  return escada * ganho ** niveis;
}

/**
 * Fração da referência que cada degrau de um reino ocupa. As três comuns de um reino
 * têm de ser uma fácil, uma média e uma dura — a primeira versão indexava pelo *reino*
 * em vez de pela besta, e as três saíam com o mesmo poder e a mesma chance, o que
 * transforma três bichos distintos em três botões iguais.
 */
const DEGRAUS = [0.45, 0.62, 0.84];

/** Força da besta, sempre como uma fração da referência do reino dela. */
export function poderBesta(b: Besta): number {
  const ref = poderReferencia(b.reino);
  if (b.guardia) return ref * 1.15;          // a guardiã pede um pouco acima do meio
  const i = comunsDo(b.reino).findIndex((x) => x.chave === b.chave);
  return ref * DEGRAUS[Math.max(0, i) % DEGRAUS.length];
}

export interface Rodada {
  readonly vidaJogador: number;   // 0..1
  readonly vidaBesta: number;     // 0..1
  readonly danoJogador: number;
  readonly danoBesta: number;
}

export interface Resultado {
  readonly venceu: boolean;
  readonly rodadas: readonly Rodada[];
  readonly poderJogador: number;
  readonly poderBesta: number;
}

/** Ruído determinístico: o mesmo combate no mesmo instante dá o mesmo resultado. */
function dados(semente: number): () => number {
  let a = semente >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function lutar(e: Estado, b: Besta, semente: number): Resultado {
  const pj = poder(e);
  const pb = poderBesta(b);
  let vj = pj * 10;
  let vb = pb * 10;
  const vj0 = vj;
  const vb0 = vb;

  const d = dados(semente);
  const rodadas: Rodada[] = [];

  // Teto de rodadas para o empate teórico não travar nada: quem estiver melhor ganha.
  for (let i = 0; i < 24 && vj > 0 && vb > 0; i++) {
    const dj = pj * (0.82 + d() * 0.46);
    const db = pb * (0.82 + d() * 0.46);
    vb -= dj;
    vj -= db;
    rodadas.push({
      vidaJogador: Math.max(0, vj / vj0),
      vidaBesta: Math.max(0, vb / vb0),
      danoJogador: dj,
      danoBesta: db,
    });
  }

  return { venceu: vb <= 0 || vj / vj0 > vb / vb0, rodadas, poderJogador: pj, poderBesta: pb };
}

/** Quanto material uma besta comum larga. */
export function espolio(b: Besta): number {
  return Math.max(1, Math.round(b.reino * 1.6 + (b.reino - 1) ** 1.5));
}

/** Uma leitura honesta da chance, para a tela poder avisar antes de entrar. */
export function chance(e: Estado, b: Besta): number {
  const r = poder(e) / poderBesta(b);
  return Math.max(0.02, Math.min(0.98, 1 / (1 + Math.exp(-(r - 1) * 4))));
}

export function guardiaAtual(e: Estado): Besta {
  return guardiaDo(e.reino);
}
