/**
 * Prepara o build para publicar como página.
 *
 * O publicador embrulha o arquivo num esqueleto HTML próprio, então aqui só sai o
 * miolo — título, fontes, folha de estilo, a div raiz e o script. Os nomes dos arquivos
 * carregam um hash que muda a cada build, por isso são lidos do dist em vez de escritos
 * à mão.
 */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';

const assets = readdirSync('dist/assets');
const css = assets.find((f) => f.endsWith('.css'));
const js = assets.find((f) => f.endsWith('.js'));
if (!css || !js) throw new Error('build sem css ou js — rode `npm run build` antes');

const fontes = readFileSync('dist/index.html', 'utf8')
  .split('\n').filter((l) => l.includes('fonts.googleapis') || l.includes('fonts.gstatic'))
  .map((l) => l.trim()).join('\n');

writeFileSync('dist/pagina.html', `<title>九境 Ninefold</title>
${fontes}
<link rel="stylesheet" href="assets/${css}">
<div id="root"></div>
<script type="module" src="assets/${js}"></script>
`);

console.log(`dist/pagina.html pronto — assets/${css}, assets/${js}`);
console.log(JSON.stringify({ [`assets/${css}`]: `dist/assets/${css}`, [`assets/${js}`]: `dist/assets/${js}` }));
