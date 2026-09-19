import { novo, validar, type Estado } from './estado.ts';
import { avancar } from './tempo.ts';

const CHAVE = 'ninefold.save.v1';

/**
 * O save, e a volta do jogador.
 *
 * Um idle é jogado fechado, então carregar não é só ler: é pagar as horas que passaram
 * enquanto o app não existia. `avancar` faz isso a partir do carimbo gravado, e o
 * relatório devolvido é o que a tela usa para dizer *quanto rendeu enquanto você não
 * estava* — que é a primeira coisa que o jogador quer saber ao abrir.
 */
export interface Volta {
  readonly estado: Estado;
  readonly segundosFora: number;
  readonly qiGanho: number;
  readonly camadasAbertas: number;
  readonly reinosSubidos: number;
}

export function carregar(agora: number): Volta {
  let bruto: unknown = null;
  try {
    const cru = localStorage.getItem(CHAVE);
    bruto = cru ? JSON.parse(cru) : null;
  } catch {
    bruto = null;   // armazenamento bloqueado, aba anônima, JSON corrompido — tudo igual
  }

  const antes = bruto ? validar(bruto, agora) : novo(agora);
  const segundosFora = Math.max(0, agora - antes.em);
  const depois = avancar(antes, agora);

  const camadasDe = (e: Estado) => (e.reino - 1) * 9 + e.camada;

  return {
    estado: depois,
    segundosFora,
    qiGanho: Math.max(0, depois.qi - antes.qi),
    camadasAbertas: Math.max(0, camadasDe(depois) - camadasDe(antes)),
    reinosSubidos: Math.max(0, depois.reino - antes.reino),
  };
}

export function gravar(e: Estado): void {
  try {
    localStorage.setItem(CHAVE, JSON.stringify(e));
  } catch {
    // Sem armazenamento o jogo continua jogável nesta sessão. Não vale travar por isso.
  }
}

export function apagar(): void {
  try {
    localStorage.removeItem(CHAVE);
  } catch { /* idem */ }
}
