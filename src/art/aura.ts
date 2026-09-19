import { ICONES } from './icones.gerados.ts';
import { reino as reinoDe } from '../data/reinos.ts';

/**
 * 氣象 O retrato do cultivador.
 *
 * Uma figura só, a mesma em todos os reinos — o que muda é o ar à volta. As auras são
 * empilhadas: ícone grande e fraco atrás, menores e mais fortes à frente, com a cor do
 * reino e um brilho que cresce.
 *
 * Duas regras que a primeira tentativa quebrou e que agora são lei:
 *
 *   1. O halo é desenhado, não é ícone. Como ícone lia como engrenagem atrás da cabeça.
 *   2. A figura queima para o branco conforme sobe. Sem isso a aura engolia o cultivador
 *      a partir do sétimo reino, que inverte o sentido inteiro da imagem — a figura tem
 *      de continuar sendo a coisa mais nítida por mais barulhenta que a aura fique.
 */

function misturar(a: string, b: string, k: number): string {
  const t = Math.max(0, Math.min(1, k));
  const v = (s: string, i: number) => parseInt(s.slice(1 + i, 3 + i), 16);
  const c = (i: number) => Math.round(v(a, i) * (1 - t) + v(b, i) * t);
  return `#${[0, 2, 4].map((i) => c(i).toString(16).padStart(2, '0')).join('')}`;
}

export interface OpcoesRetrato {
  readonly reino: number;
  /** 0..1 — pulso de respiração, para a figura não ficar parada. */
  readonly pulso?: number;
  /** Escurece tudo menos a figura, para o combate. */
  readonly foco?: boolean;
}

export function retrato({ reino, pulso = 0, foco = false }: OpcoesRetrato): string {
  const r = reinoDe(reino);
  const t = (r.n - 1) / 8;
  const S = 200;
  const uid = `r${r.n}`;
  const respira = 1 + Math.sin(pulso * Math.PI * 2) * 0.015;

  const camadas = r.aura.map((nome, i) => {
    const corpo = ICONES[nome];
    if (!corpo) return '';
    const escala = (2.05 - i * 0.26) * respira;
    const lado = S * escala;
    const off = (S - lado) / 2;
    const op = (0.13 + 0.07 * i + 0.1 * t) * (foco ? 0.55 : 1);
    return `<g transform="translate(${off.toFixed(1)} ${off.toFixed(1)}) scale(${(lado / 512).toFixed(4)})" fill="${r.cor}" opacity="${op.toFixed(2)}">${corpo}</g>`;
  }).join('');

  const halos = Array.from({ length: r.halos }, (_, i) =>
    `<circle cx="${S / 2}" cy="${S * 0.42}" r="${(S * (0.17 + i * 0.09) * respira).toFixed(1)}" fill="none" stroke="${r.cor}" stroke-width="${(1.5 - i * 0.4).toFixed(1)}" stroke-opacity="${(0.75 - i * 0.2).toFixed(2)}"/>`,
  ).join('');

  const nucleo = misturar(r.cor, '#FFFFFF', 0.25 + 0.6 * t);
  const figura = ICONES.meditation ?? '';
  const fig = S * 0.46;
  const figOff = (S - fig) / 2;

  return `<svg viewBox="0 0 ${S} ${S}" width="100%" height="100%" role="img" aria-label="${r.nome}, reino ${r.n}">
    <defs>
      <radialGradient id="g${uid}">
        <stop offset="0" stop-color="${r.cor}" stop-opacity="${((0.1 + 0.42 * t) * (foco ? 0.5 : 1)).toFixed(2)}"/>
        <stop offset="1" stop-color="${r.cor}" stop-opacity="0"/>
      </radialGradient>
      <radialGradient id="m${uid}">
        <stop offset="0" stop-color="#fff" stop-opacity="1"/>
        <stop offset=".62" stop-color="#fff" stop-opacity=".9"/>
        <stop offset="1" stop-color="#fff" stop-opacity="0"/>
      </radialGradient>
      <mask id="k${uid}"><rect width="${S}" height="${S}" fill="url(#m${uid})"/></mask>
      <filter id="b${uid}" x="-60%" y="-60%" width="220%" height="220%">
        <feGaussianBlur stdDeviation="${(1.4 + 1.9 * t).toFixed(1)}" result="bl"/>
        <feMerge><feMergeNode in="bl"/><feMergeNode in="bl"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
    </defs>
    <circle cx="${S / 2}" cy="${S / 2}" r="${S * 0.5}" fill="url(#g${uid})"/>
    ${halos}
    <!-- A aura é mascarada por um degradê radial: escalada a 2x ela bate na borda do
         viewBox, e sem a máscara os ícones aparecem recortados em blocos duros em vez
         de brilho. -->
    <g mask="url(#k${uid})">${camadas}</g>
    <g filter="url(#b${uid})" transform="translate(${figOff.toFixed(1)} ${(figOff + S * 0.04).toFixed(1)}) scale(${(fig / 512).toFixed(4)})" fill="${nucleo}">${figura}</g>
  </svg>`;
}

/** O selo de uma besta: o bicho dentro de um anel da cor do reino dele. */
export function selo(iconeNome: string, cor: string, guardia = false): string {
  const corpo = ICONES[iconeNome];
  if (!corpo) return '';
  return `<svg viewBox="0 0 100 100" width="100%" height="100%" aria-hidden="true">
    <circle cx="50" cy="50" r="47" fill="none" stroke="${cor}" stroke-opacity="${guardia ? 0.55 : 0.25}" stroke-width="${guardia ? 1.6 : 1}"/>
    ${guardia ? `<circle cx="50" cy="50" r="42" fill="none" stroke="${cor}" stroke-opacity=".3" stroke-width=".8" stroke-dasharray="3 4"/>` : ''}
    <circle cx="50" cy="50" r="38" fill="${cor}" fill-opacity="${guardia ? 0.12 : 0.07}"/>
    <g transform="translate(26 26) scale(0.09375)" fill="${cor}">${corpo}</g>
  </svg>`;
}
