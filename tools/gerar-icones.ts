/**
 * Extrai do acervo game-icons.net só os ícones que o jogo usa, e escreve um módulo
 * TypeScript com eles dentro.
 *
 * Assim o app não depende do repositório clonado para rodar nem para buildar, e o APK
 * sai sem nenhuma requisição de rede por arte. Cada ícone chega como silhueta branca
 * sobre quadrado preto; o quadrado sai aqui, e a cor fica por conta do CSS.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { BESTAS } from '../src/data/bestiario.ts';
import { REINOS } from '../src/data/reinos.ts';

const ACERVO = '/home/user/game-icons/icons';

const INTERFACE = [
  'meditation', 'katana', 'scroll-unfurled', 'fire-gem', 'tiger-head',
  'round-potion', 'crystal-cluster', 'pagoda', 'yin-yang', 'dragon-orb',
  'spiral-bloom', 'crystal-shrine', 'beams-aura', 'lightning-helix',
];

const NOMES = [...new Set([
  ...INTERFACE,
  ...REINOS.flatMap((r) => r.aura),
  ...BESTAS.map((x) => x.icone),
])].sort();

const entradas = NOMES.map((nome) => {
  const caminho = execSync(`find ${ACERVO} -name '${nome}.svg' | head -1`).toString().trim();
  if (!caminho) throw new Error(`ícone ausente no acervo: ${nome}`);
  const autor = caminho.replace(`${ACERVO}/`, '').split('/')[0];
  const corpo = readFileSync(caminho, 'utf8')
    .replace(/<svg[^>]*>/, '').replace(/<\/svg>/, '')
    .replace(/<path d="M0 0h512v512H0z"\s*\/>/, '')
    .replace(/fill="#fff"/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return { nome, autor, corpo };
});

const autores = [...new Set(entradas.map((e) => e.autor))].sort();

const saida = `/**
 * GERADO por \`npm run icones\` — não editar à mão.
 *
 * ${entradas.length} ícones de game-icons.net, licença Creative Commons BY 3.0.
 * Uso comercial liberado; o crédito aos autores é obrigatório e a lista está em
 * AUTORES, que a tela de créditos do jogo lê daqui.
 */

export const AUTORES: readonly string[] = ${JSON.stringify(autores)};

export const ICONES: Readonly<Record<string, string>> = {
${entradas.map((e) => `  ${JSON.stringify(e.nome)}: ${JSON.stringify(e.corpo)},`).join('\n')}
};

export type NomeIcone = keyof typeof ICONES;
`;

writeFileSync('src/art/icones.gerados.ts', saida);
console.log(`src/art/icones.gerados.ts — ${entradas.length} ícones, ${autores.length} autores, ${(saida.length / 1024).toFixed(0)} KB`);
console.log(`autores: ${autores.join(', ')}`);
