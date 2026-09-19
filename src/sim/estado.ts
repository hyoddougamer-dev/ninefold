import { LAYERS_PER_REALM, REALM_COST } from './balance.ts';
import { BESTAS } from '../data/bestiario.ts';

/** As quatro coisas em que o qi é gasto. Todas multiplicam, nenhuma se perde. */
export type Melhoria = 'tecnica' | 'metodo' | 'pilulas' | 'nucleos';

export const MELHORIAS: readonly Melhoria[] = ['tecnica', 'metodo', 'pilulas', 'nucleos'];

export const MELHORIA_INFO: Record<Melhoria, {
  han: string; nome: string; icone: string; efeito: string;
  base: number; passo: number; ganho: number; alvo: 'taxa' | 'poder';
  moeda: 'qi' | 'material';
}> = {
  tecnica: { han: '劍訣', nome: 'Técnica de espada', icone: 'katana',
    efeito: '+18% de poder', base: 60, passo: 1.16, ganho: 1.18, alvo: 'poder', moeda: 'qi' },
  metodo: { han: '功法', nome: 'Método', icone: 'scroll-unfurled',
    efeito: '+15% de qi por segundo', base: 100, passo: 1.19, ganho: 1.15, alvo: 'taxa', moeda: 'qi' },
  pilulas: { han: '丹藥', nome: 'Pílulas', icone: 'fire-gem',
    efeito: '+10% de qi por segundo', base: 45, passo: 1.14, ganho: 1.10, alvo: 'taxa', moeda: 'qi' },
  nucleos: { han: '妖丹', nome: 'Núcleos de fera', icone: 'crystal-cluster',
    efeito: '+12% de poder', base: 3, passo: 1.22, ganho: 1.12, alvo: 'poder', moeda: 'material' },
};

export interface Estado {
  readonly v: 1;
  /** Instante, em segundos de época, em que este estado é verdade. */
  em: number;
  iniciado: number;
  reino: number;   // 1..9
  camada: number;  // 0..8 camadas abertas no reino atual
  qi: number;
  materiais: number;
  /** A guardiã do reino atual já caiu? Enquanto não, não há rompimento. */
  guardiaCaiu: boolean;
  niveis: Record<Melhoria, number>;
  abatidas: Record<string, number>;
}

export function novo(agora: number): Estado {
  return {
    v: 1, em: agora, iniciado: agora,
    reino: 1, camada: 0, qi: 0, materiais: 0, guardiaCaiu: false,
    niveis: { tecnica: 0, metodo: 0, pilulas: 0, nucleos: 0 },
    abatidas: {},
  };
}

export function custoMelhoria(e: Estado, m: Melhoria): number {
  const i = MELHORIA_INFO[m];
  return Math.ceil(i.base * i.passo ** e.niveis[m]);
}

export function podeComprar(e: Estado, m: Melhoria): boolean {
  const i = MELHORIA_INFO[m];
  const custo = custoMelhoria(e, m);
  return i.moeda === 'qi' ? e.qi >= custo : e.materiais >= custo;
}

export function comprar(e: Estado, m: Melhoria): Estado {
  if (!podeComprar(e, m)) return e;
  const i = MELHORIA_INFO[m];
  const custo = custoMelhoria(e, m);
  return {
    ...e,
    qi: i.moeda === 'qi' ? e.qi - custo : e.qi,
    materiais: i.moeda === 'material' ? e.materiais - custo : e.materiais,
    niveis: { ...e.niveis, [m]: e.niveis[m] + 1 },
  };
}

/** Multiplicador da taxa de qi vindo das melhorias. */
export function bonusTaxa(e: Estado): number {
  return MELHORIA_INFO.metodo.ganho ** e.niveis.metodo
    * MELHORIA_INFO.pilulas.ganho ** e.niveis.pilulas;
}

/** 力 Poder de combate. É o que decide as bestas, e só as melhorias e a escada o movem. */
export function poder(e: Estado): number {
  const escada = (e.reino - 1) * LAYERS_PER_REALM + e.camada + 1;
  return escada * MELHORIA_INFO.tecnica.ganho ** e.niveis.tecnica
    * MELHORIA_INFO.nucleos.ganho ** e.niveis.nucleos;
}

/** O reino está cheio e só falta a guardiã? */
export function noTeto(e: Estado): boolean {
  return e.camada >= LAYERS_PER_REALM - 1
    && e.qi >= REALM_COST[e.reino - 1] / LAYERS_PER_REALM
    && Number.isFinite(REALM_COST[e.reino - 1]);
}

export function podeRomper(e: Estado): boolean {
  return noTeto(e) && e.guardiaCaiu && e.reino < 9;
}

export function romper(e: Estado): Estado {
  if (!podeRomper(e)) return e;
  return { ...e, reino: e.reino + 1, camada: 0, qi: 0, guardiaCaiu: false };
}

/**
 * Um save é entrada, e é validado como qualquer outra.
 *
 * A versão anterior embarcou sem isto e tinha um buraco onde um item editado à mão
 * multiplicava a taxa por 196.502× e passava em todas as verificações. O teto de qi
 * abaixo é o que fecha esse buraco: nada pode ter mais qi do que o cultivador mais
 * rápido concebível juntaria no tempo de relógio desde que a partida começou.
 */
export function validar(bruto: unknown, agora: number): Estado {
  const o = (bruto ?? {}) as Record<string, unknown>;
  if (o.v !== 1) return novo(agora);

  const num = (x: unknown, p: number) =>
    typeof x === 'number' && Number.isFinite(x) ? x : p;
  const preso = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));

  const iniciado = preso(num(o.iniciado, agora), 0, agora);
  const reino = preso(Math.floor(num(o.reino, 1)), 1, 9);
  const camada = preso(Math.floor(num(o.camada, 0)), 0, LAYERS_PER_REALM - 1);

  const nb = (o.niveis ?? {}) as Record<string, unknown>;
  const niveis = Object.fromEntries(
    MELHORIAS.map((m) => [m, preso(Math.floor(num(nb[m], 0)), 0, 999)]),
  ) as Record<Melhoria, number>;

  const ab = (o.abatidas ?? {}) as Record<string, unknown>;
  const abatidas: Record<string, number> = {};
  for (const [k, v] of Object.entries(ab)) {
    if (!BESTAS.some((x) => x.chave === k)) continue;   // besta que não existe não é abate
    const n = Math.floor(num(v, 0));
    if (n > 0) abatidas[k] = n;
  }

  // O teto: a escada inteira, todas as melhorias plausíveis, pelo tempo decorrido.
  const decorrido = Math.max(0, agora - iniciado);
  const tetoQi = 1.02 ** 81 * 1.15 ** 200 * 1.10 ** 200 * decorrido + 1e6;

  return {
    v: 1,
    iniciado,
    em: preso(num(o.em, agora), iniciado, agora),
    reino,
    camada,
    qi: preso(num(o.qi, 0), 0, tetoQi),
    materiais: preso(num(o.materiais, 0), 0, 1e12),
    guardiaCaiu: o.guardiaCaiu === true,
    niveis,
    abatidas,
  };
}
