import { ICONES } from './icones.gerados.ts';

/**
 * Um ícone do acervo, pronto para o CSS colorir.
 *
 * Cada ícone chega como silhueta branca sobre quadrado preto; o quadrado já saiu na
 * geração, e o `fill="currentColor"` aqui é o que deixa o mesmo arquivo servir a
 * qualquer paleta. É por isso que nove reinos não custaram nove desenhos.
 */
export function icone(nome: string, tamanho = 24): string {
  const corpo = ICONES[nome];
  if (!corpo) return '';
  return `<svg viewBox="0 0 512 512" width="${tamanho}" height="${tamanho}" fill="currentColor" aria-hidden="true">${corpo}</svg>`;
}

export function temIcone(nome: string): boolean {
  return nome in ICONES;
}
